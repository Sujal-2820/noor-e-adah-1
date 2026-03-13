import { useState, useEffect, useMemo, useCallback } from 'react'
import { Bell, Send, Users, Building2, ShieldCheck, Plus, Edit2, Trash2, MoreVertical, Search, Filter, AlertCircle, Smartphone, CheckCircle2 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { DataTable } from '../components/DataTable'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { LoadingOverlay } from '../components/LoadingOverlay'

/**
 * Push Notifications Management Page
 * 
 * This page provides UI for:
 * - Creating custom push notifications for users, users, and admins
 * - Managing push notification history with real delivery stats
 * - Targeting specific recipients
 */

const TARGET_AUDIENCES = [
    { value: 'all', label: 'All Registered Devices', icon: Users, description: 'Send to everyone on the platform' },
    { value: 'users', label: 'All Users', icon: Building2, description: 'Send to all users' },
    { value: 'specific_user', label: 'Specific User', icon: Building2, description: 'Send to a selected user' },
]

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'urgent', label: 'Urgent', color: 'red' },
]

export function PushNotificationsPage({ subRoute = null, navigate }) {
    const { success, error, info } = useToast()
    const { getUsers } = useAdminApi()
    const [activeTab, setActiveTab] = useState('create') // 'create' | 'history'
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [users, setUsers] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        targetAudience: 'all',
        targetMode: 'all', // 'all' or 'specific'
        targetRecipients: [],
        selectedUserId: '', // For specific user selection
        priority: 'normal',
        scheduledAt: null,
        imageUrl: '',
        actionUrl: '',
    })
    const [formErrors, setFormErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingMessage, setProcessingMessage] = useState('')

    const [pushHistory, setPushHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Fetch users and history on mount
    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true)
        try {
            const authToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/fcm/history`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                setPushHistory(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch history:', err)
        } finally {
            setLoadingHistory(false)
        }
    }, [])

    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true)
            try {
                // Fetch all users without status filter to ensure we get results
                const result = await getUsers({ limit: 1000 })

                if (result.success && result.data) {
                    // Extract users array robustly (support both {users:[]} and [])
                    const data = result.data
                    const userList = (data && data.users) ? data.users : (Array.isArray(data) ? data : [])

                    console.log(`Fetched ${userList.length} users for push notifications`)
                    setUsers(userList)

                    if (userList.length === 0) {
                        info('No users found for specific selection')
                    }
                } else {
                    console.error('API Error fetching users:', result.error)
                    error(result.error?.message || 'Failed to load users list')
                }
            } catch (err) {
                console.error('Component Error fetching users:', err)
            } finally {
                setLoadingUsers(false)
            }
        }

        fetchUsers()
        fetchHistory()
    }, [getUsers, fetchHistory])

    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    const validateForm = () => {
        const errors = {}
        if (!formData.title.trim()) {
            errors.title = 'Title is required'
        }
        if (formData.title.length > 65) {
            errors.title = 'Title must be 65 characters or less for optimal display'
        }
        if (!formData.message.trim()) {
            errors.message = 'Message is required'
        }
        if (formData.message.length > 240) {
            errors.message = 'Message must be 240 characters or less for optimal display'
        }
        if (formData.targetAudience === 'specific_user' && !formData.selectedUserId) {
            errors.selectedUserId = 'Please select a user'
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) return

        setIsSubmitting(true)
        setIsProcessing(true)
        setProcessingMessage('Broadcasting Notification...')

        try {
            const authToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
            // Use VITE_API_BASE_URL to match other API calls
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

            const response = await fetch(`${API_BASE_URL}/fcm/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                success('Push notification broadcast initiated!')
                setShowCreateForm(false)

                // Refresh history after a short delay to allow background processing if any
                setTimeout(fetchHistory, 500);

                setFormData({
                    title: '',
                    message: '',
                    targetAudience: 'all',
                    targetMode: 'all',
                    targetRecipients: [],
                    selectedUserId: '',
                    priority: 'normal',
                    scheduledAt: null,
                    imageUrl: '',
                    actionUrl: '',
                })
                setActiveTab('history')
            } else {
                error(result.message || 'Failed to send push notification')
            }
        } catch (err) {
            console.error('Push broadcast error:', err);
            error('Failed to send push notification. Please check your connection.')
        } finally {
            setIsSubmitting(false)
            setIsProcessing(false)
        }
    }

    const getAudienceIcon = (audience) => {
        const found = TARGET_AUDIENCES.find(t => t.value === audience)
        return found?.icon || Users
    }

    const getAudienceLabel = (audience) => {
        const found = TARGET_AUDIENCES.find(t => t.value === audience)
        return found?.label || 'All'
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'delivered':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />Delivered</span>
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
            case 'failed':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>
        }
    }

    const historyColumns = useMemo(() => [
        {
            accessor: 'title',
            Header: 'Notification',
            Cell: (row) => (
                <div className="max-w-xs">
                    <p className="font-semibold text-gray-900 truncate">{row.title}</p>
                    <p className="text-xs text-gray-500 truncate">{row.message}</p>
                </div>
            ),
        },
        {
            accessor: 'targetAudience',
            Header: 'Audience',
            Cell: (row) => {
                const Icon = getAudienceIcon(row.targetAudience)
                return (
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{getAudienceLabel(row.targetAudience)}</span>
                    </div>
                )
            },
        },
        {
            accessor: 'sentAt',
            Header: 'Sent At',
            Cell: (row) => (
                <span className="text-sm text-gray-600">
                    {new Date(row.sentAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
            ),
        },
        {
            accessor: 'stats',
            Header: 'Delivery Stats',
            Cell: (row) => (
                <div className="text-sm">
                    <p className="text-gray-900">{row.deliveredCount.toLocaleString()} delivered</p>
                    <p className="text-xs text-gray-500">{row.openedCount.toLocaleString()} opened ({row.deliveredCount > 0 ? Math.round((row.openedCount / row.deliveredCount) * 100) : 0}%)</p>
                </div>
            ),
        },
        {
            accessor: 'status',
            Header: 'Status',
            Cell: (row) => getStatusBadge(row.status),
        },
    ], [])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Push Notifications</p>
                    <h2 className="text-2xl font-bold text-gray-900">Push Notification Manager</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Send custom push notifications to registered devices and users
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                    <Send className="h-4 w-4" />
                    New Push Notification
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className={cn(
                        'px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                        activeTab === 'create'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Create New
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        'px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                        activeTab === 'history'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                >
                    <Bell className="h-4 w-4 inline mr-2" />
                    History ({pushHistory.length})
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'create' && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="mb-2 block text-sm font-bold text-gray-900">
                                Notification Title <span className="text-red-500">*</span>
                                <span className="ml-2 text-xs font-normal text-gray-500">({formData.title.length}/65 characters)</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={formData.title}
                                onChange={(e) => handleFormChange('title', e.target.value)}
                                placeholder="Enter notification title"
                                maxLength={65}
                                className={cn(
                                    'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                                    formErrors.title
                                        ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                        : 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-indigo-500/50',
                                )}
                            />
                            {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
                        </div>

                        {/* Message */}
                        <div>
                            <label htmlFor="message" className="mb-2 block text-sm font-bold text-gray-900">
                                Message <span className="text-red-500">*</span>
                                <span className="ml-2 text-xs font-normal text-gray-500">({formData.message.length}/240 characters)</span>
                            </label>
                            <textarea
                                id="message"
                                value={formData.message}
                                onChange={(e) => handleFormChange('message', e.target.value)}
                                placeholder="Enter notification message"
                                rows={3}
                                maxLength={240}
                                className={cn(
                                    'w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2',
                                    formErrors.message
                                        ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                        : 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-indigo-500/50',
                                )}
                            />
                            {formErrors.message && <p className="mt-1 text-xs text-red-600">{formErrors.message}</p>}
                        </div>

                        {/* Target Audience */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-900">
                                Target Audience <span className="text-red-500">*</span>
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {TARGET_AUDIENCES.map((audience) => {
                                    const Icon = audience.icon
                                    const isSelected = formData.targetAudience === audience.value
                                    return (
                                        <label
                                            key={audience.value}
                                            className={cn(
                                                'flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-all',
                                                isSelected
                                                    ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500/20'
                                                    : 'border-gray-200 bg-white hover:border-gray-300',
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="targetAudience"
                                                    value={audience.value}
                                                    checked={isSelected}
                                                    onChange={(e) => handleFormChange('targetAudience', e.target.value)}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500/50"
                                                />
                                                <Icon className={cn('h-5 w-5', isSelected ? 'text-indigo-600' : 'text-gray-400')} />
                                                <span className="text-sm font-bold text-gray-900">{audience.label}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 ml-6">{audience.description}</p>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        {/* User Selection (shown when specific_user is selected) */}
                        {formData.targetAudience === 'specific_user' && (
                            <div>
                                <label htmlFor="selectedUserId" className="mb-2 block text-sm font-bold text-gray-900">
                                    Select User <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="selectedUserId"
                                    value={formData.selectedUserId}
                                    onChange={(e) => handleFormChange('selectedUserId', e.target.value)}
                                    disabled={loadingUsers}
                                    className={cn(
                                        'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                                        formErrors.selectedUserId
                                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                            : 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-indigo-500/50',
                                    )}
                                >
                                    <option value="">
                                        {loadingUsers ? 'Loading users...' : 'Select a user'}
                                    </option>
                                    {users.map((user) => (
                                        <option key={user._id || user.id} value={user._id || user.id}>
                                            {user.name} - {user.phone || user.email}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.selectedUserId && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.selectedUserId}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    {users.length} user{users.length !== 1 ? 's' : ''} available
                                </p>
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
                                onChange={(e) => handleFormChange('priority', e.target.value)}
                                className="w-full max-w-xs rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Preview */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-900">Preview</label>
                            <div className="max-w-sm rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 shadow-inner">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                                        <Bell className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-500">Noor E Adah</span>
                                            <span className="text-xs text-gray-400">now</span>
                                        </div>
                                        <p className="font-bold text-gray-900 truncate mt-0.5">
                                            {formData.title || 'Notification Title'}
                                        </p>
                                        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                                            {formData.message || 'Your notification message will appear here...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({
                                        title: '',
                                        message: '',
                                        targetAudience: 'all',
                                        targetMode: 'all',
                                        targetRecipients: [],
                                        selectedUserId: '',
                                        priority: 'normal',
                                        scheduledAt: null,
                                        imageUrl: '',
                                        actionUrl: '',
                                    })
                                    setFormErrors({})
                                }}
                                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                {isSubmitting ? 'Sending...' : 'Send Push Notification'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] overflow-visible">
                    {pushHistory.length === 0 ? (
                        <div className="p-12 text-center">
                            <Bell className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-4 text-lg font-bold text-gray-900">No push notifications yet</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Create your first push notification to engage with your users
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveTab('create')}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                            >
                                <Plus className="h-4 w-4" />
                                Create Notification
                            </button>
                        </div>
                    ) : (
                        <DataTable
                            columns={historyColumns}
                            rows={pushHistory}
                            emptyState="No push notifications found"
                        />
                    )}
                </div>
            )}
            {/* Loading Overlay */}
            <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
        </div>
    )
}

export default PushNotificationsPage
