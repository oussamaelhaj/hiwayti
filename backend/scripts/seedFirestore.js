/**
 * HIWAYTI Firestore Schema Reference
 * Run this script to seed demo data into your Firestore instance
 * Usage: node seedFirestore.js (from backend directory)
 */
const admin = require('firebase-admin');

// Initialize with service account key
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── PROVIDERS SEED DATA ─────────────────────────────────────────────────────
const providers = [
  {
    id: 'provider_surf_asilah',
    name: 'Asilah Surf Club',
    role: 'provider',
    category: 'surf',
    commune: 'Asilah',
    communeId: 'commune_asilah',
    rating: 4.8,
    reviewCount: 127,
    bookingCount: 342,
    price: 350,
    priceUnit: '/session',
    maxParticipants: 8,
    verified: true,
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    description: 'Le meilleur club de surf du nord du Maroc. Cours pour tous niveaux, matériel inclus, instructeurs certifiés ISA.',
    location: new admin.firestore.GeoPoint(35.4650, -6.0340),
    phone: '+212 661 234 567',
    email: 'contact@asilahsurf.ma',
    schedule: { 'Lun-Ven': '08:00 - 18:00', 'Sam-Dim': '07:00 - 20:00' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'provider_padel_marrakech',
    name: 'Padel Royal Marrakech',
    role: 'provider',
    category: 'padel',
    commune: 'Marrakech',
    communeId: 'commune_marrakech',
    rating: 4.7,
    reviewCount: 89,
    bookingCount: 215,
    price: 280,
    priceUnit: '/heure',
    maxParticipants: 4,
    verified: true,
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    description: '6 courts premium, éclairage nocturne, vestiaires, restaurant. Club certifié FRP.',
    location: new admin.firestore.GeoPoint(31.6295, -7.9811),
    phone: '+212 524 000 123',
    schedule: { 'Quotidien': '07:00 - 23:00' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'provider_hiking_atlas',
    name: 'Atlas Trek & Guide',
    role: 'provider',
    category: 'hiking',
    commune: 'Imlil',
    communeId: 'commune_imlil',
    rating: 4.9,
    reviewCount: 204,
    bookingCount: 456,
    price: 450,
    priceUnit: '/jour',
    maxParticipants: 12,
    verified: true,
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    description: 'Guides certifiés pour le Toubkal, treks personnalisés, bivouac, mules disponibles.',
    location: new admin.firestore.GeoPoint(31.1357, -7.9190),
    phone: '+212 662 987 654',
    schedule: { 'Toute l\'année': 'Sur réservation' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'artisan_pottery_fes',
    name: 'Maître Hassan — Poterie de Fès',
    role: 'artisan',
    category: 'pottery',
    commune: 'Fès',
    communeId: 'commune_fes',
    rating: 4.9,
    reviewCount: 312,
    bookingCount: 198,
    price: 200,
    priceUnit: '/atelier',
    maxParticipants: 6,
    verified: true,
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
    description: 'Descendant d\'une famille de potiers depuis 7 générations. Ateliers de poterie traditionnelle en zellige et khabia.',
    location: new admin.firestore.GeoPoint(34.0525, -4.9998),
    phone: '+212 535 000 789',
    schedule: { 'Mar-Dim': '09:00 - 17:00' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'artisan_leather_marrakech',
    name: 'Tannerie Chouara Artisans',
    role: 'artisan',
    category: 'leather',
    commune: 'Marrakech',
    communeId: 'commune_marrakech',
    rating: 4.6,
    reviewCount: 178,
    bookingCount: 89,
    price: 150,
    priceUnit: '/visite',
    verified: true,
    featured: false,
    coverImage: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800',
    description: 'Maroquinerie artisanale 100% cuir naturel. Sacs, ceintures, babouches. Expédition internationale.',
    location: new admin.firestore.GeoPoint(31.6350, -7.9890),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

// ─── PRODUCTS SEED DATA ───────────────────────────────────────────────────────
const products = [
  {
    id: 'product_tajine_fes',
    name: 'Tajine en Poterie Bleue de Fès',
    artisanId: 'artisan_pottery_fes',
    artisanName: 'Maître Hassan',
    category: 'pottery',
    price: 450,
    rating: 4.9,
    reviewCount: 87,
    available: true,
    soldCount: 234,
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400',
    description: 'Tajine artisanal peint à la main, motifs géométriques traditionnels de Fès.',
    communeId: 'commune_fes',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'product_bag_marrakech',
    name: 'Sac en Cuir Berbère — Cognac',
    artisanId: 'artisan_leather_marrakech',
    artisanName: 'Tannerie Chouara',
    category: 'leather',
    price: 1200,
    rating: 4.8,
    reviewCount: 56,
    available: true,
    soldCount: 123,
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
    description: 'Sac à main en cuir véritable tanné naturellement, broderie berbère à la main.',
    communeId: 'commune_marrakech',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'product_kilim_azilal',
    name: 'Kilim Azilal Authentique',
    artisanId: 'artisan_textile_azilal',
    artisanName: 'Fatima Ait Benhaddou',
    category: 'textiles',
    price: 2800,
    rating: 5.0,
    reviewCount: 34,
    available: true,
    soldCount: 67,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    description: 'Kilim tissé à la main par des femmes de la tribu Ait Benhaddou. Motifs berbères uniques.',
    communeId: 'commune_azilal',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

// ─── COMMUNES SEED DATA ───────────────────────────────────────────────────────
const communes = [
  {
    id: 'commune_marrakech',
    name: 'Marrakech',
    region: 'Marrakech-Safi',
    population: 959000,
    rating: 4.7,
    activeProviders: 142,
    monthlyRevenue: 285000,
    touristSatisfaction: 92,
    location: new admin.firestore.GeoPoint(31.6295, -7.9811),
    coverImage: 'https://images.unsplash.com/photo-1570101945621-945409a6370f?w=800',
  },
  {
    id: 'commune_fes',
    name: 'Fès',
    region: 'Fès-Meknès',
    population: 1150000,
    rating: 4.8,
    activeProviders: 98,
    monthlyRevenue: 192000,
    touristSatisfaction: 94,
    location: new admin.firestore.GeoPoint(34.0525, -4.9998),
    coverImage: 'https://images.unsplash.com/photo-1597825026743-41bbd9e56ab4?w=800',
  },
  {
    id: 'commune_asilah',
    name: 'Asilah',
    region: 'Tanger-Tétouan-Al Hoceïma',
    population: 31000,
    rating: 4.9,
    activeProviders: 34,
    monthlyRevenue: 78000,
    touristSatisfaction: 96,
    location: new admin.firestore.GeoPoint(35.4650, -6.0340),
    coverImage: 'https://images.unsplash.com/photo-1571216894085-f8eaeb8a0112?w=800',
  },
  {
    id: 'commune_agadir',
    name: 'Agadir',
    region: 'Souss-Massa',
    population: 421000,
    rating: 4.6,
    activeProviders: 110,
    monthlyRevenue: 210000,
    touristSatisfaction: 90,
    location: new admin.firestore.GeoPoint(30.4278, -9.5981),
    coverImage: 'https://images.unsplash.com/photo-1583492582987-a2f0eb34b5c7?w=800',
  },
  {
    id: 'commune_tanger',
    name: 'Tanger',
    region: 'Tanger-Tétouan-Al Hoceïma',
    population: 947000,
    rating: 4.7,
    activeProviders: 125,
    monthlyRevenue: 240000,
    touristSatisfaction: 91,
    location: new admin.firestore.GeoPoint(35.7595, -5.8340),
    coverImage: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800',
  },
  {
    id: 'commune_chefchaouen',
    name: 'Chefchaouen',
    region: 'Tanger-Tétouan-Al Hoceïma',
    population: 42000,
    rating: 4.9,
    activeProviders: 56,
    monthlyRevenue: 110000,
    touristSatisfaction: 97,
    location: new admin.firestore.GeoPoint(35.1716, -5.2697),
    coverImage: 'https://images.unsplash.com/photo-1549405436-1e0e854fa4fb?w=800',
  },
  {
    id: 'commune_essaouira',
    name: 'Essaouira',
    region: 'Marrakech-Safi',
    population: 77000,
    rating: 4.8,
    activeProviders: 85,
    monthlyRevenue: 150000,
    touristSatisfaction: 95,
    location: new admin.firestore.GeoPoint(31.5085, -9.7595),
    coverImage: 'https://images.unsplash.com/photo-1587395015842-8356cc5b36bd?w=800',
  },
  {
    id: 'commune_rabat',
    name: 'Rabat',
    region: 'Rabat-Salé-Kénitra',
    population: 577000,
    rating: 4.5,
    activeProviders: 95,
    monthlyRevenue: 180000,
    touristSatisfaction: 88,
    location: new admin.firestore.GeoPoint(34.0209, -6.8416),
    coverImage: 'https://images.unsplash.com/photo-1532057793574-d4f77c38cbe2?w=800',
  },
  {
    id: 'commune_casablanca',
    name: 'Casablanca',
    region: 'Casablanca-Settat',
    population: 3359000,
    rating: 4.4,
    activeProviders: 210,
    monthlyRevenue: 450000,
    touristSatisfaction: 85,
    location: new admin.firestore.GeoPoint(33.5731, -7.5898),
    coverImage: 'https://images.unsplash.com/photo-1563806283-bc2ebbb540ae?w=800',
  },
  {
    id: 'commune_ouarzazate',
    name: 'Ouarzazate',
    region: 'Drâa-Tafilalet',
    population: 71000,
    rating: 4.7,
    activeProviders: 65,
    monthlyRevenue: 120000,
    touristSatisfaction: 93,
    location: new admin.firestore.GeoPoint(30.9189, -6.8934),
    coverImage: 'https://images.unsplash.com/photo-1587235287012-de54efcbf018?w=800',
  },
  {
    id: 'commune_dakhla',
    name: 'Dakhla',
    region: 'Dakhla-Oued Ed-Dahab',
    population: 106000,
    rating: 4.9,
    activeProviders: 45,
    monthlyRevenue: 140000,
    touristSatisfaction: 96,
    location: new admin.firestore.GeoPoint(23.7145, -15.9388),
    coverImage: 'https://images.unsplash.com/photo-1594589255676-e1e7fbcb8e13?w=800',
  },
  {
    id: 'commune_merzouga',
    name: 'Merzouga',
    region: 'Drâa-Tafilalet',
    population: 1500,
    rating: 4.9,
    activeProviders: 70,
    monthlyRevenue: 190000,
    touristSatisfaction: 98,
    location: new admin.firestore.GeoPoint(31.0967, -3.9877),
    coverImage: 'https://images.unsplash.com/photo-1600861194802-a2b11076b1f2?w=800',
  }
];

// ─── RUN SEED ─────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌍 Seeding HIWAYTI Firestore...');
  const batch = db.batch();

  providers.forEach(p => {
    const { id, ...data } = p;
    batch.set(db.collection('providers').doc(id), data);
  });

  products.forEach(p => {
    const { id, ...data } = p;
    batch.set(db.collection('products').doc(id), data);
  });

  communes.forEach(c => {
    const { id, ...data } = c;
    batch.set(db.collection('communes').doc(id), data);
  });

  await batch.commit();
  console.log(`✅ Seeded: ${providers.length} providers, ${products.length} products, ${communes.length} communes`);
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
