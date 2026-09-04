export type KindiTreeRole = 'owner' | 'editor' | 'viewer' | null | undefined;

export const canKindiMutateTree = (
  role: KindiTreeRole,
  currentTreeId?: string | null
): boolean => {
  if (role === 'owner' || role === 'editor') return true;
  if (role === 'viewer') return false;
  return !currentTreeId;
};
