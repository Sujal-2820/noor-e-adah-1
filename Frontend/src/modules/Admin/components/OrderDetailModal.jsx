import { Package, IndianRupee, Calendar, CreditCard, AlertCircle, FileText, Download, RefreshCw } from 'lucide-react'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { Timeline } from './Timeline'
import { cn } from '../../../lib/cn'

export function OrderDetailModal({ isOpen, onClose, order, onReassign, onGenerateInvoice, onProcessRefund, onUpdateStatus, loading }) {
  if (!order) return null

  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  // Extract user name safely - handle both populated object and string
  const getUserName = () => {
    if (typeof order.user === 'string') {
      return order.user
    }
    if (order.userId && typeof order.userId === 'object') {
      return order.userId.name || 'Unknown User'
    }
    if (order.user && typeof order.user === 'object') {
      return order.user.name || 'Unknown User'
    }
    return 'Unknown User'
  }

  // Extract user ID safely - handle both populated object and string ID
  const getUserId = () => {
    if (typeof order.userId === 'string') {
      return order.userId
    }
    if (order.userId && typeof order.userId === 'object') {
      return order.userId._id || order.userId.id || null
    }
    if (order.user && typeof order.user === 'object') {
      return order.user._id || order.user.id || null
    }
    return null
  }

  // Extract user name safely - handle both populated object and string
  const getUserName = () => {
    if (typeof order.user === 'string') {
      return order.user
    }
    if (order.userId && typeof order.userId === 'object') {
      return order.userId.name || 'Unknown User'
    }
    if (order.user && typeof order.user === 'object') {
      return order.user.name || 'Unknown User'
    }
    return null
  }

  // Extract order ID safely
  const getOrderId = () => {
    if (typeof order.id === 'string') {
      return order.id
    }
    if (order._id) {
      return typeof order._id === 'string' ? order._id : String(order._id)
    }
    if (order.orderId) {
      return typeof order.orderId === 'string' ? order.orderId : String(order.orderId)
    }
    if (order.id && typeof order.id === 'object' && order.id._id) {
      return String(order.id._id)
    }
    return 'N/A'
  }

  // Format date safely
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

  const userName = getUserName()
  const userId = getUserId()
  const userName = getUserName()
  const orderId = getOrderId()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Details - ${orderId}`} size="xl">
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
                  {order.region && (
                    <span>{order.region}</span>
                  )}
                </div>
                {userName && (
                  <div className="mt-1 text-xs text-gray-500">
                    User: {userName}
                  </div>
                )}
              </div>
            </div>
            <StatusBadge tone={order.status === 'Processing' || order.status === 'processing' ? 'warning' : order.status === 'Completed' || order.status === 'completed' ? 'success' : 'neutral'}>
              {order.status || 'Unknown'}
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
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(orderValue)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Advance (30%)</p>
                <StatusBadge tone={advanceStatus === 'paid' ? 'success' : 'warning'}>
                  {advanceStatus === 'paid' ? 'Paid' : 'Pending'}
                </StatusBadge>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(advanceAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Pending (70%)</p>
              <p className="mt-1 text-lg font-bold text-red-600">
                {formatCurrency(pendingAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-4 text-sm font-bold text-gray-900">Order Items</h4>
            <div className="space-y-3">
              {order.items.map((item, index) => {
                // Extract product name safely - handle both populated object and string
                const getProductName = () => {
                  if (item.name) {
                    return typeof item.name === 'string' ? item.name : String(item.name)
                  }
                  if (item.productId && typeof item.productId === 'object') {
                    return item.productId.name || 'Unknown Product'
                  }
                  if (item.product) {
                    return typeof item.product === 'string' ? item.product : String(item.product)
                  }
                  return 'Unknown Product'
                }

                // Extract product price safely - use variant-specific price (unitPrice) if available
                const getProductPrice = () => {
                  if (item.unitPrice) return item.unitPrice // Variant-specific price
                  if (item.price) return item.price
                  if (item.amount) return item.amount
                  if (item.productId && typeof item.productId === 'object' && item.productId.priceToUser) {
                    return item.productId.priceToUser
                  }
                  return 0
                }

                const productName = getProductName()
                const unitPrice = getProductPrice()
                const quantity = item.quantity || 1
                const totalPrice = item.totalPrice || (unitPrice * quantity)
                const variantAttrs = item.variantAttributes || {}

                return (
                  <div key={item.id || item._id || index} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{productName}</p>
                      {/* Display variant attributes if present */}
                      {variantAttrs && Object.keys(variantAttrs).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(variantAttrs).map(([key, value]) => (
                            <p key={key} className="text-xs text-gray-600">
                              <span className="font-medium">{key}:</span> {value}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-600">Quantity: {quantity} {item.unit || 'units'} × ₹{unitPrice.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(totalPrice)}</p>
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
              <IndianRupee className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-bold text-gray-900">Purchase History</h4>
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

        {/* Refunds & Escalations */}
        {(order.refunds && order.refunds.length > 0) || order.escalated ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h4 className="text-sm font-bold text-gray-900">Refunds & Escalations</h4>
            </div>
            {order.escalated && (
              <div className="mb-3 rounded-lg border border-orange-300 bg-white p-3">
                <p className="text-sm font-bold text-orange-900">Order Escalated</p>
                <p className="text-xs text-orange-700">{order.escalationReason || 'Order requires admin attention'}</p>
              </div>
            )}
            {order.refunds && order.refunds.length > 0 && (
              <div className="space-y-2">
                {order.refunds.map((refund, index) => (
                  <div key={refund.id || index} className="rounded-lg border border-orange-300 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Refund #{refund.id || index + 1}</p>
                        <p className="text-xs text-gray-600">{refund.reason || 'Refund requested'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">{formatCurrency(refund.amount || 0)}</p>
                        <StatusBadge tone={refund.status === 'processed' ? 'success' : 'warning'}>
                          {refund.status || 'Pending'}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Status Update Section (for admin-fulfilled orders) */}
        {order.assignedTo === 'admin' && onUpdateStatus && order.status !== 'fully_paid' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-bold text-gray-900">Update Order Status</h4>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(order.status === 'processing' || order.status === 'awaiting') && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(orderId, { status: 'dispatched' })}
                    disabled={loading}
                    className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-50 disabled:opacity-50"
                  >
                    Mark as Dispatched
                  </button>
                )}
                {(order.status === 'dispatched' || order.status === 'processing' || order.status === 'awaiting') && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(orderId, { status: 'delivered' })}
                    disabled={loading}
                    className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition-all hover:bg-green-50 disabled:opacity-50"
                  >
                    Mark as Delivered
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(orderId, { status: 'fully_paid' })}
                    disabled={loading}
                    className="rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition-all hover:bg-purple-50 disabled:opacity-50"
                  >
                    Mark as Paid Full Amount
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-600">
                Current status: <span className="font-semibold">{order.status || 'processing'}</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Close
          </button>
          <div className="flex gap-3">
            {onReassign && (
              <button
                type="button"
                onClick={() => onReassign(order)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reassign
              </button>
            )}
            {onProcessRefund && order.refunds && order.refunds.some(r => r.status !== 'processed') && (
              <button
                type="button"
                onClick={() => onProcessRefund(orderId)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-6 py-3 text-sm font-bold text-orange-600 transition-all hover:bg-orange-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Process Refund
              </button>
            )}
            {onGenerateInvoice && (
              <button
                type="button"
                onClick={() => onGenerateInvoice(orderId)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Generate Invoice
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

