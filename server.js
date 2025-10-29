// server.js — полная, готовая замена
// Node 18+ / recommended. Put this file in repo root and deploy.
// Uses SQLite (data.sqlite3), serves public/, uses Stripe if STRIPE_SECRET_KEY set.

'use strict';
/* minimal, robust server for OneTapDay MVP */
try { require('dotenv').config(); } catch (e) { console.warn('dotenv not installed — skipping'); }

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '') || null;
const PORT = process.env.PORT || process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

const app = express();

// --- DB init (SQLite) ---
const DB_PATH = path.join(__dirname, 'data.sqlite3');
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`PRAGMA journal_mode=WAL;`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    is_admin INTEGER DEFAULT 0,
    paid_until INTEGER DEFAULT 0,
    demo_until INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    email TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`);
});

// --- helpers: sqlite -> promise ---
function runAsync(sql, params=[]) {
  return new Promise((resolve,reject)=>{
    db.run(sql, params, function(err){
      if(err) return reject(err);
      resolve(this);
    });
  });
}
function getAsync(sql, params=[]) {
  return new Promise((resolve,reject)=>{
    db.get(sql, params, (err,row)=> err ? reject(err) : resolve(row));
  });
}
function allAsync(sql, params=[]) {
  return new Promise((resolve,reject)=>{
    db.all(sql, params, (err,rows)=> err ? reject(err) : resolve(rows));
  });
}

// --- middleware ---
// IMPORTANT: webhook needs raw body. We'll register raw parser only for webhook route below.
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

// small logger
app.use((req,res,next)=>{
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// --- util ---
function hashPassword(password){
  return crypto.createHash('sha256').update(password || '').digest('hex');
}
function makeToken(){
  return crypto.randomBytes(20).toString('hex');
}
async function createSession(email){
  const token = makeToken();
  await runAsync(`INSERT OR REPLACE INTO sessions (token,email) VALUES (?,?)`, [token,email]);
  return token;
}
async function getUserByToken(token){
  if(!token) return null;
  const s = await getAsync(`SELECT email FROM sessions WHERE token = ?`, [token]);
  if(!s) return null;
  const u = await getAsync(`SELECT * FROM users WHERE email = ?`, [s.email]);
  return u || null;
}

// --- routes ---

// registration
app.post('/register', async (req,res)=>{
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ success:false, error: 'Missing email or password' });
    const emailL = String(email).toLowerCase().trim();
    const existing = await getAsync(`SELECT * FROM users WHERE email = ?`, [emailL]);
    if(existing) return res.status(409).json({ success:false, error:'Email already registered' });

    const phash = hashPassword(password);
    await runAsync(`INSERT INTO users (email,password_hash,is_admin) VALUES (?,?,?)`, [emailL, phash, emailL=== (process.env.ADMIN_EMAIL||'1tapday@gmail.com') ? 1 : 0]);
    const token = await createSession(emailL);
    res.cookie('session', token, { httpOnly:true, sameSite:'lax' });
    const user = await getAsync(`SELECT email,paid_until,demo_until,is_admin,created_at FROM users WHERE email = ?`, [emailL]);
    return res.json({ success:true, user });
  }catch(e){
    console.error('register error', e);
    return res.status(500).json({ success:false, error: 'server' });
  }
});

// login
app.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ success:false, error:'Missing email or password' });
    const emailL = String(email).toLowerCase().trim();
    const u = await getAsync(`SELECT * FROM users WHERE email = ?`, [emailL]);
    if(!u) return res.status(404).json({ success:false, error:'User not found' });
    const phash = hashPassword(password);
    if(u.password_hash !== phash) return res.status(401).json({ success:false, error:'Incorrect password' });
    const token = await createSession(emailL);
    res.cookie('session', token, { httpOnly:true, sameSite:'lax' });
    const user = await getAsync(`SELECT email,paid_until,demo_until,is_admin,created_at FROM users WHERE email = ?`, [emailL]);
    return res.json({ success:true, user });
  }catch(e){
    console.error('login error', e);
    return res.status(500).json({ success:false, error:'server' });
  }
});

// logout
app.post('/logout', async (req,res)=>{
  try{
    const token = req.cookies.session;
    if(token) await runAsync(`DELETE FROM sessions WHERE token = ?`, [token]);
    res.clearCookie('session');
    return res.json({ success:true });
  }catch(e){
    console.error('logout err', e);
    return res.status(500).json({ success:false });
  }
});

// get current user by cookie
app.get('/user', async (req,res)=>{
  try{
    const token = req.cookies.session;
    const user = await getUserByToken(token);
    if(!user) return res.json({ user: null });
    // map fields
    const mapped = {
      email: user.email,
      paid_until: user.paid_until,
      demo_until: user.demo_until,
      is_admin: !!user.is_admin,
      created_at: user.created_at
    };
    return res.json({ user: mapped });
  }catch(e){
    console.error('user err', e);
    return res.status(500).json({ error: 'server' });
  }
});

// start 24h demo (must be logged)
app.post('/start-demo', async (req,res)=>{
  try{
    const token = req.cookies.session;
    const user = await getUserByToken(token);
    if(!user) return res.status(401).json({ success:false, error:'not authenticated' });
    const demoUntil = Math.floor(Date.now()/1000) + 24*60*60;
    await runAsync(`UPDATE users SET demo_until = ? WHERE email = ?`, [demoUntil, user.email]);
    return res.json({ success:true, demo_until: demoUntil });
  }catch(e){
    console.error('start-demo', e);
    return res.status(500).json({ success:false });
  }
});

// create stripe checkout
app.post('/create-checkout-session', async (req,res)=>{
  try{
    if(!stripe) return res.status(500).json({ error: 'stripe missing' });
    const token = req.cookies.session;
    const user = await getUserByToken(token);
    if(!user) return res.status(401).json({ error: 'not authenticated' });

    const successBase = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
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
      customer_email: user.email,
      metadata: { email: user.email },
      success_url: `${successBase}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${successBase}/?canceled=1`
    });
    return res.json({ url: session.url, id: session.id });
  }catch(e){
    console.error('create-checkout error', e);
    return res.status(500).json({ error: 'stripe error' });
  }
});

// endpoint to fetch session after redirect
app.get('/session', async (req,res)=>{
  try{
    if(!stripe) return res.status(500).json({ error:'stripe missing' });
    const sid = req.query.session_id;
    if(!sid) return res.status(400).json({ error:'session_id required' });
    const session = await stripe.checkout.sessions.retrieve(sid);
    // mark user paid_until (60 days)
    const email = (session.metadata && session.metadata.email) || session.customer_details?.email;
    if(email){
      const paidUntil = Math.floor(Date.now()/1000) + 60*24*60*60;
      await runAsync(`UPDATE users SET paid_until = ? WHERE email = ?`, [paidUntil, email]);
    }
    return res.json({ ok:true, session });
  }catch(e){
    console.error('session fetch error', e);
    return res.status(500).json({ error: 'server' });
  }
});

// webhook must use raw body to verify signature
app.post('/webhook', express.raw({type: 'application/json'}), async (req,res)=>{
  try{
    if(!stripe) {
      console.warn('Stripe not configured, ignoring webhook');
      return res.status(200).send('no-stripe');
    }
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      if(STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (e) {
      console.error('webhook signature failed', e && e.message);
      return res.status(400).send(`Webhook Error: ${e && e.message}`);
    }

    if(event && event.type === 'checkout.session.completed'){
      const session = event.data.object;
      const email = (session.metadata && session.metadata.email) || session.customer_details?.email;
      if(email){
        const paidUntil = Math.floor(Date.now()/1000) + 60*24*60*60;
        await runAsync(`UPDATE users SET paid_until = ? WHERE email = ?`, [paidUntil, email]);
        console.log(`Activated paid_until for ${email}`);
      }
    }

    return res.json({ received:true });
  }catch(e){
    console.error('webhook handler error', e);
    return res.status(500).send('err');
  }
});

// fallback — serve index
app.get('*', (req,res) => {
  const index = path.join(PUBLIC_DIR, 'index.html');
  if(fs.existsSync(index)) return res.sendFile(index);
  return res.status(404).send('Not found');
});

// start server
app.listen(PORT, ()=> {
  console.log(`Server listening on ${PORT} — PID ${process.pid}`);
});
