/**
 * placesRoutes.js — HIWAYTI Places/Lieux API
 * Linking places → providers → activities → passengers
 */
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');

const db = () => admin.firestore();

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = await admin.auth().verifyIdToken(token); next(); }
  catch (e) { res.status(401).json({ error: 'Invalid token' }); }
}

// GET all places
router.get('/', async (req, res) => {
  try {
    const q = db().collection('places').limit(parseInt(req.query.limit) || 50);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET places by commune
router.get('/commune/:communeId', async (req, res) => {
  try {
    const snap = await db().collection('places')
      .where('communeId', '==', req.params.communeId).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single place with linked providers & activities
router.get('/:id', async (req, res) => {
  try {
    const placeDoc = await db().collection('places').doc(req.params.id).get();
    if (!placeDoc.exists) return res.status(404).json({ error: 'Not found' });
    const place = { id: placeDoc.id, ...placeDoc.data() };

    const [provSnap, actSnap] = await Promise.all([
      db().collection('providers').where('placeId', '==', req.params.id).where('verified', '==', true).get(),
      db().collection('activities').where('placeId', '==', req.params.id).where('active', '==', true).get(),
    ]);
    place.providers  = provSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    place.activities = actSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(place);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET passengers who visited a place
router.get('/:id/passengers', requireAuth, async (req, res) => {
  try {
    const snap = await db().collection('passengerVisits')
      .where('placeId', '==', req.params.id)
      .orderBy('timestamp', 'desc')
      .limit(50).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST log passenger visit
router.post('/:id/visit', requireAuth, async (req, res) => {
  try {
    await db().collection('passengerVisits').add({
      placeId:    req.params.id,
      userId:     req.user.uid,
      ...req.body,
      timestamp:  admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update place visitor count
    await db().collection('places').doc(req.params.id).update({
      visitorCount: admin.firestore.FieldValue.increment(1),
    }).catch(() => {});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
