# Poster Card Content Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Review Pass (years/relationship) / Automated Privacy Pass (place/occupation)

## Scope

This pass adds the first owner-controlled person-card fields to the Visual
Publishing Studio without widening the raw family-data boundary:

- Show or hide birth/death years.
- Show or hide a localized relationship label.
- Show or hide a sanitized birth-place label.
- Show or hide a sanitized occupation label.

Years already belong to the sanitized preview contract. Relationship labels are
derived only from the sanitized `relationshipHint`; raw relationship metadata is
never passed to `PosterScene` or emitted to SVG. Birth place and occupation are
new opt-in sanitized labels: they are normalized, capped at 60 characters, and
omitted for living or private people.

## Runtime Behavior

- Years are shown by default and relationship labels are off by default.
- Turning years off also disables year inclusion at the production sanitizer
  request, rather than merely hiding already-rendered text.
- Relationship values are converted to reader-facing Arabic or English labels.
- Birth place and occupation share one compact detail row. Long values are
  truncated for the card instead of changing layout geometry.
- Dense Genealogy reduces the name to one fitted line when multiple optional
  detail rows are active, preventing detail/name collisions.
- Classic Heritage, Modern Gallery, and Dense Genealogy use the same canonical
  scene and SVG field rendering.
- Branch Collection detail posters inherit both choices. Its overview index stays
  intentionally compact and omits those optional fields.
- PNG, raster PDF, Tiled Wall, and Studio preview continue to derive from the same
  SVG and scene geometry.

## Owner Review

The controls were exercised against the signed-in owner tree in Arabic. The
preview correctly removed life years and added `الجذر` without exposing the
technical relationship enum. Dense Genealogy was also checked with both rows:

- Card height: `124` scene units.
- Name-to-years clearance: `32.4` scene units.
- Years-to-relationship clearance: `16` scene units.
- No text overlap or card overflow was observed.

## Safety Boundary

The production selector now extracts only `birthPlace` and the normalized
`occupation || profession` value. The sanitizer emits them only when the owner
enables the matching option and the person is deceased and not private. Raw
notes, addresses, contact data, storage URLs, raw person identifiers, and freeform
descriptive text remain forbidden.

The signed-in owner runtime review covered years and relationship labels before
the place/occupation extension. The latter passed automated privacy and renderer
checks; a real-tree visual review remains the next narrow gate.

## Verification

- Targeted Vitest: `82` tests passed across the final six-file privacy, Studio,
  renderer, collection, and export-panel suite.
- Dense-card regression coverage confirms that a long Arabic/Latin-compatible
  display name is shortened with an ellipsis while the combined birth-place and
  occupation row remains inside the card bounds.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- Owner Arabic runtime review: passed.
- Birth-place/occupation real-tree visual review: pending.
- No commit was created.
