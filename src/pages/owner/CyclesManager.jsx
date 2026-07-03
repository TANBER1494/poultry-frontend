import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  X,
  Loader2,
  MoreVertical,
  Activity,
  CalendarDays,
  Bird,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  LockKeyhole,
  Tractor,
  Package,
} from 'lucide-react';
import cycleService from '../../services/cycleService';
import barnService from '../../services/barnService';
import farmService from '../../services/farmService';
import supervisorService from '../../services/supervisorService';
import { showAlert } from '../../utils/alert';

const CyclesManager = () => {
  const { farmId } = useParams();
  const [searchParams] = useSearchParams();
  const barnFilter = searchParams.get('barn');
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(farmId || '');
  const [cycles, setCycles] = useState([]);
  const [barns, setBarns] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ACTIVE');

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD',
    activeCycle: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    barn_id: barnFilter || '',
    supervisor_id: '',
    type: 'BROILER',
    start_date: new Date().toISOString().split('T')[0],
    initial_bird_count: '',
  });

  const [closeDate, setCloseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      try {
        setIsLoading(true);
        let targetFarmId = farmId;
        const farmsRes = await farmService.getFarms();
        const fetchedFarms = farmsRes.farms || [];
        if (isMounted) setFarms(fetchedFarms);

        if (!targetFarmId) {
          if (fetchedFarms.length > 0) {
            targetFarmId = fetchedFarms[0]._id;
            if (isMounted) setSelectedFarmId(targetFarmId);
          } else {
            if (isMounted) setIsLoading(false);
            return;
          }
        } else {
          if (isMounted) setSelectedFarmId(targetFarmId);
        }
        await fetchFarmRelatedData(targetFarmId, isMounted);
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب البيانات الأساسية');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initializeData();
    return () => {
      isMounted = false;
    };
  }, [farmId]);

  const fetchFarmRelatedData = async (targetFarmId, isMounted = true) => {
    const [cyclesRes, barnsRes, supervisorsRes] = await Promise.all([
      cycleService.getFarmCycles(targetFarmId),
      barnService.getFarmBarns(targetFarmId),
      supervisorService.getSupervisors(targetFarmId),
    ]);
    if (isMounted) {
      setCycles(cyclesRes.cycles || []);
      setBarns(barnsRes.barns || []);
      setSupervisors(supervisorsRes.supervisors || []);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    setIsLoading(true);
    await fetchFarmRelatedData(newFarmId);
    setIsLoading(false);
  };

  const filteredCycles = cycles.filter((c) => {
    const matchStatus =
      activeTab === 'ACTIVE' ? c.status !== 'CLOSED' : c.status === 'CLOSED';
    const matchBarn = barnFilter ? c.barn_id?._id === barnFilter : true;
    return matchStatus && matchBarn;
  });

  const closeSheet = () =>
    setSheetConfig({ isOpen: false, mode: 'ADD', activeCycle: null });

  const openAddSheet = () => {
    setFormData((prev) => ({
      ...prev,
      name: '',
      initial_bird_count: '',
      barn_id: '',
      supervisor_id: '',
    }));
    setSheetConfig({ isOpen: true, mode: 'ADD', activeCycle: null });
  };

  const openOptionsSheet = (cycle) =>
    setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeCycle: cycle });

  const handleStartCycle = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.barn_id ||
      !formData.initial_bird_count ||
      !formData.supervisor_id
    ) {
      return showAlert.error('بيانات ناقصة', 'يرجى إكمال جميع الحقول المطلوبة');
    }
    try {
      setIsActionLoading(true);
      await cycleService.startCycle({ ...formData, farm_id: selectedFarmId });
      showAlert.success('تم التشغيل', 'بدأت الدورة الإنتاجية بنجاح');
      closeSheet();
      await fetchFarmRelatedData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'إجراء مرفوض',
        error.response?.data?.message || 'فشل بدء الدورة'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseCycle = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        'إغلاق الدورة سيقوم بتصفيتها محاسبياً بشكل نهائي ولا يمكن التراجع. هل أنت متأكد؟'
      )
    )
      return;
    try {
      setIsActionLoading(true);
      await cycleService.closeCycle(
        sheetConfig.activeCycle._id,
        closeDate,
        selectedFarmId
      );
      showAlert.success(
        'تم الإقفال',
        'تم إقفال الدورة محاسبياً وتحويل العنبر لوضع الصيانة'
      );
      closeSheet();
      await fetchFarmRelatedData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'إجراء مرفوض',
        error.response?.data?.message || 'فشل إغلاق الدورة'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'ACTIVE')
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (status === 'PREPARATION')
      return 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400';
    return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount || 0);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          {farmId && (
            <button
              onClick={() => navigate(`/owner/farms/${farmId}/barns`)}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              إدارة الدورات الإنتاجية
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <Tractor className="h-4 w-4" />
            </div>
            <select
              value={selectedFarmId}
              onChange={handleFarmChange}
              disabled={isLoading || farms.length === 0}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {farms.length === 0 && <option value="">لا توجد مزارع</option>}
              {farms.map((farm) => (
                <option key={farm._id} value={farm._id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openAddSheet}
            disabled={farms.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">دورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          الدورات الحالية
        </button>
        <button
          onClick={() => setActiveTab('CLOSED')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'CLOSED' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          الأرشيف (مغلقة)
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : filteredCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
            <Activity className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            لا توجد دورات {activeTab === 'ACTIVE' ? 'نشطة' : 'مغلقة'}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredCycles.map((cycle) => {
            const mortalityRate =
              cycle.initial_bird_count > 0
                ? (
                    ((cycle.total_dead_birds || 0) / cycle.initial_bird_count) *
                    100
                  ).toFixed(1)
                : 0;

            const startDate = new Date(cycle.start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate =
              cycle.status === 'CLOSED' ? new Date(cycle.end_date) : new Date();
            endDate.setHours(0, 0, 0, 0);
            const ageInDays = Math.max(
              1,
              Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
            );

            return (
              <motion.div
                key={cycle._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full"
              >
                {/* معلومات رأس الكارت */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/owner/farms/${selectedFarmId}/cycles/${cycle._id}`
                          )
                        }
                        className="text-base font-black text-slate-800 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none text-right"
                      >
                        {cycle.name}
                      </button>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(cycle.status)}`}
                      >
                        {cycle.status === 'ACTIVE'
                          ? 'نشطة'
                          : cycle.status === 'PREPARATION'
                            ? 'تجهيز'
                            : 'مغلقة'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />{' '}
                        {new Date(cycle.start_date).toLocaleDateString('ar-EG')}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {cycle.farm_id?.name} -{' '}
                        {cycle.barn_id?.name || 'عنبر غير محدد'}
                      </span>
                    </div>
                  </div>

                  {cycle.status !== 'CLOSED' && (
                    <button
                      onClick={() => openOptionsSheet(cycle)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                      title="إغلاق محاسبي"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* إحصائيات الدورة */}
                <div
                  className={`grid gap-3 mb-4 flex-grow ${cycle.type === 'LAYER' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}
                >
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <Bird className="w-3 h-3" /> الطيور الحالية (حي)
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {(cycle.current_bird_count || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      من أصل {(cycle.initial_bird_count || 0).toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl p-3 flex flex-col justify-between ${mortalityRate > 5 ? 'bg-rose-50 dark:bg-rose-900/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                  >
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        عمر القطيع
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-white">
                        {ageInDays}{' '}
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          يوم
                        </span>
                      </p>
                    </div>
                    <div className="mt-2 border-t border-slate-200/50 dark:border-slate-700/50 pt-1">
                      <p
                        className={`text-[11px] font-bold flex items-center gap-1 ${mortalityRate > 5 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        {mortalityRate > 5 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        نفوق: %{mortalityRate}
                      </p>
                    </div>
                  </div>

                  {cycle.type === 'LAYER' && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 col-span-2 sm:col-span-1 border border-amber-100 dark:border-amber-900/30">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-500">
                          <Package className="w-3 h-3" /> إنتاج البيض
                        </div>
                        {pendingPulls > 0 && (
                          <span
                            className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[8px] font-black animate-pulse"
                            title="سحوبات معلقة تنتظر التسوية"
                          >
                            سلفة: {pendingPulls}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-black text-amber-800 dark:text-amber-400">
                        {(cycle.total_sold_eggs || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500/70 mt-0.5">
                        مبيعات الدورة
                      </p>
                    </div>
                  )}
                </div>

                {/* 🛡️ الأزرار المباشرة السريعة (بدلاً من القائمة المنسدلة) */}
                <div className="flex items-center gap-2 mt-auto border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    onClick={() =>
                      navigate(
                        `/owner/farms/${selectedFarmId}/cycles/${cycle._id}`
                      )
                    }
                    className="flex-1 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex justify-center items-center gap-1.5 dark:bg-emerald-900/20 dark:text-emerald-400"
                  >
                    <Activity className="w-4 h-4" /> التفاصيل واليوميات
                  </button>

                  {cycle.status !== 'CLOSED' && (
                    <button
                      onClick={() =>
                        navigate(
                          `/owner/sales?farm=${selectedFarmId}&cycle=${cycle._id}&action=new`
                        )
                      }
                      className="flex-1 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex justify-center items-center gap-1.5 dark:bg-indigo-900/20 dark:text-indigo-400"
                    >
                      <ShoppingCart className="w-4 h-4" /> إدارة المبيعات
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet للعمليات الإضافية */}
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
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD'
                      ? 'بدء دورة جديدة'
                      : 'خيارات إضافية للدورة'}
                  </h3>
                  <button
                    onClick={closeSheet}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto custom-scrollbar">
                  {sheetConfig.mode === 'OPTIONS' &&
                    sheetConfig.activeCycle && (
                      <div className="space-y-4">
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                          <h4 className="text-sm font-black text-rose-700 dark:text-rose-400 mb-2">
                            إقفال الدورة محاسبياً (نهائي)
                          </h4>
                          <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
                            بمجرد الإغلاق، سيتم إيقاف المصروفات، تثبيت الأرباح
                            النهائية، وتحويل العنبر لوضع الصيانة.
                          </p>
                        </div>
                        <form
                          onSubmit={handleCloseCycle}
                          className="space-y-4 mt-4"
                        >
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                              تاريخ الإغلاق الفعلي *
                            </label>
                            <input
                              type="date"
                              value={closeDate}
                              onChange={(e) => setCloseDate(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isActionLoading}
                            className="flex w-full justify-center items-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-70"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <LockKeyhole className="w-4 h-4" />
                            )}
                            تأكيد إغلاق الدورة
                          </button>
                        </form>
                      </div>
                    )}

                  {sheetConfig.mode === 'ADD' && (
                    <form onSubmit={handleStartCycle} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          اسم الدورة *
                        </label>
                        <input
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, name: e.target.value }))
                          }
                          placeholder="مثال: دفعة مايو 2026"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            تسكين في عنبر *
                          </label>
                          <select
                            value={formData.barn_id}
                            onChange={(e) => {
                              const barn = barns.find(
                                (b) => b._id === e.target.value
                              );
                              setFormData((p) => ({
                                ...p,
                                barn_id: e.target.value,
                                type: barn ? barn.barn_type : p.type,
                              }));
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            required
                          >
                            <option value="">-- اختر العنبر --</option>
                            {barns
                              .filter((b) => b.status === 'ACTIVE')
                              .map((b) => (
                                <option key={b._id} value={b._id}>
                                  {b.name} ({b.capacity} طائر)
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            عدد الطيور *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.initial_bird_count}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                initial_bird_count: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          تاريخ الاستلام *
                        </label>
                        <input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              start_date: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          المشرف المسؤول *
                        </label>
                        <select
                          value={formData.supervisor_id}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              supervisor_id: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        >
                          <option value="">-- اختر المشرف --</option>
                          {supervisors
                            .filter((s) => s.status === 'ACTIVE')
                            .map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="mt-4 flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'بدء الدورة وتسجيلها'
                        )}
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

export default CyclesManager;
