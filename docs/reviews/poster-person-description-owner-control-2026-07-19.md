# Poster Person Description Owner Control

**Status:** Automated Runtime Pass / Owner Visual Review Pending

## Decision

Person cards can optionally show one short descriptive line. The control is off by
default and is intended for a concise family-facing phrase, not for publishing a
person's full biography or notes.

## Data Boundary

- The store selector may read the person's biography only inside the raw preview
  boundary.
- The production sanitizer emits only `descriptionLabel`, never the original `bio`
  field or a raw domain entity.
- Control characters and repeated whitespace are removed.
- Output is capped at 90 Unicode characters and then fitted to one SVG line.
- Living and private people never receive a descriptive line, including under the
  current `owner-full` policy.
- Contact data, notes, storage URLs, and internal identifiers remain outside
  `PosterScene` and exported SVG markup.

## Rendering

- `PosterScene` carries the opt-in content flag and sanitized label.
- Ancestor, descendant, and family-network layouts preserve the label without
  changing canonical node or connector geometry.
- Branch Collection propagates the choice to branch posters and excludes it from
  the overview index.
- Dense cards adapt name size and vertical placement when all optional detail rows
  are enabled, preventing overlap without moving the card.

## Verification

- Production sanitizer privacy, normalization, and truncation tests passed.
- Live source mapping and raw identifier isolation tests passed.
- PosterScene geometry parity tests passed.
- SVG detail fitting and Branch Collection propagation tests passed.
- Visual Publishing Studio tests passed, including the default-off control and
  private-description exclusion.

Owner visual review of Arabic long descriptions across Classic, Modern, and Dense
styles remains required before this control receives a visual signoff.
