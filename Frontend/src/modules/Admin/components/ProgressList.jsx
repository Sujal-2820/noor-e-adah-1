import { cn } from '../../../lib/cn'

const progressColors = [
  { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-700', border: 'border-blue-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
  { bg: 'bg-gradient-to-r from-purple-500 to-purple-600', text: 'text-purple-700', border: 'border-purple-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
  { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-green-700', border: 'border-green-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
  { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-yellow-700', border: 'border-yellow-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
  { bg: 'bg-gradient-to-r from-red-500 to-red-600', text: 'text-red-700', border: 'border-red-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
  { bg: 'bg-gradient-to-r from-pink-500 to-pink-600', text: 'text-pink-700', border: 'border-pink-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
]

export function ProgressList({ items = [], className }) {
  return (
    <ul className={cn('space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)]', className)}>
      {items.map(({ label, progress, tone = 'default', meta }, index) => {
        const colorMap = {
          success: { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-green-700', border: 'border-green-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
          warning: { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-yellow-700', border: 'border-yellow-200', shadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]' },
          default: progressColors[index % progressColors.length],
        }
        const colors = colorMap[tone] || colorMap.default
        return (
          <li
            key={label}
            className={cn(
              'space-y-2 rounded-2xl border bg-white p-4 transition-all duration-200 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
              colors.border,
            )}
          >
            <div className="flex items-center justify-between text-sm font-bold text-gray-900">
              <span>{label}</span>
              <span className={colors.text}>{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  colors.bg,
                  colors.shadow,
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            {meta ? <p className="text-xs text-gray-600">{meta}</p> : null}
          </li>
        )
      })}
    </ul>
  )
}

