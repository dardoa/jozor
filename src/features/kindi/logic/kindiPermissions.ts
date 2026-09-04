import {
  canEditTreeContext,
  type TreeAccessRole,
} from '../../../domain/treePermissionPolicy';

export type KindiTreeRole = TreeAccessRole | undefined;

export const canKindiMutateTree = (
  role: KindiTreeRole,
  currentTreeId?: string | null
): boolean => {
  return canEditTreeContext({
    currentTreeId: currentTreeId ?? null,
    role: role ?? null,
  });
};
