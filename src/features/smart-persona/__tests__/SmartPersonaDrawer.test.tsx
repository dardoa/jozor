
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartPersonaDrawer } from '../components/SmartPersonaDrawer';
import { useAppStore } from '../../../store/useAppStore';

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
      personDetailsLabel: 'Person details',
      expandPersonDetails: 'Expand details',
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
  AboutTab: ({
    person,
    isEditing,
    onUpdate,
  }: {
    person: { id: string };
    isEditing: boolean;
    onUpdate: (personId: string, updates: { firstName: string }) => unknown;
  }) => (
    <div>
      AboutTabMock
      <span data-testid="persona-edit-state">{isEditing ? 'editing' : 'viewing'}</span>
      <button type="button" onClick={() => onUpdate(person.id, { firstName: 'Blocked update' })}>
        Attempt person update
      </button>
    </div>
  ),
}));

vi.mock('../components/tabs/LinksTab', () => ({
  LinksTab: ({
    familyActions,
  }: {
    familyActions: FamilyActionsProps;
  }) => (
    <div data-smart-persona-section="relationships">
      <div data-smart-persona-field="parents" tabIndex={-1}>
        <button type="button">Parent action</button>
        <button type="button" onClick={() => familyActions.onAddParent('male')}>
          Attempt relation update
        </button>
      </div>
      LinksTabMock
    </div>
  ),
}));

describe('SmartPersonaDrawer', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({
        smartPersonaTab: 'about',
        smartPersonaTargetSection: null,
        smartPersonaTargetField: null,
        smartPersonaSize: 'closed',
        isSmartPersonaEditing: false,
      });
    });
  });

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

    expect(screen.getByLabelText('Person details')).toBeInTheDocument();

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

  it('focuses the exact requested field target and clears the transient route', async () => {
    const mockPerson = {
      id: 'p-1',
      firstName: 'Fatima',
      lastName: 'Zahra',
      birthDate: '1975-04-12',
      spouses: [],
      children: [],
      parents: [],
    };
    act(() => {
      useAppStore.setState({
        smartPersonaTab: 'links',
        smartPersonaTargetSection: 'relationships',
        smartPersonaTargetField: 'parents',
        smartPersonaSize: 'full',
      });
    });

    render(
      <SmartPersonaDrawer
        person={mockPerson as unknown as Person}
        people={{ 'p-1': mockPerson as unknown as Person }}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        isOpen
        onClose={vi.fn()}
        onOpenModal={vi.fn()}
        familyActions={{} as unknown as FamilyActionsProps}
        settings={{} as unknown as TreeSettings}
        user={null}
        canEdit
      />
    );

    const parentAction = await screen.findByRole('button', { name: 'Parent action' });
    await waitFor(() => expect(parentAction).toHaveFocus());
    expect(useAppStore.getState().smartPersonaTargetSection).toBeNull();
    expect(useAppStore.getState().smartPersonaTargetField).toBeNull();
  });

  it('drops stale edit state and blocks mutations when editor access becomes read-only', async () => {
    const mockPerson = {
      id: 'p-1',
      firstName: 'Fatima',
      lastName: 'Zahra',
      spouses: [],
      children: [],
      parents: [],
    } as unknown as Person;
    const onUpdate = vi.fn(() => ({ success: true }));
    const familyActions: FamilyActionsProps = {
      onAddParent: vi.fn(() => ({ success: true })),
      onAddSpouse: vi.fn(() => ({ success: true })),
      onAddChild: vi.fn(() => ({ success: true })),
      onAddFirstPerson: vi.fn(() => ({ success: true })),
      onRemoveRelationship: vi.fn(() => ({ success: true })),
      onLinkPerson: vi.fn(() => ({ success: true })),
    };
    act(() => {
      useAppStore.setState({
        isSmartPersonaEditing: true,
        smartPersonaSize: 'full',
      });
    });

    const renderDrawer = (canEdit: boolean) => (
      <SmartPersonaDrawer
        person={mockPerson}
        people={{ 'p-1': mockPerson }}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        isOpen
        onClose={vi.fn()}
        onOpenModal={vi.fn()}
        familyActions={familyActions}
        settings={{} as TreeSettings}
        user={null}
        canEdit={canEdit}
      />
    );
    const { rerender } = render(renderDrawer(true));

    expect(screen.getByTestId('persona-edit-state')).toHaveTextContent('editing');
    fireEvent.click(screen.getByRole('button', { name: 'Attempt person update' }));
    expect(onUpdate).toHaveBeenCalledOnce();

    rerender(renderDrawer(false));

    expect(screen.getByTestId('persona-edit-state')).toHaveTextContent('viewing');
    await waitFor(() => expect(useAppStore.getState().isSmartPersonaEditing).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Attempt person update' }));
    expect(onUpdate).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Links' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Attempt relation update' }));
    expect(familyActions.onAddParent).not.toHaveBeenCalled();
  });
});
