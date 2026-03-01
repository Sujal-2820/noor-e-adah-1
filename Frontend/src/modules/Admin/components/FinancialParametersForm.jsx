import { useState, useEffect } from 'react'
import { Settings, IndianRupee, AlertCircle } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function FinancialParametersForm({ parameters, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    minimumUserPurchase: 50000,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (parameters) {
      setFormData({
        minimumUserPurchase: parameters.minimumUserPurchase || 50000,
      })
    }
  }, [parameters])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}

    if (formData.minimumUserPurchase < 0) {
      newErrors.minimumUserPurchase = 'Minimum user purchase must be a positive value'
    }
    if (formData.minimumUserPurchase < 1000) {
      newErrors.minimumUserPurchase = 'Minimum user purchase should be at least ₹1,000'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      onSave(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Minimum User Purchase */}
      <div>
        <label htmlFor="minUserPurchase" className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
          <IndianRupee className="h-4 w-4" />
          Minimum User Purchase <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₹</span>
          <input
            type="number"
            id="minUserPurchase"
            min="1000"
            step="1000"
            value={formData.minimumUserPurchase}
            onChange={(e) => handleChange('minimumUserPurchase', parseFloat(e.target.value) || 0)}
            className={cn(
              'w-full rounded-xl border px-4 py-3 pl-8 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
              errors.minimumUserPurchase
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-pink-500 focus:ring-pink-500/50',
            )}
          />
        </div>
        {errors.minimumUserPurchase && (
          <p className="mt-1 text-xs text-red-600">{errors.minimumUserPurchase}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum purchase value required for user stock purchase requests</p>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-xs text-blue-900">
            <p className="font-bold">Parameter Guidelines</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>This minimum applies to all user stock purchase requests</li>
              <li>Users cannot request stock orders below this threshold</li>
              <li>Changes will apply immediately to new purchase requests</li>
              <li>Existing pending requests will not be affected</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(236,72,153,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
        >
          <Settings className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Parameters'}
        </button>
      </div>
    </form>
  )
}

