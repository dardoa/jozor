
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InsightsPanel } from '../components/InsightsPanel';
import { en } from '../../../utils/translations/en';

describe('InsightsPanel', () => {
  it('renders a grouped summary and launches tools from the Vault', () => {
    const onOpenTool = vi.fn();

    render(
      <InsightsPanel
        treeName="Vault QA Tree"
        healthScore={84}
        stats={{ total: 12, male: 5, female: 6, unknown: 1 }}
        t={en}
        onOpenTool={onOpenTool}
      />
    );

    expect(screen.getByText('Vault QA Tree')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Total People')).not.toHaveClass('truncate');
    expect(screen.getByRole('heading', { name: 'Explore the tree' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Check and calculate' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Structural Integrity' })).toHaveValue(84);
    expect(screen.getByText(/Completeness and source coverage are scored separately/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Relationship Calculator/i }));

    expect(onOpenTool).toHaveBeenCalledWith('calculator');
  });

  it('turns the health summary into a direct consistency check action', () => {
    const onOpenTool = vi.fn();

    render(
      <InsightsPanel
        treeName="Needs Review"
        healthScore={46}
        stats={{ total: 3, male: 1, female: 1, unknown: 1 }}
        t={en}
        onOpenTool={onOpenTool}
      />
    );

    expect(screen.getByText('Structural issues detected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open structural integrity review: 46%/i }));
    expect(onOpenTool).toHaveBeenCalledWith('consistency');
  });

  it('clamps invalid health values and keeps tools available for an empty tree', () => {
    render(
      <InsightsPanel
        treeName="Empty"
        healthScore={Number.NaN}
        stats={null}
        t={en}
        onOpenTool={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('The tree is empty.');
    expect(screen.getByRole('button', { name: /Relationship Calculator/i })).toBeEnabled();
  });
});
