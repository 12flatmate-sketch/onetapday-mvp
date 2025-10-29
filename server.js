// server.js
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
    secret: 'your-secret-key', // Задайте надёжный секрет для подписи cookie сессии
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true } // Включите secure-вариант на продакшене (HTTPS)
}));

// Инициализация базы данных SQLite
const db = new sqlite3.Database('./onetapday.db', err => {
    if (err) {
        console.error("Failed to connect to database", err);
    } else {
        console.log("Connected to SQLite database");
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            access_until INTEGER DEFAULT 0,
            demo_used INTEGER DEFAULT 0
        )`);
    }
});

// Middleware для проверки входа
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// Middleware для проверки активного доступа (подписка/демо)
function requireActive(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.session.userId;
    db.get("SELECT access_until FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        const now = Date.now();
        if (!row || row.access_until === null || row.access_until <= now) {
            // Нет пользователя или доступ истёк/не предоставлен
            return res.status(403).json({ error: "Access expired or not available" });
        }
        // Доступ активен
        next();
    });
}

// Registration
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        // Проверяем, есть ли уже такой email
        const existingUser = await new Promise((resolve, reject) => {
            db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
        if (existingUser) {
            return res.status(409).json({ error: "Email is already registered" });
        }
        // Хэшируем пароль и создаём нового пользователя
        const hash = await bcrypt.hash(password, 10);
        const newUserId = await new Promise((resolve, reject) => {
            db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hash], function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        // Сразу логиним пользователя после регистрации
        req.session.userId = newUserId;
        req.session.userEmail = email;
        return res.json({ success: true, email: email, active: false });
    } catch (e) {
        console.error("Error in /register:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    db.get("SELECT id, password, access_until FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (!row) {
            // Пользователь не найден
            return res.status(401).json({ error: "Invalid email or password" });
        }
        // Сравниваем хеш пароля
        bcrypt.compare(password, row.password, (err, match) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.status(500).json({ error: "Internal error" });
            }
            if (!match) {
                return res.status(401).json({ error: "Invalid email or password" });
            }
            // Успешный вход: сохраняем пользователя в сессии
            req.session.userId = row.id;
            req.session.userEmail = email;
            // Проверяем, есть ли активный доступ
            const now = Date.now();
            const isActive = row.access_until && row.access_until > now;
            return res.json({ success: true, email: email, active: isActive });
        });
    });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie('connect.sid');
        return res.json({ success: true });
    });
});

// Проверка статуса текущего пользователя (для обновления UI статуса при необходимости)
app.get('/status', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.json({ loggedIn: false });
    }
    const userId = req.session.userId;
    db.get("SELECT email, access_until, demo_used FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (!row) {
            return res.json({ loggedIn: false });
        }
        const now = Date.now();
        const active = row.access_until && row.access_until > now;
        return res.json({
            loggedIn: true,
            email: row.email,
            active: active,
            access_until: row.access_until || 0,
            demo_used: !!row.demo_used
        });
    });
});

// Активация демо-доступа на 24 часа
app.post('/demo', requireLogin, (req, res) => {
    const userId = req.session.userId;
    const now = Date.now();
    db.get("SELECT access_until, demo_used FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (!row) {
            return res.status(400).json({ error: "User not found" });
        }
        if (row.demo_used) {
            return res.status(400).json({ error: "Demo already used" });
        }
        if (row.access_until && row.access_until > now) {
            return res.status(400).json({ error: "Already have active access" });
        }
        // Выдаём доступ на 24 часа с текущего момента
        const newAccessUntil = now + 24 * 60 * 60 * 1000;
        db.run("UPDATE users SET access_until = ?, demo_used = 1 WHERE id = ?", [newAccessUntil, userId], err => {
            if (err) {
                console.error("DB update error:", err);
                return res.status(500).json({ error: "Database error" });
            }
            return res.json({ success: true, access_until: newAccessUntil });
        });
    });
});

// Создание сессии Stripe Checkout и перенаправление на оплату
app.get('/paystripe', requireLogin, async (req, res) => {
    try {
        const userId = req.session.userId;
        // Получаем email пользователя для передачи в Stripe
        let email = req.session.userEmail;
        if (!email) {
            const userRow = await new Promise((resolve, reject) => {
                db.get("SELECT email FROM users WHERE id = ?", [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            email = userRow ? userRow.email : undefined;
        }
        // Создаём сессию Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            client_reference_id: String(userId),
            customer_email: email,
            line_items: [{
                price_data: {
                    currency: 'pln',
                    product_data: { name: 'OneTapDay 2-Month Access' },
                    unit_amount: 9900  // сумма 99.00 PLN в грошах
                },
                quantity: 1
            }],
            success_url: req.protocol + '://' + req.get('Host') + '/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: req.protocol + '://' + req.get('Host') + '/?cancel=1'
        });
        // Перенаправляем пользователя на хостинг Stripe для оплаты
        return res.redirect(303, session.url);
    } catch (e) {
        console.error("Stripe error:", e);
        res.status(500).json({ error: "Stripe session creation failed" });
    }
});

// Обработка возврата с успешной оплаты Stripe
app.get('/success', async (req, res) => {
    try {
        const session_id = req.query.session_id;
        if (!session_id) {
            // Если параметр не передан, отправляем на главную
            return res.redirect('/');
        }
        // Получаем данные сессии Stripe для подтверждения оплаты
        const sessionData = await stripe.checkout.sessions.retrieve(session_id);
        if (!sessionData || sessionData.payment_status !== 'paid') {
            return res.send("<h2>Payment not successful.</h2><p>Your payment was not completed. Please try again.</p>");
        }
        // Определяем ID пользователя для выдачи доступа
        let userId = req.session.userId;
        if (!userId && sessionData.client_reference_id) {
            // Если запрос пришёл в новый сеанс (например, другая вкладка), восстановим сессию по ID
            userId = parseInt(sessionData.client_reference_id);
            req.session.userId = userId;
            const userRow = await new Promise((resolve, reject) => {
                db.get("SELECT email FROM users WHERE id = ?", [userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (userRow) {
                req.session.userEmail = userRow.email;
            }
        }
        if (!userId) {
            return res.send("<h2>Unknown user for this payment.</h2>");
        }
        // Продлеваем доступ на 2 месяца с учётом текущего состояния
        const now = Date.now();
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT access_until FROM users WHERE id = ?", [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        const twoMonthsMs = 60 * 24 * 60 * 60 * 1000; // ~60 дней в мс
        let newAccess;
        if (user && user.access_until && user.access_until > now) {
            // Если доступ ещё активен, продлеваем от текущей даты окончания
            newAccess = user.access_until + twoMonthsMs;
        } else {
            // Иначе отсчитываем 2 месяца с текущего момента
            newAccess = now + twoMonthsMs;
        }
        await new Promise((resolve, reject) => {
            db.run("UPDATE users SET access_until = ? WHERE id = ?", [newAccess, userId], err => {
                if (err) reject(err);
                else resolve();
            });
        });
        // Перенаправляем на страницу приложения после успешной оплаты
        return res.redirect('/app');
    } catch (e) {
        console.error("Error in /success:", e);
        res.status(500).send("<h2>Server error during payment processing.</h2>");
    }
});

// Защищённая раздача основной страницы приложения (только для авторизованных с доступом)
app.get('/app', requireActive, (req, res) => {
    res.sendFile(path.join(__dirname, 'OneTapDay_MVP_FIX11_plus.html'));
});

// Главная страница портала (вход/регистрация)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'onetapday_portal_v4_green_min.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


