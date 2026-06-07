# TypeScript Hygiene Inventory - 2026-06-07

This inventory tracks remaining production `any` and broad-cast usage after the low-risk service cleanup.

## Current State

- `noUnusedLocals` and `noUnusedParameters` are already enabled in `tsconfig.json`.
- The 2026-06-07 service cleanup removed low-risk casts from:
  - `src/services/supabaseStorageService.ts`
  - `src/services/supabaseTreeMutationService.ts`
  - `src/services/google/GoogleMediaService.ts`
  - `src/services/supabaseClient.ts`
- The remaining casts are not equivalent in risk. They should be handled in small batches by ownership area.

## Recommended Cleanup Order

### 1. Translation access casts

Examples:

- `src/components/NodeContextMenu.tsx`
- `src/components/tree/TreeHUD.tsx`
- `src/features/discussions/components/TreeDiscussionDrawer.tsx`
- `src/features/smart-persona/components/persona/*`
- `src/features/diagnostics/components/DiagnosticsPanels.tsx`

Risk: low to medium.

Recommended approach:

- Add typed translation keys where the UI already depends on stable labels.
- Prefer local narrow helper types over broad `Record<string, string>` casts.
- Keep fallback strings during the transition.

### 2. Discussion feature data shapes

Examples:

- `src/features/discussions/store/discussionSlice.ts`
- `src/features/discussions/services/treeDiscussionService.ts`
- `src/features/discussions/hooks/useTreeDiscussion.ts`
- `src/features/discussions/components/TreeDiscussionDrawer.tsx`

Risk: medium.

Recommended approach:

- Define explicit `DiscussionMessage`, `DiscussionCollaborator`, and `DiscussionPresenceUser` types.
- Type Supabase realtime payloads at the boundary.
- Add focused tests before removing casts.

### 3. Rendering and layout boundary casts

Examples:

- `src/components/tree/FamilyTreeCanvas.tsx`
- `src/components/tree/FamilyTree.tsx`
- `src/components/tree/FamilyTreeChartRenderer.tsx`
- `src/hooks/tree/useV3RendererPipeline.ts`
- `src/utils/layout/focusLayout.ts`

Risk: high.

Recommended approach:

- Do not clean opportunistically.
- First define the renderer layout contract shared by worker/controller/view.
- Keep current runtime rendering guard tests passing before and after changes.

### 4. Sync and store integration casts

Examples:

- `src/store/slices/familySlice.ts`
- `src/hooks/ui/coordinators/useUIOverlayCoordinator.ts`
- `src/hooks/ui/coordinators/useTreeCoordinator.ts`
- `src/services/sync/BackgroundTreePersistence.ts`

Risk: high.

Recommended approach:

- Pair with domain reducer and sync projection work.
- Avoid isolated cast removal that changes Zustand selector or queue behavior.

### 5. API boundary casts

Examples:

- `src/api/ai-proxy.ts`

Risk: medium.

Recommended approach:

- Introduce a narrow Supabase admin client adapter type.
- Replace catch parameters with `unknown` plus safe error formatting.
- Keep existing billing and rate-limit tests passing.

## Guardrail

Do not enable additional strict TypeScript flags until each batch passes:

- `npx tsc --noEmit --pretty false`
- Relevant focused tests
- Production build for UI-facing changes

