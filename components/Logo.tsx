import React, { useState } from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  const [imgError, setImgError] = useState(false);

  // إذا حدث خطأ في تحميل ملف SVG الخارجي، نعرض الشعار البرمجي كبديل
  if (imgError) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
        <path d="M12 22v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 13c-2-2-4-3-6-3-2.5 0-4 2-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 13c2-2 4-3 6-3 2.5 0 4 2 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 13c0-3 0-5 0-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="6" cy="15" r="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="15" r="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <img 
      src="/logo.svg" 
      alt="Jozor Logo" 
      className={`object-contain ${className}`}
      onError={() => setImgError(true)}
    />
  );
};