# Poster Card Frame Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Scope:** SVG-native person-card frame detail

## Decision

The owner can choose one of four card-frame modes:

- **Style Default:** Classic Heritage resolves to Classic. Modern Gallery, Dense
  Genealogy, and Branch Index resolve to Minimal.
- **Minimal:** a light outer edge without the card accent rule.
- **Classic:** the authored border and restrained accent rule.
- **Lightly Ornate:** a stronger border, accent rule, and one internal frame line.

## Canonical Rendering

The resolved choice is stored as `PosterScene.cardFramePreset`. The shared SVG
renderer derives border width, accent width and opacity, and optional inner-frame
markup from that field. PNG and raster PDF therefore preserve the same card detail.
Branch Collection receives the owner choice, and Tiled Wall inherits its scene.

## Geometry And Safety

- Card rectangles, photos, typography, connector paths, and page bounds do not move.
- The ornate treatment adds one internal SVG rectangle per standard person card.
- No remote assets, CSS URLs, raw identifiers, or storage references are accepted.
- Minimal is the authored default for Modern and Dense to preserve visual calm and
  high-density legibility.

## Owner Runtime Review

The control was exercised against the signed-in Arabic owner tree. Classic resolved
to Classic by default. Lightly Ornate produced one internal-frame layer on the
visible root card, while Minimal produced none. Returning to Style Default resolved
both Modern Gallery and Dense Genealogy to Minimal. DOM inspection found zero raw-ID
attributes and zero external links.

## Verification

- 99 targeted Vitest checks passed across PosterScene, SVG renderer, Studio, and
  Branch Collection.
- `npm run typecheck` passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

No commit was created.
