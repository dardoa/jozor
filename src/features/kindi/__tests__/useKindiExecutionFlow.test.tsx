import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../types/person';
import { useKindiExecutionFlow } from '../hooks/useKindiExecutionFlow';
import { getKindiStrings } from '../logic/kindiLocales';
import { canKindiMutateTree, type KindiTreeRole } from '../logic/kindiPermissions';
import type { KindiConfirmation } from '../types';

const treeActionMocks = vi.hoisted(() => ({
  addChild: vi.fn(),
  addParent: vi.fn(),
  addSpouse: vi.fn(),
  updatePerson: vi.fn(),
  deletePerson: vi.fn(),
}));

const appState = vi.hoisted(() => ({
  focusId: 'person-1',
  people: {} as Record<string, Person>,
  peopleVersion: 1,
  past: [] as Record<string, Person>[],
  future: [] as Record<string, Person>[],
}));

const logKindiLearningEventMock = vi.hoisted(() => vi.fn());
const logKindiSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/tree/useTreeActions', () => ({
  useTreeActions: () => treeActionMocks,
}));

vi.mock('../../../store/useAppStore', () => {
  const useAppStore = (selector: (store: typeof appState) => unknown) => selector(appState);
  useAppStore.getState = () => appState;
  return { useAppStore };
});

vi.mock('../services/kindiLearningService', () => ({
  logKindiLearningEvent: logKindiLearningEventMock,
  logKindiSuccess: logKindiSuccessMock,
}));

