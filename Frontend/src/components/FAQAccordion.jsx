import { useState } from 'react'
import { cn } from '../lib/cn'

export function FAQAccordion({ items = [], defaultOpen = 0, className }) {
  const [openIndex, setOpenIndex] = useState(defaultOpen)

  const handleToggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section className={cn('space-y-3', className)}>
      {items.map(({ question, answer }, index) => {
        const isOpen = openIndex === index
        return (
            
          <article
            key={question}
            className={cn(
              'rounded-2xl border border-muted/60 bg-white/70 transition-shadow duration-200',
              isOpen ? 'shadow-card' : 'hover:shadow-card',
            )}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => handleToggle(index)}
              aria-expanded={isOpen}
            >
              <span className="text-base font-semibold text-surface-foreground">{question}</span>
              <span
                className={cn(
                  'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-soft text-brand transition-transform duration-200',
                  isOpen && 'rotate-45',
                )}
              >
                +
              </span>
            </button>
            <div
              className={cn(
                'grid overflow-hidden transition-all duration-300 ease-in-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</div>
            </div>
          </article>
        )
      })}
    </section>
  )
}

