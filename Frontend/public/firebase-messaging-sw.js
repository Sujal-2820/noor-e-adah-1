// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Retrieve config options from the URL query parameters
// This allows us to use environment variables from the main app instead of hardcoding secrets here
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId')
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/logo.png',
        data: payload.data,
        tag: payload.data?.type || 'general' // Group notifications by type
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click Received.');
    event.notification.close();

    const data = event.notification.data;
    let urlToOpen = '/';

    // Handle deep linking based on type
    if (data) {
        if (data.type === 'order_assigned' || data.relatedEntityType === 'order') {
            urlToOpen = `/orders/${data.relatedEntityId || ''}`;
        } else if (data.type === 'commission_earned' || data.relatedEntityType === 'commission') {
            urlToOpen = '/wallet';
        } else if (data.relatedEntityType === 'repayment') {
            urlToOpen = '/credit/repayment';
        }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a tab open
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // If no tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
