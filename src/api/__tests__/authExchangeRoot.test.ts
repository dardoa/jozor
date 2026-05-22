import { describe, expect, it } from 'vitest';

import rootHandler from '../../../api/auth/exchange';
import srcHandler from '../auth/exchange';

describe('root auth exchange API function', () => {
  it('exposes the src auth exchange handler for Vercel', () => {
    expect(rootHandler).toBe(srcHandler);
  });
});
