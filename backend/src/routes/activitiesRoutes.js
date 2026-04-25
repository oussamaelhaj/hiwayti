/**
 * activitiesRoutes.js — HIWAYTI Activities API
 * CRUD for provider activities, linked to places & passengers
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

// ── GET all activities for a provider ────────────────────────────────────────
router.get('/provider/:providerId', requireAuth, async (req, res) => {
  try {
    const snap = await db().collection('activities')
      .where('providerId', '==', req.params.providerId)
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET activities by category ────────────────────────────────────────────────
router.get('/category/:category', async (req, res) => {
  try {
    const snap = await db().collection('activities')
      .where('category', '==', req.params.category)
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(req.query.limit) || 30)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET activity by ID ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await db().collection('activities').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CREATE activity ────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { providerId, ...data } = req.body;
    if (!providerId) return res.status(400).json({ error: 'providerId required' });

    // Verify ownership
    const provDoc = await db().collection('providers').doc(providerId).get();
    if (!provDoc.exists) return res.status(404).json({ error: 'Provider not found' });
    const isOwner = provDoc.data().ownerId === req.user.uid || req.user.uid === providerId;
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });

    const ref = await db().collection('activities').add({
      ...data,
      providerId,
      createdBy: req.user.uid,
      active: true,
      bookingCount: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db().collection('providers').doc(providerId).update({
      activitiesCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ id: ref.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── UPDATE activity ────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const actDoc = await db().collection('activities').doc(req.params.id).get();
    if (!actDoc.exists) return res.status(404).json({ error: 'Not found' });
    if (actDoc.data().createdBy !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db().collection('activities').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE activity ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const actDoc = await db().collection('activities').doc(req.params.id).get();
    if (!actDoc.exists) return res.status(404).json({ error: 'Not found' });
    if (actDoc.data().createdBy !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const providerId = actDoc.data().providerId;
    await db().collection('activities').doc(req.params.id).delete();
    if (providerId) {
      await db().collection('providers').doc(providerId).update({
        activitiesCount: admin.firestore.FieldValue.increment(-1),
      });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET passengers for an activity ────────────────────────────────────────────
router.get('/:id/passengers', requireAuth, async (req, res) => {
  try {
    const snap = await db().collection('passengerVisits')
      .where('activityId', '==', req.params.id)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
