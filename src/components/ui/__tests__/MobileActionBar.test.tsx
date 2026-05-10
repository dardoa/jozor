// @ts-nocheck
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileActionBar } from '../MobileActionBar';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      addShort: 'Add',
      appearanceLab: 'Appearance',
      vaultTitle: 'The Vault',
    },
  }),
}));

describe('MobileActionBar', () => {
  const baseProps = {
    onOpenVault: vi.fn(),
    onOpenAppearance: vi.fn(),
    onAddPerson: vi.fn(),
  };

  it('renders exactly the three mobile actions', () => {
    render(<MobileActionBar {...baseProps} canAddPerson />);

    expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'The Vault' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('keeps the add action visible but disabled when creation is blocked', () => {
    render(<MobileActionBar {...baseProps} canAddPerson={false} />);

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('marks the active action with the primary visual state', () => {
    render(<MobileActionBar {...baseProps} activeTab="vault" canAddPerson />);

    const activeButton = screen.getByRole('button', { name: 'The Vault' });
    expect(activeButton.className).toContain('border-[var(--color-accent-500)]');
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });
});

