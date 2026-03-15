import { useLocation } from 'react-router-dom'
import { cn } from '../../../lib/cn'
import { WebsiteHeader } from './WebsiteHeader'
import { WebsiteFooter } from './WebsiteFooter'
import { CartSidebar } from './CartSidebar'
import '../styles/website.css'

export function Layout({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <WebsiteHeader />
      <CartSidebar />
      <main className={cn(
        "flex-grow transition-all duration-300",
        isHome ? "pt-0" : "pt-[90px] lg:pt-[100px]"
      )}>
        {children}
      </main>
      <WebsiteFooter />
    </div>
  )
}

export function Container({ children, className = '' }) {
  return (
    <div className={`max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 w-full ${className}`}>
      {children}
    </div>
  )
}

export function Section({ children, className = '' }) {
  return (
    <section className={`py-12 sm:py-20 lg:py-24 ${className}`}>
      {children}
    </section>
  )
}
