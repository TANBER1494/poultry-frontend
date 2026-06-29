import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Bird, Tractor, AlertTriangle, 
  Package, Clock, CheckCircle2, ArrowLeft, Loader2, Factory, 
  ChevronLeft
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { showAlert } from '../../utils/alert';

const OwnerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const data = await dashboardService.getMasterDashboard();
        if (isMounted) setDashboardData(data);
      } catch (error) {
        if (isMounted) showAlert.error('خطأ', 'تعذر جلب بيانات لوحة القيادة');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchDashboard();
    return () => { isMounted = false; };
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status, daysLeft) => {
    if (status === 'LOCKED' || status === 'OVERDUE') {
      return <span className="text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-100 dark:border-rose-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> متوقف</span>;
    }
    if (status === 'TRIAL') {
      return <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-1"><Clock className="w-3 h-3"/> تجريبي ({daysLeft} يوم)</span>;
    }
    if (daysLeft <= 5) {
      return <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100 dark:border-amber-800 flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3"/> ينتهي قريباً</span>;
    }
    return <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 dark:border-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> نشط</span>;
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  if (!dashboardData) return null;

  const { grand_totals, farms } = dashboardData;

  // الحسابات التجميعية
  const totalFarms = farms.length;
  const activeFarmsCount = farms.filter(f => f.status === 'ACTIVE' || f.status === 'TRIAL').length;
  const totalBirds = farms.reduce((sum, farm) => sum + farm.active_cycles.reduce((cycleSum, cycle) => cycleSum + (cycle.current_birds || 0), 0), 0);
  const totalAlerts = farms.reduce((sum, farm) => sum + farm.low_stock_count, 0);
  const expiringFarms = farms.filter(f => f.days_left <= 5 && f.status !== 'LOCKED' && f.status !== 'OVERDUE');
  const lockedFarms = farms.filter(f => f.status === 'LOCKED' || f.status === 'OVERDUE');

  return (
    <div className="space-y-4 pb-20 max-w-6xl mx-auto">
      
      {/* رأس الصفحة المدمج */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">نظرة عامة على المؤسسة</h1>
        <p className="text-xs font-bold text-slate-500 mt-0.5">المركز المالي والتشغيلي المجمع</p>
      </div>

      {/* 2. مركز العمليات والتنبيهات (Action Center) - شرائط مضغوطة للموبايل */}
      {(expiringFarms.length > 0 || lockedFarms.length > 0 || totalAlerts > 0) && (
        <div className="flex flex-col gap-2">
          {(expiringFarms.length > 0 || lockedFarms.length > 0) && (
            <Link to="/owner/subscriptions" className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl flex items-center justify-between hover:bg-rose-100 transition-colors">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse"/>
                <div>
                  <h4 className="text-xs font-black text-rose-800 dark:text-rose-400">تنبيه اشتراكات ({expiringFarms.length + lockedFarms.length} مزارع)</h4>
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-500 mt-0.5">يوجد مزارع متوقفة أو قاربت على الانتهاء</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-rose-500" />
            </Link>
          )}

          {totalAlerts > 0 && (
            <Link to="/owner/inventory" className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl flex items-center justify-between hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-amber-600 animate-pulse"/>
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-400">نواقص المخازن ({totalAlerts} أصناف)</h4>
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mt-0.5">أصناف تخطت حد التنبيه وتحتاج للشراء</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-amber-500" />
            </Link>
          )}
        </div>
      )}

      {/* 1. قسم "نظرة عامة على المؤسسة" (Grand Totals) - 4 كروت مدمجة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-center transition-colors">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
            <h3 className="text-[10px] sm:text-[11px] font-bold">مستحقات لنا</h3>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white truncate" dir="ltr">{formatCurrency(grand_totals.total_debts_for_us)}</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-center transition-colors">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg"><TrendingDown className="w-4 h-4" /></div>
            <h3 className="text-[10px] sm:text-[11px] font-bold">التزامات علينا</h3>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white truncate" dir="ltr">{formatCurrency(grand_totals.total_debts_on_us)}</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-center transition-colors">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg"><Bird className="w-4 h-4" /></div>
            <h3 className="text-[10px] sm:text-[11px] font-bold">الطيور الحية</h3>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white truncate">{totalBirds.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">طائر</span></h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-center relative overflow-hidden transition-colors">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg"><Tractor className="w-4 h-4" /></div>
            <h3 className="text-[10px] sm:text-[11px] font-bold">المزارع</h3>
          </div>
          <div className="flex items-end gap-1.5 truncate">
            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">{totalFarms}</h2>
            <p className="text-[9px] font-bold text-slate-400 mb-0.5">({activeFarmsCount} نشطة)</p>
          </div>
        </div>

      </div>

      {/* 3. شبكة المزارع (Farms Grid) - مدمجة وهادئة الألوان */}
      <div className="pt-2">
        <h2 className="text-sm font-black text-slate-800 dark:text-white mb-3">التفاصيل التشغيلية للمزارع</h2>
        
        {farms.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 border-dashed dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500">لا توجد مزارع مسجلة بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {farms.map((farm) => (
              <div key={farm._id} className={`bg-white dark:bg-slate-900 rounded-2xl border ${farm.status === 'LOCKED' || farm.status === 'OVERDUE' ? 'border-rose-100 dark:border-rose-900/30 opacity-90' : 'border-slate-200 dark:border-slate-800'} p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}>
                
                {/* الرأس */}
                <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-sm mb-1">{farm.name}</h3>
                    {getStatusBadge(farm.status, farm.days_left)}
                  </div>
                  {farm.has_feed_mill && (
                    <Factory className="w-4 h-4 text-slate-400" title="يوجد مصنع أعلاف" />
                  )}
                </div>

                {/* القلب التشغيلي */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500">الدورات النشطة:</span>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{farm.active_cycles_count} دورة</span>
                  </div>
                  
                  {farm.active_cycles.length > 0 ? (
                    <div className="space-y-1">
                      {farm.active_cycles.slice(0, 2).map(cycle => (
                        <div key={cycle.cycle_id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-lg text-[10px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{cycle.name}</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{cycle.current_birds?.toLocaleString()} طائر</span>
                        </div>
                      ))}
                      {farm.active_cycles.length > 2 && (
                        <p className="text-[9px] text-center text-slate-400 font-bold mt-1">+{farm.active_cycles.length - 2} عنابر أخرى</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-400">لا توجد دورات نشطة</p>
                    </div>
                  )}
                </div>

                {/* التذييل المالي */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                    <p className="text-[8px] font-bold text-emerald-600/80 mb-0.5">لنا</p>
                    <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 truncate">{formatCurrency(farm.debts_for_us)}</p>
                  </div>
                  <div className="flex-1 bg-rose-50/50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
                    <p className="text-[8px] font-bold text-rose-600/80 mb-0.5">علينا</p>
                    <p className="text-[11px] font-black text-rose-700 dark:text-rose-400 truncate">{formatCurrency(farm.debts_on_us)}</p>
                  </div>
                </div>

                {/* زر إجراء سريع */}
                <Link to="/owner/farms" className="mt-auto flex items-center justify-center gap-1.5 w-full bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-colors">
                  إدارة المزرعة <ChevronLeft className="w-3 h-3" />
                </Link>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default OwnerDashboard;