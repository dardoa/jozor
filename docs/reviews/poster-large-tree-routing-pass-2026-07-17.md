# Poster Large-Tree Routing Pass

**Date:** 2026-07-17
**Status:** Runtime Guidance Pass
**Commit:** None

## Problem

The print-quality gate correctly disabled PNG and PDF when a single sheet became
unreadable, but a descendant or ancestor poster could still leave the owner at a dead
end. Branch Collection and Tiled Wall controls only become relevant after selecting
the full-tree product scope.

## Implemented Guidance

Blocked single-sheet scenes now expose a concise recovery panel. Depending on the
current configuration, the owner can:

- switch to the Dense Genealogy visual direction;
- try an A0 landscape document;
- prepare the large-tree product workspace.

The large-tree setup applies a reversible preview configuration:

```text
Dense Genealogy
+ full-tree overview scope
+ all available generations
+ A0 landscape
```

This reveals the existing Overview, Branch Collection, and Tiled Wall paths. It does
not start a download, bypass the print-quality gate, or change any exporter handler.

## Product Copy

The guidance explains that its actions only adjust preview settings. Technical quality
codes remain hidden. PNG and PDF stay disabled until the resulting single-sheet scene
passes the same PrintQualityReport gate.

## Verification

- Action-bar tests verify all three recovery callbacks and assert that no export is
  invoked.
- Studio integration verifies that the Dense route produces the canonical
  `dense-overview` scene and Evergreen palette.
- The existing full-tree branch and tiled downloads remain separate explicit actions.

## Decision

The Studio now routes an unreadable single sheet toward an appropriate large-tree
product instead of merely rejecting it. Physical print and wall-assembly proofs remain
separate product gates.
