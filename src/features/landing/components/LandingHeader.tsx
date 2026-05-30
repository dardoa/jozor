import React from 'react';
import { Languages } from 'lucide-react';
import { Logo } from '../../../components/Logo';
import { useTranslation } from '../../../context/TranslationContext';
import { Button } from '../../../components/ui/Button';

interface LandingHeaderProps {
  onLogin: () => void | Promise<void>;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onLogin }) => {
  const { t, language, setLanguage } = useTranslation();

  return (
    <header className="fixed top-0 w-full z-50 transition-all duration-300 bg-[var(--theme-bg)]/80 backdrop-blur-xl border-b border-[var(--border-soft)]/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-24 flex items-center justify-between">
        
        {/* Logo Area */}
        <div className="flex items-center gap-4">
          <Logo variant="color" className="h-10 object-contain" />
          <span className="font-headline-md text-2xl font-bold text-[var(--text-main)] tracking-wide hidden sm:block">
            {t.landingPage.brandName}
          </span>
        </div>

        {/* Navigation - Wide spacing */}
        <nav className="hidden md:flex items-center gap-12 text-[var(--text-secondary)] font-medium text-sm">
          <a href="#" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.navFeatures}</a>
          <a
            href="#pricing"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-[var(--color-primary-600)] transition-colors"
          >
            {t.landingPage.navPricing}
          </a>
          <a href="#" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.navAbout}</a>
          <a href="#" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.navContact}</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
          >
            <Languages className="h-4 w-4" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
          
          <Button 
            onClick={onLogin}
            className="px-8 py-2.5 rounded-xl font-bold shadow-sm"
          >
            {t.landingPage.startNow}
          </Button>
        </div>
        
      </div>
    </header>
  );
};
