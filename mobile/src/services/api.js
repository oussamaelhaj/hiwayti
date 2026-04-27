/**
 * api.js — HIWAYTI Firestore API layer v2
 * All Firestore interactions: providers, bookings, reviews, activities,
 * places, passengers (user preferences), communes, notifications, analytics
 */
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, startAfter,
  onSnapshot, serverTimestamp, increment, arrayUnion, arrayRemove,
  GeoPoint, getCountFromServer, documentId
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { haversineDistance } from '../utils/helpers';

const BACKEND_URL = 'https://hiwayti-backend.onrender.com';
const DEV_BACKEND_URL = 'http://192.168.0.158:5000';

// ─── AUTH HEADER ──────────────────────────────────────────────────────────────
async function authHeader() {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── USER PREFERENCES (Passenger) ────────────────────────────────────────────
export async function getUserPreferences(uid) {
  const snap = await getDoc(doc(db, 'userPreferences', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : {
    languages: ['fr'],
    preferredCategories: [],
    preferredCommunes: [],
    accessibilityNeeds: [],
    budget: { min: 0, max: 5000 },
    groupSize: 1,
    travelStyle: 'adventure',
  };
}

export async function updateUserPreferences(uid, prefs) {
  await setDoc(doc(db, 'userPreferences', uid), {
    ...prefs,
    userId: uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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

/**
 * Fetch unverified providers (Admin)
 */
export async function fetchUnverifiedProviders() {
  const q = query(
    collection(db, 'providers'),
    where('verified', '==', false)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Verify a provider (Admin)
 */
export async function verifyProvider(providerId) {
  const ref = doc(db, 'providers', providerId);
  await updateDoc(ref, { verified: true });
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
/**
 * Fetch all activities for a provider
 */
export async function fetchProviderActivities(providerId) {
  const q = query(
    collection(db, 'activities'),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch activities by category
 */
export async function fetchActivitiesByCategory(category, count = 30) {
  const q = query(
    collection(db, 'activities'),
    where('category', '==', category),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  const acts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const providerIds = [...new Set(acts.map(a => a.providerId).filter(Boolean))];
  if (providerIds.length === 0) return acts;
  
  // Max 30 for 'in' query, perfectly matches our limit
  const pq = query(collection(db, 'providers'), where(documentId(), 'in', providerIds.slice(0, 30)));
  const psnap = await getDocs(pq);
  const validProviders = new Set(psnap.docs.filter(d => d.data().verified).map(d => d.id));

  return acts.filter(a => validProviders.has(a.providerId));
}

/**
 * Create an activity for a provider
 */
export async function createActivity(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref_ = await addDoc(collection(db, 'activities'), {
    ...data,
    createdBy: uid,
    active: true,
    bookingCount: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Link activity to provider
  if (data.providerId) {
    const providerRef = doc(db, 'providers', data.providerId);
    const pSnap = await getDoc(providerRef);
    if (pSnap.exists()) {
      await updateDoc(providerRef, {
        activitiesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      console.warn(`[API] Provider ${data.providerId} not found, skipping counter update.`);
    }
  }
  return ref_.id;
}

export async function updateActivity(id, data) {
  await updateDoc(doc(db, 'activities', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteActivity(id, providerId) {
  await deleteDoc(doc(db, 'activities', id));
  if (providerId) {
    const providerRef = doc(db, 'providers', providerId);
    const pSnap = await getDoc(providerRef);
    if (pSnap.exists()) {
      await updateDoc(providerRef, {
        activitiesCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }
  }
}

export async function fetchActivityById(id) {
  const snap = await getDoc(doc(db, 'activities', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── PLACES ───────────────────────────────────────────────────────────────────
/**
 * Fetch all places (lieux) — enriched with providers & activities count
 */
export async function fetchPlaces(count = 30) {
  const q = query(collection(db, 'places'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchPlaceById(id) {
  const snap = await getDoc(doc(db, 'places', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchPlacesByCommune(communeId) {
  const q = query(
    collection(db, 'places'),
    where('communeId', '==', communeId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchProvidersForPlace(placeId) {
  const q = query(
    collection(db, 'providers'),
    where('placeId', '==', placeId),
    where('verified', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── PLATFORM STATS (real data via backend, never blocked by rules) ───────────
export async function fetchPlatformStats() {
  // 1. Try the backend endpoint (uses Admin SDK — no auth required)
  try {
    const res = await fetch(`${BACKEND_URL}/api/analytics/platform`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return await res.json();
  } catch (_) { /* backend unreachable, fall through */ }

  // 2. Try a cached stats document (publicly readable)
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'platformStats'));
    if (snap.exists()) return snap.data();
  } catch (_) { /* no cached doc, fall through */ }

  // 3. Count only collections that are publicly readable (providers, communes, activities)
  try {
    const [pSnap, cSnap, aSnap] = await Promise.all([
      getCountFromServer(query(collection(db, 'providers'), where('verified', '==', true))),
      getCountFromServer(collection(db, 'communes')),
      getCountFromServer(query(collection(db, 'activities'), where('active', '==', true))),
    ]);
    return {
      providers:  pSnap.data().count,
      communes:   cSnap.data().count,
      activities: aSnap.data().count,
      bookings:   0,   // bookings count requires auth — skipped on client
    };
  } catch (e) {
    console.warn('[STATS]', e.message);
    return { providers: 0, communes: 0, activities: 0, bookings: 0 };
  }
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
  if (data.providerId) {
    await updateDoc(doc(db, 'providers', data.providerId), {
      bookingCount: increment(1),
    });
  }
  if (data.activityId) {
    await updateDoc(doc(db, 'activities', data.activityId), {
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
    orderBy('createdAt', 'desc')
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
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ─── PROVIDER ANALYTICS (real stats from backend) ────────────────────────────
export async function fetchProviderAnalytics(providerId) {
  try {
    const headers = await authHeader();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${BACKEND_URL}/api/analytics/provider/${providerId}`, { 
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Backend unavailable');
    return await res.json();
  } catch (e) {
    console.warn('[ANALYTICS] Using Firestore fallback:', e.message);
    // Fallback: compute from Firestore
    const bookings = await fetchProviderBookings(providerId);
    const completed = bookings.filter(b => b.status === 'completed');
    const revenue = completed.reduce((s, b) => s + (b.totalPrice || 0), 0);

    // Monthly breakdown (last 7 months)
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('fr-MA', { month: 'short' });
      const monthBookings = bookings.filter(b => {
        const bd = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      });
      months.push({
        label,
        count: monthBookings.length,
        revenue: monthBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.totalPrice || 0), 0),
      });
    }
    return {
      totalRevenue: revenue,
      totalBookings: bookings.length,
      completedBookings: completed.length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      monthlyData: months,
      conversionRate: bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0,
    };
  }
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
  const reviews = await fetchReviews(data.targetId, 500);
  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  const targetCollection = data.targetType === 'product' ? 'products'
    : data.targetType === 'activity' ? 'activities' : 'providers';
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

export async function fetchAllCommunes(count = 15) {
  const snap = await getDocs(query(collection(db, 'communes'), limit(count)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchCommuneStats(communeId) {
  // 1. Try the backend endpoint (uses Admin SDK — bypasses rules for bookings count)
  try {
    const res = await fetch(`${BACKEND_URL}/api/analytics/commune/${communeId}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return await res.json();
  } catch (_) { /* backend unreachable, fall through */ }

  // 2. Fallback to client-side public queries (skip bookings to avoid permission errors)
  try {
    const providersQ = query(collection(db, 'providers'), where('communeId', '==', communeId), where('verified', '==', true));
    const activitiesQ = query(collection(db, 'activities'), where('communeId', '==', communeId), where('active', '==', true));
    const placesQ = query(collection(db, 'places'), where('communeId', '==', communeId));
    
    const [providersSnap, activitiesSnap, placesSnap] = await Promise.all([
      getCountFromServer(providersQ),
      getCountFromServer(activitiesQ),
      getCountFromServer(placesQ),
    ]);
    
    return {
      totalBookings: 0, // Bookings require auth
      activeProviders: providersSnap.data().count,
      totalActivities: activitiesSnap.data().count,
      totalPlaces: placesSnap.data().count,
    };
  } catch (e) {
    console.warn('[COMMUNE_STATS]', e.message);
    return { totalBookings: 0, activeProviders: 0, totalActivities: 0, totalPlaces: 0 };
  }
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
    updatedAt: serverTimestamp(),
  });
  return !isFav;
}

export async function fetchFavorites(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const favorites = snap.data()?.favorites || [];
  const providerIds = favorites.filter(f => f.startsWith('provider:')).map(f => f.split(':')[1]);
  const productIds = favorites.filter(f => f.startsWith('product:')).map(f => f.split(':')[1]);
  const activityIds = favorites.filter(f => f.startsWith('activity:')).map(f => f.split(':')[1]);

  const results = await Promise.all([
    ...providerIds.map(id => fetchProviderById(id)),
    ...activityIds.map(id => fetchActivityById(id)),
  ]);
  return results.filter(Boolean);
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
/**
 * Upload an image to Firebase Storage (or Cloudinary as fallback)
 * Free solution: Firebase Storage has 5GB free. Cloudinary is an alternative.
 */
export async function uploadImage(uri, path) {
  try {
    console.log(`[UPLOAD_START] Path: ${path}`);
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Check blob size (Max 10MB for free tier safety)
    if (blob.size > 10 * 1024 * 1024) {
      throw new Error('Image trop grande (max 10MB)');
    }

    const storageRef = ref(storage, path.includes('.') ? path : `${path}.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[UPLOAD_SUCCESS]', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('[UPLOAD_ERROR]', error);
    
    // If it's a "storage unknown" error, it likely means the bucket isn't initialized
    if (error.code === 'storage/unknown' || error.message.includes('unknown')) {
      throw new Error(
        "Erreur Firebase Storage : Le service n'est peut-être pas activé dans votre console Firebase ou le nom du bucket est incorrect. " +
        "Vérifiez que vous avez cliqué sur 'Commencer' dans l'onglet Storage de la console Firebase."
      );
    }
    
    throw error;
  }
}

/**
 * Resolves gs:// urls to public https urls if possible
 * Useful for legacy data or manually entered links
 */
export function resolveImageUrl(url) {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('gs://')) {
    try {
      const parts = url.split('gs://')[1].split('/');
      const bucket = parts[0];
      const filePath = encodeURIComponent(parts.slice(1).join('/'));
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${filePath}?alt=media`;
    } catch (e) {
      return url;
    }
  }
  return url;
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

export async function markAllNotificationsRead(uid) {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid), where('read', '==', false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

// ─── PASSENGER LINKING (Places ↔ Users ↔ Activities) ─────────────────────────
/**
 * Log a passenger visit to a place / activity
 */
export async function logPassengerVisit(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await addDoc(collection(db, 'passengerVisits'), {
    userId: uid,
    ...data,
    timestamp: serverTimestamp(),
  });
  // Update preference weight
  if (data.category) {
    const prefDoc = doc(db, 'userPreferences', uid);
    const snap = await getDoc(prefDoc);
    const prefs = snap.data() || {};
    const cats = prefs.preferredCategories || [];
    if (!cats.includes(data.category)) {
      await setDoc(prefDoc, {
        preferredCategories: arrayUnion(data.category),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }
}

/**
 * Fetch passenger history (places & activities visited)
 */
export async function fetchPassengerHistory(uid, count = 20) {
  const q = query(
    collection(db, 'passengerVisits'),
    where('userId', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get passengers (users who visited) for a place or activity
 */
export async function fetchPlacePassengers(placeId, count = 50) {
  const q = query(
    collection(db, 'passengerVisits'),
    where('placeId', '==', placeId),
    orderBy('timestamp', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Clean up test/mock data (Admin only)
 */
export async function cleanupCommuneData(communeId) {
  const headers = await authHeader();
  const res = await fetch(`${BACKEND_URL}/api/analytics/cleanup/${communeId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...headers
    }
  });
  if (!res.ok) throw new Error('Cleanup failed');
  return await res.json();
}
