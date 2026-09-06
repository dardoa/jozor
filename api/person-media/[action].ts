import type { VercelRequest, VercelResponse } from '@vercel/node';
import readHandler from '../../src/api/person-media';
import migrateHandler from '../../src/api/person-media-migration';
import cleanupHandler from '../../src/api/person-media-cleanup-cron';

const handlers = {
  read: readHandler,
  migrate: migrateHandler,
  cleanup: cleanupHandler,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action;
  if (typeof action !== 'string' || !Object.hasOwn(handlers, action)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'Media endpoint not found' });
  }
  // Each handler retains its own method, session/cron and permission checks.
  return handlers[action as keyof typeof handlers](req, res);
}
