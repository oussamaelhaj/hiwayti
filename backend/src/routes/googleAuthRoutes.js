/**
 * googleAuthRoutes.js — Google OAuth proxy for HIWAYTI
 * Same proven pattern as Padel IQ — session-based polling
 */
const express  = require('express');
const { OAuth2Client } = require('google-auth-library');
const admin    = require('firebase-admin');

const router   = express.Router();
const sessions = {};  // In-memory session store; use Redis in production

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI || 'https://hiwayti-backend.onrender.com/api/auth/google/callback';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ── Initiate OAuth ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  sessions[session_id] = { status: 'pending', createdAt: Date.now() };

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    state: session_id,
    prompt: 'select_account',
  });

  res.redirect(authUrl);
});

// ── OAuth callback ────────────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state: session_id } = req.query;
  if (!sessions[session_id]) return res.status(400).send('Session invalide');
  if (!code) {
    sessions[session_id] = { status: 'error', error: 'No authorization code' };
    return res.send('<script>window.close();</script>');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get Google profile
    const ticket = await oauth2Client.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();

    // Get or create Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(payload.email);
    } catch (_) {
      firebaseUser = await admin.auth().createUser({
        email:       payload.email,
        displayName: payload.name,
        photoURL:    payload.picture,
        emailVerified: payload.email_verified,
      });
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    // Update session
    sessions[session_id] = {
      status:       'complete',
      customToken,
      uid:          firebaseUser.uid,
      displayName:  payload.name,
      email:        payload.email,
      photoURL:     payload.picture,
    };

    // Upsert user profile in Firestore
    await admin.firestore().collection('users').doc(firebaseUser.uid).set({
      uid:         firebaseUser.uid,
      displayName: payload.name,
      email:       payload.email,
      avatarUrl:   payload.picture,
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.send(`
      <html>
        <body style="background:#06060e;color:#C9A84C;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
          <h2>✅ Connecté avec succès !</h2>
          <p>Vous pouvez fermer cette fenêtre.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[OAUTH] Callback error:', err.message);
    sessions[session_id] = { status: 'error', error: err.message };
    res.send('<script>window.close();</script>');
  }
});

// ── Polling endpoint ──────────────────────────────────────────────────────
router.get('/poll', (req, res) => {
  const { session_id } = req.query;
  const session = sessions[session_id];
  if (!session) return res.json({ status: 'pending' });

  // Cleanup old sessions (> 5 min)
  if (Date.now() - session.createdAt > 300000) {
    delete sessions[session_id];
    return res.json({ status: 'error', error: 'Session expired' });
  }

  if (session.status === 'complete') {
    const data = { ...session };
    delete sessions[session_id];  // Consume session
    return res.json(data);
  }

  res.json({ status: session.status, error: session.error });
});

module.exports = router;
