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
import { Link } from 'react-router-dom';

const FarmsManager = () => {
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
        showAlert.success('تمت الإضافة', 'تم تسجيل المزرعة بنجاح');
      } else if (sheetConfig.mode === 'EDIT') {
        await farmService.updateFarmSettings(sheetConfig.activeFarm._id, formData);
        showAlert.success('تم التحديث', 'تم حفظ التعديلات بنجاح');
      }
      closeSheet();
      fetchFarms();
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل تنفيذ العملية');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStatusToggle = async (farm) => {
    try {
      setIsActionLoading(true);
      if (farm.subscription_status === 'LOCKED') {
        await farmService.reactivateFarm(farm._id);
        showAlert.success('تم التنشيط', 'تم إعادة تفعيل المزرعة');
      } else {
        await farmService.suspendFarm(farm._id);
        showAlert.success('تم الإيقاف', 'تم إيقاف المزرعة مؤقتاً');
      }
      closeSheet();
      fetchFarms();
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل تغيير حالة المزرعة');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (farm) => {
    if (!window.confirm(`هل أنت متأكد من الحذف النهائي لمزرعة (${farm.name})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    
    try {
      setIsActionLoading(true);
      await farmService.hardDeleteFarm(farm._id);
      showAlert.success('تم الحذف', 'تم حذف المزرعة نهائياً');
      closeSheet();
      fetchFarms();
    } catch (error) {
      showAlert.error('فشل الحذف', error.response?.data?.message || 'لا يمكن حذف هذه المزرعة');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> نشط</span>;
      case 'TRIAL': return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"><Settings2 className="w-3 h-3"/> تجريبي</span>;
      case 'LOCKED': return <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> موقوف</span>;
      default: return <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"><AlertOctagon className="w-3 h-3"/> متأخر</span>;
    }
  };

  const sheetVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">إدارة المزارع</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            إجمالي المزارع المسجلة: {farms.length}
          </p>
        </div>
        <button
          onClick={openAddSheet}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">إضافة مزرعة</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : farms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
            <Tractor className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">لا توجد مزارع مسجلة</h3>
          <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">
            قم بإضافة مزرعتك الأولى لتتمكن من إنشاء العنابر وبدء الدورات الإنتاجية.
          </p>
          <button
            onClick={openAddSheet}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            إضافة مزرعة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {farms.map((farm) => (
            <motion.div
              key={farm._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    <Tractor className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[140px]">{farm.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{farm.location}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openOptionsSheet(farm)}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 focus:outline-none"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {/* 🚀 التعديل: قسم الأزرار (شبكة من زرين) */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                <Link 
                  to={`/owner/farms/${farm._id}/barns`}
                  className="flex items-center justify-center gap-1.5 w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <Home className="w-4 h-4" />
                  العنابر
                </Link>
                <Link 
                  to={`/owner/supervisors?farm=${farm._id}`}
                  className="flex items-center justify-center gap-1.5 w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <Users className="w-4 h-4" />
                  المشرفين
                </Link>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  رصيد العلف: {farm.total_feed_stock ? farm.total_feed_stock.toLocaleString() : 0} 
                </div>
                {getStatusBadge(farm.subscription_status)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {sheetConfig.isOpen && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={closeSheet}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />

            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90dvh]"
              >
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD' && 'إضافة مزرعة جديدة'}
                    {sheetConfig.mode === 'EDIT' && 'تعديل بيانات المزرعة'}
                    {sheetConfig.mode === 'OPTIONS' && 'خيارات المزرعة'}
                  </h3>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar">
                  
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeFarm && (
                    <div className="space-y-2">
                      <button
                        onClick={() => openEditSheet(sheetConfig.activeFarm)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm transition-colors"
                      >
                        <Settings2 className="w-4 h-4" /> تعديل البيانات الأساسية
                      </button>
                      
                      <button
                        onClick={() => handleStatusToggle(sheetConfig.activeFarm)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-sm transition-colors"
                      >
                        {sheetConfig.activeFarm.subscription_status === 'LOCKED' ? (
                          <><Unlock className="w-4 h-4" /> إعادة تنشيط المزرعة</>
                        ) : (
                          <><Lock className="w-4 h-4" /> إيقاف المزرعة مؤقتاً</>
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(sheetConfig.activeFarm)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 font-bold text-sm transition-colors mt-4 border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 className="w-4 h-4" /> حذف المزرعة نهائياً
                      </button>
                    </div>
                  )}

                  {(sheetConfig.mode === 'ADD' || sheetConfig.mode === 'EDIT') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اسم المزرعة *</label>
                        <input
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder="مثال: مزرعة الهيشة"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الموقع / العنوان *</label>
                        <input
                          name="location"
                          type="text"
                          value={formData.location}
                          onChange={handleFormChange}
                          placeholder="مثال: طريق الإسماعيلية الصحراوي"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>

                      <label className="mt-2 flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30">
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
                          className="flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-70"
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