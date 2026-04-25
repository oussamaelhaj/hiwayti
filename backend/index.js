/**
 * index.js — HIWAYTI Backend API
 * Google OAuth proxy, Stripe webhooks, role management, notifications
 */
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const admin       = require('firebase-admin');

// ─── FIREBASE ADMIN ────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId:  process.env.FIREBASE_PROJECT_ID || 'hiwayti',
  });
}
const db = admin.firestore();

// ─── APP ───────────────────────────────────────────────────────────────────
const app = express();

app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(morgan('dev'));

// Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true });
app.use('/api', limiter);

// Stripe raw body for webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', app: 'HIWAYTI', version: '1.0.0', timestamp: new Date().toISOString() }));

// ─── AUTH MIDDLEWARE ───────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token', detail: e.message });
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ─── ROUTES ────────────────────────────────────────────────────────────────
// Load route modules
const googleAuthRoutes    = require('./src/routes/googleAuthRoutes');
const roleRoutes          = require('./src/routes/roleRoutes');
const stripeRoutes        = require('./src/routes/stripeRoutes');
const analyticsRoutes     = require('./src/routes/analyticsRoutes');
const notifRoutes         = require('./src/routes/notificationRoutes');
const activitiesRoutes    = require('./src/routes/activitiesRoutes');
const placesRoutes        = require('./src/routes/placesRoutes');

app.use('/api/auth/google',   googleAuthRoutes);
app.use('/api/roles',         roleRoutes);
app.use('/api/payments',      stripeRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/activities',    activitiesRoutes);
app.use('/api/places',        placesRoutes);

// ─── PROVIDER VERIFICATION (Admin only) ───────────────────────────────────
app.patch('/api/providers/:id/verify', requireAdmin, async (req, res) => {
  try {
    await db.collection('providers').doc(req.params.id).update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: req.user.uid,
    });
    res.json({ success: true, id: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── COMMUNE STATS ─────────────────────────────────────────────────────────
app.get('/api/communes/:id/stats', requireAuth, async (req, res) => {
  try {
    const [bookingsSnap, providersSnap] = await Promise.all([
      db.collection('bookings').where('communeId', '==', req.params.id).count().get(),
      db.collection('providers').where('communeId', '==', req.params.id).where('verified', '==', true).count().get(),
    ]);
    res.json({
      totalBookings:   bookingsSnap.data().count,
      activeProviders: providersSnap.data().count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ERROR HANDLER ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── START ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌍 HIWAYTI Backend running on port ${PORT}`);
});

module.exports = app;
