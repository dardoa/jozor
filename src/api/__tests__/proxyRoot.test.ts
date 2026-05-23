import { describe, expect, it } from 'vitest';

import rootHandler from '../../../api/proxy';

describe('root proxy API function', () => {
  it('exports a Vercel proxy handler', () => {
    expect(rootHandler).toEqual(expect.any(Function));
  });
});
