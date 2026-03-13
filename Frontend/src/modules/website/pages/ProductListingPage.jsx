import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl, getImageUrlAt } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import '../styles/website.css'
import { useTranslation } from '../../../context/TranslationContext'
import { Trans } from '../../../components/Trans'
import { TransText } from '../../../components/TransText'

export function ProductListingPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { favourites, authenticated } = useWebsiteState()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const categoryId = searchParams.get('category') || ''
  const lookId = searchParams.get('look') || ''
  const themeId = searchParams.get('theme') || ''
  const collectionId = searchParams.get('collection') || ''

  const { fetchProducts, addToCart, addToFavourites, removeFromFavourites } = useWebsiteApi()

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewLimit, setViewLimit] = useState(12)
  const [gridCols, setGridCols] = useState(3) // 2, 3, 4
  const [sortBy, setSortBy] = useState('latest')
  const [currentPage, setCurrentPage] = useState(1)

  // Data State
  const [products, setProducts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [taxonomies, setTaxonomies] = useState({ categories: [], looks: [], themes: [], collections: [] })

  // Filter State
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 })
  const [selectedTaxonomy, setSelectedTaxonomy] = useState({
    category: categoryId || 'all',
    look: lookId || 'all',
    theme: themeId || 'all',
    collection: collectionId || 'all'
  })

  // Fetch taxonomies
  useEffect(() => {
    const loadTaxonomies = async () => {
      try {
        const res = await websiteApi.getCategories()
        if (res.success && res.data?.categories) {
          const all = res.data.categories
          setTaxonomies({
            categories: all.filter(c => c.type === 'category' || !c.type),
            looks: all.filter(c => c.type === 'look'),
            themes: all.filter(c => c.type === 'theme'),
            collections: all.filter(c => c.type === 'collection')
          })
        }
      } catch (err) { console.error(err) }
    }
    loadTaxonomies()
  }, [])

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        const params = {
          limit: viewLimit,
          offset: (currentPage - 1) * viewLimit,
          search: searchQuery,
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          sort: sortBy === 'latest' ? 'latest' : sortBy === 'price-low' ? 'price_asc' : sortBy === 'price-high' ? 'price_desc' : 'popular'
        }

        if (selectedTaxonomy.category !== 'all') params.category = selectedTaxonomy.category
        if (selectedTaxonomy.look !== 'all') params.look = selectedTaxonomy.look
        if (selectedTaxonomy.theme !== 'all') params.theme = selectedTaxonomy.theme
        if (selectedTaxonomy.collection !== 'all') params.collection = selectedTaxonomy.collection

        const result = await fetchProducts(params)
        if (result.data) {
          setProducts(result.data.products || [])
          setTotalCount(result.data.total || (result.data.products?.length || 0))
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [searchQuery, selectedTaxonomy, sortBy, viewLimit, currentPage, priceRange.max])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTaxonomy, sortBy])

  // Context-aware category sync
  useEffect(() => {
    setSelectedTaxonomy(prev => ({
      ...prev,
      category: categoryId || 'all',
      look: lookId || 'all',
      theme: themeId || 'all',
      collection: collectionId || 'all'
    }))
  }, [categoryId, lookId, themeId, collectionId])

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
    } catch (err) { console.error(err) }
  }

  return (
    <Layout>
      <div className="pt-2 pb-20 bg-white min-h-screen">
        <Container>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-[9px] lg:text-[11px] tracking-[0.25em] uppercase text-muted-foreground/50 font-semibold mb-12">
            <Link to="/" className="hover:text-brand transition-colors">Home</Link>
            <span>/</span>
            <span className="text-brand">Shop</span>
            {totalCount > 0 && (
              <span className="ml-auto text-brand/30 font-medium lowercase italic tracking-normal">Showing 1-{products.length} of {totalCount} results</span>
            )}
          </nav>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-y border-muted/10 py-6 mb-12 gap-6">
            <div className="flex items-center gap-8">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-3 group transition-all"
              >
                <div className="w-5 h-5 flex flex-col justify-center gap-1">
                  <span className="h-[1px] w-5 bg-brand group-hover:bg-accent transition-colors" />
                  <span className="h-[1px] w-3 bg-brand group-hover:bg-accent transition-colors" />
                  <span className="h-[1px] w-5 bg-brand group-hover:bg-accent transition-colors" />
                </div>
                <span className="text-[10px] lg:text-[11px] font-semibold tracking-[0.15em] uppercase">Show sidebar</span>
              </button>
            </div>

            <div className="flex items-center gap-12 self-end md:self-auto">
              {/* Show Limit */}
              <div className="hidden lg:flex items-center gap-4">
                <span className="text-[10px] lg:text-[13px] font-bold tracking-widest text-brand/40 uppercase">Show :</span>
                {[9, 12, 18, 24].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setViewLimit(num)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      "text-[10px] lg:text-[13px] font-bold transition-all",
                      viewLimit === num ? "text-brand" : "text-brand/20 hover:text-brand/40"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Grid Toggle */}
              <div className="hidden sm:flex items-center gap-4 border-x border-muted/10 px-8">
                {[2, 3, 4].map(cols => (
                  <button
                    key={cols}
                    onClick={() => setGridCols(cols)}
                    className={cn(
                      "transition-all",
                      gridCols === cols ? "text-brand" : "text-brand/20 hover:text-brand/40"
                    )}
                  >
                    <div className={cn("grid gap-0.5", cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4")}>
                      {[...Array(cols * 2)].map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-current rounded-sm" />
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] lg:text-[13px] font-bold tracking-widest uppercase cursor-pointer text-brand hover:text-accent transition-colors"
              >
                <option value="latest">Sort by latest</option>
                <option value="popular">Sort by popularity</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className={cn(
            "grid gap-x-6 gap-y-16 lg:gap-x-10 lg:gap-y-24 transition-all duration-500",
            gridCols === 2 ? "grid-cols-2 lg:grid-cols-2" : gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
          )}>
            {loading ? (
              [...Array(viewLimit)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-6">
                  <div className="aspect-[3/4] bg-muted/10 rounded-sm" />
                  <div className="space-y-3 px-4">
                    <div className="h-4 bg-muted/10 w-2/3 mx-auto rounded" />
                    <div className="h-3 bg-muted/10 w-1/3 mx-auto rounded" />
                  </div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map((product, idx) => {
                const productId = product._id || product.id
                const productImage = getPrimaryImageUrl(product)
                const isWishlisted = favourites.includes(productId)
                const outOfStock = (product.displayStock || product.stock || 0) === 0

                return (
                  <div
                    key={productId}
                    className="group animate-calm-entry flex flex-col items-center text-center"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div
                      className={cn(
                        "relative aspect-[3/4] overflow-hidden bg-surface-muted/30 w-full mb-6 cursor-pointer border border-brand/20 group-hover:border-brand/50 transition-all duration-700 product-card-container",
                        outOfStock && "grayscale"
                      )}
                      onClick={() => navigate(`/product/${productId}`)}
                    >
                      <img
                        src={productImage}
                        alt={product.name}
                        className={cn("w-full h-full object-cover product-image-primary", outOfStock && "opacity-60")}
                      />

                      {/* Secondary Image for Hover (Smooth Transition) */}
                      {!outOfStock && (
                        <img
                          src={getImageUrlAt(product, 1)}
                          alt={`${product.name} alternate view`}
                          className="product-image-secondary"
                        />
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px] z-20 pointer-events-none">
                          <div className="bg-white/90 px-6 py-2 shadow-2xl border border-red-100 transform -rotate-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
                                Sold Out
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Premium Hover Actions Overlay */}
                      {!outOfStock && <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />}

                      <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out z-10 flex flex-col gap-3">
                        <button
                          className="w-full bg-white/95 backdrop-blur-sm text-brand py-3.5 text-[10px] lg:text-[12px] font-bold tracking-[0.15em] uppercase hover:bg-brand hover:text-white transition-all shadow-xl border border-brand/40 font-sans"
                          onClick={(e) => { e.stopPropagation(); navigate(`/product/${productId}`) }}
                        >
                          {outOfStock ? 'View Piece' : 'Select Piece'}
                        </button>
                      </div>

                      <div className="absolute top-4 right-4 flex flex-col gap-3 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                        <button
                          onClick={(e) => handleToggleFavourite(e, productId)}
                          className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-all text-brand border border-brand/20"
                        >
                          <svg className="w-4 h-4" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="1.5" />
                          </svg>
                        </button>
                        <button className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-all text-brand border border-brand/20">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeWidth="1.5" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-[10px] sm:text-[11px] lg:text-[13px] font-semibold tracking-[0.1em] text-brand/90 uppercase mb-1.5 group-hover:text-accent transition-all px-2 text-center leading-relaxed">
                      {product.name}
                    </h3>
                    <p className="text-[8px] lg:text-[10px] text-muted-foreground/50 tracking-[0.05em] font-medium mb-2 text-center">
                      {product.category?.name || "Ready to wear"}
                    </p>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <p className="text-xs lg:text-base font-bold tracking-[0.02em] text-brand">
                          ₹{(() => {
                            const basePrice = product.publicPrice || product.price || 0
                            const discount = product.discountPublic || 0
                            const effectivePrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice
                            return effectivePrice.toLocaleString('en-IN')
                          })()}
                        </p>
                        {(product.discountPublic > 0) && (
                          <p className="text-[9px] lg:text-[11px] text-muted-foreground/40 line-through">
                            ₹{(product.publicPrice || product.priceToUser || product.price || 0).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                      {(product.discountPublic > 0) && (
                        <p className="text-[9px] lg:text-[10px] font-bold text-green-600 mt-0.5">
                          {Math.round(product.discountPublic)}% OFF
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full py-40 text-center space-y-4">
                <p className="text-xl font-serif text-brand/40 italic">No pieces found in this curation.</p>
                <button
                  onClick={() => {
                    setSelectedTaxonomy({ category: 'all', look: 'all', theme: 'all', collection: 'all' });
                    setSearchParams({});
                    setPriceRange({ min: 0, max: 100000 });
                  }}
                  className="text-xs font-bold tracking-widest uppercase text-accent border-b border-accent pb-1"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > viewLimit && (
            <div className="mt-32 flex items-center justify-center gap-2">
              {Array.from({ length: Math.ceil(totalCount / viewLimit) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center border transition-all text-xs uppercase font-bold",
                    currentPage === page
                      ? "border-brand bg-brand text-white"
                      : "border-brand/40 text-brand hover:bg-muted/5"
                  )}
                >
                  {page}
                </button>
              ))}
              {currentPage < Math.ceil(totalCount / viewLimit) && (
                <button
                  onClick={() => {
                    setCurrentPage(prev => prev + 1)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="ml-4 text-brand hover:text-accent transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="1.5" /></svg>
                </button>
              )}
            </div>
          )}
        </Container>
      </div>

      {/* Sidebar Overlay */}
      <div className={cn(
        "fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-500",
        isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
      )} onClick={() => setIsSidebarOpen(false)} />

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-[350px] sm:w-[450px] bg-white z-[70] shadow-2xl transition-transform duration-500 ease-out overflow-y-auto",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-10">
          <header className="flex items-center justify-between mb-12">
            <h2 className="text-xl sm:text-2xl storefront-heading lowercase">Filters</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="group flex items-center gap-3 text-brand/40 hover:text-brand transition-all"
            >
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase">Close</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12" strokeWidth="1.5" /></svg>
            </button>
          </header>

          <div className="space-y-12">
            {/* Price Filter */}
            <section className="space-y-8">
              <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand/30 border-b border-muted/10 pb-4">Price Range</h3>
              <div className="px-2 pt-6">
                <input
                  type="range" min="0" max="100000" step="500"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                  className="w-full accent-brand h-1.5 bg-muted/20 rounded-full cursor-pointer border-none"
                />
                <div className="flex justify-between mt-6 items-center">
                  <div className="text-sm font-bold tracking-widest text-brand/80">
                    ₹0 — ₹{priceRange.max.toLocaleString('en-IN')}
                  </div>
                  <button className="bg-brand text-white px-6 py-2 text-[10px] font-black tracking-widest uppercase hover:bg-accent transition-all shadow-lg">Filter</button>
                </div>
              </div>
            </section>

            {/* Category Filter */}
            <section className="space-y-6">
              <div className="flex items-center justify-between h-8 border-b border-muted/10">
                <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand/30">Filter by Category</h3>
                <svg className="w-4 h-4 text-brand/20 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6" strokeWidth="2" /></svg>
              </div>
              <div className="flex flex-col gap-4 max-h-[250px] overflow-y-auto no-scrollbar pr-4">
                {taxonomies.categories.map(cat => (
                  <label key={cat._id || cat.id} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedTaxonomy.category === (cat._id || cat.id)}
                      onChange={() => setSelectedTaxonomy(prev => ({
                        ...prev,
                        category: prev.category === (cat._id || cat.id) ? 'all' : (cat._id || cat.id)
                      }))}
                    />
                    <div className={cn(
                      "w-4 h-4 border transition-all mr-4 flex items-center justify-center",
                      selectedTaxonomy.category === (cat._id || cat.id) ? "border-brand bg-brand" : "border-muted/30 group-hover:border-brand/50"
                    )}>
                      {selectedTaxonomy.category === (cat._id || cat.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" strokeWidth="3" /></svg>}
                    </div>
                    <span className={cn(
                      "text-[13px] font-medium tracking-wide uppercase transition-all",
                      selectedTaxonomy.category === (cat._id || cat.id) ? "text-brand" : "text-brand/50 group-hover:text-brand"
                    )}>{cat.name}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Look Filter */}
            <section className="space-y-6">
              <div className="flex items-center justify-between h-8 border-b border-muted/10">
                <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand/30">Filter by Look</h3>
                <svg className="w-4 h-4 text-brand/20 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6" strokeWidth="2" /></svg>
              </div>
              <div className="flex flex-col gap-4 max-h-[250px] overflow-y-auto no-scrollbar pr-4">
                {taxonomies.looks.map(look => (
                  <label key={look._id || look.id} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedTaxonomy.look === (look._id || look.id)}
                      onChange={() => setSelectedTaxonomy(prev => ({
                        ...prev,
                        look: prev.look === (look._id || look.id) ? 'all' : (look._id || look.id)
                      }))}
                    />
                    <div className={cn(
                      "w-4 h-4 border transition-all mr-4 flex items-center justify-center",
                      selectedTaxonomy.look === (look._id || look.id) ? "border-brand bg-brand" : "border-muted/30 group-hover:border-brand/50"
                    )}>
                      {selectedTaxonomy.look === (look._id || look.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" strokeWidth="3" /></svg>}
                    </div>
                    <span className={cn(
                      "text-[13px] font-medium tracking-wide uppercase transition-all",
                      selectedTaxonomy.look === (look._id || look.id) ? "text-brand" : "text-brand/50 group-hover:text-brand"
                    )}>{look.name}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Collection Filter */}
            <section className="space-y-6">
              <div className="flex items-center justify-between h-8 border-b border-muted/10">
                <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand/30">Filter by Collection</h3>
                <svg className="w-4 h-4 text-brand/20 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6" strokeWidth="2" /></svg>
              </div>
              <div className="flex flex-col gap-4 max-h-[250px] overflow-y-auto no-scrollbar pr-4">
                {taxonomies.collections.map(col => (
                  <label key={col._id || col.id} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedTaxonomy.collection === (col._id || col.id)}
                      onChange={() => setSelectedTaxonomy(prev => ({
                        ...prev,
                        collection: prev.collection === (col._id || col.id) ? 'all' : (col._id || col.id)
                      }))}
                    />
                    <div className={cn(
                      "w-4 h-4 border transition-all mr-4 flex items-center justify-center",
                      selectedTaxonomy.collection === (col._id || col.id) ? "border-brand bg-brand" : "border-muted/30 group-hover:border-brand/50"
                    )}>
                      {selectedTaxonomy.collection === (col._id || col.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" strokeWidth="3" /></svg>}
                    </div>
                    <span className={cn(
                      "text-[13px] font-medium tracking-wide uppercase transition-all",
                      selectedTaxonomy.collection === (col._id || col.id) ? "text-brand" : "text-brand/50 group-hover:text-brand"
                    )}>{col.name}</span>
                    <span className="ml-auto text-[11px] text-brand/20 font-bold">(0)</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Theme Filter */}
            <section className="space-y-6">
              <div className="flex items-center justify-between h-8 border-b border-muted/10">
                <h3 className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand/30">Filter by Theme</h3>
                <svg className="w-4 h-4 text-brand/20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m18 15-6-6-6 6" strokeWidth="2" /></svg>
              </div>
              <div className="flex flex-col gap-4">
                {taxonomies.themes.map(theme => (
                  <label key={theme._id || theme.id} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox" className="hidden"
                      checked={selectedTaxonomy.theme === (theme._id || theme.id)}
                      onChange={() => setSelectedTaxonomy(prev => ({
                        ...prev,
                        theme: prev.theme === (theme._id || theme.id) ? 'all' : (theme._id || theme.id)
                      }))}
                    />
                    <div className={cn(
                      "w-4 h-4 border transition-all mr-4 flex items-center justify-center",
                      selectedTaxonomy.theme === (theme._id || theme.id) ? "border-brand bg-brand" : "border-muted/30 group-hover:border-brand/50"
                    )}>
                      {selectedTaxonomy.theme === (theme._id || theme.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7" strokeWidth="3" /></svg>}
                    </div>
                    <span className={cn(
                      "text-[13px] font-medium tracking-wide uppercase transition-all",
                      selectedTaxonomy.theme === (theme._id || theme.id) ? "text-brand" : "text-brand/50 group-hover:text-brand"
                    )}>{theme.name}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Size Filter */}
            <section className="space-y-6">
              <div className="flex items-center justify-between h-8 border-b border-muted/10">
                <h3 className="text-xs font-black tracking-[0.2em] uppercase text-brand/50">Filter by Size</h3>
                <svg className="w-4 h-4 text-brand/20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6" strokeWidth="2" /></svg>
              </div>
              <div className="flex flex-wrap gap-2">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(size => (
                  <button key={size} className="w-10 h-10 border border-muted/10 text-[10px] font-bold text-brand/50 hover:border-brand hover:text-brand transition-all">{size}</button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </Layout>
  )
}
