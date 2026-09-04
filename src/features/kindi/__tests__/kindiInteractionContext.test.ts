import { afterEach, describe, expect, it, vi } from 'vitest';

import { createKindiInteractionId } from '../logic/kindiInteractionContext';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('kindiInteractionContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps fallback interaction identifiers opaque and UUID-shaped', () => {
    vi.stubGlobal('crypto', undefined);

    const first = createKindiInteractionId();
    const second = createKindiInteractionId();

    expect(first).toMatch(UUID_PATTERN);
    expect(second).toMatch(UUID_PATTERN);
    expect(second).not.toBe(first);
  });
});
