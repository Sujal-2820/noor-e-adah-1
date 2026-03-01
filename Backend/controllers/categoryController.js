const Category = require('../models/Category');
const { TAXONOMY_TYPES } = require('../models/Category');
const Product = require('../models/Product');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all active categories (public — returns all types grouped)
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = async (req, res, next) => {
    try {
        const { type } = req.query;

        const filter = { isActive: true };
        if (type && TAXONOMY_TYPES.includes(type)) {
            filter.type = type;
        }

        const items = await Category.find(filter).sort({ order: 1, name: 1 });

        // If no type filter, return grouped by type
        if (!type) {
            const grouped = {};
            TAXONOMY_TYPES.forEach(t => { grouped[t] = []; });
            items.forEach(item => {
                const t = item.type || 'category';
                if (!grouped[t]) grouped[t] = [];
                grouped[t].push(item);
            });
            return res.status(200).json({ success: true, data: grouped });
        }

        res.status(200).json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all taxonomy items (admin — all types, optional filter)
 * @route   GET /api/admin/categories?type=category|look|theme|collection
 * @access  Private (Admin)
 */
exports.getAdminCategories = async (req, res, next) => {
    try {
        const { type } = req.query;

        const filter = {};
        if (type && TAXONOMY_TYPES.includes(type)) {
            filter.type = type;
        }

        const items = await Category.find(filter).sort({ type: 1, order: 1, name: 1 });

        // Group by type for admin overview
        if (!type) {
            const grouped = {};
            TAXONOMY_TYPES.forEach(t => { grouped[t] = []; });
            items.forEach(item => {
                const t = item.type || 'category';
                if (!grouped[t]) grouped[t] = [];
                grouped[t].push(item);
            });
            return res.status(200).json({
                success: true,
                data: items,          // flat array (for dropdowns, compatibility)
                grouped,              // grouped by type (for admin UI panels)
                types: TAXONOMY_TYPES,
            });
        }

        res.status(200).json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new taxonomy item (category / look / theme / collection)
 * @route   POST /api/admin/categories
 * @body    { name, type, description, image, order, isActive, isFeatured }
 * @access  Private (Admin)
 */
exports.createCategory = async (req, res, next) => {
    try {
        const {
            name, type = 'category', description,
            image, order, isActive, isFeatured,
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        if (!TAXONOMY_TYPES.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid type. Must be one of: ${TAXONOMY_TYPES.join(', ')}`,
            });
        }

        const item = await Category.create({
            name: name.trim(),
            type,
            description,
            image,
            order,
            isActive,
            isFeatured,
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'An item with this name already exists in this type',
            });
        }
        next(error);
    }
};

/**
 * @desc    Update a taxonomy item
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin)
 */
exports.updateCategory = async (req, res, next) => {
    try {
        const {
            name, type, description,
            image, order, isActive, isFeatured,
        } = req.body;

        const item = await Category.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Validate type if changing
        if (type && !TAXONOMY_TYPES.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid type. Must be one of: ${TAXONOMY_TYPES.join(', ')}`,
            });
        }

        if (name) item.name = name.trim();
        if (type) item.type = type;
        if (description !== undefined) item.description = description;
        if (image) item.image = image;
        if (order !== undefined) item.order = order;
        if (isActive !== undefined) item.isActive = isActive;
        if (isFeatured !== undefined) item.isFeatured = isFeatured;

        await item.save();

        res.status(200).json({ success: true, data: item });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'An item with this name already exists in this type',
            });
        }
        next(error);
    }
};

/**
 * @desc    Delete a taxonomy item
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin)
 */
exports.deleteCategory = async (req, res, next) => {
    try {
        const item = await Category.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Only block deletion if it's a 'category' type with products assigned
        if (item.type === 'category') {
            const productCount = await Product.countDocuments({ category: item.slug || item.name.toLowerCase() });
            if (productCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete this category — ${productCount} product(s) are assigned to it`,
                });
            }
        }

        await Category.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Reorder items within a type
 * @route   PUT /api/admin/categories/reorder
 * @body    { items: [{ id, order }] }
 * @access  Private (Admin)
 */
exports.reorderCategories = async (req, res, next) => {
    try {
        const { categories, items } = req.body;
        const list = items || categories; // support both field names

        if (!Array.isArray(list)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input: items must be an array',
            });
        }

        await Promise.all(
            list.map(item => Category.findByIdAndUpdate(item.id, { order: item.order }))
        );

        res.status(200).json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Seed fashion taxonomy — safe to run multiple times (upsert)
 * @route   POST /api/admin/categories/seed
 * @access  Private (Admin)
 */
exports.seedFashionTaxonomy = async (req, res, next) => {
    try {
        const defaultData = [
            // Shop By Category
            { name: 'Sarees', type: 'category', order: 1 },
            { name: 'Anarkali', type: 'category', order: 2 },
            { name: 'Lehengas', type: 'category', order: 3 },
            { name: 'Cordsets', type: 'category', order: 4 },
            { name: 'Wavesets', type: 'category', order: 5 },
            { name: 'Dhotisets', type: 'category', order: 6 },
            { name: 'Sharara', type: 'category', order: 7 },
            // Shop By Look
            { name: 'Watch And Buy', type: 'look', order: 1 },
            // Shop By Theme
            { name: 'Haldi', type: 'theme', order: 1 },
            { name: 'Party', type: 'theme', order: 2 },
            { name: 'Festive', type: 'theme', order: 3 },
            { name: 'Wedding', type: 'theme', order: 4 },
            // Shop By Collection
            { name: 'SS24', type: 'collection', order: 1 },
            { name: 'Celebrity', type: 'collection', order: 2 },
            { name: 'Winter Velvet', type: 'collection', order: 3 },
        ];

        const results = await Promise.allSettled(
            defaultData.map(item =>
                Category.findOneAndUpdate(
                    { name: item.name, type: item.type },
                    { $setOnInsert: { ...item, isActive: true } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                )
            )
        );

        const created = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        res.status(200).json({
            success: true,
            message: `Seeded ${created} taxonomy items${failed > 0 ? `, ${failed} failed` : ''}`,
        });
    } catch (error) {
        next(error);
    }
};
