// public/main.js
// OneTapDay client glue: i18n + auth + demo + stripe start
(() => {
  // Config
  const LANG_ORDER = ['pl','en','uk','ru']; // left-to-right
  const DEFAULT_LANG = 'pl';
  const apiBase = ''; // same origin; can be overridden by adding ?dev=1&api=...
  // Simple i18n dictionary (relevant keys only)
  const T = {
    pl: {
      access_title: "Dostęp do MVP",
      login_tab: "Logowanie",
      reg_tab: "Rejestracja",
      login_btn: "Zaloguj",
      pay_or_demo: "Płatność/Demo",
      after_login_hint: "Po zalogowaniu możesz zapłacić lub włączyć demo.",
      status_title: "Status",
      status_guest: "Gość — zaloguj się lub zarejestruj",
      access_actions: "Dostęp",
      stripe_2m: "Zapłać 2 miesiące (Stripe)",
      demo_24: "Demo 24 godziny",
      access_note: "Płatność daje natychmiastowy dostęp. Demo trwa 24h.",
      status_none: "Oczekuje płatności depozytu",
      status_deposit_paid: "Depozyt opłacony",
      status_active: "Pilot aktywny",
      status_ended: "Pilot zakończony",
      status_discount_active: "Zniżka aktywna"
    },
    en: {
      access_title: "MVP Access",
      login_tab: "Login",
      reg_tab: "Sign Up",
      login_btn: "Sign In",
      pay_or_demo: "Pay/Demo",
      after_login_hint: "After signing in, you can pay or start a demo.",
      status_title: "Status",
      status_guest: "Guest — sign in or register",
      stripe_2m: "Pay 2 months (Stripe)",
      demo_24: "24h Demo",
      access_note: "Payment grants instant access. Demo lasts 24h.",
      status_none: "Awaiting deposit",
      status_deposit_paid: "Deposit paid",
      status_active: "Pilot active",
      status_ended: "Pilot ended",
      status_discount_active: "Discount active"
    },
    uk: {
      access_title: "Доступ до MVP",
      login_tab: "Вхід",
      reg_tab: "Реєстрація",
      login_btn: "Увійти",
      pay_or_demo: "Оплата/Демо",
      after_login_hint: "Після входу можна оплатити або увімкнути демо.",
      status_title: "Статус",
      status_guest: "Гість — увійдіть або зареєструйтесь",
      stripe_2m: "Оплатити 2 місяці (Stripe)",
      demo_24: "Демо 24 години",
      access_note: "Оплата дає миттєвий доступ. Демо — 24 год.",
      status_none: "Очікується депозит",
      status_deposit_paid: "Депозит сплачено",
      status_active: "Пілот активний",
      status_ended: "Пілот завершено",
      status_discount_active: "Знижка активна"
    },
    ru: {
      access_title: "Доступ к MVP",
      login_tab: "Вход",
      reg_tab: "Регистрация",
      login_btn: "Войти",
      pay_or_demo: "Оплата/Демо",
      after_login_hint: "После входа можно оплатить или включить демо.",
      status_title: "Статус",
      status_guest: "Гость — войдите или зарегистрируйтесь",
      stripe_2m: "Оплатить 2 месяца (Stripe)",
      demo_24: "Демо 24 часа",
      access_note: "Оплата даёт мгновенный доступ. Демо — 24 часа.",
      status_none: "Ожидается оплата депозита",
      status_deposit_paid: "Депозит оплачен",
      status_active: "Пилот активен",
      status_ended: "Пилот завершён",
      status_discount_active: "Скидка активна"
    }
  };

  // Helpers
  const $ = id => document.getElementById(id);
  function applyLang(lang) {
    const dict = T[lang] || T[DEFAULT_LANG];
    document.querySelectorAll('[data-i]').forEach(el => {
      const key = el.getAttribute('data-i');
      if (dict[key]) el.textContent = dict[key];
    });
    // update tabs/buttons textual variants
    document.querySelectorAll('.tabs button').forEach(b => {
      if (b.dataset.tab === 'login') b.textContent = dict.login_tab;
      if (b.dataset.tab === 'reg') b.textContent = dict.reg_tab;
    });
    // main action
    const actionBtn = $('doLogin');
    if (actionBtn) {
      const activeTab = document.querySelector('.tabs button.on');
      actionBtn.textContent = (activeTab && activeTab.dataset.tab === 'reg') ? dict.reg_tab : dict.login_btn;
    }
    // mark active language button
    document.querySelectorAll('#langBar button').forEach(btn => btn.classList.toggle('on', btn.dataset.lang === lang));
    localStorage.setItem('otd_lang', lang);
  }

  // Network helpers with credentials
  async function postJSON(path, body) {
    const url = (apiBase || '') + path;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body || {})
    });
    let json;
    try { json = await r.json(); } catch(_) { json = { ok: false, status: r.status, text: await r.text().catch(()=>'') }; }
    return { ok: r.ok, status: r.status, body: json };
  }

  // status update in UI
  function setStatusText(textKeyOrString) {
    const el = $('statusText');
    if (!el) return;
    if (T[localStorage.getItem('otd_lang') || DEFAULT_LANG][textKeyOrString]) {
      el.textContent = T[localStorage.getItem('otd_lang') || DEFAULT_LANG][textKeyOrString];
    } else {
      el.textContent = String(textKeyOrString);
    }
  }

  // init DOM once ready
  document.addEventListener('DOMContentLoaded', () => {
    // Lang
    const saved = localStorage.getItem('otd_lang') || (LANG_ORDER[0] || DEFAULT_LANG);
    applyLang(saved);

    document.querySelectorAll('#langBar button').forEach(b => {
      b.addEventListener('click', () => applyLang(b.dataset.lang));
    });

    // Tabs
    document.querySelectorAll('.tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('on'));
        btn.classList.add('on');
        // update main action label
        applyLang(localStorage.getItem('otd_lang') || DEFAULT_LANG);
      });
    });

    // UI elements
    const emailEl = $('email');
    const passEl = $('pass');
    const loginBtn = $('doLogin');
    const doPayBtn = $('doPay');
    const stripeBtn = $('payStripe');
    const demoBtn = $('demoBtn');

    // Auth flows
    loginBtn.addEventListener('click', async () => {
      const email = (emailEl.value || '').trim();
      const pass = (passEl.value || '');
      if (!email || !pass) return alert('Введите email и пароль');
      const activeTab = document.querySelector('.tabs button.on');
      const isReg = activeTab && activeTab.dataset.tab === 'reg';
      const endpoint = isReg ? '/register' : '/login';
      const resp = await postJSON(endpoint, { email, password: pass });
      if (!resp.ok) {
        // server may respond with body.error or message
        const err = (resp.body && (resp.body.error || resp.body.message || JSON.stringify(resp.body))) || `HTTP ${resp.status}`;
        return alert('Ошибка: ' + err);
      }
      const data = resp.body;
      if (data && data.success === false) {
        return alert(data.error || 'Ошибка авторизации');
      }
      // success
      const user = (data.user || data);
      localStorage.setItem('otd_user', user && user.email ? user.email : email);
      setStatusAfterAuth(user);
      alert(isReg ? 'Успешная регистрация' : 'Вход успешен');
    });

    // Demo flow
    demoBtn.addEventListener('click', async () => {
      // try /start-demo then /demo
      const res1 = await postJSON('/start-demo', {});
      if (res1.ok && res1.body && res1.body.success) {
        alert('Демо активировано — 24 часа');
        setStatusAfterAuth(res1.body.user || { status: 'active' });
        return;
      }
      // fallback to /demo (older)
      const res2 = await postJSON('/demo', {});
      if (res2.ok && res2.body && (res2.body.demo_until || res2.body.success)) {
        alert('Демо активировано — 24 часа');
        return setStatusAfterAuth(res2.body.user || { status: 'active' });
      }
      alert('Не удалось активировать демо. Проверьте, что вы вошли в систему.');
    });

    // Create checkout session (try different response shapes)
    stripeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      // create session
      const resp = await postJSON('/create-checkout-session', {});
      if (!resp.ok) {
        alert('Ошибка инициации платежа: ' + (resp.body && (resp.body.error || JSON.stringify(resp.body)) || resp.status));
        return;
      }
      const body = resp.body || {};
      // possible keys: url | sessionUrl | { url: ... }
      const redirect = body.url || body.sessionUrl || body.session?.url;
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      // sometimes server returns { id } -> do stripe redirect? fallback: display JSON
      alert('Неизвестный ответ от сервера при создании сессии: ' + JSON.stringify(body));
    });

    // doPay button scrolls to payment controls
    doPayBtn.addEventListener('click', () => {
      stripeBtn.scrollIntoView({ behavior:'smooth', block:'center' });
    });

    // on load: if returned from stripe checkout with session_id param, try to finalize
    (async function finalizeSessionFromUrl(){
      try {
        const params = new URLSearchParams(location.search);
        const sid = params.get('session_id');
        if (!sid) return;
        // Try /session (some servers implement it). If not, still reload to reflect webhook.
        const r = await fetch('/session?session_id=' + encodeURIComponent(sid), { credentials:'include' });
        if (r.ok) {
          // server processed it — reload clean URL
          const u = new URL(location.href);
          u.searchParams.delete('session_id');
          location.href = u.pathname + u.search;
        } else {
          // not critical — webhook should handle
          console.warn('session finalize failed, webhook should handle it');
          // reload after a short delay to allow webhook
          setTimeout(()=>location.reload(), 1200);
        }
      } catch(e){ console.warn('session finalize error', e); }
    })();

    // Small: try to get current user info (server may not have /me)
    (async function tryWhoami(){
      try {
        const r = await fetch('/user?email=' + encodeURIComponent(localStorage.getItem('otd_user') || ''), { credentials:'include' });
        if (r.ok) {
          const j = await r.json().catch(()=>null);
          if (j && j.user) setStatusAfterAuth(j.user);
        }
      } catch(e){ /* ignore */ }
    })();

    function setStatusAfterAuth(user) {
      if (!user) return;
      // user.status expected: none, deposit_paid, active, ended, discount_active
      const status = user.status || (user.demo_until ? 'active' : 'none');
      const lang = localStorage.getItem('otd_lang') || DEFAULT_LANG;
      const mapKey = {
        none: 'status_none',
        deposit_paid: 'status_deposit_paid',
        active: 'status_active',
        ended: 'status_ended',
        discount_active: 'status_discount_active'
      }[status] || 'status_none';
      // status text
      const txt = (T[lang] && T[lang][mapKey]) ? T[lang][mapKey] : (user.email ? user.email + ' — активен' : 'Active');
      $('statusText').textContent = user.email ? `${user.email} — ${txt}` : txt;
      // disable pay/demo when active
      if (status === 'active' || status === 'discount_active') {
        $('payStripe').style.display = 'none';
        $('demoBtn').style.display = 'none';
      } else {
        $('payStripe').style.display = '';
        $('demoBtn').style.display = '';
      }
    }

  }); // DOMContentLoaded end

})();
