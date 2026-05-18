import type React from 'react';

export const BootstrapStatusScreen: React.FC<{
  title: string;
  description: string;
  fullscreen?: boolean;
}> = ({ title, description, fullscreen = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center bg-[var(--theme-bg)] px-6 py-10 ${fullscreen ? 'fixed inset-0 z-[100]' : 'h-full min-h-[320px]'}`}>
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
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        <img 
          src="/jozor-icon.svg" 
          alt="Loading..." 
          className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] animate-jozor-pulse object-contain drop-shadow-2xl"
        />
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">{title}</h1>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
};
