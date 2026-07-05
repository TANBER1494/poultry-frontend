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
  ShoppingCart,
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

  const quickNav = [
    { name: 'الرئيسية', href: '/owner/dashboard', icon: LayoutDashboard },
    { name: 'المزارع', href: '/owner/farms', icon: Tractor },
    { name: 'الدورات', href: '/owner/cycles', icon: RefreshCcw },
    { name: ' المبيعات', href: '/owner/merchants', icon: Users },
    { name: 'الماليات', href: '/owner/finances', icon: Wallet },
  ];

  const secondaryNav = [
    { name: 'المخازن والأعلاف', href: '/owner/inventory', icon: Package },
    { name: 'الإعدادات', href: '/owner/settings', icon: Settings },
    { name: 'الإشتراكات', href: '/owner/subscriptions', icon: CheckCircle2 },
  ];

  const allNav = [...quickNav, ...secondaryNav];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 transition-colors">
      <div
        className={`flex h-20 shrink-0 items-center border-b border-slate-100 dark:border-slate-800 transition-all duration-300 ${isDesktopSidebarOpen ? 'px-6 justify-start' : 'justify-center px-0'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          {isDesktopSidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xl font-black text-slate-900 dark:text-white"
            >
              Poultry ERP
            </motion.span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pt-6 pb-4 custom-scrollbar">
        <nav className="flex-1 space-y-2 px-3">
          {allNav.map((item) => {
            const isActive = location.pathname.includes(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeMobileMenu}
                title={!isDesktopSidebarOpen ? item.name : ''}
                className={`group flex items-center rounded-xl transition-all duration-200 ${
                  isDesktopSidebarOpen
                    ? 'px-4 py-3.5 gap-3'
                    : 'justify-center p-3.5'
                } ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
                />
                {isDesktopSidebarOpen && (
                  <span className="text-sm font-bold truncate">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            title={!isDesktopSidebarOpen ? 'تسجيل الخروج' : ''}
            className={`group flex w-full items-center rounded-xl text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 ${
              isDesktopSidebarOpen
                ? 'px-4 py-3.5 gap-3'
                : 'justify-center p-3.5'
            }`}
          >
            <LogOut
              className={`h-5 w-5 shrink-0 text-red-500 transition-transform dark:text-red-400 ${isDesktopSidebarOpen ? 'group-hover:-translate-x-1' : ''}`}
            />
            {isDesktopSidebarOpen && (
              <span className="text-sm font-bold truncate">تسجيل الخروج</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 transition-colors pb-16 lg:pb-0">
      <aside
        className={`hidden lg:flex lg:flex-col lg:shrink-0 z-20 transition-all duration-300 ease-in-out ${
          isDesktopSidebarOpen ? 'w-72' : 'w-20'
        }`}
      >
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs lg:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6 lg:px-8 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            <button
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className="hidden lg:flex rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              title={isDesktopSidebarOpen ? 'طي القائمة' : 'توسيع القائمة'}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <NotificationBell />

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 sm:mx-2"></div>

            <Link
              to="/owner/settings"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none rounded-full"
              title="إعدادات الحساب"
            >
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {user?.name || 'مدير النظام'}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  مالك المؤسسة
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <UserCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <div className="flex w-2/5 justify-around">
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
                  className={`h-5 w-5 ${isActive ? 'fill-emerald-50 dark:fill-emerald-900/30' : ''}`}
                />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="relative flex w-1/5 justify-center">
          <Link
            to="/owner/farms"
            title="إضافة مزرعة"
            className="absolute -top-8 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/30 transition-transform hover:scale-105 active:scale-95 dark:bg-emerald-600 dark:shadow-emerald-900/50"
          >
            <Plus className="h-7 w-7" />
          </Link>
        </div>

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
                  className={`h-5 w-5 ${isActive ? 'fill-emerald-50 dark:fill-emerald-900/30' : ''}`}
                />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default OwnerLayout;
