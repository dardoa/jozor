import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { Mic, GitMerge, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { AnimatedReveal } from './AnimatedReveal';

export const LandingFeatures: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="relative py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <AnimatedReveal delay={100} className="text-center mb-8 max-w-3xl mx-auto">
          <h2 className="font-headline-md text-4xl md:text-5xl font-black text-[var(--text-main)] mb-6">
            {t.landingPage.featuresTitle}
          </h2>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed opacity-90">
            {t.landingPage.featuresSubtitle}
          </p>
        </AnimatedReveal>
 
        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main Feature: Kindi */}
          <AnimatedReveal delay={200} className="md:col-span-8 group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#f0f4ea] to-[#fdfbf7] dark:from-[#23291e] dark:to-[#1c1917] border border-white/60 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-8 md:p-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(85,107,47,0.15)] hover:-translate-y-1">
            <div className="flex flex-col h-full relative z-10">
              <div className="mb-6 md:mb-8 w-16 h-16 rounded-2xl bg-[#6b8e23]/15 flex items-center justify-center border border-white/40 dark:border-white/10">
                <Mic className="h-8 w-8 text-[#6b8e23] dark:text-[#a3cd39]" />
              </div>
              <h3 className="font-headline-md text-3xl font-black text-[var(--text-main)] mb-4">
                {t.landingPage.kindiTitle}
              </h3>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                {t.landingPage.kindiDesc}
              </p>
            </div>
            {/* Decorative Element */}
            <div className="absolute -bottom-24 -end-24 w-96 h-96 bg-gradient-to-tl from-[#6b8e23]/10 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          </AnimatedReveal>
 
          {/* Feature: Infinite Canvas */}
          <AnimatedReveal delay={300} className="md:col-span-4 group relative overflow-hidden rounded-[2.5rem] glass border border-white/40 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-none p-8 md:p-10 transition-all duration-500 hover:shadow-2xl hover:border-white/60 hover:-translate-y-1">
            <div className="flex flex-col h-full relative z-10">
              <div className="mb-6 md:mb-8 w-16 h-16 rounded-2xl bg-[var(--color-primary-500)]/15 flex items-center justify-center border border-white/40 dark:border-white/10">
                <GitMerge className="h-8 w-8 text-[var(--color-primary-600)]" />
              </div>
              <h3 className="font-headline-md text-3xl font-black text-[var(--text-main)] mb-4">
                {t.landingPage.canvasTitle}
              </h3>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                {t.landingPage.canvasDesc}
              </p>
            </div>
          </AnimatedReveal>
 
          {/* Privacy Feature */}
          <AnimatedReveal delay={400} className="md:col-span-5 group relative overflow-hidden rounded-[2.5rem] glass border border-white/40 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-none p-8 md:p-10 transition-all duration-500 hover:shadow-2xl hover:border-white/60 hover:-translate-y-1">
            <div className="flex flex-col h-full relative z-10">
              <div className="mb-6 md:mb-8 w-16 h-16 rounded-2xl bg-[var(--color-info-500)]/15 flex items-center justify-center border border-white/40 dark:border-white/10">
                <ShieldCheck className="h-8 w-8 text-[var(--color-info-600)]" />
              </div>
              <h3 className="font-headline-md text-3xl font-black text-[var(--text-main)] mb-4">
                {t.landingPage.privacyTitle}
              </h3>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                {t.landingPage.privacyDesc}
              </p>
            </div>
          </AnimatedReveal>
 
          {/* Media Feature */}
          <AnimatedReveal delay={500} className="md:col-span-7 group relative overflow-hidden rounded-[2.5rem] glass border border-white/40 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-none p-8 md:p-10 transition-all duration-500 hover:shadow-2xl hover:border-white/60 hover:-translate-y-1">
            <div className="flex flex-col h-full relative z-10">
              <div className="mb-6 md:mb-8 w-16 h-16 rounded-2xl bg-[var(--border-strong)]/30 flex items-center justify-center border border-white/40 dark:border-white/10">
                <ImageIcon className="h-8 w-8 text-[var(--text-main)]" />
              </div>
              <h3 className="font-headline-md text-3xl font-black text-[var(--text-main)] mb-4">
                {t.landingPage.vaultTitle}
              </h3>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                {t.landingPage.vaultDesc}
              </p>
            </div>
          </AnimatedReveal>
 
        </div>
      </div>
    </section>
  );
};
