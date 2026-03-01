import { useEffect, useRef } from 'react'
import { cn } from '../../../lib/cn'
import { CloseIcon, BellIcon } from './icons'

export function NotificationPanel({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }) {
  const panelRef = useRef(null)

  // Show max 3 recent notifications
  const recentNotifications = (notifications || [])
    .filter((n) => !n.read)
    .slice(0, 3)
    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_assigned':
        return '📦'
      case 'order_status_changed':
        return '🔄'
      case 'credit_purchase_approved':
        return '✅'
      case 'credit_purchase_rejected':
        return '❌'
      case 'credit_due_reminder':
        return '⏰'
      case 'inventory_low_alert':
        return '⚠️'
      case 'admin_announcement':
        return '📢'
      case 'stock_arrival':
        return '📥'
      case 'stock_request':
        return '📋'
      default:
        return '🔔'
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
  }

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={cn('user-notification-panel', isOpen && 'is-open')}>
      <div className={cn('user-notification-panel__overlay', isOpen && 'is-open')} onClick={onClose} />
      <div className={cn('user-notification-panel__content', isOpen && 'is-open')} ref={panelRef}>
        <div className="user-notification-panel__header">
          <div className="user-notification-panel__header-content">
            <div className="user-notification-panel__icon">
              <BellIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="user-notification-panel__title">Notifications</h3>
              <p className="user-notification-panel__subtitle">
                {recentNotifications.length > 0 ? `${recentNotifications.length} new` : 'No new notifications'}
              </p>
            </div>
          </div>
          <button type="button" className="user-notification-panel__close" onClick={onClose} aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="user-notification-panel__body">
          {recentNotifications.length === 0 ? (
            <div className="user-notification-panel__empty">
              <BellIcon className="h-12 w-12" style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p className="user-notification-panel__empty-text">No new notifications</p>
              <p className="user-notification-panel__empty-subtext">You're all caught up!</p>
            </div>
          ) : (
            <>
              {recentNotifications.length > 0 && (
                <div className="user-notification-panel__actions">
                  <button
                    type="button"
                    onClick={() => {
                      if (onMarkAllAsRead) {
                        onMarkAllAsRead()
                      }
                    }}
                    className="user-notification-panel__mark-all"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
              <div className="user-notification-panel__list">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'user-notification-item',
                      !notification.read && 'is-unread',
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="user-notification-item__icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="user-notification-item__content">
                      <div className="user-notification-item__header">
                        <h4 className="user-notification-item__title">
                          {notification.title || 'Notification'}
                        </h4>
                        {!notification.read && (
                          <span className="user-notification-item__badge" />
                        )}
                      </div>
                      <p className="user-notification-item__message">
                        {notification.message || 'You have a new notification'}
                      </p>
                      <span className="user-notification-item__time">
                        {formatTime(notification.timestamp || notification.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

