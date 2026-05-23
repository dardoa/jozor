import { describe, expect, it } from 'vitest';

import rootHandler, { config as rootConfig } from '../../../api/ai-proxy';
import srcHandler, { config as srcConfig } from '../ai-proxy';

describe('root AI proxy API function', () => {
  it('exports the shared Edge handler and runtime config for Vercel', () => {
    expect(rootHandler).toBe(srcHandler);
    expect(rootConfig).toEqual(srcConfig);
    expect(rootConfig).toEqual({ runtime: 'edge' });
  });
});
