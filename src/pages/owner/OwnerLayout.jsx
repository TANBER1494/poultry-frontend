import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Tractor,
  Users,
  RefreshCcw,
  Wallet,
  Settings,
  LogOut,
  Menu,
  UserCircle,
  Moon,
  Sun,
  Plus,
  Package,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Receipt, 
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import NotificationBell from '../../components/layout/NotificationBell';

const OwnerLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // 🚀 التعديل: استبدال المشرفين بالمبيعات في الوصول السريع (الموبايل)
  const quickNav = [
    { name: 'الرئيسية', href: '/owner/dashboard', icon: LayoutDashboard },
    { name: 'المزارع', href: '/owner/farms', icon: Tractor },
    { name: 'الدورات', href: '/owner/cycles', icon: RefreshCcw },
    { name: 'المبيعات', href: '/owner/sales', icon: Receipt },
  ];

  const allNavItems = [
    { name: 'لوحة القيادة', href: '/owner/dashboard', icon: LayoutDashboard },
    { name: 'إدارة المزارع', href: '/owner/farms', icon: Tractor },
    { name: 'الدورات الإنتاجية', href: '/owner/cycles', icon: RefreshCcw },
    { name: 'المبيعات والفواتير', href: '/owner/sales', icon: Receipt },
    { name: 'التجار والموردين', href: '/owner/merchants', icon: Package },
    { name: 'المركز المالي', href: '/owner/finances', icon: Wallet },
  ];

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row overflow-hidden">
      
      {/* 📱 Mobile Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:hidden z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-500">
            مزرعتي
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <UserCircle className="h-6 w-6" />
          </div>
        </div>
      </header>

      {/* 📱 Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed right-0 top-0 z-50 flex h-full w-4/5 max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900 lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500">
                  مزرعتي
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                <nav className="space-y-1 px-3">
                  {allNavItems.map((item) => {
                    const isActive = location.pathname.includes(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 ${
                            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        {item.name}
                        {isActive && <CheckCircle2 className="mr-auto h-4 w-4 text-emerald-500" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <UserCircle className="h-6 w-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-black text-slate-800 dark:text-white">
                      {user?.name}
                    </p>
                    <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                      المالك / الإدارة
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={toggleTheme}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDarkMode ? 'فاتح' : 'داكن'}
                  </button>
                  <button
                    onClick={logout}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-600 py-2.5 text-sm font-bold transition-colors hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40"
                  >
                    <LogOut className="h-4 w-4" /> خروج
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 💻 Desktop Sidebar */}
      <motion.aside
        animate={{ width: isDesktopSidebarOpen ? '280px' : '88px' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="hidden flex-col border-l border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex z-10 shrink-0"
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {isDesktopSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-500 whitespace-nowrap"
              >
                مزرعتي <span className="text-slate-800 dark:text-white">ERP</span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <nav className="space-y-1.5 px-4">
            {allNavItems.map((item) => {
              const isActive = location.pathname.includes(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center rounded-xl px-3 py-3.5 transition-all group relative overflow-hidden ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-emerald-400'
                  }`}
                  title={!isDesktopSidebarOpen ? item.name : ''}
                >
                  {isActive && (
                    <motion.div layoutId="activeNav" className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-full" />
                  )}
                  <item.icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-500'
                    }`}
                  />
                  <AnimatePresence mode="wait">
                    {isDesktopSidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="mr-3 text-sm font-bold whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className={`flex items-center gap-3 mb-4 ${isDesktopSidebarOpen ? 'px-2' : 'justify-center'}`}>
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <UserCircle className="h-6 w-6" />
            </div>
            <AnimatePresence mode="wait">
              {isDesktopSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="truncate text-sm font-black text-slate-800 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    المالك / المدير العام
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className={`flex ${isDesktopSidebarOpen ? 'gap-2' : 'flex-col gap-2'}`}>
            <button
              onClick={toggleTheme}
              title="تغيير المظهر"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-emerald-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDesktopSidebarOpen && (isDarkMode ? 'فاتح' : 'داكن')}
            </button>
            <button
              onClick={logout}
              title="تسجيل الخروج"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-600 py-2.5 text-sm font-bold transition-colors hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40"
            >
              <LogOut className="h-4 w-4 shrink-0" /> 
              {isDesktopSidebarOpen && 'خروج'}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* 🌟 Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
        
        {/* Desktop Topbar */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/80 sticky top-0 z-10">
           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm">
             نظام إدارة الموارد المؤسسية (ERP)
           </div>
           <div className="flex items-center gap-4">
             <NotificationBell />
           </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar scroll-smooth">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      {/* 📱 Mobile Bottom Navigation (PWA Style) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-slate-200 bg-white/90 backdrop-blur-lg pb-safe dark:border-slate-800 dark:bg-slate-900/90 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        
        {/* Center Prominent ADD Button (FAB) */}
        <div className="relative flex w-1/5 justify-center">
          <Link
            to="/owner/farms"
            title="إضافة مزرعة"
            className="absolute -top-8 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/30 transition-transform hover:scale-105 active:scale-95 dark:bg-emerald-600 dark:shadow-emerald-900/50"
          >
            <Plus className="h-7 w-7" />
          </Link>
        </div>

        {/* Right Nav Items */}
        <div className="flex w-2/5 justify-around">
          {quickNav.slice(2, 4).map((item) => {
            const isActive = location.pathname.includes(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${isActive ? 'fill-emerald-50 dark:fill-emerald-900/20 p-0.5 rounded text-emerald-600 dark:text-emerald-400' : ''}`}
                />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Left Nav Items */}
        <div className="absolute left-0 top-0 flex w-2/5 justify-around h-full">
           {quickNav.slice(0, 2).map((item) => {
            const isActive = location.pathname.includes(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${isActive ? 'fill-emerald-50 dark:fill-emerald-900/20 p-0.5 rounded text-emerald-600 dark:text-emerald-400' : ''}`}
                />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default OwnerLayout;