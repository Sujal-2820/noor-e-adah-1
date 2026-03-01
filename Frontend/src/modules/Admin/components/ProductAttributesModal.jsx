import { useState } from 'react'
import { X, Package, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'

/**
 * Product Attributes Modal
 * Displays all attribute combinations for a product in a carousel/viewer format
 */
export function ProductAttributesModal({ isOpen, onClose, product }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!isOpen || !product) return null

  // Check if product has attributes
  const attributeStocks = product.attributeStocks || []
  const hasAttributes = Array.isArray(attributeStocks) && attributeStocks.length > 0

  // Format attribute key to readable label
  const formatAttributeLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  // Convert attributes Map to object if needed
  const getAttributesObject = (attributes) => {
    if (!attributes) return {}
    if (attributes instanceof Map) {
      const obj = {}
      attributes.forEach((value, key) => {
        obj[key] = value
      })
      return obj
    }
    if (typeof attributes === 'object') {
      return attributes
    }
    return {}
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attributeStocks.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < attributeStocks.length - 1 ? prev + 1 : 0))
  }

  const currentStock = attributeStocks[currentIndex]

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', isOpen ? 'block' : 'hidden')}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-white" />
            <div>
              <h3 className="text-lg font-bold text-white">Product Attributes</h3>
              <p className="text-xs text-purple-100">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition-all hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {!hasAttributes ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Package className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-semibold text-gray-600">No Attributes</p>
              <p className="text-sm text-gray-500 mt-1">This product does not have attribute-based variants.</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Navigation Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    Variant {currentIndex + 1} of {attributeStocks.length}
                  </span>
                  <div className="flex gap-1">
                    {attributeStocks.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                          'h-2 rounded-full transition-all',
                          index === currentIndex
                            ? 'w-8 bg-purple-600'
                            : 'w-2 bg-gray-300 hover:bg-gray-400'
                        )}
                        aria-label={`Go to variant ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                    disabled={attributeStocks.length <= 1}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                    disabled={attributeStocks.length <= 1}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Current Variant Details */}
              {currentStock && (
                <div className="space-y-6">
                  {/* Attributes */}
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-5">
                    <h4 className="text-sm font-bold text-blue-700 mb-4 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Attribute Combination
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(getAttributesObject(currentStock.attributes)).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-blue-200 bg-white p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            {formatAttributeLabel(key)}
                          </p>
                          <p className="text-sm font-bold text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stock & Pricing Info */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Actual Stock</p>
                      <p className="text-2xl font-bold text-green-700">
                        {currentStock.actualStock?.toLocaleString('en-IN') || 0}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{currentStock.stockUnit || 'kg'}</p>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Display Stock</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {currentStock.displayStock?.toLocaleString('en-IN') || 0}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{currentStock.stockUnit || 'kg'}</p>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">User Price</p>
                      <p className="text-2xl font-bold text-purple-700">
                        ₹{Math.round(currentStock.userPrice || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">per {currentStock.stockUnit || 'kg'}</p>
                    </div>

                    <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">User Price</p>
                      <p className="text-2xl font-bold text-orange-700">
                        ₹{Math.round(currentStock.userPrice || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">per {currentStock.stockUnit || 'kg'}</p>
                    </div>
                  </div>

                  {/* Batch & Expiry */}
                  {(currentStock.batchNumber || currentStock.expiry) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {currentStock.batchNumber && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Batch Number</p>
                          <p className="text-sm font-bold text-gray-900">{currentStock.batchNumber}</p>
                        </div>
                      )}
                      {currentStock.expiry && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Expiry Date</p>
                          <p className="text-sm font-bold text-gray-900">
                            {new Date(currentStock.expiry).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {hasAttributes
                ? `Viewing variant ${currentIndex + 1} of ${attributeStocks.length}`
                : 'This product uses standard pricing and stock management'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

