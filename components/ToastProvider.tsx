'use client';

import { Toaster } from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';

const ToastProvider = () => {
  const darkMode = useAppStore((state) => state.darkMode);

  return (
    <Toaster
      position='top-center'
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        // Glassmorphism styling with theme awareness
        style: {
          background: darkMode ? 'rgba(28, 25, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '16px',
          padding: '12px 24px',
          color: darkMode ? '#f5f5f4' : '#1c1917',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: darkMode ? '#1c1917' : '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: darkMode ? '#1c1917' : '#fff',
          },
        },
      }}
    />
  );
};

export default ToastProvider;
