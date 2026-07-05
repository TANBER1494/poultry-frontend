import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Loader2,
  CalendarDays,
  Bird,
  TrendingDown,
  Activity,
  ShieldCheck,
  Home,
  FileText,
  AlertOctagon,
  Hourglass,
  Tractor,
  Package,
  Printer,
  User,
  Banknote
} from 'lucide-react';
import cycleService from '../../services/cycleService';
import dailyLogService from '../../services/dailyLogService';
import { showAlert } from '../../utils/alert';

const CycleDetails = () => {
  const { farmId, cycleId } = useParams();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  useEffect(() => {
    fetchCycleData();
  }, [cycleId]);

  const fetchCycleData = async () => {
    try {
      setIsLoading(true);

      const cycleData = await cycleService.getCycleDetails(cycleId);
      setCycle(cycleData);

      try {
        const logsData = await dailyLogService.getCycleDailyLogs(
          cycleId,
          farmId
        );
        setLogs(logsData.logs || []);
      } catch (logErr) {
        setLogs([]);
      }

    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب تفاصيل الدورة');
      navigate(`/owner/farms/${farmId}/cycles`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> دورة نشطة
          </span>
        );
      case 'CLOSED':
        return (
          <span className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> مغلقة محاسبياً
          </span>
        );
      case 'PREPARATION':
        return (
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4" /> قيد التجهيز
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount || 0);

  const calculateAge = (startDate, endDate, status) => {
    const start = new Date(startDate);
    const end = status === 'CLOSED' && endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handlePrintLogs = () => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>يوميات دورة ${cycle.name}</title>
          <style>
            body { font-family: 'Tahoma', Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; text-align: right; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #4f46e5; color: white; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>سجل المتابعة اليومي والإنتاج</h2>
            <h3>دورة: ${cycle.name} | العنبر: ${cycle.barn_id?.name}</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>التاريخ (العمر)</th>
                <th>النافق</th>
                <th>علف (شكاير)</th>
                ${cycle.type === 'LAYER' ? '<th>إنتاج (أطباق)</th>' : ''}
                <th>أدوية ومستلزمات</th>
                <th>المشرف</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${logs
                .map((log) => {
                  const meds = (log.consumed_medications || []).map(m => `${m.name} (${m.quantity})`).join('، ');
                  return `
                    <tr>
                      <td>${new Date(log.log_date).toLocaleDateString('ar-EG')} (عمر ${log.age_in_days} يوم)</td>
                      <td style="color: red; font-weight: bold;">${log.mortality_count || 0}</td>
                      <td>${log.feed_consumed_bags || 0}</td>
                      ${cycle.type === 'LAYER' ? `<td>${log.egg_trays_produced || 0}</td>` : ''}
                      <td>${meds || '-'}</td>
                      <td>${log.recorded_by?.name || 'غير محدد'}</td>
                      <td>${log.notes || '-'}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
          </table>
          <div class="footer"><p>نظام إدارة المزارع - تقرير الاستهلاك والإنتاج</p></div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!cycle) return null;

  const initialBirds = cycle.initial_bird_count || 0;
  const currentBirds = cycle.current_bird_count || 0;
  const deadBirds = cycle.total_dead_birds || 0;
  const totalExpenses = cycle.total_expenses || 0;
  
  // 🚀 تجميع الإنتاج الكلي من اليوميات بدلاً من الاعتماد على المبيعات
  const totalProducedEggs = logs.reduce((sum, log) => sum + (Number(log.egg_trays_produced) || 0), 0);

  const mortalityRate = initialBirds > 0 ? ((deadBirds / initialBirds) * 100).toFixed(2) : 0;
  const cycleAge = calculateAge(cycle.start_date, cycle.end_date, cycle.status);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/owner/farms/${farmId}/cycles`)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              {cycle.name}
              {getStatusBadge(cycle.status)}
              {cycle.type === 'LAYER' && (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-black">
                  بياض
                </span>
              )}
            </h1>
            <div className="flex items-center flex-wrap gap-3 text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <Tractor className="w-4 h-4 text-slate-400" />{' '}
                {cycle.farm_id?.name || 'مزرعة غير محددة'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Home className="w-4 h-4 text-emerald-500" />{' '}
                {cycle.barn_id?.name || 'عنبر غير محدد'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-500" /> استلام:{' '}
                {new Date(cycle.start_date).toLocaleDateString('ar-EG')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                <Hourglass className="w-3.5 h-3.5" /> العمر: {cycleAge} يوم
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'OVERVIEW' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          نظرة عامة وإحصائيات
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'LOGS' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          الاستهلاك واليوميات
        </button>
      </div>

      {activeTab === 'OVERVIEW' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* الكارت الأول: الطيور الحية */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <Bird className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">العدد الافتتاحي</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">{initialBirds.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-500">الرصيد الحي الحالي</p>
                  <p className="text-base font-black text-slate-700 dark:text-slate-200">{currentBirds.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* الكارت الثاني: النافق */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">الطيور النافقة (خسارة)</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">{deadBirds.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/20">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">معدل النفوق العام:</span>
                <span className="text-lg font-black text-rose-700 dark:text-rose-400">{mortalityRate}%</span>
              </div>
            </div>

            {/* الكارت الثالث: التكلفة الإجمالية */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي التكاليف (علف وأدوية)</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(totalExpenses)}</h3>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 text-center">التكلفة التراكمية منذ بدء الدورة</p>
              </div>
            </div>

            {/* الكارت الرابع: الإنتاج (للبياض فقط) */}
            {cycle.type === 'LAYER' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي البيض المنتج</p>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {totalProducedEggs.toLocaleString()} <span className="text-sm text-slate-400 font-bold">طبق</span>
                    </h3>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 text-center">إجمالي ما تم إنتاجه وتوريده للمخزن</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'LOGS' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <FileText className="w-4 h-4 text-indigo-500" /> سجل الاستهلاك والإنتاج اليومي
              </h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">تم تسجيل {logs.length} يومية</p>
            </div>
            <button onClick={handlePrintLogs} disabled={logs.length === 0} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50">
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">طباعة السجل</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-black text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-4">التاريخ (العمر)</th>
                  <th className="p-4 text-rose-500">النافق</th>
                  <th className="p-4 text-amber-600">العلف (شكاير)</th>
                  {cycle.type === 'LAYER' && <th className="p-4 text-emerald-600">الإنتاج (طبق)</th>}
                  <th className="p-4 text-indigo-500">أدوية ومستلزمات</th>
                  <th className="p-4">بواسطة</th>
                  <th className="p-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const meds = (log.consumed_medications || []).map(m => `${m.name} (${m.quantity})`).join('، ');
                    return (
                      <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="w-4 h-4 text-slate-400" /> {new Date(log.log_date).toLocaleDateString('ar-EG')}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">عمر {log.age_in_days} يوم</span>
                          </div>
                        </td>
                        <td className="p-4 font-black text-rose-600 dark:text-rose-400">{log.mortality_count || '-'}</td>
                        <td className="p-4 font-black text-amber-600 dark:text-amber-500">{log.feed_consumed_bags || '-'}</td>
                        {cycle.type === 'LAYER' && (
                          <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">{log.egg_trays_produced || '-'}</td>
                        )}
                        <td className="p-4">
                          {log.consumed_medications && log.consumed_medications.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.consumed_medications.map((med, i) => (
                                <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                  {med.name} ({med.quantity})
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="p-4 text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-2">
                          <User className="w-3 h-3" /> {log.recorded_by?.name || 'غير محدد'}
                        </td>
                        <td className="p-4 text-[11px] text-slate-500 truncate max-w-[150px]" title={log.notes}>
                          {log.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={cycle.type === 'LAYER' ? 7 : 6} className="p-8 text-center text-slate-500 font-bold">
                      لا توجد يوميات مسجلة لهذه الدورة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CycleDetails;