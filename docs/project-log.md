# Project Log

## 2026-06-15 - Production Readiness Audit

- Summary:
  - Added a production-readiness audit that separates sandbox-ready status from
    true production blockers.
  - Re-ran Supabase security advisors and confirmed the only remaining warning
    is leaked-password protection.
  - Confirmed Vercel has the expected environment variable names for Supabase,
    Google, Paddle, VAPID, cron, Kindi AI, Gemini, and app origin.
  - Identified likely legacy `VITE_FIREBASE_*` Vercel variables as non-blocking
    cleanup before production.
- Current stance:
  - `https://jozor.vercel.app` remains a sandbox/staging environment until the
    production gates are explicitly completed.

## 2026-06-15 - Supabase RPC Execution Contract Revalidation

- Summary:
  - Revalidated application RPC callers against the current migration history.
  - Confirmed `sync_tree_batch` is a live browser contract used by the delta
    sync client and must remain executable by `authenticated`.
  - Confirmed the retired `create_person_and_relationship` and
    `delete_person_and_relations` RPCs have no current application callers and
    must remain unavailable to browser roles.
  - Added a read-only RPC execution contract diagnostic and removed retired RPCs
    from the required schema audit list.
- Safety:
  - No function definition, grant, table data, or application behavior changed.
  - The new diagnostic reports only contract violations.
- Live verification:
  - Ran `supabase/diagnostics/rpc_execution_contract_check.sql` against the
    linked Supabase project on 2026-06-15.
  - Result: `0` contract violations.

## 2026-06-15 - Supabase SECURITY DEFINER Boundary Revalidation

- Summary:
  - Re-ran linked Supabase security advisors and confirmed that the historical
    authenticated/anonymous SECURITY DEFINER warnings are closed.
  - Confirmed the only remaining advisor warning is leaked-password protection,
    deferred while the project remains on the Free plan.
  - Replaced the hard-coded function inventory with a dynamic public/private
    function and policy inventory.
  - Added a read-only boundary check for public privileged RPC exposure and
    private trigger-helper execution grants.
- Remaining narrow cleanup:
  - Completed through
    `20260615194119_restrict_private_trigger_function_execute.sql`.
  - Browser-role EXECUTE privileges were removed from both private trigger-only
    helpers without detaching their triggers.
- Safety:
  - No table data or application RPC contract changed.
  - The post-migration boundary check returned no violations.

## 2026-06-14 - Local Performance Observability Budgets

- Summary:
  - Centralized actionable budgets for rendering FPS, active DOM nodes, layout
    execution, and measured bootstrap phases.
  - Added local-only health classifications to the diagnostics panel:
    healthy, watch, action needed, and not measured.
  - Kept all measurements in the browser and avoided collecting family data,
    names, queries, or cloud telemetry.
- Verification:
  - Performance budget unit tests: pass
  - Diagnostics drawer tests: pass
  - `npm run lint`: pass
  - `npm run typecheck`: pass
  - `npm run build`: pass
- Operational intent:
  - Use the status to identify the slow phase before considering rendering or
    orchestration changes.

## 2026-06-14 - AI Proxy Request Validation, Batch 2

- Summary:
  - Replaced the remaining unchecked AI request cast with operation-specific
    runtime validation.
  - Added field and prompt size limits for biography, ancestor chat, story,
    extraction, image analysis, and Kindi planning requests.
  - Validated count fields and rejected unsupported operations before billing
    quota reservation.
  - Restricted image analysis to JPEG, PNG, and WebP base64 payloads with a
    bounded encoded size.
- Verification:
  - AI proxy boundary tests cover unsupported operations, malformed prompts,
    invalid counts, invalid image payloads, and empty chat messages.
- Safety:
  - No provider, billing, quota, or user-facing behavior changed for valid
    requests.

## 2026-06-13 - Kindi AI Boundary Hardening, Batch 1

- Summary:
  - Validated `kindi_plan` request shape and normalized redacted text before
    billing quota reservation or provider invocation.
  - Added a 2,000-character request limit and rejected UUID-like internal IDs.
  - Hardened provider-output sanitation with field size limits and UUID rejection.
  - Rejected invented `[NAME_n]` tokens that were absent from the redacted request.
  - Prevented non-executable classifications from retaining executable drafts.
  - Kept all AI output behind the existing local planning and confirmation flow.
- Verification:
  - AI proxy and sanitizer tests: pass
  - Kindi planning, privacy, and billing-flow tests: pass
  - `npm run lint`: pass
  - `npm run typecheck`: pass
  - `npm run typecheck:api`: pass
  - `npm run build`: pass
- Safety:
  - No automatic rule injection or direct AI execution was introduced.

## 2026-06-13 - React Stabilization Closure and Current Baseline

- Summary:
  - Completed the React Hooks and ESLint stabilization track with zero warnings.
  - Made `npm run lint` reject any future warning through `--max-warnings 0`.
  - Re-audited older roadmap assumptions against the current source tree.
  - Confirmed that the Kindi planner decomposition, ChartType pruning, rendering
    guardrails, and pending-operation projection/replay tracks are already complete.
  - Added `docs/current-execution-baseline-2026-06-13.md` as the current source of
    truth for the next implementation track.
