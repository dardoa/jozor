# Jozor Full Product UX, UI, and Engineering Audit

Date: 2026-09-02
Scope: signed-in owner experience, the active family tree, The Vault, publishing, supporting tools, public information pages, runtime code, build output, and automated quality gates.

## Executive verdict

Jozor has a strong functional foundation and unusually mature automated coverage around permissions, publishing geometry, privacy, responsive behavior, and export artifacts. The application is not in need of a wholesale rewrite. Its main weakness is that product growth has outpaced interaction architecture and content consistency: the core tree camera is unreliable on a real large tree, several secondary surfaces are only partially localized, one sharing workflow promises behavior its route cannot provide, and the geographic map currently fails visually.

Recommended release status: **the audited in-app beta blockers are closed**. Beta readiness now depends on the separate production-integration certification boundary described at the end of this report, rather than a known local UX or architecture blocker. The Visual Publishing Studio is technically ready for continued owner testing.

## Beta-blocker closure

The three P0 findings above were resolved in the current working tree on 2026-09-02:

1. **Sharing contract:** canonical member links and invitation links now come from a typed sharing service. `/tree/{treeId}` is consistently described as an authorized-member address that grants no access, while tracked invitations continue to use `/shared/{inviteToken}`. UI callers no longer assemble these URLs independently.
2. **Geographic map:** the map now uses a validated, configurable tile-provider contract with the official OpenStreetMap endpoint as the no-key default. The place-label toggle appears only when a real overlay is configured, and repeated tile failures surface a localized fallback without hiding the journey list or routes.
3. **Tree camera:** Reset and Fit now have separate contracts. Initial and reset views center the selected person at a readable 85% zoom; Fit measures rendered card or radial-arc bounds and provides the whole-tree overview. The fixed fan radius and 10% non-fan clamp were removed.

Verification evidence:

- Live owner tree: initial/reset `85%`; Fit `9%`; Reset returns to `85%`.
- Live map: official OpenStreetMap tile URLs loaded with zero incomplete tiles, visible attribution, no `API KEY REQUIRED` text, and no fallback alert.
- Unit and integration suites: shard 1 `933/933`; shard 2 `941/941`; total `1,874/1,874` passed.
- Browser smoke: `15` passed, `1` environment-gated skip; V3 render runtime: `1/1` passed.
- Production build, TypeScript, full ESLint, and `git diff --check`: passed.

One visual-invariant test remains intentionally skipped because it reads a private absolute desktop path (`C:/Users/dardoa/Desktop/tree.json`) and is not portable. Its camera-fit purpose is now covered by a deterministic 90-person repository fixture; the portable cluster-layout suite was re-enabled and passes `9/9`.

## Arabic and interaction closure

The audited Arabic and accessibility gaps in Kindi, discussions, person details, relationship insights, media states, and synchronization were closed in the current working tree:

1. Required typed translation groups now own the discussion and Kindi shell copy. Components no longer define optional local translation contracts or fall back to English in Arabic runtime.
2. Discussion close, search, reply, delete, cancel-reply, input, and send controls have localized accessible names. Message actions remain visible on touch layouts and reveal through `focus-within` on larger screens.
3. The discussion drawer uses `w-full max-w-[400px]`, so the 400px desktop target no longer overflows a 390px viewport.
4. Person drawer, quick actions, map action, active relationship status, contextual age insights, loading/error states, media guest states, and death-detail controls now consume required translations.
5. Synchronization headings, diagnostic labels, recovery actions, and relative dates use the active translation and date locale instead of English fallback copy.

Evidence:

- Live signed-in Arabic tree: Kindi dialog, person links tab, and discussion dialog expose Arabic visible text and accessible names with no audited English sentinels.
- Feature suites: discussions, Kindi, and Smart Persona `136/136` passed.
- Focused accessibility/localization tests: Kindi shell `9/9`, discussion item `3/3`, discussion drawer `1/1`, Smart Persona `1/1`, synchronization tooltip `3/3`.
- Scoped ESLint: zero warnings; TypeScript: passed.

