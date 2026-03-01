import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBxd-arsgIVFH1MMfy5pM-5V3FzpQwn4Eo",
    authDomain: "noor-e-adah.firebaseapp.com",
    projectId: "noor-e-adah",
    storageBucket: "noor-e-adah.firebasestorage.app",
    messagingSenderId: "801369313142",
    appId: "1:801369313142:web:e229f4c9db8d6b78e0b457"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const auth = getAuth(app);

export { messaging, getToken, onMessage, auth };
