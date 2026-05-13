# Jozor

Jozor is a modern family-tree application for building, exploring, and preserving rich family archives. It combines an interactive tree renderer, structured person profiles, collaboration workflows, local-first persistence, cloud synchronization, and multilingual UI support.

The project is a React + TypeScript application backed by Supabase, with optional Google Drive integrations for backups and archive workflows.

## What Jozor Does

- Build and edit family trees with people, partners, parents, children, and relationship links.
- Render large family graphs with the V3 tree renderer and supporting chart modes.
- Open detailed person profiles with biography, contact, media, relationships, notes, and contextual actions.
- Search people using a multilingual intent-aware search pipeline.
- Manage trees, backups, imports, collaboration, and settings through The Vault and management surfaces.
- Support shared trees, invitations, roles, and realtime collaboration notifications.
- Preserve work locally and synchronize changes through a delta-based sync pipeline.
- Provide Arabic and English UI resources with dynamic locale loading.

## Architecture Overview

The codebase follows a layered architecture with feature-oriented islands where it improves maintainability.

```text
src/
  api/          Local/API handlers used by serverless and dev flows
  commands/     User-facing mutation commands for tree operations
  components/   React UI, drawers, modals, renderers, header, vault, sidebar
  context/      App-level React contexts such as translation and overlays
  domain/       Pure family-tree domain logic and layout semantics
  hooks/        Orchestration hooks connecting UI, store, services, and routing
  services/     Supabase, sync, Google Drive, search, storage, notifications
  store/        Zustand stores and slices
  types/        Shared TypeScript domain, state, and UI types
  utils/        General utilities, translations, layout helpers
```

Supporting folders:

```text
docs/            Operational notes, runbooks, and architecture references
scripts/         Developer and maintenance scripts
supabase/        Migrations, diagnostics, and edge functions
tests/e2e/       Playwright end-to-end tests
legacy_archive/ Archived legacy code kept outside the production source tree
public/          Static public assets
```

## Key Technical Patterns

- **Delta Sync as the mutation backbone**: core tree changes flow through delta operations and a sync queue.
- **Sovereign client access**: Supabase access is centralized through registry/client helpers rather than scattered client construction.
- **Local-first behavior**: browser storage and offline cache layers protect user work during connectivity changes.
- **Lazy-loaded heavy surfaces**: large modals, drawers, export tools, maps, and secondary panels are split from the initial bundle where practical.
- **Domain isolation**: family graph semantics and layout rules live in `src/domain` and are tested independently.
- **Feature shells**: larger UI areas such as The Vault, Header, Sidebar, Tree Control, and Modals are split into subcomponents and controller hooks.

## Prerequisites

- Node.js 20.x
- npm
- A configured Supabase project for cloud-backed development
- Optional Google Cloud OAuth credentials for Google Drive features

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Fill only the values required for your local environment. Do not commit secrets, access tokens, service-role keys, or private credentials.

Start the development server:

```bash
npm run dev
```

## Available Scripts

```bash
npm run dev              # Start Vite dev server
npm run build            # Build production assets
npm run preview          # Preview production build locally
npm run typecheck        # Run TypeScript checks
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with autofix
npm run test             # Run unit/integration tests
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:smoke   # Run the smoke E2E suite
```

## Quality Gates

Before opening a pull request, run:

```bash
npm run typecheck
npm run test
npm run build
```

For UI-heavy changes, also run:

```bash
npm run test:e2e:smoke
```

The repository includes tests across:

- domain graph semantics
- sync queue and remote sync behavior
- search parsing and inference
- store slices and orchestration hooks
- major UI surfaces and interaction flows
- API and development proxy handlers

## Supabase

Database migrations live in:

```text
supabase/migrations/
```

Useful operational references:

- [Supabase bootstrap runbook](docs/supabase-bootstrap-runbook.md)
- [Supabase migration history repair](docs/supabase-migration-history-repair.md)
- [Release readiness checklist](docs/release-readiness-checklist.md)

Never place Supabase service-role keys or private database credentials in frontend code.

## E2E Collaboration Testing

The live collaboration suite requires real test accounts configured through environment variables:

```text
E2E_OWNER_EMAIL
E2E_OWNER_PASSWORD
E2E_EDITOR_EMAIL
E2E_EDITOR_PASSWORD
```

Run:

```bash
npm run test:e2e:collab:live
```

This verifies shared-tree access, role transitions, editor permissions, and persistence after reload.

## Security Notes

- Keep secrets in local environment files or deployment secret stores only.
- Do not expose provider API keys directly in browser code.
- Route AI/provider calls through controlled backend or serverless endpoints.
- Treat database migrations and security-definer functions as security-sensitive changes.
- Keep archived legacy code outside `src` unless intentionally restoring a path.

## Project Maintenance

- Maintenance-only scripts belong in `scripts/maintenance`.
- Generated logs, reports, build outputs, and temporary files should stay out of version control.
- Legacy code should remain under `legacy_archive` until intentionally removed or restored.
- New tests should generally live in a nearby `__tests__` folder for consistency.

## Documentation

Additional project notes and operational guides are available in `docs/`.

For architecture changes, prefer small focused refactors with tests over broad folder reshuffles.
