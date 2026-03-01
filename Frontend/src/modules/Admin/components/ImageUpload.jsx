import { useState, useEffect, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, GripVertical } from 'lucide-react'
import { CLOUDINARY_CONFIG } from '../config/cloudinary'
import { cn } from '../../../lib/cn'

/**
 * Image Upload Component for Product Images
 * Supports up to 4 images with Cloudinary integration
 * 
 * @param {Array} images - Array of existing images {url, publicId, isPrimary, order}
 * @param {Function} onChange - Callback when images change
 * @param {number} maxImages - Maximum number of images (default: 4)
 * @param {boolean} disabled - Disable upload
 */
export function ImageUpload({ images = [], onChange, maxImages = 4, disabled = false }) {
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [error, setError] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const fileInputRefs = useRef({})
  const widgetRefs = useRef({})

  // Load Cloudinary Upload Widget script
  useEffect(() => {
    // Check if script already loaded
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
      // Cleanup on unmount
      const existingScript = document.querySelector('script[src*="upload-widget.cloudinary.com"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  const openUploadWidget = (index) => {
    if (disabled || uploadingIndex !== null) return
    if (!window.cloudinary) {
      setError('Cloudinary Upload Widget is not loaded yet. Please wait a moment and try again.')
      return
    }

    if (!CLOUDINARY_CONFIG.uploadPreset || CLOUDINARY_CONFIG.uploadPreset === 'unsigned') {
      setError('Please configure the Cloudinary upload preset. See CLOUDINARY_SETUP.md for instructions.')
      return
    }

    setUploadingIndex(index)
    setError(null)

    // Cloudinary Upload Widget options with optimization
    const options = {
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: CLOUDINARY_CONFIG.uploadPreset, // Use unsigned preset
      sources: ['local', 'camera', 'url'],
      multiple: false,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      maxFileSize: 5000000, // 5MB
      cropping: true,
      // croppingAspectRatio: 1, // Removed to allow any aspect ratio
      croppingShowDimensions: true,
      croppingDefaultSelectionRatio: 0.9,
      folder: 'canx/products', // Organize images in folder
      transformation: [
        {
          width: 1200,
          height: 1200,
          crop: 'pad',
          background: 'white',
          quality: 'auto:good', // Optimize quality and file size
          fetchFormat: 'auto', // Auto format (webp when supported)
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
        setUploadingIndex(null)

        if (error) {
          console.error('Upload error:', error)
          setError(error.message || 'Failed to upload image. Please try again.')
          return
        }

        if (result && result.event === 'success') {
          const newImage = {
            url: result.info.secure_url,
            publicId: result.info.public_id,
            isPrimary: images.length === 0 && index === 0, // First image is primary
            order: index !== null ? index : images.length,
          }

          const updatedImages = [...images]
          if (index !== null && index < images.length) {
            // Replace existing image
            updatedImages[index] = newImage
          } else {
            // Add new image
            updatedImages.push(newImage)
          }

          // Ensure only one primary image
          const finalImages = updatedImages.map((img, idx) => ({
            ...img,
            isPrimary: idx === 0, // First image is always primary
            order: idx,
          }))

          onChange(finalImages)
          setError(null)
        }
      }
    )

    widgetRefs.current[index] = widget
    widget.open()
  }

  const removeImage = (index) => {
    if (disabled) return

    const updatedImages = images.filter((_, idx) => idx !== index)

    // Ensure first image is primary
    const finalImages = updatedImages.map((img, idx) => ({
      ...img,
      isPrimary: idx === 0,
      order: idx,
    }))

    onChange(finalImages)
  }

  // Drag and drop handlers for reordering images
  const handleDragStart = (e, index) => {
    if (disabled || images.length <= 1) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    // Set opacity on the dragged element
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e) => {
    // Reset opacity
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (draggedIndex === null || draggedIndex === dropIndex || disabled) {
      return
    }

    const updatedImages = [...images]
    const draggedImage = updatedImages[draggedIndex]

    // Remove dragged image from its position
    updatedImages.splice(draggedIndex, 1)

    // Insert at new position
    updatedImages.splice(dropIndex, 0, draggedImage)

    // Update order and primary status
    const finalImages = updatedImages.map((img, idx) => ({
      ...img,
      isPrimary: idx === 0,
      order: idx,
    }))

    onChange(finalImages)
    setDraggedIndex(null)
  }

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-900">
        <ImageIcon className="mr-1 inline h-4 w-4" />
        Product Images
        <span className="text-xs font-normal text-gray-500 ml-2">
          (Max {maxImages} images. First image will be the primary image. Drag images to reorder)
        </span>
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Existing Images */}
        {images.map((image, index) => {
          // Handle both object format {url, publicId} and string format (for backward compatibility)
          const imageUrl = typeof image === 'string' ? image : (image?.url || '')
          if (!imageUrl) return null

          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index

          return (
            <div
              key={index}
              className={cn(
                "relative group transition-all",
                !disabled && images.length > 1 && "cursor-move",
                isDragging && "opacity-50 scale-95",
                isDragOver && "ring-2 ring-purple-500 ring-offset-2 scale-105"
              )}
              draggable={!disabled && images.length > 1}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="relative aspect-square rounded-xl border-2 border-gray-300 overflow-hidden bg-white flex items-center justify-center">
                {!disabled && images.length > 1 && (
                  <div className="absolute top-2 left-2 z-10 p-1.5 bg-gray-800/70 text-white rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0U0RThFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+'
                  }}
                />
                {((typeof image === 'object' && image.isPrimary) || (index === 0)) && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute bottom-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {index === 0 && images.length > 1 && (
                <p className="mt-1 text-xs text-center text-gray-500">Primary</p>
              )}
              {images.length > 1 && !disabled && (
                <p className="mt-1 text-xs text-center text-gray-500">
                  Position {index + 1} • Drag to reorder
                </p>
              )}
            </div>
          )
        })}

        {/* Upload Button */}
        {canAddMore && !disabled && (
          <button
            type="button"
            onClick={() => openUploadWidget(images.length)}
            disabled={uploadingIndex !== null || disabled}
            className={cn(
              'aspect-square rounded-xl border-2 border-dashed transition-all',
              'flex flex-col items-center justify-center gap-2',
              'hover:border-purple-400 hover:bg-purple-50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              uploadingIndex === images.length
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-300 bg-gray-50'
            )}
          >
            {uploadingIndex === images.length ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="text-xs font-semibold text-purple-600">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Add Image</span>
              </>
            )}
          </button>
        )}

        {/* Replace Image Button (for existing slots) */}
        {images.length > 0 && images.length < maxImages && !disabled && (
          <button
            type="button"
            onClick={() => openUploadWidget(images.length)}
            disabled={uploadingIndex !== null || disabled}
            className={cn(
              'aspect-square rounded-xl border-2 border-dashed transition-all',
              'flex flex-col items-center justify-center gap-2',
              'hover:border-purple-400 hover:bg-purple-50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'border-gray-300 bg-gray-50'
            )}
          >
            <Upload className="h-6 w-6 text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">Add Image</span>
          </button>
        )}
      </div>

      {images.length === 0 && !disabled && (
        <p className="text-xs text-gray-500">
          Click the upload button to add product images. The first image will be set as the primary image.
        </p>
      )}
    </div>
  )
}

