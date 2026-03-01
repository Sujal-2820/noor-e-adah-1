import { useState, useRef, useEffect } from 'react'
import { MapPin, X, Navigation } from 'lucide-react'

/**
 * Google Maps Location Picker Component
 * 
 * Allows users to select a location using:
 * 1. Google Maps Place Autocomplete (manual input)
 * 2. Browser Geolocation API (live location)
 * 
 * @param {Object} props
 * @param {Function} props.onLocationSelect - Callback when location is selected
 * @param {Object} props.initialLocation - Initial location data (optional)
 * @param {boolean} props.required - Whether location selection is required
 * @param {string} props.label - Label for the location picker
 */
export function GoogleMapsLocationPicker({ 
  onLocationSelect, 
  initialLocation = null,
  required = false,
  label = 'Select Location'
}) {
  const [searchQuery, setSearchQuery] = useState(initialLocation?.address || '')
  const [selectedLocation, setSelectedLocation] = useState(initialLocation)
  const [autocomplete, setAutocomplete] = useState(null)
  const [error, setError] = useState(null)
  const [isGettingLiveLocation, setIsGettingLiveLocation] = useState(false)
  
  const searchInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    if (!window.google || !searchInputRef.current) return

    try {
      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'in' }, // Restrict to India
          fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
        }
      )

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace()
        
        if (!place.geometry || !place.geometry.location) {
          setError('Please select a valid location from the suggestions')
          return
        }

        // Extract address components
        const addressComponents = place.address_components || []
        let city = ''
        let state = ''
        let pincode = ''
        let address = place.formatted_address || ''

        addressComponents.forEach(component => {
          const types = component.types
          
          if (types.includes('locality') || types.includes('sublocality')) {
            city = component.long_name
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name
          } else if (types.includes('postal_code')) {
            pincode = component.long_name
          }
        })

        const location = {
          address: address,
          city: city,
          state: state,
          pincode: pincode,
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          placeId: place.place_id,
        }

        setSelectedLocation(location)
        setSearchQuery(address)
        setError(null)

        // Notify parent component
        onLocationSelect?.(location)
      })

      setAutocomplete(autocompleteInstance)
      autocompleteRef.current = autocompleteInstance
    } catch (err) {
      console.error('Error initializing Google Maps:', err)
      setError('Failed to load Google Maps. Please refresh the page.')
    }
  }, [])

  // Handle Live Location using Browser Geolocation API
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLiveLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          // Use Google Maps Geocoding API to get address from coordinates
          if (!window.google) {
            setError('Google Maps API not loaded. Please refresh the page.')
            setIsGettingLiveLocation(false)
            return
          }

          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode(
            { location: { lat, lng } },
            (results, status) => {
              setIsGettingLiveLocation(false)
              
              if (status === 'OK' && results[0]) {
                const place = results[0]
                const addressComponents = place.address_components || []
                let city = ''
                let state = ''
                let pincode = ''
                const address = place.formatted_address || ''

                addressComponents.forEach(component => {
                  const types = component.types
                  if (types.includes('locality') || types.includes('sublocality')) {
                    city = component.long_name
                  } else if (types.includes('administrative_area_level_1')) {
                    state = component.long_name
                  } else if (types.includes('postal_code')) {
                    pincode = component.long_name
                  }
                })

                const location = {
                  address: address,
                  city: city,
                  state: state,
                  pincode: pincode,
                  coordinates: {
                    lat: lat,
                    lng: lng,
                  },
                }

                setSelectedLocation(location)
                setSearchQuery(address)
                setError(null)
                onLocationSelect?.(location)
              } else {
                setError('Could not find address for your location. Please try searching manually.')
              }
            }
          )
        } catch (err) {
          setIsGettingLiveLocation(false)
          setError('Failed to get your location. Please try searching manually.')
          console.error('Error getting live location:', err)
        }
      },
      (error) => {
        setIsGettingLiveLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location access denied. Please allow location access or search manually.')
            break
          case error.POSITION_UNAVAILABLE:
            setError('Location unavailable. Please try searching manually.')
            break
          case error.TIMEOUT:
            setError('Location request timed out. Please try again or search manually.')
            break
          default:
            setError('Error getting your location. Please try searching manually.')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleClear = () => {
    setSelectedLocation(null)
    setSearchQuery('')
    if (searchInputRef.current) {
      searchInputRef.current.value = ''
    }
    onLocationSelect?.(null)
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="space-y-2">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your address or use live location..."
            className={`w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 pl-10 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all ${selectedLocation ? 'pr-32' : 'pr-28'}`}
            required={required}
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          
          {/* Clear Button - Only show when location is selected */}
          {selectedLocation && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-28 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Clear location"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Live Location Button */}
          <button
            type="button"
            onClick={handleLiveLocation}
            disabled={isGettingLiveLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium whitespace-nowrap"
            title="Use your current location"
          >
            <Navigation className={`h-3.5 w-3.5 ${isGettingLiveLocation ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGettingLiveLocation ? 'Getting...' : 'Live Location'}</span>
            <span className="sm:hidden">{isGettingLiveLocation ? '...' : 'Live'}</span>
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <p className="text-xs text-gray-500">
          💡 You can either search for an address or click "Live Location" to use your current location
        </p>
      </div>
    </div>
  )
}

