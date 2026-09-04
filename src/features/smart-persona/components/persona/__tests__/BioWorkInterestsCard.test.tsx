import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createPerson } from '../../../../../utils/familyLogic';
import type { TranslationSchema } from '../../../../../utils/translationLoader';
import { BioWorkInterestsCard } from '../BioWorkInterestsCard';

const t = {
  workInterests: 'Work and interests',
  noWorkInterests: 'No work information',
  profession: 'Profession',
  professionPlaceholder: 'Profession',
  residence: 'Residence',
  company: 'Company',
  companyPlaceholder: 'Company',
  interests: 'Interests',
  interestsPlaceholder: 'Interests',
} as unknown as TranslationSchema;

describe('BioWorkInterestsCard', () => {
  it('shows the recorded residence in read-only mode as a focusable diagnostic target', () => {
    const person = { ...createPerson(), id: 'person-1', residence: 'Riyadh' };
    const { container } = render(
      <BioWorkInterestsCard
        person={person}
        isEditing={false}
        hasWorkInterests
        t={t}
        onChange={vi.fn()}
      />
    );

    const target = container.querySelector<HTMLElement>('[data-smart-persona-field="residence"]');
    expect(target).not.toBeNull();
    expect(within(target!).getByRole('textbox')).toHaveValue('Riyadh');
    expect(within(target!).getByRole('textbox')).toBeDisabled();
  });

  it('commits an edited residence only after the user changes and leaves the field', () => {
    const onChange = vi.fn();
    const person = { ...createPerson(), id: 'person-1', residence: '' };
    const { container } = render(
      <BioWorkInterestsCard
        person={person}
        isEditing
        hasWorkInterests={false}
        t={t}
        onChange={onChange}
      />
    );

    const target = container.querySelector<HTMLElement>('[data-smart-persona-field="residence"]');
    const input = within(target!).getByRole('textbox');
    fireEvent.focus(input);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Jeddah' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('residence', 'Jeddah');
    expect(screen.getByText('Residence')).toBeInTheDocument();
  });
});
