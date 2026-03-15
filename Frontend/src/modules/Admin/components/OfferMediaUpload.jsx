import { useState, useEffect, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Video, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { CLOUDINARY_CONFIG } from '../config/cloudinary'

/**
 * Offer Media Upload Component
 * Supports both Image and Video
 * Supports Landscape (Desktop) and Vertical/Horizontal (Smartphone) orientations
 * 
 * @param {string} mediaType - 'image' | 'video'
 * @param {string} url - Existing media URL
 * @param {string} orientation - 'horizontal' | 'vertical'
 * @param {Function} onChange - Callback when media changes (receives URL)
 * @param {boolean} disabled - Disable upload
 */
export function OfferMediaUpload({ 
  mediaType = 'image', 
  url = '', 
  orientation = 'horizontal',
  onChange, 
  disabled = false 
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [mediaUrl, setMediaUrl] = useState(url || '')
  const widgetRef = useRef(null)

  // Load Cloudinary Upload Widget script
  useEffect(() => {
    if (window.cloudinary) return

    const script = document.createElement('script')
    script.src = 'https://upload-widget.cloudinary.com/global/all.js'
    script.async = true
    script.onload = () => console.log('Cloudinary Upload Widget loaded')
    script.onerror = () => setError('Failed to load Cloudinary Upload Widget.')
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src*="upload-widget.cloudinary.com"]')
      if (existingScript) existingScript.remove()
    }
  }, [])

  useEffect(() => {
    setMediaUrl(url || '')
  }, [url])

  const openUploadWidget = () => {
    if (disabled || uploading) return
    if (!window.cloudinary) {
      setError('Cloudinary Widget not loaded yet.')
      return
    }

    const isVideo = mediaType === 'video'
    const isVertical = orientation === 'vertical'
    const uploadPreset = isVideo ? CLOUDINARY_CONFIG.videoPreset : CLOUDINARY_CONFIG.uploadPreset

    if (!uploadPreset || uploadPreset === '') {
      setError(`Cloudinary ${isVideo ? 'video' : 'image'} upload preset is not configured.`)
      setUploading(false)
      return
    }

    setUploading(true)
    setError(null)

    // Ideal ratios:
    // Desktop Carousel: 2.67:1 (1600x600)
    // Mobile Horizontal: 16:9 or 2:1
    // Mobile Vertical: 9:16 (1080x1920) or 4:5
    
    let croppingAspectRatio = 2.67 
    if (isVertical) {
      croppingAspectRatio = 0.5625 // 9:16
    } else if (orientation === 'horizontal' && mediaType === 'image') {
      // For mobile horizontal, maybe use 16:9?
      // But let's stick to a consistent landscape if it's the main carousel
    }

    const options = {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: uploadPreset,
      resourceType: isVideo ? 'video' : 'image',
      sources: ['local', 'camera', 'url'],
      multiple: false,
      maxFileSize: isVideo ? 100000000 : 5000000, // 100MB for video, 5MB for image
      cropping: !isVideo, // Cloudinary widget doesn't support cropping for videos in the same way
      croppingAspectRatio: !isVideo ? croppingAspectRatio : undefined,
      folder: `noor-e-adah/offers/${mediaType}s`,
      clientAllowedFormats: isVideo ? ['mp4', 'mov', 'webm'] : ['jpg', 'jpeg', 'png', 'webp'],
      styles: {
        palette: {
          window: '#FFFFFF',
          windowBorder: '#90A0B3',
          tabIcon: '#6366F1',
          menuIcons: '#5A616A',
          textDark: '#000000',
          textLight: '#FFFFFF',
          link: '#6366F1',
          action: '#4F46E5',
          inactiveTabIcon: '#0E2F5A',
          error: '#F44235',
          inProgress: '#6366F1',
          complete: '#20B832',
          sourceBg: '#F3F4F6',
        },
      },
    }

    const widget = window.cloudinary.createUploadWidget(
      options,
      (error, result) => {
        setUploading(false)
        if (error) {
          setError(error.message || 'Upload failed.')
          return
        }
        if (result && result.event === 'success') {
          const secureUrl = result.info.secure_url
          setMediaUrl(secureUrl)
          onChange(secureUrl)
        }
      }
    )

    widgetRef.current = widget
    widget.open()
  }

  const removeMedia = () => {
    setMediaUrl('')
    onChange('')
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-gray-900 mb-1 capitalize">
        {mediaType === 'video' ? <Video className="mr-1 inline h-4 w-4" /> : <ImageIcon className="mr-1 inline h-4 w-4" />}
        {mediaType} Upload ({orientation}) *
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {mediaUrl ? (
          <div className="relative group max-w-sm">
            <div className={`relative rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-50 shadow-md ${orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'}`}>
              {mediaType === 'video' ? (
                <video 
                  src={mediaUrl} 
                  controls 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={mediaUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              )}
              
              {!disabled && (
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-bold">
              <CheckCircle className="h-3 w-3" />
              <span>Upload Successful</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openUploadWidget}
            disabled={uploading || disabled}
            className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed transition-all ${
              uploading 
              ? 'border-indigo-400 bg-indigo-50/50' 
              : 'border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/30'
            } ${orientation === 'vertical' ? 'w-48 aspect-[9/16]' : 'w-full max-w-md aspect-video'}`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-3" />
                <span className="text-sm font-bold text-indigo-600">Uploading {mediaType}...</span>
              </>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-white shadow-sm mb-4">
                  {mediaType === 'video' ? <Video className="h-8 w-8 text-indigo-500" /> : <Upload className="h-8 w-8 text-indigo-500" />}
                </div>
                <span className="text-sm font-bold text-gray-900">Upload {mediaType}</span>
                <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">
                  {orientation === 'vertical' ? '9:16 Ratio' : 'Landscape'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
        <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
          <AlertCircle className="h-3 w-3 inline mr-1 mb-0.5" />
          <strong>Tip:</strong> For {orientation} {mediaType}s, try to maintain a {orientation === 'vertical' ? '9:16 (1080x1920px)' : '16:9 or 2.67:1'} aspect ratio for the best visual experience on the user app.
        </p>
      </div>
    </div>
  )
}
