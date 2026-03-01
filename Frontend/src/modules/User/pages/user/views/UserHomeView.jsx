import { useRef, useState, useEffect } from 'react'
import { ProductCard, CategoryCard, ChevronRightIcon, MapPinIcon, TruckIcon, SearchIcon, FilterIcon, CartIcon } from '../../../../../components/shared/catalog'
import { cn } from '../../../../../lib/cn'
import { useUserApi } from '../../../hooks/useUserApi'
import * as catalogApi from '../../../../../services/catalogApi'
import { Trans } from '../../../../../components/Trans'
import { TransText } from '../../../../../components/TransText'
import '../../../../../styles/home-redesign.css'
import '../../../../../styles/product-card.css'

const formatCategoryName = (name) => {
    if (!name) return name
    return name
}

export function UserHomeView({ onProductClick, onCategoryClick, onAddToCart, onSearchClick, onFilterClick, onToggleFavourite, favourites = [], onCartClick, cartCount = 0 }) {
    const categoriesRef = useRef(null)
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [popularProducts, setPopularProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const { getProducts } = useUserApi()
    const [carousels, setCarousels] = useState([])
    const [recentlyViewed, setRecentlyViewed] = useState([])
    const [bannerIndex, setBannerIndex] = useState(0)
    const [isUserInteracting, setIsUserInteracting] = useState(false)
    const autoSlideTimeoutRef = useRef(null)
    const touchStartXRef = useRef(null)
    const touchEndXRef = useRef(null)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // Fetch products (admin catalog)
                const result = await getProducts({ limit: 20 })
                if (result.data?.products) {
                    const allProducts = result.data.products
                    setProducts(allProducts)
                    // Use variants or default user price for initial items
                    setPopularProducts(allProducts.slice(0, 4))
                }

                // Fetch real categories from API
                const categoriesResult = await catalogApi.getCategories()
                if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
                    // Standardize category objects (ensure id, name, and image are present)
                    const standardizedCategories = categoriesResult.data.map(cat => ({
                        id: cat._id || cat.id,
                        name: cat.name || '',
                        image: cat.image?.url || cat.image || cat.icon || cat.imageUrl || null,
                        emoji: cat.emoji || '📦'
                    }))
                    setCategories(standardizedCategories)
                } else {
                    // Fallback to extraction from products
                    const cats = Array.from(new Set(result.data?.products?.map(p => p.category) || []))
                    setCategories(cats.map(c => ({
                        id: c.toLowerCase().replace(/\s+/g, '-'),
                        name: c.charAt(0).toUpperCase() + c.slice(1),
                        image: null,
                        emoji: '📦'
                    })))
                }

                // Fetch offers (carousels)
                const offersResult = await catalogApi.getOffers()
                if (offersResult.success && offersResult.data) {
                    const activeCarousels = (offersResult.data.carousels || [])
                        .filter(c => c.isActive !== false)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                    setCarousels(activeCarousels)
                }

                // Fetch Recently Viewed products from localStorage
                try {
                    const viewedIds = JSON.parse(localStorage.getItem('user_recently_viewed') || '[]')
                    if (viewedIds.length > 0) {
                        const viewedResult = await getProducts({ ids: viewedIds.join(','), limit: 10 })
                        if (viewedResult.data?.products) {
                            // Maintain the order from viewedIds
                            const sortedViewed = viewedIds
                                .map(id => viewedResult.data.products.find(p => (p._id || p.id) === id))
                                .filter(Boolean)
                            setRecentlyViewed(sortedViewed)
                        }
                    }
                } catch (e) {
                    console.error('Error loading recently viewed:', e)
                }

            } catch (error) {
                console.error('Error loading user catalog:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Carousel logic
    const resetAutoSlide = () => {
        if (autoSlideTimeoutRef.current) {
            clearTimeout(autoSlideTimeoutRef.current)
        }
        autoSlideTimeoutRef.current = setTimeout(() => {
            setIsUserInteracting(false)
        }, 5000)
    }

    useEffect(() => {
        if (isUserInteracting || carousels.length <= 1) return

        const interval = setInterval(() => {
            setBannerIndex((prev) => (prev + 1) % carousels.length)
        }, 4000)

        return () => clearInterval(interval)
    }, [isUserInteracting, carousels.length])

    const goToSlide = (index) => {
        setBannerIndex(index)
        setIsUserInteracting(true)
        resetAutoSlide()
    }

    // Swipe logic
    const handleTouchStart = (e) => {
        touchStartXRef.current = e.touches[0].clientX
        setIsUserInteracting(true)
    }

    const handleTouchMove = (e) => {
        touchEndXRef.current = e.touches[0].clientX
    }

    const handleTouchEnd = () => {
        if (!touchStartXRef.current || !touchEndXRef.current) return

        const distance = touchStartXRef.current - touchEndXRef.current
        const minSwipeDistance = 50

        if (Math.abs(distance) > minSwipeDistance) {
            if (distance > 0) {
                // Swipe left -> Next
                setBannerIndex((prev) => (prev + 1) % carousels.length)
            } else {
                // Swipe right -> Prev
                setBannerIndex((prev) => (prev - 1 + carousels.length) % carousels.length)
            }
        }

        resetAutoSlide()
        touchStartXRef.current = null
        touchEndXRef.current = null
    }

    const banners = carousels.length > 0
        ? carousels.map(carousel => ({
            id: carousel.id || carousel._id,
            title: carousel.title || '',
            subtitle: carousel.description || '',
            image: carousel.image || '',
            productIds: carousel.productIds || [],
        }))
        : []

    useEffect(() => {
        if (banners.length > 0 && bannerIndex >= banners.length) {
            setBannerIndex(0)
        }
    }, [banners.length, bannerIndex])

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
            showNewBadge: true,
            showRatingBadge: false,
        }
    }

    return (
        <div className="user-home-view user-home-view">
            {/* Main Banner Carousel */}
            {banners.length > 0 && (
                <section id="home-banner" className="home-banner-section">
                    <div
                        className="home-banner"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id}
                                className={cn(
                                    "home-banner__slide",
                                    index === bannerIndex ? "home-banner__slide--active" : "home-banner__slide--hidden"
                                )}
                                style={{ backgroundImage: `url(${banner.image})` }}
                                onClick={() => {
                                    if (banner.productIds && banner.productIds.length > 0) {
                                        onProductClick(`carousel:${banner.id}`)
                                    }
                                }}
                            />
                        ))}

                        {/* Pagination Indicators */}
                        {banners.length > 1 && (
                            <div className="home-banner__indicators">
                                {banners.map((_, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={cn(
                                            "home-banner__indicator",
                                            index === bannerIndex && "home-banner__indicator--active"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            goToSlide(index)
                                        }}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Premium Highlights Section */}
            <section id="home-try-new" className="home-try-new-section">
                <div className="home-try-new-header">
                    <h3 className="home-try-new-title"><span><Trans>Premium Highlights</Trans></span></h3>
                    <p className="home-try-new-subtitle"><Trans>Discover our most coveted pieces of the season.</Trans></p>
                </div>
                <div className="home-try-new-grid">
                    {loading ? (
                        [1, 2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)
                    ) : popularProducts.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>No products available</Trans></p>
                        </div>
                    ) : (
                        popularProducts.slice(0, 2).map((product) => (
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
            </section>

            {/* Latest Collections Section */}
            <section id="home-available-products" className="home-available-products-section">
                <div className="home-section-header">
                    <h3 className="home-section-title"><Trans>Latest Collections</Trans></h3>
                </div>
                <div className="home-products-grid">
                    {loading ? (
                        [1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)
                    ) : popularProducts.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>No products available</Trans></p>
                        </div>
                    ) : (
                        popularProducts.slice(0, 4).map((product) => (
                            <ProductCard
                                key={product._id || product.id}
                                product={{ ...formatProductForCard(product), showNewBadge: false }}
                                onNavigate={onProductClick}
                                onAddToCart={onAddToCart}
                                onWishlist={onToggleFavourite}
                                className="product-card-wrapper"
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Featured Designs Section */}
            <section id="home-premium-products" className="home-premium-products-section">
                <div className="home-premium-header">
                    <h3 className="home-premium-title"><Trans>Featured Designs</Trans></h3>
                    <h2 className="home-premium-subtitle font-serif"><Trans>नूर-ए-अदा सिग्नेचर</Trans></h2>
                </div>
                <div className="home-premium-grid">
                    {loading ? (
                        [1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-white/10 rounded-2xl animate-pulse" />)
                    ) : products.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-white"><Trans>No products available</Trans></p>
                        </div>
                    ) : (
                        products.slice(0, 4).map((product) => (
                            <div
                                key={product._id || product.id}
                                className="home-premium-card"
                                onClick={() => onProductClick(product._id || product.id)}
                            >
                                <div className="home-premium-card__image">
                                    <img
                                        src={product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300'}
                                        alt={product.name}
                                        className="home-premium-card__img"
                                    />
                                </div>
                                <p className="home-premium-card__name font-medium"><TransText>{product.name}</TransText></p>
                            </div>
                        ))
                    )}
                </div>
            </section>


            {/* Recently Viewed Section */}
            <section id="home-recently-viewed" className="home-recently-viewed-section mt-6">
                <div className="home-section-header">
                    <h3 className="home-section-title"><Trans>Recently Viewed</Trans></h3>
                </div>
                <div className="home-recently-viewed-rail">
                    {recentlyViewed.length > 0 ? (
                        recentlyViewed.slice(0, 10).map((product) => (
                            <div
                                key={product._id || product.id}
                                className="home-recently-card"
                                onClick={() => onProductClick(product._id || product.id)}
                            >
                                <div className="home-recently-card__image">
                                    <img
                                        src={product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300'}
                                        alt={product.name}
                                        className="home-recently-card__img"
                                    />
                                </div>
                                <div className="home-recently-card__content">
                                    <h4 className="home-recently-card__name"><TransText>{product.name}</TransText></h4>
                                    <p className="home-recently-card__price">
                                        ₹{formatProductForCard(product).price.toLocaleString('en-IN')}
                                    </p>
                                    <span className="home-recently-card__benefit"><Trans>Stock it now</Trans></span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 p-4"><Trans>No recently viewed products</Trans></p>
                    )}
                </div>
                <button className="home-recently-view-all" onClick={() => onProductClick('all')}>
                    <Trans>VIEW ALL</Trans> →
                </button>
            </section>

            {/* Shop By Category Section */}
            <section id="home-shop-category" className="home-shop-category-section mb-20">
                <div className="home-section-header">
                    <h3 className="home-section-title"><Trans>Shop By Category</Trans></h3>
                </div>
                <div className="home-shop-category-grid">
                    {loading ? (
                        [1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-full animate-pulse" />)
                    ) : categories.length === 0 ? (
                        <div className="flex items-center justify-center p-8 col-span-full">
                            <p className="text-sm text-gray-500"><Trans>No categories available</Trans></p>
                        </div>
                    ) : (
                        categories.slice(0, 12).map((category) => (
                            <div
                                key={category.id}
                                className="home-shop-category-card"
                                onClick={() => onCategoryClick?.(category.id)}
                            >
                                <div className="home-shop-category-card__image">
                                    {category.image ? (
                                        <img
                                            src={category.image}
                                            alt={category.name}
                                            className="home-shop-category-card__img"
                                        />
                                    ) : (
                                        <span className="home-shop-category-card__emoji">{category.emoji}</span>
                                    )}
                                </div>
                                <p className="home-shop-category-card__title">
                                    <TransText>{formatCategoryName(category.name)}</TransText>
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    )
}