- Verification:
  - `npm run lint`: pass
  - `npm run typecheck`: pass
  - `npm run typecheck:api`: pass
  - `npm run build`: pass
  - Unit shard 1: 370 passed, 8 skipped
  - Unit shard 2: 404 passed
- Next recommended track:
  - AI request/output boundary validation and adversarial tests.
  - No automatic cloud rule injection.

## 2026-06-07 - TypeScript Hygiene: Discussions Feature Boundary

- Summary:
  - Added explicit discussion feature types for Supabase discussion rows, realtime presence users, and collaborators.
  - Replaced remaining `any` usage inside `src/features/discussions` across the store, service, hook, and drawer.
  - Kept existing discussion UI labels and fallback behavior unchanged.
- Files changed:
  - `src/features/discussions/types.ts`
  - `src/features/discussions/store/discussionSlice.ts`
  - `src/features/discussions/services/treeDiscussionService.ts`
  - `src/features/discussions/hooks/useTreeDiscussion.ts`
  - `src/features/discussions/components/TreeDiscussionDrawer.tsx`
- Verification:
  - `npx tsc --noEmit --pretty false`: pass
  - `npx vitest run src/features/discussions/services/__tests__/treeDiscussionService.test.ts src/features/discussions/store/__tests__/discussionSlice.test.ts src/features/discussions/components/__tests__/TreeDiscussionItem.test.tsx`: pass
  - `npm run build`: pass
- Notes:
  - This is a type-safety cleanup only; realtime subscription, unread counts, message ordering, and send/delete behavior were not intentionally changed.

## 2026-06-07 - TypeScript Hygiene: Node Context Menu Translations

- Summary:
  - Replaced broad translation `any` casts in `NodeContextMenu` with a narrow local optional-translation type.
  - Preserved existing fallback labels for optional keys that are not part of the current translation schema.
- Verification:
  - `npx tsc --noEmit --pretty false`: pass
  - `npx vitest run src/components/__tests__/NodeContextMenu.test.tsx`: pass
- Notes:
  - This changed typing only; menu permissions and action behavior were not intentionally changed.

## 2026-06-07 - TypeScript Hygiene: AI Proxy Boundary

- Summary:
  - Removed the remaining broad `any` usage from `src/api/ai-proxy.ts`.
  - Typed the Supabase admin client inside the request handler and replaced an RPC `.catch(...)` chain with explicit `try/catch` error handling.
- Verification:
  - `npx vitest run src/api/__tests__/aiProxyRateLimit.test.ts src/api/__tests__/aiProxyRoot.test.ts`: pass
  - `npx tsc --noEmit --pretty false`: pass
- Notes:
  - No billing, quota, rate-limit, or provider behavior was intentionally changed.

## 2026-06-07 - TypeScript Hygiene: Low-Risk Service Cast Cleanup

- Summary:
  - Replaced low-risk `any` casts in service-layer code with narrower local types.
  - Kept behavior unchanged while improving compiler coverage around image compression, Supabase auth, import payloads, and Google Picker media selection.
- Files changed:
  - `src/services/supabaseStorageService.ts`
  - `src/services/supabaseTreeMutationService.ts`
  - `src/services/google/GoogleMediaService.ts`
  - `src/services/supabaseClient.ts`
- Verification:
  - `npx tsc --noEmit --pretty false`: pass
  - `npx vitest run src/services/__tests__/supabaseTreeMutationService.test.ts src/services/__tests__/supabaseTreeService.test.ts src/services/google/__tests__/GoogleAuthService.test.ts`: pass
- Notes:
  - This is a Phase 1 hygiene step only; no sync, rendering, or storage behavior was intentionally changed.

## M-007b-4 - Remove Legacy JSON Snapshot System (Archive-Only)

- Task ID: `M-007b-4`
- Title: `Remove Legacy JSON Snapshot System (Archive-Only)`
- Summary:
  - Simplified the snapshot system by removing the remaining legacy JSON snapshot paths.
  - Made snapshot creation, listing, and restore archive-only around `.jozor` files.
  - Kept the main tree JSON system unchanged.
- Files changed:
  - `hooks/useGoogleSync.ts`
  - `services/storageProvider.ts`
  - `services/googleDriveProvider.ts`
  - `services/google/interfaces.ts`
  - `services/google/GoogleDriveService.ts`
- Architectural impact:
  - Snapshot restore is now a single archive-based path.
  - The provider snapshot layer is now Blob-only.
  - Snapshot listing is restricted to `.jozor` archives only.
- Snapshot behavior:
  - `saveSnapshot(...)` now accepts archive blobs only.
  - Snapshot restore always uses `loadSnapshotFileRaw(...)` plus `restoreBlueprintArchive(...)`.
  - Legacy JSON snapshot branching and JSON snapshot filtering were removed.
- Verification:
  - `typecheck`: pass
- Notes:
  - Main tree file save/load remains JSON-based and was not modified.
  - `archiveService`, `archiveRestoreService`, and `loadFullState(...)` were left unchanged.

## M-007b-3 - Snapshot Creation Cutover (Blueprint Archive)

- Task ID: `M-007b-3`
- Title: `Snapshot Creation Cutover (Blueprint Archive)`
- Summary:
  - Switched snapshot creation from JSON payloads to blueprint archive blobs.
  - Reused the existing provider archive-snapshot support without changing provider APIs in this phase.
  - Kept restore compatibility by relying on the earlier format-aware routing between `.json` and `.jozor`.
