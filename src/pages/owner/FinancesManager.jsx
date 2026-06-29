import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  Receipt,
  PlusCircle,
  Loader2,
  Tractor,
  CalendarDays,
  Filter,
  Printer,
} from 'lucide-react';
import farmService from '../../services/farmService';
import transactionService from '../../services/transactionService';
import { showAlert } from '../../utils/alert';

const CATEGORY_TRANSLATIONS = {
  EGG_SALE: 'مبيعات بيض',
  BIRD_SALE: 'مبيعات طيور',
  MANURE_SALE: 'مبيعات سباخ',
  OWNER_DEPOSIT: 'إيداع رأس مال',
  OTHER_REVENUE: 'إيرادات أخرى',
  FEED_PURCHASE: 'مشتريات أعلاف',
  MED_PURCHASE: 'مشتريات أدوية',
  CHICK_PURCHASE: 'مشتريات كتاكيت',
  WORKER_ADVANCE: 'سلفة عامل',
  WORKER_SALARY: 'راتب عامل',
  MAINTENANCE: 'صيانة وإصلاحات',
  TRANSPORTATION: 'نقل ونولون',
  OTHER_EXPENSE: 'مصروفات أخرى',
};

const FinancesManager = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  const [activeTab, setActiveTab] = useState('SUMMARY');

  const [balance, setBalance] = useState({
    total_in: 0,
    total_out: 0,
    net_balance: 0,
  });
  const [transactions, setTransactions] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'OUT',
    category: 'OTHER_EXPENSE',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

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
          await fetchFinancialData(firstFarm, isMounted);
        } else {
          if (isMounted) setIsLoading(false);
        }
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب البيانات الأساسية');
        if (isMounted) setIsLoading(false);
      }
    };
    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchFinancialData = async (farmId, isMounted = true) => {
    try {
      setIsLoading(true);
      const [balanceRes, transRes] = await Promise.all([
        transactionService.getTreasuryBalance(farmId),
        transactionService.getTransactions(farmId),
      ]);

      if (isMounted) {
        setBalance(balanceRes);
        setTransactions(transRes.transactions || []);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب البيانات المالية');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    await fetchFinancialData(newFarmId);
  };

  const handleManualTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        local_id: `MANUAL_TRX_${Date.now()}`,
        farm_id: selectedFarmId,
      };

      await transactionService.createTransaction(payload);
      showAlert.success('تم التسجيل', 'تم إضافة القيد المالي للخزينة بنجاح');

      setFormData({
        type: 'OUT',
        category: 'OTHER_EXPENSE',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setActiveTab('LEDGER');
      await fetchFinancialData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل التسجيل',
        error.response?.data?.message || 'تأكد من صحة البيانات المدخلة'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  //  دالة طباعة دفتر الأستاذ (كشف الخزينة)
  const handlePrintLedger = () => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>(كشف الخزينة)</title>
          <style>
            body { font-family: 'Tahoma', Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 20px; font-weight: bold; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
            .summary div { text-align: center; }
            table { w-full; width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
            th { background-color: #4f46e5; color: white; }
            .in { color: #059669; font-weight: bold; }
            .out { color: #e11d48; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>كشف حساب الخزينة العام</h2>
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
          
          <div class="summary">
            <div><span style="color:#666; font-size:12px; display:block;">إجمالي المقبوضات</span> <span class="in">${balance.total_in.toLocaleString()} ج.م</span></div>
            <div><span style="color:#666; font-size:12px; display:block;">إجمالي المدفوعات</span> <span class="out">${balance.total_out.toLocaleString()} ج.م</span></div>
            <div><span style="color:#666; font-size:12px; display:block;">الرصيد الصافي</span> <span>${balance.net_balance.toLocaleString()} ج.م</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>رقم القيد</th>
                <th>النوع</th>
                <th>التصنيف</th>
                <th>المبلغ (ج.م)</th>
                <th>البيان والملاحظات</th>
                <th>المستخدم</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map(
                  (trx) => `
                <tr>
                  <td>${new Date(trx.transaction_date).toLocaleDateString('ar-EG')}</td>
                  <td dir="ltr">#${trx.local_id.split('_').pop()}</td>
                  <td class="${trx.type === 'IN' ? 'in' : 'out'}">${trx.type === 'IN' ? 'إيراد' : 'مصروف'}</td>
                  <td>${CATEGORY_TRANSLATIONS[trx.category] || trx.category}</td>
                  <td class="${trx.type === 'IN' ? 'in' : 'out'}">${trx.amount.toLocaleString()}</td>
                  <td>${trx.reference_doc ? `<strong>${trx.reference_doc}</strong><br>` : ''}${trx.notes || '-'}</td>
                  <td>${trx.performed_by?.name || 'النظام'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>هذا التقرير مستخرج آلياً من نظام إدارة المزارع ولا يحتاج لتوقيع.</p>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Header & Farm Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-500" /> إدارة الخزينة
            والماليات
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
            مراقبة السيولة وإدخال المصروفات
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Tractor className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <select
            value={selectedFarmId}
            onChange={handleFarmChange}
            disabled={isLoading || farms.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {farms.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : farms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Landmark className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">
            لا توجد مزارع مسجلة
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-500">
            قم بإنشاء مزرعة أولاً للبدء في إدارة حساباتها.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs Navigation (Responsive Scrollable) */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar touch-pan-x snap-x">
            <button
              onClick={() => setActiveTab('SUMMARY')}
              className={`snap-center flex-shrink-0 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'SUMMARY' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <Wallet className="w-4 h-4" /> ملخص الخزينة
            </button>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`snap-center flex-shrink-0 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'LEDGER' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <Receipt className="w-4 h-4" /> السجل التفصيلي
            </button>
            <button
              onClick={() => setActiveTab('ADD')}
              className={`snap-center flex-shrink-0 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ADD' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <PlusCircle className="w-4 h-4" /> قيد يدوي
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {/* 1. تبويب ملخص الخزينة */}
            {activeTab === 'SUMMARY' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
              >
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 sm:p-6 rounded-3xl flex flex-col justify-center items-center text-center shadow-sm">
                  <div className="p-3 bg-white dark:bg-slate-800 text-emerald-500 rounded-2xl mb-3 shadow-sm">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                    المقبوضات (IN)
                  </h3>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                    {balance.total_in.toLocaleString()}{' '}
                    <span className="text-xs font-normal">ج.م</span>
                  </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-5 sm:p-6 rounded-3xl flex flex-col justify-center items-center text-center shadow-sm">
                  <div className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-2xl mb-3 shadow-sm">
                    <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                    المدفوعات (OUT)
                  </h3>
                  <p className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400">
                    {balance.total_out.toLocaleString()}{' '}
                    <span className="text-xs font-normal">ج.م</span>
                  </p>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-950 dark:to-slate-900 border border-slate-700 p-5 sm:p-6 rounded-3xl flex flex-col justify-center items-center text-center shadow-lg text-white relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
                  <div className="p-3 bg-slate-800 text-amber-400 rounded-2xl mb-3 shadow-inner relative z-10">
                    <Wallet className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-300 mb-1 relative z-10">
                    الرصيد الفعلي
                  </h3>
                  <p
                    className={`text-3xl sm:text-4xl font-black relative z-10 ${balance.net_balance >= 0 ? 'text-white' : 'text-rose-400'}`}
                  >
                    {balance.net_balance.toLocaleString()}{' '}
                    <span className="text-xs font-normal">ج.م</span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* 2. تبويب دفتر الأستاذ (Responsive Cards for Mobile, Table for Desktop) */}
            {activeTab === 'LEDGER' && (
              <motion.div
                key="ledger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                      <Filter className="w-4 h-4 text-indigo-500" /> السجل
                      التفصيلي
                    </h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">
                      يحتوي على {transactions.length} حركة
                    </p>
                  </div>
                  {/* 🖨️ زر الطباعة المضاف */}
                  <button
                    onClick={handlePrintLedger}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />{' '}
                    <span className="hidden sm:inline">طباعة الكشف</span>
                  </button>
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="p-4">التاريخ</th>
                        <th className="p-4">المبلغ والنوع</th>
                        <th className="p-4">التصنيف المحاسبي</th>
                        <th className="p-4">رقم القيد</th>
                        <th className="p-4">ملاحظات ووثائق</th>
                        <th className="p-4">بواسطة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transactions.length > 0 ? (
                        transactions.map((trx) => (
                          <tr
                            key={trx._id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-slate-400" />{' '}
                                {new Date(
                                  trx.transaction_date
                                ).toLocaleDateString('ar-EG')}
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`font-black flex items-center gap-1 w-fit px-2 py-1 rounded-lg ${trx.type === 'IN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/10 dark:text-rose-400'}`}
                              >
                                {trx.type === 'IN' ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {trx.amount.toLocaleString()} ج.م
                              </span>
                            </td>
                            <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                              {CATEGORY_TRANSLATIONS[trx.category] ||
                                trx.category}
                            </td>
                            <td
                              className="p-4 text-xs font-black text-slate-400"
                              dir="ltr"
                            >
                              #{trx.local_id.split('_').pop()}
                            </td>
                            <td
                              className="p-4 text-xs text-slate-500 max-w-[200px] truncate"
                              title={`${trx.reference_doc} - ${trx.notes}`}
                            >
                              <strong className="block text-slate-700 dark:text-slate-300">
                                {trx.reference_doc || '-'}
                              </strong>
                              {trx.notes}
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-500">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                {trx.performed_by?.name || 'النظام'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            className="p-8 text-center text-slate-500 font-bold"
                          >
                            لا توجد حركات مالية
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/20">
                  {transactions.length > 0 ? (
                    transactions.map((trx) => (
                      <div
                        key={trx._id}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-2">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">
                              {CATEGORY_TRANSLATIONS[trx.category] ||
                                trx.category}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />{' '}
                              {new Date(
                                trx.transaction_date
                              ).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                          <span
                            className={`font-black flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${trx.type === 'IN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}
                          >
                            {trx.type === 'IN' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {trx.amount.toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {trx.reference_doc && (
                            <strong className="block text-slate-700 dark:text-slate-300 mb-0.5">
                              {trx.reference_doc}
                            </strong>
                          )}
                          <p>{trx.notes || 'بدون ملاحظات'}</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-1 mt-1 border-t border-slate-50 dark:border-slate-700/50">
                          <span dir="ltr">
                            #{trx.local_id.split('_').pop()}
                          </span>
                          <span>
                            بواسطة: {trx.performed_by?.name || 'النظام'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-500 font-bold text-sm">
                      لا توجد حركات مالية
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. تبويب إضافة قيد يدوي (Responsive Form) */}
            {activeTab === 'ADD' && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 max-w-2xl mx-auto"
              >
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white mb-1">
                  تسجيل قيد مالي يدوي
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 mb-5 sm:mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  استخدم هذه الشاشة لتسجيل المصروفات أو الإيرادات الخارجية (مثل
                  الصيانة، النقل، أو إيداع رأس المال).
                </p>

                <form
                  onSubmit={handleManualTransactionSubmit}
                  className="space-y-4 sm:space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        نوع الحركة *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            type: e.target.value,
                            category:
                              e.target.value === 'IN'
                                ? 'OTHER_REVENUE'
                                : 'OTHER_EXPENSE',
                          }))
                        }
                        className={`w-full rounded-xl border-2 px-3 py-2.5 sm:py-3 text-sm font-black outline-none transition-colors ${formData.type === 'IN' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                      >
                        <option value="IN">إيراد / توريد نقدية (IN)</option>
                        <option value="OUT">مصروف / سحب نقدية (OUT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        التصنيف المحاسبي *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            category: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {formData.type === 'IN' ? (
                          <>
                            <option value="OWNER_DEPOSIT">
                              إيداع رأس مال (تمويل)
                            </option>
                            <option value="OTHER_REVENUE">
                              إيرادات أخرى متنوعة
                            </option>
                          </>
                        ) : (
                          <>
                            <option value="MAINTENANCE">صيانة وإصلاحات</option>
                            <option value="TRANSPORTATION">
                              نقل ونولون ومواصلات
                            </option>
                            <option value="OTHER_EXPENSE">
                              مصروفات نثرية أخرى
                            </option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        المبلغ (ج.م) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, amount: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 sm:py-3 text-base sm:text-lg font-black text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        تاريخ الحركة *
                      </label>
                      <input
                        type="date"
                        value={formData.transaction_date}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            transaction_date: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 sm:py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                      بيان القيد (ملاحظات)
                    </label>
                    <textarea
                      rows="2"
                      placeholder="اكتب تفاصيل القيد..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, notes: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 sm:py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.amount}
                    className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 sm:py-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-70 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <PlusCircle className="w-5 h-5" /> تسجيل الحركة بالخزينة
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default FinancesManager;
