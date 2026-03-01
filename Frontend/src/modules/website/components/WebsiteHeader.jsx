import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import { Container } from './Layout'
import { cn } from '../../../lib/cn'
import * as websiteApi from '../services/websiteApi'
import { auth } from '../../../firebase'
import { signOut, signInWithEmailAndPassword } from 'firebase/auth'

const ANNOUNCEMENTS = [
  "FREE SHIPPING ON ORDERS OVER ₹5000",
  "NEW ARRIVALS: FESTIVE EDIT '24",
  "SHOP ANY 2 PRODUCTS AND GET 10% OFF",
  "TRADITIONAL ARTISANSHIP | MADE IN INDIA"
]

function AuthDropdown({ onClose }) {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, form.identifier, form.password)
      const user = userCredential.user
      const idToken = await user.getIdToken()

      if (rememberMe) {
        localStorage.setItem('rem_identifier', form.identifier)
        localStorage.setItem('rem_password', btoa(form.password))
      }

      const result = await websiteApi.syncFirebaseUser({ idToken })
      if (result.success) {
        localStorage.setItem('user_token', result.data.token)
        dispatch({ type: 'AUTH_LOGIN', payload: result.data.user })
        onClose()
        navigate('/account')
      } else {
        setError('Backend sync failed')
      }
    } catch (err) {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute top-full right-0 w-[350px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-8 border-t-2 border-brand z-[100] animate-calm-entry">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[13px] font-bold tracking-[0.1em] uppercase text-brand">Sign in</h3>
        <Link to="/register" onClick={onClose} className="text-[11px] font-medium text-brand/40 hover:text-accent uppercase tracking-widest">Create an Account</Link>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-[0.1em] uppercase text-brand/60">Username or email address *</label>
          <input
            type="text"
            required
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            className="w-full px-4 py-3 border border-brand/10 bg-muted/5 focus:border-brand outline-none transition-all text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-[0.1em] uppercase text-brand/60">Password *</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 border border-brand/10 bg-muted/5 focus:border-brand outline-none transition-all text-xs"
          />
        </div>

        {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white py-3.5 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 border-brand/20 rounded"
            />
            <span className="text-[10px] font-medium text-brand/50">Remember me</span>
          </label>
          <Link to="/login" onClick={onClose} className="text-[10px] font-medium text-brand/50 hover:text-accent">Lost your password?</Link>
        </div>
      </form>
    </div>
  )
}

export function WebsiteHeader() {
  const { authenticated, profile, cart, favourites } = useWebsiteState()
  const dispatch = useWebsiteDispatch()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [announcementIndex, setAnnouncementIndex] = useState(0)
  const [showAuthDropdown, setShowAuthDropdown] = useState(false)
  const authTimeoutRef = useRef(null)

  const [taxonomies, setTaxonomies] = useState({
    categories: [],
    looks: [],
    themes: [],
    collections: []
  })

  const handleLogout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem('user_token')
      dispatch({ type: 'AUTH_LOGOUT' })
      navigate('/')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const handleMouseEnterAuth = () => {
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current)
    setShowAuthDropdown(true)
  }

  const handleMouseLeaveAuth = () => {
    authTimeoutRef.current = setTimeout(() => {
      setShowAuthDropdown(false)
    }, 300)
  }

  // Fetch taxonomies for mega menu
  useEffect(() => {
    const fetchTaxonomies = async () => {
      try {
        const res = await websiteApi.getCategories()
        if (res.success && res.data?.categories) {
          const all = res.data.categories
          setTaxonomies({
            categories: all.filter(c => c.type === 'category' || !c.type),
            looks: all.filter(c => c.type === 'look'),
            themes: all.filter(c => c.type === 'theme'),
            collections: all.filter(c => c.type === 'collection')
          })
        }
      } catch (err) {
        console.error('Failed to fetch taxonomies:', err)
      }
    }
    fetchTaxonomies()
  }, [])

  // Rotate announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const favouritesCount = favourites.length

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const megaMenuSections = [
    { title: "SHOP BY CATEGORY", items: taxonomies.categories, key: 'category' },
    { title: "SHOP BY LOOK", items: taxonomies.looks, key: 'look' },
    { title: "SHOP BY THEME", items: taxonomies.themes, key: 'theme' },
    { title: "SHOP BY COLLECTION", items: taxonomies.collections, key: 'collection' }
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white group/header transition-all duration-300">
      {/* Announcement Bar - 3 Column Layout from Image */}
      <div className="bg-brand text-brand-foreground py-2 text-[7px] sm:text-[9px] font-semibold tracking-[0.2em] border-b border-white/5">
        <Container className="flex justify-between items-center uppercase">
          <div className="hidden sm:block flex-1 text-left opacity-60">FESTIVE EDIT | LIVE NOW</div>
          <div className="flex-1 text-center">FREE SHIPPING ON ORDERS OVER ₹5000</div>
          <div className="hidden sm:block flex-1 text-right opacity-60">SHIPPING WORLDWIDE</div>
        </Container>
      </div>

      {/* Main Navigation */}
      <div className="border-b border-brand/20 bg-white/95 backdrop-blur-md relative">
        <Container className="flex items-center justify-between py-4 h-24 lg:h-28">
          {/* Center: Desktop Nav Links (Shifted left in image) */}
          <div className="hidden lg:flex items-center gap-12 flex-1">
            <Link to="/" className="text-[10px] lg:text-[13px] font-semibold tracking-[0.15em] uppercase hover:text-accent transition-colors">
              Home
            </Link>

            <div className="group/shop h-full flex items-center">
              <Link to="/home/shop" className="text-[10px] lg:text-[13px] font-semibold tracking-[0.15em] uppercase hover:text-accent transition-colors flex items-center gap-1.5 py-8 cursor-pointer">
                Shop
                <svg className="w-2.5 h-2.5 group-hover/shop:rotate-180 transition-transform opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="m6 9 6 6 6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {/* Mega Menu Dropdown - Full Width */}
              <div className="absolute top-full left-0 right-0 w-full bg-white shadow-[0_40px_80px_rgba(0,0,0,0.08)] opacity-0 invisible group-hover/shop:opacity-100 group-hover/shop:visible transition-all duration-500 ease-out translate-y-4 group-hover/shop:translate-y-0 border-t border-muted/5 z-50">
                <Container className="py-20">
                  <div className="grid grid-cols-4 gap-12 lg:gap-20">
                    {megaMenuSections.map((section) => (
                      <div key={section.title} className="space-y-10">
                        <h4 className="text-[10px] lg:text-[13px] font-extrabold tracking-[0.3em] text-brand/30 uppercase border-b border-muted/10 pb-4">
                          {section.title}
                        </h4>
                        <ul className="space-y-5">
                          {section.items.map((item) => (
                            <li key={item._id || item.id}>
                              <Link
                                to={`/products?${section.key}=${item._id || item.id}`}
                                className="text-[13px] lg:text-[16px] text-brand/70 hover:text-accent hover:translate-x-1.5 transition-all block font-medium"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Container>
              </div>
            </div>

            <Link to="/about" className="text-[10px] lg:text-[13px] font-semibold tracking-[0.15em] uppercase hover:text-accent transition-colors">
              About us
            </Link>
            <Link to="/products?tag=new" className="text-[10px] lg:text-[13px] font-semibold tracking-[0.15em] uppercase hover:text-accent transition-colors">
              New In
            </Link>
          </div>

          {/* Left: Logo (Centered in image, but actually left-ish depending on view) */}
          {/* In the image, Logo is on the far left, then Nav links start */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0 order-first lg:mr-16">
            <Link to="/" className="block group/logo text-center lg:text-left">
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl lg:text-[28px] font-serif tracking-[0.1em] font-light text-brand leading-none uppercase">
                  Noor E Adah
                </span>
                <span className="text-[7px] lg:text-[8px] tracking-[0.3em] font-semibold text-brand/30 uppercase mt-2 transition-all group-hover:text-accent">
                  Official Boutique
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-6 justify-end flex-1">
            {/* Search Pill - Exactly like image */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center bg-muted/5 hover:bg-muted/10 border border-brand/30 rounded-full px-5 py-2 transition-all w-64 focus-within:w-80 group/search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products"
                className="bg-transparent border-none outline-none text-xs lg:text-[14px] w-full placeholder:text-muted-foreground/60"
              />
              <button type="submit" className="text-muted-foreground/40 group-focus-within/search:text-brand transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </form>

            <div className="flex items-center gap-6">
              <div
                className="relative"
                onMouseEnter={handleMouseEnterAuth}
                onMouseLeave={handleMouseLeaveAuth}
              >
                {authenticated ? (
                  <div className="flex items-center gap-2 group/auth relative">
                    <Link to="/account" className="flex items-center gap-2 hover:text-accent transition-colors py-2">
                      <span className="text-[10px] lg:text-[13px] font-bold tracking-[0.2em] text-brand/80 uppercase">
                        {profile.name}
                      </span>
                    </Link>
                    {showAuthDropdown && (
                      <div className="absolute top-full right-0 w-48 bg-white shadow-xl border border-muted/20 p-4 z-[100] animate-calm-entry">
                        <Link to="/account" className="block py-2 text-xs font-bold tracking-widest text-brand hover:text-accent uppercase">My Account</Link>
                        <button onClick={handleLogout} className="block w-full text-left py-2 text-xs font-bold tracking-widest text-brand hover:text-accent uppercase">Logout</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link to="/login" className="hidden sm:flex items-center gap-2 hover:text-accent transition-colors py-2" aria-label="Account">
                      <span className="text-[10px] lg:text-[13px] font-bold tracking-[0.2em] text-brand/80 uppercase">
                        Login / Register
                      </span>
                    </Link>
                    {showAuthDropdown && <AuthDropdown onClose={() => setShowAuthDropdown(false)} />}
                  </>
                )}
              </div>

              <Link to="/favourites" className="relative hover:text-accent transition-colors" aria-label="Wishlist">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {favouritesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-accent text-[8px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {favouritesCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: true })}
                className="relative hover:text-accent transition-colors group/cart"
                aria-label="Cart"
              >
                <svg className="w-5 h-5 group-hover/cart:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand text-brand-foreground text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Hamburger - Mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden hover:text-accent transition-colors"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileMenuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={cn(
        "fixed inset-0 top-[108px] bg-white z-40 lg:hidden transition-transform duration-500 ease-in-out",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="flex flex-col p-8 gap-6">
          <Link to="/" className="text-lg font-serif tracking-tight" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/home/shop" className="text-lg font-serif tracking-tight" onClick={() => setMobileMenuOpen(false)}>Shop</Link>
          <Link to="/about" className="text-lg font-serif tracking-tight" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>
          <hr className="border-brand/20" />
          <div className="flex flex-col gap-4">
            <Link to="/account" className="text-sm tracking-widest uppercase font-medium" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
            <Link to="/favourites" className="text-sm tracking-widest uppercase font-medium" onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