This closes the concrete P1 examples listed below. A separate app-wide content review is still appropriate for domain-generated messages and external-service error payloads.

## Workflow clarity closure

All four Phase 2 workflow findings were closed in the current working tree:

1. The former “Data health” percentage is now presented as **Structural Integrity / السلامة البنيوية** everywhere audited. Supporting copy explains that it measures relationship and timeline consistency, while completeness and citation coverage remain separate metrics. The domain formula and publication manifest contract were intentionally preserved.
2. The consistency checker now offers localized issue messages, person/issue search, severity and category filters, stable severity/category/ID ordering, a current-result count, and batches of 40 issue rows. Opening a person remains the correction action; when the source data is corrected, reevaluation removes the issue automatically.
3. The family timeline now supports search across people, related people, places, and event text. It renders 50 events per batch while retaining chronological year groups, filter state, person/family scope, and stable date ordering.
4. Synchronization presentation now derives four independent facts: tree-database state, local pending queue, Google Drive connection, and linked backup-file state. An idle Drive adapter no longer implies that a backup exists. The tooltip exposes one state-derived next action, and its Vault action opens the Cloud Backup section directly.
5. Help now documents the active Focus, Radial, Fit, Reset, sharing, publishing, and backup workflows. Each help topic carries a stable topic, route, and control identifier so future product changes can audit documentation drift.
6. Vault tree management now uses locale-explicit absolute dates with relative context and disambiguates duplicate names. Export history explains what creates a record when it is empty and uses Structural Integrity terminology when records exist.

Live evidence on the signed-in 90-person Arabic tree:

- Structural Integrity displays `100%` alongside the separate completeness/source explanation, eliminating the previous semantic contradiction.
- The consistency checker initially reports `40 of 397` current issues; searching for `رمضان` narrows it to `18 of 18`, with localized Arabic issue text and no audited English issue-message leak.
- The timeline initially reports `50 of 82` events; searching for `رمضان` narrows it to `3 of 3` and removes unrelated people from the rendered list.
- The signed-in account has no Drive connection, and the status surface now reports database `connected`, queue `clear`, Drive `not connected`, and backup file `not connected`, with one action: open backup settings. That action opens the Cloud Backup section and closes the floating status panel.
- The Arabic Help Center exposes six auditable current-workflow topics and contains no obsolete Descendant/Pedigree instruction.
- Vault tree management labels duplicate names as `#1/2` and `#2/2`, renders dates such as `01/04/2026 · 5 months ago` through the active locale, and the empty export-history tab explains which poster and publication actions create records.
- Statistics and activity-log feature suites: `21/21` passed; focused workflow tests: `4/4`; TypeScript and scoped ESLint: passed.

## Publishing completion closure

The three Phase 3 publishing items are now verified:

1. Family Book is controlled-PDF-first. The authenticated serverless Chromium endpoint embeds supported Arabic fonts and images, blocks external resources, returns a signature-checked PDF blob, and retains browser print only as an explicit fallback when readiness fails.
2. A blocked single-sheet poster now offers direct, reversible preview actions: use Dense Genealogy, try A0 landscape, create a Branch Collection, or create a Tiled Wall. The actions never start a download by themselves.
3. The Studio passed the current responsive evidence matrix, including `1280x720` and `390x844`. At short desktop height the preview remains the dominant surface with a compact print dock; on mobile the preview, print state, recovery actions, and contextual settings remain reachable without horizontal overflow.

Evidence:

- Family Book controlled-PDF services, API boundary, asset embedding, readiness, and export-hook suites: `57/57` passed.
- Visual Studio direct-recovery component and integration suites: `62/62` passed.
- Responsive Playwright matrix: `10/10` passed, including large-tree blocked guidance at tablet and mobile widths.
- Live owner tree: Full Tree + A4 reported `Print blocked`; both direct package actions appeared, and `Create tiled wall` opened the tile grid and controls without emitting a download.

