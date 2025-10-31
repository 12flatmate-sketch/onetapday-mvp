// public/main.js (замени целиком этим)
(() => {
  const LANG_ORDER = ['pl','en','uk','ru'];
  const DEFAULT_LANG = 'pl';
  const apiBase = ''; // same origin

  const T = {
    pl:{ access_title:"Dostęp do MVP", login_tab:"Logowanie", reg_tab:"Rejestracja", login_btn:"Zaloguj",
         pay_or_demo:"Płatność/Demo", after_login_hint:"Po zalogowaniu możesz zapłacić lub włączyć demo.",
         status_title:"Status", status_guest:"Gość — zaloguj się lub zarejestruj",
         stripe_2m:"Zapłać 2 miesiące (Stripe)", demo_24:"Demo 24 godziny", access_note:"Płatność daje natychmiastowy dostęp. Demo trwa 24h.",
         status_none:"Oczekuje płatności depozytu", status_deposit_paid:"Depozyt opłacony", status_active:"Pilot aktywny",
         status_ended:"Pilot zakońчony", status_discount_active:"Zniżka aktywna" },
    en:{ access_title:"MVP Access", login_tab:"Login", reg_tab:"Sign Up", login_btn:"Sign In",
         pay_or_demo:"Pay/Demo", after_login_hint:"After signing in, you can pay or start a demo.",
         status_title:"Status", status_guest:"Guest — sign in or register",
         stripe_2m:"Pay 2 months (Stripe)", demo_24:"24h Demo", access_note:"Payment grants instant access. Demo lasts 24h.",
         status_none:"Awaiting deposit", status_deposit_paid:"Deposit paid", status_active:"Pilot active",
         status_ended:"Pilot ended", status_discount_active:"Discount active" },
    uk:{ access_title:"Доступ до MVP", login_tab:"Вхід", reg_tab:"Реєстрація", login_btn:"Увійти",
         pay_or_demo:"Оплата/Демо", after_login_hint:"Після входу можна оплатити або увімкнути демо.",
         status_title:"Статус", status_guest:"Гість — увійдіть або зареєструйтесь",
         stripe_2m:"Оплатити 2 місяці (Stripe)", demo_24:"Демо 24 години", access_note:"Оплата дає миттєвий доступ. Демо — 24 год.",
         status_none:"Очікується депозит", status_deposit_paid:"Депозит сплачено", status_active:"Пілот активний",
         status_ended:"Пілот завершено", status_discount_active:"Знижка активна" },
    ru:{ access_title:"Доступ к MVP", login_tab:"Вход", reg_tab:"Регистрация", login_btn:"Войти",
         pay_or_demo:"Оплата/Демо", after_login_hint:"После входа можно оплатить или включить демо.",
         status_title:"Статус", status_guest:"Гость — войдите или зарегистрируйтесь",
         stripe_2m:"Оплатить 2 месяца (Stripe)", demo_24:"Демо 24 часа", access_note:"Оплата даёт мгновенный доступ. Демо — 24 часа.",
         status_none:"Ожидается оплата депозита", status_deposit_paid:"Депозит оплачен", status_active:"Пилот активен",
         status_ended:"Пилот завершён", status_discount_active:"Скидка активна" }
  };

  const $ = id => document.getElementById(id);

  // Fetch helper (GET)
  async function getJSON(path) {
    try {
      const r = await fetch((apiBase||'') + path, { credentials: 'include' });
      const body = await r.json().catch(()=>null);
      return { ok: r.ok, status: r.status, body };
    } catch(e) {
      return { ok:false, status:0, body: { error: String(e) } };
    }
  }

  // Универсальная POST-обёртка: всегда include cookies
  async function postJSON(path, body = {}) {
    try {
      const r = await fetch((apiBase||'') + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body || {})
      });
      let parsed;
      try { parsed = await r.json(); } catch(e) { parsed = { _raw: await r.text().catch(()=>'') }; }
      return { ok: r.ok, status: r.status, body: parsed };
    } catch (err) {
      return { ok: false, status: 0, body: { error: String(err) } };
    }
  }

  function applyLang(lang) {
    const dict = T[lang] || T[DEFAULT_LANG];
    document.querySelectorAll('[data-i]').forEach(el => {
      const k = el.getAttribute('data-i');
      if (dict[k]) el.textContent = dict[k];
    });
    document.querySelectorAll('.tabs button').forEach(b=>{
      if (b.dataset.tab === 'login') b.textContent = dict.login_tab;
      if (b.dataset.tab === 'reg') b.textContent = dict.reg_tab;
    });
    document.querySelectorAll('#langBar button').forEach(btn=>btn.classList.toggle('on', btn.dataset.lang === lang));
    localStorage.setItem('otd_lang', lang);
  }

  // Demo timer
  let demoTimerInterval = null;
  function startDemoCountdown(untilTimestamp){
    clearInterval(demoTimerInterval);
    if (!untilTimestamp) return;
    let until = (typeof untilTimestamp === 'number') ? untilTimestamp : Date.parse(String(untilTimestamp));
    if (!until || isNaN(until)) until = Date.now() + 24*60*60*1000;
    localStorage.setItem('otd_demo_until', String(until));
    updateDemoUI(until);
    demoTimerInterval = setInterval(()=>updateDemoUI(until), 1000);
  }
  function stopDemoCountdown(){
    clearInterval(demoTimerInterval);
    localStorage.removeItem('otd_demo_until');
    const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
    if ($('statusText')) $('statusText').textContent = T[lang].status_guest || 'No access';
  }
  function updateDemoUI(until){
    const now = Date.now();
    const diff = until - now;
    if (diff <= 0) { stopDemoCountdown(); return; }
    const hours = Math.floor(diff/3600000);
    const mins = Math.floor((diff%3600000)/60000);
    const secs = Math.floor((diff%60000)/1000);
    const hh = String(hours).padStart(2,'0'), mm = String(mins).padStart(2,'0'), ss = String(secs).padStart(2,'0');
    const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
    if ($('statusText')) $('statusText').textContent = `${localStorage.getItem('otd_user')||'User'} — DEMO ${hh}:${mm}:${ss} (оплатить)`;
  }

  // Local app-state utils (stored in localStorage under 'otd_app_state')
  function readLocalState() {
    try { return JSON.parse(localStorage.getItem('otd_app_state') || '{}'); } catch(e){ return {}; }
  }
  function writeLocalState(state) {
    try { localStorage.setItem('otd_app_state', JSON.stringify(state || {})); } catch(e){}
  }

  // Merge transactions arrays by id (incoming overrides)
  function mergeTransactions(existing = [], incoming = []) {
    const map = {};
    existing.forEach(t => { if (t && t.id) map[t.id] = t; });
    incoming.forEach(t => { if (t && t.id) map[t.id] = t; });
    // preserve original order of existing IDs then append new ones without id
    return Object.values(map);
  }

  // Merge remote state into local state (shallow merge, transactions merged by id)
  function mergeRemoteIntoLocal(remote) {
    if (!remote || typeof remote !== 'object') return;
    const local = readLocalState() || {};
    // transactions special-case
    if (Array.isArray(remote.transactions)) {
      local.transactions = mergeTransactions(Array.isArray(local.transactions)?local.transactions:[], remote.transactions);
    }
    // merge other keys (remote wins)
    for (const k of Object.keys(remote)) {
      if (k === 'transactions') continue;
      local[k] = remote[k];
    }
    writeLocalState(local);
    return local;
  }

  // Merge local state into server (use merge endpoint)
  async function pushLocalStateToServer() {
    const state = readLocalState();
    if (!state || Object.keys(state).length === 0) return { ok:true };
    const r = await postJSON('/app-state/merge', { state });
    return r;
  }

  // Fetch server state and merge to local (called after auth)
  async function syncStateFromServerToLocal() {
    const r = await getJSON('/app-state');
    if (!r.ok) return r;
    const remote = r.body && r.body.state;
    const merged = mergeRemoteIntoLocal(remote || {});
    // push merged back to server to unify both sides
    const push = await postJSON('/app-state', { state: merged });
    return push.ok ? { ok:true } : { ok:false, status: push.status, body: push.body };
  }

  // Try start demo: /start-demo preferred, fallback /demo
  async function tryStartDemo(){
    // 1) /start-demo (authenticated)
    let resp = await postJSON('/start-demo', {});
    if (resp.ok && resp.body && (resp.body.demoUntil || resp.body.demo_until || resp.body.success)) {
      const until = resp.body.demoUntil || resp.body.demo_until || resp.body.demoUntilISO || null;
      const ts = until ? (isNaN(Number(until)) ? Date.parse(until) : Number(until)) : (Date.now() + 24*60*60*1000);
      startDemoCountdown(ts);
      return { ok: true };
    }
    // if server replies 400 for demoUsed or 409 etc, return informative
    if(resp && resp.status === 400 && resp.body && resp.body.error) {
      return { ok:false, status:400, body: resp.body };
    }
    // 2) fallback /demo
    resp = await postJSON('/demo', {});
    if (resp.ok && resp.body && (resp.body.demo_until || resp.body.demoUntil || resp.body.success)) {
      const until = resp.body.demo_until || resp.body.demoUntil || null;
      const ts = until ? (isNaN(Number(until)) ? Date.parse(until) : Number(until)) : (Date.now() + 24*60*60*1000);
      startDemoCountdown(ts);
      return { ok: true };
    }
    return { ok:false, status: resp.status, body: resp.body };
  }

  document.addEventListener('DOMContentLoaded', () => {
    // initial language
    applyLang(localStorage.getItem('otd_lang') || DEFAULT_LANG);
    document.querySelectorAll('#langBar button').forEach(b => b.addEventListener('click', ()=>applyLang(b.dataset.lang)));
    document.querySelectorAll('.tabs button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('on'));
        btn.classList.add('on');
        applyLang(localStorage.getItem('otd_lang') || DEFAULT_LANG);
      });
    });

    const emailEl = $('email'), passEl = $('pass'), loginBtn = $('doLogin'), doPayBtn = $('doPay'), stripeBtn = $('payStripe'), demoBtn = $('demoBtn');

    // Registration / Login
    loginBtn.addEventListener('click', async ()=>{
      const email = (emailEl.value||'').trim(), pass = passEl.value || '';
      if (!email || !pass) return alert('Введите email и пароль');

      const activeTab = document.querySelector('.tabs button.on');
      const isReg = activeTab && activeTab.dataset.tab === 'reg';
      const endpoint = isReg ? '/register' : '/login';

      const resp = await postJSON(endpoint, { email, password: pass });
      if (!resp.ok) {
        const err = (resp.body && (resp.body.error || resp.body.message || JSON.stringify(resp.body))) || `HTTP ${resp.status}`;
        return alert('Ошибка: ' + err);
      }

      const data = resp.body;
      const user = data && (data.user || data);
      if (user && user.email) localStorage.setItem('otd_user', user.email);
      if (typeof setStatusAfterAuth === 'function') setStatusAfterAuth(user);

      // After successful auth — sync state before redirecting to app
      try {
        // Attempt to fetch remote state and merge it into local, then push merged state back
        const syncRes = await syncStateFromServerToLocal();
        if (!syncRes.ok) {
          console.warn('State sync warning', syncRes);
        }
      } catch(e){
        console.warn('State sync failed', e);
      }

      if (isReg) {
        const sd = await tryStartDemo();
        if (sd.ok) { setTimeout(()=>{ window.location.href = '/app.html'; }, 300); return; }
        if (sd.status === 401) {
          alert('Регистрация прошла, но сессия не установлена автоматически. Войдите вручную.');
          return;
        } else if (sd.status === 400 && sd.body && sd.body.error === 'Demo already used') {
          alert('Демо уже использовано для этого аккаунта.');
          setTimeout(()=>{ window.location.href = '/app.html'; }, 300);
          return;
        } else {
          alert('Регистрация прошла. Демо не активировано автоматически, можно включить демо вручную.');
          setTimeout(()=>{ window.location.href = '/app.html'; }, 300);
          return;
        }
      } else {
        alert('Вход успешен');
        setTimeout(()=>{ window.location.href = '/app.html'; }, 300);
      }
    });

    // Demo button manual
    demoBtn.addEventListener('click', async ()=>{
      const md = await tryStartDemo();
      if (md.ok) { alert('Демо активировано — 24 часа'); }
      else {
        if (md.status === 401) alert('Сначала войдите в систему.');
        else if (md.status === 400 && md.body && md.body.error) alert('Демо недоступно: ' + md.body.error);
        else alert('Не удалось включить демо. Посмотри логи.');
      }
    });

    // Stripe
    stripeBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const resp = await postJSON('/create-checkout-session', {});
      if (!resp.ok) {
        const err = (resp.body && (resp.body.error || JSON.stringify(resp.body))) || `HTTP ${resp.status}`;
        return alert('Ошибка платежа: ' + err);
      }
      const body = resp.body || {};
      const redirect = body.url || body.sessionUrl || (body.session && body.session.url);
      if (redirect) { window.location.href = redirect; return; }
      alert('Неожиданный ответ сервера платежа: ' + JSON.stringify(body));
    });

    doPayBtn.addEventListener('click', ()=>{ stripeBtn.scrollIntoView({behavior:'smooth', block:'center'}); });

    // restore demo timer if present
    const savedUntil = localStorage.getItem('otd_demo_until');
    if (savedUntil) {
      const n = Number(savedUntil);
      if (n && !isNaN(n)) startDemoCountdown(n);
      else startDemoCountdown(savedUntil);
    }

    // finalize stripe session_id return
    (async ()=>{
      try {
        const params = new URLSearchParams(location.search);
        const sid = params.get('session_id');
        if (!sid) return;
        await fetch('/session?session_id=' + encodeURIComponent(sid), { credentials: 'include' });
        setTimeout(()=> location.href = location.pathname, 900);
      } catch(e){ console.warn('session finalize failed', e); }
    })();

    // whoami / try to restore session-based user and sync state
    (async ()=>{
      try {
        // Prefer /me which uses cookie/session
        const r = await getJSON('/me');
        if (r.ok && r.body && r.body.user) {
          const user = r.body.user;
          if (user && user.email) localStorage.setItem('otd_user', user.email);
          if (typeof setStatusAfterAuth === 'function') setStatusAfterAuth(user);
          // sync remote app state into local
          await syncStateFromServerToLocal();
        } else {
          // fallback to old user? try local stored email
          const saved = localStorage.getItem('otd_user') || '';
          if (!saved) return;
          const r2 = await getJSON('/user?email=' + encodeURIComponent(saved));
          if (r2.ok && r2.body && r2.body.user) {
            setStatusAfterAuth(r2.body.user);
            await syncStateFromServerToLocal();
          }
        }
      } catch(e){ console.warn('whoami failed', e); }
    })();

    // helper to update UI after auth; keep simple
    window.setStatusAfterAuth = function(user){
      const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
      if (!user) { if ($('statusText')) $('statusText').textContent = T[lang].status_guest; return; }
      const status = user.status || (user.demo_until ? 'active' : 'none');
      if (status === 'active' || status === 'discount_active') {
        const until = user.demo_until || user.demoUntil || user.endAt || user.end_at;
        if (until) startDemoCountdown(until);
        else if ($('statusText')) $('statusText').textContent = `${user.email} — ${T[lang].status_active}`;
        $('payStripe').style.display = '';
      } else {
        if ($('statusText')) $('statusText').textContent = `${user.email} — ${T[lang].status_none}`;
        $('payStripe').style.display = '';
      }
    };

    // Expose small API to app page to trigger saving local state and syncing to server.
    window.OTD = window.OTD || {};
    window.OTD.saveLocalState = async function(state) {
      // caller provides state object (partial) — merge shallowly into local and push to server
      const cur = readLocalState();
      const merged = Object.assign({}, cur, state || {});
      // merge transactions specially if provided
      if (Array.isArray(state && state.transactions)) {
        merged.transactions = mergeTransactions(cur.transactions||[], state.transactions);
      }
      writeLocalState(merged);
      // try push
      try { await pushLocalStateToServer(); } catch(e){ console.warn('pushLocalStateToServer failed', e); }
      return merged;
    };
    window.OTD.getLocalState = readLocalState;

  }); // DOMContentLoaded end

})(); 
