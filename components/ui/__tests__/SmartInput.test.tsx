import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmartInput, SmartTextarea } from '../SmartInput';

describe('SmartInput primitives', () => {
  it('applies the shared input class and commits edited values on blur', () => {
    const onCommit = vi.fn();

    render(<SmartInput value="Root" onCommit={onCommit} aria-label="name" />);

    const input = screen.getByRole('textbox', { name: 'name' });
    expect(input.className).toContain('ds-input');

    fireEvent.change(input, { target: { value: 'Updated Root' } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith('Updated Root');
  });

  it('applies the shared input class to textareas', () => {
    render(<SmartTextarea value="Bio" onCommit={vi.fn()} aria-label="bio" />);

    const textarea = screen.getByRole('textbox', { name: 'bio' });
    expect(textarea.className).toContain('ds-input');
  });
});
