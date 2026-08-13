import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAdjXZtm3SIyhkFd5LCgJyuDrsarljfvzY",
  authDomain: "foodway-dfaf3.firebaseapp.com",
  projectId: "foodway-dfaf3",
  storageBucket: "foodway-dfaf3.firebasestorage.app",
  messagingSenderId: "159263902318",
  appId: "1:159263902318:web:53a2260c8d1a93caaaf47f",
  measurementId: "G-MJM4QQG5ZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Safely initialize Firebase Messaging without crashing on unsupported browsers/HTTP IP addresses
export const messaging = (() => {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  try {
    return getMessaging(app);
  } catch (error) {
    console.warn("⚠️ Firebase Messaging skipped (unsupported browser context or non-HTTPS IP):", error);
    return null;
  }
})();

export default app;