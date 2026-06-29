import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
// Note: settingsService will be implemented later in the frontend services architecture
// import settingsService from '../services/settingsService';

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext(null);

const THEME_KEY = 'poultry_theme';

export const ThemeProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  // 1. Immediate initialization from local storage for fast rendering
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem(THEME_KEY) === 'dark';
  });

  // 2. Optimistic update toggle function
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // 3. Watch for changes and apply to DOM and local storage
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // 4. Sync state with backend when changed by a logged-in user
  useEffect(() => {
    if (user) {
      // Check preference recorded in backend to prevent redundant requests
      if (user.is_dark_mode !== isDarkMode) {
        /* TODO: Uncomment this block once settingsService is built
        settingsService.updatePreferences({ is_dark_mode: isDarkMode })
          .catch((err) => console.error('Failed to sync theme with backend:', err));
        */
      }
    }
  }, [isDarkMode, user]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};