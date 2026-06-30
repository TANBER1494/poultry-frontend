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
//  1. استلام البيانات في الخلفية ورسم الإشعار يدوياً وبقوة
// ==============================================================
messaging.onBackgroundMessage(function(payload) {
  const data = payload.data || {};
  
  const notificationTitle = data.title || 'مزرعتي';
  const notificationOptions = {
    body: data.body || 'يوجد تحديث جديد',
    icon: data.icon || '/logo.png', // صورة البيض أو التحذير التي حددناها
    badge: '/badge.png', // يجب أن تكون أيقونة شفافة بيضاء لكي يقبلها الأندرويد في الشريط العلوي
    dir: 'rtl',
    data: {
      url: data.click_action || '/'
    }
  };

  //  سطر الـ return هذا هو ما يمنع رسالة Chrome المزعجة من الظهور!
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ==============================================================
//  2. تفعيل التوجيه عند الضغط على الإشعار
// ==============================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

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