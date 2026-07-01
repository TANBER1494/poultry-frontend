/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC3vT0eIzIPQjUyORDcexBCKBsHF3PUsN0",
  authDomain: "poultry-1f143.firebaseapp.com",
  projectId: "poultry-1f143",
  storageBucket: "poultry-1f143.firebasestorage.app",
  messagingSenderId: "16519813025",
  appId: "1:16519813025:web:1886f431e4f8455aea9de0"
});

const messaging = firebase.messaging();

// ==============================================================
// تفعيل الضغط على الإشعارات
// ==============================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // جلب الرابط من البيانات (أو توجيهه للرئيسية كاحتياطي)
  let targetUrl = '/';
  if (event.notification.data && event.notification.data.click_action) {
    targetUrl = event.notification.data.click_action;
  }

  // فتح التطبيق أو إيقاظه إذا كان في الخلفية
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});