import { useEffect, useState, useCallback } from 'react'
import { cn } from '../../../lib/cn'

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
}

export function ToastNotification({ message, type = TOAST_TYPES.INFO, duration = 4000, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }, [onDismiss])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, handleDismiss])

  if (!isVisible) return null

  const icons = {
    [TOAST_TYPES.SUCCESS]: '✓',
    [TOAST_TYPES.ERROR]: '✕',
    [TOAST_TYPES.INFO]: 'ℹ',
    [TOAST_TYPES.WARNING]: '⚠',
  }

  return (
    <div
      className={cn(
        'user-toast',
        `is-${type}`,
        isExiting && 'is-exiting',
      )}
    >
      <div className="user-toast__icon">{icons[type]}</div>
      <div className="user-toast__content">
        <p className="user-toast__message">{message}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="user-toast__close"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="user-toast-container">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = TOAST_TYPES.INFO, duration = 4000) => {
    const id = Date.now() + Math.random()
    const newToast = { id, message, type, duration }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback((message, duration) => showToast(message, TOAST_TYPES.SUCCESS, duration), [showToast])
  const error = useCallback((message, duration) => showToast(message, TOAST_TYPES.ERROR, duration), [showToast])
  const info = useCallback((message, duration) => showToast(message, TOAST_TYPES.INFO, duration), [showToast])
  const warning = useCallback((message, duration) => showToast(message, TOAST_TYPES.WARNING, duration), [showToast])

  return {
    toasts,
    showToast,
    dismissToast,
    success,
    error,
    info,
    warning,
  }
}

