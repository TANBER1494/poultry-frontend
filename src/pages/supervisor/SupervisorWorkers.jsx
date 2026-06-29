import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, FileText, Wallet, CheckCircle2, 
  Loader2, X, AlertTriangle, CalendarDays, Tractor, ShieldAlert, Printer
} from 'lucide-react';
import farmService from '../../services/farmService';
import workerService from '../../services/workerService';
import { showAlert } from '../../utils/alert';

const SupervisorWorkers = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD', 
    activeWorker: null,
  });

  const [formData, setFormData] = useState({});

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
          await fetchWorkers(firstFarm, isMounted);
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

  const fetchWorkers = async (farmId, isMounted = true) => {
    try {
      setIsLoading(true);
      const res = await workerService.getWorkers(farmId);
      if (isMounted) setWorkers(res.workers || []);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات العمال');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    await fetchWorkers(newFarmId);
  };

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD', activeWorker: null });
    setFormData({});
    setStatementData(null);
  };

  const openAddWorker = () => {
    setFormData({ name: '', phone: '', national_id: '', base_daily_wage: '' });
    setSheetConfig({ isOpen: true, mode: 'ADD', activeWorker: null });
  };

  const openLogSheet = (worker) => {
    // 🛡️ التواريخ تلقائية الآن، ولا تظهر للمستخدم لإدخالها
    setFormData({ wage_multiplier: '1', notes: '' });
    setSheetConfig({ isOpen: true, mode: 'LOG', activeWorker: worker });
  };

  const openSettleSheet = (worker) => {
    // 🛡️ التواريخ تلقائية الآن
    setFormData({ amount_to_pay: '', notes: '' });
    setSheetConfig({ isOpen: true, mode: 'SETTLE', activeWorker: worker });
  };

  const openStatusSheet = (worker) => {
    setFormData({ status: worker.status });
    setSheetConfig({ isOpen: true, mode: 'STATUS', activeWorker: worker });
  };

  const openStatementSheet = async (worker) => {
    setSheetConfig({ isOpen: true, mode: 'STATEMENT', activeWorker: worker });
    try {
      setIsActionLoading(true);
      const data = await workerService.getWorkerStatement(worker._id);
      setStatementData(data);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب كشف الحساب');
      closeSheet();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);

    try {
      const now = new Date(); // 🛡️ أخذ اللحظة الحالية تلقائياً

      if (sheetConfig.mode === 'ADD') {
        await workerService.addWorker({ ...formData, farm_id: selectedFarmId });
        showAlert.success('تمت الإضافة', 'تم تسجيل العامل بنجاح');
      } 
      else if (sheetConfig.mode === 'LOG') {
        const payload = {
          local_id: `WLOG_${sheetConfig.activeWorker._id}_${Date.now()}`,
          worker_id: sheetConfig.activeWorker._id,
          log_date: now.toISOString(), // 🛡️ إرسال التاريخ الآلي
          wage_multiplier: formData.wage_multiplier,
          notes: formData.notes
        };
        await workerService.recordLog(payload);
        showAlert.success('تم التسجيل', 'تم إثبات الاستثناء اليومي بنجاح');
      } 
      else if (sheetConfig.mode === 'SETTLE') {
        const payload = {
          local_id: `WSET_${sheetConfig.activeWorker._id}_${Date.now()}`,
          worker_id: sheetConfig.activeWorker._id,
          amount_to_pay: formData.amount_to_pay,
          transaction_date: now.toISOString(), // 🛡️ إرسال التاريخ والوقت الآلي
          notes: formData.notes
        };
        await workerService.settleAccount(payload);
        showAlert.success('تم الصرف', 'تم سحب المبلغ وتوثيق السلفة بالوقت الحالي بنجاح');
      }
      else if (sheetConfig.mode === 'STATUS') {
        if (formData.status === 'TERMINATED') {
          if (!window.confirm('هل أنت متأكد من إنهاء عمل هذا العامل؟ سيتم مراجعة مديونيته أولاً.')) {
            setIsActionLoading(false);
            return;
          }
        }
        await workerService.changeStatus(sheetConfig.activeWorker._id, formData.status);
        showAlert.success('تم التحديث', 'تم تغيير حالة العامل بنجاح');
      }

      closeSheet();
      await fetchWorkers(selectedFarmId);
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'تعذر إتمام العملية');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 🖨️ 🛡️ دالة طباعة إيصال المخالصة والتصفية
  const handlePrintSettlement = () => {
    if (!statementData || !sheetConfig.activeWorker) return;

    const worker = sheetConfig.activeWorker;
    const stats = statementData.financial_summary;
    const now = new Date();

    const printContent = `
      <html dir="rtl">
        <head>
          <title>مخالصة وكشف حساب - ${worker.name}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 400px; margin: auto; color: #000; }
            h2 { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; font-size: 18px; margin-bottom: 5px; }
            h3 { text-align: center; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
            .line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
            .total { font-size: 16px; font-weight: 900; }
            .footer { text-align: center; font-size: 12px; margin-top: 30px; line-height: 2; }
            .signature { display: flex; justify-content: space-between; margin-top: 40px; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>إيصال تصفية ومخالصة مالية</h2>
          <h3>نظام إدارة المزارع</h3>
          
          <div class="line"><span>التاريخ:</span> <span>${now.toLocaleDateString('ar-EG')}</span></div>
          <div class="line"><span>الوقت:</span> <span>${now.toLocaleTimeString('ar-EG')}</span></div>
          <div class="divider"></div>
          
          <div class="line"><span>اسم العامل:</span> <span>${worker.name}</span></div>
          <div class="line"><span>اليومية الأساسية:</span> <span>${worker.base_daily_wage} ج.م</span></div>
          <div class="line"><span>حالة العامل الحالية:</span> <span>${worker.status === 'TERMINATED' ? 'تمت التصفية (خروج نهائي)' : worker.status === 'ON_LEAVE' ? 'في إجازة' : 'على قوة العمل'}</span></div>
          <div class="divider"></div>
          
          <div class="line"><span>إجمالي الاستحقاقات (يوميات):</span> <span>${stats.total_earned.toLocaleString()} ج.م</span></div>
          <div class="line"><span>إجمالي المسحوبات (سلف/رواتب):</span> <span>${stats.total_drawn.toLocaleString()} ج.م</span></div>
          <div class="divider"></div>
          
          <div class="line total"><span>الرصيد الصافي (المتبقي):</span> <span>${stats.net_balance.toLocaleString()} ج.م</span></div>
          <div class="divider"></div>
          
          <div class="footer">
            أقر أنا الموقع أدناه بأنني استلمت كافة مستحقاتي المالية المذكورة أعلاه، ولا توجد لي أي مطالبات أخرى طرف المزرعة.
          </div>
          
          <div class="signature">
            <span>توقيع العامل: ...................</span>
            <span>توقيع الإدارة: ...................</span>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const getTimeline = () => {
    if (!statementData) return [];
    const timeline = [];
    if (statementData.logs_history) {
      statementData.logs_history.forEach(log => timeline.push({ ...log, _type: 'LOG', _date: new Date(log.log_date) }));
    }
    if (statementData.transactions_history) {
      statementData.transactions_history.forEach(trx => timeline.push({ ...trx, _type: 'TRX', _date: new Date(trx.transaction_date) }));
    }
    return timeline.sort((a, b) => b._date - a._date);
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">نشط / مقيم</span>;
    if (status === 'ON_LEAVE') return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black">في إجازة</span>;
    return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black">تم تصفيته</span>;
  };

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> إدارة العمال والمقيمين
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">متابعة يوميات العمال، السلفيات، وتصفية الحسابات</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Tractor className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="w-full sm:w-48 rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
          <button onClick={openAddWorker} disabled={farms.length === 0} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 active:scale-95 shadow-sm disabled:opacity-50">
            <UserPlus className="h-5 w-5" /><span className="hidden sm:inline">إضافة عامل جديد</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا يوجد عمال مسجلين</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">قم بإضافة عمال المزرعة للبدء في الإدارة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map(worker => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={worker._id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">{worker.name}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1" dir="ltr">{worker.phone || 'بدون رقم'}</p>
                  </div>
                  {getStatusBadge(worker.status)}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-4">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                    <span>اليومية الأساسية:</span>
                    <span>{worker.base_daily_wage} ج.م</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button onClick={() => openLogSheet(worker)} disabled={worker.status === 'TERMINATED'} className="col-span-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-1.5 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-400 disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4"/> تعديل استحقاق اليوم (استثناء)
                </button>
                <button onClick={() => openSettleSheet(worker)} disabled={worker.status === 'TERMINATED'} className="py-2.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-1.5 dark:bg-slate-800 dark:hover:bg-indigo-900/30 dark:text-indigo-400 disabled:opacity-50">
                  <Wallet className="w-4 h-4"/> صرف سلفة/راتب
                </button>
                <button onClick={() => openStatementSheet(worker)} className="py-2.5 bg-slate-50 hover:bg-emerald-50 text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-1.5 dark:bg-slate-800 dark:hover:bg-emerald-900/30 dark:text-emerald-400">
                  <FileText className="w-4 h-4"/> كشف الحساب
                </button>
                <button onClick={() => openStatusSheet(worker)} className="col-span-2 mt-1 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors font-bold text-[10px] underline">
                  تغيير حالة العامل (إجازة / تصفية)
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* FORM MODAL (Bottom Sheet) */}
      <AnimatePresence>
        {sheetConfig.isOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={closeSheet} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      {sheetConfig.mode === 'ADD' ? 'تسجيل عامل جديد' : 
                       sheetConfig.mode === 'LOG' ? `تسجيل استثناء ليومية: ${sheetConfig.activeWorker?.name}` :
                       sheetConfig.mode === 'SETTLE' ? `صرف مالي: ${sheetConfig.activeWorker?.name}` :
                       sheetConfig.mode === 'STATUS' ? `حالة العامل: ${sheetConfig.activeWorker?.name}` :
                       `كشف حساب: ${sheetConfig.activeWorker?.name}`}
                    </h3>
                  </div>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  
                  {sheetConfig.mode === 'ADD' && (
                    <form id="workerForm" onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اسم العامل ثلاثي *</label>
                        <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اليومية الأساسية (ج.م) *</label>
                          <input type="number" min="0" value={formData.base_daily_wage} onChange={e => setFormData(p => ({...p, base_daily_wage: e.target.value}))} className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-700 outline-none focus:border-amber-500 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-400" required />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">رقم الهاتف</label>
                          <input type="tel" dir="ltr" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الرقم القومي (اختياري)</label>
                        <input type="text" dir="ltr" maxLength="14" value={formData.national_id} onChange={e => setFormData(p => ({...p, national_id: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                    </form>
                  )}

                  {sheetConfig.mode === 'LOG' && (
                    <form id="workerForm" onSubmit={handleSubmit} className="space-y-5">
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-400">تاريخ المعاملة الآلي:</span>
                        <span className="text-sm font-black text-amber-600">{new Date().toLocaleDateString('ar-EG')}</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs font-bold text-slate-500 border border-slate-100 dark:border-slate-700">
                        ملاحظة: النظام سيعتبر التقييم المختار هو الساري لهذا اليوم.
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">تقييم اليوم (الاستحقاق) *</label>
                        <select value={formData.wage_multiplier} onChange={e => setFormData(p => ({...p, wage_multiplier: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required>
                          <option value="1">حاضر (يستحق يومية كاملة)</option>
                          <option value="0">غائب / مريض (لا يستحق أجر)</option>
                          <option value="0.5">نصف يوم (يستحق نصف أجر)</option>
                          <option value="1.5">وقت إضافي / مكافأة (يستحق يومية ونصف)</option>
                          <option value="2">مجهود مضاعف (يستحق يوميتين)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-2">المبلغ الفعلي للاستحقاق: <strong className="text-emerald-600">{(sheetConfig.activeWorker.base_daily_wage * Number(formData.wage_multiplier)).toFixed(2)} ج.م</strong></p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">السبب / ملاحظات</label>
                        <input type="text" placeholder="اكتب سبب التعديل (مثل: غياب مرضي)..." value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                    </form>
                  )}

                  {sheetConfig.mode === 'SETTLE' && (
                    <form id="workerForm" onSubmit={handleSubmit} className="space-y-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 leading-relaxed">
                          أي مبلغ يتم إدخاله هنا سيتم سحبه من الخزينة بالوقت الحالي وتسجيله كـ (مسحوبات) على العامل.
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">المبلغ المنصرف (ج.م) *</label>
                        <input type="number" min="1" value={formData.amount_to_pay} onChange={e => setFormData(p => ({...p, amount_to_pay: e.target.value}))} className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-lg font-black text-rose-700 outline-none focus:border-rose-500 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400" required />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">البيان / ملاحظات</label>
                        <input type="text" placeholder="مثال: سلفة أسبوعية، أو تصفية حساب..." value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                    </form>
                  )}

                  {sheetConfig.mode === 'STATUS' && (
                    <form id="workerForm" onSubmit={handleSubmit} className="space-y-5">
                       <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الحالة الجديدة *</label>
                        <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required>
                          <option value="ACTIVE">نشط (مقيم بالمزرعة ويعمل)</option>
                          <option value="ON_LEAVE">إجازة مؤقتة (مفتوحة)</option>
                          <option value="TERMINATED">تصفية وإنهاء العمل (خروج نهائي)</option>
                        </select>
                      </div>
                      {formData.status === 'TERMINATED' && (
                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs font-bold flex gap-2 dark:bg-rose-900/20 dark:border-rose-900/50 dark:text-rose-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          تنبيه: سيتم مراجعة المديونيات. يُنصح بطباعة "إيصال التصفية" من كشف الحساب وتسليمه للعامل.
                        </div>
                      )}
                    </form>
                  )}

                  {sheetConfig.mode === 'STATEMENT' && (
                    <div>
                      {isActionLoading || !statementData ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
                      ) : (
                        <div className="space-y-6">
                           {/* بطاقة الرصيد النهائي المجمعة */}
                           <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl shadow-inner text-white flex flex-col gap-4">
                              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 mb-1">الرصيد الصافي (المتبقي للعامل)</p>
                                  <h2 className="text-3xl font-black text-amber-400">{statementData.financial_summary.net_balance.toLocaleString()} <span className="text-sm font-normal text-slate-300">ج.م</span></h2>
                                </div>
                                <div className="text-left text-xs font-bold space-y-1">
                                  <p className="text-emerald-400">استحقاق: {statementData.financial_summary.total_earned.toLocaleString()}</p>
                                  <p className="text-rose-400">مسحوبات: {statementData.financial_summary.total_drawn.toLocaleString()}</p>
                                </div>
                              </div>
                              <button onClick={handlePrintSettlement} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl flex justify-center items-center gap-2 font-bold text-sm transition-colors">
                                <Printer className="w-4 h-4"/> طباعة إيصال مخالصة وتصفية
                              </button>
                           </div>

                           {/* التايم لاين المدمج */}
                           <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">السجل التاريخي (استحقاقات ومسحوبات)</h4>
                              {getTimeline().length === 0 ? (
                                 <div className="text-center py-6 text-slate-500 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 rounded-xl">لا توجد حركات مسجلة</div>
                              ) : (
                                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                                  {getTimeline().map((item, idx) => {
                                    const isLog = item._type === 'LOG';
                                    return (
                                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                          {isLog ? <CheckCircle2 className={`w-4 h-4 ${item.wage_multiplier > 0 ? 'text-emerald-500' : 'text-slate-400'}`} /> : <Wallet className="w-4 h-4 text-rose-500" />}
                                        </div>
                                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isLog ? (item.wage_multiplier > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600') : 'bg-rose-50 text-rose-600'}`}>
                                              {isLog ? (item.wage_multiplier > 0 ? `استحقاق يومية (${item.wage_multiplier})` : 'خصم أجر') : 'سحب سلفة/راتب'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400"><CalendarDays className="w-3 h-3 inline"/> {item._date.toLocaleDateString('ar-EG')} - {item._date.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                          </div>
                                          <div className="mt-2">
                                            {isLog ? (
                                              <>
                                                {item.wage_multiplier > 0 && <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{item.earned_amount} ج.م</p>}
                                                {item.notes && <p className="text-[10px] font-bold text-slate-500 mt-1">ملاحظات: {item.notes}</p>}
                                              </>
                                            ) : (
                                              <>
                                                <p className="text-sm font-black text-rose-600 dark:text-rose-400">-{item.amount} ج.م</p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">{item.notes || item.reference_doc}</p>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {sheetConfig.mode !== 'STATEMENT' && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                    <button type="submit" form="workerForm" disabled={isActionLoading} className="flex w-full justify-center items-center rounded-xl bg-amber-600 py-3.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-70 shadow-md shadow-amber-600/20">
                      {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد وحفظ التغييرات'}
                    </button>
                  </div>
                )}

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupervisorWorkers;