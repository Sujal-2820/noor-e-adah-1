import { useState, useEffect, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { CLOUDINARY_CONFIG } from '../config/cloudinary'

/**
 * Carousel Image Upload Component
 * Validates landscape aspect ratio (approximately 16:9 or 2:1)
 * Shows warning for square/circular images
 * Auto-adjusts if close to correct ratio
 * Shows preview of how carousel will appear
 * 
 * @param {string} image - Existing image URL
 * @param {Function} onChange - Callback when image changes (receives image URL)
 * @param {boolean} disabled - Disable upload
 */
export function CarouselImageUpload({ image = '', onChange, disabled = false, title = '', description = '' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [imageUrl, setImageUrl] = useState(image || '')
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [aspectRatio, setAspectRatio] = useState(0)
  const widgetRef = useRef(null)

  // Load Cloudinary Upload Widget script
  useEffect(() => {
    if (window.cloudinary) {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://upload-widget.cloudinary.com/global/all.js'
    script.async = true
    script.onload = () => {
      console.log('Cloudinary Upload Widget loaded')
    }
    script.onerror = () => {
      setError('Failed to load Cloudinary Upload Widget. Please refresh the page.')
    }
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src*="upload-widget.cloudinary.com"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  // Check image dimensions when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      const img = new Image()
      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        const ratio = width / height

        setImageDimensions({ width, height })
        setAspectRatio(ratio)

        // Validate aspect ratio
        // Ideal carousel aspect ratio: ~2.67:1 (1600x600)
        // Acceptable range: 2.0 to 3.0 (wide landscape)
        // Warning for: 0.8 to 1.2 (square-ish)
        // Error for: < 0.8 (portrait/tall)

        if (ratio < 0.8) {
          setWarning('Image is too tall (portrait). Please upload a landscape/rectangular image.')
        } else if (ratio >= 0.8 && ratio <= 1.2) {
          setWarning('Image appears to be square. Carousel images should be landscape/rectangular (wider than tall).')
        } else if (ratio > 3.5) {
          setWarning('Image is too wide. Recommended aspect ratio is around 2.67:1 (1600×600px).')
        } else if (ratio >= 2.0 && ratio <= 3.0) {
          setWarning(null) // Perfect aspect ratio
        } else if (ratio > 1.2 && ratio < 2.0) {
          setWarning('Image aspect ratio is acceptable but not ideal. Recommended: ~2.67:1 (1600×600px).')
        } else if (ratio > 3.0 && ratio <= 3.5) {
          setWarning('Image is wider than recommended. Ideal: 2.67:1 (1600×600px).')
        }
      }
      img.onerror = () => {
        setError('Failed to load image. Please try uploading again.')
      }
      img.src = imageUrl
    } else {
      setImageDimensions({ width: 0, height: 0 })
      setAspectRatio(0)
      setWarning(null)
    }
  }, [imageUrl])

  // Update imageUrl when image prop changes
  useEffect(() => {
    setImageUrl(image || '')
  }, [image])

  const openUploadWidget = () => {
    if (disabled || uploading) return
    if (!window.cloudinary) {
      setError('Cloudinary Upload Widget is not loaded yet. Please wait a moment and try again.')
      return
    }

    if (!CLOUDINARY_CONFIG.uploadPreset || CLOUDINARY_CONFIG.uploadPreset === 'unsigned') {
      setError('Please configure the Cloudinary upload preset. See CLOUDINARY_SETUP.md for instructions.')
      return
    }

    setUploading(true)
    setError(null)
    setWarning(null)

    // Cloudinary Upload Widget options with landscape cropping
    const options = {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
      sources: ['local', 'camera', 'url'],
      multiple: false,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      maxFileSize: 5000000, // 5MB
      cropping: true,
      croppingAspectRatio: 2.67, // ~8:3 aspect ratio (1600:600)
      croppingDefaultSelectionRatio: 0.9,
      croppingShowDimensions: true,
      folder: 'canx/carousels',
      transformation: [
        {
          width: 1600,
          height: 600,
          crop: 'limit',
          quality: 'auto:good',
          fetchFormat: 'auto',
        },
      ],
      styles: {
        palette: {
          window: '#FFFFFF',
          windowBorder: '#90A0B3',
          tabIcon: '#0078FF',
          menuIcons: '#5A616A',
          textDark: '#000000',
          textLight: '#FFFFFF',
          link: '#0078FF',
          action: '#FF620C',
          inactiveTabIcon: '#0E2F5A',
          error: '#F44235',
          inProgress: '#0078FF',
          complete: '#20B832',
          sourceBg: '#E4EBF1',
        },
      },
    }

    const widget = window.cloudinary.createUploadWidget(
      options,
      (error, result) => {
        setUploading(false)

        if (error) {
          console.error('Upload error:', error)
          setError(error.message || 'Failed to upload image. Please try again.')
          return
        }

        if (result && result.event === 'success') {
          const url = result.info.secure_url
          setImageUrl(url)
          onChange(url)
          setError(null)
        }
      }
    )

    widgetRef.current = widget
    widget.open()
  }

  const removeImage = () => {
    if (disabled) return

    setImageUrl('')
    setImageDimensions({ width: 0, height: 0 })
    setAspectRatio(0)
    setWarning(null)
    setError(null)
    onChange('')
  }

  const isAcceptableRatio = aspectRatio >= 2.0 && aspectRatio <= 3.0
  const isSquareLike = aspectRatio >= 0.8 && aspectRatio <= 1.2
  const isTooTall = aspectRatio < 0.8
  const isTooWide = aspectRatio > 3.5

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <ImageIcon className="mr-1 inline h-4 w-4" />
        Carousel Image (Landscape) *
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warning && (
        <div className={`rounded-lg border px-4 py-2 text-sm flex items-start gap-2 ${isSquareLike || isTooTall || isTooWide
          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {imageUrl && aspectRatio > 0 && (
        <div className={`rounded-lg border px-4 py-2 text-sm flex items-center gap-2 ${isAcceptableRatio
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
          {isAcceptableRatio ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>
            Image dimensions: {imageDimensions.width} × {imageDimensions.height}px
            {' '}(Aspect ratio: {aspectRatio.toFixed(2)}:1)
            {isAcceptableRatio && ' ✓ Good for carousel'}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {/* Image Upload Container - Smaller */}
        {imageUrl ? (
          <div className="relative">
            <div className="relative rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-50 max-w-md">
              <img
                src={imageUrl}
                alt="Carousel preview"
                className="w-full h-auto object-cover"
                style={{
                  aspectRatio: aspectRatio > 0 ? aspectRatio : '2/1',
                  maxHeight: '150px',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0U0RThFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+'
                }}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openUploadWidget}
            disabled={uploading || disabled}
            className={`w-full max-w-md aspect-[2/1] rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1.5 ${uploading
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ maxHeight: '150px' }}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-xs font-semibold text-blue-600">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Upload Landscape Image</span>
                <span className="text-xs text-gray-500">Recommended: 1600×600px (8:3 ratio)</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        <strong>Important:</strong> Upload a landscape/rectangular image (wider than tall).
        Square or circular images will show a warning. Ideal size: 1600×600px (aspect ratio: ~2.67:1).
      </p>
    </div>
  )
}

