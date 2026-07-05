import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Loader2, ClipboardList, Activity, Package, 
  Bird, CalendarDays, Wheat, Table, Search, Printer, ChevronDown, ChevronUp, Share2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import inventoryService from '../../services/inventoryService';
import dailyLogService from '../../services/dailyLogService';
import invoiceService from '../../services/invoiceService'; // 🚀 استيراد خدمة الفواتير
import { showAlert } from '../../utils/alert';

const DailyLogs = () => {
  const [searchParams] = useSearchParams();
  const isNewAction = searchParams.get('action') === 'new';

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  const [activeCycles, setActiveCycles] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [generalItems, setGeneralItems] = useState([]); 
  const [productItems, setProductItems] = useState([]); 
  
  const [logsByDate, setLogsByDate] = useState({});
  const [salesByDate, setSalesByDate] = useState({}); // 🚀 حالة جديدة لتخزين مبيعات كل يوم
  const [expandedDates, setExpandedDates] = useState([]); 
  const [searchDate, setSearchDate] = useState(''); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSharing, setIsSharing] = useState(false); 
  
  const [isFormOpen, setIsFormOpen] = useState(isNewAction);

  const [globalLogDate, setGlobalLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [globalFeedItem, setGlobalFeedItem] = useState('');
  const [bulkData, setBulkData] = useState({});

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
      const [cyclesRes, inventoryRes] = await Promise.all([
        cycleService.getFarmCycles(farmId),
        inventoryService.getInventoryItems(farmId)
      ]);
      
      if (isMounted) {
        const active = (cyclesRes.cycles || []).filter(c => c.status === 'ACTIVE');
        active.sort((a, b) => (a.barn_id?.name || '').localeCompare(b.barn_id?.name || '', 'ar', { numeric: true }));
        setActiveCycles(active);
        
        const invItems = inventoryRes.items || [];
        setFeedItems(invItems.filter(item => item.category === 'FEED'));
        setGeneralItems(invItems.filter(item => !['FEED', 'PRODUCT'].includes(item.category)));
        setProductItems(invItems.filter(item => item.category === 'PRODUCT')); 

        const initialBulk = {};
        active.forEach(c => {
          initialBulk[c._id] = {
            mortality_count: '', feed_consumed_bags: '', egg_trays_produced: '', 
            medication_item_id: '', medication_quantity: '' // 🚀 إزالة الملاحظات من الفورم
          };
        });
        setBulkData(initialBulk);

        if (active.length > 0) {
          await fetchAllActiveLogs(active, farmId);
        } else {
          setLogsByDate({});
          setSalesByDate({});
        }
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات الدورات والمخزن');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const fetchAllActiveLogs = async (cycles, farmId) => {
    try {
      setIsLogsLoading(true);
      
      // 🚀 جلب اليوميات والمبيعات بالتوازي في نفس الوقت للسرعة
      const promises = cycles.map(c => dailyLogService.getCycleDailyLogs(c._id, farmId));
      promises.push(invoiceService.getInvoices(farmId, { invoice_type: 'SALE' })); 
      
      const results = await Promise.all(promises);
      const invoicesRes = results.pop(); // الفواتير هي آخر وعد تم إضافته
      
      // 🚀 تصفية فواتير البيض وتجميعها حسب التاريخ
      const eggInvoicesOnly = (invoicesRes.invoices || []).filter(inv => 
        inv.items && inv.items.some(item => item.item_name.includes('بيض') || item.item_name.includes('طبق'))
      );
      
      const groupedSales = eggInvoicesOnly.reduce((acc, inv) => {
        const d = new Date(inv.invoice_date).toISOString().split('T')[0];
        if(!acc[d]) acc[d] = [];
        acc[d].push(inv);
        return acc;
      }, {});
      setSalesByDate(groupedSales); // تخزين المبيعات المنظمة

      let combined = [];
      results.forEach((res, index) => {
        const cycleLogs = res.logs || [];
        const cycleInfo = cycles[index];
        cycleLogs.forEach(log => combined.push({ ...log, cycleDetails: cycleInfo }));
      });

      const groupedLogs = combined.reduce((acc, log) => {
        const d = new Date(log.log_date).toISOString().split('T')[0];
        if(!acc[d]) acc[d] = [];
        acc[d].push(log);
        return acc;
      }, {});

      setLogsByDate(groupedLogs);
      const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));
      if (sortedDates.length > 0) setExpandedDates([sortedDates[0]]);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب السجلات والمبيعات');
    } finally {
      setIsLogsLoading(false);
    }
  };

  const calculateAge = (startDate, logDateStr) => {
    if (!startDate || !logDateStr) return 0;
    const logDate = new Date(logDateStr);
    const start = new Date(startDate);
    logDate.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
    return Math.ceil((logDate - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const toggleDateAccordion = (dateStr) => {
    setExpandedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  const handleBulkChange = (cycleId, field, value) => {
    setBulkData(prev => ({
      ...prev,
      [cycleId]: { ...prev[cycleId], [field]: value }
    }));
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!globalLogDate) return showAlert.error('خطأ', 'يجب تحديد تاريخ اليومية');

    const logsArray = [];
    for (const cycle of activeCycles) {
      const row = bulkData[cycle._id];
      const age = calculateAge(cycle.start_date, globalLogDate);
      
      const hasData = row.mortality_count || row.feed_consumed_bags || row.egg_trays_produced || row.medication_quantity;
      if (!hasData || age < 1) continue;

      if (row.feed_consumed_bags > 0 && !globalFeedItem) {
        return showAlert.error('خطأ', 'لقد سجلت استهلاك علف لبعض العنابر، يجب اختيار نوع العلف من الأعلى.');
      }

      const consumed_medications = [];
      if (row.medication_item_id && row.medication_quantity > 0) {
        consumed_medications.push({
          item_id: row.medication_item_id,
          quantity: Number(row.medication_quantity)
        });
      }

      logsArray.push({
        local_id: `LOG_${cycle._id}_${Date.now()}_${Math.random()}`,
        barn_id: cycle.barn_id._id,
        barn_name: cycle.barn_id.name,
        cycle_id: cycle._id,
        log_date: globalLogDate,
        age_in_days: age,
        mortality_count: row.mortality_count,
        feed_item_id: globalFeedItem,
        feed_consumed_bags: row.feed_consumed_bags,
        egg_trays_produced: row.egg_trays_produced,
        consumed_medications: consumed_medications,
        notes: '' // 🚀 إرسالها فارغة لعدم الحاجة إليها
      });
    }

    if (logsArray.length === 0) return showAlert.error('تنبيه', 'لم تقم بإدخال أي بيانات.');

    try {
      setIsSubmitting(true);
      await dailyLogService.createBulkDailyLogs({ logs: logsArray, farm_id: selectedFarmId });
      showAlert.success('نجاح', `تم تسجيل وتحديث المخازن لعدد (${logsArray.length}) عنبر بنجاح`);
      setIsFormOpen(false);
      
      const resetBulk = {};
      activeCycles.forEach(c => {
        resetBulk[c._id] = { mortality_count: '', feed_consumed_bags: '', egg_trays_produced: '', medication_item_id: '', medication_quantity: '' };
      });
      setBulkData(resetBulk);
      
      await fetchDependencies(selectedFarmId); 
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل تسجيل اليوميات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalEggsInStock = () => productItems.reduce((acc, item) => acc + (item.stock_quantity || 0), 0);

  // 🖨️ دالة الطباعة بالـ Iframe (محدثة لدعم المبيعات المدمجة)
  const handlePrintDay = (dateStr, dayLogs) => {
    const formattedDate = new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let tableRows = '';
    let totalDayFeed = 0;
    let totalDayDead = 0;
    const daySales = salesByDate[dateStr] || [];

    dayLogs.forEach((log, index) => {
      totalDayFeed += (Number(log.feed_consumed_bags) || 0);
      totalDayDead += (Number(log.mortality_count) || 0);
      
      const typeLabel = log.cycleDetails?.type === 'LAYER' ? 'بياض' : 'تسمين';
      const meds = (log.consumed_medications || []).map(m => `${m.name} (${m.quantity})`).join('، ');
      
      // 🚀 دمج خلية المبيعات رأسياً في أول صف فقط
      let salesCell = '';
      if (index === 0) {
        const salesText = daySales.length > 0 
          ? daySales.map(s => `<div style="margin-bottom:8px; border-bottom:1px dashed #cbd5e1; padding-bottom:5px;"><b>${s.merchant_id?.company_name || 'عميل'}</b><br/><span style="color:#059669;">${s.items?.reduce((acc, it)=>acc+(it.quantity||0),0)} طبق</span><br/><span style="color:#4f46e5;">${s.paid_amount.toLocaleString()} ج</span></div>`).join('')
          : '<span style="color:#94a3b8;">لا توجد مبيعات</span>';
        
        salesCell = `<td rowspan="${dayLogs.length}" style="border: 1px solid #cbd5e1; padding: 12px; font-size: 12px; vertical-align: top; background-color: #f8fafc;">${salesText}</td>`;
      }

      tableRows += `
        <tr>
          <td>${log.cycleDetails?.barn_id?.name || '-'} <br><small>${typeLabel}</small></td>
          <td>${log.age_in_days} يوم</td>
          <td>${log.mortality_count || '-'}</td>
          <td>${log.feed_consumed_bags || '-'}</td>
          <td>${log.cycleDetails?.type === 'LAYER' ? (log.egg_trays_produced || '-') : '-'}</td>
          <td>${meds || '-'}</td>
          ${salesCell}
        </tr>
      `;
    });

    tableRows += `
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
        <td colspan="2" style="text-align: center; color: #1e293b;">🏢 إجمالي المخزن / اليومية</td>
        <td style="color: #e11d48;">${totalDayDead}</td>
        <td style="color: #d97706;">${totalDayFeed}</td>
        <td style="color: #059669;"><small style="color:#64748b; font-size:10px;">بالمخزن:</small> ${getTotalEggsInStock()}</td>
        <td colspan="2"></td>
      </tr>
    `;

    const htmlContent = `
      <html dir="rtl">
        <head>
          <title>سجل اليومية - ${formattedDate}</title>
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 20px; color: #333; direction: rtl; }
            h2 { text-align: center; color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; text-align: right; }
            th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; }
            td { border: 1px solid #cbd5e1; padding: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <h2>يوميات المزرعة - ${formattedDate}</h2>
          <table>
            <thead>
              <tr>
                <th>العنبر (النوع)</th>
                <th>العمر</th>
                <th>النافق</th>
                <th>العلف (شكاير)</th>
                <th>البيض (أطباق)</th>
                <th>أدوية مسحوبة</th>
                <th>المبيعات (تلقائي)</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</div>
        </body>
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

  // 🚀 دالة توليد الصورة والمشاركة
  const handleShareAsImage = async (dateStr, dayLogs) => {
    try {
      setIsSharing(true);
      const formattedDate = new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const daySales = salesByDate[dateStr] || [];

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '850px'; 
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '30px';
      container.style.direction = 'rtl';
      container.style.fontFamily = 'Tahoma, Arial, sans-serif';
      container.style.color = '#333';

      let tableRows = '';
      let totalDayFeed = 0;
      let totalDayDead = 0;

      dayLogs.forEach((log, index) => {
          totalDayFeed += (Number(log.feed_consumed_bags) || 0);
          totalDayDead += (Number(log.mortality_count) || 0);

          const typeLabel = log.cycleDetails?.type === 'LAYER' ? 'بياض' : 'تسمين';
          const meds = (log.consumed_medications || []).map(m => `${m.name} (${m.quantity})`).join('، ');
          
          let salesCell = '';
          if (index === 0) {
            const salesText = daySales.length > 0 
              ? daySales.map(s => `<div style="margin-bottom:8px; border-bottom:1px dashed #cbd5e1; padding-bottom:5px;"><b>${s.merchant_id?.company_name || 'عميل'}</b><br/><span style="color:#059669;">${s.items?.reduce((acc, it)=>acc+(it.quantity||0),0)} طبق</span><br/><span style="color:#4f46e5;">${s.paid_amount.toLocaleString()} ج</span></div>`).join('')
              : '<span style="color:#94a3b8;">لا توجد مبيعات</span>';
            salesCell = `<td rowspan="${dayLogs.length}" style="border: 1px solid #cbd5e1; padding: 12px; font-size: 12px; vertical-align: top; background-color: #f8fafc;">${salesText}</td>`;
          }

          tableRows += `
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold;">${log.cycleDetails?.barn_id?.name || '-'} <br><small style="color:#64748b; font-weight:normal;">${typeLabel}</small></td>
              <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold;">${log.age_in_days} يوم</td>
              <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #e11d48;">${log.mortality_count || '-'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #d97706;">${log.feed_consumed_bags || '-'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #059669;">${log.cycleDetails?.type === 'LAYER' ? (log.egg_trays_produced || '-') : '-'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 12px; font-size: 12px;">${meds || '-'}</td>
              ${salesCell}
            </tr>
          `;
      });

      tableRows += `
        <tr style="background-color: #f1f5f9; border-top: 2px solid #94a3b8;">
          <td colspan="2" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; font-weight: bold; color: #1e293b;">🏢 إجمالي المخزن / اليومية</td>
          <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #e11d48;">${totalDayDead}</td>
          <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #d97706;">${totalDayFeed}</td>
          <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #059669;"><span style="font-size:10px; color:#64748b; margin-left:4px;">بالمخزن:</span>${getTotalEggsInStock()}</td>
          <td colspan="2" style="border: 1px solid #cbd5e1; padding: 12px;"></td>
        </tr>
      `;

      container.innerHTML = `
        <h2 style="text-align: center; color: #1e1b4b; border-bottom: 3px solid #e2e8f0; padding-bottom: 15px; font-size: 24px;">📊 يوميات المزرعة - ${formattedDate}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 15px; text-align: right;">
          <thead>
            <tr>
              <th style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; color: #475569;">العنبر (النوع)</th>
              <th style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; color: #475569;">العمر</th>
              <th style="background-color: #fef1f2; border: 1px solid #cbd5e1; padding: 12px; color: #e11d48;">النافق</th>
              <th style="background-color: #fffbeb; border: 1px solid #cbd5e1; padding: 12px; color: #d97706;">العلف (شكاير)</th>
              <th style="background-color: #ecfdf5; border: 1px solid #cbd5e1; padding: 12px; color: #059669;">البيض (أطباق)</th>
              <th style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; color: #475569;">أدوية مسحوبة</th>
              <th style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; color: #4f46e5;">مبيعات اليوم</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #94a3b8; font-weight: bold;">تم الإنشاء والمشاركة عبر نظام إدارة المزرعة 🚀</div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('فشل إنشاء الصورة');
        const file = new File([blob], `DailyLog_${dateStr}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'تقرير المزرعة اليومي',
            text: `تقرير المزرعة لتاريخ ${formattedDate}`
          });
        } else {
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = `DailyLog_${dateStr}.png`;
           a.click();
           URL.revokeObjectURL(url);
           showAlert.success('تم الحفظ', 'تم تحميل الصورة بنجاح للمشاركة اليدوية.');
        }
      }, 'image/png');

    } catch (err) {
      console.error(err);
      showAlert.error('خطأ', 'تعذر معالجة ومشاركة الصورة');
    } finally {
      setIsSharing(false);
    }
  };

  const sortedAndFilteredDates = Object.keys(logsByDate)
    .filter(date => searchDate === '' || date === searchDate)
    .sort((a, b) => new Date(b) - new Date(a));

  const getCycleTypeLabel = (type) => type === 'LAYER' ? 'بياض' : 'تسمين';

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-6 h-6 text-indigo-500" /> سجلات المزرعة المجمعة
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">متابعة اليوميات لكل العنابر مجمعة بالتاريخ</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" title="البحث بتاريخ محدد" />
            {searchDate && <button onClick={() => setSearchDate('')} className="absolute left-2 top-2.5 text-rose-500 hover:text-rose-700"><X className="w-4 h-4"/></button>}
          </div>

          <button onClick={() => setIsFormOpen(true)} disabled={activeCycles.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-5 w-5" /><span className="hidden sm:inline">إدخال مجمع</span>
          </button>
        </div>
      </div>

      {isLoading || isLogsLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
      ) : activeCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Activity className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد دورات نشطة</h3>
          <p className="mt-2 text-sm font-medium text-slate-500">قم ببدء دورة إنتاجية لتتمكن من تسجيل يومياتها.</p>
        </div>
      ) : sortedAndFilteredDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا توجد سجلات</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 mb-4">لم يتم تسجيل أي يومية {searchDate && 'في هذا التاريخ'}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAndFilteredDates.map(dateStr => {
            const isExpanded = expandedDates.includes(dateStr);
            const dayLogs = logsByDate[dateStr];
            const daySales = salesByDate[dateStr] || [];
            
            const totalDayFeed = dayLogs.reduce((sum, log) => sum + (Number(log.feed_consumed_bags) || 0), 0);
            const totalDayDead = dayLogs.reduce((sum, log) => sum + (Number(log.mortality_count) || 0), 0);

            return (
              <div key={dateStr} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <button onClick={() => toggleDateAccordion(dateStr)} className="flex items-center gap-3 flex-1 text-right">
                    <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 p-2 rounded-lg">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white text-sm">{new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">مسجل {dayLogs.length} عنابر</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleShareAsImage(dateStr, dayLogs); }} disabled={isSharing} title="مشاركة التقرير كصورة" className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50">
                      {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handlePrintDay(dateStr, dayLogs); }} title="طباعة يومية هذا التاريخ" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleDateAccordion(dateStr); }} className="p-1.5 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-3 whitespace-nowrap border-l border-slate-100 dark:border-slate-800 min-w-[120px]">العنبر (العمر)</th>
                              <th className="p-3 text-rose-500 border-l border-slate-100 dark:border-slate-800">النافق</th>
                              <th className="p-3 text-amber-600 border-l border-slate-100 dark:border-slate-800">علف (شكاير)</th>
                              <th className="p-3 text-emerald-600 border-l border-slate-100 dark:border-slate-800">بيض (أطباق)</th>
                              <th className="p-3 text-indigo-500 border-l border-slate-100 dark:border-slate-800 min-w-[150px]">أدوية ومستلزمات</th>
                              <th className="p-3 text-indigo-600 min-w-[160px]">المبيعات (تلقائي)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                            {dayLogs.map((log, index) => (
                              <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="p-3 border-l border-slate-50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                                  <div className="font-black text-slate-800 dark:text-white leading-tight">{log.cycleDetails?.barn_id?.name || '-'}</div>
                                  <div className="text-[10px] font-bold text-slate-500 mt-1">عمر {log.age_in_days} | {getCycleTypeLabel(log.cycleDetails?.type)}</div>
                                </td>
                                <td className="p-3 font-black text-rose-600 dark:text-rose-400 border-l border-slate-50 dark:border-slate-800/50">{log.mortality_count || '-'}</td>
                                <td className="p-3 font-black text-amber-600 dark:text-amber-500 border-l border-slate-50 dark:border-slate-800/50">{log.feed_consumed_bags || '-'}</td>
                                <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 border-l border-slate-50 dark:border-slate-800/50">{log.cycleDetails?.type === 'LAYER' ? (log.egg_trays_produced || '-') : '-'}</td>
                                <td className="p-3 border-l border-slate-50 dark:border-slate-800/50">
                                  {log.consumed_medications && log.consumed_medications.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {log.consumed_medications.map((med, i) => (
                                        <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                          {med.name} ({med.quantity})
                                        </span>
                                      ))}
                                    </div>
                                  ) : '-'}
                                </td>
                                
                                {/* 🚀 دمج عمود المبيعات رأسياً في أول صف فقط */}
                                {index === 0 && (
                                  <td rowSpan={dayLogs.length} className="p-3 align-top bg-slate-50/50 dark:bg-slate-800/20 border-l border-slate-100 dark:border-slate-800/50">
                                    {daySales.length > 0 ? (
                                      <div className="flex flex-col gap-2">
                                        {daySales.map((s, i) => (
                                          <div key={i} className="text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-100 p-2 rounded dark:bg-indigo-900/30 dark:border-indigo-800/50 dark:text-indigo-300">
                                            <div className="font-black text-indigo-900 dark:text-indigo-200">{s.merchant_id?.company_name || 'عميل'}</div>
                                            <div className="flex justify-between mt-1 items-center">
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.items?.reduce((acc, it)=>acc+(it.quantity||0),0)} طبق</span>
                                              <span className="font-black bg-indigo-100 dark:bg-indigo-900/50 px-1.5 rounded">{s.paid_amount.toLocaleString()} ج</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : <span className="text-[11px] font-bold text-slate-400 block text-center mt-4">لا يوجد مبيعات</span>}
                                  </td>
                                )}

                              </tr>
                            ))}
                            <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                              <td className="p-3 text-center font-black text-slate-800 dark:text-white border-l border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-center gap-2">
                                  <Package className="w-4 h-4 text-indigo-500" /> المخزن / الإجمالي
                                </div>
                              </td>
                              <td className="p-3 font-black text-rose-600 dark:text-rose-400 border-l border-slate-200 dark:border-slate-700">{totalDayDead}</td>
                              <td className="p-3 font-black text-amber-600 dark:text-amber-500 border-l border-slate-200 dark:border-slate-700">{totalDayFeed}</td>
                              <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1 font-bold">رصيد:</span>
                                {getTotalEggsInStock()}
                              </td>
                              <td colSpan="2" className="p-3 bg-slate-50 dark:bg-slate-800/50"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال الإدخال المجمع */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setIsFormOpen(false)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[95dvh]">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-t-3xl">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Table className="w-5 h-5 text-indigo-600"/> إدخال يومية مجمعة للمزرعة</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">تحديث مباشر لأرصدة ومخازن كافة العنابر في خطوة واحدة</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="w-6 h-6" /></button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-slate-900/50">
                  <form id="bulkDailyLogForm" onSubmit={handleBulkSubmit} className="space-y-4">
                    
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="w-full sm:w-1/3">
                        <label className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">تاريخ اليومية للكل *</label>
                        <input type="date" value={globalLogDate} onChange={e => setGlobalLogDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" required />
                      </div>
                      <div className="w-full sm:w-2/3">
                        <label className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">نوع العلف المستخدم اليوم (من المخزن)</label>
                        <select value={globalFeedItem} onChange={e => setGlobalFeedItem(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 dark:border-amber-900/40 dark:bg-slate-700 dark:text-amber-200">
                          <option value="">-- إذا تم استهلاك علف، اختر النوع الموحد هنا --</option>
                          {feedItems.map(f => <option key={f._id} value={f._id}>{f.name} (المتاح: {f.stock_quantity})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right text-sm min-w-[700px]">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3 w-48 sticky right-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">العنبر (العمر)</th>
                              <th className="p-3 w-24 text-rose-600">النافق</th>
                              <th className="p-3 w-28 text-amber-600">علف (شكاير)</th>
                              <th className="p-3 w-28 text-emerald-600">إنتاج (أطباق)</th>
                              <th className="p-3 w-56 text-indigo-600">صرف أدوية (من المخزن)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {activeCycles.map((cycle) => {
                              const age = calculateAge(cycle.start_date, globalLogDate);
                              const pendingPulls = cycle.pending_egg_pulls || 0;
                              const isLayer = cycle.type === 'LAYER';
                              
                              return (
                                <tr key={cycle._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                  <td className="p-3 sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                                    <div className="font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <Bird className="w-4 h-4 text-indigo-500" /> {cycle.barn_id?.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${age < 1 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {age < 1 ? 'تاريخ خطأ' : `عمر: ${age} يوم`}
                                      </span>
                                    </div>
                                    {isLayer && pendingPulls > 0 && (
                                      <div className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.5 rounded mt-1 flex w-fit">
                                        سلفة فواتير: {pendingPulls}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <input type="number" min="0" placeholder="0" disabled={age < 1} value={bulkData[cycle._id]?.mortality_count} onChange={e => handleBulkChange(cycle._id, 'mortality_count', e.target.value)} className="w-full rounded-lg border border-rose-100 bg-rose-50/30 px-2 py-2 text-center text-sm font-black text-rose-700 outline-none focus:border-rose-500 focus:bg-rose-50 dark:border-rose-900/30 dark:bg-slate-900 dark:text-rose-400 disabled:opacity-50" />
                                  </td>
                                  <td className="p-3">
                                    <input type="number" step="0.01" min="0" placeholder="0" disabled={age < 1} value={bulkData[cycle._id]?.feed_consumed_bags} onChange={e => handleBulkChange(cycle._id, 'feed_consumed_bags', e.target.value)} className="w-full rounded-lg border border-amber-100 bg-amber-50/30 px-2 py-2 text-center text-sm font-black text-amber-700 outline-none focus:border-amber-500 focus:bg-amber-50 dark:border-amber-900/30 dark:bg-slate-900 dark:text-amber-400 disabled:opacity-50" />
                                  </td>
                                  <td className="p-3">
                                    {isLayer ? (
                                      <input type="number" min="0" placeholder="فعلية" disabled={age < 1} value={bulkData[cycle._id]?.egg_trays_produced} onChange={e => handleBulkChange(cycle._id, 'egg_trays_produced', e.target.value)} className="w-full rounded-lg border border-emerald-100 bg-emerald-50/30 px-2 py-2 text-center text-sm font-black text-emerald-700 outline-none focus:border-emerald-500 focus:bg-emerald-50 dark:border-emerald-900/30 dark:bg-slate-900 dark:text-emerald-400 disabled:opacity-50" />
                                    ) : (
                                      <div className="text-center text-[10px] font-bold text-slate-300 dark:text-slate-600">- تسمين -</div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-col gap-1.5">
                                      <select disabled={age < 1} value={bulkData[cycle._id]?.medication_item_id} onChange={e => handleBulkChange(cycle._id, 'medication_item_id', e.target.value)} className="w-full rounded-lg border border-indigo-100 bg-indigo-50/30 px-2 py-1.5 text-[11px] font-bold text-indigo-800 outline-none focus:border-indigo-500 dark:border-indigo-900/30 dark:bg-slate-900 dark:text-indigo-300 disabled:opacity-50">
                                        <option value="">-- بدون أدوية --</option>
                                        {generalItems.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                      </select>
                                      {bulkData[cycle._id]?.medication_item_id && (
                                        <input type="number" step="0.01" min="0" placeholder="الكمية المسحوبة (لتر/كجم)" value={bulkData[cycle._id]?.medication_quantity} onChange={e => handleBulkChange(cycle._id, 'medication_quantity', e.target.value)} className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-center text-[11px] font-black text-indigo-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </form>
                </div>
                
                <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 rounded-b-3xl">
                  <button type="submit" form="bulkDailyLogForm" disabled={isSubmitting || !globalLogDate} className="flex w-full justify-center items-center rounded-xl bg-indigo-600 py-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-70 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : '🚀 حفظ اليوميات المجمعة وتحديث الأرصدة'}
                  </button>
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyLogs;