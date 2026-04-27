/**
 * theme.js — HIWAYTI Design System
 * Premium dark UI with Moroccan gold identity
 * Inspired by Apple-level startup aesthetics
 */

// ─── COLOR PALETTE ─────────────────────────────────────────────────────────
export const colors = {
  // Deep backgrounds
  bg: '#06060e',        // near-black deepspace
  bgCard: '#0e0e1c',        // card surface
  bgElevated: '#161628',        // elevated panels
  bgInput: '#1a1a30',        // input fields
  bgModal: '#0b0b1a',        // modal overlays

  // Moroccan Gold brand identity
  gold: '#C9A84C',        // primary gold
  goldLight: '#E8C96A',        // highlight gold
  goldDim: '#8A6E2F',        // muted gold
  goldGlow: 'rgba(201, 168, 76, 0.18)',  // glow overlay
  goldBorder: 'rgba(201, 168, 76, 0.25)',  // card borders

  // Teal accent (actions / CTAs)
  accent: '#1DD6C3',        // teal brand
  accentDim: '#13A090',
  accentGlow: 'rgba(29, 214, 195, 0.15)',

  // Status
  danger: '#FF4C6B',
  dangerGlow: 'rgba(255, 76, 107, 0.15)',
  warning: '#FFA940',
  success: '#22D98A',
  info: '#3D94F6',

  // Text hierarchy
  textPrimary: '#F2F0E8',       // warm white
  textSecondary: '#9190A8',       // muted
  textMuted: '#3E3D52',       // disabled / placeholder
  textGold: '#C9A84C',       // brand text

  // Category colors — for icons and pills
  surf: '#3D94F6',
  padel: '#1DD6C3',
  hiking: '#22D98A',
  pottery: '#C9A84C',
  leather: '#B36A3F',
  textiles: '#9B59B6',
  cuisine: '#FF6B6B',
  music: '#FF8CC8',

  // Moroccan Artisan Palette
  terracotta: '#E2725B',        // Red of Marrakech
  indigo: '#2B3D6B',        // Blue of Chefchaouen
  mint: '#00A86B',        // Green of Moroccan Tea
  saffron: '#F4C430',        // Yellow of Spices
  copper: '#B87333',        // Copper of souks

  // Chart & data viz
  chart: ['#C9A84C', '#1DD6C3', '#E2725B', '#2B3D6B', '#00A86B', '#F4C430', '#B87333', '#FF4C6B'],
};

// ─── SPACING ────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ─── RADIUS ─────────────────────────────────────────────────────────────────
export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

// ─── TYPOGRAPHY ─────────────────────────────────────────────────────────────
export const typography = {
  display: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  h2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 19, fontWeight: '600' },
  h4: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyMd: { fontSize: 14, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '400' },
  captionBold: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  mono: { fontFamily: 'monospace', fontSize: 13 },
};

// ─── SHADOWS ────────────────────────────────────────────────────────────────
export const shadow = {
  gold: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  accent: {
    shadowColor: '#1DD6C3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  none: {},
};

// ─── GRADIENT PRESETS ───────────────────────────────────────────────────────
export const gradients = {
  bgDeep: ['#06060e', '#0b0b1a'],
  bgMid: ['#0e0e1c', '#14142a'],
  gold: ['#C9A84C', '#8A6E2F'],
  goldWarm: ['#E8C96A', '#C9A84C'],
  teal: ['#1DD6C3', '#13A090'],
  moroccan: ['#1a0a00', '#0a0614'],  // deep terracotta + indigo
  marrakech: ['#E2725B', '#8B4513'],  // terracotta to leather
  atlas: ['#2B3D6B', '#0b0b1a'],  // indigo to deep night
  sahara: ['#F4C430', '#C9A84C'],  // saffron to gold
  card: ['rgba(22,22,40,0.9)', 'rgba(14,14,28,0.95)'],
  overlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'],
};

// ─── CATEGORY METADATA ──────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'surf', labelFr: 'Surf & Océan', labelAr: 'ركوب الأمواج', icon: 'water', color: colors.surf, emoji: '🏄' },
  { id: 'padel', labelFr: 'Padel Club', labelAr: 'بادل', icon: 'tennisball', color: colors.padel, emoji: '🎾' },
  { id: 'hiking', labelFr: 'Atlas Trek', labelAr: 'المشي', icon: 'trail-sign', color: colors.hiking, emoji: '🏔️' },
  { id: 'pottery', labelFr: 'Art du Feu', labelAr: 'الفخار', icon: 'color-palette', color: colors.pottery, emoji: '🏺' },
  { id: 'leather', labelFr: 'Cuir & Peau', labelAr: 'الجلد', icon: 'briefcase', color: colors.leather, emoji: '👜' },
  { id: 'textiles', labelFr: 'Tissage', labelAr: 'النسيج', icon: 'shirt', color: colors.textiles, emoji: '🧵' },
  { id: 'cuisine', labelFr: 'Saveurs', labelAr: 'الطهي', icon: 'restaurant', color: colors.cuisine, emoji: '🍽️' },
  { id: 'music', labelFr: 'Rythmes', labelAr: 'الموسيقى', icon: 'musical-notes', color: colors.music, emoji: '🎵' },
];

// ─── USER ROLES ─────────────────────────────────────────────────────────────
export const USER_ROLES = {
  TOURIST: 'tourist',
  ARTISAN: 'artisan',
  PROVIDER: 'provider',  // sports clubs, guides
  COMMUNE: 'commune',
  ADMIN: 'admin',
};
