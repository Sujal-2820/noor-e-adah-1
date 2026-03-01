import { useState, useEffect } from 'react'
import { useUserState, useUserDispatch } from '../../../context/UserContext'
import { useUserApi } from '../../../hooks/useUserApi'
import {
    UserIcon,
    PackageIcon,
    TruckIcon,
    HelpCircleIcon,
    EditIcon,
    ChevronRightIcon,
    CheckIcon,
    CloseIcon,
    BoxIcon,
    WalletIcon,
    MapPinIcon,
    ReportIcon,
    MenuIcon
} from '../../../components/icons'
import { cn } from '../../../../../lib/cn'
import { Trans } from '../../../../../components/Trans'
import { TransText } from '../../../../../components/TransText'
import { useToast } from '../../../components/ToastNotification'

export function UserProfileView({ onNavigate, onLogout }) {
    const { profile } = useUserState()
    const dispatch = useUserDispatch()
    const { fetchProfile, updateUserProfile } = useUserApi()
    const { success, error: showError } = useToast()

    const [editingName, setEditingName] = useState(false)
    const [editedName, setEditedName] = useState(profile?.name || '')

    const [showLocationPanel, setShowLocationPanel] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState({
        address: profile?.location?.address || '',
        city: profile?.location?.city || '',
        state: profile?.location?.state || '',
        pincode: profile?.location?.pincode || ''
    })

    const [showSupportPanel, setShowSupportPanel] = useState(false)
    const [showReportPanel, setShowReportPanel] = useState(false)

    // Active section for laptop view
    const [activeSectionId, setActiveSectionId] = useState('personal')

    useEffect(() => {
        if (profile?.name) {
            setEditedName(profile.name)
        }
    }, [profile])

    const handleSaveName = async () => {
        if (!editedName.trim()) {
            showError('Name cannot be empty')
            return
        }

        try {
            const result = await updateUserProfile({ name: editedName.trim() })
            if (result.data) {
                const newName = result.data.user?.name || editedName.trim()
                dispatch({
                    type: 'UPDATE_PROFILE',
                    payload: { name: newName }
                })
                success(`Name changed successfully to ${newName}`)
                setEditingName(false)
            } else {
                showError(result.error?.message || 'Failed to update name')
            }
        } catch (err) {
            showError('An error occurred while updating name')
        }
    }

    const sections = [
        {
            id: 'personal',
            title: 'Personal Information',
            icon: UserIcon,
            items: [
                { id: 'name', label: 'Full Name', value: profile?.name, editable: true, onEdit: () => setEditingName(true) },
                { id: 'phone', label: 'Phone Number', value: profile?.phone, editable: false },
                { id: 'email', label: 'Email Address', value: profile?.email || 'Not set', editable: false },
            ]
        },
        {
            id: 'business',
            title: 'Business Information',
            icon: BoxIcon,
            items: [
                { id: 'shop', label: 'Shop Name', value: profile?.shopName || profile?.name, editable: false },
                { id: 'gst', label: 'GST Number', value: profile?.gstNumber || 'Not provided', editable: false },
                { id: 'status', label: 'Account Status', value: profile?.status?.toUpperCase() || 'PENDING', badge: true, tone: profile?.status === 'approved' ? 'success' : 'warn' },
            ]
        },
        {
            id: 'location',
            title: 'Business Location',
            icon: MapPinIcon,
            items: [
                {
                    id: 'address',
                    label: 'Primary Address',
                    value: profile?.location?.city ? `${profile.location.address || ''}, ${profile.location.city}, ${profile.location.state} - ${profile.location.pincode}`.replace(/^,\s*/, '') : 'Not set',
                    action: () => setShowLocationPanel(true)
                },
            ]
        },
        {
            id: 'support',
            title: 'Support & Help',
            icon: HelpCircleIcon,
            items: [
                { id: 'help', label: 'Help Center', value: 'FAQs & Documentation', action: () => setShowSupportPanel(true) },
                { id: 'report', label: 'Report Issue', value: 'Submit a bug or problem', action: () => setShowReportPanel(true) },
            ]
        }
    ]

    return (
        <div className="user-account-view space-y-6">
            {/* Header */}
            <div className="user-account-view__header">
                <div className="user-account-view__header-avatar">
                    <UserIcon className="h-10 w-10" />
                </div>
                <div className="user-account-view__header-info">
                    <h2 className="user-account-view__header-name"><TransText>{profile?.name || 'User Partner'}</TransText></h2>
                    <p className="user-account-view__header-email">{profile?.phone}</p>
                </div>
            </div>

            {/* Name Edit Modal */}
            {editingName && (
                <div className="user-account-view__edit-modal">
                    <div className="user-account-view__edit-modal-content">
                        <h3 className="user-account-view__edit-modal-title"><Trans>Edit Name</Trans></h3>
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="user-account-view__edit-modal-input"
                            autoFocus
                        />
                        <div className="user-account-view__edit-modal-actions">
                            <button type="button" className="user-account-view__edit-modal-cancel" onClick={() => setEditingName(false)}>
                                <CloseIcon className="h-4 w-4" /> <Trans>Cancel</Trans>
                            </button>
                            <button type="button" className="user-account-view__edit-modal-save" onClick={handleSaveName}>
                                <CheckIcon className="h-4 w-4" /> <Trans>Save</Trans>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Sections */}
            <div className="user-account-view__sections">
                <div className="user-account-view__sections-mobile">
                    {sections.map((section) => (
                        <div key={section.id} className="user-account-view__section">
                            <div className="user-account-view__section-header">
                                <section.icon className="user-account-view__section-icon" />
                                <h3 className="user-account-view__section-title"><Trans>{section.title}</Trans></h3>
                            </div>
                            <div className="user-account-view__section-content">
                                {section.items.map((item) => (
                                    <div key={item.id} className="user-account-view__item">
                                        <div className="user-account-view__item-content">
                                            <span className="user-account-view__item-label"><Trans>{item.label}</Trans></span>
                                            <span className={cn(
                                                "user-account-view__item-value",
                                                item.badge && `status-badge status-badge--${item.tone || 'info'}`
                                            )}>
                                                <TransText>{item.value}</TransText>
                                            </span>
                                        </div>
                                        <div className="user-account-view__item-actions">
                                            {item.editable && (
                                                <button type="button" className="user-account-view__item-edit" onClick={item.onEdit}>
                                                    <EditIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            {item.action && (
                                                <button type="button" className="user-account-view__item-action" onClick={item.action}>
                                                    <ChevronRightIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={onLogout}
                            className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold border border-red-100 transition-all hover:bg-red-100"
                        >
                            <Trans>Sign Out</Trans>
                        </button>
                    </div>
                </div>
            </div>

            {/* Location Panel */}
            {showLocationPanel && (
                <div className="user-account-view__panel" onClick={() => setShowLocationPanel(false)}>
                    <div className="user-account-view__panel-content" onClick={(e) => e.stopPropagation()}>
                        <div className="user-account-view__panel-header">
                            <h3 className="user-account-view__panel-title"><Trans>Edit Business Location</Trans></h3>
                            <button type="button" onClick={() => setShowLocationPanel(false)} className="user-account-view__panel-close">
                                <CloseIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="user-account-view__panel-body p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Complete Address</label>
                                    <textarea
                                        value={selectedLocation.address}
                                        onChange={(e) => setSelectedLocation(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium resize-none"
                                        rows={2}
                                        placeholder="Building, Street, Landmark..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">City</label>
                                        <input
                                            type="text"
                                            value={selectedLocation.city}
                                            onChange={(e) => setSelectedLocation(prev => ({ ...prev, city: e.target.value }))}
                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                            placeholder="e.g. Kolhapur"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">State</label>
                                        <input
                                            type="text"
                                            value={selectedLocation.state}
                                            onChange={(e) => setSelectedLocation(prev => ({ ...prev, state: e.target.value }))}
                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                            placeholder="e.g. Maharashtra"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Pincode</label>
                                    <input
                                        type="text"
                                        value={selectedLocation.pincode}
                                        onChange={(e) => setSelectedLocation(prev => ({ ...prev, pincode: e.target.value }))}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                        placeholder="416001"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={!selectedLocation.address || !selectedLocation.city || !selectedLocation.state || !selectedLocation.pincode}
                                onClick={async () => {
                                    if (!selectedLocation.address || !selectedLocation.city || !selectedLocation.state || !selectedLocation.pincode) return
                                    try {
                                        const result = await updateUserProfile({ location: selectedLocation })
                                        if (result.data) {
                                            dispatch({
                                                type: 'UPDATE_PROFILE',
                                                payload: { location: selectedLocation }
                                            })
                                            success('Address updated successfully')
                                            setShowLocationPanel(false)
                                        } else {
                                            showError(result.error?.message || 'Failed to update address')
                                        }
                                    } catch (err) {
                                        showError('An error occurred while updating address')
                                    }
                                }}
                                className={cn(
                                    "w-full py-4 rounded-2xl font-bold transition-all shadow-lg",
                                    (selectedLocation.address && selectedLocation.city && selectedLocation.state && selectedLocation.pincode) ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                )}
                            >
                                <Trans>Update Address</Trans>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Support Panel */}
            {showSupportPanel && (
                <div className="user-account-view__panel" onClick={() => setShowSupportPanel(false)}>
                    <div className="user-account-view__panel-content" onClick={(e) => e.stopPropagation()}>
                        <div className="user-account-view__panel-header">
                            <h3 className="user-account-view__panel-title"><Trans>Support</Trans></h3>
                            <button type="button" onClick={() => setShowSupportPanel(false)} className="user-account-view__panel-close">
                                <CloseIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="user-account-view__panel-body p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <h4 className="font-bold text-blue-900 mb-1"><Trans>Contact Partner Support</Trans></h4>
                                <p className="text-sm text-blue-700 mb-4"><Trans>Our dedicated support team is available for user assistance.</Trans></p>
                                <a href="tel:+911234567890" className="flex items-center gap-2 text-[#1d4ed8] font-bold">
                                    <TruckIcon className="h-5 w-5" /> +91-1234567890
                                </a>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <h4 className="font-bold text-blue-900 mb-1"><Trans>User Documentation</Trans></h4>
                                <p className="text-sm text-blue-700 mb-3"><Trans>Learn how to manage inventory, track orders, and manage your account.</Trans></p>
                                <button className="text-blue-600 font-bold text-sm"><Trans>View Guide</Trans> →</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
