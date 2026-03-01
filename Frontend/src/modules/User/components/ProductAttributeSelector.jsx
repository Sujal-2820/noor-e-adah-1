import { useState, useMemo, useEffect } from 'react'
import { PackageIcon, CheckCircleIcon } from './icons'
import { cn } from '../../../lib/cn'

/**
 * Product Attribute Selector Component
 * Used in user operations (stock ordering, order escalation) when products have attributes
 */
export function ProductAttributeSelector({ 
  product, 
  selectedAttributes: initialSelectedAttributes = {}, 
  onAttributesChange,
  disabled = false 
}) {
  const [selectedAttributes, setSelectedAttributes] = useState(initialSelectedAttributes)

  // Extract unique attribute keys and values from attributeStocks
  const attributeOptions = useMemo(() => {
    if (!product?.attributeStocks || !Array.isArray(product.attributeStocks) || product.attributeStocks.length === 0) {
      return {}
    }

    const options = {}
    product.attributeStocks.forEach(stock => {
      if (stock.attributes && typeof stock.attributes === 'object') {
        Object.keys(stock.attributes).forEach(key => {
          if (!options[key]) {
            options[key] = new Set()
          }
          const value = stock.attributes[key]
          if (value) {
            options[key].add(value)
          }
        })
      }
    })

    // Convert Sets to Arrays
    const formatted = {}
    Object.keys(options).forEach(key => {
      formatted[key] = Array.from(options[key]).sort()
    })
    return formatted
  }, [product])

  // Check if product has attributes
  const hasAttributes = Object.keys(attributeOptions).length > 0

  // Find matching attributeStock entry based on selected attributes
  const matchingAttributeStock = useMemo(() => {
    if (!hasAttributes || Object.keys(selectedAttributes).length === 0) {
      return null
    }

    return product.attributeStocks.find(stock => {
      if (!stock.attributes || typeof stock.attributes !== 'object') return false
      return Object.keys(selectedAttributes).every(key => {
        return stock.attributes[key] === selectedAttributes[key]
      })
    }) || null
  }, [product, selectedAttributes, hasAttributes])

  // Update parent when attributes change
  useEffect(() => {
    if (onAttributesChange) {
      onAttributesChange(selectedAttributes, matchingAttributeStock)
    }
  }, [selectedAttributes, matchingAttributeStock, onAttributesChange])

  // Sync with initial selected attributes
  useEffect(() => {
    if (initialSelectedAttributes && Object.keys(initialSelectedAttributes).length > 0) {
      setSelectedAttributes(initialSelectedAttributes)
    }
  }, [initialSelectedAttributes])

  // Format attribute key to readable label
  const formatAttributeLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  if (!hasAttributes) {
    return null
  }

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
      <div className="flex items-center gap-2">
        <PackageIcon className="h-4 w-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-900">Select Variant</h4>
      </div>
      
      <div className="space-y-3">
        {Object.keys(attributeOptions).map((attrKey) => (
          <div key={attrKey}>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {formatAttributeLabel(attrKey)}
            </label>
            <div className="flex flex-wrap gap-2">
              {attributeOptions[attrKey].map((value) => {
                const isSelected = selectedAttributes[attrKey] === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (!disabled) {
                        setSelectedAttributes(prev => ({
                          ...prev,
                          [attrKey]: value,
                        }))
                      }
                    }}
                    disabled={disabled}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-2',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isSelected && <CheckCircleIcon className="inline h-3 w-3 mr-1" />}
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Show selected variant details */}
      {matchingAttributeStock && (
        <div className="mt-3 p-3 rounded-lg bg-white border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-900">Selected Variant</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Stock:</span>
              <span className="ml-1 font-semibold text-gray-900">
                {matchingAttributeStock.displayStock || 0} {matchingAttributeStock.stockUnit || 'kg'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Price:</span>
              <span className="ml-1 font-semibold text-blue-600">
                ₹{matchingAttributeStock.userPrice?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

