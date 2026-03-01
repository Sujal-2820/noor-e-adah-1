import { createContext, useContext, useMemo, useReducer, useEffect, useState } from 'react'
import { getUserProfile, getFinancialSettings } from '../services/userApi'

const initialState = {
  language: 'en',
  role: null,
  authenticated: false,
  profile: {
    name: 'Guest User',
    email: '',
    phone: '',
    location: null,
    coverageRadius: 20,
  },
  cart: [],
  favourites: [],
  notifications: [],
  dashboard: {
    overview: null,
    orders: null,
    inventory: null,
    reports: null,
    loading: false,
    error: null,
  },
  ordersUpdated: false,
  inventoryUpdated: false,
  realtimeConnected: false,
  settings: {
    minOrderValue: 2000,
    advancePaymentPercent: 30,
    deliveryCharge: 50,
    minimumUserPurchase: 50000,
  },
}

// Use a symbol to detect if context is actually provided
const VENDOR_CONTEXT_SYMBOL = Symbol('UserContextProvided')

const UserStateContext = createContext(null)
const UserDispatchContext = createContext(null)

function reducer(state, action) {
  // Robust attribute comparison (handles key order differences)
  const areAttributesEqual = (attr1, attr2) => {
    const a = attr1 || {}
    const b = attr2 || {}
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => String(a[key]) === String(b[key]))
  }

  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload }
    case 'SET_ROLE':
      return { ...state, role: action.payload }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'AUTH_LOGIN':
      return {
        ...state,
        authenticated: true,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      }
    case 'AUTH_LOGOUT':
      return {
        ...state,
        authenticated: false,
        profile: initialState.profile,
        notifications: [],
        dashboard: initialState.dashboard,
        ordersUpdated: false,
        inventoryUpdated: false,
      }
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      }
    case 'SET_DASHBOARD_LOADING':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          loading: action.payload,
        },
      }
    case 'SET_DASHBOARD_ERROR':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          error: action.payload,
          loading: false,
        },
      }
    case 'SET_DASHBOARD_OVERVIEW':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          overview: action.payload,
          loading: false,
          error: null,
        },
      }
    case 'SET_ORDERS_DATA':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          orders: action.payload,
          loading: false,
          error: null,
        },
      }
    case 'SET_INVENTORY_DATA':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          inventory: action.payload,
          loading: false,
          error: null,
        },
      }
    case 'SET_REPORTS_DATA':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          reports: action.payload,
          loading: false,
          error: null,
        },
      }
    case 'UPDATE_ORDER_STATUS': {
      const targetId = action.payload.orderId?.toString?.() ?? String(action.payload.orderId || '')
      const applyOrderUpdates = (order) => {
        const currentId =
          order.id?.toString?.() ??
          order._id?.toString?.() ??
          order.orderId?.toString?.() ??
          ''
        if (currentId && targetId && currentId === targetId) {
          return {
            ...order,
            status: action.payload.status ?? order.status,
            ...(action.payload.updates || {}),
          }
        }
        return order
      }

      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          orders: state.dashboard.orders
            ? {
              ...state.dashboard.orders,
              orders: state.dashboard.orders.orders?.map(applyOrderUpdates),
            }
            : null,
        },
        ordersUpdated: true,
      }
    }
    case 'UPDATE_INVENTORY_STOCK':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          inventory: state.dashboard.inventory
            ? {
              ...state.dashboard.inventory,
              items: state.dashboard.inventory.items?.map((item) =>
                item.id === action.payload.itemId
                  ? { ...item, stock: action.payload.stock }
                  : item,
              ),
            }
            : null,
        },
        inventoryUpdated: true,
      }
    case 'SET_ORDERS_UPDATED':
      return {
        ...state,
        ordersUpdated: action.payload,
      }
    case 'SET_INVENTORY_UPDATED':
      return {
        ...state,
        inventoryUpdated: action.payload,
      }
    case 'ADD_NOTIFICATION': {
      // Check if notification already exists (prevent duplicates)
      const existingIndex = state.notifications.findIndex(
        (n) => n.id === action.payload.id || (n.type === action.payload.type && n.data?.orderId === action.payload.data?.orderId),
      )
      if (existingIndex >= 0) {
        return state
      }
      return {
        ...state,
        notifications: [
          {
            id: action.payload.id || Date.now().toString(),
            ...action.payload,
            read: action.payload.read || false,
            timestamp: action.payload.timestamp || new Date().toISOString(),
          },
          ...state.notifications,
        ],
      }
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
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload || [],
      }
    case 'ADD_TO_CART': {
      const { productId, variantAttributes, quantity: rawQuantity } = action.payload
      const quantity = typeof rawQuantity === 'number' && !isNaN(rawQuantity) ? Math.max(1, rawQuantity) : 1

      const existingItem = state.cart.find((item) =>
        item.productId === productId &&
        areAttributesEqual(item.variantAttributes, variantAttributes)
      )
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.productId === productId &&
              areAttributesEqual(item.variantAttributes, variantAttributes)
              ? { ...item, quantity: (item.quantity || 0) + quantity }
              : item,
          ),
        }
      }
      return {
        ...state,
        cart: [...state.cart, { ...action.payload, quantity }],
      }
    }
    case 'UPDATE_CART_ITEM': {
      const { productId, variantAttributes, quantity: rawQuantity } = action.payload
      const quantity = typeof rawQuantity === 'number' && !isNaN(rawQuantity) ? Math.max(1, rawQuantity) : 1

      return {
        ...state,
        cart: state.cart.map((item) =>
          item.productId === productId &&
            areAttributesEqual(item.variantAttributes, variantAttributes)
            ? { ...item, quantity }
            : item,
        ),
      }
    }
    case 'REMOVE_FROM_CART': {
      return {
        ...state,
        cart: state.cart.filter((item) =>
          !(item.productId === action.payload.productId &&
            areAttributesEqual(item.variantAttributes, action.payload.variantAttributes))
        ),
      }
    }
    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
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
    case 'SET_REALTIME_CONNECTED':
      return {
        ...state,
        realtimeConnected: action.payload,
      }
    default:
      return state
  }
}

