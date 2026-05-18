import React, { useState, memo } from 'react';
import { useTranslation } from '../context/TranslationContext';

export interface LogoProps {
  className?: string;
  variant?: 'dark' | 'white' | 'color';
}

export const Logo: React.FC<LogoProps> = memo(({ className = '', variant = 'dark' }) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>();

  // إذا حدث خطأ في تحميل ملف SVG الخارجي، نعرض الشعار البرمجي كبديل
  if (imgError) {
    return (
      <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
        <path d='M12 22v-9' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
        <path
          d='M12 13c-2-2-4-3-6-3-2.5 0-4 2-4 5'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
        />
        <path
          d='M12 13c2-2 4-3 6-3 2.5 0 4 2 4 5'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
        />
        <path d='M12 13c0-3 0-5 0-8' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
        <circle cx='12' cy='5' r='3' stroke='currentColor' strokeWidth='2' />
        <circle cx='6' cy='15' r='2' stroke='currentColor' strokeWidth='2' />
        <circle cx='18' cy='15' r='2' stroke='currentColor' strokeWidth='2' />
      </svg>
    );
  }

  const logoSrc = variant === 'white' 
    ? '/logo-bilingual-white.svg' 
    : '/logo-bilingual-dark.svg';

  return (
    <img
      src={logoSrc}
      alt={t.logoAlt || 'شعار جذور - Jozor Logo'}
      className={`object-contain ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) {
          setAspectRatio(`${naturalWidth} / ${naturalHeight}`);
        }
      }}
      onError={() => setImgError(true)}
    />
  );
});
