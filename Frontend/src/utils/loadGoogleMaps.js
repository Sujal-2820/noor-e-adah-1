/**
 * Dynamically load Google Maps API script
 * Uses environment variable VITE_GOOGLE_MAPS_API_KEY
 */
export function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.error('Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.')
      reject(new Error('Google Maps API key is not configured'))
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps API')))
      return
    }

    // Create and append script tag
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      resolve()
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'))
    }

    document.head.appendChild(script)
  })
}


