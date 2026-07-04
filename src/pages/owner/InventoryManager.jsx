import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, Loader2, Package, Tractor, FileText, ArrowDownToLine, ArrowUpFromLine,
  MoreVertical, Settings2, Trash2, AlertCircle, Activity, Box, Syringe, ShieldAlert,
  Eye, DollarSign
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

  const [itemFormData, setItemFormData] = useState({
    name: '', category: 'FEED', unit: 'BAG', min_alert_level: '', average_unit_cost: ''
  });

  const [movementFormData, setMovementFormData] = useState({
    movement_type: 'PURCHASE', quantity: '', unit_cost_at_time: '', 
    movement_date: new Date().toISOString().split('T')[0], reference_doc: ''
  });

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
          await fetchFarmData(firstFarm._id, isMounted);
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

  const fetchFarmData = async (farmId, isMounted = true) => {
    try {
      setIsLoading(true);
      const [itemsRes, cyclesRes] = await Promise.all([
        inventoryService.getInventoryItems(farmId),
        cycleService.getFarmCycles(farmId)
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
    const selectedFarm = farms.find(f => f._id === newFarmId);
    if (selectedFarm) setFarmName(selectedFarm.name);
    await fetchFarmData(newFarmId);
  };

  const closeSheet = () => setSheetConfig({ isOpen: false, mode: 'ADD_ITEM', activeItem: null });

  const openAddItem = () => {
    setItemFormData({ name: '', category: 'FEED', unit: 'BAG', min_alert_level: '' });
    setSheetConfig({ isOpen: true, mode: 'ADD_ITEM', activeItem: null });
  };

  const openEditSheet = (item) => {
    setItemFormData({ name: item.name, category: item.category, unit: item.unit, min_alert_level: item.min_alert_level });
    setSheetConfig({ isOpen: true, mode: 'EDIT_ITEM', activeItem: item });
  };

  const openMovement = (item) => {
    setMovementFormData({ movement_type: 'PURCHASE', quantity: '', unit_cost_at_time: '', movement_date: new Date().toISOString().split('T')[0], reference_doc: '' });
    setSheetConfig({ isOpen: true, mode: 'MOVEMENT', activeItem: item });
  };

  const openCustody = (item) => {
    setSheetConfig({ isOpen: true, mode: 'CUSTODY', activeItem: item });
  };

  const openUpdatePrice = (item) => {
    setItemFormData(prev => ({ ...prev, average_unit_cost: item.average_unit_cost }));
    setSheetConfig({ isOpen: true, mode: 'UPDATE_PRICE', activeItem: item });
  };

  const openLedger = async (item) => {
    setSheetConfig({ isOpen: true, mode: 'LEDGER', activeItem: item });
    try {
      setIsLedgerLoading(true);
      const res = await inventoryService.getItemMovements(item._id);
      setItemLedger(res.movements || []);
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب حركات الصنف');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (sheetConfig.mode !== 'UPDATE_PRICE' && !itemFormData.name) return showAlert.error('خطأ', 'اسم الصنف مطلوب');
    
    try {
      setIsActionLoading(true);
      if (sheetConfig.mode === 'ADD_ITEM') {
        await inventoryService.addInventoryItem({ ...itemFormData, farm_id: selectedFarmId });
        showAlert.success('نجاح', 'تم إضافة الصنف للمخزن');
      } else if (sheetConfig.mode === 'UPDATE_PRICE') {
        await inventoryService.updateInventoryItem(sheetConfig.activeItem._id, { 
          average_unit_cost: itemFormData.average_unit_cost,
          farm_id: selectedFarmId 
        });
        showAlert.success('نجاح', 'تم تحديث سعر السوق للمنتج بنجاح');
      } else {
        await inventoryService.updateInventoryItem(sheetConfig.activeItem._id, { 
          ...itemFormData,
          farm_id: selectedFarmId 
        });
        showAlert.success('نجاح', 'تم تحديث بيانات الصنف');
      }
      closeSheet();
      await fetchFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل الحفظ');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`هل أنت متأكد من أرشفة الصنف (${item.name})؟`)) return;
    try {
      setIsActionLoading(true);
      await inventoryService.deleteInventoryItem(item._id);
      showAlert.success('تم الحذف', 'تم أرشفة الصنف بنجاح');
      closeSheet();
      await fetchFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error('خطأ', error.response?.data?.message || 'فشل الحذف');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    if (!movementFormData.quantity) return showAlert.error('خطأ', 'يجب إدخال الكمية');
    if (!movementFormData.unit_cost_at_time && movementFormData.movement_type !== 'RETURN') return showAlert.error('خطأ', 'يجب إدخال السعر للوارد');

    try {
      setIsActionLoading(true);
      const payload = {
        local_id: `MOV-${Date.now()}`,
        farm_id: selectedFarmId,
        item_id: sheetConfig.activeItem._id,
        movement_type: movementFormData.movement_type,
        quantity: movementFormData.quantity,
        unit_cost_at_time: movementFormData.unit_cost_at_time || sheetConfig.activeItem.average_unit_cost,
        movement_date: movementFormData.movement_date,
        reference_doc: movementFormData.reference_doc
      };

      await inventoryService.recordMovement(payload);
      showAlert.success('نجاح', 'تم تسجيل الحركة بنجاح');
      closeSheet();
      await fetchFarmData(selectedFarmId);
    } catch (error) {
      showAlert.error('إجراء مرفوض', error.response?.data?.message || 'فشل تسجيل الحركة');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getCategoryMeta = (cat) => {
    const meta = {
      'FEED': { label: 'أعلاف', color: 'bg-amber-100 text-amber-700', icon: <Package className="w-4 h-4"/> },
      'MEDICATION': { label: 'أدوية', color: 'bg-indigo-100 text-indigo-700', icon: <Syringe className="w-4 h-4"/> },
      'VACCINE': { label: 'لقاحات', color: 'bg-rose-100 text-rose-700', icon: <Activity className="w-4 h-4"/> },
      'DISINFECTANT': { label: 'مطهرات', color: 'bg-cyan-100 text-cyan-700', icon: <ShieldAlert className="w-4 h-4"/> },
      'PRODUCT': { label: 'إنتاج تام (منتجات)', color: 'bg-emerald-100 text-emerald-700', icon: <Box className="w-4 h-4"/> },
      'OTHER': { label: 'أخرى', color: 'bg-slate-100 text-slate-700', icon: <Box className="w-4 h-4"/> }
    };
    return meta[cat] || meta['OTHER'];
  };

  const getUnitName = (unit) => {
    const units = { 'BAG': 'شيكارة/كيس', 'TON': 'طن', 'LITER': 'لتر', 'BOTTLE': 'عبوة', 'KG': 'كجم', 'PIECE': 'قطعة', 'TRAY': 'طبق/كرتونة' };
    return units[unit] || unit;
  };

  // 🛡️ التعديل الثاني: إعادة دالة ترجمة أنواع الحركات المخزنية
  const getMovementTypeName = (type) => {
    const types = { 
      'PURCHASE': 'مشتريات/وارد', 
      'TRANSFER_IN': 'تحويل وارد', 
      'PRODUCTION': 'إنتاج تام', 
      'RETURN': 'مرتجع للمخزن', 
      'CONSUMPTION': 'منصرف/استهلاك', 
      'ADJUSTMENT': 'تسوية عجز/هالك', 
      'BARN_TRANSFER': 'صرف عهدة للعنبر',
      'SALE': 'مبيعات/منصرف'
    };
    return types[type] || type;
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0);

  const totalInventoryValue = items.reduce((acc, item) => acc + (item.stock_quantity * item.average_unit_cost), 0);
  const alertsCount = items.filter(item => item.stock_quantity <= item.min_alert_level && item.min_alert_level > 0).length;

  const sheetVariants = { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 200 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } } };
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-emerald-500" /> إدارة المخازن الرئيسية
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">شراء الأصناف ومراقبة أرصدة العنابر والمنتجات</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"><Tractor className="h-4 w-4" /></div>
            <select value={selectedFarmId} onChange={handleFarmChange} disabled={isLoading || farms.length === 0} className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {farms.length === 0 && <option value="">لا توجد مزارع</option>}
              {farms.map(farm => <option key={farm._id} value={farm._id}>{farm.name}</option>)}
            </select>
          </div>
          <button onClick={openAddItem} disabled={farms.length === 0} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm disabled:opacity-50">
            <Plus className="h-5 w-5" /><span className="hidden sm:inline">صنف جديد</span>
          </button>
        </div>
      </div>

      {!isLoading && farms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl"><FileText className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-500">إجمالي قيمة الأصول (أعلاف + منتجات)</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{formatCurrency(totalInventoryValue)}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-xl"><Box className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-500">الأصناف المعرفة بالمخزن</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{items.length} صنف</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${alertsCount > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}><AlertCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-500">نواقص تتطلب الشراء</p>
              <h3 className={`text-xl font-black mt-0.5 ${alertsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{alertsCount} تنبيه</h3>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white py-20 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50"><Package className="h-10 w-10 text-slate-400 dark:text-slate-500" /></div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">المخزن فارغ حالياً</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm">قم بتعريف الأصناف لتتمكن من إدخال المشتريات ومراقبة أرصدة العنابر.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => {
            const meta = getCategoryMeta(item.category);
            const isLowStock = item.stock_quantity <= item.min_alert_level && item.min_alert_level > 0;
            const isProduct = item.category === 'PRODUCT'; 

            return (
              <motion.div key={item._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow dark:bg-slate-900 flex flex-col justify-between ${isLowStock ? 'border-rose-200 dark:border-rose-900/50' : 'border-slate-100 dark:border-slate-800'}`}>
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3">
                      <div className={`p-2.5 rounded-xl ${meta.color} flex items-center justify-center`}>{meta.icon}</div>
                      <div>
                        <h3 className="font-black text-slate-800 dark:text-white leading-tight">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{meta.label}</span>
                          {isLowStock && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-900/30 animate-pulse">رصيد منخفض</span>}
                        </div>
                      </div>
                    </div>
                    {!isProduct && (
                      <button onClick={() => setSheetConfig({ isOpen: true, mode: 'OPTIONS', activeItem: item })} className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"><MoreVertical className="w-5 h-5" /></button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className={`p-3 rounded-xl ${isProduct ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                      <p className="text-[10px] font-bold text-slate-500 mb-1">الرصيد في المخزن الرئيسي</p>
                      <p className={`text-lg font-black ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{item.stock_quantity.toLocaleString()} <span className="text-xs font-bold text-slate-400">{getUnitName(item.unit)}</span></p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                      {isProduct ? (
                        <>
                          <p className="text-[10px] font-bold text-slate-500 mb-1">سعر السوق الحالي (للوحدة)</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{item.average_unit_cost.toLocaleString()} <span className="text-xs font-bold text-emerald-400/70">ج.م</span></p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold text-slate-500 mb-1">متوسط التكلفة للوحدة</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{item.average_unit_cost.toLocaleString()} <span className="text-xs font-bold text-emerald-400/70">ج.م</span></p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!isProduct ? (
                  <div className="grid grid-cols-3 gap-1.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => openMovement(item)} className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 font-bold transition-colors">
                      <ArrowDownToLine className="w-4 h-4 mb-1"/> <span className="text-[10px]">شراء وارد</span>
                    </button>
                    <button onClick={() => openCustody(item)} className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 font-bold transition-colors">
                      <Eye className="w-4 h-4 mb-1"/> <span className="text-[10px]">عُهد العنابر</span>
                    </button>
                    <button onClick={() => openLedger(item)} className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold transition-colors">
                      <FileText className="w-4 h-4 mb-1"/> <span className="text-[10px]">كشف الصنف</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => openUpdatePrice(item)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold text-xs transition-colors">
                      <DollarSign className="w-4 h-4"/> تحديث سعر السوق
                    </button>
                    <button onClick={() => openLedger(item)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs transition-colors">
                      <FileText className="w-4 h-4"/> سجل الإنتاج
                    </button>
                  </div>
                )}
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
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {sheetConfig.mode === 'ADD_ITEM' && 'تعريف صنف مخزني جديد'}
                    {sheetConfig.mode === 'EDIT_ITEM' && 'تعديل بيانات الصنف'}
                    {sheetConfig.mode === 'OPTIONS' && 'خيارات الصنف الإضافية'}
                    {sheetConfig.mode === 'UPDATE_PRICE' && `تسعير المنتج: ${sheetConfig.activeItem?.name}`}
                    {sheetConfig.mode === 'MOVEMENT' && `شراء وارد: ${sheetConfig.activeItem?.name}`}
                    {sheetConfig.mode === 'CUSTODY' && `أرصدة العنابر: ${sheetConfig.activeItem?.name}`}
                    {sheetConfig.mode === 'LEDGER' && `كشف حركات: ${sheetConfig.activeItem?.name}`}
                  </h3>
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  
                  {/* OPTIONS (فقط للأصناف العادية) */}
                  {sheetConfig.mode === 'OPTIONS' && sheetConfig.activeItem && (
                    <div className="space-y-3">
                      <button onClick={() => openEditSheet(sheetConfig.activeItem)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors">
                        <Settings2 className="w-5 h-5" /> تعديل إعدادات وتنبيهات الصنف
                      </button>
                      <button onClick={() => handleDeleteItem(sheetConfig.activeItem)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 font-bold text-sm transition-colors">
                        <Trash2 className="w-5 h-5" /> أرشفة الصنف (إخفاء من القائمة)
                      </button>
                    </div>
                  )}

                  {/* 🛡️ تحديث سعر السوق للبيض */}
                  {sheetConfig.mode === 'UPDATE_PRICE' && sheetConfig.activeItem && (
                     <form onSubmit={handleItemSubmit} className="space-y-4">
                       <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 mb-2">
                         <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">تحديث سعر السوق سيؤدي إلى إعادة تقييم المخزون الحالي من هذا المنتج لتوضيح قيمة أصولك.</p>
                       </div>
                       <div>
                         <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">سعر السوق الحالي لـ ({getUnitName(sheetConfig.activeItem.unit)}) *</label>
                         <input type="number" step="0.01" min="0" value={itemFormData.average_unit_cost} onChange={e => setItemFormData(p => ({...p, average_unit_cost: e.target.value}))} placeholder="ج.م" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-black outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required />
                       </div>
                       <button type="submit" disabled={isActionLoading} className="mt-6 w-full flex justify-center items-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70">
                         {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ وتسعير المخزون'}
                       </button>
                     </form>
                  )}

                  {/* ADD/EDIT ITEM */}
                  {(sheetConfig.mode === 'ADD_ITEM' || sheetConfig.mode === 'EDIT_ITEM') && (
                    <form onSubmit={handleItemSubmit} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">اسم الصنف (واضح ومميز) *</label>
                        <input type="text" value={itemFormData.name} onChange={e => setItemFormData(p => ({...p, name: e.target.value}))} placeholder="مثال: علف بادي نامي 23%" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">تصنيف الصنف *</label>
                          <select value={itemFormData.category} onChange={e => setItemFormData(p => ({...p, category: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required>
                            <option value="FEED">أعلاف</option>
                            <option value="MEDICATION">أدوية</option>
                            <option value="VACCINE">لقاحات وتحصين</option>
                            <option value="DISINFECTANT">مطهرات</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">وحدة القياس *</label>
                          <select value={itemFormData.unit} onChange={e => setItemFormData(p => ({...p, unit: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" required>
                            <option value="BAG">شيكارة/كيس</option>
                            <option value="TON">طن</option>
                            <option value="KG">كجم</option>
                            <option value="LITER">لتر</option>
                            <option value="BOTTLE">زجاجة/عبوة</option>
                            <option value="PIECE">قطعة</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">تنبيه النواقص (عند وصول الرصيد إلى)</label>
                        <input type="number" min="0" value={itemFormData.min_alert_level} onChange={e => setItemFormData(p => ({...p, min_alert_level: e.target.value}))} placeholder="اتركه فارغاً لإلغاء التنبيه" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                      <button type="submit" disabled={isActionLoading} className="mt-6 w-full flex justify-center items-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70">
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ بيانات الصنف'}
                      </button>
                    </form>
                  )}

                  {/* CUSTODY */}
                  {sheetConfig.mode === 'CUSTODY' && sheetConfig.activeItem && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 mb-4 text-center">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-1">الرصيد المتاح في المخزن الرئيسي حالياً</p>
                        <p className="text-2xl font-black text-amber-800 dark:text-amber-400">{sheetConfig.activeItem.stock_quantity} <span className="text-sm">{getUnitName(sheetConfig.activeItem.unit)}</span></p>
                      </div>

                      <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">الأرصدة المسحوبة كعُهد داخل العنابر النشطة:</h4>
                      
                      {cycles.filter(c => c.status === 'ACTIVE').length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl">لا توجد عنابر (دورات) نشطة حالياً</div>
                      ) : (
                        <div className="space-y-2">
                          {cycles.filter(c => c.status === 'ACTIVE').map(cycle => {
                            const custodyRecord = cycle.feed_custody?.find(fc => {
                              const itemId = fc.item_id?._id || fc.item_id;
                              return String(itemId) === String(sheetConfig.activeItem._id);
                            });
                            const barnQty = custodyRecord ? custodyRecord.quantity : 0;
                            
                            return (
                              <div key={cycle._id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                  <p className="text-sm font-black text-slate-800 dark:text-white">{cycle.barn_id?.name || 'عنبر غير محدد'}</p>
                                  <p className="text-[10px] font-bold text-slate-500">دورة: {cycle.name}</p>
                                </div>
                                <div className="text-left">
                                  <p className={`text-lg font-black ${barnQty > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                    {barnQty.toLocaleString()} <span className="text-xs">{getUnitName(sheetConfig.activeItem.unit)}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MOVEMENT FORM */}
                  {sheetConfig.mode === 'MOVEMENT' && sheetConfig.activeItem && (
                    <form onSubmit={handleMovementSubmit} className="space-y-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 mb-2">
                        <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">إضافة مشتريات (وارد) للمخزن الرئيسي لتقوم العنابر بسحبها لاحقاً.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">نوع الإضافة (وارد) *</label>
                          <select value={movementFormData.movement_type} onChange={e => setMovementFormData(p => ({...p, movement_type: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              <option value="PURCHASE">شراء جديد (من مورد)</option>
                              <option value="TRANSFER_IN">تحويل وارد من مزرعة أخرى</option>
                              <option value="RETURN">مرتجع من عنبر للمخزن</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">تاريخ الوارد *</label>
                          <input type="date" value={movementFormData.movement_date} onChange={e => setMovementFormData(p => ({...p, movement_date: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">الكمية المستلمة ({getUnitName(sheetConfig.activeItem.unit)}) *</label>
                          <input type="number" step="0.01" min="0.01" value={movementFormData.quantity} onChange={e => setMovementFormData(p => ({...p, quantity: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required />
                        </div>
                        {movementFormData.movement_type !== 'RETURN' && (
                          <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">سعر شراء الوحدة (للوارد) *</label>
                            <input type="number" step="0.01" min="0" value={movementFormData.unit_cost_at_time} onChange={e => setMovementFormData(p => ({...p, unit_cost_at_time: e.target.value}))} placeholder="ج.م" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-black outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-400">رقم الفاتورة أو المرجع (اختياري)</label>
                        <input type="text" value={movementFormData.reference_doc} onChange={e => setMovementFormData(p => ({...p, reference_doc: e.target.value}))} placeholder="مثال: فاتورة شراء رقم 1234" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                      </div>

                      <button type="submit" disabled={isActionLoading} className="mt-6 w-full flex justify-center items-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-70">
                        {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تسجيل البضاعة بالمخزن'}
                      </button>
                    </form>
                  )}

                  {/* LEDGER */}
                  {sheetConfig.mode === 'LEDGER' && (
                    <div className="space-y-3">
                      {isLedgerLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                      ) : itemLedger.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-sm font-bold bg-slate-50 dark:bg-slate-800/50 rounded-2xl">لا توجد حركات مسجلة لهذا الصنف</div>
                      ) : (
                        itemLedger.map(mov => {
                          const isOut = ['CONSUMPTION', 'ADJUSTMENT', 'BARN_TRANSFER', 'SALE'].includes(mov.movement_type);
                          return (
                            <div key={mov._id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isOut ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {isOut ? <ArrowUpFromLine className="w-4 h-4"/> : <ArrowDownToLine className="w-4 h-4"/>}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-800 dark:text-white">{getMovementTypeName(mov.movement_type)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(mov.movement_date).toLocaleDateString('ar-EG')}</p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className={`text-lg font-black ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {isOut ? '-' : '+'}{mov.quantity}
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                                <span>{mov.movement_type === 'PRODUCTION' ? 'تُسعر بحسب السوق' : `سعر الوحدة: ${formatCurrency(mov.unit_cost_at_time)}`}</span>
                                <span>القيمة: {formatCurrency(mov.total_value)}</span>
                              </div>
                            </div>
                          )
                        })
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