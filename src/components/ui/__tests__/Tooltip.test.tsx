// @ts-nocheck
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the tooltip on keyboard focus and hides it on blur', () => {
    vi.useFakeTimers();

    render(
      <Tooltip content="Helpful details" delay={100}>
        <button type="button">Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });

    fireEvent.focusIn(trigger);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful details');

    fireEvent.blur(trigger);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

