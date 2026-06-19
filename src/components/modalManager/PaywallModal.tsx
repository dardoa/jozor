import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckoutEventNames, initializePaddle, type Paddle } from '@paddle/paddle-js';
import { X, Check, Shield, Zap, Users, Sparkles, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../context/TranslationContext';
import { OverlayPrimitive } from '../../context/OverlayContext';
import { useAppStore } from '../../store/useAppStore';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BillingTier = 'free' | 'pro' | 'family';

type PlanFeature = {
  text: string;
  available?: boolean;
  emphasized?: boolean;
};

type PlanCard = {
  tier: BillingTier;
  title: string;
  price: string;
  icon: LucideIcon;
  accent: 'green' | 'purple' | 'yellow';
  badge?: string;
  features: PlanFeature[];
};

const accentClasses = {
  green: {
    border: 'border-green-500/50 bg-[#191a24]/80',
    hover: 'hover:border-green-500/40',
    icon: 'bg-green-500/10 text-green-400',
    check: 'text-green-500',
    current: 'bg-green-500/20 text-green-400 border-green-500/30',
    button: 'bg-green-500/20 text-green-400 border border-green-500/30',
  },
  purple: {
    border: 'border-[#8b5cf6]/60 bg-[#1c142d]/80 shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    hover: 'hover:border-[#8b5cf6]/40',
    icon: 'bg-[#8b5cf6]/10 text-[#a78bfa]',
    check: 'text-purple-400',
    current: 'bg-[#8b5cf6]/20 text-[#a78bfa] border-[#8b5cf6]/30',
    button: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 active:scale-95',
  },
  yellow: {
    border: 'border-yellow-500/50 bg-[#251f14]/80 shadow-[0_0_20px_rgba(234,179,8,0.15)]',
    hover: 'hover:border-yellow-500/40',
    icon: 'bg-yellow-500/10 text-yellow-400',
    check: 'text-yellow-500',
    current: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    button: 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-white shadow-lg shadow-yellow-500/20 active:scale-95',
  },
};

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
  const { language } = useTranslation();
  const user = useAppStore(state => state.user);
  const currentTier = useAppStore(state => state.subscriptionTier);
  const [paddle, setPaddle] = useState<Paddle>();
  const [checkoutLoading, setCheckoutLoading] = useState<BillingTier | null>(null);
  const [portalLoading, setPortalLoading] = useState<'overview' | 'cancel' | 'payment' | null>(null);

  const isRtl = language === 'ar';
  const isRtlRef = useRef(isRtl);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isRtlRef.current = isRtl;
    onCloseRef.current = onClose;
  }, [isRtl, onClose]);

  useEffect(() => {
    let cancelled = false;
    const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

    if (!token) {
      console.error('VITE_PADDLE_CLIENT_TOKEN is not configured');
      return;
    }

    initializePaddle({
      environment,
      token,
      eventCallback: event => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          toast.success(isRtlRef.current ? 'تم الاشتراك بنجاح. جار ترقية حسابك...' : 'Subscription successful! Upgrading your account...');
          onCloseRef.current();
        } else if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
          setCheckoutLoading(null);
        }
      },
    })
      .then(instance => {
        if (!cancelled && instance) setPaddle(instance);
      })
      .catch(error => {
        console.error('Failed to initialize Paddle SDK:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const text = useMemo(() => ({
    title: isRtl ? 'اختر خطة الاشتراك المناسبة لك' : 'Choose Your Subscription Plan',
    subtitle: isRtl
      ? 'استمتع بميزات الذكاء السحابي، وأدوات التعاون، ومساحات التخزين الأكبر لحفظ تاريخ عائلتك.'
      : 'Unlock cloud AI tools, collaborator seats, and expanded storage to preserve your family history.',
    currentPlan: isRtl ? 'خطتك الحالية' : 'Current Plan',
    upgrade: isRtl ? 'ترقية الآن' : 'Upgrade Now',
    freePlan: isRtl ? 'المجانية' : 'Free',
    proPlan: 'Pro',
    familyPlan: isRtl ? 'العائلة' : 'Family',
    popular: isRtl ? 'الأكثر شيوعاً' : 'Popular',
    freePrice: isRtl ? 'مجانية للأبد' : 'Free Forever',
    proPrice: isRtl ? '$9.99 / شهرياً' : '$9.99 / month',
    familyPrice: isRtl ? '$19.99 / شهرياً' : '$19.99 / month',
    loading: isRtl ? 'جار التحميل...' : 'Loading...',
    includedInFamily: isRtl ? 'مشمول في باقة العائلة' : 'Included in family',
    loginRequired: isRtl ? 'يرجى تسجيل الدخول أولاً لإتمام الاشتراك.' : 'Please log in to subscribe.',
    gatewayError: isRtl ? 'تعذر تحميل بوابة الدفع. يرجى المحاولة لاحقاً.' : 'Payment gateway failed to load. Please try again.',
    checkoutError: isRtl ? 'عذراً، فشل فتح بوابة الدفع' : 'Failed to open checkout',
    manageTitle: isRtl ? 'إدارة الاشتراك' : 'Manage subscription',
    manageSubtitle: isRtl
      ? 'راجع باقتك الحالية، أو ترقّ إلى باقة أعلى، أو افتح Paddle للإلغاء وتحديث الدفع.'
      : 'Review your current plan, upgrade when useful, or open Paddle to cancel and update payment details.',
    currentPlanHeading: isRtl ? 'الباقة الحالية' : 'Current plan',
    availableUpgrades: isRtl ? 'الترقيات المتاحة' : 'Available upgrades',
    manageInPaddle: isRtl ? 'إدارة عبر Paddle' : 'Manage in Paddle',
    updatePayment: isRtl ? 'تحديث طريقة الدفع' : 'Update payment method',
    cancelSubscription: isRtl ? 'إلغاء الاشتراك' : 'Cancel subscription',
    portalLoading: isRtl ? 'جاري فتح Paddle...' : 'Opening Paddle...',
    portalUnavailable: isRtl
      ? 'لا يوجد اشتراك Paddle نشط لهذا الحساب. قد تكون الباقة منحة إدارية.'
      : 'No active Paddle subscription was found for this account. This plan may be an admin grant.',
    noUpgrade: isRtl ? 'أنت على أعلى باقة متاحة.' : 'You are already on the highest available plan.',
    portalError: isRtl ? 'تعذر فتح إدارة الاشتراك' : 'Failed to open subscription management',
  }), [isRtl]);

  const plans: PlanCard[] = useMemo(() => [
    {
      tier: 'free',
      title: text.freePlan,
      price: text.freePrice,
      icon: Shield,
      accent: 'green',
      features: [
        { text: isRtl ? 'شجرة عائلية واحدة فقط' : '1 Family Tree only' },
        { text: isRtl ? 'حد أقصى 100 شخص في الشجرة' : 'Max 100 people in the tree' },
        { text: isRtl ? 'التعاون والمشاركة غير متاحين' : 'Collaboration strictly blocked', available: false },
        { text: isRtl ? 'كيندي محلي للفصحى فقط' : 'Kindi AI (Arabic standard, local-only)' },
        { text: isRtl ? 'نمط عرض افتراضي وصور أساسية' : 'Default view mode & basic images' },
      ],
    },
    {
      tier: 'pro',
      title: text.proPlan,
      price: text.proPrice,
      icon: Zap,
      accent: 'purple',
      badge: text.popular,
      features: [
        { text: isRtl ? 'أشجار عائلية غير محدودة' : 'Unlimited Family Trees', emphasized: true },
        { text: isRtl ? 'عدد غير محدود من الأشخاص في الشجرة' : 'Unlimited people in the tree', emphasized: true },
        { text: isRtl ? 'محرر مشارك واحد فقط' : 'Exactly 1 Co-Editor seat', emphasized: true },
        { text: isRtl ? 'كيندي هجين: 30 طلباً سحابياً شهرياً' : 'Hybrid Kindi AI (30 cloud req/mo)' },
        { text: isRtl ? 'تصدير عالي الجودة PDF/SVG و GEDCOM' : 'High-res exports (PDF/SVG) & GEDCOM' },
        { text: isRtl ? 'خريطة هجرة تفاعلية' : 'Interactive Migration Map' },
        { text: isRtl ? 'نسخ احتياطي سحابي إلى Drive بسعة 5 جيجابايت' : 'Cloud Drive backups (5 GB storage)' },
      ],
    },
    {
      tier: 'family',
      title: text.familyPlan,
      price: text.familyPrice,
      icon: Users,
      accent: 'yellow',
      features: [
        { text: isRtl ? 'أشجار عائلية غير محدودة' : 'Unlimited Family Trees' },
        { text: isRtl ? 'عدد غير محدود من الأشخاص في الشجرة' : 'Unlimited people in the tree' },
        { text: isRtl ? 'متعاونون ومحررون غير محدودين' : 'Unlimited Collaborators', emphasized: true },
        { text: isRtl ? 'كيندي سحابي ومحلي غير محدود' : 'Unlimited Cloud & Local Kindi AI', emphasized: true },
        { text: isRtl ? 'نقاشات وملاحظات جماعية' : 'Group discussions & notes' },
        { text: isRtl ? '20 جيجابايت للمستندات والوسائط' : '20 GB Storage for docs & media', emphasized: true },
        { text: isRtl ? 'تصدير عالي الجودة PDF/SVG و GEDCOM' : 'High-res exports (PDF/SVG) & GEDCOM' },
      ],
    },
  ], [isRtl, text]);

  const handleSubscribe = async (tier: 'pro' | 'family') => {
    if (!user) {
      toast.error(text.loginRequired);
      return;
    }

    if (!paddle) {
      toast.error(text.gatewayError);
      return;
    }

    setCheckoutLoading(tier);

    try {
      const token = user.supabaseToken || useAppStore.getState().supabaseAccessToken;
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const { transactionId } = await response.json();

      paddle.Checkout.open({
        transactionId,
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: isRtl ? 'ar' : 'en',
          successUrl: window.location.origin,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Paddle Checkout failed:', error);
      toast.error(`${text.checkoutError}: ${message}`);
      setCheckoutLoading(null);
    }
  };

  const handleOpenPortal = async (action: 'overview' | 'cancel' | 'payment') => {
    if (!user) {
      toast.error(text.loginRequired);
      return;
    }

    setPortalLoading(action);

    try {
      const token = user.supabaseToken || useAppStore.getState().supabaseAccessToken;
      const response = await fetch('/api/billing/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ action }),
      });

      if (response.status === 404) {
        toast.error(text.portalUnavailable);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const { portalUrl } = await response.json();
      if (typeof portalUrl !== 'string' || !portalUrl.startsWith('https://')) {
        throw new Error('Invalid portal URL');
      }

      window.open(portalUrl, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Paddle customer portal failed:', error);
      toast.error(`${text.portalError}: ${message}`);
    } finally {
      setPortalLoading(null);
    }
  };

  const getButtonLabel = (plan: PlanCard) => {
    if (checkoutLoading === plan.tier) return text.loading;
    if (currentTier === plan.tier) return text.currentPlan;
    if (plan.tier === 'free') return text.freePlan;
    if (currentTier === 'family' && plan.tier === 'pro') return text.includedInFamily;
    return text.upgrade;
  };

  const isButtonDisabled = (plan: PlanCard) =>
    plan.tier === 'free' ||
    currentTier === plan.tier ||
    (currentTier === 'family' && plan.tier === 'pro') ||
    checkoutLoading !== null;

  const tierRank: Record<BillingTier, number> = { free: 0, pro: 1, family: 2 };
  const currentPlan = plans.find((plan) => plan.tier === currentTier) ?? plans[0];
  const upgradePlans = plans.filter((plan) => tierRank[plan.tier] > tierRank[currentTier]);
  const hasPaddleActions = currentTier === 'pro' || currentTier === 'family';
  const isBusy = checkoutLoading !== null || portalLoading !== null;
  const CurrentIcon = currentPlan.icon;

  const renderPlanCard = (plan: PlanCard) => {
    const Icon = plan.icon;
    const accent = accentClasses[plan.accent];
    const isCurrent = currentTier === plan.tier;

    return (
      <div
        key={plan.tier}
        className={`relative flex flex-col rounded-xl border p-6 transition-all duration-300 ${
          isCurrent ? accent.border : `border-[#2b2d3c] bg-[#1c1d29]/40 ${accent.hover} hover:-translate-y-1`
        }`}
      >
        {plan.badge && !isCurrent && (
          <span className="absolute -top-3 right-4 rounded bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
            {plan.badge}
          </span>
        )}

        <div className="mb-4 flex items-center gap-3">
          <div className={`rounded-lg p-2 ${accent.icon}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{plan.title}</h3>
            <div className="mt-1 text-xl font-extrabold text-white">{plan.price}</div>
          </div>
        </div>

        <div className="my-4 h-px bg-[#2b2d3c]" />

        <ul className="mb-6 flex-1 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature.text} className={`flex items-start gap-2.5 text-sm ${feature.available === false ? 'text-gray-400' : 'text-gray-300'} ${feature.emphasized ? 'font-semibold' : ''}`}>
              {feature.available === false ? (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <Check className={`mt-0.5 h-4 w-4 shrink-0 ${accent.check}`} />
              )}
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => plan.tier !== 'free' && handleSubscribe(plan.tier)}
          disabled={isButtonDisabled(plan)}
          className={`w-full rounded-lg px-4 py-3 text-center text-sm font-bold transition-all ${
            isCurrent
              ? accent.current
              : plan.tier === 'free' || (currentTier === 'family' && plan.tier === 'pro')
                ? 'cursor-not-allowed bg-gray-800 text-gray-400'
                : accent.button
          }`}
        >
          {getButtonLabel(plan)}
        </button>
      </div>
    );
  };

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="paywall-modal"
      className="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        className="relative z-[calc(var(--z-index-modal)+1)] flex w-full max-w-5xl animate-in flex-col overflow-hidden rounded-2xl border border-[#2b2d3c] bg-[#14151b]/95 shadow-2xl duration-300 zoom-in-95"
        role="dialog"
        aria-modal="true"
        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
      >
        <div className="flex items-center justify-between border-b border-[#2b2d3c] p-6">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Sparkles className="h-6 w-6 animate-pulse text-yellow-500" />
              {text.manageTitle}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{text.manageSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-[#2b2d3c] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6 md:p-8">
          <section className="rounded-2xl border border-[#2b2d3c] bg-[#1c1d29]/60 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">{text.currentPlanHeading}</p>
            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${accentClasses[currentPlan.accent].icon}`}>
                  <CurrentIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{currentPlan.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-300">{currentPlan.price}</p>
                </div>
              </div>

              {hasPaddleActions ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleOpenPortal('overview')}
                    disabled={isBusy}
                    className="rounded-lg border border-[#3b3d51] px-4 py-3 text-sm font-bold text-gray-200 transition hover:bg-[#2b2d3c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {portalLoading === 'overview' ? text.portalLoading : text.manageInPaddle}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleOpenPortal('payment')}
                    disabled={isBusy}
                    className="rounded-lg border border-[#3b3d51] px-4 py-3 text-sm font-bold text-gray-200 transition hover:bg-[#2b2d3c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {portalLoading === 'payment' ? text.portalLoading : text.updatePayment}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleOpenPortal('cancel')}
                    disabled={isBusy}
                    className="rounded-lg border border-red-500/40 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {portalLoading === 'cancel' ? text.portalLoading : text.cancelSubscription}
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-300">{text.availableUpgrades}</h3>
              {upgradePlans.length === 0 ? <p className="text-sm text-gray-400">{text.noUpgrade}</p> : null}
            </div>
            {upgradePlans.length > 0 ? (
              <div className={`grid grid-cols-1 gap-6 ${upgradePlans.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-[minmax(0,24rem)]'}`}>
                {upgradePlans.map(renderPlanCard)}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </OverlayPrimitive>
  );
};

export default PaywallModal;
