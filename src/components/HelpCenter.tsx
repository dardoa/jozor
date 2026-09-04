import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Compass,
  ExternalLink,
  LifeBuoy,
  LockKeyhole,
  Printer,
  Search,
  Sparkles,
  UserRoundPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useTranslation } from '../context/TranslationContext';
import {
  getLocalizedHelpCategories,
  getLocalizedHelpTopics,
  searchHelpTopics,
  type HelpAudience,
  type HelpCategoryId,
  type LocalizedHelpTopicView,
} from '../features/help/helpKnowledgeBase';
import { useAppStore } from '../store/useAppStore';
import { InfoPageLayout } from './info/InfoPageLayout';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

const CATEGORY_ICONS: Record<HelpCategoryId, React.ComponentType<{ className?: string }>> = {
  'getting-started': Compass,
  'family-records': UserRoundPlus,
  'explore-tree': Sparkles,
  collaboration: Users,
  'publishing-backup': Printer,
  'privacy-security': LockKeyhole,
  troubleshooting: Wrench,
};

interface HelpTopicRowProps {
  topic: LocalizedHelpTopicView;
  isOpen: boolean;
  actionDisabledReason?: string;
  onToggle: () => void;
  onRunAction: () => void;
  text: ReturnType<typeof useTranslation>['t']['help'];
}

