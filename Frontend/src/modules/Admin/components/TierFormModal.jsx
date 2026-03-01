/**
 * Tier Form Modal Component
 * 
 * Modal for creating and editing discount/interest tiers
 * Used by RepaymentConfig page
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from './ToastNotification'

export function TierFormModal({ type, tier, existingTiers, onClose, onSuccess }) {
    const isDiscount = type === 'discounts'
    const isEdit = !!tier

    const [formData, setFormData] = useState({
        tierName: '',
        periodStart: '',
        periodEnd: '',
        rate: '',
        description: '',
        isOpenEnded: false,
    })

    const [errors, setErrors] = useState({})
    const [warnings, setWarnings] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const api = useAdminApi()
    const toast = useToast()

    // Initialize form with tier data if editing
    useEffect(() => {
        if (tier) {
            setFormData({
                tierName: tier.tierName || '',
                periodStart: tier.periodStart?.toString() || '',
                periodEnd: tier.periodEnd?.toString() || '',
                rate: (isDiscount ? tier.discountRate : tier.interestRate)?.toString() || '',
                description: tier.description || '',
                isOpenEnded: tier.isOpenEnded || false,
            })
        }
    }, [tier, isDiscount])

    const validate = () => {
        const newErrors = {}
        const start = parseInt(formData.periodStart)
        const end = formData.isOpenEnded ? 999999 : parseInt(formData.periodEnd)

        if (!formData.tierName.trim()) {
            newErrors.tierName = 'Tier name is required'
        }

        if (formData.periodStart === '') {
            newErrors.periodStart = 'Period start is required'
        } else if (start < 0) {
            newErrors.periodStart = 'Must be >= 0'
        }

        if (!formData.isOpenEnded) {
            if (formData.periodEnd === '') {
                newErrors.periodEnd = 'Period end is required'
            } else if (end <= start) {
                newErrors.periodEnd = 'Must be greater than period start'
            }
        }

        // Proactive overlap check
        if (existingTiers && existingTiers.length > 0 && !newErrors.periodStart) {
            const currentId = tier?._id
            const overlapping = existingTiers.find(t => {
                if (t._id === currentId) return false
                if (!t.isActive) return false

                const tStart = t.periodStart
                const tEnd = t.isOpenEnded ? 999999 : t.periodEnd

                // standard overlap check: (StartA <= EndB) and (EndA >= StartB)
                return start <= tEnd && end >= tStart
            })

            if (overlapping) {
                const oEnd = overlapping.isOpenEnded ? '∞' : overlapping.periodEnd
                newErrors.periodStart = `Overlaps with ${overlapping.tierName} (${overlapping.periodStart}-${oEnd}). Suggest starting at ${overlapping.periodEnd + 1}.`
            }
        }

        if (formData.rate === '') {
            newErrors.rate = 'Rate is required'
        } else {
            const rateNum = parseFloat(formData.rate)
            if (rateNum < 0 || rateNum > 100) {
                newErrors.rate = 'Must be between 0 and 100'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validate()) {
            toast.error('Please fix the errors before submitting')
            return
        }

        setIsSubmitting(true)
        setWarnings([])

        try {
            const payload = {
                tierName: formData.tierName.trim(),
                periodStart: parseInt(formData.periodStart),
                periodEnd: formData.isOpenEnded ? 999999 : parseInt(formData.periodEnd),
                ...(isDiscount
                    ? { discountRate: parseFloat(formData.rate) }
                    : {
                        interestRate: parseFloat(formData.rate),
                        isOpenEnded: formData.isOpenEnded
                    }
                ),
                description: formData.description.trim(),
            }

            let response
            if (isEdit) {
                response = await api.put(
                    `/repayment-config/${type}/${tier._id}`,
                    payload
                )
            } else {
                response = await api.post(
                    `/repayment-config/${type}`,
                    payload
                )
            }

            // Check for warnings in response
            if (response.warnings && response.warnings.length > 0) {
                setWarnings(response.warnings)
            } else {
                toast.success(`${isDiscount ? 'Discount' : 'Interest'} tier ${isEdit ? 'updated' : 'created'} successfully`)
                onSuccess()
            }
        } catch (error) {
            // Handle validation errors from backend
            if (error.response?.data?.errors) {
                toast.error(error.response.data.errors.join(', '))
            } else {
                toast.error(error.response?.data?.message || 'Failed to save tier')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }))
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isDiscount ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {isEdit ? 'Edit' : 'Create'} {isDiscount ? 'Discount' : 'Interest'} Tier
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {isDiscount
                                ? 'Reward early payments with discounts'
                                : 'Apply interest charges for late payments'
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Warning Messages */}
                {warnings.length > 0 && (
                    <div className="mx-6 mt-4 space-y-2">
                        {warnings.map((warning, idx) => (
                            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800">{warning}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Tier Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tier Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.tierName}
                            onChange={(e) => handleChange('tierName', e.target.value)}
                            placeholder="e.g., 0-30 Days Super Early Bird"
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.tierName
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-blue-500'
                                }`}
                            disabled={isSubmitting}
                        />
                        {errors.tierName && (
                            <p className="mt-1 text-sm text-red-600">{errors.tierName}</p>
                        )}
                    </div>

                    {/* Period Start & End */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period Start (Days) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.periodStart}
                                onChange={(e) => handleChange('periodStart', e.target.value)}
                                placeholder="0"
                                min="0"
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.periodStart
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                disabled={isSubmitting}
                            />
                            {errors.periodStart && (
                                <p className="mt-1 text-sm text-red-600">{errors.periodStart}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period End (Days) {!formData.isOpenEnded && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="number"
                                value={formData.periodEnd}
                                onChange={(e) => handleChange('periodEnd', e.target.value)}
                                placeholder="30"
                                min={parseInt(formData.periodStart) + 1 || 1}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.periodEnd
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                disabled={isSubmitting || formData.isOpenEnded}
                            />
                            {errors.periodEnd && (
                                <p className="mt-1 text-sm text-red-600">{errors.periodEnd}</p>
                            )}
                        </div>
                    </div>

                    {/* Open-Ended Option (Interest Only) */}
                    {!isDiscount && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isOpenEnded"
                                checked={formData.isOpenEnded}
                                onChange={(e) => handleChange('isOpenEnded', e.target.checked)}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                disabled={isSubmitting}
                            />
                            <label htmlFor="isOpenEnded" className="text-sm text-gray-700">
                                Open-ended period (e.g., 120+ days)
                            </label>
                        </div>
                    )}

                    {/* Rate */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isDiscount ? 'Discount' : 'Interest'} Rate (%) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.rate}
                                onChange={(e) => handleChange('rate', e.target.value)}
                                placeholder={isDiscount ? "10" : "5"}
                                min="0"
                                max="100"
                                step="0.1"
                                className={`w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 ${errors.rate
                                    ? 'border-red-300 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                disabled={isSubmitting}
                            />
                            <span className="absolute right-3 top-2 text-gray-500">%</span>
                        </div>
                        {errors.rate && (
                            <p className="mt-1 text-sm text-red-600">{errors.rate}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                            {isDiscount
                                ? 'Percentage to deduct from base amount'
                                : 'Percentage to add as penalty/interest'
                            }
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder={isDiscount
                                ? "e.g., Maximum savings! Pay within 30 days and save 10%"
                                : "e.g., Late payment charges apply. 5% interest for payments between 105-120 days"
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Preview */}
                    {formData.periodStart && (formData.periodEnd || formData.isOpenEnded) && formData.rate && (
                        <div className={`p-4 rounded-lg border-2 ${isDiscount ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}>
                            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                            <p className="text-gray-900">
                                <span className="font-semibold">
                                    {formData.periodStart}-{formData.isOpenEnded ? '∞' : formData.periodEnd} days
                                </span>
                                {' → '}
                                <span className={`font-bold ${isDiscount ? 'text-green-600' : 'text-red-600'}`}>
                                    {formData.rate}% {isDiscount ? 'discount' : 'interest'}
                                </span>
                            </p>
                            {formData.tierName && (
                                <p className="text-sm text-gray-600 mt-1">{formData.tierName}</p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${isDiscount
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    {isEdit ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    {isEdit ? 'Update' : 'Create'} Tier
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TierFormModal
