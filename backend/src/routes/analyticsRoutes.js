/**
 * analyticsRoutes.js — HIWAYTI Analytics API
 * Economic impact, commune stats, category breakdowns
 */
const express = require('express');
const admin   = require('firebase-admin');
const router  = express.Router();

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    if (!['admin', 'commune'].includes(req.user.role))
      return res.status(403).json({ error: 'Access denied' });
    next();
  } catch (e) { res.status(401).json({ error: e.message }); }
}

// Platform-wide KPIs (admin only)
router.get('/platform', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const [providersC, bookingsC, productsC, usersC] = await Promise.all([
      db.collection('providers').count().get(),
      db.collection('bookings').count().get(),
      db.collection('products').count().get(),
      db.collection('users').count().get(),
    ]);
    const confirmedC = await db.collection('bookings').where('status', '==', 'confirmed').count().get();
    res.json({
      totalProviders: providersC.data().count,
      totalBookings:  bookingsC.data().count,
      confirmedBookings: confirmedC.data().count,
      totalProducts:  productsC.data().count,
      totalUsers:     usersC.data().count,
      timestamp:      new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Commune-specific stats
router.get('/commune/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const db = admin.firestore();
    const [bookingsC, providersC, pendingC] = await Promise.all([
      db.collection('bookings').where('communeId', '==', id).count().get(),
      db.collection('providers').where('communeId', '==', id).where('verified', '==', true).count().get(),
      db.collection('bookings').where('communeId', '==', id).where('status', '==', 'pending').count().get(),
    ]);
    res.json({
      communeId:       id,
      totalBookings:   bookingsC.data().count,
      activeProviders: providersC.data().count,
      pendingBookings: pendingC.data().count,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Log event (from mobile)
router.post('/event', async (req, res) => {
  const { event, data, userId } = req.body;
  try {
    await admin.firestore().collection('analytics').add({
      event, ...data, userId: userId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
