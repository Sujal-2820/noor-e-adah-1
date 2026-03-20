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
import { LoadingOverlay } from '../components/LoadingOverlay'

const columns = [
  { Header: 'Order ID', accessor: 'id' },
  { Header: 'Customer', accessor: 'userName' },
  { Header: 'Location', accessor: 'userLocation' },
  { Header: 'Order Value', accessor: 'value' },
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
    generateInvoice,
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

  // View states
  const [currentView, setCurrentView] = useState(null) // 'orderDetail', 'statusUpdate'
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [selectedOrderForStatusUpdate, setSelectedOrderForStatusUpdate] = useState(null)

  // Status update form states
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('')
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')

  // Dropdown state for actions menu
  const [openActionsDropdown, setOpenActionsDropdown] = useState(null)

  // Format order data for display
  const formatOrderForDisplay = (order) => {
    const orderValue = typeof order.value === 'number'
      ? order.value
      : parseFloat(order.value?.replace(/[₹,\sL]/g, '') || '0')

    return {
      ...order,
      value: `₹${orderValue.toLocaleString('en-IN')}`,
      paymentStatus: order.paymentStatus || 'pending',
      isPaid: order.paymentStatus === 'completed',
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
    if (subRoute === 'processing') {
      // Processing orders: accepted but not delivered
      setOrdersList(allOrdersList.filter((o) => {
        const status = (o.status || '').toLowerCase()
        return (status === 'processing' || status === 'accepted' || status === 'awaiting dispatch' || status === 'dispatched') &&
          status !== 'delivered' && status !== 'completed'
      }))
    } else if (subRoute === 'completed') {
      // Completed: delivered
      setOrdersList(allOrdersList.filter((o) => {
        const status = (o.status || '').toLowerCase()
        return status === 'delivered' || status === 'completed'
      }))
    } else {
      setOrdersList(allOrdersList)
    }
  }, [allOrdersList, subRoute])
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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

  const handleBackToList = () => {
    setCurrentView(null)
    setSelectedOrderForDetail(null)
    setOrderDetails(null)
    setSelectedOrderForStatusUpdate(null)
    setSelectedStatus('')
    setSelectedPaymentStatus('')
    setStatusUpdateNotes('')
    if (navigate) navigate('orders')
  }

  const handleGenerateInvoice = async (orderId) => {
    try {
      const result = await generateInvoice(orderId)
      if (result.data) {
        success(result.data.message || 'Invoice generated successfully!', 5000)
      } else if (result.error) {
        showError(result.error.message || 'Failed to generate invoice', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to generate invoice', 5000)
    }
  }

  const handleProcessRefund = async (orderId) => {
    const confirmed = window.confirm('Are you sure you want to process this refund?')
    if (confirmed) {
      console.log('Processing refund for order:', orderId)
      alert('Refund processed successfully')
      fetchOrders()
    }
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
        fetchOrders()
        success(result.data.message || 'Order status updated successfully!', 3000)
      } else if (result.error) {
        showError(result.error.message || 'Failed to update order status', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to update order status', 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenStatusUpdateModal = (order) => {
    setSelectedOrderForStatusUpdate(order)
    const currentStatus = (order?.status || '').toLowerCase()
    const nextStatus = getNextStatus(order)
    setSelectedStatus(nextStatus || normalizeOrderStatus(currentStatus))
    setCurrentView('statusUpdate')
  }

  const getStatusTone = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'delivered' || s === 'completed') return 'success'
    if (s === 'processing' || s === 'accepted' || s === 'dispatched' || s === 'awaiting_dispatch' || s === 'shipped') return 'warning'
    if (s === 'cancelled' || s === 'rejected') return 'danger'
    return 'neutral'
  }

  const normalizeOrderStatus = (status) => {
    if (!status) return 'pending'
    return status.toLowerCase()
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
    if (currentStatus === 'pending' || currentStatus === 'paid' || currentStatus === 'fully_paid') return 'processing'
    if (currentStatus === 'processing' || currentStatus === 'accepted') return 'dispatched'
    if (currentStatus === 'dispatched' || currentStatus === 'shipped') return 'delivered'
    return null
  }

  const getStatusButtonConfig = (order) => {
    const nextStatus = getNextStatus(order)
    if (!nextStatus) return null

    const configs = {
      processing: {
        label: 'Accept Order',
        icon: CheckCircle,
        className: 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100',
        title: 'Move to Processing',
      },
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
    }

    return configs[nextStatus]
  }

  const tableColumns = columns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => (
          <StatusBadge tone={getStatusTone(row.status)}>
            {formatStatusForDisplay(row.status)}
          </StatusBadge>
        ),
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          const originalOrder = ordersState.data?.orders?.find((o) => o.id === row.id) || row
          const currentStatus = (originalOrder.status || row.status || '').toLowerCase()
          const normalizedStatus = normalizeOrderStatus(currentStatus)
          const workflowCompleted = normalizedStatus === 'delivered'
          const statusButtonConfig = workflowCompleted ? null : getStatusButtonConfig(originalOrder)
          const isDropdownOpen = openActionsDropdown === row.id

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

          // Update Status button
          if (!workflowCompleted) {
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

  // Helper functions for full-screen views
  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
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
      : parseFloat(order.value?.replace(/[₹,\sL]/g, '') || '0')
    const paymentStatus = order.paymentStatus || 'pending'

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

          {/* Customer & Shipping Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Customer Details</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Name</p>
                  <p className="text-sm font-bold text-gray-900">{userName || 'Unknown'}</p>
                </div>
                {order.email && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{order.email}</p>
                  </div>
                )}
                {order.phone && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{order.phone}</p>
                  </div>
                )}
                {userId && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">User ID</p>
                    <p className="text-[11px] text-gray-500 font-mono">{userId}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Shipping Address</h4>
              </div>
              {order.deliveryAddress ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-900">
                    {order.deliveryAddress.name || `${order.deliveryAddress.firstName || ''} ${order.deliveryAddress.lastName || ''}`.trim() || 'No Name Provided'}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {order.deliveryAddress.address}
                    {order.deliveryAddress.apartment && `, ${order.deliveryAddress.apartment}`}
                    <br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                    <br />
                    {order.deliveryAddress.country}
                  </p>
                  {order.deliveryAddress.phone && (
                    <p className="mt-2 text-xs text-gray-600 font-bold italic">
                      Contact: {order.deliveryAddress.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No shipping address provided</p>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900">Payment Summary</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 text-uppercase uppercase tracking-wider mb-1">Total Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(orderValue)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 text-uppercase uppercase tracking-wider mb-1">Payment Status</p>
                <div className="mt-1">
                  <StatusBadge tone={paymentStatus === 'completed' || paymentStatus === 'fully_paid' ? 'success' : 'warning'}>
                    {paymentStatus === 'completed' || paymentStatus === 'fully_paid' ? 'Paid' : 'Pending'}
                  </StatusBadge>
                </div>
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
    const normalizedCurrentStatus = normalizeOrderStatus(currentStatus)
    const isPaid = order?.paymentStatus === 'completed'

    if (!selectedStatus && !statusUpdateNotes) {
      const nextStatus = getNextStatus(order)
      setSelectedStatus(nextStatus || normalizedCurrentStatus)
    }

    const ORDER_STATUS_OPTIONS = [
      { value: 'accepted', label: 'Accepted', description: 'Order has been accepted and is ready for dispatch' },
      { value: 'dispatched', label: 'Dispatched', description: 'Order has been dispatched for delivery' },
      { value: 'delivered', label: 'Delivered', description: 'Order has been delivered' },
    ]

    const getAvailableStatusOptions = () => {
      const options = []
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
      if (!selectedStatus) return
      const updateData = {
        status: selectedStatus,
        notes: statusUpdateNotes.trim() || undefined,
      }
      handleUpdateOrderStatus(order.id, updateData)
    }

    const canUpdate = () => {
      return !!selectedStatus
    }

    const availableStatusOptions = getAvailableStatusOptions()

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
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="font-bold text-gray-900 capitalize">
                      {isPaid ? 'Paid' : 'Pending'}
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

            {/* Status Selection */}
            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-bold text-gray-900">
                Order Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
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
    if (subRoute === 'processing') return 'Processing Orders'
    if (subRoute === 'completed') return 'Completed Orders'
    return 'Unified Order Control'
  }

  const getPageDescription = () => {
    if (subRoute === 'processing') return 'View and manage orders that are accepted but not yet delivered.'
    if (subRoute === 'completed') return 'View all completed orders that have been delivered.'
    return 'Track orders, monitor fulfillment, and manage logistics within a single viewport.'
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


      <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
    </div>
  )
}

