// server.js (bcrypt + simple JSON persistence)
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const app = express();

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

const PORT = process.env.PORT || 10000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Load users from disk (if exists) into memory on start
let users = {};    // users[email] = { email, passwordHash, status, startAt, endAt, discountUntil, isAdmin }
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    users = JSON.parse(raw) || {};
    console.log(`[BOOT] Loaded ${Object.keys(users).length} users from ${USERS_FILE}`);
  }
} catch (e) {
  console.warn('[BOOT] failed to load users.json', e && e.message ? e.message : e);
}

// In-memory sessions (still volatile — redeploy clears)
const sessions = {};

// Helper to persist users to disk (sync is fine for MVP)
function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('[SAVE] Failed to save users.json', e && e.stack ? e.stack : e);
  }
}

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Helpers
function getUserBySession(req) {
  const token = req.cookies && req.cookies.session;
  if (!token || !sessions[token]) return null;
  const email = sessions[token];
  return users[email] || null;
}
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '1tapday@gmail.com').toLowerCase();

// Basic validators
function normalizeEmail(e) {
  return String(e || '').toLowerCase().trim();
}
function validPassword(p) {
  return typeof p === 'string' && p.length >= 8; // min 8 chars — change if needed
}

// Registration
app.post('/register', async (req, res) => {
  try {
    console.log('[REGISTER] body-preview:', JSON.stringify(req.body || {}).slice(0,2000));
  } catch(e){}

  try {
    const email = normalizeEmail(req.body && req.body.email);
    const password = req.body && req.body.password;

    if (!email || !password) {
      return res.status(400).json({ success:false, error: 'Missing email or password' });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ success:false, error: 'Password too short (min 8 chars)' });
    }
    if (users[email]) {
      return res.status(409).json({ success:false, error: 'Email already registered' });
    }

    // bcrypt hash
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);

    users[email] = {
      email,
      passwordHash: hash,
      status: 'none',
      startAt: null,
      endAt: null,
      discountUntil: null,
      isAdmin: email === ADMIN_EMAIL
    };

    saveUsers();

    // create session
    const token = crypto.randomBytes(16).toString('hex');
    sessions[token] = email;
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: (process.env.NODE_ENV === 'production') });

    console.log('[REGISTER] success for', email);
    return res.json({ success:true, user: { email, status: 'none' } });
  } catch (err) {
    console.error('[REGISTER] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success:false, error:'internal', detail: String(err && err.message ? err.message : err) });
  }
});

// Login
app.post('/login', (req, res) => {
  try {
    const email = normalizeEmail(req.body && req.body.email);
    const password = req.body && req.body.password;

    if (!email || !password) {
      return res.status(400).json({ success:false, error: 'Missing email or password' });
    }
    const user = users[email];
    if (!user) return res.status(401).json({ success:false, error: 'User not found' });

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success:false, error: 'Incorrect password' });

    // create session
    const token = crypto.randomBytes(16).toString('hex');
    sessions[token] = email;
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: (process.env.NODE_ENV === 'production') });

    // normalize status expirations
    let status = user.status;
    if (user.status === 'active' && user.endAt && new Date(user.endAt) < new Date()) { user.status = 'ended'; status = 'ended'; }
    if (user.status === 'discount_active' && user.discountUntil && new Date(user.discountUntil) < new Date()) { user.status = 'ended'; status = 'ended'; }

    return res.json({ success:true, user: { email, status } });
  } catch (err) {
    console.error('[LOGIN] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success:false, error:'internal' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (token) delete sessions[token];
  res.clearCookie('session');
  return res.json({ success:true });
});

// start-demo, /me, /user etc. (reuse previous implementations)
// For brevity reuse previous handlers — paste your existing working handlers here
// ... (you already had these; keep them unchanged) ...

// Example: start-demo (simple)
app.post('/start-demo', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error:'Not authenticated' });

  user.status = 'active';
  user.startAt = new Date().toISOString();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.endAt = end.toISOString();
  saveUsers();

  return res.json({ success:true, demo_until: user.endAt, message: 'Demo started' });
});

// whoami
app.get('/me', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error:'Not authenticated' });
  const safe = Object.assign({}, user); delete safe.passwordHash;
  return res.json({ success:true, user: safe });
});

// user by email
app.get('/user', (req, res) => {
  const q = normalizeEmail(req.query && req.query.email);
  if (!q) return res.status(400).json({ success:false, error:'missing email' });
  const u = users[q];
  if (!u) return res.status(404).json({ success:false, error:'user not found' });
  const safe = Object.assign({}, u); delete safe.passwordHash;
  return res.json({ success:true, user: safe });
});

// keep your stripe/create-checkout-session and webhook handlers (unchanged from working version)
// ... paste your existing Stripe routes here ...

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
