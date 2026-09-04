# Smart Persona Product Maturity Audit

Date: 2026-09-04

## Product verdict

Smart Persona already has the right product shape: it is the focused family-record workspace, while Kindi can open a precise tab, section, and field inside it. A ground-up rewrite is not justified. The correct path is a staged hardening and simplification pass around permissions, media lifecycle, record completeness, and evidence.

Current classification: **functional and visually coherent, but not yet media-privacy complete for beta**.

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

### P0: private media delivery migration

The `avatars` bucket is still a legacy public bucket and `mediaUtils` constructs public object URLs. Secure database views prevent normal viewer discovery, but a previously known URL may remain fetchable. Before beta:

1. Introduce a normalized `PersonMediaAssetRef` contract for profile images and gallery items.
2. Move the bucket to private delivery or a compatible private successor.
3. Resolve short-lived, role-aware signed assets outside the person record.
4. Define cache expiry, revocation, offline behavior, and poster/export embedding.
5. Migrate existing public paths without breaking old archives.

### P0: durable media lifecycle

The immediate gallery flow now compensates an uploaded-but-unattached object and favors record integrity during deletion. Storage and record mutation are still separate systems, so production hardening requires a durable cleanup queue, idempotent retries, and observability for failed compensation or post-removal object cleanup. Voice memories need an equivalent owned asset lifecycle rather than an untyped URL array.

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
