import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { ADVANCE_PAYMENT_PERCENTAGE, REMAINING_PAYMENT_PERCENTAGE } from '../services/websiteData'
import * as websiteApi from '../services/websiteApi'
import { getPrimaryImageUrl } from '../utils/productImages'
import { openRazorpayCheckout } from '../../../utils/razorpay'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

const STEPS = [
  { id: 1, label: 'Summary' },
  { id: 2, label: 'Address & Shipping' },
  { id: 3, label: 'Payment' },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const { cart, profile } = useWebsiteState()
  const { createOrder, createPaymentIntent, confirmPayment } = useWebsiteApi()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [couponOpen, setCouponOpen] = useState(false)
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('razorpay')

  const [formData, setFormData] = useState({
    email: profile?.email || '',
    firstName: '',
    lastName: '',
    address: profile?.location?.address || '',
    apartment: '',
    city: profile?.location?.city || '',
    state: profile?.location?.state || 'Haryana',
    pincode: profile?.location?.pincode || '',
    phone: profile?.phone || '',
    country: 'India',
    useSameAddress: true,
    addNote: false,
    note: ''
  })

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart')
    }
  }, [cart, navigate])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice || item.price || 0) * item.quantity, 0)
    const discount = subtotal > 10000 ? subtotal * 0.1 : 0
    const delivery = shippingMethod === 'express' ? 500 : 300
    const total = subtotal - discount + delivery
    return { subtotal, discount, delivery, total }
  }, [cart, shippingMethod])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePlaceOrder = async () => {
    if (!formData.email || !formData.firstName || !formData.address || !formData.phone) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const orderData = {
        email: formData.email,
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone,
          country: formData.country,
        },
        shippingMethod,
        paymentMethod,
        orderNote: formData.note,
        paymentPreference: 'full'
      }

      const orderResult = await createOrder(orderData)
      if (orderResult.error) {
        throw new Error(orderResult.error.message || 'Failed to create order')
      }

      const order = orderResult.data.order

      const paymentIntentResult = await createPaymentIntent({
        orderId: order.id,
        paymentMethod: 'razorpay'
      })

      if (paymentIntentResult.error) {
        throw new Error(paymentIntentResult.error.message || 'Payment initialization failed')
      }

      const { razorpayOrderId, keyId, amount } = paymentIntentResult.data.paymentIntent

      const razorpayResponse = await openRazorpayCheckout({
        key: keyId,
        amount: amount,
        currency: 'INR',
        order_id: razorpayOrderId,
        name: 'Noor E Adah',
        description: `Payment for Order ${order.orderNumber || order.id}`,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        }
      })

      const confirmResult = await confirmPayment({
        orderId: order.id,
        paymentIntentId: paymentIntentResult.data.paymentIntent.id,
        gatewayPaymentId: razorpayResponse.paymentId,
        gatewayOrderId: razorpayResponse.orderId,
        gatewaySignature: razorpayResponse.signature,
        paymentMethod: 'razorpay'
      })

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message || 'Payment confirmation failed')
      }

      dispatch({ type: 'CLEAR_CART' })
      navigate('/order-confirmation', {
        state: { orderId: order.id, orderNumber: order.orderNumber }
      })
    } catch (err) {
      console.error('Order placement error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <Container className="checkout-page-new">
        {/* Breadcrumbs */}
        <div className="checkout-breadcrumbs">
          <Link to="/cart" className="checkout-breadcrumb-item">Shopping Cart</Link>
          <span className="checkout-breadcrumb-item">→</span>
          <span className="checkout-breadcrumb-item active">Checkout</span>
          <span className="checkout-breadcrumb-item">→</span>
          <span className="checkout-breadcrumb-item">Order Complete</span>
        </div>

        <div className="checkout-layout-grid">
          {/* Left: Form Sections */}
          <div className="checkout-forms">
            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 text-[11px] font-bold tracking-wider uppercase border border-red-100">
                {error}
              </div>
            )}

            {/* Contact Information */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Contact information</h2>
              <p className="checkout-section-subtitle">We'll use this email to send you details and updates about your order.</p>
              <div className="checkout-form-group">
                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                    className="checkout-input"
                  />
                  <p className="mt-4 text-[11px] font-semibold text-brand/40 italic">You are currently checking out as a guest.</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Shipping address</h2>
              <p className="checkout-section-subtitle">Enter the address where you want your order delivered.</p>
              <div className="checkout-form-group">
                <div className="space-y-4">
                  <div className="checkout-field">
                    <label className="checkout-label">Country/Region</label>
                    <select name="country" value={formData.country} onChange={handleInputChange} className="checkout-select">
                      <option>India</option>
                    </select>
                  </div>

                  <div className="checkout-input-row">
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First name" className="checkout-input" />
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" className="checkout-input" />
                  </div>

                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Address" className="checkout-input" />

                  <button className="text-[11px] font-bold text-brand/60 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">+</span> Add apartment, suite, etc.
                  </button>

                  <div className="checkout-input-row">
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="City" className="checkout-input" />
                    <select name="state" value={formData.state} onChange={handleInputChange} className="checkout-select">
                      <option>Haryana</option>
                      <option>Delhi</option>
                      <option>Punjab</option>
                    </select>
                  </div>

                  <div className="checkout-input-row">
                    <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="PIN Code" className="checkout-input" />
                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone (optional)" className="checkout-input" />
                  </div>

                  <label className="checkout-checkbox-group">
                    <input type="checkbox" name="useSameAddress" checked={formData.useSameAddress} onChange={handleInputChange} className="checkout-checkbox" />
                    <span>Use same address for billing</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Shipping Options */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Shipping options</h2>
              <div className="space-y-4">
                <div
                  className={`checkout-option-box ${shippingMethod === 'standard' ? 'active' : ''}`}
                  onClick={() => setShippingMethod('standard')}
                >
                  <div className="checkout-option-main">
                    <div className="checkout-option-radio">
                      <div className="checkout-option-radio-inner" />
                    </div>
                    <span className="checkout-option-name">Standard Shipping</span>
                  </div>
                  <span className="checkout-option-price">₹300.00</span>
                </div>

                <div
                  className={`checkout-option-box ${shippingMethod === 'express' ? 'active' : ''}`}
                  onClick={() => setShippingMethod('express')}
                >
                  <div className="checkout-option-main">
                    <div className="checkout-option-radio">
                      <div className="checkout-option-radio-inner" />
                    </div>
                    <span className="checkout-option-name">Express Shipping</span>
                  </div>
                  <span className="checkout-option-price">₹800.00</span>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="checkout-section">
              <h2 className="checkout-section-title">Payment options</h2>
              <div className="checkout-option-box active cursor-default">
                <div className="checkout-option-main">
                  <div className="checkout-option-radio">
                    <div className="checkout-option-radio-inner" />
                  </div>
                  <div className="checkout-option-info">
                    <span className="checkout-option-name italic lowercase">Pay by Razorpay</span>
                    <p className="payment-details-text">Pay securely by Credit or Debit card or Internet Banking through Razorpay.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Actions */}
            <div className="space-y-12 mt-16">
              <label className="checkout-checkbox-group cursor-pointer">
                <input type="checkbox" name="addNote" checked={formData.addNote} onChange={handleInputChange} className="checkout-checkbox" />
                <span className="uppercase tracking-widest text-[10px]">Add a note to your order</span>
              </label>

              {formData.addNote && (
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Enter your special instructions..."
                  className="checkout-input min-h-[100px]"
                />
              )}

              <div className="border-t border-black/5" />

              <p className="legal-text">
                By proceeding with your purchase you agree to our <Link to="/terms">Terms and Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>
              </p>

              <div className="checkout-footer-actions">
                <Link to="/cart" className="return-to-cart-link">
                  ← Return to Cart
                </Link>
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="place-order-btn"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Order Summary Sidebar */}
          <div className="checkout-summary-section">
            <div className="checkout-summary-card">
              <h3 className="checkout-summary-title">Order summary</h3>

              <div className="checkout-summary-items">
                {cart.map((item) => (
                  <div key={item.id || item.cartItemId} className="checkout-summary-item">
                    <div className="checkout-summary-item-image-box">
                      <img src={item.image} alt={item.name} />
                      <div className="checkout-summary-item-qty-badge">{item.quantity}</div>
                    </div>
                    <div className="checkout-summary-item-info">
                      <h4 className="checkout-summary-item-name uppercase">{item.name}</h4>
                      <p className="checkout-summary-item-meta uppercase italic">₹{(item.unitPrice || item.price || 0).toLocaleString('en-IN')}</p>
                      <div className="checkout-summary-item-sub-meta uppercase italic tracking-wider">
                        <span>Size: {item.variantAttributes?.Size || 'S'}</span>
                      </div>
                    </div>
                    <div className="checkout-summary-item-price">
                      ₹{((item.unitPrice || item.price || 0) * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Totals */}
              <div className="space-y-6 pt-8 border-t border-black/5">
                <button
                  onClick={() => setCouponOpen(!couponOpen)}
                  className="collapsible-header"
                >
                  <span>Add a coupon</span>
                  <svg className={`w-3 h-3 transition-transform ${couponOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {couponOpen && (
                  <div className="py-2 flex gap-2">
                    <input type="text" className="checkout-input" placeholder="Coupon code" />
                    <button className="bg-brand text-white px-5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Apply</button>
                  </div>
                )}

                <div className="sidebar-row">
                  <span className="sidebar-row-label">Subtotal</span>
                  <span className="sidebar-row-value">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="sidebar-row">
                    <span className="sidebar-row-label flex items-center">
                      Discount
                      <span className="discount-badge">spec10</span>
                    </span>
                    <span className="sidebar-row-value text-green-600">-₹{totals.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="sidebar-row">
                  <span className="sidebar-row-label">Delivery</span>
                  <span className="sidebar-row-value">₹{totals.delivery.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-6 border-t border-black/5 flex justify-between items-baseline">
                  <span className="text-[16px] font-black uppercase text-brand">Total</span>
                  <span className="text-[16px] font-black text-brand">₹{totals.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Layout>
  )
}
