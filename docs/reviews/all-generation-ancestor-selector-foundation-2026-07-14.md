# All-generation Ancestor Selector Foundation

**Date:** 2026-07-14
**Status:** Runtime-supported with Print-quality Gate
**Commit:** None

## Scope

This pass generalizes the sanitized ancestor selection boundary beyond the
previous one-to-four-generation limit and exposes an `All` owner control in the
Classic Heritage Studio. Arbitrary-depth output is still subject to a mandatory
print-quality gate.

## Implemented

- `VisualPreviewSelectorContext.maxDepth` accepts a numeric depth or `all`.
- Live and fixture ancestor selectors traverse every reachable parent generation
  when `maxDepth: 'all'` is requested.
- Selection remains breadth-first from the chosen root and only emits the
  minimal production sanitizer input shape.
- Raw person IDs remain behind the sanitizer boundary.
- Selectors keep one overflow sentinel when a node cap is exceeded. The
  production sanitizer removes that sentinel and reports truthful truncation.
- Existing bounded-depth behavior remains unchanged.

## Runtime Boundary

The visible Studio generation control now includes 1-4 generations and all
available ancestor generations. `All` remains bounded by:

- a conservative 127-person sanitized selection cap;
- print readability evaluated from the resulting `PosterScene` geometry;
- blocked export when the selection is truncated, cards overlap, or printed name
  text falls below 8pt;
- an owner-facing explanation without exposing internal quality codes.

## Verification

- Selector Vitest: 3 files passed, 21 tests passed.
- Integrated Studio/scene/registry Vitest: 5 files passed, 56 tests passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- Tests cover six-generation traversal and sanitizer-visible cap truncation.
- Owner browser review verified the Arabic `All` control against the signed-in
  real tree. Two reviewed roots rendered 10 people and 10 relationships without
  a quality warning; their available ancestor depth was four generations.

## Next Gate

Add A2/A1/A0 so dense five-plus-generation branches have a larger printable
surface instead of being blocked on A4/A3.
