import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tractor, 
  MapPin, 
  Settings2, 
  MoreVertical, 
  Plus, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertOctagon, 
  Trash2, 
  Lock,
  Unlock,
  Home,
  Package,
  Users 
} from 'lucide-react';
import farmService from '../../services/farmService';
import { showAlert } from '../../utils/alert';
import { Link, useNavigate } from 'react-router-dom';

const FarmsManager = () => {
  const navigate = useNavigate(); // 🚀 تفعيل التوجيه لصفحة المشرفين
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD',
    activeFarm: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    has_feed_mill: false,
  });

  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      setIsLoading(true);
      const response = await farmService.getFarms();
      setFarms(response.farms || []);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المزارع');
    } finally {
      setIsLoading(false);
    }
  };

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD', activeFarm: null });
    setFormData({ name: '', location: '', has_feed_mill: false });
  };

  const openAddSheet = () => {
    setFormData({ name: '', location: '', has_feed_mill: false });
    setSheetConfig({ isOpen: true, mode: 'ADD', activeFarm: null });
  };

  const openOptionsSheet = (farm) => {
    setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeFarm: farm });
  };

  const openEditSheet = (farm) => {
    setFormData({
      name: farm.name,
      location: farm.location,
      has_feed_mill: farm.has_feed_mill || false,
    });
    setSheetConfig({ isOpen: true, mode: 'EDIT', activeFarm: farm });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      showAlert.error('بيانات ناقصة', 'يرجى إكمال الحقول الأساسية');
      return;
    }

    try {
      setIsActionLoading(true);
      if (sheetConfig.mode === 'ADD') {
        await farmService.addFarm(formData);
        showAlert.success('تمت الإضافة', 'تم إنشاء المزرعة بنجاح');
      } else if (sheetConfig.mode === 'EDIT') {
        await farmService.updateFarm(sheetConfig.activeFarm._id, formData);
        showAlert.success('تم التحديث', 'تم حفظ التعديلات بنجاح');
      }
      closeSheet();
      fetchFarms();
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل تنفيذ العملية');
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleFarmStatus = async (farm) => {
    if (!window.confirm(`هل أنت متأكد من تغيير حالة المزرعة (${farm.name})؟`)) return;
    try {
      setIsActionLoading(true);
      const newStatus = farm.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await farmService.updateFarm(farm._id, { status: newStatus });
      showAlert.success('تم التحديث', `تم ${newStatus === 'ACTIVE' ? 'تفعيل' : 'إيقاف'} المزرعة بنجاح`);
      closeSheet();
      fetchFarms();
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل تغيير حالة المزرعة');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (farm) => {
    if (!window.confirm(`تحذير نهائي: هل أنت متأكد من حذف المزرعة (${farm.name}) بالكامل؟`)) return;
    try {
      setIsActionLoading(true);
      await farmService.deleteFarm(farm._id);
      showAlert.success('تم الحذف', 'تم مسح المزرعة من النظام');
      closeSheet();
      fetchFarms();
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'لا يمكن حذف هذه المزرعة لارتباطها بسجلات أخرى');
    } finally {
      setIsActionLoading(false);
    }
  };

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-4">
      {/* Header with Prominent Add Button and 🚀 Supervisors Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tractor className="w-6 h-6 text-emerald-500" /> إدارة المزارع
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            إدارة فروع مزارعك والمرافق التابعة لها
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 🚀 الزر الجديد للذهاب إلى المشرفين بشكل مباشر من صفحة المزارع */}
          <button
            onClick={() => navigate('/owner/supervisors')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:scale-95 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
          >
            <Users className="h-5 w-5" />
            <span className="hidden sm:inline">إدارة المشرفين</span>
          </button>

          <button
            onClick={openAddSheet}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">إضافة مزرعة</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : farms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
            <Tractor className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد مزارع مسجلة</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md">
            قم بإضافة المزرعة الأولى لتتمكن من إنشاء العنابر، وإضافة المشرفين، وبدء دورات الإنتاج.
          </p>
          <button
            onClick={openAddSheet}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            إضافة مزرعة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {farms.map((farm) => (
            <motion.div
              key={farm._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${farm.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                    {farm.status === 'ACTIVE' ? <Tractor className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white line-clamp-1">{farm.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{farm.location}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openOptionsSheet(farm)}
                  className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 focus:outline-none"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {/* 🛡️ إحصائيات المزرعة المحدثة بدون ربط بالعنابر */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">حالة المزرعة</p>
                  {farm.status === 'ACTIVE' ? (
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3"/> نشطة</p>
                  ) : (
                    <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center justify-center gap-1"><AlertOctagon className="w-3 h-3"/> معطلة</p>
                  )}
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-center dark:bg-indigo-900/10">
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">مصنع أعلاف</p>
                  <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 mt-1">
                    {farm.has_feed_mill ? 'يوجد مصنع' : 'لا يوجد'}
                  </p>
                </div>
              </div>

              {/* 🛡️ تعديل الزر الرئيسي للتنقل لصفحة العنابر */}
              <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/owner/farms/${farm._id}/barns`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <Home className="h-4 w-4" /> إدارة العنابر والمخازن
                </Link>
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
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90dvh]">
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD' && 'إضافة مزرعة جديدة'}
                    {sheetConfig.mode === 'EDIT' && 'تعديل بيانات المزرعة'}
                    {sheetConfig.mode === 'OPTIONS' && 'خيارات المزرعة'}
                  </h3>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeFarm && (
                    <div className="space-y-3">
                      <button
                        onClick={() => openEditSheet(sheetConfig.activeFarm)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm transition-colors"
                      >
                        <Settings2 className="w-5 h-5" /> الإعدادات وتعديل البيانات
                      </button>

                      <button
                        onClick={() => toggleFarmStatus(sheetConfig.activeFarm)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold text-sm transition-colors border ${
                          sheetConfig.activeFarm.status === 'ACTIVE'
                            ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-amber-100 dark:border-amber-900/30'
                            : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900/30'
                        }`}
                      >
                        {sheetConfig.activeFarm.status === 'ACTIVE' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                        {sheetConfig.activeFarm.status === 'ACTIVE' ? 'إيقاف وتعطيل المزرعة' : 'تفعيل المزرعة'}
                      </button>

                      <button
                        onClick={() => handleDelete(sheetConfig.activeFarm)}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 font-bold text-sm transition-colors mt-2 border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 className="w-5 h-5" /> مسح المزرعة نهائياً
                      </button>
                    </div>
                  )}

                  {(sheetConfig.mode === 'ADD' || sheetConfig.mode === 'EDIT') && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اسم المزرعة أو الفرع *</label>
                        <input
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder="مثال: مزرعة الأمل - فرع الصعيد"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">العنوان أو الموقع *</label>
                        <input
                          name="location"
                          type="text"
                          value={formData.location}
                          onChange={handleFormChange}
                          placeholder="مثال: الطريق الصحراوي الغربي، الكيلو 50"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          required
                        />
                      </div>

                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition-colors dark:border-slate-800 dark:bg-slate-800/30">
                        <input
                          name="has_feed_mill"
                          type="checkbox"
                          checked={formData.has_feed_mill}
                          onChange={handleFormChange}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 dark:border-slate-600 dark:bg-slate-700"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">يوجد مصنع أعلاف ملحق بالمزرعة</span>
                      </label>

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-70 shadow-lg shadow-emerald-600/20"
                        >
                          {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ بيانات المزرعة'}
                        </button>
                      </div>
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

export default FarmsManager;