const person = (id: string, firstName: string): Person => ({
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

const updateConfirmation = (
  overrides: Partial<KindiConfirmation> = {}
): KindiConfirmation => ({
  id: 'confirmation-1',
  interactionId: 'interaction-1',
  title: 'Review update',
  description: 'Update a field through the official action',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  kind: 'UPDATE',
  status: 'pending',
  plan: {
    type: 'UPDATE',
    personId: 'person-1',
    updates: { birthDate: '1990' },
  },
  ...overrides,
});

const createHarness = ({
  currentUserRole = 'owner',
  currentTreeId = 'cloud-tree-1',
}: {
  currentUserRole?: KindiTreeRole;
  currentTreeId?: string | null;
} = {}) => {
  const addAssistantMessage = vi.fn(() => 'assistant-message-1');
  const setConfirmationStatus = vi.fn();
  const hook = renderHook(() => useKindiExecutionFlow({
    currentUserRole,
    currentTreeId,
    language: 'en',
    addAssistantMessage,
    setConfirmationStatus,
  }));

  return { ...hook, addAssistantMessage, setConfirmationStatus };
};

describe('useKindiExecutionFlow', () => {
  beforeEach(() => {
    Object.values(treeActionMocks).forEach((mock) => mock.mockReset());
    treeActionMocks.addChild.mockResolvedValue({ success: true });
    treeActionMocks.addParent.mockResolvedValue({ success: true });
    treeActionMocks.addSpouse.mockResolvedValue({ success: true });
    treeActionMocks.updatePerson.mockResolvedValue({ success: true });
    treeActionMocks.deletePerson.mockResolvedValue({ success: true });
    logKindiLearningEventMock.mockReset();
    logKindiSuccessMock.mockReset();
    appState.focusId = 'person-1';
    appState.people = { 'person-1': person('person-1', 'Lina') };
    appState.peopleVersion = 1;
    appState.past = [];
    appState.future = [];
  });

  it('distinguishes editable local trees from unresolved cloud roles', () => {
    expect(canKindiMutateTree('owner', 'cloud-tree-1')).toBe(true);
    expect(canKindiMutateTree('editor', 'cloud-tree-1')).toBe(true);
    expect(canKindiMutateTree('viewer', null)).toBe(false);
    expect(canKindiMutateTree(null, null)).toBe(true);
    expect(canKindiMutateTree(undefined, null)).toBe(true);
    expect(canKindiMutateTree(null, 'cloud-tree-1')).toBe(false);
    expect(canKindiMutateTree(undefined, 'cloud-tree-1')).toBe(false);
  });

  it('blocks an unresolved cloud role before invoking any mutation', async () => {
    const { result, addAssistantMessage, setConfirmationStatus } = createHarness({
      currentUserRole: null,
      currentTreeId: 'cloud-tree-1',
    });

    await act(async () => {
      await result.current.confirm(updateConfirmation());
    });

    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
    expect(setConfirmationStatus).toHaveBeenNthCalledWith(1, 'confirmation-1', 'processing', undefined);
    expect(setConfirmationStatus).toHaveBeenNthCalledWith(
      2,
      'confirmation-1',
      'failed',
      getKindiStrings('en').execution.readOnlyError
    );
    expect(addAssistantMessage).toHaveBeenCalledWith({
      text: getKindiStrings('en').execution.readOnlyError,
    });
    await vi.waitFor(() => {
      expect(logKindiLearningEventMock).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'confirmation_failed',
        failureReason: 'PERMISSION_DENIED',
        interactionId: 'interaction-1',
      }));
    });
  });

  it('keeps null-role local mode editable', async () => {
    const { result, setConfirmationStatus } = createHarness({
      currentUserRole: null,
      currentTreeId: null,
    });

    await act(async () => {
      await result.current.confirm(updateConfirmation());
    });

    expect(treeActionMocks.updatePerson).toHaveBeenCalledOnce();
    expect(setConfirmationStatus).toHaveBeenLastCalledWith('confirmation-1', 'confirmed', undefined);
  });

  it('executes a rapidly repeated confirmation only once', async () => {
    let releaseMutation: ((result: { success: boolean }) => void) | undefined;
    treeActionMocks.updatePerson.mockImplementationOnce(() => new Promise((resolve) => {
      releaseMutation = resolve;
    }));
    const { result, setConfirmationStatus } = createHarness();
    const confirmation = updateConfirmation();
    let firstConfirmation: Promise<void> | undefined;
    let repeatedConfirmation: Promise<void> | undefined;

    act(() => {
      firstConfirmation = result.current.confirm(confirmation);
      repeatedConfirmation = result.current.confirm(confirmation);
    });

    expect(treeActionMocks.updatePerson).toHaveBeenCalledOnce();
    expect(setConfirmationStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseMutation?.({ success: true });
      await Promise.all([firstConfirmation, repeatedConfirmation]);
    });

    expect(treeActionMocks.updatePerson).toHaveBeenCalledOnce();
    expect(setConfirmationStatus).toHaveBeenLastCalledWith('confirmation-1', 'confirmed', undefined);
  });

  it('contains thrown mutation errors and releases the in-flight guard', async () => {
    const rawError = 'private-upstream-error-sentinel';
    treeActionMocks.updatePerson.mockRejectedValueOnce(new Error(rawError));
    const { result, addAssistantMessage, setConfirmationStatus } = createHarness();
    const confirmation = updateConfirmation();

    await act(async () => {
      await result.current.confirm(confirmation);
    });

    const safeFailure = getKindiStrings('en').execution.unexpectedFailure;
    expect(setConfirmationStatus).toHaveBeenLastCalledWith('confirmation-1', 'failed', safeFailure);
    expect(addAssistantMessage).toHaveBeenLastCalledWith({ text: safeFailure });
    expect(JSON.stringify(setConfirmationStatus.mock.calls)).not.toContain(rawError);
    expect(JSON.stringify(addAssistantMessage.mock.calls)).not.toContain(rawError);

    treeActionMocks.updatePerson.mockResolvedValueOnce({ success: true });
    await act(async () => {
      await result.current.confirm(confirmation);
    });

    expect(treeActionMocks.updatePerson).toHaveBeenCalledTimes(2);
    expect(setConfirmationStatus).toHaveBeenLastCalledWith('confirmation-1', 'confirmed', undefined);
  });

  it('reports unsuccessful mutation results without exposing action errors', async () => {
    const rawError = 'database-row-security-sentinel';
    treeActionMocks.updatePerson.mockResolvedValueOnce({ success: false, error: rawError });
    const { result, addAssistantMessage, setConfirmationStatus } = createHarness();

    await act(async () => {
      await result.current.confirm(updateConfirmation());
    });

    const safeFailure = getKindiStrings('en').execution.updateFailed;
    expect(setConfirmationStatus).toHaveBeenLastCalledWith('confirmation-1', 'failed', safeFailure);
    expect(addAssistantMessage).toHaveBeenCalledWith({ text: safeFailure });
    expect(JSON.stringify(addAssistantMessage.mock.calls)).not.toContain(rawError);
    await vi.waitFor(() => {
      expect(logKindiLearningEventMock).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'confirmation_failed',
        failureReason: 'EXECUTION_FAILED',
        metadata: { planType: 'UPDATE' },
      }));
    });
  });

  it('rejects an unknown runtime plan without falling through to deletion', async () => {
    const malformedPlan = {
      type: 'UNSUPPORTED',
      personId: 'person-1',
    } as unknown as KindiConfirmation['plan'];
    const { result, addAssistantMessage, setConfirmationStatus } = createHarness();

    await act(async () => {
      await result.current.confirm(updateConfirmation({ plan: malformedPlan }));
    });

    expect(treeActionMocks.addChild).not.toHaveBeenCalled();
    expect(treeActionMocks.addParent).not.toHaveBeenCalled();
    expect(treeActionMocks.addSpouse).not.toHaveBeenCalled();
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
    expect(treeActionMocks.deletePerson).not.toHaveBeenCalled();
    const safeFailure = getKindiStrings('en').execution.unsupportedActionError;
    expect(setConfirmationStatus).toHaveBeenLastCalledWith('confirmation-1', 'failed', safeFailure);
    expect(addAssistantMessage).toHaveBeenCalledWith({ text: safeFailure });
  });
});
