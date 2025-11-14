// /sync-cloud.js
// Синхронизация всего стейта (kasa + wyciąg + faktury + accMeta + настройки) через Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// тот же формат ключа, который ты уже видишь в базе: 1tapday@gmail,com
function keyFromEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/[^a-z0-9,@_-]/g, "");
}

// какие ключи настроек таскаем как строки
const SETTINGS_KEYS = [
  "txUrl",
  "billUrl",
  "cashPLN",
  "penaltyPct",
  "intervalMin",
  "rateEUR",
  "rateUSD",
  "blacklist",
  "autoCash",
  "otd_sub_active",
  "otd_sub_from",
  "otd_sub_to",
  "otd_demo_started_at",
  "otd_lang",
  "speechLang"
];

// читаем локальный стейт из localStorage
function readLocalState() {
  const st = {
    kasa: [],
    tx: [],
    bills: [],
    accMeta: {},
    settings: {}
  };

  try {
    st.kasa = JSON.parse(localStorage.getItem("kasa") || "[]");
  } catch (e) {
    st.kasa = [];
  }

  try {
    st.tx = JSON.parse(localStorage.getItem("tx_manual_import") || "[]");
  } catch (e) {
    st.tx = [];
  }

  try {
    st.bills = JSON.parse(localStorage.getItem("bills_manual_import") || "[]");
  } catch (e) {
    st.bills = [];
  }

  try {
    st.accMeta = JSON.parse(localStorage.getItem("accMeta") || "{}");
  } catch (e) {
    st.accMeta = {};
  }

  SETTINGS_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null && v !== undefined) {
      st.settings[k] = v;
    }
  });

  return st;
}

// приводим удалённый стейт в нормальный вид + читаем старую структуру (где всё было в settings строками)
function normalizeRemote(remote) {
  const out = {
    kasa: [],
    tx: [],
    bills: [],
    accMeta: {},
    settings: {}
  };

  if (remote && Array.isArray(remote.kasa)) out.kasa = remote.kasa;
  if (remote && Array.isArray(remote.tx)) out.tx = remote.tx;
  if (remote && Array.isArray(remote.bills)) out.bills = remote.bills;
  if (remote && remote.accMeta && typeof remote.accMeta === "object") {
    out.accMeta = remote.accMeta;
  }

  // старая схема: всё лежит в state.settings.{kasa, tx_manual_import, bills_manual_import, accMeta} как строки
  if (remote && remote.settings && typeof remote.settings === "object") {
    const s = remote.settings;

    if (!out.kasa.length && typeof s.kasa === "string") {
      try {
        out.kasa = JSON.parse(s.kasa);
      } catch {}
    }
    if (!out.tx.length && typeof s.tx_manual_import === "string") {
      try {
        out.tx = JSON.parse(s.tx_manual_import);
      } catch {}
    }
    if (!out.bills.length && typeof s.bills_manual_import === "string") {
      try {
        out.bills = JSON.parse(s.bills_manual_import);
      } catch {}
    }
    if (!Object.keys(out.accMeta).length && typeof s.accMeta === "string") {
      try {
        out.accMeta = JSON.parse(s.accMeta);
      } catch {}
    }

    Object.entries(s).forEach(([k, v]) => {
      if (["kasa", "tx", "bills", "accMeta"].includes(k)) return;
      out.settings[k] = String(v);
    });
  }

  return out;
}

// пишем стейт в localStorage
function writeLocalState(st) {
  if (!st || typeof st !== "object") return;

  if (Array.isArray(st.kasa)) {
    localStorage.setItem("kasa", JSON.stringify(st.kasa));
  }
  if (Array.isArray(st.tx)) {
    localStorage.setItem("tx_manual_import", JSON.stringify(st.tx));
  }
  if (Array.isArray(st.bills)) {
    localStorage.setItem("bills_manual_import", JSON.stringify(st.bills));
  }
  if (st.accMeta && typeof st.accMeta === "object") {
    localStorage.setItem("accMeta", JSON.stringify(st.accMeta));
  }

  if (st.settings && typeof st.settings === "object") {
    Object.entries(st.settings).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      localStorage.setItem(k, String(v));
    });
  }
}

(function initCloudSync() {
  const email = localStorage.getItem("otd_user") || "";
  const key = keyFromEmail(email);

  if (!email || !key) {
    console.log("[cloud-sync] no user email, skip");
    return;
  }

  const userRef = ref(db, "users/" + key + "/state");

  let initializedRemote = false;
  let applyingRemote = false;

  // слушаем изменения из Firebase
  onValue(userRef, snap => {
    const val = snap.val();
    // первый запуск: если в облаке пусто, заливаем туда локальный стейт и живём дальше
    if (!val) {
      if (!initializedRemote) {
        initializedRemote = true;
        const local = readLocalState();
        const hasData =
          (local.kasa && local.kasa.length) ||
          (local.tx && local.tx.length) ||
          (local.bills && local.bills.length);

        if (hasData) {
          console.log("[cloud-sync] remote empty, push local snapshot");
          set(userRef, local).catch(err =>
            console.warn("[cloud-sync] set error (init)", err)
          );
        }
      }
      return;
    }

    initializedRemote = true;
    const remoteNorm = normalizeRemote(val);
    const local = readLocalState();

    // если одинаково — не дёргаем UI
    if (JSON.stringify(remoteNorm) === JSON.stringify(local)) {
      return;
    }

    console.log("[cloud-sync] applying remote → local");
    applyingRemote = true;
    writeLocalState(remoteNorm);

    // дергаем функции из app.html, если они есть
    try {
      if (typeof window.loadLocal === "function") window.loadLocal();
      if (typeof window.loadKasa === "function") window.loadKasa();
      if (typeof window.inferAccounts === "function") window.inferAccounts();
      if (typeof window.render === "function") window.render();
    } catch (e) {
      console.warn("[cloud-sync] render error", e);
    } finally {
      applyingRemote = false;
    }
  });

  // перехватываем saveLocal, чтобы КАЖДОЕ изменение kasa/wyciąg/faktury шло в Firebase
  const origSaveLocal = window.saveLocal;
  if (typeof origSaveLocal === "function") {
    window.saveLocal = function patchedSaveLocal() {
      origSaveLocal();
      if (!initializedRemote || applyingRemote) {
        return;
      }
      const state = readLocalState();
      console.log("[cloud-sync] push local → remote");
      set(userRef, state).catch(err =>
        console.warn("[cloud-sync] set error (saveLocal)", err)
      );
    };
  } else {
    console.warn("[cloud-sync] saveLocal not found, nothing to patch");
  }

  console.log("[cloud-sync] initialized for", email, "->", key);
})();
