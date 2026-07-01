/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDMHNFPu7Npcdz7KS12nOWdXHFq4_IRjZo",
  authDomain: "poultry-farm-erp.firebaseapp.com",
  projectId: "poultry-farm-erp",
  storageBucket: "poultry-farm-erp.firebasestorage.app",
  messagingSenderId: "541973591769",
  appId: "1:541973591769:web:e273d5a1fb717c5ac630c8"
});

const messaging = firebase.messaging();

// ==============================================================
// تفعيل الضغط على الإشعارات (نسخة دكاني المستقرة)
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