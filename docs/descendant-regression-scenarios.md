# Descendant Regression Scenarios

## Purpose

This document captures the descendant-mode regression scenarios that were stabilized during the spouse/ownership debugging cycle.

It complements:

- [descendantVisibleTreeAdapter.test.ts](/D:/AppDEV/Jozor1.1/utils/__tests__/descendantVisibleTreeAdapter.test.ts)
- [visibleTreeDescendant.ts](/D:/AppDEV/Jozor1.1/domain/visibleTreeDescendant.ts)
- [descendantVisibleTreeAdapter.ts](/D:/AppDEV/Jozor1.1/utils/layout/descendantVisibleTreeAdapter.ts)

The goal is to preserve the current expected runtime behavior and avoid reintroducing:

- wrong reference cards
- missing spouses
- missing children
- wrong branch ownership
- incorrect shared/cousin union placement

---

## Core Rules

### 1. Branch Anchor

A person is a branch anchor when they are part of the current visible descendant branch as:

- `root`
- or `descendant`

A spouse-only appearance is not enough to make that person the owner of the children branch.

### 2. Reference Card

A reference card should only appear when the same person is already represented elsewhere in the same chart as a real branch appearance.

It must not appear just because:

- the person has a spouse
- the person has children
- the person has multiple relationships in the raw data
- the person was materialized only as a spouse

### 3. Children Ownership

Children should stay under the visible branch owner.

This means:

- if only one side is a branch anchor, children stay under that side
- if both sides are branch anchors, father-first rules may apply
- if the partner is spouse-only, children must not disappear by being reassigned to that spouse

### 4. Shared / Cousin Union

In shared or cousin-marriage cases:

- children appear once only
- branch ownership should remain stable
- father-side ownership is valid only when both sides are true branch anchors
- reference behavior should not be triggered too broadly

---

## Regression Scenarios

### A. Focus Root Stays Root

Expected:

- selected focus remains the rendered root
- ancestor or partner appearance does not reroot the chart unexpectedly

Why it matters:

- protects the runtime contract used by the current descendant renderer

### B. Repeated Person Creates Explicit Reference Appearance

Expected:

- repeated shared-union shapes create explicit reference appearances
- repeated people are not silently dropped

Why it matters:

- avoids missing spouse/partner cards
- avoids hidden branch connections

### C. Shared Union Child Ownership Goes to Father Side

Expected:

- when both parents are real branch anchors, shared-union children belong to the father side
- children render once only

Why it matters:

- prevents child duplication
- preserves expected cousin-marriage behavior

### D. Mother-Side Fallback When No Father Exists

Expected:

- if no father is known, the mother side owns the branch

Why it matters:

- keeps the chart usable for incomplete family data

### E. Deeper Visible Spouse Stays a Normal Spouse

Expected:

- a spouse at a deeper generation stays a normal spouse if they are not already a branch person elsewhere

Why it matters:

- prevents false reference badges
- prevents spouse cards from looking like cross-branch links when they are not

### F. Spouse-Only Earlier Appearance Must Not Trigger Reference

Expected:

- if a person only appeared earlier as a spouse, that alone must not force a reference appearance later

Why it matters:

- avoids turning ordinary spouses into linked/reference cards

### G. Partner-Only Spouse Should Not Be Marked Reference Without Prior Branch Presence

Expected:

- spouse cards shown on the non-owning side stay normal unless the same person already exists elsewhere as a branch person

Why it matters:

- preserves the distinction between:
  - ordinary spouse
  - true linked/reference spouse

### H. Mother Branch + Father Spouse-Only

Expected:

- if the mother is the visible branch anchor and the father is spouse-only, children stay under the mother
- the father displays as spouse-only, not as branch owner

Why it matters:

- prevents children from disappearing
- prevents false father-side reassignment

### I. Mother Branch + Father Spouse-Only + Multiple Children

Expected:

- all children remain attached to the mother-owned union
- no child is lost when multiple children exist

Why it matters:

- catches the high-risk case where ownership bugs hide only some children

### J. Both Parents Are Branch Anchors

Expected:

- father-first ownership may apply
- children stay attached to one union only

Why it matters:

- this is the real shared/cousin case
- distinguishes it from spouse-only partner cases

### K. Shared / Cousin Union Before Partner Materialization

Expected:

- even if the partner branch has not been materialized yet during traversal, the final ownership must still resolve correctly

Why it matters:

- prevents traversal-order bugs
- avoids ownership depending on which side was visited first

### L. Shared / Cousin Union Collapse

Expected:

- collapsed shared unions keep the collapse point
- child links disappear while collapsed
- children are not duplicated elsewhere

Why it matters:

- protects collapse behavior in the most fragile descendant shape

### M. Visible Spouse-Only Union

Expected:

- a spouse-only union with no children still renders both partners

Why it matters:

- sidebar and chart stay semantically aligned

### N. Collapsed Single-Parent Union

Expected:

- collapsed single-parent unions stay visible as collapsible structure
- children are hidden while collapsed

Why it matters:

- protects single-parent descendant workflows

### O. Filtered Spouse With Visible Child

Expected:

- the semantic union key stays stable
- visible child remains connected through the correct union

Why it matters:

- prevents child-link drift when filters are active

### P. Generation Limit

Expected:

- generation limit is enforced before layout
- trimmed descendants do not leak into runtime rendering

Why it matters:

- keeps semantics and runtime in sync

---

## Practical Guidance

When changing descendant logic:

1. Do not change semantic ownership and adapter ownership in the same step unless necessary.
2. If a spouse becomes a reference unexpectedly, first check whether that person already exists elsewhere as a branch anchor.
3. If children disappear, first check whether ownership was transferred to a spouse-only partner.
4. If a cousin/shared case regresses, check whether the partner was recognized as a true branch anchor or merely a spouse-side appearance.
5. Add a regression test for every runtime descendant bug before closing it.

---

## Recommended Next Test Additions

Future useful additions:

- deceased spouse + visible child under filtered settings
- spouse-only union with collapse toggle
- repeated spouse-only partner across two generations
- mixed one-parent and shared-union layout in the same chart
