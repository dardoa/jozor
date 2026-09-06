import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  default: ({
    isOpen,
    onClose,
    onFocusPerson,
    onOpenPersonRecord,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onFocusPerson: (personId: string) => void;
    onOpenPersonRecord?: (personId: string) => void;
  }) => isOpen
    ? (
      <div role='dialog'>
        Kindi opened
        <button type="button" onClick={onClose}>Close Kindi</button>
        <button type="button" onClick={() => {
          onFocusPerson('person-1');
          onClose();
        }}>Focus person</button>
        {onOpenPersonRecord ? (
          <button type="button" onClick={() => {
            onOpenPersonRecord('person-1');
            onClose();
          }}>Open person record</button>
        ) : null}
      </div>
    )
    : null,
}));

describe('KindiSearchTrigger', () => {
  afterEach(() => {
    window.dispatchEvent(new Event('pointerdown'));
    vi.useRealTimers();
  });
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

  it('moves focus to the person drawer after a Kindi result opens that person', async () => {
    const onFocusPerson = vi.fn();
    render(
      <>
        <KindiSearchTrigger people={{}} onFocusPerson={onFocusPerson} />
        <aside id="smart-persona-drawer" tabIndex={-1}>Person details</aside>
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Open Kindi' });
    const personDrawer = screen.getByText('Person details');

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Focus person' }));

    expect(onFocusPerson).toHaveBeenCalledWith('person-1');
    await waitFor(() => expect(personDrawer).toHaveFocus());
    expect(trigger).not.toHaveFocus();
  });

  it('does not steal focus back from a targeted person-record transition', async () => {
    const onOpenPersonRecord = vi.fn();
    render(
      <KindiSearchTrigger
        people={{}}
        onFocusPerson={vi.fn()}
        onOpenPersonRecord={onOpenPersonRecord}
      />
    );
    const trigger = screen.getByRole('button', { name: 'Open Kindi' });

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: 'Open person record' }));

    expect(onOpenPersonRecord).toHaveBeenCalledWith('person-1', undefined, undefined, undefined);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).not.toHaveFocus();
  });

  it('hands focus to a lazy drawer that mounts after the old 160ms retry window', async () => {
    const onFocusPerson = vi.fn();
    const view = render(<KindiSearchTrigger people={{}} onFocusPerson={onFocusPerson} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Kindi' }));
    const result = await screen.findByRole('button', { name: 'Focus person' });
    vi.useFakeTimers();
    fireEvent.click(result);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    view.rerender(<>
      <KindiSearchTrigger people={{}} onFocusPerson={onFocusPerson} />
      <aside id="smart-persona-drawer" tabIndex={-1}>Lazy person details</aside>
    </>);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByText('Lazy person details')).toHaveFocus();
    // A route remount may remove the first focused element before settling.
    view.rerender(<>
      <KindiSearchTrigger people={{}} onFocusPerson={onFocusPerson} />
      <aside key="settled" id="smart-persona-drawer" tabIndex={-1}>Settled person details</aside>
    </>);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByText('Settled person details')).toHaveFocus();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['keyboard', 'other-control'])('cancels a delayed handoff after %s interaction', async interaction => {
    const onFocusPerson = vi.fn();
    const view = render(<>
      <KindiSearchTrigger people={{}} onFocusPerson={onFocusPerson} />
      <button>Another action</button>
    </>);
    fireEvent.click(screen.getByRole('button', { name: 'Open Kindi' }));
    const result = await screen.findByRole('button', { name: 'Focus person' });
    vi.useFakeTimers();
    fireEvent.click(result);
    if (interaction === 'keyboard') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    else screen.getByRole('button', { name: 'Another action' }).focus();
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    view.rerender(<>
      <KindiSearchTrigger people={{}} onFocusPerson={onFocusPerson} />
      <button>Another action</button>
      <aside id="smart-persona-drawer" tabIndex={-1}>Late details</aside>
    </>);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText('Late details')).not.toHaveFocus();
    expect(vi.getTimerCount()).toBe(0);
  });
});
