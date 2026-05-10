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
            'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-transparent font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)] disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50';

        const variants = {
            primary: 'bg-[var(--primary-600)] text-[var(--primary-text)] hover:bg-[var(--primary-500)] active:bg-[var(--primary-700)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
            secondary:
                'bg-[var(--theme-surface)] text-[var(--text-main)] border-[var(--border-main)] hover:bg-[var(--theme-hover)] hover:border-[var(--border-strong)]',
            danger:
                'bg-[var(--danger-600)] text-white hover:bg-[var(--danger-500)] active:brightness-95 shadow-[var(--shadow-sm)]',
            ghost:
                'bg-transparent text-[var(--text-dim)] hover:bg-[var(--theme-hover)] hover:text-[var(--text-main)]',
            outline:
                'border-[var(--border-main)] bg-transparent hover:bg-[var(--theme-hover)] hover:border-[var(--border-strong)] text-[var(--text-main)] shadow-[var(--shadow-sm)]',
        };

        const sizes = {
            sm: 'h-8 px-3 text-[11px]',
            md: 'h-10 px-4 py-2 text-sm',
            lg: 'h-12 px-8 text-[15px]',
            icon: 'h-10 w-10 text-sm',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                aria-busy={isLoading}
                aria-live={isLoading ? 'polite' : 'off'}
                {...props}
            >
                {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                {!isLoading && leftIcon && <span className='shrink-0'>{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className='shrink-0'>{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';
