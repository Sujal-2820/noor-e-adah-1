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
        const { limit = 50, offset = 0, category, look, theme, collection, search, minPrice, maxPrice, sort = 'createdAt' } = req.query;

        const query = { isActive: true };
        if (category && category !== 'all') query.category = category;
        if (look && look !== 'all') query.look = look;
        if (theme && theme !== 'all') query.theme = theme;
        if (collection && collection !== 'all') query.collection = collection;

        // Price filter
        if (minPrice || maxPrice) {
            query.publicPrice = {};
            if (minPrice) query.publicPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.publicPrice.$lte = parseFloat(maxPrice);
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { shortDescription: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        let sortObj = {};
        if (sort === 'popular') {
            sortObj = { salesCount: -1 };
        } else if (sort === 'priceAsc' || sort === 'price_asc') {
            sortObj = { publicPrice: 1 };
        } else if (sort === 'priceDesc' || sort === 'price_desc') {
            sortObj = { publicPrice: -1 };
        } else if (sort === 'rating_desc' || sort === 'rating') {
            sortObj = { 'ratings.average': -1 };
        } else if (sort === 'createdAt_desc' || sort === 'latest') {
            sortObj = { createdAt: -1 };
        } else {
            sortObj = { createdAt: -1 };
        }

        const products = await Product.find(query)
            .populate('category', 'name type')
            .populate('look', 'name')
            .populate('theme', 'name')
            .populate('collection', 'name')
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

        const offers = await Offer.find({ isActive: true })
            .populate({
                path: 'productIds',
                match: { isActive: true },
                select: 'name publicPrice discountPublic images sizes stock displayStock actualStock category',
                populate: { path: 'category', select: 'name type' }
            })
            .sort({ order: 1 });

        // Group by type
        const carousels = offers.filter(o => o.type === 'carousel' || o.type === 'banner');
        const smartphoneCarousels = offers.filter(o => o.type === 'smartphone_carousel');
        const specialOffers = offers.filter(o => (o.type === 'special' || o.type === 'special_offer'));
        const newArrivalsOffer = offers.find(o => o.type === 'new_arrivals');
        const newArrivals = newArrivalsOffer ? (newArrivalsOffer.productIds || []) : [];

        res.status(200).json({
            success: true,
            data: {
                carousels,
                smartphoneCarousels,
                specialOffers,
                newArrivals,
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

/**
 * @route   GET /api/catalog/delivery-config
 * @desc    Get delivery charge and time config (public, for storefront)
 * @access  Public
 */
router.get('/delivery-config', async (req, res, next) => {
    try {
        const { loadDeliveryConfig } = require('../utils/deliveryUtils');
        const config = await loadDeliveryConfig();
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

