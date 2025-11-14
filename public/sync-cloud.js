import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyClatmXXE1ZG-MjKcHrquz2HSOZ4SswVVs",
  authDomain: "onetapday-d45a6.firebaseapp.com",
  databaseURL: "https://onetapday-d45a6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "onetapday-d45a6",
  storageBucket: "onetapday-d45a6.firebasestorage.app",
  messagingSenderId: "402338811274",
  appId: "1:402338811274:web:ad8ce7c6d47bb51b22cc73",
  measurementId: "G-DEDSHTT30C"
};

// не создаём второй инстанс, если уже инициализирован в app.html
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getDatabase(app);

// тот же ключ, что сейчас: 1tapday@gmail.com -> 1tapday@gmail,com
function keyFromEmail(email){
  if(!email) return "anon";
  return String(email)
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/[^a-z0-9,@]/g, "_");
}

// какие настройки тянем в облако
function collectSettings() {
  const keys = (window.stateKeys && window.stateKeys.length)
    ? window.stateKeys
    : [
        "cashPLN","penaltyPct","intervalMin",
        "rateEUR","rateUSD","blacklist","autoCash",
        "otd_lang","speechLang",
        "txUrl","billUrl",
        "otd_demo_started_at",
        "otd_sub_active","otd_sub_from","otd_sub_to"
      ];
  const out = {};
  keys.forEach(k => {
    out[k] = localStorage.getItem(k);
  });
  return out;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch(e) {
    console.warn("[sync-cloud] parse error", key, e);
    return fallback;
  }
}

function normalizeState(raw) {
  const s = raw || {};
  return {
    tx: Array.isArray(s.tx) ? s.tx : [],
    bills: Array.isArray(s.bills) ? s.bills : [],
    kasa: Array.isArray(s.kasa) ? s.kasa : [],
    accMeta: (s.accMeta && typeof s.accMeta === "object") ? s.accMeta : {},
    settings: (s.settings && typeof s.settings === "object") ? s.settings : {},
    updatedAt: Number(s.updatedAt || 0)
  };
}

// читаем локальное состояние из localStorage
function buildLocalState() {
  return normalizeState({
    tx: readJSON("tx_manual_import", []),
    bills: readJSON("bills_manual_import", []),
    kasa: readJSON("kasa", []),
    accMeta: readJSON("accMeta", {}),
    settings: collectSettings(),
    updatedAt: Number(localStorage.getItem("otd_cloud_updated_at") || 0)
  });
}

// записываем состояние в localStorage и перерисовываем UI
function writeLocalState(state) {
  const s = normalizeState(state);

  localStorage.setItem("tx_manual_import", JSON.stringify(s.tx));
  localStorage.setItem("bills_manual_import", JSON.stringify(s.bills));
  localStorage.setItem("kasa", JSON.stringify(s.kasa));
  localStorage.setItem("accMeta", JSON.stringify(s.accMeta));
  localStorage.setItem("otd_cloud_updated_at", String(s.updatedAt || Date.now()));

  Object.entries(s.settings).forEach(([k, v]) => {
    if (v != null) localStorage.setItem(k, v);
  });

  if (typeof window.loadLocal === "function") window.loadLocal();
  if (typeof window.inferAccounts === "function") window.inferAccounts();
  if (typeof window.render === "function") window.render();
}

// пушим локальный снапшот в Firebase
async function saveSnapshot(email) {
  if (!email) return;
  const key = keyFromEmail(email);
  const refState = ref(db, "users/" + key + "/state");

  const local = buildLocalState();
  const payload = {
    tx: local.tx,
    bills: local.bills,
    kasa: local.kasa,
    accMeta: local.accMeta,
    settings: local.settings,
    updatedAt: Date.now()
  };

  localStorage.setItem("otd_cloud_updated_at", String(payload.updatedAt));
  await set(refState, payload);
}

