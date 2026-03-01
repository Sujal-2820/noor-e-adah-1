import { useMemo, useState, useEffect } from 'react'
import { ProductCard, ChevronLeftIcon, FilterIcon } from '../../../../../components/shared/catalog'
import { cn } from '../../../../../lib/cn'
import * as catalogApi from '../../../../../services/catalogApi'
import { useUserApi } from '../../../hooks/useUserApi'
import { TransText } from '../../../../../components/TransText'
import { Trans } from '../../../../../components/Trans'
import '../../../../../styles/product-card.css'

const formatCategoryName = (name) => {
    if (!name) return name
    // Add spaces before 'Fertilizer' if camelCased or concatenated
    const fertilizerMatch = name.match(/(\w+)(Fertilizer)/i)
    if (fertilizerMatch && fertilizerMatch[1] && fertilizerMatch[2] && !name.includes(' ')) {
        return `${fertilizerMatch[1]} ${fertilizerMatch[2]}`
    }
    return name
}

export function UserCategoryProductsView({ categoryId, onProductClick, onAddToCart, onBack, onToggleFavourite, favourites = [] }) {
    const [selectedCategory, setSelectedCategory] = useState(categoryId || 'all')
    const [showFilters, setShowFilters] = useState(false)
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const { getProducts } = useUserApi()
    const [filters, setFilters] = useState({
        priceRange: 'all',
        availability: {
            inStock: true,
            outOfStock: true
        }
    })

    // Fetch categories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                // Fetch products first for fallback if needed
                const productsResult = await getProducts({ limit: 100 })
                let fallbackCategories = []
                if (productsResult.data?.products) {
                    const uniqueCats = Array.from(new Set(productsResult.data.products.map(p => p.category).filter(Boolean)))
                    fallbackCategories = uniqueCats.map(name => ({
                        id: name.toLowerCase().replace(/\s+/g, '-'),
                        name: name,
                        fallback: true
                    }))
                }

                const result = await catalogApi.getCategories()
                if (result.success && (Array.isArray(result.data) || result.data?.categories)) {
                    const rawCats = Array.isArray(result.data) ? result.data : (result.data.categories || [])
                    const standardized = rawCats.map(cat => ({
                        id: cat._id || cat.id,
                        name: cat.name || '',
                        image: cat.image?.url || cat.image || cat.icon || cat.imageUrl || null,
                        emoji: cat.emoji || '📦'
                    }))
                    setCategories(standardized.length > 0 ? standardized : fallbackCategories)
                } else {
                    setCategories(fallbackCategories)
                }
            } catch (error) {
                console.error('Error loading categories:', error)
            }
        }
        loadCategories()
    }, [])

    // Sync selectedCategory with categoryId prop
    useEffect(() => {
        if (categoryId) {
            setSelectedCategory(categoryId)
        }
    }, [categoryId])

    // Fetch products (as user)
    useEffect(() => {
        const loadProducts = async () => {
            if (selectedCategory !== 'all' && categories.length === 0) {
                return
            }

            setLoading(true)
            try {
                const params = { limit: 100 }
                if (selectedCategory !== 'all') {
                    const categoryObj = categories.find(c => (c._id || c.id) === selectedCategory)
                    if (categoryObj) {
                        params.category = categoryObj.name
                    } else {
                        params.category = selectedCategory
                    }
                }

                // Use user specific product fetch for catalog
                const result = await getProducts(params)
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
    }, [selectedCategory, categories])

    const category = useMemo(() => {
        if (selectedCategory === 'all') return null
        return categories.find((cat) => (cat._id || cat.id) === selectedCategory)
    }, [selectedCategory, categories])

    const allCategories = [
        { id: 'all', name: 'All' },
        ...categories,
    ]

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            // Robust price calculation for user
            let price = 0
            if (product.attributeStocks && product.attributeStocks.length > 0) {
                const prices = product.attributeStocks
                    .map(a => a.userPrice || a.priceToUser || 0)
                    .filter(p => p > 0)
                if (prices.length > 0) {
                    price = Math.min(...prices)
                }
            }

            if (price === 0) {
                price = product.priceToUser || product.userPrice || product.price || product.priceToUser || 0
            }

            // Price Filter
            if (filters.priceRange !== 'all') {
                const [min, max] = filters.priceRange.split('-').map(v => v === '2000+' ? 2000 : parseInt(v))
                if (filters.priceRange === '2000+') {
                    if (price < 2000) return false
                } else {
                    if (price < min || price > max) return false
                }
            }

            // Availability Filter
            const stock = product.displayStock || product.stock || 0
            if (!filters.availability.inStock && stock > 0) return false
            if (!filters.availability.outOfStock && stock <= 0) return false

            return true
        })
    }, [products, filters])

    const formatProductForCard = (product) => {
        // Robust price calculation for user
        let displayPrice = 0
        if (product.attributeStocks && product.attributeStocks.length > 0) {
            const prices = product.attributeStocks
                .map(a => a.userPrice || a.priceToUser || 0)
                .filter(p => p > 0)
            if (prices.length > 0) {
                displayPrice = Math.min(...prices)
            }
        }

        if (displayPrice === 0) {
            displayPrice = product.priceToUser || product.userPrice || product.price || product.priceToUser || 0
        }

        return {
            id: product._id || product.id,
            name: product.name,
            price: displayPrice,
            image: product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300',
            category: product.category,
            stock: product.displayStock || product.stock,
            description: product.description,
            shortDescription: product.shortDescription || product.description,
            isWishlisted: favourites.includes(product._id || product.id),
            showNewBadge: false,
            showRatingBadge: true,
            rating: product.rating ?? product.averageRating,
            reviewCount: product.reviewCount ?? (product.reviews?.length || 0),
        }
    }

    return (
        <div className="user-category-products-view space-y-4">
            {/* Header */}
            <div className="user-category-products-view__header">
                <button
                    type="button"
                    className="user-category-products-view__back"
                    onClick={onBack}
                    aria-label="Go back"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <div className="user-category-products-view__header-content">
                    <div className="user-category-products-view__header-text">
                        <h2 className="user-category-products-view__title">
                            {category ? <TransText>{formatCategoryName(category.name)}</TransText> : <Trans>All Products</Trans>}
                        </h2>
                        <p className="user-category-products-view__subtitle">
                            {filteredProducts.length} <Trans>{filteredProducts.length === 1 ? 'product' : 'products'}</Trans> <Trans>available</Trans>
                        </p>
                    </div>
                    <button
                        type="button"
                        className={cn(
                            "user-category-products-view__filter-btn",
                            showFilters && "user-category-products-view__filter-btn--active"
                        )}
                        onClick={() => setShowFilters(!showFilters)}
                        aria-label="Filter"
                    >
                        <FilterIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="user-category-products-view__filter-overlay" onClick={() => setShowFilters(false)}>
                    <div className="user-category-products-view__filter-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="user-category-products-view__filter-header">
                            <h3 className="user-category-products-view__filter-title"><Trans>Filter Products</Trans></h3>
                            <button
                                type="button"
                                className="user-category-products-view__filter-close"
                                onClick={() => setShowFilters(false)}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="user-category-products-view__filter-content">
                            <div className="user-category-products-view__filter-section">
                                <h4 className="user-category-products-view__filter-section-title"><Trans>Price Range</Trans></h4>
                                <div className="user-category-products-view__filter-options">
                                    {[
                                        { id: 'all', label: 'All Prices' },
                                        { id: '0-500', label: '₹0 - ₹500' },
                                        { id: '500-1000', label: '₹500 - ₹1,000' },
                                        { id: '1000-2000', label: '₹1,000 - ₹2,000' },
                                        { id: '2000+', label: '₹2,000+' },
                                    ].map((range) => (
                                        <label key={range.id} className="user-category-products-view__filter-option">
                                            <input
                                                type="radio"
                                                name="price"
                                                value={range.id}
                                                checked={filters.priceRange === range.id}
                                                onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                                            />
                                            <span><Trans>{range.label}</Trans></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="user-category-products-view__filter-section">
                                <h4 className="user-category-products-view__filter-section-title"><Trans>Availability</Trans></h4>
                                <div className="user-category-products-view__filter-options">
                                    <label className="user-category-products-view__filter-option">
                                        <input
                                            type="checkbox"
                                            checked={filters.availability.inStock}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    availability: { ...filters.availability, inStock: e.target.checked },
                                                })
                                            }
                                        />
                                        <span><Trans>In Stock</Trans></span>
                                    </label>
                                    <label className="user-category-products-view__filter-option">
                                        <input
                                            type="checkbox"
                                            checked={filters.availability.outOfStock}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    availability: { ...filters.availability, outOfStock: e.target.checked },
                                                })
                                            }
                                        />
                                        <span><Trans>Out of Stock</Trans></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="user-category-products-view__filter-actions">
                            <button
                                type="button"
                                className="user-category-products-view__filter-reset"
                                onClick={() => setFilters({ priceRange: 'all', availability: { inStock: true, outOfStock: true } })}
                            >
                                <Trans>Reset Filters</Trans>
                            </button>
                            <button
                                type="button"
                                className="user-category-products-view__filter-apply"
                                onClick={() => setShowFilters(false)}
                            >
                                <Trans>Apply Filters</Trans>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Filter Menu */}
            <div className="user-category-products-view__categories">
                <div className="user-category-products-view__categories-rail">
                    {allCategories.map((cat, index) => (
                        <button
                            key={cat._id || cat.id || `category-${index}`}
                            type="button"
                            className={cn(
                                'user-category-products-view__category-tab',
                                selectedCategory === (cat._id || cat.id) && 'user-category-products-view__category-tab--active'
                            )}
                            onClick={() => setSelectedCategory(cat._id || cat.id)}
                        >
                            {cat.name === 'All' ? <Trans>All</Trans> : <TransText>{formatCategoryName(cat.name)}</TransText>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Products List */}
            <div className="home-products-grid px-3 pb-20">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)
                ) : filteredProducts.length === 0 ? (
                    <div className="flex items-center justify-center p-8 col-span-full">
                        <p className="text-sm text-gray-500"><Trans>No products found matching your criteria</Trans></p>
                    </div>
                ) : (
                    filteredProducts.map((product) => (
                        <ProductCard
                            key={product._id || product.id}
                            product={formatProductForCard(product)}
                            onNavigate={onProductClick}
                            onAddToCart={onAddToCart}
                            onWishlist={onToggleFavourite}
                            className="product-card-wrapper"
                        />
                    ))
                )}
            </div>
        </div>
    )
}
