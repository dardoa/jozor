import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import { KindiSearchTrigger } from '../components/KindiSearchTrigger';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      kindi: {
        triggerLabel: 'Open Kindi',
        triggerTitle: 'Kindi',
        triggerSubtitle: 'Search and ask',
      },
    },
  }),
}));

vi.mock('../components/KindiOverlayWrapper', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen
    ? <div role='dialog'>Kindi opened<button type="button" onClick={onClose}>Close Kindi</button></div>
    : null,
}));

describe('KindiSearchTrigger', () => {
  it('opens from the Help Center application action event', async () => {
    render(<KindiSearchTrigger people={{}} onFocusPerson={vi.fn()} />);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('jozor:open-kindi'));
    });

    expect(await screen.findByRole('dialog')).toHaveTextContent('Kindi opened');
  });

  it('restores focus to its stable trigger after the overlay closes', async () => {
    render(<KindiSearchTrigger people={{}} onFocusPerson={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Open Kindi' });

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Close Kindi' }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
