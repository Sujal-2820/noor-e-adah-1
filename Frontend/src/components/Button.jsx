import { forwardRef } from 'react'
import { cn } from '../lib/cn'

const variants = {
  primary:
    'bg-brand text-brand-foreground hover:bg-brand/90 focus-visible:outline-brand/80',
  outline:
    'border border-brand/40 text-brand hover:bg-brand-soft focus-visible:outline-brand/80',
  subtle:
    'bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:outline-accent/80',
  link: 'text-accent hover:text-accent-foreground underline-offset-4 hover:underline',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  icon: 'p-2',
}

export const Button = forwardRef(
  ({ as: asComponent = 'button', variant = 'primary', size = 'md', className, ...props }, ref) => {
    const Component = asComponent
    return (
      <Component
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

