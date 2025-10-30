// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const app = express();

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

const PORT = process.env.PORT || 10000;

// Simple in-memory DB (ok for MVP; not for production or multi-instance)
const users = {};     // users[email] = { email, passwordHash, status, startAt, endAt, discountUntil, isAdmin }
const sessions = {};  // sessions[token] = email

// Middleware
app.use(cookieParser());
// JSON body for all routes except webhook (webhook must receive raw body for Stripe signature)
app.use(express.json());

// Serve static files (frontend)
app.use(express.static('public'));

// Helper: authenticate session
function getUserBySession(req) {
  const token = req.cookies && req.cookies.session;
  if (!token || !sessions[token]) return null;
  const email = sessions[token];
  return users[email] || null;
}

// Admin email (from env)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "1tapday@gmail.com";

/*
  Registration endpoint (debug-friendly)
*/
app.post('/register', (req, res) => {
  try {
    console.log('[REGISTER] headers:', req.headers && req.headers['user-agent'] ? req.headers['user-agent'] : '');
    console.log('[REGISTER] incoming body:', typeof req.body === 'object' ? JSON.stringify(req.body).slice(0,2000) : String(req.body));
  } catch(e){ console.log('[REGISTER] log error'); }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      console.error('[REGISTER] missing email/password');
      return res.status(400).json({ success: false, error: "Missing email or password" });
    }

    const emailLower = String(email).toLowerCase().trim();
    if (users[emailLower]) {
      console.warn('[REGISTER] already exists:', emailLower);
      return res.status(409).json({ success: false, error: "Email already registered" });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    users[emailLower] = {
      email: emailLower,
      passwordHash,
      status: "none",
      startAt: null,
      endAt: null,
      discountUntil: null,
      isAdmin: (emailLower === ADMIN_EMAIL)
    };

    // Auto-login: create session token and set cookie
    const token = crypto.randomBytes(16).toString('hex');
    sessions[token] = emailLower;

    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax',
      secure: (process.env.NODE_ENV === 'production') // true on Render (https), false for local dev
    };
    res.cookie('session', token, cookieOpts);

    console.log('[REGISTER] success for', emailLower);
    return res.json({ success: true, user: { email: emailLower, status: "none" } });
  } catch (err) {
    console.error('[REGISTER] ERROR stack:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'internal', detail: String(err && err.message ? err.message : err) });
  }
});

/*
  Login
*/
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.json({ success: false, error: "Missing email or password" });

  const emailLower = String(email).toLowerCase().trim();
  const user = users[emailLower];
  if (!user) return res.json({ success: false, error: "User not found" });

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  if (user.passwordHash !== passwordHash) return res.json({ success: false, error: "Incorrect password" });

  const token = crypto.randomBytes(16).toString('hex');
  sessions[token] = emailLower;

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.NODE_ENV === 'production')
  };
  res.cookie('session', token, cookieOpts);

  // Normalize status expirations
  let status = user.status;
  if (user.status === "active" && user.endAt && new Date(user.endAt) < new Date()) {
    user.status = "ended";
    status = "ended";
  }
  if (user.status === "discount_active" && user.discountUntil && new Date(user.discountUntil) < new Date()) {
    user.status = "ended";
    status = "ended";
  }

  return res.json({ success: true, user: { email: emailLower, status } });
});

/*
  Logout
*/
app.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (token) {
    delete sessions[token];
    res.clearCookie('session');
  }
  return res.json({ success: true });
});

/*
  Start demo (authenticated)
*/
app.post('/start-demo', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

  user.status = "active";
  user.startAt = new Date().toISOString();
  const end = new Date(Date.now() + 24*60*60*1000);
  user.endAt = end.toISOString();

  return res.json({ success: true, demo_until: user.endAt, message: 'Demo started', redirect: '/app.html' });
});

/*
  Whoami (by session)
*/
app.get('/me', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error: 'Not authenticated' });
  const safe = Object.assign({}, user);
  delete safe.passwordHash;
  res.json({ success:true, user: safe });
});

/*
  Lookup by email (legacy frontend may call /user?email=)
*/
app.get('/user', (req, res) => {
  const q = String(req.query.email || '').toLowerCase().trim();
  if (!q) return res.status(400).json({ success:false, error: 'missing email' });
  const user = users[q];
  if (!user) return res.status(404).json({ success:false, error: 'user not found' });
  const safe = Object.assign({}, user);
  delete safe.passwordHash;
  res.json({ success:true, user: safe });
});

/*
  Create Stripe Checkout Session
*/
app.post('/create-checkout-session', async (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Stripe secret not set; create-checkout-session will fail.');
  }

  try {
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
    return res.json({ sessionUrl: session.url, session });
  } catch (err) {
    console.error("Stripe session error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Stripe session creation failed", detail: String(err && err.message ? err.message : err) });
  }
});

/*
  Stripe webhook: use raw body for signature verification
  Note: keep this route-level raw parser BEFORE any JSON parsing for this route.
*/
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err && err.message ? err.message : err);
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid signature'}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session.metadata && session.metadata.email) || session.customer_email;
    if (email && users[email]) {
      const user = users[email];
      user.status = "active";
      user.startAt = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      user.endAt = endDate.toISOString();
      console.log(`✅ Pilot access activated for ${email} until ${user.endAt}`);
    } else {
      console.warn('Webhook: session completed for unknown email', email);
    }
  }

  res.sendStatus(200);
});

/*
  Admin helpers: mark-paid, start-pilot, activate-discount, reset-pilot
*/
app.post('/mark-paid', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success:false, error:'Forbidden' });
  user.status = "deposit_paid";
  return res.json({ success:true });
});

app.post('/start-pilot', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success:false, error:'Forbidden' });
  user.status = "active";
  user.startAt = new Date().toISOString();
  const end = new Date(); end.setMonth(end.getMonth() + 2); user.endAt = end.toISOString();
  return res.json({ success:true });
});

app.post('/activate-discount', (req, res) => {
  const current = getUserBySession(req);
  if (!current) return res.status(401).json({ success:false });
  if (!current.isAdmin && current.status !== "ended") return res.status(400).json({ success:false, error:'Not eligible for discount' });

  current.status = "discount_active";
  current.discountSince = new Date().toISOString();
  const end = new Date(); end.setMonth(end.getMonth() + 12);
  current.discountUntil = end.toISOString();
  current.startAt = current.startAt || new Date().toISOString();
  current.endAt = current.discountUntil;
  return res.json({ success:true });
});

app.post('/reset-pilot', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success:false, error:'Forbidden' });
  user.status = "none";
  user.startAt = null; user.endAt = null; user.discountUntil = null;
  return res.json({ success:true });
});

/*
  Start server
*/
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

/*
  Notes:
  - In-memory sessions mean redeploy clears sessions. That's normal for this MVP setup.
  - Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set in Render env.
  - On Render, NODE_ENV should be "production" so cookie secure flag is true. If testing locally via http, set NODE_ENV != 'production'.
*/
