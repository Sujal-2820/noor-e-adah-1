/**
 * Category Form Modal
 * Modal for creating and editing product categories
 */

import { useState, useEffect } from 'react'
import { X, Save, Layers, Image as ImageIcon } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { ImageUpload } from './ImageUpload'

export default function CategoryFormModal({ category, onClose, onSuccess }) {
    const isEditing = !!category
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image: null, // { url, publicId }
        order: 0,
        isActive: true,
    })

    const api = useAdminApi()
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                description: category.description || '',
                image: category.image || null,
                order: category.order || 0,
                isActive: category.isActive !== undefined ? category.isActive : true,
            })
        }
    }, [category])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.image) {
            toast.error('Category image is required')
            return
        }

        setIsSaving(true)
        try {
            if (isEditing) {
                await api.updateCategory(category._id, formData)
                toast.success('Category updated successfully')
            } else {
                await api.createCategory(formData)
                toast.success('New category created')
            }
            onSuccess()
        } catch (error) {
            toast.error(error.message || 'Failed to save category')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 text-white rounded-lg">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Category' : 'New Category'}</h2>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Manage product groupings</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Category Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none font-medium"
                                placeholder="E.g. NPK fertilizers"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Description</label>
                            <textarea
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-none font-medium text-sm"
                                placeholder="What kind of products belong here?"
                            />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Category Image (Squared)</label>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300">
                            <ImageUpload
                                images={formData.image ? [formData.image] : []}
                                maxImages={1}
                                onChange={(images) => setFormData({ ...formData, image: images[0] || null })}
                                disabled={isSaving}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 italic">
                            * Use high-quality squared imagery for best dashboard appearance.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Display Order</label>
                            <input
                                type="number"
                                value={formData.order}
                                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none font-bold"
                            />
                        </div>
                        <div className="flex items-end pb-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isActive ? 'bg-purple-600' : 'bg-gray-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <span className="text-xs font-bold text-gray-600 uppercase">Active</span>
                            </label>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={isSaving}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span className="font-bold uppercase tracking-wider">{isEditing ? 'Update' : 'Create'} Category</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
