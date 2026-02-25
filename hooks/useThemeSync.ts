import { useState, useEffect } from 'react';

/**
 * Hook to manage application theme (dark/light mode).
 * Persists preference to localStorage and respects system preference.
 */
export const useThemeSync = () => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false; // Safety for server-side rendering
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme === 'dark' || (!savedTheme && prefersDark);
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return { darkMode, setDarkMode };
};
