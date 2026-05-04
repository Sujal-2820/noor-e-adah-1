const Influencer = require('../models/Influencer');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all active influencers
 * @route   GET /api/influencers
 * @access  Public
 */
exports.getInfluencers = async (req, res, next) => {
    try {
        const influencers = await Influencer.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: influencers });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all influencers (admin)
 * @route   GET /api/admin/influencers
 * @access  Private (Admin)
 */
exports.getAdminInfluencers = async (req, res, next) => {
    try {
        const influencers = await Influencer.find().sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: influencers });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new influencer
 * @route   POST /api/admin/influencers
 * @access  Private (Admin)
 */
exports.createInfluencer = async (req, res, next) => {
    try {
        const { name, instagramLink, image, order, isActive } = req.body;

        if (!name || !instagramLink) {
            return res.status(400).json({ success: false, message: 'Name and Instagram link are required' });
        }

        const influencer = await Influencer.create({
            name,
            instagramLink,
            image,
            order,
            isActive
        });

        res.status(201).json({ success: true, data: influencer });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update an influencer
 * @route   PUT /api/admin/influencers/:id
 * @access  Private (Admin)
 */
exports.updateInfluencer = async (req, res, next) => {
    try {
        const { name, instagramLink, image, order, isActive } = req.body;

        let influencer = await Influencer.findById(req.params.id);

        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        influencer = await Influencer.findByIdAndUpdate(
            req.params.id,
            { name, instagramLink, image, order, isActive },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: influencer });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete an influencer
 * @route   DELETE /api/admin/influencers/:id
 * @access  Private (Admin)
 */
exports.deleteInfluencer = async (req, res, next) => {
    try {
        const influencer = await Influencer.findById(req.params.id);

        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        await Influencer.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, message: 'Influencer removed successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Reorder influencers
 * @route   PUT /api/admin/influencers/reorder
 * @access  Private (Admin)
 */
exports.reorderInfluencers = async (req, res, next) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Invalid input: items must be an array' });
        }

        await Promise.all(
            items.map(item => Influencer.findByIdAndUpdate(item.id, { order: item.order }))
        );

        res.status(200).json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
        next(error);
    }
};
