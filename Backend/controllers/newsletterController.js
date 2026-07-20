const Newsletter = require('../models/Newsletter');

// Handle Newsletter Subscription
exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        // Check if already subscribed
        let subscriber = await Newsletter.findOne({ email: email.toLowerCase() });
        if (subscriber) {
            if (!subscriber.isActive) {
                subscriber.isActive = true;
                await subscriber.save();
                return res.status(200).json({ success: true, message: 'Resubscribed successfully.' });
            }
            return res.status(200).json({ success: true, message: 'Already subscribed.' });
        }

        // Create new subscription in DB
        subscriber = new Newsletter({ email: email.toLowerCase() });
        await subscriber.save();

        res.status(200).json({ success: true, message: 'Subscribed successfully.' });

    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during subscription.' });
    }
};

// Get all subscribers for Admin Panel
exports.getSubscribers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;

        const total = await Newsletter.countDocuments();
        const subscribers = await Newsletter.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: subscribers.length,
            total,
            pagination: {
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            data: subscribers
        });

    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch subscribers' });
    }
};
