import { useState, useEffect } from 'react'
import { AlertCircle, Package, X, CheckCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useUserApi } from '../hooks/useUserApi'
import { useToast } from '../components/ToastNotification'
import { ProductAttributeSelector } from './ProductAttributeSelector'

/**
 * Order Escalation Modal
 * Handles full order escalation (Scenario 1 & 4)
 */
export function OrderEscalationModal({ isOpen, onClose, order, onSuccess }) {
  const { rejectOrder, loading } = useUserApi()
  const { success, error: showError } = useToast()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedReason, setSelectedReason] = useState('')

  const escalationReasons = [
    { value: 'insufficient_stock', label: 'Insufficient Stock Available' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'quality_concerns', label: 'Quality Concerns' },
    { value: 'logistics_issue', label: 'Logistics/Delivery Issue' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setNotes('')
      setSelectedReason('')
    }
  }, [isOpen])

  const handleEscalate = async () => {
    if (!selectedReason && (!reason || !reason.trim())) {
      showError('Please select or provide an escalation reason')
      return
    }

    let escalationReason = ''
    if (selectedReason === 'other') {
      escalationReason = reason?.trim() || ''
    } else if (selectedReason) {
      const reasonOption = escalationReasons.find(r => r.value === selectedReason)
      escalationReason = reasonOption?.label || reason?.trim() || ''
    } else {
      escalationReason = reason?.trim() || ''
    }

    if (!escalationReason || !escalationReason.trim()) {
      showError('Please provide an escalation reason')
      return
    }

    try {
      const orderId = (order._id || order.id)?.toString()
      if (!orderId) {
        console.error('OrderEscalationModal: Invalid order object', order)
        showError('Invalid order ID')
        return
      }

      if (!escalationReason || !escalationReason.trim()) {
        showError('Please provide an escalation reason')
        return
      }

      const requestPayload = {
        reason: escalationReason.trim(),
        notes: notes?.trim() || undefined,
      }



      const result = await rejectOrder(orderId, requestPayload)

      if (result.data) {
        success('Order escalated to admin successfully')
        onClose() // Close modal first
        onSuccess?.(result.data) // Then trigger refresh
      } else if (result.error) {
        console.error('OrderEscalationModal: API error', result.error)
        showError(result.error.message || 'Failed to escalate order')
      } else {
        console.error('OrderEscalationModal: Unexpected response', result)
        showError('Failed to escalate order. Please try again.')
      }
    } catch (err) {
      console.error('OrderEscalationModal: Exception', err)
      showError(err.message || 'Failed to escalate order')
    }
  }

  if (!isOpen || !order) return null



  return (
    <div className={cn('user-activity-sheet', isOpen && 'is-open')}>
      <div className={cn('user-activity-sheet__overlay', isOpen && 'is-open')} onClick={onClose} />
      <div className={cn('user-activity-sheet__panel', isOpen && 'is-open')}>
        <div className="user-activity-sheet__header">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h4>Escalate Order to Admin</h4>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="user-activity-sheet__body">
          {/* Order Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-gray-600" />
              <p className="text-sm font-semibold text-gray-900">Order #{order.orderNumber || order.id}</p>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Customer: {order.userId?.name || order.farmer || 'Unknown'}</p>
              <p>Contact: {order.userId?.phone || order.customerPhone || 'N/A'}</p>
              <p>Order Value: {order.value || order.totalAmount ? `₹${(order.totalAmount || 0).toLocaleString('en-IN')}` : 'N/A'}</p>
            </div>
          </div>

          {/* Items & User Stock */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Items & your stock</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {order.items.map((item) => {
                  const product = item.productId || {}
                  const productName = product.name || item.productName || 'Unknown product'
                  const requestedQty = item.quantity || 0
                  const userStock = item.userStock ?? 0
                  const unit = item.unit || 'units'

                  // Check if product has attributes
                  const hasAttributes = product.attributeStocks &&
                    Array.isArray(product.attributeStocks) &&
                    product.attributeStocks.length > 0
                  const itemAttributes = item.attributeCombination || item.attributes || {}

                  return (
                    <div key={item._id || item.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{productName}</p>
                        <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
                          <span>Requested: {requestedQty} {unit}</span>
                          <span
                            className={cn(
                              'font-semibold',
                              userStock > 0 ? 'text-blue-600' : 'text-red-600'
                            )}
                          >
                            Your stock: {userStock} {unit}
                          </span>
                        </div>
                      </div>

                      {/* Show attributes if product has them */}
                      {hasAttributes && Object.keys(itemAttributes).length > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Selected Variant:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(itemAttributes).map(([key, value]) => (
                              <span key={key} className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Escalation Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Escalation Reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {escalationReasons.map((reasonOption) => (
                <label
                  key={reasonOption.value}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    selectedReason === reasonOption.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="escalationReason"
                    value={reasonOption.value}
                    checked={selectedReason === reasonOption.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm text-gray-900">{reasonOption.label}</span>
                </label>
              ))}
            </div>
            {selectedReason === 'other' && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide the escalation reason..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-900">
                This order will be escalated to Admin for fulfillment. You will no longer be responsible for this order.
              </p>
            </div>
          </div>
        </div>

        <div className="user-action-panel__actions">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="user-action-panel__button is-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEscalate}
            disabled={loading || (!selectedReason && (!reason || !reason.trim()))}
            className="user-action-panel__button is-primary flex items-center justify-center gap-1.5"
          >
            {loading ? (
              'Escalating...'
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[0.7rem]">Escalate to Admin</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

