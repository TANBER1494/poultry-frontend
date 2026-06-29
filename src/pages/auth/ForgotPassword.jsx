import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Loader2, KeyRound, ArrowRight } from 'lucide-react';
import authService from '../../services/authService';
import { showAlert } from '../../utils/alert';
import loginBackground from "../../assets/login_background.png";


const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const BACKGROUND_IMAGE_URL = loginBackground;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert.error('إدخال خاطئ', 'يرجى إدخال بريد إلكتروني صالح');
      return;
    }

    try {
      setIsLoading(true);
      await authService.forgotPassword(email.trim().toLowerCase());
      
      showAlert.success('تم الإرسال', 'تم إرسال كود استعادة كلمة المرور إلى بريدك الإلكتروني');
      
      // التوجيه المعماري: نقل المستخدم لصفحة إعادة التعيين مع تمرير الإيميل
      navigate('/reset-password', { 
        replace: true, 
        state: { email: email.trim().toLowerCase() } 
      });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً';
      showAlert.error('فشل الإرسال', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      <div
        className="absolute inset-0 z-0 block bg-cover bg-center bg-no-repeat lg:hidden fixed"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 flex w-full flex-col justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:bg-white lg:px-16 xl:px-24 dark:lg:bg-slate-950 min-h-screen">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md my-auto rounded-[2rem] bg-white/95 px-6 py-10 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 sm:px-10 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none dark:lg:bg-transparent dark:lg:backdrop-blur-none"
        >
          <div className="mb-10 text-center lg:text-right">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 lg:mx-0 shadow-inner">
              <KeyRound className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              نسيت كلمة المرور؟
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              لا تقلق، أدخل بريدك الإلكتروني المسجل لدينا وسنرسل لك كوداً آمناً لإعادة تعيين كلمة المرور.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  dir="ltr"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-left font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إرسال كود الاستعادة'}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-slate-800">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowRight className="h-4 w-4" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </div>

      <div 
        className="relative z-10 hidden bg-cover bg-center bg-no-repeat lg:block lg:w-1/2 fixed top-0 bottom-0 left-0"
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

export default ForgotPassword;