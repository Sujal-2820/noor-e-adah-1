const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

// ─── Configure Cloudinary ────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Always HTTPS
})

// ─── IMAGE STORAGE ────────────────────────────────────────────────────────────
// Strategy: Convert to WebP, auto best quality, preserve transparency
// Result: ~30% smaller file size at the SAME visual quality as JPG/PNG
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: process.env.CLOUDINARY_IMAGE_FOLDER || 'noor-e-adah/images',
        resource_type: 'image',
        format: 'webp',
        transformation: [
            {
                quality: 'auto:best',          // Best quality, never degrades visually
                fetch_format: 'auto',          // Serve best format per browser (AVIF, WebP, JPG)
                flags: 'preserve_transparency', // Keep alpha channel for PNG
            },
        ],
        use_filename: false,
        unique_filename: true,
        public_id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }),
})

// ─── VIDEO STORAGE ────────────────────────────────────────────────────────────
// Strategy: Store ORIGINAL quality. No re-encoding.
// Cloudinary serves HLS adaptive streaming (pre-generated in background)
const videoStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: process.env.CLOUDINARY_VIDEO_FOLDER || 'noor-e-adah/videos',
        resource_type: 'video',
        // ⚠️ NO transformation — preserve 100% original quality
        eager: [
            // Pre-generate HLS adaptive stream in background (doesn't affect upload speed)
            { streaming_profile: 'hd', format: 'm3u8' },
        ],
        eager_async: true, // Non-blocking — generated after upload completes
        use_filename: false,
        unique_filename: true,
        public_id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }),
})

// ─── MULTER UPLOAD INSTANCES ─────────────────────────────────────────────────

/** Upload a single image (product photos, profile pictures, etc.) */
const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (allowed.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Only JPG, PNG, WEBP, GIF images are allowed'), false)
        }
    },
})

/** Upload a single video (reels, product demos, etc.) */
const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
        if (allowed.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Only MP4, WEBM, MOV, AVI, MKV videos are allowed'), false)
        }
    },
})

/** Upload multiple images (up to 10) */
const uploadImages = multer({
    storage: imageStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 10,
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (allowed.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Only JPG, PNG, WEBP, GIF images are allowed'), false)
        }
    },
})

// ─── DELETE FILE ──────────────────────────────────────────────────────────────
/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public_id from Cloudinary
 * @param {'image'|'video'|'raw'} resourceType - Resource type
 */
const deleteFile = async (publicId, resourceType = 'image') => {
    try {
        if (!publicId) return { result: 'not_found' }
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        })
        return result
    } catch (error) {
        console.error('Cloudinary delete error:', error.message)
        throw error
    }
}

/**
 * Delete multiple files from Cloudinary
 * @param {string[]} publicIds - Array of public_ids
 * @param {'image'|'video'} resourceType
 */
const deleteFiles = async (publicIds, resourceType = 'image') => {
    if (!publicIds || publicIds.length === 0) return
    const promises = publicIds.map((id) => deleteFile(id, resourceType))
    return Promise.allSettled(promises)
}

// ─── URL GENERATORS ───────────────────────────────────────────────────────────

/**
 * Get an optimized image URL (auto format + best quality)
 * @param {string} publicId - Cloudinary public_id
 * @param {object} options - Extra transformations e.g. { width: 800 }
 */
const getOptimizedImageUrl = (publicId, options = {}) => {
    if (!publicId) return null
    return cloudinary.url(publicId, {
        fetch_format: 'auto',   // Best format per browser
        quality: 'auto:best',  // Best quality, lossless-like
        secure: true,
        ...options,
    })
}

/**
 * Get image URL with specific width (for responsive images)
 * @param {string} publicId
 * @param {number} width - Target width in pixels
 */
const getResponsiveImageUrl = (publicId, width = 800) => {
    if (!publicId) return null
    return cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto:best',
        width,
        crop: 'limit', // Never upscale, only downscale
        secure: true,
    })
}

/**
 * Get HLS video streaming URL (adaptive bitrate, HD)
 * @param {string} publicId
 */
const getVideoStreamUrl = (publicId) => {
    if (!publicId) return null
    return cloudinary.url(publicId, {
        resource_type: 'video',
        streaming_profile: 'hd',
        format: 'm3u8', // HLS
        secure: true,
    })
}

/**
 * Get direct video URL (original quality MP4)
 * @param {string} publicId
 */
const getVideoUrl = (publicId) => {
    if (!publicId) return null
    return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        format: 'mp4',
    })
}

/**
 * Get video thumbnail (auto-generated from first frame)
 * @param {string} publicId
 * @param {number} width
 */
const getVideoThumbnail = (publicId, width = 400) => {
    if (!publicId) return null
    return cloudinary.url(publicId, {
        resource_type: 'video',
        fetch_format: 'auto',
        quality: 'auto:best',
        width,
        crop: 'limit',
        secure: true,
        format: 'jpg', // Thumbnail as JPG
    })
}

module.exports = {
    cloudinary,
    uploadImage,      // single image
    uploadImages,     // multiple images (up to 10)
    uploadVideo,      // single video
    deleteFile,
    deleteFiles,
    getOptimizedImageUrl,
    getResponsiveImageUrl,
    getVideoStreamUrl,   // HLS .m3u8 (recommended for web playback)
    getVideoUrl,         // Direct MP4
    getVideoThumbnail,   // Auto-generated thumbnail from video
}
