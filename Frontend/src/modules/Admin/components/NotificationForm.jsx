import { useState, useEffect } from 'react'
import { Bell, Users, Building2, ShieldCheck, AlertCircle } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from '../../../lib/cn'

const TARGET_AUDIENCES = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'users', label: 'Users', icon: Building2 },
  { value: 'users', label: 'Users (Farmers)', icon: Users },
]

export function NotificationForm({ isOpen, onClose, notification, onSave, onDelete, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    priority: 'normal',
    isActive: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        message: notification.message || notification.content || '',
        targetAudience: notification.targetAudience || 'all',
        priority: notification.priority || 'normal',
        isActive: notification.isActive !== false,
      })
    } else {
      setFormData({
        title: '',
        message: '',
        targetAudience: 'all',
        priority: 'normal',
        isActive: true,
      })
    }
    setErrors({})
  }, [notification, isOpen])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      onSave(formData)
    }
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      onDelete(notification.id)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={notification ? 'Edit Notification' : 'Create New Notification'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-bold text-gray-900">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter notification title"
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
              errors.title
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/50',
            )}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-bold text-gray-900">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Enter notification message"
            rows={4}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
              errors.message
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/50',
            )}
          />
          {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
        </div>

        {/* Target Audience */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            <Bell className="mr-1 inline h-4 w-4" />
            Target Audience <span className="text-red-500">*</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {TARGET_AUDIENCES.map((audience) => {
              const Icon = audience.icon
              const isSelected = formData.targetAudience === audience.value
              return (
                <label
                  key={audience.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all',
                    isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  )}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value={audience.value}
                    checked={isSelected}
                    onChange={(e) => handleChange('targetAudience', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
                  />
                  <Icon className={cn('h-5 w-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
                  <span className="text-sm font-bold text-gray-900">{audience.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="mb-2 block text-sm font-bold text-gray-900">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="text-sm font-bold text-gray-900">Active Status</p>
            <p className="text-xs text-gray-600">Show this notification to users</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50"></div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-between">
          <div>
            {notification && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
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
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {loading ? 'Saving...' : notification ? 'Update Notification' : 'Create Notification'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

