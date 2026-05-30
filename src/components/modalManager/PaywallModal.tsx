import React, { useEffect, useState } from 'react';
import { X, Check, Shield, Zap, Users, Sparkles } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { OverlayPrimitive } from '../../context/OverlayContext';
import { toast } from 'sonner';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Paddle?: any;
  }
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
  const { language } = useTranslation();
  const user = useAppStore(state => state.user);
  const currentTier = useAppStore(state => state.subscriptionTier);
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const isRtl = language === 'ar';

  // Load Paddle.js dynamically
  useEffect(() => {
    if (window.Paddle) {
      setPaddleLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Environment.set('sandbox');
        const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'test_token';
        window.Paddle.Initialize({ token });
        setPaddleLoaded(true);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Paddle SDK');
    };
    document.body.appendChild(script);

    return () => {
      // Keep script loaded globally for subsequent uses
    };
  }, []);

  const handleSubscribe = async (tier: 'pro' | 'family') => {
    if (!user) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً لإتمام عملية الاشتراك.' : 'Please log in to subscribe.');
      return;
    }

    if (!paddleLoaded || !window.Paddle) {
      toast.error(isRtl ? 'حدث خطأ في تحميل بوابة الدفع. يرجى المحاولة لاحقاً.' : 'Payment gateway failed to load. Please try again.');
      return;
    }

    const priceId = tier === 'pro'
      ? (import.meta.env.VITE_PADDLE_PRO_PRICE_ID || 'pri_sandbox_pro_123')
      : (import.meta.env.VITE_PADDLE_FAMILY_PRICE_ID || 'pri_sandbox_family_123');

    setCheckoutLoading(tier);

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { userId: user.uid },
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: isRtl ? 'ar' : 'en',
          successUrl: window.location.origin,
        },
        eventCallback: (event: any) => {
          if (event.name === 'checkout.completed') {
            toast.success(isRtl ? 'تم الاشتراك بنجاح! جاري ترقية حسابك...' : 'Subscription successful! Upgrading your account...');
            onClose();
          } else if (event.name === 'checkout.closed') {
            setCheckoutLoading(null);
          }
        }
      });
    } catch (error) {
      console.error('Paddle Checkout failed:', error);
      toast.error(isRtl ? 'عذراً، فشل فتح بوابة الدفع.' : 'Failed to open checkout.');
      setCheckoutLoading(null);
    }
  };

  // Localized texts
  const t = {
    title: isRtl ? 'اختر خطة الاشتراك المناسبة لك' : 'Choose Your Subscription Plan',
    subtitle: isRtl 
      ? 'استمتع بميزات الذكاء الاصطناعي السحابي وأدوات التعاون ومساحات التخزين الأكبر لحفظ تاريخ عائلتك.' 
      : 'Unlock cloud AI tools, collaborator seats, and expanded storage to preserve your family history.',
    currentPlan: isRtl ? 'بقتك الحالية' : 'Current Plan',
    upgrade: isRtl ? 'ترقية الآن' : 'Upgrade Now',
    freePlan: isRtl ? 'المجانية' : 'Free',
    proPlan: isRtl ? 'المحترفين' : 'Pro',
    familyPlan: isRtl ? 'العائلة' : 'Family',
    popular: isRtl ? 'الأكثر شيوعاً' : 'Popular',
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
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="paywall-modal"
      className="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div 
        className="relative z-[calc(var(--z-index-modal)+1)] flex flex-col w-full max-w-5xl rounded-2xl bg-[#14151b]/95 border border-[#2b2d3c] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2b2d3c]">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
              {t.title}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-[#2b2d3c] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Cards Grid */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh]">
          
          {/* FREE CARD */}
          <div className={`relative flex flex-col p-6 rounded-xl border transition-all duration-300 ${
            currentTier === 'free' 
              ? 'border-green-500/50 bg-[#191a24]/80' 
              : 'border-[#2b2d3c] bg-[#1c1d29]/40 hover:border-gray-700 hover:-translate-y-1'
          }`}>
            {currentTier === 'free' && (
              <span className="absolute -top-3 left-4 px-2 py-0.5 text-xs font-semibold rounded bg-green-500/20 text-green-400 border border-green-500/30">
                {t.currentPlan}
              </span>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-500/10 text-gray-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t.freePlan}</h3>
                <div className="text-xl font-extrabold text-white mt-1">{t.pricingFree}</div>
              </div>
            </div>
            <div className="h-px bg-[#2b2d3c] my-4" />
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fTreeLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fPeopleLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-400">
                <span className="text-red-500 shrink-0">❌</span>
                <span>{t.fCollabBlocked}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fAiStandard}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span>{t.fDefaultMode}</span>
              </li>
            </ul>
            <button
              disabled
              className="w-full py-3 px-4 rounded-lg font-bold text-center text-gray-400 bg-gray-800 cursor-not-allowed text-sm"
            >
              {currentTier === 'free' ? t.currentPlan : t.freePlan}
            </button>
          </div>

          {/* PRO CARD */}
          <div className={`relative flex flex-col p-6 rounded-xl border transition-all duration-300 ${
            currentTier === 'pro' 
              ? 'border-[#8b5cf6]/60 bg-[#1c142d]/80 shadow-[0_0_20px_rgba(139,92,246,0.15)]' 
              : 'border-[#2b2d3c] bg-[#1c1d29]/40 hover:border-[#8b5cf6]/40 hover:-translate-y-1'
          }`}>
            <span className="absolute -top-3 right-4 px-2 py-0.5 text-[10px] font-bold tracking-wider rounded uppercase bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
              {t.popular}
            </span>
            {currentTier === 'pro' && (
              <span className="absolute -top-3 left-4 px-2 py-0.5 text-xs font-semibold rounded bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/30">
                {t.currentPlan}
              </span>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#8b5cf6]/10 text-[#a78bfa]">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t.proPlan}</h3>
                <div className="text-xl font-extrabold text-white mt-1">{t.pricingPro}</div>
              </div>
            </div>
            <div className="h-px bg-[#2b2d3c] my-4" />
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-medium">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pTreeLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-medium">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pPeopleLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-[#a78bfa] font-semibold">{t.pCollabSeats}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pAiCloud}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pExports}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-light">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pMigration}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{t.pBackups}</span>
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={currentTier === 'pro' || currentTier === 'family' || checkoutLoading !== null}
              className={`w-full py-3 px-4 rounded-lg font-bold text-center text-sm transition-all ${
                currentTier === 'pro'
                  ? 'bg-[#8b5cf6]/20 text-[#a78bfa] cursor-default border border-[#8b5cf6]/30'
                  : currentTier === 'family'
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 active:scale-95'
              }`}
            >
              {checkoutLoading === 'pro' 
                ? (isRtl ? 'جاري التحميل...' : 'Loading...') 
                : currentTier === 'pro' 
                ? t.currentPlan 
                : currentTier === 'family' 
                ? (isRtl ? 'مشمول في باقتك' : 'Included in family') 
                : t.upgrade
              }
            </button>
          </div>

          {/* FAMILY CARD */}
          <div className={`relative flex flex-col p-6 rounded-xl border transition-all duration-300 ${
            currentTier === 'family' 
              ? 'border-yellow-500/50 bg-[#251f14]/80 shadow-[0_0_20px_rgba(234,179,8,0.15)]' 
              : 'border-[#2b2d3c] bg-[#1c1d29]/40 hover:border-yellow-500/40 hover:-translate-y-1'
          }`}>
            {currentTier === 'family' && (
              <span className="absolute -top-3 left-4 px-2 py-0.5 text-xs font-semibold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                {t.currentPlan}
              </span>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                <Users className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t.familyPlan}</h3>
                <div className="text-xl font-extrabold text-white mt-1">{t.pricingFamily}</div>
              </div>
            </div>
            <div className="h-px bg-[#2b2d3c] my-4" />
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.pTreeLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.pPeopleLimit}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-semibold">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span className="text-yellow-400">{t.famCollab}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span className="text-yellow-400 font-semibold">{t.famAi}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.famDiscussions}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300 font-medium">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.famStorage}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-gray-300">
                <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span>{t.pExports}</span>
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('family')}
              disabled={currentTier === 'family' || checkoutLoading !== null}
              className={`w-full py-3 px-4 rounded-lg font-bold text-center text-sm transition-all ${
                currentTier === 'family'
                  ? 'bg-yellow-500/20 text-yellow-400 cursor-default border border-yellow-500/30'
                  : 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white shadow-lg shadow-yellow-500/20 active:scale-95'
              }`}
            >
              {checkoutLoading === 'family' 
                ? (isRtl ? 'جاري التحميل...' : 'Loading...') 
                : currentTier === 'family' 
                ? t.currentPlan 
                : t.upgrade
              }
            </button>
          </div>

        </div>
      </div>
    </OverlayPrimitive>
  );
};
export default PaywallModal;
