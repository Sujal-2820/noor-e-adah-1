import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from '../../../lib/cn'

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  type = 'warning', // 'warning', 'danger', 'info'
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  details = null, // Object with key-value pairs to display
  loading = false,
}) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'info':
        return <CheckCircle className="h-6 w-6 text-blue-600" />
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
    }
  }

  const getColorClasses = () => {
    switch (type) {
      case 'danger':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700',
        }
      case 'info':
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700',
        }
      default:
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700',
        }
    }
  }

  const colors = getColorClasses()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Warning Message */}
        <div className={cn('rounded-xl border p-4', colors.border, colors.bg)}>
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1">
              <p className={cn('text-sm font-semibold mb-2', colors.text)}>
                Please Double-Check Before Proceeding
              </p>
              {message && (
                <p className={cn('text-sm', colors.text)}>
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Details Section */}
        {details && Object.keys(details).length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
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
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50',
              colors.button,
            )}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

