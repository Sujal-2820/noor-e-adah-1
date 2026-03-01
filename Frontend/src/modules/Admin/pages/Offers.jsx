import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Save, ArrowLeft, AlertCircle, GripVertical } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'
import * as adminApi from '../services/adminApi'
import { ImageUpload } from '../components/ImageUpload'
import { CarouselImageUpload } from '../components/CarouselImageUpload'

export function OffersPage({ subRoute = null, navigate }) {
  const { success, error: showError, warning } = useToast()
  const [activeTab, setActiveTab] = useState('carousels') // 'carousels' | 'special-offers'
  const [carousels, setCarousels] = useState([])
  const [specialOffers, setSpecialOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [carouselCount, setCarouselCount] = useState(0)
  const [editingCarousel, setEditingCarousel] = useState(null)
  const [editingSpecialOffer, setEditingSpecialOffer] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [draggedCarouselIndex, setDraggedCarouselIndex] = useState(null)
  const [dragOverCarouselIndex, setDragOverCarouselIndex] = useState(null)

  // Form states
  const [carouselForm, setCarouselForm] = useState({
    title: '',
    description: '',
    image: '',
    productIds: [],
    order: 0,
    isActive: true,
  })

  const [specialOfferForm, setSpecialOfferForm] = useState({
    title: '',
    description: '',
    specialTag: '',
    specialValue: '',
    linkedProductIds: [],
    isActive: true,
  })

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
      const result = await adminApi.getOffers()
      if (result.success && result.data) {
        setCarousels(result.data.offers?.filter(o => o.type === 'carousel') || [])
        setSpecialOffers(result.data.offers?.filter(o => o.type === 'special_offer') || [])
        setCarouselCount(result.data.carouselCount || 0)
      }
    } catch (err) {
      showError(err.message || 'Failed to load offers')
    } finally {
      setLoading(false)
    }
  }, [showError])

  // Fetch products for selection
  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true)
      const result = await adminApi.getProducts()
      if (result.success && result.data?.products) {
        setAllProducts(result.data.products)
      }
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOffers()
    fetchProducts()
  }, [fetchOffers, fetchProducts])

  // Parse subRoute to determine edit mode
  useEffect(() => {
    if (subRoute) {
      const parts = subRoute.split('/')
      if (parts[0] === 'carousel' && parts[1] === 'edit' && parts[2]) {
        // Find carousel by ID
        const carousel = carousels.find(c => (c._id || c.id) === parts[2])
        if (carousel) {
          setEditingCarousel(carousel)
        } else if (carousels.length > 0) {
          // Carousels loaded but not found - might need to refetch
          fetchOffers()
        }
      } else if (parts[0] === 'special-offer' && parts[1] === 'edit' && parts[2]) {
        // Find special offer by ID
        const offer = specialOffers.find(o => (o._id || o.id) === parts[2])
        if (offer) {
          setEditingSpecialOffer(offer)
        } else if (specialOffers.length > 0) {
          // Offers loaded but not found - might need to refetch
          fetchOffers()
        }
      } else if (parts[0] === 'carousel' && parts[1] === 'add') {
        // Reset when adding new
        setEditingCarousel(null)
      } else if (parts[0] === 'special-offer' && parts[1] === 'add') {
        // Reset when adding new
        setEditingSpecialOffer(null)
      }
    } else {
      // Reset editing states when navigating back
      setEditingCarousel(null)
      setEditingSpecialOffer(null)
    }
  }, [subRoute, carousels, specialOffers, fetchOffers])

  // Carousel handlers
  const handleCreateCarousel = () => {
    if (carouselCount >= 6) {
      warning('Maximum 6 active carousels allowed. Please delete or deactivate an existing carousel first.')
      return
    }
    if (navigate) navigate('offers/carousel/add')
  }

  const handleEditCarousel = (carousel) => {
    setEditingCarousel(carousel)
    if (navigate) navigate(`offers/carousel/edit/${carousel._id || carousel.id}`)
  }

  const handleSaveCarousel = async (carouselForm) => {
    try {
      // Title is optional for carousels
      if (!carouselForm.image) {
        showError('Image is required for carousel')
        return false
      }
      // Products are optional for carousels

      if (editingCarousel) {
        const result = await adminApi.updateOffer(editingCarousel._id || editingCarousel.id, {
          ...carouselForm,
          type: 'carousel',
        })
        if (result.success) {
          success('Carousel updated successfully')
          setEditingCarousel(null)
          fetchOffers()
          if (navigate) navigate('offers')
          return true
        }
      } else {
        const result = await adminApi.createOffer({
          ...carouselForm,
          type: 'carousel',
        })
        if (result.success) {
          success('Carousel created successfully')
          fetchOffers()
          if (navigate) navigate('offers')
          return true
        }
      }
      return false
    } catch (err) {
      showError(err.message || 'Failed to save carousel')
      return false
    }
  }

  const handleDeleteCarousel = async (id) => {
    if (!confirm('Are you sure you want to delete this carousel?')) return
    try {
      const result = await adminApi.deleteOffer(id)
      if (result.success) {
        success('Carousel deleted successfully')
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to delete carousel')
    }
  }

  const handleToggleCarouselActive = async (carousel) => {
    try {
      const result = await adminApi.updateOffer(carousel._id || carousel.id, {
        isActive: !carousel.isActive,
      })
      if (result.success) {
        success(`Carousel ${carousel.isActive ? 'deactivated' : 'activated'} successfully`)
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to update carousel')
    }
  }

  // Drag and drop handlers for carousel reordering
  const handleCarouselDragStart = (e, index) => {
    setDraggedCarouselIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleCarouselDragEnd = (e) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedCarouselIndex(null)
    setDragOverCarouselIndex(null)
  }

  const handleCarouselDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedCarouselIndex !== null && draggedCarouselIndex !== index) {
      setDragOverCarouselIndex(index)
    }
  }

  const handleCarouselDragLeave = () => {
    setDragOverCarouselIndex(null)
  }

  const handleCarouselDrop = async (e, dropIndex) => {
    e.preventDefault()
    setDragOverCarouselIndex(null)

    if (draggedCarouselIndex === null || draggedCarouselIndex === dropIndex) {
      return
    }

    const updatedCarousels = [...carousels]
    const draggedCarousel = updatedCarousels[draggedCarouselIndex]

    // Remove dragged carousel from its position
    updatedCarousels.splice(draggedCarouselIndex, 1)

    // Insert at new position
    updatedCarousels.splice(dropIndex, 0, draggedCarousel)

    // Update order values based on new positions
    const reorderedCarousels = updatedCarousels.map((carousel, idx) => ({
      ...carousel,
      order: idx,
    }))

    // Optimistically update UI
    setCarousels(reorderedCarousels)
    setDraggedCarouselIndex(null)

    // Save new order to backend
    try {
      // Update all carousels with new order
      const updatePromises = reorderedCarousels.map((carousel, idx) =>
        adminApi.updateOffer(carousel._id || carousel.id, { order: idx })
      )
      await Promise.all(updatePromises)
      success('Carousel order updated successfully')
      // Refetch to ensure sync
      fetchOffers()
    } catch (err) {
      showError(err.message || 'Failed to update carousel order')
      // Revert on error
      fetchOffers()
    }
  }

  // Special offer handlers
  const handleCreateSpecialOffer = () => {
    if (navigate) navigate('offers/special-offer/add')
  }

  const handleEditSpecialOffer = (offer) => {
    setEditingSpecialOffer(offer)
    if (navigate) navigate(`offers/special-offer/edit/${offer._id || offer.id}`)
  }

  const handleSaveSpecialOffer = async (specialOfferForm) => {
    try {
      if (!specialOfferForm.title.trim()) {
        showError('Title is required')
        return false
      }
      if (!specialOfferForm.specialTag.trim()) {
        showError('Special tag is required')
        return false
      }
      if (!specialOfferForm.specialValue.trim()) {
        showError('Special value is required')
        return false
      }

      if (editingSpecialOffer) {
        const result = await adminApi.updateOffer(editingSpecialOffer._id || editingSpecialOffer.id, {
          ...specialOfferForm,
          type: 'special_offer',
        })
        if (result.success) {
          success('Special offer updated successfully')
          setEditingSpecialOffer(null)
          fetchOffers()
          if (navigate) navigate('offers')
          return true
        }
      } else {
        const result = await adminApi.createOffer({
          ...specialOfferForm,
          type: 'special_offer',
        })
        if (result.success) {
          success('Special offer created successfully')
          fetchOffers()
          if (navigate) navigate('offers')
          return true
        }
      }
      return false
    } catch (err) {
      showError(err.message || 'Failed to save special offer')
      return false
    }
  }

  const handleDeleteSpecialOffer = async (id) => {
    if (!confirm('Are you sure you want to delete this special offer?')) return
    try {
      const result = await adminApi.deleteOffer(id)
      if (result.success) {
        success('Special offer deleted successfully')
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to delete special offer')
    }
  }

  const handleToggleSpecialOfferActive = async (offer) => {
    try {
      const result = await adminApi.updateOffer(offer._id || offer.id, {
        isActive: !offer.isActive,
      })
      if (result.success) {
        success(`Special offer ${offer.isActive ? 'deactivated' : 'activated'} successfully`)
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to update special offer')
    }
  }

  // Show full-screen form views based on subRoute
  if (subRoute === 'carousel/add' || (subRoute && subRoute.startsWith('carousel/edit'))) {
    return (
      <CarouselFormScreen
        editingCarousel={editingCarousel}
        allProducts={allProducts}
        productsLoading={productsLoading}
        onSave={handleSaveCarousel}
        onCancel={() => {
          setEditingCarousel(null)
          if (navigate) navigate('offers')
        }}
        carouselCount={carouselCount}
      />
    )
  }

  if (subRoute === 'special-offer/add' || (subRoute && subRoute.startsWith('special-offer/edit'))) {
    return (
      <SpecialOfferFormScreen
        editingSpecialOffer={editingSpecialOffer}
        allProducts={allProducts}
        productsLoading={productsLoading}
        onSave={handleSaveSpecialOffer}
        onCancel={() => {
          setEditingSpecialOffer(null)
          if (navigate) navigate('offers')
        }}
      />
    )
  }

  // Show list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offers Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage carousels and special offers for user dashboard</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('carousels')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'carousels'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Carousels ({carouselCount}/6)
          </button>
          <button
            onClick={() => setActiveTab('special-offers')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'special-offers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Special Offers ({specialOffers.length})
          </button>
        </nav>
      </div>

      {/* Carousels Tab */}
      {activeTab === 'carousels' && (
        <div className="space-y-4">
          {carouselCount >= 6 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Maximum carousels reached</p>
                <p className="text-sm text-yellow-700 mt-1">
                  You have reached the maximum limit of 6 active carousels. Delete or deactivate an existing carousel to add a new one.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleCreateCarousel}
              disabled={carouselCount >= 6}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                carouselCount >= 6
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              <Plus className="h-4 w-4" />
              Add Carousel
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading carousels...</p>
            </div>
          ) : carousels.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No carousels yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first carousel to display on the user dashboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                <GripVertical className="h-4 w-4" />
                Drag carousels to reorder them (top carousel appears first on user dashboard)
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {carousels
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((carousel, index) => {
                    const isDragging = draggedCarouselIndex === index
                    const isDragOver = dragOverCarouselIndex === index
                    return (
                      <div
                        key={carousel._id || carousel.id}
                        draggable
                        onDragStart={(e) => handleCarouselDragStart(e, index)}
                        onDragEnd={handleCarouselDragEnd}
                        onDragOver={(e) => handleCarouselDragOver(e, index)}
                        onDragLeave={handleCarouselDragLeave}
                        onDrop={(e) => handleCarouselDrop(e, index)}
                        className={cn(
                          'border rounded-lg p-4 space-y-3 cursor-move transition-all',
                          carousel.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-75',
                          isDragging && 'opacity-50 scale-95',
                          isDragOver && 'ring-2 ring-blue-500 ring-offset-2 scale-105'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            {carousel.image && (
                              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                                <img src={carousel.image} alt={carousel.title} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900">{carousel.title}</h3>
                              {carousel.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{carousel.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                {carousel.productIds?.length || 0} product{carousel.productIds?.length !== 1 ? 's' : ''} linked
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <StatusBadge status={carousel.isActive ? 'active' : 'inactive'} />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleCarouselActive(carousel)
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title={carousel.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {carousel.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditCarousel(carousel)
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCarousel(carousel._id || carousel.id)
                              }}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Special Offers Tab */}
      {activeTab === 'special-offers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleCreateSpecialOffer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Special Offer
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading special offers...</p>
            </div>
          ) : specialOffers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No special offers yet</p>
              <p className="text-sm text-gray-500 mt-1">Create special offers to display on the user dashboard</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialOffers.map((offer) => (
                <div
                  key={offer._id || offer.id}
                  className={cn(
                    'border rounded-lg p-4 space-y-3',
                    offer.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-75'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {offer.specialTag}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          {offer.specialValue}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{offer.title}</h3>
                      {offer.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{offer.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <StatusBadge status={offer.isActive ? 'active' : 'inactive'} />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSpecialOfferActive(offer)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title={offer.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {offer.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditSpecialOffer(offer)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteSpecialOffer(offer._id || offer.id)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// Carousel Form Screen Component
function CarouselFormScreen({ editingCarousel, allProducts, productsLoading, onSave, onCancel, carouselCount }) {
  const [form, setForm] = useState({
    title: editingCarousel?.title || '',
    description: editingCarousel?.description || '',
    image: editingCarousel?.image || '',
    productIds: editingCarousel?.productIds?.map(p => p._id || p) || [],
    order: editingCarousel?.order || carouselCount || 0,
    isActive: editingCarousel?.isActive !== false,
  })
  const [imageUrl, setImageUrl] = useState(form.image || '')
  const isEditing = !!editingCarousel

  useEffect(() => {
    if (editingCarousel) {
      setForm({
        title: editingCarousel.title || '',
        description: editingCarousel.description || '',
        image: editingCarousel.image || '',
        productIds: editingCarousel.productIds?.map(p => p._id || p) || [],
        isActive: editingCarousel.isActive !== false,
      })
      setImageUrl(editingCarousel.image || '')
    }
  }, [editingCarousel])


  const handleProductToggle = (productId) => {
    const currentIds = form.productIds || []
    if (currentIds.includes(productId)) {
      setForm({ ...form, productIds: currentIds.filter(id => id !== productId) })
    } else {
      setForm({ ...form, productIds: [...currentIds, productId] })
    }
  }

  const handleSave = async () => {
    const success = await onSave(form)
    if (success) {
      // Navigation handled in onSave
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Offers
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Offers Management</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Carousel' : 'Add New Carousel'}
          </h2>
          <p className="text-sm text-gray-600">
            {isEditing
              ? 'Update carousel details, image, and linked products.'
              : 'Create a new carousel with image and linked products for the user dashboard.'}
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Seasonal Sale"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Short description for the carousel"
            />
          </div>

          <div>
            <CarouselImageUpload
              image={imageUrl}
              onChange={(url) => {
                setImageUrl(url)
                setForm({ ...form, image: url })
              }}
              disabled={false}
              title={form.title}
              description={form.description}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Products <span className="text-gray-400 font-normal">(Optional)</span></label>
            <p className="text-xs text-gray-500 mb-2">Select products to showcase when users click this carousel (leave empty for image-only carousel)</p>
            {productsLoading ? (
              <p className="text-sm text-gray-500">Loading products...</p>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto p-2">
                {allProducts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No products available</p>
                ) : (
                  <div className="space-y-2">
                    {allProducts.map((product) => (
                      <label
                        key={product._id || product.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.productIds?.includes(product._id || product.id)}
                          onChange={() => handleProductToggle(product._id || product.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">₹{product.priceToUser || product.price || 0}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {form.productIds && form.productIds.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">{form.productIds.length} product(s) selected</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="carousel-active"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="carousel-active" className="text-sm text-gray-700">
              Active (visible on user dashboard)
            </label>
          </div>

          {/* Preview Container - Placed here before buttons */}
          {imageUrl && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Preview: How it will appear on user dashboard</p>
              <div className="relative rounded-xl border-2 border-gray-300 overflow-hidden bg-gray-50 mx-auto" style={{
                width: '380px',
                maxWidth: '100%',
                height: '200px'
              }}>
                <img
                  src={imageUrl}
                  alt="Carousel preview"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center' }}
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {/* Text overlay preview */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
                  <h3 className="text-lg font-bold mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    {form.title || 'Carousel Title'}
                  </h3>
                  {form.description && (
                    <p className="text-sm opacity-95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                      {form.description}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Actual carousel dimensions: 380px × 200px (matches user dashboard)
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Update' : 'Create'} Carousel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Special Offer Form Screen Component
function SpecialOfferFormScreen({ editingSpecialOffer, allProducts, productsLoading, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: editingSpecialOffer?.title || '',
    description: editingSpecialOffer?.description || '',
    specialTag: editingSpecialOffer?.specialTag || '',
    specialValue: editingSpecialOffer?.specialValue || '',
    linkedProductIds: editingSpecialOffer?.linkedProductIds?.map(p => p._id || p) || [],
    isActive: editingSpecialOffer?.isActive !== false,
  })
  const isEditing = !!editingSpecialOffer

  useEffect(() => {
    if (editingSpecialOffer) {
      setForm({
        title: editingSpecialOffer.title || '',
        description: editingSpecialOffer.description || '',
        specialTag: editingSpecialOffer.specialTag || '',
        specialValue: editingSpecialOffer.specialValue || '',
        linkedProductIds: editingSpecialOffer.linkedProductIds?.map(p => p._id || p) || [],
        isActive: editingSpecialOffer.isActive !== false,
      })
    }
  }, [editingSpecialOffer])

  const handleProductToggle = (productId) => {
    const currentIds = form.linkedProductIds || []
    if (currentIds.includes(productId)) {
      setForm({ ...form, linkedProductIds: currentIds.filter(id => id !== productId) })
    } else {
      setForm({ ...form, linkedProductIds: [...currentIds, productId] })
    }
  }

  const handleSave = async () => {
    const success = await onSave(form)
    if (success) {
      // Navigation handled in onSave
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Offers
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Offers Management</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Special Offer' : 'Add New Special Offer'}
          </h2>
          <p className="text-sm text-gray-600">
            {isEditing
              ? 'Update special offer details, tags, and linked products.'
              : 'Create a new special offer card for the user dashboard.'}
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Seasonal Discount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Short description for the offer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Tag *</label>
              <input
                type="text"
                value={form.specialTag}
                onChange={(e) => setForm({ ...form, specialTag: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., SPECIAL OFFER, NEW ARRIVAL"
              />
              <p className="text-xs text-gray-500 mt-1">Displayed as badge</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Value *</label>
              <input
                type="text"
                value={form.specialValue}
                onChange={(e) => setForm({ ...form, specialValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 30% OFF, FREE, NEW"
              />
              <p className="text-xs text-gray-500 mt-1">Displayed as value</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Products (Optional)</label>
            <p className="text-xs text-gray-500 mb-2">Optionally link products to this offer</p>
            {productsLoading ? (
              <p className="text-sm text-gray-500">Loading products...</p>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto p-2">
                {allProducts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No products available</p>
                ) : (
                  <div className="space-y-2">
                    {allProducts.map((product) => (
                      <label
                        key={product._id || product.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.linkedProductIds?.includes(product._id || product.id)}
                          onChange={() => handleProductToggle(product._id || product.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">₹{product.priceToUser || product.price || 0}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {form.linkedProductIds && form.linkedProductIds.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">{form.linkedProductIds.length} product(s) selected</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="special-offer-active"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="special-offer-active" className="text-sm text-gray-700">
              Active (visible on user dashboard)
            </label>
          </div>

          {/* Preview Container - Placed here before buttons */}
          {(form.title || form.specialTag || form.specialValue) && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Preview: How it will appear on user dashboard</p>
              <div className="max-w-md mx-auto">
                <div className="home-deal-card" style={{
                  padding: '1.25rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(34, 94, 65, 0.16)',
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(241, 244, 236, 0.9))',
                  boxShadow: '0 18px 38px -28px rgba(13, 38, 24, 0.35)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {form.specialTag && (
                    <div className="home-deal-card__badge" style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(43, 118, 79, 0.2), rgba(43, 118, 79, 0.1))',
                      color: '#1b8f5b',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: '1px solid rgba(43, 118, 79, 0.2)',
                    }}>
                      {form.specialTag}
                    </div>
                  )}
                  <div className="home-deal-card__content" style={{ marginBottom: '0.75rem' }}>
                    {form.title && (
                      <h4 className="home-deal-card__title" style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#172022',
                        margin: '0 0 0.5rem 0',
                        lineHeight: '1.3',
                      }}>
                        {form.title}
                      </h4>
                    )}
                    {form.description && (
                      <p className="home-deal-card__description" style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'rgba(26, 42, 34, 0.65)',
                        margin: '0.5rem 0 0 0',
                        lineHeight: '1.4',
                      }}>
                        {form.description}
                      </p>
                    )}
                    {form.specialValue && (
                      <div className="home-deal-card__price" style={{ marginTop: '0.75rem' }}>
                        <span className="home-deal-card__price-current" style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#1b8f5b',
                        }}>
                          {form.specialValue}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Preview shows how the special offer card will appear on the user dashboard
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Update' : 'Create'} Special Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


