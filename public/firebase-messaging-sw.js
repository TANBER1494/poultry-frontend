/* eslint-disable no-undef */
importScripts(
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js'
);

//  التعديل: مفاتيح مشروع مزرعة الدواجن الجديد
firebase.initializeApp({
  apiKey: "AIzaSyBf8K0Zsvge_H87J3JVTdgmtMBR-5hfXLA",
  authDomain: "dokkany-47a0e.firebaseapp.com",
  projectId: "dokkany-47a0e",
  storageBucket: "dokkany-47a0e.firebasestorage.app",
  messagingSenderId: "94415362969",
  appId: "1:94415362969:web:44b627ee275f737f2b1108",
  measurementId: "G-T4QKG4BGX3"
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
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
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