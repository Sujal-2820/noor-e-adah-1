const { sendPushNotification } = require('./firebaseAdmin');
const User = require('../models/User');

/**
 * Sends a notification to a specific user by ID
 * @param {string} userId - Database ID of the user
 * @param {string} role - 'user' (all roles now map to User)
 * @param {Object} payload - { title, body, data }
 * @returns {Promise<Object>}
 */
const sendToUser = async (userId, role, payload) => {
    try {
        const person = await User.findById(userId);

        if (!person) {
            console.warn(`User not found: ${userId} (${role})`);
            return { success: false, error: 'User not found' };
        }

        const tokenSet = new Set();
        if (person.fcmTokenWeb) tokenSet.add(person.fcmTokenWeb);
        if (person.fcmTokenApp) tokenSet.add(person.fcmTokenApp);

        const tokens = Array.from(tokenSet);

        if (tokens.length === 0) {
            return { success: false, error: 'No FCM tokens found for user' };
        }

        const notificationData = {
            ...payload.data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            role: 'user'
        };

        return await sendPushNotification(tokens, {
            title: payload.title,
            body: payload.body,
            data: notificationData,
            icon: payload.icon
        });
    } catch (error) {
        console.error(`Error in sendToUser:`, error);
        return { success: false, error: error.message };
    }
};

/**
 * Broadcast notification to all users
 * @param {string} role - ignored, always broadcasts to User model
 * @param {Object} payload - { title, body, data }
 */
const broadcastToRole = async (role, payload) => {
    try {
        const users = await User.find({
            $or: [
                { fcmTokenWeb: { $exists: true, $ne: null, $ne: '' } },
                { fcmTokenApp: { $exists: true, $ne: null, $ne: '' } }
            ]
        });

        const tokenSet = new Set();
        users.forEach(u => {
            if (u.fcmTokenWeb) tokenSet.add(u.fcmTokenWeb);
            if (u.fcmTokenApp) tokenSet.add(u.fcmTokenApp);
        });

        const allTokens = Array.from(tokenSet);

        if (allTokens.length === 0) return { success: true, message: 'No tokens found to broadcast' };

        // Firebase multicast has a limit of 500 tokens per batch
        const batches = [];
        for (let i = 0; i < allTokens.length; i += 500) {
            batches.push(allTokens.slice(i, i + 500));
        }

        const results = await Promise.all(batches.map(batch =>
            sendPushNotification(batch, payload)
        ));

        return results;
    } catch (error) {
        console.error(`Error broadcasting to ${role}:`, error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendToUser,
    broadcastToRole
};