- Files changed:
  - `hooks/useGoogleSync.ts`
- Architectural impact:
  - New snapshots are now created through `buildBlueprintArchive(...)` and stored as archive snapshots.
  - The safety snapshot taken before restore was also cut over to archive format.
  - JSON snapshot support remains available for previously stored snapshots.
- Snapshot behavior:
  - Snapshot creation now saves through `storageProvider.saveSnapshot(blob, treeId, label, 'archive')`.
  - Listing and rotation continue working through the earlier dual-format provider support.
  - `loadFullState(...)` and the main restore/store contract were left unchanged.
- Verification:
  - `typecheck`: pass
- Notes:
  - A local `buildSnapshotArchive(fullState, label)` helper was added in `useGoogleSync.ts`.
  - This phase changed snapshot creation only; provider APIs were not modified here.

## M-007b-2 - Snapshot Restore Routing (JSON vs Archive)

- Task ID: `M-007b-2`
- Title: `Snapshot Restore Routing (JSON vs Archive)`
- Summary:
  - Made snapshot restore format-aware without changing provider logic or snapshot creation.
  - Preserved the existing JSON restore path exactly as before.
  - Added archive snapshot routing through the blueprint archive restore service.
- Files changed:
  - `hooks/useGoogleSync.ts`
- Architectural impact:
  - `handleRestoreSnapshot(...)` now routes by snapshot filename format.
  - `.jozor` snapshots load through `loadSnapshotFileRaw(...)` and `restoreBlueprintArchive(...)`.
  - Legacy JSON snapshots still load through the existing `loadFile(...)` plus `loadFullState(...)` path.
- Restore behavior:
  - Archive restore warnings are logged without failing the restore flow.
  - Object URL cleanup was added for the archive-restore lifecycle so temporary media URLs do not accumulate indefinitely.
- Verification:
  - `typecheck`: pass
- Notes:
  - No provider-layer changes were made in this phase.
  - No snapshot creation cutover was performed in this phase.
  - This task completed restore routing only.

## M-007b-1 - Provider Snapshot Dual-Format Support (Non-Breaking)

- Task ID: `M-007b-1`
- Title: `Provider Snapshot Dual-Format Support (Non-Breaking)`
- Summary:
  - Extended the storage provider snapshot surface to support both JSON and archive snapshot formats.
  - Preserved JSON snapshot behavior as the default path.
  - Added raw snapshot blob loading support for future archive restore work.
- Files changed:
  - `services/storageProvider.ts`
  - `services/googleDriveProvider.ts`
  - `services/google/interfaces.ts`
  - `services/google/GoogleDriveService.ts`
- Architectural impact:
  - Snapshot handling in the provider layer now supports dual-format evolution without changing the main file APIs.
  - Snapshot listing now includes both `.json` and `.jozor` files under the existing tree-specific naming prefix.
  - Main Drive file operations remain JSON-only and unchanged.
- Snapshot compatibility behavior:
  - `saveSnapshot(...)` still defaults to JSON behavior with the existing upload path.
  - Archive snapshot support is now available through `Blob` payloads with `format='archive'`.
  - `loadSnapshotFileRaw(fileId)` was added for future archive snapshot restore routing.
- Verification:
  - `typecheck`: pass
- Notes:
  - No restore-flow changes were made.
  - No current snapshot creation path was cut over in this phase.
  - This task prepared the provider layer only; actual archive snapshot adoption remains a later step.

## M-007b - Archive Cutover (Snapshot + Export Creation) - Phase 1

- Task ID: `M-007b`
- Title: `Archive Cutover (Snapshot + Export Creation)`
- Phase: `Phase 1 - Export cutover only`
- Summary:
  - Switched the `.jozor` export creation path to the new blueprint archive builder.
  - Preserved the existing export UX, download flow, and output filename.
  - Kept snapshot creation and Drive-backed snapshot storage untouched in this phase.
- Files changed:
  - `hooks/useExport.ts`
- Architectural impact:
  - `useExport` now builds `.jozor` exports through `services/archiveService.ts`.
  - Export output now follows the blueprint archive layout with `tree.json`, `manifest.json`, and `media/*`.
  - No snapshot cutover was attempted because the current Drive snapshot path still depends on JSON storage and JSON restore behavior.
- Verification:
  - `typecheck`: pass
- Notes:
  - No Base64 was reintroduced into archive JSON.
  - No `storageProvider`, Google Drive provider, snapshot logic, or restore routing changes were made.
  - Snapshot cutover remains a future phase that will require provider-layer Blob support and coordinated restore-path updates.

## M-008b - Archive Restore System (Blueprint Format)

- Task ID: `M-008b`
- Title: `Archive Restore System (Blueprint Format)`
- Summary:
  - Added a new additive restore service for blueprint archives without changing the legacy importer.
  - Implemented restore parsing for `tree.json`, `manifest.json`, `media/avatars/*`, and `media/gallery/*`.
  - Reconstructed runtime media using browser-safe object URLs instead of Base64 payloads.
- Files changed:
  - `services/archiveRestoreService.ts`
- Architectural impact:
  - Introduced a new services-layer restore boundary for blueprint archives.
  - Kept `utils/archiveLogic.ts` and current import UI wiring untouched.
  - Restore output is shaped for Zustand-first loading through `FullState`, not direct Supabase writes.
