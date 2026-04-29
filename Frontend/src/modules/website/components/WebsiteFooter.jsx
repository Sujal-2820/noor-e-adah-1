import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import logo from '../../../assets/NoorEAdahLogo.png'
import { Container } from './Layout'
import * as websiteApi from '../services/websiteApi'
export function WebsiteFooter() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await websiteApi.getCategories()
        if (res.success && res.data?.categories) {
          const cats = res.data.categories.filter(c => c.type === 'category' || !c.type).slice(0, 4)
          setCategories(cats)
        }
      } catch (err) {
        console.error('Failed to load categories for footer:', err)
      }
    }
    loadCategories()
  }, [])

  return (
    <footer className="bg-white border-t border-muted/20 pt-20 pb-10">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16 mb-24 animate-calm-entry items-start">
          {/* Column 1: Follow Us & Newsletter (Image 4 Style) */}
          <div className="flex flex-col gap-10">
            <h3 className="text-[11px] lg:text-[15px] font-bold tracking-[0.25em] uppercase text-brand">Follow Us</h3>
            <div className="flex gap-6 text-brand/60">
              <a href="#" className="hover:text-accent transition-colors" aria-label="Facebook">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/noor.e.adah?igsh=MWdvMzE1c3F2MjEyaw==" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" className="hover:text-accent transition-colors" aria-label="Youtube">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.4 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z" />
                  <path d="m9.75 15.02 5.75-3.02-5.75-3.02v6.04z" />
                </svg>
              </a>
            </div>

            <form className="flex flex-col gap-4 mt-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-transparent py-4 border-b border-muted text-[11px] lg:text-[14px] outline-none uppercase tracking-[0.2em] placeholder:text-muted-foreground/40 focus:border-brand transition-colors"
              />
              <button
                type="submit"
                className="w-40 py-4 bg-[#F5F5F5] hover:bg-brand hover:text-white text-[10px] lg:text-[13px] font-bold tracking-[0.2em] uppercase transition-all duration-300"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Column 2: Shop By Category */}
          <div className="flex flex-col gap-8">
            <h3 className="text-[11px] lg:text-[15px] font-bold tracking-[0.25em] uppercase text-brand">Shop By Category</h3>
            <ul className="flex flex-col gap-4">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat._id || cat.id}>
                    <Link to={`/products?category=${cat._id || cat.id}`} className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/products" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Kurta Sets</Link></li>
                  <li><Link to="/products" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Farshi Sets</Link></li>
                  <li><Link to="/products" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Festive Wear</Link></li>
                  <li><Link to="/products" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Co ords</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: Assistance */}
          <div className="flex flex-col gap-8">
            <h3 className="text-[11px] lg:text-[15px] font-bold tracking-[0.25em] uppercase text-brand">Assistance</h3>
            <ul className="flex flex-col gap-4">
              <li><Link to="/privacy" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Terms and Conditions</Link></li>
              <li><Link to="/shipping" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Shipping Policy</Link></li>
              <li><Link to="/returns" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Cancellation and Refund</Link></li>
              <li><Link to="/faq" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">FAQs</Link></li>
              <li><Link to="/contact" className="text-xs lg:text-[14px] text-brand/50 hover:text-accent transition-colors font-light">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 4: Brand Story (Right aligned in image 4) */}
          <div className="flex flex-col gap-8 lg:text-right lg:items-end">
            <h3 className="text-[11px] lg:text-[15px] font-bold tracking-[0.25em] uppercase text-brand">About Noor E Adah</h3>
            <p className="text-[11px] lg:text-[15px] text-brand/60 leading-[2] font-light italic">
              Noor E Adah is a celebration of grace, elegance, and individuality. Each piece is thoughtfully designed to bring out your inner radiance—where every detail speaks of timeless style and effortless charm.
            </p>
            <div className="flex flex-col items-center lg:items-end mt-4">
              <img src={logo} alt="Noor E Adah" className="h-10 w-auto object-contain mb-2" />
              <span className="text-[8px] tracking-[0.4em] font-light text-brand/40 uppercase mt-1 transition-all group-hover:tracking-[0.5em] group-hover:text-accent">
                OFFICIAL PORTAL
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Image 4 Style */}
        <div className="flex flex-col lg:flex-row justify-between items-center pt-8 border-t border-muted/5 gap-8">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-12 text-[10px] lg:text-[13px] tracking-[0.2em] text-brand/40 uppercase font-medium text-center">
            <span>Copyright © {new Date().getFullYear()} Noor E Adah. All rights reserved.</span>
          </div>

          {/* Payment Methods - Simplified Icons as in Image 4 */}
          <div className="flex items-center gap-5 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500">
            <div className="w-8 h-5 bg-muted/40 rounded-sm" />
            <div className="w-8 h-5 bg-muted/40 rounded-sm" />
            <div className="w-8 h-5 bg-muted/40 rounded-sm" />
            <div className="w-8 h-5 bg-muted/40 rounded-sm" />
            <div className="w-8 h-5 bg-muted/40 rounded-sm" />
          </div>
        </div>
      </Container>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 z-[60] flex flex-col gap-4">
        {/* Scroll To Top */}

        {/* Scroll To Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-white text-brand rounded-full flex items-center justify-center shadow-lg hover:bg-brand hover:text-white transition-all duration-300 border border-muted/20"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="m18 15-6-6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </footer>
  )
}








