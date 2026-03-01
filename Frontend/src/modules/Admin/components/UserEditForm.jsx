import { useState, useEffect } from 'react'
import { Building2, ArrowLeft, Save, X, MapPin } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function UserEditForm({ user, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      lat: '',
      lng: '',
    },
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        location: {
          address: user.location?.address || '',
          city: user.location?.city || '',
          state: user.location?.state || '',
          pincode: user.location?.pincode || '',
          lat: user.location?.lat || user.location?.coordinates?.lat || '',
          lng: user.location?.lng || user.location?.coordinates?.lng || '',
        },
      })
    }
    setErrors({})
  }, [user])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleLocationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value,
      },
    }))
    if (errors[`location.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`location.${field}`]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Location validation
    if (!formData.location.address.trim()) {
      newErrors['location.address'] = 'Address is required'
    }
    if (!formData.location.city.trim()) {
      newErrors['location.city'] = 'City is required'
    }
    if (!formData.location.state.trim()) {
      newErrors['location.state'] = 'State is required'
    }
    if (!formData.location.pincode.trim()) {
      newErrors['location.pincode'] = 'Pincode is required'
    } else if (!/^\d{6}$/.test(formData.location.pincode.replace(/\D/g, ''))) {
      newErrors['location.pincode'] = 'Please enter a valid 6-digit pincode'
    }
    if (formData.location.lat && (isNaN(parseFloat(formData.location.lat)) || parseFloat(formData.location.lat) < -90 || parseFloat(formData.location.lat) > 90)) {
      newErrors['location.lat'] = 'Please enter a valid latitude (-90 to 90)'
    }
    if (formData.location.lng && (isNaN(parseFloat(formData.location.lng)) || parseFloat(formData.location.lng) < -180 || parseFloat(formData.location.lng) > 180)) {
      newErrors['location.lng'] = 'Please enter a valid longitude (-180 to 180)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3 • User Management</p>
          <h2 className="text-2xl font-bold text-gray-900">Edit User Information</h2>
          <p className="text-sm text-gray-600">
            Update user name, contact number, email address, and location.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Header */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">User ID: {user?.id || user?._id || 'N/A'}</h3>
                <p className="text-sm text-gray-600">Update basic user information</p>
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-bold text-gray-900">
              User Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter user name"
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                errors.name
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                  : 'border-gray-300 bg-white focus:border-green-500 focus:ring-green-500/50',
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-bold text-gray-900">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => {
                // Allow only digits and format
                const value = e.target.value.replace(/\D/g, '')
                if (value.length <= 10) {
                  handleChange('phone', value)
                }
              }}
              placeholder="Enter 10-digit phone number"
              maxLength={10}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                errors.phone
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                  : 'border-gray-300 bg-white focus:border-green-500 focus:ring-green-500/50',
              )}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-gray-900">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter email address"
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2',
                errors.email
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/50'
                  : 'border-gray-300 bg-white focus:border-green-500 focus:ring-green-500/50',
              )}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Location Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Location Information</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                <p>Location details cannot be edited by admin. Users must update their location from their profile.</p>
              </div>
              {/* Address */}
              <div>
                <label htmlFor="address" className="mb-2 block text-sm font-bold text-gray-900">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.location.address}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  placeholder="Enter street address"
                  readOnly
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 bg-gray-100 cursor-not-allowed',
                    errors['location.address']
                      ? 'border-red-300'
                      : 'border-gray-200 text-gray-500',
                  )}
                />
                {errors['location.address'] && <p className="mt-1 text-xs text-red-600">{errors['location.address']}</p>}
              </div>

              {/* City and State */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="mb-2 block text-sm font-bold text-gray-900">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.location.city}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    placeholder="Enter city"
                    readOnly
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 bg-gray-100 cursor-not-allowed',
                      errors['location.city']
                        ? 'border-red-300'
                        : 'border-gray-200 text-gray-500',
                    )}
                  />
                  {errors['location.city'] && <p className="mt-1 text-xs text-red-600">{errors['location.city']}</p>}
                </div>
                <div>
                  <label htmlFor="state" className="mb-2 block text-sm font-bold text-gray-900">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={formData.location.state}
                    onChange={(e) => handleLocationChange('state', e.target.value)}
                    placeholder="Enter state"
                    readOnly
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 bg-gray-100 cursor-not-allowed',
                      errors['location.state']
                        ? 'border-red-300'
                        : 'border-gray-200 text-gray-500',
                    )}
                  />
                  {errors['location.state'] && <p className="mt-1 text-xs text-red-600">{errors['location.state']}</p>}
                </div>
              </div>

              {/* Pincode and Coordinates */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="pincode" className="mb-2 block text-sm font-bold text-gray-900">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    value={formData.location.pincode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      if (value.length <= 6) {
                        handleLocationChange('pincode', value)
                      }
                    }}
                    placeholder="Enter 6-digit pincode"
                    readOnly
                    maxLength={6}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 bg-gray-100 cursor-not-allowed',
                      errors['location.pincode']
                        ? 'border-red-300'
                        : 'border-gray-200 text-gray-500',
                    )}
                  />
                  {errors['location.pincode'] && <p className="mt-1 text-xs text-red-600">{errors['location.pincode']}</p>}
                </div>
                <div>
                  <label htmlFor="lat" className="mb-2 block text-sm font-bold text-gray-900">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    id="lat"
                    step="any"
                    value={formData.location.lat}
                    onChange={(e) => handleLocationChange('lat', e.target.value)}
                    placeholder="e.g., 23.0225"
                    readOnly
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 bg-gray-100 cursor-not-allowed',
                      errors['location.lat']
                        ? 'border-red-300'
                        : 'border-gray-200 text-gray-500',
                    )}
                  />
                  {errors['location.lat'] && <p className="mt-1 text-xs text-red-600">{errors['location.lat']}</p>}
                </div>
                <div>
                  <label htmlFor="lng" className="mb-2 block text-sm font-bold text-gray-900">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    id="lng"
                    step="any"
                    value={formData.location.lng}
                    onChange={(e) => handleLocationChange('lng', e.target.value)}
                    placeholder="e.g., 72.5714"
                    readOnly
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 bg-gray-100 cursor-not-allowed',
                      errors['location.lng']
                        ? 'border-red-300'
                        : 'border-gray-200 text-gray-500',
                    )}
                  />
                  {errors['location.lng'] && <p className="mt-1 text-xs text-red-600">{errors['location.lng']}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

