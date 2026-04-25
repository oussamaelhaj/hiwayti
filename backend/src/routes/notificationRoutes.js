/**
 * notificationRoutes.js — HIWAYTI Push Notification Service
 * Send Expo push notifications for bookings, promos, commune updates
 */
const express = require('express');
const admin   = require('firebase-admin');
const router  = express.Router();

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (e) { res.status(401).json({ error: e.message }); }
}

async function sendExpoPushNotification(expoPushToken, title, body, data = {}) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      to:    expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    }),
  });
  return response.json();
}

// Send booking confirmation notification
router.post('/booking-confirmed', requireAuth, async (req, res) => {
  const { userId, bookingId, providerName, date, time } = req.body;
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const pushToken = userDoc.data()?.expoPushToken;

    if (pushToken) {
      await sendExpoPushNotification(
        pushToken,
        '✅ Réservation Confirmée',
        `Votre réservation chez ${providerName} le ${date} à ${time} est confirmée.`,
        { bookingId, type: 'booking' }
      );
    }

    // Store notification in Firestore
    await admin.firestore().collection('notifications').add({
      userId,
      type: 'booking',
      title: '✅ Réservation Confirmée',
      body: `Votre réservation chez ${providerName} le ${date} à ${time} est confirmée.`,
      bookingId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send commune broadcast
router.post('/commune-broadcast', requireAuth, async (req, res) => {
  const { communeId, title, body } = req.body;
  if (req.user.role !== 'commune' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Commune role required' });
  }
  try {
    // Get all users in commune who have push tokens
    const usersSnap = await admin.firestore().collection('users')
      .where('communeId', '==', communeId)
      .where('expoPushToken', '!=', null)
      .limit(500).get();

    const results = await Promise.allSettled(
      usersSnap.docs.map(d => {
        const { expoPushToken, uid } = d.data();
        return Promise.all([
          sendExpoPushNotification(expoPushToken, title, body, { communeId, type: 'commune' }),
          admin.firestore().collection('notifications').add({
            userId: uid, type: 'commune', title, body,
            communeId, read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        ]);
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ success: true, sent, total: usersSnap.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
