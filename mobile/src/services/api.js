/**
 * api.js — HIWAYTI Firestore API layer
 * All Firestore interactions centralized here
 */
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, startAfter,
  onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  GeoPoint, getCountFromServer,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { haversineDistance } from '../utils/helpers';

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── PROVIDERS ───────────────────────────────────────────────────────────────
export async function fetchFeaturedProviders(count = 6) {
  const q = query(
    collection(db, 'providers'),
    where('verified', '==', true),
    where('featured', '==', true),
    orderBy('rating', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchProvidersByCategory(category, count = 20) {
  const q = query(
    collection(db, 'providers'),
    where('category', '==', category),
    where('verified', '==', true),
    orderBy('rating', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchNearbyProviders(lat, lng, radiusKm = 30) {
  // Firestore doesn't support geo queries natively; we fetch + filter client-side
  // For production, use GeoFirestore or Cloud Functions
  const snap = await getDocs(query(
    collection(db, 'providers'),
    where('verified', '==', true),
    limit(200)
  ));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return all
    .map(p => {
      const dist = p.location
        ? haversineDistance(lat, lng, p.location.latitude, p.location.longitude)
        : null;
      return { ...p, distanceMeters: dist };
    })
    .filter(p => p.distanceMeters !== null && p.distanceMeters <= radiusKm * 1000)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function fetchProviderById(id) {
  const snap = await getDoc(doc(db, 'providers', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createProvider(data) {
  const ref_ = await addDoc(collection(db, 'providers'), {
    ...data,
    rating: 0,
    reviewCount: 0,
    bookingCount: 0,
    verified: false,
    featured: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref_.id;
}

export async function updateProvider(id, data) {
  await updateDoc(doc(db, 'providers', id), { ...data, updatedAt: serverTimestamp() });
}

// ─── PRODUCTS (ARTISANAT) ────────────────────────────────────────────────────
export async function fetchProducts(category = null, count = 30) {
  let q = query(
    collection(db, 'products'),
    where('available', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  if (category) {
    q = query(
      collection(db, 'products'),
      where('category', '==', category),
      where('available', '==', true),
      orderBy('rating', 'desc'),
      limit(count)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchProductById(id) {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createProduct(data) {
  const ref_ = await addDoc(collection(db, 'products'), {
    ...data,
    rating: 0,
    reviewCount: 0,
    available: true,
    soldCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref_.id;
}

export async function fetchTopArtisans(count = 8) {
  const q = query(
    collection(db, 'providers'),
    where('role', '==', 'artisan'),
    where('verified', '==', true),
    orderBy('rating', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
export async function createBooking(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref_ = await addDoc(collection(db, 'bookings'), {
    ...data,
    userId: uid,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Increment provider booking count
  if (data.providerId) {
    await updateDoc(doc(db, 'providers', data.providerId), {
      bookingCount: increment(1),
    });
  }
  return ref_.id;
}

export async function fetchUserBookings(uid) {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchProviderBookings(providerId) {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateBookingStatus(bookingId, status) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToProviderBookings(providerId, callback) {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId),
    where('status', 'in', ['pending', 'confirmed']),
    orderBy('date', 'asc')
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
export async function fetchReviews(targetId, count = 10) {
  const q = query(
    collection(db, 'reviews'),
    where('targetId', '==', targetId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addReview(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref_ = await addDoc(collection(db, 'reviews'), {
    ...data,
    userId: uid,
    createdAt: serverTimestamp(),
  });
  // Update provider/product average rating
  const reviews = await fetchReviews(data.targetId, 500);
  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  const targetCollection = data.targetType === 'product' ? 'products' : 'providers';
  await updateDoc(doc(db, targetCollection, data.targetId), {
    rating: Math.round(avg * 10) / 10,
    reviewCount: reviews.length,
  });
  return ref_.id;
}

// ─── COMMUNES ─────────────────────────────────────────────────────────────────
export async function fetchCommuneById(id) {
  const snap = await getDoc(doc(db, 'communes', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchCommuneStats(communeId) {
  const bookingsQ = query(collection(db, 'bookings'), where('communeId', '==', communeId));
  const providersQ = query(collection(db, 'providers'), where('communeId', '==', communeId), where('verified', '==', true));
  const [bookingsSnap, providersSnap] = await Promise.all([
    getCountFromServer(bookingsQ),
    getCountFromServer(providersQ),
  ]);
  return {
    totalBookings: bookingsSnap.data().count,
    activeProviders: providersSnap.data().count,
  };
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
export async function logAnalyticsEvent(event, data) {
  await addDoc(collection(db, 'analytics'), {
    event,
    ...data,
    userId: auth.currentUser?.uid || null,
    timestamp: serverTimestamp(),
  });
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────
export async function toggleFavorite(uid, itemId, type) {
  const ref_ = doc(db, 'users', uid);
  const snap = await getDoc(ref_);
  const favorites = snap.data()?.favorites || [];
  const key = `${type}:${itemId}`;
  const isFav = favorites.includes(key);
  await updateDoc(ref_, {
    favorites: isFav ? arrayRemove(key) : arrayUnion(key),
  });
  return !isFav;
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
export async function uploadImage(uri, path) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export async function fetchNotifications(uid, count = 30) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}
