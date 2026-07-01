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
//  تفعيل الضغط على الإشعارات بشكل دقيق للأندرويد
// ==============================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  let targetUrl = '/';
  
  // 1. استخراج الرابط بأمان من الـ Payload الخاص بـ Firebase
  const data = event.notification.data;
  if (data) {
    if (data.click_action) {
      targetUrl = data.click_action;
    } else if (data.url) {
      targetUrl = data.url;
    } else if (data.FCM_MSG && data.FCM_MSG.data) {
      targetUrl = data.FCM_MSG.data.click_action || data.FCM_MSG.data.url || '/';
    }
  }

  // 2. دمج المسار (مثال: /owner/sales) مع النطاق الأساسي لإنشاء مسار كامل (Absolute URL)
  // هذا هو الحل الذي سيجبر نظام الأندرويد على فتح التطبيق!
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // إذا كان التطبيق مفتوحاً في الخلفية، اجعله في الواجهة وانتقل للرابط
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        // إذا كان التطبيق مغلقاً تماماً، افتح نافذة جديدة بالرابط الكامل
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});