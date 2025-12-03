import React, { useState, memo } from 'react';
import { Loader2 } from 'lucide-react';

interface LoginButtonProps {
    onLogin: () => Promise<void>;
    label: string;
}

export const LoginButton: React.FC<LoginButtonProps> = memo(({ onLogin, label }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        await onLogin();
        setIsLoading(false);
    };

    return (
        <button 
            onClick={handleClick}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.52 12.29C23.52 11.43 23.44 10.61 23.3 9.81H12V14.45H18.45C18.17 15.93 17.31 17.18 16.03 18.04V21.01H19.9C22.16 18.93 23.52 15.86 23.52 12.29Z" fill="#4285F4"/>
                    <path d="M12 24C15.24 24 17.96 22.93 19.9 21.01L16.03 18.04C14.96 18.77 13.59 19.19 12 19.19C8.87 19.19 6.22 17.08 5.28 14.24H1.25V17.37C3.18 21.2 7.23 24 12 24Z" fill="#34A853"/>
                    <path d="M5.28 14.24C5.04 13.51 4.9 12.74 4.9 11.95C4.9 11.16 5.04 10.39 5.28 9.66V6.53H1.25C0.45 8.13 0 9.98 0 11.95C0 13.92 0.45 15.77 1.25 17.37L5.28 14.24Z" fill="#FBBC05"/>
                    <path d="M12 4.75C13.76 4.75 15.34 5.36 16.59 6.55L20.01 3.13C17.96 1.21 15.24 0 12 0C7.23 0 3.18 2.8 1.25 6.63L5.28 9.76C6.22 6.92 8.87 4.75 12 4.75Z" fill="#EA4335"/>
                </svg>
            )}
            <span>{label}</span>
        </button>
    );
});