## Engineering efficiency closure

The three Phase 4 engineering findings were closed incrementally without rewriting proven engines:

1. Mixed static/dynamic ownership of `supabaseTreeReadService`, `deltaSyncService`, and `syncUtils` was removed. The production build no longer emits the corresponding ineffective-code-split warnings.
2. `AppLayout` is now a lazy route shell. The main entry moved from `1,048.89 kB / 339.40 kB gzip` to `925.84 kB / 303.37 kB gzip`, with an independent `AppLayout` chunk of `113.05 kB / 34.04 kB gzip`.
3. Vite now enforces a hard entry budget of `950 KiB` raw and `315 KiB` gzip. A regression fails the build rather than producing an advisory warning.
4. Poster-scene evaluation was extracted from the large Studio runtime hook into a pure evaluator shared by Tiered, Focus, and Radial paths. Layout and export behavior remained unchanged, and the complete Studio suite passed `98/98`.
5. Paddle evidence is now split into a deterministic mocked checkout-contract test and an explicitly environment-gated live Sandbox test. Missing live credentials produce a reported skip, never a silent pass.

Evidence:

- Production build: passed with the enforced entry budget and no mixed-import warnings.
- App lazy-shell tests: `7/7` passed; synchronization import-ownership tests: `18/18` passed.
- Deterministic Paddle checkout: `1/1` passed; live Sandbox: `1` explicitly skipped because `PADDLE_LIVE_E2E` was not enabled.
- TypeScript and full scoped ESLint: passed with zero errors or warnings.

## Findings

### P0. The advertised public sharing link is a protected owner route

The Members and sharing surfaces describe the copied URL as a quick public viewing link, but all three implementations construct `/tree/{treeId}`. That route is wrapped in `ProtectedRoute`; the tokenized invitation route is `/shared/{shareToken}`. A recipient who is not already authenticated and authorized does not receive the promised public view.

Evidence:

- `src/features/sharing/components/share/useShareModalState.ts:28-31`
- `src/features/settings/components/accessControl/useAccessControlState.ts:42-45`
- `src/features/the-vault/components/CollaborationPanel.tsx:20-21`
- `src/components/app/AppRoutes.tsx:67-78`
- Misleading Arabic copy: `src/utils/translations/ar/general.ts:658`

Required resolution: define one explicit product contract. Either remove “public” language and label the URL as an authenticated canonical link, or implement a revocable, scoped public-view token with its own route, privacy policy, expiration, audit trail, and tests. Do not expose a raw tree ID as a substitute for a public token.

### P0. Geographic Journey is visually unusable with the current tile source

The live modal displayed repeated diagonal `API KEY REQUIRED` tiles. The runtime hardcodes two CARTO endpoints and has no tile-error fallback, health state, or alternate provider. The current unit test mocks those exact URLs, so it verifies wiring rather than provider availability.

Evidence:

- `src/features/geography/components/geography/MapViewImpl.tsx:70-82`
- `src/features/geography/components/__tests__/GeographicJourneyModal.test.tsx:45-47`

Required resolution: move the tile provider into validated configuration, confirm the production terms and credentials, add a provider-independent fallback, and add a browser assertion that sampled map pixels do not contain an error tile. The modal should render a useful non-map journey list if tiles fail.

### P0. The primary tree opens at an unreadable scale and Reset is identical to Fit

On the real 90-person tree, Focus opened at 10% with a large empty area and unreadable nodes. Switching to Radial retained an unusable scale until several manual zoom operations. Reset and Fit both call the same function with the same arguments. Fan fitting assumes a fixed radius of 900 rather than measuring rendered bounds, while non-fan fitting clamps to 10%, which is technically valid but not usable.

The tree surface also measured `scrollWidth = 11279` at a 1280px viewport while overflow was hidden. This does not expose a visible scrollbar, but it is evidence that the transformed graph retains a huge intrinsic layout footprint.

