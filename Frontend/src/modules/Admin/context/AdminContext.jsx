import { createContext, useContext, useMemo, useReducer, useEffect } from 'react'
import { initializeRealtimeConnection, handleRealtimeNotification } from '../services/adminApi'

const AdminStateContext = createContext(null)
const AdminDispatchContext = createContext(() => { })

const initialState = {
  activeTenant: 'Noor E Adah Super Admin',
  authenticated: false,
  profile: {
    name: 'Guest Admin',
    phone: '',
    role: '',
  },
  filters: {
    region: 'All',
    period: '30d',
  },
  notifications: [],
  dashboard: {
    data: null,
    loading: false,
    error: null,
  },
  products: {
    data: null,
    updated: false,
  },
  users: {
    data: null,
    updated: false,
  },
  orders: {
    data: null,
    updated: false,
  },
  analytics: {
    data: null,
  },
  tasks: {
    data: null,
    pendingCount: 0,
    updated: false,
  },
  realtimeConnected: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
      }
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
      }
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
        products: initialState.products,
        users: initialState.users,
        orders: initialState.orders,
        analytics: initialState.analytics,
        tasks: initialState.tasks,
      }
    case 'SET_DASHBOARD_DATA':
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          data: action.payload,
          loading: false,
          error: null,
        },
      }
    case 'SET_PRODUCTS_DATA':
      return {
        ...state,
        products: {
          ...state.products,
          data: action.payload,
        },
      }
    case 'SET_PRODUCTS_UPDATED':
      return {
        ...state,
        products: {
          ...state.products,
          updated: action.payload,
        },
      }
    case 'SET_USERS_DATA':
      return {
        ...state,
        users: {
          ...state.users,
          data: action.payload,
        },
      }
    case 'SET_USERS_UPDATED':
      return {
        ...state,
        users: {
          ...state.users,
          updated: action.payload,
        },
      }
    case 'SET_ORDERS_DATA':
      return {
        ...state,
        orders: {
          ...state.orders,
          data: action.payload,
        },
      }
    case 'SET_ORDERS_UPDATED':
      return {
        ...state,
        orders: {
          ...state.orders,
          updated: action.payload,
        },
      }
    case 'SET_ANALYTICS_DATA':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          data: action.payload,
        },
      }
    case 'SET_TASKS_DATA':
      return {
        ...state,
        tasks: {
          ...state.tasks,
          data: action.payload.tasks,
          pendingCount: action.payload.totalPending,
          updated: false,
        },
      }
    case 'SET_TASKS_UPDATED':
      return {
        ...state,
        tasks: {
          ...state.tasks,
          updated: action.payload,
        },
      }
    case 'ADD_NOTIFICATION': {
      // Check if notification already exists (prevent duplicates)
      const existingIndex = state.notifications.findIndex(
        (n) => n.id === action.payload.id || (n.type === action.payload.type && n.data?.id === action.payload.data?.id),
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
    case 'SET_REALTIME_CONNECTED':
      return {
        ...state,
        realtimeConnected: action.payload,
      }
    default:
      return state
  }
}

export function AdminProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Get toast functions from context (if available)
  let showToast = (message, type) => {
    // Fallback if toast is not available
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  // Initialize real-time connection when authenticated
  useEffect(() => {
    if (state.authenticated && state.profile.id) {
      const cleanup = initializeRealtimeConnection((notification) => {
        handleRealtimeNotification(notification, dispatch, showToast)
      })

      dispatch({ type: 'SET_REALTIME_CONNECTED', payload: true })

      return () => {
        cleanup()
        dispatch({ type: 'SET_REALTIME_CONNECTED', payload: false })
      }
    }
  }, [state.authenticated, state.profile.id, dispatch])

  const value = useMemo(() => state, [state])

  return (
    <AdminStateContext.Provider value={value}>
      <AdminDispatchContext.Provider value={dispatch}>{children}</AdminDispatchContext.Provider>
    </AdminStateContext.Provider>
  )
}

export function useAdminState() {
  const context = useContext(AdminStateContext)
  if (!context) throw new Error('useAdminState must be used within AdminProvider')
  return context
}

export function useAdminDispatch() {
  const dispatch = useContext(AdminDispatchContext)
  if (!dispatch) throw new Error('useAdminDispatch must be used within AdminProvider')
  return dispatch
}

