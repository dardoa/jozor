import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../Sidebar';

const setPersonSidebarTabMock = vi.fn();
const setPersonSidebarEditingMock = vi.fn();

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      profile: 'Profile',
      partners: 'Partners',
      biography: 'Biography',
      contact: 'Contact',
      galleryTab: 'Media',
      readOnly: 'Read only',
      editDetails: 'Edit details',
      deletePerson: 'Delete person',
      editFinished: 'Done',
      doneTooltip: 'Done',
      common: { close: 'Close' },
    },
  }),
}));

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: {
    personSidebarTab: 'info';
    setPersonSidebarTab: typeof setPersonSidebarTabMock;
    isPersonSidebarEditing: boolean;
    setPersonSidebarEditing: typeof setPersonSidebarEditingMock;
  }) => unknown) =>
    selector({
      personSidebarTab: 'info',
      setPersonSidebarTab: setPersonSidebarTabMock,
      isPersonSidebarEditing: false,
      setPersonSidebarEditing: setPersonSidebarEditingMock,
    }),
}));

vi.mock('../sidebar/InfoTab', () => ({
  InfoTab: () => <div>Info tab body</div>,
}));
vi.mock('../sidebar/PartnersTab', () => ({
  PartnersTab: () => <div>Partners tab body</div>,
}));
vi.mock('../sidebar/ContactTab', () => ({
  ContactTab: () => <div>Contact tab body</div>,
}));
vi.mock('../sidebar/BioTab', () => ({
  BioTab: () => <div>Bio tab body</div>,
}));
vi.mock('../sidebar/MediaTab', () => ({
  MediaTab: () => <div>Media tab body</div>,
}));

describe('Sidebar', () => {
  it('positions the sidebar below the header on desktop and closes from the tab bar button', () => {
    const onClose = vi.fn();

    render(
      <Sidebar
        person={{ id: 'person-1', firstName: 'Amina', lastName: 'Saleh', spouses: [] } as never}
        people={{}}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        isOpen={true}
        onClose={onClose}
        onOpenModal={vi.fn()}
        familyActions={{} as never}
        settings={{} as never}
        user={null}
      />
    );

    const sidebar = document.getElementById('person-sidebar');
    expect(sidebar).toHaveClass('sm:top-14');
    expect(sidebar).toHaveClass('md:top-16');
    expect(screen.getByText('Info tab body')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a read-only status and disables edit actions when editing is not allowed', () => {
    render(
      <Sidebar
        person={{ id: 'person-1', firstName: 'Amina', lastName: 'Saleh', spouses: [] } as never}
        people={{}}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        isOpen={true}
        onClose={vi.fn()}
        onOpenModal={vi.fn()}
        familyActions={{} as never}
        settings={{} as never}
        user={null}
        canEdit={false}
        isOwner={false}
      />
    );

    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Read only');
    expect(screen.getAllByRole('button', { name: 'Read only' })).toHaveLength(2);
    screen.getAllByRole('button', { name: 'Read only' }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
