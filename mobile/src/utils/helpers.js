/**
 * helpers.js — HIWAYTI utility functions
 */
import * as Haptics from 'expo-haptics';

// ─── HAPTICS (wrapped safe) ──────────────────────────────────────────────────
export const haptic = {
  light:   () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(_){} },
  medium:  () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(_){} },
  heavy:   () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch(_){} },
  select:  () => { try { Haptics.selectionAsync(); } catch(_){} },
  success: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch(_){} },
  error:   () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch(_){} },
  warning: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch(_){} },
};

// ─── FORMATTING ──────────────────────────────────────────────────────────────
export function formatPrice(amount, currency = 'MAD') {
  if (!amount && amount !== 0) return '—';
  return `${Number(amount).toLocaleString('fr-MA')} ${currency}`;
}

export function formatRating(rating) {
  if (!rating) return '—';
  return Number(rating).toFixed(1);
}

export function formatDistance(meters) {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
}

export function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(d);
}

// ─── STRING ──────────────────────────────────────────────────────────────────
export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

export function truncate(str = '', maxLen = 60) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '…';
}

// ─── MATH ────────────────────────────────────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── STAR RATING ─────────────────────────────────────────────────────────────
export function starsArray(rating = 0) {
  return Array.from({ length: 5 }, (_, i) => {
    if (i + 1 <= Math.floor(rating)) return 'full';
    if (i < rating) return 'half';
    return 'empty';
  });
}

// ─── BOOKING ─────────────────────────────────────────────────────────────────
export function getBookingStatusColor(status) {
  const map = {
    pending:   '#FFA940',
    confirmed: '#22D98A',
    cancelled: '#FF4C6B',
    completed: '#3D94F6',
  };
  return map[status] || '#9190A8';
}

export function getBookingStatusLabel(status) {
  const map = {
    pending:   'En attente',
    confirmed: 'Confirmé',
    cancelled: 'Annulé',
    completed: 'Terminé',
  };
  return map[status] || status;
}
