// Вставь/замени это в начале main.js (если postJSON уже есть — убедись, что credentials: 'include')
async function postJSON(url, body = {}) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    let parsed;
    try { parsed = await r.json(); } catch(e) { parsed = await r.text().catch(()=>null); }
    return { ok: r.ok, status: r.status, body: parsed };
  } catch (err) {
    return { ok: false, status: 0, body: String(err) };
  }
}

// public/main.js (updated) — вставить вместо старого main.js
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
         status_ended:"Pilot zakończony", status_discount_active:"Zniżka aktywna" },
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
  function applyLang(lang){
    const dict = T[lang] || T[DEFAULT_LANG];
    document.querySelectorAll('[data-i]').forEach(el=>{
      const k = el.getAttribute('data-i');
      if(dict[k]) el.textContent = dict[k];
    });
    document.querySelectorAll('.tabs button').forEach(b=>{
      if(b.dataset.tab === 'login') b.textContent = dict.login_tab;
      if(b.dataset.tab === 'reg') b.textContent = dict.reg_tab;
    });
    document.querySelectorAll('#langBar button').forEach(btn=>btn.classList.toggle('on', btn.dataset.lang===lang));
    localStorage.setItem('otd_lang', lang);
  }

  async function postJSON(path, body){
    try {
      const r = await fetch((apiBase||'') + path, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify(body || {})
      });
      let json = null;
      try{ json = await r.json(); }catch(e){ json = { _raw: await r.text().catch(()=>'') } }
      return { ok: r.ok, status: r.status, body: json };
    } catch(e){
      return { ok:false, status:0, body:{ error: String(e) } };
    }
  }

  // demo timer management
  let demoTimerInterval = null;
  function startDemoCountdown(untilTimestamp){
    clearInterval(demoTimerInterval);
    if(!untilTimestamp) return;
    // normalize: untilTimestamp might be ISO string, number ms, or seconds
    let until = typeof untilTimestamp === 'number' ? untilTimestamp : Date.parse(String(untilTimestamp));
    if(!until || isNaN(until)) {
      // fallback to 24 hours from now
      until = Date.now() + 24*60*60*1000;
    }
    localStorage.setItem('otd_demo_until', String(until));
    updateDemoUI(until);
    demoTimerInterval = setInterval(()=>updateDemoUI(until), 1000);
  }
  function stopDemoCountdown(){
    clearInterval(demoTimerInterval);
    localStorage.removeItem('otd_demo_until');
    // reset status pill
    const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
    $('statusText').textContent = T[lang].status_none || 'No access';
  }
  function updateDemoUI(until){
    const now = Date.now();
    const diff = until - now;
    if(diff <= 0){
      stopDemoCountdown();
      return;
    }
    const hours = Math.floor(diff/3600000);
    const mins = Math.floor((diff%3600000)/60000);
    const secs = Math.floor((diff%60000)/1000);
    const hh = String(hours).padStart(2,'0');
    const mm = String(mins).padStart(2,'0');
    const ss = String(secs).padStart(2,'0');
    const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
    // keep pay button visible always
    $('statusText').textContent = `${localStorage.getItem('otd_user')||'User'} — DEMO ${hh}:${mm}:${ss} (оплатить)`;
  }

  // try to call start-demo (authenticated); fallback to /demo
  async function tryStartDemo(){
    
  // first try /start-demo
  let resp = await postJSON('/start-demo', {});
  if (resp.ok && resp.body && (resp.body.demoUntil || resp.body.demo_until || resp.body.success)) {
    const until = resp.body.demoUntil || resp.body.demo_until || resp.body.demoUntilISO || null;
    const ts = until ? (isNaN(Number(until)) ? Date.parse(until) : Number(until)) : (Date.now() + 24*60*60*1000);
    localStorage.setItem('otd_demo_until', String(ts));
    startDemoCountdown(ts);
    return { ok:true };
  }

  // fallback to /demo (older API)
  resp = await postJSON('/demo', {});
  if (resp.ok && resp.body && (resp.body.demo_until || resp.body.success)) {
    const until = resp.body.demo_until || resp.body.demoUntil || null;
    const ts = until ? (isNaN(Number(until)) ? Date.parse(until) : Number(until)) : (Date.now() + 24*60*60*1000);
    localStorage.setItem('otd_demo_until', String(ts));
    startDemoCountdown(ts);
    return { ok:true };
  }

  // return failure including status/body for diagnostics
  return { ok:false, status: resp.status, body: resp.body };
}

      // server might return demoUntil or demo_until; normalize
      const until = resp.body.demoUntil || resp.body.demo_until || null;
      if(until) startDemoCountdown(until);
      else startDemoCountdown(Date.now() + 24*60*60*1000);
      return { ok:true };
    }
    // fallback to /demo (older)
    resp = await postJSON('/demo', {});
    if(resp.ok && resp.body && (resp.body.demo_until || resp.body.success)){
      const until = resp.body.demo_until || resp.body.demoUntil || null;
      if(until) startDemoCountdown(until);
      else startDemoCountdown(Date.now() + 24*60*60*1000);
      return { ok:true };
    }
    // if server returned 401 — user isn't logged in; caller should handle
    return { ok:false, status: resp.status, body: resp.body };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    applyLang(localStorage.getItem('otd_lang') || LANG_ORDER[0] || DEFAULT_LANG);

    document.querySelectorAll('#langBar button').forEach(b=>b.addEventListener('click', ()=>applyLang(b.dataset.lang)));

    document.querySelectorAll('.tabs button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('on'));
        btn.classList.add('on');
        applyLang(localStorage.getItem('otd_lang') || DEFAULT_LANG);
      });
    });

    const emailEl = $('email'), passEl = $('pass'), loginBtn = $('doLogin'), doPayBtn = $('doPay'), stripeBtn = $('payStripe'), demoBtn = $('demoBtn');

    // registration / login
