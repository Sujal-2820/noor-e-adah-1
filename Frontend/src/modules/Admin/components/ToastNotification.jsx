import { useEffect, useState, createContext, useContext } from 'react'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type }
    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }

    return id
  }

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const success = (message, duration) => addToast(message, 'success', duration)
  const error = (message, duration) => addToast(message, 'error', duration)
  const warning = (message, duration) => addToast(message, 'warning', duration)
  const info = (message, duration) => addToast(message, 'info', duration)

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      toasts: [],
      addToast: () => {},
      dismissToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    }
  }
  return context
}

export function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastNotification key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastNotification({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300)
  }

  const iconConfig = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-gradient-to-br from-green-50 to-green-100/50',
      border: 'border-green-200',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      iconColor: 'text-white',
      text: 'text-green-900',
      shadow: 'shadow-[0_8px_24px_rgba(34,197,94,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    },
    error: {
      icon: XCircle,
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      border: 'border-red-200',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      iconColor: 'text-white',
      text: 'text-red-900',
      shadow: 'shadow-[0_8px_24px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      border: 'border-amber-200',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      iconColor: 'text-white',
      text: 'text-amber-900',
      shadow: 'shadow-[0_8px_24px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    },
    info: {
      icon: Info,
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      border: 'border-purple-200',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconColor: 'text-white',
      text: 'text-purple-900',
      shadow: 'shadow-[0_8px_24px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    },
  }

  const config = iconConfig[toast.type] || iconConfig.info
  const Icon = config.icon

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 ease-out',
        config.bg,
        config.border,
        config.shadow,
        isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100',
        'hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
          config.iconBg,
          config.iconColor,
          'shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)]'
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={cn('text-sm font-semibold leading-relaxed', config.text)}>
          {toast.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
          'text-gray-400 hover:bg-white/50 hover:text-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
