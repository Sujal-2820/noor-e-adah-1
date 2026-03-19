import { createContext, useContext, useMemo, useReducer, useEffect, useCallback } from 'react'
import { initializeRealtimeConnection, handleRealtimeNotification, getUserProfile, getCart, getOrders, getAddresses, getOffers } from '../services/websiteApi'

const WebsiteStateContext = createContext(null)
const WebsiteDispatchContext = createContext(() => { })

const initialState = {
  authenticated: false,
  profile: {
    name: 'Guest User',
    email: '',
    phone: '',
    adminId: null, // Admin ID linked to user
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: null,
    },
  },
  cart: [],
  orders: [],
  addresses: [],
  paymentMethods: [],
  favourites: [],
  notifications: [],
  assignedUser: null, // User assigned to this user
  checkoutAddress: {
    firstName: '',
    lastName: '',
    country: 'India',
    state: 'Haryana',
    city: '',
    pincode: '',
    address: '',
    phone: '',
  },
  userAvailability: {
    userAvailable: true, // Rule removed
    canPlaceOrder: true,
    isInBufferZone: false,
  },
  realtimeConnected: false,
  cartOpen: false,
  authLoading: true, // Initial state is loading until token check completes
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CART_OPEN':
      return {
        ...state,
        cartOpen: action.payload,
      }
    case 'AUTH_LOGIN':
      return {
        ...state,
        authenticated: true,
        profile: {
          ...state.profile,
          ...action.payload,
          adminId: action.payload.adminId || state.profile.adminId, // Preserve adminId if not provided
        },
        authLoading: false,
      }
    case 'UPDATE_SELLER_ID':
      return {
        ...state,
        profile: {
          ...state.profile,
          adminId: action.payload,
        },
      }
    case 'SET_ASSIGNED_VENDOR':
      return {
        ...state,
        assignedUser: action.payload,
      }
    case 'SET_VENDOR_AVAILABILITY':
      return {
        ...state,
        userAvailability: action.payload,
      }
    case 'SET_REALTIME_CONNECTED':
      return {
        ...state,
        realtimeConnected: action.payload,
      }
    case 'AUTH_LOGOUT':
      return {
        ...state,
        authenticated: false,
        profile: initialState.profile,
        cart: [],
        userAvailability: initialState.userAvailability,
        assignedUser: null,
        authLoading: false,
      }
    case 'SET_AUTH_LOADING':
      return {
        ...state,
        authLoading: action.payload,
      }
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find((item) => item.productId === action.payload.productId)
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item,
          ),
        }
      }
      return {
        ...state,
        cart: [...state.cart, action.payload],
      }
    }
    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item,
        ),
      }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.productId !== action.payload.productId),
      }
    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
      }
    case 'SET_CART_ITEMS':
      return {
        ...state,
        cart: Array.isArray(action.payload) ? action.payload : [],
      }
    case 'ADD_ORDER':
      // Note: Cart is NOT cleared here. It will be cleared only after successful payment confirmation
      // This ensures cart items remain available if user cancels payment or payment fails
      return {
        ...state,
        orders: [...state.orders, action.payload],
        // cart: [] - Removed: Cart should only be cleared after payment is confirmed
      }
    case 'UPDATE_CHECKOUT_ADDRESS':
      return {
        ...state,
        checkoutAddress: {
          ...state.checkoutAddress,
          ...action.payload,
        },
      }
    case 'UPDATE_ORDER':
    case 'ADD_ADDRESS':
      return {
        ...state,
        addresses: [...state.addresses, action.payload],
      }
    case 'UPDATE_ADDRESS':
      return {
        ...state,
        addresses: state.addresses.map((addr) =>
          addr.id === action.payload.id ? { ...addr, ...action.payload } : addr,
        ),
      }
    case 'SET_DEFAULT_ADDRESS':
      return {
        ...state,
        addresses: state.addresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === action.payload.id,
        })),
      }
    case 'DELETE_ADDRESS':
      return {
        ...state,
        addresses: state.addresses.filter((addr) => addr.id !== action.payload.id),
      }
    case 'CLEAR_ADDRESSES':
      return {
        ...state,
        addresses: [],
      }
    case 'ADD_TO_FAVOURITES':
      if (state.favourites.includes(action.payload.productId)) {
        return state
      }
      return {
        ...state,
        favourites: [...state.favourites, action.payload.productId],
      }
    case 'REMOVE_FROM_FAVOURITES':
      return {
        ...state,
        favourites: state.favourites.filter((id) => id !== action.payload.productId),
      }
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          {
            id: Date.now().toString(),
            ...action.payload,
            read: false,
            timestamp: new Date().toISOString(),
          },
          ...state.notifications,
        ],
      }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((notif) =>
          notif.id === action.payload.id ? { ...notif, read: true } : notif,
        ),
      }
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
      }
    default:
      return state
  }
}

