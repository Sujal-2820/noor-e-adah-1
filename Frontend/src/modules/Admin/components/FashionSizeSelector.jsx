import { useState } from 'react'
import { IndianRupee, Percent, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'

// Standard fashion sizes in industry order
export const FASHION_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'FREE SIZE']

/**
 * FashionSizeSelector
 *
 * Lets the admin:
 *  1. Toggle which sizes are available (click pills to enable)
 *  2. Add custom sizes (unlimited)
 *  3. Reorder sizes (affects how they appear to users)
 *  4. Enter actual stock + display stock per size
 *  5. Optionally enter a per-size price override
 *
 * Props:
 *  sizes                  — array of { label, actualStock, displayStock, isAvailable, price? }
 *  onChange               — called with updated sizes array
 *  onPriceOverrideActive  — (bool) called when per-size pricing state changes
 *  errors                 — { sizes?: string }
 *  disabled               — bool
 */
export function FashionSizeSelector({
    sizes = [],
    onChange,
    onPriceOverrideActive,
    errors = {},
    disabled = false,
}) {
    const [customLabel, setCustomLabel] = useState('')

    // Build a lookup map
    const sizeMap = {}
    sizes.forEach(s => { sizeMap[s.label] = s })

    const isEnabled = (label) => !!sizeMap[label]

    // Whether any size has a price set (non-empty, non-zero)
    const anyPriceSet = sizes.some(s => s.price && parseFloat(s.price) > 0)

    const notify = (nextSizes) => {
        const hasPrice = nextSizes.some(s => s.price && parseFloat(s.price) > 0)
        onPriceOverrideActive?.(hasPrice)
        onChange(nextSizes)
    }

    const toggleSize = (label) => {
        if (disabled) return
        if (isEnabled(label)) {
            notify(sizes.filter(s => s.label !== label))
        } else {
            notify([...sizes, { label, actualStock: 0, displayStock: 0, isAvailable: true, price: '', discountPublic: '' }])
        }
    }

    const addCustomSize = () => {
        const label = customLabel.trim().toUpperCase()
        if (!label || isEnabled(label)) return
        toggleSize(label)
        setCustomLabel('')
    }

    const updateField = (label, field, value) => {
        const isNumericStock = field === 'actualStock' || field === 'displayStock'
        const parsed = isNumericStock
            ? (value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0))
            : value  // price and discountPublic kept as string for input control

        notify(sizes.map(s => s.label === label ? { ...s, [field]: parsed } : s))
    }

    const moveSize = (index, direction) => {
        if (disabled) return
        const newSizes = [...sizes]
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= newSizes.length) return
        
        const temp = newSizes[index]
        newSizes[index] = newSizes[targetIndex]
        newSizes[targetIndex] = temp
        notify(newSizes)
    }

    // Combine standard sizes and any custom sizes currently in the list
    const allAvailableLabels = [...new Set([...FASHION_SIZES, ...sizes.map(s => s.label)])]

    return (
        <div className="space-y-6">
            {/* ── Size Toggle Pills ─────────────────────────────────────────────── */}
            <div className="space-y-3">
                <label className="flex items-center justify-between text-sm font-bold text-gray-900">
                    <span>Available Sizes <span className="text-red-500">*</span></span>
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest italic">Click pills to toggle</span>
                </label>
                
                <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    {allAvailableLabels.map(label => {
                        const active = isEnabled(label)
                        return (
                            <button
                                key={label}
                                type="button"
                                onClick={() => toggleSize(label)}
                                disabled={disabled}
                                className={cn(
                                    'min-w-[52px] rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all',
                                    active
                                        ? 'border-purple-600 bg-purple-600 text-white shadow-md'
                                        : 'border-gray-300 bg-white text-gray-500 hover:border-purple-400 hover:text-purple-600',
                                    disabled && 'cursor-not-allowed opacity-60'
                                )}
                            >
                                {label}
                            </button>
                        )
                    })}
                    
                    {/* Add Custom Size Inline */}
                    <div className="flex items-center gap-1 ml-2">
                        <input
                            type="text"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
                            placeholder="Add Custom..."
                            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            onClick={addCustomSize}
                            disabled={disabled || !customLabel.trim()}
                            className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                
                {errors.sizes && (
                    <p className="mt-1 text-xs text-red-600 font-bold">{errors.sizes}</p>
                )}
            </div>

            {/* ── Per-size cards ──────────────────────────────────────────────────── */}
            {sizes.length > 0 && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                                Variants Configuration
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Define stock, price and display order (uses this order on product page)</p>
                        </div>
                        {anyPriceSet && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700 uppercase tracking-wide border border-amber-200">
                                ⚡ Override Active
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {sizes.map((s, index) => (
                            <div key={s.label} className="group relative flex flex-col md:flex-row items-start md:items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-purple-300 hover:shadow-md">
                                
                                {/* Order Controls */}
                                <div className="flex flex-row md:flex-col gap-1 order-last md:order-first">
                                    <button
                                        type="button"
                                        onClick={() => moveSize(index, -1)}
                                        disabled={disabled || index === 0}
                                        className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-30 transition-colors"
                                        title="Move Up"
                                    >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveSize(index, 1)}
                                        disabled={disabled || index === sizes.length - 1}
                                        className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-30 transition-colors"
                                        title="Move Down"
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Size Label */}
                                <div className="flex items-center gap-3 min-w-[100px]">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-200">
                                        <span className="text-xs font-black">{s.label}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleSize(s.label)}
                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        title="Remove variant"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Fields Grid */}
                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                    {/* Price Override */}
                                    <div>
                                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <IndianRupee className="h-3 w-3" /> price
                                        </label>
                                        <input
                                            type="number"
                                            value={s.price ?? ''}
                                            onChange={e => updateField(s.label, 'price', e.target.value)}
                                            placeholder="Global"
                                            className={cn(
                                                "w-full rounded-lg border px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2",
                                                s.price && parseFloat(s.price) > 0 
                                                    ? "border-amber-300 bg-amber-50 focus:ring-amber-200" 
                                                    : "border-gray-200 focus:border-purple-500"
                                            )}
                                        />
                                    </div>

                                    {/* Discount */}
                                    <div>
                                        <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <Percent className="h-3 w-3" /> discount
                                        </label>
                                        <input
                                            type="number"
                                            value={s.discountPublic ?? ''}
                                            onChange={e => updateField(s.label, 'discountPublic', e.target.value)}
                                            placeholder="Global"
                                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* Actual Stock */}
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            Actual Stock
                                        </label>
                                        <input
                                            type="number"
                                            value={s.actualStock || ''}
                                            onChange={e => updateField(s.label, 'actualStock', e.target.value)}
                                            placeholder="0"
                                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* User Stock */}
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            Show to Users
                                        </label>
                                        <input
                                            type="number"
                                            value={s.displayStock || ''}
                                            onChange={e => updateField(s.label, 'displayStock', e.target.value)}
                                            placeholder="0"
                                            className={cn(
                                                "w-full rounded-lg border px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2",
                                                s.displayStock > s.actualStock ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 focus:border-purple-500"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
