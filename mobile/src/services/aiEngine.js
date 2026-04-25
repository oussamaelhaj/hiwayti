/**
 * aiEngine.js — HIWAYTI AI Recommendation Engine
 * Personalized suggestions using user history + location + preferences
 */
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Score a provider based on user preferences and context
 */
function scoreProvider(provider, userPrefs, userLocation) {
  let score = 0;

  // Category match (0–40)
  if (userPrefs.favoriteCategories?.includes(provider.category)) score += 40;
  else if (userPrefs.viewedCategories?.includes(provider.category)) score += 20;

  // Rating (0–30)
  score += (provider.rating || 0) * 6; // max 30 at rating 5

  // Distance penalty (0–20) — closer is better
  if (provider.distanceMeters != null) {
    const km = provider.distanceMeters / 1000;
    score += Math.max(0, 20 - km * 0.5);
  }

  // Popularity (0–10)
  const popularity = Math.min(provider.bookingCount || 0, 100);
  score += popularity / 10;

  return score;
}

/**
 * Main AI recommendation function
 * @param {Object} userPrefs - { favoriteCategories, viewedCategories, bookedProviders }
 * @param {Object|null} userLocation - { latitude, longitude }
 * @param {number} count - number of results
 */
export async function getAIRecommendations(userPrefs = {}, userLocation = null, count = 10) {
  try {
    // Fetch a broad set of verified providers
    const snap = await getDocs(query(
      collection(db, 'providers'),
      where('verified', '==', true),
      limit(150)
    ));
    const providers = snap.docs.map(d => {
      const data = d.data();
      let distanceMeters = null;
      if (userLocation && data.location) {
        const { haversineDistance } = require('../utils/helpers');
        distanceMeters = haversineDistance(
          userLocation.latitude, userLocation.longitude,
          data.location.latitude, data.location.longitude
        );
      }
      return { id: d.id, ...data, distanceMeters };
    });

    // Score + sort
    const scored = providers
      .filter(p => !userPrefs.bookedProviders?.includes(p.id)) // exclude already booked
      .map(p => ({ ...p, aiScore: scoreProvider(p, userPrefs, userLocation) }))
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, count);

    return scored;
  } catch (e) {
    console.warn('[AI] Recommendation error:', e.message);
    return [];
  }
}

/**
 * Suggest nearby artisans based on location + category affinity
 */
export async function getNearbyArtisanSuggestions(lat, lng, preferredCategories = [], count = 6) {
  try {
    const snap = await getDocs(query(
      collection(db, 'providers'),
      where('role', '==', 'artisan'),
      where('verified', '==', true),
      limit(100)
    ));
    const { haversineDistance } = require('../utils/helpers');
    const artisans = snap.docs
      .map(d => {
        const data = d.data();
        const dist = data.location
          ? haversineDistance(lat, lng, data.location.latitude, data.location.longitude)
          : 999999;
        const catBonus = preferredCategories.includes(data.category) ? 50000 : 0;
        const score = (data.rating || 0) * 5000 - dist + catBonus;
        return { id: d.id, ...data, distanceMeters: dist, aiScore: score };
      })
      .filter(a => a.distanceMeters < 100000) // within 100 km
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, count);
    return artisans;
  } catch (e) {
    console.warn('[AI] Artisan suggestion error:', e.message);
    return [];
  }
}

/**
 * Trending experiences — based on recent bookings + high rating
 */
export async function getTrendingExperiences(count = 8) {
  try {
    const snap = await getDocs(query(
      collection(db, 'providers'),
      where('verified', '==', true),
      orderBy('bookingCount', 'desc'),
      limit(count)
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[AI] Trending error:', e.message);
    return [];
  }
}

/**
 * Update user preference vector after interaction
 */
export function buildUserPrefsFromHistory(bookings = [], views = []) {
  const categoryCount = {};
  [...bookings, ...views].forEach(item => {
    if (item.category) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }
  });
  const sorted = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
  return {
    favoriteCategories: sorted.slice(0, 3),
    viewedCategories: sorted,
    bookedProviders: bookings.map(b => b.providerId).filter(Boolean),
  };
}
