
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types';
import { SmartAvatar } from '../SmartAvatar';

const basePerson: Pick<Person, 'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'photoUrl' | 'parents' | 'children' | 'spouses'> = {
  id: 'person-123',
  firstName: 'Noura',
  lastName: 'Jozor',
  gender: 'female',
  birthDate: '1984-05-01',
  parents: [],
  children: [],
  spouses: [],
};

describe('SmartAvatar', () => {
  it('renders the person image first and falls back to the deterministic SVG on load error', () => {
    render(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/avatar.jpg' }} size={48} className="rounded-full" />);

    const image = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');

    fireEvent.error(image);

    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute('data-age-band', 'adult');
  });

  it('uses the same deterministic background for the same person id', () => {
    const { rerender } = render(<SmartAvatar person={basePerson} size={40} />);
    const firstBackground = screen.getByRole('img', { name: 'Noura Jozor' }).getAttribute('style');

    rerender(<SmartAvatar person={{ ...basePerson, firstName: 'Changed' }} size={40} />);

    expect(screen.getByRole('img', { name: 'Changed Jozor' }).getAttribute('style')).toBe(firstBackground);
  });

  it('resets failure state when photoUrl changes after an image load error', () => {
    const { rerender } = render(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/avatar1.jpg' }} size={48} />);

    const image1 = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image1).toHaveAttribute('src', 'https://example.com/avatar1.jpg');

    // Fail the first image
    fireEvent.error(image1);

    // Fallback is rendered
    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute('data-age-band', 'adult');

    // Change photoUrl
    rerender(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/avatar2.jpg' }} size={48} />);

    // New image should be rendered
    const image2 = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image2).toHaveAttribute('src', 'https://example.com/avatar2.jpg');
  });
});

