# Jozor 2.0.0

Jozor is a modern family-tree application for building, exploring, collaborating on, and preserving rich family archives. It combines an interactive graph renderer, structured person details, realtime collaboration, local-first persistence, cloud synchronization, media archives, and an assistant-driven search and command experience.

The project is a React 19 + TypeScript + Vite application backed by Supabase. Optional integrations support Google Drive backups and AI-assisted command planning through controlled backend endpoints.

## Product Scope

Jozor helps families:

- Build family trees with parents, children, partners, relatives, and reference-aware graph rendering.
- Explore large trees through an interactive canvas, zoom controls, details panels, and alternate chart views.
- Maintain detailed person profiles with identity, biography, relationships, media, sources, places, and notes.
- Search people and family data using Arabic/English-aware parsing and confidence-ranked results.
- Use Kindi, the in-app assistant, for conversational search and guarded tree commands.
- Collaborate through shared trees, invitations, roles, notifications, discussions, and activity history.
- Preserve archives through The Vault, snapshots, imports, exports, media handling, and backups.
- Synchronize work through a delta-based sync pipeline with local-first behavior.

## Architecture

Jozor now follows a feature-based architecture. Shared primitives remain in top-level folders, while large product areas live in self-contained modules under `src/features`.

```text
src/
  api/          Local and serverless API handlers
  commands/     User-facing mutation commands
  components/   Shared UI, app shell, header, icons, tree primitives
  context/      App-level React contexts
  domain/       Pure family-tree domain and graph logic
  features/     Product features with their own UI, hooks, logic, services, tests
  hooks/        App orchestration hooks
  services/     Shared platform services: Supabase, sync, search, storage, AI, notifications
  store/        Zustand store and slices
  types/        Shared TypeScript types
  utils/        General utilities, translations, layout helpers
```

Current feature modules:

```text
src/features/
  activity-log
  diagnostics
  discussions
  drive-file-manager
  geography
  kindi
  landing
  settings
  sharing
  smart-persona
  statistics
  the-vault
  tree-control
  tree-manager
```

Each feature should expose its public surface through `index.ts`. Cross-feature imports should use that public API unless there is a deliberate low-level service exception.

## Key Systems

### Kindi Assistant

Kindi lives in `src/features/kindi` and is split into:

- `components/`: overlay, trigger, confidence UI.
- `hooks/`: controller, messages, search flow, execution flow, command planning, AI planning, voice input.
- `logic/`: intent routing, lexicon, privacy redaction, locale strings, learning traces, executive planning.
- `services/`: AI planning and learning-log helpers.

Kindi is designed as a guarded command interface. It can search, ask for clarification, show confirmation cards, execute approved actions, and fall back to optional AI planning without giving AI direct authority over database IDs.

### Discussions

The discussions feature provides tree-scoped family conversations with:

- realtime message loading and subscription
- reply support
- online member indicators
- message deletion rules
- local search across loaded messages
- length validation and server-side migration constraints

### Sync and Persistence

Core tree changes flow through command objects and delta sync services. The app uses local-first storage and a queue-backed remote sync model so user work can survive reloads and transient connectivity issues.

### Supabase

Supabase is used for authentication, relational data, realtime updates, invitations, collaboration, learning logs, discussions, storage metadata, and sync projection.

Database migrations live in:

```text
supabase/migrations/
```

Keep service-role keys and provider secrets out of frontend code. Use environment files locally and deployment secret stores in hosted environments.

## Local Development

### Requirements

- Node.js 20.x
- npm
- A configured Supabase project for cloud-backed flows
- Optional Google/Gemini credentials for Drive and AI-assisted features

### Install

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill only the values needed for your local setup. Never commit secrets, API keys, access tokens, or service-role credentials.

### Run

```bash
npm run dev
```

## Scripts

```bash
npm run dev              # Start Vite development server
npm run build            # Build production assets
npm run preview          # Preview the production build
npm run typecheck        # Run TypeScript checks
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with autofix
npm run test             # Run Vitest tests
npm run test:e2e         # Run Playwright tests
npm run test:e2e:smoke   # Run the smoke E2E suite
```

Useful focused suites:

```bash
npm run test:shared-tree:unit
npm run test:shared-tree:smoke
npm run test:telemetry
npm run test:e2e:collab:live
```

The live collaboration suite requires test accounts configured through local environment variables.

## Quality Gates

Before merging meaningful changes, run:

```bash
npm run typecheck
npm run test
npm run build
```

For UI-heavy or interaction-heavy changes, also run:

```bash
npm run test:e2e:smoke
```

For database changes:

```bash
npx supabase db push --dry-run --linked
```

Then apply intentionally:

```bash
npx supabase db push --linked --yes
```

## Security and Privacy

- Do not expose service-role keys or provider secrets to the browser.
- Route AI/provider calls through controlled backend or dev proxy endpoints.
- Keep AI planning privacy-preserving: redact names before external planning when possible, then resolve identities locally.
- Treat RLS policies, security-definer functions, storage policies, and migrations as security-sensitive code.
- Keep legacy or archived code outside active product paths unless intentionally restoring it.

## Repository Hygiene

- Shared UI belongs in `src/components`.
- Feature-specific UI, hooks, logic, and tests belong in `src/features/<feature>`.
- Large modals, drawers, and panels should be owned by a feature rather than placed in the shared component layer.
- Tests should generally live near the code they verify, usually in `__tests__`.
- Generated output, temporary logs, local reports, and build artifacts should stay out of version control.

## Documentation

Operational notes and architecture references live in `docs/`.

When evolving the architecture, prefer focused migrations with type checks and tests over broad reshuffles. Keep feature boundaries explicit, public APIs small, and data ownership clear.
