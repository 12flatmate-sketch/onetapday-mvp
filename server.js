// server.js — single-file backend with HMAC-signed tokens (no jsonwebtoken required)
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let stripe = null;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
} catch (e) {
  console.warn('[WARN] stripe not configured or package missing — Stripe routes will fail if used.');
}

const app = express();
const PORT = process.env.PORT || 10000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret'; // set real secret in env

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// In-memory session index (optional helper)
const sessions = {}; // token -> email (not required for JWT flow, but we keep for compatibility)

// --- persistence helpers ---
let users = {}; // email -> { email, salt, hash, status, startAt, endAt, discountUntil, isAdmin, demoUsed }
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, 'utf8') || '{}';
    users = JSON.parse(raw || '{}');
    console.log(`[BOOT] loaded ${Object.keys(users).length} users`);
  }
} catch (e) {
  console.warn('[BOOT] failed to load users.json', e && e.message ? e.message : e);
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('[SAVE] failed to write users.json', e && e.stack ? e.stack : e);
  }
}

// --- crypto password helpers (pbkdf2) ---
function genSalt(len = 16) { return crypto.randomBytes(len).toString('hex'); }
function hashPassword(password, salt) {
  const iter = 100000, keylen = 64, digest = 'sha512';
  const derived = crypto.pbkdf2Sync(String(password), salt, iter, keylen, digest);
  return derived.toString('hex') + `:${iter}:${keylen}:${digest}`;
}
function verifyPassword(password, salt, storedHash) {
  if (!storedHash) return false;
  const [derivedHex, iterStr, keylenStr, digest] = (storedHash || '').split(':');
  const iter = Number(iterStr) || 100000;
  const keylen = Number(keylenStr) || 64;
  const cand = crypto.pbkdf2Sync(String(password), salt, iter, keylen, digest || 'sha512').toString('hex');
  return cand === derivedHex;
}

// --- simple HMAC-signed token (JWT-like) ---
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function hmacSha256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function createSessionToken(email, ttlSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const payload = { email, iat, exp: iat + Math.floor(ttlSeconds) };
  const headerB = base64url(JSON.stringify(header));
  const payloadB = base64url(JSON.stringify(payload));
  const sig = hmacSha256(SESSION_SECRET, headerB + '.' + payloadB);
  return `${headerB}.${payloadB}.${sig}`;
}
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [hB, pB, s] = parts;
  const expected = hmacSha256(SESSION_SECRET, `${hB}.${pB}`);
  if (expected !== s) return null;
  try {
    const payload = JSON.parse(Buffer.from(pB, 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper: set cookie and optionally return token to client
function setSessionCookie(res, email) {
  const token = createSessionToken(email);
  // httpOnly cookie for convenience
  res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: (process.env.NODE_ENV === 'production') });
  return token;
}

// Helper: get token from cookie or Authorization header
function getTokenFromReq(req) {
  // 1. Authorization header Bearer
  const auth = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.split(' ')[1].trim();
  // 2. Cookie
  if (req.cookies && req.cookies.session) return req.cookies.session;
  return null;
}

// Helper: get user by token or cookie
function getUserBySession(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload || !payload.email) return null;
  const email = String(payload.email).toLowerCase();
  const u = users[email];
  if (!u) return null;
  // expire statuses if needed
  expireStatuses(u);
  return u;
}

// expire statuses helper (persist if changed)
function expireStatuses(user) {
  if (!user) return false;
  const now = new Date();
  let changed = false;
  if (user.status === 'active' && user.endAt && new Date(user.endAt) < now) { user.status = 'ended'; changed = true; }
  if (user.status === 'discount_active' && user.discountUntil && new Date(user.discountUntil) < now) { user.status = 'ended'; changed = true; }
  if (changed) saveUsers();
  return changed;
}

function normalizeEmail(e) { return String(e || '').toLowerCase().trim(); }
function okPassword(p) { return typeof p === 'string' && p.length >= 8; }

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '1tapday@gmail.com').toLowerCase();

// ---------------- ROUTES ----------------

