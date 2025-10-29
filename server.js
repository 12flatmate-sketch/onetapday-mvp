// server.js — minimal robust server for register/login/demo + Stripe webhook
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
let stripe;
try { stripe = require('stripe')(STRIPE_KEY); } catch(e){ console.warn('Stripe init failed', e && e.message); }

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory store (replace with SQLite later)
const users = {};    // users[email] = { email, passwordHash, status, startAt, endAt, isAdmin }
const sessions = {}; // sessions[token] = email

// Logging
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// CORS — allow frontends from other origins if needed
app.use(cors());

// Parsers: JSON + urlencoded (forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend (public/)
app.use(express.static('public'));

// Helper: session -> user
function getUserBySession(req) {
  const token = req.cookies && req.cookies.session;
  if (!token) return null;
  const email = sessions[token];
  if (!email) return null;
  return users[email] || null;
}

// --- ROUTES ---

// Register (accepts JSON or form)
app.post('/register', (req, res) => {
  try {
    const email = (req.body.email || '').toString().trim().toLowerCase();
    const password = (req.body.password || '').toString();
    if (!email || !password) return res.status(400).json({ success:false, error:'email and password required' });

    if (users[email]) return res.status(409).json({ success:false, error:'email already registered' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    users[email] = { email, passwordHash: hash, status:'none', startAt:null, endAt:null, isAdmin:false };

    const token = crypto.randomBytes(16).toString('hex');
    sessions[token] = email;
    res.cookie('session', token, { httpOnly:true, sameSite:'lax' });

    return res.json({ success:true, user:{ email, status: users[email].status } });
  } catch (e) {
    console.error('register error', e);
    return res.status(500).json({ success:false, error:'server error' });
  }
});

// Login (accepts JSON or form)
app.post('/login', (req, res) => {
  try {
    const email = (req.body.email || '').toString().trim().toLowerCase();
    const password = (req.body.password || '').toString();
    if (!email || !password) return res.status(400).json({ success:false, error:'email and password required' });

    const user = users[email];
    if (!user) return res.status(404).json({ success:false, error:'user not found' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash !== user.passwordHash) return res.status(401).json({ success:false, error:'incorrect password' });

    const token = crypto.randomBytes(16).toString('hex');
    sessions[token] = email;
    res.cookie('session', token, { httpOnly:true, sameSite:'lax' });

    // refresh status expiry check (if needed)
    if (user.status === 'active' && user.endAt && new Date(user.endAt) < new Date()) {
      user.status = 'ended';
    }

    return res.json({ success:true, user:{ email, status:user.status } });
  } catch(e){
    console.error('login error', e);
    return res.status(500).json({ success:false, error:'server error' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (token) { delete sessions[token]; res.clearCookie('session'); }
  return res.json({ success:true });
});

// Demo start (24h)
app.post('/start-demo', (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ success:false, error:'not authenticated' });
  user.status = 'active';
  user.startAt = new Date().toISOString();
  const end = new Date(); end.setDate(end.getDate() + 1);
  user.endAt = end.toISOString();
  return res.json({ success:true, demoUntil: user.endAt });
});

// Create checkout session (Stripe)
app.post('/create-checkout-session', async (req, res) => {
  const user = getUserBySession(req);
  if (!user) return res.status(401).json({ error:'not authenticated' });
  if (!stripe) return res.status(500).json({ error:'stripe not configured' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types:['card'],
      mode:'payment',
      line_items:[{
        price_data:{
          currency:'pln',
          product_data:{ name: 'OneTapDay 2 months' },
          unit_amount: 9900
        },
        quantity:1
      }],
      customer_email: user.email,
      metadata: { email: user.email },
      success_url: `${req.protocol}://${req.get('host')}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/?canceled=1`,
    });
    return res.json({ sessionUrl: session.url });
  } catch (e) {
    console.error('stripe create session error', e);
    return res.status(500).json({ error:'stripe error' });
  }
});

// Webhook raw handler — use express.raw only here
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(500).send('stripe not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature failed', err && err.message);
    return res.status(400).send(`Webhook Error: ${err && err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_email;
    if (email && users[email]) {
      const u = users[email];
      u.status = 'active';
      u.startAt = new Date().toISOString();
      const end = new Date(); end.setMonth(end.getMonth() + 2);
      u.endAt = end.toISOString();
      console.log('Activated pilot for', email, 'until', u.endAt);
    }
  }
  res.json({ received:true });
});

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Server listening on', PORT));
