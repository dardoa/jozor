import { useState, useEffect } from 'react';
import { AppTheme } from '../types';

export const useThemeSync = (currentTheme: AppTheme) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Apply the current app theme class to the document element
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes first to ensure only one is active
    root.classList.remove('theme-modern', 'theme-vintage', 'theme-blueprint');
    root.classList.add(`theme-${currentTheme}`);
  }, [currentTheme]);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setDarkMode(true);
      } else {
        setDarkMode(false);
      }
    }
  }, []); // Empty dependency array for initialization

  return { darkMode, setDarkMode };
};