- Restore behavior:
  - Returns restored `state`, parsed `manifest`, accumulated `warnings`, and `revokeObjectUrls()`.
  - Missing avatar or gallery files are tolerated safely and reported in `warnings`.
  - Runtime media references are rebuilt with object URLs created from archive blobs.
- Verification:
  - `typecheck`: pass
- Notes:
  - `voiceNotes` are restored as empty because the current blueprint archive format does not carry them.
  - This task implemented restore parsing only and did not perform legacy cutover or UI integration.

## M-009 - Visible Tree Highlighting Refactor

- Task ID: `M-009`
- Title: `Visible Tree Highlighting Refactor`
- Summary:
  - Refactored visible-tree highlighting so the final highlighting result is resolved in the layout controller instead of the render component.
  - Removed highlight-specific chart-model mapping ownership from the highlighting helper.
  - Aligned the highlighting pipeline more closely with the minimap architecture pattern while preserving current fallback behavior.
- Files changed:
  - `components/FamilyTree.tsx`
  - `domain/visibleTreeHighlighting.ts`
  - `hooks/useFamilyTreeLayoutController.ts`
- Architectural impact:
  - `FamilyTree` is now passive for highlight delivery.
  - Visible-tree highlighting vs legacy fallback vs radial suppression is resolved in `useFamilyTreeLayoutController.ts`.
  - `visibleTreeHighlighting.ts` no longer owns local chart-model mapping semantics.
  - `FamilyTree.tsx` no longer contains highlight suppression branching.
- Verification:
  - `typecheck`: pass
- Status:
  - Code complete
  - QA completed after focused regression follow-up
- Notes:
  - No `ChartType` changes were made.
  - Minimap behavior and layout core were left untouched.
  - A post-refactor regression was found and fixed in `useFamilyTreeLayoutController.ts` where `highlightedPath` read `activeChartType` before initialization.
  - The fix was minimal: move `activeChartType`, `layoutKind`, and `chartModel` initialization above the `highlightedPath` memo.
  - Follow-up investigation for Case 3 (`fan/radial` with `visibleTreeHighlighting = false`) found no additional code bug.
  - The temporary `isLoading` hang reproduced only in the secondary QA environment and was traced to QA timing during immediate scenario seeding plus chart-mode switching, not to the flag-off suppression path itself.
  - No extra code change was required for Case 3 beyond the focused initialization-order fix.

## M-008 - Backup Rotation Policy (Keep Last 3 Snapshots)

- Task ID: `M-008`
- Title: `Backup Rotation Policy (Keep Last 3 Snapshots)`
- Summary:
  - Updated the existing snapshot cleanup policy to retain only the newest 3 snapshots per tree.
  - Reused the existing provider-layer cleanup flow instead of introducing new hook-level deletion logic.
  - Preserved current snapshot ordering and error-handling behavior.
- Files changed:
  - `services/google/GoogleDriveService.ts`
- Architectural impact:
  - `storageProvider.cleanupSnapshots(treeId)` now enforces the retention rule globally through the provider layer.
  - No hook changes were made in `useGoogleSync`.
  - No `storageProvider` API changes or snapshot-format changes were introduced.
- Retention behavior:
  - Snapshot ordering still relies on `modifiedTime desc`.
  - Cleanup deletes snapshots after index `3`, keeping only the latest 3 per tree.
  - Cleanup remains scoped per tree through the existing `treeId` filtering path.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task changed retention only.
  - Archive integration and retention configurability remain out of scope.

## M-007 - Snapshot -> Archive System

- Task ID: `M-007`
- Title: `Snapshot -> Archive System`
- Summary:
  - Added a new canonical archive builder in the services layer.
  - Implemented blueprint-compliant archive generation with `tree.json`, `manifest.json`, `media/avatars/*`, and `media/gallery/*`.
  - Kept archive JSON data-only by separating media references into `manifest.json` instead of embedding Base64 payloads.
- Files changed:
  - `services/archiveService.ts`
- Architectural impact:
  - Introduced the new archive-generation boundary without changing legacy import/export wiring.
  - Preserved `utils/archiveLogic.ts` as the old archive path for now, so cutover remains a later task.
  - Did not modify `services/supabaseTreeService.ts`, snapshot UI behavior, or restore logic.
- Determinism notes:
  - Sorted people before archive assembly.
  - Sorted object keys before serializing `tree.json` and `manifest.json`.
  - Stabilized `createdAt` from snapshot metadata when available, or from the provided override.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task implemented archive generation only.
  - Legacy archive replacement and runtime cutover were intentionally deferred to a later task.

## M-001 - Move Gemini API access to Vercel proxy (cleanup + verification)

- Task ID: `M-001`
- Title: `Move Gemini API access to Vercel proxy (cleanup + verification)`
- Summary:
  - Removed legacy AI endpoints that were no longer part of the approved architecture.
  - Cleaned direct Gemini references from helper and test files that still implied direct provider usage.
  - Enforced the proxy-only flow by keeping active AI calls routed through `/api/ai-proxy`.
- Files changed:
  - `api/gemini.ts`
  - `api/ai/generate-content.ts`
  - `api/check-env.ts`
  - `test-gemini-direct.js`
  - `test-api.html`
  - `services/geminiService.ts`
