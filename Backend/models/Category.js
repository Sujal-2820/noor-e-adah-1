const mongoose = require('mongoose');

/**
 * Fashion Taxonomy Types:
 *  - category   → Shop By Category  (Sarees, Anarkali, Lehengas, Cordsets, Wavesets, Dhotisets, Sharara)
 *  - look       → Shop By Look      (Watch And Buy, etc.)
 *  - theme      → Shop By Theme     (Haldi, Party, Festive, Wedding)
 *  - collection → Shop By Collection (SS24, Celebrity, Winter Velvet)
 *
 * Default: 'category' — fully backward compatible with existing records.
 */
const TAXONOMY_TYPES = ['category', 'look', 'theme', 'collection'];

const categorySchema = new mongoose.Schema({
    // ── Core Identity ─────────────────────────────────────────────────────────
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true,
    },
    type: {
        type: String,
        enum: TAXONOMY_TYPES,
        default: 'category',  // ← backward compatible: existing records are 'category'
        index: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // ── Media ─────────────────────────────────────────────────────────────────
    image: {
        url: { type: String },
        publicId: { type: String },
    },
    // ── Visibility & Ordering ─────────────────────────────────────────────────
    isActive: {
        type: Boolean,
        default: true,
    },
    order: {
        type: Number,
        default: 0,
    },
    // ── Featured flag (e.g. show on homepage) ────────────────────────────────
    isFeatured: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// ── Compound index: name within the same type ──────────
categorySchema.index({ name: 1, type: 1 });
// ── Compound index: slug within the same type ──────────
categorySchema.index({ slug: 1, type: 1 }, { sparse: true });

// ── Auto-generate slug before saving ────────────────────────────────────────
categorySchema.pre('save', function (next) {
    if (this.isModified('name') || !this.slug) {
        this.slug = this.name.toLowerCase()
            .replace(/[^\w\s-]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
module.exports.TAXONOMY_TYPES = TAXONOMY_TYPES;

