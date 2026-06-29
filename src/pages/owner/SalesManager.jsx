import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Loader2,
  Receipt,
  Building2,
  UserCircle2,
  CalendarDays,
  Printer,
  TrendingUp,
  Filter,
  Tractor,
} from 'lucide-react';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import merchantService from '../../services/merchantService';
import invoiceService from '../../services/invoiceService';
import { showAlert } from '../../utils/alert';

const SalesManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultFarmId = searchParams.get('farm') || '';
  const defaultCycleId = searchParams.get('cycle') || '';
  const actionParam = searchParams.get('action'); 

  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(defaultFarmId);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(defaultCycleId);
  const [merchants, setMerchants] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: actionParam === 'new',
    mode: 'ADD',
    activeInvoice: null,
  });

  const [sellData, setSellData] = useState({
    cycle_id: defaultCycleId,
    sale_category: 'BIRDS',
    merchant_id: '',
    rep_name: '',
    quantity: '',
    total_weight_kg: '',
    unit_price: '',
    paid_amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setIsLoading(true);
        const farmsRes = await farmService.getFarms();
        const fetchedFarms = farmsRes.farms || [];
        if (isMounted) setFarms(fetchedFarms);

        if (fetchedFarms.length > 0) {
          const targetFarmId = defaultFarmId || fetchedFarms[0]._id;
          if (isMounted) setSelectedFarmId(targetFarmId);
          await loadFarmData(targetFarmId, isMounted);
        }
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب البيانات الأساسية');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadFarmData = async (farmId, isMounted = true) => {
    try {
      const [cyclesRes, merchantsRes, invoicesRes] = await Promise.all([
        cycleService.getFarmCycles(farmId),
        merchantService.getMerchants(farmId),
        invoiceService.getInvoices(farmId),
      ]);
      if (isMounted) {
        setCycles(cyclesRes.cycles || []);
        setMerchants(merchantsRes.merchants || []);
        const salesInvoices = (invoicesRes.invoices || []).filter(
          (inv) => inv.invoice_type === 'SALE'
        );
        setInvoices(salesInvoices);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب الفواتير');
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    setSelectedCycleId('');
    setSearchParams({}); 

    setIsLoading(true);
    await loadFarmData(newFarmId);
    setIsLoading(false);
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (selectedCycleId)
      return (
        inv.cycle_id?._id === selectedCycleId ||
        inv.cycle_id === selectedCycleId
      );
    return true;
  });

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD', activeInvoice: null });
    setSearchParams({}); 
  };

  const openAddSheet = () => {
    setSellData({
      cycle_id: selectedCycleId || '',
      sale_category: 'BIRDS',
      merchant_id: '',
      rep_name: '',
      quantity: '',
      total_weight_kg: '',
      unit_price: '',
      paid_amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
    });
    setSheetConfig({ isOpen: true, mode: 'ADD', activeInvoice: null });
  };

  const openViewSheet = (invoice) => {
    setSheetConfig({ isOpen: true, mode: 'VIEW', activeInvoice: invoice });
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (
      !sellData.cycle_id ||
      !sellData.merchant_id ||
      !sellData.quantity ||
      !sellData.unit_price
    ) {
      return showAlert.error(
        'بيانات ناقصة',
        'يرجى إكمال الحقول الأساسية وتحديد الدورة والشركة'
      );
    }
    if (sellData.sale_category === 'BIRDS' && !sellData.total_weight_kg) {
      return showAlert.error('بيانات ناقصة', 'الوزن الإجمالي للطيور مطلوب');
    }

    try {
      setIsActionLoading(true);
      const localId = `INV-${Date.now()}`;

      const payload = {
        local_id: localId,
        merchant_id: sellData.merchant_id,
        representative_name: sellData.rep_name,
        sale_category: sellData.sale_category,
        quantity: sellData.quantity,
        total_weight_kg:
          sellData.sale_category === 'BIRDS'
            ? sellData.total_weight_kg
            : undefined,
        unit_price: sellData.unit_price,
        paid_amount: sellData.paid_amount,
        transaction_date: sellData.transaction_date,
        farm_id: selectedFarmId,
      };

      await cycleService.recordCycleSale(sellData.cycle_id, payload);

      showAlert.success('تم الإصدار', 'تم إنشاء الفاتورة وتوثيق العملية بنجاح');
      closeSheet();
      await loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل العملية',
        error.response?.data?.message || 'خطأ أثناء تسجيل الفاتورة'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount || 0);

  const getStatusBadge = (status) => {
    if (status === 'PAID')
      return (
        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
          خالصة
        </span>
      );
    if (status === 'PARTIAL')
      return (
        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
          دفع جزئي
        </span>
      );
    return (
      <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">
        آجلة
      </span>
    );
  };

  const getAllowedMerchantTypes = (category) => {
    if (category === 'BIRDS') return ['MEAT_BUYER', 'GENERAL'];
    if (category === 'MANURE') return ['MANURE_BUYER', 'GENERAL'];
    return ['GENERAL'];
  };

  const handlePrint = () => window.print();

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
    <div className="space-y-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-500" /> سجل المبيعات
            والفواتير
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            إدارة فواتير المبيعات، ومتابعة الدفعات للمشترين والتجار.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <Tractor className="h-4 w-4" />
            </div>
            <select
              value={selectedFarmId}
              onChange={handleFarmChange}
              disabled={isLoading || farms.length === 0}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {farms.length === 0 && <option value="">لا توجد مزارع</option>}
              {farms.map((farm) => (
                <option key={farm._id} value={farm._id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative hidden md:block">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <Filter className="h-4 w-4" />
            </div>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              disabled={isLoading || cycles.length === 0}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">كل الدورات (المبيعات العامة)</option>
              {cycles.map((cycle) => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={openAddSheet}
            disabled={farms.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">إصدار فاتورة بيع</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50 print:hidden">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
            <Receipt className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            لا توجد فواتير مبيعات
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            لم يتم إصدار أي فواتير لهذه المزرعة أو الدورة المحددة حتى الآن.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 print:hidden">
          {filteredInvoices.map((invoice) => (
            <motion.div
              key={invoice._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openViewSheet(invoice)}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <div className="flex gap-3 items-center">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      رقم: {invoice._id.toString().slice(-6).toUpperCase()}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1">
                      <CalendarDays className="w-3 h-3" />{' '}
                      {new Date(invoice.invoice_date).toLocaleDateString(
                        'ar-EG'
                      )}
                    </div>
                  </div>
                </div>
                {getStatusBadge(invoice.payment_status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-emerald-500" />{' '}
                  {invoice.merchant_id?.company_name || 'غير محدد'}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <UserCircle2 className="w-4 h-4 text-emerald-500" /> مندوب:{' '}
                  {invoice.representative_name || 'غير محدد'}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                    الإجمالي المطلوب
                  </p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {formatCurrency(invoice.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                    المبلغ المتبقي
                  </p>
                  <p
                    className={`text-sm font-black ${invoice.remaining_amount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {formatCurrency(invoice.remaining_amount)}
                  </p>
                </div>
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
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm print:hidden"
            />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh] print:max-h-none print:shadow-none print:rounded-none print:static print:w-full print:bg-white print:text-black"
              >
                {/* 1. VIEW & PRINT MODE */}
                {sheetConfig.mode === 'VIEW' && sheetConfig.activeInvoice && (
                  <div className="flex flex-col h-full print:h-auto">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
                      <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Printer className="w-5 h-5" /> تفاصيل الفاتورة
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handlePrint}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={closeSheet}
                          className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Invoice Paper (Printable) */}
                    <div className="p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 print:bg-white print:p-0">
                      <div className="text-center mb-8 border-b-2 border-slate-900 pb-6 dark:border-slate-700 print:border-black">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white print:text-black">
                          فاتورة مبيعات / إيصال استلام
                        </h2>
                        <p className="text-sm font-bold text-slate-500 mt-1 print:text-gray-600">
                          رقم المرجع:{' '}
                          {sheetConfig.activeInvoice._id
                            .toString()
                            .slice(-6)
                            .toUpperCase()}
                        </p>
                        <p className="text-xs font-bold text-slate-500 print:text-gray-600">
                          التاريخ:{' '}
                          {new Date(
                            sheetConfig.activeInvoice.invoice_date
                          ).toLocaleDateString('ar-EG')}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 print:border-gray-300 print:bg-transparent">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">
                            الجهة المشترية (العميل)
                          </p>
                          <p className="text-sm font-black text-slate-800 dark:text-white print:text-black">
                            {sheetConfig.activeInvoice.merchant_id
                              ?.company_name || 'غير محدد'}
                          </p>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 print:text-gray-700 mt-1">
                            عناية المندوب:{' '}
                            {sheetConfig.activeInvoice.representative_name ||
                              'لم يذكر'}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 print:border-gray-300 print:bg-transparent">
                          <p className="text-[10px] font-bold text-slate-400 mb-1">
                            بيانات التوريد
                          </p>
                          <p className="text-sm font-black text-slate-800 dark:text-white print:text-black">
                            مزرعة:{' '}
                            {farms.find((f) => f._id === selectedFarmId)
                              ?.name || 'الرئيسية'}
                          </p>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 print:text-gray-700 mt-1">
                            دورة الإنتاج:{' '}
                            {sheetConfig.activeInvoice.cycle_id?.name ||
                              'مبيعات عامة (بدون دورة)'}
                          </p>
                        </div>
                      </div>

                      <table className="w-full text-right mb-8">
                        <thead>
                          <tr className="border-y-2 border-slate-200 dark:border-slate-700 print:border-black text-sm text-slate-800 dark:text-white print:text-black">
                            <th className="py-3 font-black">البيان / الصنف</th>
                            <th className="py-3 font-black">الكمية/الوزن</th>
                            <th className="py-3 font-black">سعر الوحدة</th>
                            <th className="py-3 font-black">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheetConfig.activeInvoice.items.map((item, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 dark:border-slate-800 print:border-gray-300 text-sm text-slate-700 dark:text-slate-300 print:text-black font-medium"
                            >
                              <td className="py-3">{item.item_name}</td>
                              <td className="py-3">{item.quantity}</td>
                              <td className="py-3">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="py-3 font-black">
                                {formatCurrency(item.total_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 print:border-black print:bg-transparent">
                        <div className="flex justify-between items-center mb-2 text-sm text-slate-600 dark:text-slate-400 print:text-gray-700">
                          <span className="font-bold">الإجمالي المطلوب:</span>
                          <span className="font-black text-slate-900 dark:text-white print:text-black text-base">
                            {formatCurrency(
                              sheetConfig.activeInvoice.total_amount
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-sm text-emerald-600 dark:text-emerald-400 print:text-gray-700">
                          <span className="font-bold">المبلغ المُسدد:</span>
                          <span className="font-black">
                            {formatCurrency(
                              sheetConfig.activeInvoice.paid_amount
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 print:border-gray-300 text-sm">
                          <span className="font-black text-slate-800 dark:text-white print:text-black">
                            الباقي (يُرحل لحساب الشركة):
                          </span>
                          <span className="font-black text-rose-600 dark:text-rose-400 print:text-black text-lg">
                            {formatCurrency(
                              sheetConfig.activeInvoice.remaining_amount
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-10 grid grid-cols-2 gap-4 text-center print:block">
                        <div className="print:inline-block print:w-1/2">
                          <p className="text-xs font-bold text-slate-400 mb-6">
                            توقيع المستلم (المندوب)
                          </p>
                          <div className="border-b border-slate-300 w-32 mx-auto"></div>
                        </div>
                        <div className="print:inline-block print:w-1/2">
                          <p className="text-xs font-bold text-slate-400 mb-6">
                            إدارة الحسابات بالمزرعة
                          </p>
                          <div className="border-b border-slate-300 w-32 mx-auto"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ADD MODE */}
                {sheetConfig.mode === 'ADD' && (
                  <>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-base font-black text-slate-800 dark:text-white">
                        إصدار فاتورة مبيعات جديدة
                      </h3>
                      <button
                        onClick={closeSheet}
                        className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-5 overflow-y-auto custom-scrollbar">
                      <form onSubmit={handleSellSubmit} className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            تحديد الدورة الإنتاجية (مصدر البضاعة) *
                          </label>
                          <select
                            value={sellData.cycle_id}
                            onChange={(e) =>
                              setSellData((p) => ({
                                ...p,
                                cycle_id: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            required
                          >
                            <option value="">-- اختر الدورة --</option>
                            {cycles
                              .filter((c) => c.status !== 'CLOSED')
                              .map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name} (
                                  {c.type === 'LAYER' ? 'بياض' : 'تسمين'})
                                </option>
                              ))}
                          </select>
                        </div>

                        {sellData.cycle_id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl mb-4 border border-indigo-100 dark:border-indigo-900/30"
                          >
                            <label className="mb-2 block text-xs font-bold text-indigo-800 dark:text-indigo-400">
                              نوع البضاعة المباعة *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {['BIRDS', 'MANURE'].map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() =>
                                    setSellData((p) => ({
                                      ...p,
                                      sale_category: type,
                                      merchant_id: '',
                                      rep_name: '',
                                      quantity: '',
                                      total_weight_kg: '',
                                      unit_price: '',
                                    }))
                                  }
                                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${sellData.sale_category === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-200 text-indigo-600 dark:bg-slate-800 dark:border-indigo-900/50 dark:text-indigo-400'}`}
                                >
                                  {type === 'BIRDS'
                                    ? 'طيور (لحم/أمهات)'
                                    : 'سباخ/سماد'}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                              {sellData.sale_category === 'BIRDS'
                                ? 'العدد (طائر) *'
                                : 'الكمية (طن/نقلة) *'}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={sellData.quantity}
                              onChange={(e) =>
                                setSellData((p) => ({
                                  ...p,
                                  quantity: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              required
                            />
                          </div>
                          {sellData.sale_category === 'BIRDS' ? (
                            <div>
                              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                                الوزن الإجمالي (كجم) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={sellData.total_weight_kg}
                                onChange={(e) =>
                                  setSellData((p) => ({
                                    ...p,
                                    total_weight_kg: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                required
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                                سعر الوحدة (ج.م) *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={sellData.unit_price}
                                onChange={(e) =>
                                  setSellData((p) => ({
                                    ...p,
                                    unit_price: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                required
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {sellData.sale_category === 'BIRDS' && (
                            <div>
                              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                                السعر للكيلو *
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={sellData.unit_price}
                                onChange={(e) =>
                                  setSellData((p) => ({
                                    ...p,
                                    unit_price: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                required
                              />
                            </div>
                          )}
                          <div
                            className={
                              sellData.sale_category !== 'BIRDS'
                                ? 'col-span-2'
                                : ''
                            }
                          >
                            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                              المبلغ المُسدد فوراً (مقدم)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={sellData.paid_amount}
                              onChange={(e) =>
                                setSellData((p) => ({
                                  ...p,
                                  paid_amount: e.target.value,
                                }))
                              }
                              placeholder="اتركه فارغاً إذا كان البيع آجلاً"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="mb-1.5 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              الشركة المشترية *
                            </label>
                            <select
                              value={sellData.merchant_id}
                              onChange={(e) =>
                                setSellData((p) => ({
                                  ...p,
                                  merchant_id: e.target.value,
                                  rep_name: '',
                                }))
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              required
                            >
                              <option value="">-- اختر الشركة --</option>
                              {merchants
                                .filter(
                                  (m) =>
                                    m.status === 'ACTIVE' &&
                                    getAllowedMerchantTypes(
                                      sellData.sale_category
                                    ).includes(m.merchant_type)
                                )
                                .map((m) => (
                                  <option key={m._id} value={m._id}>
                                    {m.company_name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          {sellData.merchant_id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <label className="mb-1.5 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                المندوب المستلم *
                              </label>
                              <select
                                value={sellData.rep_name}
                                onChange={(e) =>
                                  setSellData((p) => ({
                                    ...p,
                                    rep_name: e.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                required
                              >
                                <option value="">-- اختر المندوب --</option>
                                {merchants
                                  .find((m) => m._id === sellData.merchant_id)
                                  ?.representatives?.map((rep) => (
                                    <option key={rep._id} value={rep.name}>
                                      {rep.name}
                                    </option>
                                  ))}
                              </select>
                            </motion.div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="mt-4 flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            'اعتماد وطباعة الفاتورة'
                          )}
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalesManager;