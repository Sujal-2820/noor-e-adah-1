const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const Product = require('../models/Product');
const Category = require('../models/Category');


/**
 * Public Catalog Routes
 * 
 * These routes provide public access to product catalog data.
 * Created after User module removal to support User module catalog access.
 * 
 * These routes reuse the admin controller functions but don't require authentication.
 */

/**
 * @route   GET /api/catalog/products
 * @desc    Get all active products (public)
 * @access  Public
 */
router.get('/products', async (req, res, next) => {
    try {
        // Build query — only active products
        const { limit = 50, offset = 0, category, search, sort = 'createdAt' } = req.query;

        const query = { isActive: true };
        if (category && category !== 'all') {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        let sortObj = {};
        if (sort === 'popular') {
            sortObj = { salesCount: -1 };
        } else if (sort === 'priceAsc') {
            sortObj = { price: 1 };
        } else if (sort === 'priceDesc') {
            sortObj = { price: -1 };
        } else {
            sortObj = { createdAt: -1 };
        }

        const products = await Product.find(query)
            .populate('category', 'name type')
            .sort(sortObj)
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                products,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/catalog/products/:productId
 * @desc    Get product details (public)
 * @access  Public
 */
router.get('/products/:productId', async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.productId)
            .populate('category', 'name type image')
            .populate('look', 'name type')
            .populate('theme', 'name type')
            .populate('collection', 'name type')
            .populate({
                path: 'relatedProducts',
                match: { isActive: true },
                select: 'name publicPrice price images category',
                populate: { path: 'category', select: 'name' }
            });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { product }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/catalog/offers
 * @desc    Get active offers/banners (public)
 * @access  Public
 */
router.get('/offers', async (req, res, next) => {
    try {
        const Offer = require('../models/Offer');

        const offers = await Offer.find({ isActive: true }).sort({ order: 1 });

        // Group by type
        const carousels = offers.filter(o => o.type === 'carousel' || o.type === 'banner');
        const specialOffers = offers.filter(o => o.type === 'special');

        res.status(200).json({
            success: true,
            data: {
                carousels,
                specialOffers,
                offers
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/catalog/categories
 * @desc    Get active categories for storefront (public)
 * @access  Public
 */
router.get('/categories', async (req, res, next) => {
    try {
        const { type } = req.query;
        const filter = { isActive: true };
        if (type) filter.type = type;

        const items = await Category.find(filter).sort({ order: 1, name: 1 }).select('name type slug description image order isFeatured');

        res.status(200).json({
            success: true,
            data: { categories: items }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