// realtime-подписка: применяем только НОВЕЕ облако
function startRealtime(email) {
  if (!email) return;
  const key = keyFromEmail(email);
  const refState = ref(db, "users/" + key + "/state");

  onValue(refState, snap => {
    const remoteRaw = snap.val();
    if (!remoteRaw) return;
    const remote = normalizeState(remoteRaw);
    const local = buildLocalState();

    const hasLocalData =
      (local.tx && local.tx.length) ||
      (local.bills && local.bills.length) ||
      (local.kasa && local.kasa.length);

    const hasRemoteData =
      (remote.tx && remote.tx.length) ||
      (remote.bills && remote.bills.length) ||
      (remote.kasa && remote.kasa.length);

    // если обе стороны с updatedAt=0 (старый формат),
    // то не даём пустому облаку затирать локальные данные
    if (!remote.updatedAt && !local.updatedAt) {
      if (hasRemoteData && !hasLocalData) {
        writeLocalState(remote);
      }
      // если локальные есть — оставляем локальные
      return;
    }

    // нормальный режим: берём только более свежее облако
    if (remote.updatedAt && remote.updatedAt > local.updatedAt) {
      writeLocalState(remote);
    }
  });
}

// первый запуск: один раз сверяем локальное и облако и решаем, что считается правдой
async function initialSync(email) {
  if (!email) return;
  const key = keyFromEmail(email);
  const refState = ref(db, "users/" + key + "/state");

  const remoteSnap = await get(refState).catch(() => null);

  const remote = remoteSnap && remoteSnap.exists() ? normalizeState(remoteSnap.val()) : null;
  const local = buildLocalState();

  const hasLocalData =
    (local.tx && local.tx.length) ||
    (local.bills && local.bills.length) ||
    (local.kasa && local.kasa.length);

  if (!remote) {
    if (hasLocalData) {
      await saveSnapshot(email);
    }
    return;
  }

  const hasRemoteData =
    (remote.tx && remote.tx.length) ||
    (remote.bills && remote.bills.length) ||
    (remote.kasa && remote.kasa.length);

  // оба updatedAt = 0 -> выбираем сторону, где есть данные
  if (!remote.updatedAt && !local.updatedAt) {
    if (hasRemoteData && !hasLocalData) {
      writeLocalState(remote);
    } else if (hasLocalData && !hasRemoteData) {
      await saveSnapshot(email);
    } else if (hasRemoteData && hasLocalData) {
      // обе стороны что-то имеют — считаем локальные эталоном
      await saveSnapshot(email);
    }
    return;
  }

  if (remote.updatedAt >= local.updatedAt) {
    writeLocalState(remote);
  } else {
    await saveSnapshot(email);
  }
}

// автозапуск
(function boot(){
  try {
    const EMAIL_KEY = window.USER_KEY || "otd_user";
    const email = localStorage.getItem(EMAIL_KEY);
    if (!email) {
      console.info("[sync-cloud] no user email -> cloud sync off");
      return;
    }

    // 1) один раз решаем: кто главный — локал или облако
    initialSync(email).then(() => {
      // 2) запускаем realtime
      startRealtime(email);
    }).catch(e => {
      console.warn("[sync-cloud] initialSync error", e);
      startRealtime(email);
    });

    // 3) хукаемся к saveLocal() из app.html,
    // чтобы каждый раз после сохранения отправлять снапшот в Firebase
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        saveSnapshot(email).catch(err => console.warn("[sync-cloud] saveSnapshot error", err));
      }, 500);
    };

    if (typeof window.saveLocal === "function") {
      const origSaveLocal = window.saveLocal;
      window.saveLocal = function patchedSaveLocal() {
        origSaveLocal.apply(this, arguments);
        schedule();
      };
    } else {
      // запасной вариант: раз в 30 секунд пушим состояние
      setInterval(() => {
        saveSnapshot(email).catch(() => {});
      }, 30000);
    }

    window.addEventListener("beforeunload", () => {
      saveSnapshot(email).catch(() => {});
    });
  } catch(e) {
    console.error("[sync-cloud] boot error", e);
  }
})();

