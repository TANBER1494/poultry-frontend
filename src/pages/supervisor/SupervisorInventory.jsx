import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Droplets,
  Wheat,
  ArrowDownToLine,
  Loader2,
  X,
  AlertTriangle,
  Bird,
} from 'lucide-react';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import inventoryService from '../../services/inventoryService';
import { showAlert } from '../../utils/alert';

const SupervisorInventory = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  const [activeCycles, setActiveCycles] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [transferData, setTransferData] = useState({
    cycle_id: '',
    item_id: '',
    quantity: '',
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
          await fetchDashboardData(firstFarm, isMounted);
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

  const fetchDashboardData = async (farmId, isMounted = true) => {
    try {
      const [cyclesRes, inventoryRes] = await Promise.all([
        cycleService.getFarmCycles(farmId),
        inventoryService.getInventoryItems(farmId),
      ]);

      if (isMounted) {
        setActiveCycles(
          (cyclesRes.cycles || []).filter((c) => c.status === 'ACTIVE')
        );
        setInventoryItems(inventoryRes.items || []);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المخازن');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (
      !transferData.cycle_id ||
      !transferData.item_id ||
      !transferData.quantity
    ) {
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
      showAlert.success(
        'تمت العملية',
        'تم صرف العهدة وإضافتها لرصيد العنبر بنجاح'
      );
      setIsTransferModalOpen(false);
      setTransferData({ cycle_id: '', item_id: '', quantity: '' });

      // تحديث الأرصدة
      await fetchDashboardData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل الصرف',
        error.response?.data?.message || 'تعذر صرف العهدة'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedItems = inventoryItems.filter((i) => i.category === 'FEED');
  const productItems = inventoryItems.filter((i) => i.category === 'PRODUCT');

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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-500" /> العهدة والمخزن
            الرئيسي
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            متابعة أرصدة المزرعة وصرف العلف للعنابر
          </p>
        </div>
        <button
          onClick={() => setIsTransferModalOpen(true)}
          disabled={activeCycles.length === 0 || feedItems.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50"
        >
          <ArrowDownToLine className="h-5 w-5" /> صرف عهدة لعنبر
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 🛡️ القسم الأول: عهدة العنابر (الاستهلاك الداخلي) */}
          <section>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Bird className="w-5 h-5 text-emerald-500" /> عهدة العنابر النشطة
              (الرصيد الداخلي)
            </h2>
            {activeCycles.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-slate-500 font-bold text-sm">
                لا توجد عنابر نشطة حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCycles.map((cycle) => (
                  <div
                    key={cycle._id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="font-black text-slate-800 dark:text-white">
                          {cycle.barn_id?.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {cycle.type === 'LAYER' ? 'بياض' : 'تسمين'} - دورة:{' '}
                          {cycle.name}
                        </p>
                      </div>
                    </div>
                    {cycle.feed_custody && cycle.feed_custody.length > 0 ? (
                      <div className="space-y-2">
                        {cycle.feed_custody.map((custody) => (
                          <div
                            key={custody._id}
                            className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50"
                          >
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Wheat className="w-4 h-4 text-amber-500" />{' '}
                              {custody.item_id?.name || 'علف غير محدد'}
                            </span>
                            <span
                              className={`font-black ${custody.quantity <= 10 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}
                            >
                              {custody.quantity}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">
                                {custody.item_id?.unit === 'BAG'
                                  ? 'شيكارة'
                                  : 'كجم'}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> العهدة فارغة، يرجى
                        صرف علف لتسجيل اليومية.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 🛡️ القسم الثاني: المخزن الرئيسي */}
          <section>
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" /> المخزن الرئيسي
              (أعلاف ومنتجات)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* الأعلاف */}
              {feedItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div className="flex gap-2 items-start mb-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                      <Wheat className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500">
                        علف
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-left">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">
                      {item.stock_quantity}
                    </span>
                    <span className="text-xs font-bold text-slate-400 mr-1">
                      {item.unit === 'BAG' ? 'شيكارة' : 'وحدة'}
                    </span>
                  </div>
                </div>
              ))}

              {/* البيض (المنتجات التامة) */}
              {productItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 flex flex-col justify-between"
                >
                  <div className="flex gap-2 items-start mb-3">
                    <div className="p-2 bg-white dark:bg-slate-800 text-emerald-600 rounded-lg shadow-sm">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100 leading-tight">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500">
                        جاهز للبيع
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-left">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      {item.stock_quantity}
                    </span>
                    <span className="text-xs font-bold text-emerald-600/50 dark:text-emerald-500 mr-1">
                      كرتونة / طبق
                    </span>
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
        </div>
      )}

      {/* مودال صرف العهدة */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setIsTransferModalOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh]"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      صرف عهدة علف للعنبر
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      نقل من المخزن الرئيسي إلى عهدة الدورة
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTransferModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form
                    id="transferForm"
                    onSubmit={handleTransferSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        إلى عنبر (الدورة المستلمة) *
                      </label>
                      <select
                        value={transferData.cycle_id}
                        onChange={(e) =>
                          setTransferData((p) => ({
                            ...p,
                            cycle_id: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        required
                      >
                        <option value="">-- اختر العنبر --</option>
                        {activeCycles.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.barn_id?.name} ({c.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        نوع العلف المراد صرفه *
                      </label>
                      <select
                        value={transferData.item_id}
                        onChange={(e) =>
                          setTransferData((p) => ({
                            ...p,
                            item_id: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        required
                      >
                        <option value="">-- اختر الصنف --</option>
                        {feedItems.map((f) => (
                          <option
                            key={f._id}
                            value={f._id}
                            disabled={f.stock_quantity === 0}
                          >
                            {f.name} (المتاح: {f.stock_quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                        الكمية المنصرفة (شكاير/كجم) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={transferData.quantity}
                        onChange={(e) =>
                          setTransferData((p) => ({
                            ...p,
                            quantity: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </form>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                  <button
                    type="submit"
                    form="transferForm"
                    disabled={isSubmitting}
                    className="flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'تأكيد الصرف ونقل العهدة'
                    )}
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