- Security impact:
  - Removed client-side API key exposure paths and legacy direct-provider usage paths from the approved M-001 scope.
- Final state:
  - All active AI calls go through `/api/ai-proxy`.
- Verification results:
  - `typecheck`: pass
  - `lint`: pass (warnings outside scope)
  - `tests`: pass
- Notes:
  - The task was already partially implemented before the Phase 0 audit, so this work completed the cleanup and verification pass rather than introducing the proxy flow from scratch.

## M-002 - Remove Firebase remnants from codebase

- Task ID: `M-002`
- Title: `Remove Firebase remnants from codebase`
- Summary:
  - Removed Firebase-specific wording from active auth-related API responses and comments.
  - Removed stale Firebase env typings that were no longer used by the application.
  - Cleaned Firebase-era auth failure wording in the targeted live collaboration Playwright spec.
- Files changed:
  - `api/auth/session.ts`
  - `api/auth/exchange.ts`
  - `vite-env.d.ts`
  - `tests/e2e/collaboration-live.spec.ts`
  - `services/supabaseTreeService.ts`
- Architectural impact:
  - Supabase remains the only auth system.
  - Firebase remnants were removed from active code, comments, and env typings.
- Verification:
  - `typecheck`: pass
  - `lint`: pass (warnings outside scope)
  - `targeted Playwright spec`: skipped due to live environment gating
- Notes:
  - The task was a cleanup/remnants task, not an auth migration.

## M-004A - Safe additive shared type updates

- Task ID: `M-004A`
- Title: `Safe additive shared type updates`
- Summary:
  - Added `privacyMode` to `TreeSettings`.
  - Added `BackupManifest`.
  - Added `NotificationType`.
- Files changed:
  - `types.ts`
- Architectural note:
  - `ChartType` was intentionally left unchanged.
  - `AppNotification` ownership remains in `store/slices/uiSlice.ts` for now.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task was split out from `M-004` to avoid breaking runtime consumers.

## M-004B1 - Safe type-module bridge consolidation

- Task ID: `M-004B1`
- Title: `Safe type-module bridge consolidation`
- Summary:
  - Replaced duplicated shared type definitions in internal types modules with re-export bridges from `types.ts`.
- Files changed:
  - `types/common.ts`
  - `types/tree.ts`
  - `types/visualization.ts`
- Architectural note:
  - `types.ts` remains the single source of truth for the consolidated shared types in this phase.
  - Runtime files were intentionally not modified.
- Types consolidated in this phase:
  - `ChartType`
  - `ExportType`
  - `UserProfile`
  - `DriveFile`
  - `Collaborator`
  - `TreeNode`
  - `FanArc`
- Verification:
  - `typecheck`: pass
- Notes:
  - `TreeSettings`, `ModalType`, `TreeLink`, and `AppNotification` were explicitly deferred.

## M-004B2A - TreeLink ownership reconciliation

- Task ID: `M-004B2A`
- Title: `TreeLink ownership reconciliation`
- Summary:
  - Resolved `TreeLink` ownership to `types.ts`.
  - Removed unused `sourceCoords` from the duplicate internal type surface.
  - Replaced the duplicate definition in `types/visualization.ts` with a re-export bridge.
- Files changed:
  - `types/visualization.ts`
- Final TreeLink shape:
  - `source`
  - `target`
  - `type`
  - `customOrigin?`
- Architectural note:
  - `types.ts` is now the single source of truth for `TreeLink`.
  - No runtime files were modified.
- Verification:
  - `typecheck`: pass
- Notes:
  - `sourceCoords` was removed because no runtime consumers were found.

## M-004B2B1 - ModalType runtime inventory reconciliation

- Task ID: `M-004B2B1`
- Title: `ModalType runtime inventory reconciliation`
- Summary:
  - Aligned `ModalType` with the real runtime modal inventory.
  - Added missing active modal keys.
  - Removed stale modal keys.
  - Synchronized `types.ts` and `types/common.ts`.
- Files changed:
  - `types.ts`
  - `types/common.ts`
- Final ModalType inventory:
  - `calculator`
  - `stats`
  - `chat`
  - `consistency`
  - `timeline`
  - `share`
  - `map`
  - `login`
  - `snapshotHistory`
  - `adminHub`
  - `globalSettings`
  - `migrationMap`
- Architectural note:
  - `ModalType` now reflects the authoritative runtime modal inventory.
  - No runtime logic files were modified.
- Verification:
  - `typecheck`: pass
- Notes:
  - `story` and `layoutSettings` were removed as stale keys.
  - This task reconciled inventory only and did not change modal behavior.

## M-004B2B2 - ModalType bridge consolidation

- Task ID: `M-004B2B2`
- Title: `ModalType bridge consolidation`
- Summary:
  - Removed duplicate `ModalType` ownership from `types/common.ts`.
  - Made `types.ts` the single source of truth for `ModalType`.
  - Replaced the duplicate definition with a re-export bridge.
- Files changed:
  - `types/common.ts`
- Architectural note:
  - `types.ts` is now the canonical owner of `ModalType`.
  - No runtime files or modal behavior were changed.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task followed inventory reconciliation from `M-004B2B1`.
  - Bridge consolidation was limited to the types layer only.

## M-004 - Shared Types Consolidation (COMPLETED)

