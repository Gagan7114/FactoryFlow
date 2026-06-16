import { type FirebaseApp, initializeApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyBanxBLJy0h5_D3inPJP9e850kmsoRDTxo',
  authDomain: 'sampooran-jivo.firebaseapp.com',
  projectId: 'sampooran-jivo',
  storageBucket: 'sampooran-jivo.firebasestorage.app',
  messagingSenderId: '288727872234',
  appId: '1:288727872234:web:6fc2628ca56d1d440bdd93',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let fcmServiceWorkerRegistration: ServiceWorkerRegistration | null = null;
let fcmServiceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
  );
};

/**
 * Register the Firebase messaging service worker
 * This must be done before requesting FCM tokens
 */
export const registerFCMServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (fcmServiceWorkerRegistration) {
    return fcmServiceWorkerRegistration;
  }

  if (fcmServiceWorkerRegistrationPromise) {
    return fcmServiceWorkerRegistrationPromise;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  fcmServiceWorkerRegistrationPromise = navigator.serviceWorker
    .register('/firebase-messaging-sw.js', { scope: '/' })
    .then(async (registration) => {
      fcmServiceWorkerRegistration = registration;

      if (import.meta.env.DEV) {
        console.log('[FCM] Service worker registered:', registration.scope);
      }

      await navigator.serviceWorker.ready;
      return registration;
    })
    .catch((error) => {
      console.error('[FCM] Service worker registration failed:', error);
      return null;
    })
    .finally(() => {
      fcmServiceWorkerRegistrationPromise = null;
    });

  return fcmServiceWorkerRegistrationPromise;
};

/**
 * Get the FCM service worker registration
 */
export const getFCMServiceWorkerRegistration = (): ServiceWorkerRegistration | null => {
  return fcmServiceWorkerRegistration;
};

/**
 * Initialize Firebase app and messaging
 */
export const initializeFirebase = async (): Promise<{
  app: FirebaseApp | null;
  messaging: Messaging | null;
}> => {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase is not configured. Check your environment variables.');
    return { app: null, messaging: null };
  }

  // Initialize Firebase app
  if (!app) {
    app = initializeApp(firebaseConfig);
  }

  // Check if messaging is supported (not in all browsers)
  const supported = await isSupported();
  if (!supported) {
    console.warn('[FCM] Firebase messaging is not supported in this browser');
    return { app, messaging: null };
  }

  // Register FCM service worker first
  await registerFCMServiceWorker();

  // Initialize messaging
  if (!messaging) {
    messaging = getMessaging(app);
  }

  return { app, messaging };
};

/**
 * Get the Firebase messaging instance
 */
export const getFirebaseMessaging = (): Messaging | null => messaging;

/**
 * Get the Firebase app instance
 */
export const getFirebaseApp = (): FirebaseApp | null => app;
