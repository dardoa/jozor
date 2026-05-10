import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TranslationProvider } from '../../context/TranslationContext';
import { useUIAndSettingsOrchestrator } from '../useUIAndSettingsOrchestrator';

const mockSetLanguage = vi.hoisted(() => vi.fn());

vi.mock('../../context/TranslationContext', () => {
  return {
    TranslationProvider: ({ children }: any) => <>{children}</>,
    useTranslation: () => ({
      t: { messages: { empty: '' } },
      language: 'en',
      setLanguage: mockSetLanguage,
    }),
  };
});
import { useAppSearchBindings } from '../useAppSearchBindings';
import type { Person } from '../../types';

// Minimal test wrapper component to exercise the hook
const TestComponent: React.FC<{
  people: Record<string, Person>;
}> = ({ people }) => {
  const [focusId, setFocusId] = React.useState<string>('root-1');
  const [presentMode, setPresentMode] = React.useState(false);

  const {
    welcomeScreen,
    themeLanguage,
    viewSettings,
  } = useUIAndSettingsOrchestrator({
    people,
    startNewTree: () => {},
    focusId,
    setFocusId,
    currentUserRole: 'owner',
    setIsPresentMode: setPresentMode,
    onOpenSnapshotHistory: () => {},
  });
  const searchProps = useAppSearchBindings({ people, setFocusId });

  return (
    <div>
      <div data-testid="welcome-visible">{welcomeScreen.showWelcome ? 'yes' : 'no'}</div>
      <button onClick={() => welcomeScreen.setShowWelcome(false)}>Hide Welcome</button>

      <div data-testid="language">{themeLanguage.language}</div>
      <button onClick={() => themeLanguage.setLanguage('ar')}>Set Arabic</button>

      <div data-testid="present-mode">{presentMode ? 'on' : 'off'}</div>
      <button onClick={() => viewSettings.onPresent()}>Enter Present Mode</button>

      <div data-testid="focused-id">{focusId}</div>
      <button onClick={() => searchProps.onFocusPerson('person-2')}>Focus Person 2</button>
    </div>
  );
};

describe('useUIAndSettingsOrchestrator', () => {
  const basePeople: Record<string, Person> = {
    'root-1': {
      id: 'root-1',
      firstName: 'Root',
      lastName: 'Person',
      title: '',
      middleName: '',
      birthName: '',
      nickName: '',
      suffix: '',
      gender: 'male',
      birthDate: '',
      birthPlace: '',
      birthSource: '',
      deathDate: '',
      deathPlace: '',
      deathSource: '',
      isDeceased: false,
      profession: '',
      company: '',
      interests: '',
      bio: '',
      photoUrl: '',
      gallery: [],
      voiceNotes: [],
      sources: [],
      events: [],
      email: '',
      website: '',
      blog: '',
      address: '',
      parents: [],
      spouses: [],
      children: [],
      partnerDetails: {},
    },
    'person-2': {
      id: 'person-2',
      firstName: 'Second',
      lastName: 'Person',
      title: '',
      middleName: '',
      birthName: '',
      nickName: '',
      suffix: '',
      gender: 'female',
      birthDate: '',
      birthPlace: '',
      birthSource: '',
      deathDate: '',
      deathPlace: '',
      deathSource: '',
      isDeceased: false,
      profession: '',
      company: '',
      interests: '',
      bio: '',
      photoUrl: '',
      gallery: [],
      voiceNotes: [],
      sources: [],
      events: [],
      email: '',
      website: '',
      blog: '',
      address: '',
      parents: [],
      spouses: [],
      children: [],
      partnerDetails: {},
    },
  };

  const renderWithProviders = () =>
    render(
      <TranslationProvider>
        <TestComponent people={basePeople} />
      </TranslationProvider>
    );

  it('toggles welcome screen visibility via setShowWelcome', () => {
    renderWithProviders();

    const welcome = screen.getByTestId('welcome-visible');
    expect(welcome.textContent).toBe('yes');

    fireEvent.click(screen.getByText('Hide Welcome'));
    expect(welcome.textContent).toBe('no');
  });

  it('updates language via themeLanguage.setLanguage', () => {
    renderWithProviders();

    fireEvent.click(screen.getByText('Set Arabic'));
    expect(mockSetLanguage).toHaveBeenCalledWith('ar');
  });

  it('enters present mode using viewSettings.onPresent', () => {
    renderWithProviders();

    const present = screen.getByTestId('present-mode');
    expect(present.textContent).toBe('off');

    fireEvent.click(screen.getByText('Enter Present Mode'));
    expect(present.textContent).toBe('on');
  });

  it('focuses a person via searchProps.onFocusPerson', () => {
    renderWithProviders();

    const focused = screen.getByTestId('focused-id');
    expect(focused.textContent).toBe('root-1');

    fireEvent.click(screen.getByText('Focus Person 2'));
    expect(focused.textContent).toBe('person-2');
  });
});