Evidence:

- Fixed-radius fan fit: `src/hooks/tree/useTreeInteraction.ts:202-215`
- Identical actions: `src/hooks/tree/useTreeInteraction.ts:301-302`
- Large graph bounds: `src/components/charts/V3FamilyGraphRenderer.tsx:668-729`
- Hidden canvas overflow: `src/components/tree/FamilyTreeCanvas.tsx:120-147`
- Core cluster layout tests are disabled: `src/domain/__tests__/familyGraphClusterLayout.test.ts:185`, `:302`
- Visual invariants are disabled: `src/domain/__tests__/familyGraphClusterLayout.visual.test.ts:45`

Required resolution: introduce one measured camera contract shared by Focus and Radial. `Fit` should calculate the visible graph bounds and safe UI insets; `Reset` should return to a documented default focus and zoom. Add real-tree viewport fixtures and enable the disabled geometry tests before tuning aesthetics.

### P1. Arabic mode is not consistently localized

Status: **resolved for the audited UI surfaces on 2026-09-02**. Domain-generated and external-service messages remain part of the later production-integration review.

The audit found English labels and fallbacks across Kindi, discussions, person details, geography, synchronization, and integrity messages. This is not isolated copy polish: some English strings are accessible names and therefore form part of the interaction contract.

Examples:

- Kindi labels and placeholder: `src/features/kindi/components/KindiOverlay.tsx:378`, `:388`, `:537`
- Discussion translation contract is optional and falls back to English: `src/features/discussions/components/TreeDiscussionDrawer.tsx:28-43`, `:182-204`
- Reply/Delete controls: `src/features/discussions/components/TreeDiscussionItem.tsx:80-94`, `:126-140`
- Person drawer accessible name: `src/features/smart-persona/components/SmartPersonaDrawer.tsx:96-98`
- Quick Actions and View on Map: `src/features/smart-persona/components/persona/PersonHeaderView.tsx:204-237`
- Contextual insight labels: `src/features/smart-persona/components/tabs/LinksTab.tsx:49-65`, `:102-121`
- Active status: `src/features/smart-persona/components/persona/FamilyMemberItem.tsx:47-53`
- Sync headings: `src/components/SyncStatusTooltip.tsx:93`, `:107`
- Incorrect Arabic plural: `src/utils/translations/ar/personDetails.ts:69`

Required resolution: remove runtime English fallbacks from user-facing feature components, make translation groups required and typed, and add an Arabic smoke test that scans visible text and accessible names for known fallback sentinels.

### P1. Discussion actions are not keyboard-complete or screen-reader-complete

Status: **resolved on 2026-09-02** with localized names, touch visibility, `focus-within`, and dedicated component coverage.

The drawer close, cancel-reply, and send icon buttons do not have explicit accessible names. Reply and Delete rely on `title`, and their controls are hidden with hover-only opacity. This is fragile for keyboard, touch, and assistive technology users.

Evidence:

- `src/features/discussions/components/TreeDiscussionDrawer.tsx:200-205`, `:323-328`, `:332-350`
- `src/features/discussions/components/TreeDiscussionItem.tsx:77-97`, `:124-143`

Required resolution: provide translated `aria-label` values, expose actions on `focus-within`, preserve visible touch actions on coarse pointers, and add a dedicated discussion accessibility E2E test.

### P1. “Data health 100%” can coexist with 38% completeness and 0% citations

Status: **Resolved in the current working tree.** The visible score is now named Structural Integrity, and its scope is explained beside the separate completeness and citation metrics.

This is internally consistent in code because the health score penalizes only ERROR and WARNING severity; completeness and citation coverage are reported separately. It is not semantically clear to users. On the audited tree, the dashboard showed 100% health while also showing hundreds of missing-information issues.

Evidence:

