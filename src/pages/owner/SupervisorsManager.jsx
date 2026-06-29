import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Loader2, MoreVertical, Settings2, Trash2,
  ShieldCheck, Phone, Tractor, Lock, Ban, UserCircle, CheckCircle2 
} from 'lucide-react';
import supervisorService from '../../services/supervisorService';
import farmService from '../../services/farmService';
import { showAlert } from '../../utils/alert';

const SupervisorsManager = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [farmName, setFarmName] = useState(''); // 🛡️ التعديل هنا: حفظ اسم المزرعة
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD', 
    activeSupervisor: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      try {
        setIsLoading(true);
        const farmsRes = await farmService.getFarms();
        const fetchedFarms = farmsRes.farms || [];
        if (isMounted) setFarms(fetchedFarms);

        if (fetchedFarms.length > 0) {
          const firstFarm = fetchedFarms[0];
          if (isMounted) {
            setSelectedFarmId(firstFarm._id);
            setFarmName(firstFarm.name);
          }
          await fetchSupervisors(firstFarm._id, isMounted);
        } else {
          if (isMounted) setIsLoading(false);
        }
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب البيانات الأساسية');
        if (isMounted) setIsLoading(false);
      }
    };

    initializeData();
    return () => { isMounted = false; };
  }, []);

  const fetchSupervisors = async (farmId, isMounted = true) => {
    try {
      setIsLoading(true);
      const response = await supervisorService.getSupervisors(farmId);
      if (isMounted) setSupervisors(response.supervisors || []);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المشرفين');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    
    // تحديث اسم المزرعة
    const selectedFarm = farms.find(f => f._id === newFarmId);
    if (selectedFarm) setFarmName(selectedFarm.name);

    await fetchSupervisors(newFarmId);
  };

  const closeSheet = () => setSheetConfig({ isOpen: false, mode: 'ADD', activeSupervisor: null });

  const openAddSheet = () => {
    setFormData({ name: '', phone: '', password: '', status: 'ACTIVE' });
    setSheetConfig({ isOpen: true, mode: 'ADD', activeSupervisor: null });
  };

  const openOptionsSheet = (sup) => setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeSupervisor: sup });

  const openEditSheet = (sup) => {
    setFormData({ name: sup.name, phone: sup.phone, password: '', status: sup.status });
    setSheetConfig({ isOpen: true, mode: 'EDIT', activeSupervisor: sup });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      if (sheetConfig.mode === 'ADD') {
        if (!formData.name || !formData.phone || !formData.password) {
          showAlert.error('بيانات ناقصة', 'يرجى إكمال جميع الحقول');
          return setIsActionLoading(false);
        }
        await supervisorService.addSupervisor({ ...formData, farm_id: selectedFarmId });
        showAlert.success('تمت الإضافة', 'تم إنشاء حساب المشرف بنجاح');
      } else if (sheetConfig.mode === 'EDIT') {
        //  التعديل هنا: إعادة إرسال farm_id لاجتياز حارس الاشتراكات (checkSubscription)
        const payload = { 
          name: formData.name, 
          phone: formData.phone, 
          status: formData.status,
          farm_id: selectedFarmId 
        };
        
        if (formData.password) payload.password = formData.password; 
        
        await supervisorService.updateSupervisor(sheetConfig.activeSupervisor._id, payload);
        showAlert.success('تم التحديث', 'تم حفظ بيانات المشرف');
      }
      closeSheet();
      await fetchSupervisors(selectedFarmId);
    } catch (error) {
      showAlert.error('فشل الإجراء', error.response?.data?.message || 'تعذر حفظ البيانات');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(`هل أنت متأكد من إيقاف وحذف المشرف (${sup.name})؟ لن يتمكن من الدخول نهائياً وسيتم طرده فوراً.`)) return;
    try {
      setIsActionLoading(true);
      await supervisorService.deleteSupervisor(sup._id, selectedFarmId);
      showAlert.success('تم الحذف', 'تم إيقاف حساب المشرف وطرده من النظام');
      closeSheet();
      await fetchSupervisors(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'لا يمكن حذف المشرف');
    } finally {
      setIsActionLoading(false);
    }
  };

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          {/* 🛡️ عرض اسم المزرعة هنا لتوضيح الرؤية للمالك */}
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            إدارة المشرفين {farmName ? "مزرعة " + `(${farmName})` :''}
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">صلاحيات إدارة العنابر والعمال</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"><Tractor className="h-4 w-4" /></div>
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {farms.length === 0 && <option value="">لا توجد مزارع</option>}
              {farms.map(farm => <option key={farm._id} value={farm._id}>{farm.name}</option>)}
            </select>
          </div>
          <button onClick={openAddSheet} disabled={farms.length === 0} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">إضافة مشرف</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      ) : supervisors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50"><ShieldCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" /></div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">لا يوجد مشرفين في هذه المزرعة</h3>
          <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">قم بتعيين مشرف لإدارة الدورات الإنتاجية وتسجيل المتابعات اليومية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {supervisors.map(sup => (
            <motion.div key={sup._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"><UserCircle className="h-8 w-8" /></div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">{sup.name}</h3>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1" dir="ltr">
                      <Phone className="w-3 h-3"/> <span>{sup.phone}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => openOptionsSheet(sup)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"><MoreVertical className="w-5 h-5" /></button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400">تاريخ التعيين: {new Date(sup.hiring_date || sup.createdAt).toLocaleDateString('ar-EG')}</span>
                {sup.status === 'ACTIVE' ? (
                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> نشط</span>
                ) : (
                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 flex items-center gap-1"><Ban className="w-3 h-3"/> موقوف</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      <AnimatePresence>
        {sheetConfig.isOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={closeSheet} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD' ? 'إضافة مشرف جديد' : sheetConfig.mode === 'EDIT' ? 'تعديل المشرف' : 'خيارات الحساب'}
                  </h3>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 overflow-y-auto custom-scrollbar">
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeSupervisor && (
                    <div className="space-y-3">
                      <button onClick={() => openEditSheet(sheetConfig.activeSupervisor)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors">
                        <Settings2 className="w-4 h-4" /> تعديل الصلاحيات والبيانات
                      </button>
                      <button onClick={() => handleDelete(sheetConfig.activeSupervisor)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 font-bold text-sm transition-colors border border-rose-100 dark:border-rose-900/30">
                        <Trash2 className="w-4 h-4" /> إيقاف وسحب الصلاحيات نهائياً
                      </button>
                    </div>
                  )}

                  {(sheetConfig.mode === 'ADD' || sheetConfig.mode === 'EDIT') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الاسم الثلاثي *</label>
                        <input name="name" type="text" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">رقم الهاتف (للدخول) *</label>
                        <input name="phone" type="tel" dir="ltr" value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          كلمة المرور {sheetConfig.mode === 'EDIT' && '(اتركها فارغة للاحتفاظ بالقديمة)'}
                        </label>
                        <input name="password" type="password" dir="ltr" value={formData.password} onChange={(e) => setFormData(p => ({...p, password: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" required={sheetConfig.mode === 'ADD'} />
                      </div>
                      {sheetConfig.mode === 'EDIT' && (
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">حالة الحساب</label>
                          <select value={formData.status} onChange={(e) => setFormData(p => ({...p, status: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                            <option value="ACTIVE">نشط (يمكنه الدخول وتسجيل البيانات)</option>
                            <option value="SUSPENDED">موقوف (مسحوبة صلاحياته)</option>
                          </select>
                        </div>
                      )}
                      <button type="submit" disabled={isActionLoading} className="mt-4 flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70">
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ بيانات المشرف'}
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupervisorsManager;