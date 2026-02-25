import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    HelpCircle,
    ShieldCheck,
    Map as MapIcon,
    RefreshCw,
    PlayCircle,
    ExternalLink
} from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { Button } from './ui/Button';

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className='border-b border-[var(--border-main)] last:border-0'>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className='w-full py-4 flex items-center justify-between text-start gap-4 hover:text-[var(--primary-600)] transition-colors group'
            >
                <span className='font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-600)]'>{question}</span>
                {isOpen ? <ChevronUp className='w-4 h-4 text-[var(--text-dim)]' /> : <ChevronDown className='w-4 h-4 text-[var(--text-dim)]' />}
            </button>
            {isOpen && (
                <div className='pb-4 text-sm text-[var(--text-dim)] leading-relaxed animate-in slide-in-from-top-2 duration-300'>
                    {answer}
                </div>
            )}
        </div>
    );
};

interface FAQSectionProps {
    title: string;
    icon: React.ReactNode;
    items: { q: string; a: string }[];
}

const FAQSection: React.FC<FAQSectionProps> = ({ title, icon, items }) => (
    <div className='bg-[var(--card-bg)]/50 backdrop-blur-md rounded-2xl border border-[var(--border-main)] p-6 shadow-sm mb-8'>
        <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-[var(--primary-600)]/10 rounded-lg text-[var(--primary-600)]'>
                {icon}
            </div>
            <h3 className='text-lg font-bold text-[var(--text-main)]'>{title}</h3>
        </div>
        <div className='space-y-1'>
            {items.map((item, idx) => (
                <FAQItem key={idx} question={item.q} answer={item.a} />
            ))}
        </div>
    </div>
);

