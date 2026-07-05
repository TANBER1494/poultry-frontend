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
  LockKeyhole,
  Tractor,
  Wallet,
  Banknote,
  PiggyBank
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
  
  // 🚀 حالة لتخزين الخلاصة المالية
  const [financialSummary, setFinancialSummary] = useState({ total_expenses: 0, total_revenue: 0, net_profit: 0 });

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

  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);
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
    return () => { isMounted = false; };
  }, [farmId]);

  const fetchFarmRelatedData = async (targetFarmId, isMounted = true) => {
    try {
      const [cyclesRes, barnsRes, supervisorsRes, financialRes] = await Promise.all([
        cycleService.getFarmCycles(targetFarmId),
        barnService.getFarmBarns(targetFarmId),
        supervisorService.getSupervisors(targetFarmId),
        cycleService.getFarmFinancialSummary(targetFarmId) // 🚀 جلب الخلاصة المالية
      ]);
      if (isMounted) {
        setCycles(cyclesRes.cycles || []);
        setBarns(barnsRes.barns || []);
        setSupervisors(supervisorsRes.supervisors || []);
        setFinancialSummary(financialRes || { total_expenses: 0, total_revenue: 0, net_profit: 0 });
      }
    } catch (err) {
      console.error(err);
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
    const matchStatus = activeTab === 'ACTIVE' ? c.status !== 'CLOSED' : c.status === 'CLOSED';
    const matchBarn = barnFilter ? c.barn_id?._id === barnFilter : true;
    return matchStatus && matchBarn;
  });

  const closeSheet = () => setSheetConfig({ isOpen: false, mode: 'ADD', activeCycle: null });

  const openAddSheet = () => {
    setFormData((prev) => ({ ...prev, name: '', initial_bird_count: '', barn_id: '', supervisor_id: '' }));
    setSheetConfig({ isOpen: true, mode: 'ADD', activeCycle: null });
  };

  const openOptionsSheet = (cycle) => setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeCycle: cycle });

  const handleStartCycle = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.barn_id || !formData.initial_bird_count || !formData.supervisor_id) {
      return showAlert.error('بيانات ناقصة', 'يرجى إكمال جميع الحقول المطلوبة');
    }
    try {
      setIsActionLoading(true);
      await cycleService.startCycle({ ...formData, farm_id: selectedFarmId });
      showAlert.success('تم التشغيل', 'بدأت الدورة الإنتاجية بنجاح');
      closeSheet();
      await fetchFarmRelatedData(selectedFarmId);
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل بدء الدورة');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseCycle = async (e) => {
    e.preventDefault();
    if (!window.confirm('إغلاق الدورة سيقوم بتصفيتها محاسبياً بشكل نهائي ولا يمكن التراجع. هل أنت متأكد؟')) return;
    try {
      setIsActionLoading(true);
      await cycleService.closeCycle(sheetConfig.activeCycle._id, closeDate, selectedFarmId);
      showAlert.success('تم الإقفال', 'تم إقفال الدورة محاسبياً وتحويل العنبر لوضع الصيانة');
      closeSheet();
      await fetchFarmRelatedData(selectedFarmId);
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل إغلاق الدورة');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'ACTIVE') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (status === 'PREPARATION') return 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400';
    return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          {farmId && (
            <button onClick={() => navigate(`/owner/farms/${farmId}/barns`)} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-500" /> إدارة الدورات الإنتاجية
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">متابعة الأداء التشغيلي والمالي للمزرعة</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <Tractor className="h-4 w-4" />
            </div>
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {farms.length === 0 && <option value="">لا توجد مزارع</option>}
              {farms.map((farm) => <option key={farm._id} value={farm._id}>{farm.name}</option>)}
            </select>
          </div>
          <button onClick={openAddSheet} disabled={farms.length === 0} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">دورة جديدة</span>
          </button>
        </div>
      </div>

      {/* 🚀 اللوحة المالية المجمعة للمزرعة */}
      {!isLoading && farms.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <TrendingUp className="w-5 h-5" />
              <h3 className="text-sm font-bold">إجمالي المبيعات والإيرادات</h3>
            </div>
            <p className="text-3xl font-black">{formatCurrency(financialSummary.total_revenue)}</p>
            <p className="text-[10px] mt-1 opacity-80">عائدات بيع المنتجات (بيض، سباخ، الخ)</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <TrendingDown className="w-5 h-5" />
              <h3 className="text-sm font-bold">إجمالي المصروفات التشغيلية</h3>
            </div>
            <p className="text-3xl font-black">{formatCurrency(financialSummary.total_expenses)}</p>
            <p className="text-[10px] mt-1 opacity-80">تكلفة العلف، الأدوية، والتشغيل للعنابر</p>
          </div>

          <div className={`p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between ${financialSummary.net_profit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Wallet className="w-5 h-5" />
              <h3 className="text-sm font-bold">صافي الربح العام للمزرعة</h3>
            </div>
            <p className="text-3xl font-black">{formatCurrency(financialSummary.net_profit)}</p>
            <p className="text-[10px] mt-1 opacity-80">إجمالي الإيرادات مخصوماً منها المصروفات</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-xl w-fit border border-slate-200 dark:border-slate-800">
        <button onClick={() => setActiveTab('ACTIVE')} className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          الدورات التشغيلية الحالية
        </button>
        <button onClick={() => setActiveTab('CLOSED')} className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'CLOSED' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          الأرشيف والدورات المغلقة
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : filteredCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
            <Activity className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">
            لا توجد دورات {activeTab === 'ACTIVE' ? 'نشطة' : 'مغلقة'}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredCycles.map((cycle) => {
            const mortalityRate = cycle.initial_bird_count > 0 ? (((cycle.total_dead_birds || 0) / cycle.initial_bird_count) * 100).toFixed(1) : 0;
            const startDate = new Date(cycle.start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = cycle.status === 'CLOSED' ? new Date(cycle.end_date) : new Date();
            endDate.setHours(0, 0, 0, 0);
            const ageInDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

            return (
              <motion.div key={cycle._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/owner/farms/${selectedFarmId}/cycles/${cycle._id}`)} className="text-lg font-black text-slate-800 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none text-right">
                        {cycle.name}
                      </button>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getStatusColor(cycle.status)}`}>
                        {cycle.status === 'ACTIVE' ? 'نشطة' : cycle.status === 'PREPARATION' ? 'تجهيز' : 'مغلقة'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-400" /> {new Date(cycle.start_date).toLocaleDateString('ar-EG')}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {cycle.barn_id?.name || 'عنبر غير محدد'}
                      </span>
                    </div>
                  </div>

                  {cycle.status !== 'CLOSED' && (
                    <button onClick={() => openOptionsSheet(cycle)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="إغلاق محاسبي">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* 🚀 إحصائيات الدورة المنظفة (بدون مبيعات) */}
                <div className="grid grid-cols-2 gap-3 mb-5 flex-grow">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <Bird className="w-4 h-4 text-emerald-500" /> الرصيد الحي
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-white">
                      {(cycle.current_bird_count || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                      أصل {(cycle.initial_bird_count || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className={`rounded-xl p-3 border ${mortalityRate > 5 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <CalendarDays className="w-4 h-4 text-slate-400" /> عمر القطيع
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-white">
                      {ageInDays} <span className="text-xs font-bold text-slate-400">يوم</span>
                    </p>
                    <p className={`text-[10px] font-black mt-0.5 flex items-center gap-1 ${mortalityRate > 5 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {mortalityRate > 5 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      نفوق: %{mortalityRate}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 col-span-2 border border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-100 text-rose-600 rounded-lg dark:bg-rose-900/30 dark:text-rose-400">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تكلفة الدورة (المصروفات)</p>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(cycle.total_expenses)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <button onClick={() => navigate(`/owner/farms/${selectedFarmId}/cycles/${cycle._id}`)} className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl text-sm font-black hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex justify-center items-center gap-2 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/50">
                    <Activity className="w-4 h-4" /> تفاصيل الإنتاج واليوميات
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet */}
      <AnimatePresence>
        {sheetConfig.isOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={closeSheet} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD' ? 'تسكين دورة جديدة' : 'إدارة الدورة'}
                  </h3>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeCycle && (
                    <div className="space-y-4">
                      <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                        <h4 className="text-sm font-black text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5"><LockKeyhole className="w-4 h-4"/> إقفال الدورة محاسبياً</h4>
                        <p className="text-xs text-rose-600 dark:text-rose-300 font-bold leading-relaxed">
                          بمجرد الإغلاق، سيتم إيقاف المصروفات على هذا العنبر، وتثبيت التكلفة النهائية لتحسب ضمن أرباح المزرعة، وتحويل العنبر لوضع الصيانة.
                        </p>
                      </div>
                      <form onSubmit={handleCloseCycle} className="space-y-4 mt-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">تاريخ الإغلاق الفعلي *</label>
                          <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-rose-500" required />
                        </div>
                        <button type="submit" disabled={isActionLoading} className="flex w-full justify-center items-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-70 shadow-lg shadow-rose-600/20">
                          {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الإغلاق النهائي'}
                        </button>
                      </form>
                    </div>
                  )}

                  {sheetConfig.mode === 'ADD' && (
                    <form onSubmit={handleStartCycle} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اسم الدورة / الدفعة *</label>
                        <input name="name" type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="مثال: دفعة مايو 2026" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">تسكين في عنبر *</label>
                          <select value={formData.barn_id} onChange={(e) => { const barn = barns.find((b) => b._id === e.target.value); setFormData((p) => ({ ...p, barn_id: e.target.value, type: barn ? barn.barn_type : p.type })); }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required>
                            <option value="">-- اختر العنبر --</option>
                            {barns.filter((b) => b.status === 'ACTIVE').map((b) => (
                              <option key={b._id} value={b._id}>{b.name} ({b.capacity} طائر)</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">العدد الفعلي للطيور *</label>
                          <input type="number" min="1" value={formData.initial_bird_count} onChange={(e) => setFormData((p) => ({ ...p, initial_bird_count: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">تاريخ الاستلام الفعلي *</label>
                        <input type="date" value={formData.start_date} onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">المشرف المسؤول عن اليوميات *</label>
                        <select value={formData.supervisor_id} onChange={(e) => setFormData((p) => ({ ...p, supervisor_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required>
                          <option value="">-- اختر المشرف --</option>
                          {supervisors.filter((s) => s.status === 'ACTIVE').map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" disabled={isActionLoading} className="mt-6 flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70 shadow-lg shadow-emerald-600/20">
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'بدء الدورة الإنتاجية وتفعيلها'}
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