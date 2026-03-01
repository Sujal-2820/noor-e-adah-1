import { useState, useEffect } from 'react'
import { X, Package, Plus, Trash2, IndianRupee } from 'lucide-react'
import { cn } from '../../../lib/cn'

const STOCK_UNITS = ['mg', 'g', 'kg', 'ml', 'L', 'bag', 'unit', 'packet', 'bottle']

/**
 * AttributeStockForm Component
 * 
 * A child form that opens dynamically to manage stock quantity for each attribute combination.
 * Allows adding multiple attribute combinations with their respective stock quantities.
 */
export function AttributeStockForm({
  isOpen,
  onClose,
  category,
  categoryAttributes,
  attributeStocks = [],
  onSave,
  stockUnit = 'kg'
}) {
  const [stocks, setStocks] = useState([])
  const [errors, setErrors] = useState({})
  const [customAttributes, setCustomAttributes] = useState({}) // Store custom attribute fields per stock entry

  // Initialize stocks from prop or empty array
  useEffect(() => {
    if (isOpen) {
      const initialStocks = attributeStocks.length > 0 ? attributeStocks.map((stock, idx) => ({
        ...stock,
        id: stock.id || Date.now() + idx // Ensure each has an ID
      })) : []
      setStocks(initialStocks)
      setErrors({})

      // Initialize custom attributes from existing stocks
      const initialCustomAttrs = {}
      initialStocks.forEach(stock => {
        if (stock.attributes && Object.keys(stock.attributes).length > 0) {
          // Convert attributes Map to object if needed
          const attrsObj = stock.attributes instanceof Map
            ? Object.fromEntries(stock.attributes)
            : stock.attributes

          initialCustomAttrs[stock.id] = Object.keys(attrsObj).map((key, idx) => ({
            key: `attr_${stock.id}_${idx}`, // Internal key
            label: key, // Use attribute key as label
            value: attrsObj[key]
          }))

          // Also set attributes in stock with label as key
          setStocks(prev => prev.map(s => {
            if (s.id === stock.id) {
              return { ...s, attributes: attrsObj }
            }
            return s
          }))
        } else {
          initialCustomAttrs[stock.id] = []
        }
      })
      setCustomAttributes(initialCustomAttrs)
    }
  }, [isOpen, attributeStocks])

  // Add new stock entry
  const handleAddStock = () => {
    const newStockId = Date.now()
    const newStock = {
      id: newStockId, // Temporary ID for React key
      attributes: {},
      actualStock: '',
      displayStock: '',
      stockUnit: stockUnit,
      userPrice: '',
      userPrice: '',
      discountUser: '', // Optional discount % for user price
      discountUser: '', // Optional discount % for user price
      batchNumber: '',
      expiry: '',
    }
    setStocks([...stocks, newStock])
    // Initialize custom attributes for this stock entry
    setCustomAttributes(prev => ({
      ...prev,
      [newStockId]: []
    }))
  }

  // Remove stock entry
  const handleRemoveStock = (id) => {
    setStocks(stocks.filter(stock => stock.id !== id))
    // Clear errors for removed stock
    const newErrors = { ...errors }
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`${id}_`)) {
        delete newErrors[key]
      }
    })
    setErrors(newErrors)
    // Remove custom attributes for this stock
    setCustomAttributes(prev => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  // Update attribute value for a stock entry
  const handleAttributeChange = (stockId, attributeKey, value) => {
    setStocks(stocks.map(stock => {
      if (stock.id === stockId) {
        const newAttributes = { ...stock.attributes }
        if (value === '' || value === null) {
          delete newAttributes[attributeKey]
        } else {
          newAttributes[attributeKey] = value
        }
        return {
          ...stock,
          attributes: newAttributes,
        }
      }
      return stock
    }))
    // Clear error when user starts typing
    const errorKey = `${stockId}_attribute_${attributeKey}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // Update custom attribute label
  const handleCustomAttributeLabelChange = (stockId, attrKey, newLabel) => {
    setCustomAttributes(prev => {
      const stockAttrs = prev[stockId] || []
      const updated = stockAttrs.map(attr => {
        if (attr.key === attrKey) {
          // If label changed, migrate the value to new label key
          const currentStock = stocks.find(s => s.id === stockId)
          if (currentStock) {
            const oldLabel = attr.label
            const oldValue = oldLabel ? currentStock.attributes[oldLabel] : currentStock.attributes[attrKey]

            if (oldValue && newLabel !== oldLabel) {
              // Update stock attributes: remove old key, add new label as key
              setStocks(stocks.map(stock => {
                if (stock.id === stockId) {
                  const newAttrs = { ...stock.attributes }
                  // Remove old keys
                  if (oldLabel) delete newAttrs[oldLabel]
                  if (attrKey !== newLabel) delete newAttrs[attrKey]
                  // Add with new label as key
                  newAttrs[newLabel] = oldValue
                  return { ...stock, attributes: newAttrs }
                }
                return stock
              }))
            } else if (newLabel && !oldLabel) {
              // First time setting label - migrate from internal key to label
              const value = currentStock.attributes[attrKey]
              if (value) {
                setStocks(stocks.map(stock => {
                  if (stock.id === stockId) {
                    const newAttrs = { ...stock.attributes }
                    delete newAttrs[attrKey]
                    newAttrs[newLabel] = value
                    return { ...stock, attributes: newAttrs }
                  }
                  return stock
                }))
              }
            }
          }
          return { ...attr, label: newLabel }
        }
        return attr
      })
      return { ...prev, [stockId]: updated }
    })
  }

  // Update stock quantity fields
  const handleStockChange = (stockId, field, value) => {
    setStocks(stocks.map(stock => {
      if (stock.id === stockId) {
        return {
          ...stock,
          [field]: value,
        }
      }
      return stock
    }))
    // Clear error when user starts typing
    const errorKey = `${stockId}_${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  // Validate form
  const validate = () => {
    const newErrors = {}

    stocks.forEach((stock, index) => {
      // Validate that at least one attribute is filled (either predefined or custom)
      const hasAttributes = Object.keys(stock.attributes || {}).some(key => {
        const value = stock.attributes[key]
        return value && value.toString().trim() !== ''
      })

      if (!hasAttributes) {
        newErrors[`${stock.id}_attributes`] = 'At least one attribute must be filled'
      }

      // Validate actual stock
      if (!stock.actualStock || parseFloat(stock.actualStock) < 0) {
        newErrors[`${stock.id}_actualStock`] = 'Actual quantity is required and cannot be negative'
      }

      // Validate display stock
      if (!stock.displayStock || parseFloat(stock.displayStock) < 0) {
        newErrors[`${stock.id}_displayStock`] = 'Display quantity is required and cannot be negative'
      }

      // Validate display stock doesn't exceed actual stock
      if (stock.actualStock && stock.displayStock &&
        parseFloat(stock.displayStock) > parseFloat(stock.actualStock)) {
        newErrors[`${stock.id}_displayStock`] = 'Display quantity cannot exceed actual quantity'
      }

      // Validate user price
      if (!stock.userPrice || parseFloat(stock.userPrice) <= 0) {
        newErrors[`${stock.id}_userPrice`] = 'User price must be greater than 0'
      }

      // Validate user price
      if (!stock.userPrice || parseFloat(stock.userPrice) <= 0) {
        newErrors[`${stock.id}_userPrice`] = 'User price must be greater than 0'
      }

      // Validate user price is greater than user price
      if (stock.userPrice && stock.userPrice &&
        parseFloat(stock.userPrice) <= parseFloat(stock.userPrice)) {
        newErrors[`${stock.id}_userPrice`] = 'User price must be greater than user price'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = () => {
    if (!validate()) {
      return
    }

    // Prepare data for saving (remove temporary IDs)
    const stocksToSave = stocks.map(stock => {
      const { id, ...stockData } = stock
      // Build attributes from custom attributes - use label as key, value as value
      const finalAttributes = {}
      const customAttrs = customAttributes[stock.id] || []

      customAttrs.forEach(customAttr => {
        // Use label as the key (attribute name), get value from stock.attributes
        if (customAttr.label && customAttr.label.trim() !== '') {
          const attrKey = customAttr.label.trim()
          // Try to get value using label first, then fallback to internal key
          const attrValue = stock.attributes[attrKey] || stock.attributes[customAttr.key]
          if (attrValue) {
            // Handle both array (legacy) and string values - convert array to first element
            let finalValue = ''
            if (Array.isArray(attrValue)) {
              finalValue = attrValue.length > 0 ? attrValue[0].toString().trim() : ''
            } else {
              finalValue = attrValue.toString().trim()
            }
            // Store as key-value pair: label (key) -> value (single string)
            if (finalValue !== '') {
              finalAttributes[attrKey] = finalValue
            }
          }
        }
      })

      // Also include any attributes that might have been set directly (for backward compatibility)
      Object.keys(stock.attributes || {}).forEach(key => {
        // Skip internal keys (starting with 'attr_')
        if (!key.startsWith('attr_') && stock.attributes[key]) {
          // Handle both array (legacy) and string values - convert array to first element
          let finalValue = ''
          if (Array.isArray(stock.attributes[key])) {
            finalValue = stock.attributes[key].length > 0 ? stock.attributes[key][0].toString().trim() : ''
          } else {
            finalValue = stock.attributes[key].toString().trim()
          }
          // Only add if not already in finalAttributes and value is not empty
          if (finalValue !== '' && !finalAttributes[key]) {
            finalAttributes[key] = finalValue
          }
        }
      })

      return {
        ...stockData,
        actualStock: parseFloat(stock.actualStock) || 0,
        displayStock: parseFloat(stock.displayStock) || 0,
        userPrice: parseFloat(stock.userPrice) || 0,
        userPrice: parseFloat(stock.userPrice) || 0,
        discountUser: parseFloat(stock.discountUser) || 0,
        discountUser: parseFloat(stock.discountUser) || 0,
        // Use final attributes with proper key-value pairs (label -> value)
        attributes: finalAttributes,
      }
    })

    onSave(stocksToSave)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="mt-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-purple-700">Manage Stock by Attributes</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add stock quantities for different attribute combinations
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {stocks.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-base font-semibold text-gray-600 mb-2">No stock entries yet</p>
            <p className="text-sm text-gray-500 mb-6">Click "Add Stock Entry" to get started</p>
            <button
              type="button"
              onClick={handleAddStock}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(168,85,247,0.4)]"
            >
              <Plus className="h-4 w-4" />
              Add Stock Entry
            </button>
          </div>
        ) : (
          <>
            {stocks.map((stock, index) => (
              <div
                key={stock.id}
                className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-purple-700">
                    Stock Entry #{index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveStock(stock.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-white text-red-600 transition-all hover:border-red-500 hover:bg-red-50"
                    title="Remove this stock entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Custom Attributes Section - Redesigned with 2-column layout */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-bold text-gray-900">
                      Custom Attributes
                      <span className="text-xs font-normal text-gray-500 ml-2">(Add any attribute field you need)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newAttrKey = `attr_${Date.now()}`
                        const currentAttrs = customAttributes[stock.id] || []
                        setCustomAttributes(prev => ({
                          ...prev,
                          [stock.id]: [...currentAttrs, { key: newAttrKey, label: '', value: '' }]
                        }))
                        // Initialize empty attribute in stock
                        handleAttributeChange(stock.id, newAttrKey, '')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 transition-all hover:border-purple-500 hover:from-purple-100 hover:to-purple-200 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Attribute
                    </button>
                  </div>

                  {/* Custom Attributes List - 2 Column Grid Layout */}
                  {(customAttributes[stock.id] || []).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {(customAttributes[stock.id] || []).map((customAttr, attrIndex) => (
                        <div
                          key={customAttr.key}
                          className="relative rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
                        >
                          {/* Attribute Index Badge */}
                          <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-lg">
                            {attrIndex + 1}
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (customAttributes[stock.id] || []).filter((_, idx) => idx !== attrIndex)
                              setCustomAttributes(prev => ({
                                ...prev,
                                [stock.id]: updated
                              }))
                              // Remove from stock attributes
                              const attrKeyToRemove = customAttr.label || customAttr.key
                              handleAttributeChange(stock.id, attrKeyToRemove, '')
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md z-10"
                            title="Remove this attribute"
                          >
                            <X className="h-3 w-3" />
                          </button>

                          <div className="space-y-3 pt-1">
                            {/* Attribute Name Field */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Attribute Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g., NPK Ratio, Type, Percentage"
                                value={customAttr.label}
                                onChange={(e) => {
                                  const newLabel = e.target.value
                                  handleCustomAttributeLabelChange(stock.id, customAttr.key, newLabel)
                                }}
                                className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-sm font-medium transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              />
                            </div>

                            {/* Attribute Value Field - Single Value Only */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Attribute Value <span className="text-red-500">*</span>
                              </label>

                              {/* Input for single value */}
                              <input
                                type="text"
                                value={(() => {
                                  const attrKey = customAttr.label || customAttr.key
                                  const currentValue = stock.attributes[attrKey]
                                  // Handle both array (legacy) and string values - convert array to first element or empty string
                                  if (Array.isArray(currentValue)) {
                                    return currentValue.length > 0 ? currentValue[0] : ''
                                  }
                                  return currentValue || ''
                                })()}
                                onChange={(e) => {
                                  const attrKey = customAttr.label || customAttr.key
                                  handleAttributeChange(stock.id, attrKey, e.target.value)
                                }}
                                placeholder={
                                  customAttr.label
                                    ? `Enter ${customAttr.label.toLowerCase()} value`
                                    : 'Enter attribute value'
                                }
                                disabled={!customAttr.label}
                                className={cn(
                                  "w-full rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2",
                                  !customAttr.label
                                    ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                                    : "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/30"
                                )}
                              />

                              {!customAttr.label && (
                                <p className="mt-1.5 text-xs text-gray-400 italic">Please enter attribute name first</p>
                              )}
                            </div>

                            {/* Preview of Key-Value Pair */}
                            {(() => {
                              const attrKey = customAttr.label || customAttr.key
                              const currentValue = stock.attributes[attrKey]
                              // Handle both array (legacy) and string values - convert array to first element
                              let displayValue = ''
                              if (Array.isArray(currentValue)) {
                                displayValue = currentValue.length > 0 ? currentValue[0] : ''
                              } else if (currentValue) {
                                displayValue = currentValue.toString()
                              }

                              return customAttr.label && displayValue ? (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Preview:</p>
                                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-200">
                                    <span className="text-xs font-bold text-blue-700">{customAttr.label}:</span>
                                    <span className="text-xs text-gray-800 font-medium bg-gray-50 px-2 py-0.5 rounded ml-2">
                                      {displayValue}
                                    </span>
                                  </div>
                                </div>
                              ) : null
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 mb-4">
                      <Package className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No attributes added yet</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Attribute" to get started</p>
                    </div>
                  )}

                  {/* Add Attribute Button at Bottom - Always Visible */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const newAttrKey = `attr_${Date.now()}`
                        const currentAttrs = customAttributes[stock.id] || []
                        setCustomAttributes(prev => ({
                          ...prev,
                          [stock.id]: [...currentAttrs, { key: newAttrKey, label: '', value: '' }]
                        }))
                        // Initialize empty attribute in stock
                        handleAttributeChange(stock.id, newAttrKey, '')
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-2 text-sm font-bold text-purple-700 transition-all hover:border-purple-500 hover:from-purple-100 hover:to-purple-200 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Attribute
                    </button>
                  </div>

                  {errors[`${stock.id}_attributes`] && (
                    <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-600 font-medium">{errors[`${stock.id}_attributes`]}</p>
                    </div>
                  )}
                </div>

                {/* Stock Quantities */}
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label htmlFor={`${stock.id}_actualStock`} className="mb-2 block text-sm font-bold text-gray-900">
                      Actual Quantity <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">(Internal/Admin use)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        id={`${stock.id}_actualStock`}
                        value={stock.actualStock}
                        onChange={(e) => handleStockChange(stock.id, 'actualStock', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className={cn(
                          'flex-1 rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          errors[`${stock.id}_actualStock`]
                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                        )}
                      />
                      <select
                        value={stock.stockUnit || stockUnit}
                        onChange={(e) => handleStockChange(stock.id, 'stockUnit', e.target.value)}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {STOCK_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors[`${stock.id}_actualStock`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_actualStock`]}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`${stock.id}_displayStock`} className="mb-2 block text-sm font-bold text-gray-900">
                      Display Quantity <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">(Visible to users)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        id={`${stock.id}_displayStock`}
                        value={stock.displayStock}
                        onChange={(e) => handleStockChange(stock.id, 'displayStock', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className={cn(
                          'flex-1 rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          errors[`${stock.id}_displayStock`]
                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                        )}
                      />
                      <select
                        value={stock.stockUnit || stockUnit}
                        disabled
                        className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
                      >
                        {STOCK_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors[`${stock.id}_displayStock`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_displayStock`]}</p>
                    )}
                    {stock.displayStock && stock.actualStock &&
                      parseFloat(stock.displayStock) > parseFloat(stock.actualStock) && (
                        <p className="mt-1 text-xs text-yellow-600">⚠️ Display quantity exceeds actual quantity</p>
                      )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4 mb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${stock.id}_userPrice`} className="mb-2 block text-sm font-bold text-gray-900">
                        <IndianRupee className="mr-1 inline h-4 w-4" />
                        User Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id={`${stock.id}_userPrice`}
                        value={stock.userPrice || ''}
                        onChange={(e) => handleStockChange(stock.id, 'userPrice', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          errors[`${stock.id}_userPrice`]
                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                        )}
                      />
                      {errors[`${stock.id}_userPrice`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_userPrice`]}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`${stock.id}_discountUser`} className="mb-2 block text-sm font-bold text-gray-900">
                        User Discount % <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id={`${stock.id}_discountUser`}
                          value={stock.discountUser || ''}
                          onChange={(e) => handleStockChange(stock.id, 'discountUser', e.target.value)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                      {stock.discountUser && stock.userPrice && (
                        <p className="mt-1 text-xs text-green-600">
                          Final: ₹{(parseFloat(stock.userPrice) * (1 - parseFloat(stock.discountUser) / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${stock.id}_userPrice`} className="mb-2 block text-sm font-bold text-gray-900">
                        <IndianRupee className="mr-1 inline h-4 w-4" />
                        User Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id={`${stock.id}_userPrice`}
                        value={stock.userPrice || ''}
                        onChange={(e) => handleStockChange(stock.id, 'userPrice', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          errors[`${stock.id}_userPrice`]
                            ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                            : 'border-gray-300 bg-white focus:border-purple-500 focus:ring-purple-500/50',
                        )}
                      />
                      {errors[`${stock.id}_userPrice`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stock.id}_userPrice`]}</p>
                      )}
                      {stock.userPrice && stock.userPrice &&
                        parseFloat(stock.userPrice) <= parseFloat(stock.userPrice) && (
                          <p className="mt-1 text-xs text-yellow-600">⚠️ User price must be greater than user price</p>
                        )}
                    </div>

                    <div>
                      <label htmlFor={`${stock.id}_discountUser`} className="mb-2 block text-sm font-bold text-gray-900">
                        User Discount % <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id={`${stock.id}_discountUser`}
                          value={stock.discountUser || ''}
                          onChange={(e) => handleStockChange(stock.id, 'discountUser', e.target.value)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-8 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                      {stock.discountUser && stock.userPrice && (
                        <p className="mt-1 text-xs text-green-600">
                          Final: ₹{(parseFloat(stock.userPrice) * (1 - parseFloat(stock.discountUser) / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${stock.id}_batchNumber`} className="mb-2 block text-sm font-bold text-gray-900">
                      Batch Number <span className="text-xs font-normal text-gray-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id={`${stock.id}_batchNumber`}
                      value={stock.batchNumber || ''}
                      onChange={(e) => handleStockChange(stock.id, 'batchNumber', e.target.value)}
                      placeholder="e.g., BATCH-2024-001"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${stock.id}_expiry`} className="mb-2 block text-sm font-bold text-gray-900">
                      Expiry Date <span className="text-xs font-normal text-gray-500">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      id={`${stock.id}_expiry`}
                      value={stock.expiry || ''}
                      onChange={(e) => handleStockChange(stock.id, 'expiry', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition-all focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add More Button */}
            <button
              type="button"
              onClick={handleAddStock}
              className="w-full rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-6 py-4 text-sm font-bold text-purple-700 transition-all hover:border-purple-500 hover:bg-purple-100"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Add Another Stock Entry
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-200 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(168,85,247,0.4)]"
        >
          Save Stock Entries
        </button>
      </div>
    </div>
  )
}