- Score formula: `src/domain/dataIntegrity.ts:160-169`
- Separate metrics: `src/domain/dataIntegrity.ts:512-517`
- English issue construction in the domain layer: `src/domain/dataIntegrity.ts:235-260`, `:470-492`
- The behavior is explicitly accepted in tests: `src/domain/__tests__/dataIntegrity.test.ts:156-158`

Required resolution: rename the score to “Structural integrity” and reserve “Data health” for a composite score, or define a transparent weighted composite. Return issue codes plus parameters from the domain and localize messages in the presentation layer.

### P1. Family Book PDF remains a browser-print workflow

Status: **Resolved before this audit and reverified on 2026-09-02.** The local development environment truthfully reported the disabled-feature fallback, but the application path is controlled-PDF-first and the authenticated embedded-Chromium production renderer has already passed synthetic and owner-manuscript review.

The Family Book surface openly warns that browser headers, dates, and `about:blank` can appear and that the controlled PDF path is not complete. This is an honest state, but it is below the print-first standard achieved by the poster engine.

Required resolution: route Family Book through the controlled manuscript PDF service, make the browser-print action an explicitly labeled fallback, and add physical page-size, Arabic font embedding, blank-page, and artifact-parity tests.

### P1. Large operational lists need search, triage, and virtualization

Status: **Resolved for the audited integrity and timeline surfaces.** Both lists now support search and bounded batch rendering; the integrity workflow additionally supports severity/category triage and data-driven completion through reevaluation.

The timeline and integrity center render long, continuous lists. The audited tree produced 397 integrity issues. Timeline filtering exists, but there is no person/text search, paging, or virtualization. This will become a usability and rendering problem as trees grow.

Evidence:

- Timeline maps all grouped events: `src/features/activity-log/components/TimelineModal.tsx:190-196`, `:276-283`
- Integrity center maps all visible issues: `src/features/statistics/components/StatisticsDashboard.tsx:148-210`

Required resolution: add search, actionable categories, “show unresolved only”, stable sorting, and windowed rendering. Treat issue correction as a workflow with navigation and completion state rather than a report dump.

### P1. Production bundle boundaries are not working as intended

Status: **Resolved in the current working tree.** Mixed import ownership was removed, `AppLayout` was split from the entry, and a failing production budget now guards both raw and gzip entry size.

The production build succeeds, but the main minified chunk is 1,046.67 kB (338.66 kB gzip). Vite reports that `supabaseTreeReadService`, `deltaSyncService`, and `syncUtils` are dynamically and statically imported, so their dynamic imports do not create separate chunks.

Runtime complexity is also concentrated in several large modules: `useVisualStudioPosterRuntime.ts` (906 lines), `familyGraphClusterLayout.ts` (841), `useKindiController.ts` (813), `HtmlManuscriptRenderer.ts` (719), and `studioPosterSvgRenderer.ts` (692).

Required resolution: establish bundle budgets, remove mixed static/dynamic ownership, and split orchestration from pure transformations. Do this incrementally; file length alone is not a reason to rewrite proven algorithms.

### P2. Sync and backup status language is internally confusing

Status: **Resolved in the current working tree.** Database sync, local queue, Drive authorization, and backup-file state are modeled separately in presentation, and only one next action is selected for the current state.

The header tooltip distinguishes Supabase synchronization from Google Drive backup, which is good, but the live state and recovery wording can imply a Drive backup exists while the Vault says Drive is disconnected. Buttons such as “Reset Backup Link & Retry” wrap awkwardly and expose implementation language.

Evidence: `src/components/SyncStatusTooltip.tsx:93-183`.

Required resolution: model and display independent states for database sync, offline queue, Drive authentication, Drive file link, last successful backup, and recovery action. Show one next action derived from the state machine.

### P2. Help content describes an obsolete tree workflow

Status: **Resolved in the current working tree.** Help topics now describe the active interaction model and expose stable route/control metadata for documentation-drift tests.

Help still says to switch between Descendant and Pedigree views with a side icon. The current product exposes Focus and Radial modes through Appearance settings.

Evidence:

