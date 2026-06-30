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
// تفعيل الضغط على الإشعارات والتوجيه الذكي (بدون الرسالة المزعجة)
// ==============================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  let targetUrl = '/';
  
  // استخراج الرابط من الإشعار سواء كان مغلفاً بـ FCM_MSG أو مباشراً
  if (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.url) {
    targetUrl = event.notification.data.FCM_MSG.data.url;
  } else if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  // منطق دكاني المستقر لفتح أو تنشيط النافذة
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // إذا كان التطبيق مفتوحاً في الخلفية، اجلبه للمقدمة ووجهه للرابط
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // إذا كان التطبيق مغلقاً تماماً، افتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});