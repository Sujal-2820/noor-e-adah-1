import { useState, useEffect } from 'react'
import { Plus, Trash2, IndianRupee, Package } from 'lucide-react'
import { cn } from '../../../lib/cn'

// Agriculture product size units
const SIZE_UNITS = {
    volume: [
        { value: 'ml', label: 'ml' },
        { value: 'L', label: 'L (Litre)' },
    ],
    weight: [
        { value: 'g', label: 'g (gram)' },
        { value: 'kg', label: 'kg' },
    ],
    count: [
        { value: 'packet', label: 'Packet' },
        { value: 'bag', label: 'Bag' },
        { value: 'unit', label: 'Unit' },
        { value: 'bottle', label: 'Bottle' },
    ]
}

// Common size presets for quick selection
const SIZE_PRESETS = {
    ml: ['50', '100', '250', '500'],
    L: ['1', '2', '5', '10'],
    g: ['100', '250', '500'],
    kg: ['1', '5', '10', '25', '40', '50'],
    packet: ['1', '5', '10'],
    bag: ['1', '5', '10', '25'],
    unit: ['1', '5', '10'],
    bottle: ['1', '5', '10'],
}

/**
 * SizeVariantsForm Component
 * 
 * Simplified form for managing product size variants.
 * Each variant has: size value + unit + prices + stock
 * Example: 250 ml at ₹180, 500 ml at ₹320, 1 L at ₹580
 */
