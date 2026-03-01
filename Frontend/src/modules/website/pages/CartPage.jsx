import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { MIN_ORDER_VALUE } from '../services/websiteData'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl, getImageUrlAt } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

export function CartPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { cart } = useWebsiteState()
  const { updateCartItem, removeFromCart } = useWebsiteApi()

  const [cartProducts, setCartProducts] = useState({})
  const [couponOpen, setCouponOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(true)
  const [shippingMethod, setShippingMethod] = useState('standard')
  const fetchingProductsRef = useRef(new Set())

  // Fetch product details for cart items
  useEffect(() => {
    const productsToFetch = cart.filter(item =>
      !cartProducts[item.productId] && !fetchingProductsRef.current.has(item.productId)
    )

    if (productsToFetch.length > 0) {
      productsToFetch.forEach(async (item) => {
        fetchingProductsRef.current.add(item.productId)
        try {
          const result = await websiteApi.getProductDetails(item.productId)
          if (result.success && result.data?.product) {
            setCartProducts(prev => ({ ...prev, [item.productId]: result.data.product }))
          }
        } catch (error) {
          console.error(`Error loading product ${item.productId}:`, error)
        } finally {
          fetchingProductsRef.current.delete(item.productId)
        }
      })
    }
  }, [cart, cartProducts])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice || item.price || 0) * item.quantity, 0)
    const discount = subtotal > 10000 ? subtotal * 0.1 : 0 // Example discount
    const delivery = shippingMethod === 'express' ? 500 : 300
    const total = subtotal - discount + delivery

    return { subtotal, discount, delivery, total }
  }, [cart, shippingMethod])

  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return
    try {
      await updateCartItem(cartItemId, newQuantity)
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const handleRemove = async (cartItemId) => {
    try {
      await removeFromCart(cartItemId)
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  if (cart.length === 0) {
    return (
      <Layout>
        <Container className="cart-page-new">
          <div className="text-center py-20 space-y-8">
            <h1 className="text-[28px] font-serif uppercase tracking-[0.1em]">Your cart is currently empty</h1>
            <p className="text-brand/40 text-xs tracking-widest uppercase">Add some pieces to get started</p>
            <Link to="/home/shop" className="inline-block bg-brand text-white px-12 py-5 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all">
              Return to shop
            </Link>
          </div>
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container className="cart-page-new">
        {/* Breadcrumbs */}
        <div className="cart-breadcrumbs">
          <span className="cart-breadcrumb-item active">Shopping Cart</span>
          <span className="cart-breadcrumb-item">→</span>
          <span className="cart-breadcrumb-item">Checkout</span>
          <span className="cart-breadcrumb-item">→</span>
          <span className="cart-breadcrumb-item">Order Complete</span>
        </div>

        <div className="cart-layout-grid">
          {/* Left: Product Table */}
          <div className="cart-items-section">
            <div className="cart-table-header">
              <span className="cart-table-label">Product</span>
              <span className="cart-table-label">Total</span>
            </div>

            <div className="divide-y divide-black/5">
              {cart.map((item) => (
                <div key={item.id || item.cartItemId} className="cart-item-new">
                  <div className="cart-item-product-info">
                    <div className="cart-item-image-box">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="cart-item-details">
                      <div className="space-y-2">
                        <h3 className="cart-item-title uppercase line-clamp-2">{item.name}</h3>
                        <p className="cart-item-price">₹{(item.unitPrice || item.price || 0).toLocaleString('en-IN')}</p>
                        <div className="cart-item-meta uppercase tracking-wider">
                          <span>Size: {item.variantAttributes?.Size || 'S'}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-4">
                        <div className="cart-quantity-box">
                          <button
                            className="cart-quantity-btn"
                            onClick={() => handleUpdateQuantity(item.id || item.cartItemId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 12H4" /></svg>
                          </button>
                          <span className="cart-quantity-input">{item.quantity}</span>
                          <button
                            className="cart-quantity-btn"
                            onClick={() => handleUpdateQuantity(item.id || item.cartItemId, item.quantity + 1)}
                          >
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg>
                          </button>
                        </div>
                        <button
                          className="cart-remove-link w-fit"
                          onClick={() => handleRemove(item.id || item.cartItemId)}
                        >
                          Remove item
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="cart-item-total pt-1">
                    ₹{((item.unitPrice || item.price || 0) * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Cart Totals */}
          <div className="cart-totals-section">
            <div className="cart-sidebar-card">
              <h2 className="cart-sidebar-title">Cart Totals</h2>

              {/* Coupon Collapsible */}
              <div className="border-b border-black/5">
                <button
                  onClick={() => setCouponOpen(!couponOpen)}
                  className="collapsible-header"
                >
                  <span>Add a coupon</span>
                  <svg className={`w-3 h-3 transition-transform ${couponOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {couponOpen && (
                  <div className="py-5 flex gap-2">
                    <input type="text" className="cart-input-field" placeholder="Coupon code" />
                    <button className="bg-brand text-white px-5 text-[10px] font-bold uppercase tracking-widest">Apply</button>
                  </div>
                )}
              </div>

              {/* Summary Rows */}
              <div className="sidebar-row">
                <span className="sidebar-row-label">Subtotal</span>
                <span className="sidebar-row-value">₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {totals.discount > 0 && (
                <div className="sidebar-row">
                  <span className="sidebar-row-label flex items-center">
                    Discount
                    <span className="discount-badge">special</span>
                  </span>
                  <span className="sidebar-row-value text-green-600">-₹{totals.discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="sidebar-row">
                <span className="sidebar-row-label">Delivery</span>
                <span className="sidebar-row-value">₹{totals.delivery.toLocaleString('en-IN')}</span>
              </div>

              {/* Delivery Address Collapsible */}
              <div className="border-b border-black/5">
                <button
                  onClick={() => setDeliveryOpen(!deliveryOpen)}
                  className="collapsible-header"
                >
                  <span className="uppercase text-[11px] tracking-widest">Delivers to Haryana, India</span>
                  <svg className={`w-3 h-3 transition-transform ${deliveryOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {deliveryOpen && (
                  <div className="address-fields-grid">
                    <select className="cart-select-field">
                      <option>India</option>
                    </select>
                    <input type="text" className="cart-input-field" placeholder="City" />
                    <select className="cart-select-field">
                      <option>Haryana</option>
                    </select>
                    <input type="text" className="cart-input-field" placeholder="PIN Code" />
                    <button className="check-options-btn">Check Delivery Options</button>
                  </div>
                )}
              </div>

              {/* Shipping Options */}
              <div className="shipping-options-list">
                <div
                  className="shipping-option-item"
                  onClick={() => setShippingMethod('standard')}
                >
                  <input
                    type="radio"
                    checked={shippingMethod === 'standard'}
                    onChange={() => { }}
                    className="shipping-option-radio"
                  />
                  <div className="shipping-option-label">
                    <span className="shipping-name uppercase">Standard Shipping</span>
                    <span className="shipping-price">₹300.00</span>
                  </div>
                </div>
                <div
                  className="shipping-option-item"
                  onClick={() => setShippingMethod('express')}
                >
                  <input
                    type="radio"
                    checked={shippingMethod === 'express'}
                    onChange={() => { }}
                    className="shipping-option-radio"
                  />
                  <div className="shipping-option-label">
                    <span className="shipping-name uppercase">Express Shipping</span>
                    <span className="shipping-price">₹500.00</span>
                  </div>
                </div>
              </div>

              {/* Final Total */}
              <div className="cart-total-footer">
                <span className="cart-total-label">Total</span>
                <span className="cart-total-amount">₹{totals.total.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="proceed-checkout-btn"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </Container>
    </Layout>
  )
}
