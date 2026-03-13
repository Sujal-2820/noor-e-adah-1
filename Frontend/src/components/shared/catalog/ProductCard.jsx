import { cn } from '../../../lib/cn'
import { StarIcon, HeartIcon } from './icons'
import { getPrimaryImageUrl } from '../../../utils/productImages'
import { TransText } from '../../TransText'
import { Trans } from '../../Trans'

import { useTranslation } from '../../../context/TranslationContext'

export function ProductCard({ product: rawProduct, onAddToCart, onWishlist, onNavigate, className }) {
    const { translateProduct } = useTranslation()
    const product = translateProduct(rawProduct)

    const inStock = product.stock > 0
    const stockStatus = product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'
    const productImage = getPrimaryImageUrl(product)

    // Translate stock status
    const stockStatusText = stockStatus === 'In Stock' ? 'In Stock' : stockStatus === 'Low Stock' ? 'Low Stock' : 'Out of Stock'

    return (
        <div
            className={cn(
                'product-card-wrapper',
                !inStock && 'product-card-wrapper--out-of-stock',
                className
            )}
            onClick={() => onNavigate?.(product.id)}
        >
            <div className="product-card-wrapper__image">
                <img src={productImage} alt={product.name} className="product-card-wrapper__image-img" />
                
                {!inStock && (
                    <div className="product-card-wrapper__image-overlay">
                        <span className="product-card-wrapper__out-of-stock-label">
                            <Trans>Out of Stock</Trans>
                        </span>
                    </div>
                )}

                {/* Rating Badge - only show if showRatingBadge prop is true */}
                {product.showRatingBadge && (product.rating || product.averageRating) && (
                    <div className="product-card-wrapper__rating-badge">
                        {(product.rating ?? product.averageRating ?? 0).toFixed(1)}
                    </div>
                )}
                {/* NEW Badge - only show if showNewBadge prop is true */}
                {product.showNewBadge && (
                    <div className="product-card-wrapper__new-badge">
                        NEW
                    </div>
                )}
                <button
                    type="button"
                    className="product-card-wrapper__wishlist-btn"
                    onClick={(e) => {
                        e.stopPropagation()
                        onWishlist?.(product.id)
                    }}
                    aria-label="Add to wishlist"
                >
                    <HeartIcon className="h-4 w-4" filled={product.isWishlisted} />
                </button>
            </div>
            <div className="product-card-wrapper__content">
                <div className="product-card-wrapper__header">
                    <h3 className="product-card-wrapper__title">{product.name}</h3>
                    {(product.shortDescription || product.description) && (
                        <p className="product-card-wrapper__description">
                            {(product.shortDescription || product.description)
                                .replace(/<[^>]*>?/gm, '')
                                .replace(/&nbsp;/g, ' ')
                                .slice(0, 100)}
                        </p>
                    )}
                    {product.user && (
                        <p className="product-card-wrapper__user"><TransText>{product.user.name}</TransText></p>
                    )}
                </div>
                <div className="product-card-wrapper__rating">
                    <div className="product-card-wrapper__stars">
                        {[1, 2, 3, 4, 5].map((star) => {
                            // Get rating from product.rating or product.averageRating
                            const rating = product.rating ?? product.averageRating ?? 0
                            return (
                                <StarIcon
                                    key={star}
                                    className="h-3 w-3 text-yellow-400"
                                    filled={star <= Math.round(rating)}
                                />
                            )
                        })}
                    </div>
                    <span className="product-card-wrapper__rating-value">
                        {(() => {
                            // Get rating from product.rating or product.averageRating
                            const rating = product.rating ?? product.averageRating ?? 0
                            return typeof rating === 'number'
                                ? rating.toFixed(1)
                                : parseFloat(rating || 0).toFixed(1)
                        })()}
                    </span>
                    <span className="product-card-wrapper__reviews">
                        ({(() => {
                            // Get review count from product.reviews or product.reviewCount
                            const reviewCount = product.reviews ?? product.reviewCount ?? 0
                            return `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`
                        })()})
                    </span>
                </div>
                <div className="product-card-wrapper__price-section">
                    <span className="product-card-wrapper__price">₹{(product.priceToUser || product.price || 0).toLocaleString('en-IN')}</span>
                    {product.originalPrice && product.originalPrice > (product.priceToUser || product.price || 0) && (
                        <span className="product-card-wrapper__original-price">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    )}
                </div>
                <div className="product-card-wrapper__stock">
                    <span className={cn(
                        'product-card-wrapper__stock-badge',
                        inStock ? 'product-card-wrapper__stock-badge--in-stock' : 'product-card-wrapper__stock-badge--out-of-stock'
                    )}>
                        <TransText>{stockStatus}</TransText>
                    </span>
                    {inStock && product.stock <= 10 && (
                        <span className="product-card-wrapper__stock-warning"><Trans>Only</Trans> {product.stock} <Trans>left!</Trans></span>
                    )}
                </div>
                <button
                    type="button"
                    className={cn(
                        'product-card-wrapper__add-btn',
                        !inStock && 'product-card-wrapper__add-btn--disabled'
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (inStock) {
                            onAddToCart?.(product.id)
                        }
                    }}
                    disabled={!inStock}
                >
                    {inStock ? <Trans>Add to Cart</Trans> : <Trans>Out of Stock</Trans>}
                </button>
            </div>
        </div>
    )
}
