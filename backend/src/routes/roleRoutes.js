/**
 * roleRoutes.js — HIWAYTI Role & Custom Claims Management
 */
const express = require('express');
const admin   = require('firebase-admin');
const router  = express.Router();

async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.user = decoded;
    next();
  } catch (e) { res.status(401).json({ error: e.message }); }
}

// Set user role (admin only)
router.post('/set-role', requireAdmin, async (req, res) => {
  const { uid, role } = req.body;
  const validRoles = ['tourist', 'artisan', 'provider', 'commune', 'admin'];
  if (!uid || !validRoles.includes(role))
    return res.status(400).json({ error: 'uid and valid role required' });
  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    await admin.firestore().collection('users').doc(uid).update({ role });
    res.json({ success: true, uid, role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Verify a provider (admin only)
router.post('/verify-provider', requireAdmin, async (req, res) => {
  const { providerId } = req.body;
  if (!providerId) return res.status(400).json({ error: 'providerId required' });
  try {
    await admin.firestore().collection('providers').doc(providerId).update({
      verified:   true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, providerId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
