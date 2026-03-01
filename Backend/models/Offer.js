const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    offerId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      // Format: OFR-101, OFR-102, etc.
    },
    type: {
      type: String,
      required: true,
      enum: ['carousel', 'special_offer'],
    },

    // Common fields
    title: {
      type: String,
      trim: true,
      default: '', // Optional for carousels
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String, // Cloudinary URL
      required: function () {
        return this.type === 'carousel';
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0, // For sorting carousels
    },

    // Carousel-specific fields
    productIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
      // Optional - carousels can be image-only without linked products
    },

    // Special offer-specific fields
    specialTag: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'special_offer';
      },
    },
    specialValue: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'special_offer';
      },
    },
    // Optional product links for special offers
    linkedProductIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
offerSchema.index({ type: 1, isActive: 1 });
offerSchema.index({ type: 1, isActive: 1, order: 1 }); // For carousel ordering
// Note: offerId already has an index from unique: true

// Virtual for carousel count check
offerSchema.statics.getCarouselCount = async function () {
  return this.countDocuments({ type: 'carousel', isActive: true });
};

// Virtual for max carousel check
offerSchema.statics.canAddCarousel = async function () {
  const count = await this.getCarouselCount();
  return count < 6;
};

module.exports = mongoose.model('Offer', offerSchema);

