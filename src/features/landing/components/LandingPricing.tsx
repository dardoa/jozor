import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { Shield, Zap, Users, Check } from 'lucide-react';
import { AnimatedReveal } from './AnimatedReveal';
import { Button } from '../../../components/ui/Button';

interface LandingPricingProps {
  onLogin: () => void;
}

export const LandingPricing: React.FC<LandingPricingProps> = ({ onLogin }) => {
  const { language } = useTranslation();
  const isRtl = language === 'ar';

  const t = {
    title: isRtl ? 'اختر خطة الاشتراك المناسبة لك' : 'Choose Your Subscription Plan',
    subtitle: isRtl 
      ? 'استمتع بميزات الذكاء الاصطناعي السحابي وأدوات التعاون ومساحات التخزين الأكبر لحفظ تاريخ عائلتك.' 
      : 'Unlock cloud AI tools, collaborator seats, and expanded storage to preserve your family history.',
    pricingFree: isRtl ? 'مجاناً للأبد' : 'Free Forever',
    pricingPro: isRtl ? '$9.99 / شهرياً' : '$9.99 / month',
    pricingFamily: isRtl ? '$19.99 / شهرياً' : '$19.99 / month',
    
    // Free features
    fTreeLimit: isRtl ? 'شجرة عائلية واحدة فقط' : '1 Family Tree only',
    fPeopleLimit: isRtl ? 'حد أقصى 100 شخص في الشجرة' : 'Max 100 people in the tree',
    fCollabBlocked: isRtl ? 'التعاون والمشاركة محجوبة بالكامل' : 'Collaboration strictly blocked',
    fAiStandard: isRtl ? 'مساعد كيندي بالفصحى (محلي فقط)' : 'Kindi AI (Arabic standard, local-only)',
    fDefaultMode: isRtl ? 'نمط العرض الافتراضي وصور أساسية' : 'Default view mode & basic images',
    
    // Pro features
    pTreeLimit: isRtl ? 'أشجار عائلية غير محدودة' : 'Unlimited Family Trees',
    pPeopleLimit: isRtl ? 'أشخاص غير محدودين في الشجرة' : 'Unlimited people in the tree',
    pCollabSeats: isRtl ? 'محرر مشارك واحد فقط (Co-Editor)' : 'Exactly 1 Co-Editor seat',
    pAiCloud: isRtl ? 'مساعد كيندي هجين (30 طلب سحابي/شهر)' : 'Hybrid Kindi AI (30 cloud req/mo)',
    pExports: isRtl ? 'تصدير بجودة عالية (PDF/SVG) و GEDCOM' : 'High-res exports (PDF/SVG) & GEDCOM',
    pMigration: isRtl ? 'خرائط الهجرة (Migration Map)' : 'Interactive Migration Map',
    pBackups: isRtl ? 'نسخ احتياطي سحابي لـ Drive (5 جيجابايت)' : 'Cloud Drive backups (5 GB storage)',

    // Family features
    famCollab: isRtl ? 'متعاونين ومحررين غير محدودين' : 'Unlimited Collaborators',
    famAi: isRtl ? 'مساعد كيندي سحابي غير محدود بالكامل' : 'Unlimited Cloud & Local Kindi AI',
    famDiscussions: isRtl ? 'منتدى نقاشات وملاحظات جماعية' : 'Group discussions & notes',
    famStorage: isRtl ? 'مساحة 20 جيجابايت للمستندات والوسائط' : '20 GB Storage for docs & media',
  };

  return (
    <section id="pricing" className="relative py-16 border-t border-[var(--border-soft)]" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <AnimatedReveal delay={100} className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="font-headline-md text-4xl md:text-5xl font-black text-[var(--text-main)] mb-6">
            {t.title}
          </h2>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed opacity-90">
            {t.subtitle}
          </p>
        </AnimatedReveal>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* FREE CARD */}
          <AnimatedReveal delay={200} className="relative flex flex-col p-8 rounded-[2.5rem] bg-[#1c1d29]/40 border border-[#2b2d3c] hover:border-gray-700 hover:-translate-y-1 transition-all duration-500 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gray-500/10 text-gray-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{isRtl ? 'المجانية' : 'Free'}</h3>
                <div className="text-2xl font-extrabold text-white mt-1">{t.pricingFree}</div>
              </div>
            </div>
            <div className="h-px bg-[#2b2d3c] my-4" />
            <ul className="flex-1 space-y-4 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fTreeLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fPeopleLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-400">
                <span className="text-red-500 shrink-0">❌</span>
                <span>{t.fCollabBlocked}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fAiStandard}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fDefaultMode}</span>
              </li>
            </ul>
            <Button
              onClick={onLogin}
              variant="outline"
              size="lg"
              className="w-full font-bold rounded-2xl"
            >
              {isRtl ? 'ابدأ مجاناً' : 'Get Started'}
            </Button>
          </AnimatedReveal>

          {/* PRO CARD */}
          <AnimatedReveal delay={300} className="relative flex flex-col p-8 rounded-[2.5rem] bg-[#1c1d29]/40 border border-[#2b2d3c] hover:border-[#8b5cf6]/40 hover:-translate-y-1 transition-all duration-500 shadow-xl shadow-purple-500/5">
            <span className="absolute -top-3 right-8 px-3 py-1 text-xs font-bold tracking-wider rounded-full uppercase bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
              {isRtl ? 'الأكثر شيوعاً' : 'Popular'}
            </span>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-[#8b5cf6]/10 text-[#a78bfa]">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{isRtl ? 'المحترفين' : 'Pro'}</h3>
                <div className="text-2xl font-extrabold text-white mt-1">{t.pricingPro}</div>
              </div>
            </div>
            <div className="h-px bg-[#2b2d3c] my-4" />
            <ul className="flex-1 space-y-4 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-medium">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pTreeLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-medium">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pPeopleLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-[#a78bfa] font-semibold">{t.pCollabSeats}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pAiCloud}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pExports}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pMigration}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pBackups}</span>
              </li>
            </ul>
            <Button
              onClick={onLogin}
              size="lg"
              className="w-full font-bold rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              {isRtl ? 'اشترك الآن' : 'Subscribe Now'}
            </Button>
          </AnimatedReveal>

          {/* FAMILY CARD */}
          <AnimatedReveal delay={400} className="relative flex flex-col p-8 rounded-[2.5rem] bg-[#1c1d29]/40 border border-[#2b2d3c] hover:border-yellow-500/40 hover:-translate-y-1 transition-all duration-500 shadow-xl shadow-yellow-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{isRtl ? 'العائلة' : 'Family'}</h3>
                <div className="text-2xl font-extrabold text-white mt-1">{t.pricingFamily}</div>
              </div>
            </div>
            <div className="h-px bg-[#2b2d3c] my-4" />
            <ul className="flex-1 space-y-4 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.pTreeLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.pPeopleLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-semibold">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span className="text-yellow-400">{t.famCollab}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span className="text-yellow-400 font-semibold">{t.famAi}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.famDiscussions}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-medium">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.famStorage}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.pExports}</span>
              </li>
            </ul>
            <Button
              onClick={onLogin}
              size="lg"
              className="w-full font-bold rounded-2xl bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white border-0 shadow-lg shadow-yellow-500/20 active:scale-95 transition-all"
            >
              {isRtl ? 'اشترك الآن' : 'Subscribe Now'}
            </Button>
          </AnimatedReveal>

        </div>
      </div>
    </section>
  );
};
