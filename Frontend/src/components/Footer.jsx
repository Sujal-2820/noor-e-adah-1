import { Button } from './Button'

const defaultColumns = [
  {
    heading: 'Marketplace',
    links: [
      { label: 'Fresh Produce', href: '#produce' },
      { label: 'Bulk Orders', href: '#bulk' },
      { label: 'Logistics', href: '#logistics' },
    ],
  },
  {
    heading: 'For Farmers',
    links: [
      { label: 'Partner Program', href: '#partner' },
      { label: 'Training', href: '#training' },
      { label: 'Support', href: '#support' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '#about' },
      { label: 'Blog', href: '#blog' },
      { label: 'Careers', href: '#careers' },
    ],
  },
]

export function Footer({ brand = { name: 'Satpura Bio', description: 'Empowering farmers with bio-technological solutions.' }, columns = defaultColumns, cta }) {
  return (
    <footer className="mt-16 bg-surface/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:flex-row lg:gap-16">
        <div className="max-w-md space-y-4">
          <div className="inline-flex items-center gap-3">
            <span className="badge-brand text-base">{brand.name.slice(0, 2)}</span>
            <h3 className="text-2xl font-semibold text-surface-foreground">{brand.name}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{brand.description}</p>
          {cta ?? (
            <Button variant="outline" className="max-w-fit">
              Subscribe for updates
            </Button>
          )}
        </div>

        <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h4>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      {label}
                    </a>

                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-muted/60 bg-white/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#privacy" className="hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
              Terms of Service
            </a>
            <a href="#cookies" className="hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
              Cookie Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

