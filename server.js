// server.js — working backend with compatibility for legacy users (sha256), no external jwt dependency
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// stripe is optional but kept
let stripe = null;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
} catch (e) {
  console.warn('[WARN] stripe not configured or package missing — Stripe routes will fail if used.');
}

const app = express();
const PORT = process.env.PORT || 10000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // allow larger payload for base64 images
app.use(express.static('public'));

// serve uploaded images (if any)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir); } catch(e) { console.warn('[UPLOAD] mkdir failed', e && e.message); }
}
app.use('/uploads', express.static(uploadsDir));

// volatile sessions map kept for backward compatibility with old random tokens
const sessions = {}; // token -> email

// --- Lightweight JWT-like session functions (no dependency on jsonwebtoken) ---
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

function base64urlEncode(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function base64urlDecode(input) {
  const b = input.replace(/-/g, '+').replace(/_/g, '/');
  // add padding
  const pad = b.length % 4 === 0 ? '' : '='.repeat(4 - (b.length % 4));
  return Buffer.from(b + pad, 'base64').toString();
}
function hmacSha256(data) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function timingSafeEqualStr(a, b) {
  try {
    const A = Buffer.from(String(a));
    const B = Buffer.from(String(b));
    if (A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch (e) { return false; }
}
function createSessionToken(email) {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600; // 7 days
  const payload = base64urlEncode(JSON.stringify({ email, exp }));
  const sig = hmacSha256(header + '.' + payload);
  return `${header}.${payload}.${sig}`;
}
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = hmacSha256(header + '.' + payload);
  if (!timingSafeEqualStr(expected, sig)) return null;
  try {
    const obj = JSON.parse(base64urlDecode(payload));
    if (obj.exp && Math.floor(Date.now() / 1000) > Number(obj.exp)) return null;
    return obj;
  } catch (e) {
    return null;
  }
}
function setSessionCookie(res, email) {
  const token = createSessionToken(email);
  // set cookie; secure in production
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.NODE_ENV === 'production')
  });
  // also keep mapping for backwards compatibility if needed
  sessions[token] = email;
}

// Load or init users persistence
let users = {}; // users[email] = { email, salt, hash, maybe passwordHash (legacy), status, startAt, endAt, discountUntil, isAdmin, demoUsed, appState }
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
    console.log(`[BOOT] loaded ${Object.keys(users).length} users`);
  }
} catch (e) {
  console.warn('[BOOT] failed to load users.json', e && e.message ? e.message : e);
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) { console.error('[SAVE] failed to write users.json', e && e.stack ? e.stack : e); }
}

// crypto helpers (pbkdf2)
function genSalt(len = 16) {
  return crypto.randomBytes(len).toString('hex');
}
function hashPassword(password, salt) {
  const iter = 100000;
  const keylen = 64;
  const digest = 'sha512';
  const derived = crypto.pbkdf2Sync(String(password), salt, iter, keylen, digest);
  return derived.toString('hex') + `:${iter}:${keylen}:${digest}`;
}
function verifyPassword(password, salt, storedHash) {
  if (!storedHash) return false;
  const [derivedHex, iterStr, keylenStr, digest] = (storedHash || '').split(':');
  const iter = Number(iterStr) || 100000;
  const keylen = Number(keylenStr) || 64;
  const candidate = crypto.pbkdf2Sync(String(password), salt, iter, keylen, digest || 'sha512').toString('hex');
  return candidate === derivedHex;
}