export const HelpCenter: React.FC = () => {
    const { language } = useTranslation();
    const isRTL = language === 'ar';

    const sections = [
        {
            title: isRTL ? 'سلامة البيانات' : 'Data Integrity',
            icon: <ShieldCheck className='w-5 h-5' />,
            items: [
                {
                    q: isRTL ? 'ما هي علامات التحذير الصفراء؟' : 'What are yellow warning badges?',
                    a: isRTL
                        ? 'هذه الشارات تشير إلى وجود أخطاء منطقية في بياناتك (على سبيل المثال، طفل ولد قبل والديه) تم اكتشافها بواسطة محرك فحص الاتساق في الخلفية.'
                        : 'These badges indicate logical errors in your data (e.g., a child born before a parent) detected by our background consistency engine.'
                },
                {
                    q: isRTL ? 'كيف أتحقق من الحالة العامة لشجرتي؟' : 'How do I check my tree\'s overall health?',
                    a: isRTL
                        ? 'قم بزيارة لوحة الإحصائيات (Statistics Dashboard) وابحث عن العداد الخاص بـ "Health Score".'
                        : 'Visit the Statistics Dashboard and look for the "Health Score" gauge.'
                }
            ]
        },
        {
            title: isRTL ? 'الخريطة الجغرافية' : 'GeoMap',
            icon: <MapIcon className='w-5 h-5' />,
            items: [
                {
                    q: isRTL ? 'كيف أتنقل في الخريطة؟' : 'How do I navigate the map?',
                    a: isRTL
                        ? 'استخدم عجلة الماوس للتكبير والتصغير، وانقر مع السحب للتحرك. على الأجهزة المحمولة، استخدم إيماءات القرص والسحب القياسية.'
                        : 'Use your mouse wheel to zoom and click-drag to pan. On mobile, use standard pinch and drag gestures.'
                },
                {
                    q: isRTL ? 'هل يمكنني تصدير خريطتي؟' : 'Can I export my map?',
                    a: isRTL
                        ? 'نعم، استخدم الزر العائم "Snapshot" لالتقاط صورة PNG عالية الدقة للشاشة الحالية مع شعار مخصص.'
                        : 'Yes, use the floating \'Snapshot\' button to capture a high-resolution, branded PNG of your current view.'
                }
            ]
        },
        {
            title: isRTL ? 'الخصوصية' : 'Privacy',
            icon: <HelpCircle className='w-5 h-5' />,
            items: [
                {
                    q: isRTL ? 'كيف أقوم بإخفاء أفراد العائلة الحساسين؟' : 'How do I hide sensitive family members?',
                    a: isRTL
                        ? 'قم بتفعيل خيار "Is Private" في قائمة تحرير حالة الشخص (Status Edit Menu).'
                        : 'Toggle the "Is Private" checkbox in a person\'s status edit menu.'
                },
                {
                    q: isRTL ? 'هل يظهر الأعضاء الخاصون في الخرائط المشتركة؟' : 'Are private members shown on shared maps?',
                    a: isRTL
                        ? 'لا، يتم تجهيل أو استبعاد الأفراد الخاصين تلقائياً من عمليات التصدير والخرائط عالية الدقة.'
                        : 'No, private individuals are automatically anonymized or excluded from exports.'
                }
            ]
        },
        {
            title: isRTL ? 'المزامنة' : 'Sync',
            icon: <RefreshCw className='w-5 h-5' />,
            items: [
                {
                    q: isRTL ? 'هل يتم حفظ بياناتي تلقائياً؟' : 'Does my data save automatically?',
                    a: isRTL
                        ? 'نعم، يستخدم جوزور "Trust Layer" الذي يقوم بمزامنة كل تغيير تلقائياً مع Supabase و Google Drive (إذا تم تهيئته).'
                        : 'Yes, Jozor uses a "Trust Layer" that automatically syncs every change to Supabase and (if configured) your Google Drive.'
                }
            ]
        }
    ];

    return (
        <div className='min-h-screen bg-[var(--theme-bg)] transition-colors duration-500 overflow-y-auto pb-20'>
            {/* Header */}
            <div className='sticky top-0 z-30 bg-[var(--theme-bg)]/80 backdrop-blur-xl border-b border-[var(--border-main)]'>
                <div className='max-w-4xl mx-auto px-6 h-16 flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => window.location.href = '/'}
                            leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                        >
                            {isRTL ? 'العودة للشجرة' : 'Back to Tree'}
                        </Button>
                        <h1 className='text-xl font-bold text-[var(--text-main)]'>
                            {isRTL ? 'مركز المساعدة' : 'Help Center'}
                        </h1>
                    </div>

                    <Button
                        variant='primary'
                        size='sm'
                        onClick={() => {
                            localStorage.removeItem('jozor_onboarding_completed');
                            window.location.href = '/';
                        }}
                        leftIcon={<PlayCircle className='w-4 h-4' />}
                    >
                        {isRTL ? 'إعادة تشغيل الجولة' : 'Restart Interactive Tour'}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className='max-w-4xl mx-auto px-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700'>
                <div className='text-center mb-16'>
                    <h2 className='text-4xl font-black mb-4 text-[var(--text-main)] tracking-tight'>
                        {isRTL ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}
                    </h2>
                    <p className='text-[var(--text-dim)] max-w-xl mx-auto text-lg'>
                        {isRTL
                            ? 'دليلك الشامل لفهم ميزات جوزور 1.1 المتقدمة والحفاظ على تراث عائلتك.'
                            : 'Your comprehensive guide to understanding Jozor 1.1 features and preserving your family legacy.'}
                    </p>
                </div>

                <div className='grid gap-2'>
                    {sections.map((section, idx) => (
                        <FAQSection
                            key={idx}
                            title={section.title}
                            icon={section.icon}
                            items={section.items}
                        />
                    ))}
                </div>

                {/* Support Card */}
                <div className='mt-12 p-8 rounded-3xl bg-gradient-to-br from-[var(--primary-600)]/10 to-transparent border border-[var(--primary-600)]/20 flex flex-col items-center text-center'>
                    <div className='w-16 h-16 bg-[var(--primary-600)]/20 rounded-2xl flex items-center justify-center mb-4'>
                        <ExternalLink className='w-8 h-8 text-[var(--primary-600)]' />
                    </div>
                    <h3 className='text-xl font-bold mb-2'>{isRTL ? 'هل لا تزال بحاجة لمساعدة؟' : 'Still need help?'}</h3>
                    <p className='text-[var(--text-dim)] mb-6 max-w-sm'>
                        {isRTL
                            ? 'فريقنا جاهز للإجابة على جميع استفساراتك التقنية.'
                            : 'Our team is ready to help you with any technical questions you might have.'}
                    </p>
                    <Button variant='outline' onClick={() => window.open('https://jozor.com/contact', '_blank')}>
                        {isRTL ? 'تواصل معنا' : 'Contact Support'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
