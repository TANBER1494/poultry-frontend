import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Loader2, ClipboardList, Activity, Package, 
  Bird, CalendarDays, TrendingDown, Wheat, Table, Search, AlertTriangle, Printer, Syringe
} from 'lucide-react';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import inventoryService from '../../services/inventoryService';
import dailyLogService from '../../services/dailyLogService';
import { showAlert } from '../../utils/alert';

const DailyLogs = () => {
  const [searchParams] = useSearchParams();
  const isNewAction = searchParams.get('action') === 'new';

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  const [activeCycles, setActiveCycles] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [generalItems, setGeneralItems] = useState([]); // 🚀 الأدوية والمستلزمات
  
  const [logsByDate, setLogsByDate] = useState({});
  const [searchDate, setSearchDate] = useState(''); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(isNewAction);

  const [globalLogDate, setGlobalLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalFeedItem, setGlobalFeedItem] = useState('');
  
  const [bulkData, setBulkData] = useState({});

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        setIsLoading(true);
        const farmsRes = await farmService.getFarms();
        const fetchedFarms = farmsRes.farms || [];
        if (isMounted) setFarms(fetchedFarms);

        if (fetchedFarms.length > 0) {
          const firstFarm = fetchedFarms[0]._id;
          if (isMounted) setSelectedFarmId(firstFarm);
          await fetchDependencies(firstFarm, isMounted);
        } else {
          if (isMounted) setIsLoading(false);
        }
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب البيانات الأساسية');
        if (isMounted) setIsLoading(false);
      }
    };
    initialize();
    return () => { isMounted = false; };
  }, []);

  const fetchDependencies = async (farmId, isMounted = true) => {
    try {
      const [cyclesRes, inventoryRes] = await Promise.all([
        cycleService.getFarmCycles(farmId),
        inventoryService.getInventoryItems(farmId)
      ]);
      
      if (isMounted) {
        const active = (cyclesRes.cycles || []).filter(c => c.status === 'ACTIVE');
        // ترتيب العنابر أبجدياً
        active.sort((a, b) => (a.barn_id?.name || '').localeCompare(b.barn_id?.name || '', 'ar', { numeric: true }));
        setActiveCycles(active);
        
        const invItems = inventoryRes.items || [];
        setFeedItems(invItems.filter(item => item.category === 'FEED'));
        setGeneralItems(invItems.filter(item => !['FEED', 'PRODUCT'].includes(item.category)));

        // تهيئة مصفوفة الإدخال المجمع
        const initialBulk = {};
        active.forEach(c => {
          initialBulk[c._id] = {
            mortality_count: '', feed_consumed_bags: '', egg_trays_produced: '', 
            medication_item_id: '', medication_quantity: '', notes: ''
          };
        });
        setBulkData(initialBulk);

        if (active.length > 0) {
          await fetchAllActiveLogs(active, farmId);
        } else {
          setLogsByDate({});
        }
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات الدورات والمخزن');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const fetchAllActiveLogs = async (cycles, farmId) => {
    try {
      setIsLogsLoading(true);
      const promises = cycles.map(c => dailyLogService.getCycleDailyLogs(c._id, farmId));
      const results = await Promise.all(promises);
      
      let combined = [];
      results.forEach((res, index) => {
        const cycleLogs = res.logs || [];
        const cycleInfo = cycles[index];
        cycleLogs.forEach(log => combined.push({ ...log, cycleDetails: cycleInfo }));
      });

      const grouped = combined.reduce((acc, log) => {
        const d = new Date(log.log_date).toISOString().split('T')[0];
        if(!acc[d]) acc[d] = [];
        acc[d].push(log);
        return acc;
      }, {});

      setLogsByDate(grouped);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب السجلات اليومية');
    } finally {
      setIsLogsLoading(false);
    }
  };

  const calculateAge = (startDate, logDateStr) => {
    if (!startDate || !logDateStr) return 0;
    const logDate = new Date(logDateStr);
    const start = new Date(startDate);
    logDate.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
    return Math.ceil((logDate - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleBulkChange = (cycleId, field, value) => {
    setBulkData(prev => ({
      ...prev,
      [cycleId]: { ...prev[cycleId], [field]: value }
    }));
  };

  // 🚀 الإرسال المجمع
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!globalLogDate) return showAlert.error('خطأ', 'يجب تحديد تاريخ اليومية');

    const logsArray = [];
    
    for (const cycle of activeCycles) {
      const row = bulkData[cycle._id];
      const age = calculateAge(cycle.start_date, globalLogDate);
      
      // تجاهل العنابر التي ليس لها داتا أو عمرها غير صالح
      const hasData = row.mortality_count || row.feed_consumed_bags || row.egg_trays_produced || row.notes || row.medication_quantity;
      if (!hasData || age < 1) continue;

      if (row.feed_consumed_bags > 0 && !globalFeedItem) {
        return showAlert.error('خطأ', 'لقد سجلت استهلاك علف لبعض العنابر، يجب اختيار نوع العلف من الأعلى.');
      }

      const consumed_medications = [];
      if (row.medication_item_id && row.medication_quantity > 0) {
        consumed_medications.push({
          item_id: row.medication_item_id,
          quantity: Number(row.medication_quantity)
        });
      }

      logsArray.push({
        local_id: `LOG_${cycle._id}_${Date.now()}_${Math.random()}`,
        barn_id: cycle.barn_id._id,
        cycle_id: cycle._id,
        log_date: globalLogDate,
        age_in_days: age,
        mortality_count: row.mortality_count,
        feed_item_id: globalFeedItem,
        feed_consumed_bags: row.feed_consumed_bags,
        egg_trays_produced: row.egg_trays_produced,
        consumed_medications: consumed_medications,
        notes: row.notes
      });
    }

    if (logsArray.length === 0) {
      return showAlert.error('تنبيه', 'لم تقم بإدخال أي بيانات لأي عنبر.');
    }

    try {
      setIsSubmitting(true);
      await dailyLogService.createBulkDailyLogs({ logs: logsArray, farm_id: selectedFarmId });
      showAlert.success('نجاح', `تم تسجيل وتحديث المخازن لعدد (${logsArray.length}) عنبر بنجاح`);
      setIsFormOpen(false);
      
      // تصفير الخانات
      const resetBulk = {};
      activeCycles.forEach(c => {
        resetBulk[c._id] = { mortality_count: '', feed_consumed_bags: '', egg_trays_produced: '', medication_item_id: '', medication_quantity: '', notes: '' };
      });
      setBulkData(resetBulk);
      
      await fetchDependencies(selectedFarmId); 
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل تسجيل اليوميات المجمعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedAndFilteredDates = Object.keys(logsByDate)
    .filter(date => searchDate === '' || date === searchDate)
    .sort((a, b) => new Date(b) - new Date(a));

  const getCycleTypeLabel = (type) => type === 'LAYER' ? 'بياض' : 'تسمين';

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-6 print:space-y-2">
      {/* 🖨️ الهيدر يختفي عند الطباعة */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-6 h-6 text-indigo-500" /> سجلات المزرعة المجمعة
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">متابعة اليوميات لكل العنابر مجمعة بالتاريخ</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" title="البحث بتاريخ محدد" />
            {searchDate && <button onClick={() => setSearchDate('')} className="absolute left-2 top-2.5 text-rose-500 hover:text-rose-700"><X className="w-4 h-4"/></button>}
          </div>

          <button onClick={() => window.print()} className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 px-4 py-2.5 text-sm font-bold transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            <Printer className="w-5 h-5" /> طباعة
          </button>

          <button onClick={() => setIsFormOpen(true)} disabled={activeCycles.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-5 w-5" /><span className="hidden sm:inline">إدخال مجمع</span>
          </button>
        </div>
      </div>

      {isLoading || isLogsLoading ? (
        <div className="flex h-64 items-center justify-center print:hidden"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
      ) : activeCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50 print:hidden">
          <Activity className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد دورات نشطة</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">قم ببدء دورة إنتاجية لتتمكن من تسجيل يومياتها.</p>
        </div>
      ) : sortedAndFilteredDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50 print:hidden">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد سجلات</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 mb-4">لم يتم تسجيل أي يومية {searchDate && 'في هذا التاريخ'}.</p>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-8">
          {sortedAndFilteredDates.map(dateStr => {
            const dayLogs = logsByDate[dateStr];
            
            return (
              <div key={dateStr} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-slate-400 print:shadow-none print:break-inside-avoid">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 print:bg-white print:border-b-2 print:border-black flex items-center gap-3">
                  <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 p-2 rounded-lg print:hidden">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg print:text-black">
                      يومية: {new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 print:text-slate-600">تم تسجيل ({dayLogs.length}) عنابر</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm print:text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 print:bg-slate-100 print:text-black">
                      <tr>
                        <th className="p-3 whitespace-nowrap border-l border-slate-100 dark:border-slate-700 print:border-slate-300">العنبر (النوع)</th>
                        <th className="p-3 border-l border-slate-100 dark:border-slate-700 print:border-slate-300">العمر</th>
                        <th className="p-3 text-rose-600 border-l border-slate-100 dark:border-slate-700 print:border-slate-300 print:text-black">النافق</th>
                        <th className="p-3 text-amber-600 border-l border-slate-100 dark:border-slate-700 print:border-slate-300 print:text-black">علف (شكاير)</th>
                        <th className="p-3 text-emerald-600 border-l border-slate-100 dark:border-slate-700 print:border-slate-300 print:text-black">بيض (أطباق)</th>
                        <th className="p-3 text-indigo-600 border-l border-slate-100 dark:border-slate-700 print:border-slate-300 print:text-black">أدوية ومستلزمات</th>
                        <th className="p-3 w-1/4">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {dayLogs.map(log => (
                        <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors print:border-b print:border-slate-300">
                          <td className="p-3 border-l border-slate-50 dark:border-slate-800 print:border-slate-300">
                            <div className="font-black text-slate-800 dark:text-white print:text-black">{log.cycleDetails?.barn_id?.name || 'غير معروف'}</div>
                            <div className="text-[10px] font-bold text-slate-500 print:text-slate-600 mt-0.5">{getCycleTypeLabel(log.cycleDetails?.type)}</div>
                          </td>
                          <td className="p-3 font-black border-l border-slate-50 dark:border-slate-800 print:border-slate-300 print:text-black">{log.age_in_days} <span className="text-[9px] text-slate-400">يوم</span></td>
                          <td className="p-3 font-black text-rose-600 dark:text-rose-400 border-l border-slate-50 dark:border-slate-800 print:border-slate-300 print:text-black">{log.mortality_count || '-'}</td>
                          <td className="p-3 font-black text-amber-600 dark:text-amber-500 border-l border-slate-50 dark:border-slate-800 print:border-slate-300 print:text-black">{log.feed_consumed_bags || '-'}</td>
                          <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 border-l border-slate-50 dark:border-slate-800 print:border-slate-300 print:text-black">{log.cycleDetails?.type === 'LAYER' ? (log.egg_trays_produced || '-') : '-'}</td>
                          <td className="p-3 border-l border-slate-50 dark:border-slate-800 print:border-slate-300 print:text-black">
                            {log.consumed_medications && log.consumed_medications.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {log.consumed_medications.map((med, i) => (
                                  <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 print:bg-transparent px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50 print:border-none">
                                    {med.name} ({med.quantity})
                                  </span>
                                ))}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-400 print:text-black">
                            {log.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🚀 مودال الإدخال المجمع (Bulk Entry Spreadsheet) */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setIsFormOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm print:hidden" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4 print:hidden">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[95dvh]">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-t-3xl">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Table className="w-5 h-5 text-indigo-600"/> إدخال يومية مجمعة للمزرعة</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">تحديث مباشر لأرصدة ومخازن كافة العنابر في خطوة واحدة</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="w-6 h-6" /></button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-slate-900/50">
                  <form id="bulkDailyLogForm" onSubmit={handleBulkSubmit} className="space-y-4">
                    
                    {/* 🚀 إعدادات اليومية (تطبق على كل العنابر) */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="w-full sm:w-1/3">
                        <label className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">تاريخ اليومية للكل *</label>
                        <input type="date" value={globalLogDate} onChange={e => setGlobalLogDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
                      </div>
                      <div className="w-full sm:w-2/3">
                        <label className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">نوع العلف المستخدم اليوم (من المخزن)</label>
                        <select value={globalFeedItem} onChange={e => setGlobalFeedItem(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 dark:border-amber-900/40 dark:bg-slate-700 dark:text-amber-200">
                          <option value="">-- إذا تم استهلاك علف، اختر النوع الموحد هنا --</option>
                          {feedItems.map(f => <option key={f._id} value={f._id}>{f.name} (المتاح: {f.stock_quantity})</option>)}
                        </select>
                      </div>
                    </div>

                    {/* 🚀 جدول السبريدشيت للعنابر */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right text-sm min-w-[800px]">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3 w-48 sticky right-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">العنبر (العمر)</th>
                              <th className="p-3 w-24 text-rose-600">النافق</th>
                              <th className="p-3 w-28 text-amber-600">علف (شكاير)</th>
                              <th className="p-3 w-28 text-emerald-600">إنتاج (أطباق)</th>
                              <th className="p-3 w-56 text-indigo-600">صرف أدوية (من المخزن)</th>
                              <th className="p-3 w-48">ملاحظات العنبر</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {activeCycles.map((cycle) => {
                              const age = calculateAge(cycle.start_date, globalLogDate);
                              const pendingPulls = cycle.pending_egg_pulls || 0;
                              const isLayer = cycle.type === 'LAYER';
                              
                              return (
                                <tr key={cycle._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                  <td className="p-3 sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                                    <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <Bird className="w-4 h-4 text-indigo-500" /> {cycle.barn_id?.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${age < 1 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {age < 1 ? 'تاريخ خطأ' : `عمر: ${age} يوم`}
                                      </span>
                                    </div>
                                    {isLayer && pendingPulls > 0 && (
                                      <div className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.5 rounded mt-1 flex w-fit">
                                        سلفة فواتير: {pendingPulls}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <input type="number" min="0" placeholder="0" disabled={age < 1} value={bulkData[cycle._id]?.mortality_count} onChange={e => handleBulkChange(cycle._id, 'mortality_count', e.target.value)} className="w-full rounded-lg border border-rose-100 bg-rose-50/30 px-2 py-2 text-center text-sm font-black text-rose-700 outline-none focus:border-rose-500 focus:bg-rose-50 dark:border-rose-900/30 dark:bg-slate-900 dark:text-rose-400 disabled:opacity-50" />
                                  </td>
                                  <td className="p-3">
                                    <input type="number" step="0.01" min="0" placeholder="0" disabled={age < 1} value={bulkData[cycle._id]?.feed_consumed_bags} onChange={e => handleBulkChange(cycle._id, 'feed_consumed_bags', e.target.value)} className="w-full rounded-lg border border-amber-100 bg-amber-50/30 px-2 py-2 text-center text-sm font-black text-amber-700 outline-none focus:border-amber-500 focus:bg-amber-50 dark:border-amber-900/30 dark:bg-slate-900 dark:text-amber-400 disabled:opacity-50" />
                                  </td>
                                  <td className="p-3">
                                    {isLayer ? (
                                      <input type="number" min="0" placeholder="فعلية" disabled={age < 1} value={bulkData[cycle._id]?.egg_trays_produced} onChange={e => handleBulkChange(cycle._id, 'egg_trays_produced', e.target.value)} className="w-full rounded-lg border border-emerald-100 bg-emerald-50/30 px-2 py-2 text-center text-sm font-black text-emerald-700 outline-none focus:border-emerald-500 focus:bg-emerald-50 dark:border-emerald-900/30 dark:bg-slate-900 dark:text-emerald-400 disabled:opacity-50" />
                                    ) : (
                                      <div className="text-center text-[10px] font-bold text-slate-300 dark:text-slate-600">- تسمين -</div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-col gap-1.5">
                                      <select disabled={age < 1} value={bulkData[cycle._id]?.medication_item_id} onChange={e => handleBulkChange(cycle._id, 'medication_item_id', e.target.value)} className="w-full rounded-lg border border-indigo-100 bg-indigo-50/30 px-2 py-1.5 text-[11px] font-bold text-indigo-800 outline-none focus:border-indigo-500 dark:border-indigo-900/30 dark:bg-slate-900 dark:text-indigo-300 disabled:opacity-50">
                                        <option value="">-- بدون أدوية --</option>
                                        {generalItems.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                      </select>
                                      {bulkData[cycle._id]?.medication_item_id && (
                                        <input type="number" step="0.01" min="0" placeholder="الكمية (لتر/كجم)" value={bulkData[cycle._id]?.medication_quantity} onChange={e => handleBulkChange(cycle._id, 'medication_quantity', e.target.value)} className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-center text-[11px] font-black text-indigo-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <input type="text" placeholder="ملاحظات..." disabled={age < 1} value={bulkData[cycle._id]?.notes} onChange={e => handleBulkChange(cycle._id, 'notes', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white disabled:opacity-50" />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </form>
                </div>
                
                <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 rounded-b-3xl">
                  <button type="submit" form="bulkDailyLogForm" disabled={isSubmitting || !globalLogDate} className="flex w-full justify-center items-center rounded-xl bg-indigo-600 py-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-70 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : '🚀 حفظ اليوميات المجمعة وتحديث الأرصدة'}
                  </button>
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyLogs;