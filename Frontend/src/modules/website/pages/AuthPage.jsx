import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { auth } from '../../../firebase'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'firebase/auth'
import { useWebsiteDispatch } from '../context/WebsiteContext'
import { Layout, Container } from '../components/Layout'
import { cn } from '../../../lib/cn'
import * as websiteApi from '../services/websiteApi'

// Eye Icons defined locally to ensure availability
const EyeIcon = ({ className = 'h-5 w-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

const EyeOffIcon = ({ className = 'h-5 w-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
)

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * This guides the user correctly without exposing technical jargon.
 */
const getFriendlyErrorMessage = (code, customMessage) => {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Email or password may be incorrect. Please check your details or try resetting your password.'
        case 'auth/email-already-in-use':
            return "This email is already registered with us. Try logging in or use 'Forgot Password'."
        case 'auth/weak-password':
            return 'Please choose a stronger password (at least 6 characters).'
        case 'auth/invalid-email':
            return 'Please enter a valid email address to continue.'
        case 'auth/user-disabled':
            return 'This account is currently inactive. Please reach out to our support team for assistance.'
        case 'auth/too-many-requests':
            return 'Too many attempts. For your security, please wait a few minutes and try again.'
        case 'auth/network-request-failed':
            return 'Having trouble connecting. Please check your internet connection.'
        case 'auth/popup-closed-by-user':
            return 'The login popup was closed before completion. Please try again.'
        default:
            return customMessage || 'We encountered an error. Please try again in a moment.'
    }
}

export function AuthPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch = useWebsiteDispatch()

    const [isLoginView, setIsLoginView] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    const [loginForm, setLoginForm] = useState({
        identifier: '',
        password: ''
    })

    const [registerForm, setRegisterForm] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    // Load remembered credentials
    useEffect(() => {
        const savedIdentifier = localStorage.getItem('rem_identifier')
        const savedPassword = localStorage.getItem('rem_password')
        if (savedIdentifier && savedPassword) {
            setLoginForm({
                identifier: savedIdentifier,
                password: atob(savedPassword)
            })
            setRememberMe(true)
        }
    }, [])

    const handleLoginChange = (e) => {
        const { name, value } = e.target
        setLoginForm(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleRegisterChange = (e) => {
        const { name, value } = e.target
        setRegisterForm(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const userCredential = await signInWithEmailAndPassword(auth, loginForm.identifier, loginForm.password)
            const user = userCredential.user

            // Handle Remember Me
            if (rememberMe) {
                localStorage.setItem('rem_identifier', loginForm.identifier)
                localStorage.setItem('rem_password', btoa(loginForm.password))
            } else {
                localStorage.removeItem('rem_identifier')
                localStorage.removeItem('rem_password')
            }

            // Sync with backend
            const idToken = await user.getIdToken()
            const result = await websiteApi.syncFirebaseUser({ idToken })

            if (result.success) {
                localStorage.setItem('user_token', result.data.token)
                dispatch({
                    type: 'AUTH_LOGIN',
                    payload: result.data.user
                })
                navigate('/')
            } else {
                setError(result.error?.message || 'Failed to sync with backend')
            }
        } catch (err) {
            console.error('Login Error:', err)
            setError(getFriendlyErrorMessage(err.code, err.message))
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault()

        // Basic Validation
        if (registerForm.password !== registerForm.confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (registerForm.password.length < 6) {
            setError("Password should be at least 6 characters")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password)
            const user = userCredential.user

            // Handle Remember Me for new user
            if (rememberMe) {
                localStorage.setItem('rem_identifier', registerForm.email)
                localStorage.setItem('rem_password', btoa(registerForm.password))
            }

            // Sync with backend
            const idToken = await user.getIdToken()
            const result = await websiteApi.syncFirebaseUser({
                idToken,
                name: registerForm.fullName
            })

            if (result.success) {
                localStorage.setItem('user_token', result.data.token)
                dispatch({
                    type: 'AUTH_LOGIN',
                    payload: result.data.user
                })
                navigate('/')
            } else {
                setError(result.error?.message || 'Failed to sync with backend')
            }

        } catch (err) {
            console.error('Registration Error:', err)
            setError(getFriendlyErrorMessage(err.code, err.message))
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!loginForm.identifier) {
            setError('Please enter your email address first.')
            return
        }
        try {
            await sendPasswordResetEmail(auth, loginForm.identifier)
            alert('A password reset link has been sent to your email. Please check your inbox!')
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code, err.message))
        }
    }

    return (
        <Layout>
            <Container className="py-20 max-w-5xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-serif tracking-tight text-brand mb-4">My account</h1>
                    <nav className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-brand/40">
                        <Link to="/" className="hover:text-accent transition-colors">Home</Link>
                        <span>/</span>
                        <span className="text-brand">My account</span>
                    </nav>
                </div>

                <div className="grid md:grid-cols-2 gap-20 items-start">
                    {/* Column 1: Active Form */}
                    <div className="space-y-8 animate-calm-entry">
                        {isLoginView ? (
                            <>
                                <h2 className="text-[14px] font-bold tracking-[0.2em] uppercase text-brand border-b border-brand/10 pb-4">Login</h2>
                                <form onSubmit={handleLogin} className="space-y-6">
                                    {error && <p className="text-red-500 text-xs tracking-wide">{error}</p>}

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand/80">
                                            Username or email address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="identifier"
                                            value={loginForm.identifier}
                                            onChange={handleLoginChange}
                                            required
                                            className="w-full px-5 py-4 border border-brand/20 bg-muted/5 focus:border-accent outline-none transition-all rounded-full text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand/80">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={loginForm.password}
                                                onChange={handleLoginChange}
                                                required
                                                className="w-full px-5 py-4 border border-brand/20 bg-muted/5 focus:border-accent outline-none transition-all rounded-full text-sm pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-brand/30 hover:text-brand transition-colors"
                                            >
                                                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-brand text-white py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300 disabled:opacity-50"
                                    >
                                        {loading ? 'Logging in...' : 'Log In'}
                                    </button>

                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="w-4 h-4 border-brand/20 rounded focus:ring-0 text-brand"
                                            />
                                            <span className="text-[11px] font-medium text-brand/60 group-hover:text-brand transition-colors">Remember me</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            className="text-[11px] font-medium text-brand/60 hover:text-accent transition-colors"
                                        >
                                            Lost your password?
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <h2 className="text-[14px] font-bold tracking-[0.2em] uppercase text-brand border-b border-brand/10 pb-4">Register</h2>
                                <form onSubmit={handleRegister} className="space-y-6">
                                    {error && <p className="text-red-500 text-xs tracking-wide">{error}</p>}

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand/80">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={registerForm.fullName}
                                            onChange={handleRegisterChange}
                                            required
                                            className="w-full px-5 py-4 border border-brand/20 bg-muted/5 focus:border-accent outline-none transition-all rounded-full text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand/80">
                                            Email address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={registerForm.email}
                                            onChange={handleRegisterChange}
                                            required
                                            className="w-full px-5 py-4 border border-brand/20 bg-muted/5 focus:border-accent outline-none transition-all rounded-full text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand/80">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="password"
                                                value={registerForm.password}
                                                onChange={handleRegisterChange}
                                                required
                                                className="w-full px-5 py-4 border border-brand/20 bg-muted/5 focus:border-accent outline-none transition-all rounded-full text-sm pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-brand/30 hover:text-brand transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-brand/80">
                                            Confirm Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={registerForm.confirmPassword}
                                                onChange={handleRegisterChange}
                                                required
                                                className="w-full px-5 py-4 border border-brand/20 bg-muted/5 focus:border-accent outline-none transition-all rounded-full text-sm pr-12"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 border-brand/20 rounded focus:ring-0 text-brand"
                                        />
                                        <span className="text-[11px] font-medium text-brand/60 group-hover:text-brand transition-colors">Remember me</span>
                                    </div>

                                    <p className="text-[11px] leading-relaxed text-brand/60">
                                        Your personal data will be used to support your experience throughout this website, to manage access to your account, and for other purposes described in our privacy policy.
                                    </p>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-brand text-white py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300 disabled:opacity-50"
                                    >
                                        {loading ? 'Registering...' : 'Register'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                    {/* Column 2: Switch View / Info */}
                    <div className="md:border-l border-brand/10 md:pl-20 space-y-8 h-full flex flex-col justify-center">
                        {isLoginView ? (
                            <>
                                <h2 className="text-[14px] font-bold tracking-[0.2em] uppercase text-brand">Register</h2>
                                <div className="space-y-6">
                                    <p className="text-[11px] leading-relaxed text-brand/60">
                                        Registering for this site allows you to access your order status and history. Just fill in the fields below, and we'll get a new account set up for you in no time. We will only ask you for information necessary to make the purchase process faster and easier.
                                    </p>
                                    <button
                                        onClick={() => setIsLoginView(false)}
                                        className="bg-brand text-white px-10 py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300"
                                    >
                                        Register
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-[14px] font-bold tracking-[0.2em] uppercase text-brand">Login</h2>
                                <div className="space-y-6">
                                    <p className="text-[11px] leading-relaxed text-brand/60">
                                        Already have an account? Sign in to access your dashboard, order history and saved addresses.
                                    </p>
                                    <button
                                        onClick={() => setIsLoginView(true)}
                                        className="bg-brand text-white px-10 py-4 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-accent transition-all duration-300"
                                    >
                                        Login
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Container>
        </Layout>
    )
}
