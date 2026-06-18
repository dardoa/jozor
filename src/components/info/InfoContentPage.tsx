import * as React from 'react';
import { Mail } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { InfoPageLayout } from './InfoPageLayout';

interface InfoSection {
  title: string;
  body: string;
}

interface PageTranslation {
  title: string;
  description: string;
  sections?: InfoSection[];
  emailLabel?: string;
  emailAddress?: string;
  buttonText?: string;
}

interface InfoContentPageProps {
  page: 'privacy' | 'terms' | 'security' | 'about' | 'contact';
}

export const InfoContentPage: React.FC<InfoContentPageProps> = ({ page }) => {
  const { t } = useTranslation();

  // Safely extract the translation object for the page
  const translations = t.infoPages;
  const pageData = (translations[page] || {}) as PageTranslation;

  const title = pageData.title || '';
  const description = pageData.description || '';

  if (page === 'contact') {
    const emailAddress = pageData.emailAddress || 'support@jozor.app';
    const emailLabel = pageData.emailLabel || '';
    const buttonText = pageData.buttonText || '';

    return (
      <InfoPageLayout title={title} description={description}>
        <div className="ds-panel rounded-[2.5rem] bg-[var(--surface-app)] border border-[var(--border-soft)]/50 p-8 md:p-12 shadow-[var(--shadow-md)] max-w-xl mx-auto text-center mt-8">
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-[var(--color-primary-500)]/10 flex items-center justify-center border border-[var(--border-soft)]/50">
            <Mail className="h-8 w-8 text-[var(--color-primary-600)]" />
          </div>

          <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">
            {emailLabel}
          </h2>

          <p className="text-xl font-bold text-[var(--color-primary-600)] mb-8 select-all">
            {emailAddress}
          </p>

          <a
            href={`mailto:${emailAddress}`}
            className="inline-flex items-center justify-center px-10 py-4 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-bold rounded-2xl shadow-lg shadow-[var(--color-primary-500)]/20 hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto"
          >
            {buttonText}
          </a>
        </div>
      </InfoPageLayout>
    );
  }

  const sections = pageData.sections || [];

  return (
    <InfoPageLayout title={title} description={description}>
      <div className="flex flex-col gap-8">
        {sections.map((section, idx) => (
          <article
            key={idx}
            className="ds-panel rounded-[2rem] bg-[var(--surface-app)] border border-[var(--border-soft)]/50 p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-300"
          >
            <h2 className="text-xl md:text-2xl font-black text-[var(--text-main)] mb-4 border-s-4 border-[var(--color-primary-500)] ps-4">
              {section.title}
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-medium opacity-90">
              {section.body}
            </p>
          </article>
        ))}
      </div>
    </InfoPageLayout>
  );
};

InfoContentPage.displayName = 'InfoContentPage';
export default InfoContentPage;