// Legacy SHA256 helper (older deployments used sha256(password) maybe stored under passwordHash)
function sha256hex(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

// expire statuses helper (updates and persists if changed)
function expireStatuses(user) {
  if (!user) return false;
  const now = new Date();
  let changed = false;
  if (user.status === 'active' && user.endAt && new Date(user.endAt) < now) {
    user.status = 'ended';
    changed = true;
  }
  if (user.status === 'discount_active' && user.discountUntil && new Date(user.discountUntil) < now) {
    user.status = 'ended';
    changed = true;
  }
  if (changed) saveUsers();
  return changed;
}

function normalizeEmail(e) {
  return String(e || '').toLowerCase().trim();
}
function okPassword(p) {
  return typeof p === 'string' && p.length >= 8;
}

// Compatibility: try to find user by key or by scanning values (case where key schema changed)
function findUserByEmail(email) {
  if (!email) return null;
  const e = normalizeEmail(email);
  if (users[e]) return users[e];
  // fallback: search values for a user where user.email matches normalized email
  const vals = Object.values(users);
  for (let i = 0; i < vals.length; i++) {
    const u = vals[i];
    if (!u) continue;
    if (normalizeEmail(u.email) === e) return u;
  }
  return null;
}

// Helper: get user by session cookie — supports new JWT-like cookie and old sessions map
function getUserBySession(req) {
  const t = req.cookies && req.cookies.session;
  if (!t) return null;
  // 1) try JWT-like
  const payload = verifySessionToken(t);
  if (payload && payload.email) {
    const u = findUserByEmail(payload.email);
    if (u) {
      if (typeof expireStatuses === 'function') expireStatuses(u);
      return u;
    }
  }
  // 2) fallback: old random token stored in sessions map
  if (sessions[t]) {
    const e = sessions[t];
    const u = findUserByEmail(e);
    if (u) {
      if (typeof expireStatuses === 'function') expireStatuses(u);
      return u;
    }
  }
  return null;
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '1tapday@gmail.com').toLowerCase();

// ROUTES

// simple image-save endpoint (best-effort) — accepts JSON { filename, data } where data is dataURL (base64)
app.post('/save-image', (req, res) => {
  try {
    const body = req.body || {};
    const filename = String(body.filename || '').replace(/[^\w\.\-]/g, '_').slice(0, 200) || ('img-' + Date.now() + '.png');
    const data = String(body.data || '');
    if (!data || !/^data:image\/[a-zA-Z]+;base64,/.test(data)) {
      return res.status(400).json({ success: false, error: 'missing image data' });
    }
    const base64 = data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    const outPath = path.join(uploadsDir, Date.now() + '-' + filename);
    fs.writeFileSync(outPath, buf);
    return res.json({ success: true, path: '/uploads/' + path.basename(outPath) });
  } catch (err) {
    console.error('[SAVE-IMAGE] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'save failed' });
  }
});

// Register
app.post('/register', (req, res) => {
  try {
    console.log('[REGISTER] body preview:', JSON.stringify(req.body || {}).slice(0, 2000));
  } catch (e) { }

  try {
    const emailRaw = req.body && (req.body.email || req.body.mail || req.body.login || '');
    const passRaw = req.body && (req.body.password || req.body.pass || req.body.pwd || '');
    const email = normalizeEmail(emailRaw);
    const password = passRaw;

    if (!email || !password) {
      console.error('[REGISTER] missing email or password');
      return res.status(400).json({ success: false, error: 'Missing email or password' });
    }
    if (!okPassword(password)) {
      return res.status(400).json({ success: false, error: 'Password too short (min 8 chars)' });
    }
    if (findUserByEmail(email)) {
      console.warn('[REGISTER] exists', email);
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

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
      demoUsed: false,
      appState: {},
      isAdmin: email === ADMIN_EMAIL
    };

    saveUsers();

    // create session cookie (JWT-like)
    setSessionCookie(res, email);

    console.log('[REGISTER] success', email);
    return res.json({ success: true, user: { email, status: 'none', demoUsed: false } });
  } catch (err) {
    console.error('[REGISTER] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'internal', detail: String(err && err.message ? err.message : err) });
  }
});

// Login
app.post('/login', (req, res) => {
  try {
    const emailRaw = req.body && (req.body.email || req.body.mail || req.body.login || '');
    const passRaw = req.body && (req.body.password || req.body.pass || req.body.pwd || '');
    const email = normalizeEmail(emailRaw);
    const password = passRaw;

    if (!email || !password) return res.status(400).json({ success: false, error: 'Missing email or password' });

    let user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (user.hash && user.salt) {
      if (!verifyPassword(password, user.salt, user.hash)) {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
      }
    } else if (user.passwordHash) {
      const candidate = sha256hex(password);
      if (candidate !== user.passwordHash) {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
      }
      const newSalt = genSalt(16);
      const newHash = hashPassword(password, newSalt);
      user.salt = newSalt;
      user.hash = newHash;
      delete user.passwordHash;
      saveUsers();
      console.log(`[MIGRATE] upgraded legacy password for ${user.email}`);
    } else {
      return res.status(500).json({ success: false, error: 'No password data available for this account' });
    }

    setSessionCookie(res, user.email);
    expireStatuses(user);

    return res.json({ success: true, user: { email: user.email, status: user.status, demoUsed: !!user.demoUsed, startAt: user.startAt, endAt: user.endAt } });
  } catch (err) {
    console.error('[LOGIN] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'internal' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (token && sessions[token]) delete sessions[token];
  res.clearCookie('session');
  return res.json({ success: true });
});

// Finalize Stripe session (called by frontend after redirect to app.html?session_id=...)
// attempts to read checkout session and set cookie for the user (best-effort)
app.get('/session', async (req, res) => {
  const sessionId = req.query && req.query.session_id;
  if (!sessionId) return res.status(400).json({ success: false, error: 'missing session_id' });
  if (!stripe) {
    console.warn('[SESSION] stripe not configured — cannot finalize session automatically');
    return res.status(501).json({ success: false, error: 'stripe not configured' });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = (session.metadata && session.metadata.email) || (session.customer_details && session.customer_details.email);
    if (!email) {
      return res.status(200).json({ success: true, message: 'no email in session' });
    }
    const u = findUserByEmail(email);
    if (!u) {
      // create user automatically (best-effort) so they get session cookie
      const salt = genSalt(16);
      const fakePwd = genSalt(8);
      const storedHash = hashPassword(fakePwd, salt);
      users[email] = {
        email,
        salt,
        hash: storedHash,
        status: 'none',
        startAt: null,
        endAt: null,
        discountUntil: null,
        demoUsed: false,
        appState: {},
        isAdmin: email === ADMIN_EMAIL
      };
      saveUsers();
    }
    setSessionCookie(res, email);
    return res.json({ success: true, email });
  } catch (err) {
    console.error('[SESSION] error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'session finalize failed' });
  }
});

// Start demo (authenticated) — one-time
app.post('/start-demo', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

  if (user.demoUsed) {
    return res.status(400).json({ success: false, error: 'Demo already used' });
  }

  user.demoUsed = true;
  user.status = 'active';
  user.startAt = new Date().toISOString();
  user.endAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  saveUsers();

  return res.json({ success: true, demo_until: user.endAt, message: 'Demo started' });
});

// activate discount (admin)
app.post('/activate-discount', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });

  // expects ?email=target@example.com OR uses admin's user to set global discount? We'll support both.
  const targetEmail = normalizeEmail(req.query.email || req.body && req.body.email || '');
  const target = targetEmail ? findUserByEmail(targetEmail) : user;
  if (!target) return res.status(404).json({ success: false, error: 'User not found' });

  target.status = 'discount_active';
  const until = new Date();
  until.setMonth(until.getMonth() + 12);
  target.discountUntil = until.toISOString();
  saveUsers();
  return res.json({ success: true, email: target.email, discountUntil: target.discountUntil });
});

// whoami / me
app.get('/me', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

  expireStatuses(user);

  const safe = Object.assign({}, user); delete safe.hash; delete safe.salt;
  return res.json({ success: true, user: safe });
});

// get user by email (used by frontend)
app.get('/user', (req, res) => {
  const emailQ = normalizeEmail(req.query && req.query.email || '');
  if (!emailQ) return res.status(400).json({ success: false, error: 'missing email' });
  const u = findUserByEmail(emailQ);
  if (!u) return res.status(404).json({ success: false, error: 'user not found' });

  expireStatuses(u);

  const safe = Object.assign({}, u); delete safe.hash; delete safe.salt;
  return res.json({ success: true, user: safe });
});

// --- app-state endpoints (per-user persisted state) ---
function shallowMergeServerState(existing, incoming) {
  if (!existing || typeof existing !== 'object') existing = {};
  if (!incoming || typeof incoming !== 'object') return existing;
  const out = Object.assign({}, existing);
  if (Array.isArray(existing.transactions) || Array.isArray(incoming.transactions)) {
    const map = {};
    (existing.transactions||[]).forEach(t => { if (t && t.id) map[t.id] = t; });
    (incoming.transactions||[]).forEach(t => { if (t && t.id) map[t.id] = t; });
    out.transactions = Object.values(map);
  }
  Object.keys(incoming).forEach(k => {
    if (k === 'transactions') return;
    out[k] = incoming[k];
  });
  return out;
}

app.get('/app-state', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error:'Not authenticated' });
  if (typeof expireStatuses === 'function') expireStatuses(user);
  return res.json({ success:true, state: (user.appState || {}) });
});

