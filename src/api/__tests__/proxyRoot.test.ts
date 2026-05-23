import { describe, expect, it } from 'vitest';

import rootHandler from '../../../api/proxy';
import srcHandler from '../proxy';

describe('root proxy API function', () => {
  it('exports the shared proxy handler for Vercel', () => {
    expect(rootHandler).toBe(srcHandler);
  });
});
