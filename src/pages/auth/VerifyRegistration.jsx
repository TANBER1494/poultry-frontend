import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import authService from '../../services/authService';
import { showAlert } from '../../utils/alert';

const VerifyRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  // استخراج الإيميل من التوجيه، أو طرد المستخدم إذا حاول الدخول للصفحة مباشرة
  const email = location.state?.email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  // منطق العداد التنازلي لإعادة الإرسال
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // التعامل مع إدخال الأرقام في المربعات
  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return; // منع إدخال الحروف

    const newOtp = [...otp];
    // أخذ آخر رقم فقط في حال قام بعمل لصق
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // الانتقال التلقائي للمربع التالي
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // التعامل مع زر المسح (Backspace) للعودة للمربع السابق
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(isNaN)) return;

    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
    
    // التركيز على آخر مربع تم ملؤه
    const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputRefs.current[focusIndex].focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      showAlert.error('كود غير مكتمل', 'يرجى إدخال كود التحقق المكون من 6 أرقام');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.verifyRegistration({ email, otp: otpCode });
      
      // التفعيل نجح، نقوم بحفظ التوكنات وتحديث حالة المستخدم
      login(response.data.owner, response.token, response.refresh_token);
      
      showAlert.success('اكتمل التأسيس', 'تم تفعيل الحساب بنجاح، جارٍ تجهيز لوحة التحكم...');
      
      // SmartRoot سيتولى توجيهه للوحة التحكم الصحيحة بناءً على دوره
      navigate('/', { replace: true });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'كود غير صحيح أو منتهي الصلاحية';
      showAlert.error('فشل التفعيل', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;

    try {
      setIsResending(true);
      await authService.resendActivationOTP(email);
      showAlert.success('تم الإرسال', 'تم إعادة إرسال كود التفعيل إلى بريدك الإلكتروني');
      setTimer(60); // إعادة ضبط العداد
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'تعذر الإرسال، يرجى المحاولة لاحقاً';
      showAlert.error('خطأ', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-50 px-4 transition-colors duration-300 dark:bg-slate-950">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-[2rem] bg-white px-8 py-10 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner dark:bg-emerald-900/30 dark:text-emerald-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            تأكيد هويتك
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            أرسلنا كود تحقق آمن مكون من 6 أرقام إلى البريد الإلكتروني
            <br />
            <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300" dir="ltr">
              {email}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-black text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 sm:text-2xl"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length < 6}
            className="group relative flex w-full justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تفعيل الحساب'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium">
          <p className="text-slate-500 dark:text-slate-400">
            لم يصلك الكود؟{' '}
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={timer > 0 || isResending}
              className="font-bold text-emerald-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {isResending ? (
                <Loader2 className="inline h-4 w-4 animate-spin" />
              ) : timer > 0 ? (
                `إعادة الإرسال بعد (${timer})`
              ) : (
                'إعادة الإرسال الآن'
              )}
            </button>
          </p>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6 text-center dark:border-slate-800">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للتسجيل
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyRegistration;