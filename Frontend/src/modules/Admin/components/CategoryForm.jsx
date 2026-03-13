/**
 * CategoryForm — Fashion Taxonomy
 * Handles: Category | Look | Theme | Collection
 */
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Layers, Palette, Sparkles, BookOpen } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { ImageUpload } from './ImageUpload'
import { LoadingOverlay } from './LoadingOverlay'

const TAXONOMY_TYPES = [
    { value: 'category', label: 'Category', icon: Layers, hint: 'e.g. Sarees, Anarkali, Lehengas' },
    { value: 'look', label: 'Look', icon: Sparkles, hint: 'e.g. Watch And Buy' },
    { value: 'theme', label: 'Theme', icon: Palette, hint: 'e.g. Haldi, Wedding, Festive' },
    { value: 'collection', label: 'Collection', icon: BookOpen, hint: 'e.g. SS24, Celebrity, Winter Velvet' },
]

const TYPE_LABELS = {
    category: { save: 'SAVE CATEGORY', title: 'Category' },
    look: { save: 'SAVE LOOK', title: 'Look' },
    theme: { save: 'SAVE THEME', title: 'Theme' },
    collection: { save: 'SAVE COLLECTION', title: 'Collection' },
}

export default function CategoryForm({ categoryId, initialType = 'category', onCancel, onSuccess }) {
    const isEditing = !!categoryId

    const [formData, setFormData] = useState({
        name: '',
        type: initialType,
        description: '',
        image: null,
        order: 0,
        isActive: true,
        isFeatured: false,
    })

    const api = useAdminApi()
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(isEditing)

    useEffect(() => {
        if (isEditing) fetchItem()
    }, [categoryId])

    const fetchItem = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminCategories()
            // The API now returns { data: [], grouped: {} }
            const all = response.data || []
            const item = all.find(c => c._id === categoryId)
            if (item) {
                setFormData({
                    name: item.name || '',
                    type: item.type || 'category',
                    description: item.description || '',
                    image: item.image || null,
                    order: item.order || 0,
                    isActive: item.isActive !== undefined ? item.isActive : true,
                    isFeatured: item.isFeatured || false,
                })
            } else {
                toast.error('Item not found')
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

        setIsSaving(true)
        try {
            const payload = {
                name: formData.name.trim(),
                type: formData.type,
                description: formData.description,
                image: formData.image || undefined,
                order: formData.order,
                isActive: formData.isActive,
                isFeatured: formData.isFeatured,
            }

            if (isEditing) {
                await api.updateCategory(categoryId, payload)
                toast.success(`${TYPE_LABELS[formData.type]?.title || 'Item'} updated`)
            } else {
                await api.createCategory(payload)
                toast.success(`${TYPE_LABELS[formData.type]?.title || 'Item'} created`)
            }
            onSuccess()
        } catch (err) {
            toast.error(err.message || 'Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

    const typeInfo = TAXONOMY_TYPES.find(t => t.value === formData.type) || TAXONOMY_TYPES[0]
    const Icon = typeInfo.icon

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
                            <Icon className="w-6 h-6 text-purple-600" />
                            {isEditing ? `Edit ${TYPE_LABELS[formData.type]?.title}` : `Create ${TYPE_LABELS[formData.type]?.title}`}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium italic">
                            {isEditing ? `Modifying "${formData.name}"` : typeInfo.hint}
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
                        {TYPE_LABELS[formData.type]?.save || 'SAVE'}
                    </button>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Type selector — only when creating */}
                        {!isEditing && (
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block mb-3">
                                    Type
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {TAXONOMY_TYPES.map(t => {
                                        const TIcon = t.icon
                                        const active = formData.type === t.value
                                        return (
                                            <button
                                                type="button"
                                                key={t.value}
                                                onClick={() => set('type', t.value)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition-all ${active
                                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-purple-300'
                                                    }`}
                                            >
                                                <TIcon className="w-5 h-5" />
                                                {t.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-gray-400 mt-2 italic">{typeInfo.hint}</p>
                            </div>
                        )}

                        {/* Name */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                                    {TYPE_LABELS[formData.type]?.title || 'Item'} Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => set('name', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all font-medium text-lg"
                                    placeholder={typeInfo.hint}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                                    Description <span className="text-gray-400 text-xs font-normal">(optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => set('description', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all text-sm resize-none"
                                    placeholder="A brief description of this grouping..."
                                />
                            </div>
                        </div>

                        {/* Image */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block mb-4">
                                Cover Image <span className="text-gray-400 text-xs font-normal">(Portrait 2:3 ratio, e.g. 800x1200 works best)</span>
                            </label>
                            <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-200">
                                <ImageUpload
                                    images={formData.image ? [formData.image] : []}
                                    maxImages={1}
                                    onChange={images => set('image', images[0] || null)}
                                    disabled={isSaving}
                                    aspectRatio={2 / 3}
                                    folder="canx/taxonomy"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                            {/* Active toggle */}
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
                                <p className="text-[10px] text-gray-400 mt-2 italic">
                                    {formData.isActive ? 'Visible to customers.' : 'Hidden from storefront.'}
                                </p>
                            </div>

                            {/* Featured toggle */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm font-bold text-gray-700 uppercase">Featured</span>
                                    <div
                                        onClick={() => set('isFeatured', !formData.isFeatured)}
                                        className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${formData.isFeatured ? 'bg-amber-500 shadow-lg shadow-amber-100' : 'bg-gray-200'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </label>
                                <p className="text-[10px] text-gray-400 mt-2 italic">
                                    Show on homepage / featured sections.
                                </p>
                            </div>

                            {/* Order */}
                            <div>
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block mb-2">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.order}
                                    onChange={e => set('order', parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Lower = appears first.</p>
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
                            {TYPE_LABELS[formData.type]?.save || 'SAVE'}
                        </button>
                    </div>
                </div>
            </form>

            <LoadingOverlay isVisible={isSaving} message={isEditing ? 'Updating Item...' : 'Creating Item...'} />
        </div>
    )
}
