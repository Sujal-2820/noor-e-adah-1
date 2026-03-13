import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Save, ArrowLeft, AlertCircle, GripVertical, Smartphone, Monitor, Video, Play } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'
import * as adminApi from '../services/adminApi'
import { ImageUpload } from '../components/ImageUpload'
import { OfferMediaUpload } from '../components/OfferMediaUpload'
import { LoadingOverlay } from '../components/LoadingOverlay'

export function OffersPage({ subRoute = null, navigate }) {
  const { success, error: showError, warning } = useToast()
  const [activeTab, setActiveTab] = useState('carousels') // 'carousels' | 'smartphone-carousels' | 'special-offers'
  const [carousels, setCarousels] = useState([])
  const [smartphoneCarousels, setSmartphoneCarousels] = useState([])
  const [specialOffers, setSpecialOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [carouselCount, setCarouselCount] = useState(0)
  const [smartphoneCarouselCount, setSmartphoneCarouselCount] = useState(0)
  const [editingCarousel, setEditingCarousel] = useState(null)
  const [editingSpecialOffer, setEditingSpecialOffer] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [draggedCarouselIndex, setDraggedCarouselIndex] = useState(null)
  const [dragOverCarouselIndex, setDragOverCarouselIndex] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')

  // Form states
  const [carouselForm, setCarouselForm] = useState({
    title: '',
    description: '',
    image: '',
    buttonText: '',
    buttonLink: '',
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
        setSmartphoneCarousels(result.data.offers?.filter(o => o.type === 'smartphone_carousel') || [])
        setSpecialOffers(result.data.offers?.filter(o => o.type === 'special_offer') || [])
        
        // Count active offers per type
        const desktopActive = result.data.offers?.filter(o => o.type === 'carousel' && o.isActive).length || 0
        const smartphoneActive = result.data.offers?.filter(o => o.type === 'smartphone_carousel' && o.isActive).length || 0
        
        setCarouselCount(desktopActive)
        setSmartphoneCarouselCount(smartphoneActive)
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
      if ((parts[0] === 'carousel' || parts[0] === 'smartphone-carousel') && parts[1] === 'edit' && parts[2]) {
        // Find carousel by ID
        const list = parts[0] === 'carousel' ? carousels : smartphoneCarousels
        const carousel = list.find(c => (c._id || c.id) === parts[2])
        if (carousel) {
          setEditingCarousel(carousel)
        } else if (carousels.length > 0 || smartphoneCarousels.length > 0) {
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
      } else if ((parts[0] === 'carousel' || parts[0] === 'smartphone-carousel') && parts[1] === 'add') {
        // Reset when adding new
        setEditingCarousel({ type: parts[0] === 'carousel' ? 'carousel' : 'smartphone_carousel' })
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
  const handleCreateCarousel = (type = 'carousel') => {
    const count = type === 'carousel' ? carouselCount : smartphoneCarouselCount
    if (count >= 6) {
      warning(`Maximum 6 active ${type === 'carousel' ? 'desktop' : 'smartphone'} carousels allowed. Please delete or deactivate an existing one first.`)
      return
    }
    const path = type === 'carousel' ? 'offers/carousel/add' : 'offers/smartphone-carousel/add'
    if (navigate) navigate(path)
  }

  const handleEditCarousel = (carousel) => {
    setEditingCarousel(carousel)
    const typePath = carousel.type === 'carousel' ? 'carousel' : 'smartphone-carousel'
    if (navigate) navigate(`offers/${typePath}/edit/${carousel._id || carousel.id}`)
  }

  const handleSaveCarousel = async (carouselForm) => {
    try {
      if (carouselForm.mediaType === 'image' && !carouselForm.image) {
        showError('Image is required')
        return false
      }
      if (carouselForm.mediaType === 'video' && !carouselForm.video) {
        showError('Video is required')
        return false
      }

      setIsProcessing(true)
      setProcessingMessage(editingCarousel?._id || editingCarousel?.id ? 'Updating Carousel...' : 'Creating Carousel...')

      if (editingCarousel?._id || editingCarousel?.id) {
        const result = await adminApi.updateOffer(editingCarousel._id || editingCarousel.id, {
          ...carouselForm,
          type: editingCarousel.type,
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
          type: editingCarousel?.type || 'carousel',
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
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteCarousel = async (id) => {
    if (!confirm('Are you sure you want to delete this carousel?')) return
    try {
      setIsProcessing(true)
      setProcessingMessage('Deleting Carousel...')
      const result = await adminApi.deleteOffer(id)
      if (result.success) {
        // Optimistic update
        setCarousels(prev => prev.filter(c => (c._id || c.id) !== id))
        setSmartphoneCarousels(prev => prev.filter(c => (c._id || c.id) !== id))
        success('Carousel deleted successfully')
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to delete carousel')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleCarouselActive = async (carousel) => {
    try {
      setIsProcessing(true)
      setProcessingMessage(carousel.isActive ? 'Deactivating...' : 'Activating...')
      const result = await adminApi.updateOffer(carousel._id || carousel.id, {
        isActive: !carousel.isActive,
      })
      if (result.success) {
        success(`Carousel ${carousel.isActive ? 'deactivated' : 'activated'} successfully`)
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to update carousel')
    } finally {
      setIsProcessing(false)
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

    const list = activeTab === 'carousels' ? carousels : smartphoneCarousels
    const updatedCarousels = [...list]
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
    if (draggedCarousel.type === 'carousel') {
      setCarousels(reorderedCarousels)
    } else {
      setSmartphoneCarousels(reorderedCarousels)
    }
    setDraggedCarouselIndex(null)

    // Save new order to backend
    try {
      setIsProcessing(true)
      setProcessingMessage('Saving New Order...')
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
    } finally {
      setIsProcessing(false)
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

      setIsProcessing(true)
      setProcessingMessage(editingSpecialOffer?._id || editingSpecialOffer?.id ? 'Updating Special Offer...' : 'Creating Special Offer...')

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
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteSpecialOffer = async (id) => {
    if (!confirm('Are you sure you want to delete this special offer?')) return
    try {
      setIsProcessing(true)
      setProcessingMessage('Deleting Special Offer...')
      const result = await adminApi.deleteOffer(id)
      if (result.success) {
        // Optimistic update
        setSpecialOffers(prev => prev.filter(o => (o._id || o.id) !== id))
        success('Special offer deleted successfully')
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to delete special offer')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleSpecialOfferActive = async (offer) => {
    try {
      setIsProcessing(true)
      setProcessingMessage(offer.isActive ? 'Deactivating...' : 'Activating...')
      const result = await adminApi.updateOffer(offer._id || offer.id, {
        isActive: !offer.isActive,
      })
      if (result.success) {
        success(`Special offer ${offer.isActive ? 'deactivated' : 'activated'} successfully`)
        fetchOffers()
      }
    } catch (err) {
      showError(err.message || 'Failed to update special offer')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const renderContent = () => {
    // Show full-screen form views based on subRoute
    if (subRoute === 'carousel/add' || (subRoute && subRoute.startsWith('carousel/edit')) || subRoute === 'smartphone-carousel/add' || (subRoute && subRoute.startsWith('smartphone-carousel/edit'))) {
      const isSmartphone = subRoute?.includes('smartphone-carousel')
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
          carouselCount={isSmartphone ? smartphoneCarouselCount : carouselCount}
          isSmartphone={isSmartphone}
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
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'carousels'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Monitor className="h-4 w-4" />
              Desktop Carousels ({carouselCount}/6)
            </button>
            <button
              onClick={() => setActiveTab('smartphone-carousels')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'smartphone-carousels'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Smartphone className="h-4 w-4" />
              Smartphone Carousels ({smartphoneCarouselCount}/6)
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

        {/* Desktop & Smartphone Carousels List */}
        {(activeTab === 'carousels' || activeTab === 'smartphone-carousels') && (
          <div className="space-y-4">
            {activeTab === 'carousels' ? (
              carouselCount >= 6 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Maximum desktop carousels reached</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      You have reached the maximum limit of 6 active desktop carousels.
                    </p>
                  </div>
                </div>
              )
            ) : (
              smartphoneCarouselCount >= 6 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Maximum smartphone carousels reached</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      You have reached the maximum limit of 6 active smartphone carousels.
                    </p>
                  </div>
                </div>
              )
            )}

            <div className="flex justify-end">
              <button
                onClick={() => handleCreateCarousel(activeTab === 'carousels' ? 'carousel' : 'smartphone_carousel')}
                disabled={activeTab === 'carousels' ? carouselCount >= 6 : smartphoneCarouselCount >= 6}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                  (activeTab === 'carousels' ? carouselCount >= 6 : smartphoneCarouselCount >= 6)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Plus className="h-4 w-4" />
                Add {activeTab === 'carousels' ? 'Desktop' : 'Smartphone'} Carousel
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading carousels...</p>
              </div>
            ) : (activeTab === 'carousels' ? carousels : smartphoneCarousels).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No carousels yet</p>
                <p className="text-sm text-gray-500 mt-1 text-center">Create your first carousel to display on the {activeTab === 'carousels' ? 'desktop' : 'smartphone'} view</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4" />
                  Drag to reorder
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(activeTab === 'carousels' ? carousels : smartphoneCarousels)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((carousel, index) => {
                      const isDragging = draggedCarouselIndex === index
                      const isDragOver = dragOverCarouselIndex === index
                      const isVideo = carousel.mediaType === 'video'
                      const mediaSrc = isVideo ? carousel.video : carousel.image

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
                            'border rounded-2xl p-4 space-y-3 cursor-move transition-all flex flex-col',
                            carousel.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-75',
                            isDragging && 'opacity-50 scale-95',
                            isDragOver && 'ring-2 ring-blue-500 ring-offset-2 scale-105'
                          )}
                        >
                          <div className="flex items-start gap-2 flex-grow">
                            <GripVertical className="h-5 w-5 text-gray-300 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <div className={cn(
                                "relative rounded-xl overflow-hidden bg-gray-100 mb-3",
                                carousel.orientation === 'vertical' ? "aspect-[9/16]" : "aspect-video"
                              )}>
                                {isVideo ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Video className="h-8 w-8 text-gray-400" />
                                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded flex items-center gap-1 font-bold">
                                      <Video className="h-3 w-3" /> VIDEO
                                    </div>
                                  </div>
                                ) : (
                                  <img src={mediaSrc} alt={carousel.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-gray-900 truncate flex-1">{carousel.title || 'Untitled Carousel'}</h3>
                                  {isVideo && <Video className="h-3.5 w-3.5 text-blue-500" />}
                                </div>
                                {carousel.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{carousel.description}</p>
                                )}
                                {carousel.buttonText && (
                                  <div className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                    CTA: {carousel.buttonText}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold rounded">
                                    {carousel.orientation === 'vertical' ? 'VERTICAL' : 'HORIZONTAL'}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-medium">
                                    {carousel.productIds?.length || 0} Products Linked
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t">
                            <StatusBadge status={carousel.isActive ? 'active' : 'inactive'} />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleCarouselActive(carousel)
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                                title={carousel.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {carousel.isActive ? (
                                  <ToggleRight className="h-5 w-5 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCarousel(carousel)
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCarousel(carousel._id || carousel.id)
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
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

  return (
    <div className="space-y-6">
      {renderContent()}
      <LoadingOverlay isVisible={isProcessing} message={processingMessage} />
    </div>
  )
}

// Carousel Form Screen Component
function CarouselFormScreen({ editingCarousel, allProducts, productsLoading, onSave, onCancel, carouselCount, isSmartphone }) {
  const [form, setForm] = useState({
    title: editingCarousel?.title || '',
    description: editingCarousel?.description || '',
    image: editingCarousel?.image || '',
    video: editingCarousel?.video || '',
    mediaType: editingCarousel?.mediaType || 'image',
    orientation: editingCarousel?.orientation || (isSmartphone ? 'vertical' : 'horizontal'),
    buttonText: editingCarousel?.buttonText || '',
    buttonLink: editingCarousel?.buttonLink || '',
    productIds: editingCarousel?.productIds?.map(p => p._id || p) || [],
    order: editingCarousel?.order || carouselCount || 0,
    isActive: editingCarousel?.isActive !== false,
  })
  const isEditing = !!(editingCarousel?._id || editingCarousel?.id)

  useEffect(() => {
    if (editingCarousel?._id || editingCarousel?.id) {
      setForm({
        title: editingCarousel.title || '',
        description: editingCarousel.description || '',
        image: editingCarousel.image || '',
        video: editingCarousel.video || '',
        mediaType: editingCarousel.mediaType || 'image',
        orientation: editingCarousel.orientation || (isSmartphone ? 'vertical' : 'horizontal'),
        buttonText: editingCarousel.buttonText || '',
        buttonLink: editingCarousel.buttonLink || '',
        productIds: editingCarousel.productIds?.map(p => p._id || p) || [],
        isActive: editingCarousel.isActive !== false,
      })
    }
  }, [editingCarousel, isSmartphone])


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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Short description for the carousel (Optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">CTA Button Text <span className="text-gray-400 font-normal text-[10px] uppercase ml-1">(Optional)</span></label>
              <input
                type="text"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                placeholder="e.g., Shop Now"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Button Redirect Link <span className="text-gray-400 font-normal text-[10px] uppercase ml-1">(Optional)</span></label>
              <input
                type="text"
                value={form.buttonLink}
                onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
                className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                placeholder="e.g., /category/fashion"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Play className="h-4 w-4 text-indigo-500" /> Media Type
              </label>
              <div className="flex gap-2">
                {['image', 'video'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, mediaType: type })}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all capitalize",
                      form.mediaType === type 
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                        : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-indigo-500" /> Orientation
              </label>
              <div className="flex gap-2">
                {['horizontal', 'vertical'].map(orient => (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => setForm({ ...form, orientation: orient })}
                    disabled={!isSmartphone && orient === 'vertical'}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all capitalize",
                      form.orientation === orient 
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                        : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300",
                      !isSmartphone && orient === 'vertical' && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {orient}
                  </button>
                ))}
              </div>
              {!isSmartphone && (
                <p className="text-[10px] text-gray-400 mt-1 italic font-medium">Vertical orientation is smartphone-exclusive</p>
              )}
            </div>
          </div>

          <div>
            <OfferMediaUpload
              mediaType={form.mediaType}
              url={form.mediaType === 'image' ? form.image : form.video}
              orientation={form.orientation}
              onChange={(url) => {
                if (form.mediaType === 'image') {
                  setForm({ ...form, image: url })
                } else {
                  setForm({ ...form, video: url })
                }
              }}
              disabled={false}
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
          {(form.image || form.video) && (
            <div className="pt-8 border-t border-gray-100 flex flex-col items-center">
              <p className="text-xs font-black text-gray-400 mb-6 uppercase tracking-[0.2em]">Preview: User Interface</p>
              
              <div className={cn(
                "relative rounded-[2.5rem] border-[8px] border-gray-900 overflow-hidden bg-gray-950 shadow-2xl transition-all duration-500",
                form.orientation === 'vertical' ? "w-[280px] aspect-[9/19]" : "w-[400px] aspect-video"
              )}>
                {/* Status Bar for Phone View */}
                {form.orientation === 'vertical' && (
                  <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-6 z-20">
                    <span className="text-[10px] text-white font-bold">9:41</span>
                    <div className="w-16 h-4 bg-black rounded-b-xl" />
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full border border-white/40" />
                      <div className="w-3 h-3 rounded-full bg-white/40" />
                    </div>
                  </div>
                )}

                {form.mediaType === 'video' ? (
                  <video 
                    src={form.video} 
                    autoPlay 
                    muted 
                    loop 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img
                    src={form.image}
                    alt="Carousel preview"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Text overlay preview */}
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 p-8 text-white z-10",
                  form.orientation === 'vertical' ? "pb-12" : "pb-8"
                )}>
                  {form.title && (
                    <h3 className="text-xl font-black mb-2 uppercase tracking-tight leading-tight">
                      {form.title}
                    </h3>
                  )}
                  {form.description && (
                    <p className="text-xs opacity-80 font-medium line-clamp-2 mb-4">
                      {form.description}
                    </p>
                  )}
                  {form.buttonText && (
                    <div className="inline-block px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {form.buttonText}
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-widest">
                Mockup represents {form.orientation} {form.mediaType} carousel
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


