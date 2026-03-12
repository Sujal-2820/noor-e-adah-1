import { useState } from 'react'
import { OtpVerification } from '../../../components/auth/OtpVerification'
import { useAdminDispatch } from '../context/AdminContext'
import * as adminApi from '../services/adminApi'
import { registerFCMTokenWithBackend } from '../../../services/pushNotificationService'

export function AdminLogin({ onSubmit }) {
  const dispatch = useAdminDispatch()
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [form, setForm] = useState({ phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmitCredentials = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!form.phone.trim()) {
        setError('Phone number is required')
        setLoading(false)
        return
      }

      // Step 1: Login with phone (triggers OTP)
      const result = await adminApi.loginAdmin({ phone: form.phone })

      if (result.success || result.data) {
        // Request OTP to phone
        await adminApi.requestAdminOTP({ phone: form.phone })
        setStep('otp')
      } else {
        setError(result.error?.message || 'Invalid credentials. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (otpCode) => {
    setError(null)
    setLoading(true)

    try {
      // Step 2: Verify OTP and complete login
      const result = await adminApi.verifyAdminOTP({ phone: form.phone, otp: otpCode })

      if (result.success || result.data) {
        // Store token
        if (result.data?.token) {
          localStorage.setItem('admin_token', result.data.token)
          // Register FCM token
          registerFCMTokenWithBackend(true)
        }
        // Update context with admin profile
        dispatch({
          type: 'AUTH_LOGIN',
          payload: {
            id: result.data.admin.id,
            name: result.data.admin.name,
            phone: result.data.admin.phone,
            role: result.data.admin.role,
          },
        })
        onSubmit?.(result.data.admin)
      } else {
        setError(result.error?.message || 'Invalid OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    try {
      await adminApi.requestAdminOTP({ phone: form.phone })
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-3xl border border-gray-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <OtpVerification
              phone={form.phone}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('credentials')}
              loading={loading}
              error={error}
              userType="admin"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white mb-4 overflow-hidden border border-gray-200">
            <img src="/assets/NoorEAdahLogo.png" alt="Noor E Adah" className="h-full w-full object-contain p-2" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">Admin Access</p>
          <h1 className="text-3xl font-bold text-gray-900">Sign in to Noor E Adah</h1>
          <p className="text-sm text-gray-600">Enter your phone number to access admin dashboard</p>
        </div>

        <div className="rounded-3xl border border-gray-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmitCredentials} className="space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="admin-phone" className="text-xs font-semibold text-gray-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                id="admin-phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="8878495502"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
