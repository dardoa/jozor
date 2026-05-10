import type React from 'react';

export const BootstrapStatusScreen: React.FC<{
  title: string;
  description: string;
  fullscreen?: boolean;
}> = ({ fullscreen = true }) => {
  // In fullscreen mode, the native splash (#jozor-splash in index.html) covers this.
  if (fullscreen) return null;

  return (
    <div className='flex h-full min-h-[320px] flex-col items-center justify-center bg-[var(--theme-bg)]/60 px-6 py-10'>
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
        className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] animate-jozor-pulse object-contain drop-shadow-2xl"
      />
    </div>
  );
};
