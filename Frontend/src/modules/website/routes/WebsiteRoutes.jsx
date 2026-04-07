import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { ProductListingPage } from '../pages/ProductListingPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { CartPage } from '../pages/CartPage'
import { CheckoutPage } from '../pages/CheckoutPage'
import { OrderConfirmationPage } from '../pages/OrderConfirmationPage'
import { FavouritesPage } from '../pages/FavouritesPage'
import { CategoryProductsPage } from '../pages/CategoryProductsPage'
import { AccountPage, AccountProfilePage, AccountOrdersPage, AccountAddressesPage, AccountSupportPage } from '../pages/AccountPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { AuthPage } from '../pages/AuthPage'
import { ContactPage, TermsPage, PrivacyPage, ShippingPage, RefundPage } from '../pages/PolicyPages'

export function WebsiteRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/home/shop" element={<ProductListingPage />} />
      <Route path="/products" element={<ProductListingPage />} />
      <Route path="/category" element={<CategoryProductsPage />} />
      <Route path="/product/:productId" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/my-account" element={<AuthPage />} />

      {/* Policy Routes */}
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/shipping" element={<ShippingPage />} />
      <Route path="/returns" element={<RefundPage />} />

      {/* Protected Routes */}
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
      <Route path="/favourites" element={<FavouritesPage />} />
      <Route path="/account" element={<AccountPage />}>
        <Route path="profile" element={<AccountProfilePage />} />
        <Route path="orders" element={<AccountOrdersPage />} />
        <Route path="addresses" element={<AccountAddressesPage />} />
        <Route path="support" element={<AccountSupportPage />} />
        <Route index element={<Navigate to="/account/profile" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
