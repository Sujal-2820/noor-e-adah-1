const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  longDescription: {
    type: String,
    trim: true,
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
    maxlength: [150, 'Short description cannot exceed 150 characters'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required'],
  },
  look: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  theme: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  occasions: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  wholesalePrice: {
    type: Number,
    required: [true, 'Wholesale price is required'],
    min: [0, 'Wholesale price cannot be negative'],
  },
  publicPrice: {
    type: Number,
    required: [true, 'Public price is required'],
    min: [0, 'Public price cannot be negative'],
  },
  discountWholesale: {
    type: Number,
    min: [0],
    max: [100],
    default: 0,
  },
  discountPublic: {
    type: Number,
    min: [0],
    max: [100],
    default: 0,
  },
  actualStock: {
    type: Number,
    required: [true, 'Actual stock quantity is required'],
    min: [0, 'Actual stock cannot be negative'],
    default: 0,
  },
  displayStock: {
    type: Number,
    required: [true, 'Display stock quantity is required'],
    min: [0, 'Display stock cannot be negative'],
    default: 0,
  },
  stock: {
    type: Number,
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  }],
  expiry: { type: Date },
  brand: { type: String, trim: true },
  weight: {
    value: { type: Number },
    unit: {
      type: String,
      enum: ['mg', 'g', 'kg', 'ml', 'L', 'l', 'bag', 'bags', 'unit', 'units', 'packet', 'bottle', 'piece', 'set'],
      default: 'piece',
    },
  },
  isActive: { type: Boolean, default: true },
  showStock: { type: Boolean, default: false },   // whether to display stock count to customers
  isWholesale: { type: Boolean, default: false },
  tags: [{ type: String, trim: true, lowercase: true }],
  productId: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  sku: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  batchNumber: { type: String, trim: true },
  specifications: { type: Map, of: String },

  // ─── NEW FIELDS FOR ENHANCED PRODUCT DETAILS ────────────────────────────────
  additionalInformation: {
    type: String,
    trim: true,
  },
  shippingPolicy: {
    type: String,
    trim: true,
  },
  faqs: [{
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true }
  }],
  reviews: [{
    userName: { type: String, required: true },
    userEmail: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  // ─── FASHION SIZE VARIANTS ─────────────────────────────────────────────────
  sizes: [{
    label: { type: String, required: true, trim: true, uppercase: true },
    actualStock: { type: Number, required: true, min: [0], default: 0 },
    displayStock: { type: Number, required: true, min: [0], default: 0 },
    isAvailable: { type: Boolean, default: true },
    price: { type: Number, min: [0] },             // optional per-size price override
    discountPublic: { type: Number, min: [0], max: [100] }, // optional per-size discount %
  }],

  // ─── LEGACY ATTRIBUTES ──────────────────────────────────────────────────
  attributeStocks: [{
    sizeValue: { type: Number },
    sizeUnit: { type: String, enum: ['mg', 'g', 'kg', 'ml', 'L', 'bag', 'bags', 'unit', 'units', 'packet', 'bottle'] },
    attributes: { type: Map, of: String },
    actualStock: { type: Number, required: true, min: [0], default: 0 },
    displayStock: { type: Number, required: true, min: [0], default: 0 },
    stockUnit: { type: String, enum: ['mg', 'g', 'kg', 'ml', 'L', 'bag', 'bags', 'unit', 'units', 'packet', 'bottle', 'piece', 'set'], default: 'piece' },
    wholesalePrice: { type: Number, required: true, min: [0] },
    publicPrice: { type: Number, required: true, min: [0] },
    discountUser: { type: Number, min: [0], max: [100], default: 0 },
    batchNumber: { type: String, trim: true },
    expiry: { type: Date },
  }],

  // ─── SIZE CHART ──────────────────────────────────────────────────────────
  sizeChart: {
    headers: [{ label: String, key: String }],
    rows: [mongoose.Schema.Types.Mixed],
    unit: { type: String, default: 'inches' }
  },

  // ─── RELATED PRODUCTS ─────────────────────────────────────────────────────
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });

productSchema.virtual('primaryImage').get(function () {
  if (this.images && this.images.length > 0) {
    const primaryImage = this.images.find(img => img.isPrimary === true);
    if (primaryImage) return primaryImage.url;
    return this.images[0].url;
  }
  return null;
});

productSchema.pre('save', async function (next) {
  if (!this.sku && this.isNew) {
    const categoryPart = this.category ? this.category.toString().slice(-4) : 'GEN';
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${categoryPart}-${timestamp}`;
  }
  if (this.isModified('displayStock') || this.isNew) {
    this.stock = this.displayStock;
  }
  next();
});

productSchema.methods.isInStock = function () {
  return (this.displayStock || this.stock) > 0;
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
