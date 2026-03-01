import { useState, useEffect, useCallback } from 'react'
import { Building2, MapPin, Edit2, Eye, Package, Ban, Unlock, CheckCircle, XCircle, ArrowLeft, Calendar, FileText, ExternalLink, Search, MoreVertical, User, Phone, Mail, Store, Info, Trash2, ArrowUpDown, Truck, AlertCircle } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Timeline } from '../components/Timeline'
import { UserMap } from '../components/UserMap'
import { UserEditForm } from '../components/UserEditForm'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'

import { cn } from '../../../lib/cn'

const EARTH_RADIUS_KM = 6371
const COVERAGE_RADIUS_KM = 20

const calculateDistanceKm = (pointA, pointB) => {
  if (!pointA?.lat || !pointA?.lng || !pointB?.lat || !pointB?.lng) {
    return Infinity
  }
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(pointB.lat - pointA.lat)
  const dLng = toRad(pointB.lng - pointA.lng)
  const lat1 = toRad(pointA.lat)
  const lat2 = toRad(pointB.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

const computeCoverageReport = (users = []) => {
  const geoUsers = users.filter((user) => user.location?.lat && user.location?.lng)
  const conflicts = []
  const flagged = new Set()

  for (let i = 0; i < geoUsers.length; i += 1) {
    for (let j = i + 1; j < geoUsers.length; j += 1) {
      const userA = geoUsers[i]
      const userB = geoUsers[j]
      const distanceKm = calculateDistanceKm(userA.location, userB.location)
      if (distanceKm < COVERAGE_RADIUS_KM) {
        flagged.add(userA.id)
        flagged.add(userB.id)
        conflicts.push({
          id: `${userA.id}-${userB.id}`,
          userA,
          userB,
          distanceKm: Number(distanceKm.toFixed(2)),
          overlapKm: Number(Math.max(COVERAGE_RADIUS_KM - distanceKm, 0).toFixed(2)),
        })
      }
    }
  }

  return {
    total: geoUsers.length,
    coverageRadius: COVERAGE_RADIUS_KM,
    conflicts,
    flaggedUsers: Array.from(flagged),
    compliantCount: Math.max(geoUsers.length - flagged.size, 0),
  }
}

const columns = [
  { Header: 'User', accessor: 'name' },
  { Header: 'Region', accessor: 'region' },
  { Header: 'Coverage', accessor: 'coverageRadius' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

export function UsersPage({ subRoute = null, navigate }) {
  const { users: usersState } = useAdminState()
  const {
    getUsers,
    approveUser,
    rejectUser,
    banUser,
    unbanUser,
    updateUser,
    getUserPurchaseRequests,
    getUserRankings,
    approveUserPurchase,
    rejectUserPurchase,
    deleteUserPurchase,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [usersList, setUsersList] = useState([])
  const [allUsersList, setAllUsersList] = useState([])
  const [rawUsers, setRawUsers] = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [coverageReport, setCoverageReport] = useState(null)

  // View states (replacing modals with full-screen views)
  const [currentView, setCurrentView] = useState(null) // 'userDetail', 'userMap', 'purchaseRequest', 'approveUser', 'rejectUser', 'banUser', 'unbanUser', 'editUser'
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState(null)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null)
  const [selectedUserForMap, setSelectedUserForMap] = useState(null)
  const [selectedUserForAction, setSelectedUserForAction] = useState(null)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null)
  const [actionData, setActionData] = useState(null) // For storing form data for actions like reject/ban
  const [rejectReason, setRejectReason] = useState('')
  const [banType, setBanType] = useState('temporary')
  const [banReason, setBanReason] = useState('')
  const [revocationReason, setRevocationReason] = useState('')
  const [deletionReason, setDeletionReason] = useState('')

  // Rankings state
  const [rankings, setRankings] = useState([])
  const [rankingsSort, setRankingsSort] = useState('creditScore')
  const [rankingsOrder, setRankingsOrder] = useState('desc')
  const [rankingsLoading, setRankingsLoading] = useState(false)

  const [purchaseRejectReason, setPurchaseRejectReason] = useState(null) // null = not showing, '' = showing input
  const [searchQuery, setSearchQuery] = useState('')
  const [processingPurchase, setProcessingPurchase] = useState(false) // Local loading state for purchase actions
  const [purchaseApprovalNotes, setPurchaseApprovalNotes] = useState('') // Notes for purchase approval
  const [loadingPurchaseRequests, setLoadingPurchaseRequests] = useState(false) // Loading state for purchase requests
  const [openActionsDropdown, setOpenActionsDropdown] = useState(null)

  // Format user data for display
  const formatUserForDisplay = (user, flaggedUserIds = new Set()) => {
    const isFlagged = flaggedUserIds.has(user.id)
    return {
      ...user,
      coverageRadius: user.coverageRadius ? `${user.coverageRadius} km` : 'N/A',
      coverageCompliance: isFlagged ? 'Conflict' : 'Compliant',
    }
  }

  // Fetch users
  const fetchUsers = useCallback(async () => {
    const result = await getUsers()
    const sourceUsers = result.data?.users || []
    setRawUsers(sourceUsers)
    const coverageInfo = computeCoverageReport(sourceUsers)
    setCoverageReport(coverageInfo)
    const flaggedSet = new Set(coverageInfo.flaggedUsers || [])
    const formatted = sourceUsers.map((user) => formatUserForDisplay(user, flaggedSet))
    setAllUsersList(formatted)
  }, [getUsers])

  // Filter users based on subRoute and search
  useEffect(() => {
    // Skip filtering if we're on purchase-requests subRoute
    if (subRoute === 'purchase-requests') {
      return
    }

    let filtered = allUsersList

    // Filter by subRoute
    if (subRoute === 'on-track') {
      filtered = filtered.filter((v) => {
        const status = v.status?.toLowerCase() || ''
        return status === 'on track' || status === 'approved' || status === 'active'
      })
    } else if (subRoute === 'out-of-track') {
      filtered = filtered.filter((v) => {
        const status = v.status?.toLowerCase() || ''
        return status === 'delayed' || status === 'review' || status === 'pending' || status === 'rejected'
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((v) => {
        const name = (v.name || '').toLowerCase()
        const phone = (v.phone || '').replace(/\D/g, '')
        const email = (v.email || '').toLowerCase()
        const searchPhone = query.replace(/\D/g, '')

        return name.includes(query) ||
          phone.includes(searchPhone) ||
          email.includes(query) ||
          (v.id && v.id.toLowerCase().includes(query))
      })
    }

    setUsersList(filtered)
  }, [subRoute, allUsersList, searchQuery])

  // Fetch purchase requests
  const fetchPurchaseRequests = useCallback(async () => {
    setLoadingPurchaseRequests(true)
    try {
      const result = await getUserPurchaseRequests({ status: 'pending' })
      if (result.data?.purchases) {
        setPurchaseRequests(result.data.purchases)
      }
    } catch (error) {
      console.error('Failed to fetch purchase requests:', error)
    } finally {
      setLoadingPurchaseRequests(false)
    }
  }, [getUserPurchaseRequests])

  const fetchRankings = useCallback(async () => {
    setRankingsLoading(true)
    try {
      const result = await getUserRankings({ sortBy: rankingsSort, order: rankingsOrder, limit: 100 })
      if (result.data?.rankings) {
        setRankings(result.data.rankings)
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error)
    } finally {
      setRankingsLoading(false)
    }
  }, [getUserRankings, rankingsSort, rankingsOrder])

  const handleViewDetails = (user) => {
    const originalUser = withCoverageMeta(getRawUserById(user.id) || user)
    setSelectedUserForDetail(originalUser)
    setCurrentView('userDetail')
  }

  // Initial fetch
  useEffect(() => {
    if (subRoute === 'purchase-requests') {
      fetchPurchaseRequests()
    } else if (subRoute === 'rankings') {
      fetchRankings()
    } else {
      fetchUsers()
    }
  }, [fetchUsers, fetchPurchaseRequests, fetchRankings, subRoute])

  // Handle purchase-requests subRoute - show purchase requests view
  useEffect(() => {
    if (subRoute === 'purchase-requests') {
      fetchPurchaseRequests()
      // Reset selected request when entering list view
      if (!currentView || currentView !== 'purchaseRequest') {
        setSelectedPurchaseRequest(null)
        setCurrentView(null)
      }
    } else if (subRoute !== 'purchase-requests' && currentView === 'purchaseRequest') {
      // Reset view when navigating away from purchase-requests
      setCurrentView(null)
      setSelectedPurchaseRequest(null)
      setPurchaseApprovalNotes('')
      setPurchaseRejectReason(null)
    }
  }, [subRoute, fetchPurchaseRequests, currentView])

  // Handle detail/ID sub-route for direct navigation
  useEffect(() => {
    if (subRoute && subRoute.startsWith('detail/')) {
      const userId = subRoute.split('/')[1]
      if (userId) {
        // Try to find in current list
        const user = allUsersList.find(v => v.id === userId || v._id === userId)
        if (user) {
          handleViewUserDetails(user)
        } else if (rawUsers.length > 0) {
          // Try raw users if list filter is active
          const rawUser = rawUsers.find(v => v.id === userId || v._id === userId)
          if (rawUser) handleViewUserDetails(rawUser)
        }
      }
    }
  }, [subRoute, allUsersList, rawUsers])

  const getUserCoverageConflicts = (userId) => {
    if (!coverageReport?.conflicts) {
      return []
    }
    return coverageReport.conflicts.filter(
      (conflict) => conflict.userA.id === userId || conflict.userB.id === userId,
    )
  }

  const getRawUserById = (userId) =>
    rawUsers.find((user) => user.id === userId) ||
    usersState.data?.users?.find((user) => user.id === userId)

  const withCoverageMeta = (user) => {
    if (!user) return user
    return {
      ...user,
      coverageRadius: user.coverageRadius || COVERAGE_RADIUS_KM,
      coverageConflicts: getUserCoverageConflicts(user.id),
    }
  }

  const handleBanUser = async (userId, banData) => {
    try {
      const result = await banUser(userId, banData)
      if (result.data) {
        setCurrentView(null)
        setSelectedUserForAction(null)
        setActionData(null)
        fetchUsers()
        success(`User ${banData.banType === 'permanent' ? 'permanently' : 'temporarily'} banned successfully!`, 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to ban user'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to ban user', 5000)
    }
  }

  const handleUnbanUser = async (userId, unbanData) => {
    try {
      const result = await unbanUser(userId, unbanData)
      if (result.data) {
        fetchUsers()
        success('User ban revoked successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to unban user'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to unban user', 5000)
    }
  }


  const handleApproveUser = async (userId) => {
    try {
      const result = await approveUser(userId)
      if (result.success || result.data) {
        setCurrentView(null)
        setSelectedUserForAction(null)
        success('User approved successfully!', 3000)
        // Refresh users list
        const usersResult = await getUsers({})
        if (usersResult.data) {
          setRawUsers(usersResult.data.users || [])
        }
        fetchUsers()
      } else {
        const errorMessage = result.error?.message || 'Failed to approve user'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to approve user', 5000)
    }
  }

  const handleRejectUser = async (userId, rejectionData) => {
    try {
      const result = await rejectUser(userId, rejectionData)
      if (result.success || result.data) {
        setCurrentView(null)
        setSelectedUserForAction(null)
        setActionData(null)
        success('User application rejected.', 3000)
        // Refresh users list
        const usersResult = await getUsers({})
        if (usersResult.data) {
          setRawUsers(usersResult.data.users || [])
        }
        fetchUsers()
      } else {
        const errorMessage = result.error?.message || 'Failed to reject user'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to reject user', 5000)
    }
  }

  const handleDeletePurchaseRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to permanently delete this purchase invoice? This action cannot be undone.')) {
      try {
        const result = await deleteUserPurchase(requestId)
        if (result.success) {
          success('Purchase invoice deleted successfully')
          fetchPurchaseRequests()
          // If we were viewing this request, go back to list
          if (selectedPurchaseRequest?.id === requestId || selectedPurchaseRequest?._id === requestId) {
            setCurrentView(null)
            setSelectedPurchaseRequest(null)
          }
        } else {
          showError(result.error?.message || 'Failed to delete purchase invoice')
        }
      } catch (error) {
        showError('An error occurred while deleting the invoice')
      }
    }
  }

  const handleApprovePurchase = async (requestId, shortDescription) => {
    // Use provided shortDescription or fallback to state
    const notes = shortDescription || purchaseApprovalNotes || ''
    const trimmedNotes = notes.trim()
    if (!trimmedNotes) {
      showError('Short description is required for approval', 3000)
      return
    }

    console.log('handleApprovePurchase called:', { requestId, shortDescription, trimmedNotes, stateValue: purchaseApprovalNotes })

    setProcessingPurchase(true)
    try {
      const result = await approveUserPurchase(requestId, trimmedNotes)
      if (result.success && result.data) {
        setCurrentView(null)
        setSelectedPurchaseRequest(null)
        setPurchaseApprovalNotes('')
        setPurchaseRejectReason(null)
        fetchPurchaseRequests()
        fetchUsers()
        success('User purchase request approved successfully!', 3000)
      } else {
        const errorMessage = result.error?.message || result.message || 'Failed to approve purchase request'
        console.error('Purchase approval error:', result)
        console.error('Error details:', {
          success: result.success,
          error: result.error,
          message: result.message,
          fullResult: JSON.stringify(result, null, 2)
        })
        console.error('Error message:', errorMessage)
        if (errorMessage.includes('insufficient') || errorMessage.includes('stock')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      console.error('Purchase approval exception:', error)
      showError(error.message || 'Failed to approve purchase request', 5000)
    } finally {
      setProcessingPurchase(false)
    }
  }

  const handleRejectPurchase = async (requestId, rejectionData) => {
    setProcessingPurchase(true)
    try {
      const result = await rejectUserPurchase(requestId, rejectionData)
      if (result.data) {
        setCurrentView(null)
        setSelectedPurchaseRequest(null)
        setActionData(null)
        setPurchaseRejectReason(null)
        fetchPurchaseRequests()
        fetchUsers()
        success('User purchase request rejected.', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to reject purchase request'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to reject purchase request', 5000)
    } finally {
      setProcessingPurchase(false)
    }
  }

  const handleViewUserDetails = (user) => {
    const originalUser = withCoverageMeta(getRawUserById(user.id) || user)
    setSelectedUserForDetail(originalUser)
    setCurrentView('userDetail')
  }

  const handleViewUserMap = (user) => {
    const originalUser = withCoverageMeta(getRawUserById(user.id) || user)
    setSelectedUserForMap(originalUser)
    setCurrentView('userMap')
  }

  const handleBackToList = () => {
    setCurrentView(null)
    setSelectedPurchaseRequest(null)
    setSelectedUserForDetail(null)
    setSelectedUserForMap(null)
    setSelectedUserForAction(null)
    setSelectedUserForEdit(null)
    setRejectReason('')
    setBanType('temporary')
    setBanReason('')
    setRevocationReason('')
    setPurchaseRejectReason(null)
    if (navigate) navigate('users')
  }

  const handleEditUser = (user) => {
    const originalUser = getRawUserById(user.id) || user
    setSelectedUserForEdit(originalUser)
    setCurrentView('editUser')
  }

  const handleSaveUser = async (userData) => {
    try {
      const result = await updateUser(selectedUserForEdit.id, userData)
      if (result.data) {
        setCurrentView(null)
        setSelectedUserForEdit(null)
        fetchUsers()
        success('User information updated successfully!', 3000)
        if (navigate) navigate('users')
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to update user'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to update user', 5000)
    }
  }


  const tableColumns = columns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const originalUser = usersState.data?.users?.find((v) => v.id === row.id) || row
          const isBanned = originalUser.banInfo?.isBanned || originalUser.status === 'temporarily_banned' || originalUser.status === 'permanently_banned'
          const banType = originalUser.banInfo?.banType || (originalUser.status === 'permanently_banned' ? 'permanent' : 'temporary')
          const status = isBanned ? (banType === 'permanent' ? 'Permanently Banned' : 'Temporarily Banned') : (row.status || 'Active')
          let tone = 'neutral'
          if (isBanned) {
            tone = 'error'
          } else if (status === 'approved' || status === 'active' || status === 'On Track' || status === 'on_track') {
            tone = 'success'
          } else if (status === 'Delayed' || status === 'delayed') {
            tone = 'warning'
          } else if (status === 'inactive' || status === 'blocked') {
            tone = 'error'
          }
          // Capitalize first letter for display
          const displayStatus = status.charAt(0).toUpperCase() + status.slice(1)
          return <StatusBadge tone={tone}>{displayStatus}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'region') {
      return {
        ...column,
        Cell: (row) => (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-3 py-1 text-xs text-blue-700 font-bold shadow-[0_2px_8px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <MapPin className="h-3.5 w-3.5" />
            {row.region}
          </span>
        ),
      }
    }
    if (column.accessor === 'coverageRadius') {
      return {
        ...column,
        Cell: (row) => (
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-gray-900">{row.coverageRadius || 'N/A'}</span>
            <StatusBadge tone={row.coverageCompliance === 'Conflict' ? 'warning' : 'success'}>
              {row.coverageCompliance || 'Unknown'}
            </StatusBadge>
          </div>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalUser = usersState.data?.users?.find((v) => v.id === row.id) || row
          const userStatus = originalUser.status?.toLowerCase() || 'active'
          const isPending = userStatus === 'pending'
          const isRejected = userStatus === 'rejected'
          const isBanned = originalUser.banInfo?.isBanned || originalUser.status === 'temporarily_banned' || originalUser.status === 'permanently_banned'
          const banType = originalUser.banInfo?.banType || (originalUser.status === 'permanently_banned' ? 'permanent' : 'temporary')
          const isDropdownOpen = openActionsDropdown === row.id

          const actionItems = [
            {
              label: 'View Location',
              icon: MapPin,
              onClick: () => {
                handleViewUserMap(originalUser)
                setOpenActionsDropdown(null)
              },
              className: 'text-gray-700 hover:bg-gray-50'
            },
            {
              label: 'View Details',
              icon: Eye,
              onClick: () => {
                handleViewUserDetails(originalUser)
                setOpenActionsDropdown(null)
              },
              className: 'text-gray-700 hover:bg-gray-50'
            },
            {
              label: 'Edit Info',
              icon: Edit2,
              onClick: () => {
                handleEditUser(originalUser)
                setOpenActionsDropdown(null)
              },
              className: 'text-gray-700 hover:bg-gray-50'
            },
            {
              label: 'Manage Logistics',
              icon: Truck,
              onClick: () => {
                navigate('users/logistics')
                setOpenActionsDropdown(null)
              },
              className: 'text-blue-700 hover:bg-blue-50 font-bold'
            }
          ]

          if (isPending) {
            actionItems.push({
              label: 'Approve User',
              icon: CheckCircle,
              onClick: () => {
                setSelectedUserForAction(originalUser)
                setCurrentView('approveUser')
                setOpenActionsDropdown(null)
              },
              className: 'text-green-700 hover:bg-green-50'
            })
            actionItems.push({
              label: 'Reject User',
              icon: XCircle,
              onClick: () => {
                setSelectedUserForAction(originalUser)
                setRejectReason('')
                setCurrentView('rejectUser')
                setOpenActionsDropdown(null)
              },
              className: 'text-red-700 hover:bg-red-50'
            })
          }

          if (!isBanned && !isPending && !isRejected) {
            actionItems.push({
              label: 'Ban User',
              icon: Ban,
              onClick: () => {
                setSelectedUserForAction(originalUser)
                setBanType('temporary')
                setBanReason('')
                setCurrentView('banUser')
                setOpenActionsDropdown(null)
              },
              className: 'text-red-700 hover:bg-red-50'
            })
          }

          if (isBanned && banType === 'temporary') {
            actionItems.push({
              label: 'Unban User',
              icon: Unlock,
              onClick: () => {
                setSelectedUserForAction(originalUser)
                setRevocationReason('')
                setCurrentView('unbanUser')
                setOpenActionsDropdown(null)
              },
              className: 'text-green-700 hover:bg-green-50'
            })
          }

          return (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenActionsDropdown(isDropdownOpen ? null : row.id)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                title="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenActionsDropdown(null)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                    {actionItems.map((item, index) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!item.disabled) {
                              item.onClick()
                            }
                          }}
                          disabled={item.disabled}
                          className={cn(
                            'w-full flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                            item.className,
                            item.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        },
      }
    }
    return column
  })

  // Render full-screen views
  if (currentView === 'editUser' && selectedUserForEdit) {
    return (
      <UserEditForm
        user={selectedUserForEdit}
        onSave={handleSaveUser}
        onCancel={handleBackToList}
        loading={loading}
      />
    )
  }


  if (currentView === 'userDetail' && selectedUserForDetail) {
    const user = selectedUserForDetail
    const formatCurrency = (value) => {
      if (typeof value === 'string') return value
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
      return `₹${value.toLocaleString('en-IN')}`
    }

    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">User Details & Performance</h2>
            <p className="text-sm text-gray-600">
              Comprehensive view of user information, business status, and performance metrics.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            {/* User Header */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">User ID: {user.id}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{user.region}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge tone={user.status === 'On Track' || user.status === 'on_track' ? 'success' : user.status === 'Delayed' || user.status === 'delayed' ? 'warning' : 'neutral'}>
                    {user.status || 'Unknown'}
                  </StatusBadge>
                  <button
                    onClick={() => navigate('users/logistics')}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:bg-blue-700"
                  >
                    <Truck className="h-4 w-4" />
                    Manage Logistics
                  </button>
                </div>
              </div>
            </div>


            {/* Coverage & Policy */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Coverage Radius</h4>
                    <p className="mt-2 text-2xl font-bold text-blue-900">
                      {user.coverageRadius ? `${user.coverageRadius} km` : 'N/A'}
                    </p>
                    {user.serviceArea && <p className="text-xs text-blue-700">{user.serviceArea}</p>}
                  </div>
                  <StatusBadge tone={user.coverageConflicts?.length ? 'warning' : 'success'}>
                    {user.coverageConflicts?.length ? 'Conflict' : 'Compliant'}
                  </StatusBadge>
                </div>
                {user.coverageConflicts?.length ? (
                  <ul className="mt-4 space-y-2 text-xs text-blue-900">
                    {user.coverageConflicts.map((conflict) => {
                      const otherUser = conflict.userA.id === user.id ? conflict.userB : conflict.userA
                      return (
                        <li key={`${user.id}-${otherUser.id}`} className="rounded-lg border border-blue-200 bg-white/80 px-3 py-2">
                          <p className="font-semibold">{otherUser.name}</p>
                          <p className="text-[0.7rem] text-blue-700">
                            Distance: {conflict.distanceKm} km • Overlap: {conflict.overlapKm} km
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-blue-800">
                    No overlapping users detected. Exclusivity rule has been retired.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-green-900">Partner Status</h4>
                    <div className="mt-2 grid gap-2 text-xs text-green-800">
                      <div>
                        <span className="font-semibold">Account Level: </span>
                        <span className="capitalize">{user.tier || 'Standard'}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Joined On: </span>
                        <span>{new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business & Contact Information */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Personal & Contact Details */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                  <User className="h-5 w-5 text-purple-600" />
                  <h4 className="text-sm font-bold text-gray-900">Contact Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">First Name</p>
                    <p className="text-sm font-semibold text-gray-800">{user.firstName || user.name?.split(' ')[0] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Last Name</p>
                    <p className="text-sm font-semibold text-gray-800">{user.lastName || user.name?.split(' ').slice(1).join(' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Phone Number</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-green-600" />
                      <p className="text-sm font-semibold text-gray-800">{user.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Email Address</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3 w-3 text-blue-600" />
                      <p className="text-sm font-semibold text-gray-800">{user.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shop & Business Details */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                  <Store className="h-5 w-5 text-orange-600" />
                  <h4 className="text-sm font-bold text-gray-900">Shop Details</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Shop Name</p>
                    <p className="text-sm font-semibold text-gray-800">{user.shopName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Complete Shop Address</p>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{user.shopAddress || user.location?.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Referring Agent</p>
                    <p className="text-sm font-semibold text-gray-800">{user.agentName || 'No Agent'}</p>
                  </div>
                </div>
              </div>

              {/* KYC Numbers */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
                  <Info className="h-5 w-5 text-blue-600" />
                  <h4 className="text-sm font-bold text-gray-900">KYC Identifiers</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">GST Number</p>
                    <p className="text-sm font-black text-gray-900 tracking-wider">
                      {user.gstNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">PAN Number</p>
                    <p className="text-sm font-black text-gray-900 tracking-wider">
                      {user.panNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Aadhaar Number</p>
                    <p className="text-sm font-black text-gray-900 tracking-wider">
                      {user.aadhaarNumber ? (user.aadhaarNumber.match(/.{1,4}/g)?.join(' ') || user.aadhaarNumber) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Documents */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Verification Documents</h4>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { key: 'aadhaarFront', label: 'Aadhaar Front' },
                  { key: 'aadhaarBack', label: 'Aadhaar Back' },
                  { key: 'pesticideLicense', label: 'Pesticide License' },
                  { key: 'securityChecks', label: 'Security Checks' },
                  { key: 'dealershipForm', label: 'Dealership Form' }
                ].map((doc) => {
                  const docData = user[doc.key] || (doc.key === 'aadhaarFront' ? user.aadhaarCard : (doc.key === 'dealershipForm' ? user.panCard : null));
                  const hasDoc = docData?.url;

                  return (
                    <div key={doc.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <p className="text-xs font-semibold text-gray-700">{doc.label}</p>
                        </div>
                        {hasDoc ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      {hasDoc ? (
                        <div className="space-y-2">
                          {docData.format === 'pdf' ? (
                            <div className="flex h-20 items-center justify-center rounded-lg border border-gray-300 bg-white">
                              <div className="flex flex-col items-center gap-1">
                                <FileText className="h-8 w-8 text-red-600" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">PDF File</span>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg overflow-hidden border border-gray-300 bg-white shadow-sm">
                              <img
                                src={docData.url}
                                alt={doc.label}
                                className="w-full h-auto max-h-32 object-contain bg-gray-50"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                          <a
                            href={docData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-[0.7rem] text-blue-600 hover:text-blue-800 font-bold shadow-sm transition-all hover:border-blue-300"
                          >
                            <Eye className="h-3 w-3" />
                            View Full Document
                            <ExternalLink className="h-2 w-2" />
                          </a>
                        </div>
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100/50">
                          <p className="text-[0.7rem] font-bold text-gray-400 uppercase">Not Provided</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'userMap' && selectedUserForMap) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">{selectedUserForMap.name} Location</h2>
            <p className="text-sm text-gray-600">
              View user location and coverage area on the map.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <UserMap user={selectedUserForMap} className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (currentView === 'purchaseRequest' && selectedPurchaseRequest) {
    const request = selectedPurchaseRequest
    const formatCurrency = (value) => {
      if (typeof value === 'string') return value
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
      return `₹${value.toLocaleString('en-IN')}`
    }

    const handleRejectWithReason = () => {
      if (!purchaseRejectReason || !purchaseRejectReason.trim()) {
        showError('Please provide a reason for rejection', 3000)
        return
      }
      handleRejectPurchase(request.id, { reason: purchaseRejectReason.trim() })
    }

    const handleBackToUsers = () => {
      setCurrentView(null)
      setSelectedPurchaseRequest(null)
      setPurchaseRejectReason(null)
      setPurchaseApprovalNotes('')
      if (navigate) {
        navigate('users')
      }
    }

    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToUsers}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">User Purchase Request Review</h2>
            <p className="text-sm text-gray-600">
              Review and approve or reject user purchase requests (minimum ₹50,000).
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            {/* Request Header */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Request #{request.id?.slice(-8) || request.requestId?.slice(-8) || 'N/A'}
                    </h3>
                    <p className="text-sm text-gray-600">User: {request.userName || request.user}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {request.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(request.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge tone={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'neutral'}>
                  {request.status || 'Pending'}
                </StatusBadge>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Purchase Details</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Request Amount</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {formatCurrency(request.amount || request.value || 0)}
                  </p>
                </div>
                {request.advance && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Advance Payment (30%)</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(request.advance)}</p>
                  </div>
                )}
              </div>

              {request.products && request.products.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-xs font-bold text-gray-500">Products Requested</p>
                  <div className="space-y-2">
                    {request.products.map((product, index) => {
                      // Format attribute label
                      const formatAttributeLabel = (key) => {
                        return key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .trim()
                      }

                      return (
                        <div key={index} className="rounded-lg bg-white p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">{product.name || product}</span>
                            {product.quantity && (
                              <span className="text-xs text-gray-500">
                                Qty: {product.quantity}
                              </span>
                            )}
                          </div>
                          {/* Display variant attributes if present */}
                          {product.attributeCombination && Object.keys(product.attributeCombination).length > 0 && (
                            <div className="mt-2 space-y-1 pt-2 border-t border-gray-100">
                              {Object.entries(product.attributeCombination).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-600 font-medium">{formatAttributeLabel(key)}:</span>
                                  <span className="text-gray-900">{value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {product.price && (
                            <div className="mt-1 text-xs text-gray-500">
                              Price: ₹{product.price.toLocaleString('en-IN')}/{product.unit || 'kg'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {request.description && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-700">{request.description}</p>
                </div>
              )}
            </div>

            {/* Short Description Input (Required for Approval) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Short Description <span className="text-xs font-normal text-red-500">*</span>
                <span className="text-xs font-normal text-gray-500 ml-1">(Required for approval)</span>
              </label>
              <textarea
                value={purchaseApprovalNotes || ''}
                onChange={(e) => {
                  const value = e.target.value || ''
                  setPurchaseApprovalNotes(value)
                }}
                placeholder="Enter a short description for this approval (max 150 characters)"
                rows={3}
                maxLength={150}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
              <p className="mt-1 text-xs text-gray-500">
                {(purchaseApprovalNotes || '').length}/150 characters
              </p>
            </div>

            {/* Rejection Reason Input (shown when rejecting) */}
            {purchaseRejectReason !== null && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-sm font-bold text-gray-900">
                  Rejection Reason <span className="text-xs font-normal text-gray-500">(Required for rejection)</span>
                </label>
                <textarea
                  value={purchaseRejectReason}
                  onChange={(e) => setPurchaseRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBackToUsers}
                disabled={processingPurchase}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {request.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (purchaseRejectReason === null) {
                        setPurchaseRejectReason('')
                      } else {
                        handleRejectWithReason()
                      }
                    }}
                    disabled={processingPurchase}
                    className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    {purchaseRejectReason === null ? 'Reject' : 'Confirm Rejection'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const notes = purchaseApprovalNotes || ''
                      const trimmedNotes = notes.trim()
                      if (!trimmedNotes) {
                        showError('Short description is required for approval', 3000)
                        return
                      }
                      handleApprovePurchase(request.id, trimmedNotes)
                    }}
                    disabled={processingPurchase || !(purchaseApprovalNotes || '').trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {processingPurchase ? 'Processing...' : 'Approve Request'}
                  </button>
                </div>
              )}
            </div>

            {/* Logistics Status (Visible if approved) */}
            {request.status === 'approved' && (
              <div className="mt-8 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Stock Delivery Workflow</h4>
                    <p className="text-xs text-gray-600">Current Phase: <span className="font-semibold uppercase text-blue-600">{request.deliveryStatus || 'Pending'}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('users/logistics')}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700"
                  >
                    <Truck className="h-4 w-4" />
                    Manage Stock Logistics
                  </button>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This request has been approved. Logistics updates (packing, dispatch, delivery) are now managed in the dedicated logistics screen.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Action views (Approve, Reject, Ban, Unban)
  if (currentView === 'approveUser' && selectedUserForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Approve User</h2>
            <p className="text-sm text-gray-600">
              Approve user application for {selectedUserForAction.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedUserForAction.name}</h3>
                  <p className="text-sm text-gray-600">User ID: {selectedUserForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedUserForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-bold text-gray-900 mb-4">Are you sure you want to approve this user?</p>
              <p className="text-sm text-gray-600 mb-6">
                Once approved, the user will be able to access their dashboard and start receiving orders.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveUser(selectedUserForAction.id)}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Approving...' : 'Approve User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'rejectUser' && selectedUserForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Reject User</h2>
            <p className="text-sm text-gray-600">
              Reject user application for {selectedUserForAction.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                  <XCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedUserForAction.name}</h3>
                  <p className="text-sm text-gray-600">User ID: {selectedUserForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedUserForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection (optional)"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectUser(selectedUserForAction.id, { reason: rejectReason || 'Application rejected by admin' })}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Rejecting...' : 'Reject User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'banUser' && selectedUserForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Ban User</h2>
            <p className="text-sm text-gray-600">
              Ban user {selectedUserForAction.name} temporarily or permanently.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                  <Ban className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedUserForAction.name}</h3>
                  <p className="text-sm text-gray-600">User ID: {selectedUserForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedUserForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Ban Type <span className="text-red-500">*</span>
              </label>
              <div className="mb-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBanType('temporary')}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
                    banType === 'temporary'
                      ? 'border-yellow-500 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_4px_15px_rgba(234,179,8,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-yellow-300 hover:bg-yellow-50',
                  )}
                >
                  Temporary
                </button>
                <button
                  type="button"
                  onClick={() => setBanType('permanent')}
                  className={cn(
                    'flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition-all',
                    banType === 'permanent'
                      ? 'border-red-500 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50',
                  )}
                >
                  Permanent
                </button>
              </div>
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Ban Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning this user"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBanUser(selectedUserForAction.id, { banType, banReason: banReason || 'Banned by admin' })}
                  disabled={loading || !banReason.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Banning...' : `Ban User (${banType})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'unbanUser' && selectedUserForAction) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Unban User</h2>
            <p className="text-sm text-gray-600">
              Revoke ban for user {selectedUserForAction.name}.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                  <Unlock className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedUserForAction.name}</h3>
                  <p className="text-sm text-gray-600">User ID: {selectedUserForAction.id}</p>
                  <p className="text-sm text-gray-600">Region: {selectedUserForAction.region}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Revocation Reason <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="Enter reason for revoking ban (optional)"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUnbanUser(selectedUserForAction.id, { revocationReason: revocationReason || 'Ban revoked by admin' })}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Unbanning...' : 'Unban User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show purchase requests list view when subRoute is 'purchase-requests' and no specific request is selected
  if (subRoute === 'purchase-requests' && !selectedPurchaseRequest && !currentView) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('users')}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
            <h2 className="text-2xl font-bold text-gray-900">Purchase Requests</h2>
            <p className="text-sm text-gray-600">
              Review and approve user purchase requests.
            </p>
          </div>
        </div>
        {loadingPurchaseRequests ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-600">Loading purchase requests...</p>
          </div>
        ) : purchaseRequests.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-900">No Purchase Requests</p>
              <p className="text-xs text-gray-600 mt-1">There are no pending purchase requests at the moment.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="space-y-3">
              {purchaseRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                  onClick={() => {
                    setSelectedPurchaseRequest(request)
                    setCurrentView('purchaseRequest')
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-gray-900">{request.userName || 'Unknown User'}</p>
                      <StatusBadge tone="warning">Pending</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Request ID: {request.requestId || request.id} • Amount: ₹{(request.amount || request.value || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {request.date ? new Date(request.date).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPurchaseRequest(request)
                      setCurrentView('purchaseRequest')
                    }}
                    className="ml-4 flex h-9 w-9 items-center justify-center rounded-lg border border-blue-300 bg-white text-blue-600 transition-all hover:border-blue-500 hover:bg-blue-50"
                    title="Review request"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePurchaseRequest(request.id || request._id)
                    }}
                    className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg border border-red-300 bg-white text-red-600 transition-all hover:border-red-500 hover:bg-red-50"
                    title="Delete invoice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (subRoute === 'rankings') {
    const handleSort = (key) => {
      if (rankingsSort === key) {
        setRankingsOrder(rankingsOrder === 'desc' ? 'asc' : 'desc')
      } else {
        setRankingsSort(key)
        setRankingsOrder('desc')
      }
    }

    const SortIcon = ({ column }) => {
      if (rankingsSort !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-50" />
      return <ArrowUpDown className={cn("ml-1 h-3 w-3 text-blue-600", rankingsOrder === 'asc' && "rotate-180")} />
    }

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
          <h2 className="text-2xl font-bold text-gray-900">User Rankings</h2>
          <p className="text-sm text-gray-600">
            Top performing users based on order frequency and business volume.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900 rounded-l-xl">Rank</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">User</th>
                  <th
                    className="group cursor-pointer px-6 py-4 font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('orderFrequency')}
                  >
                    <div className="flex items-center">
                      Order Frequency
                      <SortIcon column="orderFrequency" />
                    </div>
                  </th>
                  <th
                    className="group cursor-pointer px-6 py-4 font-semibold text-gray-900 hover:bg-gray-100 transition-colors rounded-r-xl"
                    onClick={() => handleSort('totalOrdersValue')}
                  >
                    <div className="flex items-center">
                      Business Volume
                      <SortIcon column="totalOrdersValue" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankingsLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      Loading rankings...
                    </td>
                  </tr>
                ) : rankings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      No ranking data available.
                    </td>
                  </tr>
                ) : (
                  rankings.map((user, index) => (
                    <tr
                      key={user._id}
                      className="transition-colors hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetails(user)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.shopName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.orderCount || 0}</div>
                        <div className="text-xs text-gray-500">Orders</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-green-600">₹{(user.totalOrdersValue || 0).toLocaleString('en-IN')}</div>
                        <div className="text-xs text-gray-500">Total Purchase</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Main users list view
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
          <h2 className="text-2xl font-bold text-gray-900">User Performance Dashboard</h2>
          <p className="text-sm text-gray-600">
            Control approvals, logistics, and user activities in real time with proactive alerts.
          </p>
        </div>
        <div className="flex gap-2">
          {purchaseRequests.length > 0 && (
            <button
              onClick={() => {
                if (navigate) {
                  navigate('users/purchase-requests')
                } else {
                  setSelectedPurchaseRequest(purchaseRequests[0])
                  setCurrentView('purchaseRequest')
                }
              }}
              disabled={loadingPurchaseRequests}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package className="h-4 w-4" />
              {loadingPurchaseRequests ? 'Loading...' : `Purchase Requests (${purchaseRequests.length})`}
            </button>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, phone, email, or ID..."
            className="w-full rounded-xl border border-gray-300 bg-white pl-12 pr-4 py-3 text-sm font-semibold transition-all focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs text-gray-600">
            Found {usersList.length} user{usersList.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      <DataTable
        columns={tableColumns}
        rows={usersList}
        emptyState={searchQuery ? `No users found matching "${searchQuery}"` : "No user records found"}
      />

      {coverageReport && (
        <section className="space-y-5 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/30 p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-blue-900">Coverage Compliance (20 km rule)</h3>
              <p className="text-sm text-blue-700">
                Ensure exclusive user coverage per 20 km radius. Automated monitoring across all mapped users.
              </p>
            </div>
            <StatusBadge tone={coverageReport.conflicts.length ? 'warning' : 'success'}>
              {coverageReport.conflicts.length ? `${coverageReport.conflicts.length} conflict(s)` : 'All zones compliant'}
            </StatusBadge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200 bg-white p-4">
              <p className="text-xs text-blue-500">Users with Geo Coverage</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{coverageReport.total}</p>
              <p className="text-[0.7rem] text-blue-700">Mapped with latitude & longitude</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-xs text-yellow-600">Conflict Zones</p>
              <p className="mt-1 text-2xl font-bold text-yellow-800">{coverageReport.flaggedUsers?.length || 0}</p>
              <p className="text-[0.7rem] text-yellow-700">Users requiring reassignment</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-600">Compliant Zones</p>
              <p className="mt-1 text-2xl font-bold text-green-800">{coverageReport.compliantCount}</p>
              <p className="text-[0.7rem] text-green-700">Operating within exclusive radius</p>
            </div>
          </div>

          {coverageReport.conflicts.length > 0 ? (
            <div className="space-y-3">
              {coverageReport.conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-red-900">
                      {conflict.userA.name} ↔ {conflict.userB.name}
                    </p>
                    <p className="text-xs text-red-700">
                      Distance: {conflict.distanceKm} km • Overlap risk: {conflict.overlapKm} km inside 20 km rule
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewUserMap(conflict.userA)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-700"
                    >
                      View {conflict.userA.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewUserMap(conflict.userB)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-700"
                    >
                      View {conflict.userB.name}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-green-200 bg-white p-4 text-xs text-green-700">
              All user coverage areas comply with the 20 km exclusivity policy.
            </div>
          )}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-blue-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <h3 className="text-lg font-bold text-blue-700">User Logistics Playbook</h3>
          <p className="text-sm text-gray-600">
            Configure region-wise logistics strategies, delivery cycles, and stock protocols.
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Stock Request Review',
                description:
                  'Identify users nearing low inventory levels. Initiate auto alerts and suggest restock orders.',
                meta: 'Updated daily at 09:00',
              },
              {
                title: 'Delivery Monitoring',
                description:
                  'Flag deliveries that exceed threshold by >2 days. Auto-calculate TAT and generate delivery reminders.',
                meta: 'SLA: 24h resolution',
              },
              {
                title: 'Purchase Approval Protocols',
                description:
                  'Streamline manual approvals for stock requests. Auto populate user performance insights before approval.',
                meta: `Pending approvals: ${purchaseRequests.length}`,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                  <span>{item.title}</span>
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-xs text-gray-600">{item.description}</p>
                <p className="mt-3 text-xs font-bold text-blue-700">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  )
}

