import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../../api/person-media/[action]';
import readHandler from '../person-media';
import migrateHandler from '../person-media-migration';
import cleanupHandler from '../person-media-cleanup-cron';

vi.mock('../person-media', () => ({ default: vi.fn() }));
vi.mock('../person-media-migration', () => ({ default: vi.fn() }));
vi.mock('../person-media-cleanup-cron', () => ({ default: vi.fn() }));

const handlers = { read: readHandler, migrate: migrateHandler, cleanup: cleanupHandler };
const response = () => ({
  setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(),
}) as unknown as VercelResponse;

describe('consolidated person media entrypoint', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it.each(['read', 'migrate', 'cleanup'] as const)('delegates %s without changing the authorization or payload', async action => {
    const req = { query: { action, treeId: 'synthetic-tree' },
      method: action === 'migrate' ? 'POST' : 'GET', headers: { authorization: 'Bearer synthetic-session' },
      body: { treeId: 'synthetic-tree' } } as unknown as VercelRequest;
    const res = response();
    await handler(req, res);
    expect(handlers[action]).toHaveBeenCalledExactlyOnceWith(req, res);
    for (const [name, target] of Object.entries(handlers)) {
      if (name !== action) expect(target).not.toHaveBeenCalled();
    }
  });

  it.each([undefined, 'unknown', 'constructor', '__proto__', ['read', 'cleanup']])('rejects an unsupported or ambiguous action %j', async action => {
    const req = { query: { action } } as unknown as VercelRequest;
    const res = response();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    for (const target of Object.values(handlers)) expect(target).not.toHaveBeenCalled();
  });
});
