import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate, useLocation } from 'react-router-dom'
import { AdminDashboardRoute as AdminDashboardModuleRoute, AdminLogin } from './modules/Admin'

import {
  UserRouteContainer,
  UserLoginPage,
  UserRegisterPage,
  UserDashboardPage,
  UserLanguagePage,
  UserRolePage,
} from './modules/User'

import { WebsiteProvider, WebsiteRoutes } from './modules/website'
import { TranslationProvider } from './context/TranslationContext'
import { useEffect } from 'react'
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService'

function Home() {
  const links = [
    { label: 'Admin Login', to: '/admin/login' },
    { label: 'Admin Dashboard', to: '/admin/dashboard' },
    { label: 'User Language Select', to: '/user/language' },
    { label: 'User Login', to: '/user/login' },
    { label: 'User Dashboard', to: '/user/dashboard' },
  ]

  return (
    <div className="min-h-screen bg-surface px-6 py-12 text-surface-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Noor E Adah</p>
          <h1 className="mt-2 text-3xl font-semibold text-surface-foreground">Access Console Routes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a portal to continue. Admin and User portals are now unified.
          </p>
        </header>
        <nav className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-3xl border border-muted/60 bg-white/90 px-5 py-4 text-sm font-semibold text-brand shadow-card transition hover:border-brand/50 hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

function AdminLoginRoute() {
  const navigate = useNavigate()
  return <AdminLogin onSubmit={() => navigate('/admin/dashboard')} />
}

function AdminDashboardRoute() {
  const navigate = useNavigate()
  return <AdminDashboardModuleRoute onExit={() => navigate('/admin/login')} />
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function App() {
  useEffect(() => {
    // Initialize Push Notifications
    initializePushNotifications();

    // Setup foreground handler
    setupForegroundNotificationHandler((payload) => {
      console.log('Push notification received in foreground:', payload);
    });
  }, []);

  return (
    <TranslationProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Console/Admin Routes */}
          <Route path="/console" element={<Home />} />
          <Route path="/admin/login" element={<AdminLoginRoute />} />
          <Route path="/admin/dashboard" element={<AdminDashboardRoute />} />

          {/* User Routes (Refactored from User) */}
          <Route path="/user" element={<UserRouteContainer />}>
            <Route path="language" element={<UserLanguagePage />} />
            <Route path="role" element={<UserRolePage />} />
            <Route path="login" element={<UserLoginPage />} />
            <Route path="register" element={<UserRegisterPage />} />
            <Route path="dashboard" element={<Navigate to="/user/dashboard/overview" replace />} />
            <Route path="dashboard/:tab" element={<UserDashboardPage />} />
            <Route path="dashboard/:tab/:id" element={<UserDashboardPage />} />
          </Route>

          {/* Fallback to User if /user is used (backward compatibility) */}
          <Route path="/user/*" element={<Navigate to="/user" replace />} />

          {/* Website Routes - Public E-commerce Site */}
          <Route path="/*" element={
            <WebsiteProvider>
              <WebsiteRoutes />
            </WebsiteProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TranslationProvider>
  )
}

export default App
