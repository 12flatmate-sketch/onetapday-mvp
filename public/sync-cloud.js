// sync-cloud.js — простой и прямой вариант без лишней магии

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

// не создаём второй инстанс, если уже есть
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getDatabase(app);

// такой же ключ, как в Firebase: 1tapday@gmail.com → 1tapday@gmail,com
function keyFromEmail(email) {
  if (!email) return "anon";
  return String(email)
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/[^a-z0-9,@_-]/g, "_");
}

// какие настройки тянем в облако
const SETTINGS_KEYS = [
  "cashPLN","penaltyPct","intervalMin",
  "rateEUR","rateUSD","blacklist","autoCash",
  "otd_lang","speechLang",
  "txUrl","billUrl",
  "otd_demo_started_at",
  "otd_sub_active","otd_sub_from","otd_sub_to"
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[sync-cloud] parse error", key, e);
    return fallback;
  }
}

function buildLocalState() {
  const settings = {};
  SETTINGS_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v != null) settings[k] = v;
  });

  return {
    tx:    readJSON("tx_manual_import", []),
    bills: readJSON("bills_manual_import", []),
    kasa:  readJSON("kasa", []),
    accMeta: readJSON("accMeta", {}),
    settings
  };
}

function applyStateToLocal(state) {
  if (!state || typeof state !== "object") return;

  const tx    = Array.isArray(state.tx)    ? state.tx    : [];
  const bills = Array.isArray(state.bills) ? state.bills : [];
  const kasa  = Array.isArray(state.kasa)  ? state.kasa  : [];
  const accMeta = (state.accMeta && typeof state.accMeta === "object") ? state.accMeta : {};
  const settings = (state.settings && typeof state.settings === "object") ? state.settings : {};

  localStorage.setItem("tx_manual_import", JSON.stringify(tx));
  localStorage.setItem("bills_manual_import", JSON.stringify(bills));
  localStorage.setItem("kasa", JSON.stringify(kasa));
  localStorage.setItem("accMeta", JSON.stringify(accMeta));

  Object.entries(settings).forEach(([k, v]) => {
    if (v != null) localStorage.setItem(k, v);
  });

  // перерисовываем приложение
  if (typeof window.loadLocal === "function") window.loadLocal();
  if (typeof window.inferAccounts === "function") window.inferAccounts();
  if (typeof window.render === "function") window.render();
}

// пушим локальное состояние в Firebase
function createPusher(stateRef) {
  let timer = null;

  async function pushNow() {
    try {
      const snapshot = buildLocalState();
      await set(stateRef, snapshot);
      console.info("[sync-cloud] pushed to", stateRef.toString());
    } catch (e) {
      console.warn("[sync-cloud] push error", e);
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(pushNow, 500);
  }

  return { pushNow, schedule };
}

(function boot() {
  try {
    const EMAIL_KEY = "otd_user"; // из app.html
    const email = localStorage.getItem(EMAIL_KEY);

    if (!email) {
      console.info("[sync-cloud] no otd_user in localStorage → cloud sync off");
      return;
    }

    const key = keyFromEmail(email);
    const stateRef = ref(db, "users/" + key + "/state");

    const { pushNow, schedule } = createPusher(stateRef);

    // realtime-подписка: любое изменение в Firebase → применяем в локальное состояние
    onValue(stateRef, snap => {
      const val = snap.val();
      if (!val) return;
      console.info("[sync-cloud] remote update received");
      applyStateToLocal(val);
    });

    // перехватываем saveLocal(), чтобы каждый раз пушить снапшот
    if (typeof window.saveLocal === "function") {
      const orig = window.saveLocal;
      window.saveLocal = function patchedSaveLocal() {
        orig.apply(this, arguments);
        schedule();
      };
      console.info("[sync-cloud] saveLocal patched");
    } else {
      console.warn("[sync-cloud] saveLocal not found, using interval backup");
      setInterval(schedule, 30000);
    }

    // один стартовый пуш (чтобы не было пустого состояния в облаке)
    pushNow();

    // экспортируем дебаг-хук
    window._otdCloudDebug = {
      path: "users/" + key + "/state",
      pushNow
    };

  } catch (e) {
    console.error("[sync-cloud] boot error", e);
  }
})();
