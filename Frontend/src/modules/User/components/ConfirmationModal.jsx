import { AlertTriangle } from 'lucide-react'
import { cn } from '../../../lib/cn'

/**
 * Confirmation Modal for User Module
 * Displays warning and transaction details before confirming actions
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  details = null,
  loading = false,
}) {
  if (!isOpen) return null

  return (
    <div className={cn('user-activity-sheet', isOpen && 'is-open')}>
      <div className={cn('user-activity-sheet__overlay', isOpen && 'is-open')} onClick={onClose} />
      <div className={cn('user-activity-sheet__panel', isOpen && 'is-open')} style={{ maxWidth: '500px' }}>
        <div className="user-activity-sheet__header">
          <h4>{title}</h4>
          <button type="button" onClick={onClose} disabled={loading}>
            Close
          </button>
        </div>
        <div className="user-action-panel__form" style={{ padding: '1.5rem' }}>
          {/* Warning Message */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-700 mb-2">
                  Please Double-Check Before Proceeding
                </p>
                {message && (
                  <p className="text-sm text-yellow-700">
                    {message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          {details && Object.keys(details).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Transaction Details:</p>
              <div className="space-y-2">
                {Object.entries(details).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start text-sm">
                    <span className="text-gray-600 font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-gray-900 font-semibold text-right ml-4">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 user-action-panel__button is-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 user-action-panel__button is-primary"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

