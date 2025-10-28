// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// DB
const DB_PATH = path.join(__dirname, 'data.sqlite3');
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    paid_until INTEGER DEFAULT 0,
    demo_until INTEGER DEFAULT 0,
    owner INTEGER DEFAULT 0
  );`);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

function upsertUser(email, cb){
  db.run(
    `INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING;`,
    [email],
    (err) => {
      if(err) return cb(err);
      db.get(`SELECT * FROM users WHERE email = ?`, [email], cb);
    }
  );
}
function setPaidUntil(email, timestamp, cb){
  db.run(`UPDATE users SET paid_until = ? WHERE email = ?`, [timestamp, email], cb);
}
function setDemoUntil(email, timestamp, cb){
  db.run(`UPDATE users SET demo_until = ? WHERE email = ?`, [timestamp, email], cb);
}
function getUser(email, cb){
  db.get(`SELECT * FROM users WHERE email = ?`, [email], cb);
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { email } = req.body;
    if(!email) return res.status(400).json({ error: 'email required' });

    upsertUser(email, (e) => { if(e) console.warn(e); });

    const successUrl = (process.env.PUBLIC_URL || '') + '/?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = (process.env.PUBLIC_URL || '') + '/?canceled=1';

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
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { email }
    });

    return res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/login', (req, res) => {
  const { email } = req.body;
  if(!email) return res.status(400).json({ error: 'email required' });
  upsertUser(email, (err) => {
    if(err) return res.status(500).json({ error: err.message });
    getUser(email, (e, row) => {
      if(e) return res.status(500).json({ error: e.message });
      res.json({ user: row });
    });
  });
});

app.post('/demo', (req, res) => {
  const { email } = req.body;
  if(!email) return res.status(400).json({ error: 'email required' });
  const demoUntil = Date.now() + 24*60*60*1000;
  upsertUser(email, () => {
    setDemoUntil(email, demoUntil, (err) => {
      if(err) return res.status(500).json({ error: err.message });
      res.json({ demo_until: demoUntil });
    });
  });
});

app.get('/user', (req, res) => {
  const email = req.query.email;
  if(!email) return res.status(400).json({ error: 'email required' });
  getUser(email, (err, row) => {
    if(err) return res.status(500).json({ error: err.message });
    res.json({ user: row });
  });
});

app.post('/webhook', bodyParser.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if(webhookSecret){
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature check failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const email = (session.metadata && session.metadata.email) || session.customer_details?.email;
      if(email){
        const paidUntil = Date.now() + 60*24*60*60*1000;
        setPaidUntil(email, paidUntil, (err) => {
          if(err) console.error('db set paid error', err);
        });
      }
      break;
    default:
  }

  res.json({ received: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
