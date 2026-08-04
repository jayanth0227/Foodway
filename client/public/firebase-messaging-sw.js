// Firebase Messaging Service Worker for Foodway Web Push Notifications
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAdjXZtm3SIyhkFd5LCgJyuDrsarljfvzY",
  authDomain: "foodway-dfaf3.firebaseapp.com",
  projectId: "foodway-dfaf3",
  storageBucket: "foodway-dfaf3.firebasestorage.app",
  messagingSenderId: "159263902318",
  appId: "1:159263902318:web:53a2260c8d1a93caaaf47f",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle Background Push Notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push message:', payload);

  const title = payload.notification?.title || payload.data?.title || '🔔 Foodway Update';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'You have a new order update!',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: payload.notification?.badge || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: {
      url: payload.data?.click_action || payload.data?.url || '/restaurant/dashboard',
      orderId: payload.data?.orderId,
    },
  };

  self.registration.showNotification(title, options);
});

// Handle Notification Click (Deep Linking)
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/restaurant/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});