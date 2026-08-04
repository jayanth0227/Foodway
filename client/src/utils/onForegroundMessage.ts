import { onMessage } from "firebase/messaging";
import { messaging } from "../config/firebase";

/**
 * Foreground message listener for Firebase Cloud Messaging.
 * Triggers when the web application is active/open in the foreground tab.
 * Plays notification sound chime and displays native browser notification banner.
 */
export const setupForegroundMessageListener = (onMessageReceived?: (payload: any) => void) => {
  try {
    if (typeof window === "undefined" || !("Notification" in window) || !messaging) {
      return;
    }

    onMessage(messaging, (payload) => {
      console.log("🔔 [Foreground FCM Message Received]:", payload);

      const title = payload.notification?.title || payload.data?.title || " Foodway Alert";
      const body = payload.notification?.body || payload.data?.body || "You have a new update.";

      // 1. Play alert chime sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(() => { });
      } catch (e) { }

      // 2. Show native browser notification even when tab is focused
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, {
            body,
            icon: (payload.notification as any)?.icon || "/favicon.ico",
            badge: (payload.notification as any)?.badge || "/favicon.ico",
            data: payload.data,
          });
        } catch (err) {
          // Fallback via ServiceWorker registration if constructor fails
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(title, {
                body,
                icon: "/favicon.ico",
                data: payload.data,
              });
            }).catch(() => { });
          }
        }
      }

      // 3. Optional callback for in-app UI toasts
      if (onMessageReceived) {
        onMessageReceived(payload);
      }
    });
  } catch (error) {
    console.error("Error setting up foreground FCM listener:", error);
  }
};

export default setupForegroundMessageListener;
