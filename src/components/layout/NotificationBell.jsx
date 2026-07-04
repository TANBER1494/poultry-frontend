import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  FileText,
  Clock,
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
import toast from 'react-hot-toast';
import { requestForToken, onMessageListener } from '../../firebase';

const NotificationBell = () => {
  const { socket, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);

  //  رابط النسخة المرفوعة لضمان عمل الصور في موبايل الأندرويد (Absolute URL)
  const BASE_URL = 'https://poultry-frontend-eta.vercel.app';

  // 1. جلب الإشعارات القديمة وتسجيل توكن الفايربيز
  useEffect(() => {
    const fetchHistoryAndRegisterToken = async () => {
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);

        const token = await requestForToken();
        if (token) {
          // 🚀 تم تعديل الاسم ليتطابق مع الـ service الخاص بنا
          await notificationService.registerToken(token);
        }
      } catch (error) {
        console.error('فشل التهيئة:', error);
      }
    };
    fetchHistoryAndRegisterToken();

    // الاستماع المستمر لإشعارات Firebase والتطبيق مفتوح (Foreground)
    const listenForMessages = async () => {
      try {
        const payload = await onMessageListener();
        console.log('FCM Foreground Payload:', payload);

        // تحويل إشعار فايربيز لهيكل يتناسب مع القائمة المنسدلة
        const newFCMNotif = {
          _id: Date.now().toString(),
          title: payload.notification?.title || 'إشعار جديد',
          message: payload.notification?.body || '',
          type: 'SYSTEM',
          createdAt: new Date().toISOString(),
          is_read: false,
          link:
            payload.data?.url ||
            payload.data?.link ||
            payload.data?.click_action ||
            '/',
        };

        setNotifications((prev) => [newFCMNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast.success(
          <div className="flex flex-col gap-1 text-right w-full">
            <strong className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {newFCMNotif.title}
            </strong>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {newFCMNotif.message}
            </span>
          </div>,
          { duration: 4000 }
        );
        // إعادة الاستدعاء لالتقاط الإشعار التالي
        listenForMessages();
      } catch (err) {
        console.error('FCM Listen Error:', err);
      }
    };

    listenForMessages();
  }, []);

  // 2. الاستماع اللحظي للـ Socket
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (newNotif) => {
      if (newNotif.target_role && newNotif.target_role !== user.role) {
        return;
      }

      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      try {
        const audio = new Audio(
          'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
        );
        audio.play().catch(() => console.log('المتصفح منع الصوت'));
      } catch (err) {}

      toast.success(
        <div className="flex flex-col gap-1 text-right w-full">
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {newNotif.title}
          </strong>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {newNotif.message}
          </span>
        </div>,
        { duration: 4000 }
      );
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: `${BASE_URL}/pwa-192x192.png`,
          dir: 'rtl',
        });
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => socket.off('new_notification', handleNewNotification);
  }, [socket, user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between shrink-0 transition-colors">
              <h3 className="font-black text-slate-800 dark:text-white text-base sm:text-lg flex items-center gap-2">
                التنبيهات
                <span className="text-[11px] sm:text-xs bg-indigo-600 dark:bg-indigo-500 text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                  {notifications.length}
                </span>
              </h3>

              <div className="flex items-center gap-2">
                {notifications.some((n) => n.is_read) && (
                  <button
                    onClick={handleClearRead}
                    title="مسح الإشعارات المقروءة"
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" /> مقروء
                  </button>
                )}
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800 transition-colors"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {notifications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-4 transition-colors">
                    <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="font-black text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                    صندوق الإشعارات فارغ
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => {
                    const ui = getNotificationUI(notif.type);
                    return (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 sm:p-5 border-b border-slate-50 dark:border-slate-700/50 flex gap-4 cursor-pointer transition-all relative group ${!notif.is_read ? 'bg-indigo-50/40 dark:bg-indigo-500/10 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                      >
                        {!notif.is_read && (
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)] dark:shadow-[0_0_8px_rgba(129,140,248,0.4)]"></div>
                        )}

                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${ui.bg} group-hover:scale-105 transition-transform`}
                        >
                          {ui.icon}
                        </div>

                        <div className="flex-1 pr-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4
                              className={`text-sm sm:text-base tracking-tight ${!notif.is_read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}
                            >
                              {notif.title}
                            </h4>
                            <button
                              onClick={(e) => handleDelete(e, notif._id)}
                              className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p
                            className={`text-[11px] sm:text-[13px] leading-relaxed mb-2 sm:mb-3 pr-2 sm:pr-0 ${!notif.is_read ? 'text-slate-600 dark:text-slate-300 font-bold' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}
                          >
                            {notif.message}
                          </p>
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(notif.createdAt).toLocaleTimeString(
                              'ar-EG',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                            <span className="mx-1">•</span>
                            {new Date(notif.createdAt).toLocaleDateString(
                              'ar-EG',
                              { month: 'short', day: 'numeric' }
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
