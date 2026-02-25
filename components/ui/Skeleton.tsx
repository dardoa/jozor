import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height
}) => {
    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-xl'
    };

    return (
        <div
            className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${variantClasses[variant]} ${className}`}
            style={{
                width: width || (variant === 'circular' ? '40px' : '100%'),
                height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '40px' : '100px')
            }}
        />
    );
};
