import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Lock, ShieldCheck, Loader2, Save, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';
import { showAlert } from '../../utils/alert';

const SupervisorSettings = () => {
  const { user, logout } = useAuth();
  
  const [phoneData, setPhoneData] = useState({ phone: '' });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await settingsService.getSettings();
        if (isMounted) setPhoneData({ phone: res.phone || '' });
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب بيانات الحساب');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!/^01[0125][0-9]{8}$/.test(phoneData.phone)) {
      return showAlert.error('خطأ', 'يرجى إدخال رقم هاتف مصري صحيح');
    }

    try {
      setIsPhoneSubmitting(true);
      const res = await settingsService.updatePhone(phoneData.phone);
      showAlert.success('تم التحديث', res.message);
    } catch (error) {
      showAlert.error('فشل التحديث', error.response?.data?.message || 'تعذر تحديث رقم الهاتف');
    } finally {
      setIsPhoneSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password.length < 6) {
      return showAlert.error('خطأ', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      return showAlert.error('خطأ', 'كلمة المرور الجديدة غير متطابقة مع حقل التأكيد');
    }

    try {
      setIsPasswordSubmitting(true);
      const res = await settingsService.updatePassword(passwordData);
      showAlert.success('تم التحديث بنجاح', res.message);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      
      // تسجيل خروج إجباري بعد تغيير كلمة المرور لأسباب أمنية
      setTimeout(() => {
        logout();
      }, 3000);
    } catch (error) {
      showAlert.error('فشل التحديث', error.response?.data?.message || 'تعذر تغيير كلمة المرور');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-slate-500" /> إعدادات الحساب
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">إدارة بياناتك الشخصية وحماية حسابك</p>
        </div>
        <button onClick={logout} className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors font-bold text-sm dark:bg-rose-900/20 dark:text-rose-400">
          <LogOut className="w-4 h-4" /> تسجيل الخروج
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* البطاقة الأولى: البيانات الشخصية */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">البيانات الشخصية</h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">تحديث رقم الهاتف للتواصل</p>
            </div>
          </div>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">اسم المشرف (للقراءة فقط)</label>
              <input type="text" value={user?.name || 'غير محدد'} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">رقم الهاتف *</label>
              <input type="tel" dir="ltr" required value={phoneData.phone} onChange={e => setPhoneData({ phone: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <button type="submit" disabled={isPhoneSubmitting} className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-70 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
              {isPhoneSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ التعديلات</>}
            </button>
          </form>
        </motion.div>

        {/* البطاقة الثانية: حماية الحساب (تغيير كلمة المرور) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">حماية الحساب</h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">تغيير كلمة المرور الخاصة بك</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">كلمة المرور الحالية *</label>
              <input type="password" required value={passwordData.current_password} onChange={e => setPasswordData(p => ({ ...p, current_password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">كلمة المرور الجديدة *</label>
              <input type="password" required minLength="6" value={passwordData.new_password} onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">تأكيد كلمة المرور الجديدة *</label>
              <input type="password" required minLength="6" value={passwordData.confirm_password} onChange={e => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <button type="submit" disabled={isPasswordSubmitting} className="w-full flex justify-center items-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70 transition-colors mt-2">
              {isPasswordSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> تحديث كلمة المرور</>}
            </button>
          </form>
        </motion.div>

      </div>
    </div>
  );
};

export default SupervisorSettings;