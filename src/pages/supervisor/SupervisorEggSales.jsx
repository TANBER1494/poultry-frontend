import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Package, Tractor, 
  Loader2, CheckCircle2, AlertTriangle, Users, Printer, Receipt, User
} from 'lucide-react';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import merchantService from '../../services/merchantService';
import inventoryService from '../../services/inventoryService';
import { showAlert } from '../../utils/alert';

const SupervisorEggSales = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  const [activeLayerCycles, setActiveLayerCycles] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [eggStock, setEggStock] = useState(0); 
  
  // 🛡️ أرشيف الفواتير المصدرة في الجلسة الحالية
  const [recentInvoices, setRecentInvoices] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    cycle_id: '',
    merchant_id: '',
    rep_name: '', // 🛡️ إضافة حقل المندوب
    quantity: '',
    unit_price: '',
    paid_amount: ''
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
      const [cyclesRes, merchantsRes, inventoryRes] = await Promise.all([
        cycleService.getFarmCycles(farmId),
        merchantService.getMerchants(farmId),
        inventoryService.getInventoryItems(farmId)
      ]);
      
      if (isMounted) {
        const layers = (cyclesRes.cycles || []).filter(c => c.status === 'ACTIVE' && c.type === 'LAYER');
        setActiveLayerCycles(layers);
        
        const buyers = (merchantsRes.merchants || []).filter(m => ['EGG_BUYER', 'GENERAL'].includes(m.merchant_type));
        setMerchants(buyers);

        const eggItem = (inventoryRes.items || []).find(item => item.category === 'PRODUCT' && item.unit === 'TRAY');
        setEggStock(eggItem ? eggItem.stock_quantity : 0);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المبيعات');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    setFormData(p => ({ ...p, cycle_id: '', merchant_id: '', rep_name: '' }));
    setIsLoading(true);
    await fetchDependencies(newFarmId);
  };

  // 🛡️ استخراج المناديب للشركة المختارة
  const selectedMerchantData = merchants.find(m => m._id === formData.merchant_id);
  const availableReps = selectedMerchantData?.representatives || [];

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    
    if (eggStock < Number(formData.quantity)) {
      return showAlert.error('رصيد غير كافٍ', `الكمية المطلوبة للبيع تتجاوز الرصيد المتاح (${eggStock} طبق).`);
    }

    const totalInvoice = Number(formData.quantity) * Number(formData.unit_price);
    if (Number(formData.paid_amount) > totalInvoice) {
      return showAlert.error('خطأ حسابي', 'المبلغ المدفوع أكبر من إجمالي الفاتورة.');
    }

    try {
      setIsSubmitting(true);
      const now = new Date();
      
      const payload = {
        local_id: `SALE_${Date.now()}`,
        merchant_id: formData.merchant_id,
        sale_category: 'EGGS',
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        paid_amount: formData.paid_amount || 0,
        transaction_date: now.toISOString(), // 🛡️ تاريخ تلقائي دقيق
        notes: formData.rep_name ? `تم التسليم للمندوب/السائق: ${formData.rep_name}` : '' // 🛡️ توثيق المندوب
      };

      await cycleService.recordCycleSale(formData.cycle_id, payload);
      showAlert.success('تمت العملية', 'تم تسجيل الفاتورة وخصم البيض من المخزن آلياً');
      
      // 🛡️ إضافة الفاتورة لأرشيف الجلسة للطباعة
      const newInvoiceRecord = {
        id: Math.floor(Math.random() * 1000000), // ID وهمي للطباعة السريعة
        date: now,
        company: selectedMerchantData?.company_name,
        rep: formData.rep_name || 'غير محدد',
        quantity: formData.quantity,
        total: totalInvoice,
        paid: formData.paid_amount || 0
      };
      setRecentInvoices(prev => [newInvoiceRecord, ...prev]);

      // تصفير الفورم وتحديث الأرصدة
      setFormData(p => ({ ...p, quantity: '', unit_price: '', paid_amount: '' }));
      await fetchDependencies(selectedFarmId);
    } catch (error) {
      showAlert.error('فشل عملية البيع', error.response?.data?.message || 'تأكد من صحة البيانات والأرصدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🖨️ دالة طباعة الفاتورة (Receipt Printer Style)
  const handlePrint = (invoice) => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة مبيعات بيض #${invoice.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: auto; color: #000; }
            h2 { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; font-size: 18px; }
            .line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
            .total { font-size: 16px; font-weight: 900; }
            .footer { text-align: center; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h2>فاتورة مبيعات بيض</h2>
          <div class="line"><span>التاريخ:</span> <span>${invoice.date.toLocaleDateString('ar-EG')}</span></div>
          <div class="line"><span>الوقت:</span> <span>${invoice.date.toLocaleTimeString('ar-EG')}</span></div>
          <div class="line"><span>الشركة/العميل:</span> <span>${invoice.company}</span></div>
          <div class="line"><span>المستلم/المندوب:</span> <span>${invoice.rep}</span></div>
          <div class="divider"></div>
          <div class="line"><span>الكمية (أطباق):</span> <span>${invoice.quantity}</span></div>
          <div class="divider"></div>
          <div class="line total"><span>الإجمالي:</span> <span>${invoice.total.toLocaleString()} ج.م</span></div>
          <div class="line"><span>المدفوع:</span> <span>${Number(invoice.paid).toLocaleString()} ج.م</span></div>
          <div class="line"><span>المتبقي الآجل:</span> <span>${(invoice.total - invoice.paid).toLocaleString()} ج.م</span></div>
          <div class="divider"></div>
          <div class="footer">تمت الطباعة بواسطة نظام إدارة المزارع</div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const totalValue = (Number(formData.quantity || 0) * Number(formData.unit_price || 0));
  const remainingValue = totalValue - Number(formData.paid_amount || 0);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-500" /> مبيعات البيض
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">إصدار فواتير البيع وطباعتها وتحديث المخزن آلياً</p>
        </div>
        <div className="relative">
          <Tractor className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>
      ) : activeLayerCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد عنابر بياض نشطة</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">لا يمكن بيع البيض إلا من خلال دورات وعنابر (البياض) النشطة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* الجانب الأيمن: نموذج البيع (مأخر في الموبايل، متقدم في الديسكتوب) */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="order-2 lg:order-1 lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <form onSubmit={handleSaleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">العنبر / الدورة *</label>
                    <select value={formData.cycle_id} onChange={e => setFormData(p => ({...p, cycle_id: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required>
                      <option value="">-- اختر العنبر --</option>
                      {activeLayerCycles.map(c => <option key={c._id} value={c._id}>{c.barn_id?.name} ({c.name})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الشركة / التاجر المشتري *</label>
                    <select value={formData.merchant_id} onChange={e => setFormData(p => ({...p, merchant_id: e.target.value, rep_name: ''}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required>
                      <option value="">-- اختر الشركة --</option>
                      {merchants.map(m => <option key={m._id} value={m._id}>{m.company_name}</option>)}
                    </select>
                  </div>
                </div>

                {/* 🛡️ اختيار المندوب المستلم (يظهر فقط إذا تم اختيار شركة) */}
                <AnimatePresence>
                  {formData.merchant_id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                        <label className="mb-1.5 block text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5"><User className="w-4 h-4"/> المندوب / السائق المستلم للطالبية *</label>
                        {availableReps.length > 0 ? (
                          <select value={formData.rep_name} onChange={e => setFormData(p => ({...p, rep_name: e.target.value}))} className="w-full rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-indigo-800 dark:bg-slate-900 dark:text-white" required>
                            <option value="">-- اختر المندوب الذي سيتسلم الفاتورة --</option>
                            {availableReps.map(rep => <option key={rep._id} value={rep.name}>{rep.name} {rep.phone ? `(${rep.phone})` : ''}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder="اكتب اسم المندوب أو السائق" value={formData.rep_name} onChange={e => setFormData(p => ({...p, rep_name: e.target.value}))} className="w-full rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-indigo-800 dark:bg-slate-900 dark:text-white" required />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الكمية المباعة (طبق) *</label>
                    <input type="number" min="1" max={eggStock} value={formData.quantity} onChange={e => setFormData(p => ({...p, quantity: e.target.value}))} className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-lg font-black text-emerald-700 outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">سعر الطبق (ج.م) *</label>
                    <input type="number" step="0.01" min="0.01" value={formData.unit_price} onChange={e => setFormData(p => ({...p, unit_price: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500">إجمالي قيمة الفاتورة:</span>
                    <span className="font-black text-lg text-slate-800 dark:text-white">{totalValue.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-bold text-slate-500">المدفوع نقداً للمزرعة (إن وجد)</label>
                      <input type="number" min="0" max={totalValue} value={formData.paid_amount} onChange={e => setFormData(p => ({...p, paid_amount: e.target.value}))} placeholder="0" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-emerald-600 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900" />
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-center">
                      <span className="block text-[10px] font-bold text-slate-500 mb-0.5">الباقي الآجل (مديونية)</span>
                      <span className="font-black text-rose-500 text-sm">{remainingValue.toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting || !formData.cycle_id || !formData.merchant_id || !formData.rep_name || Number(formData.quantity) <= 0} className="w-full flex justify-center items-center gap-2 rounded-xl bg-emerald-600 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-70 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> اعتماد الفاتورة والتسليم</>}
                </button>
              </form>
            </div>

            {/* 🛡️ أرشيف الفواتير المصدرة (Recent Invoices Archive) */}
            {recentInvoices.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-500" /> أرشيف فواتير اليوم
                </h3>
                <div className="space-y-3">
                  {recentInvoices.map((inv, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-800 dark:text-white">{inv.company}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">#{inv.id}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-1">المندوب: {inv.rep} | الكمية: {inv.quantity} طبق</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-400">الإجمالي</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{inv.total.toLocaleString()} ج.م</p>
                        </div>
                        <button onClick={() => handlePrint(inv)} className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors dark:bg-indigo-900/30 dark:text-indigo-400" title="طباعة إيصال الفاتورة">
                          <Printer className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* الجانب الأيسر: الرصيد (متقدم في الموبايل بفضل order-1، ومأخر في الديسكتوب) */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="order-1 lg:order-2 space-y-4">
            
            {/* كارت الرصيد المخزني للبيض */}
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center ${eggStock > 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30'}`}>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-3">
                <Package className={`w-8 h-8 ${eggStock > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              </div>
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">رصيد البيض الفعلي بالمخزن</h3>
              <p className={`text-4xl font-black ${eggStock > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {eggStock.toLocaleString()} <span className="text-sm font-bold opacity-70">طبق</span>
              </p>
              {eggStock === 0 && <p className="text-[10px] text-rose-500 mt-2 font-bold">يجب تسجيل يومية إنتاج لتغذية المخزن</p>}
            </div>

            {/* كارت التجار (مبسط للمشرف) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-white">
                <Users className="w-5 h-5 text-indigo-500"/>
                <h3 className="font-black">تجار البيض المعتمدين</h3>
              </div>
              {merchants.length > 0 ? (
                <ul className="space-y-2">
                  {merchants.map(m => (
                    <li key={m._id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{m.company_name}</span>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">حساب نشط</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 text-center">لم يتم إضافة تجار بيض في النظام.</p>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SupervisorEggSales;