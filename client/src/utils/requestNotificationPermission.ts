import { getToken } from "firebase/messaging";
import { messaging } from "../config/firebase";

export const requestNotificationPermission = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window) || !messaging) {
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      let swRegistration: ServiceWorkerRegistration | undefined = undefined;
      if ("serviceWorker" in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        } catch (swErr) {
          console.warn("Service worker registration warning:", swErr);
        }
      }

      const token = await getToken(messaging, {
        vapidKey: "BP_SXgF__CHpdxX-Id0kNtn3rZZv2PuVt3FVDWeU4EWpIrv_wnXf9QDUfnj5ZLXDOxgE-tPBCB6agjdLf633iNE",
        serviceWorkerRegistration: swRegistration,
      });

      console.log("✅ FCM Push Notifications Enabled");
      return token;
    } else {
      console.warn("⚠️ Notification permission was not granted:", permission);
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};