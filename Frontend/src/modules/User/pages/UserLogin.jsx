import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OtpVerification } from '../../../components/auth/OtpVerification'
import { useUserDispatch } from '../context/UserContext'
import { UserStatusMessage } from '../components/UserStatusMessage'
import * as userApi from '../services/userApi'
import { validatePhoneNumber } from '../../../utils/phoneValidation'
import { PhoneInput } from '../../../components/PhoneInput'

export function UserLogin({ onSuccess, onSwitchToRegister }) {
  const navigate = useNavigate()
  const dispatch = useUserDispatch()
  const [step, setStep] = useState('phone') // 'phone' | 'otp' | 'pending' | 'rejected'
  const [form, setForm] = useState({ phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  // Handle value-only changes for components like PhoneInput
  const handleValueChange = (name, value) => {
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

      // Validate and normalize phone number
      const validation = validatePhoneNumber(form.phone)
      if (!validation.isValid) {
        setError(validation.error)
        setLoading(false)
        return
      }

      const result = await userApi.requestUserOTP({ phone: validation.normalized })

      if (result.success || result.data) {
        // Update form with normalized phone for further steps
        setForm(prev => ({ ...prev, phone: validation.normalized }))
        setStep('otp')
      } else {
        // Check for rejected status
        if (result.error?.status === 'rejected' || result.error?.message?.includes('rejected')) {
          setStep('rejected')
        } else {
          setError(result.error?.message || 'Failed to send OTP. Please try again.')
        }
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
        const responseData = result.data?.data || result.data
        const userData = responseData?.user || result.data?.user
        const status = responseData?.status || userData?.status

        // Check status
        if (status === 'pending') {
          // Show pending message
          setStep('pending')
          // Update user context with profile (but no token)
          if (userData) {
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                id: userData.id || userData._id,
                name: userData.name,
                phone: userData.phone || form.phone,
                email: userData.email,
                location: userData.location,
                status: userData.status,
                isActive: userData.isActive,
              },
            })
          }
          return
        }

        if (status === 'rejected') {
          // Show rejected message
          setStep('rejected')
          return
        }

        // User is approved - proceed to dashboard
        if (responseData?.token || result.data?.token) {
          const token = responseData?.token || result.data?.token
          localStorage.setItem('user_token', token)
          // Store 7-day expiry timestamp
          localStorage.setItem('user_token_expiry', Date.now() + 7 * 24 * 60 * 60 * 1000)
        }

        // Update user context with profile
        if (userData) {
          dispatch({
            type: 'AUTH_LOGIN',
            payload: {
              id: userData.id || userData._id,
              name: userData.name,
              phone: userData.phone || form.phone,
              email: userData.email,
              location: userData.location,
              status: userData.status,
              isActive: userData.isActive,
            },
          })
        }

        onSuccess?.(userData || { phone: form.phone })
        navigate('/user/dashboard')
      } else {
        // Check if user needs to register
        if (result.error?.message?.includes('not found') || result.error?.message?.includes('User not found')) {
          setError('User not found. Please register first.')
          setTimeout(() => {
            if (onSwitchToRegister) {
              onSwitchToRegister()
            }
          }, 2000)
        } else if (result.error?.status === 'rejected' || result.error?.message?.includes('rejected')) {
          setStep('rejected')
        } else if (result.error?.message?.includes('banned')) {
          setError(result.error?.message || 'Your account has been banned. Please contact admin.')
        } else if (result.error?.message?.includes('inactive')) {
          setError('Your account is inactive. Please contact admin.')
        } else {
          setError(result.error?.message || 'Invalid OTP. Please try again.')
        }
      }
    } catch (err) {
      // Check for rejected status in error response
      if (err.error?.status === 'rejected' || err.message?.includes('rejected')) {
        setStep('rejected')
      } else {
        setError(err.error?.message || err.message || 'Verification failed. Please try again.')
      }
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

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
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

  if (step === 'pending' || step === 'rejected') {
    return <UserStatusMessage status={step} onBack={() => setStep('phone')} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Welcome Back</p>
          <h1 className="text-3xl font-bold text-gray-900">Sign in as User</h1>
          <p className="text-sm text-gray-600">Enter your contact number to continue</p>
        </div>

        <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
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

