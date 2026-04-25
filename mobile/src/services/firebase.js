/**
 * firebase.js — HIWAYTI Firebase SDK initialization
 * Connects to Firestore, Auth, Storage
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey:            FIREBASE_API_KEY            || 'AIzaSyDEMO_KEY_REPLACE_ME',
  authDomain:        FIREBASE_AUTH_DOMAIN        || 'hiwayti.firebaseapp.com',
  projectId:         FIREBASE_PROJECT_ID         || 'hiwayti',
  storageBucket:     FIREBASE_STORAGE_BUCKET     || 'hiwayti.appspot.com',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID|| '000000000000',
  appId:             FIREBASE_APP_ID             || '1:000:web:000',
};

// Prevent duplicate initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth    = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db      = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const storage = getStorage(app);

export default app;
