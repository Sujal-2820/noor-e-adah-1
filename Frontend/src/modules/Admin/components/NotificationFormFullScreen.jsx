import { useState, useEffect } from 'react'
import { Bell, Users, Building2, ShieldCheck, ArrowLeft, Trash2, Search, Check, X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useAdminApi } from '../hooks/useAdminApi'

const TARGET_AUDIENCES = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'users', label: 'Users', icon: Users },
]

export function NotificationFormFullScreen({ notification, onSave, onDelete, onCancel, loading }) {
  const { fetchUsers, fetchAdmins } = useAdminApi()
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    targetMode: 'all', // 'all' or 'specific'
    targetRecipients: [],
    priority: 'normal',
    isActive: true,
  })
  const [errors, setErrors] = useState({})
  const [recipientList, setRecipientList] = useState([])
  const [recipientSearch, setRecipientSearch] = useState('')
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        message: notification.message || notification.content || '',
        targetAudience: notification.targetAudience || 'all',
        targetMode: notification.targetMode || 'all',
        targetRecipients: notification.targetRecipients || [],
        priority: notification.priority || 'normal',
        isActive: notification.isActive !== false,
      })
    } else {
      setFormData({
        title: '',
        message: '',
        targetAudience: 'all',
        targetMode: 'all',
        targetRecipients: [],
        priority: 'normal',
        isActive: true,
      })
    }
    setErrors({})
  }, [notification])

  // Load recipients when target audience changes
  useEffect(() => {
    const loadRecipients = async () => {
      if (formData.targetAudience === 'all' || formData.targetMode === 'all') {
        setRecipientList([])
        return
      }

      setLoadingRecipients(true)
      try {
        let data = []
        if (formData.targetAudience === 'users') {
          const result = await fetchUsers({ limit: 200 })
          data = (result?.users || []).map(v => ({ id: v._id || v.id, name: v.businessName || v.name, phone: v.phone }))
        } else if (formData.targetAudience === 'users') {
          const result = await fetchUsers({ limit: 200 })
          data = (result?.users || []).map(u => ({ id: u._id || u.id, name: u.name, phone: u.phone }))
        }
        setRecipientList(data)
      } catch (err) {
        console.error('Failed to load recipients:', err)
      } finally {
        setLoadingRecipients(false)
      }
    }

    if (formData.targetMode === 'specific') {
      loadRecipients()
    }
  }, [formData.targetAudience, formData.targetMode, fetchUsers, fetchAdmins])

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // Reset target mode when audience changes
      if (field === 'targetAudience') {
        updated.targetRecipients = []
        if (value === 'all') {
          updated.targetMode = 'all'
        }
      }
      return updated
    })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleToggleRecipient = (recipientId) => {
    setFormData(prev => {
      const isSelected = prev.targetRecipients.includes(recipientId)
      return {
        ...prev,
        targetRecipients: isSelected
          ? prev.targetRecipients.filter(id => id !== recipientId)
          : [...prev.targetRecipients, recipientId]
      }
    })
  }

  const handleSelectAll = () => {
    const filteredIds = filteredRecipients.map(r => r.id)
    setFormData(prev => ({
      ...prev,
      targetRecipients: [...new Set([...prev.targetRecipients, ...filteredIds])]
    }))
  }

  const handleDeselectAll = () => {
    const filteredIds = filteredRecipients.map(r => r.id)
    setFormData(prev => ({
      ...prev,
      targetRecipients: prev.targetRecipients.filter(id => !filteredIds.includes(id))
    }))
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
    if (formData.targetMode === 'specific' && formData.targetRecipients.length === 0) {
      newErrors.targetRecipients = 'Select at least one recipient'
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

  const filteredRecipients = recipientList.filter(r =>
    r.name?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    r.phone?.includes(recipientSearch)
  )

  const showSpecificTargeting = formData.targetAudience !== 'all'

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Operations
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Operational Controls</p>
          <h2 className="text-2xl font-bold text-gray-900">{notification ? 'Edit Notification' : 'Add Notification'}</h2>
          <p className="text-sm text-gray-600">
            Create or update platform notifications for users and users.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
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

          {/* Target Mode (only shown when specific audience is selected) */}
          {showSpecificTargeting && (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Targeting Mode
              </label>
              <div className="flex gap-4">
                <label className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 flex-1 transition-all',
                  formData.targetMode === 'all' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                )}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="all"
                    checked={formData.targetMode === 'all'}
                    onChange={(e) => handleChange('targetMode', e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm font-bold">All {formData.targetAudience}</span>
                </label>
                <label className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-xl border p-3 flex-1 transition-all',
                  formData.targetMode === 'specific' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                )}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="specific"
                    checked={formData.targetMode === 'specific'}
                    onChange={(e) => handleChange('targetMode', e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm font-bold">Specific Recipients</span>
                </label>
              </div>
            </div>
          )}

          {/* Recipient Selection (only shown when targetMode is 'specific') */}
          {showSpecificTargeting && formData.targetMode === 'specific' && (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-900">
                Select Recipients ({formData.targetRecipients.length} selected)
                {errors.targetRecipients && <span className="text-red-500 ml-2 font-normal">{errors.targetRecipients}</span>}
              </label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={handleSelectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={handleDeselectAll} className="text-xs text-gray-600 hover:underline">Deselect All</button>
                </div>

                {/* Recipients List */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {loadingRecipients ? (
                    <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
                  ) : filteredRecipients.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No recipients found</p>
                  ) : (
                    filteredRecipients.map((recipient) => {
                      const isSelected = formData.targetRecipients.includes(recipient.id)
                      return (
                        <label
                          key={recipient.id}
                          className={cn(
                            'flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-all',
                            isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
                          )}
                        >
                          <div className={cn(
                            'h-5 w-5 rounded border flex items-center justify-center',
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{recipient.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{recipient.phone}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRecipient(recipient.id)}
                            className="sr-only"
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

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
                  className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
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
      </div>
    </div>
  )
}
