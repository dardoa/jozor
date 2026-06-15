import * as React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Languages } from 'lucide-react';
import { Logo } from '../Logo';
import { useTranslation } from '../../context/TranslationContext';

interface InfoPageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const InfoPageLayout: React.FC<InfoPageLayoutProps> = ({
  title,
  description,
  children,
}) => {
  const navigate = useNavigate();
  const { language, setLanguage } = useTranslation();
  const isRtl = language === 'ar';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-[var(--theme-bg)] text-[var(--text-main)] font-sans selection:bg-[var(--color-primary-200)] selection:text-[var(--color-primary-900)] relative overflow-x-hidden pb-24"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Premium Decorative Background Blurs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 -start-40 w-[600px] h-[600px] rounded-full bg-[var(--color-primary-500)]/5 blur-[120px]" />
        <div className="absolute bottom-0 -end-40 w-[600px] h-[600px] rounded-full bg-[var(--color-accent-500)]/5 blur-[120px]" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 w-full z-50 bg-[var(--theme-bg)]/80 backdrop-blur-xl border-b border-[var(--border-soft)]/50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors group"
          >
            <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${isRtl ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            <span>{isRtl ? 'الرئيسية' : 'Landing Page'}</span>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Logo variant="color" className="h-8 object-contain" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
            >
              <Languages className="h-4 w-4" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 md:pt-16">
        {/* Page Header */}
        <div className="mb-12 border-b border-[var(--border-soft)]/50 pb-8 text-start">
          <h1 className="font-headline-md text-4xl md:text-5xl font-black text-[var(--text-main)] mb-4 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] opacity-90 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>

        {/* Dynamic Inner Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none text-start">
          {children}
        </div>
      </main>
    </div>
  );
};

InfoPageLayout.displayName = 'InfoPageLayout';
export default InfoPageLayout;
