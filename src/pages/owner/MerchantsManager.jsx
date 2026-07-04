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
  Building2,
  Wallet,
  Receipt,
  CalendarDays,
  Search,
  Printer,
  Package,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BadgeDollarSign,
} from 'lucide-react';
import merchantService from '../../services/merchantService';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import { showAlert } from '../../utils/alert';

const MerchantsManager = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [cycles, setCycles] = useState([]); // 🚀 لجلب الدورات عند البيع

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // إعدادات كشف الحساب
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementSearch, setStatementSearch] = useState('');

  // تحكم الشيتات والنوافذ
  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD_MERCHANT', // ADD_MERCHANT, EDIT_MERCHANT, STATEMENT, ADD_SALE, ADD_PAYMENT
    activeMerchant: null,
  });

  const [merchantData, setMerchantData] = useState({
    company_name: '',
    merchant_type: 'EGG_BUYER',
    company_phone: '',
    address: '',
    opening_balance: '',
    balance_type: 'DEBIT',
  });

  const [saleData, setSaleData] = useState({
    cycle_id: '',
    sale_category: 'BIRDS',
    merchant_id: '',
    rep_name: '',
    quantity: '',
    total_weight_kg: '',
    unit_price: '',
    paid_amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    type: 'IN',
    transaction_date: new Date().toISOString().split('T')[0],
    rep_name: '',
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
          await loadFarmData(firstFarm, isMounted);
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

  const loadFarmData = async (farmId, isMounted = true) => {
    try {
      const [merchantsRes, cyclesRes] = await Promise.all([
        merchantService.getMerchants(farmId),
        cycleService.getFarmCycles(farmId),
      ]);
      if (isMounted) {
        setMerchants(merchantsRes.merchants || []);
        setCycles(cyclesRes.cycles || []);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب البيانات');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    setIsLoading(true);
    await loadFarmData(newFarmId);
  };

  const closeSheet = () => {
    setSheetConfig({
      isOpen: false,
      mode: 'ADD_MERCHANT',
      activeMerchant: null,
    });
    setStatementData(null);
    setStatementSearch('');
  };

  // ==================== المعالجات (Handlers) ====================

  const handleMerchantSubmit = async (e) => {
    e.preventDefault();
    if (!merchantData.company_name || !merchantData.merchant_type)
      return showAlert.error('بيانات ناقصة', 'أكمل الحقول الإلزامية');
    try {
      setIsActionLoading(true);
      const payload = { ...merchantData, farm_id: selectedFarmId };
      if (sheetConfig.mode === 'ADD_MERCHANT') {
        await merchantService.addMerchant(payload);
        showAlert.success('تمت الإضافة', 'تم تسجيل الشركة بنجاح');
      } else {
        await merchantService.updateMerchant(
          sheetConfig.activeMerchant._id,
          payload
        );
        showAlert.success('تم التحديث', 'تم حفظ التعديلات');
      }
      closeSheet();
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل العملية',
        error.response?.data?.message || 'تعذر الحفظ'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const localId = `INV-${Date.now()}`;
      const payload = {
        local_id: localId,
        merchant_id: saleData.merchant_id,
        representative_name: saleData.rep_name,
        sale_category: saleData.sale_category,
        quantity: saleData.quantity,
        total_weight_kg:
          saleData.sale_category === 'BIRDS'
            ? saleData.total_weight_kg
            : undefined,
        unit_price: saleData.unit_price,
        paid_amount: saleData.paid_amount,
        transaction_date: saleData.transaction_date,
        farm_id: selectedFarmId,
      };

      await cycleService.recordCycleSale(saleData.cycle_id, payload);
      showAlert.success(
        'تم الإصدار',
        'تم إنشاء الفاتورة بنجاح وتوجيه الحسابات'
      );

      // إذا كنا داخل كشف الحساب، نعيد تحميله
      if (sheetConfig.activeMerchant) {
        await openStatementSheet(sheetConfig.activeMerchant);
      } else {
        closeSheet();
      }
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل العملية',
        error.response?.data?.message || 'تعذر إصدار الفاتورة'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      await merchantService.recordPayment(
        sheetConfig.activeMerchant._id,
        paymentData
      );
      showAlert.success(
        'تم التسجيل',
        'تم تسجيل الدفعة النقدية وتحديث المديونية بنجاح'
      );
      await openStatementSheet(sheetConfig.activeMerchant); // إعادة تحميل كشف الحساب
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل العملية',
        error.response?.data?.message || 'تعذر تسجيل الدفعة'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==================== فتح الشاشات ====================

  const openStatementSheet = async (merchant) => {
    setSheetConfig({
      isOpen: true,
      mode: 'STATEMENT',
      activeMerchant: merchant,
    });
    try {
      setIsStatementLoading(true);
      const statement = await merchantService.getMerchantStatement(
        merchant._id
      );
      setStatementData({
        invoices: statement.invoices_history || [],
        transactions: statement.transactions_history || [],
        merchant_info: statement.merchant_info,
        total_purchases_qty: statement.total_purchases_qty || 0,
      });
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب كشف الحساب');
      closeSheet();
    } finally {
      setIsStatementLoading(false);
    }
  };

  const openAddSale = (merchant = null) => {
    setSaleData({
      cycle_id: '',
      sale_category: 'BIRDS',
      merchant_id: merchant ? merchant._id : '',
      rep_name: '',
      quantity: '',
      total_weight_kg: '',
      unit_price: '',
      paid_amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
    });
    setSheetConfig({
      isOpen: true,
      mode: 'ADD_SALE',
      activeMerchant: merchant,
    });
  };

  const openAddPayment = (merchant) => {
    setPaymentData({
      amount: '',
      type: 'IN',
      transaction_date: new Date().toISOString().split('T')[0],
      rep_name: '',
      notes: '',
    });
    setSheetConfig({
      isOpen: true,
      mode: 'ADD_PAYMENT',
      activeMerchant: merchant,
    });
  };

  // ==================== دوال المساعدة للواجهة ====================

  // دمج الفواتير والسندات في تايم لاين واحد
  const getUnifiedTimeline = () => {
    if (!statementData) return [];
    const invs = statementData.invoices.map((i) => ({
      ...i,
      _recordType: 'INVOICE',
      _date: new Date(i.invoice_date || i.createdAt),
    }));
    const txs = statementData.transactions.map((t) => ({
      ...t,
      _recordType: 'TRANSACTION',
      _date: new Date(t.transaction_date || t.createdAt),
    }));

    return [...invs, ...txs]
      .sort((a, b) => b._date - a._date)
      .filter((item) => {
        if (!statementSearch) return true;
        const term = statementSearch.toLowerCase();
        if (item._recordType === 'INVOICE')
          return (
            (item.local_id || '').toLowerCase().includes(term) ||
            (item.notes || '').toLowerCase().includes(term)
          );
        return (
          (item.local_id || '').toLowerCase().includes(term) ||
          (item.notes || '').toLowerCase().includes(term)
        );
      });
  };

  const getAllowedMerchantTypes = (category) => {
    if (category === 'BIRDS') return ['MEAT_BUYER', 'GENERAL'];
    if (category === 'MANURE') return ['MANURE_BUYER', 'GENERAL'];
    return ['GENERAL', 'EGG_BUYER', 'MEAT_BUYER', 'FEED_SUPPLIER'];
  };

  // ==================== دوال الطباعة ====================

  const handlePrintInvoice = (invoice, merchantName) => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة #${(invoice.local_id || '').split('_')[1] || invoice.local_id}</title>
          <style>
            body { font-family: 'Tahoma', sans-serif; padding: 20px; max-width: 400px; margin: auto; color: #000; }
            h2 { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .line { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
            .footer { text-align: center; font-size: 12px; margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>فاتورة مبيعات</h2>
          <div class="line"><span>التاريخ:</span> <span>${new Date(invoice.invoice_date || invoice.createdAt).toLocaleDateString('ar-EG')}</span></div>
          <div class="line"><span>رقم الفاتورة:</span> <span>${(invoice.local_id || '').split('_')[1] || invoice.local_id}</span></div>
          <div class="line"><span>العميل:</span> <span>${merchantName}</span></div>
          <div class="divider"></div>
          <div class="line"><span>الكمية:</span> <span>${invoice.quantity || invoice.items?.[0]?.quantity || 0}</span></div>
          <div class="divider"></div>
          <div class="line" style="font-size: 16px;"><span>الإجمالي المطلوب:</span> <span>${Number(invoice.total_amount).toLocaleString()} ج.م</span></div>
          <div class="line"><span>المدفوع نقداً:</span> <span>${Number(invoice.paid_amount).toLocaleString()} ج.م</span></div>
          <div class="line" style="color: red;"><span>المتبقي الآجل:</span> <span>${Number(invoice.remaining_amount).toLocaleString()} ج.م</span></div>
          <div class="footer">توقيع المستلم: .....................</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handlePrintFullStatement = () => {
    if (!statementData || !sheetConfig.activeMerchant) return;
    const merchant = sheetConfig.activeMerchant;
    const timeline = getUnifiedTimeline();

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
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
            th { background-color: #f1f5f9; }
            .debt { color: #dc2626; font-weight: bold; }
            .credit { color: #059669; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>كشف حساب مفصل (عميل / مورد)</h2>
            <h3>الشركة: ${merchant.company_name} | الهاتف: ${merchant.company_phone || '-'}</h3>
            <p>تاريخ استخراج الكشف: ${new Date().toLocaleString('ar-EG')}</p>
          </div>
          
          <div class="summary">
            <div><h4>الرصيد الحالي (المديونية)</h4><p class="debt">${(merchant.current_balance || 0).toLocaleString()} ج.م</p></div>
            <div><h4>إجمالي المسحوبات</h4><p>${(statementData.total_purchases_qty || 0).toLocaleString()}</p></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>رقم المستند</th>
                <th>نوع الحركة</th>
                <th>البيان والملاحظات</th>
                <th>مدين (عليه)</th>
                <th>دائن (دفع)</th>
              </tr>
            </thead>
            <tbody>
              ${timeline
                .map((item) => {
                  const date = item._date.toLocaleDateString('ar-EG');
                  const docId =
                    (item.local_id || '').split('_').pop() ||
                    item._id.slice(-6);

                  if (item._recordType === 'INVOICE') {
                    return `<tr>
                    <td>${date}</td><td dir="ltr">#${docId}</td><td>فاتورة مبيعات</td>
                    <td>${item.notes || '-'}</td><td class="debt">${Number(item.total_amount).toLocaleString()}</td>
                    <td class="credit">${Number(item.paid_amount).toLocaleString()}</td>
                  </tr>`;
                  } else {
                    // Transaction (Payment)
                    if (item.invoice_id) return ''; // لا نطبع السندات المرتبطة بفاتورة لأنها ظهرت في الفاتورة
                    const isPaymentFromHim = item.type === 'IN';
                    return `<tr>
                    <td>${date}</td><td dir="ltr">#${docId}</td><td>سند ${isPaymentFromHim ? 'قبض' : 'صرف'}</td>
                    <td>${item.notes || '-'}</td>
                    <td class="debt">${isPaymentFromHim ? '-' : Number(item.amount).toLocaleString()}</td>
                    <td class="credit">${isPaymentFromHim ? Number(item.amount).toLocaleString() : '-'}</td>
                  </tr>`;
                  }
                })
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
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" /> العملاء والمبيعات
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            مركز إدارة حسابات التجار، تحصيل المديونيات، وإصدار الفواتير.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <Tractor className="h-4 w-4" />
            </div>
            <select
              value={selectedFarmId}
              onChange={handleFarmChange}
              disabled={isLoading || farms.length === 0}
              className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {farms.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setMerchantData({
                company_name: '',
                merchant_type: 'EGG_BUYER',
                company_phone: '',
                address: '',
                opening_balance: '',
                balance_type: 'DEBIT',
              });
              setSheetConfig({
                isOpen: true,
                mode: 'ADD_MERCHANT',
                activeMerchant: null,
              });
            }}
            disabled={farms.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm disabled:opacity-50"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">إضافة شركة</span>
          </button>
          <button
            onClick={() => openAddSale(null)}
            disabled={farms.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">إصدار فاتورة مبيعات</span>
            <span className="sm:hidden">فاتورة بيع</span>
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
            لا يوجد عملاء أو موردين
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-500">
            قم بإضافة الشركات للبدء في تسجيل فواتيرهم وحساباتهم.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {merchants.map((merchant) => (
            <motion.div
              key={merchant._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col h-full hover:border-indigo-300 dark:hover:border-indigo-800/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => openStatementSheet(merchant)}
                >
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {merchant.company_name}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md mt-1 inline-block">
                      {merchant.merchant_type === 'EGG_BUYER'
                        ? 'تاجر بيض'
                        : merchant.merchant_type === 'MEAT_BUYER'
                          ? 'تاجر لحم/طيور'
                          : 'مورد/عام'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMerchantData({
                      company_name: merchant.company_name,
                      merchant_type: merchant.merchant_type,
                      company_phone: merchant.company_phone,
                      address: merchant.address,
                      opening_balance: merchant.opening_balance,
                    });
                    setSheetConfig({
                      isOpen: true,
                      mode: 'EDIT_MERCHANT',
                      activeMerchant: merchant,
                    });
                  }}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex justify-between items-center border border-slate-100 dark:border-slate-700/50 mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                      الرصيد الحالي للمحاسبة
                    </p>
                    <p
                      className={`text-base font-black ${merchant.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : merchant.current_balance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {Math.abs(merchant.current_balance || 0).toLocaleString()}{' '}
                      <span className="text-xs">ج.م</span>
                      <span className="text-[10px] mr-1">
                        (
                        {merchant.current_balance > 0
                          ? 'عليه/مديونية'
                          : merchant.current_balance < 0
                            ? 'له/دائن'
                            : 'مُصفى'}
                        )
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  onClick={() => openAddSale(merchant)}
                  className="flex justify-center items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> بيع للشركة
                </button>
                <button
                  onClick={() => openAddPayment(merchant)}
                  className="flex justify-center items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <BadgeDollarSign className="w-4 h-4" /> تحصيل/سداد
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* الشيت الموحد للعمليات */}
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
                className={`w-full bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh] ${sheetConfig.mode === 'STATEMENT' ? 'max-w-4xl' : 'max-w-xl'}`}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    {sheetConfig.mode.includes('MERCHANT') && (
                      <>
                        <Building2 className="w-5 h-5 text-indigo-500" />{' '}
                        {sheetConfig.mode === 'ADD_MERCHANT'
                          ? 'إضافة شركة جديدة'
                          : 'تعديل بيانات الشركة'}
                      </>
                    )}
                    {sheetConfig.mode === 'STATEMENT' && (
                      <>
                        <FileText className="w-5 h-5 text-indigo-500" /> المركز
                        المالي وكشف الحساب
                      </>
                    )}
                    {sheetConfig.mode === 'ADD_SALE' && (
                      <>
                        <ShoppingCart className="w-5 h-5 text-indigo-500" />{' '}
                        إصدار فاتورة مبيعات
                      </>
                    )}
                    {sheetConfig.mode === 'ADD_PAYMENT' && (
                      <>
                        <BadgeDollarSign className="w-5 h-5 text-emerald-500" />{' '}
                        تسجيل دفعة نقدية (سداد/تحصيل)
                      </>
                    )}
                  </h3>
                  <button
                    onClick={closeSheet}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  {/* === شاشة كشف الحساب الموحدة === */}
                  {sheetConfig.mode === 'STATEMENT' &&
                    sheetConfig.activeMerchant && (
                      <div className="space-y-6">
                        {isStatementLoading ? (
                          <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <div>
                                <h2 className="font-black text-slate-800 dark:text-white text-xl">
                                  {sheetConfig.activeMerchant.company_name}
                                </h2>
                                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                                  <Phone className="w-3 h-3" />{' '}
                                  {sheetConfig.activeMerchant.company_phone ||
                                    'لا يوجد هاتف'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handlePrintFullStatement}
                                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
                                >
                                  <Printer className="w-4 h-4" /> طباعة الكشف
                                </button>
                                <button
                                  onClick={() =>
                                    openAddPayment(sheetConfig.activeMerchant)
                                  }
                                  className="flex items-center gap-2 bg-emerald-600 px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                                >
                                  <BadgeDollarSign className="w-4 h-4" /> سداد
                                  نقدي
                                </button>
                                <button
                                  onClick={() =>
                                    openAddSale(sheetConfig.activeMerchant)
                                  }
                                  className="flex items-center gap-2 bg-indigo-600 px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                                >
                                  <ShoppingCart className="w-4 h-4" /> فاتورة
                                  جديدة
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div
                                className={`p-4 rounded-2xl border ${statementData?.merchant_info?.current_calculated_balance > 0 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : statementData?.merchant_info?.current_calculated_balance < 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}
                              >
                                <p
                                  className={`text-xs font-bold mb-1 flex items-center gap-1 ${statementData?.merchant_info?.current_calculated_balance > 0 ? 'text-rose-600' : statementData?.merchant_info?.current_calculated_balance < 0 ? 'text-emerald-600' : 'text-slate-500'}`}
                                >
                                  <Wallet className="w-4 h-4" /> الرصيد الدفتري
                                  الحالي
                                </p>
                                <p
                                  className={`text-xl font-black ${statementData?.merchant_info?.current_calculated_balance > 0 ? 'text-rose-700 dark:text-rose-400' : statementData?.merchant_info?.current_calculated_balance < 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}
                                >
                                  {Math.abs(
                                    statementData?.merchant_info
                                      ?.current_calculated_balance || 0
                                  ).toLocaleString()}{' '}
                                  <span className="text-xs">ج.م</span>
                                  <span className="text-[10px] mr-1">
                                    (
                                    {statementData?.merchant_info
                                      ?.current_calculated_balance > 0
                                      ? 'مديونية عليه'
                                      : statementData?.merchant_info
                                            ?.current_calculated_balance < 0
                                        ? 'دائن له'
                                        : 'مُصفى'}
                                    )
                                  </span>
                                </p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                  <Package className="w-4 h-4" /> إجمالي
                                  المسحوبات (أطباق)
                                </p>
                                <p className="text-xl font-black text-slate-800 dark:text-white">
                                  {(
                                    statementData?.total_purchases_qty || 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="relative">
                              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="ابحث في الكشف برقم الفاتورة أو الملاحظات..."
                                value={statementSearch}
                                onChange={(e) =>
                                  setStatementSearch(e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="space-y-3">
                              {getUnifiedTimeline().length > 0 ? (
                                getUnifiedTimeline().map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`p-4 rounded-xl border ${item._recordType === 'INVOICE' ? 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-slate-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20'}`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-start gap-3">
                                        <div
                                          className={`p-2 rounded-lg ${item._recordType === 'INVOICE' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : item.type === 'IN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}
                                        >
                                          {item._recordType === 'INVOICE' ? (
                                            <Receipt className="w-5 h-5" />
                                          ) : item.type === 'IN' ? (
                                            <ArrowDownToLine className="w-5 h-5" />
                                          ) : (
                                            <ArrowUpFromLine className="w-5 h-5" />
                                          )}
                                        </div>
                                        <div>
                                          <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                            {item._recordType === 'INVOICE'
                                              ? 'فاتورة مبيعات'
                                              : item.type === 'IN'
                                                ? 'سند تحصيل (قبض)'
                                                : 'سند صرف'}
                                            <span
                                              className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-black text-slate-500"
                                              dir="ltr"
                                            >
                                              #
                                              {(item.local_id || '')
                                                .split('_')
                                                .pop() || item._id.slice(-6)}
                                            </span>
                                          </h4>
                                          <p className="text-[11px] font-bold text-slate-500 mt-1">
                                            {item.notes ||
                                              (item._recordType === 'INVOICE'
                                                ? 'بضاعة مباعة'
                                                : 'سداد نقدي')}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-left">
                                        <p
                                          className={`font-black text-sm ${item._recordType === 'INVOICE' ? 'text-slate-800 dark:text-white' : item.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}
                                        >
                                          {item._recordType === 'INVOICE'
                                            ? Number(
                                                item.total_amount
                                              ).toLocaleString()
                                            : Number(
                                                item.amount
                                              ).toLocaleString()}{' '}
                                          ج.م
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                                          <CalendarDays className="w-3 h-3" />{' '}
                                          {item._date.toLocaleDateString(
                                            'ar-EG'
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    {item._recordType === 'INVOICE' && (
                                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex gap-4 text-xs font-bold">
                                          <span className="text-emerald-600">
                                            المدفوع:{' '}
                                            {Number(
                                              item.paid_amount
                                            ).toLocaleString()}
                                          </span>
                                          <span className="text-rose-600">
                                            الآجل:{' '}
                                            {Number(
                                              item.remaining_amount
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() =>
                                            handlePrintInvoice(
                                              item,
                                              sheetConfig.activeMerchant
                                                .company_name
                                            )
                                          }
                                          className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-2 py-1 rounded flex items-center gap-1 text-slate-600 dark:text-slate-300 transition-colors"
                                        >
                                          <Printer className="w-3 h-3" /> طباعة
                                          الفاتورة
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-slate-500 text-sm font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                  لا توجد حركات في الكشف
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  {/* === فورم إصدار فاتورة (مدمجة من Sales) === */}
                  {sheetConfig.mode === 'ADD_SALE' && (
                    <form onSubmit={handleSaleSubmit} className="space-y-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        <label className="mb-1.5 block text-[11px] font-bold text-indigo-800 dark:text-indigo-400">
                          الشركة المشترية (العميل) *
                        </label>
                        <select
                          value={saleData.merchant_id}
                          onChange={(e) =>
                            setSaleData((p) => ({
                              ...p,
                              merchant_id: e.target.value,
                              rep_name: '',
                            }))
                          }
                          disabled={!!sheetConfig.activeMerchant}
                          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-indigo-800/50 dark:bg-slate-800 dark:text-white"
                          required
                        >
                          <option value="">-- اختر الشركة --</option>
                          {merchants
                            .filter(
                              (m) =>
                                m.status === 'ACTIVE' &&
                                getAllowedMerchantTypes(
                                  saleData.sale_category
                                ).includes(m.merchant_type)
                            )
                            .map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.company_name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          تحديد الدورة (مصدر البضاعة) *
                        </label>
                        <select
                          value={saleData.cycle_id}
                          onChange={(e) =>
                            setSaleData((p) => ({
                              ...p,
                              cycle_id: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          required
                        >
                          <option value="">-- بيع عام (بدون دورة) --</option>
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

                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {['BIRDS', 'MANURE', 'EGGS'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              setSaleData((p) => ({
                                ...p,
                                sale_category: type,
                                merchant_id: sheetConfig.activeMerchant
                                  ? p.merchant_id
                                  : '',
                                quantity: '',
                                total_weight_kg: '',
                                unit_price: '',
                              }))
                            }
                            className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all ${saleData.sale_category === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                          >
                            {type === 'BIRDS'
                              ? 'طيور'
                              : type === 'EGGS'
                                ? 'بيض'
                                : 'سباخ/سماد'}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            {saleData.sale_category === 'BIRDS'
                              ? 'العدد (طائر) *'
                              : saleData.sale_category === 'EGGS'
                                ? 'العدد (طبق) *'
                                : 'الكمية (نقلة) *'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={saleData.quantity}
                            onChange={(e) =>
                              setSaleData((p) => ({
                                ...p,
                                quantity: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            required
                          />
                        </div>
                        {saleData.sale_category === 'BIRDS' ? (
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                              الوزن الإجمالي (كجم) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              value={saleData.total_weight_kg}
                              onChange={(e) =>
                                setSaleData((p) => ({
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
                              value={saleData.unit_price}
                              onChange={(e) =>
                                setSaleData((p) => ({
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
                        {saleData.sale_category === 'BIRDS' && (
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                              سعر الكيلو (ج.م) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              value={saleData.unit_price}
                              onChange={(e) =>
                                setSaleData((p) => ({
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
                            saleData.sale_category !== 'BIRDS'
                              ? 'col-span-2'
                              : ''
                          }
                        >
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            المدفوع نقداً (مقدم)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={saleData.paid_amount}
                            onChange={(e) =>
                              setSaleData((p) => ({
                                ...p,
                                paid_amount: e.target.value,
                              }))
                            }
                            placeholder="اتركه فارغاً إذا كان بيعاً آجلاً"
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm dark:border-emerald-800/50 dark:bg-emerald-900/10 dark:text-white"
                          />
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
                          'اعتماد الفاتورة وتوجيه الحسابات'
                        )}
                      </button>
                    </form>
                  )}

                  {/* === فورم سداد دفعة نقدية === */}
                  {sheetConfig.mode === 'ADD_PAYMENT' && (
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl mb-4 text-center">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-1">
                          الرصيد الدفتري الحالي
                        </p>
                        <p className="text-xl font-black text-amber-800 dark:text-amber-400">
                          {Math.abs(
                            sheetConfig.activeMerchant?.current_balance || 0
                          ).toLocaleString()}{' '}
                          ج.م
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          نوع الحركة المالي *
                        </label>
                        <select
                          value={paymentData.type}
                          onChange={(e) =>
                            setPaymentData((p) => ({
                              ...p,
                              type: e.target.value,
                            }))
                          }
                          className={`w-full rounded-xl border-2 px-3 py-3 text-sm font-black outline-none transition-colors ${paymentData.type === 'IN' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                        >
                          <option value="IN">قبض نقدي من الشركة (IN)</option>
                          <option value="OUT">صرف نقدي للشركة (OUT)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          المبلغ (ج.م) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={paymentData.amount}
                          onChange={(e) =>
                            setPaymentData((p) => ({
                              ...p,
                              amount: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-lg font-black text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          ملاحظات وسبب السداد
                        </label>
                        <textarea
                          rows="2"
                          value={paymentData.notes}
                          onChange={(e) =>
                            setPaymentData((p) => ({
                              ...p,
                              notes: e.target.value,
                            }))
                          }
                          placeholder="مثال: دفعة من حساب الفاتورة القديمة"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="mt-6 flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-70 shadow-lg shadow-emerald-600/20"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'تأكيد العملية وتحديث الخزينة'
                        )}
                      </button>
                    </form>
                  )}

                  {/* === فورم إضافة / تعديل شركة === */}
                  {(sheetConfig.mode === 'ADD_MERCHANT' ||
                    sheetConfig.mode === 'EDIT_MERCHANT') && (
                    <form onSubmit={handleMerchantSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            اسم الشركة / التاجر *
                          </label>
                          <input
                            name="company_name"
                            type="text"
                            value={merchantData.company_name}
                            onChange={(e) =>
                              setMerchantData((p) => ({
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
                            value={merchantData.merchant_type}
                            onChange={(e) =>
                              setMerchantData((p) => ({
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
                          'حفظ بيانات الشركة'
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
