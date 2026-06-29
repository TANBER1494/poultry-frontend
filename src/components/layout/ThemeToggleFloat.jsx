import React, { useContext } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';

const ThemeToggleFloat = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 left-6 z-[9999] p-3 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-amber-400 backdrop-blur-md transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
      aria-label="Toggle Dark Mode"
    >
      {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
    </button>
  );
};

export default ThemeToggleFloat;