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
//  استلام ضغطة المستخدم على الإشعار وفتح الرابط بدقة
// ==============================================================
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  let targetUrl = '/';
  
  // استخراج الرابط من كائن البيانات المُرسل من الباك إند بطريقة آمنة
  const fcmData = event.notification.data?.FCM_MSG?.data;
  if (fcmData && fcmData.click_action) {
    targetUrl = fcmData.click_action;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // إذا كان التطبيق مفتوحاً بالفعل في الخلفية، قم بإيقاظه وتغيير مساره
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // إذا كان التطبيق مغلقاً تماماً، افتح نافذة جديدة على الرابط
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});