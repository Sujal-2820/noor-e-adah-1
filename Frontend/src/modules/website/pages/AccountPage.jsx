import { Layout, Container } from '../components/Layout'
import { useState, useMemo, useEffect } from 'react'
import { useWebsiteState, useWebsiteDispatch } from '../context/WebsiteContext'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useWebsiteApi } from '../hooks/useWebsiteApi'
import { getPrimaryImageUrl } from '../utils/productImages'
import { cn } from '../../../lib/cn'
import { openRazorpayCheckout } from '../../../utils/razorpay'
import * as websiteApi from '../services/websiteApi'
import '../styles/website.css'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: 'Awaiting' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'added_to_cart', label: 'In Cart' },
]

const USER_ORDER_STATUSES = ['awaiting', 'dispatched', 'delivered']
const STATUS_LABELS = {
  awaiting: 'Awaiting',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}
const STATUS_DESCRIPTIONS = {
  awaiting: 'User is confirming stock and assigning a delivery partner.',
  dispatched: 'Order handed over for delivery. Track updates in real time.',
  delivered: 'Order delivered. Complete remaining payment if pending.',
}

const getStatusKey = (status) => {
  if (!status) return 'awaiting'
  const normalized = status.toLowerCase()
  if (normalized === 'delivered') return 'delivered'
  if (normalized === 'shipped' || normalized === 'dispatched') return 'dispatched'
  // pending, paid, processing all map to 'awaiting'
  if (['pending', 'paid', 'processing'].includes(normalized)) return 'awaiting'
  if (normalized.includes('deliver')) return 'delivered'
  if (normalized.includes('dispatch')) return 'dispatched'
  if (normalized.includes('await')) return 'awaiting'
  return normalized
}

const getDisplayStatus = (status) => {
  if (status === 'added_to_cart') return 'In Cart'
  const key = getStatusKey(status)
  return STATUS_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

const formatTimelineTimestamp = (timestamp) => {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return timestamp
  }
}

