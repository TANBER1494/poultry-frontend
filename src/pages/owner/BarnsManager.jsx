import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  X,
  Loader2,
  MoreVertical,
  Settings2,
  Trash2,
  Home,
  CheckCircle2,
  Wrench,
  Ban,
  Link,
} from 'lucide-react';
import barnService from '../../services/barnService';
import { showAlert } from '../../utils/alert';
import farmService from '../../services/farmService';

const BarnsManager = () => {
  const { farmId } = useParams(); // استخراج ID المزرعة من الرابط
  const navigate = useNavigate();

  const [barns, setBarns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [farmName, setFarmName] = useState('');
  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD', // 'ADD', 'EDIT', 'OPTIONS'
    activeBarn: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    barn_type: 'BROILER',
    capacity: '',
    status: 'ACTIVE',
  });

  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (farmId) {
      fetchBarns();
    }
  }, [farmId]);

  const fetchBarns = async () => {
    try {
      setIsLoading(true);
      // جلب العنابر
      const response = await barnService.getFarmBarns(farmId);
      setBarns(response.barns || []);

      // جلب اسم المزرعة لتحسين تجربة المستخدم
      const farmsRes = await farmService.getFarms();
      const currentFarm = farmsRes.farms?.find((f) => f._id === farmId);
      if (currentFarm) setFarmName(currentFarm.name);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات العنابر');
    } finally {
      setIsLoading(false);
    }
  };

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD', activeBarn: null });
    setFormData({
      name: '',
      barn_type: 'BROILER',
      capacity: '',
      status: 'ACTIVE',
    });
  };

  const openAddSheet = () => {
    setFormData({
      name: '',
      barn_type: 'BROILER',
      capacity: '',
      status: 'ACTIVE',
    });
    setSheetConfig({ isOpen: true, mode: 'ADD', activeBarn: null });
  };

  const openOptionsSheet = (barn) => {
    setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeBarn: barn });
  };

  const openEditSheet = (barn) => {
    setFormData({
      name: barn.name,
      barn_type: barn.barn_type,
      capacity: barn.capacity,
      status: barn.status,
    });
    setSheetConfig({ isOpen: true, mode: 'EDIT', activeBarn: barn });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.capacity) {
      showAlert.error('بيانات ناقصة', 'يرجى إكمال الحقول الأساسية');
      return;
    }

    try {
      setIsActionLoading(true);

      //  التعديل المعماري: دمج farmId دائماً في الـ Payload لضمان اجتياز الفحص الأمني في الباك إند
      const payload = { ...formData, farm_id: farmId };

      if (sheetConfig.mode === 'ADD') {
        await barnService.addBarn(payload);
        showAlert.success('تمت الإضافة', 'تم إنشاء العنبر بنجاح');
      } else if (sheetConfig.mode === 'EDIT') {
        await barnService.updateBarn(sheetConfig.activeBarn._id, payload);
        showAlert.success('تم التحديث', 'تم حفظ التعديلات بنجاح');
      }
      closeSheet();
      fetchBarns();
    } catch (error) {
      showAlert.error(
        'إجراء مرفوض',
        error.response?.data?.message || 'فشل تنفيذ العملية'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (barn) => {
    if (!window.confirm(`هل أنت متأكد من أرشفة عنبر (${barn.name})؟`)) return;

    try {
      setIsActionLoading(true);
      await barnService.deleteBarn(barn._id, farmId);
      showAlert.success('تم الحذف', 'تم أرشفة العنبر بنجاح');
      closeSheet();
      fetchBarns();
    } catch (error) {
      showAlert.error(
        'إجراء مرفوض',
        error.response?.data?.message || 'لا يمكن حذف هذا العنبر'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // دوال الترجمة والتنسيق
  const getBarnTypeName = (type) => {
    switch (type) {
      case 'BROILER':
        return 'تسمين';
      case 'LAYER':
        return 'بياض';
      case 'BREEDER':
        return 'أمهات';
      default:
        return 'غير محدد';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> نشط
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
            <Wrench className="w-3 h-3" /> صيانة
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
            <Ban className="w-3 h-3" /> معطل
          </span>
        );
      default:
        return null;
    }
  };

  const sheetVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 25, stiffness: 200 },
    },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/owner/farms')}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors focus:outline-none"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              إدارة عنابر {farmName ? 'مزرعة ' + `(${farmName})` : ''}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              العنابر المسجلة: {barns.length}
            </p>
          </div>
        </div>
        <button
          onClick={openAddSheet}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">إضافة عنبر</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : barns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
            <Home className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            لا توجد عنابر في هذه المزرعة
          </h3>
          <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">
            أضف العنبر الأول لتبدأ بتسكين الطيور ومتابعة دورات الإنتاج الخاصة
            به.
          </p>
          <button
            onClick={openAddSheet}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            إضافة عنبر الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {barns.map((barn) => (
            <motion.div
              key={barn._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[140px]">
                      {barn.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="truncate max-w-[120px]">
                        نوع التربية: {getBarnTypeName(barn.barn_type)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openOptionsSheet(barn)}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 focus:outline-none"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 text-center">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  الطاقة الاستيعابية
                </p>
                <p className="text-sm font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {barn.capacity.toLocaleString()} طائر
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                {getStatusBadge(barn.status)}
                <button
                  onClick={() =>
                    navigate(`/owner/farms/${farmId}/cycles?barn=${barn._id}`)
                  }
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
                >
                  عرض الدورات
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Bottom Sheet Modal */}
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
                    {sheetConfig.mode === 'ADD' && 'إضافة عنبر جديد'}
                    {sheetConfig.mode === 'EDIT' && 'تعديل بيانات العنبر'}
                    {sheetConfig.mode === 'OPTIONS' && 'خيارات العنبر'}
                  </h3>
                  <button
                    onClick={closeSheet}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar">
                  {/* خيارات العنبر */}
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeBarn && (
                    <div className="space-y-2">
                      <button
                        onClick={() => openEditSheet(sheetConfig.activeBarn)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm transition-colors"
                      >
                        <Settings2 className="w-4 h-4" /> تعديل إعدادات العنبر
                      </button>

                      <button
                        onClick={() => handleDelete(sheetConfig.activeBarn)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 font-bold text-sm transition-colors mt-4 border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 className="w-4 h-4" /> أرشفة العنبر
                      </button>
                    </div>
                  )}

                  {/* فورم الإضافة والتعديل */}
                  {(sheetConfig.mode === 'ADD' ||
                    sheetConfig.mode === 'EDIT') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          اسم أو رقم العنبر *
                        </label>
                        <input
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder="مثال: عنبر 1 أو عنبر أ"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            سعة العنبر *
                          </label>
                          <input
                            name="capacity"
                            type="number"
                            min="1"
                            value={formData.capacity}
                            onChange={handleFormChange}
                            placeholder="عدد الطيور"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            نوع التربية *
                          </label>
                          <select
                            name="barn_type"
                            value={formData.barn_type}
                            onChange={handleFormChange}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="BROILER">تسمين (Broiler)</option>
                            <option value="LAYER">بياض (Layer)</option>
                            <option value="BREEDER">أمهات (Breeder)</option>
                          </select>
                        </div>
                      </div>

                      {sheetConfig.mode === 'EDIT' && (
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            حالة العنبر التشغيلية
                          </label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleFormChange}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="ACTIVE">نشط وجاهز للتسكين</option>
                            <option value="MAINTENANCE">
                              في وضع الصيانة والتطهير
                            </option>
                            <option value="INACTIVE">معطل / خارج الخدمة</option>
                          </select>
                        </div>
                      )}

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-70"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            'حفظ بيانات العنبر'
                          )}
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

export default BarnsManager;
