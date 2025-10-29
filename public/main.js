// public/main.js
function $id(id){return document.getElementById(id);}
const msg = $id('msg');

async function api(path, body){
  try{
    const r = await fetch(path, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    const text = await r.text();
    try { return { status: r.status, json: JSON.parse(text) }; }
    catch(e) { return { status: r.status, text }; }
  } catch(e){
    return { error: e.message || String(e) };
  }
}

$id('btnRegister').addEventListener('click', async ()=>{
  msg.textContent = '';
  const email = $id('email').value.trim();
  const password = $id('password').value.trim();
  if(!email || !password){ msg.textContent = 'Введите email и пароль'; return; }
  const res = await api('/register',{email,password});
  if(res.error) { msg.textContent = 'Network error: '+res.error; return; }
  if(res.status >= 400) { msg.textContent = (res.json && res.json.error) ? res.json.error : res.text || 'Ошибка'; return; }
  msg.style.color = 'green';
  msg.textContent = 'Зарегистрировано. Перезагружаю...';
  setTimeout(()=>location.reload(),700);
});

$id('btnLogin').addEventListener('click', async ()=>{
  msg.textContent = '';
  const email = $id('email').value.trim();
  const password = $id('password').value.trim();
  if(!email || !password){ msg.textContent = 'Введите email и пароль'; return; }
  const res = await api('/login',{email,password});
  if(res.error){ msg.textContent = 'Network error: '+res.error; return; }
  if(res.status >= 400){ msg.textContent = (res.json && res.json.error) ? res.json.error : res.text || 'Ошибка'; return; }
  msg.style.color = 'green';
  msg.textContent = 'Вход успешен. Перезагружаю...';
  setTimeout(()=>location.reload(),700);
});

$id('btnDemo').addEventListener('click', async ()=>{
  msg.textContent = '';
  // demo требует авторизации по сессии — сначала логин/регистрация
  const res = await api('/start-demo',{});
  if(res.error){ msg.textContent = 'Network error: '+res.error; return; }
  if(res.status >= 400){ msg.textContent = (res.json && res.json.error) ? res.json.error : res.text || 'Ошибка'; return; }
  msg.style.color = 'green';
  msg.textContent = 'Демо включено на 24 часа';
});

$id('btnPay').addEventListener('click', async ()=>{
  msg.textContent = '';
  const res = await api('/create-checkout-session', {});
  if(res.error){ msg.textContent = 'Network error: '+res.error; return; }
  if(res.status >= 400){ msg.textContent = (res.json && res.json.error) ? res.json.error : res.text || 'Ошибка'; return; }
  // redirect to Stripe Checkout
  const url = res.json ? (res.json.sessionUrl || res.json.url) : null;
  if(url) location.href = url;
  else msg.textContent = 'Не удалось получить URL оплаты';
});