export function AccountPage() {
  const { profile, authenticated, authLoading } = useWebsiteState()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState(() => {
    if (location.pathname.includes('/orders')) return 'orders'
    if (location.pathname.includes('/addresses')) return 'addresses'
    if (location.pathname.includes('/support')) return 'support'
    return 'profile'
  })

  if (authLoading) {
    return (
      <Layout>
        <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        </Container>
      </Layout>
    )
  }

  if (!authenticated) {
    return (
      <Layout>
        <Container>
          <div className="account-page__not-logged-in">
            <p>Please log in to access your account</p>
            <Link to="/login">Login</Link>
          </div>
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Container className="account-page pt-32 pb-24">
        <div className="account-page__layout">
          {/* Sidebar Navigation - Desktop */}
          <aside className="account-page__sidebar">
            <nav className="account-page__nav">
              <Link
                to="/account/profile"
                className={cn('account-page__nav-link', activeSection === 'profile' && 'account-page__nav-link--active')}
                onClick={() => setActiveSection('profile')}
              >
                Profile
              </Link>
              <Link
                to="/account/orders"
                className={cn('account-page__nav-link', activeSection === 'orders' && 'account-page__nav-link--active')}
                onClick={() => setActiveSection('orders')}
              >
                Orders
              </Link>
              <Link
                to="/account/addresses"
                className={cn('account-page__nav-link', activeSection === 'addresses' && 'account-page__nav-link--active')}
                onClick={() => setActiveSection('addresses')}
              >
                Addresses
              </Link>
              <Link
                to="/account/support"
                className={cn('account-page__nav-link', activeSection === 'support' && 'account-page__nav-link--active')}
                onClick={() => setActiveSection('support')}
              >
                Support
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="account-page__content">
            <Outlet />
          </main>
        </div>
      </Container>
    </Layout>
  )
}

export function AccountProfilePage() {
  const { profile } = useWebsiteState()
  const dispatch = useWebsiteDispatch()
  const { updateUserProfile } = useWebsiteApi()
  const [editingName, setEditingName] = useState(false)
  const [editedName, setEditedName] = useState(profile?.name || '')
  const [showPhoneUpdatePanel, setShowPhoneUpdatePanel] = useState(false)
  const [phoneUpdateStep, setPhoneUpdateStep] = useState(1) // 1: request current OTP, 2: verify current OTP, 3: enter new phone, 4: request new OTP, 5: verify new OTP
  const [currentPhoneOTP, setCurrentPhoneOTP] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPhoneOTP, setNewPhoneOTP] = useState('')
  const [phoneUpdateLoading, setPhoneUpdateLoading] = useState(false)

  // Update edited name when profile changes
  useEffect(() => {
    if (profile?.name) {
      setEditedName(profile.name)
    }
  }, [profile?.name])

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      alert('Name cannot be empty')
      return
    }

    try {
      const result = await updateUserProfile({ name: editedName.trim() })
      setEditingName(false)

      if (result && !result.error && result.data) {
        dispatch({
          type: 'AUTH_LOGIN',
          payload: { ...profile, name: result.data.user?.name || editedName.trim() },
        })
        alert('Name updated successfully')
      } else {
        alert(result?.error?.message || result?.data?.message || 'Failed to update name')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      setEditingName(false)
      alert(error?.error?.message || error?.message || 'Failed to update name')
    }
  }

  return (
    <div className="account-profile">
      <div className="account-profile__header">
        <div className="account-profile__avatar">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="account-profile__info">
          <h2 className="account-profile__name">{profile?.name || 'User'}</h2>
          <p className="account-profile__email">{profile?.email || profile?.phone || 'No contact info'}</p>
        </div>
      </div>

      <div className="account-profile__section">
        <h3 className="account-profile__section-title">Personal Information</h3>

        {/* Name Field */}
        <div className="account-profile__field">
          <label className="account-profile__field-label">Full Name</label>
          <div className="account-profile__field-content">
            {editingName ? (
              <div className="account-profile__field-edit">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="account-profile__field-input"
                  placeholder="Enter your name"
                  autoFocus
                />
                <div className="account-profile__field-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(profile?.name || '')
                      setEditingName(false)
                    }}
                    className="account-profile__field-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="account-profile__field-save"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="account-profile__field-value">{profile?.name || 'Not set'}</span>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="account-profile__field-edit-btn"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Phone Field */}
        <div className="account-profile__field">
          <label className="account-profile__field-label">Phone Number</label>
          <div className="account-profile__field-content">
            <span className="account-profile__field-value">{profile?.phone || 'Not set'}</span>
            <button
              type="button"
              onClick={() => {
                setPhoneUpdateStep(1)
                setShowPhoneUpdatePanel(true)
                setCurrentPhoneOTP('')
                setNewPhone('')
                setNewPhoneOTP('')
              }}
              className="account-profile__field-edit-btn"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Phone Update Panel */}
      {showPhoneUpdatePanel && (
        <div
          className="account-profile__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPhoneUpdatePanel(false)
              setPhoneUpdateStep(1)
              setCurrentPhoneOTP('')
              setNewPhone('')
              setNewPhoneOTP('')
            }
          }}
        >
          <div className="account-profile__panel-content">
            <div className="account-profile__panel-header">
              <h3 className="account-profile__panel-title">Update Phone Number</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneUpdatePanel(false)
                  setPhoneUpdateStep(1)
                  setCurrentPhoneOTP('')
                  setNewPhone('')
                  setNewPhoneOTP('')
                }}
                className="account-profile__panel-close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="account-profile__panel-body">
              {/* Step 1: Request OTP for current phone */}
              {phoneUpdateStep === 1 && (
                <div className="account-profile__panel-step">
                  <div className="account-profile__panel-info">
                    <p>We'll send an OTP to your current phone number <strong>{profile?.phone}</strong> to verify your identity.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setPhoneUpdateLoading(true)
                      try {
                        const result = await websiteApi.requestOTPForCurrentPhone()
                        if (result.success) {
                          alert('OTP sent to your current phone number')
                          setPhoneUpdateStep(2)
                        } else {
                          alert(result.message || 'Failed to send OTP')
                        }
                      } catch (error) {
                        console.error('Error requesting OTP:', error)
                        alert(error.error?.message || 'Failed to send OTP')
                      } finally {
                        setPhoneUpdateLoading(false)
                      }
                    }}
                    disabled={phoneUpdateLoading}
                    className="account-profile__panel-button"
                  >
                    {phoneUpdateLoading ? 'Sending...' : 'Send OTP to Current Phone'}
                  </button>
                </div>
              )}

              {/* Step 2: Verify OTP for current phone */}
              {phoneUpdateStep === 2 && (
                <div className="account-profile__panel-step">
                  <div className="account-profile__panel-info">
                    <p>Enter the OTP sent to <strong>{profile?.phone}</strong></p>
                  </div>
                  <input
                    type="text"
                    value={currentPhoneOTP}
                    onChange={(e) => setCurrentPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="account-profile__panel-input"
                  />
                  <div className="account-profile__panel-actions">
                    <button
                      type="button"
                      onClick={() => setPhoneUpdateStep(1)}
                      className="account-profile__panel-button account-profile__panel-button--secondary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentPhoneOTP || currentPhoneOTP.length !== 6) {
                          alert('Please enter a valid 6-digit OTP')
                          return
                        }
                        setPhoneUpdateLoading(true)
                        try {
                          const result = await websiteApi.verifyOTPForCurrentPhone({ otp: currentPhoneOTP })
                          if (result.success) {
                            alert('Current phone verified successfully')
                            setPhoneUpdateStep(3)
                          } else {
                            alert(result.message || 'Invalid OTP')
                          }
                        } catch (error) {
                          console.error('Error verifying OTP:', error)
                          alert(error.error?.message || 'Invalid OTP')
                        } finally {
                          setPhoneUpdateLoading(false)
                        }
                      }}
                      disabled={phoneUpdateLoading || !currentPhoneOTP || currentPhoneOTP.length !== 6}
                      className="account-profile__panel-button"
                    >
                      {phoneUpdateLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Enter new phone number */}
              {phoneUpdateStep === 3 && (
                <div className="account-profile__panel-step">
                  <div className="account-profile__panel-info">
                    <p>Current phone verified! Now enter your new phone number.</p>
                  </div>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter new phone number"
                    className="account-profile__panel-input"
                  />
                  <div className="account-profile__panel-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneUpdateStep(2)
                        setNewPhone('')
                      }}
                      className="account-profile__panel-button account-profile__panel-button--secondary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newPhone || newPhone.length < 10) {
                          alert('Please enter a valid phone number')
                          return
                        }
                        if (newPhone === profile?.phone) {
                          alert('New phone number must be different from current phone number')
                          return
                        }
                        setPhoneUpdateLoading(true)
                        try {
                          const result = await websiteApi.requestOTPForNewPhone({ newPhone })
                          if (result.success) {
                            alert('OTP sent to your new phone number')
                            setPhoneUpdateStep(4)
                          } else {
                            alert(result.message || 'Failed to send OTP')
                          }
                        } catch (error) {
                          console.error('Error requesting OTP:', error)
                          alert(error.error?.message || 'Failed to send OTP')
                        } finally {
                          setPhoneUpdateLoading(false)
                        }
                      }}
                      disabled={phoneUpdateLoading || !newPhone || newPhone.length < 10}
                      className="account-profile__panel-button"
                    >
                      {phoneUpdateLoading ? 'Sending...' : 'Send OTP to New Phone'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Verify OTP for new phone */}
              {phoneUpdateStep === 4 && (
                <div className="account-profile__panel-step">
                  <div className="account-profile__panel-info">
                    <p>Enter the OTP sent to <strong>{newPhone}</strong></p>
                  </div>
                  <input
                    type="text"
                    value={newPhoneOTP}
                    onChange={(e) => setNewPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="account-profile__panel-input"
                  />
                  <div className="account-profile__panel-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneUpdateStep(3)
                        setNewPhoneOTP('')
                      }}
                      className="account-profile__panel-button account-profile__panel-button--secondary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newPhoneOTP || newPhoneOTP.length !== 6) {
                          alert('Please enter a valid 6-digit OTP')
                          return
                        }
                        setPhoneUpdateLoading(true)
                        try {
                          const result = await websiteApi.verifyOTPForNewPhone({ otp: newPhoneOTP })
                          if (result.success) {
                            alert('Phone number updated successfully')
                            dispatch({
                              type: 'AUTH_LOGIN',
                              payload: { ...profile, phone: result.data?.user?.phone || newPhone },
                            })
                            setShowPhoneUpdatePanel(false)
                            setPhoneUpdateStep(1)
                            setCurrentPhoneOTP('')
                            setNewPhone('')
                            setNewPhoneOTP('')
                          } else {
                            alert(result.message || 'Invalid OTP')
                          }
                        } catch (error) {
                          console.error('Error verifying OTP:', error)
                          alert(error.error?.message || 'Invalid OTP')
                        } finally {
                          setPhoneUpdateLoading(false)
                        }
                      }}
                      disabled={phoneUpdateLoading || !newPhoneOTP || newPhoneOTP.length !== 6}
                      className="account-profile__panel-button"
                    >
                      {phoneUpdateLoading ? 'Updating...' : 'Update Phone Number'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AccountAddressesPage() {
  const { addresses } = useWebsiteState()
  const dispatch = useWebsiteDispatch()
  const { addAddress, deleteAddress, setDefaultAddress } = useWebsiteApi()

  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  })

  // Show form if no addresses exist
  useEffect(() => {
    if (addresses.length === 0) {
      setIsAdding(true)
    } else {
      setIsAdding(false)
    }
  }, [addresses.length])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // If it's the first address, make it default regardless of checkbox
      const dataToSubmit = {
        ...formData,
        isDefault: addresses.length === 0 ? true : formData.isDefault,
      }
      const result = await addAddress(dataToSubmit)
      if (result.data) {
        // Success handled by hook dispatching ADD_ADDRESS
        setIsAdding(false)
        setFormData({ name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false })
      }
    } catch (err) {
      console.error('Error adding address:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    await deleteAddress(id)
  }

  const handleSetDefault = async (id) => {
    await setDefaultAddress(id)
  }

  return (
    <div className="account-addresses">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="account-addresses__title">Delivery Addresses</h2>
          <p className="account-addresses__description">Manage your delivery addresses for faster checkout.</p>
        </div>
        {addresses.length > 0 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="account-support__button !mt-0"
          >
            Add New Address
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="account-addresses__form-container">
          <h3 className="text-xl font-bold mb-6">{addresses.length === 0 ? 'Set Your First Address' : 'Add New Address'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="account-addresses__form-grid">
              <div className="account-addresses__form-group">
                <label className="account-addresses__form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="account-addresses__form-input"
                  placeholder="Receiver's name"
                />
              </div>
              <div className="account-addresses__form-group">
                <label className="account-addresses__form-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="account-addresses__form-input"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div className="account-addresses__form-group account-addresses__form-group--full">
                <label className="account-addresses__form-label">Address (House No, Building, Street, Area)</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="account-addresses__form-input"
                  placeholder="Complete address details"
                />
              </div>
              <div className="account-addresses__form-group">
                <label className="account-addresses__form-label">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="account-addresses__form-input"
                  placeholder="City"
                />
              </div>
              <div className="account-addresses__form-group">
                <label className="account-addresses__form-label">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className="account-addresses__form-input"
                  placeholder="State"
                />
              </div>
              <div className="account-addresses__form-group">
                <label className="account-addresses__form-label">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  required
                  className="account-addresses__form-input"
                  placeholder="6-digit pincode"
                />
              </div>
              {addresses.length > 0 && (
                <div className="account-addresses__form-group account-addresses__form-checkbox">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-green-600"
                  />
                  <label htmlFor="isDefault" className="text-sm font-semibold cursor-pointer">Set as default address</label>
                </div>
              )}
            </div>

            <div className="account-addresses__form-actions">
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-3 font-semibold text-brand hover:text-accent transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="account-support__button !mt-0 px-12"
              >
                {loading ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="account-addresses__list">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={cn(
                'account-addresses__card',
                addr.isDefault && 'account-addresses__card--default'
              )}
            >
              {addr.isDefault && <span className="account-addresses__card-label">Default Address</span>}
              <h3 className="account-addresses__card-name">{addr.name}</h3>
              <p className="account-addresses__card-text">{addr.address}</p>
              <p className="account-addresses__card-text">{addr.city}, {addr.state} - {addr.pincode}</p>
              <p className="account-addresses__card-text">Phone: {addr.phone}</p>

              <div className="account-addresses__card-actions">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="account-addresses__action-btn"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="account-addresses__action-btn account-addresses__action-btn--delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setIsAdding(true)}
            className="account-addresses__add-btn"
          >
            <div className="p-3 bg-brand/5 rounded-full mb-2">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-bold text-sm uppercase tracking-wider">Add Another Address</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function AccountSupportPage() {
  return (
    <div className="account-support">
      <h2 className="account-support__title">Support & Help</h2>
      <div className="account-support__sections">
        <div className="account-support__section">
          <h3 className="account-support__section-title">Help Center</h3>
          <p className="account-support__section-text">
            Browse FAQs and guides to find answers to common questions.
          </p>
          <button className="account-support__button">Visit Help Center</button>
        </div>
        <div className="account-support__section">
          <h3 className="account-support__section-title">Contact Support</h3>
          <p className="account-support__section-text">
            <strong>Phone:</strong> +91 1800-XXX-XXXX
          </p>
          <p className="account-support__section-text">
            <strong>Email:</strong> support@nooreadah.com
          </p>
          <p className="account-support__section-text">
            <strong>Hours:</strong> Mon-Sat, 9 AM - 6 PM
          </p>
        </div>
      </div>
    </div>
  )
}

export function AccountOrdersPage() {
  const navigate = useNavigate()
  const { orders, cart } = useWebsiteState()
  const { createRemainingPaymentIntent, confirmRemainingPayment, downloadInvoice, loading } = useWebsiteApi()
  const [activeFilter, setActiveFilter] = useState('all')
  const [processingPayment, setProcessingPayment] = useState(null)

  // Combine orders and cart items
  const allItems = useMemo(() => {
    const orderItems = orders.map((order) => {
      const normalizedStatus = getStatusKey(order.status)
      return {
        ...order,
        type: 'order',
        status: normalizedStatus,
        statusTimeline: order.statusTimeline || [],
      }
    })

    // Add cart items as "added_to_cart" status
    const cartItems = cart.length > 0
      ? [
        {
          id: 'cart',
          type: 'cart',
          status: 'added_to_cart',
          date: new Date().toISOString(),
          items: cart,
          total: cart.reduce((sum, item) => {
            const price = item.unitPrice || item.price || 0
            return sum + price * item.quantity
          }, 0),
          paymentStatus: 'pending',
        },
      ]
      : []

    return [...cartItems, ...orderItems]
  }, [orders, cart])

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return allItems
    }
    if (activeFilter === 'added_to_cart') {
      return allItems.filter((item) => item.status === 'added_to_cart')
    }
    return allItems.filter((item) => item.status === activeFilter)
  }, [allItems, activeFilter])

  const getStatusIcon = (status) => {
    if (status === 'added_to_cart') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    }
    const key = getStatusKey(status)
    if (key === 'awaiting') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (key === 'dispatched') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (key === 'delivered') {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  }

  const getStatusColor = (status) => {
    if (status === 'added_to_cart') return 'bg-blue-100 text-blue-700'
    const key = getStatusKey(status)
    if (key === 'awaiting') return 'bg-yellow-100 text-yellow-700'
    if (key === 'dispatched') return 'bg-indigo-100 text-indigo-700'
    if (key === 'delivered') return 'bg-green-100 text-[#1b8f5b]'
    return 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const handlePayRemaining = async (order) => {
    if (!order || !order.id) {
      alert('Invalid order')
      return
    }

    setProcessingPayment(order.id)

    try {
      // Create remaining payment intent
      const paymentIntentResult = await createRemainingPaymentIntent(order.id, 'razorpay')

      if (paymentIntentResult.error) {
        alert(paymentIntentResult.error.message || 'Failed to initialize payment')
        setProcessingPayment(null)
        return
      }

      const { paymentIntent } = paymentIntentResult.data
      const { razorpayOrderId, keyId, amount } = paymentIntent

      // Open Razorpay Checkout for remaining payment
      try {
        const razorpayResponse = await openRazorpayCheckout({
          key: keyId,
          amount: amount,
          currency: 'INR',
          order_id: razorpayOrderId,
          name: 'Satpura Bio',
          description: `Remaining payment for Order ${order.orderNumber || order.id}`,
          prefill: {
            name: order.userName || '',
            email: order.userEmail || '',
            contact: order.userPhone || '',
          },
        })

        // Confirm remaining payment with Razorpay response
        const confirmResult = await confirmRemainingPayment({
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          gatewayPaymentId: razorpayResponse.paymentId,
          gatewayOrderId: razorpayResponse.orderId,
          gatewaySignature: razorpayResponse.signature,
          paymentMethod: 'razorpay',
        })

        if (confirmResult.error) {
          alert(confirmResult.error.message || 'Payment failed')
          setProcessingPayment(null)
          return
        }

        alert(`Remaining payment of ₹${amount.toLocaleString('en-IN')} completed successfully!`)
        setProcessingPayment(null)
      } catch (razorpayError) {
        if (razorpayError.error) {
          alert(razorpayError.error || 'Payment was cancelled or failed')
        } else {
          alert('Payment was cancelled')
        }
        setProcessingPayment(null)
      }
    } catch (error) {
      console.error('Error processing remaining payment:', error)
      alert(error.message || 'An error occurred while processing payment')
      setProcessingPayment(null)
    }
  }

  const renderStatusTracker = (item) => {
    if (item.type !== 'order') return null
    const currentStatus = getStatusKey(item.status)
    const currentIndex = USER_ORDER_STATUSES.indexOf(currentStatus)
    return (
      <div className="account-orders__tracker">
        {USER_ORDER_STATUSES.map((status, index) => {
          const timelineEntry = item.statusTimeline?.find((entry) => entry.status === status)
          return (
            <div
              key={`${item.id}-${status}`}
              className={cn(
                'account-orders__tracker-step',
                index <= currentIndex && 'account-orders__tracker-step--active',
              )}
            >
              <span className="account-orders__tracker-step-index">{index + 1}</span>
              <div className="account-orders__tracker-step-body">
                <p className="account-orders__tracker-step-title">{STATUS_LABELS[status]}</p>
                <p className="account-orders__tracker-step-desc">{STATUS_DESCRIPTIONS[status]}</p>
                {timelineEntry?.timestamp && (
                  <p className="account-orders__tracker-step-time">
                    {formatTimelineTimestamp(timelineEntry.timestamp)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="account-orders">
      <div className="account-orders__header">
        <h2 className="account-orders__title">My Orders</h2>
      </div>

      {/* Filter Tabs */}
      <div className="account-orders__filters">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'account-orders__filter-tab',
              activeFilter === tab.id && 'account-orders__filter-tab--active'
            )}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="account-orders__list">
        {filteredItems.length === 0 ? (
          <div className="account-orders__empty">
            <p className="account-orders__empty-text">No orders found</p>
            {activeFilter === 'added_to_cart' && (
              <Link to="/cart" className="account-orders__empty-link">
                View Cart
              </Link>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="account-orders__card">
              <div className="account-orders__card-header">
                <div className="account-orders__card-header-left">
                  <div className="account-orders__card-id">
                    {item.type === 'cart' ? 'Cart' : `Order #${item.orderNumber || item.id?.slice(-8) || 'N/A'}`}
                  </div>
                  <div className="account-orders__card-date">{formatDate(item.date)}</div>
                </div>
                <div className={cn('account-orders__card-status', getStatusColor(item.status))}>
                  {getStatusIcon(item.status)}
                  <span className="account-orders__card-status-text">
                    {getDisplayStatus(item.status)}
                  </span>
                </div>
              </div>

              {renderStatusTracker(item)}

              <div className="account-orders__card-items">
                {item.items?.map((orderItem, index) => {
                  const variantAttrs = orderItem.variantAttributes || {}
                  const variantKeys = Object.keys(variantAttrs)
                  const hasVariants = variantKeys.length > 0
                  const productName = orderItem.productName || orderItem.name || (orderItem.product?.name || 'Product')
                  const unitPrice = orderItem.unitPrice || orderItem.price || 0

                  return (
                    <div key={index} className="account-orders__card-item">
                      <div className="account-orders__card-item-image">
                        <img
                          src={orderItem.product ? getPrimaryImageUrl(orderItem.product) : (orderItem.image || 'https://via.placeholder.com/60')}
                          alt={productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="account-orders__card-item-details">
                        <h4 className="account-orders__card-item-name">{productName}</h4>
                        {hasVariants && (
                          <div className="account-orders__card-item-variants">
                            {variantKeys.map((key) => (
                              <span key={key} className="text-xs text-gray-600">
                                {key}: {variantAttrs[key]}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="account-orders__card-item-meta">
                          <span className="account-orders__card-item-quantity">
                            Qty: {orderItem.quantity}
                          </span>
                          <span className="account-orders__card-item-price">
                            ₹{unitPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="account-orders__card-footer">
                {/* Order Amount Breakdown */}
                <div className="account-orders__card-summary">
                  {item.subtotal !== undefined && (
                    <div className="account-orders__card-summary-row">
                      <span>Subtotal:</span>
                      <span>₹{item.subtotal?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  )}
                  {item.deliveryCharge !== undefined && item.deliveryCharge > 0 && (
                    <div className="account-orders__card-summary-row">
                      <span>Delivery:</span>
                      <span>₹{item.deliveryCharge?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  )}
                  <div className="account-orders__card-summary-row account-orders__card-summary-row--total">
                    <span>Total:</span>
                    <span>₹{(item.totalAmount || item.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Payment Status */}
                {item.paymentStatus && !['completed', 'paid', 'fully_paid', 'completed'].includes(item.paymentStatus.toLowerCase()) && (
                  <div className="account-orders__card-payment">
                    {item.paymentPreference === 'partial' && item.upfrontAmount !== undefined && (
                      <div className="account-orders__card-summary-row">
                        <span>Advance (30%):</span>
                        <span className="text-green-600">₹{item.upfrontAmount?.toLocaleString('en-IN') || '0'}</span>
                      </div>
                    )}
                    {item.paymentPreference === 'partial' && item.remainingAmount !== undefined && (
                      <div className="account-orders__card-summary-row">
                        <span>Remaining (70%):</span>
                        <span className={cn(
                          item.paymentStatus === 'partial_paid' ? 'text-orange-600' : 'text-red-600'
                        )}>
                          ₹{item.remainingAmount?.toLocaleString('en-IN') || '0'}
                        </span>
                      </div>
                    )}
                    <div className="account-orders__card-summary-row">
                      <span>Payment Status:</span>
                      <span className={cn(
                        'font-semibold',
                        item.paymentStatus === 'partial_paid' && 'text-orange-600',
                        item.paymentStatus === 'pending' && 'text-red-600',
                        item.paymentStatus === 'completed' && 'text-green-600'
                      )}>
                        {item.paymentStatus === 'partial_paid'
                          ? 'Partial Paid'
                          : item.paymentStatus === 'pending'
                            ? 'Pending'
                            : item.paymentStatus === 'completed'
                              ? 'Paid'
                              : item.paymentStatus}
                      </span>
                    </div>
                  </div>
                )}

                {item.type === 'order' && (
                  <button
                    type="button"
                    onClick={() => downloadInvoice(item.id || item._id)}
                    disabled={loading}
                    className="account-orders__invoice-btn"
                  >
                    {loading ? 'Generating...' : 'Download Invoice'}
                  </button>
                )}

                {/* Pay Remaining Button */}
                {item.status === 'delivered' && item.paymentStatus === 'partial_paid' && (item.remainingAmount || item.remaining) > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePayRemaining(item)}
                    disabled={processingPayment === item.id}
                    className="account-orders__pay-button"
                  >
                    {processingPayment === item.id
                      ? 'Processing...'
                      : `Pay Remaining ₹${((item.remainingAmount || item.remaining) || 0).toLocaleString('en-IN')}`}
                  </button>
                )}

                {/* View Cart Button for cart items */}
                {item.type === 'cart' && (
                  <Link to="/cart" className="account-orders__view-cart-button">
                    View Cart
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
