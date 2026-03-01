import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'

const filterColors = [
  { 
    active: 'border-blue-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]', 
    hover: 'hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600' 
  },
  { 
    active: 'border-purple-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]', 
    hover: 'hover:border-purple-400 hover:bg-purple-50 hover:text-purple-600' 
  },
  { 
    active: 'border-green-300 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]', 
    hover: 'hover:border-green-400 hover:bg-green-50 hover:text-green-600' 
  },
  { 
    active: 'border-yellow-300 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]', 
    hover: 'hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-600' 
  },
  { 
    active: 'border-red-300 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]', 
    hover: 'hover:border-red-400 hover:bg-red-50 hover:text-red-600' 
  },
  { 
    active: 'border-pink-300 bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-[0_2px_6px_rgba(0,0,0,0.1)]', 
    hover: 'hover:border-pink-400 hover:bg-pink-50 hover:text-pink-600' 
  },
]

export function FilterBar({ filters = [], onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)]">
      {filters.map((filter, index) => {
        const colors = filterColors[index % filterColors.length]
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange?.(filter)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              filter.active
                ? colors.active
                : `border-gray-200 bg-white/50 text-gray-700 ${colors.hover} shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]`,
            )}
          >
            <span>{filter.label}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

