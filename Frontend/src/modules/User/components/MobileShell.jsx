import { useEffect, useState } from 'react'
import { cn } from '../../../lib/cn'
import { CloseIcon, MenuIcon, SearchIcon, BellIcon, HeartIcon, CartIcon, UserIcon } from './icons'

import { MapPinIcon } from './icons'
import { Trans } from '../../../components/Trans'
import { useTranslation } from '../../../context/TranslationContext'
import { TransText } from '../../../components/TransText'

// Component for translated search input placeholder
function TranslatedSearchInput({ onSearchClick }) {
  const { translate, isEnglish, language } = useTranslation()
  const [currentPlaceholder, setCurrentPlaceholder] = useState('Search Products...')
  const [searchTerms, setSearchTerms] = useState(['Sarees', 'Anarkalis', 'Lehengas', 'Co-ord Sets'])
  const [termIndex, setTermIndex] = useState(0)

  useEffect(() => {
    // Animation loop for search terms
    const interval = setInterval(() => {
      setTermIndex((prev) => (prev + 1) % searchTerms.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [searchTerms.length])

  useEffect(() => {
    const term = searchTerms[termIndex]
    if (isEnglish) {
      setCurrentPlaceholder(`Search ${term}...`)
    } else {
      translate(`Search ${term}...`).then(translated => setCurrentPlaceholder(translated)).catch(() => setCurrentPlaceholder(`Search ${term}...`))
    }
  }, [termIndex, isEnglish, translate, searchTerms])

  // Translate terms on mount/language change
  useEffect(() => {
    if (!isEnglish) {
      Promise.all(['Sarees', 'Anarkalis', 'Lehengas', 'Co-ord Sets'].map(t => translate(t)))
        .then(translated => setSearchTerms(translated))
        .catch(() => setSearchTerms(['Sarees', 'Anarkalis', 'Lehengas', 'Co-ord Sets']))
    } else {
      setSearchTerms(['Sarees', 'Anarkalis', 'Lehengas', 'Co-ord Sets'])
    }
  }, [isEnglish, translate])

  return (
    <input
      type="text"
      className="home-search-bar__input animated-placeholder"
      placeholder={currentPlaceholder}
      onClick={onSearchClick}
      readOnly
    />
  )
}

// Component for translated email input placeholder
function TranslatedEmailInput() {
  const { translate, isEnglish, language } = useTranslation()
  const [placeholder, setPlaceholder] = useState('Write Email')

  useEffect(() => {
    if (isEnglish) {
      setPlaceholder('Write Email')
      return
    }

    translate('Write Email')
      .then((translated) => {
        setPlaceholder(translated)
      })
      .catch(() => {
        setPlaceholder('Write Email')
      })
  }, [isEnglish, translate, language])

  return (
    <input
      type="email"
      placeholder={placeholder}
      className="user-shell-footer__email-input"
    />
  )
}

export function MobileShell({ title, subtitle, children, navigation, menuContent, onSearchClick, onNotificationClick, notificationCount = 0, favouritesCount = 0, cartCount = 0, isNotificationAnimating = false, isHome = false, onNavigate, onLogout, onLogin, isAuthenticated = false }) {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [hideSecondRow, setHideSecondRow] = useState(false)
  const { language } = useTranslation() // Force re-render on language change

  useEffect(() => {
    let ticking = false
    let lastScrollY = window.scrollY
    let lastDecisiveScrollY = window.scrollY
    let scrollDirection = 0
    const scrollThreshold = 30
    const hideThreshold = 80
    const showThreshold = 30
    const stateChangeMinDistance = 40

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDelta = currentScrollY - lastScrollY
          const distanceFromLastChange = Math.abs(currentScrollY - lastDecisiveScrollY)

          if (Math.abs(scrollDelta) > scrollThreshold) {
            scrollDirection = scrollDelta > 0 ? 1 : -1
          }

          if (scrollDirection === 1) {
            if (currentScrollY > 30) {
              setCompact(true)
            }
            if (currentScrollY > hideThreshold && distanceFromLastChange > stateChangeMinDistance) {
              setHideSecondRow(true)
              lastDecisiveScrollY = currentScrollY
            }
          } else if (scrollDirection === -1) {
            if (currentScrollY < showThreshold || distanceFromLastChange > stateChangeMinDistance) {
              setCompact(false)
              setHideSecondRow(false)
              lastDecisiveScrollY = currentScrollY
            }
          }

          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="user-shell">
      <header className={cn(
        'user-shell-header',
        compact && 'is-compact',
        hideSecondRow && 'is-second-row-hidden'
      )}>
        <div className="user-shell-header__glow" />
        <div className="user-shell-header__first-row user-shell-header__controls relative z-10 flex items-center justify-between">
          <div className="user-shell-header__brand">
            <img src="/assets/NoorEAdahLogo.png" alt="Noor E Adah" className="h-11 w-auto object-contain rounded" />
          </div>

          {/* Search Bar - Between Logo and Navigation (Laptop Only) */}
          <div className="user-shell-header__search-bar">
            <div className="home-search-bar__input-wrapper">
              <SearchIcon className="home-search-bar__icon" />
              <TranslatedSearchInput onSearchClick={onSearchClick} />
            </div>
          </div>

          <div className="user-shell-header__actions-redesigned">
            {/* Laptop Navigation Items - Only Language Toggle and Icons here */}
            <nav className="user-shell-header__nav">
            </nav>

            <button
              type="button"
              onClick={onNotificationClick}
              className="user-icon-button-redesigned"
              aria-label="Notifications"
            >
              <BellIcon className="h-6 w-6" />
              {notificationCount > 0 && (
                <span className="user-badge-redesigned">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('favourites')}
              className="user-icon-button-redesigned"
              aria-label="Favourites"
            >
              <HeartIcon className="h-6 w-6" />
              {favouritesCount > 0 && (
                <span className="user-badge-redesigned">
                  {favouritesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('catalog-cart')}
              className="user-icon-button-redesigned"
              aria-label="Cart"
            >
              <CartIcon className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="user-badge-redesigned">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Title/Subtitle - Display Name & Location with Animation */}
        {(title || subtitle) && (
          <div className={cn(
            'user-shell-header__info relative z-10 flex flex-col gap-1 opacity-100 transition-all duration-300 pointer-events-auto pl-[4px]',
            compact && 'is-compact',
            hideSecondRow && 'is-hidden'
          )}>
            {title && (
              <span className="relative z-10 text-[0.95rem] font-bold text-white tracking-[0.01em]">
                <TransText>{title}</TransText>
              </span>
            )}
            {subtitle && (
              <p className="relative z-10 text-[0.72rem] font-medium text-white/90 tracking-[0.04em] uppercase">
                <MapPinIcon className="mr-2 inline h-3.5 w-3.5" />
                <TransText>{subtitle}</TransText>
              </p>
            )}
          </div>
        )}

        {/* Second Row - Title/Subtitle and Navigation Links (Laptop Only) */}
        <div className={cn('user-shell-header__second-row', hideSecondRow && 'user-shell-header__second-row--hidden')}>
          {title && (
            <div className="user-shell-header__info-wrapper">
              <span className="user-shell-header__title-text"><TransText>{title}</TransText></span>
              {subtitle && (
                <p className="user-shell-header__subtitle-text">
                  <MapPinIcon className="mr-2 inline h-3.5 w-3.5" />
                  <TransText>{subtitle}</TransText>
                </p>
              )}
            </div>
          )}
          <nav className="user-shell-header__links">
            <button
              type="button"
              onClick={() => onNavigate?.('home')}
              className="user-shell-header__link"
            >
              <Trans>SHOP</Trans>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('orders')}
              className="user-shell-header__link"
            >
              <Trans>ORDERS</Trans>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('profile')}
              className="user-shell-header__link"
            >
              <Trans>PROFILE</Trans>
            </button>

            {/* Laptop Auth Buttons - Placed in Second Row next to Profile */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onLogout}
                className="user-shell-header__auth-btn user-shell-header__auth-btn--signout"
                aria-label="Sign Out"
              >
                <UserIcon className="h-4 w-4" />
                <span><Trans>Sign Out</Trans></span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="user-shell-header__auth-btn user-shell-header__auth-btn--signin"
                aria-label="Sign In"
              >
                <UserIcon className="h-4 w-4" />
                <span><Trans>Sign In</Trans></span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile Search Bar - Separated from Header - Only shown on Home Screen */}
      {isHome && (
        <div className={cn('home-search-section', compact && 'is-compact')}>
          <div className="home-search-bar">
            <div className="home-search-input-wrapper">
              <input
                type="text"
                placeholder="Search Product..."
                className="home-search-input"
                onClick={onSearchClick}
                readOnly
              />
            </div>
            <button className="home-search-button" onClick={onSearchClick} aria-label="Search">
              <SearchIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      <main className={cn('user-shell-content', !isHome && 'user-shell-content--subpage', compact && 'is-compact')}>
        <div className="space-y-6">{children}</div>
      </main>

      <nav className="user-shell-bottom-nav">
        <div className="user-shell-bottom-nav__inner">{navigation}</div>
      </nav>

      {/* Footer - Laptop Only */}
      <footer className="user-shell-footer">
        <div className="user-shell-footer__top">
          <div className="user-shell-footer__content">
            {/* Brand Column */}
            <div className="user-shell-footer__column">
              <img src="/assets/NoorEAdahLogo.png" alt="Noor E Adah" className="h-10 w-auto object-contain mb-4" />
              <p className="user-shell-footer__slogan"><Trans>Premium Indian Ethnic Wear</Trans></p>
              <div className="user-shell-footer__about">
                <h4 className="user-shell-footer__heading"><Trans>Our Story</Trans></h4>
                <p className="user-shell-footer__text">
                  <Trans>Noor E Adah honours India's rich cultural heritage, breathing new life into traditional textiles and techniques with a contemporary twist.</Trans>
                </p>
              </div>
            </div>

            {/* Shop Column */}
            <div className="user-shell-footer__column">
              <h4 className="user-shell-footer__heading"><Trans>Shop</Trans></h4>
              <ul className="user-shell-footer__list">
                <li><a href="#" className="user-shell-footer__link"><Trans>New Arrivals</Trans></a></li>
                <li><a href="#" className="user-shell-footer__link"><Trans>Bestadmins</Trans></a></li>
                <li><a href="#" className="user-shell-footer__link"><Trans>Sarees</Trans></a></li>
                <li><a href="#" className="user-shell-footer__link"><Trans>Lehengas</Trans></a></li>
              </ul>
            </div>

            {/* Assistance Column */}
            <div className="user-shell-footer__column">
              <h4 className="user-shell-footer__heading"><Trans>Assistance</Trans></h4>
              <ul className="user-shell-footer__list">
                <li><a href="#" className="user-shell-footer__link"><Trans>Shipping Policy</Trans></a></li>
                <li><a href="#" className="user-shell-footer__link"><Trans>Returns & Exchange</Trans></a></li>
                <li><a href="#" className="user-shell-footer__link"><Trans>FAQs</Trans></a></li>
                <li><a href="#" className="user-shell-footer__link"><Trans>Privacy Policy</Trans></a></li>
              </ul>
            </div>

            {/* Contact Column */}
            <div className="user-shell-footer__column">
              <h4 className="user-shell-footer__heading"><Trans>Contact Us</Trans></h4>
              <div className="user-shell-footer__contact">
                <p className="user-shell-footer__text"><Trans>Email</Trans>: <a href="mailto:support@nooreadah.com" className="user-shell-footer__link">support@nooreadah.com</a></p>
                <p className="user-shell-footer__text"><Trans>Instagram</Trans>: @nooreadah</p>
              </div>
            </div>

            {/* Newsletter Column */}
            <div className="user-shell-footer__column">
              <h4 className="user-shell-footer__heading"><Trans>Newsletter</Trans></h4>
              <div className="user-shell-footer__newsletter">
                <TranslatedEmailInput />
                <button type="button" className="user-shell-footer__subscribe-btn">
                  →
                </button>
              </div>
              <div className="user-shell-footer__social mt-4">
                <a href="#" className="user-shell-footer__social-icon" aria-label="Facebook">F</a>
                <a href="#" className="user-shell-footer__social-icon" aria-label="Instagram">I</a>
              </div>
            </div>
          </div>
        </div>
        <div className="user-shell-footer__bottom">
          <div className="user-shell-footer__bottom-content">
            <p className="user-shell-footer__copyright">
              <Trans>© {new Date().getFullYear()} NOOR E ADAH. HANDCRAFTED IN INDIA.</Trans>
            </p>
          </div>
        </div>
      </footer>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          'fixed bottom-0 right-0 top-0 z-50 flex w-[78%] max-w-xs flex-col bg-white shadow-[-12px_0_36px_-26px_rgba(15,23,42,0.45)] transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-6">
          <p className="text-sm font-semibold text-surface-foreground"><Trans>Quick Actions</Trans></p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/40 text-muted-foreground"
            aria-label="Close menu"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-10">
          <div className="mb-4">
          </div>
          {typeof menuContent === 'function'
            ? menuContent({
              close: () => setOpen(false),
              onNavigate: () => setOpen(false),
            })
            : menuContent}
        </div>
      </aside>
    </div>
  )
}
