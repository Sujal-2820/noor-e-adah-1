import { useState, useEffect, useRef } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle } from 'lucide-react'
import { CLOUDINARY_CONFIG } from '../../Admin/config/cloudinary'
import { cn } from '../../../lib/cn'

/**
 * Document Upload Component for User Documents (Aadhaar, PAN)
 * Uses Cloudinary for document storage
 * Only accepts images (max 2MB)
 * 
 * @param {string} label - Label for the document field
 * @param {string} value - Current document URL (if exists)
 * @param {Function} onChange - Callback when document changes
 * @param {boolean} required - Whether document is required
 * @param {boolean} disabled - Disable upload
 */
export function DocumentUpload({
  label,
  value,
  onChange,
  required = false,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
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
      if (existingScript && !document.querySelectorAll('script[src*="upload-widget.cloudinary.com"]').length > 1) {
        // Only remove if no other components are using it
      }
    }
  }, [])

  const openUploadWidget = () => {
    if (disabled || uploading) return

    if (!window.cloudinary) {
      setError('Cloudinary Upload Widget is not loaded yet. Please wait a moment and try again.')
      return
    }

    // Validate upload preset is configured
    const uploadPreset = CLOUDINARY_CONFIG?.uploadPresetDocuments?.trim() || CLOUDINARY_CONFIG?.uploadPreset?.trim()
    if (!uploadPreset || uploadPreset === '') {
      setError('Upload preset is not configured. Please contact support.')
      console.error('Cloudinary upload preset is missing:', CLOUDINARY_CONFIG)
      return
    }

    setUploading(true)
    setError(null)

    // Cloudinary Upload Widget options for images and PDFs
    const options = {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: uploadPreset, // Use the configured preset
      sources: ['local', 'camera', 'url'], // Support file upload, camera, and web URL
      multiple: false,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'], // Support PDF
      maxFileSize: 5000000, // 5MB max file size
      cropping: false, // No cropping for documents
      folder: 'noor-e-adah/user-documents', // Organize documents in folder
      resourceType: 'auto', // Auto detect resource type (image or raw/pdf)
      showAdvancedOptions: false,
      showCompletedButton: true,
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
          // Handle specific error messages
          const errorMessage = error.message || error.statusText || error.status || ''
          const errorString = String(errorMessage).toLowerCase()

          if (errorString.includes('preset') || errorString.includes('unsigned') ||
            error.status === 'Upload preset not found' ||
            error.statusText === 'Upload preset not found' ||
            errorMessage.includes('Upload preset must be specified')) {
            setError('Upload preset not configured. Please create the preset "canx-international-products" in Cloudinary Dashboard: Settings → Upload → Add upload preset → Name: "canx-international-products" → Signing mode: "Unsigned" → Save')
          } else if (errorString.includes('file size') || errorString.includes('size') || errorString.includes('too large')) {
            setError('File size exceeds 5MB limit. Please upload a smaller document.')
          } else if (errorString.includes('format') || errorString.includes('type') || errorString.includes('not allowed') || errorString.includes('invalid')) {
            setError('Invalid file type. Please upload an image file or PDF.')
          } else {
            setError(error.message || error.statusText || error.status || 'Failed to upload document. Please try again.')
          }
          return
        }

        if (result && result.event === 'success') {
          // Validate file size (5MB = 5000000 bytes)
          if (result.info.bytes > 5000000) {
            setError('File size exceeds 5MB limit. Please upload a smaller document.')
            return
          }

          // Validate formats
          const allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf']
          if (!allowedFormats.includes(result.info.format?.toLowerCase())) {
            setError('Invalid file type. Please upload an image or PDF.')
            return
          }

          const documentData = {
            url: result.info.secure_url,
            publicId: result.info.public_id,
            format: result.info.format,
            size: result.info.bytes,
            uploadedAt: new Date().toISOString(),
          }

          onChange(documentData)
          setError(null)
        } else if (result && result.event === 'close') {
          // User closed the widget without uploading
          setUploading(false)
        } else if (result && result.event === 'queues-end') {
          // Upload queue finished
          setUploading(false)
        }
      }
    )

    widgetRef.current = widget
    widget.open()
  }

  const removeDocument = () => {
    if (disabled) return
    onChange(null)
    setError(null)
  }

  const isPDF = value?.format?.toLowerCase() === 'pdf'
  const isImage = value?.url && value?.format && !isPDF

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {value?.url ? (
        <div className="relative rounded-2xl border border-muted/60 bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
              {isPDF ? (
                <FileText className="h-6 w-6 text-red-500" />
              ) : (
                <img
                  src={value.url}
                  alt={label}
                  className="h-12 w-12 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const fallback = e.target.nextElementSibling
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm font-bold text-surface-foreground truncate uppercase">
                  {isPDF ? 'PDF Document' : 'Image uploaded'}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                {value.size ? `Size: ${(value.size / 1024).toFixed(1)} KB` : ''} • {value.format?.toUpperCase()}
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={removeDocument}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-600 transition-all hover:bg-red-100 hover:border-red-400"
                aria-label="Remove document"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isImage && (
            <div className="mt-3 rounded-lg overflow-hidden border border-muted/40 bg-white">
              <img
                src={value.url}
                alt={label}
                className="w-full h-auto max-h-48 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openUploadWidget}
          disabled={uploading || disabled}
          className={cn(
            'w-full rounded-2xl border border-dashed border-muted/60 bg-white/70 px-4 py-4 text-xs text-muted-foreground',
            'transition-all hover:border-brand hover:bg-brand-soft/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex flex-col items-center justify-center gap-2',
            uploading && 'border-brand bg-brand-soft/30'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span className="font-semibold text-brand">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="font-bold text-gray-700">Upload {label}</span>
              <span className="text-[0.65rem] text-muted-foreground/80 font-medium">
                JPG, PNG or PDF • Max 5MB
              </span>
              <span className="text-[0.65rem] text-muted-foreground/60 mt-1">
                Upload from device, camera, or web URL
              </span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
