import { cn } from '../../../lib/cn'

const timelineColors = [
  { border: 'border-blue-300', bg: 'bg-gradient-to-br from-blue-500 to-blue-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
  { border: 'border-purple-300', bg: 'bg-gradient-to-br from-purple-500 to-purple-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
  { border: 'border-green-300', bg: 'bg-gradient-to-br from-green-500 to-green-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
  { border: 'border-yellow-300', bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
  { border: 'border-red-300', bg: 'bg-gradient-to-br from-red-500 to-red-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
  { border: 'border-pink-300', bg: 'bg-gradient-to-br from-pink-500 to-pink-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
]

export function Timeline({ events = [], className }) {
  return (
    <div className={cn('rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)]', className)}>
      <ol className="relative space-y-6 before:absolute before:left-[1.1rem] before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-gray-200 before:to-gray-300 before:rounded-full">
        {events.map(({ id, title, timestamp, description, status }, index) => {
          const statusColors = {
            completed: { border: 'border-green-300', bg: 'bg-gradient-to-br from-green-500 to-green-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
            pending: { border: 'border-yellow-300', bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', text: 'text-white', shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]' },
            default: timelineColors[index % timelineColors.length],
          }
          const colors = statusColors[status] || statusColors.default
          return (
            <li
              key={id}
              className="relative pl-10 transition-all duration-200"
            >
              <span
                className={cn(
                  'absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300',
                  colors.border,
                  colors.bg,
                  colors.text,
                  colors.shadow,
                )}
              >
                {status === 'completed' ? '✓' : status === 'pending' ? '•' : '○'}
              </span>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{timestamp}</p>
              </div>
              <p className="mt-1 text-xs text-gray-600">{description}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

