import { getToken } from "firebase/messaging";
import { messaging } from "../config/firebase";

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (typeof window === "undefined") return null;

    if (!("Notification" in window)) {
      return null;
    }

    if (!messaging) {
      return null;
    }

    let permission = Notification.permission;

    // Request native browser permission
    if (permission === "default") {
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        permission = await new Promise((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }
    }

    if (permission === "granted") {
      let swRegistration: ServiceWorkerRegistration | undefined = undefined;

      if ("serviceWorker" in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
          await navigator.serviceWorker.ready;
        } catch (swErr) {
          // Ignore service worker registration warnings
        }
      }

      const token = await getToken(messaging, {
        vapidKey: "BP_SXgF__CHpdxX-Id0kNtn3rZZv2PuVt3FVDWeU4EWpIrv_wnXf9QDUfnj5ZLXDOxgE-tPBCB6agjdLf633iNE",
        serviceWorkerRegistration: swRegistration,
      });

      return token || null;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};