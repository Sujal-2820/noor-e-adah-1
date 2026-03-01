import { IndianRupee, Percent } from 'lucide-react'
import { cn } from '../../../lib/cn'

// Standard fashion sizes in industry order
export const FASHION_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'FREE SIZE']

/**
 * FashionSizeSelector
 *
 * Lets the admin:
 *  1. Toggle which sizes are available (click pills to enable)
 *  2. Enter actual stock + display stock per size
 *  3. Optionally enter a per-size price override
 *     → When ANY size has a price set, `onPriceOverrideActive(true)` is called
 *       so the parent can collapse/disable its global pricing section
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

    const updateField = (label, field, value) => {
        const isNumericStock = field === 'actualStock' || field === 'displayStock'
        const parsed = isNumericStock
            ? (value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0))
            : value  // price and discountPublic kept as string for input control

        notify(sizes.map(s => s.label === label ? { ...s, [field]: parsed } : s))
    }

    return (
        <div className="space-y-4">
            {/* ── Size Toggle Pills ─────────────────────────────────────────────── */}
            <div>
                <label className="mb-2 block text-sm font-bold text-gray-900">
                    Available Sizes <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-gray-500">Click to enable/disable</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {FASHION_SIZES.map(label => {
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
                </div>
                {errors.sizes && (
                    <p className="mt-1 text-xs text-red-600">{errors.sizes}</p>
                )}
            </div>

            {/* ── Per-size cards ──────────────────────────────────────────────────── */}
            {sizes.length > 0 && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                            Stock & Price per Size
                        </p>
                        {anyPriceSet && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                                ⚡ Per-size pricing active — global price overridden
                            </span>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {sizes.map(({ label, actualStock, displayStock, price, discountPublic }) => (
                            <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-2.5">
                                {/* Size badge */}
                                <div className="inline-flex items-center rounded-md bg-purple-600 px-2.5 py-0.5">
                                    <span className="text-xs font-bold text-white">{label}</span>
                                </div>

                                {/* Price override */}
                                <div>
                                    <label className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                        <IndianRupee className="h-3 w-3" />
                                        Price Override
                                        <span className="font-normal text-gray-400">(optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={price ?? ''}
                                        onChange={e => updateField(label, 'price', e.target.value)}
                                        placeholder="Same as global"
                                        disabled={disabled}
                                        className={cn(
                                            'w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2',
                                            price && parseFloat(price) > 0
                                                ? 'border-amber-400 bg-amber-50 focus:ring-amber-400/40'
                                                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500/30',
                                            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                        )}
                                    />
                                    {price && parseFloat(price) > 0 && (
                                        <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
                                            ₹{parseFloat(price).toLocaleString('en-IN')} — overrides global
                                        </p>
                                    )}
                                </div>

                                {/* Discount % override */}
                                <div>
                                    <label className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                        <Percent className="h-3 w-3" />
                                        Discount %
                                        <span className="font-normal text-gray-400">(optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={discountPublic ?? ''}
                                        onChange={e => updateField(label, 'discountPublic', e.target.value)}
                                        placeholder="Same as global"
                                        disabled={disabled}
                                        className={cn(
                                            'w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2',
                                            discountPublic && parseFloat(discountPublic) > 0
                                                ? 'border-green-400 bg-green-50 focus:ring-green-400/40'
                                                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500/30',
                                            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                        )}
                                    />
                                    {discountPublic && parseFloat(discountPublic) > 0 && price && parseFloat(price) > 0 && (
                                        <p className="mt-0.5 text-[10px] font-semibold text-green-600">
                                            Final: ₹{(parseFloat(price) * (1 - parseFloat(discountPublic) / 100)).toFixed(2)}
                                        </p>
                                    )}
                                </div>

                                {/* Actual stock */}
                                <div>
                                    <label className="mb-0.5 block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                        Actual Stock
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={actualStock === 0 ? '' : actualStock}
                                        onChange={e => updateField(label, 'actualStock', e.target.value)}
                                        placeholder="0"
                                        disabled={disabled}
                                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                </div>

                                {/* Display stock */}
                                <div>
                                    <label className="mb-0.5 block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                        Show to Users
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={displayStock === 0 ? '' : displayStock}
                                        onChange={e => updateField(label, 'displayStock', e.target.value)}
                                        placeholder="0"
                                        disabled={disabled}
                                        className={cn(
                                            'w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2',
                                            displayStock > actualStock
                                                ? 'border-red-300 bg-red-50 focus:ring-red-500/30'
                                                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500/30',
                                            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                        )}
                                    />
                                    {displayStock > actualStock && (
                                        <p className="mt-0.5 text-[10px] text-red-500">Exceeds actual stock</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
