import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCheck,
  Trash2,
  Eraser,
  Truck,
  ShoppingCart,
  Activity,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import { showAlert } from '../../utils/alert';
//  استدعاء دوال الفايربيز
import { requestForToken, onMessageListener } from '../../firebase';

const NotificationBell = () => {
  const { socket } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);

  // 1. جلب الإشعارات القديمة وتسجيل توكن الفايربيز
  useEffect(() => {
    const fetchHistoryAndRegisterToken = async () => {
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);

        // طلب صلاحية الإشعارات من المتصفح واستخراج التوكن
        const token = await requestForToken();
        if (token) {
          await notificationService.saveFcmToken(token);
        }
      } catch (error) {
        console.error('فشل التهيئة:', error);
      }
    };
    fetchHistoryAndRegisterToken();

    // الاستماع لإشعارات الـ Push في الخلفية (FCM)
    onMessageListener()
      .then((payload) => {
        console.log('FCM Payload Received:', payload);
        // يمكنك عرض Alert هنا إذا أردت
      })
      .catch((err) => console.log('FCM Error: ', err));
  }, []);

  // 2. الاستماع اللحظي للـ Socket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      try {
        const audio = new Audio(
          'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
        );
        audio.play().catch(() => console.log('المتصفح منع الصوت'));
      } catch (err) {}

      showAlert.success(newNotif.title, newNotif.message);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/pwa-192x192.png',
          dir: 'rtl',
        });
      }
    };

    //  التعديل 3: إصلاح اسم الحدث ليتطابق مع الباك إند
    socket.on('new_notification', handleNewNotification);

    return () => socket.off('new_notification', handleNewNotification);
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ... (باقي دوال الحذف والتحديد كمقروء كما هي في الكود الخاص بك دون تغيير)
  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) =>
        Math.max(
          0,
          notifications.find((n) => n._id === id && !n.is_read)
            ? prev - 1
            : prev
        )
      );
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationService.deleteAllRead();
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (error) {
      console.error('Error clearing read notifications:', error);
    }
  };

  const getNotificationUI = (type) => {
    switch (type) {
      case 'CYCLE_STARTED':
        return {
          icon: (
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 dark:text-emerald-400" />
          ),
          bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
        };
      case 'DAILY_LOG':
        return {
          icon: (
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 dark:text-indigo-400" />
          ),
          bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20',
        };
      case 'EGG_SALE':
        return {
          icon: (
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />
          ),
          bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
        };
      case 'FEED_DELIVERY':
        return {
          icon: (
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
          ),
          bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
        };
      case 'FEED_CONFIRMED':
        return {
          icon: (
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 dark:text-emerald-400" />
          ),
          bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
        };
      case 'HIGH_MORTALITY':
        return {
          icon: (
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 dark:text-rose-400" />
          ),
          bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20',
        };
      case 'LARGE_EXPENSE':
        return {
          icon: (
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 dark:text-rose-400" />
          ),
          bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20',
        };
      default:
        return {
          icon: (
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          ),
          bg: 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700',
        };
    }
  };

  return (
    // ... (باقي كود الـ UI الخاص بك كما هو بالظبط بدون أي تعديل لأنه ممتاز)
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all active:scale-95 group ${isOpen ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
      >
        <Bell
          className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'group-hover:animate-wiggle text-slate-700 dark:text-slate-300' : ''}`}
        />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-rose-500 border-2 border-white dark:border-slate-800 text-[8px] sm:text-[9px] font-black text-white items-center justify-center">
                {unreadCount > 99 ? '+99' : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-[80px] left-4 right-4 sm:absolute sm:top-full sm:mt-4 sm:left-0 sm:right-auto sm:w-[420px] bg-white dark:bg-slate-800 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-700 overflow-hidden z-[100] flex flex-col max-h-[80vh] sm:max-h-none"
          >
            {/* ... محتوى الـ UI ... */}
            <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center shrink-0 transition-colors">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span
                    className={
                      socket
                        ? 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'
                        : 'hidden'
                    }
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${socket ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  ></span>
                </span>
                {socket ? 'متصل بالسيرفر لحظياً' : 'جاري الاتصال...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
