import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useUserDispatch, useUserState } from '../../context/UserContext'
import { useUserApi } from '../../hooks/useUserApi'
import { MobileShell } from '../../components/MobileShell'
import { BottomNavItem } from '../../components/BottomNavItem'
import { MenuList } from '../../components/MenuList'
import {
  BoxIcon,
  CartIcon,
  ChartIcon,
  HomeIcon,
  MenuIcon,
  ReportIcon,
  SparkIcon,
  TruckIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
} from '../../components/icons'

import { cn } from '../../../../lib/cn'
import { useButtonAction } from '../../hooks/useButtonAction'
import { ButtonActionPanel } from '../../components/ButtonActionPanel'
import { useToast, ToastContainer } from '../../components/ToastNotification'
import { OrderEscalationModal } from '../../components/OrderEscalationModal'
import { OrderPartialEscalationModal } from '../../components/OrderPartialEscalationModal'
import { ConfirmationModal } from '../../components/ConfirmationModal'
import { ProductAttributeSelector } from '../../components/ProductAttributeSelector'
import { BankAccountForm } from '../../components/BankAccountForm'
import { NotificationPanel } from '../../components/NotificationPanel'
import { openRazorpayCheckout } from '../../../../utils/razorpay'
import { useTranslation } from '../../../../context/TranslationContext'
import { Trans } from '../../../../components/Trans'
import { TransText } from '../../../../components/TransText'
import { MarkdownRenderer } from '../../../../components/MarkdownRenderer'
import { playNotificationSoundIfEnabled } from '../../../../utils/notificationSound'
import * as catalogApi from '../../../../services/catalogApi'
import * as userApi from '../../services/userApi'

// New Catalog Views
import { UserHomeView } from './views/UserHomeView'
import { UserProductDetailView } from './views/UserProductDetailView'
import { UserCartView } from './views/UserCartView'
import { UserCheckoutView } from './views/UserCheckoutView'
import { UserCategoryProductsView } from './views/UserCategoryProductsView'
import { UserFavouritesView } from './views/UserFavouritesView'
import { UserProfileView } from './views/UserProfileView'
import { UserOrdersView } from './views/UserOrdersView'

const NAV_ITEMS = [
  {
    id: 'home',
    label: <Trans>Shop</Trans>,
    description: <Trans>Our Collections</Trans>,
    icon: HomeIcon,
  },
  {
    id: 'orders',
    label: <Trans>My Orders</Trans>,
    description: <Trans>Order history & status</Trans>,
    icon: TruckIcon,
  },
  {
    id: 'profile',
    label: <Trans>Profile</Trans>,
    description: <Trans>Your information</Trans>,
    icon: UserIcon,
  },
]

