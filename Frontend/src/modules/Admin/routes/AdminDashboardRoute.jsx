import { useMemo, useState, useCallback, useEffect } from 'react'
import { AdminProvider } from '../context/AdminContext'
import { ToastProvider } from '../components/ToastNotification'
import { AdminLayout } from '../components/AdminLayout'
import { Sidebar } from '../components/Sidebar'
import { DashboardPage } from '../pages/Dashboard'
import { ProductsPage } from '../pages/Products'
import { UsersPage } from '../pages/Users'
import { OrdersPage } from '../pages/Orders'
import { OperationsPage } from '../pages/Operations'
import { AnalyticsPage } from '../pages/Analytics'
import { PaymentHistoryPage } from '../pages/PaymentHistory'
import { OffersPage } from '../pages/Offers'
import { ReviewsPage } from '../pages/Reviews'
import TasksPage from '../pages/Tasks'
import { PushNotificationsPage } from '../pages/PushNotifications'
import { CategoriesPage } from '../pages/Categories'
import { UserOrdersPage } from '../pages/UserOrders'

const routeConfig = [
  { id: 'dashboard', element: DashboardPage },
  { id: 'products', element: ProductsPage },
  { id: 'users', element: UsersPage },
  { id: 'users/orders', element: UserOrdersPage },
  { id: 'orders', element: OrdersPage },
  { id: 'operations', element: OperationsPage },
  { id: 'analytics', element: AnalyticsPage },
  { id: 'payment-history', element: PaymentHistoryPage },
  { id: 'offers', element: OffersPage },
  { id: 'reviews', element: ReviewsPage },
  { id: 'tasks', element: TasksPage },
  { id: 'push-notifications', element: PushNotificationsPage },
  { id: 'categories', element: CategoriesPage },
]

const ADMIN_ROUTE_KEY = 'admin_active_route'

function AdminDashboardContent({ activeRoute, setActiveRoute, onExit }) {
  const { pageId, subRoute } = useMemo(() => {
    // Parse route like 'products/add' into pageId='products' and subRoute='add'
    const parts = activeRoute.split('/')
    return {
      pageId: parts[0],
      subRoute: parts.slice(1).join('/') || null,
    }
  }, [activeRoute])

  const ActivePageComponent = useMemo(() => {
    // First, try to match the full route (e.g., 'users/orders')
    const fullMatch = routeConfig.find((route) => route.id === activeRoute)
    if (fullMatch) return fullMatch.element

    // If no full match, fall back to matching just the pageId
    const pageMatch = routeConfig.find((route) => route.id === pageId)
    return pageMatch?.element ?? DashboardPage
  }, [activeRoute, pageId])

  const navigate = useCallback((route) => {
    setActiveRoute(route)
    // Persist route to sessionStorage so it survives refresh
    sessionStorage.setItem(ADMIN_ROUTE_KEY, route)
  }, [setActiveRoute])

  return (
    <AdminLayout
      sidebar={(props) => <Sidebar active={activeRoute} onNavigate={navigate} {...props} />}
      onExit={onExit}
    >
      <ActivePageComponent subRoute={subRoute} navigate={navigate} />
    </AdminLayout>
  )
}

export function AdminDashboardRoute({ onExit }) {
  // Restore last active route from sessionStorage, default to 'dashboard'
  const [activeRoute, setActiveRoute] = useState(() => {
    const savedRoute = sessionStorage.getItem(ADMIN_ROUTE_KEY)
    return savedRoute || 'dashboard'
  })

  // Persist route changes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(ADMIN_ROUTE_KEY, activeRoute)
  }, [activeRoute])

  return (
    <AdminProvider>
      <ToastProvider>
        <AdminDashboardContent
          activeRoute={activeRoute}
          setActiveRoute={setActiveRoute}
          onExit={onExit}
        />
      </ToastProvider>
    </AdminProvider>
  )
}


