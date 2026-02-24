// Firebase конфигурация — Курилиш склад
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyB0mrdXbGzinTcRK_uU7JIDjeaRm6grXX8",
  authDomain: "sklad-25dbd.firebaseapp.com",
  projectId: "sklad-25dbd",
  storageBucket: "sklad-25dbd.firebasestorage.app",
  messagingSenderId: "392922687327",
  appId: "1:392922687327:web:118de4caf476a939ad38ea",
  measurementId: "G-XTMW12VM9Q"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Вторичный app — для создания пользователей без смены текущей сессии
const secondaryAppName = 'kurilish-secondary';
const secondaryApp = getApps().find(a => a.name === secondaryAppName)
  ?? initializeApp(firebaseConfig, secondaryAppName);
export const secondaryAuth = getAuth(secondaryApp);

export default app;
