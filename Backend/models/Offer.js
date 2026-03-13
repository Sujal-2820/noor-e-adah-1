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
      enum: ['carousel', 'special_offer', 'smartphone_carousel'],
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
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    image: {
      type: String, // Cloudinary image URL
      required: function () {
        return (this.type === 'carousel' || this.type === 'smartphone_carousel') && this.mediaType === 'image';
      },
    },
    video: {
      type: String, // Cloudinary video URL
      required: function () {
        return (this.type === 'carousel' || this.type === 'smartphone_carousel') && this.mediaType === 'video';
      },
    },
    orientation: {
      type: String,
      enum: ['vertical', 'horizontal'],
      default: 'horizontal',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0, // For sorting carousels
    },

    // Carousel-specific fields (applies to both desktop and smartphone carousels)
    productIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
      // Optional - carousels can be image-only without linked products
    },
    buttonText: {
      type: String,
      trim: true,
    },
    buttonLink: {
      type: String,
      trim: true,
    },
    textPosition: {
      type: String,
      enum: [
        'left-top', 'left-center', 'left-bottom',
        'center-top', 'center-center', 'center-bottom',
        'right-top', 'right-center', 'right-bottom'
      ],
      default: 'center-center',
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

// Statics for carousel count check
offerSchema.statics.getCarouselCount = async function (type = 'carousel') {
  return this.countDocuments({ type, isActive: true });
};

// Virtual for max carousel check
offerSchema.statics.canAddCarousel = async function (type = 'carousel') {
  const count = await this.getCarouselCount(type);
  return count < 6;
};

module.exports = mongoose.model('Offer', offerSchema);

