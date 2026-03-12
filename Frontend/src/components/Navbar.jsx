import { useEffect, useState } from 'react'
import { Button } from './Button'
import { cn } from '../lib/cn'

const defaultLinks = [
  { label: 'Home', href: '/' },
  { label: 'Collections', href: '/products' },
  { label: 'Bridal', href: '/products?occasion=bridal' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const defaultCta = {
  desktop: (
    <Button size="sm">
      Sign In
    </Button>
  ),
  mobile: (
    <Button variant="outline" className="w-full">
      Sign In
    </Button>
  ),
}

export function Navbar({
  brand = { name: 'Noor E Adah', logo: '/assets/NoorEAdahLogo.png' },
  links = defaultLinks,
  cta = defaultCta,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 4)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const renderedCta = {
    desktop: cta.desktop ?? defaultCta.desktop,
    mobile: cta.mobile ?? defaultCta.mobile,
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-surface/70 backdrop-blur-md transition-shadow duration-300',
        isScrolled && 'shadow-card',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {brand.logo ? (
            <img src={brand.logo} alt={brand.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="badge-brand text-base">{brand.name.slice(0, 2)}</span>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold text-surface-foreground">{brand.name}</span>
            <span className="text-xs text-muted-foreground">Premium Indian Wear</span>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="transition-colors hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">{renderedCta.desktop}</div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-muted text-surface-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className="sr-only">Toggle menu</span>
          <span
            className={cn(
              'relative block h-4 w-5 before:absolute before:left-0 before:top-[-6px] before:block before:h-0.5 before:w-full before:bg-current before:transition after:absolute after:left-0 after:top-[6px] after:block after:h-0.5 after:w-full after:bg-current after:transition',
              isOpen && 'before:top-0 before:rotate-45 after:top-0 after:-rotate-45',
            )}
          >
            <span className="block h-0.5 w-full bg-current transition-opacity" aria-hidden />
          </span>
        </button>
      </div>

      <div
        className={cn(
          'lg:hidden',
          isOpen ? 'max-h-screen opacity-100' : 'pointer-events-none max-h-0 opacity-0',
          'overflow-hidden border-t border-muted/60 bg-surface transition-all duration-300',
        )}
      >
        <nav className="space-y-1 px-4 py-4 text-sm font-medium text-muted-foreground">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="block rounded-full px-4 py-2 transition-colors hover:bg-brand-soft/70 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {label}
            </a>
          ))}
          <div className="mt-4 border-t border-muted/60 pt-4">{renderedCta.mobile}</div>
        </nav>
      </div>
    </header>
  )
}

