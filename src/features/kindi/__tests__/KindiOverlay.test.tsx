import { fireEvent, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { KindiOverlay } from '../components/KindiOverlay';
import type { KindiConfirmation, KindiMessage } from '../types';
import type { Person } from '../../../types';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const baseConfirmation: KindiConfirmation = {
  id: 'confirm-1',
  title: 'Confirm update',
  description: 'Update a person',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  kind: 'UPDATE',
  status: 'pending',
  relatedPeople: [],
  plan: {
    type: 'UPDATE',
    personId: 'p1',
    updates: {
      profession: 'Engineer',
    },
  },
};

const renderOverlay = (confirmation: KindiConfirmation) => {
  const props = {
    isOpen: true,
    draft: '',
    messages: [
      {
        id: 'message-1',
        role: 'assistant',
        text: 'Review this decision',
        confirmation,
      },
    ] satisfies KindiMessage[],
    isThinking: false,
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onFocusPerson: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onCancelDisambiguation: vi.fn(),
    onShowMorePeople: vi.fn(),
    onChooseDisambiguation: vi.fn(),
    hasPendingDecision: true,
  };

  render(<KindiOverlay {...props} />);
  return props;
};

const testPerson = (id: string, firstName: string): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Alqarji',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
});

const testPersonWithRelations = (
  id: string,
  firstName: string,
  overrides: Partial<Person>
): Person => ({
  ...testPerson(id, firstName),
  ...overrides,
});

const renderOverlayWithMessages = (
  messages: KindiMessage[],
  hasPendingDecision = true,
  peopleById: Record<string, Person> = {}
) => {
  const props = {
    isOpen: true,
    draft: '',
    messages,
    peopleById,
    isThinking: false,
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onFocusPerson: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onCancelDisambiguation: vi.fn(),
    onShowMorePeople: vi.fn(),
    onChooseDisambiguation: vi.fn(),
    hasPendingDecision,
  };

  render(<KindiOverlay {...props} />);
  return props;
};

describe('KindiOverlay keyboard confirmation guardrails', () => {
  it('does not confirm a pending decision with plain Enter', () => {
    const props = renderOverlay(baseConfirmation);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('confirms non-delete decisions with Ctrl+Enter', () => {
    const props = renderOverlay(baseConfirmation);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(props.onConfirm).toHaveBeenCalledWith(baseConfirmation);
  });

  it('does not confirm delete decisions with Ctrl+Enter', () => {
    const deleteConfirmation: KindiConfirmation = {
      ...baseConfirmation,
      kind: 'DELETE',
      title: 'Confirm delete',
      description: 'Delete a person',
      confirmLabel: 'Delete',
      plan: {
        type: 'DELETE',
        personId: 'p1',
      },
    };
    const props = renderOverlay(deleteConfirmation);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('cancels the active decision with Escape', () => {
    const props = renderOverlay(baseConfirmation);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onCancel).toHaveBeenCalledWith(baseConfirmation);
  });

  it('cancels the active disambiguation with Escape instead of closing Kindi', () => {
    const props = renderOverlayWithMessages([
      {
        id: 'message-disambiguation',
        role: 'assistant',
        text: 'Which Lina?',
        people: [
          testPerson('p1', 'Lina'),
          testPerson('p2', 'Lina'),
        ],
        disambiguation: {
          promptName: 'Lina',
          routedIntent: {
            kind: 'ACTION',
            query: 'add child for Lina',
            parsedIntents: [],
            targetText: 'Lina',
            summary: 'Add child',
          },
          resultPeople: [],
          status: 'pending',
        },
      },
    ]);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onCancelDisambiguation).toHaveBeenCalledWith('message-disambiguation');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('shows relationship context on disambiguation person cards', () => {
    const father = testPersonWithRelations('father', 'Mahmoud', { gender: 'male' });
    const child = testPersonWithRelations('child', 'Lina', { parents: [father.id] });

    renderOverlayWithMessages([
      {
        id: 'message-disambiguation',
        role: 'assistant',
        text: 'Which Lina?',
        people: [child],
        disambiguation: {
          promptName: 'Lina',
          routedIntent: {
            kind: 'ACTION',
            query: 'add child for Lina',
            parsedIntents: [],
            targetText: 'Lina',
            summary: 'Add child',
          },
          resultPeople: [],
          status: 'pending',
        },
      },
    ], true, { [father.id]: father, [child.id]: child });

    expect(document.body.textContent).toContain('بنت Mahmoud Alqarji');
  });

  it('does not close from the backdrop while a decision is pending', () => {
    const props = renderOverlay(baseConfirmation);
    const backdrop = document.querySelector('[data-testid="kindi-backdrop"]') as HTMLElement;

    fireEvent.click(backdrop);

    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('closes from the backdrop when no decision is pending', () => {
    const props = renderOverlayWithMessages([
      {
        id: 'message-plain',
        role: 'assistant',
        text: 'Ready',
      },
    ], false);
    const backdrop = document.querySelector('[data-testid="kindi-backdrop"]') as HTMLElement;

    fireEvent.click(backdrop);

    expect(props.onClose).toHaveBeenCalledOnce();
  });
});
