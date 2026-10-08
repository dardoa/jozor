import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../person-media-cleanup-cron';
import { sweepPersonMediaOrphans } from '../../services/personMediaServerCleanup';
import { sweepUserAvatarCleanup } from '../../services/userAvatarCleanup';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('../../services/personMediaServerCleanup', () => ({ sweepPersonMediaOrphans: vi.fn() }));
vi.mock('../../services/userAvatarCleanup', () => ({ sweepUserAvatarCleanup: vi.fn() }));
const request = async (authorization = 'Bearer synthetic-secret', method = 'GET') => {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res);
  await handler({ method, headers: { authorization } } as VercelRequest, res as unknown as VercelResponse);
  return res;
};
describe('private media cleanup cron activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('USER_AVATAR_CLEANUP_ENABLED', '');
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
    expect(sweepUserAvatarCleanup).not.toHaveBeenCalled();
  });
  it('sums safe avatar counts only behind both approved activation gates', async () => {
    vi.stubEnv('USER_AVATAR_CLEANUP_ENABLED', 'true');
    vi.mocked(sweepPersonMediaOrphans).mockResolvedValue({ checked: 2, removed: 1, retained: 1, failed: 0 });
    vi.mocked(sweepUserAvatarCleanup).mockResolvedValue({ checked: 3, removed: 1, retained: 1, failed: 1 });
    expect((await request()).json).toHaveBeenCalledWith({ checked: 5, removed: 2, retained: 2, failed: 1 });
  });
  it.each(['false', '', 'TRUE', '1'])('does not activate avatars with flag %j', async flag => {
    vi.stubEnv('USER_AVATAR_CLEANUP_ENABLED', flag);
    await request(); expect(sweepUserAvatarCleanup).not.toHaveBeenCalled();
  });
  it('does not activate avatars before method, secret, existing flag or configuration gates', async () => {
    vi.stubEnv('USER_AVATAR_CLEANUP_ENABLED', 'true');
    await request('Bearer wrong'); await request(undefined, 'POST');
    vi.stubEnv('CRON_SECRET', ''); await request(); vi.stubEnv('CRON_SECRET', 'synthetic-secret');
    vi.stubEnv('PERSON_MEDIA_CLEANUP_ENABLED', 'TRUE'); await request(); vi.stubEnv('PERSON_MEDIA_CLEANUP_ENABLED', 'true');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', ''); await request();
    expect(sweepUserAvatarCleanup).not.toHaveBeenCalled();
  });
});
