import { useState, useEffect } from 'react'
import { useUserState, useUserDispatch } from '../../../context/UserContext'
import { ProductCard, HeartIcon } from '../../../../../components/shared/catalog'
import { cn } from '../../../../../lib/cn'
import * as catalogApi from '../../../../../services/catalogApi'
import { TransText } from '../../../../../components/TransText'
import { Trans } from '../../../../../components/Trans'
import '../../../../../styles/product-card.css'

export function UserFavouritesView({ onProductClick, onAddToCart, onRemoveFromFavourites }) {
    const { favourites } = useUserState()
    const dispatch = useUserDispatch()
    const [favouriteProducts, setFavouriteProducts] = useState([])
    const [loading, setLoading] = useState(true)

    // Fetch favourite products from API
    useEffect(() => {
        const loadFavourites = async () => {
            setLoading(true)
            try {
                const productPromises = favourites.map(async (id) => {
                    try {
                        const result = await catalogApi.getProductDetails(id)
                        if (result.success && result.data?.product) {
                            return result.data.product
                        }
                        return null
                    } catch (error) {
                        console.error(`Error loading favourite product ${id}:`, error)
                        return null
                    }
                })
                const products = await Promise.all(productPromises)
                setFavouriteProducts(products.filter(Boolean))
            } catch (error) {
                console.error('Error loading favourites:', error)
            } finally {
                setLoading(false)
            }
        }

        if (favourites.length > 0) {
            loadFavourites()
        } else {
            setFavouriteProducts([])
            setLoading(false)
        }
    }, [favourites])

    const handleRemoveFromFavourites = (productId) => {
        dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
        onRemoveFromFavourites?.(productId)
    }

    const formatProductForCard = (product) => ({
        id: product._id || product.id,
        name: product.name,
        price: (product.attributeStocks && product.attributeStocks.length > 0)
            ? Math.min(...product.attributeStocks.map(a => a.userPrice))
            : (product.priceToUser || product.price || 0),
        image: product.images?.[0]?.url || product.primaryImage || 'https://via.placeholder.com/300',
        category: product.category,
        stock: product.displayStock || product.stock,
        description: product.description,
        shortDescription: product.shortDescription || product.description,
        isWishlisted: true,
        showNewBadge: false,
        showRatingBadge: true,
        rating: product.rating ?? product.averageRating,
        reviewCount: product.reviewCount ?? (product.reviews?.length || 0),
    })

    return (
        <div className="user-favourites-view space-y-6">
            <div className="user-favourites-view__header">
                <h2 className="user-favourites-view__title"><Trans>Catalog Favourites</Trans></h2>
                <p className="user-favourites-view__subtitle">
                    {favouriteProducts.length} {favouriteProducts.length === 1 ? <Trans>item saved</Trans> : <Trans>items saved</Trans>}
                </p>
            </div>

            {loading ? (
                <div className="user-favourites-view__empty">
                    <div className="user-favourites-view__empty-icon">
                        <HeartIcon className="h-16 w-16" filled={false} />
                    </div>
                    <h3 className="user-favourites-view__empty-title"><Trans>Loading favourites...</Trans></h3>
                </div>
            ) : favouriteProducts.length === 0 ? (
                <div className="user-favourites-view__empty">
                    <div className="user-favourites-view__empty-icon">
                        <HeartIcon className="h-16 w-16" filled={false} />
                    </div>
                    <h3 className="user-favourites-view__empty-title"><Trans>No favourites yet</Trans></h3>
                    <p className="user-favourites-view__empty-text">
                        <Trans>Start adding products to your catalog favourites by tapping the heart icon on any product in the home screen</Trans>
                    </p>
                </div>
            ) : (
                <div className="home-products-grid px-3 pb-20">
                    {favouriteProducts.map((product) => (
                        <ProductCard
                            key={product._id || product.id}
                            product={formatProductForCard(product)}
                            onNavigate={onProductClick}
                            onAddToCart={onAddToCart}
                            onWishlist={handleRemoveFromFavourites}
                            className="product-card-wrapper"
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
