import { useState } from 'react'
import { OtpVerification } from '../../../../components/auth/OtpVerification'
import { useUserDispatch } from '../../context/UserContext'
import * as userApi from '../../services/userApi'
import { validatePhoneNumber } from '../../../../utils/phoneValidation'
import { PhoneInput } from '../../../../components/PhoneInput'
import { useToast } from '../../../../modules/Admin/components/ToastNotification'
import { UserStatusMessage } from '../../components/UserStatusMessage'
import { registerFCMTokenWithBackend } from '../../../../services/pushNotificationService'

export function UserLogin({ onSuccess, onSwitchToRegister }) {
  const dispatch = useUserDispatch()
  const { warning: showWarning } = useToast()
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [form, setForm] = useState({ phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)
  const [showStatus, setShowStatus] = useState(false)
  const [status, setStatus] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!form.phone.trim()) {
        setError('Contact number is required')
        setLoading(false)
        return
      }

      // Validate phone number
      const validation = validatePhoneNumber(form.phone)
      if (!validation.isValid) {
        setError(validation.error)
        setLoading(false)
        return
      }

      const result = await userApi.requestUserOTP({ phone: validation.normalized })

      if (result.success || result.data) {
        setForm(prev => ({ ...prev, phone: validation.normalized }))
        setStep('otp')
      } else {
        setError(result.error?.message || 'Failed to send OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (otpCode) => {
    setError(null)
    setLoading(true)

    try {
      const result = await userApi.loginUserWithOtp({ phone: form.phone, otp: otpCode })

      if (result.success || result.data) {
        const userData = result.data?.user || result.data?.data?.user || result.data // handle different structures

        // Check if user status is pending
        if (userData?.status === 'pending') {
          setUserId(userData?.userId || result.data?.data?.userId || 'Pending')
          setStatus('pending')
          setShowStatus(true)
          setLoading(false)
          return
        }

        // Check if user status is rejected
        if (userData?.status === 'rejected') {
          setUserId(userData?.userId || result.data?.data?.userId || 'Status')
          setStatus('rejected')
          setShowStatus(true)
          setLoading(false)
          return
        }

        if (result.data?.token || result.data?.data?.token) {
          localStorage.setItem('user_token', result.data?.token || result.data?.data?.token)
          // Register FCM token
          registerFCMTokenWithBackend(true)
        }

        // Update user context with profile
        if (userData) {
          dispatch({
            type: 'AUTH_LOGIN',
            payload: {
              ...userData,
              id: userData.id || userData._id,
              phone: userData.phone || form.phone,
            },
          })
        }

        onSuccess?.(userData || { phone: form.phone })
      } else {
        // Check if user needs to register
        if (result.error?.message?.includes('not found') || result.error?.message?.includes('User not found')) {
          setError('User not found. Please register first.')
          setTimeout(() => {
            if (onSwitchToRegister) {
              onSwitchToRegister()
            }
          }, 2000)
        } else if (result.error?.message?.includes('banned')) {
          setError(result.error?.message || 'Your account has been banned. Please contact admin.')
        } else if (result.error?.message?.includes('inactive')) {
          setError('Your account is inactive. Please contact admin.')
        } else if (result.status === 'rejected' || result.data?.status === 'rejected') { // Handle rejected status from API response
          setError(result.message || result.data?.message || 'Your application was rejected.')
        } else {
          setError(result.error?.message || 'Invalid OTP. Please try again.')
        }
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
      await userApi.requestUserOTP({ phone: form.phone })
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (showStatus) {
    return <UserStatusMessage status={status} userId={userId} onBack={() => { setShowStatus(false); setStep('phone'); }} />
  }

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
        <div className="w-full max-w-md space-y-5">
          <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <OtpVerification
              phone={form.phone}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('phone')}
              loading={loading}
              error={error}
              userType="user"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-3 mb-2">
          {/* Brand Identity */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-blue-100 p-2 overflow-hidden">
              <img src="/NoorEAdah.jpeg" alt="Noor E Adah" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-lg font-black text-slate-900 tracking-tighter uppercase">Noor E <span className="text-accent">Adah</span></span>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Premium Fashion</span>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-blue-600 font-bold">Welcome Back</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">User Login</h1>
          <p className="text-xs text-gray-500">Enter your contact number to continue</p>
        </div>

        <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleRequestOtp} className="space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-phone" className="text-xs font-semibold text-gray-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                id="login-phone"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="Mobile"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
