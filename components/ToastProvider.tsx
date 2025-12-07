"use client";

import React from 'react';
import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Define default options
        className: 'dark:bg-stone-700 dark:text-stone-100 dark:border dark:border-stone-600 shadow-lg',
        duration: 3000,
        success: {
          iconTheme: {
            primary: '#10B981', // Emerald 500
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444', // Red 500
            secondary: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#3B82F6', // Blue 500
            secondary: '#fff',
          },
        },
      }}
    />
  );
};

export default ToastProvider;