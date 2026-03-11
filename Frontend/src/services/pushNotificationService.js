import { messaging, getToken, onMessage } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Register the Service Worker for Firebase Messaging
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const firebaseConfigParams = new URLSearchParams({
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
            }).toString();

            const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${firebaseConfigParams}`, {
                scope: '/'
            });
            console.log('✅ FCM Service Worker registered:', registration.scope);
            return registration;
        } catch (error) {
            console.error('❌ FCM Service Worker registration failed:', error);
            throw error;
        }
    } else {
        throw new Error('Service Workers are not supported in this browser');
    }
}

/**
 * Request permission for notifications
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Get FCM Token for the current browser
 */
async function getFCMToken() {
    try {
        const registration = await registerServiceWorker();
        // Wait for SW to be ready
        await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        return token;
    } catch (error) {
        console.error('❌ Error obtaining FCM token:', error);
        return null;
    }
}

/**
 * Register FCM Token with the Backend API
 * @param {boolean} force - Force re-registration even if token exists in localStorage
 */
async function registerFCMTokenWithBackend(force = false) {
    try {
        // Check for any of the project's possible auth tokens
        const authToken = localStorage.getItem('token') ||
            localStorage.getItem('user_token') ||
            localStorage.getItem('user_token') ||
            localStorage.getItem('admin_token') ||
            localStorage.getItem('admin_token');

        if (!authToken) return;

        const savedToken = localStorage.getItem('fcm_token_registered');
        if (savedToken && !force) {
            console.log('FCM token already registered');
            return;
        }

        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.warn('Notification permission not granted');
            return;
        }

        const token = await getFCMToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/fcm/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token: token,
                    platform: 'web'
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('fcm_token_registered', token);
                console.log('✅ FCM token registered with backend successfully');
            } else {
                console.warn('⚠️ FCM registration skipped or failed:', data?.message || response.statusText);
            }
        } catch (fetchError) {
            // Silently fail if backend is unreachable or proxy error occurs
            // This prevents console spam and disruption of app flow
            console.warn('⚠️ FCM registration skipped: Backend unreachable');
        }
    } catch (error) {
        console.warn('⚠️ FCM Registration Error (Handled):', error.message);
    }
}

/**
 * Setup foreground message listener
 * @param {Function} onNotificationReceived - Callback for when a notification is received in foreground
 */
function setupForegroundNotificationHandler(onNotificationReceived) {
    onMessage(messaging, (payload) => {
        console.log('📬 Background message received in foreground:', payload);

        // Show a simple browser notification if permission is granted
        if (Notification.permission === 'granted') {
            const { title, body } = payload.notification;
            new Notification(title, {
                body,
                icon: '/NoorEAdah.jpeg', // Fallback icon
                data: payload.data
            });
        }

        if (onNotificationReceived) {
            onNotificationReceived(payload);
        }
    });
}

/**
 * Initialize Push Notifications on App Load
 */
async function initializePushNotifications() {
    try {
        // Just register the SW on load
        await registerServiceWorker();

        // If user is already logged in, try to register the token
        const hasToken = localStorage.getItem('token') ||
            localStorage.getItem('user_token') ||
            localStorage.getItem('user_token') ||
            localStorage.getItem('admin_token') ||
            localStorage.getItem('admin_token');

        if (hasToken) {
            registerFCMTokenWithBackend();
        }
    } catch (error) {
        console.error('Initial FCM setup failed:', error);
    }
}

export {
    initializePushNotifications,
    registerFCMTokenWithBackend,
    setupForegroundNotificationHandler,
    requestNotificationPermission
};
