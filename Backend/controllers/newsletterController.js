const Newsletter = require('../models/Newsletter');
const nodemailer = require('nodemailer');

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

        // Send notification email to the owner
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'noor.e.adah5@gmail.com',
                    pass: process.env.EMAIL_PASS || 'your-app-password' // User must set this in .env
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER || 'noor.e.adah5@gmail.com',
                to: 'noor.e.adah5@gmail.com',
                subject: '🎉 New Newsletter Subscriber on Noor E Adah!',
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #c1a457; text-transform: uppercase; letter-spacing: 2px;">New Subscriber Alert!</h2>
            <p>You have a new newsletter subscription on Noor E Adah.</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <hr style="border-top: 1px solid #eaeaea; my-4;" />
            <p style="font-size: 12px; color: #888;">This is an automated notification from your server.</p>
          </div>
        `
            };

            // We only attempt to send if credentials exist, to avoid harsh crashes.
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await transporter.sendMail(mailOptions);
            } else {
                console.warn("[Newsletter] Skipping email dispatch: EMAIL_USER and EMAIL_PASS not fully configured in .env");
            }
        } catch (emailError) {
            console.error('Newsletter email dispatch failed:', emailError);
            // We do not fail the request if the email sending fails (to ensure the DB saves it)
        }

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
