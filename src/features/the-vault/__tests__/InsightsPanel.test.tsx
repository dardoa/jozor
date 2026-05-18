
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InsightsPanel } from '../components/InsightsPanel';

describe('InsightsPanel', () => {
  it('renders stat cards and launches tools from the Vault', () => {
    const onOpenTool = vi.fn();

    render(
      <InsightsPanel
        treeName="Vault QA Tree"
        healthScore={84}
        stats={{ total: 12, male: 5, female: 6, unknown: 1 }}
        t={{ relationshipCalculator: 'Relationship Calculator' } as any}
        onOpenTool={onOpenTool}
      />
    );

    expect(screen.getByText('Vault QA Tree')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Relationship Calculator/i }));

    expect(onOpenTool).toHaveBeenCalledWith('calculator');
  });
});