loginBtn.addEventListener('click', async ()=>{
  const email = (emailEl.value||'').trim(), pass = passEl.value || '';
  if(!email || !pass) return alert('Введите email и пароль');

  const activeTab = document.querySelector('.tabs button.on');
  const isReg = activeTab && activeTab.dataset.tab === 'reg';
  const endpoint = isReg ? '/register' : '/login';

  // call register/login
  const resp = await postJSON(endpoint, { email, password: pass });

  if(!resp.ok) {
    const err = (resp.body && (resp.body.error||resp.body.message||JSON.stringify(resp.body))) || `HTTP ${resp.status}`;
    return alert('Ошибка: ' + err);
  }

  // Successful auth — server should return { success:true, user: { ... } } or user object
  const data = resp.body;
  const user = data && (data.user || data);
  if (user && user.email) {
    localStorage.setItem('otd_user', user.email);
  }
  // Update UI - your existing function
  if (typeof setStatusAfterAuth === 'function') setStatusAfterAuth(user);

  // If it was registration, try auto-start demo
  if (isReg) {
    const sd = await tryStartDemo();
    if (sd.ok) {
      // demo started — user now has demo access; redirect to app
      // give tiny delay to allow countdown to render
      setTimeout(()=>{ window.location.href = '/app.html'; }, 300);
      return;
    } else {
      // diagnose: if 401 — server didn't set cookie (session); notify
      if (sd.status === 401) {
        console.warn('/start-demo returned 401 — server may not have created session cookie after register. Check server Set-Cookie.');
        alert('Регистрация прошла, но автоматическое включение демо не удалось (несохранена сессия). Войдите вручную.');
        return;
      } else {
        console.warn('start-demo failed', sd);
        // still proceed: redirect to app (may still have login) or show message
        alert('Регистрация прошла. Демо не активировано автоматически, можно включить демо вручную.');
        // optional: still redirect to app.html to let user try demo button there
        setTimeout(()=>{ window.location.href = '/app.html'; }, 300);
        return;
      }
    }
  } else {
    // normal login
    alert('Вход успешен');
    // redirect user to app (if they have active access or to allow manual demo)
    setTimeout(()=>{ window.location.href = '/app.html'; }, 300);
  }
});

      // server may return { success: true, user: {...} } or raw user object
      const data = resp.body;
      const user = data.user || data;
      if(user && user.email) localStorage.setItem('otd_user', user.email);
      setStatusAfterAuth(user);

      // If this was registration — try to start demo automatically
      if(isReg){
        const sd = await tryStartDemo();
        if(sd.ok) { /* demo started and timer runs */ }
        else {
          if(sd.status === 401) {
            // not authenticated by server despite registration — maybe server didn't set cookie; notify
            console.warn('/start-demo returned 401 — server may not have created session cookie');
          } else {
            console.warn('start-demo failed', sd);
          }
        }
      }

      alert(isReg ? 'Регистрация прошла успешно' : 'Вход успешен');
    });

    // demo button manual
    demoBtn.addEventListener('click', async ()=>{
      const md = await tryStartDemo();
      if(md.ok) { alert('Демо активировано — 24 часа'); }
      else {
        if(md.status === 401) alert('Сначала войдите в систему.');
        else alert('Не удалось включить демо. Посмотри логи.');
      }
    });

    // stripe
    stripeBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const resp = await postJSON('/create-checkout-session', {});
      if(!resp.ok) {
        const err = (resp.body && (resp.body.error||JSON.stringify(resp.body))) || `HTTP ${resp.status}`;
        return alert('Ошибка платежа: ' + err);
      }
      const body = resp.body || {};
      const redirect = body.url || body.sessionUrl || (body.session && body.session.url);
      if(redirect) { window.location.href = redirect; return; }
      // otherwise show for debug
      alert('Неожиданный ответ сервера платежа: ' + JSON.stringify(body));
    });

    doPayBtn.addEventListener('click', ()=>{ stripeBtn.scrollIntoView({behavior:'smooth', block:'center'}); });

    // on load: if demo_until was stored — restore timer
    const savedUntil = localStorage.getItem('otd_demo_until');
    if(savedUntil) {
      const n = Number(savedUntil);
      if(n && !isNaN(n)) startDemoCountdown(n);
      else startDemoCountdown(savedUntil);
    }

    // finalize session_id from stripe redirect (if present)
    (async ()=>{
      try {
        const params = new URLSearchParams(location.search);
        const sid = params.get('session_id');
        if(!sid) return;
        const r = await fetch('/session?session_id=' + encodeURIComponent(sid), { credentials:'include' });
        // reload (webhook may do server-side anyway)
        setTimeout(()=> location.href = location.pathname, 900);
      } catch(e){ console.warn('session finalize failed', e); }
    })();

    // small whoami try
    (async ()=>{
      try {
        const saved = localStorage.getItem('otd_user') || '';
        if(!saved) return;
        const r = await fetch('/user?email=' + encodeURIComponent(saved), { credentials:'include' });
        if(r.ok){ const j = await r.json().catch(()=>null); if(j && j.user) setStatusAfterAuth(j.user); }
      } catch(e){}
    })();

    function setStatusAfterAuth(user) {
      const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
      if(!user){ $('statusText').textContent = T[lang].status_guest; return; }
      const status = user.status || (user.demo_until ? 'active' : 'none');
      if(status === 'active' || status === 'discount_active') {
        // If server included end time, start countdown
        const until = user.demo_until || user.demoUntil || user.endAt || user.end_at;
        if(until) startDemoCountdown(until);
        else {
          // if active but no end — don't start timer, just show active
          $('statusText').textContent = `${user.email} — ${T[lang].status_active}`;
        }
        // keep pay available always as requested
        $('payStripe').style.display = '';
      } else {
        $('statusText').textContent = `${user.email} — ${T[lang].status_none}`;
        $('payStripe').style.display = '';
      }
    }

  }); // DOMContentLoaded end

})();
