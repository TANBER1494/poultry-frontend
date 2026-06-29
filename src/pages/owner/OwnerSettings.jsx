import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Phone, Lock, ShieldCheck, Loader2, Save, LogOut, Bell, Moon, Sun, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';
import { showAlert } from '../../utils/alert';

const OwnerSettings = () => {
  const { logout } = useAuth();
  
  // حالة التحكم في فتح وإغلاق القوائم
  const [openSection, setOpenSection] = useState('profile'); // يفتح قسم الملف الشخصي افتراضياً
  
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [preferences, setPreferences] = useState({
    is_dark_mode: false,
    notifications: {
      cycle_started: true,
      cycle_ended: true,
      high_mortality: true,
      large_expense: true,
      feed_delivery: true
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isPrefSubmitting, setIsPrefSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await settingsService.getSettings();
        if (isMounted) {
          setProfileData({ name: res.name || '', phone: res.phone || '' });
          setPreferences({
            is_dark_mode: res.is_dark_mode || false,
            notifications: res.notifications || {
              cycle_started: true, cycle_ended: true, high_mortality: true, large_expense: true, feed_delivery: true
            }
          });
        }
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب بيانات الحساب');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!/^01[0125][0-9]{8}$/.test(profileData.phone)) return showAlert.error('خطأ', 'رقم هاتف غير صالح');

    try {
      setIsProfileSubmitting(true);
      const res = await settingsService.updatePhone(profileData.phone, profileData.name);
      showAlert.success('تم التحديث', res.message);
    } catch (error) {
      showAlert.error('فشل التحديث', error.response?.data?.message || 'تعذر تحديث البيانات');
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password.length < 6) return showAlert.error('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    if (passwordData.new_password !== passwordData.confirm_password) return showAlert.error('خطأ', 'كلمات المرور غير متطابقة');

    try {
      setIsPasswordSubmitting(true);
      const res = await settingsService.updatePassword(passwordData);
      showAlert.success('تم التحديث', res.message);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => logout(), 3000);
    } catch (error) {
      showAlert.error('فشل التحديث', error.response?.data?.message || 'تعذر تغيير كلمة المرور');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleTogglePref = async (type, key) => {
    const updatedPrefs = { ...preferences };
    if (type === 'theme') {
      updatedPrefs.is_dark_mode = !updatedPrefs.is_dark_mode;
    } else {
      updatedPrefs.notifications[key] = !updatedPrefs.notifications[key];
    }
    
    setPreferences(updatedPrefs);
    
    try {
      setIsPrefSubmitting(true);
      await settingsService.updatePreferences({
        is_dark_mode: updatedPrefs.is_dark_mode,
        notifications: updatedPrefs.notifications
      });
    } catch (error) {
      showAlert.error('خطأ', 'تعذر حفظ التفضيلات');
    } finally {
      setIsPrefSubmitting(false);
    }
  };

  const toggleSection = (sectionName) => {
    setOpenSection(prev => prev === sectionName ? null : sectionName);
  };

  // إعدادات الأنيميشن للقوائم المنسدلة
  const accordionVariants = {
    hidden: { height: 0, opacity: 0, overflow: 'hidden' },
    visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-500" /> إعدادات الإدارة
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">تحديث البيانات، حماية الحساب، وإدارة الإشعارات</p>
        </div>
        <button onClick={logout} className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors font-bold text-sm dark:bg-rose-900/20 dark:text-rose-400">
          <LogOut className="w-4 h-4" /> تسجيل الخروج
        </button>
      </div>

      <div className="space-y-4">
        
        {/* القسم الأول: البيانات الشخصية */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={() => toggleSection('profile')} 
            className="w-full flex items-center justify-between p-5 sm:p-6 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl"><User className="w-5 h-5" /></div>
              <div className="text-right">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">البيانات الشخصية</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">تحديث الاسم ورقم الهاتف الأساسي</p>
              </div>
            </div>
            <motion.div animate={{ rotate: openSection === 'profile' ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openSection === 'profile' && (
              <motion.div variants={accordionVariants} initial="hidden" animate="visible" exit="hidden">
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                  <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">الاسم كاملاً *</label>
                      <input type="text" required value={profileData.name} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 transition-colors" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">رقم الهاتف *</label>
                      <input type="tel" dir="ltr" required value={profileData.phone} onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 transition-colors" />
                    </div>
                    <button type="submit" disabled={isProfileSubmitting} className="w-full sm:w-auto flex justify-center items-center gap-2 rounded-xl bg-slate-800 px-8 py-3 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-70 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors mt-2">
                      {isProfileSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ التعديلات</>}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* القسم الثاني: حماية الحساب */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={() => toggleSection('security')} 
            className="w-full flex items-center justify-between p-5 sm:p-6 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl"><ShieldCheck className="w-5 h-5" /></div>
              <div className="text-right">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">حماية الحساب</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">تغيير كلمة المرور وتأمين حسابك</p>
              </div>
            </div>
            <motion.div animate={{ rotate: openSection === 'security' ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openSection === 'security' && (
              <motion.div variants={accordionVariants} initial="hidden" animate="visible" exit="hidden">
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                  <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">كلمة المرور الحالية *</label>
                      <input type="password" required value={passwordData.current_password} onChange={e => setPasswordData(p => ({ ...p, current_password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 transition-colors" />
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">كلمة المرور الجديدة *</label>
                      <input type="password" required minLength="6" value={passwordData.new_password} onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 transition-colors" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">تأكيد كلمة المرور الجديدة *</label>
                      <input type="password" required minLength="6" value={passwordData.confirm_password} onChange={e => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 transition-colors" />
                    </div>
                    <button type="submit" disabled={isPasswordSubmitting} className="w-full sm:w-auto flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70 transition-colors mt-2">
                      {isPasswordSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> تحديث كلمة المرور</>}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* القسم الثالث: التفضيلات والإشعارات */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={() => toggleSection('preferences')} 
            className="w-full flex items-center justify-between p-5 sm:p-6 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl"><Bell className="w-5 h-5" /></div>
              <div className="text-right">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">التفضيلات والإشعارات</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">تخصيص المظهر وتنبيهات النظام الذكية</p>
              </div>
            </div>
            <motion.div animate={{ rotate: openSection === 'preferences' ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openSection === 'preferences' && (
              <motion.div variants={accordionVariants} initial="hidden" animate="visible" exit="hidden">
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        {preferences.is_dark_mode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">الوضع الليلي (Dark Mode)</span>
                      </div>
                      <button onClick={() => handleTogglePref('theme')} className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${preferences.is_dark_mode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${preferences.is_dark_mode ? 'translate-x-1 left-0' : '-translate-x-1 right-0'}`} />
                      </button>
                    </div>

                    {/* Notification Toggles */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">تنبيهات استلام وإنهاء الدورات</span>
                      <button onClick={() => handleTogglePref('notif', 'cycle_started')} className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${preferences.notifications.cycle_started ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${preferences.notifications.cycle_started ? 'translate-x-1 left-0' : '-translate-x-1 right-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 text-rose-600 dark:text-rose-400">النافق المرتفع (أكثر من 5%)</span>
                      <button onClick={() => handleTogglePref('notif', 'high_mortality')} className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${preferences.notifications.high_mortality ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${preferences.notifications.high_mortality ? 'translate-x-1 left-0' : '-translate-x-1 right-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 text-amber-600 dark:text-amber-400">المصروفات الكبيرة أو السلف</span>
                      <button onClick={() => handleTogglePref('notif', 'large_expense')} className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${preferences.notifications.large_expense ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${preferences.notifications.large_expense ? 'translate-x-1 left-0' : '-translate-x-1 right-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default OwnerSettings;