- `src/utils/translations/ar/help.ts:13`
- `src/utils/translations/en/help.ts:13`

Required resolution: update help from the current interaction model and add route/control identifiers so product changes can flag stale documentation.

### P2. Vault tree and export history surfaces need clearer information hierarchy

Status: **Resolved in the current working tree.** Tree dates are locale-explicit with relative context, duplicate names are numbered, owned-tree management is clearly titled, and export history has a provenance-oriented empty state.

The active tree is repeated in the summary and owned-tree list; several trees use the generic name “New Family Tree”; dates such as `4/1/2026` are ambiguous; export history has no explanation when empty. These are polish issues, but they increase uncertainty in a high-consequence management area.

Required resolution: use one active-tree card, localized absolute dates plus relative context, clear ownership/status chips, duplicate-name disambiguation, and an empty-state explanation describing what creates an export-history record.

### P2. Paddle smoke evidence passes without exercising checkout

Status: **Resolved in the current working tree.** The default test injects a development-only Paddle contract double, asserts the authenticated checkout request and `Checkout.open` payload, and proves that no CDN request is involved. The real Sandbox flow is a separate opt-in test with an explicit skip state.

The E2E test returns successfully when the Paddle SDK is unavailable, so the suite reports a passed test even though the checkout request and response behavior were not executed.

Evidence: `tests/e2e/paddle-paywall-smoke.spec.ts:104-125`.

Required resolution: split this into a deterministic mocked checkout contract test and an environment-gated live sandbox test that is explicitly skipped, not silently passed, when credentials or SDK access are unavailable.

## Surface-by-surface assessment

| Surface | Assessment | Main action |
| --- | --- | --- |
| Tree canvas | Functionally rich; measured Fit and readable Reset contracts are now distinct | Preserve real-tree camera invariants while tuning aesthetics |
| Appearance drawer | Clear grouping and good presets; a few mixed-language labels | Localize and simplify advanced disclosure |
| Person details | Strong information density; English fragments and dense edit mode | Complete localization and reduce edit-form scanning cost |
| Kindi | Useful interaction model; English shell in Arabic mode | Localize shell and test privacy-safe network actions separately |
| Discussions | Useful collaboration feature; weak a11y and incomplete localization | Fix names, focus/touch actions, and add E2E coverage |
| Notifications | Good empty state and simple hierarchy | Improve low-contrast icon and loading state |
| Vault: Trees | Clear active summary and explicit owned-tree management; dates and duplicate names are disambiguated | Preserve hierarchy and test dense ownership lists |
| Vault: Members | Invitation and authorized-member link contracts are explicit | Certify delivery and multi-account acceptance in production |
| Vault: Insights | Strongest general-purpose Vault surface | Preserve design; clarify score semantics |
| Geography | Configured OpenStreetMap baseline and journey-list fallback are working | Certify provider policy and production monitoring |
| Timeline | Search and bounded rendering make large histories manageable | Consider true windowing only when measured datasets justify it |
| Statistics | Clear and useful | Keep; align data-health terminology |
| Integrity checker | Localized triage, stable ordering, search, and bounded rendering are in place | Add persistent resolution workflows only if product research supports them |
| Relationship calculator | Tested successfully on real people | Improve search/list economy and localized button names |
| Family Book | Controlled-PDF-first pipeline is implemented, authenticated, privacy-bounded, and production-verified; browser print is an explicit fallback | Preserve readiness transparency and recertify the deployed renderer when its runtime changes |
| Visual Publishing Studio | Strong architecture, export fidelity, responsive preview, and direct recovery actions | Continue owner visual review and theme development |
| Portable data | Clear separation of raw owner archive and exchange formats | Preserve privacy language |
| Export history | Empty state now explains provenance; records use Structural Integrity terminology | Preserve recording rules and add future artifact retention controls |
| Cloud backup | Database, queue, Drive, and linked-file states are presented independently | Preserve the state model and certify the real Drive integration separately |
| Privacy/Security | Simple and understandable | Add consequence preview before changing privacy mode |
| Help and public pages | Help reflects the current controls and exposes auditable route/control metadata | Verify legal and external-integration claims separately |

