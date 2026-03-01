/**
 * Custom hook for Website API integration
 * Provides easy access to API functions with loading states and error handling
 * Completely separate from User module
 */

import { useState, useCallback } from 'react'
import { useWebsiteDispatch } from '../context/WebsiteContext'
import * as websiteApi from '../services/websiteApi'

export function useWebsiteApi() {
  const dispatch = useWebsiteDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleApiCall = useCallback(
    async (apiFunction, successAction, errorMessage, ...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFunction(...args)
        if (result.success) {
          if (successAction) {
            // Extract the actual data object from result.data before dispatching
            dispatch(successAction(result.data))
          }
          return { data: result.data, error: null }
        } else {
          setError(result.error?.message || errorMessage || 'An error occurred')
          return { data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = err.error?.message || err.message || errorMessage || 'An unexpected error occurred'
        setError(errorMsg)
        return { data: null, error: { message: errorMsg } }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  // Authentication APIs
  const requestOTP = useCallback(
    async (phone, language = 'en') => {
      return handleApiCall(
        () => websiteApi.requestOTP({ phone, language }),
        null,
        'Failed to send OTP',
      )
    },
    [handleApiCall],
  )

  const verifyOTP = useCallback(
    async (phone, otp, adminId = null) => {
      return handleApiCall(
        () => websiteApi.verifyOTP({ phone, otp, adminId }),
        (data) => ({
          type: 'AUTH_LOGIN',
          payload: {
            ...data.user,
            adminId: data.user?.adminId || adminId,
          },
        }),
        'Failed to verify OTP',
      )
    },
    [handleApiCall],
  )

  const loginWithOtp = useCallback(
    async (phone, otp) => {
      return handleApiCall(
        () => websiteApi.loginWithOtp({ phone, otp }),
        (data) => ({
          type: 'AUTH_LOGIN',
          payload: {
            ...data.user,
            adminId: data.user?.adminId || null,
          },
        }),
        'Failed to login',
      )
    },
    [handleApiCall],
  )

  const register = useCallback(
    async (fullName, phone, otp, adminId = null) => {
      return handleApiCall(
        () => websiteApi.register({ fullName, phone, otp, adminId }),
        (data) => ({
          type: 'AUTH_LOGIN',
          payload: {
            ...data.user,
            adminId: data.user?.adminId || adminId,
          },
        }),
        'Failed to register',
      )
    },
    [handleApiCall],
  )

  const getAdminID = useCallback(
    async () => {
      return handleApiCall(
        () => websiteApi.getAdminID(),
        (data) => ({
          type: 'UPDATE_SELLER_ID',
          payload: data.adminId,
        }),
        'Failed to get Admin ID',
      )
    },
    [handleApiCall],
  )

  // Product APIs
  const fetchProducts = useCallback(
    async (params = {}) => {
      return handleApiCall(
        () => websiteApi.getProducts(params),
        null,
        'Failed to load products',
      )
    },
    [handleApiCall],
  )

  const fetchProductDetails = useCallback(
    async (productId) => {
      return handleApiCall(
        () => websiteApi.getProductDetails(productId),
        null,
        'Failed to load product details',
      )
    },
    [handleApiCall],
  )

  const fetchCategories = useCallback(async () => {
    return handleApiCall(
      websiteApi.getCategories,
      null,
      'Failed to load categories',
    )
  }, [handleApiCall])

  const fetchPopularProducts = useCallback(
    async (params = {}) => {
      return handleApiCall(
        () => websiteApi.getPopularProducts(params),
        null,
        'Failed to load popular products',
      )
    },
    [handleApiCall],
  )

  const fetchOffers = useCallback(async () => {
    return handleApiCall(
      websiteApi.getOffers,
      null,
      'Failed to load offers',
    )
  }, [handleApiCall])

  const searchProducts = useCallback(
    async (params = {}) => {
      return handleApiCall(
        () => websiteApi.searchProducts(params),
        null,
        'Failed to search products',
      )
    },
    [handleApiCall],
  )

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

  // Sync cart state helper
  const syncCartState = useCallback((cartData) => {
    const items = mapCartItemsFromResponse(cartData)
    dispatch({ type: 'SET_CART_ITEMS', payload: items })
  }, [mapCartItemsFromResponse, dispatch])

  // Cart APIs
  const addToCart = useCallback(
    async (productId, quantity, variantAttributes = null) => {
      const payload = { productId, quantity }
      if (variantAttributes && Object.keys(variantAttributes).length > 0) {
        payload.attributes = variantAttributes
      }

      setLoading(true)
      setError(null)
      try {
        const result = await websiteApi.addToCart(payload)
        if (result.success) {
          // Sync cart state after successful add
          if (result.data?.cart) {
            syncCartState(result.data.cart)
          }
          // Open cart sidebar
          dispatch({ type: 'SET_CART_OPEN', payload: true })
          return { data: result.data, error: null }
        } else {
          setError(result.error?.message || 'Failed to add to cart')
          return { data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = err.error?.message || err.message || 'Failed to add to cart'
        setError(errorMsg)
        return { data: null, error: { message: errorMsg } }
      } finally {
        setLoading(false)
      }
    },
    [syncCartState],
  )

  const updateCartItem = useCallback(
    async (itemId, quantity) => {
      setLoading(true)
      setError(null)
      try {
        const result = await websiteApi.updateCartItem(itemId, { quantity })
        if (result.success) {
          // Sync cart state after successful update
          if (result.data?.cart) {
            syncCartState(result.data.cart)
          }
          return { data: result.data, error: null }
        } else {
          setError(result.error?.message || 'Failed to update cart')
          return { data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = err.error?.message || err.message || 'Failed to update cart'
        setError(errorMsg)
        return { data: null, error: { message: errorMsg } }
      } finally {
        setLoading(false)
      }
    },
    [syncCartState],
  )

  const removeFromCart = useCallback(
    async (itemId) => {
      setLoading(true)
      setError(null)
      try {
        const result = await websiteApi.removeFromCart(itemId)
        if (result.success) {
          // Sync cart state after successful remove
          if (result.data?.cart) {
            syncCartState(result.data.cart)
          }
          return { data: result.data, error: null }
        } else {
          setError(result.error?.message || 'Failed to remove from cart')
          return { data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = err.error?.message || err.message || 'Failed to remove from cart'
        setError(errorMsg)
        return { data: null, error: { message: errorMsg } }
      } finally {
        setLoading(false)
      }
    },
    [syncCartState],
  )

  const fetchCart = useCallback(async () => {
    return handleApiCall(
      websiteApi.getCart,
      null, // Don't auto-dispatch, handle manually
      'Failed to load cart',
    )
  }, [handleApiCall])

  const validateCart = useCallback(async () => {
    return handleApiCall(
      websiteApi.validateCart,
      null,
      'Failed to validate cart',
    )
  }, [handleApiCall])

  const clearCart = useCallback(async () => {
    return handleApiCall(
      websiteApi.clearCart,
      null,
      'Failed to clear cart',
    )
  }, [handleApiCall])

  // User Assignment APIs
  const assignUser = useCallback(
    async (location) => {
      return handleApiCall(
        () => websiteApi.getAssignedUser({ location }),
        (data) => ({
          type: 'SET_ASSIGNED_VENDOR',
          payload: data.user,
        }),
        'Failed to assign user',
      )
    },
    [handleApiCall],
  )

  const checkUserStock = useCallback(
    async (userId, productIds) => {
      return handleApiCall(
        () => websiteApi.checkUserStock({ userId, productIds }),
        null,
        'Failed to check user stock',
      )
    },
    [handleApiCall],
  )

  // Order APIs
  const createOrder = useCallback(
    async (orderData) => {
      return handleApiCall(
        () => websiteApi.createOrder(orderData),
        (data) => ({
          type: 'ADD_ORDER',
          payload: data.order || data,
        }),
        'Failed to create order',
      )
    },
    [handleApiCall],
  )

  const fetchOrders = useCallback(
    async (params = {}) => {
      return handleApiCall(
        () => websiteApi.getOrders(params),
        null,
        'Failed to load orders',
      )
    },
    [handleApiCall],
  )

  const fetchOrderDetails = useCallback(
    async (orderId) => {
      return handleApiCall(
        () => websiteApi.getOrderDetails(orderId),
        null,
        'Failed to load order details',
      )
    },
    [handleApiCall],
  )

  const trackOrder = useCallback(
    async (orderId) => {
      return handleApiCall(
        () => websiteApi.trackOrder(orderId),
        null,
        'Failed to track order',
      )
    },
    [handleApiCall],
  )

  const cancelOrder = useCallback(
    async (orderId, reason = '') => {
      return handleApiCall(
        () => websiteApi.cancelOrder(orderId, { reason }),
        null,
        'Failed to cancel order',
      )
    },
    [handleApiCall],
  )

  // Payment APIs
  const createPaymentIntent = useCallback(
    async (data) => {
      return handleApiCall(
        () => websiteApi.createPaymentIntent(data),
        null,
        'Failed to create payment intent',
      )
    },
    [handleApiCall],
  )

  const confirmPayment = useCallback(
    async (paymentData) => {
      return handleApiCall(
        () => websiteApi.confirmPayment(paymentData),
        null,
        'Failed to confirm payment',
      )
    },
    [handleApiCall],
  )

  const createRemainingPaymentIntent = useCallback(
    async (orderId, paymentMethod) => {
      return handleApiCall(
        () => websiteApi.createRemainingPaymentIntent({ orderId, paymentMethod }),
        null,
        'Failed to create remaining payment intent',
      )
    },
    [handleApiCall],
  )

  const confirmRemainingPayment = useCallback(
    async (paymentData) => {
      return handleApiCall(
        () => websiteApi.confirmRemainingPayment(paymentData),
        (data) => ({
          type: 'UPDATE_ORDER',
          payload: {
            id: paymentData.orderId,
            paymentStatus: 'fully_paid',
          },
        }),
        'Failed to confirm remaining payment',
      )
    },
    [handleApiCall],
  )

  // Address APIs
  const addAddress = useCallback(
    async (addressData) => {
      return handleApiCall(
        () => websiteApi.addAddress(addressData),
        (data) => ({
          type: 'ADD_ADDRESS',
          payload: data.address || data,
        }),
        'Failed to add address',
      )
    },
    [handleApiCall],
  )

  const updateAddress = useCallback(
    async (addressId, addressData) => {
      return handleApiCall(
        () => websiteApi.updateAddress(addressId, addressData),
        (data) => ({
          type: 'UPDATE_ADDRESS',
          payload: { id: addressId, ...data },
        }),
        'Failed to update address',
      )
    },
    [handleApiCall],
  )

  const deleteAddress = useCallback(
    async (addressId) => {
      return handleApiCall(
        () => websiteApi.deleteAddress(addressId),
        (data) => ({
          type: 'DELETE_ADDRESS',
          payload: { id: addressId },
        }),
        'Failed to delete address',
      )
    },
    [handleApiCall],
  )

  const setDefaultAddress = useCallback(
    async (addressId) => {
      return handleApiCall(
        () => websiteApi.setDefaultAddress(addressId),
        (data) => ({
          type: 'SET_DEFAULT_ADDRESS',
          payload: { id: addressId },
        }),
        'Failed to set default address',
      )
    },
    [handleApiCall],
  )

  const fetchAddresses = useCallback(async () => {
    return handleApiCall(
      websiteApi.getAddresses,
      null,
      'Failed to load addresses',
    )
  }, [handleApiCall])

  // Favourites APIs
  const addToFavourites = useCallback(
    async (productId) => {
      return handleApiCall(
        () => websiteApi.addToFavourites({ productId }),
        () => ({
          type: 'ADD_TO_FAVOURITES',
          payload: { productId },
        }),
        'Failed to add to favourites',
      )
    },
    [handleApiCall],
  )

  const removeFromFavourites = useCallback(
    async (productId) => {
      return handleApiCall(
        () => websiteApi.removeFromFavourites(productId),
        () => ({
          type: 'REMOVE_FROM_FAVOURITES',
          payload: { productId },
        }),
        'Failed to remove from favourites',
      )
    },
    [handleApiCall],
  )

  const fetchFavourites = useCallback(async () => {
    return handleApiCall(
      websiteApi.getFavourites,
      null,
      'Failed to load favourites',
    )
  }, [handleApiCall])

  // Profile APIs
  const fetchUserProfile = useCallback(async () => {
    return handleApiCall(
      websiteApi.getUserProfile,
      (data) => ({
        type: 'AUTH_LOGIN',
        payload: data.user || data,
      }),
      'Failed to load profile',
    )
  }, [handleApiCall])

  const updateUserProfile = useCallback(
    async (profileData) => {
      return handleApiCall(
        () => websiteApi.updateUserProfile(profileData),
        (data) => ({
          type: 'AUTH_LOGIN',
          payload: data.user || data,
        }),
        'Failed to update profile',
      )
    },
    [handleApiCall],
  )

  // Phone update APIs
  const requestOTPForCurrentPhone = useCallback(async () => {
    return handleApiCall(
      websiteApi.requestOTPForCurrentPhone,
      null,
      'Failed to request OTP for current phone',
    )
  }, [handleApiCall])

  const verifyOTPForCurrentPhone = useCallback(
    async (otp) => {
      return handleApiCall(
        () => websiteApi.verifyOTPForCurrentPhone({ otp }),
        null,
        'Failed to verify OTP for current phone',
      )
    },
    [handleApiCall],
  )

  const requestOTPForNewPhone = useCallback(
    async (newPhone) => {
      return handleApiCall(
        () => websiteApi.requestOTPForNewPhone({ newPhone }),
        null,
        'Failed to request OTP for new phone',
      )
    },
    [handleApiCall],
  )

  const verifyOTPForNewPhone = useCallback(
    async (otp) => {
      return handleApiCall(
        () => websiteApi.verifyOTPForNewPhone({ otp }),
        (data) => ({
          type: 'AUTH_LOGIN',
          payload: data.user || data,
        }),
        'Failed to verify OTP for new phone',
      )
    },
    [handleApiCall],
  )

  // Support APIs
  const createSupportTicket = useCallback(
    async (ticketData) => {
      return handleApiCall(
        () => websiteApi.createSupportTicket(ticketData),
        null,
        'Failed to create support ticket',
      )
    },
    [handleApiCall],
  )

  const initiateSupportCall = useCallback(
    async (orderId, issue) => {
      return handleApiCall(
        () => websiteApi.initiateSupportCall({ orderId, issue }),
        null,
        'Failed to initiate support call',
      )
    },
    [handleApiCall],
  )

  // Logout
  const logout = useCallback(async () => {
    return handleApiCall(
      websiteApi.websiteLogout,
      () => ({ type: 'AUTH_LOGOUT' }),
      'Failed to logout',
    )
  }, [handleApiCall])

  return {
    loading,
    error,
    requestOTP,
    verifyOTP,
    loginWithOtp,
    register,
    getAdminID,
    fetchProducts,
    fetchProductDetails,
    fetchCategories,
    fetchPopularProducts,
    fetchOffers,
    searchProducts,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    validateCart,
    assignUser,
    checkUserStock,
    createOrder,
    fetchOrders,
    fetchOrderDetails,
    trackOrder,
    cancelOrder,
    createPaymentIntent,
    confirmPayment,
    createRemainingPaymentIntent,
    confirmRemainingPayment,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    fetchFavourites,
    addToFavourites,
    removeFromFavourites,
    fetchUserProfile,
    updateUserProfile,
    requestOTPForCurrentPhone,
    verifyOTPForCurrentPhone,
    requestOTPForNewPhone,
    verifyOTPForNewPhone,
    createSupportTicket,
    initiateSupportCall,
    logout,
  }
}

