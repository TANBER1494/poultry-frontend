import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import authService from '../../services/authService';
import { showAlert } from '../../utils/alert';
import loginBackground from '../../assets/login_background.png';

// Floating Components
import ThemeToggleFloat from '../../components/layout/ThemeToggleFloat';
import WhatsAppFloat from '../../components/layout/WhatsAppFloat';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // State for Remember Me
  const [isLoading, setIsLoading] = useState(false);

  const BACKGROUND_IMAGE_URL = loginBackground;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone || !formData.password) {
      showAlert.error('بيانات ناقصة', 'يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    const phoneRegex = /^(01[0125][0-9]{8})$/;
    if (!phoneRegex.test(formData.phone)) {
      showAlert.error('خطأ في الإدخال', 'يرجى إدخال رقم هاتف مصري صحيح');
      return;
    }

    try {
      setIsLoading(true);

      const response = await authService.login(formData);

      // Pass rememberMe to the login context function
      login(response.user, response.token, response.refresh_token, rememberMe);

      showAlert.success('مرحباً بك', 'تم تسجيل الدخول بنجاح');
      navigate('/', { replace: true });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً';
      showAlert.error('فشل تسجيل الدخول', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Floating Buttons */}

      <WhatsAppFloat />

      {/* Mobile Background */}
      <div
        className="absolute inset-0 z-0 block bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>

      {/* Right Side: Login Form Area */}
      <div className="relative z-10 flex w-full flex-col justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:bg-white lg:px-16 xl:px-24 dark:lg:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md rounded-[2rem] bg-white/95 px-6 py-10 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 sm:px-10 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none dark:lg:bg-transparent dark:lg:backdrop-blur-none"
        >
          {/* Logo & Header */}
          <div className="mb-10 text-center lg:text-right">
            <div className="mx-auto mb-6 lg:mx-0">
              <img
                src="/logo.png"
                alt="Mazraaty Logo"
                className="h-16 w-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              تسجيل الدخول
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              أهلاً بك مجدداً في نظام إدارة المزارع الذكي
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                رقم الهاتف
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-left font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-slate-800"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-left font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Options Row (Remember Me & Forgot Password) */}
              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    تذكرني
                  </span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 group relative flex w-full justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'تسجيل الدخول'
              )}
            </button>

            <p className="mt-6 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              ليس لديك حساب مزرعة؟{' '}
              <Link
                to="/register"
                className="font-bold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                تأسيس نظام جديد
              </Link>
            </p>
          </form>
        </motion.div>
      </div>

      {/* Desktop Background */}
      <div
        className="relative z-10 hidden bg-cover bg-center bg-no-repeat lg:block lg:w-1/2"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>

        <div className="absolute bottom-0 left-0 right-0 p-16 text-white">
          <h2 className="mb-4 text-4xl font-black leading-tight text-white/95">
            إدارة متكاملة <br /> بين يديك
          </h2>
          <p className="max-w-md text-lg font-medium leading-relaxed text-slate-200">
            راقب قطعانك، أدر مخزونك، وتابع التدفقات النقدية لمزرعتك من لوحة تحكم
            واحدة مصممة خصيصاً لك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
