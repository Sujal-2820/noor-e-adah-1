import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl } from '../utils/productImages'
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
              const inStock = (product.stock || 0) > 0
              const productImage = getPrimaryImageUrl(product)
              const isWishlisted = favourites.includes(productId)

              return (
                <div
                  key={productId}
                  className="category-products-page__card"
                  onClick={() => handleProductClick(productId)}
                >
                  <div className="category-products-page__card-image-wrapper border border-brand/20 group-hover:border-brand/50 transition-all duration-700 shadow-sm mb-6">
                    <img
                      src={productImage}
                      alt={product.name}
                      className="category-products-page__card-image"
                    />
                    {authenticated && (
                      <button
                        type="button"
                        className="category-products-page__card-wishlist"
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
                  <div className="text-xs lg:text-base font-bold tracking-[0.02em] text-center text-brand">
                    ₹{(product.priceToUser || product.price || 0).toLocaleString('en-IN')}
                  </div>
                  <button
                    className="category-products-page__card-button"
                    onClick={(e) => handleAddToCart(e, productId)}
                    disabled={!inStock}
                  >
                    {inStock ? 'Add to Cart' : 'Out of Stock'}
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









