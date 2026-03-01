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
  const { cart, profile, assignedUser, userAvailability } = useWebsiteState()
  const { createOrder, createPaymentIntent, confirmPayment } = useWebsiteApi()

  const [currentStep, setCurrentStep] = useState(1)
  const [summaryExpanded, setSummaryExpanded] = useState(true)
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [paymentPreference, setPaymentPreference] = useState('partial')
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)
  const [cartProducts, setCartProducts] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart')
    }
  }, [cart, navigate])

  // Get delivery address from user profile
  const deliveryAddress = useMemo(() => {
    if (!profile?.location || !profile.location.city || !profile.location.state || !profile.location.pincode) {
      return null
    }
    return {
      name: profile.name || 'Home',
      address: profile.location.address || '',
      city: profile.location.city,
      state: profile.location.state,
      pincode: profile.location.pincode,
      phone: profile.phone || '',
    }
  }, [profile])

  // Fetch product details for cart items
  useEffect(() => {
    const loadCartProducts = async () => {
      const productMap = {}
      for (const item of cart) {
        try {
          const result = await websiteApi.getProductDetails(item.productId)
          if (result.success && result.data?.product) {
            productMap[item.productId] = result.data.product
          }
        } catch (error) {
          console.error(`Error loading product ${item.productId}:`, error)
        }
      }
      setCartProducts(productMap)
    }

    if (cart.length > 0) {
      loadCartProducts()
    }
  }, [cart])

  const cartItems = useMemo(() => {
    return cart.map((item) => {
      const product = cartProducts[item.productId]
      const price = item.unitPrice || item.price || (product ? (product.priceToUser || product.price || 0) : 0)
      return {
        ...item,
        product,
        price: typeof price === 'number' && !isNaN(price) ? price : 0,
        unitPrice: price,
        image: item.image || (product ? getPrimaryImageUrl(product) : 'https://via.placeholder.com/300'),
        name: item.name || product?.name || 'Unknown Product',
      }
    })
  }, [cart, cartProducts])

  // Group items by productId with variants
  const groupedCartItems = useMemo(() => {
    const grouped = {}

    cartItems.forEach((item) => {
      const product = cartProducts[item.productId]
      const unitPrice = item.unitPrice || item.price || (product ? (product.priceToUser || product.price || 0) : 0)
      const variantAttrs = item.variantAttributes || {}
      const hasVariants = variantAttrs && typeof variantAttrs === 'object' && Object.keys(variantAttrs).length > 0
      const key = item.productId

      if (!grouped[key]) {
        grouped[key] = {
          productId: item.productId,
          product,
          name: item.name || product?.name || 'Product',
          image: product ? getPrimaryImageUrl(product) : (item.image || 'https://via.placeholder.com/400'),
          variants: [],
          hasVariants: false,
        }
      }

      const variantItem = {
        ...item,
        id: item.id || item._id || item.cartItemId,
        cartItemId: item.id || item._id || item.cartItemId,
        product,
        unitPrice,
        variantAttributes: variantAttrs,
        hasVariants,
      }

      grouped[key].variants.push(variantItem)

      if (hasVariants) {
        grouped[key].hasVariants = true
      }
    })

    return Object.values(grouped)
  }, [cartItems, cartProducts])

  const isFullPayment = paymentPreference === 'full'

  const paymentOptions = [
    {
      id: 'partial',
      title: 'Pay 30% now, 70% later',
      description: 'Keep the standard split. Remaining amount is collected after delivery.',
      badge: 'Standard',
    },
    {
      id: 'full',
      title: 'Pay 100% now',
      description: 'Settle the entire order upfront and skip delivery charges automatically.',
      badge: 'Free Delivery',
    },
  ]

  const shippingOptions = [
    { id: 'standard', label: 'Standard Delivery', cost: 50, time: '24 hours', minOrder: 5000 },
  ]

  const selectedShipping = shippingOptions.find((s) => s.id === shippingMethod) || shippingOptions[0]

  const totals = useMemo(() => {
    const subtotal = groupedCartItems.reduce((sum, group) => {
      return sum + group.variants.reduce((variantSum, variant) => {
        const itemPrice = typeof variant.unitPrice === 'number' && !isNaN(variant.unitPrice) ? variant.unitPrice : 0
        const itemQuantity = typeof variant.quantity === 'number' && !isNaN(variant.quantity) ? variant.quantity : 0
        return variantSum + (itemPrice * itemQuantity)
      }, 0)
    }, 0)

    const deliveryBeforeBenefit = subtotal >= (selectedShipping.minOrder || Infinity) ? 0 : selectedShipping.cost
    const delivery = paymentPreference === 'full' ? 0 : deliveryBeforeBenefit
    const discount = 0
    const total = subtotal + delivery - discount
    const advance =
      paymentPreference === 'full'
        ? total
        : Math.round((total * ADVANCE_PAYMENT_PERCENTAGE) / 100)
    const remaining = total - advance

    return {
      subtotal: isNaN(subtotal) ? 0 : subtotal,
      delivery: isNaN(delivery) ? 0 : delivery,
      deliveryBeforeBenefit: isNaN(deliveryBeforeBenefit) ? 0 : deliveryBeforeBenefit,
      discount: isNaN(discount) ? 0 : discount,
      total: isNaN(total) ? 0 : total,
      advance: isNaN(advance) ? 0 : advance,
      remaining: isNaN(remaining) ? 0 : remaining,
    }
  }, [groupedCartItems, selectedShipping, paymentPreference])

  const amountDueNow = totals.advance
  const amountDueLater = totals.remaining
  const paymentDueNowLabel = isFullPayment ? 'Full Payment (100%)' : `Advance (${ADVANCE_PAYMENT_PERCENTAGE}%)`
  const paymentDueLaterLabel = isFullPayment
    ? 'After Delivery'
    : `Remaining (${REMAINING_PAYMENT_PERCENTAGE}%)`

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate('/cart')
    }
  }

  const handlePlaceOrder = () => {
    // Proximity checks removed per user request (20km rule retired)
    if (!deliveryAddress) {
      setError('Please update your delivery address in settings before placing an order')
      return
    }

    // Show payment confirmation modal WITHOUT creating order
    // Order will only be created when user confirms payment
    const uiPayment = {
      paymentPreference,
      amountDueNow,
      amountDueLater,
      deliveryWaived: isFullPayment && totals.deliveryBeforeBenefit > 0,
    }

    // Store preview data (not actual order) - order will be created on confirmation
    setPendingOrder({
      preview: true, // Flag to indicate this is preview, not actual order
      uiPayment,
      total: totals.total,
    })
    setShowPaymentConfirm(true)
  }

  const handleConfirmPayment = async () => {
    if (!pendingOrder) {
      setError('Order information is missing')
      return
    }

    // Block order placement if no user available (beyond 20.3km)
    // Allow if in buffer zone (20km to 20.3km)
    // Proximity checks removed per user request (20km rule retired)
    if (!deliveryAddress) {
      setError('Please update your delivery address in settings before placing an order')
      setShowPaymentConfirm(false)
      setPendingOrder(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const paymentAmount = pendingOrder.uiPayment?.amountDueNow ?? amountDueNow

      // Create order via API FIRST (only when user confirms payment)
      const orderData = {
        paymentPreference,
        notes: `Shipping method: ${selectedShipping.label}`,
      }

      const orderResult = await createOrder(orderData)
      if (orderResult.error) {
        setError(orderResult.error.message || 'Failed to create order')
        setLoading(false)
        setShowPaymentConfirm(false)
        setPendingOrder(null)
        return
      }

      const order = orderResult.data.order

      // Update pendingOrder with actual order data
      const updatedPendingOrder = {
        ...order,
        uiPayment: pendingOrder.uiPayment,
      }
      setPendingOrder(updatedPendingOrder)

      const paymentIntentResult = await createPaymentIntent({
        orderId: order.id,
        paymentMethod: paymentMethod,
      })

      if (paymentIntentResult.error) {
        setError(paymentIntentResult.error.message || 'Failed to initialize payment')
        setLoading(false)
        return
      }

      const { paymentIntent } = paymentIntentResult.data
      const { razorpayOrderId, keyId, amount } = paymentIntent

      if (!razorpayOrderId || !keyId || !amount || amount <= 0) {
        setError('Invalid payment configuration. Please try again.')
        setLoading(false)
        return
      }

      try {
        const razorpayResponse = await openRazorpayCheckout({
          key: keyId,
          amount: amount,
          currency: 'INR',
          order_id: razorpayOrderId,
          name: 'Satpura Bio',
          description: `Payment for Order ${pendingOrder.orderNumber || pendingOrder.id}`,
          prefill: {
            name: profile.name || '',
            email: profile.email || '',
            contact: profile.phone || '',
          },
        })

        const confirmResult = await confirmPayment({
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          gatewayPaymentId: razorpayResponse.paymentId,
          gatewayOrderId: razorpayResponse.orderId,
          gatewaySignature: razorpayResponse.signature,
          paymentMethod: paymentMethod,
        })

        if (confirmResult.error) {
          setError(confirmResult.error.message || 'Payment failed')
          setLoading(false)
          setShowPaymentConfirm(false)
          setPendingOrder(null)
          return
        }

        // Clear cart after successful payment
        dispatch({ type: 'CLEAR_CART' })

        // Navigate to order confirmation
        navigate('/order-confirmation', {
          state: { orderId: order.id, orderNumber: order.orderNumber }
        })
      } catch (razorpayError) {
        if (razorpayError.error) {
          setError(razorpayError.error || 'Payment was cancelled or failed')
        } else {
          setError('Payment was cancelled')
        }
        setLoading(false)
        setShowPaymentConfirm(false)
        setPendingOrder(null)
      }
    } catch (err) {
      console.error('Payment processing error:', err)
      setError(err.message || 'Payment processing failed. Please try again.')
      setLoading(false)
      setShowPaymentConfirm(false)
      setPendingOrder(null)
    }
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!profile || !profile.phone) {
      navigate('/login', { state: { from: '/checkout' } })
    }
  }, [profile, navigate])

  if (cart.length === 0) {
    return null // Will redirect
  }

  return (
    <Layout>
      <Container className="checkout-page">
        <div className="checkout-page__header">
          <button
            type="button"
            onClick={handleBack}
            className="checkout-page__back-button"
          >
            ← {currentStep === 1 ? 'Back to Cart' : 'Back'}
          </button>
          <h1 className="checkout-page__title">Checkout</h1>
        </div>

        {error && (
          <div className="checkout-page__error">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="checkout-page__progress">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            return (
              <div key={step.id} className="checkout-page__progress-item">
                <div className={cn(
                  'checkout-page__progress-circle',
                  isActive && 'checkout-page__progress-circle--active',
                  isCompleted && 'checkout-page__progress-circle--completed'
                )}>
                  {isCompleted ? '✓' : step.id}
                </div>
                <label className={cn(
                  'checkout-page__progress-label',
                  isActive && 'checkout-page__progress-label--active'
                )}>
                  {step.label}
                </label>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'checkout-page__progress-connector',
                    isCompleted && 'checkout-page__progress-connector--completed'
                  )} />
                )}
              </div>
            )
          })}
        </div>

        <div className="checkout-page__layout">
          {/* Main Content */}
          <div className="checkout-page__main">
            {/* Step 1: Summary */}
            {currentStep === 1 && (
              <div className="checkout-page__step">
                <h2 className="checkout-page__step-title">Order Summary</h2>

                {/* Order Items */}
                <div className="checkout-page__items">
                  {groupedCartItems.map((group) => (
                    <div key={group.productId} className="checkout-page__item-group">
                      <div className="checkout-page__item-header">
                        <img src={group.image} alt={group.name} className="checkout-page__item-image" />
                        <div className="checkout-page__item-info">
                          <h4>{group.name}</h4>
                          <p>{group.variants.length} variant{group.variants.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {group.variants.map((variant) => (
                        <div key={variant.id} className="checkout-page__item-variant">
                          <div className="checkout-page__variant-details">
                            {variant.variantAttributes && Object.keys(variant.variantAttributes).length > 0 && (
                              <div className="checkout-page__variant-attrs">
                                {Object.entries(variant.variantAttributes).map(([key, value]) => (
                                  <span key={key}>{key}: {value}</span>
                                ))}
                              </div>
                            )}
                            <p>Qty: {variant.quantity} × ₹{variant.unitPrice?.toLocaleString('en-IN')}</p>
                          </div>
                          <p className="checkout-page__variant-total">
                            ₹{((variant.unitPrice || 0) * variant.quantity).toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Payment Preference */}
                <div className="checkout-page__payment-preference">
                  <h3 className="checkout-page__section-title">Payment Preference</h3>
                  <div className="checkout-page__payment-options">
                    {paymentOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentPreference(option.id)}
                        className={cn(
                          'checkout-page__payment-option',
                          paymentPreference === option.id && 'checkout-page__payment-option--active'
                        )}
                      >
                        <div className="checkout-page__payment-option-header">
                          <span>{option.title}</span>
                          <span className="checkout-page__payment-badge">{option.badge}</span>
                        </div>
                        <p>{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="checkout-page__payment-breakdown">
                  <h3 className="checkout-page__section-title">Payment Breakdown</h3>
                  <div className="checkout-page__breakdown-grid">
                    <div className="checkout-page__breakdown-item">
                      <p className="checkout-page__breakdown-label">{paymentDueNowLabel}</p>
                      <p className="checkout-page__breakdown-amount">₹{amountDueNow.toLocaleString('en-IN')}</p>
                      <p className="checkout-page__breakdown-note">Pay now</p>
                    </div>
                    <div className="checkout-page__breakdown-item">
                      <p className="checkout-page__breakdown-label">{paymentDueLaterLabel}</p>
                      <p className="checkout-page__breakdown-amount">₹{amountDueLater.toLocaleString('en-IN')}</p>
                      <p className="checkout-page__breakdown-note">
                        {isFullPayment ? 'No pending payment' : 'Pay after delivery'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address & Shipping */}
            {currentStep === 2 && (
              <div className="checkout-page__step">
                <h2 className="checkout-page__step-title">Delivery Address</h2>

                {deliveryAddress ? (
                  <div className="checkout-page__address-card">
                    <div className="checkout-page__address-header">
                      <span className="checkout-page__address-name">{deliveryAddress.name}</span>
                      <span className="checkout-page__address-badge">Delivery Address</span>
                    </div>
                    {deliveryAddress.address && (
                      <p className="checkout-page__address-line">{deliveryAddress.address}</p>
                    )}
                    <p className="checkout-page__address-line">
                      {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
                    </p>
                    {deliveryAddress.phone && (
                      <p className="checkout-page__address-phone">Phone: {deliveryAddress.phone}</p>
                    )}
                    <Link to="/account/profile" className="checkout-page__address-change">
                      Change Delivery Address
                    </Link>
                  </div>
                ) : (
                  <div className="checkout-page__address-empty">
                    <p>Delivery address is required to place an order.</p>
                    <Link to="/account/profile" className="checkout-page__address-add">
                      Add Delivery Address
                    </Link>
                  </div>
                )}

                <div className="checkout-page__shipping">
                  <h3 className="checkout-page__section-title">Shipping Method</h3>
                  <div className="checkout-page__shipping-options">
                    {shippingOptions.map((option) => {
                      const isAvailable = !option.minOrder || totals.subtotal >= option.minOrder
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            'checkout-page__shipping-option',
                            shippingMethod === option.id && 'checkout-page__shipping-option--active',
                            !isAvailable && 'checkout-page__shipping-option--disabled'
                          )}
                        >
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={shippingMethod === option.id}
                            onChange={(e) => setShippingMethod(e.target.value)}
                            disabled={!isAvailable}
                          />
                          <div>
                            <div className="checkout-page__shipping-header">
                              <span>{option.label}</span>
                              <span>
                                {option.cost === 0 || isFullPayment ? 'Free' : `₹${option.cost}`}
                              </span>
                            </div>
                            <p>Estimated delivery: {option.time}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="checkout-page__step">
                <h2 className="checkout-page__step-title">Payment Method</h2>

                <div className="checkout-page__payment-method">
                  <div className="checkout-page__payment-method-card checkout-page__payment-method-card--active">
                    <div className="checkout-page__payment-method-icon">💳</div>
                    <div>
                      <h4>Razorpay</h4>
                      <p>Secure payment gateway</p>
                    </div>
                    <span className="checkout-page__payment-method-check">✓</span>
                  </div>
                </div>

                {/* Final Summary */}
                <div className="checkout-page__final-summary">
                  <h3 className="checkout-page__section-title">Final Summary</h3>
                  <div className="checkout-page__summary-list">
                    <div className="checkout-page__summary-row">
                      <span>Subtotal</span>
                      <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="checkout-page__summary-row">
                      <span>Delivery</span>
                      <span>{totals.delivery === 0 ? 'Free' : `₹${totals.delivery}`}</span>
                    </div>
                    <div className="checkout-page__summary-row checkout-page__summary-row--total">
                      <span>Total</span>
                      <span>₹{totals.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="checkout-page__breakdown-grid">
                    <div className="checkout-page__breakdown-item">
                      <p className="checkout-page__breakdown-label">{paymentDueNowLabel}</p>
                      <p className="checkout-page__breakdown-amount">₹{amountDueNow.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="checkout-page__breakdown-item">
                      <p className="checkout-page__breakdown-label">{paymentDueLaterLabel}</p>
                      <p className="checkout-page__breakdown-amount">₹{amountDueLater.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="checkout-page__navigation">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="checkout-page__nav-button checkout-page__nav-button--secondary"
                >
                  Back
                </button>
              )}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentStep === 2 && !deliveryAddress}
                  className="checkout-page__nav-button checkout-page__nav-button--primary"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={loading || !deliveryAddress || (!userAvailability?.canPlaceOrder && !userAvailability?.isInBufferZone)}
                  className="checkout-page__nav-button checkout-page__nav-button--primary"
                >
                  {loading ? 'Processing...' : `Pay ₹${amountDueNow.toLocaleString('en-IN')} & Place Order`}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="checkout-page__sidebar">
            <div className="checkout-page__sidebar-card">
              <h3 className="checkout-page__sidebar-title">Order Summary</h3>
              <div className="checkout-page__sidebar-items">
                {groupedCartItems.map((group) => (
                  <div key={group.productId} className="checkout-page__sidebar-item">
                    <img src={group.image} alt={group.name} className="checkout-page__sidebar-image" />
                    <div>
                      <p className="checkout-page__sidebar-item-name">{group.name}</p>
                      <p className="checkout-page__sidebar-item-qty">
                        {group.variants.reduce((sum, v) => sum + v.quantity, 0)} items
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="checkout-page__sidebar-totals">
                <div className="checkout-page__sidebar-row">
                  <span>Subtotal</span>
                  <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="checkout-page__sidebar-row">
                  <span>Delivery</span>
                  <span>{totals.delivery === 0 ? 'Free' : `₹${totals.delivery}`}</span>
                </div>
                <div className="checkout-page__sidebar-row checkout-page__sidebar-row--total">
                  <span>Total</span>
                  <span>₹{totals.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Confirmation Modal */}
        {showPaymentConfirm && pendingOrder && (
          <div
            className="checkout-page__modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPaymentConfirm(false)
                setPendingOrder(null)
              }
            }}
          >
            <div className="checkout-page__modal-content">
              <div className="checkout-page__modal-header">
                <h3>Confirm Payment</h3>
                <button onClick={() => {
                  setShowPaymentConfirm(false)
                  setPendingOrder(null)
                }}>×</button>
              </div>
              <div className="checkout-page__modal-body">
                <p>Order Preview</p>
                <div className="checkout-page__modal-summary">
                  <div>
                    <span>Total Amount</span>
                    <span>₹{pendingOrder.total.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span>{paymentDueNowLabel}</span>
                    <span>₹{pendingOrder.uiPayment.amountDueNow.toLocaleString('en-IN')}</span>
                  </div>
                  {pendingOrder.uiPayment.amountDueLater > 0 && (
                    <div>
                      <span>{paymentDueLaterLabel}</span>
                      <span>₹{pendingOrder.uiPayment.amountDueLater.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={() => {
                      setShowPaymentConfirm(false)
                      setPendingOrder(null)
                    }}
                    className="checkout-page__modal-button"
                    style={{
                      background: '#f3f4f6',
                      color: '#172022',
                      flex: 1
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="checkout-page__modal-button"
                    style={{ flex: 1 }}
                  >
                    {loading ? 'Processing...' : `Pay ₹${pendingOrder.uiPayment.amountDueNow.toLocaleString('en-IN')}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </Layout>
  )
}
