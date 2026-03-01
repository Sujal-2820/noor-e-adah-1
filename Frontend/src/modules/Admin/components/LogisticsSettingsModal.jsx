import { useState, useEffect } from 'react'
import { Truck, Clock, AlertCircle } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from '../../../lib/cn'

const DELIVERY_OPTIONS = [
  { value: '3h', label: '3 Hours', hours: 3 },
  { value: '4h', label: '4 Hours', hours: 4 },
  { value: '1d', label: '1 Day', hours: 24 },
]

export function LogisticsSettingsModal({ isOpen, onClose, settings, onSave, loading }) {
  const [formData, setFormData] = useState({
    defaultDeliveryTime: '4h',
    availableDeliveryOptions: ['3h', '4h', '1d'],
    enableExpressDelivery: true,
    enableStandardDelivery: true,
    enableNextDayDelivery: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultDeliveryTime: settings.defaultDeliveryTime || '4h',
        availableDeliveryOptions: settings.availableDeliveryOptions || ['3h', '4h', '1d'],
        enableExpressDelivery: settings.enableExpressDelivery !== false,
        enableStandardDelivery: settings.enableStandardDelivery !== false,
        enableNextDayDelivery: settings.enableNextDayDelivery !== false,
      })
    }
  }, [settings])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleToggleOption = (optionValue) => {
    setFormData((prev) => {
      const options = [...prev.availableDeliveryOptions]
      const index = options.indexOf(optionValue)
      if (index > -1) {
        options.splice(index, 1)
      } else {
        options.push(optionValue)
      }
      return { ...prev, availableDeliveryOptions: options }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newErrors = {}
    
    if (!formData.availableDeliveryOptions || formData.availableDeliveryOptions.length === 0) {
      newErrors.availableDeliveryOptions = 'At least one delivery option must be enabled'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      onSave(formData)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Logistics & Delivery Settings" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Default Delivery Time */}
        <div>
          <label htmlFor="defaultDelivery" className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Clock className="h-4 w-4" />
            Default Delivery Time <span className="text-red-500">*</span>
          </label>
          <select
            id="defaultDelivery"
            value={formData.defaultDeliveryTime}
            onChange={(e) => handleChange('defaultDeliveryTime', e.target.value)}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
              errors.defaultDeliveryTime
                ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/50',
            )}
          >
            {DELIVERY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.defaultDeliveryTime && (
            <p className="mt-1 text-xs text-red-600">{errors.defaultDeliveryTime}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">This will be shown as the default option to users</p>
        </div>

        {/* Available Delivery Options */}
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            <Truck className="mr-1 inline h-4 w-4" />
            Available Delivery Options <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            {DELIVERY_OPTIONS.map((option) => {
              const isEnabled = formData.availableDeliveryOptions.includes(option.value)
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all',
                    isEnabled
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleOption(option.value)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/50"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-600">{option.hours} hours delivery time</p>
                    </div>
                  </div>
                  {formData.defaultDeliveryTime === option.value && (
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                      Default
                    </span>
                  )}
                </label>
              )
            })}
          </div>
          {errors.availableDeliveryOptions && (
            <p className="mt-1 text-xs text-red-600">{errors.availableDeliveryOptions}</p>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-900">
              <p className="font-bold">Delivery Settings Guidelines</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Users will see only enabled delivery options</li>
                <li>Default delivery time will be pre-selected for users</li>
                <li>Changes apply to all new orders immediately</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.availableDeliveryOptions.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            <Truck className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

