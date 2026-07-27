# Poster Scope And Generation Product Requirements

**Date:** 2026-07-14
**Status:** Accepted Product Requirement / Runtime Foundation Implemented
**Runtime Availability:** Ancestors, descendants, and full tree are implemented behind a print-quality gate

## Product Decision

Visual Publishing Studio must not remain limited to four ancestor generations.
The final print-first poster system must support three first-class family scopes:

1. **Ancestors / شجرة الأسلاف**
   - Starts from the selected person and follows parents and earlier generations.
   - Supports a fixed depth and all available ancestor generations.

2. **Descendants / شجرة الأحفاد**
   - Starts from the selected person and follows children and later generations.
   - Supports a fixed depth and all available descendant generations.

3. **Full Tree / الشجرة الكاملة**
   - Includes the complete connected family graph and all supported relationships,
     including parent-child and spouse/partner links.
   - Is a separate overview product, not an oversized ancestor-tiered diagram.

## Generation Requirement

The generation control will eventually offer:

- 1, 2, 3, or 4 generations for fast bounded posters;
- **All available generations** for ancestor and descendant scopes.

`All` means all generations reachable in the chosen direction from the selected
root. It must still pass through node limits, print-quality analysis, and an owner
warning when the chosen paper size cannot keep cards readable.

## Layout Architecture

These scopes require separate selectors and layout engines:

- `ancestor-tiered` for ancestor posters;
- `descendant-tiered` for uneven descendant branches;
- `family-network-tiered` for the complete graph.

The full-tree engine must preserve every supported relationship without pretending
the graph is a strict binary tree. Dense trees may require compact cards, A2-A0,
overview mode, or multi-sheet output. The application must recommend an appropriate
format rather than silently producing unreadable text.

All engines produce `PosterScene`, and the canonical path remains:

```text
SanitizedPosterGraph -> Scope Selector -> Layout Engine -> PosterScene -> SVG -> PNG/PDF
```

## Capability Truthfulness

Current runtime support is:

- selected root;
- ancestors and descendants;
- 1-4 generations or all available generations for directional scopes;
- full tree with parent-child, spouse/partner, and relative relationships;
- A4/A3/A2/A1/A0 with adaptive memory-safe raster scales.

The registry records all generations as a runtime Classic Heritage capability.
Descendants and full tree now appear as owner controls because their selectors,
layout engines, sanitizer boundary, and print-quality blocking are implemented.
They remain pending owner visual approval before a Limited Beta promotion.

### 2026-07-14 implementation note

The live and fixture ancestor selectors accept `maxDepth: 'all'` and traverse
every reachable ancestor generation behind the sanitizer boundary. The Studio
exposes the option and blocks incomplete or unreadable output through the scene
print-quality report.

## Delivery Order

1. Generalize ancestor scope from 1-4 to all available generations. **Completed.**
2. Add descendant selector and `descendant-tiered` engine. **Completed.**
3. Add complete relationship graph selector and `family-network-tiered` engine. **Completed.**
4. Integrate A2/A1/A0 and `PrintQualityReport` before approving dense outputs. **Runtime completed; print review pending.**
5. Run sparse, deep, multiple-spouse, missing-parent, and large-tree owner reviews.
