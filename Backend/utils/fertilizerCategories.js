/**
 * Fertilizer Categories
 * 
 * This platform is specifically for fertilizers only.
 * All product categories are fertilizer-related.
 */

const FERTILIZER_CATEGORIES = [
  {
    id: 'npk',
    name: 'NPK Fertilizers',
    description: 'Balanced NPK fertilizers with nitrogen, phosphorus, and potassium',
    icon: '🧪',
  },
  {
    id: 'nitrogen',
    name: 'Nitrogen Fertilizers',
    description: 'High nitrogen content fertilizers for vegetative growth',
    icon: '🌿',
  },
  {
    id: 'phosphorus',
    name: 'Phosphorus Fertilizers',
    description: 'Phosphorus-rich fertilizers for root development and flowering',
    icon: '🌺',
  },
  {
    id: 'potassium',
    name: 'Potassium Fertilizers',
    description: 'Potassium fertilizers for fruit development and disease resistance',
    icon: '🍎',
  },
  {
    id: 'organic',
    name: 'Organic Fertilizers',
    description: 'Natural and organic fertilizers from plant and animal sources',
    icon: '🌱',
  },
  {
    id: 'biofertilizer',
    name: 'Biofertilizers',
    description: 'Microbial fertilizers that enhance soil fertility naturally',
    icon: '🦠',
  },
  {
    id: 'micronutrient',
    name: 'Micronutrient Fertilizers',
    description: 'Essential trace elements like zinc, iron, copper, manganese',
    icon: '⚗️',
  },
  {
    id: 'liquid',
    name: 'Liquid Fertilizers',
    description: 'Water-soluble and liquid form fertilizers for easy application',
    icon: '💧',
  },
  {
    id: 'granular',
    name: 'Granular Fertilizers',
    description: 'Solid granular fertilizers for slow-release application',
    icon: '⚪',
  },
  {
    id: 'foliar',
    name: 'Foliar Fertilizers',
    description: 'Fertilizers applied directly to plant leaves for quick absorption',
    icon: '🍃',
  },
  {
    id: 'soil-conditioner',
    name: 'Soil Conditioners',
    description: 'Fertilizers that improve soil structure and fertility',
    icon: '🌍',
  },
  {
    id: 'specialty',
    name: 'Specialty Fertilizers',
    description: 'Specialized fertilizers for specific crops or conditions',
    icon: '⭐',
  },
]

/**
 * Get all categories
 */
function getAllCategories() {
  return FERTILIZER_CATEGORIES
}

/**
 * Get category by ID
 */
function getCategoryById(categoryId) {
  return FERTILIZER_CATEGORIES.find(cat => cat.id === categoryId)
}

/**
 * Get category names as array (for dropdowns)
 */
function getCategoryNames() {
  return FERTILIZER_CATEGORIES.map(cat => ({
    value: cat.id,
    label: cat.name,
    description: cat.description,
  }))
}

/**
 * Validate category
 */
function isValidCategory(categoryId) {
  return FERTILIZER_CATEGORIES.some(cat => cat.id === categoryId)
}

module.exports = {
  FERTILIZER_CATEGORIES,
  getAllCategories,
  getCategoryById,
  getCategoryNames,
  isValidCategory,
}

