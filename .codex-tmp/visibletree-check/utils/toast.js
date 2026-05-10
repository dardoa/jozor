import toast from 'react-hot-toast';
export const showSuccess = (message, options) => {
    toast.success(message, options);
};
export const showError = (message, options) => {
    toast.error(message, options);
};
export const showLoading = (message, options) => {
    return toast.loading(message, options);
};
export const dismissToast = (toastId) => {
    toast.dismiss(toastId);
};
export const updateToast = (toastId, message, type, options) => {
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
