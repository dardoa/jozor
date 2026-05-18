import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { Button } from '../../../components/ui/Button';
import { AnimatedReveal } from './AnimatedReveal';

interface LandingHeroProps {
  onLogin: () => void;
  onBrowseGuest: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onLogin, onBrowseGuest }) => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden py-10">
      <style>
        {`
          @keyframes float-mockup {
            0%, 100% { transform: translateY(0) rotate(2deg); }
            50% { transform: translateY(-15px) rotate(1deg); }
          }
          .animate-float-mockup {
            animation: float-mockup 6s ease-in-out infinite;
          }
        `}
      </style>
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -start-40 w-[600px] h-[600px] rounded-full bg-[var(--color-primary-500)]/5 blur-[120px]" />
        <div className="absolute -bottom-40 -end-40 w-[600px] h-[600px] rounded-full bg-[var(--color-accent-500)]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Text Content */}
        <AnimatedReveal delay={100} className="flex flex-col items-start text-start">
          {/* Subtle Badge */}
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] px-6 py-2.5 text-sm font-semibold tracking-wide text-[var(--text-secondary)] shadow-sm backdrop-blur-md">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-400)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary-500)]"></span>
            </span>
            {t.landingPage.badge}
          </div>

          {/* Huge, Breathing Typography */}
          <h1 className="font-headline-md text-6xl md:text-7xl lg:text-[5.5rem] font-black text-[var(--text-main)] leading-[1.1] tracking-tight mb-4">
            {t.landingPage.heroTitleLine1}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600 drop-shadow-sm">
              {t.landingPage.heroTitleLine2}
            </span>
          </h1>

          {/* Relaxed Subtitle */}
          <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed mb-6 opacity-90 max-w-xl">
            {t.landingPage.heroSubtitle}
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button 
              onClick={onLogin} 
              size="lg" 
              className="px-12 py-6 text-xl font-black shadow-xl shadow-[var(--color-primary-500)]/20 hover:scale-105 transition-transform duration-300 rounded-2xl"
            >
              {t.landingPage.startFree}
            </Button>
            
            <Button 
              onClick={onBrowseGuest} 
              variant="outline" 
              size="lg" 
              className="px-10 py-5 text-lg font-bold hover:bg-[var(--surface-hover)] transition-colors duration-300 rounded-2xl border-2"
            >
              {t.landingPage.browseGuest}
            </Button>
          </div>
        </AnimatedReveal>

        {/* Visual Element (Mockup) */}
        <AnimatedReveal delay={300} className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center">
          {/* Glowing Aura Behind Mockup */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary-500)]/10 to-transparent rounded-full blur-3xl opacity-50" />
          
          {/* Mockup Frame (Glassmorphism Tablet) */}
          <div className="relative w-full max-w-[550px] aspect-[4/3] rounded-[2rem] border-[8px] border-[var(--surface-panel)] bg-[var(--theme-bg)] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] drop-shadow-2xl overflow-hidden glass animate-float-mockup hover:animation-paused transition-all duration-700">
            {/* Tablet Header */}
            <div className="absolute top-0 w-full h-10 bg-[var(--surface-panel)]/50 backdrop-blur-md flex items-center px-4 border-b border-[var(--border-soft)] z-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto text-xs font-bold text-[var(--text-secondary)]">{t.landingPage.mockupHeader}</div>
            </div>
            
            {/* Tree Graphic Placeholder */}
            <div className="w-full h-full pt-10 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[var(--theme-bg)] opacity-80">
              <div className="relative flex flex-col items-center">
                 {/* Fake Tree Nodes */}
                 <div className="w-20 h-20 rounded-full border-4 border-amber-500 bg-[var(--surface-panel)] shadow-lg mb-8"></div>
                 <div className="w-px h-8 bg-amber-500/50 absolute top-20"></div>
                 <div className="flex gap-16 mt-8">
                   <div className="relative w-16 h-16 rounded-full border-4 border-[var(--color-primary-500)] bg-[var(--surface-panel)] shadow-lg">
                     <div className="absolute -top-8 left-1/2 w-16 h-px bg-amber-500/50 -translate-x-full"></div>
                     <div className="absolute -top-8 left-1/2 w-px h-8 bg-amber-500/50"></div>
                   </div>
                   <div className="relative w-16 h-16 rounded-full border-4 border-pink-500 bg-[var(--surface-panel)] shadow-lg">
                     <div className="absolute -top-8 right-1/2 w-16 h-px bg-amber-500/50 translate-x-full"></div>
                     <div className="absolute -top-8 left-1/2 w-px h-8 bg-amber-500/50"></div>
                   </div>
                 </div>
                </div>
              </div>
            </div>
        </AnimatedReveal>
      </div>
    </section>
  );
};

LandingHero.displayName = 'LandingHero';