export function UserProvider({ children }) {
  // Load cart from localStorage on initial mount
  const getInitialState = () => {
    try {
      const savedCart = localStorage.getItem('user_cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        return { ...initialState, cart: Array.isArray(parsedCart) ? parsedCart : [] }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
    }
    return initialState
  }

  const [state, dispatch] = useReducer(reducer, getInitialState())
  const [isInitialized, setIsInitialized] = useState(false)

  // Get toast functions from context (if available)
  let showToast = (message, type) => {
    // Fallback if toast is not available
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  // Initialize user profile from token on mount
  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('user_token')
      if (token && !state.authenticated) {
        try {
          const profileResult = await getUserProfile()

          if (profileResult.success && profileResult.data?.user) {
            const user = profileResult.data.user
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                ...user,
                id: user.id || user._id,
              },
            })
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('user_token')
          }
        } catch (error) {
          console.error('Failed to initialize user:', error)
          // Token might be invalid, remove it
          localStorage.removeItem('user_token')
        }
      }
      setIsInitialized(true)
    }

    initializeUser()
  }, [state.authenticated]) // Run when authenticated state changes

  // Fetch financial settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getFinancialSettings()
        if (result.success && result.data) {
          dispatch({ type: 'SET_SETTINGS', payload: result.data })
        }
      } catch (error) {
        console.error('Failed to fetch financial settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('user_cart', JSON.stringify(state.cart))
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [state.cart])

  const value = useMemo(() => ({ ...state, [VENDOR_CONTEXT_SYMBOL]: true }), [state])
  const dispatchWithSymbol = useMemo(() => {
    const wrappedDispatch = (action) => dispatch(action)
    wrappedDispatch[VENDOR_CONTEXT_SYMBOL] = true
    return wrappedDispatch
  }, [dispatch])
  return (
    <UserStateContext.Provider value={value}>
      <UserDispatchContext.Provider value={dispatchWithSymbol}>{children}</UserDispatchContext.Provider>
    </UserStateContext.Provider>
  )
}

export function useUserState() {
  const context = useContext(UserStateContext)
  if (!context || !context[VENDOR_CONTEXT_SYMBOL]) {
    if (import.meta.env.DEV) {
      console.error('useUserState must be used within UserProvider')
      throw new Error('useUserState must be used within UserProvider')
    }
    // In production, return initial state to prevent crashes
    return initialState
  }
  // Remove the symbol before returning
  const { [VENDOR_CONTEXT_SYMBOL]: _, ...state } = context
  return state
}

export function useUserDispatch() {
  const dispatch = useContext(UserDispatchContext)
  if (!dispatch || !dispatch[VENDOR_CONTEXT_SYMBOL]) {
    if (import.meta.env.DEV) {
      console.error('useUserDispatch must be used within UserProvider')
      throw new Error('useUserDispatch must be used within UserProvider')
    }
    // In production, return a no-op function to prevent crashes
    return () => {
      if (import.meta.env.DEV) {
        console.warn('UserDispatch called outside UserProvider')
      }
    }
  }
  // Return the dispatch function directly
  return dispatch
}