- Summary:
  - Established `types.ts` as the single source of truth for shared types.
  - Removed duplicate type ownership across internal modules.
  - Consolidated low-risk shared types using bridge re-exports.
  - Reconciled `TreeLink` ownership and removed unused fields.
  - Reconciled `ModalType` against runtime inventory.
  - Converted `types/common.ts` into a bridge surface.
- Completed sub-tasks:
  - `M-004A`
  - `M-004B1`
  - `M-004B2A`
  - `M-004B2B1`
  - `M-004B2B2`
- Architectural result:
  - Clear type ownership boundaries.
  - Reduced drift between modules.
  - Safer future refactoring surface.
- Deferred:
  - `TreeSettings` consolidation moved to a future task due to runtime coupling.

## ChartType Migration Status Summary

- Migration objective:
  - Introduce a controlled, behavior-preserving migration path from raw legacy `ChartType` checks toward adapter-based runtime classification, without changing rendering behavior, fallback behavior, or the public type surface yet.
- Completed safe replacements by file:
  - `hooks/useFamilyTreeLayoutController.ts`
  - `components/FamilyTree.tsx`
  - `utils/layout.worker.ts`
  - `utils/treeLayout.ts`
- Adapter work completed:
  - Preserved existing adapter functions:
    - `getChartTypeTarget(chartType)`
    - `isLegacyFanChartType(chartType)`
    - `isLegacyFocusFamilyChartType(chartType)`
  - Added:
    - `ChartLayoutKind = 'descendant' | 'pedigree' | 'force' | 'radial'`
    - `getChartLayoutKind(chartType)`
  - Current adapter mapping:
    - `'descendant' -> 'descendant'`
    - `'pedigree' -> 'pedigree'`
    - `'force' -> 'force'`
    - `'fan' -> 'radial'`
- Files and areas intentionally not migrated:
  - `types.ts`
  - `types/tree.ts`
  - broader controller logic in `hooks/useFamilyTreeLayoutController.ts`
  - broader rendering logic in `components/FamilyTree.tsx`
  - routing structure in `utils/layout.worker.ts`
  - fallback behavior in `utils/treeLayout.ts`
- Current safe-limit status per file:
  - `hooks/useFamilyTreeLayoutController.ts`: safe isolated fan-related replacements complete; further migration remains blocked by meaningful `descendant`, `force`, and flag semantics
  - `components/FamilyTree.tsx`: safe isolated fan-related replacements complete; further migration remains blocked by behavior-sensitive prop wiring, flags, and pass-through state
  - `utils/layout.worker.ts`: safe isolated classification replacements complete for fan and force classification; routing branches remain intentionally unchanged
  - `utils/treeLayout.ts`: safe isolated classification replacements complete for descendant and pedigree branch checks; fallback remains intentionally unchanged
- Blocked areas:
  - narrowing `ChartType`
  - removing legacy `ChartType` values from the public type surface
  - changing fallback behavior in `utils/treeLayout.ts`
  - removing or consolidating force behavior
  - removing force-related settings fields
- Why blocked:
  - legacy `ChartType` values still remain in active runtime usage paths
  - fallback behavior is part of behavior preservation and was intentionally left unchanged
  - force semantics are still active runtime behavior and must not be collapsed prematurely
- Recommended next phase:
  - continue with a coordinated routing audit rather than more isolated substitutions
  - evaluate whether worker and tree layout routing can move from isolated classification replacement to controlled branch adoption while keeping fallback behavior unchanged
  - do not change `types.ts` yet
  - do not remove legacy `ChartType` values yet
- Current state summary:
  - adapter boundary is now established
  - multiple low-risk isolated classifications have been migrated successfully
  - fallback behavior remains intentionally unchanged
  - legacy `ChartType` values still remain in the type surface and runtime contract

### Fallback Semantic Contract

- In `utils/treeLayout.ts`, fallback is defined as a `non-pedigree compatibility route`.
- It is not a user-facing default layout.
- It is not equivalent to descendant identity.
- Current runtime behavior remains unchanged.
- `force` and `radial` may currently degrade through this route in `treeLayout.ts`, but this is compatibility behavior only, not architectural identity.
- After the explicit radial compatibility branch, fallback is now effectively reduced to force-only compatibility behavior for the current supported layout kinds.
- `descendant`, `pedigree`, and `radial` are now explicitly handled before fallback.
- `force` is now the only remaining unresolved compatibility-routed kind in `treeLayout.ts`.

### Radial Semantic Contract In TreeLayout

- In `utils/treeLayout.ts`, `radial` is defined as an explicitly recognized compatibility-routed layout kind.
- `radial` is not descendant identity.
- `radial` is not pedigree identity.
- `radial` is not yet a true explicit route in `treeLayout.ts`.
- `radial` currently resolves through the non-pedigree compatibility route.
- This is transitional compatibility behavior, not final architectural identity.

## Translation And UI Small Cast Cleanup

- Scope:
  - Removed low-risk translation casts from account menus, mobile account/actions, tree discussion HUD, timeline labels, geography labels, and smart persona map action.
  - Replaced broad `Record<string, string>` and `any` translation access with narrow local optional translation extensions.
  - Tightened the Paywall checkout catch boundary from `any` to `unknown`.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Deferred:
  - Renderer, gallery item, modal-routing, diagnostics window, and map library integration casts remain outside this small UI/translation package.

