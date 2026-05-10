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
        text: 'rounded-[var(--radius-sm)]',
        circular: 'rounded-full',
        rectangular: 'rounded-[var(--radius-lg)]'
    };

    return (
        <div
            className={`animate-pulse bg-[var(--theme-hover)] ${variantClasses[variant]} ${className}`}
            style={{
                width: width || (variant === 'circular' ? '40px' : '100%'),
                height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '40px' : '100px')
            }}
        />
    );
};