## Visual Publishing Studio verdict

The poster architecture should **not** be rewritten. `SanitizedPosterGraph -> Layout Engine -> PosterScene -> SVG -> Preview/PNG/PDF` is the correct foundation, and the browser evidence passed geometry, privacy, physical size, responsive, keyboard, and export-signature checks.

UX direction now implemented and verified:

1. Preserve the current “diagram type first” flow.
2. Keep diagram-specific controls contextual and collapse advanced overrides.
3. Keep the preview as the dominant surface at 720px-class screens and use a bounded settings rail.
4. Keep blocked-quality guidance actionable through Dense, A0, Branch Collection, and Tiled Wall preview transitions.
5. Keep one compact print summary below the preview with page, orientation, tiling controls, and readiness.
6. Keep the print dock below the preview; do not return paper/export controls to the diagram settings rail.

## Re-architecture decision

No full application rewrite is justified. Use four bounded architecture passes:

1. **Tree viewport controller**: separate graph geometry, camera fitting, user zoom state, and UI insets; cover with real-tree invariants.
2. **Sharing contract**: centralize canonical, invitation, and future public links behind a typed service; UI must never compose URLs itself.
3. **Localization boundary**: domain services emit codes and values, feature components consume required typed translations, and user-facing English fallbacks are prohibited in Arabic runtime.
4. **Large-surface orchestration**: split large hooks/components into state machines, pure selectors/builders, and small rendering sections while preserving proven publishing engines.

## Recommended sequence

### Phase 1: Beta blockers

1. Correct the sharing-link product contract and all three callers.
2. Restore a working geographic tile provider with a graceful fallback.
3. Fix tree Fit/Reset and enable real-tree geometry tests.
4. Add Arabic accessibility coverage for discussions, Kindi, and person details.

### Phase 2: Workflow clarity

1. Rename or redesign the data-health score.
2. Add integrity triage and virtualized timeline/issue lists.
3. Unify sync and backup state presentation.
4. Refresh help, Vault tree management, and empty states.

### Phase 3: Publishing completion

1. Maintain the completed controlled Family Book PDF path and its production evidence.
2. Add direct recovery actions to poster quality guidance.
3. Complete owner visual review at short desktop height and mobile.

### Phase 4: Engineering efficiency

1. Completed: bundle-size budgets and mixed import boundaries.
2. Completed incrementally for Studio scene evaluation; continue only where a measured maintenance problem exists.
3. Completed for the identified Paddle smoke test with deterministic and environment-gated coverage.

## Verification performed

- Manual signed-in review on a real 90-person owner tree at `1280x720`.
- Safely exercised Focus, Radial, person details, relationship calculator, geography, timeline, statistics, integrity, Vault tabs, poster modes, public pages, and help.
- Did not mutate owner records, send invitations/messages, delete data, connect Drive, execute AI network actions, or initiate a real payment.
- Unit/integration: 300 test files, 1,858 passed, 8 skipped, 0 failed.
- Chromium app smoke: 15 passed, 1 skipped.
- Chromium publishing/runtime E2E: 37 passed.
- TypeScript app: passed.
- TypeScript API: passed.
- ESLint with zero warnings: passed.
- Production build: passed under enforced raw/gzip entry budgets with no mixed-import warnings.
- Deterministic Paddle checkout contract: passed; live Sandbox test: explicitly skipped because the opt-in environment was not enabled.
- `git diff --check`: passed; existing uncommitted work was preserved.

## Audit boundary

This is a comprehensive safe audit, not proof of every external production integration. Google Drive, Paddle checkout, live collaboration between separate accounts, email delivery, remote AI behavior, destructive account/tree actions, and deployed production observability require controlled test accounts and environment credentials. They should be handled as a separate production-integration certification pass.
