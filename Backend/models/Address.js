const mongoose = require('mongoose');

/**
 * Address Schema
 * 
 * User delivery addresses
 * Used for User assignment and order delivery
 */
const addressSchema = new mongoose.Schema({
  addressId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Format: ADD-101, ADD-102, etc.
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[6-9]\d{9}$/, 'Please provide a valid Indian phone number (10 digits)'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode'],
  },
  coordinates: {
    lat: {
      type: Number,
      // Latitude for geospatial queries
    },
    lng: {
      type: Number,
      // Longitude for geospatial queries
    },
  },
  isDefault: {
    type: Boolean,
    default: false,
    // Only one default address per user
  },
  landmark: {
    type: String,
    trim: true,
  },
  addressType: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home',
  },
}, {
  timestamps: true,
});

// Indexes
addressSchema.index({ userId: 1, isDefault: 1 }); // User's default address
addressSchema.index({ userId: 1, createdAt: -1 }); // User's addresses
addressSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 }); // Geospatial queries
// Note: addressId already has an index from unique: true

// Pre-save hook: Ensure only one default address per user
addressSchema.pre('save', async function (next) {
  if (this.isDefault === true) {
    // Remove default flag from all other addresses of this user
    await mongoose.model('Address').updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Instance method: Get full address string
addressSchema.methods.getFullAddress = function () {
  const parts = [
    this.address,
    this.landmark,
    this.city,
    this.state,
    this.pincode,
  ].filter(Boolean);
  return parts.join(', ');
};

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;

