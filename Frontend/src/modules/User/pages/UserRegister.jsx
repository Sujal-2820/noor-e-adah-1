import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OtpVerification } from '../../../components/auth/OtpVerification'
import { useUserDispatch } from '../context/UserContext'
import { UserStatusMessage } from '../components/UserStatusMessage'
import { DocumentUpload } from '../components/DocumentUpload'
import * as userApi from '../services/userApi'
import { PhoneInput } from '../../../components/PhoneInput'
import { cn } from '../../../lib/cn'
import { validatePhoneNumber } from '../../../utils/phoneValidation'

export function UserRegister({ onSuccess, onSwitchToLogin }) {
  const navigate = useNavigate()
  const dispatch = useUserDispatch()

  // Registration Flow: 'step1' | 'step2' | 'otp' | 'pending' | 'rejected'
  const [step, setStep] = useState('step1')

  const [form, setForm] = useState({
    // Step 1: Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agentName: '',
    shopName: '',
    shopAddress: '',
    city: '',
    state: '',
    pincode: '',
    location: null,
    gstNumber: '',
    panNumber: '',
    aadhaarNumber: '',

    // Step 2: Documents
    aadhaarFront: null,
    aadhaarBack: null,
    pesticideLicense: null,
    securityChecks: null,
    dealershipForm: null,
    termsAccepted: false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    let processedValue = value
    if (type === 'checkbox') {
      processedValue = checked
    } else if (['gstNumber', 'panNumber'].includes(name)) {
      processedValue = value.toUpperCase()
    }

    setForm((prev) => ({
      ...prev,
      [name]: processedValue
    }))
    setError(null)
  }

  // Handle value-only changes for components like PhoneInput
  const handleValueChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleDocumentChange = (documentType) => (documentData) => {
    setForm((prev) => ({
      ...prev,
      [documentType]: documentData,
    }))
    setError(null)
  }

  // --- Validations ---
  const validateStep1 = () => {
    const { firstName, lastName, phone, email, shopName, shopAddress, location, gstNumber, panNumber, aadhaarNumber } = form

    if (!firstName.trim() || !lastName.trim()) return 'First and last name are required'

    // Indian Mobile Number Validation using utility
    const validation = validatePhoneNumber(phone)
    if (!validation.isValid) return validation.error

    if (!shopName.trim()) return 'Shop name is required'
    if (!shopAddress.trim()) return 'Shop address is required'
    if (!form.city.trim()) return 'City is required'
    if (!form.state.trim()) return 'State is required'
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode)) return 'Valid 6-digit Pincode is required'

    // GST Validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    if (!gstRegex.test(gstNumber)) return 'Invalid GST number format (e.g. 22AAAAA0000A1Z5)'

    // PAN Validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    if (!panRegex.test(panNumber)) return 'Invalid PAN card format (e.g. ABCDE1234F)'

    // Aadhaar Validation
    const aadhaarRegex = /^[0-9]{12}$/
    if (!aadhaarRegex.test(aadhaarNumber)) return 'Aadhaar number must be exactly 12 digits'

    return null
  }

  const validateStep2 = () => {
    const { aadhaarFront, aadhaarBack, pesticideLicense, securityChecks, dealershipForm, termsAccepted } = form

    if (!aadhaarFront?.url) return 'Aadhaar front image is required'
    if (!aadhaarBack?.url) return 'Aadhaar back image is required'
    if (!pesticideLicense?.url) return 'Business license is required'
    if (!securityChecks?.url) return 'Identity verification document is required'
    if (!dealershipForm?.url) return 'Partner agreement is required'
    if (!termsAccepted) return 'You must accept the terms and conditions'

    return null
  }

  const handleGoToStep2 = (e) => {
    e.preventDefault()
    const errorMsg = validateStep1()
    if (errorMsg) {
      setError(errorMsg)
      return
    }
    setStep('step2')
    window.scrollTo(0, 0)
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const errorMsg = validateStep2()
    if (errorMsg) {
      setError(errorMsg)
      return
    }

    setLoading(true)
    try {
      // Normalize phone number for API request
      const validation = validatePhoneNumber(form.phone)
      const normalizedForm = {
        ...form,
        phone: validation.normalized
      }

      const result = await userApi.registerUser(normalizedForm)
      if (result.success || result.data) {
        // Update form with normalized phone for further steps
        setForm(prev => ({ ...prev, phone: validation.normalized }))
        setStep('otp')
      } else {
        setError(result.error?.message || 'Failed to initiate registration. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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

        if (status === 'pending') {
          setUserId(userData?.userId || responseData?.userId || 'Pending')
          setStep('pending')
          return
        }

        if (status === 'rejected') {
          setStep('rejected')
          return
        }

        if (responseData?.token || result.data?.token) {
          localStorage.setItem('user_token', responseData?.token || result.data?.token)
        }

        if (userData) {
          dispatch({
            type: 'AUTH_LOGIN',
            payload: {
              id: userData.id || userData._id,
              name: userData.name,
              phone: userData.phone,
              email: userData.email,
              location: userData.location,
              status: userData.status,
              isActive: userData.isActive,
            },
          })
        }

        onSuccess?.(userData)
        navigate('/user/dashboard')
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
    try {
      await userApi.requestUserOTP({ phone: form.phone })
    } catch (err) {
      setError('Failed to resend OTP.')
    }
  }

  // --- Step 1: Info ---
  if (step === 'step1') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
        <div className="w-full max-w-2xl space-y-5">
          <RegistrationHeader currentStep={1} />

          <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-5 md:p-6 shadow-xl backdrop-blur-sm">
            <form onSubmit={handleGoToStep2} className="space-y-5">
              {error && <ErrorAlert error={error} />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormInput
                  label="First Name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh"
                  required
                />
                <FormInput
                  label="Last Name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Kumar"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Mobile Number *</label>
                  <PhoneInput
                    name="phone"
                    value={form.phone}
                    onChange={(e) => handleValueChange('phone', e.target.value)}
                    required
                    placeholder="90000 00000"
                  />
                </div>
                <FormInput
                  label="Email (Optional)"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="rajesh@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormInput
                  label="Shop Name"
                  name="shopName"
                  value={form.shopName}
                  onChange={handleChange}
                  placeholder="e.g. Noor E Adah Boutique"
                  required
                />
                <FormInput
                  label="Agent Name (If any)"
                  name="agentName"
                  value={form.agentName}
                  onChange={handleChange}
                  placeholder="Referrer name"
                />
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-900">Shop Location & Address</h3>
                <FormInput
                  label="Complete Shop Address"
                  name="shopAddress"
                  value={form.shopAddress}
                  onChange={handleChange}
                  placeholder="Building, Street, Landmark..."
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormInput
                    label="City"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Kolhapur"
                    required
                  />
                  <FormInput
                    label="State"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="e.g. Maharashtra"
                    required
                  />
                  <FormInput
                    label="Pincode"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="416001"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-900">KYC Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label="GST Number"
                    name="gstNumber"
                    value={form.gstNumber}
                    onChange={handleChange}
                    placeholder="22AAAAA0000A1Z5"
                    required
                  />
                  <FormInput
                    label="PAN Number"
                    name="panNumber"
                    value={form.panNumber}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                    required
                  />
                  <FormInput
                    label="Aadhaar Number"
                    name="aadhaarNumber"
                    value={form.aadhaarNumber}
                    onChange={handleChange}
                    placeholder="12 Digit Number"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="flex-1 rounded-full border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Next Step
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // --- Step 2: Documents ---
  if (step === 'step2') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
        <div className="w-full max-w-2xl space-y-5">
          <RegistrationHeader currentStep={2} />

          <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-5 md:p-6 shadow-xl backdrop-blur-sm">
            <form onSubmit={handleFinalSubmit} className="space-y-5">
              {error && <ErrorAlert error={error} />}

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Required Documents</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DocumentUpload
                    label="Aadhaar Front"
                    value={form.aadhaarFront}
                    onChange={handleDocumentChange('aadhaarFront')}
                    required
                    disabled={loading}
                  />
                  <DocumentUpload
                    label="Aadhaar Back"
                    value={form.aadhaarBack}
                    onChange={handleDocumentChange('aadhaarBack')}
                    required
                    disabled={loading}
                  />
                  <DocumentUpload
                    label="Business License"
                    value={form.pesticideLicense}
                    onChange={handleDocumentChange('pesticideLicense')}
                    required
                    disabled={loading}
                  />
                  <DocumentUpload
                    label="Identity Verification"
                    value={form.securityChecks}
                    onChange={handleDocumentChange('securityChecks')}
                    required
                    disabled={loading}
                  />
                  <DocumentUpload
                    label="Partner Agreement"
                    value={form.dealershipForm}
                    onChange={handleDocumentChange('dealershipForm')}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={form.termsAccepted}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed">
                    I hereby certify that the information provided above is true to the best of my knowledge. I agree to the <button type="button" className="text-blue-600 font-semibold hover:underline">Terms & Conditions</button> and <button type="button" className="text-blue-600 font-semibold hover:underline">Privacy Policy</button> of Noor E Adah.
                  </span>
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('step1')}
                  disabled={loading}
                  className="flex-1 rounded-full border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Previous Step
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Register Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // --- Step: OTP ---
  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
        <div className="w-full max-w-md space-y-5">
          <div className="rounded-3xl border border-blue-200/60 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <OtpVerification
              phone={form.phone}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('step2')}
              loading={loading}
              error={error}
              userType="user"
            />
          </div>
        </div>
      </div>
    )
  }

  // --- Step: Pending/Rejected ---
  if (step === 'pending' || step === 'rejected') {
    return <UserStatusMessage status={step} userId={userId} onBack={() => navigate('/user/login')} />
  }

  return null
}

// --- Helper Components ---

function RegistrationHeader({ currentStep }) {
  return (
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

      <div className="flex justify-center items-center gap-2 mb-2">
        <StepIndicator active={currentStep === 1} completed={currentStep > 1} label="1" />
        <div className={cn("w-12 h-0.5 rounded-full", currentStep > 1 ? "bg-blue-600" : "bg-gray-200")} />
        <StepIndicator active={currentStep === 2} completed={currentStep > 2} label="2" />
        <div className={cn("w-12 h-0.5 rounded-full", currentStep > 2 ? "bg-blue-600" : "bg-gray-200")} />
        <StepIndicator active={currentStep === 3} completed={false} label="3" />
      </div>
      <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Step {currentStep} of 2</p>
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
        {currentStep === 1 ? 'Business & KYC' : 'Verify Documents'}
      </h1>
      <p className="text-xs md:text-sm text-gray-500 max-w-sm mx-auto">
        {currentStep === 1
          ? 'Enter your shop details and identity numbers for verification.'
          : 'Upload clear scans of your documents to complete registration.'}
      </p>
    </div>
  )
}

function StepIndicator({ active, completed, label }) {
  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
      completed ? "bg-blue-600 text-white" :
        active ? "bg-blue-100 text-blue-700 ring-2 ring-blue-600 ring-offset-2" :
          "bg-gray-100 text-gray-400"
    )}>
      {completed ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : label}
    </div>
  )
}

function FormInput({ label, name, type = 'text', value, onChange, placeholder, required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700">{label} {required && '*'}</label>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
      />
    </div>
  )
}

function ErrorAlert({ error }) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex gap-3">
        <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    </div>
  )
}
