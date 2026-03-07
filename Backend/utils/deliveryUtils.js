/**
 * Delivery Charge & Delivery Time Utility
 *
 * Centralised delivery computation so both order creation (backend)
 * and the public catalog endpoint use the exact same logic.
 *
 * Config shape (stored in Settings with key "DELIVERY_CONFIG"):
 * {
 *   mode: "flat_rate" | "per_product" | "free",
 *   domestic: {
 *     charge: 150,
 *     minFreeDelivery: null,   // null = never free | number = threshold in ₹
 *     timeLabel: "7-8 days",
 *     isEnabled: true
 *   },
 *   international: {
 *     charge: null,
 *     timeLabel: "Coming Soon",
 *     isEnabled: false
 *   }
 * }
 */

/** Default config — matches client brief (₹150, 7-8 days domestic) */
const DEFAULT_DELIVERY_CONFIG = {
  mode: 'flat_rate',
  domestic: {
    charge: 150,
    minFreeDelivery: null,
    timeLabel: '7-8 days',
    isEnabled: true,
  },
  international: {
    charge: null,
    timeLabel: 'Coming Soon',
    isEnabled: false,
  },
};

/**
 * Compute delivery charge and time label for a given cart/zone.
 *
 * @param {Object} config       - Delivery config (from Settings or default)
 * @param {number} subtotal     - Cart subtotal in ₹
 * @param {string} zone         - 'domestic' | 'international'
 * @returns {{ charge: number, timeLabel: string, isFree: boolean, isAvailable: boolean }}
 */
function computeDelivery(config = DEFAULT_DELIVERY_CONFIG, subtotal = 0, zone = 'domestic') {
  const safeConfig = { ...DEFAULT_DELIVERY_CONFIG, ...config };
  const safeMode = safeConfig.mode || 'flat_rate';

  // Mode: free — no charge ever
  if (safeMode === 'free') {
    const zoneLabel = safeConfig[zone]?.timeLabel || '7-8 days';
    return { charge: 0, timeLabel: zoneLabel, isFree: true, isAvailable: true };
  }

  const zoneConfig = safeConfig[zone] || {};

  // Zone not enabled yet (e.g., international not set up)
  if (!zoneConfig.isEnabled) {
    return {
      charge: 0,
      timeLabel: zoneConfig.timeLabel || 'Currently unavailable',
      isFree: false,
      isAvailable: false,
    };
  }

  // Free delivery above threshold
  const threshold = zoneConfig.minFreeDelivery;
  if (threshold !== null && threshold !== undefined && subtotal >= threshold) {
    return {
      charge: 0,
      timeLabel: zoneConfig.timeLabel || '7-8 days',
      isFree: true,
      isAvailable: true,
    };
  }

  return {
    charge: Number(zoneConfig.charge) || 0,
    timeLabel: zoneConfig.timeLabel || '7-8 days',
    isFree: false,
    isAvailable: true,
  };
}

/**
 * Load delivery config from DB.
 * Falls back to DEFAULT_DELIVERY_CONFIG if not set.
 *
 * @returns {Promise<Object>} Delivery config
 */
async function loadDeliveryConfig() {
  try {
    const Settings = require('../models/Settings');
    const config = await Settings.getSetting('DELIVERY_CONFIG', null);
    if (!config) {
      // First run: seed the default into DB
      await Settings.setSetting(
        'DELIVERY_CONFIG',
        DEFAULT_DELIVERY_CONFIG,
        'Delivery charge and time configuration for Domestic and International zones',
      );
      return DEFAULT_DELIVERY_CONFIG;
    }
    // Deep merge with defaults so new fields are always present
    return {
      ...DEFAULT_DELIVERY_CONFIG,
      ...config,
      domestic: { ...DEFAULT_DELIVERY_CONFIG.domestic, ...(config.domestic || {}) },
      international: { ...DEFAULT_DELIVERY_CONFIG.international, ...(config.international || {}) },
    };
  } catch (err) {
    console.error('[DeliveryUtils] Failed to load config from DB, using defaults:', err.message);
    return DEFAULT_DELIVERY_CONFIG;
  }
}

module.exports = {
  DEFAULT_DELIVERY_CONFIG,
  computeDelivery,
  loadDeliveryConfig,
};
