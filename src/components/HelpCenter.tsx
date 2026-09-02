import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
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
import type { HelpTopicTranslation } from '../types';

const FAQItem: React.FC<{ item: HelpTopicTranslation }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='border-b border-[var(--border-soft)] last:border-0'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        data-help-topic={item.id}
        data-help-route={item.route}
        data-help-control={item.controlId}
        className='group flex w-full items-center justify-between gap-4 py-4 text-start transition-colors hover:text-[var(--primary-600)]'
      >
        <span className='font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-600)]'>{item.q}</span>
        {isOpen ? <ChevronUp className='h-4 w-4 text-[var(--text-dim)]' /> : <ChevronDown className='h-4 w-4 text-[var(--text-dim)]' />}
      </button>
      {isOpen && (
        <div className='animate-in slide-in-from-top-2 pb-4 text-sm leading-relaxed text-[var(--text-dim)] duration-300'>
          {item.a}
        </div>
      )}
    </div>
  );
};

interface FAQSectionProps {
  title: string;
  icon: React.ReactNode;
  items: HelpTopicTranslation[];
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
      {items.map((item) => (
        <FAQItem key={item.id} item={item} />
      ))}
    </div>
  </div>
);

import { InfoPageLayout } from './info/InfoPageLayout';

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

  const restartTourAction = (
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
  );

  return (
    <InfoPageLayout
      title={t.help.title}
      description={t.help.description}
      action={restartTourAction}
    >
      <div className='relative z-10 mx-auto max-w-4xl pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700'>
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

        <div className='ds-panel mt-12 flex flex-col items-center rounded-[var(--radius-2xl)] p-8 text-center shadow-[var(--shadow-md)] bg-[var(--surface-app)] border border-[var(--border-soft)]/50'>
          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--primary-600)]'>
            <ExternalLink className='h-8 w-8' />
          </div>
          <h3 className='mb-2 text-xl font-bold text-[var(--text-main)]'>{t.help.contactSupport}</h3>
          <p className='mb-6 max-w-sm text-[var(--text-dim)]'>
            {t.help.supportEmail}
          </p>
          <Button variant='outline' onClick={() => navigate('/contact')}>
            {t.help.contactSupport}
          </Button>
        </div>
      </div>
    </InfoPageLayout>
  );
};
