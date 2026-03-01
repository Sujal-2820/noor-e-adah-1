/**
 * Categories Management Page — Noor E Adah Fashion
 * Tabbed interface: Category | Look | Theme | Collection
 * Drag-and-drop reordering within each tab (existing logic preserved)
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Layers, Palette, Sparkles, BookOpen, Search, GripVertical } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import CategoryForm from '../components/CategoryForm'
import { cn } from '../../../lib/cn'

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
    { key: 'category', label: 'Categories', icon: Layers, color: 'purple', hint: 'Sarees, Anarkali, Lehengas…' },
    { key: 'look', label: 'Looks', icon: Sparkles, color: 'pink', hint: 'Watch And Buy…' },
    { key: 'theme', label: 'Themes', icon: Palette, color: 'amber', hint: 'Haldi, Party, Wedding…' },
    { key: 'collection', label: 'Collections', icon: BookOpen, color: 'blue', hint: 'SS24, Celebrity…' },
]

const TAB_COLORS = {
    purple: 'bg-purple-600 text-white shadow-purple-200',
    pink: 'bg-pink-500 text-white shadow-pink-200',
    amber: 'bg-amber-500 text-white shadow-amber-200',
    blue: 'bg-blue-600 text-white shadow-blue-200',
}
const TAB_ACTIVE_BORDER = {
    purple: 'border-purple-600 text-purple-700 bg-purple-50',
    pink: 'border-pink-500 text-pink-700 bg-pink-50',
    amber: 'border-amber-500 text-amber-700 bg-amber-50',
    blue: 'border-blue-600 text-blue-700 bg-blue-50',
}

export function CategoriesPage({ subRoute, navigate }) {
    // Grouped state: { category:[], look:[], theme:[], collection:[] }
    const [grouped, setGrouped] = useState({ category: [], look: [], theme: [], collection: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('category')
    const [searchTerm, setSearchTerm] = useState('')
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)

    const api = useAdminApi()
    const toast = useToast()

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchAll = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminCategories()
            if (response.success) {
                const g = response.grouped || {}
                // Sort each type by order desc (latest first, matching existing behaviour)
                const sort = arr => [...(arr || [])].sort((a, b) => b.order - a.order)
                setGrouped({
                    category: sort(g.category),
                    look: sort(g.look),
                    theme: sort(g.theme),
                    collection: sort(g.collection),
                })
            }
        } catch {
            toast.error('Failed to load taxonomy')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    // Reset search when tab changes
    useEffect(() => { setSearchTerm('') }, [activeTab])

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id, type) => {
        if (!window.confirm('Delete this item? This will fail if products are assigned to it.')) return
        try {
            const response = await api.deleteCategory(id)
            if (response.success) {
                toast.success('Deleted successfully')
                fetchAll()
            } else {
                toast.error(response.message || 'Failed to delete')
            }
        } catch (err) {
            toast.error(err.message || 'Failed to delete')
        }
    }

    // ── Drag & Drop (same logic as before, scoped to active tab) ─────────────
    const currentItems = grouped[activeTab] || []

    const handleDragStart = (e, index) => {
        if (currentItems.length <= 1) return
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', index.toString())
        if (e.currentTarget) e.currentTarget.style.opacity = '0.5'
    }
    const handleDragEnd = (e) => {
        if (e.currentTarget) e.currentTarget.style.opacity = '1'
        setDraggedIndex(null)
        setDragOverIndex(null)
    }
    const handleDragOver = (e, index) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index)
    }
    const handleDragLeave = () => setDragOverIndex(null)

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault()
        setDragOverIndex(null)
        if (draggedIndex === null || draggedIndex === dropIndex) return

        const updated = [...currentItems]
        const dragged = updated[draggedIndex]
        updated.splice(draggedIndex, 1)
        updated.splice(dropIndex, 0, dragged)

        const reordered = updated.map((item, idx) => ({ ...item, order: updated.length - idx }))
        setGrouped(prev => ({ ...prev, [activeTab]: reordered }))
        setDraggedIndex(null)

        setIsSavingOrder(true)
        try {
            const orderUpdates = reordered.map(item => ({ id: item._id, order: item.order }))
            const response = await api.reorderCategories(orderUpdates)
            if (response.success) {
                toast.success('Order updated')
            } else {
                toast.error('Failed to save order')
                fetchAll()
            }
        } catch {
            toast.error('Failed to save order')
            fetchAll()
        } finally {
            setIsSavingOrder(false)
        }
    }

    // ── Filter ───────────────────────────────────────────────────────────────
    const filtered = currentItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // ── Sub-routes: add / edit ────────────────────────────────────────────────
    if (subRoute === 'add' || (subRoute && subRoute.startsWith('edit/'))) {
        const itemId = subRoute.startsWith('edit/') ? subRoute.split('/')[1] : null
        // Preserve active tab type when creating
        const initialType = subRoute === 'add' ? activeTab : undefined

        return (
            <CategoryForm
                categoryId={itemId}
                initialType={initialType}
                onCancel={() => navigate('categories')}
                onSuccess={() => { fetchAll(); navigate('categories') }}
            />
        )
    }

    // ── Active tab meta ───────────────────────────────────────────────────────
    const tab = TABS.find(t => t.key === activeTab)

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Layers className="w-6 h-6 text-purple-600" />
                        Fashion Taxonomy
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium italic">
                        Manage categories, looks, themes and collections.
                    </p>
                </div>
                <button
                    onClick={() => navigate('categories/add')}
                    className={cn(
                        'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-white',
                        TAB_COLORS[tab?.color || 'purple']
                    )}
                >
                    <Plus className="w-5 h-5" />
                    ADD {tab?.label?.slice(0, -1).toUpperCase() || 'NEW'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(t => {
                    const TIcon = t.icon
                    const isActive = activeTab === t.key
                    const count = (grouped[t.key] || []).length
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={cn(
                                'flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-bold text-sm whitespace-nowrap transition-all',
                                isActive
                                    ? TAB_ACTIVE_BORDER[t.color]
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            )}
                        >
                            <TIcon className="w-4 h-4" />
                            {t.label}
                            <span className={cn(
                                'ml-1 px-2 py-0.5 rounded-full text-[10px] font-black',
                                isActive ? 'bg-current/10' : 'bg-gray-200 text-gray-600'
                            )}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Search + saving indicator */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${tab?.label?.toLowerCase()}…`}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {isSavingOrder && (
                    <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                        <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                        Saving order…
                    </div>
                )}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-gray-100 rounded-3xl h-52" />
                    ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((item, index) => {
                        const isDragging = draggedIndex === index
                        const isDragOver = dragOverIndex === index
                        return (
                            <div
                                key={item._id}
                                className={cn(
                                    'group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col',
                                    currentItems.length > 1 && 'cursor-move',
                                    isDragging && 'opacity-50 scale-95',
                                    isDragOver && 'ring-2 ring-purple-500 ring-offset-2 scale-105'
                                )}
                                draggable={currentItems.length > 1}
                                onDragStart={e => handleDragStart(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={e => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, index)}
                            >
                                {/* Drag handle */}
                                {currentItems.length > 1 && (
                                    <div className="absolute top-3 left-3 z-20 p-1.5 bg-gray-800/70 text-white rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical className="h-4 w-4" />
                                    </div>
                                )}

                                {/* Image or placeholder */}
                                <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                    {item.image?.url ? (
                                        <img
                                            src={item.image.url}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none"
                                            draggable={false}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {(() => { const Icon = tab?.icon || Layers; return <Icon className="w-14 h-14 text-gray-300" /> })()}
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={e => { e.stopPropagation(); navigate(`categories/edit/${item._id}`) }}
                                                className="flex-1 bg-white/20 backdrop-blur-md text-white py-2 rounded-xl text-xs font-bold hover:bg-white/40 transition-colors uppercase"
                                            >Edit</button>
                                            <button
                                                onClick={e => { e.stopPropagation(); handleDelete(item._id, item.type) }}
                                                className="bg-red-500/80 backdrop-blur-md text-white p-2 rounded-xl hover:bg-red-600 transition-colors"
                                            ><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    {/* Status badges */}
                                    <div className="absolute top-3 right-3 flex flex-col gap-1">
                                        {!item.isActive && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Hidden</span>
                                        )}
                                        {item.isFeatured && (
                                            <span className="bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">★ Featured</span>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-purple-600 transition-colors uppercase tracking-tight">
                                        {item.name}
                                    </h3>
                                    {item.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-auto pt-2 font-medium">
                                        Position {index + 1} of {filtered.length}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        {(() => { const Icon = tab?.icon || Layers; return <Icon className="w-10 h-10 text-gray-300" /> })()}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No {tab?.label} yet</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                        {tab?.hint ? `Examples: ${tab.hint}` : 'Add your first item to get started.'}
                    </p>
                    <button
                        onClick={() => navigate('categories/add')}
                        className={cn(
                            'mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all',
                            TAB_COLORS[tab?.color || 'purple']
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        Add First {tab?.label?.slice(0, -1)}
                    </button>
                </div>
            )}
        </div>
    )
}
