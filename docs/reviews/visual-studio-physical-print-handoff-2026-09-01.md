# Visual Studio Physical Print Handoff

**Date:** 2026-09-01
**Digital evidence:** Pass
**Physical print acceptance:** Pending

## Purpose

This handoff converts the verified large-format digital proof into the smallest
representative physical-print acceptance set. The current workstation exposes only
virtual PDF/XPS/Fax/OneNote printers, so no paper result was available for inspection.
Physical acceptance must remain pending until the owner or print provider signs the
checks below.

## Generated Evidence

The package was regenerated through the real Studio controls with:

`npx playwright test tests/e2e/visual-studio-large-format-print-proof.spec.ts --project=chromium --workers=1`

The run passed and produced the ignored working artifacts under:

`output/playwright/visual-studio-large-format-print-proof/`

The prepared handoff archive is:

`output/print-proof-handoff/visual-studio-physical-print-handoff-2026-09-01.zip`

## Required Print Set

1. Print `a2-classic-heritage.pdf` on A2 at 100% scale. Disable fit-to-page,
   shrink-to-fit, and printer-added headers or footers.
2. Extract `tiled-wall.zip` and print two adjacent A3 tiles at 100%. Preserve the
   documented 8 mm overlap and crop marks.
3. Extract `branch-collection.zip`; print the overview and one dense branch sheet at
   100%.

## Acceptance Checks

| Check | Expected | Result |
|---|---|---|
| A2 trim dimensions | 594 x 420 mm | Pending |
| Safe margins and page frame | No clipping or printer intrusion | Pending |
| Arabic names and years | Shaped, readable, and not truncated | Pending |
| Photo reproduction | Clear at normal wall-viewing distance | Pending |
| Colors and line contrast | Distinct without muddy shadows | Pending |
| Tiled overlap | 8 mm and alignable | Pending |
| Connector continuity | Continuous across adjacent tiles | Pending |
| Branch overview readability | Useful at normal viewing distance | Pending |

## Sign-off Rule

Do not classify large-format wall posters as physically approved until the owner or
print provider records the printer model, paper stock, scaling mode, date, and a pass
for every row above. Digital geometry and PDF validity do not replace this check.