export function SizeVariantsForm({
    isOpen,
    onClose,
    variants = [],
    onSave,
    defaultUnit = 'kg'
}) {
    const [sizeVariants, setSizeVariants] = useState([])
    const [errors, setErrors] = useState({})
    const [selectedUnitType, setSelectedUnitType] = useState('weight') // 'volume', 'weight', or 'count'

    // Determine unit type from default unit
    useEffect(() => {
        if (SIZE_UNITS.volume.some(u => u.value === defaultUnit)) {
            setSelectedUnitType('volume')
        } else if (SIZE_UNITS.weight.some(u => u.value === defaultUnit)) {
            setSelectedUnitType('weight')
        } else {
            setSelectedUnitType('count')
        }
    }, [defaultUnit])

    // Initialize from props
    useEffect(() => {
        if (isOpen) {
            if (variants.length > 0) {
                setSizeVariants(variants.map((v, idx) => ({
                    ...v,
                    id: v.id || Date.now() + idx,
                    sizeValue: v.sizeValue || '',
                    sizeUnit: v.sizeUnit || v.stockUnit || defaultUnit,
                    actualStock: v.actualStock != null ? String(v.actualStock) : '',
                    displayStock: v.displayStock != null ? String(v.displayStock) : '',
                    userPrice: v.userPrice != null ? String(v.userPrice) : '',
                    discountUser: v.discountUser != null ? String(v.discountUser) : '',
                })))
            } else {
                setSizeVariants([])
            }
            setErrors({})
        }
    }, [isOpen, variants, defaultUnit])

    // Add new variant
    const handleAddVariant = () => {
        const newId = Date.now()
        const currentUnit = SIZE_UNITS[selectedUnitType][0]?.value || defaultUnit
        setSizeVariants([...sizeVariants, {
            id: newId,
            sizeValue: '',
            sizeUnit: currentUnit,
            actualStock: '',
            displayStock: '',
            userPrice: '',
            discountUser: '',
        }])
    }

    // Remove variant
    const handleRemoveVariant = (id) => {
        setSizeVariants(sizeVariants.filter(v => v.id !== id))
        // Clear errors for removed variant
        const newErrors = { ...errors }
        Object.keys(newErrors).forEach(key => {
            if (key.startsWith(`${id}_`)) {
                delete newErrors[key]
            }
        })
        setErrors(newErrors)
    }

    // Update variant field
    const handleVariantChange = (id, field, value) => {
        setSizeVariants(sizeVariants.map(v => {
            if (v.id === id) {
                return { ...v, [field]: value }
            }
            return v
        }))
        // Clear error
        const errorKey = `${id}_${field}`
        if (errors[errorKey]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[errorKey]
                return newErrors
            })
        }
    }

    // Quick add preset size
    const handleAddPreset = (sizeValue, unit) => {
        // Check if this size already exists
        const exists = sizeVariants.some(v => v.sizeValue === sizeValue && v.sizeUnit === unit)
        if (exists) return

        const newId = Date.now()
        setSizeVariants([...sizeVariants, {
            id: newId,
            sizeValue: sizeValue,
            sizeUnit: unit,
            actualStock: '',
            displayStock: '',
            userPrice: '',
            discountUser: '',
        }])
    }

    // Validate form
    const validate = () => {
        const newErrors = {}

        if (sizeVariants.length === 0) {
            newErrors.general = 'Add at least one size variant'
            setErrors(newErrors)
            return false
        }

        sizeVariants.forEach(variant => {
            if (!variant.sizeValue || parseFloat(variant.sizeValue) <= 0) {
                newErrors[`${variant.id}_sizeValue`] = 'Size value is required'
            }
            if (!variant.userPrice || parseFloat(variant.userPrice) <= 0) {
                newErrors[`${variant.id}_userPrice`] = 'User price is required'
            }
            if (!variant.userPrice || parseFloat(variant.userPrice) <= 0) {
                newErrors[`${variant.id}_userPrice`] = 'User price is required'
            }
            if (variant.userPrice && variant.userPrice &&
                parseFloat(variant.userPrice) <= parseFloat(variant.userPrice)) {
                newErrors[`${variant.id}_userPrice`] = 'User price must be greater than user price'
            }
            if (!variant.actualStock || parseFloat(variant.actualStock) < 0) {
                newErrors[`${variant.id}_actualStock`] = 'Actual stock is required'
            }
            if (!variant.displayStock || parseFloat(variant.displayStock) < 0) {
                newErrors[`${variant.id}_displayStock`] = 'Display stock is required'
            }
            if (variant.actualStock && variant.displayStock &&
                parseFloat(variant.displayStock) > parseFloat(variant.actualStock)) {
                newErrors[`${variant.id}_displayStock`] = 'Display stock cannot exceed actual stock'
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Save variants
    const handleSave = () => {
        if (!validate()) return

        // Transform to the format expected by ProductForm (compatible with attributeStocks)
        const variantsToSave = sizeVariants.map(v => ({
            // Store size as the attribute
            attributes: {
                size: `${v.sizeValue} ${v.sizeUnit}`
            },
            sizeValue: parseFloat(v.sizeValue),
            sizeUnit: v.sizeUnit,
            stockUnit: v.sizeUnit,
            actualStock: parseFloat(v.actualStock) || 0,
            displayStock: parseFloat(v.displayStock) || 0,
            userPrice: parseFloat(v.userPrice) || 0,
            discountUser: parseFloat(v.discountUser) || 0,
        }))

        onSave(variantsToSave)
        onClose()
    }

    if (!isOpen) return null

    // Get available units based on selected type
    const availableUnits = SIZE_UNITS[selectedUnitType] || SIZE_UNITS.weight
    const currentPresets = sizeVariants.length > 0
        ? SIZE_PRESETS[sizeVariants[0]?.sizeUnit] || []
        : SIZE_PRESETS[availableUnits[0]?.value] || []

    return (
        <div className="mt-4 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-green-700">Size Variants</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Add different sizes with their prices (e.g., 250 ml, 500 ml, 1 L)
                    </p>
                </div>
            </div>

            {/* Unit Type Selector */}
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Product Measurement Type</label>
                <div className="flex gap-2 flex-wrap">
                    {Object.keys(SIZE_UNITS).map(type => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => {
                                setSelectedUnitType(type)
                                // Reset variants when type changes if no variants exist
                                if (sizeVariants.length === 0 ||
                                    window.confirm('Changing measurement type will clear existing variants. Continue?')) {
                                    setSizeVariants([])
                                }
                            }}
                            className={cn(
                                'px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize',
                                selectedUnitType === type
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            {type === 'volume' ? '🧪 Volume (ml, L)' :
                                type === 'weight' ? '⚖️ Weight (g, kg)' :
                                    '📦 Count (Packet, Bag)'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Add Presets */}
            {sizeVariants.length < 10 && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Quick Add Common Sizes:</label>
                    <div className="flex gap-2 flex-wrap">
                        {availableUnits.map(unit => (
                            SIZE_PRESETS[unit.value]?.slice(0, 4).map(size => {
                                const exists = sizeVariants.some(v => v.sizeValue === size && v.sizeUnit === unit.value)
                                return (
                                    <button
                                        key={`${size}-${unit.value}`}
                                        type="button"
                                        onClick={() => handleAddPreset(size, unit.value)}
                                        disabled={exists}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                            exists
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                        )}
                                    >
                                        + {size} {unit.value}
                                    </button>
                                )
                            })
                        ))}
                    </div>
                </div>
            )}

            {/* Variants List */}
            <div className="space-y-4">
                {sizeVariants.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
                        <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 font-medium">No size variants added yet</p>
                        <p className="text-sm text-gray-500 mt-1">Click "Add Size Variant" or use quick add buttons above</p>
                    </div>
                ) : (
                    sizeVariants.map((variant, index) => (
                        <div
                            key={variant.id}
                            className="rounded-xl border border-green-200 bg-white p-4 shadow-sm"
                        >
                            {/* Variant Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                        {variant.sizeValue && variant.sizeUnit
                                            ? `${variant.sizeValue} ${variant.sizeUnit}`
                                            : 'New Variant'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(variant.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove variant"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Size Input */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Size Value <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.sizeValue}
                                        onChange={(e) => handleVariantChange(variant.id, 'sizeValue', e.target.value)}
                                        placeholder="e.g., 250"
                                        min="0"
                                        step="any"
                                        className={cn(
                                            'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                            errors[`${variant.id}_sizeValue`]
                                                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                                : 'border-gray-300 focus:border-green-500 focus:ring-green-500/50'
                                        )}
                                    />
                                    {errors[`${variant.id}_sizeValue`] && (
                                        <p className="mt-1 text-xs text-red-600">{errors[`${variant.id}_sizeValue`]}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Unit <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={variant.sizeUnit}
                                        onChange={(e) => handleVariantChange(variant.id, 'sizeUnit', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                    >
                                        {availableUnits.map(unit => (
                                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        <IndianRupee className="inline h-3 w-3 mr-1" />
                                        User Price <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.userPrice}
                                        onChange={(e) => handleVariantChange(variant.id, 'userPrice', e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className={cn(
                                            'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                            errors[`${variant.id}_userPrice`]
                                                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                                : 'border-gray-300 focus:border-green-500 focus:ring-green-500/50'
                                        )}
                                    />
                                    {errors[`${variant.id}_userPrice`] && (
                                        <p className="mt-1 text-xs text-red-600">{errors[`${variant.id}_userPrice`]}</p>
                                    )}
                                </div>

                            </div>

                            {/* Discount (Optional) */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        User Discount % <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={variant.discountUser}
                                            onChange={(e) => handleVariantChange(variant.id, 'discountUser', e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                                    </div>
                                    {variant.discountUser && variant.userPrice && (
                                        <p className="mt-1 text-xs text-green-600">
                                            Final: ₹{(parseFloat(variant.userPrice) * (1 - parseFloat(variant.discountUser) / 100)).toFixed(2)}
                                        </p>
                                    )}
                                </div>

                            </div>

                            {/* Stock */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Actual Stock <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.actualStock}
                                        onChange={(e) => handleVariantChange(variant.id, 'actualStock', e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="1"
                                        className={cn(
                                            'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                            errors[`${variant.id}_actualStock`]
                                                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                                : 'border-gray-300 focus:border-green-500 focus:ring-green-500/50'
                                        )}
                                    />
                                    {errors[`${variant.id}_actualStock`] && (
                                        <p className="mt-1 text-xs text-red-600">{errors[`${variant.id}_actualStock`]}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Display Stock <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.displayStock}
                                        onChange={(e) => handleVariantChange(variant.id, 'displayStock', e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="1"
                                        className={cn(
                                            'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                            errors[`${variant.id}_displayStock`]
                                                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                                                : 'border-gray-300 focus:border-green-500 focus:ring-green-500/50'
                                        )}
                                    />
                                    {errors[`${variant.id}_displayStock`] && (
                                        <p className="mt-1 text-xs text-red-600">{errors[`${variant.id}_displayStock`]}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* General Error */}
                {errors.general && (
                    <p className="text-sm text-red-600 text-center">{errors.general}</p>
                )}

                {/* Add Button */}
                <button
                    type="button"
                    onClick={handleAddVariant}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-green-300 bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 hover:border-green-400 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Size Variant
                </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-green-200 mt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm shadow-md hover:bg-green-700 transition-all"
                >
                    Save Size Variants
                </button>
            </div>
        </div>
    )
}
