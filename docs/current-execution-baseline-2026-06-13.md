# Current Execution Baseline - 2026-06-13

This document supersedes stale implementation assumptions in older audit and
roadmap documents. It records the current verified state before starting the
next development track.

## Completed Tracks

### Quality and React stabilization

- ESLint completes with zero warnings and zero errors.
- `npm run lint` enforces `--max-warnings 0`.
- React Hooks compiler rules are enabled, including refs, effect state updates,
  purity, and manual memoization preservation.
- The few inline suppressions are narrow, documented, and attached to intentional
  event-time or committed-cache behavior.

### TypeScript hygiene

- Frontend and root Vercel API typechecks pass.
- Production explicit `any` cleanup is complete under the current lint scope.
- Discussions, translation access, rendering boundaries, sync integration, and
  API handlers have typed contracts.

### Kindi parser architecture

- `kindiExecutivePlanner.ts` is now a small orchestration surface rather than the
  former multi-responsibility parser.
- Name, add, update, delete, and target resolution logic live in focused parser
  modules with dedicated tests.
- The current planner file is approximately 118 lines, so the old 643-line
  refactor item is complete.

### Chart type normalization

- The public `ChartType` contract is limited to `focus | radial`.
- Legacy persisted values such as `descendant` and `force` normalize to `focus`.
- Store hydration and settings updates apply normalization, with regression tests.

### Rendering and layout

- The worker-backed V3 layout pipeline is active.
- Viewport culling, throttled viewport state, cached edge bounds, and runtime
  rendering diagnostics are implemented.
- LOD is restricted to large trees and very distant zoom levels to preserve the
  normal small-tree experience.
- Layout and renderer guard tests are present.

### Sync projection and replay

- Pending local operations are projected over confirmed state.
- Incoming remote operations and refresh flows replay pending work.
- Checkpoint loading and trailing operation replay are covered by tests.
- Conflict-resolution migrations and collaboration permission corrections are
  already part of the deployed path.

## Verified Baseline

The following checks passed on 2026-06-13:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:api`
- `npm run build`
- Unit shard 1: 370 passed, 8 intentionally skipped
- Unit shard 2: 404 passed
- Production root and deep-link refresh smoke checks on Vercel

## Remaining Work, In Priority Order

### 1. AI boundary hardening (started)

Audit Kindi cloud planning and the AI proxy as one trust boundary:

- validate request shape before provider invocation;
- validate structured provider output before converting it to a draft;
- reject unknown actions, fields, and oversized payloads;
- preserve redaction and prohibit executable IDs from leaving the trusted layer;
- add adversarial tests for malformed, injected, or partially valid responses.

The first batch now validates Kindi request size and shape before quota
reservation, rejects internal identifiers, constrains provider text fields,
rejects invented redaction tokens, and prevents non-executable categories from
carrying executable drafts.

This is the recommended next track because it improves security and correctness
without changing the local parser or enabling automatic rule injection.

### 2. Production observability budgets

- define actionable thresholds for bootstrap, sync, rendering, and AI fallback;
- avoid collecting raw family data or raw queries;
- add owner/admin summaries only where they support a concrete operational action.

### 3. Focused orchestration cleanup

Continue only when a coordinator has a measurable ownership problem. Avoid broad
renaming or extraction work while the current coordinator tests remain stable.

### 4. Supabase SECURITY DEFINER redesign

Keep this as a separate database-security track with explicit migration and
rollback plans. Do not mix it with UI, rendering, or AI work.

## Deferred

- Automatic cloud rule injection or self-modifying Kindi behavior.
- Canvas/WebGL rendering without evidence that the current SVG path misses an
  agreed performance budget.
- Broad rewrites of sync, state management, or orchestration.