## Appearance Lab And Persona Translation Cast Cleanup

- Scope:
  - Removed the remaining small translation casts from Settings Drawer, Appearance Lab shell, Smart Persona bio events, and Smart Persona media upload labels.
  - Replaced Appearance Lab section props that required `Record<string, string>` with the stricter `SettingsTextOptions` contract.
  - Added explicit legacy optional labels for `names`, `photos`, and `dates` instead of allowing an open string dictionary.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Deferred:
  - Smart Persona gallery item shape casts remain a separate data-model cleanup task.
# 2026-06-14 - AI extraction output boundary hardening

- Added runtime sanitization for AI-extracted person profile data before Smart Fill updates application state.
- Restricted extraction output to the supported profile fields and accepted only valid string, gender, and boolean values.
- Added bounded lengths for names, dates, places, professions, and biographies.
- Rejected non-object extraction results and oversized AI proxy text responses.
- Added focused tests for unknown-field removal, invalid-type rejection, length limits, and explicit boolean values.

# 2026-06-14 - AI proxy structured operation boundaries

- Removed client-controlled free-form prompts from person extraction, family story, and image analysis proxy operations.
- Moved operation instructions into the server-side AI proxy and validated structured operation data before provider usage.
- Replaced family-tree UUIDs with request-local `P1`, `P2`, and related anonymized tokens before story generation.
- Added language, member-count, relation-token, image MIME, and operation-shape validation.
- Added tests proving legacy arbitrary prompts and real identifiers are rejected at the proxy boundary.
- Replaced provider and server exception messages in `500` responses with a stable public error while preserving detailed server-side logging.

# 2026-06-14 - Production CORS origin normalization

- Detected an encoded mojibake BOM prefix in the production `APP_ORIGIN` response header during deployment verification.
- Added a shared HTTP origin normalizer that removes BOM variants, validates HTTP(S), strips paths, and rejects credential-bearing URLs.
- Applied the normalizer to both AI Proxy and Paddle checkout CORS configuration.
- Added shared unit tests and endpoint-level regression coverage for polluted Vercel environment values.
- Kept checkout origin normalization local to the Node function after production verification exposed a Vercel invocation failure from the new shared import boundary.

# 2026-06-20 - Geography place normalization and migration route map

- Centralized person-place extraction across birth, death, burial, residence, address, marriage, custom events, and partner relationship places.
- Reused the same place extraction path for geocoding sync, map journeys, and data-integrity notifications so equivalent places resolve consistently instead of fragmenting by punctuation or spelling variants.
- Updated family statistics and consistency place grouping to use canonical place keys and display names.
- Reworked the geography modal into a unified map workspace with a side panel, search, route/person selection, and event/migration modes.
- Added true migration-route rendering by aggregating person journeys into curved map paths with route counts and selectable route details.
- Added focused coverage for centralized place extraction, migration link aggregation, route rendering, and geography modal route summaries.

Deferred geography improvements:

- Tune migration path visuals after wider use: smaller arrowheads, softer selected states, and better curve geometry for short routes.
- Add a map timeline filter as a separate package after route rendering stabilizes.
- Add person and branch filters later; branch filtering is intentionally deferred to avoid complicating the first route-map package.
- Consider route clustering or edge bundling if large trees produce too many overlapping paths.
- Consider route hover popups only if the side-panel details are not enough in real use.

# 2026-06-25 - Publishing renderer taxonomy direction

- Accepted ADR-006 to classify publishing renderers by output purpose rather than language or implementation detail.
- Family manuscripts and long-form book-like outputs should use the HTML/CSS document renderer, regardless of Arabic or English language.
- Posters, charts, certificates, and compact graphic exports remain under the vector/canvas/jsPDF-oriented renderer family.
- Current technical identifiers such as `html-print` and `vector-pdf` remain transitional until a contained naming cleanup is worthwhile.
- Deferred Markdown as a future manuscript content/interchange layer, not a substitute for the output renderer strategy.

# 2026-06-25 - Attached entities privacy audit

- Audited Sprint 14/15 privacy side channels around photos, gallery items, voice notes, discussions, storage object metadata, media tables, and exports.
- Confirmed `people_secure` masks attached person media fields for viewer access and viewer exports use masked people across JSON/GEDCOM/ICS/JOZOR/publishing paths.
- Added a Supabase migration to prevent viewer collaborators from listing tree-scoped avatar object metadata through `storage.objects`.
- Documented the remaining legacy public-bucket URL risk and deferred full private media/signed-URL migration to a separate package.

# 2026-06-25 - Supabase migration drift documented

- Detected linked Supabase migration-history drift while preparing to apply the attached-entities privacy migration.
- Kept the database unchanged and did not run `db push` or migration repair while remote-only migration versions are unresolved.
- Documented the safe reconciliation plan in `docs/supabase-migration-drift-2026-06-25.md`.

# 2026-06-25 - Supabase migration drift reconciled

- Fetched remote-only Sprint 14 privacy migrations into the repository so future clones match the linked migration history.
- Removed duplicate-version fetch artifacts that conflicted with existing local migration filenames.
- Applied the reviewed idempotent local reconciliation migrations and the attached-entities avatar metadata policy migration with `supabase db push --linked --include-all --yes`.
- Verified `supabase migration list --linked` is aligned through `20260625161646`.
- Verified linked privacy behavior with `npx vitest run --config vitest.integration.config.ts tests/integration/privacyDatabase.integration.test.ts`.

