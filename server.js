// server.js — Paste this file in root, replace existing server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '1tapday@gmail.com').toLowerCase();

let stripe = null;
if (STRIPE_KEY) {
  try { stripe = require('stripe')(STRIPE_KEY); } catch (e) {
    console.error('Stripe init failed:', e && e.message);
  }
} else {
  console.warn('No STRIPE_SECRET_KEY provided. Stripe endpoints will return 500 for create-checkout-session.');
}

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --------- Middlewares ---------
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// CORS: allow same origin or public URL. If testing from same domain, '*' is okay temporarily.
const corsOptions = {
  origin: PUBLIC_URL || true,
  credentials: true
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json()); // MUST be before route handlers (important)

// Serve static files
app.use(express.static(PUBLIC_DIR));

// --------- DB (sqlite) ----------
const DB_PATH = path.join(__dirname, 'data.sqlite3');
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) console.error('DB open error', err);
  else console.log('SQLite DB opened:', DB_PATH);
});
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    status TEXT DEFAULT 'none',
    start_at INTEGER DEFAULT 0,
    end_at INTEGER DEFAULT 0,
    demo_until INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0
  );`);
});

// --------- Helpers ----------
function nowTs(){ return Date.now(); }
function daysFromNowMs(days){ return Date.now() + (days*24*60*60*1000); }

function upsertUserIfNotExists(email, cb){
  const el = email.toLowerCase();
  db.run(`INSERT OR IGNORE INTO users (email, is_admin) VALUES (?, ?)`, [el, el===ADMIN_EMAIL?1:0], function(err){
    if(err) return cb(err);
    db.get(`SELECT * FROM users WHERE email = ?`, [el], cb);
  });
}

// --------- Routes (note: webhook uses raw body below) ----------

// Simple health
app.get('/health', (req,res)=> res.json({ok:true}));

// Registration — expects { email, password }
app.post('/register', (req,res)=>{
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    const emailLc = email.toLowerCase();
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    db.get(`SELECT * FROM users WHERE email = ?`, [emailLc], (err,row)=>{
      if(err) { console.error('DB select err',err); return res.status(500).json({ error: 'db' }); }
      if(row && row.password_hash){
        return res.status(409).json({ error: 'Email already registered' });
      }
      if(row){
        // update password_hash
        db.run(`UPDATE users SET password_hash = ? WHERE email = ?`, [passwordHash, emailLc], function(e){
          if(e){ console.error('DB update err', e); return res.status(500).json({ error:'db' }); }
          return res.json({ success: true, email: emailLc });
        });
      } else {
        // insert new
        db.run(`INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)`, [emailLc, passwordHash, emailLc===ADMIN_EMAIL?1:0], function(e){
          if(e){ console.error('DB insert err', e); return res.status(500).json({ error:'db' }); }
          return res.json({ success: true, email: emailLc });
        });
      }
    });
  }catch(e){
    console.error('register error', e);
    return res.status(500).json({ error: e.message || 'server' });
  }
});

// Login — expects { email, password }
app.post('/login', (req,res)=>{
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    const emailLc = email.toLowerCase();
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    db.get(`SELECT * FROM users WHERE email = ?`, [emailLc], (err,row)=>{
      if(err){ console.error('DB select err', err); return res.status(500).json({ error:'db' }); }
      if(!row || !row.password_hash) return res.status(404).json({ error:'User not found or no password set' });
      if(row.password_hash !== passwordHash) return res.status(401).json({ error: 'Incorrect password' });

      // create simple session cookie (not secure but works for MVP)
      const token = require('crypto').randomBytes(16).toString('hex');
      // store session in memory minimal: cookie only (for demo). For persistence, use DB.
      // we will simply set signed cookie with token -> include email in cookie value (not safe for prod)
      res.cookie('otd_session', Buffer.from(emailLc).toString('base64'), { httpOnly: true, sameSite: 'lax' });
      return res.json({ success: true, email: emailLc });
    });
  } catch(e){
    console.error('login error', e);
    return res.status(500).json({ error: e.message || 'server' });
  }
});

// Demo start (must be logged-in: check cookie otd_session)
app.post('/demo', (req,res)=>{
  try{
    const cookie = req.cookies.otd_session;
    if(!cookie) return res.status(401).json({ error: 'not authenticated' });
    const email = Buffer.from(cookie, 'base64').toString('utf8');
    const demoUntil = daysFromNowMs(1);
    db.run(`UPDATE users SET demo_until = ? WHERE email = ?`, [demoUntil, email], function(err){
      if(err){ console.error('demo db err', err); return res.status(500).json({ error:'db' }); }
      return res.json({ success: true, demo_until: demoUntil });
    });
  } catch(e){
    console.error('demo error', e);
    return res.status(500).json({ error: e.message || 'server' });
  }
});

// Create Stripe checkout session — requires stripe initialized
app.post('/create-checkout-session', async (req,res)=>{
  try{
    if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const cookie = req.cookies.otd_session;
    if(!cookie) return res.status(401).json({ error: 'not authenticated' });
    const email = Buffer.from(cookie, 'base64').toString('utf8');

    const successUrl = (PUBLIC_URL || `${req.protocol}://${req.get('host')}`) + '/?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = (PUBLIC_URL || `${req.protocol}://${req.get('host')}`) + '/?canceled=1';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'pln',
          product_data: { name: 'OneTapDay — 2 months access' },
          unit_amount: 9900
        },
        quantity: 1
      }],
      metadata: { email },
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    return res.json({ url: session.url, id: session.id });
  }catch(e){
    console.error('create-checkout error', e && e.message);
    return res.status(500).json({ error: e.message || 'stripe error' });
  }
});

// Retrieve session after redirect (optional)
app.get('/session', async (req,res)=>{
  try{
    const sid = req.query.session_id;
    if(!sid) return res.status(400).json({ error: 'session_id required' });
    if(!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const session = await stripe.checkout.sessions.retrieve(sid);
    return res.json({ ok: true, session });
  }catch(e){
    console.error('session error', e);
    return res.status(500).json({ error: e.message || 'session error' });
  }
});

// Stripe webhook: use raw body to validate signature
app.post('/webhook', express.raw({type:'application/json'}), (req,res)=>{
  if(!stripe){
    console.warn('Webhook received but stripe not configured');
    return res.sendStatus(200);
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if(STRIPE_WEBHOOK_SECRET){
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      // if no secret set (test) parse body
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature check failed.', err && err.message);
    return res.status(400).send(`Webhook Error: ${err && err.message}`);
  }

  if(event.type === 'checkout.session.completed'){
    const session = event.data.object;
    const email = (session.metadata && session.metadata.email) || session.customer_email;
    if(email){
      const end = new Date();
      end.setMonth(end.getMonth() + 2);
      const endTs = end.getTime();
      db.run(`UPDATE users SET start_at = ?, end_at = ?, status = ? WHERE email = ?`, [Date.now(), endTs, 'active', email.toLowerCase()], (err)=>{
        if(err) console.error('db webhook update err', err);
        else console.log('Activated paid user', email, 'until', new Date(endTs).toISOString());
      });
    }
  }

  res.json({ received: true });
});

// fallback — serve index
app.get('*', (req,res)=>{
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if(fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.status(404).send('Not found');
});

// Start server
app.listen(PORT, ()=>{
  console.log(`Server running on port ${PORT}`);
});
