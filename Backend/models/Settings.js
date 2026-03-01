const mongoose = require('mongoose');

/**
 * Settings Schema
 * 
 * Stores system-wide configuration settings that can be updated by admins
 * Single document per setting key, ensures unique settings
 */
const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    uppercase: true,
    // Keys: FINANCIAL_PARAMETERS, DELIVERY_CHARGE, etc.
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required'],
    // Can be object, number, string, etc.
  },
  description: {
    type: String,
    trim: true,
    // Human-readable description of what this setting does
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    // Track who last updated this setting
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Note: key already has an index from unique: true

// Static method: Get setting value by key
settingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key: key.toUpperCase() });
  return setting ? setting.value : defaultValue;
};

// Static method: Set setting value by key
settingsSchema.statics.setSetting = async function(key, value, description = null, updatedBy = null) {
  const updateData = {
    value,
    lastUpdated: new Date(),
  };
  if (description) updateData.description = description;
  if (updatedBy) updateData.updatedBy = updatedBy;

  return await this.findOneAndUpdate(
    { key: key.toUpperCase() },
    { ...updateData, $setOnInsert: { key: key.toUpperCase() } },
    { upsert: true, new: true }
  );
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;

