import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, GripVertical, Search, Save, Package, ArrowLeft } from 'lucide-react'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'
import * as adminApi from '../services/adminApi'

export function NewArrivalsManager({ onBack }) {
  const { success, error: showError } = useToast()
  const [products, setProducts] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // Fetch all products and current new arrivals
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsRes, offersRes] = await Promise.all([
        adminApi.getProducts({ limit: 1000, isActive: true }),
        adminApi.getOffers({ type: 'new_arrivals' })
      ])

      if (productsRes.success) {
        setProducts(productsRes.data.products)
      }

      if (offersRes.success && offersRes.data?.offers?.length > 0) {
        const offer = offersRes.data.offers[0]
        const curatedIds = offer.productIds || []
        
        // If they are just IDs, match them with the products list to get full details
        // This ensures names, prices and images are visible for reordering
        const populated = curatedIds.map(item => {
          const id = typeof item === 'string' ? item : (item._id || item.id)
          return productsRes.data.products.find(p => (p._id || p.id) === id) || item
        }).filter(Boolean)

        setNewArrivals(populated)
      }
    } catch (err) {
      showError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddProduct = (product) => {
    if (newArrivals.some(p => (p._id || p.id) === (product._id || product.id))) {
      showError('Product already in New Arrivals')
      return
    }
    setNewArrivals(prev => [...prev, product])
    setSearchQuery('')
  }

  const handleRemoveProduct = (productId) => {
    setNewArrivals(prev => prev.filter(p => (p._id || p.id) !== productId))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const productIds = newArrivals.map(p => p._id || p.id)
      
      // Check if "New Arrivals" offer exists
      const offersRes = await adminApi.getOffers({ type: 'new_arrivals' })
      let result

      if (offersRes.success && offersRes.data?.offers?.length > 0) {
        const existingOffer = offersRes.data.offers[0]
        result = await adminApi.updateOffer(existingOffer._id || existingOffer.id, {
          productIds,
          isActive: true
        })
      } else {
        result = await adminApi.createOffer({
          type: 'new_arrivals',
          title: 'New Arrivals',
          productIds,
          isActive: true
        })
      }

      if (result.success) {
        success('New Arrivals updated successfully')
      } else {
        showError(result.error?.message || 'Failed to update New Arrivals')
      }
    } catch (err) {
      showError('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null)
      return
    }

    const updated = [...newArrivals]
    const item = updated.splice(draggedIndex, 1)[0]
    updated.splice(index, 0, item)
    
    setNewArrivals(updated)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const filteredProducts = searchQuery.trim() 
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <div className="space-y-6 animate-calm-entry">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Arrivals Management</h1>
            <p className="text-sm text-gray-500">Curate and order products for the New Arrivals section</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-brand/20"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selection Area */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-brand" />
              Add Products
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products to add..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              />
            </div>

            <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-8 text-gray-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Type to search active products</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No products found</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <div 
                    key={product.id || product._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand/30 hover:bg-brand/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-50">
                        <img 
                          src={product.images?.[0]?.url || product.image || 'https://via.placeholder.com/40'} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">₹{product.userPrice?.toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddProduct(product)}
                      className="p-2 text-brand hover:bg-brand hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* List Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm overflow-hidden min-h-[400px]">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-gray-400" />
                Current New Arrivals ({newArrivals.length})
              </span>
              <span className="text-xs text-gray-500 font-normal italic">Drag to reorder items</span>
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading New Arrivals...</p>
              </div>
            ) : newArrivals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Package className="h-16 w-16 mb-4 opacity-10" />
                <p>No new arrivals curated yet.</p>
                <p className="text-sm">Search and add products from the left panel.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newArrivals.map((product, index) => (
                  <div
                    key={product.id || product._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-move",
                      draggedIndex === index ? "opacity-30 border-dashed border-brand" : "bg-white border-gray-100 hover:border-brand/30 hover:shadow-md",
                      dragOverIndex === index && "border-t-4 border-t-brand pt-6"
                    )}
                  >
                    <div className="text-gray-300">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <img 
                        src={product.images?.[0]?.url || product.images?.[0] || product.image || 'https://via.placeholder.com/60'} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{product.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                        <span className="text-xs font-bold text-brand">₹{(product.publicPrice || product.userPrice || 0).toLocaleString()}</span>
                        <span className="text-xs text-gray-400 truncate">{product.category?.name || product.category || 'Uncategorized'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(product.id || product._id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Remove from New Arrivals"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
