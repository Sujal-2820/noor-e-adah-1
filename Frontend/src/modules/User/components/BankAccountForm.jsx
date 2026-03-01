import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useUserApi } from '../hooks/useUserApi'
import { ConfirmationModal } from './ConfirmationModal'

export function BankAccountForm({ isOpen, onClose, onSuccess }) {
  const { addBankAccount } = useUserApi()
  const [step, setStep] = useState('form') // 'form' | 'confirm'
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    isPrimary: true,
  })

  const [confirmationData, setConfirmationData] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required'
    }
    
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required'
    } else if (!/^\d+$/.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = 'Account number must contain only digits'
    } else if (formData.accountNumber.trim().length < 9 || formData.accountNumber.trim().length > 18) {
      newErrors.accountNumber = 'Account number must be between 9 and 18 digits'
    }
    
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required'
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())) {
      newErrors.ifscCode = 'Please enter a valid IFSC code (e.g., SBIN0001234)'
    }
    
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    // Prepare confirmation data
    const dataToConfirm = {
      'Account Holder Name': formData.accountHolderName.trim(),
      'Account Number': formData.accountNumber.trim().replace(/(.{4})/g, '$1 ').trim(), // Format with spaces
      'IFSC Code': formData.ifscCode.trim().toUpperCase(),
      'Bank Name': formData.bankName.trim(),
      'Branch Name': formData.branchName.trim() || 'Not provided',
      'Set as Primary': formData.isPrimary ? 'Yes' : 'No',
    }
    
    setConfirmationData(dataToConfirm)
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setLoading(true)
    
    try {
      const result = await addBankAccount({
        accountHolderName: formData.accountHolderName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        bankName: formData.bankName.trim(),
        branchName: formData.branchName.trim() || undefined,
        isPrimary: formData.isPrimary,
      })
      
      if (result.data) {
        onSuccess?.(result.data.bankAccount)
        handleClose()
      } else if (result.error) {
        setErrors({ submit: result.error.message || 'Failed to add bank account. Please try again.' })
        setStep('form')
      }
    } catch (error) {
      setErrors({ submit: error.message || 'An unexpected error occurred. Please try again.' })
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('form')
    setFormData({
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      isPrimary: true,
    })
    setErrors({})
    setConfirmationData(null)
    onClose()
  }

  if (!isOpen) return null

  // Confirmation step
  if (step === 'confirm') {
    return (
      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => setStep('form')}
        onConfirm={handleConfirm}
        title="Confirm Bank Account Details"
        message="Please verify all details carefully. Bank account information cannot be changed after submission. Make sure all details are correct."
        details={confirmationData}
        loading={loading}
      />
    )
  }

  // Form step - render as content view within shell
  return (
    <div className="bank-account-form-view" style={{ 
      width: '100%', 
      maxWidth: '100%',
      padding: '0',
      margin: '0'
    }}>
      <div className="bank-account-form-view__header" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(30, 58, 138, 0.12)'
      }}>
        <button 
          type="button" 
          onClick={handleClose} 
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(30, 58, 138, 0.15)',
            background: 'rgba(255, 255, 255, 0.8)',
            color: 'var(--user-blue-600)',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(29, 78, 216, 0.1)'
              e.currentTarget.style.transform = 'translateX(-2px)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'
              e.currentTarget.style.transform = 'translateX(0)'
            }
          }}
        >
          <X className="h-5 w-5" />
        </button>
        <h4 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0,
          flex: 1
        }}>Add Bank Account</h4>
      </div>
        
      <div className="user-action-panel__form" style={{ 
        padding: '0',
        width: '100%'
      }}>
          {/* Warning Message */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-700 mb-1">
                  Important Notice
                </p>
                <p className="text-xs text-yellow-700">
                  Bank account details cannot be changed after submission. Please double-check all information before confirming.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} style={{ width: '100%' }}>
            <div className="space-y-4" style={{ width: '100%' }}>
              {/* Account Holder Name */}
              <div style={{ width: '100%' }}>
                <label className="user-action-panel__label" style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}>
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <div className="relative" style={{ width: '100%' }}>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleChange}
                    className={cn(
                      'user-action-panel__input',
                      errors.accountHolderName && 'is-error'
                    )}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter account holder name as per bank records"
                    required
                  />
                </div>
                {errors.accountHolderName && (
                  <span className="user-action-panel__error" style={{ display: 'block', width: '100%' }}>{errors.accountHolderName}</span>
                )}
              </div>

              {/* Account Number */}
              <div style={{ width: '100%' }}>
                <label className="user-action-panel__label" style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}>
                  Account Number <span className="text-red-500">*</span>
                </label>
                <div className="relative" style={{ width: '100%' }}>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    className={cn(
                      'user-action-panel__input',
                      errors.accountNumber && 'is-error'
                    )}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter account number (9-18 digits)"
                    maxLength={18}
                    required
                  />
                </div>
                {errors.accountNumber && (
                  <span className="user-action-panel__error" style={{ display: 'block', width: '100%' }}>{errors.accountNumber}</span>
                )}
                <p className="text-xs text-gray-500 mt-1" style={{ width: '100%', wordWrap: 'break-word' }}>Account number must be 9-18 digits</p>
              </div>

              {/* IFSC Code */}
              <div style={{ width: '100%' }}>
                <label className="user-action-panel__label" style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}>
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <div className="relative" style={{ width: '100%' }}>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    className={cn(
                      'user-action-panel__input uppercase',
                      errors.ifscCode && 'is-error'
                    )}
                    style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
                    placeholder="SBIN0001234"
                    maxLength={11}
                    required
                  />
                </div>
                {errors.ifscCode && (
                  <span className="user-action-panel__error" style={{ display: 'block', width: '100%' }}>{errors.ifscCode}</span>
                )}
                <p className="text-xs text-gray-500 mt-1" style={{ width: '100%', wordWrap: 'break-word' }}>Format: 4 letters, 0, 6 alphanumeric (e.g., SBIN0001234)</p>
              </div>

              {/* Bank Name */}
              <div style={{ width: '100%' }}>
                <label className="user-action-panel__label" style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}>
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <div className="relative" style={{ width: '100%' }}>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className={cn(
                      'user-action-panel__input',
                      errors.bankName && 'is-error'
                    )}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter bank name (e.g., State Bank of India)"
                    required
                  />
                </div>
                {errors.bankName && (
                  <span className="user-action-panel__error" style={{ display: 'block', width: '100%' }}>{errors.bankName}</span>
                )}
              </div>

              {/* Branch Name */}
              <div style={{ width: '100%' }}>
                <label className="user-action-panel__label" style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}>
                  Branch Name <span className="text-gray-500">(Optional)</span>
                </label>
                <div className="relative" style={{ width: '100%' }}>
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    className="user-action-panel__input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter branch name"
                  />
                </div>
              </div>

              {/* Primary Account Checkbox */}
              <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50" style={{ width: '100%', boxSizing: 'border-box' }}>
                <input
                  type="checkbox"
                  name="isPrimary"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  style={{ flexShrink: 0 }}
                />
                <label htmlFor="isPrimary" className="flex-1 text-sm text-gray-700" style={{ width: '100%', minWidth: 0 }}>
                  <span className="font-semibold" style={{ display: 'block', wordWrap: 'break-word' }}>Set as primary account</span>
                  <p className="text-xs text-gray-500 mt-1" style={{ wordWrap: 'break-word' }}>
                    This account will be used by default for withdrawal requests. You can change this later if you add more accounts.
                  </p>
                </label>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2" style={{ width: '100%', boxSizing: 'border-box' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 user-action-panel__button is-secondary"
                  style={{ minWidth: 0, width: '100%' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 user-action-panel__button is-primary"
                  style={{ minWidth: 0, width: '100%' }}
                >
                  {loading ? 'Processing...' : 'Continue to Confirm'}
                </button>
              </div>
            </div>
          </form>
        </div>
    </div>
  )
}

