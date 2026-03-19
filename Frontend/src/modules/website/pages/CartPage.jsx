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

const MAJOR_COUNTRIES = [
  'India',
  'United Arab Emirates',
  'Saudi Arabia',
  'Kuwait',
  'Qatar',
  'Oman',
  'Bahrain',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Singapore',
  'Germany',
  'France',
  'Italy',
  'Japan',
  'Netherlands',
  'Spain',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Hong Kong',
  'Malaysia',
  'New Zealand',
  'South Africa'
]

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

export function CartPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { cart, checkoutAddress } = useWebsiteState()
  const { updateCartItem, removeFromCart } = useWebsiteApi()

  const [cartProducts, setCartProducts] = useState({})
  const [couponOpen, setCouponOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(true)
  const [deliveryConfig, setDeliveryConfig] = useState(null)
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

  // Fetch delivery config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const result = await websiteApi.getDeliveryConfig()
        if (result?.success) {
          setDeliveryConfig(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch delivery config:', err)
      }
    }
    fetchConfig()
  }, [])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice || item.price || 0) * item.quantity, 0)
    const discount = subtotal > 10000 ? subtotal * 0.1 : 0 // Example discount
    
    // Calculate delivery dynamically
    let delivery = 0
    if (deliveryConfig) {
      const zone = checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international'
      const zoneConfig = deliveryConfig[zone] || {}
      
      // Handle free delivery threshold
      if (deliveryConfig.mode === 'free' || (zoneConfig.minFreeDelivery && subtotal >= zoneConfig.minFreeDelivery)) {
        delivery = 0
      } else {
        if (shippingMethod === 'express') {
          delivery = zoneConfig.expressCharge || (zoneConfig.charge * 2) || 800
        } else {
          delivery = zoneConfig.charge || 300
        }
      }
    } else {
      delivery = shippingMethod === 'express' ? 500 : 300
    }
    
    const total = subtotal - discount + delivery

    return { subtotal, discount, delivery, total }
  }, [cart, shippingMethod, deliveryConfig, checkoutAddress.country])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    dispatch({
      type: 'UPDATE_CHECKOUT_ADDRESS',
      payload: { [name]: value }
    })
    
    if (name === 'country' && value === 'India') {
      dispatch({
        type: 'UPDATE_CHECKOUT_ADDRESS',
        payload: { state: 'Haryana' }
      })
    }
  }

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
                  <span className="uppercase text-[11px] tracking-widest">Delivers to {checkoutAddress.state || checkoutAddress.country}</span>
                  <svg className={`w-3 h-3 transition-transform ${deliveryOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {deliveryOpen && (
                  <div className="address-fields-grid">
                    <select name="country" value={checkoutAddress.country} onChange={handleInputChange} className="cart-select-field">
                      {MAJOR_COUNTRIES.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    
                    <div className="my-2">
                      {checkoutAddress.country === 'India' ? (
                        <select 
                          name="state" 
                          value={checkoutAddress.state} 
                          onChange={handleInputChange} 
                          className="cart-select-field"
                        >
                          <option value="">Select State</option>
                          {INDIA_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          name="state" 
                          value={checkoutAddress.state} 
                          onChange={handleInputChange} 
                          placeholder="State / Region" 
                          className="cart-input-field" 
                        />
                      )}
                    </div>

                    <input type="text" name="city" value={checkoutAddress.city} onChange={handleInputChange} className="cart-input-field" placeholder="City" />
                    <input type="text" name="pincode" value={checkoutAddress.pincode} onChange={handleInputChange} className="cart-input-field" placeholder="PIN Code" />
                    <button className="check-options-btn" onClick={() => setDeliveryOpen(false)}>Update Estimate</button>
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
                    readOnly
                    className="shipping-option-radio"
                  />
                  <div className="shipping-option-label">
                    <span className="shipping-name uppercase">Standard Shipping</span>
                    <span className="shipping-price text-[11px] font-bold">
                      {deliveryConfig ? (
                        (deliveryConfig.mode === 'free' || (deliveryConfig[checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international']?.minFreeDelivery && totals.subtotal >= deliveryConfig[checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international'].minFreeDelivery)) ? 'Free' : `₹${(deliveryConfig[checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international']?.charge || 300).toLocaleString('en-IN')}`
                      ) : '₹300.00'}
                    </span>
                  </div>
                </div>

                {/* Only show express if enabled in admin */}
                {(!deliveryConfig || (deliveryConfig[checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international']?.isExpressEnabled !== false)) && (
                  <div
                    className="shipping-option-item"
                    onClick={() => setShippingMethod('express')}
                  >
                    <input
                      type="radio"
                      checked={shippingMethod === 'express'}
                      readOnly
                      className="shipping-option-radio"
                    />
                    <div className="shipping-option-label">
                      <span className="shipping-name uppercase">Express Shipping</span>
                      <span className="shipping-price text-[11px] font-bold">
                        {deliveryConfig ? (
                          `₹${(deliveryConfig[checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international']?.expressCharge || (deliveryConfig[checkoutAddress.country.toLowerCase() === 'india' ? 'domestic' : 'international']?.charge * 2) || 800).toLocaleString('en-IN')}`
                        ) : '₹800.00'}
                      </span>
                    </div>
                  </div>
                )}
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
