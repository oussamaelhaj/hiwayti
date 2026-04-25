/**
 * analyticsRoutes.js — HIWAYTI Analytics API (Backend/Render)
 * Provider analytics, platform stats, commune stats
 */
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');

const db = () => admin.firestore();

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Platform Stats ──────────────────────────────────────────────────────────
router.get('/platform', async (req, res) => {
  try {
    const fs = db();
    const [pSnap, cSnap, aSnap, bSnap] = await Promise.all([
      fs.collection('providers').where('verified', '==', true).count().get(),
      fs.collection('communes').count().get(),
      fs.collection('activities').where('active', '==', true).count().get(),
      fs.collection('bookings').count().get(),
    ]);
    res.json({
      providers:  pSnap.data().count,
      communes:   cSnap.data().count,
      activities: aSnap.data().count,
      bookings:   bSnap.data().count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Provider Analytics ───────────────────────────────────────────────────────
router.get('/provider/:id', requireAuth, async (req, res) => {
  try {
    const fs = db();
    const providerId = req.params.id;

    // Verify ownership or admin
    if (req.user.uid !== providerId && req.user.role !== 'admin') {
      const provDoc = await fs.collection('providers').doc(providerId).get();
      if (!provDoc.exists || provDoc.data().ownerId !== req.user.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const bookingsSnap = await fs.collection('bookings')
      .where('providerId', '==', providerId)
      .orderBy('createdAt', 'desc')
      .get();
    const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const completed  = bookings.filter(b => b.status === 'completed');
    const pending    = bookings.filter(b => b.status === 'pending');
    const confirmed  = bookings.filter(b => b.status === 'confirmed');
    const cancelled  = bookings.filter(b => b.status === 'cancelled');
    const revenue    = completed.reduce((s, b) => s + (b.totalPrice || 0), 0);

    // Monthly breakdown (last 7 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString('fr-MA', { month: 'short' });
      const monthBks = bookings.filter(b => {
        const bd = b.createdAt?._seconds
          ? new Date(b.createdAt._seconds * 1000)
          : new Date(b.createdAt || 0);
        return bd >= d && bd < next;
      });
      monthlyData.push({
        label,
        count:   monthBks.length,
        revenue: monthBks.filter(b => b.status === 'completed').reduce((s, b) => s + (b.totalPrice || 0), 0),
      });
    }

    res.json({
      totalRevenue:       revenue,
      totalBookings:      bookings.length,
      completedBookings:  completed.length,
      pendingBookings:    pending.length,
      confirmedBookings:  confirmed.length,
      cancelledBookings:  cancelled.length,
      conversionRate:     bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0,
      monthlyData,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Commune Stats ────────────────────────────────────────────────────────────
router.get('/commune/:id', async (req, res) => {
  try {
    const fs = db();
    const communeId = req.params.id;
    const [bSnap, pSnap, aSnap, plSnap] = await Promise.all([
      fs.collection('bookings').where('communeId', '==', communeId).count().get(),
      fs.collection('providers').where('communeId', '==', communeId).where('verified', '==', true).count().get(),
      fs.collection('activities').where('communeId', '==', communeId).where('active', '==', true).count().get(),
      fs.collection('places').where('communeId', '==', communeId).count().get(),
    ]);
    res.json({
      totalBookings:   bSnap.data().count,
      activeProviders: pSnap.data().count,
      totalActivities: aSnap.data().count,
      totalPlaces:     plSnap.data().count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Log event ────────────────────────────────────────────────────────────────
router.post('/event', requireAuth, async (req, res) => {
  try {
    const { event, ...data } = req.body;
    if (!event) return res.status(400).json({ error: 'event required' });
    await db().collection('analytics').add({
      event,
      ...data,
      userId: req.user.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
