import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react'; // Changed icon from Store
import { AuthContext } from '../../context/AuthContext';

const SplashScreen = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only show if user is logged in and hasn't seen it this session
    if (user && !sessionStorage.getItem('poultry_splash_seen')) {
      sessionStorage.setItem('poultry_splash_seen', 'true');
      setShowSplash(true);

      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-emerald-600 dark:bg-emerald-500 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 mb-6">
                <LayoutDashboard className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">
                Poultry ERP
              </h1>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 tracking-widest uppercase">
                نظام إدارة المزارع
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SplashScreen;