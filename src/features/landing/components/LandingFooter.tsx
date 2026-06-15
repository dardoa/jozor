import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../../context/TranslationContext';
import { Logo } from '../../../components/Logo';
import { Lock } from 'lucide-react';
import { AnimatedReveal } from './AnimatedReveal';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[var(--border-soft)]/20 bg-[var(--surface-app)] py-10">
      <AnimatedReveal delay={200} className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-around gap-12 lg:gap-20 mb-10">
          
          {/* Brand Info */}
          <div className="flex flex-col gap-6 max-w-sm">
            <div className="flex items-center gap-3">
              <Logo variant="color" className="h-8 object-contain grayscale opacity-80" />
              <span className="font-headline-md text-2xl font-bold text-[var(--text-main)]">
                {t.landingPage.brandName}
              </span>
            </div>
            <p className="text-[var(--text-main)] opacity-80 text-base leading-relaxed max-w-sm font-medium">
              {t.landingPage.footerDescription}
            </p>
          </div>

          {/* Links - Legal */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[var(--text-main)] text-xl">{t.landingPage.legal}</h4>
            <div className="flex flex-col gap-4 text-[var(--text-main)] opacity-80 font-medium">
              <Link to="/privacy" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.privacyPolicy}</Link>
              <Link to="/terms" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.terms}</Link>
              <Link to="/security" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.security}</Link>
            </div>
          </div>

          {/* Links - Support */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[var(--text-main)] text-xl">{t.landingPage.quickLinks}</h4>
            <div className="flex flex-col gap-4 text-[var(--text-main)] opacity-80 font-medium">
              <Link to="/help" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.helpCenter}</Link>
              <Link to="/about" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.about}</Link>
              <Link to="/contact" className="hover:text-[var(--color-primary-600)] transition-colors">{t.landingPage.contact}</Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--border-soft)]/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-base text-[var(--text-main)] opacity-70 font-semibold">
            {t.landingPage.copyright.replace('{year}', new Date().getFullYear().toString())}
          </p>
          
          <div className="flex items-center gap-2 text-base font-bold text-[var(--text-main)] opacity-70">
            <Lock className="h-5 w-5" />
            <span>{t.landingPage.encryptionBadge}</span>
          </div>
        </div>
      </AnimatedReveal>
    </footer>
  );
};
