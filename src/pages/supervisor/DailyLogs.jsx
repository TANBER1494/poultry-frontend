import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Loader2, ClipboardList, Activity, Package, 
  Droplets, Bird, CalendarDays, TrendingDown, Wheat, Table, ChevronDown, ChevronUp, Search, AlertTriangle
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
  
  const [logsByDate, setLogsByDate] = useState({});
  const [expandedDates, setExpandedDates] = useState([]); 
  const [searchDate, setSearchDate] = useState(''); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(isNewAction);

  const [formData, setFormData] = useState({
    cycle_id: '',
    log_date: new Date().toISOString().split('T')[0],
    mortality_count: '', 
    feed_item_id: '', feed_consumed_bags: '', 
    water_consumed_liters: '',
    egg_trays_produced: '', 
    average_weight_grams: '', medications_given: '', notes: ''
  });

  const [calculatedAge, setCalculatedAge] = useState(0);

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
        setActiveCycles(active);
        
        const feeds = (inventoryRes.items || []).filter(item => item.category === 'FEED');
        setFeedItems(feeds);

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
        cycleLogs.forEach(log => {
          combined.push({ ...log, cycleDetails: cycleInfo });
        });
      });

      const grouped = combined.reduce((acc, log) => {
        const d = new Date(log.log_date).toISOString().split('T')[0];
        if(!acc[d]) acc[d] = [];
        acc[d].push(log);
        return acc;
      }, {});

      setLogsByDate(grouped);
      
      const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
      if (sortedDates.length > 0) {
        setExpandedDates([sortedDates[0]]);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب السجلات اليومية');
    } finally {
      setIsLogsLoading(false);
    }
  };

  const toggleDateAccordion = (dateStr) => {
    setExpandedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  useEffect(() => {
    if (formData.cycle_id && formData.log_date) {
      const selectedCycle = activeCycles.find(c => c._id === formData.cycle_id);
      if (selectedCycle) {
        const logDate = new Date(formData.log_date);
        const startDate = new Date(selectedCycle.start_date);
        logDate.setHours(0,0,0,0);
        startDate.setHours(0,0,0,0);
        const diffTime = logDate - startDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCalculatedAge(diffDays);
      }
    } else {
      setCalculatedAge(0);
    }
  }, [formData.cycle_id, formData.log_date, activeCycles]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cycle_id) return showAlert.error('خطأ', 'يجب تحديد العنبر/الدورة');
    if (calculatedAge < 1) return showAlert.error('تاريخ غير صالح', 'لا يمكن تسجيل يومية لتاريخ يسبق استلام الدورة');

    const hasFeed = Number(formData.feed_consumed_bags) > 0;
    if (hasFeed && !formData.feed_item_id) return showAlert.error('بيانات ناقصة', 'يجب تحديد نوع العلف لتسجيل الاستهلاك');

    try {
      setIsSubmitting(true);
      const selectedCycle = activeCycles.find(c => c._id === formData.cycle_id);
      
      const payload = {
        ...formData,
        local_id: `LOG_${formData.cycle_id}_${Date.now()}`,
        farm_id: selectedFarmId,
        barn_id: selectedCycle.barn_id._id,
        age_in_days: calculatedAge,
        culled_count: 0,
        feed_consumed_kg: 0,
        loose_eggs_produced: 0,
        broken_eggs: 0
      };

      await dailyLogService.createDailyLog(payload);
      showAlert.success('تم التسجيل', 'تم حفظ اليومية بنجاح وتحديث الأرصدة');
      setIsFormOpen(false);
      
      setFormData(p => ({
        ...p, cycle_id: '', mortality_count: '', feed_consumed_bags: '', water_consumed_liters: '',
        egg_trays_produced: '', average_weight_grams: '', medications_given: '', notes: ''
      }));
      
      await fetchDependencies(selectedFarmId); // إعادة الجلب بالكامل لتحديث حالة السلف (pending_pulls)
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل تسجيل اليومية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedAndFilteredDates = Object.keys(logsByDate)
    .filter(date => searchDate === '' || date === searchDate)
    .sort((a, b) => new Date(b) - new Date(a));

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  const getCycleTypeLabel = (type) => type === 'LAYER' ? 'بياض' : 'تسمين';

  // 🚀 مراقبة السلفة للعنبر المختار
  const activeSelectedCycle = activeCycles.find(c => c._id === formData.cycle_id);
  const pendingEggPulls = activeSelectedCycle?.pending_egg_pulls || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
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

          <button onClick={() => setIsFormOpen(true)} disabled={activeCycles.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-5 w-5" /><span className="hidden sm:inline">يومية عنبر</span>
          </button>
        </div>
      </div>

      {isLoading || isLogsLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
      ) : activeCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Activity className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد دورات نشطة</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">قم ببدء دورة إنتاجية من حساب المالك أولاً لتتمكن من تسجيل يومياتها.</p>
        </div>
      ) : sortedAndFilteredDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد سجلات</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 mb-4">لم يتم تسجيل أي يومية {searchDate && 'في هذا التاريخ'}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAndFilteredDates.map(dateStr => {
            const isExpanded = expandedDates.includes(dateStr);
            const dayLogs = logsByDate[dateStr];
            
            return (
              <div key={dateStr} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                <button onClick={() => toggleDateAccordion(dateStr)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 p-2 rounded-lg">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h3 className="font-black text-slate-800 dark:text-white text-base">{new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">تم تسجيل {dayLogs.length} عنابر في هذا اليوم</p>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-800">
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="p-4 rounded-tr-lg">العنبر / الدورة</th>
                              <th className="p-4">العمر</th>
                              <th className="p-4 text-rose-500">النافق</th>
                              <th className="p-4 text-amber-600">علف (شكاير)</th>
                              <th className="p-4 text-cyan-600">مياه (لتر)</th>
                              <th className="p-4 text-emerald-600">الإنتاج الكلي (أطباق)</th>
                              <th className="p-4 rounded-tl-lg max-w-[200px]">أدوية وملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dayLogs.map(log => (
                              <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-4">
                                  <div className="font-black text-slate-800 dark:text-white">{log.cycleDetails?.barn_id?.name || 'غير معروف'}</div>
                                  <div className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 w-fit px-1.5 py-0.5 rounded mt-1">{getCycleTypeLabel(log.cycleDetails?.type)}</div>
                                </td>
                                <td className="p-4 font-black">{log.age_in_days} <span className="text-[10px] font-normal text-slate-400">يوم</span></td>
                                <td className="p-4 font-black text-rose-600 dark:text-rose-400">{log.mortality_count || '-'}</td>
                                <td className="p-4 font-black text-amber-600 dark:text-amber-500">{log.feed_consumed_bags || '-'}</td>
                                <td className="p-4 font-black text-cyan-600 dark:text-cyan-500">{log.water_consumed_liters || '-'}</td>
                                <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">{log.cycleDetails?.type === 'LAYER' ? (log.egg_trays_produced || '-') : 'N/A'}</td>
                                <td className="p-4 text-xs font-medium text-slate-500 truncate max-w-[200px]" title={log.medications_given || log.notes}>{log.medications_given || log.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="lg:hidden p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900">
                        {dayLogs.map(log => (
                          <div key={log._id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                              <div>
                                <h4 className="font-black text-slate-800 dark:text-white">{log.cycleDetails?.barn_id?.name}</h4>
                                <span className="text-[10px] font-bold text-slate-500">{getCycleTypeLabel(log.cycleDetails?.type)}</span>
                              </div>
                              <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">
                                عمر {log.age_in_days}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg text-rose-600 dark:text-rose-400">
                                <span className="text-[10px] font-bold">النافق</span>
                                <span className="font-black">{log.mortality_count || '-'}</span>
                              </div>
                              <div className="flex justify-between bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg text-amber-600 dark:text-amber-500">
                                <span className="text-[10px] font-bold">علف (شكاير)</span>
                                <span className="font-black">{log.feed_consumed_bags || '-'}</span>
                              </div>
                              {log.cycleDetails?.type === 'LAYER' && (
                                <div className="flex justify-between bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 col-span-2">
                                  <span className="text-[10px] font-bold">إنتاج كلي (أطباق)</span>
                                  <span className="font-black">{log.egg_trays_produced || '-'}</span>
                                </div>
                              )}
                              {(log.medications_given || log.notes) && (
                                <div className="col-span-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg mt-1">
                                  <span className="font-bold">ملاحظات:</span> {log.medications_given} {log.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setIsFormOpen(false)} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">إدخال يومية عنبر</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">تحديث مباشر للأرصدة والمخازن</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="dailyLogForm" onSubmit={handleFormSubmit} className="space-y-6">
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اختر العنبر / الدورة *</label>
                        <select value={formData.cycle_id} onChange={e => setFormData(p => ({...p, cycle_id: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-indigo-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400" required>
                          <option value="">-- يرجى تحديد العنبر لتسجيل يوميته --</option>
                          {activeCycles.map(c => <option key={c._id} value={c._id}>{c.name} ({c.barn_id?.name}) - {getCycleTypeLabel(c.type)}</option>)}
                        </select>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="w-1/2 pr-2">
                          <label className="mb-1.5 block text-[11px] font-bold text-slate-500">تاريخ اليومية *</label>
                          <input type="date" value={formData.log_date} onChange={e => setFormData(p => ({...p, log_date: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required />
                        </div>
                        <div className="w-1/2 border-r border-slate-200 dark:border-slate-700 pl-4 text-center">
                          <p className="text-[11px] font-bold text-slate-500 mb-1">عمر القطيع المحسوب</p>
                          <p className={`text-2xl font-black ${calculatedAge < 1 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>{calculatedAge} <span className="text-xs font-bold text-slate-400">يوم</span></p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 font-black text-sm text-rose-600 dark:text-rose-400 mb-3"><TrendingDown className="w-4 h-4"/> الحيوية والنافق</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" min="0" placeholder="عدد النافق اليوم" value={formData.mortality_count} onChange={e => setFormData(p => ({...p, mortality_count: e.target.value}))} className="w-full rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5 text-sm font-bold outline-none focus:border-rose-500 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400" />
                        <input type="number" min="0" placeholder="متوسط الوزن (جرام) - إن وُجد" value={formData.average_weight_grams} onChange={e => setFormData(p => ({...p, average_weight_grams: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 font-black text-sm text-amber-600 dark:text-amber-500 mb-3"><Wheat className="w-4 h-4"/> استهلاك العلف (يسحب من المخزن)</h4>
                      <div className="space-y-3">
                        <select value={formData.feed_item_id} onChange={e => setFormData(p => ({...p, feed_item_id: e.target.value}))} className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                          <option value="">-- اختر نوع العلف المستهلك --</option>
                          {feedItems.map(f => <option key={f._id} value={f._id}>{f.name} (المتاح: {f.stock_quantity} {f.unit})</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" step="0.01" min="0" placeholder="العلف (عدد الشكاير)" value={formData.feed_consumed_bags} onChange={e => setFormData(p => ({...p, feed_consumed_bags: e.target.value}))} className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                          <div className="relative">
                            <Droplets className="absolute right-3 top-2.5 h-4 w-4 text-cyan-500" />
                            <input type="number" min="0" placeholder="استهلاك المياه (لتر) - اختياري" value={formData.water_consumed_liters} onChange={e => setFormData(p => ({...p, water_consumed_liters: e.target.value}))} className="w-full rounded-xl border border-cyan-100 bg-white pl-3 pr-9 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* الإنتاج (للبياض  تنبيه السلفة الذكي */}
                    {activeSelectedCycle?.type === 'LAYER' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <h4 className="flex items-center gap-2 font-black text-sm text-emerald-700 dark:text-emerald-400 mb-3"><Package className="w-4 h-4"/> إنتاج البيض اليومي</h4>
                        
                        {/* 🚀 ظهور رسالة التنبيه إذا كان هناك سحب مقدم */}
                        <AnimatePresence>
                          {pendingEggPulls > 0 && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300 p-3 rounded-xl flex gap-3 items-start">
                              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-black mb-1">تسوية آلية معلقة (سلفة مبيعات)</p>
                                <p className="text-xs font-bold leading-relaxed">
                                  تم سحب <span className="font-black bg-amber-200 dark:bg-amber-800 px-1 rounded mx-1">({pendingEggPulls} طبق)</span> من هذا العنبر لتغطية مبيعات سابقة اليوم. 
                                  <br/>يرجى إدخال <span className="underline">البيض المتبقي أمامك الآن فقط</span> وسيقوم النظام بالجمع الآلي.
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="w-full">
                          <label className="mb-1 block text-[11px] font-bold text-emerald-600 dark:text-emerald-500">أطباق سليمة (كرتونة) موجودة فعلياً</label>
                          <input type="number" min="0" placeholder="عدد أطباق البيض الفعلية المتوفرة الآن" value={formData.egg_trays_produced} onChange={e => setFormData(p => ({...p, egg_trays_produced: e.target.value}))} className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-black text-emerald-900 outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-slate-900 dark:text-white" />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-3">
                      <input type="text" placeholder="الأدوية أو التحصينات (إن وجدت)" value={formData.medications_given} onChange={e => setFormData(p => ({...p, medications_given: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                      <textarea rows="2" placeholder="ملاحظات إضافية..." value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-none"></textarea>
                    </div>

                  </form>
                </div>
                
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                  <button type="submit" form="dailyLogForm" disabled={isSubmitting || calculatedAge < 1 || !formData.cycle_id} className="flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70 shadow-md shadow-indigo-600/20">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ اليومية وتحديث المخزن'}
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