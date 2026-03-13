import { useState, useEffect, useCallback } from 'react'
import { Settings, Truck, Package, Bell, Plus, Edit2, Trash2, AlertCircle, Recycle, ArrowLeft, Eye, RefreshCw, CheckCircle, MoreVertical } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { LogisticsSettingsForm } from '../components/LogisticsSettingsForm'
import { NotificationFormFullScreen } from '../components/NotificationFormFullScreen'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { cn } from '../../../lib/cn'

const notificationColumns = [
  { Header: 'Title', accessor: 'title' },
  { Header: 'Target', accessor: 'targetAudience' },
  { Header: 'Priority', accessor: 'priority' },
  { Header: 'Status', accessor: 'isActive' },
  { Header: 'Created', accessor: 'createdAt' },
  { Header: 'Actions', accessor: 'actions' },
]

const escalationColumns = [
  { Header: 'Order ID', accessor: 'id' },
  { Header: 'User', accessor: 'user' },
  { Header: 'Order Value', accessor: 'value' },
  { Header: 'Escalated', accessor: 'escalatedAt' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

export function OperationsPage({ subRoute = null, navigate }) {
  const { orders: ordersState } = useAdminState()
  const {
    getLogisticsSettings,
    updateLogisticsSettings,
    getEscalatedOrders,
    fulfillOrderFromWarehouse,
    revertEscalation,
    getNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    updateOrderStatus,
    getOrderDetails,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [logisticsSettings, setLogisticsSettings] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [escalatedOrders, setEscalatedOrders] = useState([])

  // View states (replacing modals with full-screen views)
  const [currentView, setCurrentView] = useState(null) // 'logistics', 'notification', 'escalation', 'revertEscalation', 'statusUpdate'
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [selectedOrderForEscalation, setSelectedOrderForEscalation] = useState(null)
  const [selectedOrderForRevert, setSelectedOrderForRevert] = useState(null)
  const [selectedOrderForStatusUpdate, setSelectedOrderForStatusUpdate] = useState(null)
  const [revertReason, setRevertReason] = useState('')
  const [fulfillmentNote, setFulfillmentNote] = useState('')

  // Status update form states
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('')
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('')
  const [isRevert, setIsRevert] = useState(false)
  const [openNotificationsDropdown, setOpenNotificationsDropdown] = useState(null)
  const [openEscalationsDropdown, setOpenEscalationsDropdown] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')

  // Fetch data
  const fetchData = useCallback(async () => {
    // Fetch logistics settings
    const logisticsResult = await getLogisticsSettings()
    if (logisticsResult.data) {
      setLogisticsSettings(logisticsResult.data)
    }

    // Fetch notifications
    const notificationsResult = await getNotifications()
    if (notificationsResult.data?.notifications) {
      setNotifications(notificationsResult.data.notifications)
    }

    // Fetch escalated orders
    const escalatedResult = await getEscalatedOrders()
    if (escalatedResult.data?.orders) {
      setEscalatedOrders(escalatedResult.data.orders)
    }
  }, [getLogisticsSettings, getNotifications, getEscalatedOrders])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveLogisticsSettings = async (settings) => {
    try {
      setIsProcessing(true)
      setProcessingMessage('Updating Logistics Settings...')
      const result = await updateLogisticsSettings(settings)
      if (result.data) {
        setCurrentView(null)
        fetchData()
        success('Logistics settings updated successfully!', 3000)
        if (navigate) navigate('operations')
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to update logistics settings'
        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          showWarning(errorMessage, 5000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to update logistics settings', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveNotification = async (notificationData) => {
    try {
      setIsProcessing(true)
      setProcessingMessage(selectedNotification ? 'Updating Notification...' : 'Creating Notification...')
      let result
      if (selectedNotification) {
        result = await updateNotification(selectedNotification.id, notificationData)
      } else {
        result = await createNotification(notificationData)
      }
      if (result.data) {
        setCurrentView(null)
        setSelectedNotification(null)
        fetchData()
        success(selectedNotification ? 'Notification updated successfully!' : 'Notification created successfully!', 3000)
        if (navigate) navigate('operations')
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to save notification'
        if (errorMessage.includes('validation') || errorMessage.includes('required')) {
          showWarning(errorMessage, 5000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to save notification', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        setIsProcessing(true)
        setProcessingMessage('Deleting Notification...')
        const result = await deleteNotification(notificationId)
        if (result.data) {
          setCurrentView(null)
          setSelectedNotification(null)
          fetchData()
          success('Notification deleted successfully!', 3000)
          if (navigate) navigate('operations')
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to delete notification'
          showError(errorMessage, 5000)
        }
      } catch (error) {
        showError(error.message || 'Failed to delete notification', 5000)
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleFulfillFromWarehouse = async (orderId, fulfillmentData) => {
    try {
      setIsProcessing(true)
      setProcessingMessage('Processing Fulfillment...')
      const result = await fulfillOrderFromWarehouse(orderId, fulfillmentData)
      if (result.data) {
        setCurrentView(null)
        setSelectedOrderForEscalation(null)
        fetchData()
        success('Order fulfilled from warehouse successfully!', 3000)
        if (navigate) navigate('operations')
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to fulfill order'
        if (errorMessage.includes('stock') || errorMessage.includes('unavailable') || errorMessage.includes('cannot')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to fulfill order', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevertEscalation = async () => {
    if (!revertReason.trim()) {
      showError('Please provide a reason for reverting the escalation')
      return
    }

    try {
      setIsProcessing(true)
      setProcessingMessage('Reverting Escalation...')
      const result = await revertEscalation(selectedOrderForRevert.id, { reason: revertReason.trim() })
      if (result.data) {
        setCurrentView(null)
        setSelectedOrderForRevert(null)
        setRevertReason('')
        fetchData()
        success('Escalation reverted successfully. Order assigned back to user.', 3000)
        if (navigate) navigate('operations')
      } else if (result.error) {
        showError(result.error.message || 'Failed to revert escalation', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to revert escalation', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBackToList = () => {
    setCurrentView(null)
    setSelectedNotification(null)
    setSelectedOrderForEscalation(null)
    setSelectedOrderForRevert(null)
    setSelectedOrderForStatusUpdate(null)
    setRevertReason('')
    setSelectedStatus('')
    setSelectedPaymentStatus('')
    setStatusUpdateNotes('')
    setIsRevert(false)
    if (navigate) navigate('operations')
  }

  const handleUpdateOrderStatus = async (orderId, updateData) => {
    try {
      setIsProcessing(true)
      setProcessingMessage('Updating Status...')
      const result = await updateOrderStatus(orderId, updateData)
      if (result.data) {
        setCurrentView(null)
        setSelectedOrderForStatusUpdate(null)
        setSelectedStatus('')
        setSelectedPaymentStatus('')
        setStatusUpdateNotes('')
        setIsRevert(false)
        fetchData()
        success(result.data.message || 'Order status updated successfully!', 3000)
        if (navigate) navigate('operations')
      } else if (result.error) {
        showError(result.error.message || 'Failed to update order status', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to update order status', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to normalize order status
  const normalizeOrderStatus = (status) => {
    if (!status) return 'awaiting'
    const normalized = status.toLowerCase()
    if (normalized === 'fully_paid') return 'fully_paid'
    if (normalized === 'accepted' || normalized === 'processing') return 'accepted'
    if (normalized === 'dispatched' || normalized === 'out_for_delivery' || normalized === 'ready_for_delivery') return 'dispatched'
    if (normalized === 'delivered') return 'delivered'
    if (normalized === 'pending' || normalized === 'awaiting') return 'awaiting'
    return normalized
  }

  // Helper function to get next status
  const getNextStatus = (order) => {
    const currentStatus = normalizeOrderStatus(order?.status)
    const paymentPreference = order?.paymentPreference || 'partial'
    const isAlreadyPaid = order?.paymentStatus === 'fully_paid'

    if (currentStatus === 'awaiting') return 'accepted'
    if (currentStatus === 'accepted') return 'dispatched'
    if (currentStatus === 'dispatched') return 'delivered'
    if (currentStatus === 'delivered' && paymentPreference !== 'full' && !isAlreadyPaid) return 'fully_paid'
    return null
  }

  // Helper function to get status button config
  const getStatusButtonConfig = (order) => {
    const nextStatus = getNextStatus(order)
    if (!nextStatus) return null

    const configs = {
      dispatched: {
        label: 'Mark Dispatched',
        icon: Truck,
        className: 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100',
        title: 'Mark as Dispatched',
      },
      delivered: {
        label: 'Mark Delivered',
        icon: CheckCircle,
        className: 'border-green-300 bg-green-50 text-green-700 hover:border-green-500 hover:bg-green-100',
        title: 'Mark as Delivered',
      },
      fully_paid: {
        label: 'Payment Done',
        icon: Package,
        className: 'border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-500 hover:bg-purple-100',
        title: 'Mark Payment as Done',
      },
      accepted: {
        label: 'Mark Accepted',
        icon: CheckCircle,
        className: 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100',
        title: 'Mark as Accepted',
      },
    }

    return configs[nextStatus]
  }

  // Handler for opening status update modal (similar to Orders screen)
  const handleOpenStatusUpdateModal = (order) => {
    setSelectedOrderForStatusUpdate(order)
    // Initialize status update form state
    const currentStatus = (order?.status || '').toLowerCase()
    const normalizedCurrentStatus = normalizeOrderStatus(currentStatus)
    const isInStatusUpdateGracePeriod = order?.statusUpdateGracePeriod?.isActive
    const previousStatus = order?.statusUpdateGracePeriod?.previousStatus

    if (isInStatusUpdateGracePeriod && previousStatus) {
      const normalizedPrevious = normalizeOrderStatus(previousStatus)
      setSelectedStatus(normalizedPrevious)
      setIsRevert(true)
    } else {
      const nextStatus = getNextStatus(order)
      setSelectedStatus(nextStatus || normalizedCurrentStatus)
      setIsRevert(false)
    }
    setSelectedPaymentStatus('')
    setStatusUpdateNotes('')
    setCurrentView('statusUpdate')
  }

  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  // Helper function to format status for display (replace underscores with spaces)
  const formatStatusForDisplay = (status) => {
    if (!status) return 'Unknown'
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const notificationTableColumns = notificationColumns.map((column) => {
    if (column.accessor === 'targetAudience') {
      return {
        ...column,
        Cell: (row) => {
          const audience = row.targetAudience || 'all'
          const labels = {
            all: 'All Users',
            admins: 'Admins',
            users: 'Users',
          }
          return <span className="text-sm font-bold text-gray-900">{labels[audience] || audience}</span>
        },
      }
    }
    if (column.accessor === 'priority') {
      return {
        ...column,
        Cell: (row) => {
          const priority = row.priority || 'normal'
          const tones = {
            urgent: 'neutral',
            high: 'warning',
            normal: 'success',
            low: 'neutral',
          }
          return <StatusBadge tone={tones[priority] || 'neutral'}>{priority}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'isActive') {
      return {
        ...column,
        Cell: (row) => {
          return <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const isDropdownOpen = openNotificationsDropdown === row.id

          const actionItems = [
            {
              label: 'Edit notification',
              icon: Edit2,
              onClick: () => {
                setSelectedNotification(row)
                setCurrentView('notification')
                setOpenNotificationsDropdown(null)
              },
              className: 'text-gray-700 hover:bg-gray-50'
            },
            {
              label: 'Delete notification',
              icon: Trash2,
              onClick: () => {
                handleDeleteNotification(row.id)
                setOpenNotificationsDropdown(null)
              },
              className: 'text-red-600 hover:bg-red-50'
            }
          ]

          return (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenNotificationsDropdown(isDropdownOpen ? null : row.id)
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
                    onClick={() => setOpenNotificationsDropdown(null)}
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

  const escalationTableColumns = escalationColumns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          // Get the raw status value
          const rawStatus = row.status || ''
          const currentStatus = rawStatus.toLowerCase()
          const normalizedStatus = normalizeOrderStatus(currentStatus)

          // Explicitly check for 'rejected' status - always show as "Awaiting" for escalated orders
          if (currentStatus === 'rejected' || rawStatus.toLowerCase() === 'rejected') {
            return (
              <div className="flex flex-col gap-1">
                <StatusBadge tone="warning">Escalated</StatusBadge>
                <span className="text-xs text-gray-500">Awaiting</span>
              </div>
            )
          }

          // Check if order is fulfilled (accepted or beyond)
          const isFulfilled = normalizedStatus === 'accepted' || normalizedStatus === 'dispatched' || normalizedStatus === 'delivered' || normalizedStatus === 'fully_paid'

          if (isFulfilled) {
            // Show the actual status for fulfilled orders
            const displayStatus = normalizedStatus === 'accepted' ? 'Accepted' :
              normalizedStatus === 'dispatched' ? 'Dispatched' :
                normalizedStatus === 'delivered' ? 'Delivered' :
                  normalizedStatus === 'fully_paid' ? 'Fully Paid' : 'Accepted'
            return (
              <div className="flex flex-col gap-1">
                <StatusBadge tone="success">Accepted</StatusBadge>
                <span className="text-xs text-gray-500">{displayStatus}</span>
              </div>
            )
          }

          // For escalated orders not yet fulfilled (including 'awaiting', 'pending', etc.),
          // ALWAYS show "Awaiting" regardless of actual status value
          return (
            <div className="flex flex-col gap-1">
              <StatusBadge tone="warning">Escalated</StatusBadge>
              <span className="text-xs text-gray-500">Awaiting</span>
            </div>
          )
        },
      }
    }
    if (column.accessor === 'value') {
      return {
        ...column,
        Cell: (row) => {
          return <span className="text-sm font-bold text-gray-900">{formatCurrency(row.value || row.orderValue || 0)}</span>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const currentStatus = (row.status || '').toLowerCase()
          const normalizedStatus = normalizeOrderStatus(currentStatus)
          const isFulfilled = normalizedStatus === 'accepted' || normalizedStatus === 'dispatched' || normalizedStatus === 'delivered' || normalizedStatus === 'fully_paid'
          const paymentPreference = row.paymentPreference || 'partial'
          const workflowCompleted = paymentPreference === 'partial'
            ? normalizedStatus === 'fully_paid'
            : normalizedStatus === 'delivered'
          const isInStatusUpdateGracePeriod = row.statusUpdateGracePeriod?.isActive
          const statusUpdateGracePeriodExpiresAt = row.statusUpdateGracePeriod?.expiresAt
          const statusUpdateTimeRemaining = statusUpdateGracePeriodExpiresAt ? Math.max(0, Math.floor((new Date(statusUpdateGracePeriodExpiresAt) - new Date()) / 1000 / 60)) : 0
          const previousStatus = row.statusUpdateGracePeriod?.previousStatus
          const hideUpdateButton = workflowCompleted && !isInStatusUpdateGracePeriod
          const statusButtonConfig = hideUpdateButton ? null : getStatusButtonConfig(row)

          const isDropdownOpen = openEscalationsDropdown === row.id

          const actionItems = [
            {
              label: 'View details',
              icon: Eye,
              onClick: () => {
                if (navigate) {
                  navigate(`orders/escalated?viewOrder=${row.id}`)
                }
                setOpenEscalationsDropdown(null)
              },
              className: 'text-gray-700 hover:bg-gray-50'
            }
          ]

          // Fulfill button
          if (!isFulfilled) {
            actionItems.push({
              label: 'Fulfill from Warehouse',
              icon: Package,
              onClick: () => {
                setSelectedOrderForEscalation(row)
                setFulfillmentNote('')
                setCurrentView('escalation')
                setOpenEscalationsDropdown(null)
              },
              className: 'text-green-600 hover:bg-green-50'
            })
          }

          if (isFulfilled) {
            // Confirm Status Update
            if (isInStatusUpdateGracePeriod && !workflowCompleted) {
              actionItems.push({
                label: 'Confirm Update',
                icon: CheckCircle,
                onClick: async () => {
                  const result = await updateOrderStatus(row.id, { finalizeGracePeriod: true })
                  if (result.data) {
                    fetchData()
                    success(result.data.message || 'Status update confirmed successfully!', 3000)
                  } else if (result.error) {
                    showError(result.error.message || 'Failed to confirm status update', 5000)
                  }
                  setOpenEscalationsDropdown(null)
                },
                className: 'text-green-700 hover:bg-green-50'
              })
            }

            // Revert button
            if (isInStatusUpdateGracePeriod && previousStatus && !workflowCompleted) {
              actionItems.push({
                label: `Revert to ${previousStatus}`,
                icon: ArrowLeft,
                onClick: () => {
                  handleOpenStatusUpdateModal(row)
                  setOpenEscalationsDropdown(null)
                },
                className: 'text-orange-700 hover:bg-orange-50'
              })
            }

            // Update Status button
            if (!hideUpdateButton && !isInStatusUpdateGracePeriod) {
              actionItems.push({
                label: statusButtonConfig?.label || 'Update Status',
                icon: statusButtonConfig?.icon || RefreshCw,
                onClick: () => {
                  handleOpenStatusUpdateModal(row)
                  setOpenEscalationsDropdown(null)
                },
                disabled: !statusButtonConfig,
                className: 'text-blue-700 hover:bg-blue-50'
              })
            }
          }

          return (
            <div className="flex flex-col gap-1 items-end">
              {isInStatusUpdateGracePeriod && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 mb-1">
                  ⏰ {statusUpdateTimeRemaining}m to revert
                </div>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenEscalationsDropdown(isDropdownOpen ? null : row.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-700"
                  title="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenEscalationsDropdown(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
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
            </div>
          )
        },
      }
    }
    return column
  })

  // Handle sub-routes
  useEffect(() => {
    if (subRoute === 'notifications/add') {
      setSelectedNotification(null)
      setCurrentView('notification')
    } else if (subRoute === 'delivery-timeline/update') {
      setCurrentView('logistics')
    } else if (subRoute === null || subRoute === '') {
      setCurrentView(null)
    }
  }, [subRoute])

  // Show full-screen views (replacing modals)
  if (currentView === 'logistics') {
    return (
      <LogisticsSettingsForm
        settings={logisticsSettings}
        onSave={handleSaveLogisticsSettings}
        onCancel={handleBackToList}
        loading={loading}
      />
    )
  }

  if (currentView === 'notification') {
    return (
      <NotificationFormFullScreen
        notification={selectedNotification}
        onSave={handleSaveNotification}
        onDelete={handleDeleteNotification}
        onCancel={handleBackToList}
        loading={loading}
      />
    )
  }

  if (currentView === 'escalation' && selectedOrderForEscalation) {
    const order = selectedOrderForEscalation

    const handleFulfill = () => {
      handleFulfillFromWarehouse(order.id, {
        note: fulfillmentNote.trim() || 'Order fulfilled from master warehouse',
      })
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
            Back to Operations
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Operational Controls</p>
            <h2 className="text-2xl font-bold text-gray-900">Order Escalation - Manual Fulfillment</h2>
            <p className="text-sm text-gray-600">
              Fulfill escalated order from master warehouse.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-6">
            {/* Order Info */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber || order.id}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">User:</span>
                  <span className="font-bold text-gray-900">{order.user || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Value:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(order.value || order.orderValue || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge tone="warning">User Not Available</StatusBadge>
                </div>
              </div>
            </div>

            {/* Escalation Reason */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-orange-600" />
                <div>
                  <p className="text-sm font-bold text-orange-900">Escalation Reason</p>
                  <p className="mt-1 text-xs text-orange-700">
                    {order.escalationReason || order.escalation?.escalationReason || order.notes || 'User marked this order as "Not Available". You can manually fulfill this order from the master warehouse.'}
                  </p>
                  {order.escalation?.escalatedAt && (
                    <p className="mt-2 text-xs text-orange-600">
                      Escalated on: {new Date(order.escalation.escalatedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="mb-3 text-sm font-bold text-gray-900">Order Items</p>
                <div className="space-y-2">
                  {order.items.map((item, index) => {
                    const itemId = item._id || item.id || index
                    const productName = item.productName || item.productId?.name || item.name || item.product || 'Unknown Product'
                    const quantity = item.quantity || 1
                    const unitPrice = item.unitPrice || item.price || item.amount || 0
                    const totalPrice = item.totalPrice || (unitPrice * quantity)

                    return (
                      <div key={itemId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{productName}</p>
                          <p className="text-xs text-gray-600">Qty: {quantity} {item.unit || 'units'}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(totalPrice)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fulfillment Note */}
            <div>
              <label htmlFor="fulfillmentNote" className="mb-2 block text-sm font-bold text-gray-900">
                Fulfillment Note (Optional)
              </label>
              <textarea
                id="fulfillmentNote"
                value={fulfillmentNote}
                onChange={(e) => setFulfillmentNote(e.target.value)}
                placeholder="Add any notes about this fulfillment..."
                rows={3}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-xs text-blue-900">
                  <p className="font-bold">Master Warehouse Fulfillment</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Order will be fulfilled from master warehouse inventory</li>
                    <li>User will be notified of the fulfillment</li>
                    <li>Order status will be updated to "Accepted"</li>
                    <li>You can then update status: Dispatched → Delivered → Fully Paid (if partial payment)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBackToList}
                disabled={loading}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFulfill}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <Package className="h-4 w-4" />
                {loading ? 'Fulfilling...' : 'Fulfill from Warehouse'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'revertEscalation' && selectedOrderForRevert) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Operations
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Operational Controls</p>
            <h2 className="text-2xl font-bold text-gray-900">Revert Escalation</h2>
            <p className="text-sm text-gray-600">
              Revert escalated order back to user.
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm font-semibold text-orange-900">Order #{selectedOrderForRevert.orderNumber}</p>
              <p className="text-xs text-orange-700 mt-1">
                User: {selectedOrderForRevert.user || 'N/A'} | Value: {formatCurrency(selectedOrderForRevert.value || 0)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Reason for Reverting <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Why are you reverting this escalation back to the user?"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">
                  This order will be assigned back to the original user. The user will receive a notification and can proceed with fulfillment.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBackToList}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevertEscalation}
                disabled={loading || !revertReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Reverting...'
                ) : (
                  <>
                    <Recycle className="h-4 w-4" />
                    Revert to User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Status Update View
  if (currentView === 'statusUpdate' && selectedOrderForStatusUpdate) {
    const order = selectedOrderForStatusUpdate
    const currentStatus = (order?.status || '').toLowerCase()
    const currentPaymentStatus = order?.paymentStatus || 'pending'
    const isPaid = currentPaymentStatus === 'fully_paid'
    const isInStatusUpdateGracePeriod = order?.statusUpdateGracePeriod?.isActive
    const statusUpdateGracePeriodExpiresAt = order?.statusUpdateGracePeriod?.expiresAt
    const statusUpdateTimeRemaining = statusUpdateGracePeriodExpiresAt
      ? Math.max(0, Math.floor((new Date(statusUpdateGracePeriodExpiresAt) - new Date()) / 1000 / 60))
      : 0
    const previousStatus = order?.statusUpdateGracePeriod?.previousStatus
    const normalizedCurrentStatus = normalizeOrderStatus(currentStatus)

    const ORDER_STATUS_OPTIONS = [
      { value: 'accepted', label: 'Accepted', description: 'Order has been accepted and is ready for dispatch' },
      { value: 'dispatched', label: 'Dispatched', description: 'Order has been dispatched for delivery' },
      { value: 'delivered', label: 'Delivered', description: 'Order has been delivered' },
    ]

    const PAYMENT_STATUS_OPTIONS = [
      { value: 'fully_paid', label: 'Mark Payment as Done', description: 'Mark order payment as fully paid' },
    ]

    // Get payment preference from order
    const paymentPreference = order?.paymentPreference || 'partial'
    const isFullPayment = paymentPreference === 'full'

    const normalizeStatusForDisplay = (status) => {
      const normalized = (status || '').toLowerCase()
      if (normalized === 'fully_paid') return 'delivered'
      if (normalized === 'accepted' || normalized === 'processing') return 'accepted'
      if (normalized === 'dispatched' || normalized === 'out_for_delivery' || normalized === 'ready_for_delivery') return 'dispatched'
      if (normalized === 'delivered') return 'delivered'
      return 'accepted'
    }

    const getAvailableStatusOptions = () => {
      const options = []
      if (isInStatusUpdateGracePeriod && previousStatus) {
        const normalizedPrevious = normalizeStatusForDisplay(previousStatus)
        const option = ORDER_STATUS_OPTIONS.find(opt => opt.value === normalizedPrevious)
        if (option) {
          return [{ value: normalizedPrevious, label: `Revert to ${option.label}`, description: 'Revert to previous status' }]
        }
      }
      const statusFlow = ['accepted', 'dispatched', 'delivered']
      const currentIndex = statusFlow.indexOf(normalizedCurrentStatus)
      if (currentIndex >= 0) {
        const currentOption = ORDER_STATUS_OPTIONS.find(opt => opt.value === statusFlow[currentIndex])
        if (currentOption) options.push(currentOption)
        const nextIndex = currentIndex + 1
        if (nextIndex < statusFlow.length) {
          const nextOption = ORDER_STATUS_OPTIONS.find(opt => opt.value === statusFlow[nextIndex])
          if (nextOption) options.push(nextOption)
        }
      } else {
        options.push(...ORDER_STATUS_OPTIONS)
      }
      return options
    }

    const handleStatusUpdateSubmit = () => {
      if (!selectedStatus && !selectedPaymentStatus) return
      const backendStatus = selectedPaymentStatus === 'fully_paid'
        ? 'fully_paid'
        : selectedStatus
      const updateData = {
        status: backendStatus,
        notes: statusUpdateNotes.trim() || undefined,
        isRevert: isRevert,
      }
      handleUpdateOrderStatus(order.id, updateData)
    }

    const canUpdate = () => {
      if (isInStatusUpdateGracePeriod && previousStatus) {
        const normalizedPrevious = normalizeStatusForDisplay(previousStatus)
        return selectedStatus === normalizedPrevious
      }
      return selectedStatus || selectedPaymentStatus
    }

    const availableStatusOptions = getAvailableStatusOptions()
    // Show payment option only if:
    // 1. Order is delivered
    // 2. Payment is not already fully paid
    // 3. Payment preference is partial (not full payment)
    const showPaymentOption = currentStatus === 'delivered' && !isPaid && !isFullPayment

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            title="Back to Operations"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{isRevert ? 'Revert Current Status' : 'Update Order Status'}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="space-y-6">
            {/* Order Info */}
            {order && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber || order.id}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Status:</span>
                    <span className="font-bold text-gray-900 capitalize">{availableStatusOptions.find(opt => opt.value === normalizedCurrentStatus)?.label || normalizedCurrentStatus || 'Unknown'}</span>
                  </div>
                  {!isInStatusUpdateGracePeriod && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next Status:</span>
                      <span className="font-bold text-blue-600 capitalize">
                        {(() => {
                          const nextStatus = getNextStatus(order)
                          if (nextStatus) {
                            const nextOption = ORDER_STATUS_OPTIONS.find(opt => opt.value === nextStatus)
                            return nextOption?.label || nextStatus
                          }
                          if (normalizedCurrentStatus === 'delivered' && !isPaid && !isFullPayment) {
                            return 'Fully Paid'
                          }
                          return 'N/A'
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="font-bold text-gray-900 capitalize">
                      {isPaid ? 'Paid' : currentPaymentStatus === 'partial_paid' ? 'Partial Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Type:</span>
                    <span className="font-bold text-gray-900 capitalize">
                      {isFullPayment ? 'Full Payment (100%)' : 'Partial Payment (30% advance, 70% after delivery)'}
                    </span>
                  </div>
                  {order.value && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Order Value:</span>
                      <span className="font-bold text-gray-900">
                        {typeof order.value === 'number'
                          ? formatCurrency(order.value)
                          : order.value || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grace Period Notice */}
            {isInStatusUpdateGracePeriod && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-900">
                    <p className="font-bold">Status Update Grace Period Active</p>
                    <p className="mt-1">
                      You have {statusUpdateTimeRemaining} minutes remaining to revert to "{formatStatusForDisplay(previousStatus)}" status.
                      After this period, the current status will be finalized.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Selection */}
            {(!isPaid || isInStatusUpdateGracePeriod) && (
              <div>
                <label htmlFor="status" className="mb-2 block text-sm font-bold text-gray-900">
                  Order Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value)
                    setIsRevert(false)
                  }}
                  disabled={isInStatusUpdateGracePeriod && previousStatus}
                  className={cn(
                    'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                    isInStatusUpdateGracePeriod && previousStatus && 'bg-gray-100 cursor-not-allowed'
                  )}
                >
                  <option value="">Select status...</option>
                  {availableStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selectedStatus && (
                  <p className="mt-2 text-xs text-gray-600">
                    {availableStatusOptions.find(opt => opt.value === selectedStatus)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Payment Status Selection */}
            {showPaymentOption && !isPaid && (
              <div>
                <label htmlFor="paymentStatus" className="mb-2 block text-sm font-bold text-gray-900">
                  Payment Status
                </label>
                <select
                  id="paymentStatus"
                  value={selectedPaymentStatus}
                  onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="">Select payment status...</option>
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selectedPaymentStatus && (
                  <p className="mt-2 text-xs text-gray-600">
                    {PAYMENT_STATUS_OPTIONS.find(opt => opt.value === selectedPaymentStatus)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-bold text-gray-900">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={statusUpdateNotes}
                onChange={(e) => setStatusUpdateNotes(e.target.value)}
                placeholder="Add any notes about this status update..."
                rows={3}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBackToList}
                disabled={loading}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdateSubmit}
                disabled={loading || !canUpdate()}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50',
                  isRevert ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                )}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : isRevert ? (
                  <>
                    <ArrowLeft className="h-4 w-4" />
                    Confirm Revert
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Update Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show main Operations page (default)
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Operational Controls</p>
          <h2 className="text-2xl font-bold text-gray-900">Operations & Settings</h2>
          <p className="text-sm text-gray-600">
            Manage logistics settings, handle order escalations, and control platform notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigate) navigate('operations/delivery-timeline/update')
              else setCurrentView('logistics')
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <Truck className="h-4 w-4" />
            Delivery Settings
          </button>
          <button
            onClick={() => {
              setSelectedNotification(null)
              if (navigate) navigate('operations/notifications/add')
              else setCurrentView('notification')
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            New Notification
          </button>
        </div>
      </header>

      {/* Logistics Settings Summary */}
      <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-blue-700">Logistics & Delivery Settings</h3>
              <p className="text-sm text-gray-600">Configure delivery timelines shown to users</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (navigate) navigate('operations/delivery-timeline/update')
              else setCurrentView('logistics')
            }}
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50"
          >
            Configure
          </button>
        </div>
        {logisticsSettings && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Default Delivery</p>
              <p className="text-lg font-bold text-gray-900">
                {logisticsSettings.defaultDeliveryTime === '3h' ? '3 Hours' :
                  logisticsSettings.defaultDeliveryTime === '4h' ? '4 Hours' : '1 Day'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Available Options</p>
              <p className="text-lg font-bold text-gray-900">
                {logisticsSettings.availableDeliveryOptions?.length || 0} options
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusBadge tone="success">Active</StatusBadge>
            </div>
          </div>
        )}
      </div>

      {/* Escalated Orders */}
      {escalatedOrders.length > 0 && (
        <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <h3 className="text-lg font-bold text-orange-700">Escalated Orders</h3>
              <p className="text-sm text-gray-600">Orders marked as "Not Available" by users</p>
            </div>
          </div>
          <DataTable
            columns={escalationTableColumns}
            rows={escalatedOrders}
            emptyState="No escalated orders"
          />
        </div>
      )}

      {/* Notifications */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Platform Notifications</h3>
              <p className="text-sm text-gray-600">Manage announcements and policy updates</p>
            </div>
          </div>
        </div>
        <DataTable
          columns={notificationTableColumns}
          rows={notifications}
          emptyState="No notifications created yet"
        />
      </div>

      <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
    </div>
  )
}