export function UserDashboard({ onLogout }) {
  const { profile, dashboard, notifications, cart, favourites } = useUserState()
  const dispatch = useUserDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { tab: urlTab, id: urlId } = useParams()
  const { acceptOrder, confirmOrderAcceptance, cancelOrderAcceptance, acceptOrderPartially, rejectOrder, updateInventoryStock, updateOrderStatus, fetchProfile, updateUserProfile, fetchDashboardData, getOrders, getProducts, getProductDetails, requestWithdrawal, getEarningsSummary, getBankAccounts, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getOrderDetails } = useUserApi()
  const [activeTab, setActiveTab] = useState('home')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const welcomeName = (profile?.name || 'Partner').split(' ')[0]
  const { isOpen, isMounted, currentAction, openPanel, closePanel } = useButtonAction()
  const { translateProduct } = useTranslation()
  const { toasts, dismissToast, success, error, info, warning } = useToast()
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [isNotificationAnimating, setIsNotificationAnimating] = useState(false)
  const previousNotificationsCountRef = useRef(0)

  // Valid tabs for navigation
  const validTabs = ['home', 'orders', 'profile', 'product-detail', 'catalog-cart', 'checkout', 'category-products', 'favourites']

  // Navigate function that updates both state and URL
  const navigateToTab = useCallback((tab, id = null) => {
    if (validTabs.includes(tab)) {
      setActiveTab(tab)
      const path = id ? `/user/dashboard/${tab}/${id}` : `/user/dashboard/${tab}`
      navigate(path, { replace: false })
      closePanel()
    }
  }, [navigate, closePanel, validTabs])

  // Confirmation modal states
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [confirmationData, setConfirmationData] = useState(null)
  const [confirmationLoading, setConfirmationLoading] = useState(false)

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const favouritesCount = favourites.length
  const unreadNotificationCount = useMemo(() => (notifications || []).filter((n) => !n.read).length, [notifications])

  // Catalog Handlers
  const handleAddToCart = useCallback(async (productId, quantity = 1, variantAttributes = null, exactUnitPrice = null) => {
    // If variantAttributes not provided, find the smallest/cheapest one
    let targetAttributes = variantAttributes
    let unitPrice = exactUnitPrice !== null ? Number(exactUnitPrice) : 0
    let productName = ''
    let productImage = ''

    // Always fetch product details to get name and image
    try {
      const result = await getProductDetails(productId)
      if (result.data?.product) {
        const product = result.data.product
        productName = product.name || 'Product'
        productImage = product.primaryImage || product.images?.[0]?.url || ''

        // Only calculate unitPrice if it wasn't explicitly provided
        if (exactUnitPrice === null) {
          if (!targetAttributes && product.attributeStocks?.length > 0) {
            // Find one with smallest userPrice
            const smallest = [...product.attributeStocks]
              .sort((a, b) => (a.userPrice || 0) - (b.userPrice || 0))[0]

            if (smallest) {
              targetAttributes = smallest.attributes instanceof Map ? Object.fromEntries(smallest.attributes) : smallest.attributes
              unitPrice = smallest.userPrice || product.priceToUser || 0
            }
          } else if (targetAttributes && product.attributeStocks?.length > 0) {
            // Find the exact variant matching the provided attributes
            const matchingVariant = product.attributeStocks.find(stock => {
              const stockAttrs = stock.attributes instanceof Map ? Object.fromEntries(stock.attributes) : stock.attributes
              return JSON.stringify(stockAttrs) === JSON.stringify(targetAttributes)
            })
            unitPrice = matchingVariant?.userPrice || product.priceToUser || 0
          } else {
            unitPrice = product.priceToUser || product.price || 0
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch product details:', err)
    }

    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        productId,
        name: productName,
        image: productImage,
        quantity: Number(quantity) || 1,
        variantAttributes: targetAttributes || {},
        unitPrice: Number(unitPrice) || 0,
        timestamp: new Date().toISOString()
      },
    })
    success('Product added to catalog cart')
  }, [dispatch, success, getProductDetails])

  const handleUpdateCartQuantity = useCallback((productId, variantAttributes, quantity) => {
    dispatch({
      type: 'UPDATE_CART_ITEM',
      payload: { productId, variantAttributes, quantity },
    })
  }, [dispatch])

  const handleRemoveFromCart = useCallback((productId, variantAttributes) => {
    dispatch({
      type: 'REMOVE_FROM_CART',
      payload: { productId, variantAttributes },
    })
    info('Item removed from cart')
  }, [dispatch, info])

  const handleProceedToCheckout = useCallback(() => {
    navigateToTab('checkout')
  }, [navigateToTab])

  const handleOrderPlaced = useCallback((order) => {
    success('Order placed successfully!')
    navigateToTab('orders')
  }, [navigateToTab, success])

  const handleToggleFavourite = useCallback((productId) => {
    if (favourites.includes(productId)) {
      dispatch({ type: 'REMOVE_FROM_FAVOURITES', payload: { productId } })
      info('Removed from catalog favourites')
    } else {
      dispatch({ type: 'ADD_TO_FAVOURITES', payload: { productId } })
      success('Added to catalog favourites')
    }
  }, [dispatch, favourites, info, success])

  const navigateToProductDetail = useCallback((productId) => {
    setSelectedProduct(productId)
    navigateToTab('product-detail', productId)
  }, [navigateToTab])


  // Initialize tab from URL parameter on mount or when URL changes
  useEffect(() => {
    const tab = urlTab || 'overview'
    if (validTabs.includes(tab)) {
      setActiveTab(tab)
      if (tab === 'product-detail' && urlId) {
        setSelectedProduct(urlId)
      }
      closePanel()
    } else {
      // Invalid tab, redirect to overview
      navigate('/user/dashboard/overview', { replace: true })
    }
  }, [urlTab, urlId, navigate, closePanel])


  // Listen for navigation events from children
  useEffect(() => {
    const handleNavigate = (e) => {
      if (e.detail) navigateToTab(e.detail)
    }
    window.addEventListener('navigate-to-tab', handleNavigate)
    return () => window.removeEventListener('navigate-to-tab', handleNavigate)
  }, [navigateToTab])

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeTab])

  // Fetch user profile and dashboard data on mount (only if authenticated or has token)
  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (!token) {
      // No token, redirect to login only if not already on login page
      dispatch({ type: 'AUTH_LOGOUT' })
      if (location.pathname !== '/user/login') {
        navigate('/user/login', { replace: true })
      }
      return
    }

    const loadUserData = async () => {
      try {
        // Only fetch profile if not already authenticated
        if (!profile?.id) {
          const profileResult = await fetchProfile()
          if (profileResult.data?.user) {
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                ...profileResult.data.user,
                id: profileResult.data.user.id || profileResult.data.user._id,
              },
            })
          } else if (profileResult.error?.status === 401) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem('user_token')
            dispatch({ type: 'AUTH_LOGOUT' })
            if (onLogout) {
              onLogout()
            }
            return
          }
        }

        // Fetch dashboard overview
        const dashboardResult = await fetchDashboardData()
        if (dashboardResult.error?.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('user_token')
          dispatch({ type: 'AUTH_LOGOUT' })
          if (onLogout) {
            onLogout()
          }
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
        if (err.error?.status === 401) {
          localStorage.removeItem('user_token')
          dispatch({ type: 'AUTH_LOGOUT' })
          if (onLogout) {
            onLogout()
          }
        }
      }
    }

    loadUserData()
  }, []) // Only run once on mount
  const tabLabels = useMemo(() => {
    return NAV_ITEMS.reduce((acc, item) => {
      acc[item.id] = item.label
      return acc
    }, {})
  }, [])
  const searchCatalog = useMemo(
    () =>
      [
        {
          id: 'search-overview-hero',
          label: 'Today\'s summary',
          keywords: ['overview', 'summary', 'welcome'],
          tab: 'overview',
          targetId: 'overview-hero',
        },
        {
          id: 'search-overview-services',
          label: 'Other services shortcuts',
          keywords: ['overview', 'services', 'reorder', 'support', 'pricing'],
          tab: 'overview',
          targetId: 'overview-services',
        },
        {
          id: 'search-overview-activity',
          label: 'Recent activity timeline',
          keywords: ['overview', 'activity', 'transactions', 'updates'],
          tab: 'overview',
          targetId: 'overview-activity',
        },
        {
          id: 'search-overview-snapshot',
          label: 'Quick summary',
          keywords: ['overview', 'snapshot', 'summary', 'highlights'],
          tab: 'overview',
          targetId: 'overview-snapshot',
        },
        {
          id: 'search-overview-quick-actions',
          label: 'Quick actions',
          keywords: ['overview', 'actions', 'tasks', 'shortcuts'],
          tab: 'overview',
          targetId: 'overview-quick-actions',
        },
        {
          id: 'search-inventory-header',
          label: 'Stock status',
          keywords: ['inventory', 'stock', 'products', 'items', 'health'],
          tab: 'inventory',
          targetId: 'inventory-header',
        },
        {
          id: 'search-inventory-restock',
          label: 'Need to order more',
          keywords: ['inventory', 'restock', 'order', 'stock'],
          tab: 'inventory',
          targetId: 'inventory-restock',
        },
        {
          id: 'search-orders-header',
          label: 'Orders',
          keywords: ['orders', 'queue', 'availability'],
          tab: 'orders',
          targetId: 'orders-header',
        },
        {
          id: 'search-orders-tracker',
          label: 'Order status',
          keywords: ['orders', 'tracker', 'stages', 'dispatched', 'status'],
          tab: 'orders',
          targetId: 'orders-tracker',
        },
        {
          id: 'search-orders-fallback',
          label: 'Backup delivery',
          keywords: ['orders', 'backup', 'delivery', 'admin', 'send'],
          tab: 'orders',
          targetId: 'orders-fallback',
        },
        {
          id: 'search-reports-overview',
          label: 'Summary overview',
          keywords: ['reports', 'summary', 'insights', 'tips'],
          tab: 'reports',
          targetId: 'reports-overview',
        },
        {
          id: 'search-reports-top-users',
          label: 'Top admins',
          keywords: ['reports', 'summary', 'users', 'admins', 'top'],
          tab: 'reports',
          targetId: 'reports-top-users',
        },
      ].map((item) => ({
        ...item,
        tabLabel: tabLabels[item.tab],
      })),
    [tabLabels],
  )
  const [searchMounted, setSearchMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState({ products: [], categories: [] })
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [pendingScroll, setPendingScroll] = useState(null)
  const searchInputRef = useRef(null)

  const handleLogout = () => {
    localStorage.removeItem('user_token')
    dispatch({ type: 'AUTH_LOGOUT' })
    onLogout?.()
  }

  const navigateTo = (target) => {
    navigateToTab(target)
  }


  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (err) {
      // Fallback: try HTML5 audio if Web Audio API is not available
      console.log('Notification sound played (fallback)')
    }
  }, [])

  // Trigger bell animation and sound when new notification arrives
  useEffect(() => {
    const currentUnreadCount = unreadNotificationCount
    const previousUnreadCount = previousNotificationsCountRef.current

    if (currentUnreadCount > previousUnreadCount) {
      // New notification arrived
      playNotificationSound()
      setIsNotificationAnimating(true)

      // Stop animation after 3 seconds
      const animationTimer = setTimeout(() => {
        setIsNotificationAnimating(false)
      }, 3000)

      return () => clearTimeout(animationTimer)
    }

    previousNotificationsCountRef.current = currentUnreadCount
  }, [unreadNotificationCount, playNotificationSound])

  // Handle notification panel open/close
  const handleNotificationClick = () => {
    setNotificationPanelOpen(true)
  }

  const handleNotificationPanelClose = () => {
    setNotificationPanelOpen(false)
  }

  // Track previous unread count for sound notification
  const prevUnreadCountRef = useRef(0)

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getNotifications({ page: 1, limit: 50 })
      if (result.data?.notifications) {
        const newNotifications = result.data.notifications
        const newUnreadCount = newNotifications.filter(n => !n.read).length

        // Play sound if there are more unread notifications than before
        if (newUnreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
          playNotificationSoundIfEnabled()
        }
        prevUnreadCountRef.current = newUnreadCount

        dispatch({ type: 'SET_NOTIFICATIONS', payload: newNotifications })
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [getNotifications, dispatch])

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications()

    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Mark notification as read
  const handleMarkNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId)
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id: notificationId } })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [markNotificationAsRead, dispatch])

  // Mark all notifications as read
  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })
      // Refresh notifications after marking all as read
      fetchNotifications()
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [markAllNotificationsAsRead, dispatch, fetchNotifications])

  const buildMenuItems = (close) => [
    ...NAV_ITEMS.map((item) => ({
      id: item.id,
      label: <Trans>{item.label}</Trans>,
      description: <Trans>{item.description}</Trans>,
      icon: <item.icon className="h-4 w-4" />,
      onSelect: () => {
        navigateToTab(item.id)
        close()
      },
    })),
    {
      id: 'logout',
      label: <Trans>Logout</Trans>,
      icon: <MenuIcon className="h-4 w-4" />,
      description: <Trans>Log out from user account</Trans>,
      onSelect: () => {
        handleLogout()
        close()
      },
    },
  ]
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return searchCatalog.slice(0, 7)
    }
    const tokens = query.split(/\s+/).filter(Boolean)
    const results = searchCatalog
      .map((item) => {
        const haystack = `${item.label} ${item.tabLabel} ${item.keywords.join(' ')}`.toLowerCase()
        const directIndex = haystack.indexOf(query)
        const directScore = directIndex >= 0 ? 200 - directIndex : 0
        const tokenScore = tokens.reduce((score, token) => (haystack.includes(token) ? score + 20 : score), 0)
        const score = directScore + tokenScore
        return { ...item, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
    return results.length ? results : searchCatalog.slice(0, 5)
  }, [searchCatalog, searchQuery])

  // Fetch search suggestions with debouncing
  useEffect(() => {
    if (!searchQuery.trim() || !searchOpen) {
      setSearchSuggestions({ products: [], categories: [] })
      setLoadingSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    const timeoutId = setTimeout(async () => {
      try {
        // Fetch both products and categories
        const [productsResult, categoriesResult] = await Promise.all([
          getProducts({ search: searchQuery.trim(), limit: 5 }),
          catalogApi.getCategories()
        ])

        const products = productsResult.data?.products || []
        const allCategories = categoriesResult.success ? (categoriesResult.data?.categories || []) : []

        // Filter categories that match search query
        const matchingCategories = allCategories.filter(cat =>
          cat.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 3)

        setSearchSuggestions({ products, categories: matchingCategories })
      } catch (error) {
        console.error('Error fetching search suggestions:', error)
        setSearchSuggestions({ products: [], categories: [] })
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchOpen, getProducts])

  const openSearch = () => {
    setSearchMounted(true)
    requestAnimationFrame(() => setSearchOpen(true))
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchSuggestions({ products: [], categories: [] })
    setLoadingSuggestions(false)
    setTimeout(() => {
      setSearchMounted(false)
      setSearchQuery('')
    }, 260)
  }

  const handleSearchNavigate = (item) => {
    if (!item) return
    const delay = item.tab === activeTab ? 150 : 420
    navigateToTab(item.tab)
    setPendingScroll({ id: item.targetId, delay })
    closeSearch()
  }

  const handleSearchSubmit = () => {
    if (searchResults.length) {
      handleSearchNavigate(searchResults[0])
    }
  }

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [searchOpen])

  useEffect(() => {
    if (!pendingScroll) return
    const { id, delay } = pendingScroll
    const timer = setTimeout(() => {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      }
      setPendingScroll(null)
    }, delay)
    return () => clearTimeout(timer)
  }, [pendingScroll, activeTab])

  return (
    <>
      <MobileShell
        isHome={activeTab === 'home'}
        title={profile?.name || 'Partner'}
        subtitle={profile?.location?.city ? `${profile.location.city}${profile.location.state ? `, ${profile.location.state}` : ''}` : <Trans>Location not set</Trans>}
        onSearchClick={openSearch}
        onNotificationClick={handleNotificationClick}
        notificationCount={unreadNotificationCount}
        favouritesCount={favouritesCount}
        cartCount={cartCount}
        onNavigate={navigateToTab}
        onLogout={handleLogout}
        onLogin={() => navigate('/user/login')}
        isAuthenticated={true}
        isNotificationAnimating={isNotificationAnimating}
        navigation={NAV_ITEMS.map((item) => (
          <BottomNavItem
            key={item.id}
            label={<Trans>{item.label}</Trans>}
            active={activeTab === item.id}
            onClick={() => navigateToTab(item.id)}
            icon={<item.icon active={activeTab === item.id} className="h-6 w-6" />}
            badge={item.id === 'home' && cartCount > 0 ? cartCount : undefined}
          />
        ))}
        menuContent={({ close }) => <MenuList items={buildMenuItems(close)} active={activeTab} />}
      >
        <section className="space-y-6">
          {activeTab === 'home' && (
            <UserHomeView
              onProductClick={(productId) => {
                if (productId === 'all') {
                  navigateToTab('category-products')
                } else {
                  navigateToProductDetail(productId)
                }
              }}
              onCategoryClick={(catId) => {
                setSelectedCategory(catId)
                navigateToTab('category-products')
              }}
              onAddToCart={handleAddToCart}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
              onSearchClick={openSearch}
              onCartClick={() => navigateToTab('catalog-cart')}
              cartCount={cartCount}
            />
          )}

          {activeTab === 'category-products' && (
            <UserCategoryProductsView
              categoryId={selectedCategory || 'all'}
              onProductClick={navigateToProductDetail}
              onAddToCart={handleAddToCart}
              onBack={() => navigateToTab('home')}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
            />
          )}

          {activeTab === 'favourites' && (
            <UserFavouritesView
              onProductClick={navigateToProductDetail}
              onAddToCart={handleAddToCart}
              onRemoveFromFavourites={handleToggleFavourite}
            />
          )}
          {activeTab === 'product-detail' && selectedProduct && (
            <UserProductDetailView
              productId={selectedProduct}
              onAddToCart={handleAddToCart}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
              onBack={() => navigateToTab('home')}
              onCartClick={() => navigateToTab('catalog-cart')}
            />
          )}
          {activeTab === 'catalog-cart' && (
            <UserCartView
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemove={handleRemoveFromCart}
              onCheckout={handleProceedToCheckout}
              onNavigateToProduct={navigateToProductDetail}
            />
          )}
          {activeTab === 'checkout' && (
            <UserCheckoutView
              onBack={() => navigateToTab('catalog-cart')}
              onOrderPlaced={handleOrderPlaced}
            />
          )}
          {activeTab === 'orders' && <UserOrdersView />}
          {activeTab === 'profile' && <UserProfileView onNavigate={navigateToTab} onLogout={handleLogout} />}
        </section>
      </MobileShell>

      {searchMounted ? (
        <div className={cn('user-search-sheet', searchOpen && 'is-open')}>
          <div className={cn('user-search-sheet__overlay', searchOpen && 'is-open')} onClick={closeSearch} />
          <div className={cn('user-search-sheet__panel', searchOpen && 'is-open')}>
            <div className="user-search-sheet__header">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearchSubmit()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeSearch()
                  }
                }}
                placeholder="Search stock, orders, summary..."
                className="user-search-input"
                aria-label="Search user console"
              />
              <button type="button" className="user-search-cancel" onClick={closeSearch}>
                Cancel
              </button>
            </div>
            <div className="user-search-sheet__body">
              {loadingSuggestions ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400"><Trans>Searching...</Trans></p>
                </div>
              ) : searchQuery.trim() ? (
                <>
                  {/* Products Section */}
                  {searchSuggestions.products.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2">
                        <Trans>Products</Trans>
                      </h3>
                      <div className="space-y-1">
                        {searchSuggestions.products.map((product) => {
                          const productImage = product.images?.[0]?.url || product.primaryImage || product.image || 'https://via.placeholder.com/80'

                          // Robust price calculation for user
                          let displayPrice = 0
                          if (product.attributeStocks && product.attributeStocks.length > 0) {
                            const prices = product.attributeStocks
                              .map(a => a.userPrice || a.priceToUser || 0)
                              .filter(p => p > 0)
                            if (prices.length > 0) {
                              displayPrice = Math.min(...prices)
                            }
                          }

                          if (displayPrice === 0) {
                            displayPrice = product.priceToUser || product.userPrice || product.price || product.priceToUser || 0
                          }

                          return (
                            <button
                              key={product._id || product.id}
                              type="button"
                              onClick={() => {
                                closeSearch()
                                navigateToProductDetail(product._id || product.id)
                              }}
                              className="user-search-result w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <img
                                src={productImage}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                              />
                              <div className="flex-1 text-left min-w-0">
                                <span className="user-search-result__label font-medium block truncate">
                                  <TransText>{product.name}</TransText>
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm font-semibold text-blue-600">₹{displayPrice.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Categories Section */}
                  {searchSuggestions.categories.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2">
                        <Trans>Categories</Trans>
                      </h3>
                      <div className="space-y-1">
                        {searchSuggestions.categories.map((category) => (
                          <button
                            key={category._id || category.id}
                            type="button"
                            onClick={() => {
                              closeSearch()
                              setSelectedCategory(category._id || category.id)
                              navigateToTab('category-products')
                            }}
                            className="user-search-result w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <BoxIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 text-left">
                              <span className="user-search-result__label font-medium block"><TransText>{category.name}</TransText></span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dashboard Sections Section (from searchCatalog) */}
                  {searchResults.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2">
                        <Trans>Dashboard</Trans>
                      </h3>
                      <div className="space-y-1">
                        {searchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSearchNavigate(item)}
                            className="user-search-result w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <span className="user-search-result__label font-medium">{item.label}</span>
                            <span className="user-search-result__meta text-xs text-gray-400">{item.tabLabel}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results found in anything */}
                  {searchResults.length === 0 && searchSuggestions.categories.length === 0 && searchSuggestions.products.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-sm font-medium text-gray-400"><Trans>No results found</Trans></p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400"><Trans>Start typing to search...</Trans></p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isMounted && (
        <ButtonActionPanel
          action={currentAction}
          isOpen={isOpen}
          onClose={closePanel}
          onAction={async (actionData) => {
            // Handle actions with API integration
            const { type, data, buttonId } = actionData

            try {
              // Order actions
              if (buttonId === 'order-available' && data.orderId) {
                const result = await acceptOrder(data.orderId, data.notes)
                if (result.data) {
                  success('Order acceptance initiated. You have 1 hour to confirm or escalate.')
                  getOrders().then((result) => {
                    if (result.data) {
                      dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })

                    }
                  })
                } else if (result.error) {
                  error(result.error.message || 'Failed to accept order')
                }
              } else if (buttonId === 'confirm-acceptance' && data.orderId) {
                const result = await confirmOrderAcceptance(data.orderId, { notes: data.notes })
                if (result.data) {
                  success('Order acceptance confirmed successfully!')
                  getOrders().then((result) => {
                    if (result.data) {
                      dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })

                    }
                  })
                } else if (result.error) {
                  error(result.error.message || 'Failed to confirm acceptance')
                }
              } else if (buttonId === 'cancel-acceptance' && data.orderId) {
                const result = await cancelOrderAcceptance(data.orderId, { reason: data.reason })
                if (result.data) {
                  success('Order acceptance cancelled. You can now escalate if needed.')
                  getOrders().then((result) => {
                    if (result.data) {
                      dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })

                    }
                  })
                } else if (result.error) {
                  error(result.error.message || 'Failed to cancel acceptance')
                }
              } else if (buttonId === 'order-not-available' && data.orderId) {
                // Open a panel to get reason for rejection
                openPanel('order-reject-reason', { orderId: data.orderId })
              } else if (buttonId === 'order-reject-confirm' && data.orderId && data.reason) {
                const result = await rejectOrder(data.orderId, { reason: data.reason, notes: data.notes })
                if (result.data) {
                  success('Order rejected and forwarded to Admin')
                  // Refresh orders and dashboard
                  getOrders().then((result) => {
                    if (result.data) {
                      dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
                    }
                  })
                  fetchDashboardData()
                  // Navigate to orders tab if not already there
                  if (activeTab !== 'orders') {
                    navigateToTab('orders')
                  }
                } else if (result.error) {
                  error(result.error.message || 'Failed to reject order')
                }
              } else if (buttonId === 'order-partial-accept' && data.orderId && data.orderItems) {
                // Handle partial order acceptance
                const acceptedItems = data.orderItems.filter((item) => item.action === 'accept')
                const rejectedItems = data.orderItems.filter((item) => item.action === 'reject')

                if (acceptedItems.length === 0 && rejectedItems.length === 0) {
                  error('Please select at least one item to accept or reject')
                  return
                }

                const partialData = {
                  acceptedItems: acceptedItems.map((item) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                  })),
                  rejectedItems: rejectedItems.map((item) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    reason: item.reason || 'Insufficient stock',
                  })),
                  notes: data.notes || '',
                }

                const result = await acceptOrderPartially(data.orderId, partialData)
                if (result.data) {
                  const acceptedCount = acceptedItems.length
                  const rejectedCount = rejectedItems.length
                  success(
                    `Order partially accepted. ${acceptedCount} item(s) will be fulfilled by you, ${rejectedCount} item(s) escalated to Admin.`
                  )
                  // Refresh orders and dashboard
                  getOrders().then((result) => {
                    if (result.data) {
                      dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
                      // If viewing order details, refresh the order

                    }
                  })
                  fetchDashboardData()
                  // Navigate to orders tab if not already there
                  if (activeTab !== 'orders') {
                    navigateToTab('orders')
                  }
                } else if (result.error) {
                  error(result.error.message || 'Failed to accept order partially')
                }
              } else if (buttonId === 'update-order-status' && data.orderId && data.status) {
                const updatePayload = {
                  status: data.status
                }
                if (data.notes) {
                  updatePayload.notes = data.notes
                }
                if (data.isRevert) {
                  updatePayload.isRevert = data.isRevert
                }

                const result = await updateOrderStatus(data.orderId, updatePayload)
                if (result.data) {
                  // Show message from backend (includes grace period info if applicable)
                  success(result.data.message || 'Order status updated successfully!')

                  // Refresh orders list and dashboard
                  getOrders().then((result) => {
                    if (result.data) {
                      dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
                    }
                  })
                  fetchDashboardData()
                } else if (result.error) {
                  error(result.error.message || 'Failed to update order status')
                }
              }
              // Inventory actions
              else if (buttonId === 'update-stock' && data.itemId && data.newStock !== undefined) {
                const result = await updateInventoryStock(data.itemId, {
                  quantity: parseFloat(data.newStock),
                  notes: data.reason,
                })
                if (result.data) {
                  success('Stock updated successfully!')
                  // Refresh dashboard data to update inventory stats
                  fetchDashboardData()
                  // Navigate to inventory tab if not already there
                  if (activeTab !== 'inventory') {
                    navigateToTab('inventory')
                  }
                } else if (result.error) {
                  error(result.error.message || 'Failed to update stock')
                }
              }
              // Withdrawal request actions
              else if (buttonId === 'request-withdrawal' && data.amount) {
                const withdrawalAmount = parseFloat(data.amount)
                const availableBalance = data.availableBalance || 0

                // Validate amount
                if (withdrawalAmount < 1000) {
                  error('Minimum withdrawal amount is ₹1,000')
                  return
                }

                if (withdrawalAmount > availableBalance) {
                  error(`Insufficient balance. Available: ₹${Math.round(availableBalance).toLocaleString('en-IN')}, Requested: ₹${withdrawalAmount.toLocaleString('en-IN')}`)
                  return
                }

                // Get bank account details for confirmation
                let bankAccountDetails = null
                if (data.bankAccountId && data.bankAccounts) {
                  const selectedAccount = data.bankAccounts.find(acc => (acc._id || acc.id) === data.bankAccountId)
                  if (selectedAccount) {
                    bankAccountDetails = {
                      'Account Holder': selectedAccount.accountHolderName || 'N/A',
                      'Account Number': `****${(selectedAccount.accountNumber || '').slice(-4)}`,
                      'IFSC Code': selectedAccount.ifscCode || 'N/A',
                      'Bank Name': selectedAccount.bankName || 'N/A',
                    }
                  }
                }

                // Show confirmation modal
                setConfirmationData({
                  type: 'withdrawal',
                  amount: withdrawalAmount,
                  availableBalance,
                  bankAccountId: data.bankAccountId,
                  bankAccountDetails,
                })
                setConfirmationModalOpen(true)
                closePanel() // Close the action panel
              }
              // Admin request actions
              else if (type === 'update' && data.type === 'admin_request') {
                // Simulate sending request to admin (this would be a separate API endpoint)
                success('Request sent to admin successfully. You will be notified once reviewed.')
              } else {
                // Default success message for other actions
                success('Action completed successfully')
              }
            } catch (err) {
              error(err.message || 'An unexpected error occurred')
            }
          }}
          onShowNotification={(message, type = 'info') => {
            if (type === 'success') success(message)
            else if (type === 'error') error(message)
            else if (type === 'warning') warning(message)
            else info(message)
          }}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModalOpen}
        onClose={() => {
          setConfirmationModalOpen(false)
          setConfirmationData(null)
        }}
        onConfirm={async () => {
          if (!confirmationData) return

          setConfirmationLoading(true)
          try {
            if (confirmationData.type === 'withdrawal') {
              const withdrawalData = {
                amount: confirmationData.amount,
                bankAccountId: confirmationData.bankAccountId || undefined,
              }
              const result = await requestWithdrawal(withdrawalData)
              if (result.data) {
                success('Withdrawal request submitted successfully. Awaiting admin approval.')
                setConfirmationModalOpen(false)
                setConfirmationData(null)
                // Refresh earnings summary and dashboard
                getEarningsSummary()
                fetchDashboardData()
                // Navigate to earnings tab if not already there
                if (activeTab !== 'earnings') {
                  navigateToTab('earnings')
                }
              } else if (result.error) {
                error(result.error.message || 'Failed to submit withdrawal request')
              }
            }
          } catch (err) {
            error(err.message || 'An unexpected error occurred')
          } finally {
            setConfirmationLoading(false)
          }
        }}
        title="Confirm Withdrawal Request"
        message="Please verify all bank account details and withdrawal amount before proceeding. Once submitted, this request will be sent to admin for approval."
        details={confirmationData ? {
          'Withdrawal Amount': `₹${confirmationData.amount.toLocaleString('en-IN')}`,
          'Available Balance': `₹${Math.round(confirmationData.availableBalance).toLocaleString('en-IN')}`,
          ...(confirmationData.bankAccountDetails || {}),
        } : null}
        loading={confirmationLoading}
      />

      {/* Escalation Modals */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={handleNotificationPanelClose}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      />
    </>
  )
}

function OverviewView({ onNavigate, welcomeName, openPanel }) {
  const { profile, dashboard } = useUserState()
  const [recentWithdrawals, setRecentWithdrawals] = useState([])
  const [availableBalance, setAvailableBalance] = useState(0)

  const {
    fetchDashboardData,
    getWithdrawals,
    getEarningsSummary,
  } = useUserApi()

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData().then((result) => {
      if (result.data) {
        // Data is stored in context via the API hook
      }
    })

    // Fetch available balance from earnings
    getEarningsSummary().then((result) => {
      if (result.data?.availableBalance) {
        setAvailableBalance(result.data.availableBalance)
      }
    }).catch(() => {
      // Silently fail - earnings data is optional
    })
  }, [fetchDashboardData, getEarningsSummary])

  const services = [
    { label: <Trans>Stock</Trans>, note: <Trans>Reorder stock</Trans>, tone: 'success', target: 'inventory', icon: BoxIcon, action: null },
    { label: <Trans>Pricing</Trans>, note: <Trans>Update price</Trans>, tone: 'warn', target: 'inventory', icon: ReportIcon, action: 'update-mrp' },
    { label: <Trans>Send</Trans>, note: <Trans>Arrange truck</Trans>, tone: 'success', target: 'orders', icon: TruckIcon, action: null },
    { label: <Trans>Wallet</Trans>, note: <Trans>View payments</Trans>, tone: 'success', target: 'reports', icon: WalletIcon, action: 'view-payouts' },
    { label: <Trans>Performance</Trans>, note: <Trans>Summary</Trans>, tone: 'success', target: 'reports', icon: ChartIcon, action: null },
    { label: <Trans>Support</Trans>, note: <Trans>Get help</Trans>, tone: 'warn', target: 'orders', icon: MenuIcon, action: null },
    { label: <Trans>Network</Trans>, note: <Trans>Partner list</Trans>, tone: 'success', target: 'reports', icon: HomeIcon, action: null },
    { label: <Trans>Settings</Trans>, note: <Trans>Profile & verification</Trans>, tone: 'success', target: 'profile', icon: UserIcon, action: 'profile-settings' },
  ]

  // Fetch recent withdrawals for activity
  useEffect(() => {
    const loadRecentWithdrawals = async () => {
      try {
        const result = await getWithdrawals({ page: 1, limit: 5, status: 'approved' })
        if (result.data?.withdrawals) {
          setRecentWithdrawals(result.data.withdrawals)
        }
      } catch (err) {
        // Silently fail - withdrawals are optional for activity
      }
    }
    loadRecentWithdrawals()
  }, [getWithdrawals])

  // Use data from context or fallback to snapshot
  const overviewData = dashboard.overview || {}

  // Transform recent orders from backend to activity format
  const recentOrders = overviewData.recentOrders || []
  const orderTransactions = recentOrders.map((order) => {
    const customerName = order.userId?.name || 'Unknown Customer'
    const initials = customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    return {
      name: customerName,
      action: <TransText>{`Order ${order.status === 'pending' ? 'received' : order.status === 'awaiting' ? 'accepted' : order.status}`}</TransText>,
      amount: `+₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
      status: order.status === 'delivered' ? 'Completed' : order.status === 'pending' ? 'Pending' : 'In Progress',
      avatar: initials,
      orderId: order._id || order.id,
      orderNumber: order.orderNumber,
      type: 'order',
      date: order.createdAt || order.updatedAt,
    }
  })

  // Transform recent withdrawals to activity format
  const withdrawalTransactions = recentWithdrawals.map((withdrawal) => {
    const statusText = withdrawal.status === 'approved' ? 'Approved' : withdrawal.status === 'completed' ? 'Completed' : withdrawal.status
    return {
      name: <Trans>Withdrawal Request</Trans>,
      action: <TransText>{`Withdrawal ${statusText}`}</TransText>,
      amount: `-₹${(withdrawal.amount || 0).toLocaleString('en-IN')}`,
      status: <Trans>{statusText}</Trans>,
      avatar: 'WD',
      withdrawalId: withdrawal._id || withdrawal.id,
      type: 'withdrawal',
      date: withdrawal.reviewedAt || withdrawal.createdAt,
    }
  })

  // Combine and sort by date (most recent first)
  const allTransactions = [...orderTransactions, ...withdrawalTransactions].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })

  // If no transactions, use empty array (don't show dummy data)
  const displayTransactions = allTransactions.length > 0 ? allTransactions.slice(0, 4) : []

  // Format available balance from earnings
  const formatAvailableBalance = (balance) => {
    if (!balance || balance === 0) return '₹0'
    if (balance >= 100000) return `₹${(balance / 100000).toFixed(1)}L`
    return `₹${Math.round(balance).toLocaleString('en-IN')}`
  }

  const walletBalance = formatAvailableBalance(availableBalance)

  const quickActions = [
    {
      label: <Trans>Confirm delivery time</Trans>,
      description: <Trans>Set delivery time</Trans>,
      target: 'orders',
      icon: TruckIcon,
      tone: 'Blue',
      action: 'confirm-delivery-slot',
    },
    {
      label: <Trans>Update stock</Trans>,
      description: <Trans>Add new stock / update stock</Trans>,
      target: 'inventory',
      icon: BoxIcon,
      tone: 'orange',
      action: 'update-inventory-batch',
    },
  ]

  useEffect(() => {
    const container = servicesRef.current
    if (!container) return

    const handleScroll = () => {
      const max = container.scrollWidth - container.clientWidth
      if (max <= 0) {
        setServicePage(0)
        return
      }
      const progress = container.scrollLeft / max
      const index = Math.min(2, Math.max(0, Math.round(progress * 2)))
      setServicePage(index)
    }

    handleScroll()
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [services.length])

  return (
    <div className="user-overview space-y-6">
      <section id="overview-hero" className="overview-hero">
        <div className="overview-hero__card">
          <div className="overview-hero__meta">
            <span className="overview-chip overview-chip--success">
              Active Zone • {profile?.coverageRadius || dashboard?.overview?.coverageRadius || 20} km
            </span>
            <span className="overview-chip overview-chip--warn">Today {new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <div className="overview-hero__core">
            <div className="overview-hero__identity">
              <span className="overview-hero__greeting"><Trans>Today's summary</Trans></span>
              <h2 className="overview-hero__welcome">{welcomeName}</h2>
            </div>
            <div className="overview-hero__badge">
              <SparkIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="overview-hero__balance">
            <div>
              <p className="overview-hero__label"><Trans>Wallet Balance</Trans></p>
              <p className="overview-hero__value">{walletBalance}</p>
            </div>
          </div>
          <div className="overview-hero__stats">
            {[
              { label: 'Orders waiting for your reply', value: String(overviewData.orders?.pending || 0) },
              { label: 'Orders in processing', value: String(overviewData.orders?.processing || 0) },
              { label: 'Low stock alerts', value: String(overviewData.inventory?.lowStockCount || 0) },
            ].map((item) => (
              <div key={item.label} className="overview-stat-card">
                <p><Trans>{item.label}</Trans></p>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="overview-services" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Home</Trans></h3>
          </div>
        </div>
        <div ref={servicesRef} className="overview-services__rail">
          {services.map((service) => (
            <button
              key={service.label}
              type="button"
              onClick={() => {
                if (service.action) {
                  openPanel(service.action)
                } else if (service.target) {
                  onNavigate(service.target)
                }
              }}
              className="overview-service-card"
            >
              <span className={cn('overview-service-card__icon', service.tone === 'warn' ? 'is-warn' : 'is-success')}>
                <service.icon className="h-5 w-5" />
              </span>
              <span className="overview-service-card__label"><Trans>{service.label}</Trans></span>
              <span className="overview-service-card__note"><Trans>{service.note}</Trans></span>
            </button>
          ))}
        </div>
        <div className="overview-services__dots" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={cn('overview-services__dot', servicePage === dot && 'is-active')}
            />
          ))}
        </div>
      </section>

      <section id="overview-activity" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Recent Activity</Trans></h3>
          </div>
        </div>
        <div className="overview-activity__list">
          {displayTransactions.length > 0 ? displayTransactions.map((item, index) => (
            <div key={item.orderId || item.withdrawalId || `${item.name}-${index}`} className="overview-activity__item">
              <div className="overview-activity__avatar">{item.avatar}</div>
              <div className="overview-activity__details">
                <div className="overview-activity__row">
                  <span className="overview-activity__name">
                    <TransText>{item.name}</TransText>
                  </span>
                  <span
                    className={cn(
                      'overview-activity__amount',
                      String(item.amount).startsWith('-') ? 'is-negative' : 'is-positive',
                    )}
                  >
                    {item.amount}
                  </span>
                </div>
                <div className="overview-activity__meta">
                </div>
              </div>
            </div>
          )) : (
            <div className="overview-activity__item">
              <div className="overview-activity__details">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            </div>
          )}
        </div>
      </section>


      <section id="overview-snapshot" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Quick summary</h3>
          </div>
        </div>
        <div className="overview-metric-grid">
          {[
            {
              id: 'orders',
              label: <Trans>Total Orders</Trans>,
              value: String(overviewData.orders?.total || 0),
              trend: <Trans>Today</Trans>,
              // Calculate progress based on orders today vs average (if available) or use utilization
              progress: overviewData.orders?.total ? Math.min(100, Math.max(10, (overviewData.orders.total / Math.max(overviewData.orders.averageDaily || 10, 1)) * 50)) : 0
            },
            {
              id: 'inventory',
              label: <Trans>Products</Trans>,
              value: String(overviewData.inventory?.totalProducts || 0),
              trend: <Trans>Assigned</Trans>,
              // Calculate progress based on in-stock vs total products
              progress: overviewData.inventory?.totalProducts ? Math.min(100, Math.max(10, ((overviewData.inventory.totalProducts - (overviewData.inventory.outOfStockCount || 0)) / overviewData.inventory.totalProducts) * 100)) : 0
            },
          ].map((item) => (
            <div key={item.id} className="overview-metric-card">
              <div className="overview-metric-card__head">
                <p>{item.label}</p>
                <span>{item.trend}</span>
              </div>
              <h4>{item.value}</h4>
              <div className="overview-metric-card__bar">
                <span style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="overview-quick-actions" className="overview-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Quick actions</Trans></h3>
          </div>
        </div>
        <div className="overview-callout-grid">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                if (action.action) {
                  openPanel(action.action)
                } else if (action.target) {
                  onNavigate(action.target)
                }
              }}
              className={cn(
                'overview-callout',
                action.tone === 'orange'
                  ? 'is-warn'
                  : action.tone === 'teal'
                    ? 'is-teal'
                    : 'is-success',
              )}
            >
              <span className="overview-callout__icon">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="overview-callout__label"><Trans>{action.label}</Trans></span>
              <span className="overview-callout__note"><Trans>{action.description}</Trans></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function InventoryView({ openPanel, onNavigate }) {
  const { dashboard, profile, settings } = useUserState()
  const dispatch = useUserDispatch()
  const { success, error: showError } = useToast()
  const { getProducts, getProductDetails, requestStockPurchase, getStockPurchases, fetchDashboardData } = useUserApi()
  const { translateProduct } = useTranslation()
  const MIN_PURCHASE_VALUE = settings?.minOrderValue || 2000
  const MAX_PURCHASE_VALUE = 100000
  const [productsData, setProductsData] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [orderQuantity, setOrderQuantity] = useState('')
  const [confirmProductName, setConfirmProductName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderError, setOrderError] = useState('')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [selectedProductAttributes, setSelectedProductAttributes] = useState({}) // For single product ordering
  const [selectedProductAttributeStock, setSelectedProductAttributeStock] = useState(null)
  const [showOrderRequestScreen, setShowOrderRequestScreen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([]) // Array of {productId, quantity}
  const [orderRequestForm, setOrderRequestForm] = useState({
    reason: '',
    notes: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankIfsc: '',
    bankBranch: '',
  })
  const [orderRequestError, setOrderRequestError] = useState('')
  const [isOrderRequestSubmitting, setIsOrderRequestSubmitting] = useState(false)
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [isPurchaseHistoryLoading, setIsPurchaseHistoryLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState(null) // Track which product's variants are expanded
  const [productsWithVariants, setProductsWithVariants] = useState({}) // Cache products with full variant details: { productId: product }
  const [loadingVariants, setLoadingVariants] = useState(false) // Track if variants are being loaded
  const orderFormRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (!token) return

    setLoading(true)
    getProducts({ limit: 100 }).then((result) => {
      if (result.data) {
        setProductsData(result.data)
        // Debug: Check if any products have attributeStocks
        const products = result.data.products || []
        const productsWithVariants = products.filter(p =>
          p.attributeStocks &&
          Array.isArray(p.attributeStocks) &&
          p.attributeStocks.length > 0
        )
        if (productsWithVariants.length > 0) {
          console.log('Products with variants found:', productsWithVariants.length, productsWithVariants.map(p => ({ name: p.name, attributeStocks: p.attributeStocks })))
        } else {
          console.log('No products with attributeStocks found. Total products:', products.length)
          // Log first product structure for debugging
          if (products.length > 0) {
            console.log('Sample product structure:', {
              name: products[0].name,
              hasAttributeStocks: !!products[0].attributeStocks,
              attributeStocks: products[0].attributeStocks,
              keys: Object.keys(products[0])
            })
          }
        }
      } else if (result.error?.status === 401) {
        localStorage.removeItem('user_token')
      }
    }).catch((err) => {
      console.error('Failed to load products:', err)
      if (err.error?.status === 401) {
        localStorage.removeItem('user_token')
      }
    }).finally(() => {
      setLoading(false)
    })
  }, [getProducts])

  useEffect(() => {
    setOrderQuantity('')
    setConfirmProductName('')
    setOrderNotes('')
    setOrderError('')
    setSelectedProductAttributes({})
    setSelectedProductAttributeStock(null)
  }, [selectedProduct?.id])

  const resetOrderRequestForm = () => {
    setSelectedProducts([])
    setOrderRequestError('')
    setIsOrderRequestSubmitting(false)
  }

  const openOrderRequestScreen = () => {
    setSelectedProduct(null)
    resetOrderRequestForm()
    setShowOrderRequestScreen(true)
  }

  const closeOrderRequestScreen = () => {
    setShowOrderRequestScreen(false)
    setOrderRequestError('')
  }

  const handleOrderRequestChange = (field, value) => {
    setOrderRequestForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddProduct = (productId) => {
    const exists = selectedProducts.find((p) => p.productId === productId)
    if (!exists) {
      setSelectedProducts((prev) => [...prev, { productId, quantity: '' }])
    }
  }

  const handleAddVariantToOrder = (productId, variantStock) => {
    // Check if this exact variant is already added
    const variantKey = JSON.stringify(variantStock.attributes || {})
    const exists = selectedProducts.find((p) => {
      if (p.productId !== productId) return false
      const existingVariantKey = JSON.stringify(p.attributes || {})
      return existingVariantKey === variantKey
    })

    if (!exists) {
      setSelectedProducts((prev) => [...prev, {
        productId,
        quantity: '',
        attributes: variantStock.attributes || {},
        attributeStock: variantStock
      }])
      // Keep dropdown open so user can add more variants
      // Don't close: setExpandedProductId(null)
    }
  }

  // Fetch product details when user wants to view variants
  const handleViewVariants = async (productId) => {
    // If already expanded, just collapse
    if (expandedProductId === productId) {
      setExpandedProductId(null)
      return
    }

    // If we already have variant details cached, just expand
    if (productsWithVariants[productId]) {
      setExpandedProductId(productId)
      return
    }

    // Otherwise, fetch product details
    setLoadingVariants(true)
    try {
      const result = await getProductDetails(productId)
      if (result.data?.product) {
        const productWithVariants = result.data.product
        // Check if product actually has variants
        const hasVariants = productWithVariants.attributeStocks &&
          Array.isArray(productWithVariants.attributeStocks) &&
          productWithVariants.attributeStocks.length > 0 &&
          productWithVariants.attributeStocks.some(stock => {
            if (!stock) return false
            if (stock.attributes && typeof stock.attributes === 'object') {
              const attrKeys = Object.keys(stock.attributes)
              if (attrKeys.length > 0) {
                return attrKeys.some(key => stock.attributes[key] != null && stock.attributes[key] !== '')
              }
            }
            return false
          })

        // Cache the product (even if no variants, cache it to avoid re-fetching)
        setProductsWithVariants(prev => ({
          ...prev,
          [productId]: productWithVariants
        }))
        // Update the products list with variant info
        setProductsData(prev => {
          if (!prev || !prev.products) return prev
          const updatedProducts = prev.products.map(p =>
            (p.id || p._id)?.toString() === productId
              ? { ...p, attributeStocks: productWithVariants.attributeStocks || [] }
              : p
          )
          return { ...prev, products: updatedProducts }
        })

        // Only expand if product has variants
        if (hasVariants) {
          setExpandedProductId(productId)
        } else {
          // Product has no variants, add it directly to order
          handleAddProduct(productId)
        }
      } else {
        // Product not found or no data, add it directly to order
        handleAddProduct(productId)
      }
    } catch (err) {
      console.error('Failed to load product variants:', err)
      showError('Failed to load product variants')
    } finally {
      setLoadingVariants(false)
    }
  }

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId))
  }

  const handleQuantityChange = (productId, quantity, variantAttributes = null) => {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.productId !== productId) return p
        // If variantAttributes is provided, only update matching variant
        if (variantAttributes && Object.keys(variantAttributes).length > 0) {
          const variantKey = JSON.stringify(variantAttributes)
          const existingVariantKey = JSON.stringify(p.attributes || {})
          if (variantKey === existingVariantKey) {
            return { ...p, quantity }
          }
          return p
        }
        // If no variant attributes, update if this product has no variants
        if (!p.attributes || Object.keys(p.attributes).length === 0) {
          return { ...p, quantity }
        }
        return p
      })
    )
  }

  const loadPurchaseRequests = useCallback(async () => {
    setIsPurchaseHistoryLoading(true)
    try {
      const result = await getStockPurchases({ limit: 5 })
      if (result.data?.purchases) {
        setPurchaseRequests(result.data.purchases)
      }
    } catch (err) {
      console.error('Failed to load purchase requests:', err)
    } finally {
      setIsPurchaseHistoryLoading(false)
    }
  }, [getStockPurchases])

  useEffect(() => {
    if (showOrderRequestScreen) {
      loadPurchaseRequests()
    }
  }, [showOrderRequestScreen, loadPurchaseRequests])

  const handleProductClick = async (product) => {
    setShowOrderRequestScreen(false)
    setLoading(true)
    try {
      const result = await getProductDetails(product.id || product._id)
      if (result.data) {
        setSelectedProduct(result.data.product)
      }
    } catch (err) {
      console.error('Failed to load product details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderStock = () => {
    if (orderFormRef.current) {
      orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleOrderSubmit = async () => {
    if (!selectedProduct) return

    // Check if product has attributes and if they're selected
    const hasAttributes = selectedProduct.attributeStocks &&
      Array.isArray(selectedProduct.attributeStocks) &&
      selectedProduct.attributeStocks.length > 0

    if (hasAttributes && Object.keys(selectedProductAttributes).length === 0) {
      setOrderError(<Trans>Please select a variant before ordering.</Trans>)
      return
    }

    // Use attribute-specific stock/price if available, otherwise use main product values
    const adminStock = selectedProductAttributeStock
      ? (selectedProductAttributeStock.displayStock || 0)
      : (selectedProduct.adminStock ?? selectedProduct.displayStock ?? selectedProduct.stock ?? 0)
    const pricePerUnit = selectedProductAttributeStock
      ? (selectedProductAttributeStock.userPrice || 0)
      : (selectedProduct.pricePerUnit || selectedProduct.priceToUser || 0)
    const quantityNumber = parseFloat(orderQuantity)
    const orderTotal = quantityNumber * pricePerUnit
    const creditRemaining = dashboard.credit?.remaining || 0

    setOrderError('')

    if (!quantityNumber || quantityNumber <= 0) {
      setOrderError(<Trans>Enter a valid quantity to order.</Trans>)
      return
    }
    if (quantityNumber > adminStock) {
      setOrderError(<Trans>Requested quantity exceeds admin stock availability.</Trans>)
      return
    }
    if (orderTotal < MIN_PURCHASE_VALUE) {
      setOrderError(<Trans>Minimum order value is ₹{MIN_PURCHASE_VALUE.toLocaleString('en-IN')}.</Trans>)
      return
    }
    if (!confirmProductName || confirmProductName.trim().toLowerCase() !== selectedProduct.name.trim().toLowerCase()) {
      setOrderError(<Trans>Please type the exact product name to confirm the request.</Trans>)
      return
    }

    setIsSubmittingOrder(true)
    try {
      const itemPayload = {
        productId: selectedProduct.id || selectedProduct._id,
        productName: selectedProduct.name,
        quantity: quantityNumber,
        pricePerUnit,
      }

      // Add attribute combination if product has attributes
      if (hasAttributes && Object.keys(selectedProductAttributes).length > 0) {
        itemPayload.attributeCombination = selectedProductAttributes
      }

      const payload = {
        items: [itemPayload],
        notes: orderNotes ? orderNotes.trim() : undefined,
      }

      const result = await requestStockPurchase(payload)
      if (result.data) {
        success(<Trans>Order request submitted. Admin will review and approve.</Trans>)
        setSelectedProduct(null)
        // Refresh dashboard to update credit info
        fetchDashboardData()
        // Add notification for stock request
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: `stock-request-${Date.now()}`,
            type: 'stock_request',
            title: <Trans>Stock Request Submitted</Trans>,
            message: <Trans>Stock request for {selectedProduct.name || 'product'} submitted. Waiting for admin approval.</Trans>,
            timestamp: new Date().toISOString(),
            data: { productId: selectedProduct.id || selectedProduct._id, productName: selectedProduct.name },
            read: false,
          },
        })
        // Navigate to credit tab to see the request
        if (onNavigate) {
          onNavigate('credit')
        }
      } else if (result.error) {
        const message = result.error.message || 'Failed to submit order request.'
        setOrderError(message)
        showError(message)
      }
    } catch (err) {
      const message = err?.error?.message || err.message || 'Failed to submit order request.'
      setOrderError(message)
      showError(message)
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  const handleOrderRequestSubmit = async () => {
    setOrderRequestError('')

    if (selectedProducts.length === 0) {
      setOrderRequestError('Add at least one product to continue.')
      return
    }



    const purchaseItems = []
    let totalAmount = 0

    for (const selected of selectedProducts) {
      const product = products.find(
        (p) => (p.id || p._id)?.toString() === selected.productId
      )
      if (!product) {
        setOrderRequestError(`Product not found: ${selected.productId}`)
        return
      }

      // Check if product has attributes - check both product data and cached variant data
      // Also check if selected.attributeStock exists (indicates variant was selected, so product has variants)
      const productWithVariants = productsWithVariants[selected.productId] || product
      const hasAttributesInProduct = productWithVariants.attributeStocks &&
        Array.isArray(productWithVariants.attributeStocks) &&
        productWithVariants.attributeStocks.length > 0 &&
        productWithVariants.attributeStocks.some(stock => {
          if (!stock) return false
          if (stock.attributes && typeof stock.attributes === 'object') {
            const attrKeys = Object.keys(stock.attributes)
            if (attrKeys.length > 0) {
              return attrKeys.some(key => stock.attributes[key] != null && stock.attributes[key] !== '')
            }
          }
          return false
        })

      // If selected.attributeStock exists, product definitely has variants
      const hasVariantSelected = selected.attributeStock && selected.attributeStock.attributes
      const hasAttributes = hasAttributesInProduct || hasVariantSelected

      // If product has variants, ensure attributes are selected
      // Check both selected.attributes and selected.attributeStock as indicators
      if (hasAttributes) {
        // Check if variant was selected - attributeStock exists (with attributes) OR attributes object is present and not empty
        const hasAttributeStock = selected.attributeStock &&
          selected.attributeStock.attributes &&
          typeof selected.attributeStock.attributes === 'object' &&
          Object.keys(selected.attributeStock.attributes).length > 0
        const hasAttributesObject = selected.attributes &&
          typeof selected.attributes === 'object' &&
          Object.keys(selected.attributes).length > 0
        const hasSelectedAttributes = hasAttributeStock || hasAttributesObject

        if (!hasSelectedAttributes) {
          setOrderRequestError(`Product ${product.name} requires attribute selection.`)
          return
        }
      }

      const quantityNumber = parseFloat(selected.quantity)
      if (!quantityNumber || quantityNumber <= 0) {
        setOrderRequestError(`Enter a valid quantity for ${product.name}.`)
        return
      }

      // Use attribute-specific stock/price if available, otherwise use main product values
      const adminStock = selected.attributeStock
        ? (selected.attributeStock.displayStock || 0)
        : (product.adminStock ?? product.displayStock ?? product.stock ?? 0)

      if (quantityNumber > adminStock) {
        setOrderRequestError(`Requested quantity for ${product.name} exceeds admin stock (${adminStock}).`)
        return
      }

      const pricePerUnit = selected.attributeStock
        ? (selected.attributeStock.userPrice || 0)
        : (product.pricePerUnit || product.priceToUser || 0)
      const itemTotal = quantityNumber * pricePerUnit
      totalAmount += itemTotal

      const itemPayload = {
        productId: product.id || product._id,
        productName: product.name,
        quantity: quantityNumber,
        pricePerUnit,
      }

      // Add attribute combination if product has attributes and variant was selected
      // Use attributes from selected.attributes or from selected.attributeStock.attributes
      if (hasAttributes && (selected.attributeStock || (selected.attributes && Object.keys(selected.attributes).length > 0))) {
        // Prefer attributes from attributeStock if available, otherwise use selected.attributes
        const attributesToUse = selected.attributeStock?.attributes || selected.attributes || {}
        if (Object.keys(attributesToUse).length > 0) {
          itemPayload.attributeCombination = attributesToUse
        }
      }

      purchaseItems.push(itemPayload)
    }

    if (totalAmount < MIN_PURCHASE_VALUE) {
      setOrderRequestError(`Minimum order value is ₹${MIN_PURCHASE_VALUE.toLocaleString('en-IN')}.`)
      return
    }
    if (totalAmount > MAX_PURCHASE_VALUE) {
      setOrderRequestError(`Maximum order value is ₹${MAX_PURCHASE_VALUE.toLocaleString('en-IN')}. Your request: ₹${totalAmount.toLocaleString('en-IN')}.`)
      return
    }
    // For now, we allow submission but recording the outstanding dues via backend.
    // The previous hard block is removed.
    if (!orderRequestForm.reason || orderRequestForm.reason.trim().length < 10) {
      setOrderRequestError('Please provide a reason (at least 10 characters).')
      return
    }

    const trimmedAccountName = orderRequestForm.bankAccountName?.trim()
    const trimmedAccountNumber = orderRequestForm.bankAccountNumber?.toString().trim()
    const trimmedBankName = orderRequestForm.bankName?.trim()
    const trimmedIfsc = orderRequestForm.bankIfsc?.trim().toUpperCase()

    if (!trimmedAccountName || !trimmedAccountNumber || !trimmedBankName || !trimmedIfsc) {
      setOrderRequestError('Complete bank details are required.')
      return
    }
    if (trimmedAccountNumber.length < 6) {
      setOrderRequestError('Account number looks incomplete.')
      return
    }
    if (trimmedIfsc.length < 4) {
      setOrderRequestError('Please provide a valid IFSC code.')
      return
    }

    setIsOrderRequestSubmitting(true)
    try {
      const payload = {
        items: purchaseItems,
        reason: orderRequestForm.reason.trim(),
        notes: orderRequestForm.notes?.trim() || undefined,
        bankDetails: {
          accountName: trimmedAccountName,
          accountNumber: trimmedAccountNumber,
          bankName: trimmedBankName,
          ifsc: trimmedIfsc,
          bankBranch: orderRequestForm.bankBranch?.trim() || undefined,
        },
      }

      const result = await requestStockPurchase(payload)
      if (result.data) {
        success(`Order request submitted successfully! Request ID: ${result.data.purchase?.creditPurchaseId || 'N/A'}. Admin will review shortly.`)
        resetOrderRequestForm()
        setShowOrderRequestScreen(false)
        loadPurchaseRequests()
        // Refresh dashboard to update credit info
        fetchDashboardData()
        // Add notification for stock request
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: `stock-request-${Date.now()}`,
            type: 'stock_request',
            title: <Trans>Stock Request Submitted</Trans>,
            message: <Trans>Stock request of ₹{totalAmount.toLocaleString('en-IN')} submitted. Waiting for admin approval.</Trans>,
            timestamp: new Date().toISOString(),
            data: { requestId: result.data.requestId || result.data.purchase?._id, amount: totalAmount },
            read: false,
          },
        })
        // Navigate to credit tab to see the request
        if (onNavigate) {
          onNavigate('orders')
        }
      } else if (result.error) {
        const message = result.error.message || 'Failed to submit stock request.'
        setOrderRequestError(message)
        showError(message)
      }
    } catch (err) {
      const message = err?.error?.message || err.message || 'Failed to submit stock request.'
      setOrderRequestError(message)
      showError(message)
    } finally {
      setIsOrderRequestSubmitting(false)
    }
  }

  // Get products from backend
  const products = productsData?.products || []

  const totalProducts = products.length
  // Count products where user has stock assigned (userStock > 0)
  const inStockCount = products.filter((p) => (p.userStock ?? 0) > 0).length
  // Count products where user has no stock (userStock <= 0)
  const outOfStockCount = products.filter((p) => (p.userStock ?? 0) <= 0).length

  const getUserStockStatus = (stock) => {
    const value = Number(stock) || 0
    if (value <= 0) {
      return { label: <Trans>Out of Stock</Trans>, tone: 'critical', helper: <Trans>Order stock to start selling</Trans>, message: <Trans>You have no stock yet</Trans> }
    }
    if (value <= 25) {
      return { label: <Trans>Low Stock</Trans>, tone: 'critical', helper: <Trans>Refill soon</Trans>, message: <Trans>Very low stock</Trans> }
    }
    return { label: <Trans>In Stock</Trans>, tone: 'success', helper: <Trans>Good to go</Trans>, message: <Trans>Sufficient stock</Trans> }
  }

  const topStats = [
    { label: <Trans>Available products</Trans>, value: inStockCount, note: <Trans>Ready to order</Trans>, tone: 'success' },
    { label: <Trans>Out of stock</Trans>, value: outOfStockCount, note: <Trans>Check back later</Trans>, tone: 'warn' },
  ]

  const inventoryStats = [
    { label: <Trans>Out of stock</Trans>, value: `${outOfStockCount}`, meta: <Trans>Not available</Trans>, tone: 'warn' },
  ]

  const metricIcons = [BoxIcon, ChartIcon, SparkIcon, TruckIcon]

  // Generate dynamic alerts based on low stock items from dashboard
  const lowStockItems = dashboard.overview?.inventory?.lowStockItems || []
  const alerts = []

  // Add alert for low stock items if any exist
  if (lowStockItems.length > 0) {
    const lowStockCount = lowStockItems.length
    alerts.push({
      title: <Trans>Need to order more</Trans>,
      body: <Trans>{lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low. Request stock before deadline.</Trans>,
      badge: <Trans>Low stock • Action needed</Trans>,
      tone: 'warn',
      action: <Trans>Raise request</Trans>,
    })
  }

  // Calculate stock progress from actual inventory data
  const stockProgress = {
    Healthy: products.filter(p => {
      const stock = p.userStock ?? 0
      return stock > 75
    }).length,
    Low: products.filter(p => {
      const stock = p.userStock ?? 0
      return stock > 0 && stock <= 75
    }).length,
    Critical: products.filter(p => {
      const stock = p.userStock ?? 0
      return stock === 0
    }).length,
  }

  if (selectedProduct) {
    // Use attribute-specific values if available, otherwise use main product values
    const adminStock = selectedProductAttributeStock
      ? (selectedProductAttributeStock.displayStock || 0)
      : (selectedProduct.adminStock ?? selectedProduct.displayStock ?? selectedProduct.stock ?? 0)
    const userStock = selectedProduct.userStock ?? 0
    const userStockStatus = getUserStockStatus(userStock)
    const ordersCount = selectedProduct.userOrdersCount ?? 0
    const pricePerUnit = selectedProductAttributeStock
      ? (selectedProductAttributeStock.userPrice || 0)
      : (selectedProduct.pricePerUnit || selectedProduct.priceToUser || 0)
    const quantityNumber = parseFloat(orderQuantity) || 0
    const orderTotal = quantityNumber * pricePerUnit

    // Check if product has attributes and if they're selected
    const hasAttributes = selectedProduct.attributeStocks &&
      Array.isArray(selectedProduct.attributeStocks) &&
      selectedProduct.attributeStocks.length > 0
    const attributesSelected = hasAttributes ? Object.keys(selectedProductAttributes).length > 0 : true
    const confirmMatches =
      confirmProductName.trim().toLowerCase() === (selectedProduct.name || '').trim().toLowerCase()
    const canSubmitOrder =
      quantityNumber > 0 &&
      quantityNumber <= adminStock &&
      orderTotal >= MIN_PURCHASE_VALUE &&
      confirmMatches &&
      attributesSelected &&
      !isSubmittingOrder

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-sm font-semibold text-purple-600 hover:text-purple-800"
            >
              ← <Trans>Back to products</Trans>
            </button>
            <h2 className="mt-2 text-2xl font-bold text-gray-900"><TransText>{selectedProduct.name}</TransText></h2>
            <p className="text-sm text-gray-500"><Trans>SKU:</Trans> {selectedProduct.sku || <Trans>N/A</Trans>}</p>
          </div>
          {selectedProduct.stockStatus === 'in_stock' && (
            <button
              type="button"
              onClick={openOrderRequestScreen}
              className="rounded-full bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-purple-700"
            >
              <Trans>Order Stock</Trans>
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-white border border-gray-100 flex items-center justify-center">
              {selectedProduct.primaryImage || selectedProduct.images?.[0]?.url ? (
                <img
                  src={selectedProduct.primaryImage || selectedProduct.images[0].url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50">
                  <BoxIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h4 className="text-sm font-semibold text-gray-700"><Trans>Description</Trans></h4>
              <div className="mt-1">
                {selectedProduct.description ? (
                  <MarkdownRenderer
                    content={selectedProduct.longDescription || selectedProduct.description}
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-500 italic"><Trans>No description available</Trans></p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600"><Trans>User stock status</Trans></p>
                <p
                  className={cn(
                    'text-lg font-bold',
                    userStockStatus.tone === 'success'
                      ? 'text-blue-700'
                      : userStockStatus.tone === 'teal'
                        ? 'text-blue-700'
                        : userStockStatus.tone === 'warn'
                          ? 'text-yellow-700'
                          : 'text-red-700',
                  )}
                >
                  {userStockStatus.label}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  You currently hold {userStock} {selectedProduct.unit || 'kg'}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Admin stock available</p>
                <p className="text-lg font-bold text-gray-900">
                  {adminStock} {selectedProduct.unit || 'kg'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">You can request this much stock from admin</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Price per {selectedProductAttributeStock?.stockUnit || selectedProduct.unit || 'kg'}</p>
                <p className="text-lg font-bold text-purple-600">
                  ₹{pricePerUnit.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Orders fulfilled</p>
                <p className="text-lg font-bold text-gray-900">{ordersCount}</p>
                <p className="text-[11px] text-gray-500 mt-1">Number of orders you handled for this product</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-600">Category</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{selectedProduct.category || '—'}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }

  if (showOrderRequestScreen) {

    // Calculate billing for selected products
    let billingTotal = 0
    const billingItems = selectedProducts.map((selected) => {
      const product = products.find(
        (p) => (p.id || p._id)?.toString() === selected.productId
      )
      if (!product) return null
      const quantity = parseFloat(selected.quantity) || 0

      // Use variant-specific price if available, otherwise use main product price
      const pricePerUnit = selected.attributeStock
        ? (selected.attributeStock.userPrice || 0)
        : (product.pricePerUnit || product.priceToUser || 0)

      const itemTotal = quantity * pricePerUnit
      billingTotal += itemTotal

      return {
        product,
        quantity,
        pricePerUnit,
        unitPrice: pricePerUnit, // Alias for billing display
        itemTotal,
        variantAttributes: selected.attributes || {}, // Include variant attributes for display
      }
    }).filter(Boolean)

    const trimmedAccountName = orderRequestForm.bankAccountName?.trim() || ''
    const trimmedAccountNumber = orderRequestForm.bankAccountNumber?.toString().trim() || ''
    const trimmedBankName = orderRequestForm.bankName?.trim() || ''
    const trimmedIfsc = orderRequestForm.bankIfsc?.trim() || ''
    const bankDetailsComplete =
      trimmedAccountName && trimmedAccountNumber && trimmedBankName && trimmedIfsc
    const reasonValid = orderRequestForm.reason?.trim().length >= 10
    const meetsMinValue = billingTotal >= MIN_PURCHASE_VALUE
    const withinMaxValue = billingTotal <= MAX_PURCHASE_VALUE
    const allQuantitiesValid = selectedProducts.every((selected) => {
      const product = products.find((p) => (p.id || p._id)?.toString() === selected.productId)
      if (!product) return false
      const quantity = parseFloat(selected.quantity) || 0
      const adminStock = product.adminStock ?? product.displayStock ?? product.stock ?? 0
      return quantity > 0 && quantity <= adminStock
    })
    const canSubmitOrderRequest =
      selectedProducts.length > 0 &&
      allQuantitiesValid &&
      meetsMinValue &&
      withinMaxValue &&
      bankDetailsComplete &&
      reasonValid &&
      !isOrderRequestSubmitting

    const pendingDeliveryRequests = purchaseRequests.filter(
      (request) =>
        request.status === 'approved' &&
        ['pending', 'scheduled', 'in_transit'].includes(request.deliveryStatus)
    )

    const formatEta = (request) => {
      if (!request.expectedDeliveryAt) {
        return 'Awaiting schedule'
      }
      const eta = new Date(request.expectedDeliveryAt)
      const diffMs = eta.getTime() - Date.now()
      if (diffMs <= 0) {
        return 'Delivery in progress'
      }
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)))
      return `Arriving in ~${hours}h`
    }

    return (
      <div className="inventory-request-screen space-y-6">
        <div className="inventory-request-screen__header">
          <div>
            <button
              type="button"
              onClick={closeOrderRequestScreen}
              className="text-sm font-semibold text-purple-600 hover:text-purple-800"
            >
              ← <Trans>Go Back</Trans>
            </button>
            <h2 className="mt-2 text-2xl font-bold text-gray-900"><Trans>Request Stock from Admin</Trans></h2>
            <p className="text-sm text-gray-500">
              <Trans>Select products, enter quantities, and submit for approval. Stock arrives within 24 hours after approval.</Trans>
            </p>
          </div>
        </div>

        <div className="inventory-request-layout">

          <div className="inventory-request-card space-y-6">

            {/* Product Cards Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4"><Trans>All Products</Trans></h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const productId = (product.id || product._id)?.toString()
                  const isSelected = selectedProducts.some((p) => p.productId === productId)
                  const isExpanded = expandedProductId === productId

                  // Check if product has variants (either from list or from cached details)
                  // Use cached variant details if available, otherwise check product.attributeStocks
                  const productWithVariants = productsWithVariants[productId] || product

                  // Simplified variant detection:
                  // A product has variants if it has attributeStocks array with at least one entry
                  const hasVariants = Boolean(
                    productWithVariants.attributeStocks &&
                    Array.isArray(productWithVariants.attributeStocks) &&
                    productWithVariants.attributeStocks.length > 0
                  )



                  // Use product with variants for rendering
                  const productToRender = hasVariants && isExpanded ? productWithVariants : product

                  // Check if any variants of this product are selected
                  const hasSelectedVariants = selectedProducts.some(p => p.productId === productId && p.attributes && Object.keys(p.attributes).length > 0)

                  const adminStock = product.adminStock ?? product.displayStock ?? product.stock ?? 0
                  const pricePerUnit = product.pricePerUnit || product.priceToUser || 0

                  // Format attribute label
                  const formatAttributeLabel = (key) => {
                    return key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .trim()
                  }

                  return (
                    <div
                      key={product.id || product._id}
                      className={cn(
                        'inventory-product-card rounded-xl border-2 p-4 transition-all',
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900 mb-1"><TransText>{product.name}</TransText></h4>
                          <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                        </div>
                        {product.primaryImage || product.images?.[0]?.url ? (
                          <img
                            src={product.primaryImage || product.images[0].url}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <BoxIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Show common info only if no variants */}
                      {!hasVariants && (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Admin stock:</span>
                            <span className="font-semibold text-gray-900">{adminStock} {product.unit || 'kg'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-semibold text-purple-600">₹{pricePerUnit.toLocaleString('en-IN')}/{product.unit || 'kg'}</span>
                          </div>
                          {product.category && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Category:</span>
                              <span className="font-semibold text-gray-700 capitalize">{product.category}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show category even if variants exist */}
                      {hasVariants && product.category && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-semibold text-gray-700 capitalize">{product.category}</span>
                          </div>
                        </div>
                      )}

                      {/* Button: View Variants or Add to Order */}
                      {/* Only hide button if non-variant product is selected */}
                      {!isSelected && (
                        <>
                          {/* If product has variants, show "View Variants", otherwise show "Add to Order" */}
                          {hasVariants ? (
                            <button
                              type="button"
                              onClick={() => handleViewVariants(productId)}
                              disabled={adminStock === 0 || (loadingVariants && expandedProductId === productId)}
                              className={cn(
                                'w-full rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-2',
                                adminStock === 0 || (loadingVariants && expandedProductId === productId)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              )}
                            >
                              {loadingVariants && expandedProductId === productId ? (
                                <><Trans>Loading variants...</Trans></>
                              ) : adminStock === 0 ? (
                                <Trans>Out of Stock</Trans>
                              ) : (
                                <>
                                  <Trans>View Variants</Trans>
                                  {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleAddProduct(productId)
                                // Scroll to order form after adding
                                setTimeout(() => {
                                  if (orderFormRef.current) {
                                    orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                  }
                                }, 100)
                              }}
                              disabled={adminStock === 0}
                              className={cn(
                                'w-full rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                                adminStock === 0
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              )}
                            >
                              {adminStock === 0 ? <Trans>Out of Stock</Trans> : <Trans>Add to Order</Trans>}
                            </button>
                          )}
                        </>
                      )}

                      {/* Variants Dropdown */}
                      {hasVariants && isExpanded && productToRender.attributeStocks && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-gray-200">
                          {productToRender.attributeStocks.map((variantStock, idx) => {
                            const variantAttrs = variantStock.attributes || {}
                            const variantAdminStock = variantStock.displayStock || variantStock.actualStock || 0
                            const variantPrice = variantStock.userPrice || 0
                            const variantUnit = variantStock.stockUnit || product.unit || 'kg'

                            // Check if this variant is already added
                            const variantKey = JSON.stringify(variantAttrs)
                            const isVariantAdded = selectedProducts.some((p) => {
                              if (p.productId !== productId) return false
                              const existingVariantKey = JSON.stringify(p.attributes || {})
                              return existingVariantKey === variantKey
                            })

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'p-3 rounded-lg border-2 transition-all',
                                  isVariantAdded
                                    ? 'bg-purple-50 border-purple-300'
                                    : 'bg-white border-gray-200'
                                )}
                              >
                                <div className="space-y-2">
                                  {/* Variant Attributes */}
                                  <div>
                                    {Object.entries(variantAttrs).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-1 text-xs mb-1">
                                        <span className="text-gray-600 font-medium">{formatAttributeLabel(key)}:</span>
                                        <span className="text-gray-900 font-semibold">{value}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Variant Stock and Price */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-600">Stock:</span>
                                      <span className="ml-1 font-semibold text-gray-900">
                                        {variantAdminStock} {variantUnit}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Price:</span>
                                      <span className="ml-1 font-semibold text-purple-600">
                                        ₹{variantPrice.toLocaleString('en-IN')}/{variantUnit}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Add to Order Button */}
                                  {!isVariantAdded ? (
                                    <button
                                      type="button"
                                      onClick={() => handleAddVariantToOrder(productId, variantStock)}
                                      disabled={variantAdminStock === 0}
                                      className={cn(
                                        'w-full mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                        variantAdminStock === 0
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-purple-600 text-white hover:bg-purple-700'
                                      )}
                                    >
                                      {variantAdminStock === 0 ? 'Out of Stock' : 'Add to Order'}
                                    </button>
                                  ) : (
                                    <div className="mt-2 text-xs text-purple-700 font-semibold text-center">
                                      ✓ Added to order
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Remove button if product is selected (non-variant product) */}
                      {isSelected && !hasVariants && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(productId)}
                          className="w-full rounded-lg px-4 py-2 text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quantity Inputs Section */}
            {
              selectedProducts.length > 0 && (
                <div className="space-y-4 rounded-xl border-2 border-purple-200 bg-purple-50/30 p-5">
                  <h3 className="text-lg font-semibold text-gray-900">Enter Quantities</h3>
                  <div className="space-y-3">
                    {selectedProducts.map((selected) => {
                      const product = products.find(
                        (p) => (p.id || p._id)?.toString() === selected.productId
                      )
                      if (!product) return null

                      // Check if product has attributes
                      const hasAttributes = product.attributeStocks &&
                        Array.isArray(product.attributeStocks) &&
                        product.attributeStocks.length > 0

                      // Use attribute-specific stock/price if available, otherwise use main product values
                      const adminStock = selected.attributeStock
                        ? (selected.attributeStock.displayStock || 0)
                        : (product.adminStock ?? product.displayStock ?? product.stock ?? 0)
                      const pricePerUnit = selected.attributeStock
                        ? (selected.attributeStock.userPrice || 0)
                        : (product.pricePerUnit || product.priceToUser || 0)
                      const stockUnit = selected.attributeStock?.stockUnit || product.unit || 'kg'
                      const quantity = parseFloat(selected.quantity) || 0

                      return (
                        <div
                          key={selected.productId}
                          className="space-y-3 rounded-lg border border-purple-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900"><TransText>{product.name}</TransText></p>
                              {/* Show variant info if variant is selected */}
                              {selected.attributes && Object.keys(selected.attributes).length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {Object.entries(selected.attributes).map(([key, value]) => {
                                    const formatLabel = (k) => {
                                      return k
                                        .replace(/([A-Z])/g, ' $1')
                                        .replace(/^./, str => str.toUpperCase())
                                        .trim()
                                    }
                                    return (
                                      <p key={key} className="text-xs text-purple-700 font-medium">
                                        {formatLabel(key)}: {value}
                                      </p>
                                    )
                                  })}
                                </div>
                              )}
                              <p className="text-xs text-gray-500">
                                Available: {adminStock} {stockUnit} • ₹{pricePerUnit.toLocaleString('en-IN')}/{stockUnit}
                              </p>
                            </div>
                          </div>

                          {/* Attribute Selection - Only show if product has attributes but no variant is selected yet */}
                          {hasAttributes && (!selected.attributes || Object.keys(selected.attributes).length === 0) && (
                            <ProductAttributeSelector
                              product={product}
                              selectedAttributes={selected.attributes || {}}
                              onAttributesChange={(attributes, attributeStock) => {
                                setSelectedProducts(prev => prev.map(p =>
                                  p.productId === selected.productId
                                    ? { ...p, attributes, attributeStock }
                                    : p
                                ))
                                // Reset quantity when variant changes
                                setSelectedProducts(prev => prev.map(p =>
                                  p.productId === selected.productId
                                    ? { ...p, quantity: '' }
                                    : p
                                ))
                              }}
                            />
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={adminStock}
                              value={selected.quantity}
                              onChange={(e) => {
                                const value = e.target.value
                                // Only allow numbers and prevent values greater than max
                                if (value === '' || (parseFloat(value) >= 1 && parseFloat(value) <= adminStock)) {
                                  handleQuantityChange(selected.productId, value, selected.attributes)
                                }
                              }}
                              onKeyDown={(e) => {
                                // Disable arrow keys (Up/Down) to prevent accidental value changes
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault()
                                }
                              }}
                              onWheel={(e) => {
                                // Disable mouse wheel scrolling on number input
                                e.target.blur()
                              }}
                              placeholder="Qty"
                              className="user-quantity-input w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                            />
                            <span className="text-xs text-gray-600">{stockUnit}</span>
                            <button
                              type="button"
                              onClick={() => {
                                // If it's a variant, remove only this specific variant, otherwise remove the product
                                if (selected.attributes && Object.keys(selected.attributes).length > 0) {
                                  const variantKey = JSON.stringify(selected.attributes)
                                  setSelectedProducts(prev => prev.filter(p => {
                                    if (p.productId !== selected.productId) return true
                                    const existingVariantKey = JSON.stringify(p.attributes || {})
                                    return existingVariantKey !== variantKey
                                  }))
                                } else {
                                  handleRemoveProduct(selected.productId)
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <CloseIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            {/* Billing Summary */}
            {
              billingItems.length > 0 && (
                <div className="rounded-xl border-2 border-gray-200 bg-white p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><Trans>Billing Summary</Trans></h3>
                  <div className="space-y-3 mb-4">
                    {billingItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900"><TransText>{item.product.name}</TransText></p>
                          {/* Display variant attributes if present */}
                          {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {Object.entries(item.variantAttributes).map(([key, value]) => {
                                // Format attribute label
                                const formatLabel = (k) => {
                                  return k
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, str => str.toUpperCase())
                                    .trim()
                                }
                                return (
                                  <p key={key} className="text-xs text-gray-600">
                                    <span className="font-medium">{formatLabel(key)}:</span> {value}
                                  </p>
                                )
                              })}
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            {item.quantity} {item.product.unit || 'kg'} × ₹{(item.unitPrice || item.pricePerUnit || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          ₹{((item.unitPrice || item.pricePerUnit || 0) * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
                    <p className="text-base font-semibold text-gray-900"><Trans>Total Amount</Trans></p>
                    <p
                      className={cn(
                        'text-xl font-bold',
                        meetsMinValue && withinMaxValue ? 'text-gray-900' : 'text-red-600'
                      )}
                    >
                      ₹{billingTotal.toLocaleString('en-IN')}
                    </p>
                  </div>
                  {!meetsMinValue && (
                    <p className="text-xs text-red-600 mt-2">
                      <Trans>Minimum order value is ₹{MIN_PURCHASE_VALUE.toLocaleString('en-IN')}</Trans>
                    </p>
                  )}
                  {!withinMaxValue && (
                    <p className="text-xs text-red-600 mt-2">
                      <Trans>Maximum order value is ₹{MAX_PURCHASE_VALUE.toLocaleString('en-IN')}</Trans>
                    </p>
                  )}

                </div>
              )
            }

            {/* Reason and Notes */}
            {
              selectedProducts.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700"><Trans>Reason for request *</Trans></label>
                    <textarea
                      rows={3}
                      value={orderRequestForm.reason}
                      onChange={(e) => handleOrderRequestChange('reason', e.target.value)}
                      placeholder="Explain why you need this stock (min 10 characters)"
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700"><Trans>Additional notes (optional)</Trans></label>
                    <textarea
                      rows={3}
                      value={orderRequestForm.notes}
                      onChange={(e) => handleOrderRequestChange('notes', e.target.value)}
                      placeholder="Mention urgency, delivery instructions, etc."
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>
              )
            }

            {/* Bank Details */}
            {
              selectedProducts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Bank details for billing *</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={orderRequestForm.bankAccountName}
                      onChange={(e) => handleOrderRequestChange('bankAccountName', e.target.value)}
                      placeholder="Account holder name"
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                    <input
                      type="text"
                      value={orderRequestForm.bankAccountNumber}
                      onChange={(e) => handleOrderRequestChange('bankAccountNumber', e.target.value)}
                      placeholder="Account number"
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                    <input
                      type="text"
                      value={orderRequestForm.bankName}
                      onChange={(e) => handleOrderRequestChange('bankName', e.target.value)}
                      placeholder="Bank name"
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                    <input
                      type="text"
                      value={orderRequestForm.bankIfsc}
                      onChange={(e) => handleOrderRequestChange('bankIfsc', e.target.value)}
                      placeholder="IFSC code"
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm uppercase focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                    <input
                      type="text"
                      value={orderRequestForm.bankBranch}
                      onChange={(e) => handleOrderRequestChange('bankBranch', e.target.value)}
                      placeholder="Branch (optional)"
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 md:col-span-2"
                    />
                  </div>
                </div>
              )
            }

            {
              orderRequestError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-600">{orderRequestError}</p>
                </div>
              )
            }

            {
              selectedProducts.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={closeOrderRequestScreen}
                    className="rounded-full border border-purple-100 bg-white px-4 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:text-purple-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleOrderRequestSubmit}
                    disabled={!canSubmitOrderRequest}
                    className={cn(
                      'rounded-full px-6 py-2 text-sm font-semibold text-white transition-all',
                      canSubmitOrderRequest
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-purple-300 cursor-not-allowed'
                    )}
                  >
                    {isOrderRequestSubmitting ? <Trans>Submitting...</Trans> : <Trans>Submit for Admin Approval</Trans>}
                  </button>
                </div>
              )
            }

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section id="inventory-hero" className="inventory-hero">
        <div className="inventory-hero__shell">
          <div className="inventory-hero__headline">
            <span className="inventory-hero__chip"><Trans>Stock hub</Trans></span>
            <h3 className="inventory-hero__title"><Trans>{totalProducts} products available</Trans></h3>
            <p className="inventory-hero__meta">
              <Trans>{inStockCount} in stock • {outOfStockCount} out of stock</Trans>
            </p>
            <div className="inventory-order-cta">
              <div>
                <p className="inventory-order-cta__title">Need to top-up stock?</p>
                <p className="inventory-order-cta__meta">
                  Enter bank details and raise a request for Admin approval.
                </p>
              </div>
              <button type="button" onClick={openOrderRequestScreen} className="inventory-order-cta__button">
                Order stock from Admin
              </button>
            </div>
            <div className="inventory-hero__actions">
              {[
                { label: 'Add product', icon: SparkIcon, action: 'add-sku' },
                { label: 'Reorder', icon: TruckIcon, action: 'reorder' },
                { label: 'Supplier list', icon: HomeIcon, action: 'supplier-list' },
                { label: 'Stock summary', icon: ChartIcon, action: 'stock-report' },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="inventory-hero__action"
                  onClick={() => action.action && openPanel(action.action)}
                >
                  <span className="inventory-hero__action-icon">
                    <action.icon className="h-4 w-4" />
                  </span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="inventory-hero__statgrid">
            {topStats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'inventory-hero__stat',
                  stat.tone === 'warn' ? 'is-warn' : stat.tone === 'teal' ? 'is-teal' : 'is-success',
                )}
              >
                <p>{stat.label}</p>
                <span>{stat.value}</span>
                <small>{stat.note}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="inventory-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Stock snapshot</h3>
          </div>
        </div>
        <div className="inventory-metric-grid">
          {inventoryStats.map((stat, index) => {
            const Icon = metricIcons[index % metricIcons.length]
            return (
              <div key={stat.label} className="inventory-metric-card">
                <span className="inventory-metric-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="inventory-metric-body">
                  <p>{stat.label}</p>
                  <span>{stat.value}</span>
                  <small>{stat.meta}</small>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="inventory-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Alerts & follow ups</h3>
          </div>
        </div>
        <div className="inventory-alert-grid">
          {alerts.map((card) => (
            <div
              key={card.title}
              className={cn(
                'inventory-alert-card',
                card.tone === 'warn' ? 'is-warn' : card.tone === 'teal' ? 'is-teal' : 'is-neutral',
              )}
            >
              <header>
                <span className="inventory-alert-card__badge">{card.badge}</span>
                <h4>{card.title}</h4>
              </header>
              <p>{card.body}</p>
              <button
                type="button"
                onClick={() => {
                  if (card.title === 'Need to order more' || card.action === 'Raise request') {
                    openPanel('raise-request')
                  } else if (card.action === 'Contact admin') {
                    openPanel('ping-admin')
                  } else if (card.action === 'Upload docs') {
                    openPanel('upload-docs')
                  }
                }}
              >
                {card.action}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="inventory-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Available Products</Trans></h3>
            <p className="text-sm text-gray-600 mt-1"><Trans>Use the View details button to inspect and order stock</Trans></p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading products...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const shortDescription = product.description?.substring(0, 100) || 'No description available'
              const adminStock = product.adminStock ?? product.stock ?? 0
              const userStock = product.userStock ?? 0
              const userStockStatus = getUserStockStatus(userStock)
              const adminStockStatus = product.stockStatus || (adminStock > 0 ? 'in_stock' : 'out_of_stock')
              const isArriving = product.isArrivingWithin24Hours || false

              return (
                <div
                  key={product.id || product._id}
                  className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
                >
                  {/* Product Image */}
                  <div className="mb-3 aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
                    {product.primaryImage || product.images?.[0]?.url ? (
                      <img
                        src={product.primaryImage || product.images[0].url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BoxIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 line-clamp-1"><TransText>{product.name}</TransText></h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{shortDescription}...</p>

                    {/* Arriving Notification */}
                    {isArriving && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-2">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-4 w-4 text-orange-600 shrink-0" />
                          <p className="text-xs font-semibold text-orange-800">
                            Product is arriving within 24 hours
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stock Status */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          userStockStatus.tone === 'success'
                            ? 'bg-blue-100 text-blue-700'
                            : userStockStatus.tone === 'teal'
                              ? 'bg-blue-100 text-blue-700'
                              : userStockStatus.tone === 'warn'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700',
                        )}
                      >
                        User stock • {userStockStatus.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {userStock} {product.unit || 'kg'} with you
                      </span>
                    </div>

                    {/* Price */}
                    <div className="pt-2 flex flex-col gap-3">
                      <p className="text-sm font-bold text-purple-600">
                        ₹{(product.attributeStocks && product.attributeStocks.length > 0)
                          ? Math.min(...product.attributeStocks.map(a => a.userPrice)).toLocaleString('en-IN')
                          : (product.pricePerUnit || product.priceToUser || 0).toLocaleString('en-IN')} per {product.unit || 'kg'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {userStockStatus.helper}
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleProductClick(product)}
                          className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No products available</p>
          </div>
        )}
      </section>

      {/* Show restock advisory only if there are low stock items */}
      {lowStockItems.length > 0 && (
        <div id="inventory-restock" className="user-card border border-brand/20 bg-white px-5 py-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-surface-foreground">Need to order more</p>
              <p className="text-xs text-muted-foreground">
                {lowStockItems.length} product{lowStockItems.length > 1 ? 's' : ''} running low. Submit a stock purchase request to avoid stockout.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="user-chip warn">Low stock • Action needed</span>
              <button
                className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-brand-foreground"
                onClick={() => openPanel('raise-request')}
              >
                Raise request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrdersView({ openPanel, onOpenEscalationModal, onOpenPartialEscalationModal, onShowAllOrders, onViewOrderDetails, refreshKey, onRefresh }) {
  const { dashboard } = useUserState()
  const dispatch = useUserDispatch()
  const { getOrders, getOrderDetails, updateOrderStatus, fetchDashboardData } = useUserApi()
  const { success, error } = useToast()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [ordersData, setOrdersData] = useState(null)
  const lastRefreshKeyRef = useRef(refreshKey || 0)

  const refreshOrders = useCallback(() => {
    // Always fetch all orders (no status filter) to get accurate totals
    // We'll filter client-side based on selectedFilter
    getOrders({}).then((result) => {
      console.log('📦 OrdersView: getOrders result:', result)
      if (result.data) {
        console.log('📦 OrdersView: Orders data:', result.data)
        console.log('📦 OrdersView: Orders count:', result.data.orders?.length || 0)
        setOrdersData(result.data)
        dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
      } else if (result.error) {
        console.error('❌ OrdersView: Error fetching orders:', result.error)
      }
    }).catch((error) => {
      console.error('❌ OrdersView: Exception fetching orders:', error)
    })
  }, [getOrders, dispatch])

  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  // Refresh when refreshKey changes (triggered by parent after status updates)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey !== lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey
      refreshOrders()
    }
  }, [refreshKey, refreshOrders])

  const STATUS_FLOW = ['awaiting', 'accepted', 'dispatched', 'delivered', 'fully_paid']
  const STAGES = [<Trans>Awaiting</Trans>, <Trans>Accepted</Trans>, <Trans>Dispatched</Trans>, <Trans>Delivered</Trans>]

  const normalizeStatus = (status) => {
    if (!status) return 'pending'
    const normalized = status.toLowerCase()
    if (normalized === 'fully_paid') return 'fully_paid'
    if (normalized === 'delivered') return 'delivered'
    if (normalized === 'out_for_delivery' || normalized === 'ready_for_delivery') return 'dispatched'
    if (normalized === 'accepted' || normalized === 'processing') return 'accepted'
    if (normalized === 'awaiting' || normalized === 'pending') return 'awaiting'
    // Fallback
    if (normalized.includes('deliver')) return 'delivered'
    if (normalized.includes('dispatch')) return 'dispatched'
    return 'awaiting'
  }

  const stageIndex = (status) => {
    const key = normalizeStatus(status)
    if (key === 'fully_paid') return 3
    if (key === 'delivered') return 3
    if (key === 'dispatched') return 2
    if (key === 'accepted') return 1
    return 0
  }

  // Transform backend orders to frontend format
  const backendOrders = ordersData?.orders || dashboard.orders?.orders || []
  console.log('📦 OrdersView: backendOrders count:', backendOrders.length)
  console.log('📦 OrdersView: ordersData:', ordersData)
  console.log('📦 OrdersView: dashboard.orders:', dashboard.orders)

  const totals = backendOrders.reduce(
    (acc, order) => {
      const normalizedStatus = normalizeStatus(order.status)
      if (normalizedStatus === 'fully_paid') {
        acc.delivered += 1
      } else if (normalizedStatus === 'delivered') {
        acc.delivered += 1
      } else if (normalizedStatus === 'dispatched') {
        acc.dispatched += 1
      } else if (normalizedStatus === 'accepted') {
        acc.accepted += 1
      } else {
        acc.awaiting += 1
      }
      return acc
    },
    { awaiting: 0, accepted: 0, dispatched: 0, delivered: 0 },
  )

  // Filter out orders that already completed their workflow
  const activeOrders = backendOrders.filter((order) => {
    const normalizedStatus = normalizeStatus(order.status)
    const isPartialPayment = order.paymentPreference !== 'full'
    if (isPartialPayment) {
      return normalizedStatus !== 'fully_paid'
    }
    return normalizedStatus !== 'delivered'
  })
  const totalOrders = activeOrders.length

  // Apply client-side status filter based on selectedFilter
  let filteredOrders = activeOrders
  if (selectedFilter !== 'all') {
    filteredOrders = activeOrders.filter((order) => {
      const normalized = normalizeStatus(order.status)
      if (selectedFilter === 'delivered') {
        return normalized === 'delivered' || normalized === 'fully_paid'
      }
      return normalized === selectedFilter
    })
  }

  // Helper function to map order to display format
  const mapOrderToDisplay = (order) => {
    const isFullyPaid = order.paymentStatus === 'fully_paid'
    const isDelivered = order.status === 'delivered'
    // Check if order is escalated
    const isEscalated = order.assignedTo === 'admin' ||
      order.escalation?.isEscalated === true ||
      order.status === 'rejected'

    // Determine next message based on status and payment
    let nextMessage = null
    if (order.status === 'pending') {
      nextMessage = <Trans>Confirm availability within 1 hour</Trans>
    } else if (order.status === 'awaiting') {
      nextMessage = <Trans>Process and dispatch order</Trans>
    } else if (order.status === 'processing') {
      nextMessage = <Trans>Prepare for delivery</Trans>
    } else if (order.status === 'ready_for_delivery') {
      nextMessage = <Trans>Mark as out for delivery</Trans>
    } else if (order.status === 'out_for_delivery') {
      nextMessage = <Trans>Mark as delivered</Trans>
    } else if (isDelivered) {
      // For delivered orders, check payment status
      if (isFullyPaid) {
        nextMessage = <Trans>Payment completed</Trans>
      } else {
        nextMessage = <Trans>Mark payment as done</Trans>
      }
    }

    return {
      id: order._id || order.id,
      orderNumber: order.orderNumber,
      farmer: order.userId?.name || 'Unknown Customer',
      value: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
      payment: isFullyPaid ? 'Paid' : order.paymentStatus === 'partial_paid' ? 'Partial' : 'Pending',
      paymentStatus: order.paymentStatus || 'pending',
      paymentPreference: order.paymentPreference || 'partial',
      status: order.status || 'pending',
      items: order.items || [],
      customerPhone: order.userId?.phone || '',
      deliveryAddress: order.deliveryAddress || {},
      createdAt: order.createdAt,
      statusUpdateGracePeriod: order.statusUpdateGracePeriod || null,
      acceptanceGracePeriod: order.acceptanceGracePeriod || null,
      isEscalated,
      assignedTo: order.assignedTo,
      escalation: order.escalation,
      next: nextMessage,
    }
  }

  // Map filtered orders for display (for main orders list)
  const orders = filteredOrders.map(mapOrderToDisplay)

  // Get 3 most recent orders for tracker section (regardless of status)
  // Keep original order objects but sort by date
  const recentOrdersForTrackerRaw = backendOrders
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0)
      const dateB = new Date(b.createdAt || b.updatedAt || 0)
      return dateB - dateA // Descending order (most recent first)
    })
    .slice(0, 3)

  // Map to display format for tracker
  const recentOrdersForTracker = recentOrdersForTrackerRaw.map(mapOrderToDisplay)

  const filterChips = [
    { id: 'all', label: <Trans>All orders</Trans>, value: totalOrders },
    { id: 'awaiting', label: <Trans>Awaiting</Trans>, value: totals.awaiting },
    { id: 'accepted', label: <Trans>Accepted</Trans>, value: totals.accepted },
    { id: 'dispatched', label: <Trans>Dispatched</Trans>, value: totals.dispatched },
    { id: 'delivered', label: <Trans>Delivered</Trans>, value: totals.delivered },
  ]

  const getHeroStats = (filter) => {
    switch (filter) {
      case 'all':
        return [
          {
            label: <Trans>Waiting for your reply</Trans>,
            value: totals.awaiting,
            meta: <Trans>Needs your reply</Trans>,
            tone: 'warn',
          },
          {
            label: <Trans>Orders in transit</Trans>,
            value: totals.dispatched,
            meta: <Trans>Delivery in progress</Trans>,
            tone: 'teal',
          },
          {
            label: <Trans>Ready to deliver</Trans>,
            value: totals.delivered,
            meta: <Trans>Track delivery</Trans>,
            tone: 'success',
          },
        ]
      case 'awaiting':
        return [
          {
            label: <Trans>Waiting for your reply</Trans>,
            value: totals.awaiting,
            meta: <Trans>Action required</Trans>,
            tone: 'warn',
          },
          {
            label: <Trans>Average wait time</Trans>,
            value: '2.5h',
            meta: <Trans>Time to reply</Trans>,
            tone: 'teal',
          },
          {
            label: <Trans>Urgent orders</Trans>,
            value: Math.max(0, totals.awaiting - 2),
            meta: <Trans>Taking too long</Trans>,
            tone: 'warn',
          },
        ]
      case 'accepted':
        return [
          {
            label: <Trans>Ready to dispatch</Trans>,
            value: totals.accepted,
            meta: <Trans>Accepted & pending dispatch</Trans>,
            tone: 'teal',
          },
          {
            label: <Trans>Dispatch SLA</Trans>,
            value: '24h',
            meta: <Trans>Target to dispatch</Trans>,
            tone: 'teal',
          },
          {
            label: <Trans>Next actions</Trans>,
            value: totals.accepted > 0 ? <Trans>Pack & assign</Trans> : <Trans>All clear</Trans>,
            meta: <Trans>Keep SLA Blue</Trans>,
            tone: totals.accepted > 0 ? 'warn' : 'success',
          },
        ]
      case 'dispatched':
        return [
          {
            label: <Trans>In transit</Trans>,
            value: totals.dispatched,
            meta: <Trans>On the way to farmer</Trans>,
            tone: 'teal',
          },
          {
            label: <Trans>Awaiting delivery</Trans>,
            value: Math.max(0, totals.dispatched - totals.delivered),
            meta: <Trans>Deliver within 24h SLA</Trans>,
            tone: 'success',
          },
          {
            label: <Trans>Average dispatch time</Trans>,
            value: '4.2h',
            meta: <Trans>After confirmation</Trans>,
            tone: 'teal',
          },
        ]
      case 'delivered':
        return [
          {
            label: <Trans>Completed today</Trans>,
            value: totals.delivered,
            meta: <Trans>Successfully delivered</Trans>,
            tone: 'success',
          },
          {
            label: <Trans>Delivered on time</Trans>,
            value: '94%',
            meta: <Trans>On-time delivery</Trans>,
            tone: 'success',
          },
          {
            label: <Trans>Average delivery time</Trans>,
            value: '18.5h',
            meta: <Trans>After order placed</Trans>,
            tone: 'teal',
          },
        ]
      default:
        return []
    }
  }

  const heroStats = getHeroStats(selectedFilter)

  return (
    <div className="orders-view space-y-6">
      <section id="orders-hero" className="orders-hero">
        <div className="orders-hero__shell">
          <div className="orders-hero__headline">
            <span className="orders-hero__chip"><Trans>Orders</Trans></span>
            <h3 className="orders-hero__title"><Trans>{`${totalOrders} active orders`}</Trans></h3>
            <p className="orders-hero__meta">
              <Trans>{`${totals.awaiting} awaiting`}</Trans> • <Trans>{`${totals.dispatched} dispatched`}</Trans> • <Trans>{`${totals.delivered} delivered`}</Trans>
            </p>
          </div>
          <div className="orders-hero__filters" role="group" aria-label="Filter orders">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={cn('orders-hero__filter', selectedFilter === chip.id && 'is-active')}
                aria-pressed={selectedFilter === chip.id}
                onClick={() => setSelectedFilter(chip.id)}
              >
                <span>{chip.label}</span>
                <strong>{chip.value}</strong>
              </button>
            ))}
          </div>
          <div className="orders-hero__stats">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  'orders-hero__stat',
                  stat.tone === 'warn' ? 'is-warn' : stat.tone === 'teal' ? 'is-teal' : 'is-success',
                )}
              >
                <small>{stat.label}</small>
                <span>{stat.value}</span>
                <p>{stat.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="orders-tracker" className="orders-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title">Orders</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {onShowAllOrders && backendOrders.length > 0 && (
              <button
                type="button"
                className="orders-section__cta"
                onClick={onShowAllOrders}
              >
                <Trans>See All</Trans>
              </button>
            )}
            <button type="button" className="orders-section__cta" onClick={() => openPanel('view-sla-policy')}>
              <Trans>View delivery policy</Trans>
            </button>
          </div>
        </div>
        <div className="orders-list">
          {backendOrders.length > 0 ? recentOrdersForTrackerRaw.map((originalOrder, index) => {
            // Map to display format for this order
            const orderDisplay = recentOrdersForTracker[index]
            const order = originalOrder // Use original order for all status/grace period checks

            const normalizedStatus = normalizeStatus(order.status)
            // Check if order is in acceptance grace period
            const isInGracePeriod = order.acceptanceGracePeriod?.isActive
            const gracePeriodExpiresAt = order.acceptanceGracePeriod?.expiresAt
            const timeRemaining = gracePeriodExpiresAt ? Math.max(0, Math.floor((new Date(gracePeriodExpiresAt) - new Date()) / 1000 / 60)) : 0
            // Check if order is in status update grace period
            const isInStatusUpdateGracePeriod = order.statusUpdateGracePeriod?.isActive
            const statusUpdateGracePeriodExpiresAt = order.statusUpdateGracePeriod?.expiresAt
            const statusUpdateTimeRemaining = statusUpdateGracePeriodExpiresAt ? Math.max(0, Math.floor((new Date(statusUpdateGracePeriodExpiresAt) - new Date()) / 1000 / 60)) : 0
            const previousStatus = order.statusUpdateGracePeriod?.previousStatus
            const isPartialPayment = order.paymentPreference !== 'full'
            const paymentStatus = order.paymentStatus || 'pending'
            const paymentCompleted = paymentStatus === 'fully_paid'
            // Check if order is escalated
            const isEscalated = orderDisplay.isEscalated || false
            // Show accept/reject actions only while awaiting confirmation and not escalated
            const showAvailabilityActions = normalizedStatus === 'awaiting' && !isInGracePeriod && !isEscalated
            const workflowCompleted = isPartialPayment ? normalizedStatus === 'fully_paid' : normalizedStatus === 'delivered'
            const canShowStatusUpdate = !showAvailabilityActions && !isInStatusUpdateGracePeriod && !isInGracePeriod && !workflowCompleted && normalizedStatus !== 'awaiting' && !isEscalated
            const nextMessage =
              orderDisplay.next ||
              (isInGracePeriod
                ? <Trans>{`Confirm or escalate within ${timeRemaining} minutes`}</Trans>
                : isInStatusUpdateGracePeriod
                  ? <Trans>{`You can revert status within ${statusUpdateTimeRemaining} minutes`}</Trans>
                  : normalizedStatus === 'awaiting'
                    ? <Trans>Accept or escalate this order</Trans>
                    : normalizedStatus === 'accepted'
                      ? <Trans>Dispatch items before SLA ends</Trans>
                      : normalizedStatus === 'dispatched'
                        ? <Trans>Deliver before the 24h SLA</Trans>
                        : normalizedStatus === 'delivered'
                          ? (isPartialPayment ? <Trans>Collect remaining payment</Trans> : <Trans>Delivery completed</Trans>)
                          : normalizedStatus === 'fully_paid'
                            ? <Trans>Payment completed</Trans>
                            : <Trans>Update order status</Trans>)

            return (
              <article key={orderDisplay.id} className="orders-card">
                <header className="orders-card__header">
                  <div className="orders-card__identity">
                    <span className="orders-card__icon">
                      <TruckIcon className="h-5 w-5" />
                    </span>
                    <div className="orders-card__details">
                      <p className="orders-card__name">{orderDisplay.farmer}</p>
                      <p className="orders-card__value">{orderDisplay.value}</p>
                      {orderDisplay.orderNumber && (
                        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{orderDisplay.orderNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="orders-card__status">
                    <span className={cn(
                      'orders-card__payment',
                      paymentStatus === 'fully_paid' && 'is-paid'
                    )}>
                      {orderDisplay.payment}
                    </span>
                    <span className="orders-card__stage-label" style={
                      normalizedStatus === 'delivered' && isPartialPayment && !paymentCompleted
                        ? { display: 'flex', flexDirection: 'column', gap: '2px' }
                        : normalizedStatus === 'fully_paid'
                          ? { display: 'flex', flexDirection: 'column', gap: '2px' }
                          : isEscalated
                            ? { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }
                            : {}
                    }>
                      {normalizedStatus === 'awaiting'
                        ? <Trans>Awaiting</Trans>
                        : normalizedStatus === 'accepted'
                          ? <Trans>Accepted</Trans>
                          : normalizedStatus === 'dispatched'
                            ? <Trans>Dispatched</Trans>
                            : normalizedStatus === 'delivered'
                              ? (isPartialPayment && !paymentCompleted ? (
                                <>
                                  <span><Trans>Delivered</Trans></span>
                                  <span><Trans>Awaiting Payment</Trans></span>
                                </>
                              ) : <Trans>Delivered</Trans>)
                              : normalizedStatus === 'fully_paid'
                                ? (
                                  <>
                                    <span><Trans>Delivered</Trans></span>
                                    <span><Trans>Paid</Trans></span>
                                  </>
                                )
                                : order.status}
                      {isEscalated && (
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          <Trans>Escalated</Trans>
                        </span>
                      )}
                    </span>
                  </div>
                </header>
                <div className="orders-card__next">
                  <span className="orders-card__next-label"><Trans>Next</Trans></span>
                  <span className="orders-card__next-value"><TransText>{nextMessage}</TransText></span>
                </div>
                <div className="orders-card__stages">
                  {STAGES.map((stage, stageIdx) => (
                    <div
                      key={stage}
                      className={cn('orders-card__stage', stageIdx <= stageIndex(order.status) && 'is-active')}
                    >
                      <span className="orders-card__stage-index">{stageIdx + 1}</span>
                      <span className="orders-card__stage-text">{stage}</span>
                    </div>
                  ))}
                </div>
                <div className="orders-card__actions">
                  {isInGracePeriod ? (
                    <>
                      <div className="orders-card__grace-period-notice" style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#92400E'
                      }}>
                        ⏰ <Trans>{`Grace Period: ${timeRemaining} minutes remaining. Confirm or escalate now.`}</Trans>
                      </div>
                      <button
                        type="button"
                        className="orders-card__action is-primary"
                        onClick={() => openPanel('confirm-acceptance', { orderId: orderDisplay.id })}
                      >
                        <Trans>Confirm Acceptance</Trans>
                      </button>
                      <button
                        type="button"
                        className="orders-card__action is-secondary"
                        onClick={() => openPanel('cancel-acceptance', { orderId: orderDisplay.id })}
                      >
                        <Trans>Cancel & Escalate</Trans>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Show status update grace period notice if active */}
                      {isInStatusUpdateGracePeriod && (
                        <div className="orders-card__grace-period-notice" style={{
                          padding: '8px 12px',
                          marginBottom: '8px',
                          backgroundColor: '#DBEAFE',
                          border: '1px solid #93C5FD',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#1E40AF'
                        }}>
                          ⏰ <Trans>{`Status Update Grace Period: ${statusUpdateTimeRemaining} minutes remaining. You can revert to "${previousStatus}" status or confirm now.`}</Trans>
                        </div>
                      )}
                      {/* Show update status button for accepted orders (not pending, not paid, not in grace period) - Hide for escalated orders */}
                      {canShowStatusUpdate && !isEscalated && (
                        <button
                          type="button"
                          className="orders-card__action is-primary"
                          onClick={() =>
                            openPanel('update-order-status', {
                              orderId: orderDisplay.id,
                              status: normalizedStatus,
                            })
                          }
                        >
                          <Trans>Update status</Trans>
                        </button>
                      )}
                      {/* Show confirm and revert buttons during grace period - Hide for escalated orders */}
                      {!workflowCompleted && isInStatusUpdateGracePeriod && !isEscalated && (
                        <>
                          <button
                            type="button"
                            className="orders-card__action is-primary"
                            onClick={async () => {
                              const result = await updateOrderStatus(orderDisplay.id, { finalizeGracePeriod: true })
                              if (result.data) {
                                success(result.data.message || 'Status update confirmed successfully!')
                                // Refresh orders list
                                getOrders().then((result) => {
                                  if (result.data) {
                                    dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
                                    // If order details view is open, refresh it
                                    const updatedOrder = result.data.orders?.find(o =>
                                      (o._id && orderDisplay.id && o._id.toString() === orderDisplay.id.toString()) ||
                                      (o.id && orderDisplay.id && o.id.toString() === orderDisplay.id.toString())
                                    )
                                    if (updatedOrder && onViewOrderDetails) {
                                      // Trigger refresh by calling onViewOrderDetails with updated order
                                      getOrderDetails(orderDisplay.id).then((detailsResult) => {
                                        if (detailsResult.data?.order) {
                                          onViewOrderDetails(detailsResult.data.order)
                                        }
                                      })
                                    }
                                  }
                                })
                                fetchDashboardData()
                                // Trigger OrdersView refresh (only once)
                                if (onRefresh) {
                                  onRefresh()
                                }
                              } else if (result.error) {
                                error(result.error.message || 'Failed to confirm status update')
                              }
                            }}
                          >
                            <Trans>Confirm Status Update</Trans>
                          </button>
                          {previousStatus && (
                            <button
                              type="button"
                              className="orders-card__action is-secondary"
                              onClick={() =>
                                openPanel('update-order-status', {
                                  orderId: orderDisplay.id,
                                  status: previousStatus,
                                  revert: true,
                                })
                              }
                            >
                              <Trans>{`Revert to ${previousStatus}`}</Trans>
                            </button>
                          )}
                        </>
                      )}
                      {/* Show paid badge if order is fully paid */}
                      {(normalizedStatus === 'fully_paid' || (!isPartialPayment && paymentCompleted && normalizedStatus === 'delivered')) && (
                        <div className="orders-card__action is-success" style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: '#D1FAE5',
                          color: '#065F46',
                          fontWeight: '600',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          ✓ <Trans>Paid</Trans>
                        </div>
                      )}
                      {showAvailabilityActions && (
                        <>
                          <button
                            type="button"
                            className="orders-card__action is-primary"
                            onClick={() => openPanel('order-available', { orderId: orderDisplay.id })}
                          >
                            <Trans>Accept Order</Trans>
                          </button>
                          <button
                            type="button"
                            className="orders-card__action is-secondary"
                            onClick={async () => {
                              const details = await getOrderDetails(orderDisplay.id)
                              if (details.data?.order) {
                                onOpenEscalationModal?.(details.data.order)
                              }
                            }}
                          >
                            <Trans>Escalate All</Trans>
                          </button>
                          <button
                            type="button"
                            className="orders-card__action is-secondary"
                            onClick={async () => {
                              const details = await getOrderDetails(orderDisplay.id)
                              if (details.data?.order) {
                                onOpenPartialEscalationModal?.(details.data.order, 'items')
                              }
                            }}
                          >
                            <Trans>Partial Items</Trans>
                          </button>
                          <button
                            type="button"
                            className="orders-card__action is-secondary"
                            onClick={async () => {
                              const details = await getOrderDetails(orderDisplay.id)
                              if (details.data?.order) {
                                onOpenPartialEscalationModal?.(details.data.order, 'quantities')
                              }
                            }}
                          >
                            <Trans>Partial Qty</Trans>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                {/* View Details Button */}
                <div style={{ padding: '0 16px 12px', borderTop: '1px solid #E5E7EB', marginTop: '12px', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="orders-card__action is-secondary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={async () => {
                      const details = await getOrderDetails(orderDisplay.id)
                      if (details.data?.order) {
                        onViewOrderDetails?.(details.data.order)
                      }
                    }}
                  >
                    <Trans>View Details</Trans>
                  </button>
                </div>
              </article>
            )
          }) : (
            <div className="orders-card">
              <div className="orders-card__details">
                <p className="text-sm text-gray-500 text-center py-4"><Trans>No orders found</Trans></p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="orders-fallback" className="orders-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Backup delivery</Trans></h3>

          </div>
        </div>
        <div className="orders-fallback-card">
          <p className="orders-fallback-card__body">
            <Trans>Western hub reporting a mild delay. Send low-priority orders to Admin delivery if it takes more than 24 hours.</Trans>
          </p>
          <div className="orders-fallback-card__footer">
            <span className="orders-fallback-card__badge"><Trans>Delay • Western hub</Trans></span>
            <button type="button" className="orders-fallback-card__cta" onClick={() => openPanel('escalate-to-admin')}>
              <Trans>Send to admin</Trans>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AllOrdersView({ openPanel, onOpenEscalationModal, onOpenPartialEscalationModal, onBack, onViewOrderDetails }) {
  const { dashboard } = useUserState()
  const dispatch = useUserDispatch()
  const { getOrders, getOrderDetails } = useUserApi()
  const [ordersData, setOrdersData] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const filterTabs = [
    { id: 'all', label: <Trans>All Orders</Trans> },
    { id: 'awaiting', label: <Trans>Awaiting</Trans> },
    { id: 'accepted', label: <Trans>Accepted</Trans> },
    { id: 'dispatched', label: <Trans>Dispatched</Trans> },
    { id: 'delivered', label: <Trans>Delivered</Trans> },
    { id: 'fully_paid', label: <Trans>Fully Paid</Trans> },
    { id: 'escalated', label: <Trans>Escalated</Trans> },
  ]

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    const params = {}

    // Handle escalated filter
    if (selectedFilter === 'escalated') {
      params.escalated = true
    } else if (selectedFilter !== 'all') {
      // Add status filter for non-escalated filters
      if (selectedFilter === 'fully_paid') {
        params.paymentStatus = 'fully_paid'
      } else {
        params.status = selectedFilter
      }
    }

    // Add search query (only if not empty)
    const trimmedSearch = searchQuery.trim()
    if (trimmedSearch) {
      params.search = trimmedSearch
    }

    try {
      const result = await getOrders(params)
      if (result.data) {
        setOrdersData(result.data)
        dispatch({ type: 'SET_ORDERS_DATA', payload: result.data })
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getOrders, selectedFilter, searchQuery, dispatch])

  // Debounce search - fetch when user stops typing or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedFilter])

  // Initial fetch on mount
  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const STATUS_FLOW = ['awaiting', 'accepted', 'dispatched', 'delivered', 'fully_paid']
  const STAGES = [<Trans>Awaiting</Trans>, <Trans>Accepted</Trans>, <Trans>Dispatched</Trans>, <Trans>Delivered</Trans>]

  const normalizeStatus = (status) => {
    if (!status) return 'awaiting'
    const normalized = status.toLowerCase()
    if (normalized === 'fully_paid') return 'fully_paid'
    if (normalized === 'delivered') return 'delivered'
    if (normalized === 'out_for_delivery' || normalized === 'ready_for_delivery') return 'dispatched'
    if (normalized === 'accepted' || normalized === 'processing') return 'accepted'
    if (normalized === 'awaiting' || normalized === 'pending') return 'awaiting'
    if (normalized.includes('deliver')) return 'delivered'
    if (normalized.includes('dispatch')) return 'dispatched'
    return 'awaiting'
  }

  const stageIndex = (status) => {
    const key = normalizeStatus(status)
    if (key === 'fully_paid' || key === 'delivered') return 3
    if (key === 'dispatched') return 2
    if (key === 'accepted') return 1
    return 0
  }

  const backendOrders = ordersData?.orders || dashboard.orders?.orders || []

  const orders = backendOrders.map((order) => {
    const normalizedStatus = normalizeStatus(order.status)
    const isPartialPayment = order.paymentPreference !== 'full'
    const paymentStatus = order.paymentStatus || 'pending'
    // Check if order is escalated
    const isEscalated = order.assignedTo === 'admin' ||
      order.escalation?.isEscalated === true ||
      order.status === 'rejected'
    const next =
      normalizedStatus === 'awaiting'
        ? <Trans>Accept or escalate this order</Trans>
        : normalizedStatus === 'accepted'
          ? <Trans>Dispatch items before SLA ends</Trans>
          : normalizedStatus === 'dispatched'
            ? <Trans>Deliver before the 24h SLA</Trans>
            : normalizedStatus === 'delivered'
              ? (isPartialPayment ? <Trans>Collect remaining payment</Trans> : <Trans>Delivery completed</Trans>)
              : normalizedStatus === 'fully_paid'
                ? <Trans>Payment completed</Trans>
                : null

    return {
      id: order._id || order.id,
      orderNumber: order.orderNumber,
      farmer: order.userId?.name || translate('Unknown Customer'),
      value: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
      payment: paymentStatus === 'fully_paid' ? translate('Paid') : paymentStatus === 'partial_paid' ? translate('Partial') : translate('Pending'),
      paymentStatus,
      paymentPreference: order.paymentPreference || 'partial',
      status: order.status || 'awaiting',
      items: order.items || [],
      customerPhone: order.userId?.phone || '',
      deliveryAddress: order.deliveryAddress || {},
      createdAt: order.createdAt,
      statusUpdateGracePeriod: order.statusUpdateGracePeriod || null,
      acceptanceGracePeriod: order.acceptanceGracePeriod || null,
      isEscalated,
      assignedTo: order.assignedTo,
      escalation: order.escalation,
      next,
    }
  })

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    // Search is handled by debounced effect, but we can trigger immediate search on submit
    fetchOrders()
  }

  return (
    <div className="orders-view space-y-6">
      {/* Header with back button */}
      <div className="overview-section__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="orders-section__cta"
            style={{
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none'
            }}
          >
            ← <Trans>Back</Trans>
          </button>
          <h3 className="overview-section__title"><Trans>All Orders</Trans></h3>
        </div>
      </div>

      {/* Search bar */}
      <div className="orders-section" style={{ marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          {/* Wrap input to allow translation of placeholder via useTranslation if needed, but for now placeholder stays as is or we use i18n key */}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={translate('Search by order number...')}
            className="user-action-panel__input"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="orders-section__cta"
          >
            <Trans>Search</Trans>
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div className="orders-hero__filters" role="group" aria-label="Filter orders" style={{
        marginBottom: '24px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin'
      }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFilter(tab.id)}
            className={cn('orders-hero__filter', selectedFilter === tab.id && 'is-active')}
            aria-pressed={selectedFilter === tab.id}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="orders-list">
        {isLoading ? (
          <div className="orders-card">
            <div className="orders-card__details">
              <p className="text-sm text-gray-500 text-center py-4"><Trans>Loading orders...</Trans></p>
            </div>
          </div>
        ) : orders.length > 0 ? orders.map((order) => {
          const normalizedStatus = normalizeStatus(order.status)
          const isInGracePeriod = order.acceptanceGracePeriod?.isActive
          const gracePeriodExpiresAt = order.acceptanceGracePeriod?.expiresAt
          const timeRemaining = gracePeriodExpiresAt ? Math.max(0, Math.floor((new Date(gracePeriodExpiresAt) - new Date()) / 1000 / 60)) : 0
          const isInStatusUpdateGracePeriod = order.statusUpdateGracePeriod?.isActive
          const statusUpdateGracePeriodExpiresAt = order.statusUpdateGracePeriod?.expiresAt
          const statusUpdateTimeRemaining = statusUpdateGracePeriodExpiresAt ? Math.max(0, Math.floor((new Date(statusUpdateGracePeriodExpiresAt) - new Date()) / 1000 / 60)) : 0
          const previousStatus = order.statusUpdateGracePeriod?.previousStatus
          const isPartialPayment = order.paymentPreference !== 'full'
          const paymentStatus = order.paymentStatus || 'pending'
          const paymentCompleted = paymentStatus === 'fully_paid'
          const isEscalated = order.isEscalated || false
          const showAvailabilityActions = normalizedStatus === 'awaiting' && !isInGracePeriod && !isEscalated
          const workflowCompleted = isPartialPayment ? normalizedStatus === 'fully_paid' : normalizedStatus === 'delivered'
          const canShowStatusUpdate = !showAvailabilityActions && !isInStatusUpdateGracePeriod && !isInGracePeriod && !workflowCompleted && normalizedStatus !== 'awaiting' && !isEscalated
          const nextMessage =
            order.next ||
            (isInGracePeriod
              ? translate('Confirm or escalate within {{minutes}} minutes', { minutes: timeRemaining })
              : isInStatusUpdateGracePeriod
                ? translate('You can revert status within {{minutes}} minutes', { minutes: statusUpdateTimeRemaining })
                : normalizedStatus === 'awaiting'
                  ? <Trans>Accept or escalate this order</Trans>
                  : normalizedStatus === 'accepted'
                    ? <Trans>Dispatch items before SLA ends</Trans>
                    : normalizedStatus === 'dispatched'
                      ? <Trans>Deliver before the 24h SLA</Trans>
                      : normalizedStatus === 'delivered'
                        ? (isPartialPayment ? <Trans>Collect remaining payment</Trans> : <Trans>Delivery completed</Trans>)
                        : normalizedStatus === 'fully_paid'
                          ? <Trans>Payment completed</Trans>
                          : <Trans>Mark payment as collected</Trans>)

          return (
            <article key={order.id} className="orders-card">
              <header className="orders-card__header">
                <div className="orders-card__identity">
                  <span className="orders-card__icon">
                    <TruckIcon className="h-5 w-5" />
                  </span>
                  <div className="orders-card__details">
                    <p className="orders-card__name"><TransText>{order.farmer}</TransText></p>
                    <p className="orders-card__value">{order.value}</p>
                    {order.orderNumber && (
                      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{order.orderNumber}</p>
                    )}
                  </div>
                </div>
                <div className="orders-card__status">
                  <span className={cn(
                    'orders-card__payment',
                    order.paymentStatus === 'fully_paid' && 'is-paid'
                  )}>
                    {order.payment}
                  </span>
                  <span className="orders-card__stage-label" style={
                    normalizedStatus === 'delivered' && isPartialPayment && !paymentCompleted
                      ? { display: 'flex', flexDirection: 'column', gap: '2px' }
                      : normalizedStatus === 'fully_paid'
                        ? { display: 'flex', flexDirection: 'column', gap: '2px' }
                        : isEscalated
                          ? { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }
                          : {}
                  }>
                    {normalizedStatus === 'awaiting'
                      ? <Trans>Awaiting</Trans>
                      : normalizedStatus === 'accepted'
                        ? <Trans>Accepted</Trans>
                        : normalizedStatus === 'dispatched'
                          ? <Trans>Dispatched</Trans>
                          : normalizedStatus === 'delivered'
                            ? (isPartialPayment && !paymentCompleted ? (
                              <>
                                <span><Trans>Delivered</Trans></span>
                                <span><Trans>Awaiting Payment</Trans></span>
                              </>
                            ) : <Trans>Delivered</Trans>)
                            : normalizedStatus === 'fully_paid'
                              ? (
                                <>
                                  <span><Trans>Delivered</Trans></span>
                                  <span><Trans>Paid</Trans></span>
                                </>
                              )
                              : order.status}
                    {isEscalated && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        <Trans>Escalated</Trans>
                      </span>
                    )}
                  </span>
                </div>
              </header>
              <div className="orders-card__next">
                <span className="orders-card__next-label"><Trans>Next</Trans></span>
                <span className="orders-card__next-value">{nextMessage}</span>
              </div>
              <div className="orders-card__stages">
                {STAGES.map((stage, index) => (
                  <div
                    key={stage}
                    className={cn('orders-card__stage', index <= stageIndex(order.status) && 'is-active')}
                  >
                    <span className="orders-card__stage-index">{index + 1}</span>
                    <span className="orders-card__stage-text">{stage}</span>
                  </div>
                ))}
              </div>
              <div className="orders-card__actions">
                {isInGracePeriod ? (
                  <>
                    <div className="orders-card__grace-period-notice" style={{
                      padding: '8px 12px',
                      marginBottom: '8px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#92400E'
                    }}>
                      ⏰ <Trans>{`Grace Period: ${timeRemaining} minutes remaining. Confirm or escalate now.`}</Trans>
                    </div>
                    <button
                      type="button"
                      className="orders-card__action is-primary"
                      onClick={() => openPanel('confirm-acceptance', { orderId: order.id })}
                    >
                      <Trans>Confirm Acceptance</Trans>
                    </button>
                    <button
                      type="button"
                      className="orders-card__action is-secondary"
                      onClick={() => openPanel('cancel-acceptance', { orderId: order.id })}
                    >
                      <Trans>Cancel & Escalate</Trans>
                    </button>
                  </>
                ) : (
                  <>
                    {isInStatusUpdateGracePeriod && (
                      <div className="orders-card__grace-period-notice" style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        backgroundColor: '#DBEAFE',
                        border: '1px solid #93C5FD',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#1E40AF'
                      }}>
                        ⏰ <Trans>{`Status Update Grace Period: ${statusUpdateTimeRemaining} minutes remaining. You can revert to "${previousStatus}" status.`}</Trans>
                      </div>
                    )}
                    {/* Show update status button once acceptance is finalized - Hide for escalated orders */}
                    {canShowStatusUpdate && !isEscalated && (
                      <button
                        type="button"
                        className="orders-card__action is-primary"
                        onClick={() =>
                          openPanel('update-order-status', {
                            orderId: order.id,
                            status: normalizedStatus,
                          })
                        }
                      >
                        <Trans>Update status</Trans>
                      </button>
                    )}
                    {/* Show revert button during grace period - Hide for escalated orders */}
                    {!workflowCompleted && isInStatusUpdateGracePeriod && previousStatus && !isEscalated && (
                      <button
                        type="button"
                        className="orders-card__action is-secondary"
                        onClick={() =>
                          openPanel('update-order-status', {
                            orderId: order.id,
                            status: previousStatus,
                            revert: true,
                          })
                        }
                      >
                        <Trans>Revert to {previousStatus}</Trans>
                      </button>
                    )}
                    {(normalizedStatus === 'fully_paid' || (!isPartialPayment && paymentCompleted && normalizedStatus === 'delivered')) && (
                      <div className="orders-card__action is-success" style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#D1FAE5',
                        color: '#065F46',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        ✓ <Trans>Paid</Trans>
                      </div>
                    )}
                    {showAvailabilityActions && (
                      <>
                        <button
                          type="button"
                          className="orders-card__action is-primary"
                          onClick={() => openPanel('order-available', { orderId: order.id })}
                        >
                          <Trans>Accept Order</Trans>
                        </button>
                        <button
                          type="button"
                          className="orders-card__action is-secondary"
                          onClick={async () => {
                            const details = await getOrderDetails(order.id)
                            if (details.data?.order) {
                              onOpenEscalationModal?.(details.data.order)
                            }
                          }}
                        >
                          <Trans>Escalate All</Trans>
                        </button>
                        <button
                          type="button"
                          className="orders-card__action is-secondary"
                          onClick={async () => {
                            const details = await getOrderDetails(order.id)
                            if (details.data?.order) {
                              onOpenPartialEscalationModal?.(details.data.order, 'items')
                            }
                          }}
                        >
                          <Trans>Partial Items</Trans>
                        </button>
                        <button
                          type="button"
                          className="orders-card__action is-secondary"
                          onClick={async () => {
                            const details = await getOrderDetails(order.id)
                            if (details.data?.order) {
                              onOpenPartialEscalationModal?.(details.data.order, 'quantities')
                            }
                          }}
                        >
                          <Trans>Partial Qty</Trans>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              {/* View Details Button */}
              <div style={{ padding: '0 16px 12px', borderTop: '1px solid #E5E7EB', marginTop: '12px', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="orders-card__action is-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={async () => {
                    const details = await getOrderDetails(order.id)
                    if (details.data?.order) {
                      onViewOrderDetails?.(details.data.order)
                    }
                  }}
                >
                  <Trans>View Details</Trans>
                </button>
              </div>
            </article>
          )
        }) : (
          <div className="orders-card">
            <div className="orders-card__details">
              <p className="text-sm text-gray-500 text-center py-4"><Trans>No orders found</Trans></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OrderDetailsView({ order: initialOrder, openPanel, onBack, onOpenEscalationModal, onOpenPartialEscalationModal, onOrderUpdated }) {
  const { getOrderDetails, updateOrderStatus } = useUserApi()
  const { success, error } = useToast()
  const [order, setOrder] = useState(initialOrder)
  const [isLoading, setIsLoading] = useState(false)
  const lastRefreshedStatusRef = useRef(initialOrder?.status)

  // Refresh order details
  const refreshOrder = useCallback(async () => {
    const orderId = initialOrder?.id || initialOrder?._id || order?.id || order?._id
    if (!orderId) return

    setIsLoading(true)
    try {
      const result = await getOrderDetails(orderId)
      if (result.data?.order) {
        setOrder(result.data.order)
        lastRefreshedStatusRef.current = result.data.order.status
        onOrderUpdated?.()
      }
    } catch (error) {
      console.error('Error refreshing order:', error)
    } finally {
      setIsLoading(false)
    }
  }, [initialOrder?.id, initialOrder?._id, order?.id, order?._id, getOrderDetails, onOrderUpdated])

  useEffect(() => {
    if (initialOrder) {
      const currentStatus = initialOrder.status
      const previousRefreshedStatus = lastRefreshedStatusRef.current

      // Update local state with initialOrder
      setOrder(initialOrder)

      // Refresh if status changed (only refresh once per status change)
      if (currentStatus !== previousRefreshedStatus) {
        refreshOrder()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrder?.id, initialOrder?._id, initialOrder?.status]) // Refresh when order ID or status changes

  const normalizeStatus = (status) => {
    if (!status) return 'awaiting'
    const normalized = status.toLowerCase()
    if (normalized === 'fully_paid') return 'fully_paid'
    if (normalized === 'delivered') return 'delivered'
    if (normalized === 'out_for_delivery' || normalized === 'ready_for_delivery') return 'dispatched'
    if (normalized === 'accepted' || normalized === 'processing') return 'accepted'
    if (normalized === 'awaiting' || normalized === 'pending') return 'awaiting'
    if (normalized.includes('deliver')) return 'delivered'
    if (normalized.includes('dispatch')) return 'dispatched'
    return 'awaiting'
  }

  const stageIndex = (status) => {
    const key = normalizeStatus(status)
    if (key === 'fully_paid' || key === 'delivered') return 3
    if (key === 'dispatched') return 2
    if (key === 'accepted') return 1
    return 0
  }

  const STATUS_FLOW = ['awaiting', 'accepted', 'dispatched', 'delivered', 'fully_paid']
  const STAGES = [<Trans>Awaiting</Trans>, <Trans>Accepted</Trans>, <Trans>Dispatched</Trans>, <Trans>Delivered</Trans>]

  // Helper for date parsing
  const getTimeRemaining = (expiry) => {
    if (!expiry) return 0
    const date = new Date(expiry)
    if (isNaN(date.getTime())) return 0
    return Math.max(0, Math.floor((date - new Date()) / 1000 / 60))
  }

  const normalizedStatus = normalizeStatus(order?.status)
  const isInGracePeriod = order?.acceptanceGracePeriod?.isActive
  const gracePeriodExpiresAt = order?.acceptanceGracePeriod?.expiresAt
  const timeRemaining = getTimeRemaining(gracePeriodExpiresAt)
  const isInStatusUpdateGracePeriod = order?.statusUpdateGracePeriod?.isActive
  const statusUpdateGracePeriodExpiresAt = order?.statusUpdateGracePeriod?.expiresAt
  const statusUpdateTimeRemaining = getTimeRemaining(statusUpdateGracePeriodExpiresAt)
  const previousStatus = order?.statusUpdateGracePeriod?.previousStatus
  const isPartialPayment = order?.paymentPreference !== 'full'
  const paymentStatus = order?.paymentStatus || 'pending'
  const paymentCompleted = paymentStatus === 'fully_paid'
  // Check if order is escalated
  const isEscalated = order?.assignedTo === 'admin' ||
    order?.escalation?.isEscalated === true ||
    order?.status === 'rejected'
  const showAvailabilityActions = normalizedStatus === 'awaiting' && !isInGracePeriod && !isEscalated
  const workflowCompleted = isPartialPayment ? normalizedStatus === 'fully_paid' : normalizedStatus === 'delivered'
  const isApproved = normalizedStatus !== 'awaiting'
  const canShowStatusUpdate = isApproved && !workflowCompleted && !isInStatusUpdateGracePeriod && !isInGracePeriod && !isEscalated

  if (isLoading) {
    return (
      <div className="orders-view">
        <div className="overview-section__header">
          <button type="button" className="orders-section__cta" onClick={onBack}>
            ← <Trans>Back</Trans>
          </button>
          <h3 className="overview-section__title"><Trans>Order Details</Trans></h3>
        </div>
        <div className="orders-card">
          <div className="orders-card__details">
            <p className="text-sm text-gray-500 text-center py-4"><Trans>Loading order details...</Trans></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="orders-view space-y-6">
      {/* Header */}
      <div className="overview-section__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="orders-section__cta" onClick={onBack}>
            ← <Trans>Back</Trans>
          </button>
          <h3 className="overview-section__title"><Trans>Order Details</Trans></h3>
        </div>
      </div>

      {/* Order Information Card */}
      <div className="orders-card">
        <header className="orders-card__header">
          <div className="orders-card__identity">
            <span className="orders-card__icon">
              <TruckIcon className="h-5 w-5" />
            </span>
            <div className="orders-card__details">
              <p className="orders-card__name"><Trans>{`Order #${order?.orderNumber || order?.id}`}</Trans></p>
              <p className="orders-card__value">₹{(order?.totalAmount || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="orders-card__status">
            <span className={cn(
              'orders-card__payment',
              order?.paymentStatus === 'fully_paid' && 'is-paid'
            )}>
              {order?.paymentStatus === 'fully_paid' ? <Trans>Paid</Trans> : order?.paymentStatus === 'partial_paid' ? <Trans>Partial</Trans> : <Trans>Pending</Trans>}
            </span>
            <span className="orders-card__stage-label" style={
              normalizedStatus === 'delivered' && isPartialPayment && !paymentCompleted
                ? { display: 'flex', flexDirection: 'column', gap: '2px' }
                : normalizedStatus === 'fully_paid'
                  ? { display: 'flex', flexDirection: 'column', gap: '2px' }
                  : isEscalated
                    ? { display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }
                    : {}
            }>
              {normalizedStatus === 'awaiting'
                ? <Trans>Awaiting</Trans>
                : normalizedStatus === 'accepted'
                  ? <Trans>Accepted</Trans>
                  : normalizedStatus === 'dispatched'
                    ? <Trans>Dispatched</Trans>
                    : normalizedStatus === 'delivered'
                      ? (isPartialPayment && !paymentCompleted ? (
                        <>
                          <span><Trans>Delivered</Trans></span>
                          <span><Trans>Awaiting Payment</Trans></span>
                        </>
                      ) : <Trans>Delivered</Trans>)
                      : normalizedStatus === 'fully_paid'
                        ? (
                          <>
                            <span><Trans>Delivered</Trans></span>
                            <span><Trans>Paid</Trans></span>
                          </>
                        )
                        : order?.status}
              {isEscalated && (
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  <Trans>Escalated</Trans>
                </span>
              )}
            </span>
          </div>
        </header>

        {/* Customer Information */}
        <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1F2937' }}><Trans>Customer Information</Trans></h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#4B5563' }}>
            <p><strong><Trans>Name</Trans>:</strong> {order?.userId?.name || order?.farmer || 'Unknown Customer'}</p>
            <p><strong><Trans>Contact</Trans>:</strong> {order?.userId?.phone || order?.customerPhone || 'N/A'}</p>
            {order?.deliveryAddress && (
              <>
                <p><strong><Trans>Address</Trans>:</strong> {order.deliveryAddress.address || 'N/A'}</p>
                <p><strong><Trans>City</Trans>:</strong> {order.deliveryAddress.city || 'N/A'}, {order.deliveryAddress.state || 'N/A'} - {order.deliveryAddress.pincode || 'N/A'}</p>
              </>
            )}
          </div>
        </div>

        {/* Order Items */}
        {order?.items && order.items.length > 0 && (
          <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1F2937' }}><Trans>Order Items</Trans></h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {order.items.map((item, index) => (
                <div key={index} style={{
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <p style={{ fontWeight: '600', marginBottom: '4px' }}>{item.productName || <Trans>Product</Trans>}</p>
                  <p style={{ color: '#6B7280' }}><Trans>Quantity</Trans>: {item.quantity} × ₹{item.unitPrice?.toLocaleString('en-IN')} = ₹{item.totalPrice?.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Stages */}
        <div className="orders-card__stages" style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
          {STAGES.map((stage, index) => (
            <div
              key={stage}
              className={cn('orders-card__stage', index <= stageIndex(order?.status) && 'is-active')}
            >
              <span className="orders-card__stage-index">{index + 1}</span>
              <span className="orders-card__stage-text">{stage}</span>
            </div>
          ))}
        </div>

        {/* Actions Section */}
        <div className="orders-card__actions" style={{ padding: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Grace Period Notices */}
          {isInGracePeriod && (
            <div className="orders-card__grace-period-notice" style={{
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#92400E'
            }}>
              ⏰ <Trans>{`Grace Period: ${timeRemaining} minutes remaining. Confirm or escalate now.`}</Trans>
            </div>
          )}
          {isInStatusUpdateGracePeriod && (
            <div className="orders-card__grace-period-notice" style={{
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: '#DBEAFE',
              border: '1px solid #93C5FD',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#1E40AF'
            }}>
              ⏰ <Trans>{`Status Update Grace Period: ${statusUpdateTimeRemaining} minutes remaining. You can revert to "${previousStatus}" status.`}</Trans>
            </div>
          )}

          {/* Approve Button (for pending orders) */}
          {showAvailabilityActions && !isInGracePeriod && (
            <button
              type="button"
              className="orders-card__action is-primary"
              onClick={() => openPanel('order-available', { orderId: order.id || order._id })}
            >
              <Trans>Accept Order</Trans>
            </button>
          )}

          {/* Update Status Button (after approved) - Hide for escalated orders */}
          {canShowStatusUpdate && !isEscalated && (
            <button
              type="button"
              className="orders-card__action is-primary"
              onClick={() =>
                openPanel('update-order-status', {
                  orderId: order.id || order._id,
                  status: normalizedStatus,
                })
              }
            >
              <Trans>Update Status</Trans>
            </button>
          )}

          {/* Confirm Status Update and Revert Buttons (during grace period) - Hide for escalated orders */}
          {!workflowCompleted && isInStatusUpdateGracePeriod && !isEscalated && (
            <>
              <button
                type="button"
                className="orders-card__action is-primary"
                onClick={async () => {
                  const orderId = order.id || order._id
                  if (!orderId) return

                  const result = await updateOrderStatus(orderId, { finalizeGracePeriod: true })
                  if (result.data) {
                    success(result.data.message || 'Status update confirmed successfully!')
                    // Refresh order details
                    refreshOrder()
                  } else if (result.error) {
                    error(result.error.message || 'Failed to confirm status update')
                  }
                }}
              >
                <Trans>Confirm Status Update</Trans>
              </button>
              {previousStatus && (
                <button
                  type="button"
                  className="orders-card__action is-secondary"
                  onClick={() =>
                    openPanel('update-order-status', {
                      orderId: order.id || order._id,
                      status: previousStatus,
                      revert: true,
                    })
                  }
                >
                  <Trans>Revert to {previousStatus}</Trans>
                </button>
              )}
            </>
          )}

          {/* Escalation Buttons */}
          {showAvailabilityActions && (
            <>
              <button
                type="button"
                className="orders-card__action is-secondary"
                onClick={() => {
                  onOpenEscalationModal?.(order)
                }}
              >
                <Trans>Escalate All</Trans>
              </button>
              <button
                type="button"
                className="orders-card__action is-secondary"
                onClick={() => {
                  onOpenPartialEscalationModal?.(order, 'items')
                }}
              >
                <Trans>Partial Items</Trans>
              </button>
              <button
                type="button"
                className="orders-card__action is-secondary"
                onClick={() => {
                  onOpenPartialEscalationModal?.(order, 'quantities')
                }}
              >
                <Trans>Partial Qty</Trans>
              </button>
            </>
          )}

          {/* Grace Period Actions */}
          {isInGracePeriod && (
            <>
              <button
                type="button"
                className="orders-card__action is-primary"
                onClick={() => openPanel('confirm-acceptance', { orderId: order.id || order._id })}
              >
                <Trans>Confirm Acceptance</Trans>
              </button>
              <button
                type="button"
                className="orders-card__action is-secondary"
                onClick={() => openPanel('cancel-acceptance', { orderId: order.id || order._id })}
              >
                <Trans>Cancel & Escalate</Trans>
              </button>
            </>
          )}

          {/* Paid Badge */}
          {(normalizedStatus === 'fully_paid' || (!isPartialPayment && paymentCompleted && normalizedStatus === 'delivered')) && (
            <div className="orders-card__action is-success" style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              ✓ <Trans>Paid</Trans>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function ReportsView({ onNavigate }) {
  const { dashboard } = useUserState()
  const dispatch = useUserDispatch()
  const { getReports, getEarningsSummary } = useUserApi()

  const [activeTab, setActiveTab] = useState('revenue')
  const [timePeriod, setTimePeriod] = useState('week')
  const [earningsSummary, setEarningsSummary] = useState(null)

  useEffect(() => {
    // Convert timePeriod to days for backend
    const periodMap = {
      'week': '7',
      'month': '30',
      'year': '365',
      'all': '3650', // ~10 years for "all time"
    }
    const periodDays = periodMap[timePeriod] || '30'

    // Fetch both reports and earnings summary
    Promise.all([
      getReports({ period: periodDays }),
      getEarningsSummary(),
    ]).then(([reportsResult, earningsResult]) => {
      if (reportsResult.data) {
        dispatch({ type: 'SET_REPORTS_DATA', payload: reportsResult.data })
      }
      if (earningsResult.data) {
        setEarningsSummary(earningsResult.data)
      }
    })
  }, [getReports, getEarningsSummary, dispatch, timePeriod])
  // Remove static topUsers - this is user-specific data, not needed here
  // If needed in future, can be fetched from backend analytics

  const reportIcons = [ChartIcon, WalletIcon, CreditIcon, HomeIcon]

  const tabs = [
    { id: 'revenue', label: <Trans>Earnings Summary</Trans> },
    { id: 'performance', label: <Trans>Performance</Trans> },
    { id: 'trends', label: <Trans>Trends</Trans> },
    { id: 'insights', label: <Trans>Tips</Trans> },
  ]

  const timePeriods = [
    { id: 'week', label: <Trans>1 Week</Trans> },
    { id: 'month', label: <Trans>1 Month</Trans> },
    { id: 'year', label: <Trans>1 Year</Trans> },
    { id: 'all', label: <Trans>All Time</Trans> },
  ]

  // Get reports data from state
  const reportsData = dashboard?.reports || null

  // Transform backend reports data to chart format
  const getRevenueData = (period) => {
    // Use real data from backend if available
    // Backend returns orders.breakdown grouped by status, we can use that for trends
    if (reportsData?.orders?.breakdown && Array.isArray(reportsData.orders.breakdown)) {
      const breakdown = reportsData.orders.breakdown
      return {
        labels: breakdown.map((_, index) => {
          // Generate labels based on period
          if (period === 'week') {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            return days[index % 7] || `Day ${index + 1}`
          }
          if (period === 'month') return `Week ${index + 1}`
          if (period === 'year') return `Q${index + 1}`
          return `Period ${index + 1}`
        }),
        revenue: breakdown.map(b => (b.totalAmount || 0) / 100000), // Convert to Lakhs
        orders: breakdown.map(b => b.count || 0),
      }
    }

    // Fallback to empty data if no backend data
    return {
      labels: [],
      revenue: [],
      orders: [],
    }
  }

  const chartData = getRevenueData(timePeriod)

  // Get revenue data from backend (backend returns 'revenue', not 'sales')
  const revenueData = reportsData?.revenue || {}
  // Use earnings summary for total earnings (user earnings), fallback to revenue if not available
  const totalEarnings = earningsSummary?.totalEarnings || 0
  const orderCount = revenueData.orderCount || 0
  const averageOrderValue = revenueData.averageOrderValue || 0
  const maxValue = Math.max(...chartData.revenue, ...chartData.orders, 1) // Default to 1 to avoid /0
  const yAxisSteps = 5
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = (maxValue / yAxisSteps) * (yAxisSteps - i)
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
  })

  return (
    <div className="reports-view space-y-6">

      <section id="reports-summary" className="reports-summary-section">
        <div className="reports-summary-card">
          <div className="reports-summary-card__content">
            <div className="reports-summary-card__main">
              <div className="reports-summary-card__icon">
                <ChartIcon className="h-6 w-6" />
              </div>
              <div className="reports-summary-card__stats">
                <div className="reports-summary-card__stat">
                  <span className="reports-summary-card__stat-label"><Trans>Total Earnings</Trans></span>
                  <span className="reports-summary-card__stat-value">
                    {totalEarnings >= 100000
                      ? `₹${(totalEarnings / 100000).toFixed(1)}L`
                      : totalEarnings > 0
                        ? `₹${Math.round(totalEarnings).toLocaleString('en-IN')}`
                        : '₹0'}
                  </span>
                </div>
                <div className="reports-summary-card__stat">
                  <span className="reports-summary-card__stat-label"><Trans>Total Orders</Trans></span>
                  <span className="reports-summary-card__stat-value">{orderCount}</span>
                </div>
              </div>
            </div>
            <div className="reports-summary-card__insights">
              {orderCount > 0 && (
                <div className="reports-summary-card__insight">
                  <span className="reports-summary-card__insight-icon">⚡</span>
                  <span className="reports-summary-card__insight-text"><Trans>{`${orderCount} orders completed this ${timePeriod}`}</Trans></span>
                </div>
              )}
              {averageOrderValue > 0 && (
                <div className="reports-summary-card__insight">
                  <span className="reports-summary-card__insight-icon">📈</span>
                  <span className="reports-summary-card__insight-text"><Trans>{`Average order value: ₹${averageOrderValue.toLocaleString('en-IN')}`}</Trans></span>
                </div>
              )}
              {orderCount === 0 && (
                <div className="reports-summary-card__insight">
                  <span className="reports-summary-card__insight-icon">ℹ️</span>
                  <span className="reports-summary-card__insight-text"><Trans>No orders data available for this period</Trans></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="reports-metrics" className="reports-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Performance metrics</Trans></h3>
          </div>
        </div>
        <div className="reports-metric-grid">
          {[
            { label: <Trans>Avg Order Value</Trans>, value: averageOrderValue > 0 ? `₹${averageOrderValue.toLocaleString('en-IN')}` : '₹0', meta: <Trans>Per order</Trans>, icon: WalletIcon },
            { label: <Trans>Orders Completed</Trans>, value: String(orderCount), meta: <Trans>Delivered orders</Trans>, icon: CreditIcon },
            { label: <Trans>Performance</Trans>, value: orderCount > 0 ? <Trans>Active</Trans> : <Trans>No activity</Trans>, meta: <Trans>This period</Trans>, icon: HomeIcon },
          ].map((metric, index) => {
            const Icon = metric.icon || reportIcons[index % reportIcons.length]
            return (
              <div key={metric.label} className="reports-metric-card">
                <span className="reports-metric-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="reports-metric-body">
                  <p>{metric.label}</p>
                  <span>{metric.value}</span>
                  <small>{metric.meta}</small>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section id="reports-analytics" className="reports-tab-section">
        <div className="reports-tab-header">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn('reports-tab-button', activeTab === tab.id && 'is-active')}
              onClick={() => onNavigate?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="reports-tab-content">
          {activeTab === 'revenue' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <div className="reports-analytics-card__header-top">
                    <div>
                      <h4 className="reports-analytics-card__title"><Trans>Earnings from orders</Trans></h4>
                      <span className="reports-analytics-card__subtitle">
                        {timePeriod === 'week' && <Trans>Last 7 days</Trans>}
                        {timePeriod === 'month' && <Trans>Last 30 days</Trans>}
                        {timePeriod === 'year' && <Trans>Last 12 months</Trans>}
                        {timePeriod === 'all' && <Trans>From start</Trans>}
                      </span>
                    </div>
                    <div className="reports-time-period-selector">
                      {timePeriods.map((period) => (
                        <button
                          key={period.id}
                          type="button"
                          className={cn(
                            'reports-time-period-button',
                            timePeriod === period.id && 'is-active',
                          )}
                          onClick={() => setTimePeriod(period.id)}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reports-analytics-card__chart">
                  <div className="reports-line-chart">
                    <div className="reports-line-chart__legend">
                      <div className="reports-line-chart__legend-item">
                        <span className="reports-line-chart__legend-dot is-revenue" />
                        <span className="reports-line-chart__legend-label"><Trans>Earnings (₹L)</Trans></span>
                      </div>
                      <div className="reports-line-chart__legend-item">
                        <span className="reports-line-chart__legend-dot is-orders" />
                        <span className="reports-line-chart__legend-label"><Trans>Orders</Trans></span>
                      </div>
                    </div>
                    <div className="reports-line-chart__container">
                      <div className="reports-line-chart__y-axis">
                        {yAxisLabels.map((label, index) => (
                          <span key={index} className="reports-line-chart__y-label">
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="reports-line-chart__graph">
                        <svg className="reports-line-chart__svg" viewBox={`0 0 ${(chartData.labels.length - 1) * 100} 200`} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(29, 78, 216, 0.3)" />
                              <stop offset="100%" stopColor="rgba(29, 78, 216, 0.05)" />
                            </linearGradient>
                            <linearGradient id="ordersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(33, 150, 173, 0.3)" />
                              <stop offset="100%" stopColor="rgba(33, 150, 173, 0.05)" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          {yAxisLabels.map((_, index) => {
                            const y = (index / yAxisSteps) * 200
                            return (
                              <line
                                key={index}
                                x1="0"
                                y1={y}
                                x2={(chartData.labels.length - 1) * 100}
                                y2={y}
                                stroke="rgba(30, 58, 138, 0.08)"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                              />
                            )
                          })}
                          {/* Revenue area */}
                          <path
                            d={`M 0,${200 - (chartData.revenue[0] / maxValue) * 200} ${chartData.revenue
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')} L ${(chartData.labels.length - 1) * 100},200 L 0,200 Z`}
                            fill="url(#revenueGradient)"
                          />
                          {/* Orders area */}
                          <path
                            d={`M 0,${200 - (chartData.orders[0] / maxValue) * 200} ${chartData.orders
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')} L ${(chartData.labels.length - 1) * 100},200 L 0,200 Z`}
                            fill="url(#ordersGradient)"
                          />
                          {/* Revenue line */}
                          <path
                            d={`M 0,${200 - (chartData.revenue[0] / maxValue) * 200} ${chartData.revenue
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')}`}
                            fill="none"
                            stroke="rgba(29, 78, 216, 0.9)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Orders line */}
                          <path
                            d={`M 0,${200 - (chartData.orders[0] / maxValue) * 200} ${chartData.orders
                              .slice(1)
                              .map((value, index) => `L ${(index + 1) * 100},${200 - (value / maxValue) * 200}`)
                              .join(' ')}`}
                            fill="none"
                            stroke="rgba(33, 150, 173, 0.9)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Data points */}
                          {chartData.revenue.map((value, index) => (
                            <circle
                              key={`revenue-${index}`}
                              cx={index * 100}
                              cy={200 - (value / maxValue) * 200}
                              r="4"
                              fill="rgba(29, 78, 216, 0.95)"
                              stroke="rgba(255, 255, 255, 0.9)"
                              strokeWidth="2"
                            />
                          ))}
                          {chartData.orders.map((value, index) => (
                            <circle
                              key={`orders-${index}`}
                              cx={index * 100}
                              cy={200 - (value / maxValue) * 200}
                              r="4"
                              fill="rgba(33, 150, 173, 0.95)"
                              stroke="rgba(255, 255, 255, 0.9)"
                              strokeWidth="2"
                            />
                          ))}
                        </svg>
                        <div className="reports-line-chart__x-axis">
                          {chartData.labels.map((label, index) => (
                            <span key={index} className="reports-line-chart__x-label">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="reports-line-chart__stats">
                      <div className="reports-line-chart__stat">
                        <span className="reports-line-chart__stat-label"><Trans>Earnings</Trans></span>
                        <span className="reports-line-chart__stat-value">
                          {chartData.revenue.length > 0 ? (
                            chartData.revenue.reduce((a, b) => a + b, 0) /
                            chartData.revenue.length
                          ).toFixed(1) : '0.0'}
                          {timePeriod === 'year' || timePeriod === 'all' ? 'k' : ''} ₹L
                        </span>
                        <span className="reports-line-chart__stat-change is-positive">+12.5%</span>
                      </div>
                      <div className="reports-line-chart__stat">
                        <span className="reports-line-chart__stat-label"><Trans>Orders</Trans></span>
                        <span className="reports-line-chart__stat-value">
                          {chartData.orders.length > 0 ? Math.round(
                            chartData.orders.reduce((a, b) => a + b, 0) / chartData.orders.length,
                          ) : 0}
                        </span>
                        <span className="reports-line-chart__stat-change is-positive">+8.3%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'performance' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <span className="reports-analytics-card__badge"><Trans>Last 30 days</Trans></span>
                  <h4 className="reports-analytics-card__title"><Trans>Order delivery performance</Trans></h4>
                </div>
                <div className="reports-analytics-card__chart">
                  <div className="reports-chart">
                    <div className="reports-chart__legend">
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-revenue" />
                        <span className="reports-chart__legend-label"><Trans>On-time delivery</Trans></span>
                      </div>
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-fulfilment" />
                        <span className="reports-chart__legend-label"><Trans>Average delay</Trans></span>
                      </div>
                    </div>
                    <div className="reports-chart__bars">
                      {[
                        { label: <Trans>Week 1</Trans>, revenue: 92, fulfilment: 8 },
                        { label: <Trans>Week 2</Trans>, revenue: 88, fulfilment: 12 },
                        { label: <Trans>Week 3</Trans>, revenue: 95, fulfilment: 5 },
                        { label: <Trans>Week 4</Trans>, revenue: 90, fulfilment: 10 },
                      ].map((week, index) => (
                        <div key={index} className="reports-chart__bar-group">
                          <div className="reports-chart__bar-container">
                            <div className="reports-chart__bar is-revenue" style={{ height: `${week.revenue}%` }}>
                              <span className="reports-chart__bar-value">{week.revenue}%</span>
                            </div>
                            <div className="reports-chart__bar is-fulfilment" style={{ height: `${week.fulfilment}%` }}>
                              <span className="reports-chart__bar-value">{week.fulfilment}%</span>
                            </div>
                          </div>
                          <span className="reports-chart__bar-label">{week.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reports-performance-metrics">
                  <div className="reports-performance-metric">
                    <span className="reports-performance-metric__label"><Trans>Average time to deliver</Trans></span>
                    <span className="reports-performance-metric__value">18.5h</span>
                  </div>
                  <div className="reports-performance-metric">
                    <span className="reports-performance-metric__label"><Trans>Order correctness</Trans></span>
                    <span className="reports-performance-metric__value">96.2%</span>
                  </div>
                  <div className="reports-performance-metric">
                    <span className="reports-performance-metric__label"><Trans>Customer rating</Trans></span>
                    <span className="reports-performance-metric__value">4.7/5</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'trends' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <span className="reports-analytics-card__badge"><Trans>Last 3 months</Trans></span>
                  <h4 className="reports-analytics-card__title"><Trans>Growth summary</Trans></h4>
                </div>
                <div className="reports-analytics-card__chart">
                  <div className="reports-chart">
                    <div className="reports-chart__legend">
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-revenue" />
                        <span className="reports-chart__legend-label"><Trans>Number of orders</Trans></span>
                      </div>
                      <div className="reports-chart__legend-item">
                        <span className="reports-chart__legend-dot is-fulfilment" />
                        <span className="reports-chart__legend-label"><Trans>Earnings growth</Trans></span>
                      </div>
                    </div>
                    <div className="reports-chart__bars">
                      {[
                        { label: <Trans>Month 1</Trans>, revenue: 68, fulfilment: 72 },
                        { label: <Trans>Month 2</Trans>, revenue: 75, fulfilment: 78 },
                        { label: <Trans>Month 3</Trans>, revenue: 82, fulfilment: 85 },
                      ].map((month, index) => (
                        <div key={index} className="reports-chart__bar-group">
                          <div className="reports-chart__bar-container">
                            <div className="reports-chart__bar is-revenue" style={{ height: `${month.revenue}%` }}>
                              <span className="reports-chart__bar-value">{month.revenue}%</span>
                            </div>
                            <div className="reports-chart__bar is-fulfilment" style={{ height: `${month.fulfilment}%` }}>
                              <span className="reports-chart__bar-value">{month.fulfilment}%</span>
                            </div>
                          </div>
                          <span className="reports-chart__bar-label">{month.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reports-trends-insights">
                  <div className="reports-trend-item">
                    <span className="reports-trend-item__icon">📈</span>
                    <div className="reports-trend-item__content">
                      <span className="reports-trend-item__label"><Trans>Busy season coming</Trans></span>
                      <span className="reports-trend-item__value"><Trans>+24% expected growth</Trans></span>
                    </div>
                  </div>
                  <div className="reports-trend-item">
                    <span className="reports-trend-item__icon">🌾</span>
                    <div className="reports-trend-item__content">
                      <span className="reports-trend-item__label"><Trans>Top product category</Trans></span>
                      <span className="reports-trend-item__value"><Trans>Organic fertilizers</Trans></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'insights' && (
            <div className="reports-tab-panel is-active">
              <div className="reports-analytics-card">
                <div className="reports-analytics-card__header">
                  <span className="reports-analytics-card__badge"><Trans>Smart suggestions</Trans></span>
                  <h4 className="reports-analytics-card__title"><Trans>Important tips</Trans></h4>
                </div>
                <div className="reports-insights-list">
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-success">✓</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title"><Trans>Manage stock better</Trans></h5>
                      <p className="reports-insight-card__description">
                        <Trans>Your top 3 products show 15% higher demand. Consider increasing stock by 20% to meet busy season.</Trans>
                      </p>
                    </div>
                  </div>
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-warn">⚠</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title"><Trans>Faster delivery</Trans></h5>
                      <p className="reports-insight-card__description">
                        <Trans>Western hub routes show 8% delay. Consider other delivery partners for faster delivery.</Trans>
                      </p>
                    </div>
                  </div>
                  <div className="reports-insight-card">
                    <div className="reports-insight-card__icon is-success">📊</div>
                    <div className="reports-insight-card__content">
                      <h5 className="reports-insight-card__title"><Trans>Repeat customers</Trans></h5>
                      <p className="reports-insight-card__description">
                        <Trans>Repeat orders increased by 12% this month. Focus on maintaining quality standards.</Trans>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Top admins section removed - not relevant for user's own dashboard */}
    </div>
  )
}

function EarningsView({ openPanel, onNavigate }) {
  const dispatch = useUserDispatch()
  const { getEarningsSummary, getEarningsHistory, getEarningsByOrders, getWithdrawals, getBankAccounts } = useUserApi()
  const { toasts, dismissToast, success, error } = useToast()
  const [earningsData, setEarningsData] = useState(null)
  const [earningsHistory, setEarningsHistory] = useState([])
  const [earningsByOrders, setEarningsByOrders] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyPage, setHistoryPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)
  const [activeSection, setActiveSection] = useState('summary') // 'summary', 'history', 'orders', 'withdrawals'
  const [showBankAccountForm, setShowBankAccountForm] = useState(false)
  const bankAccountFormRef = useRef(null)

  useEffect(() => {
    loadEarningsData()
    loadBankAccounts()
  }, [])

  // Scroll to form when it opens
  useEffect(() => {
    if (showBankAccountForm && bankAccountFormRef.current) {
      setTimeout(() => {
        bankAccountFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [showBankAccountForm])

  const loadEarningsData = async () => {
    setLoading(true)
    try {
      const [summaryResult, historyResult, ordersResult, withdrawalsResult] = await Promise.all([
        getEarningsSummary(),
        getEarningsHistory({ page: historyPage, limit: 10 }),
        getEarningsByOrders({ page: ordersPage, limit: 10 }),
        getWithdrawals({ page: 1, limit: 10 }),
      ])

      if (summaryResult.data) setEarningsData(summaryResult.data)
      if (historyResult.data?.earnings) setEarningsHistory(historyResult.data.earnings)
      if (ordersResult.data?.earningsByOrder) setEarningsByOrders(ordersResult.data.earningsByOrder)
      if (withdrawalsResult.data?.withdrawals) setWithdrawals(withdrawalsResult.data.withdrawals)
    } catch (err) {
      error(<Trans>Failed to load earnings data</Trans>)
    } finally {
      setLoading(false)
    }
  }

  const loadBankAccounts = async () => {
    const result = await getBankAccounts()
    if (result.data?.bankAccounts) {
      setBankAccounts(result.data.bankAccounts)
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₹0'
    return `₹${Math.round(amount).toLocaleString('en-IN')}`
  }

  const formatDate = (date) => {
    if (!date) return translate('N/A')
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading && !earningsData) {
    return (
      <div className="earnings-view space-y-6">
        <div className="earnings-status-card">
          <div className="earnings-status-card__main">
            <p><Trans>Loading earnings data...</Trans></p>
          </div>
        </div>
      </div>
    )
  }

  const summary = earningsData || {
    totalEarnings: 0,
    availableBalance: 0,
    pendingWithdrawal: 0,
    totalWithdrawn: 0,
    thisMonthEarnings: 0,
    lastWithdrawalDate: null,
  }

  const earningsMetrics = [
    { label: <Trans>Available Balance</Trans>, value: formatCurrency(summary.availableBalance), icon: SparkIcon, tone: 'success' },
    { label: <Trans>Total Withdrawn</Trans>, value: formatCurrency(summary.totalWithdrawn || 0), icon: WalletIcon, tone: 'info' },
    { label: <Trans>Pending Withdrawal</Trans>, value: formatCurrency(summary.pendingWithdrawal), icon: ClockIcon, tone: 'warn' },
    { label: <Trans>This Month</Trans>, value: formatCurrency(summary.thisMonthEarnings), icon: ChartIcon, tone: 'teal' },
  ]

  return (
    <div className="earnings-view space-y-6">
      {/* Earnings Summary Section */}
      <section id="earnings-summary" className="earnings-status-section">
        <div className="earnings-status-card">
          <div className="earnings-status-card__main">
            <div className="earnings-status-card__progress-wrapper">
              <div className="earnings-status-card__progress-ring">
                <svg className="earnings-status-card__progress-svg" viewBox="0 0 120 120">
                  <circle
                    className="earnings-status-card__progress-bg"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    strokeWidth="8"
                  />
                  <circle
                    className="earnings-status-card__progress-fill"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - (summary.availableBalance / Math.max(summary.totalEarnings, 1)))}`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="earnings-status-card__progress-content">
                  <span className="earnings-status-card__progress-percent">
                    {summary.totalEarnings > 0
                      ? Math.round((summary.availableBalance / summary.totalEarnings) * 100)
                      : 0}%
                  </span>
                  <span className="earnings-status-card__progress-label"><Trans>Available</Trans></span>
                </div>
              </div>
              <div className="earnings-status-card__details">
                <div className="earnings-status-card__amount">
                  <span className="earnings-status-card__amount-value">{formatCurrency(summary.totalEarnings)}</span>
                  <span className="earnings-status-card__amount-label"><Trans>Total Earnings</Trans></span>
                </div>
                <div className="earnings-status-card__quick-info">
                  <div className="earnings-status-card__info-item">
                    <span className="earnings-status-card__info-label"><Trans>Available</Trans></span>
                    <span className="earnings-status-card__info-value">{formatCurrency(summary.availableBalance)}</span>
                  </div>
                  <div className="earnings-status-card__info-item">
                    <span className="earnings-status-card__info-label"><Trans>Withdrawn</Trans></span>
                    <span className="earnings-status-card__info-value">{formatCurrency(summary.totalWithdrawn || 0)}</span>
                  </div>
                  <div className="earnings-status-card__info-item">
                    <span className="earnings-status-card__info-label"><Trans>Pending</Trans></span>
                    <span className="earnings-status-card__info-value">{formatCurrency(summary.pendingWithdrawal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="earnings-status-card__footer">
            <div className="earnings-status-card__status-badge">
              <span className="earnings-status-card__status-text">
                {summary.lastWithdrawalDate
                  ? <Trans>{`Last withdrawal: ${formatDate(summary.lastWithdrawalDate)}`}</Trans>
                  : <Trans>No withdrawals yet</Trans>}
              </span>
            </div>
            <button
              type="button"
              className="earnings-status-card__action"
              onClick={() => {
                if (bankAccounts.length === 0) {
                  error(<Trans>Please add a bank account before requesting withdrawal</Trans>)
                  return
                }

                // Prepare bank account options for the select field
                const bankAccountOptions = bankAccounts.map((account) => ({
                  value: account._id || account.id,
                  label: translate('{{name}} - {{bank}} ({{last4}}){{primary}}', {
                    name: account.accountHolderName,
                    bank: account.bankName,
                    last4: account.accountNumber && account.accountNumber.length >= 4
                      ? account.accountNumber.slice(-4)
                      : (account.accountNumber || 'N/A'),
                    primary: account.isPrimary ? ` - ${translate('Primary')}` : '',
                  }),
                }))

                // Set default to primary account if available
                const primaryAccount = bankAccounts.find((acc) => acc.isPrimary)
                const defaultBankAccountId = primaryAccount?._id || primaryAccount?.id || bankAccounts[0]?._id || bankAccounts[0]?.id

                // Update the field options dynamically
                openPanel('request-withdrawal', {
                  availableBalance: summary.availableBalance,
                  bankAccountOptions,
                  bankAccountId: defaultBankAccountId,
                  bankAccounts: bankAccounts, // Pass full bank accounts array for confirmation modal
                })
              }}
              disabled={summary.availableBalance < 1000 || bankAccounts.length === 0}
            >
              <Trans>Request Withdrawal</Trans>
            </button>
          </div>
          {bankAccounts.length === 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#92400e' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: 0 }}>
                  <strong><Trans>No bank account added.</Trans></strong> <Trans>Please add a bank account to request withdrawals.</Trans>
                </p>
                <button
                  type="button"
                  onClick={() => setShowBankAccountForm(true)}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    background: '#1d4ed8',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#1e40af'}
                  onMouseLeave={(e) => e.target.style.background = '#1d4ed8'}
                >
                  <Trans>Add Bank Account</Trans>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Earnings Metrics Grid */}
      <section id="earnings-metrics" className="earnings-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Earnings Summary</Trans></h3>
          </div>
        </div>
        <div className="earnings-metric-grid">
          {earningsMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="earnings-metric-card">
                <span
                  className={cn(
                    'earnings-metric-icon',
                    metric.tone === 'warn' ? 'is-warn' : metric.tone === 'teal' ? 'is-teal' : 'is-success',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="earnings-metric-body">
                  <p>{metric.label}</p>
                  <span>{metric.value}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Navigation Tabs */}
      <section id="earnings-tabs" className="earnings-section">
        <div className="overview-section__header">
          <div>
            <h3 className="overview-section__title"><Trans>Earnings Details</Trans></h3>
          </div>
        </div>
        <div className="earnings-action-grid earnings-action-grid--scrollable">
          <button
            type="button"
            className={cn('earnings-action-card', activeSection === 'history' && 'is-active')}
            onClick={() => setActiveSection('history')}
          >
            <header>
              <span className="earnings-action-card__icon">
                <ReportIcon className="h-5 w-5" />
              </span>
              <h4 className="earnings-action-card__title"><Trans>History</Trans></h4>
            </header>
          </button>
          <button
            type="button"
            className={cn('earnings-action-card', activeSection === 'orders' && 'is-active')}
            onClick={() => setActiveSection('orders')}
          >
            <header>
              <span className="earnings-action-card__icon">
                <CartIcon className="h-5 w-5" />
              </span>
              <h4 className="earnings-action-card__title"><Trans>By Orders</Trans></h4>
            </header>
          </button>
          <button
            type="button"
            className={cn('earnings-action-card', activeSection === 'withdrawals' && 'is-active')}
            onClick={() => setActiveSection('withdrawals')}
          >
            <header>
              <span className="earnings-action-card__icon">
                <WalletIcon className="h-5 w-5" />
              </span>
              <h4 className="earnings-action-card__title"><Trans>Withdrawals</Trans></h4>
            </header>
          </button>
        </div>
      </section>

      {/* Earnings History */}
      {activeSection === 'history' && (
        <section id="earnings-history" className="earnings-section">
          <div className="overview-section__header">
            <div>
              <h3 className="overview-section__title"><Trans>Earnings History</Trans></h3>
            </div>
          </div>
          {earningsHistory.length === 0 ? (
            <div className="earnings-usage-card">
              <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}><Trans>No earnings history yet</Trans></p>
            </div>
          ) : (
            <div className="earnings-usage-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {earningsHistory.map((earning) => (
                  <div
                    key={earning._id || earning.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        <TransText>{earning.productName || 'Product'}</TransText>
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>
                        <TransText>{`Order: ${earning.orderId?.orderNumber || 'N/A'} • Qty: ${earning.quantity}`}</TransText>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                        {formatDate(earning.processedAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '600', color: '#10b981' }}>{formatCurrency(earning.earnings)}</p>
                      <p style={{ fontSize: '0.75rem', color: '#666' }}>
                        <TransText>{`${formatCurrency(earning.userPrice - earning.userPrice)} per unit`}</TransText>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Earnings by Orders */}
      {activeSection === 'orders' && (
        <section id="earnings-orders" className="earnings-section">
          <div className="overview-section__header">
            <div>
              <h3 className="overview-section__title"><Trans>Earnings by Orders</Trans></h3>
            </div>
          </div>
          {earningsByOrders.length === 0 ? (
            <div className="earnings-usage-card">
              <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}><Trans>No earnings from orders yet</Trans></p>
            </div>
          ) : (
            <div className="earnings-usage-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {earningsByOrders.map((orderEarning) => (
                  <div
                    key={orderEarning.orderId}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {orderEarning.orderNumber || <Trans>Order</Trans>}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>
                        <Trans>{`${orderEarning.itemCount} item${orderEarning.itemCount !== 1 ? 's' : ''}`}</Trans>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                        {formatDate(orderEarning.processedAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '600', color: '#10b981' }}>
                        {formatCurrency(orderEarning.totalEarnings)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#666' }}>
                        <Trans>{`Order: ${formatCurrency(orderEarning.orderTotal)}`}</Trans>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Withdrawals Section */}
      {activeSection === 'withdrawals' && (
        <section id="earnings-withdrawals" className="earnings-section">
          <div className="overview-section__header">
            <div>
              <h3 className="overview-section__title"><Trans>Withdrawal History</Trans></h3>
            </div>
          </div>
          {withdrawals.length === 0 ? (
            <div className="earnings-usage-card">
              <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}><Trans>No withdrawal requests yet</Trans></p>
            </div>
          ) : (
            <div className="earnings-usage-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {withdrawals.map((withdrawal) => {
                  const statusColor = withdrawal.status === 'approved' || withdrawal.status === 'completed'
                    ? '#10b981'
                    : withdrawal.status === 'rejected'
                      ? '#ef4444'
                      : '#f59e0b'
                  const statusText = withdrawal.status === 'approved' ? <Trans>Approved</Trans>
                    : withdrawal.status === 'completed' ? <Trans>Completed</Trans>
                      : withdrawal.status === 'rejected' ? <Trans>Rejected</Trans>
                        : <Trans>Pending</Trans>
                  return (
                    <div
                      key={withdrawal._id || withdrawal.id}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          <Trans>Withdrawal Request</Trans>
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>
                          <TransText>{withdrawal.bankAccountId?.bankName || 'Bank'}</TransText> • {withdrawal.bankAccountId?.accountNumber ? `****${withdrawal.bankAccountId.accountNumber.slice(-4)}` : <Trans>N/A</Trans>}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                          {formatDate(withdrawal.reviewedAt || withdrawal.createdAt)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '600', color: statusColor }}>{formatCurrency(withdrawal.amount)}</p>
                        <p style={{ fontSize: '0.75rem', color: statusColor }}>
                          {statusText}
                        </p>
                        {withdrawal.paymentReference && (
                          <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.25rem' }}>
                            <Trans>{`Ref: ${withdrawal.paymentReference.slice(-8)}`}</Trans>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Bank Account Form */}
      {showBankAccountForm ? (
        <div ref={bankAccountFormRef}>
          <BankAccountForm
            isOpen={showBankAccountForm}
            onClose={() => setShowBankAccountForm(false)}
            onSuccess={async (bankAccount) => {
              success(<Trans>Bank account added successfully!</Trans>)
              // Reload bank accounts
              await loadBankAccounts()
              setShowBankAccountForm(false)
              // Refresh earnings summary
              const summaryResult = await getEarningsSummary()
              if (summaryResult.data) {
                setEarningsData((prev) => ({
                  ...prev,
                  summary: summaryResult.data,
                }))
              }
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
