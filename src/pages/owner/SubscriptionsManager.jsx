import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  UploadCloud,
  CheckCircle,
  Loader2,
  X,
  Smartphone,
  CalendarDays,
  Tractor,
  ArrowRight,
  History,
  ChevronDown,
  Activity,
  Trash2,
} from 'lucide-react';
import { showAlert } from '../../utils/alert';
import farmService from '../../services/farmService';
import platformPaymentService from '../../services/platformPaymentService';

const SUBSCRIPTION_PACKAGES = [
  { months: 1, price: 500, title: 'باقة شهرية', discount: null },
  { months: 3, price: 1350, title: 'باقة 3 شهور', discount: 'وفر 150 ج' },
  { months: 6, price: 2500, title: 'باقة 6 شهور', discount: 'وفر 500 ج' },
  { months: 12, price: 4800, title: 'باقة سنوية', discount: 'وفر 1200 ج' },
];

const VODAFONE_CASH_NUMBERS = ['01112793953', '01032716249'];

const SubscriptionsManager = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [farms, setFarms] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFarm, setExpandedFarm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(
    SUBSCRIPTION_PACKAGES[0]
  );
  const [transferNumber, setTransferNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);

  useEffect(() => {
    // 🛡️ قراءة رسالة الطرد من الرابط وعرضها للمستخدم
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('expired')) {
      const msg =
        urlParams.get('msg') ||
        'انتهى اشتراك المزرعة، يرجى التجديد لتتمكن من استخدام النظام.';
      showAlert.error('إجراء أمني', msg);
      // تنظيف الرابط بعد عرض الرسالة
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchInitialData();
  }, [location]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const farmsRes = await farmService.getFarms();
      setFarms(farmsRes.farms || farmsRes);

      try {
        const historyData = await platformPaymentService.getHistory();
        setPaymentHistory(historyData);
      } catch (historyErr) {
        setPaymentHistory([]);
      }
    } catch (error) {
      showAlert.error('خطأ', 'تعذر جلب بيانات المزارع الأساسية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async (farmId, farmName) => {
    showAlert
      .error(
        'تنظيف السجل',
        `هل أنت متأكد من مسح جميع سجلات مزرعة (${farmName})؟`
      )
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await platformPaymentService.clearFarmHistory(farmId);
            showAlert.success('تم التنظيف', 'تم إخفاء السجلات بنجاح.');
            fetchInitialData();
          } catch (error) {
            showAlert.error('خطأ', error.message);
          }
        }
      });
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedFarm || !transferNumber || !receiptImage) {
      return showAlert.error('تنبيه', 'يرجى إكمال جميع الحقول وإرفاق الإيصال');
    }

    const formData = new FormData();
    formData.append('farm_id', selectedFarm);
    formData.append('amount_paid', selectedPackage.price);
    formData.append('requested_months', selectedPackage.months);
    formData.append('transfer_number', transferNumber);
    formData.append('receipt_image', receiptImage);

    setIsSubmitting(true);
    try {
      await platformPaymentService.submitRequest(formData);
      showAlert.success('تم الإرسال', 'تم رفع طلبك بنجاح وبانتظار المراجعة.');
      setIsModalOpen(false);
      setSelectedFarm('');
      setTransferNumber('');
      setReceiptImage(null);
      setSelectedPackage(SUBSCRIPTION_PACKAGES[0]);
      fetchInitialData();
    } catch (error) {
      showAlert.error(
        'فشل الإرسال',
        error.response?.data?.message || 'تعذر إرسال الطلب'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3" /> مقبول
          </span>
        );
      case 'PENDING':
        return (
          <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800 animate-pulse">
            <Clock className="w-3 h-3" /> مراجعة
          </span>
        );
      case 'REJECTED':
        return (
          <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3" /> مرفوض
          </span>
        );
      default:
        return null;
    }
  };

  const toggleFarmHistory = (farmId) => {
    setExpandedFarm(expandedFarm === farmId ? null : farmId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20">
      {/* Header المصغر */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/owner')}
            className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" /> الاشتراكات
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-0.5">
              تجديد ومتابعة صلاحية المزارع
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4" /> طلب تجديد
        </button>
      </div>

      {/* قائمة المزارع (تصميم مدمج) */}
      {farms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed p-8 text-center mt-4">
          <Tractor className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-slate-800 dark:text-white text-sm">
            لا توجد مزارع مسجلة
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            يجب عليك إنشاء مزرعة أولاً لتتمكن من تجديدها.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {farms.map((farm) => {
            const farmHistory = paymentHistory.filter(
              (p) => p.farm_id?._id === farm._id || p.farm_id === farm._id
            );
            const isExpanded = expandedFarm === farm._id;
            const status = farm.subscription_status;
            const days_left = farm.days_left || 0;

            return (
              <div
                key={farm._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
              >
                <div
                  onClick={() => toggleFarmHistory(farm._id)}
                  className="p-3.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status === 'LOCKED' || status === 'OVERDUE' ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : days_left <= 5 ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/20' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20'}`}
                    >
                      <Tractor className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                        {farm.name}
                      </h3>
                      <div className="mt-1">
                        {status === 'LOCKED' || status === 'OVERDUE' ? (
                          <span className="text-[10px] font-bold text-rose-500">
                            متوقف (يحتاج تجديد)
                          </span>
                        ) : status === 'TRIAL' ? (
                          <span className="text-[10px] font-bold text-indigo-500">
                            تجريبي ({days_left} يوم)
                          </span>
                        ) : days_left <= 5 ? (
                          <span className="text-[10px] font-bold text-amber-500">
                            ينتهي خلال {days_left} يوم
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-500">
                            نشط ({days_left} يوم)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-auto sm:ml-0">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {farmHistory.length} طلبات
                    </span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5" /> سجل الاشتراكات
                          </h4>
                          {farmHistory.length > 0 && (
                            <button
                              onClick={() =>
                                handleClearHistory(farm._id, farm.name)
                              }
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> مسح
                            </button>
                          )}
                        </div>

                        {farmHistory.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-[11px] font-bold text-slate-400">
                              لا توجد طلبات سابقة.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {farmHistory.map((payment) => (
                              <div
                                key={payment._id}
                                className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md text-center shrink-0 w-[55px]">
                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-none">
                                      {payment.amount_paid}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                                      ج.م
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                                      باقة {payment.requested_months} شهور
                                    </p>
                                    <p className="text-[9px] font-medium text-slate-500 mt-0.5">
                                      {new Date(
                                        payment.createdAt
                                      ).toLocaleDateString('ar-EG')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {getStatusBadge(payment.status)}
                                  {payment.status === 'REJECTED' &&
                                    payment.admin_notes && (
                                      <p className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                        {payment.admin_notes}
                                      </p>
                                    )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal مدمج لطلب التجديد */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex justify-center items-end sm:items-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-500" /> طلب تجديد
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg hover:text-rose-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-3.5 rounded-xl">
                  <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                    حول القيمة لإحدى المحافظ ثم ارفع الإيصال:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VODAFONE_CASH_NUMBERS.map((n) => (
                      <span
                        key={n}
                        className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-700/50 text-xs font-black text-indigo-700 dark:text-indigo-400 select-all"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                <form
                  id="payment-form"
                  onSubmit={handleSubmitPayment}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500">
                      اختر المزرعة *
                    </label>
                    <select
                      value={selectedFarm}
                      onChange={(e) => setSelectedFarm(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">-- المزرعة --</option>
                      {farms.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500">
                      رقم المحفظة المحول منها *
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="tel"
                        value={transferNumber}
                        onChange={(e) => setTransferNumber(e.target.value)}
                        className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-left"
                        required
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500">
                      الباقة *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUBSCRIPTION_PACKAGES.map((pkg, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`cursor-pointer p-3 rounded-xl border-2 relative ${selectedPackage.months === pkg.months ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
                        >
                          {pkg.discount && (
                            <span className="absolute -top-2 right-1.5 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
                              {pkg.discount}
                            </span>
                          )}
                          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            {pkg.title}
                          </h4>
                          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {pkg.price}{' '}
                            <span className="text-[9px] text-slate-400">ج</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500">
                      إثبات التحويل (الإيصال) *
                    </label>
                    <div
                      className={`relative border border-dashed rounded-xl p-4 text-center ${receiptImage ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-600'}`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptImage(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      {receiptImage ? (
                        <div>
                          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                          <p
                            className="text-[10px] text-slate-500 truncate max-w-full"
                            dir="ltr"
                          >
                            {receiptImage.name}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                          <p className="text-[10px] font-bold text-slate-500">
                            اضغط لرفع الصورة
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  form="payment-form"
                  disabled={isSubmitting}
                  className="flex-[2] bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-bold flex justify-center items-center gap-1.5 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}{' '}
                  رفع الطلب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionsManager;
