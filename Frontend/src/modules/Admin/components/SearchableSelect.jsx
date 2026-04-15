import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '../../../lib/cn'

/**
 * Premium Searchable Select Component
 * 
 * @param {Array} options - [{ value, label, subtitle? }]
 * @param {String} value - Currently selected value
 * @param {Function} onChange - Callback when selection changes
 * @param {String} placeholder - Placeholder text
 * @param {String} label - Optional label for the input
 * @param {String} className - Additional CSS classes
 * @param {Boolean} loading - Loading state
 */
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  className,
  loading = false,
  icon: Icon = Search,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selectedOption = options.find(opt => opt.value === value)
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subtitle && opt.subtitle.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option) => {
    onChange(option.value === value ? null : option.value)
    setIsOpen(false)
    setSearch('')
  }

  const clearSelection = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
        </label>
      )}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 transition-all duration-300',
          isOpen 
            ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md shadow-sm',
          !selectedOption && 'text-gray-400'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon className={cn('h-4 w-4 shrink-0', selectedOption ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500')} />
          <span className="truncate text-sm font-semibold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              onClick={clearSelection}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-300',
            isOpen && 'rotate-180'
          )} />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="h-10 w-full rounded-xl border border-gray-100 bg-gray-50/50 pl-10 pr-4 text-sm font-medium focus:border-blue-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : filteredOptions.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(option)
                      }}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200',
                        option.value === value
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      )}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate">{option.label}</span>
                        {option.subtitle && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5">
                            {option.subtitle}
                          </span>
                        )}
                      </div>
                      {option.value === value && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <p className="text-xs font-semibold uppercase tracking-widest">No results found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