export function WebsiteProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Helper function to resolve IDs (supports both _id and id fields)
  const resolveId = useCallback((value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return value.toString()
    if (typeof value === 'object') {
      if (value._id) return value._id.toString()
      if (value.id) return value.id.toString()
      if (typeof value.toString === 'function') return value.toString()
    }
    return ''
  }, [])

  // Map cart items from API response with variant handling
  const mapCartItemsFromResponse = useCallback((cartData) => {
    if (!cartData?.items) {
      return []
    }

    const mappedItems = cartData.items
      .map((item) => {
        const cartItemId = resolveId(item.id || item._id)
        const product = item.product || item.productId || {}
        const productId = resolveId(product.id || product._id || item.productId)

        if (!productId) {
          return null
        }

        // Use variant-specific price (unitPrice) if available, otherwise fallback
        const price =
          typeof item.unitPrice === 'number'
            ? item.unitPrice
            : typeof product.priceToUser === 'number'
              ? product.priceToUser
              : typeof product.price === 'number'
                ? product.price
                : 0

        // Extract variant attributes if present
        const variantAttributes = item.variantAttributes || null

        const mappedItem = {
          id: cartItemId,
          cartItemId,
          productId,
          name: product.name || item.productName || 'Unknown Product',
          price,
          unitPrice: item.unitPrice || price,
          image: item.image || product.images?.[0]?.url || product.primaryImage || product.image || '',
          quantity: item.quantity || 1,
          user: product.user || null,
          deliveryTime: product.deliveryTime || null,
          variantAttributes: variantAttributes,
        }

        return mappedItem
      })
      .filter(Boolean)

    return mappedItems
  }, [resolveId])

  const syncCartState = useCallback(
    (cartData) => {
      const items = mapCartItemsFromResponse(cartData)
      dispatch({ type: 'SET_CART_ITEMS', payload: items })
    },
    [mapCartItemsFromResponse],
  )

  // Fetch user profile from API on mount
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    const expiry = localStorage.getItem('user_token_expiry')

    // Clear token if the 30-day client-side expiry has passed
    if (token && expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_token_expiry')
      dispatch({ type: 'SET_AUTH_LOADING', payload: false })
      return // session expired, don't fetch profile
    } else if (token && !expiry) {
      // Migration: If token exists but no expiry, set a 30-day default
      localStorage.setItem('user_token_expiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString())
    }

    if (!token) {
      dispatch({ type: 'SET_AUTH_LOADING', payload: false })
      return
    }
      const fetchProfile = async () => {
        try {
          const result = await getUserProfile()
          if (result.success && result.data?.user) {
            const userData = result.data.user
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                name: userData.name || 'User',
                phone: userData.phone || '',
                email: userData.email || '',
                adminId: userData.adminId || null,
                location: userData.location || null,
              },
            })

            // Set user availability status from profile
            if (result.data?.userAvailability) {
              dispatch({
                type: 'SET_VENDOR_AVAILABILITY',
                payload: result.data.userAvailability,
              })

              // Set assigned user if available
              if (result.data.userAvailability.assignedUser) {
                dispatch({
                  type: 'SET_ASSIGNED_VENDOR',
                  payload: result.data.userAvailability.assignedUser,
                })
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
          // If token is invalid, remove it but don't redirect (website allows guest access)
          if (error.error?.message?.includes('unauthorized') || error.error?.message?.includes('token')) {
            localStorage.removeItem('user_token')
            localStorage.removeItem('user_token_expiry')
          }
          dispatch({ type: 'SET_AUTH_LOADING', payload: false })
        }
      }
      fetchProfile()
  }, [dispatch])

  // Fetch orders, cart, and addresses from API on mount (when authenticated)
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (!token || !state.authenticated) return

    const loadData = async () => {
      try {
        // Fetch orders
        const ordersResult = await getOrders()
        if (ordersResult.success && ordersResult.data?.orders) {
          ordersResult.data.orders.forEach((order) => {
            dispatch({
              type: 'ADD_ORDER',
              payload: {
                id: order.id || order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount,
                subtotal: order.subtotal,
                deliveryCharge: order.deliveryCharge,
                paymentPreference: order.paymentPreference,
                upfrontAmount: order.upfrontAmount,
                remainingAmount: order.remainingAmount,
                paymentStatus: order.paymentStatus,
                items: order.items,
                statusTimeline: order.statusTimeline,
                createdAt: order.createdAt,
              },
            })
          })
        }

        // Fetch cart
        const cartResult = await getCart()
        if (cartResult.success && cartResult.data?.cart) {
          syncCartState(cartResult.data.cart)
        } else {
          dispatch({ type: 'SET_CART_ITEMS', payload: [] })
        }

        // Fetch addresses
        const addressesResult = await getAddresses()
        if (addressesResult.success && addressesResult.data?.addresses) {
          // Clear existing addresses first
          dispatch({ type: 'CLEAR_ADDRESSES' })
          
          let defaultAddr = null
          // Add addresses from API
          addressesResult.data.addresses.forEach((address) => {
            const addrObj = {
              id: address.id || address._id,
              name: address.name || address.label,
              label: address.label || address.name,
              address: address.address || address.street,
              street: address.street || address.address,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              phone: address.phone,
              country: address.country || 'India',
              isDefault: address.isDefault || false,
            }
            dispatch({ type: 'ADD_ADDRESS', payload: addrObj })
            if (addrObj.isDefault) defaultAddr = addrObj
          })

          // Pre-fill checkoutAddress if default exists
          const chosen = defaultAddr || addressesResult.data.addresses[0]
          if (chosen) {
            const [firstName, ...lastNameParts] = (chosen.name || '').split(' ')
            dispatch({
              type: 'UPDATE_CHECKOUT_ADDRESS',
              payload: {
                firstName: firstName || '',
                lastName: lastNameParts.join(' ') || '',
                address: chosen.address,
                city: chosen.city,
                state: chosen.state,
                pincode: chosen.pincode,
                phone: chosen.phone,
                country: chosen.country || 'India',
              }
            })
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [state.authenticated, syncCartState])

  // Initialize welcome notification (only first time user enters website)
  useEffect(() => {
    if (!state.authenticated) return

    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeNotification_website')
    if (!hasSeenWelcome && state.notifications.length === 0) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          title: 'Welcome to Noor E Adah!',
          message: 'Start shopping for your farming needs',
          type: 'welcome',
        },
      })
      localStorage.setItem('hasSeenWelcomeNotification_website', 'true')
    }
  }, [state.authenticated, state.notifications.length, dispatch])

  // Initialize real-time connection when authenticated
  useEffect(() => {
    if (state.authenticated && state.profile.phone) {
      const cleanup = initializeRealtimeConnection((notification) => {
        const processedNotification = handleRealtimeNotification(notification)

        // Handle different notification types
        switch (processedNotification.type) {
          case 'payment_reminder':
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: processedNotification.id,
                type: 'payment',
                title: 'Payment Reminder',
                message: `Please complete the remaining payment of ₹${processedNotification.amount} for Order #${processedNotification.orderId}`,
                orderId: processedNotification.orderId,
                amount: processedNotification.amount,
                read: false,
              },
            })
            break

          case 'delivery_update':
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: processedNotification.id,
                type: 'delivery',
                title: 'Delivery Update',
                message: processedNotification.message || `Your order #${processedNotification.orderId} status has been updated`,
                orderId: processedNotification.orderId,
                status: processedNotification.status,
                read: false,
              },
            })
            // Update order status if order exists
            if (processedNotification.orderId) {
              dispatch({
                type: 'UPDATE_ORDER',
                payload: {
                  id: processedNotification.orderId,
                  status: processedNotification.status,
                },
              })
            }
            break

          case 'order_assigned':
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: processedNotification.id,
                type: 'order',
                title: 'Order Assigned',
                message: `Your order #${processedNotification.orderId} has been assigned to ${processedNotification.userName}`,
                orderId: processedNotification.orderId,
                read: false,
              },
            })
            break

          case 'order_delivered':
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: processedNotification.id,
                type: 'delivery',
                title: 'Order Delivered',
                message: `Your order #${processedNotification.orderId} has been delivered. Please complete the remaining payment.`,
                orderId: processedNotification.orderId,
                read: false,
              },
            })
            // Update order status
            if (processedNotification.orderId) {
              dispatch({
                type: 'UPDATE_ORDER',
                payload: {
                  id: processedNotification.orderId,
                  status: 'delivered',
                  deliveryDate: processedNotification.deliveryDate || new Date().toISOString(),
                },
              })
            }
            break

          case 'offer':
          case 'announcement':
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: processedNotification.id,
                type: processedNotification.type,
                title: processedNotification.title,
                message: processedNotification.message,
                read: false,
              },
            })
            break

          default:
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: processedNotification.id,
                ...processedNotification,
                read: false,
              },
            })
        }
      })

      dispatch({ type: 'SET_REALTIME_CONNECTED', payload: true })

      return () => {
        cleanup()
        dispatch({ type: 'SET_REALTIME_CONNECTED', payload: false })
      }
    }
  }, [state.authenticated, state.profile.phone])

  // Track order status changes and send notifications (poll every 30 seconds)
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (!token || !state.authenticated || state.orders.length === 0) return

    const checkOrderStatusChanges = async () => {
      try {
        const ordersResult = await getOrders()
        if (ordersResult.success && ordersResult.data?.orders) {
          ordersResult.data.orders.forEach((order) => {
            const existingOrder = state.orders.find((o) => {
              const orderId = order.id || order._id
              return o.id === orderId || o.id === order._id
            })
            if (existingOrder && existingOrder.status !== order.status) {
              // Order status changed - send notification
              const statusMessages = {
                accepted: 'Your order has been accepted and is being prepared',
                dispatched: 'Your order has been dispatched and is on the way',
                delivered: 'Your order has been delivered successfully',
              }

              const message = statusMessages[order.status] || `Your order status has been updated to ${order.status}`

              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  type: 'order_status',
                  title: 'Order Status Update',
                  message: `${message}. Order #${order.orderNumber?.slice(-8) || (order.id || order._id)?.slice(-8) || 'N/A'}`,
                  orderId: order.id || order._id,
                  orderNumber: order.orderNumber,
                  status: order.status,
                },
              })

              // Update order in state
              dispatch({
                type: 'UPDATE_ORDER',
                payload: {
                  id: order.id || order._id,
                  status: order.status,
                  paymentStatus: order.paymentStatus,
                  statusTimeline: order.statusTimeline,
                },
              })
            }
          })
        }
      } catch (error) {
        console.error('Error checking order status changes:', error)
      }
    }

    // Check immediately
    checkOrderStatusChanges()

    // Poll every 30 seconds for order status changes
    const interval = setInterval(checkOrderStatusChanges, 30000)

    return () => clearInterval(interval)
  }, [state.orders, state.authenticated])

  // Check for new offers and send notifications (poll every 5 minutes)
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (!token || !state.authenticated) return

    const checkNewOffers = async () => {
      try {
        const offersResult = await getOffers()
        if (offersResult.success && offersResult.data) {
          const activeCarousels = (offersResult.data.carousels || [])
            .filter(c => c.isActive !== false)
          const specialOffers = offersResult.data.specialOffers || []

          // Check for new offers (created in last 24 hours)
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          const newCarousels = activeCarousels.filter(c => {
            const createdAt = new Date(c.createdAt)
            return createdAt > oneDayAgo
          })
          const newSpecialOffers = specialOffers.filter(o => {
            const createdAt = new Date(o.createdAt)
            return createdAt > oneDayAgo
          })

          // Send notification for new offers (only once per day)
          if (newCarousels.length > 0 || newSpecialOffers.length > 0) {
            const lastOfferCheck = localStorage.getItem('lastOfferCheckTime_website')
            const now = Date.now()
            const oneDayInMs = 24 * 60 * 60 * 1000

            if (!lastOfferCheck || (now - parseInt(lastOfferCheck)) > oneDayInMs) {
              const offerCount = newCarousels.length + newSpecialOffers.length
              dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                  type: 'offer',
                  title: 'New Offers Available!',
                  message: `${offerCount} new ${offerCount === 1 ? 'offer' : 'offers'} ${offerCount === 1 ? 'is' : 'are'} now available. Check them out!`,
                },
              })
              localStorage.setItem('lastOfferCheckTime_website', now.toString())
            }
          }
        }
      } catch (error) {
        console.error('Error checking new offers:', error)
      }
    }

    // Check immediately
    checkNewOffers()

    // Poll every 5 minutes for new offers
    const interval = setInterval(checkNewOffers, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [state.authenticated, dispatch])

  const value = useMemo(() => state, [state])
  return (
    <WebsiteStateContext.Provider value={value}>
      <WebsiteDispatchContext.Provider value={dispatch}>{children}</WebsiteDispatchContext.Provider>
    </WebsiteStateContext.Provider>
  )
}

export function useWebsiteState() {
  const context = useContext(WebsiteStateContext)
  if (!context) {
    throw new Error('useWebsiteState must be used within WebsiteProvider')
  }
  return context
}

export function useWebsiteDispatch() {
  const context = useContext(WebsiteDispatchContext)
  if (!context) {
    throw new Error('useWebsiteDispatch must be used within WebsiteProvider')
  }
  return context
}

