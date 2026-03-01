/**
 * Cloudinary Configuration
 * 
 * Configuration for Cloudinary image uploads
 * Credentials from SETUP_SUMMARY.md
 */

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dhmtagkyz',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '883114994776468',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'canx-products', // Unsigned upload preset name (must be created in Cloudinary Dashboard)
  // To create the unsigned upload preset:
  // 1. Go to Cloudinary Dashboard > Settings > Upload
  // 2. Click "Add upload preset"
  // 3. Name it "canx-products"
  // 4. Set "Signing mode" to "Unsigned"
  // 5. Set folder to "canx/products"
  // 6. Enable "Use filename" and "Unique filename"
  // 7. Add transformation: width: 800, height: 800, crop: limit, quality: auto
}

/**
 * Cloudinary Upload Widget Options
 * Optimized for product images with compression and transformation
 */
export const UPLOAD_WIDGET_OPTIONS = {
  cloudName: CLOUDINARY_CONFIG.cloudName,
  uploadPreset: 'unsigned', // Use unsigned preset for client-side uploads
  sources: ['local', 'camera', 'url'],
  multiple: false, // Upload one at a time for better control
  maxFiles: 4, // Maximum 4 images per product
  clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  maxFileSize: 5000000, // 5MB max file size
  cropping: true, // Enable cropping
  croppingAspectRatio: 1, // Square images (1:1 ratio)
  croppingDefaultSelectionRatio: 0.9,
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
    fonts: {
      default: null,
      'Poppins, sans-serif': {
        url: 'https://fonts.googleapis.com/css?family=Poppins',
        active: true,
      },
    },
  },
  // Transformation options for optimized images
  transformation: [
    {
      width: 800,
      height: 800,
      crop: 'limit',
      quality: 'auto',
      fetchFormat: 'auto',
    },
  ],
}

/**
 * Generate optimized Cloudinary image URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  const defaultOptions = {
    width: 800,
    height: 800,
    crop: 'limit',
    quality: 'auto',
    fetchFormat: 'auto',
  }

  const transformations = { ...defaultOptions, ...options }
  const params = Object.entries(transformations)
    .map(([key, value]) => `${key}_${value}`)
    .join(',')

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${params}/${publicId}`
}

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Thumbnail URL
 */
export function getThumbnailUrl(publicId) {
  return getOptimizedImageUrl(publicId, {
    width: 200,
    height: 200,
    crop: 'fill',
    quality: 'auto',
  })
}

