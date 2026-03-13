import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl, getImageUrlAt } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

export function CategoryProductsPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const [searchParams] = useSearchParams()
  const initialCategoryId = searchParams.get('category') || 'all'

  const { favourites, authenticated } = useWebsiteState()
  const { fetchCategories, fetchProducts, addToCart, addToFavourites, removeFromFavourites } = useWebsiteApi()

  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('popular')

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await fetchCategories()
        if (result.data?.categories) {
          setCategories(result.data.categories)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }
    loadCategories()
  }, [fetchCategories])

  // Fetch products for selected category
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        const params = { limit: 100 }

        if (selectedCategory !== 'all') {
          params.category = selectedCategory
        }

        // Map sortBy to API sort parameter
        if (sortBy === 'price-low') {
          params.sort = 'price_asc'
        } else if (sortBy === 'price-high') {
          params.sort = 'price_desc'
        } else if (sortBy === 'rating') {
          params.sort = 'rating_desc'
        } else {
          params.sort = 'popular'
        }

        const result = await fetchProducts(params)
        if (result.data?.products) {
          setProducts(result.data.products)
        }
      } catch (error) {
        console.error('Error loading products:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [selectedCategory, sortBy, fetchProducts])

  // Update selected category when URL param changes
  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategory(initialCategoryId)
    }
  }, [initialCategoryId])

  const category = useMemo(() => {
    if (selectedCategory === 'all') return null
    return categories.find((cat) => (cat.id || cat._id) === selectedCategory)
  }, [selectedCategory, categories])

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId)
    navigate(`/category?category=${categoryId}`, { replace: true })
  }

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
  }

  const handleAddToCart = async (e, productId) => {
    e.stopPropagation()
    if (!authenticated) {
      navigate('/login')
      return
    }
    try {
      await addToCart(productId, 1)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    }
  }

  const handleToggleFavourite = async (e, productId) => {
    e.stopPropagation()
    if (!authenticated) {
      navigate('/login')
      return
    }
    try {
      if (favourites.includes(productId)) {
        await removeFromFavourites(productId)
        dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
      } else {
        await addToFavourites(productId)
        dispatch({ type: 'ADD_TO_FAVOURITES', payload: { productId } })
      }
    } catch (error) {
      console.error('Failed to toggle favourite:', error)
    }
  }

  const allCategories = [
    { id: 'all', name: 'All Categories' },
    ...categories,
  ]

  return (
    <Layout>
      <Container className="category-products-page">
        {/* Header */}
        <div className="category-products-page__header">
          <button
            type="button"
            className="category-products-page__back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="category-products-page__header-content">
            <h1 className="text-xl sm:text-2xl lg:text-3xl storefront-heading mb-2">
              {category ? category.name : 'All Collections'}
            </h1>
            <p className="text-[10px] lg:text-[11px] tracking-[0.15em] uppercase text-muted-foreground/40 font-semibold italic">
              {products.length} {products.length === 1 ? 'piece' : 'pieces'} curated
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="category-products-page__tabs">
          <div className="category-products-page__tabs-container">
            {allCategories.map((cat) => {
              const catId = cat.id || cat._id
              return (
                <button
                  key={catId}
                  type="button"
                  className={cn(
                    'category-products-page__tab',
                    selectedCategory === catId && 'category-products-page__tab--active',
                    'text-[10px] lg:text-[11px] font-semibold tracking-[0.15em] uppercase px-6 pb-4 transition-all duration-300'
                  )}
                  onClick={() => handleCategoryClick(catId)}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sort and Filter Bar */}
        <div className="category-products-page__toolbar">
          <div className="category-products-page__sort">
            <label htmlFor="sort-select" className="text-[10px] lg:text-[12px] font-bold tracking-[0.2em] uppercase text-brand/30 mr-4">
              Sort by :
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] lg:text-[12px] font-bold tracking-[0.2em] uppercase cursor-pointer text-brand hover:text-accent transition-colors"
            >
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="category-products-page__loading">
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="category-products-page__empty">
            <p className="category-products-page__empty-text">No products found in this category</p>
          </div>
        ) : (
          <div className="category-products-page__grid">
            {products.map((product) => {
              const productId = product._id || product.id
              const outOfStock = (product.displayStock || product.stock || 0) === 0
              const productImage = getPrimaryImageUrl(product)
              const isWishlisted = favourites.includes(productId)

              return (
                <div
                  key={productId}
                  className="category-products-page__card group"
                  onClick={() => handleProductClick(productId)}
                >
                  <div className={cn(
                    "category-products-page__card-image-wrapper border border-brand/20 group-hover:border-brand/50 transition-all duration-700 shadow-sm mb-6 product-card-container",
                    outOfStock && "grayscale"
                  )}>
                    <img
                      src={productImage}
                      alt={product.name}
                      className={cn("category-products-page__card-image product-image-primary", outOfStock && "opacity-60")}
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
                    {authenticated && (
                      <button
                        type="button"
                        className="category-products-page__card-wishlist z-20"
                        onClick={(e) => handleToggleFavourite(e, productId)}
                      >
                        <svg
                          className="h-5 w-5"
                          fill={isWishlisted ? '#ef4444' : 'none'}
                          stroke={isWishlisted ? '#ef4444' : 'currentColor'}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <h3 className="text-[10px] sm:text-[11px] lg:text-[13px] font-semibold tracking-[0.1em] text-center uppercase mb-1.5 text-brand/90 group-hover:text-accent transition-colors leading-relaxed">
                    {product.name}
                  </h3>
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
                  <button
                    className={cn(
                      "category-products-page__card-button font-bold tracking-widest uppercase",
                      outOfStock && "bg-gray-100 text-gray-400 cursor-not-allowed border-transparent"
                    )}
                    onClick={(e) => !outOfStock && handleAddToCart(e, productId)}
                    disabled={outOfStock}
                  >
                    {!outOfStock ? 'Add to Cart' : 'Sold Out'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </Layout>
  )
}









