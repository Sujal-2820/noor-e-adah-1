import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout, Container, Section } from '../components/Layout'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import * as websiteApi from '../services/websiteApi'
import { getAllImageUrls, getPrimaryImageUrl, getImageUrlAt } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { favourites, authenticated } = useWebsiteState()
  const { addToCart, addToFavourites, removeFromFavourites } = useWebsiteApi()

  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [activeTab, setActiveTab] = useState('DESCRIPTION')
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const containerRef = useRef(null)

  // Fetch product details and related products
  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return
      setLoading(true)
      try {
        const result = await websiteApi.getProductDetails(productId)
        if (result.success && result.data?.product) {
          const productData = result.data.product
          setProduct(productData)
          setIsWishlisted(productData.isWishlisted || favourites.includes(productId))

          // Set default selected image
          setSelectedImage(0)
          setQuantity(1)
          setSelectedSize(null)

          // Scroll to top
          window.scrollTo(0, 0)

          // Fetch related products (explicitly linked by admin, or same-category fallback)
          const explicitlyLinked = (productData.relatedProducts || [])
            .filter(p => p && p.name) // filter out any deleted/stub products

          if (explicitlyLinked.length > 0) {
            setSimilarProducts(explicitlyLinked.slice(0, 4))
          } else {
            // Fallback: fetch products from the same category
            // Ensure categoryId is always a plain string (Mongoose ObjectId has .toString())
            const rawCategory = productData.category?._id || productData.category
            const categoryId = rawCategory ? String(rawCategory) : null
            if (categoryId) {
              try {
                const similarResult = await websiteApi.getProducts({
                  category: categoryId,
                  limit: 5,
                })
                if (similarResult.success && similarResult.data?.products) {
                  const similar = similarResult.data.products
                    .filter((p) => (p._id || p.id) !== productId && p.name)
                    .slice(0, 4)
                  setSimilarProducts(similar)
                }
              } catch {
                // Non-critical — silently ignore if fallback fetch fails
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading product:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId, favourites])

  const images = useMemo(() => {
    if (!product) return []
    const allImages = getAllImageUrls(product)
    return allImages.length > 0 ? allImages : ['https://via.placeholder.com/800x1200?text=No+Image']
  }, [product])

  const navTabs = useMemo(() => {
    const reviewCount = product?.reviews?.length || 0;
    return ['DESCRIPTION', 'ADDITIONAL INFORMATION', `REVIEWS (${reviewCount})`, 'SHIPPING & DELIVERY', 'FAQS'];
  }, [product?.reviews?.length]);

  const currentPrice = useMemo(() => {
    if (!product) return 0
    if (selectedSize && product.sizes) {
      const sizeData = product.sizes.find(s => s.label === selectedSize)
      if (sizeData && (sizeData.publicPrice || sizeData.price)) {
        return sizeData.publicPrice || sizeData.price
      }
    }
    return product?.priceToUser || product?.publicPrice || product?.price || 0
  }, [selectedSize, product])

  // Effective discount: per-size discountPublic → global discountPublic → 0
  const currentDiscount = useMemo(() => {
    if (!product) return 0
    if (selectedSize && product.sizes) {
      const sizeData = product.sizes.find(s => s.label === selectedSize)
      if (sizeData?.discountPublic > 0) return sizeData.discountPublic
    }
    return product?.discountPublic || 0
  }, [selectedSize, product])

  // Effective stock: selected size displayStock, or floor(average of all sizes)
  const currentStock = useMemo(() => {
    if (!product?.sizes || product.sizes.length === 0) return product?.displayStock || product?.stock || 0
    if (selectedSize) {
      const sizeData = product.sizes.find(s => s.label === selectedSize)
      return sizeData?.displayStock ?? 0
    }
    // Average of all sizes, rounded down to whole number
    const total = product.sizes.reduce((sum, s) => sum + (s.displayStock || 0), 0)
    return Math.floor(total / product.sizes.length)
  }, [selectedSize, product])

  const discount = currentDiscount > 0 ? Math.round(currentDiscount) : 0
  const discountedPrice = discount > 0 ? Math.round(currentPrice * (1 - discount / 100)) : currentPrice

  const handleToggleWishlist = async () => {
    if (!authenticated) {
      navigate('/login')
      return
    }

    try {
      if (isWishlisted) {
        await removeFromFavourites(productId)
        dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
        setIsWishlisted(false)
      } else {
        await addToFavourites(productId)
        dispatch({ type: 'ADD_TO_FAVOURITES', payload: { productId } })
        setIsWishlisted(true)
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error)
    }
  }

  const handleAddToCart = async () => {
    if (!authenticated) { navigate('/login'); return }
    if (!selectedSize) {
      alert('Please select a size')
      return
    }

    setIsAdding(true)
    try {
      await addToCart(productId, quantity, { Size: selectedSize })
      // Brief feedback could go here
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!product) {
    return (
      <Layout>
        <Section>
          <Container className="text-center py-20">
            <h1 className="text-3xl font-serif mb-6">Product Not Found</h1>
            <Link to="/products" className="text-accent hover:underline tracking-widest uppercase text-sm font-bold">
              Back to Shop
            </Link>
          </Container>
        </Section>
      </Layout>
    )
  }

  return (
    <Layout>
      <Section className="pt-32 pb-20">
        <Container>
          {/* Breadcrumbs & Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
            <nav className="flex items-center gap-3 text-[9px] sm:text-[11px] tracking-[0.08em] uppercase text-muted-foreground/50 font-semibold">
              <Link to="/" className="hover:text-brand transition-colors">Home</Link>
              <span>/</span>
              {product.category && (
                <>
                  <Link to={`/products?category=${product.category._id || product.category}`} className="hover:text-brand transition-colors">
                    {product.category.name || 'Category'}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-brand truncate max-w-[200px]">{product.name}</span>
            </nav>
            <div className="flex items-center gap-6">
              <button className="text-brand/40 hover:text-brand transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="1.5" /></svg>
              </button>
              <div className="w-[1px] h-4 bg-muted/20" />
              <button className="text-brand/40 hover:text-brand transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="1.5" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
            {/* Left Column: Image Gallery */}
            <div className="space-y-6">
              <div className="relative aspect-[3/4] bg-surface-muted overflow-hidden group/main">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover/main:scale-105"
                />

                {/* Navigation Arrows on main image */}
                <button
                  onClick={() => setSelectedImage(prev => (prev - 1 + images.length) % images.length)}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/80 backdrop-blur-sm opacity-0 group-hover/main:opacity-100 transition-all hover:bg-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" /></svg>
                </button>
                <button
                  onClick={() => setSelectedImage(prev => (prev + 1) % images.length)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/80 backdrop-blur-sm opacity-0 group-hover/main:opacity-100 transition-all hover:bg-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" /></svg>
                </button>

                <div className="absolute top-6 left-6 p-3 bg-white/80 backdrop-blur-sm shadow-premium cursor-pointer hover:bg-white transition-all">
                  <svg className="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                </div>
              </div>

              {/* Thumbnail List */}
              <div className="grid grid-cols-4 gap-4">
                {images.slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "aspect-square overflow-hidden bg-surface-muted transition-all duration-300 border border-brand/60",
                      selectedImage === idx ? "border-brand opacity-100 ring-offset-2 scale-[1.02]" : "opacity-60 hover:opacity-100 hover:border-brand"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Product Info */}
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-[0.04em] text-brand uppercase mb-6 leading-tight">
                {product.name}
              </h1>

              {/* Price Block */}
              <div className="mb-10">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-2xl lg:text-3xl font-bold tracking-[0.02em] text-brand transition-all duration-500 animate-fade-in"
                      key={discountedPrice}
                    >
                      ₹{discountedPrice.toLocaleString('en-IN')}
                    </span>
                    {discount > 0 && (
                      <>
                        <span className="text-sm lg:text-base font-medium text-brand/35 line-through">
                          ₹{currentPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] lg:text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-[0.05em] mt-1">
                    Inclusive of all taxes
                  </span>
                  {/* Stock indicator — only shown if admin enabled showStock */}
                  {product.showStock && (
                    currentStock > 0
                      ? currentStock < 10
                        ? <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-600 animate-fade-in">
                          Only {currentStock} left!
                        </span>
                        : null
                      : selectedSize
                        ? <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-red-500">Out of Stock</span>
                        : null
                  )}
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-6 mb-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs lg:text-[14px] font-bold tracking-[0.07em] uppercase text-brand">Size:</span>
                    <span className="text-xs lg:text-[14px] font-medium text-brand/60 uppercase tracking-[0.04em]">{selectedSize || 'Choose Option'}</span>
                  </div>
                  <button
                    onClick={() => setIsSizeChartOpen(true)}
                    className="text-[10px] lg:text-[13px] font-bold tracking-[0.06em] uppercase text-brand/50 hover:text-accent border-b border-brand/10 hover:border-accent transition-all pb-0.5"
                  >
                    Size chart
                  </button>
                </div>

                <div className="flex flex-wrap gap-4">
                  {product.sizes && product.sizes.length > 0 ? (
                    product.sizes.map((size) => {
                      const outOfStock = !size.isAvailable || (size.displayStock !== undefined && size.displayStock === 0)
                      return (
                        <button
                          key={size.label}
                          onClick={() => !outOfStock && setSelectedSize(size.label)}
                          disabled={outOfStock}
                          title={outOfStock ? 'Out of stock' : size.label}
                          className={cn(
                            "w-12 h-8 sm:w-14 sm:h-9 flex items-center justify-center text-[10px] sm:text-xs font-bold tracking-[0.06em] border transition-all duration-300 relative",
                            outOfStock
                              ? "border-brand/20 text-brand/20 cursor-not-allowed bg-white"
                              : selectedSize === size.label
                                ? "bg-brand text-white border-brand shadow-premium"
                                : "bg-white border-brand/60 text-brand/60 hover:border-brand hover:bg-muted/5"
                          )}
                        >
                          {size.label}
                          {outOfStock && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="w-full h-[1px] bg-brand/20 rotate-45 absolute" />
                            </span>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-[11px] text-brand/30 italic font-medium">No sizes available for this product.</p>
                  )}
                </div>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex items-stretch gap-4 mb-10">
                <div className="flex items-center bg-white border border-brand/80 px-3 py-1">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center text-brand/40 hover:text-brand hover:bg-muted/5 transition-all text-lg"
                  >
                    −
                  </button>
                  <div className="w-[1px] h-6 bg-brand/20 mx-1" />
                  <input
                    type="number"
                    value={quantity}
                    readOnly
                    className="w-12 bg-transparent text-center text-xs font-bold border-none outline-none text-brand"
                  />
                  <div className="w-[1px] h-6 bg-brand/20 mx-1" />
                  <button
                    onClick={() => setQuantity(prev => prev + 1)}
                    className="w-10 h-10 flex items-center justify-center text-brand/40 hover:text-brand hover:bg-muted/5 transition-all text-lg"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 bg-brand text-white text-[11px] sm:text-xs font-bold tracking-[0.1em] uppercase hover:bg-accent transition-all duration-500 shadow-premium disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add to Bag'}
                </button>
              </div>

              {/* Wishlist */}
              <button
                onClick={handleToggleWishlist}
                className="flex items-center gap-3 text-[11px] sm:text-xs font-bold tracking-[0.07em] uppercase text-brand hover:text-accent transition-colors mb-12 group/wish"
              >
                <svg
                  className={cn("w-4 h-4 transition-transform group-hover/wish:scale-110", isWishlisted && "fill-accent text-accent")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="1.5" />
                </svg>
                {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </button>

              {/* Metadata */}
              <div className="pt-12 border-t border-muted/10 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] lg:text-[11px] font-semibold text-brand/30 uppercase tracking-[0.15em] w-24">SKU :</span>
                  <span className="text-[10px] lg:text-[11px] font-semibold text-brand/60 uppercase tracking-[0.1em]">{product.sku || "N/A"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] lg:text-[11px] font-semibold text-brand/30 uppercase tracking-[0.15em] w-24">Category :</span>
                  <span className="text-[10px] lg:text-[11px] font-semibold text-brand/60 uppercase tracking-[0.1em] hover:text-accent transition-colors cursor-pointer">
                    {product.category?.name || "Ready to wear"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] lg:text-[11px] font-semibold text-brand/30 uppercase tracking-[0.15em] w-24">Share :</span>
                  <div className="flex gap-4 items-center">
                    {['facebook', 'twitter', 'pinterest'].map(social => (
                      <button key={social} className="text-brand/40 hover:text-accent transition-colors">
                        <i className={`fab fa-${social} text-xs`}></i>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="mt-32">
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 border-b border-brand/60 mb-16 px-6 sm:px-12 lg:px-24">
              {navTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative pb-6 text-[11px] lg:text-[13px] font-bold tracking-[0.07em] uppercase transition-all duration-300",
                    activeTab === tab ? "text-brand" : "text-brand/40 hover:text-brand"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-brand animate-fade-in" />
                  )}
                </button>
              ))}
            </div>

            <div className="max-w-7xl mx-auto px-6 text-center lg:text-left animate-calm-entry">
              {activeTab === 'DESCRIPTION' && (
                <div className="space-y-8">
                  {!product.longDescription ? (
                    <div
                      className="text-[13px] lg:text-[17px] text-brand/80 leading-[2] font-medium prose prose-sm lg:prose-base max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: product.description || "Collection piece designed for premium comfort and timeless elegance. Crafted from finest materials with attention to every detail."
                      }}
                    />
                  ) : (
                    <div className="prose prose-sm lg:prose-base max-w-none text-brand/70 leading-[1.8]">
                      <div dangerouslySetInnerHTML={{ __html: product.longDescription }} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ADDITIONAL INFORMATION' && (
                <div className="space-y-8 animate-calm-entry">
                  {product.additionalInformation ? (
                    <div
                      className="text-[13px] lg:text-[17px] text-brand/80 leading-[2] font-medium prose prose-sm lg:prose-base max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.additionalInformation }}
                    />
                  ) : (
                    <div className="text-center py-20 bg-surface-muted/30 border border-brand/5 rounded-2xl">
                      <p className="text-[10px] lg:text-[14px] tracking-[0.06em] font-bold uppercase text-brand/20">Specification Details Pending</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab.includes('REVIEWS') && (
                <div className="space-y-12 animate-calm-entry">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Review List */}
                    <div className="space-y-8">
                      <h3 className="text-[14px] lg:text-[18px] font-light tracking-[0.07em] uppercase text-brand">Customer Feedback</h3>
                      {product.reviews && product.reviews.length > 0 ? (
                        <div className="space-y-8">
                          {product.reviews.map((rev, idx) => (
                            <div key={idx} className="bg-surface-muted/10 border border-brand/30 p-8 rounded-2xl animate-calm-entry">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="flex gap-1 p-2 bg-white border border-brand/30 rounded-lg">
                                  {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={cn("w-3 h-3", i < rev.rating ? "fill-accent text-accent" : "fill-brand/10 text-brand/10")} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                  ))}
                                </div>
                                <span className="text-[11px] font-bold tracking-[0.15em] text-brand uppercase">{rev.userName || 'Anonymous'}</span>
                                <div className="h-3 w-[1px] bg-brand/20" />
                                <span className="text-[10px] text-brand/30 tracking-[0.1em] uppercase font-medium italic">{new Date(rev.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <p className="text-[13px] text-brand/70 leading-relaxed font-normal">{rev.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 px-8 bg-surface-muted/30 border border-muted/5 rounded-2xl">
                          <p className="text-[11px] lg:text-[13px] tracking-[0.2em] font-medium uppercase text-brand/40 text-center">Be the first to review this piece</p>
                        </div>
                      )}
                    </div>

                    {/* Review Form */}
                    <div className="bg-surface-muted/20 p-8 lg:p-12 rounded-3xl border border-muted/5">
                      <h3 className="text-[14px] lg:text-[18px] font-light tracking-[0.2em] uppercase text-brand mb-8">Add a Review</h3>
                      <p className="text-[12px] text-brand/40 mb-8 font-medium">Your email address will not be published. Required fields are marked *</p>

                      <form className="space-y-6">
                        <div>
                          <label className="text-[10px] lg:text-[11px] font-bold tracking-[0.2em] uppercase text-brand mb-4 block">Your Rating *</label>
                          <div className="flex gap-2 p-4 bg-white border border-brand/80 rounded-xl w-fit shadow-sm">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button" className="text-brand/20 hover:text-accent transition-all p-1 hover:scale-110 border border-transparent hover:border-brand/10 rounded-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" strokeWidth="1.5" /></svg>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] lg:text-[11px] font-bold tracking-[0.2em] uppercase text-brand mb-4 block">Name *</label>
                            <input type="text" className="w-full bg-white border border-brand px-6 py-4 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium" required />
                          </div>
                          <div>
                            <label className="text-[10px] lg:text-[11px] font-bold tracking-[0.2em] uppercase text-brand mb-4 block">Email *</label>
                            <input type="email" className="w-full bg-white border border-brand px-6 py-4 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-brand transition-all font-medium" required />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] lg:text-[11px] font-bold tracking-[0.2em] uppercase text-brand mb-4 block">Your Review *</label>
                          <textarea rows={6} className="w-full bg-white border border-brand px-6 py-6 text-xs tracking-widest focus:outline-none focus:ring-1 focus:ring-brand transition-all resize-none font-medium" required />
                        </div>

                        <button type="submit" className="w-full bg-brand text-white py-5 text-[11px] lg:text-[12px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-500 shadow-premium">
                          Submit Review
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'SHIPPING & DELIVERY' && (
                <div className="space-y-8 animate-calm-entry">
                  {product.shippingPolicy ? (
                    <div
                      className="text-[13px] lg:text-[17px] text-brand/80 leading-[2] font-medium prose prose-sm lg:prose-base max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.shippingPolicy }}
                    />
                  ) : (
                    <div className="text-center py-20 bg-surface-muted/30 rounded-2xl">
                      <p className="text-[10px] lg:text-[14px] tracking-[0.08em] font-bold uppercase text-brand/20">Shipping Policy Information Pending</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'FAQS' && (
                <div className="max-w-4xl mx-auto space-y-4 animate-calm-entry">
                  {product.faqs && product.faqs.length > 0 ? (
                    <div className="space-y-4">
                      {product.faqs.map((faq, idx) => (
                        <details key={idx} className="group border border-brand/10 rounded-2xl bg-surface-muted/5 overflow-hidden transition-all duration-300 hover:border-brand/30">
                          <summary className="flex items-center justify-between p-6 lg:p-8 cursor-pointer list-none">
                            <h4 className="text-[12px] lg:text-[15px] font-bold tracking-[0.1em] uppercase text-brand group-open:text-accent transition-colors">{faq.question}</h4>
                            <span className="transition-transform duration-500 group-open:rotate-180 text-brand/30">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="1.5" /></svg>
                            </span>
                          </summary>
                          <div className="px-6 lg:px-8 pb-8 animate-calm-entry">
                            <p className="text-[13px] lg:text-[15px] text-brand/60 leading-relaxed font-medium">{faq.answer}</p>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-surface-muted/30 rounded-2xl">
                      <p className="text-[10px] lg:text-[14px] tracking-[0.08em] font-bold uppercase text-brand/20">Frequently Asked Questions Pending</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Related Products */}
          {similarProducts.length > 0 && (
            <div className="mt-40">
              <div className="flex items-center justify-center mb-16 relative">
                <div className="absolute left-0 right-0 h-[1px] bg-muted/10"></div>
                <h2 className="relative px-12 bg-white storefront-heading text-[18px] sm:text-[22px] lg:text-[26px]">
                  Related Products
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {similarProducts.map((p, idx) => (
                  <Link
                    key={p._id || p.id}
                    to={`/product/${p._id || p.id}`}
                    className="group"
                  >
                    <div className="aspect-[3/4] bg-surface-muted overflow-hidden mb-6 relative product-card-container">
                      <img
                        src={getPrimaryImageUrl(p)}
                        alt={p.name}
                        className="w-full h-full object-cover product-image-primary"
                      />

                      {/* Secondary Image for Hover (Smooth Transition) */}
                      <img
                        src={getImageUrlAt(p, 1)}
                        alt={`${p.name} alternate view`}
                        className="product-image-secondary"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-[11px] sm:text-[13px] lg:text-[16px] font-medium tracking-[0.1em] uppercase text-brand mb-2 line-clamp-1 group-hover:text-accent transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[9px] lg:text-xs text-brand/40 uppercase mb-3 tracking-widest">
                        {p.category?.name || 'Collection'}
                      </p>
                      <p className="text-sm lg:text-lg font-bold tracking-widest text-brand">
                        ₹{(p.priceToUser || p.price || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* Size Chart Modal */}
      {isSizeChartOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-calm-entry">
          <div className="bg-white w-full max-w-[700px] shadow-2xl relative p-12 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsSizeChartOpen(false)}
              className="absolute top-6 right-6 text-brand/30 hover:text-brand transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" /></svg>
            </button>

            <div className="text-center mb-10">
              <div className="flex flex-col items-center mb-12">
                <span className="text-2xl font-serif font-bold text-brand leading-none">NOOR E ADAH</span>
                <span className="text-[8px] tracking-[0.4em] font-light text-brand/40 uppercase mt-1">OFFICIAL</span>
              </div>
              <p className="text-sm lg:text-[16px] text-brand/60 leading-relaxed font-medium">
                We have provided the products measurements to help you decide which size to buy
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-brand/40">
                <thead>
                  <tr className="bg-surface-secondary">
                    {(product.sizeChart?.headers || [
                      { label: 'Size', key: 's' },
                      { label: 'Bust', key: 'b' },
                      { label: 'Waist', key: 'w' },
                      { label: 'Hip', key: 'h' },
                      { label: 'Shoulder', key: 'sh' }
                    ]).map(header => (
                      <th key={header.key || header.label} className="border border-brand/40 p-4 text-[13px] font-bold text-brand tracking-widest text-center uppercase">
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(product.sizeChart?.rows || [
                    { s: 'XS', b: '33.5', w: '28.5', h: '38.0', sh: '13.5' },
                    { s: 'S', b: '35.5', w: '30.5', h: '40.0', sh: '14.0' },
                    { s: 'M', b: '37.5', w: '32.5', h: '42.0', sh: '14.5' },
                    { s: 'L', b: '39.5', w: '34.5', h: '44.0', sh: '15.0' },
                    { s: 'XL', b: '41.5', w: '36.5', h: '46.0', sh: '15.5' },
                    { s: '2XL', b: '43.5', w: '38.5', h: '48.0', sh: '16.0' }
                  ]).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                      {(product.sizeChart?.headers || [
                        { key: 's' }, { key: 'b' }, { key: 'w' }, { key: 'h' }, { key: 'sh' }
                      ]).map(h => (
                        <td key={h.key} className="border border-brand/40 p-4 text-center text-xs sm:text-[14px] text-brand font-medium uppercase">
                          {row[h.key] || row[h.label.toLowerCase()] || '--'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-center mt-8 text-[11px] lg:text-[13px] tracking-[0.1em] text-brand/40 italic">
              ( all the sizes are mentioned in {product.sizeChart?.unit || 'inches'} )
            </p>
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/+911234567890"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-10 right-10 z-[60] w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.891 11.887-11.891 3.179 0 6.167 1.24 8.411 3.486 2.246 2.247 3.483 5.234 3.483 8.405 0 6.556-5.332 11.89-11.887 11.89-2.015 0-3.991-.512-5.747-1.488l-6.046 1.587zm5.882-1.954l.322.191c1.517.901 3.266 1.378 5.048 1.378 5.419 0 9.83-4.411 9.83-9.83 0-2.622-1.021-5.088-2.876-6.942s-4.32-2.876-6.942-2.876-5.419 4.411-5.419 9.83c0 1.882.531 3.715 1.536 5.304l.211.332-.997 3.64 3.72-.976zm11.458-7.14c-.266-.134-1.574-.776-1.819-.865s-.424-.134-.602.134-.691.865-.847 1.042-.312.197-.578.063c-.266-.134-1.127-.415-2.146-1.325-.793-.706-1.328-1.58-1.484-1.847s-.017-.412.117-.545c.121-.12.266-.312.399-.467.133-.156.178-.267.266-.445s.044-.334-.022-.467c-.067-.134-.602-1.448-.824-1.983-.217-.522-.435-.451-.602-.459l-.512-.007c-.178 0-.468.067-.712.334s-.936.913-.936 2.226c0 1.313.956 2.581 1.089 2.758s1.882 2.873 4.559 4.027c.637.274 1.135.438 1.522.561.64.203 1.222.174 1.682.106.513-.076 1.574-.643 1.796-1.265s.223-1.156.156-1.265-.245-.198-.511-.332z" /></svg>
      </a>
    </Layout>
  )
}
