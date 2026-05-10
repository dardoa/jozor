import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { TreeSettingsTab } from '../TreeSettingsTab';

const renameTreeMock = vi.fn();
const deleteWholeTreeMock = vi.fn();
const updateTreeRootMock = vi.fn();

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      save: 'Save',
      cancel: 'Cancel',
      unnamedPerson: 'Unnamed Person',
      adminHub: {
        treeSettings: {
          renameTitle: 'Rename Tree',
          renameDescription: 'Update the tree name shown in menus and collaboration surfaces.',
          renamePlaceholder: 'Enter a new tree name',
          renameAction: 'Save Name',
          rootTitle: 'Change Root Person',
          rootDescription: 'Choose which person anchors the main tree view and branch focus.',
          currentRootSuffix: 'Current root',
          infoTitle: 'Tree Info',
          treeIdLabel: 'Tree ID',
          peopleCountLabel: 'People',
          currentRootLabel: 'Current Root',
          dangerTitle: 'Danger Zone',
          dangerDescription: 'Deleting this tree permanently removes {count} people, their relationships, and saved media.',
          deleteAction: 'Delete Tree',
          deleteConfirmTitle: 'This action cannot be undone.',
          deleteConfirmBody: 'The tree, its collaboration state, and all related records will be removed permanently.',
          deleteConfirmPrompt: 'Type DELETE to confirm',
          deleteConfirmPlaceholder: 'DELETE',
          permanentDeleteAction: 'Permanently Delete',
          rootChangeConfirmTitle: 'Change Root Person',
          rootChangeConfirmMessage: 'Changing the root person re-centers the tree around a different branch. Continue?',
          rootChangeConfirmAction: 'Change Root',
        },
      },
    },
  }),
}));

vi.mock('../../../../services/supabaseTreeMutationService', () => ({
  renameTree: (...args: unknown[]) => renameTreeMock(...args),
  deleteWholeTree: (...args: unknown[]) => deleteWholeTreeMock(...args),
  updateTreeRoot: (...args: unknown[]) => updateTreeRootMock(...args),
}));

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: {
    getState: () => ({ user: { supabaseToken: 'token-123' } }),
  },
}));

vi.mock('../../../ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    message,
    confirmText,
    onConfirm,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div>
        <h5>{title}</h5>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null,
}));

const people = [
  { id: 'person-1', firstName: 'Amina', lastName: 'Saleh' },
  { id: 'person-2', firstName: 'Omar', lastName: 'Hassan' },
];

describe('TreeSettingsTab', () => {
  it('renders grouped rename, root, info, and danger sections', () => {
    render(
      <TreeSettingsTab
        treeId="tree-123"
        treeName="Family Archive"
        ownerId="owner-1"
        ownerEmail="owner@example.com"
        people={people as never}
        currentRootId="person-1"
      />
    );

    expect(screen.getByRole('heading', { name: 'Rename Tree' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Change Root Person' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tree Info' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Danger Zone' })).toBeInTheDocument();
    expect(screen.getByText('tree-123')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Amina Saleh')).toBeInTheDocument();
  });

  it('opens the destructive confirmation state separately from the main settings', () => {
    render(
      <TreeSettingsTab
        treeId="tree-123"
        treeName="Family Archive"
        ownerId="owner-1"
        ownerEmail="owner@example.com"
        people={people as never}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Tree' }));

    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByLabelText('Type DELETE to confirm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permanently Delete' })).toBeDisabled();
  });

  it('asks for confirmation before changing the root person', () => {
    render(
      <TreeSettingsTab
        treeId="tree-123"
        treeName="Family Archive"
        ownerId="owner-1"
        ownerEmail="owner@example.com"
        people={people as never}
        currentRootId="person-1"
      />
    );

    fireEvent.change(screen.getByLabelText('Current Root'), {
      target: { value: 'person-2' },
    });

    expect(screen.getByText('Changing the root person re-centers the tree around a different branch. Continue?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Root' })).toBeInTheDocument();
  });
});
