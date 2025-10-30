// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Stripe secret key from env
const app = express();
app.use((req,res,next)=>{
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});
const PORT = process.env.PORT || 10000;

// In-memory "database" for user accounts and sessions
const users = {};       // users[email] = { email, passwordHash, status, startAt, endAt, discountUntil, isAdmin }
const sessions = {};    // sessions[token] = email

// Middleware
app.use(cookieParser());
app.use(express.json());
// Raw body parser for Stripe webhook (to verify signature)
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    // Use raw body for webhook
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    next();
  }
});

// Serve static files (frontend)
app.use(express.static('public'));

// Helper: authenticate session
function getUserBySession(req) {
  const token = req.cookies.session;
  if (!token || !sessions[token]) return null;
  const email = sessions[token];
  return users[email] || null;
}

// Helper: mark admin if email matches configured admin email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "1tapday@gmail.com";

// Registration endpoint — debug wrapper (temporary)
app.post('/register', (req, res) => {
  // лог тела запроса (коротко, без секретов)
  try {
    console.log('[REGISTER] incoming body:', typeof req.body === 'object' ? JSON.stringify(req.body).slice(0,2000) : String(req.body));
  } catch (e) { console.log('[REGISTER] body stringify failed'); }

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

    // Create new user
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

    // Auto-login
    const token = crypto.randomBytes(16).toString('hex');
    sessions[token] = emailLower;
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });

    console.log('[REGISTER] success for', emailLower);
    return res.json({ success: true, user: { email: emailLower, status: "none" } });
  } catch (err) {
    // печатаем стек — чтобы не гадать
    console.error('[REGISTER] ERROR stack:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'internal', detail: String(err && err.message ? err.message : err) });
  }
});

// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, error: "Missing email or password" });
  }
  const emailLower = email.toLowerCase();
  const user = users[emailLower];
  if (!user) {
    return res.json({ success: false, error: "User not found" });
  }
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  if (user.passwordHash !== passwordHash) {
    return res.json({ success: false, error: "Incorrect password" });
  }
  // Create new session token
  const token = crypto.randomBytes(16).toString('hex');
  sessions[token] = emailLower;
  res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });
  // Determine current status for response
  let status = user.status;
  // If user's pilot end date passed, mark as ended
  if (user.status === "active" && user.endAt && new Date(user.endAt) < new Date()) {
    user.status = "ended";
    status = "ended";
  }
  // If user had discount period and it passed, also end
  if (user.status === "discount_active" && user.discountUntil && new Date(user.discountUntil) < new Date()) {
    user.status = "ended";
    status = "ended";
  }
  return res.json({ success: true, user: { email: emailLower, status } });
});

// Logout endpoint
app.post('/logout', (req, res) => {
  const token = req.cookies.session;
  if (token) {
    delete sessions[token];
    res.clearCookie('session');
  }
  return res.json({ success: true });
});

// === /start-demo ===
app.post('/start-demo', (req, res) => {
  const user = getUserBySession(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  // activate demo: 24 hours from now
  user.status = "active";
  user.startAt = new Date().toISOString();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.endAt = end.toISOString();

  // For clarity return demo_until ISO string and redirect hint
  return res.json({ success: true, demo_until: user.endAt, message: 'Demo started', redirect: '/app.html' });
});

// === /me ===
app.get('/me', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error: 'Not authenticated' });
  // Don't leak passwordHash
  const safe = Object.assign({}, user);
  delete safe.passwordHash;
  res.json({ success:true, user: safe });
});

// Create Stripe Checkout Session (for 2-month pilot deposit)
app.post('/create-checkout-session', async (req, res) => {
  const user = getUserBySession(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    // Create a one-time Checkout Session for 99 PLN deposit
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'pln',
          product_data: { name: 'OneTapDay Pilot Deposit (2 months access)' },
          unit_amount: 9900  // 99.00 PLN in grosz
        },
        quantity: 1
      }],
      customer_email: user.email,
      metadata: { email: user.email },
      success_url: `${req.protocol}://${req.get('host')}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/?cancel=1`
    });
    return res.json({ sessionUrl: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    return res.status(500).json({ error: "Stripe session creation failed" });
  }
});

// Stripe webhook endpoint (to receive payment status events)
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Handle completed checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata.email || session.customer_email;
    if (email && users[email]) {
      const user = users[email];
      // Mark deposit paid and start pilot immediately (instant access)
      user.status = "active";
      user.startAt = new Date().toISOString();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      user.endAt = endDate.toISOString();
      console.log(`✅ Pilot access activated for ${email} until ${user.endAt}`);
    }
  }
  res.sendStatus(200);
});

// Admin: mark deposit as paid manually (if payment outside Stripe)
app.post('/mark-paid', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  // Mark current admin user's pilot as deposit paid (but not active yet)
  user.status = "deposit_paid";
  return res.json({ success: true });
});

// Admin: start pilot (2 months) manually
app.post('/start-pilot', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  user.status = "active";
  user.startAt = new Date().toISOString();
  const end = new Date();
  end.setMonth(end.getMonth() + 2);
  user.endAt = end.toISOString();
  return res.json({ success: true });
});

// Activate discount (50% off 12 months) - user or admin after pilot ended
app.post('/activate-discount', (req, res) => {
  const current = getUserBySession(req);
  if (!current) return res.status(401).json({ success: false });
  // Allow if admin or if user’s own status is ended (pilot ended)
  if (!current.isAdmin && current.status !== "ended") {
    return res.status(400).json({ success: false, error: "Not eligible for discount" });
  }
  current.status = "discount_active";
  current.discountSince = new Date().toISOString();
  const end = new Date();
  end.setMonth(end.getMonth() + 12);
  current.discountUntil = end.toISOString();
  // Grant access for the discount period
  current.startAt = current.startAt || new Date().toISOString();
  current.endAt = current.discountUntil;
  return res.json({ success: true });
});

// Reset pilot (admin only - clears subscription status)
app.post('/reset-pilot', (req, res) => {
  const user = getUserBySession(req);
  if (!user || !user.isAdmin) return res.status(403).json({ success: false });
  user.status = "none";
  user.startAt = null;
  user.endAt = null;
  user.discountUntil = null;
  return res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});