const HelpTopicRow: React.FC<HelpTopicRowProps> = ({
  topic,
  isOpen,
  actionDisabledReason,
  onToggle,
  onRunAction,
  text,
}) => {
  const roleLabels: Record<HelpAudience, string> = {
    owner: text.ownerRole,
    editor: text.editorRole,
    viewer: text.viewerRole,
  };

  return (
    <article
      id={`help-topic-${topic.id}`}
      data-help-topic={topic.id}
      className='scroll-mt-24 border-b border-[var(--border-soft)] last:border-b-0'
    >
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`help-topic-panel-${topic.id}`}
        className='group flex w-full items-start justify-between gap-5 py-5 text-start'
      >
        <span className='min-w-0'>
          <span className='block text-base font-black text-[var(--text-main)] transition-colors group-hover:text-[var(--primary-600)]'>
            {topic.title}
          </span>
          <span className='mt-1 block text-sm leading-6 text-[var(--text-dim)]'>{topic.summary}</span>
        </span>
        <span className='mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-muted)] transition group-hover:border-[var(--primary-600)]/30 group-hover:text-[var(--primary-600)]'>
          {isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
        </span>
      </button>

      {isOpen && (
        <div
          id={`help-topic-panel-${topic.id}`}
          className='animate-in fade-in slide-in-from-top-2 pb-6 duration-200'
        >
          <ol className='space-y-3 border-s-2 border-[var(--primary-600)]/20 ps-5'>
            {topic.steps.map((step, index) => (
              <li key={`${topic.id}:${index}`} className='flex gap-3 text-sm leading-6 text-[var(--text-secondary)]'>
                <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-xs font-black text-[var(--primary-600)]'>
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]'>
              <span>{text.audienceLabel}</span>
              {topic.audience.map((role) => (
                <span key={role} className='rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 font-bold text-[var(--text-secondary)]'>
                  {roleLabels[role]}
                </span>
              ))}
            </div>

            {topic.actionId && topic.actionLabel && (
              <div className='text-end'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={Boolean(actionDisabledReason)}
                  onClick={onRunAction}
                  rightIcon={<ArrowUpRight className='h-4 w-4' />}
                >
                  {topic.actionLabel}
                </Button>
                {actionDisabledReason && (
                  <p className='mt-1 max-w-xs text-xs text-[var(--text-muted)]'>{actionDisabledReason}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export const HelpCenter: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const requestedTopicId = searchParams.get('topic');
  const [searchState, setSearchState] = useState({ routeTopicId: requestedTopicId, query: '' });
  const query = searchState.routeTopicId === requestedTopicId ? searchState.query : '';
  const setQuery = (nextQuery: string) => {
    setSearchState({ routeTopicId: requestedTopicId, query: nextQuery });
  };
  const [selectedCategory, setSelectedCategory] = useState<HelpCategoryId | undefined>(() => {
    return getLocalizedHelpTopics(language).find((topic) => topic.id === requestedTopicId)?.categoryId;
  });

  const categories = useMemo(() => getLocalizedHelpCategories(language), [language]);
  const allTopics = useMemo(() => getLocalizedHelpTopics(language), [language]);
  const requestedTopic = allTopics.find((topic) => topic.id === requestedTopicId);
  const openTopicId = requestedTopic?.id ?? null;
  const visibleCategory = requestedTopic?.categoryId ?? selectedCategory;
  const visibleTopics = useMemo(
    () => searchHelpTopics(query, language, visibleCategory),
    [language, query, visibleCategory]
  );

  useEffect(() => {
    if (!openTopicId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`help-topic-${openTopicId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openTopicId, visibleTopics]);

  const toggleTopic = (topicId: string) => {
    const nextTopicId = openTopicId === topicId ? null : topicId;
    const nextParams = new URLSearchParams(searchParams);
    if (nextTopicId) {
      nextParams.set('topic', nextTopicId);
    } else {
      const closedTopic = allTopics.find((topic) => topic.id === topicId);
      if (closedTopic) setSelectedCategory(closedTopic.categoryId);
      nextParams.delete('topic');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const chooseCategory = (categoryId: HelpCategoryId | undefined) => {
    setSelectedCategory(categoryId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('topic');
    setSearchParams(nextParams, { replace: true });
  };

  const runTopicAction = (topic: LocalizedHelpTopicView) => {
    if (!topic.actionId) return;
    if (topic.actionId === 'vault-trees' && !currentTreeId) {
      navigate('/');
      return;
    }
    if (
      !currentTreeId
      || !currentUserRole
      || !topic.audience.includes(currentUserRole)
    ) return;
    navigate(`/tree/${currentTreeId}?helpAction=${encodeURIComponent(topic.actionId)}`);
  };

  const getActionDisabledReason = (topic: LocalizedHelpTopicView): string | undefined => {
    if (!topic.actionId || topic.actionId === 'vault-trees') return undefined;
    if (!currentTreeId) return t.help.requiresTree;
    if (!currentUserRole || !topic.audience.includes(currentUserRole)) {
      return t.help.unavailableForRole;
    }
    return undefined;
  };

  const restartTourAction = (
    <Button
      variant='outline'
      size='sm'
      onClick={() => {
        localStorage.removeItem('jozor_onboarding_completed');
        navigate('/');
      }}
    >
      {t.help.restartTour}
    </Button>
  );

  return (
    <InfoPageLayout title={t.help.title} description={t.help.description} action={restartTourAction}>
      <div className='relative z-10 mx-auto max-w-6xl animate-in fade-in duration-500'>
        <section className='border-b border-[var(--border-soft)] py-5 sm:py-7' aria-label={t.help.title}>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <label className='relative min-w-0 flex-1'>
              <span className='sr-only'>{t.help.searchPlaceholder}</span>
              <Search className='pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]' />
              <input
                type='search'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.help.searchPlaceholder}
                className='h-12 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] pe-11 ps-12 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--primary-600)] focus:ring-2 focus:ring-[var(--primary-600)]/20'
              />
              {query && (
                <button
                  type='button'
                  onClick={() => setQuery('')}
                  className='absolute end-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
                  aria-label={t.help.clearSearch}
                >
                  <X className='h-4 w-4' />
                </button>
              )}
            </label>
            <Button
              variant='primary'
              disabled={!currentTreeId}
              onClick={() => currentTreeId && navigate(`/tree/${currentTreeId}?helpAction=kindi`)}
              leftIcon={<Sparkles className='h-4 w-4' />}
            >
              {t.help.askKindi}
            </Button>
          </div>
        </section>

        <div className='grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]'>
          <aside className='border-b border-[var(--border-soft)] py-4 lg:border-b-0 lg:border-e lg:pe-5 lg:pt-7'>
            <nav className='flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:block lg:space-y-1 lg:overflow-visible' aria-label={t.help.allCategories}>
              <button
                type='button'
                onClick={() => chooseCategory(undefined)}
                aria-current={!visibleCategory ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-bold transition lg:w-full ${
                  !visibleCategory
                    ? 'bg-[var(--primary-600)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
                }`}
              >
                <BookOpen className='h-4 w-4 shrink-0' />
                <span>{t.help.allCategories}</span>
              </button>
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.id];
                const isActive = visibleCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type='button'
                    onClick={() => chooseCategory(category.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-bold transition lg:w-full ${
                      isActive
                        ? 'bg-[var(--primary-600)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Icon className='h-4 w-4 shrink-0' />
                    <span>{category.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className='min-w-0 py-5 lg:ps-8 lg:pt-7'>
            <div className='mb-3 flex items-center justify-between gap-4'>
              <div>
                <h2 className='text-lg font-black text-[var(--text-main)]'>
                  {visibleCategory
                    ? categories.find((category) => category.id === visibleCategory)?.title
                    : t.help.allCategories}
                </h2>
                {visibleCategory && (
                  <p className='mt-1 text-sm text-[var(--text-muted)]'>
                    {categories.find((category) => category.id === visibleCategory)?.description}
                  </p>
                )}
              </div>
              <span className='shrink-0 text-xs font-bold text-[var(--text-muted)]'>{t.help.topicCount(visibleTopics.length)}</span>
            </div>

            {visibleTopics.length ? (
              <div>
                {visibleTopics.map((topic) => (
                  <HelpTopicRow
                    key={topic.id}
                    topic={topic}
                    isOpen={openTopicId === topic.id}
                    actionDisabledReason={getActionDisabledReason(topic)}
                    onToggle={() => toggleTopic(topic.id)}
                    onRunAction={() => runTopicAction(topic)}
                    text={t.help}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CircleHelp className='h-6 w-6' />}
                title={t.help.noResultsTitle}
                description={t.help.noResultsDescription}
                action={(
                  <Button variant='outline' size='sm' onClick={() => { setQuery(''); setSelectedCategory(undefined); }}>
                    {t.help.clearSearch}
                  </Button>
                )}
                className='my-12'
              />
            )}
          </main>
        </div>

        <section className='mt-8 flex flex-col justify-between gap-4 border-t border-[var(--border-soft)] py-8 sm:flex-row sm:items-center'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--primary-600)]'>
              <LifeBuoy className='h-5 w-5' />
            </div>
            <div>
              <h2 className='font-black text-[var(--text-main)]'>{t.help.contactSupport}</h2>
              <p className='mt-1 text-sm text-[var(--text-dim)]'>{t.help.supportEmail}</p>
            </div>
          </div>
          <Button variant='outline' onClick={() => navigate('/contact')} rightIcon={<ExternalLink className='h-4 w-4' />}>
            {t.help.contactSupport}
          </Button>
        </section>
      </div>
    </InfoPageLayout>
  );
};
