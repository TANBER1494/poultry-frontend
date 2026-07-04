import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Loader2,
  Package,
  Tractor,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoreVertical,
  Settings2,
  Trash2,
  AlertCircle,
  Activity,
  Box,
  Syringe,
  ShieldAlert,
  Eye,
  DollarSign,
} from 'lucide-react';
import inventoryService from '../../services/inventoryService';
import farmService from '../../services/farmService';
import cycleService from '../../services/cycleService';
import { showAlert } from '../../utils/alert';

const InventoryManager = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [farmName, setFarmName] = useState('');
  const [items, setItems] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [itemLedger, setItemLedger] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  const [sheetConfig, setSheetConfig] = useState({
    isOpen: false,
    mode: 'ADD_ITEM', // 'ADD_ITEM', 'EDIT_ITEM', 'OPTIONS', 'MOVEMENT', 'LEDGER', 'CUSTODY', 'UPDATE_PRICE'
    activeItem: null,
  });

  const [itemData, setItemData] = useState({
    name: '',
    category: 'FEED',
    unit: 'BAG',
    min_alert_level: '',
  });

  const [movementData, setMovementData] = useState({
    type: 'PURCHASE',
    quantity: '',
    unit_cost: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [custodyData, setCustodyData] = useState({
    cycle_id: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
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
      const [itemsRes, cyclesRes] = await Promise.all([
        inventoryService.getInventoryItems(farmId),
        cycleService.getFarmCycles(farmId),
      ]);
      if (isMounted) {
        setItems(itemsRes.items || []);
        setCycles(cyclesRes.cycles || []);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المخزن');
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
    await loadFarmData(newFarmId);
  };

  const closeSheet = () => {
    setSheetConfig({ isOpen: false, mode: 'ADD_ITEM', activeItem: null });
    setItemLedger([]);
  };

  // ===================== Handlers =====================

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const payload = { ...itemData, farm_id: selectedFarmId };
      if (sheetConfig.mode === 'ADD_ITEM') {
        await inventoryService.addInventoryItem(payload);
        showAlert.success('تم', 'تمت إضافة الصنف بنجاح');
      } else {
        await inventoryService.updateInventoryItem(
          sheetConfig.activeItem._id,
          payload
        );
        showAlert.success('تم', 'تم تحديث بيانات الصنف');
      }
      closeSheet();
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل الحفظ');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const payload = {
        local_id: `MOV_${Date.now()}`,
        farm_id: selectedFarmId,
        item_id: sheetConfig.activeItem._id,
        movement_type: movementData.type,
        quantity: movementData.quantity,
        unit_cost_at_time: movementData.unit_cost,
        movement_date: movementData.date,
        status: 'PENDING' // 🚀 الحقن الصامت: إجبار التوريد ليكون في الطريق ليطلق الإشعار للمشرف
      };
      const res = await inventoryService.recordMovement(payload);
      showAlert.success('تم الإرسال', 'تم تسجيل التوريد في الطريق بانتظار تأكيد المشرف');
      closeSheet();
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل التسجيل');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCustodySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsActionLoading(true);
      const payload = {
        local_id: `TRANS_${Date.now()}`,
        farm_id: selectedFarmId,
        item_id: sheetConfig.activeItem._id,
        cycle_id: custodyData.cycle_id,
        quantity: custodyData.quantity,
      };
      await inventoryService.transferToBarn(payload);
      showAlert.success('تم الصرف', 'تم صرف العهدة للعنبر بنجاح وتحديث الرصيد');
      closeSheet();
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل الصرف');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`هل أنت متأكد من أرشفة/حذف (${item.name})؟`)) return;
    try {
      setIsActionLoading(true);
      // 🚀 إصلاح الحذف: تمرير selectedFarmId لتجاوز الحماية
      await inventoryService.deleteInventoryItem(item._id, selectedFarmId);
      showAlert.success('تم الحذف', 'تم أرشفة الصنف بنجاح');
      closeSheet();
      loadFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error(
        'فشل العملية',
        error.response?.data?.message || 'لا يمكن حذف الصنف'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================== Open Modals =====================

  const openAddItem = () => {
    setItemData({
      name: '',
      category: 'FEED',
      unit: 'BAG',
      min_alert_level: '',
    });
    setSheetConfig({ isOpen: true, mode: 'ADD_ITEM', activeItem: null });
  };

  const openOptions = (item) => {
    setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeItem: item });
  };

  const openEditItem = (item) => {
    setItemData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      min_alert_level: item.min_alert_level,
    });
    setSheetConfig({ isOpen: true, mode: 'EDIT_ITEM', activeItem: item });
  };

  const openMovement = (item) => {
    setMovementData({
      type: 'PURCHASE',
      quantity: '',
      unit_cost: item.average_unit_cost || '',
      date: new Date().toISOString().split('T')[0],
    });
    setSheetConfig({ isOpen: true, mode: 'MOVEMENT', activeItem: item });
  };

  const openLedger = async (item) => {
    setSheetConfig({ isOpen: true, mode: 'LEDGER', activeItem: item });
    try {
      setIsLedgerLoading(true);
      const res = await inventoryService.getItemMovements(item._id);
      setItemLedger(res.movements || []);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب كشف الحساب');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // ===================== Helpers =====================
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount || 0);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'FEED':
        return <Box className="w-5 h-5 text-amber-600" />;
      case 'MEDICATION':
        return <Syringe className="w-5 h-5 text-indigo-600" />;
      case 'VACCINE':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'PRODUCT':
        return <Package className="w-5 h-5 text-emerald-600" />;
      default:
        return <Package className="w-5 h-5 text-slate-600" />;
    }
  };

  const getUnitName = (unit) => {
    const units = {
      BAG: 'شيكارة',
      TON: 'طن',
      LITER: 'لتر',
      BOTTLE: 'زجاجة',
      KG: 'كجم',
      PIECE: 'قطعة',
      TRAY: 'طبق',
    };
    return units[unit] || unit;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-500" /> إدارة المخازن
            (الرئيسية)
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            توريد بضاعة للمزارع، وتسعير الأصناف
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
            onClick={openAddItem}
            disabled={farms.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">تعريف صنف جديد</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">
            المخزن فارغ
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-500">
            قم بتعريف الأصناف (علف، أدوية، مطهرات) لتبدأ في التوريد والمتابعة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isLowStock = item.stock_quantity <= item.min_alert_level;
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                  isLowStock
                    ? 'border-rose-200 dark:border-rose-900/50 shadow-rose-100 dark:shadow-none'
                    : 'border-slate-200 dark:border-slate-800'
                } p-4 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3
                        className="font-black text-slate-800 dark:text-white text-base leading-tight truncate max-w-[150px]"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500">
                        {item.category === 'PRODUCT'
                          ? 'منتج تام'
                          : 'مستلزمات إنتاج'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openOptions(item)}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div
                    className={`p-3 rounded-xl border ${
                      isLowStock
                        ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30'
                        : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold flex items-center gap-1 ${
                        isLowStock
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {isLowStock && <AlertCircle className="w-3 h-3" />} الرصيد
                      الحالي
                    </p>
                    <p
                      className={`text-xl font-black ${
                        isLowStock
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-slate-800 dark:text-white'
                      }`}
                    >
                      {item.stock_quantity}{' '}
                      <span className="text-[10px] font-bold">
                        {getUnitName(item.unit)}
                      </span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-500 mb-1">
                      متوسط التكلفة
                    </p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {item.average_unit_cost > 0
                        ? formatCurrency(item.average_unit_cost)
                        : '---'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 mt-auto border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    onClick={() => openMovement(item)}
                    className="flex justify-center items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    <ArrowDownToLine className="w-4 h-4" /> توريد بضاعة للمزرعة
                  </button>
                </div>
              </motion.div>
            );
          })}
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
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`w-full bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90dvh] ${
                  sheetConfig.mode === 'LEDGER' ? 'max-w-4xl' : 'max-w-xl'
                }`}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    {sheetConfig.mode === 'ADD_ITEM' && 'تعريف صنف جديد'}
                    {sheetConfig.mode === 'EDIT_ITEM' && 'تعديل بيانات الصنف'}
                    {sheetConfig.mode === 'OPTIONS' && 'خيارات الصنف'}
                    {sheetConfig.mode === 'MOVEMENT' && (
                      <>
                        <ArrowDownToLine className="w-5 h-5 text-emerald-500" />{' '}
                        توريد بضاعة للمزرعة
                      </>
                    )}
                    {sheetConfig.mode === 'LEDGER' && (
                      <>
                        <FileText className="w-5 h-5 text-indigo-500" /> كشف
                        حساب (حركة الصنف)
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
                  {/* الخيارات الإضافية للصنف */}
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeItem && (
                    <div className="space-y-3">
                      <button
                        onClick={() => openLedger(sheetConfig.activeItem)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:text-slate-300 hover:text-indigo-600 font-bold text-sm transition-colors"
                      >
                        <FileText className="w-5 h-5" /> كشف حركات الصنف
                        (الاستاذ)
                      </button>
                      <button
                        onClick={() => openEditItem(sheetConfig.activeItem)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300 hover:text-emerald-600 font-bold text-sm transition-colors"
                      >
                        <Settings2 className="w-5 h-5" /> تعديل إعدادات الصنف
                      </button>
                      <button
                        onClick={() => handleDeleteItem(sheetConfig.activeItem)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm transition-colors border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 className="w-5 h-5" /> أرشفة الصنف
                      </button>
                    </div>
                  )}

                  {/* إضافة / تعديل صنف */}
                  {(sheetConfig.mode === 'ADD_ITEM' ||
                    sheetConfig.mode === 'EDIT_ITEM') && (
                    <form onSubmit={handleItemSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          اسم الصنف *
                        </label>
                        <input
                          type="text"
                          value={itemData.name}
                          onChange={(e) =>
                            setItemData((p) => ({ ...p, name: e.target.value }))
                          }
                          placeholder="مثال: علف بادي نامي 21%"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            التصنيف *
                          </label>
                          <select
                            value={itemData.category}
                            onChange={(e) =>
                              setItemData((p) => ({
                                ...p,
                                category: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                          >
                            <option value="FEED">علف</option>
                            <option value="MEDICATION">دواء / علاج</option>
                            <option value="VACCINE">تحصين / لقاح</option>
                            <option value="DISINFECTANT">مطهرات</option>
                            <option value="PRODUCT">منتج تام</option>
                            <option value="OTHER">أخرى</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            الوحدة *
                          </label>
                          <select
                            value={itemData.unit}
                            onChange={(e) =>
                              setItemData((p) => ({
                                ...p,
                                unit: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                          >
                            <option value="BAG">شيكارة</option>
                            <option value="TON">طن</option>
                            <option value="LITER">لتر</option>
                            <option value="BOTTLE">زجاجة</option>
                            <option value="KG">كجم</option>
                            <option value="PIECE">قطعة</option>
                            <option value="TRAY">طبق / كرتونة</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                          الحد الأدنى للتنبيه بنقص الرصيد
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={itemData.min_alert_level}
                          onChange={(e) =>
                            setItemData((p) => ({
                              ...p,
                              min_alert_level: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="mt-6 flex w-full justify-center items-center rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-70"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'حفظ بطاقة الصنف'
                        )}
                      </button>
                    </form>
                  )}

                  {/* توريد بضاعة للمزرعة */}
                  {sheetConfig.mode === 'MOVEMENT' && sheetConfig.activeItem && (
                    <form onSubmit={handleMovementSubmit} className="space-y-4">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 mb-2">
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                          الصنف المورد: {sheetConfig.activeItem.name}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            الكمية ({getUnitName(sheetConfig.activeItem.unit)})
                            *
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={movementData.quantity}
                            onChange={(e) =>
                              setMovementData((p) => ({
                                ...p,
                                quantity: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                            سعر الوحدة الحالي (ج.م) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={movementData.unit_cost}
                            onChange={(e) =>
                              setMovementData((p) => ({
                                ...p,
                                unit_cost: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className="mt-6 flex w-full justify-center items-center rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-70 shadow-lg shadow-emerald-600/20"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          'إرسال التوريد للمزرعة'
                        )}
                      </button>
                    </form>
                  )}

                  {/* كشف الحساب */}
                  {sheetConfig.mode === 'LEDGER' && sheetConfig.activeItem && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-black text-slate-800 dark:text-white text-lg mb-1">
                          {sheetConfig.activeItem.name}
                        </h4>
                        <div className="flex gap-4 text-xs font-bold text-slate-500">
                          <span>
                            الرصيد: {sheetConfig.activeItem.stock_quantity}{' '}
                            {getUnitName(sheetConfig.activeItem.unit)}
                          </span>
                          <span>
                            المتوسط:{' '}
                            {formatCurrency(
                              sheetConfig.activeItem.average_unit_cost
                            )}
                          </span>
                        </div>
                      </div>

                      {isLedgerLoading ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {itemLedger.length === 0 ? (
                            <p className="text-center text-sm font-bold text-slate-500 py-8">
                              لا توجد حركات مسجلة
                            </p>
                          ) : (
                            itemLedger.map((mov) => {
                              const isOut = [
                                'CONSUMPTION',
                                'SALE',
                                'BARN_TRANSFER',
                              ].includes(mov.movement_type);
                              return (
                                <div
                                  key={mov._id}
                                  className="p-4 rounded-xl border bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`p-2 rounded-lg ${
                                          isOut
                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
                                        }`}
                                      >
                                        {isOut ? (
                                          <ArrowUpFromLine className="w-4 h-4" />
                                        ) : (
                                          <ArrowDownToLine className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                                          {mov.reference_doc ||
                                            (mov.movement_type ===
                                            'BARN_TRANSFER'
                                              ? 'صرف عهدة للعنبر'
                                              : mov.movement_type)}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                          {new Date(
                                            mov.movement_date
                                          ).toLocaleDateString('ar-EG')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-left">
                                      <p
                                        className={`text-lg font-black ${
                                          isOut
                                            ? 'text-rose-600'
                                            : 'text-emerald-600'
                                        }`}
                                      >
                                        {isOut ? '-' : '+'}
                                        {mov.quantity}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                                    <span>
                                      {mov.movement_type === 'PRODUCTION'
                                        ? 'تُسعر بحسب السوق'
                                        : `سعر الوحدة: ${formatCurrency(
                                            mov.unit_cost_at_time
                                          )}`}
                                    </span>
                                    <span>
                                      القيمة: {formatCurrency(mov.total_value)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
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

export default InventoryManager;