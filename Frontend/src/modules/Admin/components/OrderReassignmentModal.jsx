import { useState, useEffect } from 'react'
import { Recycle, Building2, AlertCircle, MapPin } from 'lucide-react'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { cn } from '../../../lib/cn'

export function OrderReassignmentModal({ isOpen, onClose, order, availableUsers, onReassign, loading }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (order) {
      setSelectedUserId('')
      setReason('')
      setErrors({})
    }
  }, [order])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newErrors = {}
    if (!selectedUserId) {
      newErrors.user = 'Please select a user'
    }
    if (!reason.trim()) {
      newErrors.reason = 'Please provide a reason for reassignment'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      onReassign(order.id, {
        userId: selectedUserId,
        reason: reason.trim(),
      })
    }
  }

  if (!order) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reassign Order" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Order Info */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-2">Current Order Details</p>
          <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
          <p className="text-xs text-gray-600 mt-1">Current User: {order.user}</p>
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
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (errors.reason) {
                setErrors((prev) => ({ ...prev, reason: '' }))
              }
            }}
            placeholder="e.g., User unavailable, Stock shortage, Logistics delay..."
            rows={3}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
              errors.reason
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-red-500 focus:ring-red-500/50',
            )}
          />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
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
                if (errors.user) {
                  setErrors((prev) => ({ ...prev, user: '' }))
                }
              }}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                errors.user
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
          {errors.user && <p className="mt-1 text-xs text-red-600">{errors.user}</p>}
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
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedUserId || !reason.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            <Recycle className="h-4 w-4" />
            {loading ? 'Reassigning...' : 'Reassign Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

