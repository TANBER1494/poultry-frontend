import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import authService from '../../services/authService';
import { showAlert } from '../../utils/alert';
import loginBackground from "../../assets/login_background.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);

  const BACKGROUND_IMAGE_URL = loginBackground;

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  const handleOtpChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
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
    const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputRefs.current[focusIndex].focus();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      showAlert.error('كود غير مكتمل', 'يرجى إدخال كود التحقق المكون من 6 أرقام');
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(formData.new_password)) {
      showAlert.error('كلمة المرور ضعيفة', 'يجب أن تتكون من 8 أحرف على الأقل، وتتضمن حروفاً وأرقاماً');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      showAlert.error('عدم تطابق', 'كلمتا المرور غير متطابقتين');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        email,
        otp: otpCode,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      };

      await authService.resetPassword(payload);
      
      showAlert.success('تم بنجاح', 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.');
      navigate('/login', { replace: true });

    } catch (error) {
      // هنا سيلتقط الفرونت إند الخطأ القادم من الباك إند إذا كانت الباسوورد مطابقة للقديمة
      const errorMessage = error.response?.data?.message || 'الكود غير صحيح أو منتهي الصلاحية';
      showAlert.error('فشل العملية', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="relative flex min-h-[100dvh] w-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Mobile Background */}
      <div
        className="fixed inset-0 z-0 block bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>

      {/* Right Side: Form Container (Scrollable) */}
      <div className="relative z-10 flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:bg-white lg:px-12 xl:px-16 dark:lg:bg-slate-950 min-h-full">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md my-auto rounded-[2rem] bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 sm:px-10 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none dark:lg:bg-transparent dark:lg:backdrop-blur-none"
        >
          <div className="mb-8 text-center lg:text-right">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 lg:mx-0 shadow-inner">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              إعادة تعيين كلمة المرور
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              أدخل الكود المرسل إلى بريدك لتأكيد العملية
              <br />
              <span className="mt-2 inline-block rounded-md bg-slate-100 px-3 py-1.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300" dir="ltr">
                {email}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3 mb-8" dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-black text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 sm:text-2xl"
                />
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">كلمة المرور الجديدة</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  name="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  value={formData.new_password}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">تأكيد كلمة المرور</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className={`block w-full rounded-xl border bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 dark:bg-slate-800 dark:text-white ${
                    formData.confirm_password && formData.new_password !== formData.confirm_password 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500' 
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700 dark:focus:border-emerald-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join('').length < 6}
              className="group relative flex w-full justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70 mt-6"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-slate-800">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowRight className="h-4 w-4" />
              إلغاء والعودة لتسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Left Side: Desktop Background Image */}
      <div 
        className="hidden bg-cover bg-center bg-no-repeat lg:block lg:w-1/2 fixed top-0 bottom-0 left-0"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-16 text-white">
          <h2 className="mb-4 text-4xl font-black leading-tight text-white/95">
            أمان مزرعتك <br /> أولويتنا القصوى
          </h2>
          <p className="max-w-md text-lg font-medium leading-relaxed text-slate-200">
            نحن نستخدم أحدث تقنيات التشفير لضمان بقاء بيانات مزارعك وتدفقاتك النقدية في أمان تام.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ResetPassword;