import { useState, useRef, useEffect } from 'react'
import { ShieldCheckIcon, UserIcon, StoreIcon, ShoppingBagIcon } from 'lucide-react'


// Theme configurations for different user types
const themes = {
  user: {
    bgGradient: 'from-blue-50 via-white to-blue-50',
    borderColor: 'border-blue-200/60',
    primaryColor: '#1d4ed8',
    primaryBg: 'bg-gradient-to-r from-blue-600 to-blue-700',
    focusBorder: 'focus:border-blue-600',
    focusRing: 'focus:ring-blue-600/40',
    textColor: 'text-slate-900',
    mutedColor: 'text-gray-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'User Verification',
    subtitle: 'Noor E Adah User Account'
  },
  admin: {
    bgGradient: 'from-blue-50 via-white to-blue-50',
    borderColor: 'border-blue-200/60',
    primaryColor: '#1d4ed8',
    primaryBg: 'bg-gradient-to-r from-blue-600 to-blue-700',
    focusBorder: 'focus:border-blue-600',
    focusRing: 'focus:ring-blue-600/40',
    textColor: 'text-slate-900',
    mutedColor: 'text-gray-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Admin Verification',
    subtitle: 'Noor E Adah Admin Portal'
  },
}

// Icon components for each user type
const UserTypeIcon = ({ userType }) => {
  const iconClass = `w-6 h-6 ${themes[userType]?.iconColor || 'text-gray-600'}`

  switch (userType) {
    case 'admin':
      return <ShieldCheckIcon className={iconClass} />
    case 'user':
      return <StoreIcon className={iconClass} />
    default:
      return <UserIcon className={iconClass} />
  }
}

export function OtpVerification({ phone, email, onVerify, onResend, onBack, loading = false, error = null, userType = 'user' }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(120) // 2 minutes in seconds
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  useEffect(() => {
    let interval
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else {
      setCanResend(true)
    }
    return () => clearInterval(interval)
  }, [timer])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('')
        const newOtp = [...otp]
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit
        })
        setOtp(newOtp)
        const nextIndex = Math.min(digits.length, 5)
        inputRefs.current[nextIndex]?.focus()
      })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length === 6) {
      onVerify(otpString)
    }
  }

  const handleResend = () => {
    setOtp(['', '', '', '', '', ''])
    setTimer(120)
    setCanResend(false)
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
    onResend?.()
  }

  const theme = themes[userType] || themes.user

  return (
    <div className="w-full space-y-6">
      {/* Header with Logo and User Type Badge */}
      <div className="text-center space-y-4">
        <div className="flex flex-col items-center gap-3">
          {/* Logo */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${theme.iconBg} mb-2 overflow-hidden border-2 ${theme.borderColor}`}>
            <img src="/NoorEAdah.jpeg" alt="Noor E Adah" className="h-full w-full object-contain p-2" />
          </div>

          {/* User Type Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${theme.iconBg} border ${theme.borderColor}`}>
            <UserTypeIcon userType={userType} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${theme.iconColor}`}>
              {theme.title}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className={`text-2xl font-bold ${theme.textColor}`}>Enter Verification Code</h2>
          <p className={`text-sm ${theme.mutedColor}`}>
            We've sent a 6-digit code to{' '}
            <span className={`font-semibold ${theme.textColor}`}>
              {phone || email}
            </span>
          </p>
          <p className={`text-xs ${theme.mutedColor} mt-1`}>
            {theme.subtitle}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Input Boxes */}
        <div className="w-full flex justify-center items-center gap-2 px-0 sm:px-2 overflow-hidden">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-[40px] h-[50px] sm:w-[50px] sm:h-[60px] text-center text-xl font-bold rounded-xl border-2 ${theme.borderColor} bg-white ${theme.focusBorder} focus:outline-none focus:ring-2 ${theme.focusRing} transition-all shadow-sm hover:shadow-md shrink-0`}
              style={{
                borderColor: digit ? theme.primaryColor : undefined,
                color: theme.textColor
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200`}>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Verify Button */}
          <button
            type="submit"
            disabled={otp.join('').length !== 6 || loading}
            className={`w-full rounded-2xl ${theme.primaryBg} px-5 py-4 text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify OTP'
            )}
          </button>

          {/* Resend Code */}
          <div className="flex flex-col items-center justify-center gap-1 text-sm">
            <span className={theme.mutedColor}>Didn't receive code?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className={`font-semibold hover:underline disabled:opacity-50 transition-colors`}
                style={{ color: theme.primaryColor }}
              >
                Resend
              </button>
            ) : (
              <span className={theme.mutedColor} style={{ opacity: 0.8 }}>
                Resend in {formatTime(timer)}
              </span>
            )}
          </div>

          {/* Back Button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`w-full text-sm ${theme.mutedColor} hover:${theme.textColor} transition-colors py-2`}
            >
              ← Change {phone ? 'phone number' : 'email'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

