import { useAppStore } from '../store/useAppStore';

export type PushOwner = Readonly<{ uid: string; generation: number }>;
export type PushMutationKind = 'enable' | 'disable';
export type PushMutationStage = 'browser' | 'credentials' | 'server' | 'unsubscribe';
export type PushAttempt = Readonly<{ id: number; owner: PushOwner; kind: PushMutationKind }>;
export type PushOutcome = Readonly<{
  enabled: boolean; ready: boolean; disableRetry: boolean; failed: boolean;
}>;
export type PushSnapshot = Readonly<{
  revision: number; owner: PushOwner | null;
  active: (PushAttempt & { stage: PushMutationStage; valid: boolean }) | null;
  outcome: PushOutcome | null;
}>;
export type PushAccountSource = {
  getUid(): string | null;
  subscribe(listener: () => void): () => void;
};
export interface WebPushMutationCoordinator {
  getSnapshot(): PushSnapshot;
  subscribe(listener: () => void): () => void;
  claim(kind: PushMutationKind, uid: string, enabled: boolean): PushAttempt | null;
  isCurrent(attempt: PushAttempt): boolean;
  advance(attempt: PushAttempt, stage: PushMutationStage): boolean;
  rememberDisableEndpoint(attempt: PushAttempt, endpointHash: string): boolean;
  getDisableEndpointHash(owner: PushOwner): string | null;
  settle(attempt: PushAttempt, outcome: PushOutcome | null): void;
  acceptInspection(owner: PushOwner, revision: number, enabled: boolean): boolean;
}

export function createWebPushMutationCoordinator(source: PushAccountSource): WebPushMutationCoordinator {
  let uid = source.getUid();
  let generation = 0;
  let nextId = 0;
  let endpointHash: string | null = null;
  let detachSource: (() => void) | undefined;
  const observers = new Set<() => void>();
  let snapshot: PushSnapshot = {
    revision: 0, owner: uid ? { uid, generation: 0 } : null, active: null, outcome: null,
  };
  const sameOwner = (owner: PushOwner) => snapshot.owner?.uid === owner.uid
    && snapshot.owner.generation === owner.generation;
  const publish = (patch: Partial<PushSnapshot>) => {
    snapshot = Object.freeze({ ...snapshot, ...patch, revision: snapshot.revision + 1 });
    [...observers].forEach(observer => observer());
  };
  const detachIfUnused = () => {
    if (observers.size || snapshot.active || snapshot.outcome) return;
    detachSource?.();
    detachSource = undefined;
  };
  const reconcileAccount = () => {
    const current = source.getUid();
    if (current === uid) return;
    uid = current;
    ++generation;
    endpointHash = null;
    publish({
      owner: uid ? Object.freeze({ uid, generation }) : null,
      outcome: null,
      active: snapshot.active ? Object.freeze({ ...snapshot.active, valid: false }) : null,
    });
    detachIfUnused();
  };
  const observeAccount = () => {
    if (!detachSource) detachSource = source.subscribe(reconcileAccount);
    reconcileAccount();
  };
  const isCurrent = (attempt: PushAttempt) => {
    reconcileAccount();
    return snapshot.active?.id === attempt.id && snapshot.active.valid && sameOwner(attempt.owner);
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {
      observers.add(listener);
      observeAccount();
      return () => { observers.delete(listener); detachIfUnused(); };
    },
    claim: (kind, ownerUid, enabled) => {
      observeAccount();
      if (snapshot.active || snapshot.owner?.uid !== ownerUid) {
        detachIfUnused();
        return null;
      }
      if (kind === 'enable') endpointHash = null;
      const attempt = Object.freeze({ id: ++nextId, owner: snapshot.owner, kind });
      publish({
        active: Object.freeze({ ...attempt, stage: 'browser', valid: true }),
        outcome: Object.freeze({ enabled, ready: false, disableRetry: kind === 'disable', failed: false }),
      });
      return attempt;
    },
    isCurrent,
    advance: (attempt, stage) => {
      if (!isCurrent(attempt)) return false;
      if (snapshot.active!.stage !== stage) publish({ active: Object.freeze({ ...snapshot.active!, stage }) });
      return true;
    },
    rememberDisableEndpoint: (attempt, hash) => {
      if (!isCurrent(attempt) || attempt.kind !== 'disable') return false;
      endpointHash = hash;
      return true;
    },
    getDisableEndpointHash: owner => {
      reconcileAccount();
      return sameOwner(owner) ? endpointHash : null;
    },
    settle: (attempt, outcome) => {
      const valid = isCurrent(attempt);
      if (snapshot.active?.id !== attempt.id) return;
      const result = valid && outcome ? Object.freeze({ ...outcome }) : null;
      if (!result?.disableRetry) endpointHash = null;
      publish({ active: null, outcome: result });
      detachIfUnused();
    },
    acceptInspection: (owner, revision, enabled) => {
      reconcileAccount();
      if (!sameOwner(owner) || revision !== snapshot.revision || snapshot.active
        || snapshot.outcome?.disableRetry) return false;
      const previous = snapshot.outcome;
      if (!previous || previous.enabled !== enabled || previous.ready !== enabled || previous.failed) {
        publish({ outcome: Object.freeze({ enabled, ready: enabled, disableRetry: false, failed: false }) });
      }
      return true;
    },
  };
}

export const webPushMutationCoordinator = createWebPushMutationCoordinator({
  getUid: () => useAppStore.getState().user?.uid ?? null,
  subscribe: listener => useAppStore.subscribe(listener),
});
