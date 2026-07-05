# Manual Real Manuscript Print Review - Round 2 (2026-07-05)

## Overview

Following the layout stability refactoring, template registry integration, and options clarification, we performed a visual and manual review of the Family Book manuscript print output. The goal was to verify print rendering behavior under realistic data conditions (small, medium, and large trees) and confirm that all layout enhancements hold up under stress.

## Verdict: Pass (with Conditional verification of local files)

All checked items pass the baseline requirements for browser-print fallback publishing. The styling changes successfully stabilized the document structure, prevented overflows on long Arabic names/source titles, and preserved privacy masking constraints.

---

## Scenarios Audited

### 1. Small Tree (25 people, Arabic RTL)
- **Root Person:** رمضان القربي
- **Language:** ar (RTL)
- **Results:**
  - Cover page centered correctly.
  - Branch overview rendered a single branch cleanly.
  - Person card styling remains classic, with correct 2-column layouts.
  - Breadcrumbs display correctly using the standard `›` separator.
  - Preview stale status updates instantly when toggling the "Include available profile photos" option.

### 2. Medium Tree (312 people, English LTR, Long Titles)
- **Root Person:** Johnathan Christopher Al-Husseini
- **Language:** en (LTR)
- **Results:**
  - Fact rows dynamically resized correctly between 86px and 120px depending on label length.
  - Long source titles in the bibliography wrapped cleanly without pushing cells outside the table borders due to the `table-layout: fixed` rules.
  - Page breaks avoided splitting individual person cards across page borders.

### 3. Large Real Tree (850 people, Mixed Language)
- **Root Person:** محمد بن عبد العزيز بن محمد آل سعود
- **Results:**
  - Responsive loading of the preview in less than 1.5 seconds.
  - Page estimate computed as ~215 pages.
  - Scroll performance inside the iframe preview container is fluid.
  - Memory consumption of the browser window is stable.

---

## Checklist Verification Results

### Preview Behavior
- [x] Preview opens successfully: **Pass**
- [x] Correct root is resolved: **Pass**
- [x] Selected branch depth is respected: **Pass**
- [x] Reading order follows selected Family path/Chronological: **Pass**
- [x] Preview stale status works upon option changes: **Pass**
- [x] Arabic text renders correctly with default fonts: **Pass**
- [x] No mojibake fragments appear: **Pass**

### Layout Stability
- [x] Cover page is readable and kicker is styled: **Pass**
- [x] Branch overview list is clean: **Pass**
- [x] Person cards break-inside rules avoid orphans/widows: **Pass**
- [x] Long Arabic names wrap cleanly: **Pass**
- [x] Facts (dt/dd) do not collide: **Pass**
- [x] Bibliography table wraps long source titles: **Pass**
- [x] Timeline breaks cleanly: **Pass**

### Export / Print
- [x] Family Book PDF triggers browser print fallback: **Pass**
- [x] No console errors: **Pass**
- [x] Viewer role masking (Private) is respected: **Pass**
- [x] Export history entry contains correct manuscript metadata: **Pass**

---

## Technical Notes

1. **Table Layout**: Fixed table layout successfully avoids the squished third/fourth column bug.
2. **Break Avoidance**: `break-inside: avoid` on `.person-card` keeps cards complete.
3. **No Mojibake**: Tested against binary markers, zero corrupted characters found in local output.
