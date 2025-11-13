// firebase-init.js
// Подключаем Firebase SDK через CDN-модули

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

// 🔑 ТВОЙ КОНФИГ
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

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Нормализуем email, чтобы он был валидным ключом
function userKeyFromEmail(email) {
  if (!email) return null;
  return btoa(email.toLowerCase()); // base64
}

// Получаем ссылку на ветку userState в Realtime DB
function getUserStateRef(email) {
  const key = userKeyFromEmail(email);
  if (!key) return null;
  return ref(db, `users/${key}/state`);
}

// Подписка на данные пользователя
function subscribeUserState(email, onChange) {
  const r = getUserStateRef(email);
  if (!r) return;
  onValue(r, (snapshot) => {
    const val = snapshot.val();
    if (val && typeof onChange === "function") {
      onChange(val);
    }
  });
}

// Сохранение полного стейта
async function saveUserState(email, stateObj) {
  const r = getUserStateRef(email);
  if (!r) return;
  await set(r, stateObj || {});
}

// Частичное обновление
async function patchUserState(email, patchObj) {
  const r = getUserStateRef(email);
  if (!r) return;
  await update(r, patchObj || {});
}

// Делаем функции доступными глобально (чтобы main.js мог взять из window)
window.FirebaseSync = {
  subscribeUserState,
  saveUserState,
  patchUserState
};
