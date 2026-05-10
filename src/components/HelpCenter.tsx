import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Map as MapIcon,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { useNavigate } from 'react-router-dom';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='border-b border-[var(--border-soft)] last:border-0'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='group flex w-full items-center justify-between gap-4 py-4 text-start transition-colors hover:text-[var(--primary-600)]'
      >
        <span className='font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-600)]'>{question}</span>
        {isOpen ? <ChevronUp className='h-4 w-4 text-[var(--text-dim)]' /> : <ChevronDown className='h-4 w-4 text-[var(--text-dim)]' />}
      </button>
      {isOpen && (
        <div className='animate-in slide-in-from-top-2 pb-4 text-sm leading-relaxed text-[var(--text-dim)] duration-300'>
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
  <div className='ds-panel mb-8 rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-md)]'>
    <div className='mb-4 flex items-center gap-3'>
      <div className='rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--primary-600)]'>
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
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections = [
    {
      title: t.help.categories.gettingStarted.title,
      icon: <HelpCircle className='h-5 w-5' />,
      items: t.help.categories.gettingStarted.items,
    },
    {
      title: t.help.categories.toolsFeatures.title,
      icon: <MapIcon className='h-5 w-5' />,
      items: t.help.categories.toolsFeatures.items,
    },
    {
      title: t.help.categories.privacySharing.title,
      icon: <ShieldCheck className='h-5 w-5' />,
      items: t.help.categories.privacySharing.items,
    },
  ];

  return (
    <div className='min-h-screen overflow-y-auto bg-[var(--surface-app)] pb-20 text-[var(--text-main)] transition-colors duration-500'>
      <div className='pointer-events-none fixed inset-0 overflow-hidden'>
        <div className='absolute top-0 start-[-8rem] h-80 w-80 rounded-full bg-[var(--color-primary-500)]/8 blur-3xl' />
        <div className='absolute bottom-[-6rem] end-[-6rem] h-96 w-96 rounded-full bg-[var(--color-info-500)]/8 blur-3xl' />
      </div>

      <div className='sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--surface-app)]/85 backdrop-blur-xl'>
        <div className='mx-auto flex h-16 max-w-4xl items-center justify-between px-6'>
          <div className='flex items-center gap-4'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => navigate('/')}
              leftIcon={<ArrowLeft className='h-4 w-4 rtl:rotate-180' />}
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
            leftIcon={<PlayCircle className='h-4 w-4' />}
          >
            {t.help.restartTour}
          </Button>
        </div>
      </div>

      <div className='relative z-10 mx-auto max-w-4xl px-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700'>
        <div className='mb-16 text-center'>
          <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)] shadow-[var(--shadow-sm)]'>
            <HelpCircle className='h-4 w-4 text-[var(--primary-600)]' />
            {t.help.title}
          </div>
          <h2 className='mb-4 text-4xl font-black tracking-tight text-[var(--text-main)]'>
            {t.help.title}
          </h2>
          <p className='mx-auto max-w-xl text-lg text-[var(--text-dim)]'>
            {t.help.description}
          </p>
        </div>

        {sections.length === 0 ? (
          <EmptyState
            icon={<HelpCircle className='h-6 w-6' />}
            title={t.help.title}
            description={t.help.description}
            className='mx-auto max-w-xl'
          />
        ) : (
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
        )}

        <div className='ds-panel mt-12 flex flex-col items-center rounded-[var(--radius-2xl)] p-8 text-center shadow-[var(--shadow-md)]'>
          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--primary-600)]'>
            <ExternalLink className='h-8 w-8' />
          </div>
          <h3 className='mb-2 text-xl font-bold text-[var(--text-main)]'>{t.help.contactSupport}</h3>
          <p className='mb-6 max-w-sm text-[var(--text-dim)]'>
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
