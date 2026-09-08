// import { onMessage } from "firebase/messaging";
// import { messaging } from "../config/firebase";

// /**
//  * Foreground message listener for Firebase Cloud Messaging.
//  * Triggers when the web application is active/open in the foreground tab.
//  * Plays notification sound chime and displays native browser notification banner.
//  */
// export const setupForegroundMessageListener = (onMessageReceived?: (payload: any) => void) => {
//   try {
//     if (typeof window === "undefined" || !("Notification" in window) || !messaging) {
//       return;
//     }

//     onMessage(messaging, (payload) => {
//       const title = payload.notification?.title || payload.data?.title || " Foodway Alert";
//       const body = payload.notification?.body || payload.data?.body || "You have a new update.";

//       // Show native browser notification even when tab is focused
//       if ("Notification" in window && Notification.permission === "granted") {
//         try {
//           new Notification(title, {
//             body,
//             icon: (payload.notification as any)?.icon || "/favicon.ico",
//             badge: (payload.notification as any)?.badge || "/favicon.ico",
//             data: payload.data,
//           });
//         } catch (err) {
//           // Fallback via ServiceWorker registration if constructor fails
//           if ("serviceWorker" in navigator) {
//             navigator.serviceWorker.ready.then((registration) => {
//               registration.showNotification(title, {
//                 body,
//                 icon: "/favicon.ico",
//                 data: payload.data,
//               });
//             }).catch(() => { });
//           }
//         }
//       }

//       // 3. Optional callback for in-app UI toasts
//       if (onMessageReceived) {
//         onMessageReceived(payload);
//       }
//     });
//   } catch (error) {
//     console.error("Error setting up foreground FCM listener:", error);
//   }
// };

// export default setupForegroundMessageListener;


import { onMessage } from "firebase/messaging";
import { messaging } from "../config/firebase";
import { buzzerService } from "../services/buzzer.service";
 
export const setupForegroundMessageListener = (
  onMessageReceived?: (payload: any) => void
) => {
  try {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !messaging
    ) {
      return;
    }
 
    console.log(
      "🔔 Setting up Firebase foreground message listener..."
    );
 
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log(
        "🔥 FOREGROUND FCM MESSAGE RECEIVED:",
        payload
      );
 
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        "🔔 Foodway Alert";
 
      const body =
        payload.notification?.body ||
        payload.data?.body ||
        "You have a new update.";
 
      const type = payload.data?.type;
      const role = payload.data?.role;
      const orderId = payload.data?.orderId;
 
      console.log("📦 FCM ORDER DATA:", {
        type,
        role,
        orderId,
      });
 
      /**
       * =========================================================
       * 🚨 NEW ORDER ALERT
       * Vendor + Delivery Boy
       * =========================================================
       */
      const isNewOrder =
        type === "NEW_ORDER" &&
        (
          role === "RESTAURANT" ||
          role === "DELIVERY_PARTNER" ||
          role === "DELIVERY"
        );
 
      if (isNewOrder) {
        console.log(
          "🚨 NEW ORDER ALERT - STARTING BUZZER"
        );
 
        buzzerService.triggerBuzzer({
          title,
          message: body,
          orderId,
          durationMs: 30000,
        });
 
        /**
         * IMPORTANT:
         * Do NOT create another new Notification here.
         *
         * buzzerService.triggerBuzzer()
         * already calls triggerNativePushNotification().
         */
 
      } else {
        /**
         * =====================================================
         * 🔔 NORMAL FCM NOTIFICATIONS
         * Rider Assigned / Ready / Out for Delivery / Delivered
         * =====================================================
         */
        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            const notification = new Notification(title, {
              body,
              icon:
                payload.notification?.icon ||
                "/favicon.ico",
              badge:
                payload.notification?.badge ||
                "/favicon.ico",
              data: payload.data,
            });
 
            console.log(
              "✅ BROWSER NOTIFICATION CREATED"
            );
 
            notification.onclick = () => {
              console.log(
                "🖱️ Notification clicked"
              );
 
              window.focus();
 
              if (orderId) {
                window.location.href =
                  `/orders?orderId=${orderId}`;
              } else {
                window.location.href =
                  "/orders";
              }
            };
          } catch (err) {
            console.error(
              "❌ Native notification failed:",
              err
            );
 
            /**
             * Service Worker fallback
             */
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.ready
                .then((registration) => {
                  console.log(
                    "🔄 Trying Service Worker notification fallback"
                  );
 
                  return registration.showNotification(
                    title,
                    {
                      body,
                      icon: "/favicon.ico",
                      badge: "/favicon.ico",
                      data: payload.data,
                    }
                  );
                })
                .then(() => {
                  console.log(
                    "✅ Service Worker notification created"
                  );
                })
                .catch((swError) => {
                  console.error(
                    "❌ Service Worker notification failed:",
                    swError
                  );
                });
            }
          }
        } else {
          console.warn(
            "⚠️ Notification permission is not granted:",
            Notification.permission
          );
        }
      }
 
      /**
       * Optional callback
       */
      if (onMessageReceived) {
        onMessageReceived(payload);
      }
    });
 
    return unsubscribe;
  } catch (error) {
    console.error(
      "❌ Error setting up foreground FCM listener:",
      error
    );
  }
};
 
export default setupForegroundMessageListener;