import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

//  التعديل 1: استخدام مفاتيح مشروع مزرعة الدواجن
const firebaseConfig = {
  apiKey: "AIzaSyDMHNFPu7Npcdz7KS12nOWdXHFq4_IRjZo",
  authDomain: "poultry-farm-erp.firebaseapp.com",
  projectId: "poultry-farm-erp",
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
      vapidKey: 'BIXHbmvurh4OEtT58RB1eLlv7pk-nbnu56JRVMEy8fBs3Ct9dC0GASSAgzy0CSMsSzcez-r9b8ppxNa9HeyT8CY',
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