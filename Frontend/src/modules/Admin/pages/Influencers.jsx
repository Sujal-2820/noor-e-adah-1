import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Users, Instagram, Search, GripVertical } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import InfluencerForm from '../components/InfluencerForm'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { cn } from '../../../lib/cn'

export function InfluencersPage({ subRoute, navigate }) {
    const [influencers, setInfluencers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingMessage, setProcessingMessage] = useState('')

    const api = useAdminApi()
    const toast = useToast()

    const fetchAll = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminInfluencers()
            if (response.success) {
                setInfluencers(response.data || [])
            }
        } catch {
            toast.error('Failed to load influencers')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this influencer?')) return
        try {
            setIsProcessing(true)
            setProcessingMessage('Deleting Influencer...')
            const response = await api.deleteInfluencer(id)
            if (response.success) {
                setInfluencers(prev => prev.filter(item => item._id !== id))
                toast.success('Deleted successfully')
            } else {
                toast.error(response.message || 'Failed to delete')
            }
        } catch (err) {
            toast.error(err.message || 'Failed to delete')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDragStart = (e, index) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
    }
    const handleDragEnd = () => {
        setDraggedIndex(null)
        setDragOverIndex(null)
    }
    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index)
    }
    const handleDrop = async (e, dropIndex) => {
        e.preventDefault()
        setDragOverIndex(null)
        if (draggedIndex === null || draggedIndex === dropIndex) return

        const updated = [...influencers]
        const dragged = updated[draggedIndex]
        updated.splice(draggedIndex, 1)
        updated.splice(dropIndex, 0, dragged)

        const reordered = updated.map((item, idx) => ({ ...item, order: idx }))
        setInfluencers(reordered)
        setDraggedIndex(null)

        setIsSavingOrder(true)
        try {
            const orderUpdates = reordered.map(item => ({ id: item._id, order: item.order }))
            const response = await api.reorderInfluencers(orderUpdates)
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

    const filtered = influencers.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (subRoute === 'add' || (subRoute && subRoute.startsWith('edit/'))) {
        const itemId = subRoute.startsWith('edit/') ? subRoute.split('/')[1] : null
        return (
            <InfluencerForm
                influencerId={itemId}
                onCancel={() => navigate('influencers')}
                onSuccess={() => { fetchAll(); navigate('influencers') }}
            />
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-purple-600" />
                        Influencer Community
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium italic">
                        Manage influencers shown on the homepage.
                    </p>
                </div>
                <button
                    onClick={() => navigate('influencers/add')}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-white bg-purple-600 hover:bg-purple-700"
                >
                    <Plus className="w-5 h-5" />
                    ADD INFLUENCER
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search influencers..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {isSavingOrder && (
                    <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                        <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                        Saving order...
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-100 rounded-3xl h-64" />)}
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((item, index) => (
                        <div
                            key={item._id}
                            className={cn(
                                'group relative bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col',
                                draggedIndex === index && 'opacity-50 scale-95',
                                dragOverIndex === index && 'ring-2 ring-purple-500 ring-offset-2 scale-105'
                            )}
                            draggable
                            onDragStart={e => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={e => handleDragOver(e, index)}
                            onDrop={e => handleDrop(e, index)}
                        >
                            <div className="absolute top-3 left-3 z-20 p-1.5 bg-gray-800/70 text-white rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
                                {item.image?.url ? (
                                    <img src={item.image.url} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Users className="w-12 h-12" /></div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button onClick={() => navigate(`influencers/edit/${item._id}`)} className="p-2 bg-white text-gray-900 rounded-full hover:bg-purple-600 hover:text-white transition-all"><Edit2 className="w-5 h-5" /></button>
                                    <button onClick={() => handleDelete(item._id)} className="p-2 bg-white text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                                <a href={item.instagramLink} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 flex items-center gap-1 mt-1 hover:underline">
                                    <Instagram className="w-3 h-3" /> Instagram
                                </a>
                                {!item.isActive && <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">Hidden</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No influencers found</h3>
                    <p className="text-sm text-gray-500 mt-2">Add influencers to showcase them on the website.</p>
                </div>
            )}
            <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
        </div>
    )
}
