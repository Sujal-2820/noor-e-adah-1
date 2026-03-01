import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from '../../../lib/cn'

const ORDER_STATUS_OPTIONS = [
  { value: 'accepted', label: 'Accepted', description: 'Order has been accepted and is ready for dispatch' },
  { value: 'dispatched', label: 'Dispatched', description: 'Order has been dispatched for delivery' },
  { value: 'delivered', label: 'Delivered', description: 'Order has been delivered' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'fully_paid', label: 'Mark Payment as Done', description: 'Mark order payment as fully paid' },
]

// Map backend statuses to simplified statuses
const normalizeStatusForDisplay = (status) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'fully_paid') {
    return 'delivered'
  }
  if (normalized === 'accepted' || normalized === 'processing') {
    return 'accepted'
  }
  if (normalized === 'dispatched' || normalized === 'out_for_delivery' || normalized === 'ready_for_delivery') {
    return 'dispatched'
  }
  if (normalized === 'delivered') {
    return 'delivered'
  }
  return 'accepted'
}

// Map simplified status back to backend status
const mapStatusToBackend = (simplifiedStatus) => simplifiedStatus

export function OrderStatusUpdateModal({ isOpen, onClose, order, onUpdate, loading }) {
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [isRevert, setIsRevert] = useState(false)

  const currentStatus = (order?.status || '').toLowerCase()
  const currentPaymentStatus = order?.paymentStatus || 'pending'
  const isPaid = currentPaymentStatus === 'fully_paid'
  const isInStatusUpdateGracePeriod = order?.statusUpdateGracePeriod?.isActive
  const statusUpdateGracePeriodExpiresAt = order?.statusUpdateGracePeriod?.expiresAt
  const statusUpdateTimeRemaining = statusUpdateGracePeriodExpiresAt 
    ? Math.max(0, Math.floor((new Date(statusUpdateGracePeriodExpiresAt) - new Date()) / 1000 / 60)) 
    : 0
  const previousStatus = order?.statusUpdateGracePeriod?.previousStatus
  const normalizedCurrentStatus = normalizeStatusForDisplay(currentStatus)

  // Initialize selected status based on current order state
  useEffect(() => {
    if (isOpen && order) {
      // If in grace period and reverting, pre-select previous status (normalized)
      if (isInStatusUpdateGracePeriod && previousStatus) {
        const normalizedPrevious = normalizeStatusForDisplay(previousStatus)
        setSelectedStatus(normalizedPrevious)
        setIsRevert(true)
      } else {
        // Pre-select next logical status
        const nextStatus = getNextStatus(normalizedCurrentStatus, isPaid)
        setSelectedStatus(nextStatus || normalizedCurrentStatus)
        setIsRevert(false)
      }
      setSelectedPaymentStatus('')
      setNotes('')
    }
  }, [isOpen, order, normalizedCurrentStatus, isPaid, isInStatusUpdateGracePeriod, previousStatus])

  const getNextStatus = (normalizedStatus, isAlreadyPaid) => {
    if (normalizedStatus === 'accepted') return 'dispatched'
    if (normalizedStatus === 'dispatched') return 'delivered'
    if (normalizedStatus === 'delivered' && !isAlreadyPaid) return null
    return null
  }

  const getAvailableStatusOptions = () => {
    const options = []

    // If in grace period, only allow revert to previous status (normalized)
    if (isInStatusUpdateGracePeriod && previousStatus) {
      const normalizedPrevious = normalizeStatusForDisplay(previousStatus)
      const option = ORDER_STATUS_OPTIONS.find(opt => opt.value === normalizedPrevious)
      if (option) {
        return [
          { value: normalizedPrevious, label: `Revert to ${option.label}`, description: 'Revert to previous status' }
        ]
      }
    }

    // Only show current status and next status (not all up to next)
    const statusFlow = ['accepted', 'dispatched', 'delivered']
    const currentIndex = statusFlow.indexOf(normalizedCurrentStatus)
    
    if (currentIndex >= 0) {
      // Only show current status and next status (if exists)
      const currentOption = ORDER_STATUS_OPTIONS.find(opt => opt.value === statusFlow[currentIndex])
      if (currentOption) {
        options.push(currentOption)
      }
      
      // Add next status if exists
      const nextIndex = currentIndex + 1
      if (nextIndex < statusFlow.length) {
        const nextOption = ORDER_STATUS_OPTIONS.find(opt => opt.value === statusFlow[nextIndex])
        if (nextOption) {
          options.push(nextOption)
        }
      }
    } else {
      // If status not in flow, show all options
      options.push(...ORDER_STATUS_OPTIONS)
    }

    return options
  }

  const handleSubmit = () => {
    if (!selectedStatus && !selectedPaymentStatus) {
      return
    }

    // If payment status is selected, send status as 'fully_paid' (backend handles this)
    // Otherwise, map the simplified status back to backend status
    const backendStatus = selectedPaymentStatus === 'fully_paid' 
      ? 'fully_paid' 
      : mapStatusToBackend(selectedStatus)
    
    // For revert, ensure we use the previous status from grace period
    const finalStatus = isRevert && previousStatus ? previousStatus : backendStatus
    
    const updateData = {
      status: finalStatus,
      notes: notes.trim() || undefined,
      isRevert: isRevert,
    }

    onUpdate(order.id, updateData)
  }

  const canUpdate = () => {
    if (isInStatusUpdateGracePeriod && previousStatus) {
      // During grace period, can only revert (compare normalized statuses)
      const normalizedPrevious = normalizeStatusForDisplay(previousStatus)
      return selectedStatus === normalizedPrevious
    }
    // Can update if status is selected or payment status is selected
    return selectedStatus || selectedPaymentStatus
  }

  const availableStatusOptions = getAvailableStatusOptions()
  const showPaymentOption = currentStatus === 'delivered' && !isPaid
  const paymentPreference = order?.paymentPreference || 'partial'
  const isFullPayment = paymentPreference === 'full'
  
  // Format status label for display
  const formatStatusLabel = (status) => {
    if (!status) return ''
    const normalized = status.toLowerCase()
    if (normalized === 'fully_paid') return 'Fully Paid'
    if (normalized === 'delivered') return 'Delivered'
    if (normalized === 'dispatched' || normalized === 'out_for_delivery') return 'Dispatched'
    if (normalized === 'accepted' || normalized === 'processing') return 'Accepted'
    if (normalized === 'awaiting' || normalized === 'pending') return 'Awaiting'
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
  }

  // Check if this is a revert action
  const isRevertAction = isInStatusUpdateGracePeriod && previousStatus && isRevert

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRevertAction ? "Revert Current Status" : "Update Order Status"} size="md">
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
                <span className="text-gray-600">Customer:</span>
                <span className="font-bold text-gray-900">{order.userName || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contact:</span>
                <span className="font-bold text-gray-900">{order.userPhone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Status:</span>
                <span className="font-bold text-gray-900 capitalize">{ORDER_STATUS_OPTIONS.find(opt => opt.value === normalizedCurrentStatus)?.label || normalizedCurrentStatus || 'Unknown'}</span>
              </div>
              {!isRevertAction && !isInStatusUpdateGracePeriod && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Next Status:</span>
                  <span className="font-bold text-blue-600 capitalize">
                    {(() => {
                      const nextStatus = getNextStatus(normalizedCurrentStatus, isPaid)
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
              {order.value && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Value:</span>
                  <span className="font-bold text-gray-900">
                    {typeof order.value === 'number'
                      ? `₹${order.value.toLocaleString('en-IN')}`
                      : order.value || 'N/A'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revert Confirmation UI */}
        {isRevertAction ? (
          <>
            {/* Previous Status Display (Read-only) */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Previous Status <span className="text-red-500">*</span>
              </label>
              <div className="rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
                {formatStatusLabel(previousStatus)}
              </div>
            </div>

            {/* Warning Message */}
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-900">
                ⚠️ Do you confirm to shift the order status to <strong>{formatStatusLabel(previousStatus)}</strong>?
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Grace Period Notice */}
            {isInStatusUpdateGracePeriod && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-900">
                    <p className="font-bold">Status Update Grace Period Active</p>
                    <p className="mt-1">
                      You have {statusUpdateTimeRemaining} minutes remaining to revert to "{formatStatusLabel(previousStatus)}" status.
                      After this period, the current status will be finalized.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Selection - Only show if order is not already fully paid */}
            {!isPaid && (
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
          </>
        )}

        {/* Payment Status Selection (for delivered orders that are NOT already fully paid) */}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this status update..."
            rows={3}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Info Message */}
        {isPaid && !isRevertAction && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="text-sm text-green-900">
                <p className="font-bold">Order is Fully Paid</p>
                <p className="mt-1">This order has been fully paid. Status updates are not required.</p>
              </div>
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
            Cancel
          </button>
          {/* Show confirm button during grace period */}
          {isInStatusUpdateGracePeriod && (
            <button
              type="button"
              onClick={() => {
                onUpdate(order.id, { finalizeGracePeriod: true })
              }}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Status Update
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canUpdate()}
            className={cn(
              'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all disabled:opacity-50',
              isRevert
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]'
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
                <CheckCircle className="h-4 w-4" />
                Update Status
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

