import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Users, Instagram } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { ImageUpload } from './ImageUpload'
import { LoadingOverlay } from './LoadingOverlay'

export default function InfluencerForm({ influencerId, onCancel, onSuccess }) {
    const isEditing = !!influencerId

    const [formData, setFormData] = useState({
        name: '',
        instagramLink: '',
        image: null,
        order: 0,
        isActive: true,
    })

    const api = useAdminApi()
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(isEditing)

    useEffect(() => {
        if (isEditing) fetchItem()
    }, [influencerId])

    const fetchItem = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminInfluencers()
            const all = response.data || []
            const item = all.find(c => c._id === influencerId)
            if (item) {
                setFormData({
                    name: item.name || '',
                    instagramLink: item.instagramLink || '',
                    image: item.image || null,
                    order: item.order || 0,
                    isActive: item.isActive !== undefined ? item.isActive : true,
                })
            } else {
                toast.error('Influencer not found')
                onCancel()
            }
        } catch {
            toast.error('Failed to load details')
            onCancel()
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error('Name is required')
            return
        }
        if (!formData.instagramLink.trim()) {
            toast.error('Instagram link is required')
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                name: formData.name.trim(),
                instagramLink: formData.instagramLink.trim(),
                image: formData.image || undefined,
                order: formData.order,
                isActive: formData.isActive,
            }

            if (isEditing) {
                await api.updateInfluencer(influencerId, payload)
                toast.success('Influencer updated')
            } else {
                await api.createInfluencer(payload)
                toast.success('Influencer created')
            }
            onSuccess()
        } catch (err) {
            toast.error(err.message || 'Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm group"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <Users className="w-6 h-6 text-purple-600" />
                            {isEditing ? 'Edit Influencer' : 'Add Influencer'}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium italic">
                            {isEditing ? `Modifying "${formData.name}"` : 'Add a new influencer to the home page section.'}
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                    >Discard</button>
                    <button
                        disabled={isSaving}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all disabled:opacity-50"
                    >
                        {isSaving
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Save className="w-5 h-5" />
                        }
                        SAVE INFLUENCER
                    </button>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => set('name', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all font-medium text-lg"
                                    placeholder="Influencer Name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                                    Instagram Link <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        required
                                        type="url"
                                        value={formData.instagramLink}
                                        onChange={e => set('instagramLink', e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all font-medium"
                                        placeholder="https://www.instagram.com/profile"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <ImageUpload
                                images={formData.image ? [formData.image] : []}
                                maxImages={1}
                                onChange={images => set('image', images[0] || null)}
                                disabled={isSaving}
                                aspectRatio={3 / 4}
                                folder="canx/influencers"
                                title="Influencer Image"
                                hideHint={true}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                            <div>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm font-bold text-gray-700 uppercase">Active</span>
                                    <div
                                        onClick={() => set('isActive', !formData.isActive)}
                                        className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${formData.isActive ? 'bg-purple-600 shadow-lg shadow-purple-100' : 'bg-gray-200'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </label>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block mb-2">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.order}
                                    onChange={e => set('order', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all disabled:opacity-50"
                        >
                            {isSaving
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Save className="w-5 h-5" />
                            }
                            SAVE INFLUENCER
                        </button>
                    </div>
                </div>
            </form>
            <LoadingOverlay isVisible={isSaving} message={isEditing ? 'Updating Influencer...' : 'Creating Influencer...'} />
        </div>
    )
}
