import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Container } from '../components/Layout'
import { cn } from '../../../lib/cn'
import '../styles/website.css'

export function OrderConfirmationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const order = location.state?.order || null
  
  const [animationProgress, setAnimationProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // If no order data, redirect to home
    if (!order) {
      navigate('/')
      return
    }

    // Animate the circular progress
    const duration = 2000 // 2 seconds
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setAnimationProgress(progress)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Show content after animation completes
        setTimeout(() => setShowContent(true), 300)
      }
    }
    
    requestAnimationFrame(animate)
  }, [order, navigate])

  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference * (1 - animationProgress)

  const handleBackToHome = () => {
    navigate('/')
  }

  if (!order) {
    return null // Will redirect in useEffect
  }

  return (
    <Layout>
      <Container className="order-confirmation-page">
        <div className="order-confirmation-page__container">
          {/* Animated Circular Checkmark */}
          <div className="order-confirmation-page__icon-wrapper">
            <svg className="order-confirmation-page__circle-svg" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(27, 143, 91, 0.1)"
                strokeWidth="4"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#1b8f5b"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="order-confirmation-page__progress-circle"
              />
            </svg>
            {/* Checkmark Icon */}
            <div className={cn(
              "order-confirmation-page__checkmark",
              animationProgress >= 1 && "order-confirmation-page__checkmark--visible"
            )}>
              <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className={cn(
            "order-confirmation-page__content",
            showContent && "order-confirmation-page__content--visible"
          )}>
            <h1 className="order-confirmation-page__title">Order Confirmed!</h1>
            <p className="order-confirmation-page__subtitle">
              Your order has been successfully placed and is being processed.
            </p>

            {/* Order Details */}
            <div className="order-confirmation-page__details">
              <div className="order-confirmation-page__detail-item">
                <span className="order-confirmation-page__detail-label">Order ID</span>
                <span className="order-confirmation-page__detail-value">
                  {order.id || order._id || order.orderId || 'N/A'}
                </span>
              </div>
              <div className="order-confirmation-page__detail-item">
                <span className="order-confirmation-page__detail-label">Total Amount</span>
                <span className="order-confirmation-page__detail-value">
                  ₹{(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
              {order.advancePaid !== undefined && (
                <div className="order-confirmation-page__detail-item">
                  <span className="order-confirmation-page__detail-label">Advance Paid</span>
                  <span className="order-confirmation-page__detail-value order-confirmation-page__detail-value--highlight">
                    ₹{(order.advancePaid || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Delivery Information */}
            <div className="order-confirmation-page__info">
              <div className="order-confirmation-page__info-card">
                <h3 className="order-confirmation-page__info-title">What's Next?</h3>
                <ul className="order-confirmation-page__info-list">
                  <li className="order-confirmation-page__info-item">
                    <span className="order-confirmation-page__info-icon">📦</span>
                    <div>
                      <strong>Order Processing</strong>
                      <p>We're preparing your order for shipment. You'll receive a confirmation email shortly.</p>
                    </div>
                  </li>
                  <li className="order-confirmation-page__info-item">
                    <span className="order-confirmation-page__info-icon">🚚</span>
                    <div>
                      <strong>Delivery Updates</strong>
                      <p>Track your order in real-time. Estimated delivery: {order.deliveryTime || '24 hours'}.</p>
                    </div>
                  </li>
                  {order.remaining !== undefined && (
                    <li className="order-confirmation-page__info-item">
                      <span className="order-confirmation-page__info-icon">💳</span>
                      <div>
                        <strong>Remaining Payment</strong>
                        <p>Pay the remaining ₹{(order.remaining || 0).toLocaleString('en-IN')} upon delivery. Cash or card accepted.</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleBackToHome}
              className="order-confirmation-page__button"
            >
              Back to Home
            </button>
          </div>
        </div>
      </Container>
    </Layout>
  )
}









