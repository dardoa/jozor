type TreeAccessLinkKind = 'authorized-tree' | 'invitation';

const buildTreeAccessLink = (
  origin: string,
  value: string,
  kind: TreeAccessLinkKind,
): string => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new Error(`Cannot build ${kind} link without an identifier.`);
  }

  const baseUrl = new URL(origin);
  if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
    throw new Error(`Cannot build ${kind} link for an unsupported origin.`);
  }

  const route = kind === 'authorized-tree' ? 'tree' : 'shared';
  return new URL(`/${route}/${encodeURIComponent(normalizedValue)}`, baseUrl.origin).toString();
};

/** A stable route for users who already have access. It never grants access. */
export const buildAuthorizedTreeLink = (origin: string, treeId: string): string =>
  buildTreeAccessLink(origin, treeId, 'authorized-tree');

/** A tokenized route that can complete the tracked invitation flow. */
export const buildTreeInvitationLink = (origin: string, inviteToken: string): string =>
  buildTreeAccessLink(origin, inviteToken, 'invitation');
