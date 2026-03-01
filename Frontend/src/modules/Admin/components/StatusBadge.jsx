import { cn } from '../../../lib/cn'

const tones = {
  success: 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-300 shadow-[0_2px_6px_rgba(0,0,0,0.08)]',
  warning: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-yellow-300 shadow-[0_2px_6px_rgba(0,0,0,0.08)]',
  neutral: 'bg-white text-gray-700 border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.4)]',
}

export function StatusBadge({ tone = 'neutral', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-200',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

