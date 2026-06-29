import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Loader2, MoreVertical, Settings2, Trash2,
  Users, Phone, Tractor, FileText, ArrowUpRight, ArrowDownRight, 
  Building2, UserPlus, UserMinus, AlertTriangle, Wallet, Receipt, CalendarDays
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
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD', // 'ADD', 'EDIT', 'OPTIONS', 'REPS', 'STATEMENT'
    activeMerchant: null,
  });

  const [formData, setFormData] = useState({
    company_name: '', merchant_type: 'MEAT_BUYER', company_phone: '', address: '', 
    opening_balance: '', balance_type: 'DEBIT', status: 'ACTIVE', rep_name: '', rep_phone: ''
  });

  const [repFormData, setRepFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      try {
        setIsLoading(true);
        const farmsRes = await farmService.getFarms();
        const fetchedFarms = farmsRes.farms || [];
        if (isMounted) setFarms(fetchedFarms);

        if (fetchedFarms.length > 0) {
          const firstFarm = fetchedFarms[0];
          if (isMounted) {
            setSelectedFarmId(firstFarm._id);
            setFarmName(firstFarm.name);
          }
          await fetchMerchants(firstFarm._id, isMounted);
        } else {
          if (isMounted) setIsLoading(false);
        }
      } catch (error) {
        showAlert.error('خطأ', 'تعذر جلب البيانات الأساسية');
        if (isMounted) setIsLoading(false);
      }
    };
    initializeData();
    return () => { isMounted = false; };
  }, []);

  const fetchMerchants = async (farmId, isMounted = true) => {
    try {
      setIsLoading(true); 
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
    const selectedFarm = farms.find(f => f._id === newFarmId);
    if (selectedFarm) setFarmName(selectedFarm.name);
    await fetchMerchants(newFarmId);
  };

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD', activeMerchant: null });
    setStatementData(null);
  };

  const openAddSheet = () => {
    setFormData({ company_name: '', merchant_type: 'MEAT_BUYER', company_phone: '', address: '', opening_balance: '', balance_type: 'DEBIT', status: 'ACTIVE', rep_name: '', rep_phone: '' });
    setSheetConfig({ isOpen: true, mode: 'ADD', activeMerchant: null });
  };

  const openOptionsSheet = (merchant) => setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeMerchant: merchant });
  
  const openRepsSheet = (merchant) => {
    setRepFormData({ name: '', phone: '' });
    setSheetConfig({ isOpen: true, mode: 'REPS', activeMerchant: merchant });
  };

  const openEditSheet = (merchant) => {
    setFormData({ 
      company_name: merchant.company_name, merchant_type: merchant.merchant_type,
      company_phone: merchant.company_phone || '', address: merchant.address || '', 
      status: merchant.status, rep_name: '', rep_phone: '' 
    });
    setSheetConfig({ isOpen: true, mode: 'EDIT', activeMerchant: merchant });
  };

  // 🛡️ دالة جلب وعرض كشف الحساب
  const openStatementSheet = async (merchant) => {
    setSheetConfig({ isOpen: true, mode: 'STATEMENT', activeMerchant: merchant });
    try {
      setIsStatementLoading(true);
      const data = await merchantService.getMerchantStatement(merchant._id);
      setStatementData(data);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب كشف حساب التاجر');
    } finally {
      setIsStatementLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      if (sheetConfig.mode === 'ADD') {
        if (!formData.company_name || !formData.rep_name || !formData.merchant_type) {
          setIsActionLoading(false);
          return showAlert.error('بيانات ناقصة', 'اسم الشركة واسم المندوب الأساسي حقول مطلوبة');
        }
        
        let finalOpeningBalance = Math.abs(Number(formData.opening_balance) || 0);
        if (formData.balance_type === 'CREDIT') finalOpeningBalance = -finalOpeningBalance; 

        const payload = { 
            ...formData, opening_balance: finalOpeningBalance, farm_id: selectedFarmId,
            representatives: [{ name: formData.rep_name, phone: formData.rep_phone, is_primary: true }]
        };

        await merchantService.addMerchant(payload);
        showAlert.success('تمت الإضافة', 'تم تسجيل الشركة والمندوب بنجاح');
        closeSheet();
      } else if (sheetConfig.mode === 'EDIT') {
        const payload = { 
          company_name: formData.company_name, company_phone: formData.company_phone, 
          address: formData.address, status: formData.status, farm_id: selectedFarmId 
        };
        await merchantService.updateMerchant(sheetConfig.activeMerchant._id, payload);
        showAlert.success('تم التحديث', 'تم حفظ بيانات الشركة');
        closeSheet();
      }
      await fetchMerchants(selectedFarmId);
    } catch (error) {
      showAlert.error('فشل الإجراء', error.response?.data?.message || 'تعذر حفظ البيانات');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddRep = async (e) => {
    e.preventDefault();
    if (!repFormData.name) return showAlert.error('خطأ', 'اسم المندوب مطلوب');
    try {
      setIsActionLoading(true);
      const payload = { ...repFormData, farm_id: selectedFarmId };
      const updatedMerchant = await merchantService.addRepresentative(sheetConfig.activeMerchant._id, payload);
      setSheetConfig(prev => ({ ...prev, activeMerchant: updatedMerchant.merchant }));
      setRepFormData({ name: '', phone: '' });
      showAlert.success('نجاح', 'تم إضافة المندوب للشركة');
      fetchMerchants(selectedFarmId, false);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل إضافة المندوب');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveRep = async (repId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المندوب؟')) return;
    try {
      setIsActionLoading(true);
      const updatedMerchant = await merchantService.removeRepresentative(sheetConfig.activeMerchant._id, repId, selectedFarmId);
      setSheetConfig(prev => ({ ...prev, activeMerchant: updatedMerchant.merchant }));
      showAlert.success('نجاح', 'تم حذف المندوب');
      fetchMerchants(selectedFarmId, false);
    } catch (error) {
      showAlert.error('خطأ', 'فشل حذف المندوب');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteMerchant = async (merchant) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشركة (${merchant.company_name}) بالكامل؟ لا يمكن التراجع.`)) return;
    try {
      setIsActionLoading(true);
      await merchantService.deleteMerchant(merchant._id, selectedFarmId);
      showAlert.success('تم الحذف', 'تم حذف الكيان المالي من النظام');
      closeSheet();
      await fetchMerchants(selectedFarmId);
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'لا يمكن الحذف');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getMerchantTypeName = (type) => {
    const types = { 'MEAT_BUYER': 'شركة لحوم/طيور', 'EGG_BUYER': 'تاجر بيض', 'MANURE_BUYER': 'تاجر سباخ/سماد', 'FEED_SUPPLIER': 'مصنع/مورد أعلاف', 'CHICK_SUPPLIER': 'شركة كتاكيت', 'MED_SUPPLIER': 'شركة أدوية', 'GENERAL': 'شركة عامة / أخرى' };
    return types[type] || type;
  };

  const isSupplier = (type) => ['FEED_SUPPLIER', 'CHICK_SUPPLIER', 'MED_SUPPLIER'].includes(type);
  const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

  // 🛡️ دمج الفواتير والحركات لعمل (Timeline) موحد
  const getTimeline = () => {
    if (!statementData) return [];
    const timeline = [];
    if (statementData.invoices_history) {
      statementData.invoices_history.forEach(inv => timeline.push({ ...inv, _type: 'INVOICE', _date: new Date(inv.invoice_date) }));
    }
    if (statementData.transactions_history) {
      statementData.transactions_history.forEach(trx => timeline.push({ ...trx, _type: 'TRANSACTION', _date: new Date(trx.transaction_date) }));
    }
    return timeline.sort((a, b) => b._date - a._date);
  };

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">إدارة الشركات والموردين {farmName ? `(${farmName})` : ''}</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">إدارة الكيانات المالية ومناديبها وكشوف الحسابات</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"><Tractor className="h-4 w-4" /></div>
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {farms.length === 0 && <option value="">لا توجد مزارع</option>}
              {farms.map(farm => <option key={farm._id} value={farm._id}>{farm.name}</option>)}
            </select>
          </div>
          <button onClick={openAddSheet} disabled={farms.length === 0} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">إضافة كيان مالي</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      ) : merchants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50"><Building2 className="h-8 w-8 text-slate-400 dark:text-slate-500" /></div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">لا توجد شركات مسجلة</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {merchants.map(merchant => {
            const supplierCheck = isSupplier(merchant.merchant_type);
            const balanceIsCredit = merchant.opening_balance < 0; 
            const absBalance = Math.abs(merchant.opening_balance);
            const repsCount = merchant.representatives?.length || 0;

            return (
              <motion.div key={merchant._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${!supplierCheck ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {!supplierCheck ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white truncate max-w-[150px]">{merchant.company_name}</h3>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit">
                          {getMerchantTypeName(merchant.merchant_type)}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => openOptionsSheet(merchant)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"><MoreVertical className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <div className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> المناديب: {repsCount}</div>
                      <button onClick={() => openRepsSheet(merchant)} className="text-[10px] text-emerald-600 hover:underline">إدارة المناديب</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">ديون سابقة (وقت التسجيل):</span>
                  <span className={`font-black text-sm flex items-center gap-1 ${balanceIsCredit ? 'text-rose-600 dark:text-rose-400' : absBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {absBalance === 0 ? 'رصيد صفري' : balanceIsCredit ? `لهم ${absBalance.toLocaleString()} ج.م` : `عليهم ${absBalance.toLocaleString()} ج.م`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal / Bottom Sheet */}
      <AnimatePresence>
        {sheetConfig.isOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={closeSheet} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD' ? 'إضافة شركة جديدة' : sheetConfig.mode === 'EDIT' ? 'تعديل بيانات الشركة' : sheetConfig.mode === 'REPS' ? 'إدارة مناديب الشركة' : sheetConfig.mode === 'STATEMENT' ? 'كشف حساب التاجر' : 'خيارات الحساب'}
                  </h3>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-5 overflow-y-auto custom-scrollbar">
                  
                  {/* OPTIONS MODE */}
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeMerchant && (
                    <div className="space-y-3">
                      <button onClick={() => openStatementSheet(sheetConfig.activeMerchant)} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-colors">
                        <FileText className="w-4 h-4" /> استعراض كشف الحساب والأرشيف
                      </button>
                      <button onClick={() => openEditSheet(sheetConfig.activeMerchant)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:text-slate-300 font-bold text-sm mt-4">
                        <Settings2 className="w-4 h-4" /> تعديل بيانات الإدارة
                      </button>
                      <button onClick={() => openRepsSheet(sheetConfig.activeMerchant)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:text-slate-300 font-bold text-sm">
                        <Users className="w-4 h-4" /> إدارة المناديب المعتمدين
                      </button>
                      <button onClick={() => handleDeleteMerchant(sheetConfig.activeMerchant)} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 font-bold text-sm border border-rose-100 dark:border-rose-900/30">
                        <Trash2 className="w-4 h-4" /> حذف الحساب نهائياً
                      </button>
                    </div>
                  )}

                  {/* STATEMENT MODE (كشف الحساب والأرشيف) 🛡️ */}
                  {sheetConfig.mode === 'STATEMENT' && (
                    <div>
                      {isStatementLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                      ) : !statementData ? (
                         <div className="text-center py-10 text-slate-500 text-sm font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl">تعذر تحميل كشف الحساب</div>
                      ) : (
                        <div className="space-y-6">
                           {/* بطاقة الرصيد النهائي المجمعة */}
                           <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl shadow-inner text-white">
                              <p className="text-[11px] font-bold text-indigo-200 mb-1">الرصيد المالي الحالي (الصافي)</p>
                              <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-black">{formatCurrency(Math.abs(statementData.merchant_info.current_calculated_balance))}</h2>
                                <Wallet className="w-8 h-8 opacity-50" />
                              </div>
                              <div className="mt-3 inline-block px-3 py-1 rounded-lg text-xs font-bold bg-white/10 backdrop-blur-sm">
                                {statementData.merchant_info.current_calculated_balance < 0 
                                  ? 'الرصيد دائن: التاجر/المورد له فلوس عند المزرعة' 
                                  : statementData.merchant_info.current_calculated_balance > 0 
                                  ? 'الرصيد مدين: التاجر/المورد عليه فلوس للمزرعة' 
                                  : 'الحساب مُصفى (رصيد صفري)'}
                              </div>
                           </div>

                           {/* التايم لاين المدمج للفواتير والحركات */}
                           <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">السجل التاريخي (الفواتير والدفعات)</h4>
                              {getTimeline().length === 0 ? (
                                 <div className="text-center py-6 text-slate-500 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">لا توجد أي حركات مسجلة لهذا الحساب</div>
                              ) : (
                                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                                  {getTimeline().map((item, idx) => {
                                    const isInvoice = item._type === 'INVOICE';
                                    return (
                                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                          {isInvoice ? <Receipt className="w-4 h-4 text-indigo-500" /> : <Wallet className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isInvoice ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'}`}>
                                              {isInvoice ? (item.invoice_type === 'SALE' ? 'فاتورة مبيعات' : 'فاتورة مشتريات') : (item.type === 'IN' ? 'سند قبض نقدي' : 'سند صرف نقدي')}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {item._date.toLocaleDateString('ar-EG')}</span>
                                          </div>
                                          <div className="mt-2">
                                            {isInvoice ? (
                                              <>
                                                <p className="text-sm font-black text-slate-800 dark:text-white">قيمة الفاتورة: {formatCurrency(item.total_amount)}</p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">المدفوع: {formatCurrency(item.paid_amount)} | المتبقي الآجل: {formatCurrency(item.remaining_amount)}</p>
                                              </>
                                            ) : (
                                              <>
                                                <p className="text-sm font-black text-slate-800 dark:text-white">المبلغ المنفذ: {formatCurrency(item.amount)}</p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1">مرجع: {item.reference_doc || 'بدون مرجع'}</p>
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

                  {/* REPS MODE (إدارة المناديب) */}
                  {sheetConfig.mode === 'REPS' && sheetConfig.activeMerchant && (
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">المناديب المسجلين</h4>
                      
                      {sheetConfig.activeMerchant.representatives?.length === 0 && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-bold text-amber-800 leading-relaxed">تنبيه: هذه الشركة لا تحتوي على مناديب. يجب إضافة مندوب واحد على الأقل لتتمكن من إصدار الفواتير لها.</p>
                        </div>
                      )}

                      <div className="space-y-2 mb-6">
                        {sheetConfig.activeMerchant.representatives?.map(rep => (
                          <div key={rep._id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{rep.name}</p>
                              <p className="text-xs text-slate-500" dir="ltr">{rep.phone || 'بدون رقم'}</p>
                            </div>
                            <button onClick={() => handleRemoveRep(rep._id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><UserMinus className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>

                      <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3 border-t border-slate-100 dark:border-slate-800 pt-4">إضافة مندوب جديد</h4>
                      <form onSubmit={handleAddRep} className="space-y-3">
                        <input type="text" placeholder="اسم المندوب *" value={repFormData.name} onChange={e => setRepFormData(p => ({...p, name: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                        <input type="tel" dir="ltr" placeholder="رقم هاتف المندوب" value={repFormData.phone} onChange={e => setRepFormData(p => ({...p, phone: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                        <button type="submit" disabled={isActionLoading} className="w-full flex justify-center items-center rounded-xl bg-slate-900 dark:bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-70 gap-2">
                          {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> إضافة للمنظومة</>}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* ADD / EDIT MODE */}
                  {(sheetConfig.mode === 'ADD' || sheetConfig.mode === 'EDIT') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">اسم الكيان أو الشركة *</label>
                        <input name="company_name" type="text" value={formData.company_name} onChange={(e) => setFormData(p => ({...p, company_name: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      
                      {sheetConfig.mode === 'ADD' && (
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">طبيعة نشاط الشركة *</label>
                          <select value={formData.merchant_type} onChange={(e) => setFormData(p => ({...p, merchant_type: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required>
                            <optgroup label="المشترين (تجار يسحبون من المزرعة)">
                              <option value="MEAT_BUYER">شركة / تاجر طيور ولحم</option>
                              <option value="EGG_BUYER">شركة / تاجر بيض</option>
                              <option value="MANURE_BUYER">شركة / تاجر سباخ</option>
                            </optgroup>
                            <optgroup label="الموردين (يبيعون للمزرعة)">
                              <option value="FEED_SUPPLIER">مصنع / مورد أعلاف</option>
                              <option value="CHICK_SUPPLIER">شركة / مورد كتاكيت</option>
                              <option value="MED_SUPPLIER">شركة / مورد أدوية</option>
                            </optgroup>
                            <option value="GENERAL">كيان عام / أخرى</option>
                          </select>
                        </div>
                      )}

                      {sheetConfig.mode === 'ADD' && (
                         <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                            <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 mb-3">بيانات المندوب المسؤول الأساسي</h4>
                            <div className="space-y-3">
                              <input type="text" placeholder="اسم المندوب *" value={formData.rep_name} onChange={(e) => setFormData(p => ({...p, rep_name: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" required />
                              <input type="tel" dir="ltr" placeholder="رقم هاتف المندوب (اختياري)" value={formData.rep_phone} onChange={(e) => setFormData(p => ({...p, rep_phone: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                            </div>
                         </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">هاتف الشركة (الإدارة)</label>
                        <input name="company_phone" type="tel" dir="ltr" value={formData.company_phone} onChange={(e) => setFormData(p => ({...p, company_phone: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>

                      {sheetConfig.mode === 'ADD' && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">الرصيد الافتتاحي (السابق)</label>
                          <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input type="radio" name="balance_type" value="DEBIT" checked={formData.balance_type === 'DEBIT'} onChange={(e) => setFormData(p => ({...p, balance_type: e.target.value}))} className="text-emerald-600 focus:ring-emerald-500" />
                              الشركة عليها فلوس
                            </label>
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input type="radio" name="balance_type" value="CREDIT" checked={formData.balance_type === 'CREDIT'} onChange={(e) => setFormData(p => ({...p, balance_type: e.target.value}))} className="text-rose-600 focus:ring-rose-500" />
                              الشركة لها فلوس
                            </label>
                          </div>
                          <input name="opening_balance" type="number" min="0" step="0.01" value={formData.opening_balance} onChange={(e) => setFormData(p => ({...p, opening_balance: e.target.value}))} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </div>
                      )}

                      <button type="submit" disabled={isActionLoading} className="mt-4 flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70">
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ البيانات'}
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