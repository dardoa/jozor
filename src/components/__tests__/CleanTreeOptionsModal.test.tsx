import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CleanTreeOptionsModal } from '../CleanTreeOptionsModal';

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: {
      cleanTreeOptionsTitle: 'Start a New Family Tree',
      dataLossWarning: 'Current tree data will be replaced.',
      startNewTreeOption: 'Start a Blank Tree',
      importFileOption: 'Import from File',
      confirmDelete: 'Confirm action',
      cleanTreeConfirmPlaceholder: 'Type RESET to continue',
      confirm: 'Confirm',
      cancel: 'Cancel',
      close: 'Close',
      common: { back: 'Back' },
    },
  }),
}));

vi.mock('../../context/OverlayContext', () => ({
  OverlayPrimitive: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: ReactNode;
  }) => isOpen ? <div>{children}</div> : null,
}));

describe('CleanTreeOptionsModal', () => {
  it('requires the confirmation phrase before resetting the current tree', () => {
    const onStartNewTree = vi.fn();
    const onClose = vi.fn();

    render(
      <CleanTreeOptionsModal
        isOpen
        language="en"
        onClose={onClose}
        onStartNewTree={onStartNewTree}
        onTriggerImportFile={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Start a New Family Tree' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start a Blank Tree' }));
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeDisabled();
    expect(onStartNewTree).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Type RESET to continue'), { target: { value: 'RESET' } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    expect(onStartNewTree).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires the same confirmation before opening the replacement-file picker', () => {
    const onTriggerImportFile = vi.fn();

    render(
      <CleanTreeOptionsModal
        isOpen
        language="en"
        onClose={vi.fn()}
        onStartNewTree={vi.fn()}
        onTriggerImportFile={onTriggerImportFile}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import from File' }));
    fireEvent.change(screen.getByLabelText('Type RESET to continue'), { target: { value: 'RESET' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onTriggerImportFile).toHaveBeenCalledTimes(1);
  });
});
