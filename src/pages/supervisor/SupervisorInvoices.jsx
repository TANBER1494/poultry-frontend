import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, Tractor, Loader2, Printer, CalendarDays, Search, Building2, ChevronDown, ChevronUp, UserCircle
} from 'lucide-react';
import farmService from '../../services/farmService';
import invoiceService from '../../services/invoiceService';
import { showAlert } from '../../utils/alert';

const SupervisorInvoices = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  const [invoicesByMerchant, setInvoicesByMerchant] = useState({});
  const [expandedMerchants, setExpandedMerchants] = useState([]); // للتحكم في القوائم المنسدلة
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
          await fetchInvoices(firstFarm, isMounted);
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

  const fetchInvoices = async (farmId, isMounted = true) => {
    try {
      setIsLoading(true);
      const res = await invoiceService.getInvoices(farmId, { invoice_type: 'SALE' });
      
      //  التصفية التشغيلية (Domain Isolation): إجبار الشاشة على عرض فواتير البيض فقط للمشرف
      // نبحث داخل أصناف الفاتورة عن أي صنف يحتوي على كلمة "بيض" أو "طبق"
      const eggInvoicesOnly = (res.invoices || []).filter(inv => 
        inv.items && inv.items.some(item => 
          item.item_name.includes('بيض') || item.item_name.includes('طبق')
        )
      );

      //  التجميع المعماري: تجميع فواتير البيض فقط حسب اسم الشركة
      const grouped = eggInvoicesOnly.reduce((acc, inv) => {
        const merchantName = inv.merchant_id?.company_name || 'تجار غير محددين / محذوفين';
        if (!acc[merchantName]) acc[merchantName] = [];
        acc[merchantName].push(inv);
        return acc;
      }, {});

      if (isMounted) {
        setInvoicesByMerchant(grouped);
        // فتح أول شركة تلقائياً
        const sortedMerchants = Object.keys(grouped).sort();
        if (sortedMerchants.length > 0) {
          setExpandedMerchants([sortedMerchants[0]]);
        }
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب أرشيف الفواتير');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleFarmChange = async (e) => {
    const newFarmId = e.target.value;
    setSelectedFarmId(newFarmId);
    await fetchInvoices(newFarmId);
  };

  const toggleMerchantAccordion = (merchantName) => {
    setExpandedMerchants(prev => 
      prev.includes(merchantName) ? prev.filter(m => m !== merchantName) : [...prev, merchantName]
    );
  };

  // 🖨️ دالة الطباعة الاحترافية
  const handlePrint = (inv) => {
    const quantity = inv.items && inv.items.length > 0 ? inv.items[0].quantity : 0;
    const invDate = new Date(inv.invoice_date);
    const companyName = inv.merchant_id?.company_name || 'غير محدد';
    // استخراج اسم المندوب من الملاحظات إذا كان موجوداً
    const repName = inv.representative_name || inv.notes?.replace('تم التسليم للمندوب/السائق:', '') || 'غير مسجل';

    const printContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة مبيعات #${inv.local_id.split('_')[1] || inv.local_id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: auto; color: #000; }
            h2 { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; font-size: 18px; }
            .line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
            .total { font-size: 16px; font-weight: 900; }
            .footer { text-align: center; font-size: 12px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>إيصال تسليم مبيعات</h2>
          <div class="line"><span>رقم الفاتورة:</span> <span>${inv.local_id.split('_')[1] || inv.local_id}</span></div>
          <div class="line"><span>التاريخ:</span> <span>${invDate.toLocaleDateString('ar-EG')}</span></div>
          <div class="line"><span>الوقت:</span> <span>${invDate.toLocaleTimeString('ar-EG')}</span></div>
          <div class="divider"></div>
          <div class="line"><span>الشركة/العميل:</span> <span>${companyName}</span></div>
          <div class="line"><span>المندوب المستلم:</span> <span>${repName}</span></div>
          <div class="divider"></div>
          <div class="line"><span>الكمية (أطباق):</span> <span>${quantity}</span></div>
          <div class="divider"></div>
          <div class="line total"><span>الإجمالي:</span> <span>${inv.total_amount.toLocaleString()} ج.م</span></div>
          <div class="line"><span>المدفوع نقداً:</span> <span>${inv.paid_amount.toLocaleString()} ج.م</span></div>
          <div class="line"><span>المتبقي الآجل:</span> <span>${inv.remaining_amount.toLocaleString()} ج.م</span></div>
          <div class="footer">توقيع المستلم: .....................</div>
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

  // فلترة الشركات والفواتير حسب البحث
  const filteredMerchants = Object.keys(invoicesByMerchant).filter(merchantName => {
    // التحقق من اسم الشركة
    if (merchantName.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    
    // أو التحقق من وجود الفاتورة أو المندوب داخل الشركة
    return invoicesByMerchant[merchantName].some(inv => 
      (inv.local_id || '').includes(searchTerm) || 
      (inv.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.representative_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-500" /> أرشيف الفواتير
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">استعراض وطباعة الفواتير مقسمة حسب الشركات</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="بحث بشركة، مندوب، أو رقم..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" 
            />
          </div>
          <div className="relative">
            <Tractor className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="w-full sm:w-48 rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
      ) : filteredMerchants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد فواتير</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">لم يتم العثور على فواتير تطابق بحثك في هذه المزرعة.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMerchants.map(merchantName => {
            const isExpanded = expandedMerchants.includes(merchantName);
            // فلترة الفواتير داخل الشركة إذا كان هناك بحث نشط
            const merchantInvoices = invoicesByMerchant[merchantName].filter(inv => 
              searchTerm === '' ||
              merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (inv.local_id || '').includes(searchTerm) || 
              (inv.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
            );

            return (
              <div key={merchantName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                {/* Accordion Header */}
                <button onClick={() => toggleMerchantAccordion(merchantName)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 p-2.5 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h3 className="font-black text-slate-800 dark:text-white text-base">{merchantName}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">يوجد {merchantInvoices.length} فواتير مسجلة</p>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Accordion Body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-800">
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                        {merchantInvoices.map((inv) => {
                           const repName = inv.representative_name || inv.notes?.replace('تم التسليم للمندوب/السائق:', '') || 'غير مسجل';
                           
                           return (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={inv._id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
                                  <div>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-md mb-1 block w-fit">
                                      #{inv.local_id.split('_')[1] || inv.local_id}
                                    </span>
                                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1.5">
                                      <CalendarDays className="w-3 h-3" /> {new Date(inv.invoice_date).toLocaleDateString('ar-EG')} - {new Date(inv.invoice_date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                  </div>
                                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${inv.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : inv.payment_status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                    {inv.payment_status === 'PAID' ? 'مسددة' : inv.payment_status === 'PARTIAL' ? 'دفع جزئي' : 'آجلة'}
                                  </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 flex items-center gap-1.5"><UserCircle className="w-4 h-4"/> المندوب:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{repName}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">إجمالي الفاتورة:</span>
                                    <span className="font-black text-slate-900 dark:text-white">{inv.total_amount.toLocaleString()} ج.م</span>
                                  </div>
                                  {inv.remaining_amount > 0 && (
                                    <div className="flex justify-between items-center text-[11px] bg-rose-50 dark:bg-rose-900/10 p-1.5 rounded text-rose-600 dark:text-rose-400 mt-2">
                                      <span className="font-bold">المتبقي الآجل:</span>
                                      <span className="font-black">{inv.remaining_amount.toLocaleString()} ج.م</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button onClick={() => handlePrint(inv)} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors font-bold text-sm dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                                <Printer className="w-4 h-4" /> طباعة
                              </button>
                            </motion.div>
                           )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupervisorInvoices;