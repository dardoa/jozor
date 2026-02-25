import toast, { ToastOptions } from 'react-hot-toast';

export const showSuccess = (message: string, options?: ToastOptions) => {
  toast.success(message, options);
};

export const showError = (message: string, options?: ToastOptions) => {
  toast.error(message, options);
};

export const showLoading = (message: string, options?: ToastOptions) => {
  return toast.loading(message, options);
};

export const dismissToast = (toastId?: string) => {
  toast.dismiss(toastId);
};

export const updateToast = (
  toastId: string,
  message: string,
  type: 'success' | 'error' | 'loading',
  options?: ToastOptions & { duration?: number }
) => {
  switch (type) {
    case 'success':
      toast.success(message, { id: toastId, ...options });
      break;
    case 'error':
      toast.error(message, { id: toastId, ...options });
      break;
    case 'loading':
      toast.loading(message, { id: toastId, ...options });
      break;
  }
};
