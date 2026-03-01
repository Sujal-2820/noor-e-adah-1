import { WebsiteHeader } from './WebsiteHeader'
import { WebsiteFooter } from './WebsiteFooter'
import { CartSidebar } from './CartSidebar'
import '../styles/website.css'

export function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <WebsiteHeader />
      <CartSidebar />
      <main className="flex-grow pt-[120px] lg:pt-[140px]">
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
