"use client";

import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string, options?: { id?: string; duration?: number }) => {
  return toast.loading(message, options);
};

export const dismissToast = (toastId?: string) => {
  toast.dismiss(toastId);
};

export const updateToast = (toastId: string, message: string, type: 'success' | 'error' | 'loading', options?: { duration?: number }) => {
  if (type === 'success') {
    toast.success(message, { id: toastId, duration: options?.duration });
  } else if (type === 'error') {
    toast.error(message, { id: toastId, duration: options?.duration });
  } else if (type === 'loading') {
    toast.loading(message, { id: toastId, duration: options?.duration });
  }
};