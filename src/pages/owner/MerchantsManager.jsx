import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Loader2,
  MoreVertical,
  Settings2,
  Trash2,
  Users,
  Phone,
  Tractor,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  UserPlus,
  UserMinus,
  AlertTriangle,
  Wallet,
  Receipt,
  CalendarDays,
  Search,
  Printer,
  Package,
} from 'lucide-react';
import merchantService from '../../services/merchantService';
import farmService from '../../services/farmService';
import { showAlert } from '../../utils/alert';

const MerchantsManager = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [farmName, setFarmName] = useState('');
  const [merchants, setMerchants] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 🚀 إعدادات كشف الحساب
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementSearch, setStatementSearch] = useState('');

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD', // 'ADD', 'EDIT', 'OPTIONS', 'REPS', 'STATEMENT'
    activeMerchant: null,
  });

  const [formData, setFormData] = useState({
    company_name: '',
    merchant_type: 'EGG_BUYER',
    company_phone: '',
    address: '',
    opening_balance: '',
    balance_type: 'DEBIT',
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
          if (isMounted) {
            setSelectedFarmId(firstFarm);
            setFarmName(fetchedFarms[0].name);
          }
          await fetchMerchants(firstFarm, isMounted);
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

  const fetchMerchants = async (farmId, isMounted = true) => {
    try {
      const response = await merchantService.getMerchants(farmId);
      if (isMounted) setMerchants(response.merchants || []);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات التجار');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    const selected = farms.find((f) => f._id === newFarmId);
    if (selected) setFarmName(selected.name);
    setIsLoading(true);
    await fetchMerchants(newFarmId);
  };

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD', activeMerchant: null });
    setStatementData(null);
    setStatementSearch('');
    setFormData({
      company_name: '',
      merchant_type: 'EGG_BUYER',
      company_phone: '',
      address: '',
      opening_balance: '',
      balance_type: 'DEBIT',
    });
  };

  const openOptionsSheet = (merchant) =>
    setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeMerchant: merchant });
  const openAddSheet = () =>
    setSheetConfig({ isOpen: true, mode: 'ADD', activeMerchant: null });

  const openStatementSheet = async (merchant) => {
    setSheetConfig({ isOpen: true, mode: 'STATEMENT', activeMerchant: merchant });
    try {
      setIsStatementLoading(true);
      const statement = await merchantService.getMerchantStatement(merchant._id);
      
      setStatementData({
        invoices: statement.invoices_history || [], // ربط الـ history بـ invoices
        transactions: statement.transactions_history || [], // ربط الـ history بـ transactions
        merchant_info: statement.merchant_info
      });
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب كشف حساب التاجر');
      closeSheet();
    } finally {
      setIsStatementLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name || !formData.merchant_type)
      return showAlert.error('بيانات ناقصة', 'يرجى إكمال الحقول الإلزامية');

    try {
      setIsActionLoading(true);
      const payload = { ...formData, farm_id: selectedFarmId };

      if (sheetConfig.mode === 'ADD') {
        await merchantService.addMerchant(payload);
        showAlert.success('تمت الإضافة', 'تم تسجيل التاجر بنجاح');
      } else if (sheetConfig.mode === 'EDIT') {
        await merchantService.updateMerchant(
          sheetConfig.activeMerchant._id,
          payload
        );
        showAlert.success('تم التحديث', 'تم حفظ التعديلات بنجاح');
      }
      closeSheet();
      fetchMerchants(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'إجراء مرفوض',
        error.response?.data?.message || 'فشل العملية'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // 🚀 دوال الطباعة الذكية
  const handlePrintInvoice = (invoice, merchantName) => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة #${invoice.local_id}</title>
          <style>
            body { font-family: 'Tahoma', sans-serif; padding: 20px; max-width: 400px; margin: auto; color: #000; }
            h2 { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .line { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
            .footer { text-align: center; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h2>فاتورة مبيعات</h2>
          <div class="line"><span>التاريخ:</span> <span>${new Date(invoice.invoice_date || invoice.createdAt).toLocaleDateString('ar-EG')}</span></div>
          <div class="line"><span>العميل:</span> <span>${merchantName}</span></div>
          <div class="line"><span>المندوب:</span> <span>${invoice.notes || 'غير محدد'}</span></div>
          <div class="divider"></div>
          <div class="line"><span>الكمية:</span> <span>${invoice.quantity || invoice.items?.[0]?.quantity || 0}</span></div>
          <div class="divider"></div>
          <div class="line" style="font-size: 16px;"><span>الإجمالي:</span> <span>${Number(invoice.total_amount).toLocaleString()} ج.م</span></div>
          <div class="line"><span>المدفوع:</span> <span>${Number(invoice.paid_amount).toLocaleString()} ج.م</span></div>
          <div class="line" style="color: red;"><span>المتبقي الآجل:</span> <span>${Number(invoice.remaining_amount).toLocaleString()} ج.م</span></div>
          <div class="footer">نظام إدارة المزارع - نسخة الأرشيف</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handlePrintFullStatement = () => {
    if (!statementData || !sheetConfig.activeMerchant) return;
    const merchant = sheetConfig.activeMerchant;

    const printContent = `
      <html dir="rtl">
        <head>
          <title>كشف حساب - ${merchant.company_name}</title>
          <style>
            body { font-family: 'Tahoma', sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .summary div { text-align: center; }
            .summary h4 { margin: 0 0 5px 0; color: #64748b; font-size: 14px; }
            .summary p { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; }
            th { background-color: #f1f5f9; }
            .debt { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>كشف حساب عميل / تاجر</h2>
            <h3>الشركة: ${merchant.company_name} | الهاتف: ${merchant.company_phone || '-'}</h3>
            <p>تاريخ استخراج الكشف: ${new Date().toLocaleString('ar-EG')}</p>
          </div>
          
          <div class="summary">
            <div><h4>الرصيد الحالي (المديونية)</h4><p class="debt">${(merchant.current_balance || 0).toLocaleString()} ج.م</p></div>
            <div><h4>إجمالي المسحوبات (الكمية)</h4><p>${(statementData.total_purchases_qty || 0).toLocaleString()}</p></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>رقم الفاتورة</th>
                <th>البيان / المندوب</th>
                <th>الكمية</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${(statementData.invoices || [])
                .map(
                  (inv) => `
                <tr>
                  <td>${new Date(inv.invoice_date || inv.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td dir="ltr">#${(inv.local_id || '').split('_')[1] || inv._id.slice(-6)}</td>
                  <td>${inv.notes || 'مبيعات'}</td>
                  <td>${inv.quantity || inv.items?.[0]?.quantity || 0}</td>
                  <td>${Number(inv.total_amount).toLocaleString()}</td>
                  <td>${Number(inv.paid_amount).toLocaleString()}</td>
                  <td class="debt">${Number(inv.remaining_amount).toLocaleString()}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // 🚀 فلترة فواتير كشف الحساب
  const filteredInvoices = (statementData?.invoices || []).filter((inv) => {
    if (!statementSearch) return true;
    const searchLower = statementSearch.toLowerCase();
    const invoiceNum = (inv.local_id || inv._id).toLowerCase();
    const notes = (inv.notes || '').toLowerCase();
    return invoiceNum.includes(searchLower) || notes.includes(searchLower);
  });

  const getMerchantTypeLabel = (type) => {
    const types = {
      EGG_BUYER: 'تاجر بيض',
      MEAT_BUYER: 'تاجر طيور/لحم',
      FEED_SUPPLIER: 'مورد أعلاف',
      GENERAL: 'عام',
    };
    return types[type] || type;
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
    <div className="space-y-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" /> إدارة التجار
            والموردين
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            إدارة حسابات التجار، المديونيات، وكشوف الحساب
          </p>
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
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {farms.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={openAddSheet}
            disabled={farms.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">إضافة تاجر</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      ) : merchants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">
            لا يوجد تجار مسجلين
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-500">
            قم بإضافة تجار البيض والطيور لتبدأ بتسجيل فواتيرهم وحساباتهم.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {merchants.map((merchant) => (
            <motion.div
              key={merchant._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">
                      {merchant.company_name}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                      {getMerchantTypeLabel(merchant.merchant_type)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openOptionsSheet(merchant)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />{' '}
                  <span dir="ltr">
                    {merchant.company_phone || 'لا يوجد رقم'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex justify-between items-center border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                    الرصيد الحالي (مديونية)
                  </p>
                  <p
                    className={`text-base font-black ${merchant.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {Math.abs(merchant.current_balance || 0).toLocaleString()}{' '}
                    ج.م
                  </p>
                </div>
                <button
                  onClick={() => openStatementSheet(merchant)}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shadow-sm"
                >
                  <Receipt className="w-4 h-4" /> كشف حساب
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
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    {sheetConfig.mode === 'ADD' && (
                      <>
                        <UserPlus className="w-5 h-5 text-emerald-500" /> إضافة
                        تاجر جديد
                      </>
                    )}
                    {sheetConfig.mode === 'STATEMENT' && (
                      <>
                        <FileText className="w-5 h-5 text-indigo-500" /> كشف
                        حساب وأرشيف
                      </>
                    )}
                    {sheetConfig.mode === 'OPTIONS' && 'خيارات التاجر'}
                  </h3>
                  <button
                    onClick={closeSheet}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  {/* 🚀 شاشة كشف الحساب والأرشيف الذكية */}
                  {sheetConfig.mode === 'STATEMENT' &&
                    sheetConfig.activeMerchant && (
                      <div className="space-y-6">
                        {isStatementLoading ? (
                          <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <h3 className="font-black text-slate-800 dark:text-white text-lg">
                                  {sheetConfig.activeMerchant.company_name}
                                </h3>
                                <p className="text-xs font-bold text-slate-500">
                                  أرشيف المعاملات والفواتير
                                </p>
                              </div>
                              <button
                                onClick={handlePrintFullStatement}
                                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors dark:bg-indigo-900/30 dark:text-indigo-400"
                              >
                                <Printer className="w-4 h-4" /> طباعة الكشف كامل
                              </button>
                            </div>

                            {/* إحصائيات التاجر */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                                  <Wallet className="w-4 h-4" /> الرصيد
                                  (مديونية)
                                </p>
                                <p className="text-xl font-black text-rose-700 dark:text-rose-300">
                                  {(
                                    sheetConfig.activeMerchant
                                      .current_balance || 0
                                  ).toLocaleString()}{' '}
                                  <span className="text-xs">ج.م</span>
                                </p>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                  <Package className="w-4 h-4" /> إجمالي
                                  المسحوبات
                                </p>
                                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                  {(
                                    statementData?.total_purchases_qty || 0
                                  ).toLocaleString()}{' '}
                                  <span className="text-xs">طبق/كرتونة</span>
                                </p>
                              </div>
                            </div>

                            {/* محرك البحث */}
                            <div className="relative">
                              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="ابحث برقم الفاتورة، أو اسم المندوب..."
                                value={statementSearch}
                                onChange={(e) =>
                                  setStatementSearch(e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>

                            {/* قائمة الفواتير */}
                            <div className="space-y-3">
                              {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((inv) => (
                                  <motion.div
                                    key={inv._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span
                                          className="text-xs font-black bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded"
                                          dir="ltr"
                                        >
                                          #
                                          {inv.local_id?.split('_')[1] ||
                                            inv._id.slice(-6)}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                          <CalendarDays className="w-3 h-3" />{' '}
                                          {new Date(
                                            inv.invoice_date || inv.createdAt
                                          ).toLocaleDateString('ar-EG')}
                                        </span>
                                      </div>
                                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                                        المندوب: {inv.notes || 'غير محدد'} |
                                        الكمية:{' '}
                                        <span className="text-indigo-600 dark:text-indigo-400">
                                          {inv.quantity ||
                                            inv.items?.[0]?.quantity ||
                                            0}
                                        </span>
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-r border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pr-4">
                                      <div className="text-left">
                                        <p className="text-[10px] font-bold text-slate-400">
                                          قيمة الفاتورة
                                        </p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white">
                                          {Number(
                                            inv.total_amount
                                          ).toLocaleString()}{' '}
                                          ج.م
                                        </p>
                                        {inv.remaining_amount > 0 && (
                                          <p className="text-[10px] font-black text-rose-500 mt-0.5">
                                            آجل:{' '}
                                            {Number(
                                              inv.remaining_amount
                                            ).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() =>
                                          handlePrintInvoice(
                                            inv,
                                            sheetConfig.activeMerchant
                                              .company_name
                                          )
                                        }
                                        className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                        title="طباعة الفاتورة"
                                      >
                                        <Printer className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-slate-500 text-sm font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                  لا توجد فواتير مطابقة للبحث
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  {/* خيارات التاجر (تحديث، أرشفة) */}
                  {sheetConfig.mode === 'OPTIONS' &&
                    sheetConfig.activeMerchant && (
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            setSheetConfig({ ...sheetConfig, mode: 'EDIT' })
                          }
                          className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm transition-colors"
                        >
                          <Settings2 className="w-5 h-5" /> تعديل بيانات التاجر
                        </button>
                      </div>
                    )}

                  {/* فورم إضافة/تعديل */}
                  {(sheetConfig.mode === 'ADD' ||
                    sheetConfig.mode === 'EDIT') && (
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      {/* ... محتوى الفورم الأصلي (اسم الشركة، النوع، التليفون، إلخ) ... */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            اسم الشركة / التاجر *
                          </label>
                          <input
                            name="company_name"
                            type="text"
                            value={formData.company_name}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                company_name: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            تخصص التاجر *
                          </label>
                          <select
                            name="merchant_type"
                            value={formData.merchant_type}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                merchant_type: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                          >
                            <option value="EGG_BUYER">تاجر بيض</option>
                            <option value="MEAT_BUYER">تاجر طيور/لحم</option>
                            <option value="FEED_SUPPLIER">مورد أعلاف</option>
                            <option value="GENERAL">مورد/تاجر عام</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="mt-6 flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-70 shadow-lg shadow-indigo-600/20"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'حفظ بيانات التاجر'
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

export default MerchantsManager;
