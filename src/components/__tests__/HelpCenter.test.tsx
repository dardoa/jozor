import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

import { helpAr } from '../../utils/translations/ar/help';
import { HELP_TOPICS } from '../../features/help/helpKnowledgeBase';
import { HelpCenter } from '../HelpCenter';

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: { help: helpAr }, language: 'ar' }),
}));

let appStoreState: {
  currentTreeId: string | null;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
};

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof appStoreState) => unknown) => selector(appStoreState),
}));

vi.mock('../info/InfoPageLayout', () => ({
  InfoPageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const LocationProbe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid='location'>{`${location.pathname}${location.search}`}</output>
      <button type='button' onClick={() => navigate('/help?topic=visual-posters')}>
        Navigate to poster help
      </button>
    </>
  );
};

const renderHelpCenter = (entry = '/help') => render(
  <MemoryRouter initialEntries={[entry]}>
    <HelpCenter />
    <LocationProbe />
  </MemoryRouter>
);

describe('HelpCenter', () => {
  beforeEach(() => {
    appStoreState = { currentTreeId: 'tree-1', currentUserRole: 'owner' };
  });

  it('renders the expanded knowledge base and actionable topic steps', () => {
    renderHelpCenter();

    expect(screen.getByText(new RegExp(`${HELP_TOPICS.length} موضوع`))).toBeInTheDocument();
    const addTopic = screen.getByRole('button', { name: /إضافة شخص أو قريب/ });
    expect(addTopic).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(addTopic);

    expect(addTopic).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('حدد الشخص المرتبط بالقريب الجديد.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إضافة شخص' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/tree/tree-1?helpAction=add-person');
  });

  it('filters across localized help content and clears the result', () => {
    renderHelpCenter();

    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'بوستر' } });

    expect(screen.getByRole('button', { name: /إنشاء بوستر عائلي/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /إضافة شخص أو قريب/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }));
    expect(screen.getByRole('button', { name: /إضافة شخص أو قريب/ })).toBeInTheDocument();
  });

  it('filters topics by operational category', () => {
    renderHelpCenter();

    fireEvent.click(screen.getByRole('button', { name: 'الخصوصية والأمان' }));

    expect(screen.getByRole('button', { name: /خصوصية الأحياء والصور/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /إنشاء بوستر عائلي/ })).not.toBeInTheDocument();
  });

  it('opens a deep-linked topic in its category', () => {
    renderHelpCenter('/help?topic=visual-posters');

    const posterTopic = screen.getByRole('button', { name: /إنشاء بوستر عائلي/ });
    expect(posterTopic).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('افتح الخزنة ثم المخرجات البصرية.')).toBeInTheDocument();
  });

  it('resynchronizes category and open topic when the deep link changes in place', () => {
    renderHelpCenter();

    fireEvent.click(screen.getByRole('button', { name: 'الخصوصية والأمان' }));
    expect(screen.queryByRole('button', { name: /إنشاء بوستر عائلي/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Navigate to poster help' }));

    expect(screen.getByRole('button', { name: /إنشاء بوستر عائلي/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps tree selection reachable without an active tree', () => {
    appStoreState = { currentTreeId: null, currentUserRole: null };
    renderHelpCenter();

    fireEvent.click(screen.getByRole('button', { name: /إنشاء شجرة أو فتحها/ }));
    const treeAction = screen.getByRole('button', { name: 'فتح إدارة الشجرة' });
    expect(treeAction).toBeEnabled();

    fireEvent.click(treeAction);
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('disables owner actions when the active role is viewer', () => {
    appStoreState = { currentTreeId: 'tree-1', currentUserRole: 'viewer' };
    renderHelpCenter();

    fireEvent.click(screen.getByRole('button', { name: /دعوة متعاون/ }));
    expect(screen.getByRole('button', { name: 'إدارة الأعضاء' })).toBeDisabled();
    expect(screen.getByText('هذا الإجراء غير متاح لصلاحيتك الحالية.')).toBeInTheDocument();
  });
});
