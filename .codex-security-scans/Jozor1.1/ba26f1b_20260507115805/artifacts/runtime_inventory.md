# Runtime Inventory

Scan target: repository-wide scan of `D:\AppDEV\Jozor1.1` at `ba26f1b`, with a dirty worktree treated as user-owned.

Product/runtime surfaces inventoried:

- Browser app: React/Vite entrypoints, Zustand store, tree/sidebar/modal/rendering components, local IndexedDB/localStorage state.
- Vercel API routes: `api/auth/exchange.ts`, `api/auth/session.ts`, `api/ai-proxy.ts`, `api/proxy.ts`, `api/push-notifier.ts`, `api/push-reminder-cron.ts`, `api/check-env.ts`, `api/debug-env.ts`.
- Supabase: migrations for core schema, RLS, sharing, invitations, sync operations, AI usage, push subscriptions, media sync, tree edit RPC hardening.
- Supabase Edge Function: `supabase/functions/resolve-tree-context/index.ts`.
- Google Drive/OAuth: `services/google/*`, `hooks/google/*`, `services/googleService.ts`, `services/googleDriveProvider.ts`.
- Sync/collaboration: `services/sync/*`, `services/supabaseTree*`, `services/treeInvitationService.ts`, `services/authTokenService.ts`, `utils/authUtils.ts`.
- Import/export/media: `services/importTreeService.ts`, `utils/gedcomLogic.ts`, `utils/archiveLogic.ts`, `services/archiveService.ts`, `services/archiveRestoreService.ts`, `services/supabaseStorageService.ts`, `services/supabaseGalleryService.ts`, `hooks/usePhotoUpload.ts`.
- Rendering sinks checked: `dangerouslySetInnerHTML`, `href`, `src`, object URLs, archive media restore, Google Drive import hydration.

Excluded from first-pass scope: tests, docs, deleted legacy files, lockfiles, static images, and local dev-only middleware unless they fed a deployed/runtime boundary.

Subagent status:

- Google Drive/OAuth/import subagent completed and produced candidate `CAND-001`.
- API, Supabase, sync/collaboration, and import/media subagents failed due account usage limit before returning findings.
