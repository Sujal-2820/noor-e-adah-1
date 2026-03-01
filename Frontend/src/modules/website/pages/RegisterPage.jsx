import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OtpVerification } from '../../../components/auth/OtpVerification'
import { useWebsiteDispatch } from '../context/WebsiteContext'
import { GoogleMapsLocationPicker } from '../../../components/GoogleMapsLocationPicker'
import * as websiteApi from '../services/websiteApi'

export function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useWebsiteDispatch()
  const [step, setStep] = useState('register') // 'register' | 'otp'
  const [form, setForm] = useState({
    fullName: '',
    contact: '',
    adminId: '',
    location: null, // Will contain { address, city, state, pincode, coordinates: { lat, lng } }
  })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAdminId, setShowAdminId] = useState(false)

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
      // Validate form
      if (!form.fullName.trim()) {
        setError('Full name is required')
        setLoading(false)
        return
      }
      if (!form.contact.trim()) {
        setError('Contact number is required')
        setLoading(false)
        return
      }
      if (form.contact.length < 10) {
        setError('Please enter a valid contact number')
        setLoading(false)
        return
      }
      // Validate location - coordinates are required (Google Maps provides this)
      if (!form.location || !form.location.coordinates) {
        setError('Please select your location using the map or live location button')
        setLoading(false)
        return
      }
      // Validate coordinates are valid (not 0,0)
      if (!form.location.coordinates.lat || !form.location.coordinates.lng ||
        form.location.coordinates.lat === 0 || form.location.coordinates.lng === 0) {
        setError('Please select a valid location. Coordinates are required.')
        setLoading(false)
        return
      }
      // Address is required (Google Maps provides formatted_address)
      if (!form.location.address || !form.location.address.trim()) {
        setError('Please select a valid address from the location picker')
        setLoading(false)
        return
      }

      // Request OTP using websiteApi
      const result = await websiteApi.requestOTP({ phone: form.contact })

      if (result.success || result.data) {
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
      // Prepare location object
      const location = {
        address: form.location.address,
        city: form.location.city,
        state: form.location.state,
        pincode: form.location.pincode,
        coordinates: {
          lat: form.location.coordinates.lat,
          lng: form.location.coordinates.lng,
        },
      }

      // Register user with OTP using websiteApi
      const result = await websiteApi.register({
        fullName: form.fullName,
        phone: form.contact,
        otp: otpCode,
        adminId: form.adminId || undefined,
        location: location,
      })

      if (result.success || result.data) {
        // Store token if provided (same user_token as User module)
        if (result.data?.token) {
          localStorage.setItem('user_token', result.data.token)
        }

        // Update WebsiteContext with user data
        const userData = result.data?.user || { name: form.fullName, phone: form.contact }
        dispatch({
          type: 'AUTH_LOGIN',
          payload: {
            name: userData.name || form.fullName,
            phone: userData.phone || form.contact,
            adminId: userData.adminId || null,
            location: userData.location || location,
          },
        })

        // Navigate to website homepage
        navigate('/')
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
      await websiteApi.requestOTP({ phone: form.contact })
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
          <div className="rounded-3xl border border-green-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <OtpVerification
              phone={form.contact}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('register')}
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Create Account</p>
          <h1 className="text-3xl font-bold text-gray-900">Join Satpura Bio</h1>
          <p className="text-sm text-gray-600">Start your journey to better farming</p>
        </div>

        <div className="rounded-3xl border border-green-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleRequestOtp} className="space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="register-fullName" className="text-xs font-semibold text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="register-fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-contact" className="text-xs font-semibold text-gray-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                id="register-contact"
                name="contact"
                type="tel"
                required
                value={form.contact}
                onChange={handleChange}
                placeholder="+91 90000 00000"
                maxLength={15}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="register-adminId" className="text-xs font-semibold text-gray-700">
                  Satpura Partner ID <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdminId(!showAdminId)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  {showAdminId ? 'Hide' : 'Have one?'}
                </button>
              </div>
              {showAdminId && (
                <input
                  id="register-adminId"
                  name="adminId"
                  type="text"
                  value={form.adminId}
                  onChange={handleChange}
                  placeholder="Enter Satpura Partner ID (e.g., SLR-1001)"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                />
              )}
              {showAdminId && (
                <p className="text-xs text-gray-500">
                  Link your purchases to a Satpura Partner for cashback benefits
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-5 mt-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Address & Location</h3>

              <div className="space-y-4">
                <GoogleMapsLocationPicker
                  onLocationSelect={(location) => {
                    setForm((prev) => ({ ...prev, location }))
                    setError(null)
                  }}
                  initialLocation={form.location}
                  required={true}
                  label="Select Your Location"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
