import { useState, useEffect, useCallback } from 'react'
import { CalendarRange, Recycle, Truck, Eye, FileText, RefreshCw, AlertCircle, Warehouse, ArrowLeft, CheckCircle, CreditCard, Package, IndianRupee, Calendar, Download, Building2, MapPin, MoreVertical } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { FilterBar } from '../components/FilterBar'
import { Timeline } from '../components/Timeline'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'

import { cn } from '../../../lib/cn'

const columns = [
  { Header: 'Order ID', accessor: 'id' },
  { Header: 'User', accessor: 'userName' },
  { Header: 'User Location', accessor: 'userLocation' },
  { Header: 'User', accessor: 'user' },
  { Header: 'User Location', accessor: 'userLocation' },
  { Header: 'Order Value', accessor: 'value' },
  { Header: 'Advance (30%)', accessor: 'advance' },
  { Header: 'Pending (70%)', accessor: 'pending' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]


const REGIONS = ['All', 'West', 'North', 'South', 'Central', 'North East', 'East']
const ORDER_STATUSES = ['All', 'Processing', 'Awaiting Dispatch', 'Completed', 'Cancelled']
const ORDER_TYPES = ['All', 'User', 'User']

export function OrdersPage({ subRoute = null, navigate }) {
  const { orders: ordersState, users } = useAdminState()
  const {
    getOrders,
    getOrderDetails,
    reassignOrder,
    generateInvoice,
    getUsers,
    revertEscalation,
    fulfillOrderFromWarehouse,
    updateOrderStatus,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [ordersList, setOrdersList] = useState([])
  const [allOrdersList, setAllOrdersList] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])

  // Filter states
  const [filters, setFilters] = useState({
    region: 'All',
    user: 'All',
    status: 'All',
    type: 'All',
    dateFrom: '',
    dateTo: '',
  })

  // View states (replacing modals with full-screen views)
  const [currentView, setCurrentView] = useState(null) // 'orderDetail', 'reassign', 'escalation', 'statusUpdate', 'revertEscalation'
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [selectedOrderForReassign, setSelectedOrderForReassign] = useState(null)
  const [selectedOrderForEscalation, setSelectedOrderForEscalation] = useState(null)
  const [selectedOrderForRevert, setSelectedOrderForRevert] = useState(null)
  const [revertReason, setRevertReason] = useState('')
  const [selectedOrderForStatusUpdate, setSelectedOrderForStatusUpdate] = useState(null)

  // Reassignment form states
  const [selectedUserId, setSelectedUserId] = useState('')
  const [reassignReason, setReassignReason] = useState('')
  const [reassignErrors, setReassignErrors] = useState({})

  // Escalation form states
  const [fulfillmentNote, setFulfillmentNote] = useState('')

  // Status update form states
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('')
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('')
  const [isRevert, setIsRevert] = useState(false)

  // Dropdown state for actions menu
  const [openActionsDropdown, setOpenActionsDropdown] = useState(null)

  // Format order data for display
  const formatOrderForDisplay = (order) => {
    const orderValue = typeof order.value === 'number'
      ? order.value
      : parseFloat(order.value?.replace(/[₹,\sL]/g, '') || '0') * 100000

    const advanceAmount = typeof order.advance === 'number'
      ? order.advance
      : order.advanceStatus === 'paid' ? orderValue * 0.3 : 0

    const pendingAmount = typeof order.pending === 'number'
      ? order.pending
      : parseFloat(order.pending?.replace(/[₹,\sL]/g, '') || '0') * 100000

    return {
      ...order,
      value: orderValue >= 100000 ? `₹${(orderValue / 100000).toFixed(1)} L` : `₹${orderValue.toLocaleString('en-IN')}`,
      advance: order.advanceStatus === 'paid' || order.advance === 'Paid' ? 'Paid' : 'Pending',
      pending: pendingAmount >= 100000 ? `₹${(pendingAmount / 100000).toFixed(1)} L` : `₹${pendingAmount.toLocaleString('en-IN')}`,
      paymentStatus: order.paymentStatus || 'pending',
      isPaid: order.paymentStatus === 'fully_paid',
      statusUpdateGracePeriod: order.statusUpdateGracePeriod || null,
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openActionsDropdown && !event.target.closest('.relative')) {
        setOpenActionsDropdown(null)
      }
    }

    if (openActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [openActionsDropdown])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    const params = {}
    if (filters.region !== 'All') params.region = filters.region
    if (filters.user !== 'All') params.userId = filters.user
    if (filters.status !== 'All') params.status = filters.status.toLowerCase().replace(' ', '_')
    if (filters.type !== 'All') params.type = filters.type.toLowerCase()
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo

    const result = await getOrders(params)
    if (result.data?.orders) {
      const formatted = result.data.orders.map(formatOrderForDisplay)
      setAllOrdersList(formatted)
    } else {
      setAllOrdersList([])
    }
  }, [getOrders, filters])

  // Filter orders based on subRoute
  useEffect(() => {
    if (subRoute === 'escalated') {
      setOrdersList(allOrdersList.filter((o) => {
        const originalOrder = ordersState.data?.orders?.find((ord) => ord.id === o.id) || o
        return originalOrder.escalated || originalOrder.assignedTo === 'admin'
      }))
    } else if (subRoute === 'processing') {
      // Processing orders: accepted but not delivered
      setOrdersList(allOrdersList.filter((o) => {
        const status = (o.status || '').toLowerCase()
        return (status === 'processing' || status === 'accepted' || status === 'awaiting dispatch' || status === 'dispatched') &&
          status !== 'delivered' && status !== 'completed' && status !== 'fully_paid'
      }))
    } else if (subRoute === 'completed') {
      // Completed: delivered and fully paid
      setOrdersList(allOrdersList.filter((o) => {
        const originalOrder = ordersState.data?.orders?.find((ord) => ord.id === o.id) || o
        const status = (o.status || '').toLowerCase()
        const isPaid = o.isPaid || originalOrder.paymentStatus === 'fully_paid'
        return (status === 'delivered' || status === 'completed') && isPaid
      }))
    } else {
      setOrdersList(allOrdersList)
    }
  }, [subRoute, allOrdersList, ordersState.data?.orders])

  // Fetch users for reassignment
  const fetchUsers = useCallback(async () => {
    const result = await getUsers()
    if (result.data?.users) {
      setAvailableUsers(result.data.users)
    }
  }, [getUsers])

  useEffect(() => {
    fetchOrders()
    fetchUsers()
  }, [fetchOrders, fetchUsers])

  // Refresh when orders are updated
  useEffect(() => {
    if (ordersState.updated) {
      fetchOrders()
    }
  }, [ordersState.updated, fetchOrders])

  const handleFilterChange = (filter) => {
    // This would open a dropdown/modal for filter selection
    // For now, we'll toggle the active state
    setFilters((prev) => ({
      ...prev,
      [filter.id]: prev[filter.id] === filter.label ? 'All' : filter.label,
    }))
  }

  const handleViewOrderDetails = async (order) => {
    const originalOrder = ordersState.data?.orders?.find((o) => o.id === order.id) || order
    setSelectedOrderForDetail(originalOrder)

    // Fetch detailed order data
    const result = await getOrderDetails(order.id)
    if (result.data) {
      setOrderDetails(result.data)
    }

    setCurrentView('orderDetail')
  }

  const handleReassignOrder = (order) => {
    const originalOrder = ordersState.data?.orders?.find((o) => o.id === order.id) || order
    setSelectedOrderForReassign(originalOrder)
    setSelectedUserId('')
    setReassignReason('')
    setReassignErrors({})
    setCurrentView('reassign')
  }

  const handleBackToList = () => {
    setCurrentView(null)
    setSelectedOrderForDetail(null)
    setOrderDetails(null)
    setSelectedOrderForReassign(null)
    setSelectedOrderForEscalation(null)
    setSelectedOrderForRevert(null)
    setRevertReason('')
    setSelectedOrderForStatusUpdate(null)
    setSelectedUserId('')
    setReassignReason('')
    setReassignErrors({})
    setFulfillmentNote('')
    setSelectedStatus('')
    setSelectedPaymentStatus('')
    setStatusUpdateNotes('')
    setIsRevert(false)
    if (navigate) navigate('orders')
  }

  const handleReassignSubmit = async (orderId, reassignData) => {
    try {
      const result = await reassignOrder(orderId, reassignData)
      if (result.data) {
        setCurrentView(null)
        setSelectedOrderForReassign(null)
        setSelectedUserId('')
        setReassignReason('')
        setReassignErrors({})
        fetchOrders()
        success('Order reassigned successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to reassign order'
        if (errorMessage.includes('user') || errorMessage.includes('unavailable') || errorMessage.includes('stock')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to reassign order', 5000)
    }
  }

  const handleGenerateInvoice = async (orderId) => {
    try {
      const result = await generateInvoice(orderId)
      if (result.data) {
        // Invoice is automatically downloaded and opened for printing
        success(result.data.message || 'Invoice generated successfully! Use browser print (Ctrl+P) to save as PDF.', 5000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to generate invoice'
        if (errorMessage.includes('not found') || errorMessage.includes('cannot')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to generate invoice', 5000)
    }
  }

  const handleProcessRefund = async (orderId) => {
    const confirmed = window.confirm('Are you sure you want to process this refund?')
    if (confirmed) {
      // This would call a refund API
      console.log('Processing refund for order:', orderId)
      alert('Refund processed successfully')
      fetchOrders()
    }
  }

  const handleRevertEscalation = async () => {
    if (!revertReason.trim()) {
      showError('Please provide a reason for reverting the escalation')
      return
    }

    try {
      const result = await revertEscalation(selectedOrderForRevert.id, { reason: revertReason.trim() })
      if (result.data) {
        setCurrentView(null)
        setSelectedOrderForRevert(null)
        setRevertReason('')
        fetchOrders()
        success('Escalation reverted successfully. Order assigned back to user.', 3000)
      } else if (result.error) {
        showError(result.error.message || 'Failed to revert escalation', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to revert escalation', 5000)
    }
  }

  const handleFulfillFromWarehouse = async (orderId, fulfillmentData) => {
    try {
      const result = await fulfillOrderFromWarehouse(orderId, fulfillmentData)
      if (result.data) {
        // After successful fulfill, automatically open status update interface
        // Fetch updated order details to get the new status
        try {
          const orderDetailsResult = await getOrderDetails(orderId)
          if (orderDetailsResult.data?.order) {
            const updatedOrder = orderDetailsResult.data.order
            // Set the fulfilled order for status update
            setSelectedOrderForStatusUpdate(updatedOrder)
            // Initialize status update form
            const currentStatus = (updatedOrder?.status || '').toLowerCase()
            const normalizedCurrentStatus = normalizeOrderStatus(currentStatus)
            const nextStatus = getNextStatus(updatedOrder)
            setSelectedStatus(nextStatus || normalizedCurrentStatus)
            setIsRevert(false)
            setSelectedPaymentStatus('')
            setStatusUpdateNotes('')
            // Switch to status update view
            setCurrentView('statusUpdate')
            setFulfillmentNote('')
            success('Order fulfilled from warehouse successfully! Status set to Accepted. You can now update the order status.', 4000)
          } else {
            // Fallback: just close escalation view and refresh
            setCurrentView(null)
            setSelectedOrderForEscalation(null)
            setFulfillmentNote('')
            fetchOrders()
            success('Order fulfilled from warehouse successfully!', 3000)
          }
        } catch (detailsError) {
          // If fetching order details fails, still show success and refresh
          console.error('Failed to fetch order details after fulfill:', detailsError)
          setCurrentView(null)
          setSelectedOrderForEscalation(null)
          setFulfillmentNote('')
          fetchOrders()
          success('Order fulfilled from warehouse successfully! Please refresh to see updated status.', 3000)
        }
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to fulfill order'
        showError(errorMessage, 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to fulfill order', 5000)
    }
  }

  const handleUpdateOrderStatus = async (orderId, updateData) => {
    try {
      const result = await updateOrderStatus(orderId, updateData)
      if (result.data) {
        setCurrentView(null)
        setSelectedOrderForStatusUpdate(null)
        setSelectedStatus('')
        setSelectedPaymentStatus('')
        setStatusUpdateNotes('')
        setIsRevert(false)
        fetchOrders()
        // Show message from backend (includes grace period info if applicable)
        success(result.data.message || 'Order status updated successfully!', 3000)
      } else if (result.error) {
        showError(result.error.message || 'Failed to update order status', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to update order status', 5000)
    }
  }

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

  // Helper function to format status for display (replace underscores with spaces)
  const formatStatusForDisplay = (status) => {
    if (!status) return 'Unknown'
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

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
        icon: CreditCard,
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

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          const originalOrder = ordersState.data?.orders?.find((o) => o.id === row.id) || row
          const isEscalated = originalOrder.escalated || originalOrder.assignedTo === 'admin'
          const status = row.status || 'Unknown'
          const isPaid = row.isPaid || originalOrder.paymentStatus === 'fully_paid'

          if (isEscalated) {
            return (
              <div className="flex flex-col gap-1">
                <StatusBadge tone="warning">Escalated</StatusBadge>
                <span className="text-xs text-gray-500">{formatStatusForDisplay(status)}</span>
                {isPaid && (
                  <StatusBadge tone="success" className="mt-1">Paid</StatusBadge>
                )}
              </div>
            )
          }

          const tone = status === 'Processing' || status === 'processing' ? 'warning' : status === 'Completed' || status === 'completed' ? 'success' : 'neutral'
          return (
            <div className="flex flex-col gap-1">
              <StatusBadge tone={tone}>{formatStatusForDisplay(status)}</StatusBadge>
              {isPaid && (
                <StatusBadge tone="success" className="mt-1">Paid</StatusBadge>
              )}
            </div>
          )
        },
      }
    }
    if (column.accessor === 'advance') {
      return {
        ...column,
        Cell: (row) => {
          const advance = row.advance || 'Unknown'
          const tone = advance === 'Paid' || advance === 'paid' ? 'success' : 'warning'
          return <StatusBadge tone={tone}>{advance}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'type') {
      return {
        ...column,
        Cell: (row) => {
          const type = row.type || 'Unknown'
          return (
            <span className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
              type === 'User' || type === 'user'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            )}>
              {type}
            </span>
          )
        },
      }
    }
    if (column.accessor === 'userLocation' || column.accessor === 'userLocation') {
      return {
        ...column,
        Cell: (row) => {
          const location = row[column.accessor] || 'Not provided'
          return (
            <span className="text-sm text-gray-600" title={location}>
              {location}
            </span>
          )
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalOrder = ordersState.data?.orders?.find((o) => o.id === row.id) || row
          const isEscalated = originalOrder.escalated || originalOrder.assignedTo === 'admin'
          const currentStatus = (originalOrder.status || row.status || '').toLowerCase()
          const normalizedStatus = normalizeOrderStatus(currentStatus)
          const isFulfilled = normalizedStatus === 'accepted' || normalizedStatus === 'dispatched' || normalizedStatus === 'delivered' || normalizedStatus === 'fully_paid'
          const isPaid = row.isPaid || originalOrder.paymentStatus === 'fully_paid'
          const paymentPreference = originalOrder.paymentPreference || 'partial'
          const workflowCompleted = paymentPreference === 'partial'
            ? normalizedStatus === 'fully_paid'
            : normalizedStatus === 'delivered'
          const isInStatusUpdateGracePeriod = row.statusUpdateGracePeriod?.isActive || originalOrder.statusUpdateGracePeriod?.isActive
          const statusUpdateGracePeriodExpiresAt = row.statusUpdateGracePeriod?.expiresAt || originalOrder.statusUpdateGracePeriod?.expiresAt
          const statusUpdateTimeRemaining = statusUpdateGracePeriodExpiresAt ? Math.max(0, Math.floor((new Date(statusUpdateGracePeriodExpiresAt) - new Date()) / 1000 / 60)) : 0
          const previousStatus = row.statusUpdateGracePeriod?.previousStatus || originalOrder.statusUpdateGracePeriod?.previousStatus
          const hideUpdateButton = workflowCompleted && !isInStatusUpdateGracePeriod
          const statusButtonConfig = hideUpdateButton ? null : getStatusButtonConfig(originalOrder)
          const isDropdownOpen = openActionsDropdown === row.id

          // Build action items list
          const actionItems = []

          // Always show View Details
          actionItems.push({
            label: 'View Details',
            icon: Eye,
            onClick: () => {
              handleViewOrderDetails(originalOrder)
              setOpenActionsDropdown(null)
            },
            className: 'text-gray-700 hover:bg-gray-50'
          })

          // Confirm Status Update - shown during grace period
          if (isInStatusUpdateGracePeriod && !workflowCompleted) {
            actionItems.push({
              label: 'Confirm Status Update',
              icon: CheckCircle,
              onClick: async () => {
                setOpenActionsDropdown(null)
                const result = await updateOrderStatus(originalOrder.id, { finalizeGracePeriod: true })
                if (result.data) {
                  fetchOrders()
                  success(result.data.message || 'Status update confirmed successfully!', 3000)
                } else if (result.error) {
                  showError(result.error.message || 'Failed to confirm status update', 5000)
                }
              },
              className: 'text-green-700 hover:bg-green-50'
            })
          }

          // Revert button - shown during grace period
          if (isInStatusUpdateGracePeriod && previousStatus && !workflowCompleted) {
            actionItems.push({
              label: `Revert to ${formatStatusForDisplay(previousStatus)}`,
              icon: ArrowLeft,
              onClick: () => {
                handleOpenStatusUpdateModal(originalOrder)
                setOpenActionsDropdown(null)
              },
              className: 'text-orange-700 hover:bg-orange-50'
            })
          }

          // Update Status button - hidden when workflow completed or during grace period
          if (!hideUpdateButton && !isInStatusUpdateGracePeriod) {
            actionItems.push({
              label: 'Update Status',
              icon: RefreshCw,
              onClick: () => {
                handleOpenStatusUpdateModal(originalOrder)
                setOpenActionsDropdown(null)
              },
              disabled: !statusButtonConfig,
              className: 'text-blue-700 hover:bg-blue-50'
            })
          }

          // Escalation actions - Show for escalated orders that are not fulfilled
          if (isEscalated && !isFulfilled) {
            actionItems.push({
              label: 'Fulfill from Warehouse',
              icon: Warehouse,
              onClick: () => {
                setSelectedOrderForEscalation(originalOrder)
                setFulfillmentNote('')
                setCurrentView('escalation')
                setOpenActionsDropdown(null)
              },
              className: 'text-green-700 hover:bg-green-50'
            })
            actionItems.push({
              label: 'Revert to User',
              icon: ArrowLeft,
              onClick: () => {
                setSelectedOrderForRevert(originalOrder)
                setRevertReason('')
                setCurrentView('revertEscalation')
                setOpenActionsDropdown(null)
              },
              className: 'text-orange-700 hover:bg-orange-50'
            })
          }

          // Reassign button - Only show if escalated AND status is awaiting/pending
          if (isEscalated && (normalizedStatus === 'awaiting' || normalizedStatus === 'pending')) {
            actionItems.push({
              label: 'Reassign Order',
              icon: Recycle,
              onClick: () => {
                handleReassignOrder(originalOrder)
                setOpenActionsDropdown(null)
              },
              className: 'text-gray-700 hover:bg-gray-50'
            })
          }

          return (
            <div className="relative">
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
                    setOpenActionsDropdown(isDropdownOpen ? null : row.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                  title="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {isDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenActionsDropdown(null)}
                    />
                    {/* Dropdown menu */}
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
            </div>
          )
        },
      }
    }
    return column
  })

  // Helper functions for full-screen views
  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return null
    if (typeof dateValue === 'string') {
      return dateValue
    }
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString('en-IN')
    }
    try {
      return new Date(dateValue).toLocaleDateString('en-IN')
    } catch {
      return String(dateValue)
    }
  }

  // Helper functions for extracting order data
  const getUserName = (order) => {
    if (!order) return 'Unknown User'
    if (typeof order.user === 'string') return order.user
    if (order.userId && typeof order.userId === 'object') return order.userId.name || 'Unknown User'
    if (order.user && typeof order.user === 'object') return order.user.name || 'Unknown User'
    return 'Unknown User'
  }

  const getUserId = (order) => {
    if (!order) return null
    if (typeof order.userId === 'string') return order.userId
    if (order.userId && typeof order.userId === 'object') return order.userId._id || order.userId.id || null
    if (order.user && typeof order.user === 'object') return order.user._id || order.user.id || null
    return null
  }

  const getOrderId = (order) => {
    if (!order) return 'N/A'
    if (typeof order.id === 'string') return order.id
    if (order._id) return typeof order._id === 'string' ? order._id : String(order._id)
    if (order.orderId) return typeof order.orderId === 'string' ? order.orderId : String(order.orderId)
    if (order.id && typeof order.id === 'object' && order.id._id) return String(order.id._id)
    return 'N/A'
  }

  // If a full-screen view is active, render it instead of the main list
  // Order Detail View
  if (currentView === 'orderDetail' && (orderDetails || selectedOrderForDetail)) {
    const order = orderDetails || selectedOrderForDetail
    const orderId = getOrderId(order)
    const userName = getUserName(order)
    const userId = getUserId(order)
    const orderValue = typeof order.value === 'number'
      ? order.value
      : parseFloat(order.value?.replace(/[₹,\sL]/g, '') || '0') * 100000
    const advanceAmount = typeof order.advance === 'number'
      ? order.advance
      : order.advanceStatus === 'paid' ? orderValue * 0.3 : 0
    const pendingAmount = typeof order.pending === 'number'
      ? order.pending
      : orderValue - advanceAmount
    const advanceStatus = order.advanceStatus || (order.advance === 'Paid' ? 'paid' : 'pending')

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-700"
            title="Back to Orders"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Order Details - {orderId}</h2>
        </div>
        <div className="space-y-6">
          {/* Order Header */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Order #{orderId}</h3>
                  <p className="text-sm text-gray-600">Type: {order.type || 'Unknown'}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    {(order.date || order.createdAt) && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(order.date || order.createdAt)}</span>
                      </div>
                    )}
                    {order.region && <span>{order.region}</span>}
                  </div>
                  {userName && (
                    <div className="mt-1 text-xs text-gray-500">User: {userName}</div>
                  )}
                </div>
              </div>
              <StatusBadge tone={order.status === 'Processing' || order.status === 'processing' ? 'warning' : order.status === 'Completed' || order.status === 'completed' ? 'success' : 'neutral'}>
                {formatStatusForDisplay(order.status)}
              </StatusBadge>
            </div>
          </div>

          {/* User Information */}
          {(userName || userId) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">User</p>
              <p className="text-sm font-bold text-gray-900">{userName}</p>
              {userId && (
                <p className="text-xs text-gray-600 mt-1">User ID: {userId}</p>
              )}
            </div>
          )}

          {/* Payment Summary */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900">Payment Status</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Order Value</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(orderValue)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Advance (30%)</p>
                  <StatusBadge tone={advanceStatus === 'paid' ? 'success' : 'warning'}>
                    {advanceStatus === 'paid' ? 'Paid' : 'Pending'}
                  </StatusBadge>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(advanceAmount)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Pending (70%)</p>
                <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h4 className="mb-4 text-sm font-bold text-gray-900">Order Items</h4>
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const getProductName = () => {
                    if (item.name) return typeof item.name === 'string' ? item.name : String(item.name)
                    if (item.productId && typeof item.productId === 'object') return item.productId.name || 'Unknown Product'
                    if (item.product) return typeof item.product === 'string' ? item.product : String(item.product)
                    return 'Unknown Product'
                  }
                  const getProductPrice = () => {
                    if (item.price) return item.price
                    if (item.amount) return item.amount
                    if (item.productId && typeof item.productId === 'object' && item.productId.priceToUser) return item.productId.priceToUser
                    return 0
                  }
                  const productName = getProductName()
                  const productPrice = getProductPrice()
                  return (
                    <div key={item.id || item._id || index} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{productName}</p>
                        <p className="text-xs text-gray-600">Quantity: {item.quantity || 1} {item.unit || 'units'}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(productPrice)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Payment Timeline */}
          {order.paymentHistory && order.paymentHistory.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-gray-900">Payment Timeline</h4>
              </div>
              <Timeline
                events={order.paymentHistory.map((payment, index) => ({
                  id: payment.id || `payment-${index}`,
                  title: payment.type || 'Payment',
                  timestamp: payment.date || payment.timestamp || 'N/A',
                  description: formatCurrency(payment.amount || 0),
                  status: payment.status || 'completed',
                }))}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBackToList}
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
            >
              Close
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleGenerateInvoice(order.id || order._id)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-6 py-3 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Generate Invoice
              </button>
              {order.escalated && (normalizeOrderStatus(order.status || '') === 'awaiting' || normalizeOrderStatus(order.status || '') === 'pending') && (
                <button
                  type="button"
                  onClick={() => handleReassignOrder(order)}
                  className="flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-6 py-3 text-sm font-bold text-orange-600 transition-all hover:bg-orange-50"
                >
                  <Recycle className="h-4 w-4" />
                  Reassign Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reassignment View
  if (currentView === 'reassign' && selectedOrderForReassign) {
    const order = selectedOrderForReassign
    const handleReassignFormSubmit = (e) => {
      e.preventDefault()
      const newErrors = {}
      if (!selectedUserId) newErrors.user = 'Please select a user'
      if (!reassignReason.trim()) newErrors.reason = 'Please provide a reason for reassignment'
      setReassignErrors(newErrors)
      if (Object.keys(newErrors).length === 0) {
        handleReassignSubmit(order.id, {
          userId: selectedUserId,
          reason: reassignReason.trim(),
        })
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
            title="Back to Orders"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Reassign Order</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <form onSubmit={handleReassignFormSubmit} className="space-y-6">
            {/* Current Order Info */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-2">Current Order Details</p>
              <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
              <p className="text-xs text-gray-600 mt-1">Current User: {getUserName(order)}</p>
              {order.region && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{order.region}</span>
                </div>
              )}
            </div>

            {/* Reason for Reassignment */}
            <div>
              <label htmlFor="reason" className="mb-2 block text-sm font-bold text-gray-900">
                <AlertCircle className="mr-1 inline h-4 w-4" />
                Reason for Reassignment <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reassignReason}
                onChange={(e) => {
                  setReassignReason(e.target.value)
                  if (reassignErrors.reason) setReassignErrors((prev) => ({ ...prev, reason: '' }))
                }}
                placeholder="e.g., User unavailable, Stock shortage, Logistics delay..."
                rows={3}
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
                  reassignErrors.reason
                    ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                    : 'border-gray-300 bg-white focus:border-red-500 focus:ring-red-500/50',
                )}
              />
              {reassignErrors.reason && <p className="mt-1 text-xs text-red-600">{reassignErrors.reason}</p>}
            </div>

            {/* Select New User */}
            <div>
              <label htmlFor="user" className="mb-2 block text-sm font-bold text-gray-900">
                <Building2 className="mr-1 inline h-4 w-4" />
                Select New User <span className="text-red-500">*</span>
              </label>
              {availableUsers && availableUsers.length > 0 ? (
                <select
                  id="user"
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value)
                    if (reassignErrors.user) setReassignErrors((prev) => ({ ...prev, user: '' }))
                  }}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                    reassignErrors.user
                      ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                      : 'border-gray-300 bg-white focus:border-red-500 focus:ring-red-500/50',
                  )}
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.region && `(${user.region})`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">No alternate users available in this region.</p>
                </div>
              )}
              {reassignErrors.user && <p className="mt-1 text-xs text-red-600">{reassignErrors.user}</p>}
            </div>

            {/* Info Box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-xs text-blue-900">
                  <p className="font-bold">Reassignment Guidelines</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Selected user must have sufficient stock and credit availability</li>
                    <li>Order will be automatically updated with new user details</li>
                    <li>Customer will be notified of the change</li>
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
                type="submit"
                disabled={loading || !selectedUserId || !reassignReason.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <Recycle className="h-4 w-4" />
                {loading ? 'Reassigning...' : 'Reassign Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Escalation View (Fulfill from Warehouse)
  if (currentView === 'escalation' && selectedOrderForEscalation) {
    const order = selectedOrderForEscalation
    const handleFulfill = () => {
      handleFulfillFromWarehouse(order.id, {
        note: fulfillmentNote.trim() || 'Order fulfilled from master warehouse',
      })
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-700"
            title="Back to Orders"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Order Escalation - Manual Fulfillment</h2>
        </div>
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
                <span className="font-bold text-gray-900">{getUserName(order)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Order Value:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(typeof order.value === 'number' ? order.value : parseFloat(order.value?.replace(/[₹,\sL]/g, '') || '0') * 100000)}
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
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(totalPrice)}</p>
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
              <Warehouse className="h-5 w-5 flex-shrink-0 text-blue-600" />
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
              <CheckCircle className="h-4 w-4" />
              {loading ? 'Fulfilling...' : 'Fulfill from Warehouse'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Revert Escalation View
  if (currentView === 'revertEscalation' && selectedOrderForRevert) {
    const order = selectedOrderForRevert
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
            title="Back to Orders"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Revert Escalation</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="space-y-6">
            {order && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-bold text-gray-900">Order #{order.orderNumber || order.id}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">User:</span>
                    <span className="font-bold text-gray-900">{getUserName(order)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Order Value:</span>
                    <span className="font-bold text-gray-900">
                      {typeof order.value === 'number'
                        ? formatCurrency(order.value)
                        : order.value || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="revertReason" className="mb-2 block text-sm font-bold text-gray-900">
                Reason for Reverting <span className="text-red-500">*</span>
              </label>
              <textarea
                id="revertReason"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Why are you reverting this escalation back to the user?"
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-orange-600" />
                <div className="text-xs text-orange-900">
                  <p className="font-bold">Revert Escalation</p>
                  <p className="mt-1">
                    This order will be assigned back to the original user. The user will receive a notification and can proceed with fulfillment.
                  </p>
                </div>
              </div>
            </div>

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
                onClick={handleRevertEscalation}
                disabled={loading || !revertReason.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {loading ? 'Reverting...' : 'Revert to User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Status Update View - This is complex, so I'll add a simplified version
  // The full implementation would mirror OrderStatusUpdateModal
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

    // Initialize selected status when view opens - using direct logic instead of useEffect
    if (!selectedStatus && !selectedPaymentStatus && !statusUpdateNotes) {
      if (isInStatusUpdateGracePeriod && previousStatus) {
        const normalizedPrevious = normalizeOrderStatus(previousStatus)
        setSelectedStatus(normalizedPrevious)
        setIsRevert(true)
      } else {
        const nextStatus = getNextStatus(order)
        setSelectedStatus(nextStatus || normalizedCurrentStatus)
        setIsRevert(false)
      }
    }

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

    // Remove the initialization logic from render - it's now in handleOpenStatusUpdateModal

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            title="Back to Orders"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Update Order Status</h2>
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
                      You have {statusUpdateTimeRemaining} minutes remaining to revert to "{previousStatus}" status.
                      After this period, the current status will be finalized.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Selection */}
            {/* Show status selection if order is not fully paid OR if we're in grace period */}
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

  const getPageTitle = () => {
    if (subRoute === 'escalated') return 'Escalated Orders'
    if (subRoute === 'processing') return 'Processing Orders'
    if (subRoute === 'completed') return 'Completed Orders'
    return 'Unified Order Control'
  }

  const getPageDescription = () => {
    if (subRoute === 'escalated') return 'View and manage orders that have been escalated and require admin attention.'
    if (subRoute === 'processing') return 'View and manage orders that are accepted but not yet delivered.'
    if (subRoute === 'completed') return 'View all completed orders that have been delivered and fully paid.'
    return 'Track user + user orders, monitor payment collections, and reassign logistics within a single viewport.'
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 6 • Order & Payment Management</p>
          <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm text-gray-600">
            {getPageDescription()}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
          <Truck className="h-4 w-4" />
          Assign Logistics
        </button>
      </header>

      <FilterBar
        filters={[
          { id: 'region', label: filters.region === 'All' ? 'Region' : filters.region, active: filters.region !== 'All' },
          { id: 'user', label: filters.user === 'All' ? 'User' : filters.user, active: filters.user !== 'All' },
          { id: 'date', label: filters.dateFrom ? 'Date range' : 'Date range', active: !!filters.dateFrom },
          { id: 'status', label: filters.status === 'All' ? 'Order status' : filters.status, active: filters.status !== 'All' },
        ]}
        onChange={handleFilterChange}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Orders</h3>
        </div>
        <DataTable
          columns={tableColumns}
          rows={ordersList}
          emptyState="No orders found for selected filters"
        />
      </div>


      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-red-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-red-700">Reassignment Console</h3>
              <p className="text-sm text-gray-600">
                Manage order routing when users are unavailable or stock thresholds are crossed.
              </p>
            </div>
            <Recycle className="h-5 w-5 text-red-600" />
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'User unavailable',
                detail: 'Auto suggest alternate user based on stock + credit health.',
              },
              {
                label: 'Logistics delay',
                detail: 'Trigger alternate route with SLA compliance tracking.',
              },
              {
                label: 'Payment mismatch',
                detail: 'Reconcile advance vs pending amounts. Notify finance instantly.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                <p className="text-sm font-bold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-blue-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center gap-3">
            <CalendarRange className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-blue-700">Billing Timeline</h3>
              <p className="text-sm text-gray-600">Advance and pending payments tracked across the order lifecycle.</p>
            </div>
          </div>
          <Timeline
            events={[
              {
                id: 'billing-1',
                title: 'Advance collection',
                timestamp: 'Today • 09:10',
                description: '₹2.6 Cr collected across 312 orders.',
                status: 'completed',
              },
              {
                id: 'billing-2',
                title: 'Pending follow-up',
                timestamp: 'Today • 12:40',
                description: 'Automated reminder sent for ₹1.9 Cr outstanding.',
                status: 'pending',
              },
              {
                id: 'billing-3',
                title: 'Invoice generation',
                timestamp: 'Scheduled • 17:00',
                description: 'Finance will generate GST-compliant invoices and export to PDF.',
                status: 'pending',
              },
            ]}
          />
        </div>
      </section>
    </div>
  )
}

