import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

//  التعديل 1: استخدام مفاتيح مشروع مزرعة الدواجن
const firebaseConfig = {
  apiKey: "AIzaSyBf8K0Zsvge_H87J3JVTdgmtMBR-5hfXLA",
  authDomain: "dokkany-47a0e.firebaseapp.com",
  projectId: "dokkany-47a0e",
  storageBucket: "dokkany-47a0e.firebasestorage.app",
  messagingSenderId: "94415362969",
  appId: "1:94415362969:web:44b627ee275f737f2b1108",
  measurementId: "G-T4QKG4BGX3"
};

const app = initializeApp(firebaseConfig);

export const messaging = typeof window !== 'undefined' && 'Notification' in window ? getMessaging(app) : null;

export const requestForToken = async () => {
  if (!messaging) return null;
  
  try {
    //  طلب الإذن أولاً من المستخدم
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('تم رفض صلاحية الإشعارات من المستخدم');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const currentToken = await getToken(messaging, { 
      vapidKey: 'BO14ZnAZpnm5lQ4hMW7n4BMCT0_-MNFsghWcT1vNICwp2Nw5gjB-fg7Tqxu9j15brsgu3MLms14Gs3RUG79WUEM',
      serviceWorkerRegistration: registration 
    });
    
    return currentToken || null;
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