import type React from 'react';

export const BootstrapStatusScreen: React.FC<{
  title: string;
  description: string;
  fullscreen?: boolean;
}> = ({ title, description, fullscreen = true }) => {
  const containerClassName = fullscreen
    ? 'flex min-h-screen items-center justify-center bg-[var(--theme-bg)] px-6 py-10'
    : 'flex h-full min-h-[320px] items-center justify-center bg-[var(--theme-bg)]/60 px-6 py-10';

  return (
    <div className={containerClassName}>
      <div className='flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-[var(--border-main)] bg-[var(--theme-surface)] px-8 py-10 text-center shadow-[var(--shadow-md)]'>
        <div className='h-11 w-11 rounded-full border-[3px] border-[var(--primary-500)]/20 border-t-[var(--primary-600)] animate-spin' />
        <div className='space-y-2'>
          <h2 className='text-lg font-semibold text-[var(--text-main)]'>{title}</h2>
          <p className='text-sm leading-6 text-[var(--text-muted)]'>{description}</p>
        </div>
      </div>
    </div>
  );
};
