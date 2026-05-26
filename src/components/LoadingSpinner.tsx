import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[var(--theme-bg)] animate-in fade-in duration-500'>
    <style>
      {`
        @keyframes jozor-pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .animate-jozor-pulse {
          animation: jozor-pulse 2s ease-in-out infinite;
        }
      `}
    </style>
    <img 
      src="/jozor-icon.svg" 
      alt="Loading..." 
      className="w-[120px] h-[120px] animate-jozor-pulse object-contain"
    />
  </div>
);
