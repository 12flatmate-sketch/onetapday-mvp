# OneTapDay — MVP (minimal package)

## Что внутри
- server.js — backend (Express + SQLite + Stripe webhook)
- public/index.html — Portal (login/demo/pay)
- public/mvp.html — MVP area
- package.json
- README.md (этот файл)

## Быстрый локальный запуск (dev)
1. Установи Node.js (v18+).
2. Распакуй в папку и в терминале выполни:
   ```
   npm install
   STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=your_webhook_secret npm start
   ```
   При отсутствии webhook secret сервер всё равно по‑dev попытается обработать.
3. Открой http://localhost:3000

## Deploy (Render / Heroku / любой VPS)
1. Залей этот реп на GitHub (repository = "репа" — папка с кодом в GitHub).
2. Render: New → Web Service → Connect GitHub → выбери реп → Build command `npm install` → Start command `npm start`.
3. В Settings Render добавь Environment Variables:
   - STRIPE_SECRET_KEY = sk_test_...
   - STRIPE_WEBHOOK_SECRET = <stripe webhook signing secret>
   - PUBLIC_URL = https://<your-render-service>.onrender.com
4. После деплоя возьми URL сервиса `https://<your-render-service>.onrender.com`
   и в Stripe Dashboard → Developers → Webhooks добавь endpoint:
   `https://<your-render-service>.onrender.com/webhook`
   Выбери событие `checkout.session.completed`.
   Скопируй Signing secret и вставь в Render как STRIPE_WEBHOOK_SECRET.

## Минимальные пояснения (коротко)
- "репа" = репозиторий = твой проект на GitHub.
- Render — облачный хост для Node.js (https://render.com). Можно заменить на Heroku/ Railway/ Vercel.
- Вебхук — URL, куда Stripe шлёт события. Пока укажешь `https://<render-url>/webhook`.
- Frontend сделан минимальным: быстрый email-login, demo 24h, pay -> Stripe Checkout. MVP-логика — доступ/демо/оплата.

## Подсказки
- Никогда не публикуй `STRIPE_SECRET_KEY` публично. Если ключ уже оказался в публичном месте — ротируй (Rotate) в Stripe.
- Я могу упаковать ZIP и дать ссылку — готово сейчас.
