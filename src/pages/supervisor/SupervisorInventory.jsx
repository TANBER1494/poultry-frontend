import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Droplets, Wheat, ArrowDownToLine, Loader2, X, AlertTriangle, Bird,
  Truck, CheckCircle2, Factory, Syringe, ShieldAlert, Box
} from 'lucide-react';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import inventoryService from '../../services/inventoryService';
import { showAlert } from '../../utils/alert';

const SupervisorInventory = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [hasFeedMill, setHasFeedMill] = useState(false); 

  const [activeCycles, setActiveCycles] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [pendingMovements, setPendingMovements] = useState([]); 

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProduceModalOpen, setIsProduceModalOpen] = useState(false); 

  const [transferData, setTransferData] = useState({ cycle_id: '', item_id: '', quantity: '' });
  
  const [produceData, setProduceData] = useState({
    item_id: '', quantity: '', unit_cost: '', direct_to_barn: false, cycle_id: ''
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
          const firstFarm = fetchedFarms[0];
          if (isMounted) {
            setSelectedFarmId(firstFarm._id);
            setHasFeedMill(firstFarm.has_feed_mill || false); 
          }
          await fetchDashboardData(firstFarm._id, isMounted);
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

  const fetchDashboardData = async (farmId, isMounted = true) => {
    try {
      const [cyclesRes, inventoryRes, pendingRes] = await Promise.all([
        cycleService.getFarmCycles(farmId),
        inventoryService.getInventoryItems(farmId),
        inventoryService.getPendingMovements(farmId) 
      ]);

      if (isMounted) {
        const active = (cyclesRes.cycles || []).filter((c) => c.status === 'ACTIVE');
        active.sort((a, b) => {
          const nameA = a.barn_id?.name || '';
          const nameB = b.barn_id?.name || '';
          return nameA.localeCompare(nameB, 'ar', { numeric: true });
        });
        setActiveCycles(active);

        setInventoryItems(inventoryRes.items || []);
        setPendingMovements(pendingRes.movements || []);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المخازن');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.cycle_id || !transferData.item_id || !transferData.quantity) {
      return showAlert.error('خطأ', 'جميع حقول التحويل مطلوبة');
    }
    try {
      setIsSubmitting(true);
      const payload = {
        local_id: `TRANS_${Date.now()}`,
        farm_id: selectedFarmId,
        cycle_id: transferData.cycle_id,
        item_id: transferData.item_id,
        quantity: transferData.quantity,
      };
      await inventoryService.transferToBarn(payload);
      showAlert.success('تمت العملية', 'تم صرف العهدة وإضافتها لرصيد العنبر بنجاح');
      setIsTransferModalOpen(false);
      setTransferData({ cycle_id: '', item_id: '', quantity: '' });
      await fetchDashboardData(selectedFarmId);
    } catch (error) {
      showAlert.error('فشل الصرف', error.response?.data?.message || 'تعذر صرف العهدة');
    } finally { setIsSubmitting(false); }
  };

  const handleConfirmReceipt = async (movementId) => {
    try {
      setIsSubmitting(true);
      await inventoryService.confirmMovement(movementId);
      showAlert.success('تم التأكيد', 'تم استلام الشحنة وإضافتها للمخزن بنجاح');
      await fetchDashboardData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'تعذر تأكيد الاستلام');
    } finally { setIsSubmitting(false); }
  };

  const handleProduceSubmit = async (e) => {
    e.preventDefault();
    if (!produceData.item_id || !produceData.quantity || !produceData.unit_cost) {
      return showAlert.error('خطأ', 'جميع البيانات الأساسية للإنتاج مطلوبة');
    }
    if (produceData.direct_to_barn && !produceData.cycle_id) {
      return showAlert.error('خطأ', 'يرجى تحديد العنبر المراد توجيه العلف إليه');
    }

    try {
      setIsSubmitting(true);
      await inventoryService.produceFeed({ ...produceData, farm_id: selectedFarmId });
      showAlert.success('تم الإنتاج', produceData.direct_to_barn ? 'تم الإنتاج وصرف العهدة للعنبر بنجاح' : 'تم إضافة الإنتاج للمخزن الرئيسي');
      setIsProduceModalOpen(false);
      setProduceData({ item_id: '', quantity: '', unit_cost: '', direct_to_barn: false, cycle_id: '' });
      await fetchDashboardData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'تعذر تسجيل الإنتاج');
    } finally { setIsSubmitting(false); }
  };

  const feedItems = inventoryItems.filter((i) => i.category === 'FEED');
  const productItems = inventoryItems.filter((i) => i.category === 'PRODUCT');
  const generalItems = inventoryItems.filter((i) => !['FEED', 'PRODUCT'].includes(i.category));

  const getUnitName = (unit) => {
    const units = { BAG: 'شيكارة', TON: 'طن', LITER: 'لتر', BOTTLE: 'زجاجة', KG: 'كجم', PIECE: 'قطعة', TRAY: 'طبق' };
    return units[unit] || unit;
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'MEDICATION': return <Syringe className="w-5 h-5" />;
      case 'VACCINE': return <Droplets className="w-5 h-5" />;
      case 'DISINFECTANT': return <ShieldAlert className="w-5 h-5" />;
      default: return <Box className="w-5 h-5" />;
    }
  };

  const custodyRows = [];
  activeCycles.forEach((cycle) => {
    if (cycle.feed_custody && cycle.feed_custody.length > 0) {
      cycle.feed_custody.forEach((custody) => {
        custodyRows.push({
          id: `${cycle._id}_${custody._id}`,
          barnName: cycle.barn_id?.name || 'عنبر غير محدد',
          cycleName: cycle.name,
          itemName: custody.item_id?.name || 'علف غير محدد',
          quantity: custody.quantity,
          unit: custody.item_id?.unit
        });
      });
    }
  });

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-500" /> العهدة والمخزن الرئيسي
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">متابعة أرصدة المزرعة وصرف العلف للعنابر</p>
        </div>
        <div className="flex items-center gap-2">
          {hasFeedMill && (
            <button onClick={() => setIsProduceModalOpen(true)} disabled={feedItems.length === 0} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 active:scale-95 shadow-sm disabled:opacity-50">
              <Factory className="h-4 w-4" /> إنتاج مدشة
            </button>
          )}
          <button onClick={() => setIsTransferModalOpen(true)} disabled={activeCycles.length === 0 || feedItems.length === 0} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50">
            <ArrowDownToLine className="h-5 w-5" /> صرف عهدة لعنبر
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="space-y-8">
          
          {/* الشحنات في الطريق */}
          {pendingMovements.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> شحنات في الطريق بانتظار التأكيد ({pendingMovements.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingMovements.map((mov) => (
                  <div key={mov._id} className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{mov.item_id?.name || 'صنف غير معروف'}</h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">تاريخ الإرسال: {new Date(mov.createdAt).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded text-xs font-black">
                        {mov.quantity} {getUnitName(mov.item_id?.unit)}
                      </div>
                    </div>
                    <button onClick={() => handleConfirmReceipt(mov._id)} disabled={isSubmitting} className="w-full mt-2 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4"/> تأكيد الاستلام</>}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🛡️ القسم الأول: المخزن الرئيسي */}
          <section>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" /> المخزن الرئيسي
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              
              {/* الأعلاف */}
              {feedItems.map((item) => (
                <div key={item._id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex gap-2 items-start mb-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg"><Wheat className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{item.name}</h4>
                      <span className="text-[10px] font-bold text-slate-500">علف</span>
                    </div>
                  </div>
                  <div className="mt-2 text-left">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{item.stock_quantity}</span>
                    <span className="text-xs font-bold text-slate-400 mr-1">{getUnitName(item.unit)}</span>
                  </div>
                </div>
              ))}

              {/* الأدوية والمستلزمات */}
              {generalItems.map((item) => (
                <div key={item._id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex gap-2 items-start mb-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight truncate">{item.name}</h4>
                      <span className="text-[10px] font-bold text-slate-500">{item.category === 'MEDICATION' ? 'دواء/علاج' : item.category === 'VACCINE' ? 'لقاح' : 'مستلزمات'}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-left">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{item.stock_quantity}</span>
                    <span className="text-xs font-bold text-slate-400 mr-1">{getUnitName(item.unit)}</span>
                  </div>
                </div>
              ))}

              {/* البيض (المنتجات التامة) */}
              {productItems.map((item) => (
                <div key={item._id} className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 flex flex-col justify-between">
                  <div className="flex gap-2 items-start mb-3">
                    <div className="p-2 bg-white dark:bg-slate-800 text-emerald-600 rounded-lg shadow-sm"><Package className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100 leading-tight">{item.name}</h4>
                      <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500">جاهز للبيع</span>
                    </div>
                  </div>
                  <div className="mt-2 text-left">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{item.stock_quantity}</span>
                    <span className="text-xs font-bold text-emerald-600/50 dark:text-emerald-500 mr-1">{getUnitName(item.unit)}</span>
                  </div>
                </div>
              ))}

              {inventoryItems.length === 0 && (
                <div className="col-span-full text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-500">
                  المخزن الرئيسي فارغ تماماً.
                </div>
              )}
            </div>
          </section>

          {/* 🛡️ القسم الثاني: عهدة العنابر (بدون عمود الصنف ومدمجة) */}
          <section>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Bird className="w-5 h-5 text-emerald-500" /> عهدة العنابر النشطة (الرصيد الداخلي)
            </h2>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">العنبر (الدورة)</th>
                      <th className="px-4 py-3 whitespace-nowrap">رصيد العلف المتاح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                    {custodyRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5 pr-5.5">دورة: {row.cycleName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-black text-base ${row.quantity <= 10 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {row.quantity} <span className="text-[10px] font-bold text-slate-400">{getUnitName(row.unit)} - ({row.itemName})</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {custodyRows.length === 0 && (
                  <div className="text-center p-8 bg-rose-50/50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 text-sm font-bold flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="w-8 h-8 opacity-80" />
                    لا توجد أي أرصدة أعلاف منصرفة للعنابر حالياً.
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      )}

      {/* مودال المدشة الذكية */}
      <AnimatePresence>
        {isProduceModalOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setIsProduceModalOpen(false)} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2"><Factory className="w-5 h-5 text-amber-600"/> إنتاج مدشة محلية</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">تسجيل إنتاج العلف وتوجيهه</p>
                  </div>
                  <button onClick={() => setIsProduceModalOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="produceForm" onSubmit={handleProduceSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الصنف المُنتج (علف) *</label>
                      <select value={produceData.item_id} onChange={(e) => setProduceData((p) => ({ ...p, item_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required>
                        <option value="">-- اختر صنف العلف --</option>
                        {feedItems.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الكمية المنتجة *</label>
                        <input type="number" step="0.01" min="0.01" value={produceData.quantity} onChange={(e) => setProduceData((p) => ({ ...p, quantity: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">التكلفة التقديرية للوحدة *</label>
                        <input type="number" step="0.01" min="1" value={produceData.unit_cost} onChange={(e) => setProduceData((p) => ({ ...p, unit_cost: e.target.value }))} placeholder="ج.م" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={produceData.direct_to_barn} onChange={(e) => setProduceData((p) => ({ ...p, direct_to_barn: e.target.checked, cycle_id: '' }))} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400">توجيه الإنتاج فوراً للعنبر (بدون تخزين)</span>
                      </label>
                    </div>

                    {produceData.direct_to_barn && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">العنبر المستلم (الدورة) *</label>
                        <select value={produceData.cycle_id} onChange={(e) => setProduceData((p) => ({ ...p, cycle_id: e.target.value }))} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required={produceData.direct_to_barn}>
                          <option value="">-- اختر العنبر --</option>
                          {activeCycles.map((c) => <option key={c._id} value={c._id}>{c.barn_id?.name} ({c.name})</option>)}
                        </select>
                      </motion.div>
                    )}
                  </form>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                  <button type="submit" form="produceForm" disabled={isSubmitting} className="flex w-full justify-center items-center rounded-xl bg-amber-600 py-3.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-70 shadow-lg shadow-amber-600/20">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'اعتماد الإنتاج'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* مودال صرف العهدة */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <>
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setIsTransferModalOpen(false)} className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div variants={sheetVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">صرف عهدة أعلاف للعنبر</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">نقل الأعلاف من المخزن الرئيسي إلى عهدة الدورة</p>
                  </div>
                  <button onClick={() => setIsTransferModalOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="transferForm" onSubmit={handleTransferSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">إلى عنبر (الدورة المستلمة) *</label>
                      <select value={transferData.cycle_id} onChange={(e) => setTransferData((p) => ({ ...p, cycle_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required>
                        <option value="">-- اختر العنبر --</option>
                        {activeCycles.map((c) => <option key={c._id} value={c._id}>{c.barn_id?.name} ({c.name})</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">صنف العلف المراد صرفه *</label>
                      <select value={transferData.item_id} onChange={(e) => setTransferData((p) => ({ ...p, item_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required>
                        <option value="">-- اختر صنف العلف --</option>
                        {/* 🚀 إظهار الأعلاف فقط في نافذة الصرف */}
                        {feedItems.map((f) => (
                          <option key={f._id} value={f._id} disabled={f.stock_quantity === 0}>
                            {f.name} (المتاح: {f.stock_quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">الكمية المنصرفة *</label>
                      <input type="number" step="0.01" min="0.01" value={transferData.quantity} onChange={(e) => setTransferData((p) => ({ ...p, quantity: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                    </div>
                  </form>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                  <button type="submit" form="transferForm" disabled={isSubmitting} className="flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70 shadow-lg shadow-indigo-600/20">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الصرف ونقل العهدة'}
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

export default SupervisorInventory;