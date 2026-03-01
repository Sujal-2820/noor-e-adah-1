import { cn } from '../../../lib/cn'

export function MetricCard({ title, value, subtitle, trend, icon: Icon, tone = 'default', className, colorIndex = 0 }) {
  const colorPalette = [
    { 
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', 
      text: 'text-blue-700', 
      border: 'border-blue-200', 
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50', 
      text: 'text-purple-700', 
      border: 'border-purple-200', 
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-green-50 to-green-100/50', 
      text: 'text-green-700', 
      border: 'border-green-200', 
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50', 
      text: 'text-yellow-700', 
      border: 'border-yellow-200', 
      iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50', 
      text: 'text-red-700', 
      border: 'border-red-200', 
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-pink-50 to-pink-100/50', 
      text: 'text-pink-700', 
      border: 'border-pink-200', 
      iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50', 
      text: 'text-indigo-700', 
      border: 'border-indigo-200', 
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    { 
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50', 
      text: 'text-orange-700', 
      border: 'border-orange-200', 
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
  ]

  const colorMap = {
    default: colorPalette[colorIndex % colorPalette.length],
    success: { 
      bg: 'bg-gradient-to-br from-green-50 to-green-100/50', 
      text: 'text-green-700', 
      border: 'border-green-200', 
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
    warning: { 
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50', 
      text: 'text-yellow-700', 
      border: 'border-yellow-200', 
      iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', 
      iconText: 'text-white',
      shadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
      iconShadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
    },
  }

  const colors = colorMap[tone] || colorMap.default

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-3xl border bg-white p-6 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]',
        colors.border,
        colors.shadow,
        className,
      )}
    >
      <div
        className={cn(
          'absolute -right-8 -top-8 h-24 w-24 rounded-full transition-all duration-500 group-hover:opacity-15',
          colors.iconBg,
          'opacity-8',
        )}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-gray-600">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
              colors.iconBg,
              colors.iconText,
              colors.iconShadow,
            )}
          >
            <Icon className="h-8 w-8" />
          </span>
        ) : null}
      </div>
      {trend ? (
        <div className="relative mt-4 flex items-center gap-2 text-xs">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1.5 font-bold transition-all duration-200 shadow-[0_2px_6px_rgba(0,0,0,0.08)]',
              trend.direction === 'up' && 'bg-gradient-to-br from-green-500 to-green-600 text-white',
              trend.direction === 'down' && 'bg-gradient-to-br from-red-500 to-red-600 text-white',
            )}
          >
            {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
          </span>
          <span className="text-gray-600">{trend.message}</span>
        </div>
      ) : null}
    </article>
  )
}