// Register
app.post('/register', (req, res) => {
  try {
    const emailRaw = req.body && (req.body.email || req.body.mail || req.body.login);
    const passRaw = req.body && (req.body.password || req.body.pass || req.body.pwd);
    const email = normalizeEmail(emailRaw);
    const password = passRaw;

    if (!email || !password) return res.status(400).json({ success: false, error: 'Missing email or password' });
    if (!okPassword(password)) return res.status(400).json({ success: false, error: 'Password too short (min 8 chars)' });
    if (users[email]) return res.status(409).json({ success: false, error: 'Email already registered' });

    const salt = genSalt(16);
    const storedHash = hashPassword(password, salt);

    users[email] = {
      email,
      salt,
      hash: storedHash,
      status: 'none',
      startAt: null,
      endAt: null,
      discountUntil: null,
      demoUsed: false,           // demo not used yet
      isAdmin: email === ADMIN_EMAIL
    };
    saveUsers();

    // create session cookie and return token so client can store/use across devices
    const token = setSessionCookie(res, email);

    return res.json({ success: true, user: { email, status: 'none', demoUsed: false }, token });
  } catch (err) {
    console.error('[REGISTER] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'internal', detail: String(err && err.message ? err.message : err) });
  }
});

// Login
app.post('/login', (req, res) => {
  try {
    const emailRaw = req.body && (req.body.email || req.body.mail || req.body.login);
    const passRaw = req.body && (req.body.password || req.body.pass || req.body.pwd);
    const email = normalizeEmail(emailRaw);
    const password = passRaw;

    if (!email || !password) return res.status(400).json({ success: false, error: 'Missing email or password' });

    const user = users[email];
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    const ok = verifyPassword(password, user.salt, user.hash);
    if (!ok) return res.status(401).json({ success: false, error: 'Incorrect password' });

    // create session cookie & token
    const token = setSessionCookie(res, email);

    // expire statuses if needed
    expireStatuses(user);

    return res.json({ success: true, user: { email, status: user.status || 'none', demoUsed: !!user.demoUsed }, token });
  } catch (err) {
    console.error('[LOGIN] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'internal' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  // Clear cookie (client should also drop stored token if any)
  res.clearCookie('session');
  return res.json({ success: true });
});

// Start demo (authenticated) — one-time
app.post('/start-demo', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

  if (user.demoUsed) return res.status(400).json({ success: false, error: 'Demo already used' });

  user.demoUsed = true;
  user.status = 'active';
  user.startAt = new Date().toISOString();
  user.endAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  saveUsers();

  return res.json({ success: true, demo_until: user.endAt, message: 'Demo started' });
});

// me
app.get('/me', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

  expireStatuses(user);
  const safe = Object.assign({}, user);
  delete safe.hash; delete safe.salt;
  return res.json({ success: true, user: safe });
});

// get user by email (used by frontend)
app.get('/user', (req, res) => {
  const emailQ = normalizeEmail(req.query && req.query.email);
  if (!emailQ) return res.status(400).json({ success: false, error: 'missing email' });
  const u = users[emailQ];
  if (!u) return res.status(404).json({ success: false, error: 'user not found' });

  expireStatuses(u);
  const safe = Object.assign({}, u); delete safe.hash; delete safe.salt;
  return res.json({ success: true, user: safe });
});

// Create Stripe Checkout Session (optional)
app.post('/create-checkout-session', async (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  if (!stripe) return res.status(500).json({ success: false, error: 'Stripe not configured' });

  try {
    expireStatuses(user);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'pln',
          product_data: { name: 'OneTapDay Pilot Deposit (2 months access)' },
          unit_amount: 9900
        },
        quantity: 1
      }],
      customer_email: user.email,
      metadata: { email: user.email },
      success_url: `${req.protocol}://${req.get('host')}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/?cancel=1`
    });
    return res.json({ sessionUrl: session.url, id: session.id });
  } catch (err) {
    console.error('[STRIPE] create session error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Stripe session creation failed' });
  }
});

// Stripe webhook
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) {
    console.warn('[WEBHOOK] stripe not configured');
    return res.status(400).send('stripe not configured');
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.error('[WEBHOOK] signature verification failed', err && err.message ? err.message : err);
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid'}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session.metadata && session.metadata.email) || (session.customer_details && session.customer_details.email);
    if (email && users[email]) {
      const u = users[email];
      u.status = 'active';
      u.startAt = new Date().toISOString();
      const end = new Date();
      end.setMonth(end.getMonth() + 2);
      u.endAt = end.toISOString();
      u.demoUsed = true; // make paid users not eligible for demo again
      saveUsers();
      console.log(`[WEBHOOK] activated pilot for ${email} until ${u.endAt}`);
    }
  }
  return res.json({ received: true });
});

// Admin endpoints (mark-paid/start-pilot)
app.post('/mark-paid', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
  user.status = 'deposit_paid';
  saveUsers();
  return res.json({ success: true });
});
app.post('/start-pilot', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
  user.status = 'active';
  user.startAt = new Date().toISOString();
  const end = new Date(); end.setMonth(end.getMonth() + 2);
  user.endAt = end.toISOString();
  saveUsers();
  return res.json({ success: true });
});

// catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error', err && err.stack ? err.stack : err);
  res.status(500).json({ success: false, error: 'internal' });
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
