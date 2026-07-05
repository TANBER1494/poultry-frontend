import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, Tractor, Loader2, Printer, CalendarDays, Search, Building2, ChevronDown, ChevronUp, UserCircle, Share2
} from 'lucide-react';
import html2canvas from 'html2canvas'; // 🚀 استيراد مكتبة الصور
import farmService from '../../services/farmService';
import invoiceService from '../../services/invoiceService';
import { showAlert } from '../../utils/alert';

const SupervisorInvoices = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  const [invoicesByMerchant, setInvoicesByMerchant] = useState({});
  const [expandedMerchants, setExpandedMerchants] = useState([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sharingId, setSharingId] = useState(null); // 🚀 تتبع الفاتورة الجاري مشاركتها

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
      
      const eggInvoicesOnly = (res.invoices || []).filter(inv => 
        inv.items && inv.items.some(item => 
          item.item_name.includes('بيض') || item.item_name.includes('طبق')
        )
      );

      const grouped = eggInvoicesOnly.reduce((acc, inv) => {
        const merchantName = inv.merchant_id?.company_name || 'تجار غير محددين / محذوفين';
        if (!acc[merchantName]) acc[merchantName] = [];
        acc[merchantName].push(inv);
        return acc;
      }, {});

      if (isMounted) {
        setInvoicesByMerchant(grouped);
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

  // 🚀 استخراج بيانات الفاتورة لبناء الإيصال (مشترك للطباعة والصورة)
  const buildReceiptHTML = (inv) => {
    const invDate = new Date(inv.invoice_date);
    const companyName = inv.merchant_id?.company_name || 'غير محدد';
    const repName = inv.representative_name || inv.notes?.replace('تم التسليم للمندوب/السائق:', '') || 'غير مسجل';
    const invoiceNumber = inv.local_id.split('_')[1] || inv.local_id;

    // استخراج الأصناف
    const itemsList = (inv.items || []).map(item => `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding: 8px 0; font-size: 14px;">
        <span style="font-weight: bold; color: #334155;">${item.item_name}</span>
        <span style="font-weight: 900; color: #0f172a;">${item.quantity} طبق</span>
      </div>
    `).join('');

    return `
      <div style="direction: rtl; font-family: 'Tahoma', Arial, sans-serif; padding: 30px 20px; max-width: 400px; margin: auto; background: #fff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0 0 5px 0; font-size: 22px; color: #1e1b4b; font-weight: 900;">إيصال تسليم مبيعات</h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">إدارة المزارع والدواجن</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
            <span style="color: #64748b; font-weight: bold;">رقم الفاتورة:</span> 
            <span style="font-weight: 900; background: #e0e7ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px;">#${invoiceNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
            <span style="color: #64748b; font-weight: bold;">التاريخ:</span> 
            <span style="font-weight: bold;">${invDate.toLocaleDateString('ar-EG')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: #64748b; font-weight: bold;">الوقت:</span> 
            <span style="font-weight: bold;">${invDate.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
            <span style="color: #64748b; font-weight: bold;">الشركة المستلمة:</span> 
            <span style="font-weight: 900;">${companyName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: #64748b; font-weight: bold;">المندوب / السائق:</span> 
            <span style="font-weight: 900;">${repName}</span>
          </div>
        </div>

        <div style="border-top: 2px dashed #cbd5e1; padding-top: 15px; margin-bottom: 20px;">
          <div style="color: #64748b; font-size: 12px; font-weight: bold; margin-bottom: 10px;">تفاصيل الكميات:</div>
          ${itemsList}
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px;">
            <span style="color: #334155; font-weight: 900;">الإجمالي المطلوب:</span> 
            <span style="font-weight: 900; color: #0f172a;">${inv.total_amount.toLocaleString()} ج.م</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
            <span style="color: #64748b; font-weight: bold;">المدفوع نقداً:</span> 
            <span style="font-weight: bold; color: #059669;">${inv.paid_amount.toLocaleString()} ج.م</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: #64748b; font-weight: bold;">المتبقي الآجل:</span> 
            <span style="font-weight: bold; color: #e11d48;">${inv.remaining_amount.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div style="margin-top: 30px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
          <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: #334155;">توقيع المندوب المستلم</p>
          <p style="margin: 0; font-size: 16px; color: #94a3b8;">....................................</p>
          <p style="margin: 20px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: bold;">تم الإنشاء بواسطة نظام إدارة المزرعة 🚀</p>
        </div>
      </div>
    `;
  };

  // 🖨️ دالة الطباعة الاحترافية (Iframe)
  const handlePrint = (inv) => {
    const htmlContent = `
      <html dir="rtl">
        <head>
          <title>فاتورة #${inv.local_id.split('_')[1] || inv.local_id}</title>
          <style>body { margin: 0; padding: 0; background: #fff; }</style>
        </head>
        <body>${buildReceiptHTML(inv)}</body>
      </html>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
    iframe.contentWindow.focus();
    
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  // 🖼️ دالة توليد الإيصال كصورة ومشاركته
  const handleShareAsImage = async (inv) => {
    try {
      setSharingId(inv._id);
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.innerHTML = buildReceiptHTML(inv);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('فشل إنشاء الصورة');
        const file = new File([blob], `Invoice_${inv.local_id}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'إيصال تسليم',
            text: `إيصال استلام بضاعة - شركة ${inv.merchant_id?.company_name || 'مبيعات'}`
          });
        } else {
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = `Invoice_${inv.local_id}.png`;
           a.click();
           URL.revokeObjectURL(url);
           showAlert.success('تم الحفظ', 'تم تحميل الإيصال بنجاح.');
        }
      }, 'image/png');

    } catch (err) {
      console.error(err);
      showAlert.error('خطأ', 'تعذر معالجة ومشاركة الإيصال');
    } finally {
      setSharingId(null);
    }
  };

  const filteredMerchants = Object.keys(invoicesByMerchant).filter(merchantName => {
    if (merchantName.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    return invoicesByMerchant[merchantName].some(inv => 
      (inv.local_id || '').includes(searchTerm) || 
      (inv.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.representative_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-500" /> أرشيف الفواتير
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">استعراض ومشاركة إيصالات التسليم للشركات</p>
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
            const merchantInvoices = invoicesByMerchant[merchantName].filter(inv => 
              searchTerm === '' ||
              merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (inv.local_id || '').includes(searchTerm) || 
              (inv.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (inv.representative_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );

            return (
              <div key={merchantName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                <button onClick={() => toggleMerchantAccordion(merchantName)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 p-2.5 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h3 className="font-black text-slate-800 dark:text-white text-base">{merchantName}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">يوجد {merchantInvoices.length} إيصالات تسليم</p>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

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

                                <div className="space-y-2 mb-5">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 flex items-center gap-1.5"><UserCircle className="w-4 h-4"/> المندوب:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{repName}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">إجمالي المطلوب:</span>
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

                              {/* 🚀 أزرار الإجراءات */}
                              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                  onClick={() => handleShareAsImage(inv)} 
                                  disabled={sharingId === inv._id} 
                                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors font-bold text-xs dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 disabled:opacity-50"
                                >
                                  {sharingId === inv._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Share2 className="w-4 h-4" /> مشاركة واتساب</>}
                                </button>
                                
                                <button 
                                  onClick={() => handlePrint(inv)} 
                                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors font-bold text-xs dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400"
                                >
                                  <Printer className="w-4 h-4" /> طباعة إيصال
                                </button>
                              </div>

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