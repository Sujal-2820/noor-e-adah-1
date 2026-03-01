/**
 * Product Image Utility Functions
 * 
 * Helper functions to extract and format product images from various formats
 */

/**
 * Get the primary image URL from a product
 * @param {Object} product - Product object with images array or legacy image field
 * @returns {string} Primary image URL or placeholder
 */
export function getPrimaryImageUrl(product) {
    if (!product) return 'https://via.placeholder.com/400'

    // Try images array first (new format)
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // Find primary image or return first
        const primaryImage = product.images.find(img =>
            (typeof img === 'object' && img.isPrimary === true) ||
            (typeof img === 'object' && img.order === 0)
        )
        if (primaryImage) {
            return typeof primaryImage === 'string' ? primaryImage : (primaryImage.url || 'https://via.placeholder.com/400')
        }
        // Return first image if no primary found
        const firstImage = product.images[0]
        return typeof firstImage === 'string' ? firstImage : (firstImage?.url || 'https://via.placeholder.com/400')
    }

    // Try primaryImage virtual field (from backend)
    if (product.primaryImage) {
        return product.primaryImage
    }

    // Try legacy image field
    if (product.image) {
        return product.image
    }

    // Default placeholder
    return 'https://via.placeholder.com/400'
}

/**
 * Get all image URLs from a product
 * @param {Object} product - Product object with images array
 * @returns {Array<string>} Array of image URLs
 */
export function getAllImageUrls(product) {
    if (!product) return []

    // Try images array first (new format)
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        return product.images
            .map(img => typeof img === 'string' ? img : img.url)
            .filter(url => url && url !== '')
            .sort((a, b) => {
                // Sort by order if available
                const aIndex = product.images.findIndex(i =>
                    (typeof i === 'string' ? i === a : i.url === a)
                )
                const bIndex = product.images.findIndex(i =>
                    (typeof i === 'string' ? i === b : i.url === b)
                )
                const aOrder = typeof product.images[aIndex] === 'object' ? (product.images[aIndex].order || aIndex) : aIndex
                const bOrder = typeof product.images[bIndex] === 'object' ? (product.images[bIndex].order || bIndex) : bIndex
                return aOrder - bOrder
            })
    }

    // Try primaryImage virtual field
    if (product.primaryImage) {
        return [product.primaryImage]
    }

    // Try legacy image field
    if (product.image) {
        return [product.image]
    }

    return []
}

/**
 * Get image URL at specific index
 * @param {Object} product - Product object
 * @param {number} index - Image index (default: 0)
 * @returns {string} Image URL or placeholder
 */
export function getImageUrlAt(product, index = 0) {
    const allImages = getAllImageUrls(product)
    return allImages[index] || 'https://via.placeholder.com/400'
}
