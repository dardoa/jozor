import { describe, expect, it } from 'vitest';

import { buildAuthorizedTreeLink, buildTreeInvitationLink } from '../treeAccessLinks';

describe('tree access links', () => {
  it('builds an authenticated tree route without implying public access', () => {
    expect(buildAuthorizedTreeLink('https://jozor.example', 'tree-1')).toBe(
      'https://jozor.example/tree/tree-1',
    );
  });

  it('builds invitation routes from opaque tokens', () => {
    expect(buildTreeInvitationLink('https://jozor.example', 'invite/token')).toBe(
      'https://jozor.example/shared/invite%2Ftoken',
    );
  });

  it('rejects empty identifiers and non-web origins', () => {
    expect(() => buildAuthorizedTreeLink('https://jozor.example', '  ')).toThrow(
      'without an identifier',
    );
    expect(() => buildTreeInvitationLink('file:///tmp/app', 'token-1')).toThrow(
      'unsupported origin',
    );
  });
});
