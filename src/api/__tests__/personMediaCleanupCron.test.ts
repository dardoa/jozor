import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../person-media-cleanup-cron';
import { sweepPersonMediaOrphans } from '../../services/personMediaServerCleanup';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('../../services/personMediaServerCleanup', () => ({ sweepPersonMediaOrphans: vi.fn() }));
const request = async (authorization = 'Bearer synthetic-secret', method = 'GET') => {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res);
  await handler({ method, headers: { authorization } } as VercelRequest, res as unknown as VercelResponse);
  return res;
};
describe('private media cleanup cron activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'synthetic-secret');
    vi.stubEnv('PERSON_MEDIA_CLEANUP_ENABLED', 'true');
    vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:55321');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-key');
  });
  afterEach(() => vi.unstubAllEnvs());
  it('rejects missing server secret and wrong credentials before any cleanup', async () => {
    expect((await request('Bearer wrong')).status).toHaveBeenCalledWith(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await request()).status).toHaveBeenCalledWith(503);
    expect(sweepPersonMediaOrphans).not.toHaveBeenCalled();
  });
  it('is inert until explicitly enabled after rollout', async () => {
    vi.stubEnv('PERSON_MEDIA_CLEANUP_ENABLED', 'false');
    expect((await request()).json).toHaveBeenCalledWith({ enabled: false });
    expect(sweepPersonMediaOrphans).not.toHaveBeenCalled();
  });
  it('returns safe counts without identifiers and hides internal errors', async () => {
    const counts = { checked: 2, removed: 1, retained: 1, failed: 0 };
    vi.mocked(sweepPersonMediaOrphans).mockResolvedValueOnce(counts).mockRejectedValueOnce(new Error('private-storage-path'));
    expect((await request()).json).toHaveBeenCalledWith(counts);
    expect((await request()).json).toHaveBeenCalledWith({ error: 'Media cleanup failed' });
  });
});
