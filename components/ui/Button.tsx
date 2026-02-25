import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className = '',
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:pointer-events-none disabled:opacity-50';

        const variants = {
            primary: 'bg-[var(--primary-600)] text-[var(--primary-text)] hover:bg-[var(--primary-500)] active:bg-[var(--primary-700)] shadow-sm transition-all',
            secondary:
                'bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
            danger:
                'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
            ghost:
                'hover:bg-stone-100 text-stone-700 dark:text-stone-300 dark:hover:bg-stone-800',
            outline:
                'border border-stone-200 bg-transparent hover:bg-stone-100 text-stone-900 dark:border-stone-800 dark:text-stone-100 dark:hover:bg-stone-800',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2 text-sm',
            lg: 'h-12 px-8 text-base',
            icon: 'h-9 w-9',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {!isLoading && leftIcon && <div className='mr-2'>{leftIcon}</div>}
                {children}
                {!isLoading && rightIcon && <div className='ml-2'>{rightIcon}</div>}
            </button>
        );
    }
);

Button.displayName = 'Button';
