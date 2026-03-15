import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout, Container, Section } from '../components/Layout'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl, getImageUrlAt } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

export function HomePage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { favourites, authenticated } = useWebsiteState()
  const { fetchCategories, fetchPopularProducts, addToCart, addToFavourites, removeFromFavourites } = useWebsiteApi()

  const [bannerIndex, setBannerIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Taxonomy data — 4 types
  const [categories, setCategories] = useState([])
  const [looks, setLooks] = useState([])
  const [themes, setThemes] = useState([])
  const [collections, setCollections] = useState([])
  const [popularProducts, setPopularProducts] = useState([])
  const [desktopCarousels, setDesktopCarousels] = useState([])
  const [smartphoneCarousels, setSmartphoneCarousels] = useState([])
  const [carousels, setCarousels] = useState([]) // Current active carousels based on screen
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const newArrivalsRef = useRef(null)

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [taxResult, popularResult, offersResult] = await Promise.all([
          // fetch all taxonomy types in one call (no type filter = all types returned)
          websiteApi.getCategories(),
          websiteApi.getPopularProducts({ limit: 8 }),
          websiteApi.getOffers()
        ])

        if (taxResult.success && taxResult.data?.categories) {
          const all = taxResult.data.categories
          setCategories(all.filter(c => c.type === 'category' || !c.type))
          setLooks(all.filter(c => c.type === 'look'))
          setThemes(all.filter(c => c.type === 'theme'))
          setCollections(all.filter(c => c.type === 'collection'))
        }

        if (popularResult.success && popularResult.data?.products) {
          setPopularProducts(popularResult.data.products)
        }

        if (offersResult.success && offersResult.data) {
          const desk = (offersResult.data.carousels || [])
            .filter(c => c.isActive !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
          
          const mobile = (offersResult.data.smartphoneCarousels || [])
            .filter(c => c.isActive !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))

          // Use curated new arrivals from the backend if available
          const curatedNewArrivals = offersResult.data.newArrivals || []
          if (curatedNewArrivals.length > 0) {
            setPopularProducts(curatedNewArrivals)
          }

          setDesktopCarousels(desk)
          setSmartphoneCarousels(mobile)
          
          // Initial set based on screen width
          const currentIsMobile = window.innerWidth < 768
          setCarousels(currentIsMobile ? (mobile.length > 0 ? mobile : desk) : desk)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Screen resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobileStatus = window.innerWidth < 768
      if (mobileStatus !== isMobile) {
        setIsMobile(mobileStatus)
        setCarousels(mobileStatus ? (smartphoneCarousels.length > 0 ? smartphoneCarousels : desktopCarousels) : desktopCarousels)
        setBannerIndex(0) // Reset index on switch
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile, desktopCarousels, smartphoneCarousels])

  // Auto-slide hero
  useEffect(() => {
    if (carousels.length <= 1) return
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % carousels.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [carousels.length])

  // Handlers
  const handleProductClick = (productId) => navigate(`/product/${productId}`)

  const handleAddToCart = async (e, productId) => {
    e.stopPropagation()
    if (!authenticated) { navigate('/login'); return }
    try { await addToCart(productId, 1) } catch (error) { console.error('Failed to add to cart:', error) }
  }

  const handleToggleFavourite = async (e, productId) => {
    e.stopPropagation()
    if (!authenticated) { navigate('/login'); return }
    try {
      if (favourites.includes(productId)) {
        await removeFromFavourites(productId)
        dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
      } else {
        await addToFavourites(productId)
        dispatch({ type: 'ADD_TO_FAVOURITES', payload: { productId } })
      }
    } catch (error) { console.error('Failed to toggle favourite:', error) }
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[85vh] overflow-hidden bg-surface-muted">
        {carousels.length > 0 ? (
          carousels.map((banner, index) => {
            const isVideo = banner.mediaType === 'video'
            const mediaSrc = isVideo ? banner.video : banner.image
            
            return (
              <div
                key={banner.id || banner._id}
                className={cn(
                  "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                  index === bannerIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                )}
              >
                {isVideo ? (
                  <video
                    src={mediaSrc}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover transform scale-105"
                  />
                ) : (
                  <img
                    src={mediaSrc}
                    alt={banner.title}
                    className="w-full h-full object-cover transform scale-105 animate-pulse-slow"
                  />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex flex-col items-start justify-end text-left p-8 sm:p-16 lg:p-24 text-white animate-calm-entry">
                  {banner.description && (
                    <p className="text-xs sm:text-sm tracking-[0.3em] uppercase mb-4 drop-shadow-md opacity-90">
                      {banner.description}
                    </p>
                  )}
                  {banner.title && (
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif mb-8 max-w-4xl drop-shadow-lg leading-tight">
                      {banner.title}
                    </h1>
                  )}
                  {banner.buttonText && (
                    <Link
                      to={banner.buttonLink || "/products"}
                      className="px-10 py-3.5 bg-white text-brand text-xs font-semibold tracking-widest uppercase hover:bg-brand hover:text-white transition-all duration-500 shadow-premium"
                    >
                      {banner.buttonText}
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="w-full h-full bg-muted/20 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-20 h-20 bg-muted/30 rounded-full mb-4" />
              <div className="h-4 w-40 bg-muted/30 rounded" />
            </div>
          </div>
        )}

        {/* Indicators */}
        {carousels.length > 1 && (
          <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-3">
            {carousels.map((_, index) => (
              <button
                key={index}
                onClick={() => setBannerIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-500",
                  index === bannerIndex ? "bg-white w-8" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals Section - Now below Hero */}
      <Section className="bg-white">
        <Container>
          <div className="text-center mb-12 sm:mb-20 animate-calm-entry">
            <p className="text-[9px] lg:text-[11px] font-semibold tracking-[0.15em] text-brand/40 uppercase mb-3 text-center">
              The Latest Pieces
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl storefront-heading text-brand text-center uppercase tracking-widest">New Arrivals</h2>
          </div>

          <div className="relative group/arrivals">
            {/* Desktop Grid / Mobile Carousel Container */}
            <div 
              ref={newArrivalsRef}
              className={cn(
                "flex lg:grid lg:grid-cols-4 gap-6 lg:gap-8 overflow-x-auto lg:overflow-visible pb-10 lg:pb-0 no-scrollbar snap-x snap-mandatory scroll-smooth",
              )}
            >
              {popularProducts.slice(0, isMobile ? 12 : 4).map((product, idx) => {
                const productId = product._id || product.id
                const productImage = getPrimaryImageUrl(product)
                const isWishlisted = favourites.includes(productId)
                const outOfStock = (product.displayStock || product.stock || 0) === 0

                return (
                  <div
                    key={productId}
                    className="flex-shrink-0 w-[calc(50%-12px)] lg:w-full group cursor-pointer animate-calm-entry snap-start"
                    style={{ animationDelay: `${idx * 100}ms` }}
                    onClick={() => handleProductClick(productId)}
                  >
                    <div className={cn(
                      "relative aspect-[3/4] overflow-hidden bg-[#F9F9F9] mb-6 border border-brand/10 group-hover:border-brand/30 transition-all duration-500 product-card-container",
                      outOfStock && "grayscale"
                    )}>
                      <img
                        src={productImage}
                        alt={product.name}
                        className={cn("w-full h-full object-cover product-image-primary transition-transform duration-1000 group-hover:scale-110", outOfStock && "opacity-60")}
                      />

                      {/* Secondary Image for Hover */}
                      {!outOfStock && (
                        <img
                          src={getImageUrlAt(product, 1)}
                          alt={`${product.name} alternate view`}
                          className="product-image-secondary"
                        />
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px] z-20 pointer-events-none">
                          <div className="bg-white/90 px-4 py-1.5 shadow-xl border border-red-50 transform -rotate-2">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-600">
                                Sold Out
                            </span>
                          </div>
                        </div>
                      )}

                      {!outOfStock && <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />}

                      <button
                        onClick={(e) => handleToggleFavourite(e, productId)}
                        className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white border border-brand/5 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm z-20"
                      >
                        <svg className="w-3 h-3 text-brand" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="1.5" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-center flex flex-col items-center px-2">
                      <h3 className="text-[10px] sm:text-[11px] lg:text-[13px] font-bold tracking-[0.1em] text-brand/90 uppercase mb-1 transition-all">
                        {product.name}
                      </h3>
                      <p className="text-[8px] lg:text-[9px] text-muted-foreground/50 tracking-[0.05em] font-medium mb-1.5 uppercase">
                        {product.category?.name || "Ready to wear"}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] lg:text-[14px] font-bold tracking-[0.02em] text-brand">
                          ₹{(() => {
                            const basePrice = product.publicPrice || product.priceToUser || product.price || 0
                            const discount = product.discountPublic || 0
                            const effectivePrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice
                            return effectivePrice.toLocaleString('en-IN')
                          })()}
                        </p>
                        {(product.discountPublic > 0) && (
                          <p className="text-[9px] lg:text-[11px] text-muted-foreground/30 line-through">
                            ₹{(product.publicPrice || product.priceToUser || product.price || 0).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Carousel Arrows (Mobile Only) */}
            <div className="flex lg:hidden items-center justify-center gap-4 mt-8">
              <button 
                onClick={() => newArrivalsRef.current?.scrollBy({ left: -(window.innerWidth / 2), behavior: 'smooth' })}
                className="w-10 h-10 border border-brand/10 rounded-full flex items-center justify-center hover:bg-brand hover:text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button 
                onClick={() => newArrivalsRef.current?.scrollBy({ left: window.innerWidth / 2, behavior: 'smooth' })}
                className="w-10 h-10 border border-brand/10 rounded-full flex items-center justify-center hover:bg-brand hover:text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>

          <div className="mt-16 lg:mt-24 flex justify-center">
            <Link
              to="/products"
              className="inline-block px-12 py-4 bg-brand text-white text-[10px] lg:text-[13px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300"
            >
              View All Products
            </Link>
          </div>
        </Container>
      </Section>

      {/* Categories - Now below New Arrivals */}
      <Section className="bg-surface-muted/30">
        <Container>
          <div className="text-center mb-16 animate-calm-entry">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-[0.1em] text-brand uppercase text-center">Categories</h2>
            <div className="mt-4 w-12 h-1 bg-accent mx-auto"></div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {categories.map((category, idx) => (
              <Link
                key={category._id || category.id}
                to={`/products?category=${category._id || category.id}`}
                className="relative group overflow-hidden block aspect-[4/5] sm:h-[500px] animate-calm-entry border border-brand/5"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {category.image?.url || category.image || category.icon
                  ? <img
                    src={category.image?.url || category.image || category.icon}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  : <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-4xl">👜</div>
                }
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-500" />
                <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 flex flex-col items-center">
                  <span className="text-white text-[12px] sm:text-[16px] font-bold tracking-[0.15em] uppercase mb-4 drop-shadow-md">
                    {category.name}
                  </span>
                  <div className="h-[40px] sm:h-[50px] overflow-hidden">
                    <span className="inline-block px-6 sm:px-8 py-2.5 sm:py-3.5 bg-white text-brand text-[9px] sm:text-[12px] font-bold tracking-widest uppercase transform translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
                      Shop Now
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      {/* Shop By Look */}
      {looks.length > 0 && (
        <Section className="bg-surface-secondary">
          <Container>
            <div className="text-center mb-16 animate-calm-entry">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-widest text-brand uppercase">Shop By Look</h2>
              <div className="mt-4 w-12 h-1 bg-accent mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {looks.map((look, idx) => (
                <Link
                  key={look._id || look.id}
                  to={`/products?look=${look._id || look.id}`}
                  className="relative group overflow-hidden block h-[500px] animate-calm-entry"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  {look.image?.url
                    ? <img src={look.image.url} alt={look.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    : <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-4xl">👗</div>
                  }
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-500" />
                  <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center">
                    <span className="text-white text-xs lg:text-[16px] font-bold tracking-[0.2em] uppercase mb-4 drop-shadow-md">
                      {look.name}
                    </span>
                    <div className="h-[50px] overflow-hidden">
                      <span className="inline-block px-8 py-3.5 bg-white text-brand text-[10px] lg:text-[13px] font-bold tracking-widest uppercase transform translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
                        Shop Now
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          </Container>
        </Section>
      )}

      {/* Shop By Theme */}
      {themes.length > 0 && (
        <Section className="bg-white">
          <Container>
            <div className="text-center mb-16 animate-calm-entry">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-widest text-brand uppercase">Shop By Theme</h2>
              <div className="mt-4 w-12 h-1 bg-accent mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {themes.map((theme, idx) => (
                <Link
                  key={theme._id || theme.id}
                  to={`/products?theme=${theme._id || theme.id}`}
                  className="relative group overflow-hidden block h-[400px] animate-calm-entry"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {theme.image?.url
                    ? <img src={theme.image.url} alt={theme.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    : <div className="w-full h-full bg-gradient-to-br from-accent/20 to-brand/10 flex items-center justify-center text-4xl">✨</div>
                  }
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-500" />
                  <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center">
                    <span className="text-white text-xs lg:text-[14px] font-bold tracking-[0.2em] uppercase mb-4 drop-shadow-md">
                      {theme.name}
                    </span>
                    <div className="h-[40px] overflow-hidden">
                      <span className="inline-block px-6 py-2 bg-white text-brand text-[8px] lg:text-[11px] font-bold tracking-widest uppercase transform translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
                        Shop Now
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          </Container>
        </Section>
      )}

      {/* Shop By Collection */}
      {collections.length > 0 && (
        <Section className="bg-brand text-brand-foreground overflow-hidden">
          <Container>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="animate-calm-entry">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-widest text-white uppercase">Our Collections</h2>
                <div className="mt-4 w-12 h-1 bg-accent"></div>
              </div>

              <Link to="/products" className="text-xs lg:text-[13px] font-bold tracking-[0.2em] uppercase text-accent border-b border-accent pb-1 hover:text-white hover:border-white transition-all">View All Collections</Link>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar snap-x">
              {collections.map((col, idx) => (
                <Link
                  key={col._id || col.id}
                  to={`/products?collection=${col._id || col.id}`}
                  className="flex-shrink-0 w-[300px] h-[400px] relative group overflow-hidden snap-start animate-calm-entry"
                  style={{ animationDelay: `${idx * 120}ms` }}
                >
                  {col.image?.url
                    ? <img src={col.image.url} alt={col.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" />
                    : <div className="w-full h-full bg-white/5 flex items-center justify-center"><span className="text-5xl">👒</span></div>
                  }
                  <div className="absolute inset-0 bg-brand/20 group-hover:bg-transparent transition-all duration-500" />
                  <div className="absolute bottom-8 left-8">
                    <h3 className="text-xl font-serif text-white drop-shadow-lg mb-2">{col.name}</h3>
                    <div className="w-12 h-0.5 bg-accent group-hover:w-24 transition-all duration-500" />
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* Brand Pillars Section - Image 4 Style */}
      <Section className="bg-white border-t border-muted/5 py-32">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-24 lg:gap-32">
            <div className="flex flex-col items-center text-center animate-calm-entry">
              <div className="mb-10 opacity-80">
                <svg className="w-14 h-14 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.8">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                </svg>
              </div>
              <h4 className="text-[11px] lg:text-[16px] font-bold tracking-[0.25em] uppercase mb-6 text-brand">Sustainability at Noor E Adah</h4>
              <p className="text-xs lg:text-[14px] text-muted-foreground leading-[1.8] max-w-xs font-light">
                At Noor E Adah, sustainability is at the heart of our design philosophy. We believe in conscious fashion.
              </p>
            </div>

            <div className="flex flex-col items-center text-center animate-calm-entry" style={{ animationDelay: '200ms' }}>
              <div className="mb-10 opacity-80">
                <svg className="w-14 h-14 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.8">
                  <path d="M12 1v22M1 12h22M4 4l16 16M4 20L20 4" />
                </svg>
              </div>
              <h4 className="text-[11px] lg:text-[16px] font-bold tracking-[0.25em] uppercase mb-6 text-brand">Traditional Artisanship</h4>
              <p className="text-xs lg:text-[14px] text-muted-foreground leading-[1.8] max-w-xs font-light">
                Supporting traditional artisanship helps sustain these age-old practices and provides economic opportunities to artisans.
              </p>
            </div>

            <div className="flex flex-col items-center text-center animate-calm-entry" style={{ animationDelay: '400ms' }}>
              <div className="mb-10 opacity-80">
                <svg className="w-14 h-14 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.8">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h4 className="text-[11px] lg:text-[16px] font-bold tracking-[0.25em] uppercase mb-6 text-brand">Made in India</h4>
              <p className="text-xs lg:text-[14px] text-muted-foreground leading-[1.8] max-w-xs font-light">
                A brand of Indian values, we are made completely in India from thought to creation.
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  )
}
