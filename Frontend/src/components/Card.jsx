import { cn } from '../lib/cn'

export function Card({ className, children }) {
  return <div className={cn('card-surface', className)}>{children}</div>
}

export function CardHeader({ className, eyebrow, title, description, action, align = 'start' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        align === 'center' && 'text-center sm:text-left',
        className,
      )}
    >
      <div className="space-y-1">
        {eyebrow ? <span className="badge-brand">{eyebrow}</span> : null}
        {title ? <h3 className="text-xl font-semibold text-surface-foreground">{title}</h3> : null}
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ?? null}
    </div>
  )
}

export function CardContent({ className, children }) {
  return <div className={cn('mt-4 space-y-3 text-sm text-muted-foreground', className)}>{children}</div>
}

export function CardFooter({ className, children }) {
    
  return (
    <div
      className={cn(
        'mt-4 flex flex-col gap-3 border-t border-muted/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}

