import { useState, useEffect } from 'react'
import { Package, X, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useUserApi } from '../hooks/useUserApi'
import { useToast } from '../components/ToastNotification'

/**
 * Order Partial Escalation Modal
 * Handles partial item escalation (Scenario 2) and partial quantity escalation (Scenario 3)
 */
export function OrderPartialEscalationModal({ isOpen, onClose, order, escalationType = 'items', onSuccess }) {
  const { acceptOrderPartially, escalateOrderPartial, getOrderDetails, loading } = useUserApi()
  const { success, error: showError } = useToast()
  const [orderDetails, setOrderDetails] = useState(null)
  const [selectedItems, setSelectedItems] = useState({})
  const [escalatedQuantities, setEscalatedQuantities] = useState({})
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')

  // escalationType: 'items' (Scenario 2) or 'quantities' (Scenario 3)

  useEffect(() => {
    if (isOpen && order?.id) {
      loadOrderDetails()
    }
  }, [isOpen, order?.id])

  useEffect(() => {
    if (!isOpen) {
      setSelectedItems({})
      setEscalatedQuantities({})
      setNotes('')
      setReason('')
      setOrderDetails(null)
    }
  }, [isOpen])

  const loadOrderDetails = async () => {
    try {
      const orderId = order._id || order.id
      if (!orderId) {
        showError('Invalid order ID')
        return
      }
      
      const result = await getOrderDetails(orderId)
      if (result.data?.order) {
        setOrderDetails(result.data.order)
        // Initialize selected items
        const items = result.data.order.items || []
        const initialSelected = {}
        items.forEach((item) => {
          const itemId = (item._id || item.id)?.toString()
          if (itemId) {
            initialSelected[itemId] = {
              accept: true,
              quantity: item.quantity,
            }
          }
        })
        setSelectedItems(initialSelected)
      }
    } catch (err) {
      showError('Failed to load order details')
    }
  }

  const handleItemToggle = (itemId, action) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        accept: action === 'accept',
      },
    }))
  }

  const handleQuantityChange = (itemId, escalatedQty) => {
    const item = orderDetails?.items?.find((i) => (i._id || i.id) === itemId)
    const requestedQty = item?.quantity || 0
    const escalated = Math.max(0, Math.min(escalatedQty, requestedQty))
    
    setEscalatedQuantities((prev) => ({
      ...prev,
      [itemId]: escalated,
    }))
  }

  const handleSubmit = async () => {
    if (escalationType === 'items') {
      // Scenario 2: Partial item escalation
      const acceptedItems = []
      const rejectedItems = []

      orderDetails?.items?.forEach((item) => {
        const itemId = (item._id || item.id)?.toString()
        if (!itemId) return
        
        const selection = selectedItems[itemId]
        
        if (selection?.accept) {
          acceptedItems.push({
            itemId: itemId,
            quantity: item.quantity,
            variantAttributes: item.variantAttributes || undefined,
          })
        } else {
          rejectedItems.push({
            itemId: itemId,
            quantity: item.quantity,
            reason: reason || 'Item not available',
            variantAttributes: item.variantAttributes || undefined,
          })
        }
      })

      if (acceptedItems.length === 0) {
        showError('Please accept at least one item')
        return
      }

      if (rejectedItems.length === 0) {
        showError('Please reject at least one item to escalate')
        return
      }

      try {
        const orderId = order._id || order.id
        if (!orderId) {
          showError('Invalid order ID')
          return
        }
        
        const result = await acceptOrderPartially(orderId, {
          acceptedItems,
          rejectedItems,
          notes: notes.trim() || undefined,
        })

        if (result.data) {
          success('Order partially accepted. Rejected items escalated to admin.')
          onClose() // Close modal first
          onSuccess?.(result.data) // Then trigger refresh
        } else if (result.error) {
          showError(result.error.message || 'Failed to process partial acceptance')
        }
      } catch (err) {
        showError(err.message || 'Failed to process partial acceptance')
      }
    } else {
      // Scenario 3: Partial quantity escalation
      const escalatedItems = []

      orderDetails?.items?.forEach((item) => {
        const itemId = (item._id || item.id)?.toString()
        if (!itemId) return
        
        const escalatedQty = escalatedQuantities[itemId] || 0
        
        if (escalatedQty > 0 && escalatedQty < item.quantity) {
          escalatedItems.push({
            itemId: itemId,
            escalatedQuantity: escalatedQty,
            reason: reason || 'Partial quantity not available',
            variantAttributes: item.variantAttributes || undefined,
          })
        }
      })

      if (escalatedItems.length === 0) {
        showError('Please specify quantities to escalate for at least one item')
        return
      }

      if (!reason.trim()) {
        showError('Please provide an escalation reason')
        return
      }

      try {
        const orderId = order._id || order.id
        if (!orderId) {
          showError('Invalid order ID')
          return
        }
        
        const result = await escalateOrderPartial(orderId, {
          escalatedItems,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        })

        if (result.data) {
          success('Order partially escalated. Remaining quantities will be fulfilled by you.')
          onClose() // Close modal first
          onSuccess?.(result.data) // Then trigger refresh
        } else if (result.error) {
          showError(result.error.message || 'Failed to escalate order')
        }
      } catch (err) {
        showError(err.message || 'Failed to escalate order')
      }
    }
  }

  if (!isOpen || !order) return null

  const items = orderDetails?.items || order.items || []

  return (
    <div className={cn('user-activity-sheet', isOpen && 'is-open')}>
      <div className={cn('user-activity-sheet__overlay', isOpen && 'is-open')} onClick={onClose} />
      <div className={cn('user-activity-sheet__panel', isOpen && 'is-open')}>
        <div className="user-activity-sheet__header">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            <h4>
              {escalationType === 'items' ? 'Partial Item Escalation' : 'Partial Quantity Escalation'}
            </h4>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="user-activity-sheet__body">
          {/* Order Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900">Order #{order.orderNumber || order.id}</p>
            <div className="text-xs text-gray-600 space-y-1 mt-1">
              <p>Customer: {order.userId?.name || order.farmer || 'Unknown'}</p>
              <p>Contact: {order.userId?.phone || order.customerPhone || 'N/A'}</p>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Order Items</h4>
            {items.map((item) => {
              const itemId = (item._id || item.id)?.toString()
              if (!itemId) return null
              
              const product = item.productId || {}
              const selection = selectedItems[itemId] || { accept: true, quantity: item.quantity }
              const escalatedQty = escalatedQuantities[itemId] || 0
              const requestedQty = item.quantity || 0
              const userStock = item.userStock ?? 0
              const unit = item.unit || 'units'
              
              // Check if product has attributes
              const hasAttributes = product.attributeStocks && 
                                   Array.isArray(product.attributeStocks) && 
                                   product.attributeStocks.length > 0
              const itemAttributes = item.variantAttributes || item.attributeCombination || item.attributes || {}

              return (
                <div key={itemId} className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {product.name || item.productName || 'Unknown Product'}
                      </p>
                      <div className="text-xs text-gray-600 flex flex-col gap-0.5">
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
                      
                      {/* Show attributes if product has them */}
                      {hasAttributes && Object.keys(itemAttributes).length > 0 && (
                        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2">
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
                  </div>

                  {escalationType === 'items' ? (
                    // Scenario 2: Accept/Reject items
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemToggle(itemId, 'accept')}
                        className={cn(
                          'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all',
                          selection.accept
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        )}
                      >
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemToggle(itemId, 'reject')}
                        className={cn(
                          'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all',
                          !selection.accept
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        )}
                      >
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Escalate
                      </button>
                    </div>
                  ) : (
                    // Scenario 3: Partial quantity escalation
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-700">Quantity to Escalate:</label>
                        <input
                          type="number"
                          min="0"
                          max={requestedQty}
                          value={escalatedQty}
                          onChange={(e) => handleQuantityChange(itemId, parseInt(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <span className="text-xs text-gray-600">of {requestedQty} {unit}</span>
                      </div>
                      {escalatedQty > 0 && escalatedQty < requestedQty && (
                        <p className="text-xs text-blue-600">
                          You will fulfill: {requestedQty - escalatedQty} {unit}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Escalation Reason (for quantity escalation) */}
          {escalationType === 'quantities' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Escalation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you escalating these quantities?"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}

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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900">
                {escalationType === 'items'
                  ? 'Accepted items will be fulfilled by you. Rejected items will be escalated to Admin.'
                  : 'Specified quantities will be escalated to Admin. Remaining quantities will be fulfilled by you.'}
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
            onClick={handleSubmit}
            disabled={loading}
            className="user-action-panel__button is-primary flex items-center justify-center gap-1.5"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[0.7rem]">
                  {escalationType === 'items' ? 'Accept & Escalate' : 'Escalate Quantities'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

