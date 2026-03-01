import { useState } from 'react'
import { Package, Warehouse, AlertCircle, CheckCircle } from 'lucide-react'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { cn } from '../../../lib/cn'

export function OrderEscalationModal({ isOpen, onClose, order, onFulfillFromWarehouse, loading }) {
  const [fulfillmentNote, setFulfillmentNote] = useState('')

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

  const handleFulfill = () => {
    if (onFulfillFromWarehouse) {
      onFulfillFromWarehouse(order.id, {
        note: fulfillmentNote.trim() || 'Order fulfilled from master warehouse',
      })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Escalation - Manual Fulfillment" size="md">
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
                const variantAttrs = item.variantAttributes || {}
                
                return (
                  <div key={itemId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2">
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
                      <p className="text-xs text-gray-600">Qty: {quantity} {item.unit || 'units'} × ₹{unitPrice.toLocaleString('en-IN')}</p>
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
            onClick={onClose}
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
    </Modal>
  )
}

