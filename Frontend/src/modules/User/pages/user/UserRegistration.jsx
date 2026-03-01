import { useState } from 'react'
import { DocumentUpload } from '../../components/DocumentUpload'
import { registerUser } from '../../services/userApi'
import { PhoneInput } from '../../../../components/PhoneInput'
import { validatePhoneNumber } from '../../../../utils/phoneValidation'

export function UserRegistration({ onBack, onRegistered }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    aadhaarCard: null,
    panCard: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDocumentChange = (documentType) => (documentData) => {
    setForm((prev) => ({
      ...prev,
      [documentType]: documentData,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    // Validate phone number
    const validation = validatePhoneNumber(form.phone)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    // Validate required documents
    if (!form.aadhaarCard?.url) {
      setError('Please upload Aadhaar card document')
      return
    }
    if (!form.panCard?.url) {
      setError('Please upload PAN card document')
      return
    }

    setSubmitting(true)

    try {
      // Prepare location data
      const location = {
        address: `${form.addressLine1}${form.addressLine2 ? `, ${form.addressLine2}` : ''}`,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        coordinates: {
          lat: 0, // Will be set by backend or geocoding
          lng: 0,
        },
      }

      // Call registration API
      const result = await registerUser({
        name: form.name,
        email: form.email,
        phone: validation.normalized,
        location,
        aadhaarCard: form.aadhaarCard,
        panCard: form.panCard,
      })

      if (result.success || result.data) {
        onRegistered?.(form)
      } else {
        setError(result.error?.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-full border border-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground"
      >
        Back to login
      </button>
      <div className="mx-auto w-full max-w-md rounded-3xl border border-muted/60 bg-white/80 p-5 shadow-card">
        <h1 className="text-2xl font-semibold text-surface-foreground">User Registration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Provide your details to register as a user. Admin will verify your documents before activation.
        </p>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm text-surface-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm text-surface-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="user@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="phone">
              Mobile Number
            </label>
            <PhoneInput
              id="phone"
              name="phone"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="Mobile"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="addressLine1">
                Address Line 1
              </label>
              <input
                id="addressLine1"
                name="addressLine1"
                type="text"
                required
                value={form.addressLine1}
                onChange={handleChange}
                className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="addressLine2">
                Address Line 2
              </label>
              <input
                id="addressLine2"
                name="addressLine2"
                type="text"
                value={form.addressLine2}
                onChange={handleChange}
                className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="city">
                City / District
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="state">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                required
                value={form.state}
                onChange={handleChange}
                className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="pincode">
                Pincode
              </label>
              <input
                id="pincode"
                name="pincode"
                type="text"
                required
                value={form.pincode}
                onChange={handleChange}
                className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
          </div>

          {/* Document Uploads */}
          <div className="space-y-4">
            <DocumentUpload
              label="Aadhaar Card"
              value={form.aadhaarCard}
              onChange={handleDocumentChange('aadhaarCard')}
              required
              disabled={submitting}
            />

            <DocumentUpload
              label="PAN Card"
              value={form.panCard}
              onChange={handleDocumentChange('panCard')}
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already registered?{' '}
          <button type="button" onClick={onBack} className="font-semibold text-brand underline-offset-2">
            Login here
          </button>
        </p>
      </div>
    </div>
  )
}

