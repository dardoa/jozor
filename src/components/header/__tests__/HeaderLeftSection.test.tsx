
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { HeaderLeftSection } from '../HeaderLeftSection';
import type { Language } from '../../../types';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      language: 'en',
      appTitle: 'Jozor',
      historyControls: 'History Controls',
      undo: 'Undo',
      redo: 'Redo',
    },
  }),
}));

describe('HeaderLeftSection', () => {
  const baseProps = {
    themeLanguage: {
      language: 'en' as Language,
      setLanguage: vi.fn(),
      darkMode: false,
      setDarkMode: vi.fn(),
    },
    toggleDetailsPanel: vi.fn(),
    historyControls: {
      canUndo: false,
      canRedo: false,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    },
  };

  it('disables the details trigger when no active person is available', () => {
    render(<HeaderLeftSection {...baseProps} detailsPanelOpen={false} hasActivePerson={false} />);

    expect(screen.getByRole('button', { name: 'Select a person to view details' })).toBeDisabled();
  });

  it('uses a details-specific label and toggles when an active person exists', () => {
    render(<HeaderLeftSection {...baseProps} detailsPanelOpen={false} hasActivePerson />);

    const trigger = screen.getByRole('button', { name: 'Open details' });
    fireEvent.click(trigger);

    expect(baseProps.toggleDetailsPanel).toHaveBeenCalledTimes(1);
  });
});
