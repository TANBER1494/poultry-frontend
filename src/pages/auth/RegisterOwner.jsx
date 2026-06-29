import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, Lock, Eye, EyeOff, Loader2, Building2, Tractor, LayoutDashboard, ArrowRight, ArrowLeft } from 'lucide-react';
import authService from '../../services/authService';
import { showAlert } from '../../utils/alert';
import loginBackground from "../../assets/login_background.png";


const RegisterOwner = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization_name: '',
    farm_name: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const BACKGROUND_IMAGE_URL = loginBackground;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const nextStep = () => {
    //  1. Validation for Name
    if (!formData.name.trim() || formData.name.length < 3) {
      showAlert.error('خطأ في الإدخال', 'يرجى إدخال اسمك بالكامل (3 أحرف على الأقل)');
      return;
    }

    //  2. Validation for Phone (Egyptian numbers standard)
    const phoneRegex = /^(01[0125][0-9]{8})$/;
    if (!phoneRegex.test(formData.phone)) {
      showAlert.error('خطأ في الإدخال', 'يرجى إدخال رقم هاتف مصري صحيح (11 رقم)');
      return;
    }

    //  3. Validation for Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showAlert.error('خطأ في الإدخال', 'يرجى إدخال بريد إلكتروني صالح');
      return;
    }

    setStep(2);
  };

  const prevStep = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.organization_name.trim() || !formData.farm_name.trim()) {
      showAlert.error('بيانات ناقصة', 'يرجى إدخال اسم المؤسسة والمزرعة');
      return;
    }

    //  4. Global Standard Validation for Password
    // الأمان: 8 أحرف على الأقل، يحتوي على حرف واحد ورقم واحد على الأقل
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      showAlert.error(
        'كلمة المرور ضعيفة', 
        'يجب أن تتكون من 8 أحرف على الأقل، وتتضمن حروفاً وأرقاماً لضمان أمان مزرعتك'
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showAlert.error('كلمة المرور غير متطابقة', 'يرجى التأكد من كتابة كلمة المرور بشكل متطابق في الحقلين');
      return;
    }

    try {
      setIsLoading(true);
      
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        organization_name: formData.organization_name.trim(),
        farm_name: formData.farm_name.trim(),
      };

      const response = await authService.registerOwner(payload);

      showAlert.success('تم التسجيل المبدئي بنجاح', response.message || 'يرجى تفقد بريدك الإلكتروني لإدخال كود التفعيل');
      
      // التوجيه المعماري الصحيح: نرسله لصفحة التفعيل مع تمرير الإيميل في الخلفية
      navigate('/verify-registration', { 
        replace: true, 
        state: { email: payload.email } 
      });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً';
      showAlert.error('فشل التسجيل', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  return (
    // التعديل السحري هنا: إضافة h-[100dvh] و overflow-y-auto للتحكم في التمرير محلياً
    <div className="relative flex h-[100dvh] w-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Mobile Background: الثبات الكامل للخلفية أثناء التمرير */}
      <div
        className="fixed inset-0 z-0 block bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE_URL}')` }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>

      {/* Right Side: Form Container (أصبح مرناً ويسمح بالتمرير) */}
      <div className="relative z-10 flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:bg-white lg:px-12 xl:px-16 dark:lg:bg-slate-950 min-h-full">
        
        <div className="mx-auto w-full max-w-md my-auto rounded-[2rem] bg-white/95 px-6 py-8 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 sm:px-10 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none dark:lg:bg-transparent dark:lg:backdrop-blur-none">
          
          {/* Header & Logo */}
          <div className="mb-8 text-center lg:text-right">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 lg:mx-0 shadow-inner">
              <LayoutDashboard className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              تأسيس نظام جديد
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              {step === 1 ? 'الخطوة 1 من 2: بياناتك الشخصية' : 'الخطوة 2 من 2: بيانات المزرعة والأمان'}
            </p>
            
            {/* Progress Bar */}
            <div className="mt-4 flex gap-2 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500 w-1/2"></div>
              <div className={`h-full bg-emerald-500 transition-all duration-500 w-1/2 ${step === 2 ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait" custom={step === 1 ? -1 : 1}>
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={-1}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Name Input */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">الاسم بالكامل</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        name="name"
                        type="text"
                        placeholder="محمد عبدالخالق"
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">رقم الهاتف</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <Phone className="h-5 w-5" />
                      </div>
                      <input
                        name="phone"
                        type="tel"
                        dir="ltr"
                        placeholder="01xxxxxxxxx"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">البريد الإلكتروني</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        name="email"
                        type="email"
                        dir="ltr"
                        placeholder="example@mail.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-6 group relative flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
                  >
                    التالي <ArrowLeft className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={1}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Organization & Farm */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">اسم المؤسسة</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <input
                        name="organization_name"
                        type="text"
                        placeholder="مؤسسة الحمد"
                        value={formData.organization_name}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">اسم المزرعة الأولى</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <Tractor className="h-5 w-5" />
                      </div>
                      <input
                        name="farm_name"
                        type="text"
                        placeholder="مزرعة الهيشة"
                        value={formData.farm_name}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">كلمة المرور</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        dir="ltr"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`block w-full rounded-xl border bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-2 dark:bg-slate-800 dark:text-white ${
                          formData.confirmPassword && formData.password !== formData.confirmPassword 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500' 
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700 dark:focus:border-emerald-500'
                        }`}
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

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-shrink-0 flex items-center justify-center w-14 rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 group relative flex justify-center rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إنشاء الحساب'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-6 text-center text-sm font-medium text-slate-600 dark:text-slate-400 pt-2">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                تسجيل الدخول
              </Link>
            </p>
          </form>
        </div>
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
            ابدأ رحلتك نحو <br /> الإدارة الذكية
          </h2>
          <p className="max-w-md text-lg font-medium leading-relaxed text-slate-200">
            خطوة واحدة تفصلك عن التحكم الكامل في مزارعك، تتبع دورات الإنتاج، وزيادة أرباحك بكفاءة عالية.
          </p>
        </div>
      </div>

    </div>
  );
};

export default RegisterOwner;