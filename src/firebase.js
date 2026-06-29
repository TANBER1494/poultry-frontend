import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 🛡️ التعديل 1: استخدام مفاتيح مشروع مزرعة الدواجن
const firebaseConfig = {
  apiKey: "AIzaSyDMHNFPu7Npcdz7KS12nOWdXHFq4_IRjZo",
  authDomain: "poultry-farm-erp.firebaseapp.com",
  projectId: "poultry-farm-erp",
  // ⚠️ تنبيه: يجب إحضار هذه الثلاث قيم من إعدادات مشروع فايربيز الخاص بالمزرعة
  storageBucket: "poultry-farm-erp.firebasestorage.app", 
  messagingSenderId: "541973591769", 
  appId: "1:541973591769:web:e273d5a1fb717c5ac630c8" 
};

const app = initializeApp(firebaseConfig);

export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

export const requestForToken = async () => {
  if (!messaging) return null;
  
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    const currentToken = await getToken(messaging, { 
      vapidKey: 'BAEpQHo-ZlZlvtG8xYNJ3TdB5bKhtB9DW2iPs-dzG_0YNdKmCnXrD-15TlwfqFCETm5t1MobOqlDk-l0L_d8gSQ',
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

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });