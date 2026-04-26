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

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const firebaseConfig = {
  apiKey:            extra.FIREBASE_API_KEY            || 'AIzaSyBIMXq0wBiP3T0RESNUZ5S91p4lK8BjMbM',
  authDomain:        extra.FIREBASE_AUTH_DOMAIN        || 'hiwayti-81fde.firebaseapp.com',
  projectId:         extra.FIREBASE_PROJECT_ID         || 'hiwayti-81fde',
  storageBucket:     extra.FIREBASE_STORAGE_BUCKET     || 'hiwayti-81fde.firebasestorage.app',
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID|| '100771132757',
  appId:             extra.FIREBASE_APP_ID             || '1:100771132757:web:4ae354ecf5b4a989452bdc',
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