app.post('/app-state', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error:'Not authenticated' });
  const incoming = req.body && req.body.state || {};
  user.appState = incoming;
  saveUsers();
  return res.json({ success:true });
});

app.post('/app-state/merge', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error:'Not authenticated' });
  const incoming = req.body && req.body.state || {};
  const merged = shallowMergeServerState(user.appState || {}, incoming);
  user.appState = merged;
  saveUsers();
  return res.json({ success:true, state: merged });
});

// Stripe checkout creation route (requires stripe configured)
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

    return res.json({ sessionUrl: session.url, id: session.id, url: session.url });
  } catch (err) {
    console.error('[STRIPE] create session error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Stripe session creation failed' });
  }
});

// Stripe webhook — use express.raw to verify signature
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
    if (email) {
      const u = findUserByEmail(email);
      if (u) {
        u.status = 'active';
        u.startAt = new Date().toISOString();
        const end = new Date();
        end.setMonth(end.getMonth() + 2);
        u.endAt = end.toISOString();
        u.demoUsed = true; // they paid — treat demo as used
        saveUsers();
        console.log(`[WEBHOOK] activated pilot for ${u.email} until ${u.endAt}`);
      }
    }
  }
  return res.json({ received: true });
});

// Admin helpers
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
  const end = new Date();
  end.setMonth(end.getMonth() + 2);
  user.endAt = end.toISOString();
  saveUsers();
  return res.json({ success: true });
});

// catch-all
app.use((err, req, res, next) => {
  console.error('Unhandled error', err && err.stack ? err.stack : err);
  res.status(500).json({ success: false, error: 'internal' });
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
