# Smart Persona Product Maturity Audit

Date: 2026-09-04

## Product verdict

Smart Persona already has the right product shape: it is the focused family-record workspace, while Kindi can open a precise tab, section, and field inside it. A ground-up rewrite is not justified. The correct path is a staged hardening and simplification pass around permissions, media lifecycle, record completeness, and evidence.

Current classification: **functional and visually coherent, with private-media
implementation complete locally but still awaiting controlled database rollout
and live evidence before beta**.

## Runtime map

1. A tree node, search result, relationship card, or Kindi diagnostic selects a person.
2. `AppPersonOverlays` opens `SmartPersonaDrawer` and supplies the active person, mutation handlers, permission state, and tool actions.
3. The UI slice owns drawer tab, size, edit state, and Kindi section/field targets.
4. `useSmartPersonaDrawerState` reconciles that UI state with the active person and current permissions.
5. The drawer renders three user-facing work areas:
   - About: identity, vital dates, work, biography, sources, events, and contact.
   - Links: parents, spouses, children, siblings, and relationship details.
   - Gallery: photos and voice memories.
6. Person and relationship edits pass through command objects, `CommandExecutor`, the family store, local persistence, and delta sync.
7. Gallery storage uses Supabase Storage; voice memories currently use Google Drive links.

## Findings closed in this pass

### Permission boundary

- A cloud tree with an unresolved or revoked role now fails closed.
- Local trees remain editable when no cloud role exists.
- Owner and editor roles can mutate; viewers cannot.
- The policy is shared by Kindi, the permission hook, command executor, family store, and gallery operations.
- An editor-to-viewer downgrade immediately exits edit mode and blocks stale person and relationship callbacks.
- Read-only users see one semantic status notice instead of duplicate disabled edit/delete buttons.

### Record-reading UX

- The work and interests section now renders only recorded facts in read-only mode.
- Empty disabled fields no longer dominate the person profile.
- Kindi field targets remain programmatically focusable.
- The deceased-photo overlay that resembled a delete button was removed; the explicit status and death row remain.

### Gallery integrity

- Invalid gallery records no longer create blank gallery states or corrupt lightbox indexing.
- Thumbnails are keyboard-operable buttons.
- Captions are localized and commit on blur/Enter instead of mutating the tree on every keystroke.
- A legacy URL remains a URL when caption metadata is added; it is no longer misclassified as a storage path.
- Automatically generated voice-memory filenames no longer contain raw person IDs.
- Gallery storage mutations reject viewer and unresolved cloud roles before contacting storage.
- Photo attachment now awaits the person-record mutation and compensates by deleting a newly uploaded object when attachment fails.
- Photo removal updates the person record before best-effort object cleanup, preventing a surviving record from pointing at a deleted file.

### Lightbox accessibility

- The lightbox exposes dialog semantics and localized action names.
- Escape closes it, focus enters it on open, keyboard focus is contained, and the previous focus and body overflow state are restored on close.
- Invalid image indices render no broken dialog.

## Visual review

The live Arabic owner tree was reviewed without changing owner data.

- The drawer hierarchy is calm and understandable on desktop.
- The profile portrait, name, status, and vital dates form a clear first block.
- Quick actions are visually separated from record facts.
- The revised work section is substantially shorter and easier to scan.
- The gallery empty and edit states expose only relevant actions.
- The removed photo overlay resolves a misleading destructive-action affordance.

## Remaining work, in order

### P0: private media rollout and evidence

Implementation follow-up (2026-09-05): the typed private-media foundation,
cloud archive rehydration, resumable legacy-object migration, owner maintenance
action, and account-deletion cleanup are implemented locally. Neither Supabase
migration has been applied. See
`docs/reviews/smart-persona-private-media-foundation-2026-09-05.md` for the
runtime path, controlled legacy-migration rollout gate, and deliberately
deferred media work.

The `avatars` bucket remains public until the controlled rollout migrates owned
person media and deletes its old objects. Secure database views prevent normal
viewer discovery, but a previously known URL may remain fetchable. Before beta:

1. Apply both reviewed migrations to a non-production project in order.
2. Exercise owner/editor/viewer/revocation and masking with two real accounts.
3. Run the owner migration until aggregate results report no eligible legacy
   references, while leaving genuine external URLs unchanged.
4. Verify UI, poster exports, archive round-trips, cleanup retries, and account
   deletion against real storage bytes.
5. Promote only after the same evidence passes in the production-like project.

### P1: remaining media lifecycle

Profile/gallery cleanup now has an IndexedDB-backed retry queue and the legacy
migration has server-side compare-and-set compensation. A server orphan sweeper
is still needed for process termination between storage upload and compensation.
Voice memories need an equivalent owned asset lifecycle rather than an untyped
URL array.

### P1: media module extraction

`MediaTab` still owns gallery presentation, caption state, uploads, audio validation, Drive upload, and playback. Split it after the asset contract is agreed:

- `GallerySection`
- `GalleryCaptionInput`
- `VoiceMemoriesSection`
- `usePersonMediaOperations`

This is a bounded extraction, not a Smart Persona rewrite.

### P1: complete person-record model

- Add explicit completeness and provenance indicators per section.
- Make source coverage visible alongside important facts without turning the profile into a diagnostics screen.
- Define duplicate-event and duplicate-source behavior.
- Add a deliberate empty-state path for a newly created person.
- Verify long Arabic and English records at mobile, tablet, and desktop widths.

### P1: Kindi-to-record workflows

- Keep Kindi navigation read-only by default.
- Let Kindi propose record changes as a reviewable patch, never as an implicit write.
- Show target field, current value, proposed value, evidence, and affected relationships.
- Recheck permissions immediately before applying a confirmed patch.
- Link relevant help-center procedures from Kindi answers in the user's active language.

### P2: evidence and operations

- Add real two-account E2E coverage for media permissions and revocation, in addition to deterministic debug-role tests.
- Add failed upload, interrupted upload, deleted person, expired signed URL, and offline retry scenarios.
- Add operational metrics for media failures without logging tokens, private URLs, or person content.

## Architecture decision

Do not replace Smart Persona. Preserve its drawer, three primary work areas, Kindi deep-link contract, and command-based mutation path. Continue by extracting media ownership behind a typed resolver and by extending the existing person record incrementally.

## Exit gate for the next checkpoint

- All Smart Persona and tree-action unit tests pass.
- Permission downgrade E2E passes in Chromium and WebKit.
- Arabic and English gallery labels are verified.
- No raw person ID enters generated media filenames.
- Typecheck, scoped ESLint, build, and `git diff --check` pass.
- No owner data is changed during visual review.
