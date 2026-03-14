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
import { useNavigate } from 'react-router-dom';

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
    const { language, t } = useTranslation();
    const isRTL = language === 'ar';
    const navigate = useNavigate();

    const sections = [
        {
            title: t.help.categories.gettingStarted.title,
            icon: <HelpCircle className='w-5 h-5' />,
            items: t.help.categories.gettingStarted.items
        },
        {
            title: t.help.categories.toolsFeatures.title,
            icon: <MapIcon className='w-5 h-5' />,
            items: t.help.categories.toolsFeatures.items
        },
        {
            title: t.help.categories.privacySharing.title,
            icon: <ShieldCheck className='w-5 h-5' />,
            items: t.help.categories.privacySharing.items
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
                            onClick={() => navigate('/')}
                            leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                        >
                            {t.help.goHome}
                        </Button>
                        <h1 className='text-xl font-bold text-[var(--text-main)]'>
                            {t.help.title}
                        </h1>
                    </div>

                    <Button
                        variant='primary'
                        size='sm'
                        onClick={() => {
                            localStorage.removeItem('jozor_onboarding_completed');
                            navigate('/');
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
                        {t.help.categories.gettingStarted.title}
                    </h2>
                    <p className='text-[var(--text-dim)] max-w-xl mx-auto text-lg'>
                        {t.help.description}
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
                    <h3 className='text-xl font-bold mb-2'>{t.help.contactSupport}</h3>
                    <p className='text-[var(--text-dim)] mb-6 max-w-sm'>
                        {t.help.supportEmail}
                    </p>
                    <Button variant='outline' onClick={() => window.open('https://jozor.com/contact', '_blank')}>
                        {t.help.contactSupport}
                    </Button>
                </div>
            </div>
        </div>
    );
};
