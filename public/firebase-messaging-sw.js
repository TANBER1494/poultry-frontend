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
//  1. استلام الإشعار في الخلفية ورسمه يدوياً (لمنع الرسالة الافتراضية)
// ==============================================================
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png', // تأكد أن اللوجو موجود بهذا الاسم
    badge: '/pwa-192x192.png',
    dir: 'rtl',
    data: {
      click_action: payload.data?.click_action || '/' // استلام الرابط من الباك إند
    }
  };

  // إجبار المتصفح على رسم إشعارنا نحن وليس الإشعار الافتراضي
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ==============================================================
//  2. تفعيل الضغط على الإشعارات والتوجيه للرابط الصحيح
// ==============================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  let targetUrl = '/';
  if (event.notification.data && event.notification.data.click_action) {
    targetUrl = event.notification.data.click_action;
  }

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