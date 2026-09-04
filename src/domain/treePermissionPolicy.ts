export type TreeAccessRole = 'owner' | 'editor' | 'viewer' | null;

export const TREE_EDIT_FORBIDDEN_ERROR =
  'Unauthorized: This tree cannot be edited with the current role.';

interface TreePermissionContext {
  currentTreeId: string | null;
  role: TreeAccessRole;
}

export const isLocalTreeContext = (currentTreeId: string | null): boolean =>
  currentTreeId === null;

export const canEditTreeContext = ({
  currentTreeId,
  role,
}: TreePermissionContext): boolean => {
  if (role === 'owner' || role === 'editor') return true;
  if (role === 'viewer') return false;
  return isLocalTreeContext(currentTreeId);
};

export const assertCanEditTreeContext = (
  context: TreePermissionContext
): void => {
  if (!canEditTreeContext(context)) {
    throw new Error(TREE_EDIT_FORBIDDEN_ERROR);
  }
};
