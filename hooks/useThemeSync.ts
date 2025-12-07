import { useState, useEffect } from 'react';

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

  // Removed the old initialization useEffect as it's now handled by useState directly.

  return { darkMode, setDarkMode };
};