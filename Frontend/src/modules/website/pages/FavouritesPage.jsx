import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

export function FavouritesPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { favourites, authenticated } = useWebsiteState()
  const { removeFromFavourites, addToCart } = useWebsiteApi()
  
  const [favouriteProducts, setFavouriteProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch favourite products from API
  useEffect(() => {
    const loadFavourites = async () => {
      setLoading(true)
      try {
        const productPromises = favourites.map(async (id) => {
          try {
            const result = await websiteApi.getProductDetails(id)
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

  const handleRemoveFromFavourites = async (productId) => {
    try {
      await removeFromFavourites(productId)
      dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
    } catch (error) {
      console.error('Error removing from favourites:', error)
    }
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

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
  }

  return (
    <Layout>
      <Container className="favourites-page">
        <div className="favourites-page__header">
          <h1 className="favourites-page__title">My Favourites</h1>
          <p className="favourites-page__subtitle">
            {favouriteProducts.length} {favouriteProducts.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        {loading ? (
          <div className="favourites-page__empty">
            <div className="favourites-page__empty-icon">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="favourites-page__empty-title">Loading favourites...</h3>
          </div>
        ) : favouriteProducts.length === 0 ? (
          <div className="favourites-page__empty">
            <div className="favourites-page__empty-icon">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="favourites-page__empty-title">No favourites yet</h3>
            <p className="favourites-page__empty-text">
              Start adding products to your favourites by clicking the heart icon on any product
            </p>
          </div>
        ) : (
          <div className="favourites-page__grid">
            {favouriteProducts.map((product) => {
              const productId = product._id || product.id
              const inStock = (product.stock || 0) > 0
              const productImage = getPrimaryImageUrl(product)
              
              return (
                <div
                  key={productId}
                  className="favourites-page__card"
                  onClick={() => handleProductClick(productId)}
                >
                  <div className="favourites-page__card-image-wrapper">
                    <img
                      src={productImage}
                      alt={product.name}
                      className="favourites-page__card-image"
                    />
                    <button
                      type="button"
                      className="favourites-page__card-wishlist"
                      onClick={(e) => handleRemoveFromFavourites(productId)}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="#ef4444"
                        stroke="#ef4444"
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
                  </div>
                  <h3 className="favourites-page__card-title">{product.name}</h3>
                  <div className="favourites-page__card-price">
                    ₹{(product.priceToUser || product.price || 0).toLocaleString('en-IN')}
                  </div>
                  <button
                    className="favourites-page__card-button"
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