# 2026-06-25 - Markdown manuscript renderer kernel

- Added a Markdown renderer for `FamilyManuscriptModel` as Sprint 19A's content/interchange layer.
- Kept Markdown independent from the HTML/CSS print renderer and did not replace the active manuscript PDF/preview flow.
- Rendered person chapters, timeline entries, bibliography summaries, citation coverage, and optional technical metadata.
- Added tests for Markdown output, metadata omission, and Markdown control-character escaping.

# 2026-06-25 - Markdown manuscript export path

- Added a legacy export route for `markdown` that builds a `FamilyManuscriptModel` and downloads a `.md` manuscript.
- Reused viewer masking, relationship edges, sources, and citations so Markdown follows the same privacy and evidence boundaries as publishing.
- Added the Markdown export action to The Vault export list with English and Arabic labels.
- Added test coverage proving viewer Markdown exports use masked people and omit technical metadata.

# 2026-06-26 - Markdown manuscript layer ADR

- Accepted ADR-007 to define Markdown as a content/interchange projection generated from `FamilyManuscriptModel`.
- Kept HTML/CSS as the preferred print and preview renderer for long-form family manuscripts.
- Documented that Markdown must respect the same privacy, relationship-edge, source, and citation boundaries as the rest of publishing.
- Clarified that Markdown is not a Markdown-to-PDF replacement path, not a layout engine, and not a separate renderer family.

# 2026-06-26 - Renderer independence ADR

- Accepted ADR-008 to document that presentation is not publishing business logic.
- Kept `FamilyManuscriptModel` as the content source of truth and renderers as output projections.
- Added a small `HtmlManuscriptTheme` token object so current manuscript styling can change later without scattering design literals through renderer logic.
- Corrected mojibake Arabic strings in the HTML manuscript renderer test fixture and static labels.

# 2026-06-26 - Manuscript PDF output strategy ADR

- Accepted ADR-009 to treat manual browser printing as a transitional manuscript PDF path.
- Kept HTML/CSS as the canonical preview and print-layout renderer for long-form manuscripts.
- Documented Headless Chromium PDF generation as the preferred future professional export path.
- Added PDF technical checks to the manuscript manual review gate.
- Extracted the browser-print fallback behind `ManuscriptPdfExportService` so a controlled PDF renderer can replace it later without changing export orchestration.
- Switched export orchestration to the neutral `exportManuscriptPdf` entrypoint so the current browser-print mode remains replaceable.
- Centralized publishing renderer identifiers behind `PUBLISHING_EXPORT_RENDERERS` to keep technical route names out of export orchestration and UI code.

# 2026-06-26 - Manuscript preview configuration

- Extended the HTML manuscript preview flow with root-person selection and branch-depth configuration.
- Passed manuscript configuration through The Vault, the export hook, and `ManuscriptStructureBuilder`.
- Added a Manuscript Control Panel summary in The Vault so users can see the selected root, scope, and included sections before preview/export.
- Replaced the manuscript root dropdown with searchable root selection to keep large-family manuscript setup usable.
- Marked open manuscript previews as stale when settings change, prompting a refresh before exporting from the preview modal.
- Added a people-in-scope estimate to the Manuscript Control Panel summary so branch exports are easier to review before previewing.
- Added a narrative ordering engine for family manuscripts so people chapters follow the family reading path instead of alphabetical data order.
- Added manuscript ordering strategies for family path, chronological, and alphabetical reading modes, with The Vault passing the same strategy to preview and PDF export.
- Recorded manuscript reading-order metadata in `FamilyManuscriptModel`, export manifests, and export history entries for auditability.
- Added a custom manuscript ordering foundation so future manual ordering can pin selected people first while preserving the remaining family-path entries.
- Added relationship-aware family context labels to manuscript person entries so renderers can show root, spouse, generation, and related-entry cues.
- Added family-path breadcrumbs to manuscript person entries so readers can see each person’s route from the selected root.
- Added generation-depth limiting for branch manuscript models while preserving the full-branch option.
- Added coverage for configured preview options and depth-limited manuscript generation.
- Added an opt-in photo inclusion toggle for manuscript previews and HTML print output without making photos part of the default manuscript export.
- Added `docs/publishing-manuscript-manual-review.md` as the manual review gate before narrative generation or final publishing design polish.
- Added a standalone preview-window action for long manuscript review without changing the export renderer.

# 2026-06-26 - Narrative generation kernel

- Added a deterministic `NarrativeDraftBuilder` for Sprint 18B as a conservative narrative kernel with no AI dependency.
- Added opt-in manuscript narrative drafts to the preview/export options.
- Rendered narrative drafts in HTML and Markdown manuscript outputs only when enabled.
- Kept narrative generation downstream of `FamilyManuscriptModel` so renderers remain presentation layers.
- Suppressed repetitive empty narrative drafts for fully masked private entries by default.
- Localized deterministic narrative drafts for Arabic manuscripts and removed mojibake strings from the HTML manuscript renderer.
- Localized manuscript titles, chapter titles, fact labels, and birth/death timeline event labels at the model layer.
