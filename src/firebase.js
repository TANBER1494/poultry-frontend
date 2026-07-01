import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// المفاتيح الجديدة النظيفة لمشروع مزرعتي
const firebaseConfig = {
  apiKey: "AIzaSyC3vT0eIzIPQjUyORDcexBCKBsHF3PUsN0",
  authDomain: "poultry-1f143.firebaseapp.com",
  projectId: "poultry-1f143",
  storageBucket: "poultry-1f143.firebasestorage.app",
  messagingSenderId: "16519813025",
  appId: "1:16519813025:web:1886f431e4f8455aea9de0",
  measurementId: "G-1BJ7PTJD0X"
};

const app = initializeApp(firebaseConfig);

// تهيئة الإشعارات (متوافقة مع المتصفحات المدعومة فقط)
export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

// دالة استخراج إحداثيات الموبايل (FCM Token)
export const requestForToken = async () => {
  if (!messaging) return null;
  
  try {
    //  إجبار المتصفح على تسجيل الجندي الخفي (Service Worker) بوضوح
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    const currentToken = await getToken(messaging, { 
      //  انسخ مفتاح الـ VAPID من فايربيز وضعه هنا بدلاً من هذه الكلمة
      vapidKey: 'BM5XaJLW77_QEV0oalJtO7xE44Y22LVj0QGnraW3CZ1htv23CQJY7qYj4yMgrO46fHpYngRyQhIN6sBi5d3NN3Y', 
      serviceWorkerRegistration: registration 
    });
    
    if (currentToken) {
      return currentToken;
    } else {
      return null;
    }
  } catch (err) {
    console.error('❌ خطأ في استخراج التوكن:', err);
    return null;
  }
};

// دالة استلام الإشعارات والتطبيق مفتوح أمام المستخدم
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });