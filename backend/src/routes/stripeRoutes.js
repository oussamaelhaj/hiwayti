/**
 * stripeRoutes.js — HIWAYTI Stripe Payment Integration
 * Payment intent creation + webhook to update booking status
 */
const express = require('express');
const admin   = require('firebase-admin');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router  = express.Router();

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (e) { res.status(401).json({ error: e.message }); }
}

// Create Stripe PaymentIntent
router.post('/create-intent', requireAuth, async (req, res) => {
  const { amount, currency = 'mad', bookingId, providerId, metadata = {} } = req.body;
  if (!amount || !bookingId) return res.status(400).json({ error: 'amount and bookingId required' });
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),  // Stripe uses smallest currency unit
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId,
        providerId: providerId || '',
        userId: req.user.uid,
        ...metadata,
      },
    });
    res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (e) {
    console.error('[STRIPE] Create intent error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stripe webhook — update booking status on successful payment
router.post('/webhook', async (req, res) => {
  const sig  = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const { bookingId, userId } = event.data.object.metadata;
    if (bookingId) {
      try {
        await admin.firestore().collection('bookings').doc(bookingId).update({
          status: 'confirmed',
          paymentStatus: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create payment record
        await admin.firestore().collection('payments').add({
          bookingId,
          userId,
          amount: event.data.object.amount / 100,
          currency: event.data.object.currency,
          stripeIntentId: event.data.object.id,
          status: 'succeeded',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ [STRIPE] Payment confirmed for booking: ${bookingId}`);
      } catch (e) {
        console.error('[STRIPE] Firestore update failed:', e.message);
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const { bookingId } = event.data.object.metadata;
    if (bookingId) {
      await admin.firestore().collection('bookings').doc(bookingId)
        .update({ paymentStatus: 'failed' }).catch(console.error);
    }
  }

  res.json({ received: true });
});

module.exports = router;
