/**
 * AuthContext.js — HIWAYTI Authentication + Role Management
 * Supports: email, phone, Google (proxy), role-based access
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { USER_ROLES } from '../utils/theme';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

const BACKEND_URL = 'https://hiwayti-backend.onrender.com';

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AuthProvider({ children }) {
  const [user, setUser]                           = useState(null);
  const [userRole, setUserRole]                   = useState(null);
  const [userProfile, setUserProfile]             = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [currentInterface, setCurrentInterface] = useState('traveler'); // 'traveler' | 'host' | 'admin'
  const pollRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Load Firestore profile first
        let firestoreRole = USER_ROLES.TOURIST;
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            setUserProfile(snap.data());
            firestoreRole = snap.data().role || USER_ROLES.TOURIST;
          }
        } catch (e) {
          console.warn('[AUTH] Profile fetch failed:', e.message);
        }

        // Fetch custom claims for role
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        let role = idTokenResult.claims.role || firestoreRole;

        // HARDCODE ADMIN OVERRIDE
        if (firebaseUser.email === 'kifachtv24@gmail.com') {
          role = USER_ROLES.ADMIN;
          // Ensure it's saved in Firestore too
          await upsertUserDoc(firebaseUser.uid, { role: USER_ROLES.ADMIN });
        }
        
        setUserRole(role);
      } else {
        setUserRole(null);
        setUserProfile(null);
      }

      setLoading(false);
    });

    AsyncStorage.getItem('hasSeenOnboarding').then(val => {
      setHasSeenOnboarding(val === 'true');
      setOnboardingLoading(false);
    });

    AsyncStorage.getItem('currentInterface').then(val => {
      if (val) setCurrentInterface(val);
    });

    return () => {
      unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setHasSeenOnboarding(true);
  };

  // ── Upsert Firestore user document ────────────────────────────────────────
  async function upsertUserDoc(uid, data) {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  }

  // ── Email sign-up ────────────────────────────────────────────────────────
  async function signUp(email, password, displayName, role = USER_ROLES.TOURIST) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await sendEmailVerification(cred.user);
    const userDoc = {
      uid: cred.user.uid,
      email,
      displayName,
      role,
      avatarUrl: null,
      verified: false,
      createdAt: serverTimestamp(),
    };
    await upsertUserDoc(cred.user.uid, userDoc);
    setUserRole(role);
    setUserProfile(userDoc);
    return cred.user;
  }

  // ── Email sign-in ────────────────────────────────────────────────────────
  async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  // ── Google sign-in (proxy) ───────────────────────────────────────────────
  async function signInWithGoogle(preferredRole = USER_ROLES.TOURIST) {
    if (pollRef.current) clearInterval(pollRef.current);
    const sessionId = generateSessionId();
    const oauthUrl  = `${BACKEND_URL}/api/auth/google?session_id=${sessionId}`;
    WebBrowser.openBrowserAsync(oauthUrl);

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const MAX = 90;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > MAX) {
          clearInterval(pollRef.current);
          WebBrowser.dismissBrowser();
          reject(new Error('Délai dépassé — veuillez réessayer.'));
          return;
        }
        try {
          const res  = await fetch(`${BACKEND_URL}/api/auth/google/poll?session_id=${sessionId}`);
          const data = await res.json();
          if (data.status === 'complete') {
            clearInterval(pollRef.current);
            await signInWithCustomToken(auth, data.customToken);
            // Check if user already exists to preserve role
            const existingSnap = await getDoc(doc(db, 'users', data.uid));
            const existingData = existingSnap.data() || {};
            
            // If user exists but is just a tourist and selected provider, upgrade them
            let finalRole = existingData.role || preferredRole || USER_ROLES.TOURIST;
            if (existingData.role === USER_ROLES.TOURIST && preferredRole === USER_ROLES.PROVIDER) {
              finalRole = USER_ROLES.PROVIDER;
            }

            const updatedUser = {
              uid: data.uid,
              email: data.email,
              displayName: data.displayName,
              photoURL: data.photoURL,
              role: finalRole,
              updatedAt: serverTimestamp(),
            };

            await upsertUserDoc(data.uid, updatedUser);
            setUserRole(finalRole);
            setUserProfile({ ...existingData, ...updatedUser });
            WebBrowser.dismissBrowser();
            resolve();
          } else if (data.status === 'error') {
            clearInterval(pollRef.current);
            WebBrowser.dismissBrowser();
            reject(new Error(data.error || 'Erreur Google Sign-In.'));
          }
        } catch (e) {
          // Network hiccup — keep polling
        }
      }, 2000);
    });
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email) {
    if (!email) throw new Error('Veuillez renseigner votre email.');
    await sendPasswordResetEmail(auth, email);
  }

  async function updateUserRole(role) {
    if (!user) return;
    await upsertUserDoc(user.uid, { role });
    setUserRole(role);
  }

  async function refreshUser() {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (snap.exists()) {
      setUserProfile(snap.data());
    }
  }

  const switchInterface = async (mode) => {
    setCurrentInterface(mode);
    await AsyncStorage.setItem('currentInterface', mode);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      userProfile,
      loading: loading || onboardingLoading,
      hasSeenOnboarding,
      completeOnboarding,
      signIn,
      signUp,
      signOut,
      resetPassword,
      signInWithGoogle,
      updateUserRole,
      upsertUserDoc,
      refreshUser,
      currentInterface,
      switchInterface,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
