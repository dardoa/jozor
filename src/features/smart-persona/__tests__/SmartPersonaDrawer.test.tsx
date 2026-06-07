
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { SmartPersonaDrawer } from '../components/SmartPersonaDrawer';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      profile: 'Profile Details',
      unnamedPerson: 'Unnamed Member',
      aboutTab: 'About',
      linksTab: 'Links',
      galleryTab: 'Gallery',
      readOnly: 'You are viewing this tree in read-only mode.',
      close: 'Close Panel',
      aboutSections: {
        title: 'Persona Insights',
        description: 'AI-assisted biographical data.',
        overview: 'Overview',
        overviewBlurb: 'Life details',
        workBio: 'Work & Bio',
        workBioBlurb: 'Professional history',
        contact: 'Contact Info',
        contactBlurb: 'Reach details',
      },
    },
  }),
}));

vi.mock('../components/persona/PersonaFooter', () => ({
  PersonaFooter: () => <div>PersonaFooterMock</div>,
}));

import type { FamilyActionsProps, Person, SmartPersonaTabId, TreeSettings } from '../../../types';

vi.mock('../components/persona/PersonaTabs', () => ({
  PersonaTabs: ({ setActiveTab, tabs, onClose }: {
    setActiveTab: (tab: SmartPersonaTabId) => void;
    tabs: { id: SmartPersonaTabId; label: string; show: boolean }[];
    onClose: () => void;
  }) => (
    <div>
      <button onClick={onClose}>Close Persona</button>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setActiveTab(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../../components/ui/SmartAvatar', () => ({
  SmartAvatar: () => <div>AvatarMock</div>,
}));

vi.mock('../../../components/ui/Skeleton', () => ({
  Skeleton: () => <div>SkeletonMock</div>,
}));

vi.mock('../components/persona/MediaTab', () => ({
  MediaTab: () => <div>MediaTabMock</div>,
}));

vi.mock('../components/tabs/AboutTab', () => ({
  AboutTab: () => <div>AboutTabMock</div>,
}));

vi.mock('../components/tabs/LinksTab', () => ({
  LinksTab: () => <div>LinksTabMock</div>,
}));

describe('SmartPersonaDrawer', () => {
  it('renders the persona drawer, shows details, and supports tab selection', async () => {
    const handleClose = vi.fn();
    const mockPerson = {
      id: 'p-1',
      firstName: 'Fatima',
      lastName: 'Zahra',
      birthDate: '1975-04-12',
      spouses: [],
      children: [],
      parents: [],
    };

    render(
      <SmartPersonaDrawer
        person={mockPerson as unknown as Person}
        people={{ 'p-1': mockPerson as unknown as Person }}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        isOpen
        onClose={handleClose}
        onOpenModal={vi.fn()}
        familyActions={{} as unknown as FamilyActionsProps}
        settings={{} as unknown as TreeSettings}
        user={null}
      />
    );

    // Persona close triggers
    const closeBtn = screen.getByRole('button', { name: 'Close Persona' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Initial About Tab should render
    expect(await screen.findByText('AboutTabMock')).toBeInTheDocument();

    // Clicking Links tab displays links tab
    const linksTabBtn = screen.getByRole('button', { name: 'Links' });
    fireEvent.click(linksTabBtn);
    expect(await screen.findByText('LinksTabMock')).toBeInTheDocument();
  });
});
