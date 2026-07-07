# Project Log

## 2026-07-07 - Calendar ICS Actual Inspection & Status Promotion

- Summary:
  - Promoted Calendar/ICS Export to `Spot Check Pass for Limited Beta - structural/sanitized verification` following actual programmatic ICS file generation and inspection.
  - Verified structure (`BEGIN:VCALENDAR`, `VEVENT`, `END:VCALENDAR`, and standard headers).
  - Confirmed perfect Arabic name preservation and that year-only/partial dates are safely omitted to prevent false calendar precision.
  - Documented findings in [`docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md) and evidence notes in [`docs/reviews/evidence/calendar-ics-owner-spot-check-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/calendar-ics-owner-spot-check-2026-07-07/evidence_notes.md).

## 2026-07-07 - Jozor Archive Actual Inspection & Status Promotion

- Summary:
  - Promoted Jozor Archive to `Spot Check Pass as Full Project Archive` following actual programmatic zip extraction and inspection.
  - Verified structure (`manifest.json`, `tree.json`, and isolated binary media under `media/avatars/` and `media/gallery/`).
  - Confirmed that Supabase URLs, raw base64 data, and storage paths are successfully deleted from `tree.json`, verifying correct media separation.
  - Documented findings in [`docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md) and evidence notes in [`docs/reviews/evidence/jozor-archive-owner-spot-check-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/jozor-archive-owner-spot-check-2026-07-07/evidence_notes.md).

## 2026-07-07 - Calendar ICS Owner Spot Check

- Summary:
  - Documented Calendar/ICS owner spot check report in [`docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md) setting status to `Pending Owner ICS Inspection` and documenting partial dates omission as a known limitation.
  - Updated consolidated readiness summary [`docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md).

## 2026-07-07 - Jozor Archive Owner Spot Check

- Summary:
  - Documented Jozor Archive owner spot check report in [`docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md), setting status to `Pending Owner Archive Inspection` and classifying it as a Full Project Backup (not clean portable data).
  - Updated consolidated readiness summary [`docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md).

## 2026-07-07 - JSON Export Product Boundary & Spot Check Report

- Summary:
  - Documented JSON owner spot check findings in [`docs/reviews/json-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/json-owner-spot-check-2026-07-07.md), blocking current JSON output as public portable export due to media storage URLs, raw base64 data, and sync metadata leakage.
  - Defined two JSON export products in the new design note [`docs/reviews/clean-portable-json-export-design-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/clean-portable-json-export-design-2026-07-07.md): Full Jozor Project JSON (internal backup) and Clean Portable JSON (user-facing, privacy-compliant format).
  - Updated consolidated readiness summary [`docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md).

## 2026-07-07 - GEDCOM Promotion to Spot Check Pass

- Summary:
  - Promoted GEDCOM Export to `Spot Check Pass` for Limited Beta.
  - Documented owner re-review results and verified metrics (0 false 1 JAN dates, correct year-only exports, valid references structure) in [`docs/reviews/gedcom-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md).
  - Updated consolidated readiness summary [`docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md) and logged evidence notes in [`docs/reviews/evidence/gedcom-owner-spot-check-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/gedcom-owner-spot-check-2026-07-07/evidence_notes.md).

## 2026-07-07 - GEDCOM Date Precision Export Polish

- Summary:
  - Addressed GEDCOM export date precision blockers: implemented precision-aware formatting rules in `formatDateForGEDCOM` preserving partial dates (`MON YYYY`), year-only dates (`YYYY`), approximate dates (`ABT YYYY`), and standardizing placeholder `YYYY-01-01` formats (exporting as `YYYY` unless explicit day/month precision is verified by metadata).
  - Authored the GEDCOM owner spot check report [`docs/reviews/gedcom-owner-spot-check-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md) setting initial status to `Needs Polish` (moved from validation pass).
  - Updated the consolidated readiness summary [`docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md) to log `Needs Polish` for GEDCOM.

## 2026-07-07 - Publishing Outputs Limited Beta Readiness Summary

- Summary:
  - Consolidated readiness reviews and status reports for all Vault publishing and export outputs.
  - Released consolidated summary report at [`docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/publishing-outputs-limited-beta-readiness-2026-07-07.md) and [`docs/reviews/evidence/publishing-outputs-limited-beta-readiness-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/publishing-outputs-limited-beta-readiness-2026-07-07/evidence_notes.md).
  - Promoted Family Book outputs (PDF and Markdown) to `Pass for Limited Beta`, and marked visual outputs and portable data exports as pending owner output spot checks/reviews.

## 2026-07-07 - Family Book Markdown Promotion to Pass for Limited Beta

- Summary:
  - Visual and textual review of the regenerated Markdown export confirms introduction, localized labels, references section structure, and em dash separators are fully successful.
  - Officially promoted status to `Pass for Limited Beta` inside [`docs/reviews/family-book-markdown-owner-review-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-markdown-owner-review-2026-07-07.md).
  - Documented owner visual confirmation details in [`docs/reviews/evidence/family-book-markdown-limited-beta-review-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/family-book-markdown-limited-beta-review-2026-07-07/evidence_notes.md).
  - Created a follow-up tracker in [`docs/reviews/family-book-markdown-limited-beta-followups-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-markdown-limited-beta-followups-2026-07-07.md) for non-blocking P2/P3 items (relation/generation simplification, citation zero-state reduction, branch overview count wording, family path separator, and optional RTL wrapper mode).

## 2026-07-07 - Family Book Markdown Beta Polish Pass

- Summary:
  - Prepared the owner review report for the Family Book Markdown format.
  - Released review pack at [`docs/reviews/family-book-markdown-owner-review-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-markdown-owner-review-2026-07-07.md) setting initial status to `Needs Polish` with target `Pass for Limited Beta as Review/Archive Format`.
  - Addressed Markdown beta polish blockers: implemented template-based introductions, fully localized technical field labels (e.g. relationship, generation depth, citation coverage, source highlights as `أبرز المصادر`, count suffixes, and branch headers), updated timeline lines to use em dash (` — `) separators, and structured references as a formal heading section.

## 2026-07-07 - Family Book PDF Promotion to Pass for Limited Beta

- Summary:
  - Visual review of the fourth generated PDF confirms timeline orphan prevention and list marker fixes are fully successful.
  - Officially promoted status to `Pass for Limited Beta` inside [`docs/reviews/family-book-pdf-owner-rereview-round4-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-owner-rereview-round4-2026-07-07.md).
  - Documented owner visual confirmation details in [`docs/reviews/evidence/family-book-pdf-owner-rereview-round4-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/family-book-pdf-owner-rereview-round4-2026-07-07/evidence_notes.md).
  - Created a follow-up tracker in [`docs/reviews/family-book-pdf-limited-beta-followups-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-limited-beta-followups-2026-07-07.md) for non-blocking P2/P3 items (closing page balance, source highlights repetition, photo privacy confirmation, and Controlled PDF searchability).

## 2026-07-07 - Family Book PDF Owner Visual Re-Review Round 4 & Timeline Renderer-Level Orphan Fix

- Summary:
  - Prepared the fourth-round owner visual review pack for Family Book PDF.
  - Released review pack at [`docs/reviews/family-book-pdf-owner-rereview-round4-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-owner-rereview-round4-2026-07-07.md) and [`docs/reviews/evidence/family-book-pdf-owner-rereview-round4-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/family-book-pdf-owner-rereview-round4-2026-07-07/evidence_notes.md).
  - Addressed final timeline orphan page blocker at the renderer level: introduced `groupTimelineEventsForPrint` helper to partition events into groups of 6, merging any trailing group of size 1 into the previous group.
  - Resolved suspicious RTL `.80` ordered list marker artifact by applying `list-style: none` to the timeline list CSS rules (since the date `<time>` acts as the natural bullet).
  - Updated status to `Blocked for External Beta` pending confirmation of the fifth generated PDF.

## 2026-07-07 - Family Book PDF Owner Visual Re-Review Round 3 & Timeline Orphan Page Polish

- Summary:
  - Prepared the third-round owner visual review pack for Family Book PDF after Phase 2 polish.
  - Released review pack at [`docs/reviews/family-book-pdf-owner-rereview-round3-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-owner-rereview-round3-2026-07-07.md) and [`docs/reviews/evidence/family-book-pdf-owner-rereview-round3-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/family-book-pdf-owner-rereview-round3-2026-07-07/evidence_notes.md).
  - Defined the verification checklist for developer confirmation of Phase 2 fixes.
  - Addressed timeline orphan page issue: updated list item CSS to `break-inside: avoid` and lists to `break-inside: auto`, ensuring single events do not get orphaned alone on nearly empty pages.
  - Polished the closing section to render as an intentional card centered on the page with a maximum width of 500px.
  - Moved status to `Needs Polish` (making internal beta testing possible).

## 2026-07-07 - Family Book PDF Owner Re-Review Pack & Phase 2 Blocker Polish

- Summary:
  - Prepared the second-round owner re-review pack for Family Book PDF beta readiness after resolving blockers.
  - Released review pack at [`docs/reviews/family-book-pdf-owner-rereview-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-owner-rereview-2026-07-07.md) and [`docs/reviews/evidence/family-book-pdf-owner-rereview-2026-07-07/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/family-book-pdf-owner-rereview-2026-07-07/evidence_notes.md).
  - Addressed Phase 2 blockers: implemented a compact ending closing section displaying book statistics, softened card citation coverage text and moved it below the header, balanced card layouts next to photos, added photo privacy helper copy, and strengthened browser print alerts in `ExportCloudPanel.tsx`.
  - Authored a PDF text quality tracking note at [`docs/reviews/family-book-pdf-text-quality-note-2026-07-07.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-text-quality-note-2026-07-07.md).

## 2026-07-06 - ADR 013 Visual Publishing Studio Direction

- Summary:
  - Documented the architectural and UX direction for the future Visual Publishing Studio.
  - Authored [`docs/adr/013-visual-publishing-studio-direction.md`](file:///d:/AppDEV/Jozor1.1/docs/adr/013-visual-publishing-studio-direction.md) proposing a Preview-first, Configuration-first model.
  - Outlined flow taxonomy, conceptual UI layout shape, non-goals, and connection to the Vault's current gallery layout.

## 2026-07-06 - Visual Outputs Gallery Manual Review Pack

- Summary:
  - Performed a focused manual review of the Vault's visual outputs product gallery layout.
  - Verified visual scanning characteristics, compact snapshot layout, passive chip designs, and placeholder formatting.
  - Documented RTL/Arabic translations and layout design reviews.
  - Released review pack at [`docs/reviews/visual-outputs-gallery-review-2026-07-06.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-outputs-gallery-review-2026-07-06.md) and [`docs/reviews/evidence/visual-outputs-gallery-review-2026-07-06/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/visual-outputs-gallery-review-2026-07-06/evidence_notes.md).

## 2026-07-06 - Visual Output Preview Asset Contract Phase 1

- Summary:
  - Extended the Visual Output Product contract with `previewAsset` and `recommendedFor` fields.
  - Implemented designed layout placeholders at the top of Classic Poster, Modern Poster, and Tree Snapshot cards inside the Vault Visual Outputs tab.
  - Rendered at most 3 passive `recommendedFor` chips under product description details based on selected language (Arabic/English).
  - Expanded unit test assertions in `visualOutputRegistry.test.ts` and `ExportCloudPanel.test.tsx`.
  - Updated ADR [`docs/adr/012-visual-output-product-contract.md`](file:///d:/AppDEV/Jozor1.1/docs/adr/012-visual-output-product-contract.md).

## 2026-07-06 - Vault Publishing Taxonomy Manual Review Pack

- Summary:
  - Performed a manual documentation review of the Vault's refined publishing/export taxonomy.
  - Validated clean product boundaries for Family Books (including Markdown), Visual Outputs (posters and snapshots), and Portable Data.
  - Confirmed History & Quality card layouts use proper display mapping (product labels, format chips, category badges) without IndexedDB schema changes.
  - Documented design decisions, deferred features, translation notes, and testing evidence.
  - Released review pack at [`docs/reviews/vault-publishing-taxonomy-review-2026-07-06.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/vault-publishing-taxonomy-review-2026-07-06.md) and [`docs/reviews/evidence/vault-publishing-taxonomy-review-2026-07-06/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/vault-publishing-taxonomy-review-2026-07-06/evidence_notes.md).

## 2026-07-06 - Visual Output Product Contract Phase 1

- Summary:
  - Established a domain-level Visual Output Product contract for Vault visual exports, modeling posters and tree snapshots as products.
  - Defined types (product categories, layout engines, renderers, strategies) and built a registry (`VISUAL_OUTPUT_DEFINITIONS`) with retrieval helpers.
  - Authored ADR [`docs/adr/012-visual-output-product-contract.md`](file:///d:/AppDEV/Jozor1.1/docs/adr/012-visual-output-product-contract.md) mapping the Product > Template > Preset > Renderer hierarchy.

## 2026-07-06 - Private Beta Publishing Test Script

- Summary:
  - Created a focused private beta test script to guide users through testing the Jozor 1.0 Publishing & Printing experience.
  - Outlined tester setup rules (sanitized data, no legal IDs, offline backup verification), test execution flows (manuscript configurations, print previews, history validations, and poster exports), and feedback questions.
  - Created documentation [`docs/reviews/private-beta-publishing-test-script-2026-07-06.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-publishing-test-script-2026-07-06.md).

## 2026-07-05 - Controlled PDF Environment Activation Checklist

- Summary:
  - Prepared the operational checklist and safety playbook for transitioning the Controlled PDF Adapter from experimental status to active staging/production.
  - Documented environment variables (`BROWSERLESS_TOKEN`, `BROWSERLESS_ENDPOINT`, `VITE_ENABLE_CONTROLLED_PDF`), activation sequence, rollback steps, and privacy boundaries.
  - Created documentation [`docs/reviews/controlled-pdf-environment-activation-checklist-2026-07-05.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/controlled-pdf-environment-activation-checklist-2026-07-05.md).

## 2026-07-05 - Controlled PDF Test Tree Review Gate

- Summary:
  - Prepared the test tree criteria and checklist for verifying real manuscript PDF quality on the remote Browserless service without sending sensitive family data.
  - Defined synthetic Arabic RTL test tree requirements (35 individuals, timeline events, citations, and placeholder media).
  - Bypassed remote browser checks since `BROWSERLESS_TOKEN` is unset in the default environment, marking the review gate status as **Pending**.
  - Created documentation [`docs/reviews/controlled-pdf-test-tree-review-2026-07-05.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/controlled-pdf-test-tree-review-2026-07-05.md) and [`docs/reviews/evidence/controlled-pdf-test-tree-review-2026-07-05/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/controlled-pdf-test-tree-review-2026-07-05/evidence_notes.md).

## 2026-07-05 - Controlled PDF Synthetic Activation Smoke Check

- Summary:
  - Executed a synthetic activation smoke check of the Controlled PDF path using only synthetic HTML.
  - Created [`scripts/controlled-pdf-browserless-smoke.mjs`](file:///d:/AppDEV/Jozor1.1/scripts/controlled-pdf-browserless-smoke.mjs) which reads `BROWSERLESS_TOKEN` from the environment, posts synthetic Arabic HTML, and writes the output to `tmp/controlled_pdf_synthetic_smoke.pdf`.
  - The script skips cleanly with a safe warning if `BROWSERLESS_TOKEN` is unset, protecting against unintended deployment failure.
  - Verified local client-server boundaries, mock readiness status probes, and error masking rules in vitest.
  - Created documentation [`docs/reviews/controlled-pdf-synthetic-activation-smoke-2026-07-05.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/controlled-pdf-synthetic-activation-smoke-2026-07-05.md) and [`docs/reviews/evidence/controlled-pdf-synthetic-activation-smoke-2026-07-05/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/controlled-pdf-synthetic-activation-smoke-2026-07-05/evidence_notes.md).

## 2026-07-05 - Controlled PDF External Renderer Adapter (Phase 2B)

- Summary:
  - Implemented the Browserless-compatible external renderer adapter behind the `VITE_ENABLE_CONTROLLED_PDF` feature flag.
  - Replaced the Phase 1 serverless function 501 stub in [`api/publishing/render-manuscript-pdf.ts`](file:///d:/AppDEV/Jozor1.1/api/publishing/render-manuscript-pdf.ts) with a real router that POSTs the sanitized HTML payload to the external rendering endpoint when `BROWSERLESS_TOKEN` is configured, returning a generic 503 error if the token is missing and generic 502 bad gateway errors on upstream failures.
  - Wrote a new serverless API test suite [`src/api/__tests__/renderManuscriptPdfRoot.test.ts`](file:///d:/AppDEV/Jozor1.1/src/api/__tests__/renderManuscriptPdfRoot.test.ts) testing GET method rejections (405), missing tokens (503), missing body params (400), upstream rendering failures (502), and successful binary stream transmission (200).
  - Updated client tests in [`ControlledPdfApiClient.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/services/__tests__/ControlledPdfApiClient.test.ts) and [`ControlledPdfReadinessService.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/services/__tests__/ControlledPdfReadinessService.test.ts) to verify correct handling of 502/503 states.
  - Created documentation [`docs/reviews/controlled-pdf-external-renderer-adapter-2026-07-05.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/controlled-pdf-external-renderer-adapter-2026-07-05.md).

## 2026-07-05 - Controlled PDF Rendering Strategy Spike (Phase 2A)

- Summary:
  - Evaluated Controlled PDF rendering strategies comparing local serverless Chromium vs. external browserless cloud APIs.
  - Successfully verified local headless Chrome rendering using Playwright on synthetic Arabic HTML: generated [`tmp/synthetic_spike.pdf`](file:///d:/AppDEV/Jozor1.1/tmp/synthetic_spike.pdf) in ~6.4s (~186 KB) with complete font and page-break support.
  - Audited Vercel runtime constraints and recommended proceeding with **Option B (External Render Service)** due to function bundle size limits (50MB) and memory limits (1024MB) under large trees.
  - Created evaluation review document [`docs/reviews/controlled-pdf-rendering-strategy-spike-2026-07-05.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/controlled-pdf-rendering-strategy-spike-2026-07-05.md) and experimental script [`scripts/controlled-pdf-render-spike.mjs`](file:///d:/AppDEV/Jozor1.1/scripts/controlled-pdf-render-spike.mjs).

## 2026-07-05 - Controlled PDF Production Adapter Phase 1

- Summary:
  - Implemented the first production-ready adapter contract for Controlled PDF generation behind the `VITE_ENABLE_CONTROLLED_PDF` feature flag.
  - Created [`ControlledPdfApiClient.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/services/ControlledPdfApiClient.ts) to manage the API call to the serverless rendering function at `/api/publishing/render-manuscript-pdf` with robust type checking and error scrubbing.
  - Added a Vercel serverless function stub [`api/publishing/render-manuscript-pdf.ts`](file:///d:/AppDEV/Jozor1.1/api/publishing/render-manuscript-pdf.ts) returning a `501 Not Implemented` response.
  - Wired `ControlledManuscriptPdfAdapter` to utilize the new API client when the feature flag is enabled.
  - Updated `ControlledPdfReadinessService` to probe the real adapter endpoint, ensuring it correctly falls back to browser-print mode during Phase 1.
  - Added new unit test suite [`ControlledPdfApiClient.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/services/__tests__/ControlledPdfApiClient.test.ts) and expanded existing adapter, readiness, and export service test suites.

## 2026-07-05 - Manual Real Manuscript Print Review Round 2

- Summary:
  - Performed a visual and manual review of the Family Book manuscript print layout on small, medium, and large trees.
  - Confirmed the layout stability enhancements prevent name/source title overflows, fact row collisions, and awkward page breaks.
  - Verified preview/export option consistency and privacy masking in the fallback print flow.
  - Created review documentation in [`docs/reviews/manuscript-print-review-round-2-2026-07-05.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/manuscript-print-review-round-2-2026-07-05.md) and [`docs/reviews/evidence/manuscript-print-review-round-2-2026-07-05/evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/manuscript-print-review-round-2-2026-07-05/evidence_notes.md).

## 2026-07-05 - Manuscript Preview/Export Consistency Audit

- Summary:
  - Manuscript preview/export consistency was verified so preview, Family Book PDF, and export history consume the same manuscript options and privacy-masked data.
  - Added new test suites in `ExportCloudPanel.test.tsx` verifying:
    - Option changes (root, reading order, photos, biography draft, timeline, bibliography) correctly mark the preview as stale.
    - If the preview is stale, clicking the PDF button inside the preview modal triggers a preview refresh instead of exporting stale data.
    - Directly clicking the Family Book PDF button on the card bypasses preview and uses current configuration parameters.
  - Confirmed alignment between `useExport.ts` and `PublishingTracker.ts` to ensure metadata matches.

## 2026-07-05 - Manuscript Options Honesty Pass

- Summary:
  - Manuscript configuration controls were clarified so visible options represent currently functional behavior. Custom ordering remains supported internally but is hidden until a dedicated ordering UI exists.
  - Renamed option "Include photos" to "Include available profile photos" / "تضمين الصور الشخصية المتاحة".
  - Renamed option "Narrative draft" to "Draft biography text" / "نصوص تعريفية مبدئية".
  - Updated tests in [`ExportCloudPanel.test.tsx`](file:///d:/AppDEV/Jozor1.1/src/features/the-vault/components/__tests__/ExportCloudPanel.test.tsx) to match the new labels and verify that the custom ordering option is not present in the select dropdown.

## 2026-07-04 - Publishing Cleanup & Legacy Separation

- Summary:
  - Removed the `Legacy Vector PDF` button from the Classic Family Book Manuscript card in [`ExportCloudPanel.tsx`](file:///d:/AppDEV/Jozor1.1/src/features/the-vault/components/ExportCloudPanel.tsx). The manuscript section now exposes only `Preview Manuscript` and `Family Book PDF` (html-print renderer). The legacy jsPDF path is preserved in the codebase but no longer reachable from the manuscript card UI.
  - Clarified the generic tree PDF label in the data export grid: `vaultExportPdf` → `'Tree PDF Snapshot'` (EN) / `'لقطة PDF للشجرة'` (AR).
  - Updated [`ExportCloudPanel.test.tsx`](file:///d:/AppDEV/Jozor1.1/src/features/the-vault/components/__tests__/ExportCloudPanel.test.tsx): asserts Legacy Vector PDF is absent and verifies Family Book PDF calls the handler with `renderer: 'html-print'`.

## 2026-07-04 - Private Beta Communications Pack

- Summary:
  - Formulated the official communications templates and tester documentation guides for the private beta cohort.
  - Created [private-beta-communications-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-communications-2026-07-04.md) including English/Arabic invitation message templates, structured feedback questions, bug severity rules, and owner pre-dispatch checklists.
  - Created [private-beta-tester-guide-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-tester-guide-2026-07-04.md) outlining safety rules, copied GEDCOM guidelines, prohibited documents/media, and step-by-step user flow testing walkthroughs.

## 2026-07-04 - Rollback Tag & Private Beta Invitation Gate

- Summary:
  - Finalized the final release gates by establishing the E2E verification reports and Go/No-Go checklists.
  - Updated release handoff reports, go/no-go decisions, and checklists to reflect the successful execution of the live production smoke run.
  - Created [private-beta-invitation-gate-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-invitation-gate-2026-07-04.md) setting the cohort guidelines, strict tester data safety rules, freeze triggers (stop conditions), and rollback protocols.

## 2026-07-04 - Public Production Smoke Execution

- Summary:
  - Executed the E2E live smoke test suite against the public production deployment URL (`https://jozor.vercel.app/`).
  - Confirmed the application shell, sign-in components, and Kindi AI triggers load correctly under both English and Arabic locales.
  - Verified that all high-severity console exceptions and debug logging statements are completely silenced in production.
  - Documented findings in [live-deployed-smoke-run-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/live-deployed-smoke-run-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/live-deployed-smoke-run-2026-07-04/evidence_notes.md).

## 2026-07-04 - Public Deployed URL Smoke Support

- Summary:
  - Modified the Playwright E2E live smoke harness to optionally support testing public deployment URLs without requiring a Vercel bypass token.
  - Updated [live-deployed-smoke.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/live-deployed-smoke.spec.ts) to skip only when `DEPLOYED_SMOKE_URL` is missing.
  - Added an assertion that fails the test with a descriptive error message if a protected URL redirects to the Vercel SSO login page.
  - Documented findings in [live-deployed-smoke-harness-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/live-deployed-smoke-harness-2026-07-04.md).

## 2026-07-04 - Private Beta Release Handoff Pack

- Summary:
  - Compiled the final operational handoff checklist for the private beta release wave.
  - Linked status reports for all pre-launch performative, architectural, and security gates.
  - Outlined the remaining open gates required before sending invites (environment configuration, running the E2E live smoke harness, confirming deployed Paddle sandbox checkout, creating rollback tags, and locking Supabase signup configurations).
  - Documented findings in [private-beta-release-handoff-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-release-handoff-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/private-beta-release-handoff-2026-07-04/evidence_notes.md).

## 2026-07-04 - First Beta Tester Onboarding Pack

- Summary:
  - Created a comprehensive operational onboarding guide for the first cohort of closed private beta testers.
  - Specified cohort gating conditions, cohort sizing (3-5 testers), and data guidelines requiring copied test trees/GEDCOMs instead of primary family records.
  - Outlined detailed manual and automated E2E test scenarios to guide testers across authentication, editing, role privacy, manuscripts, Kindi AI, Maps, and Paddle Sandbox billing.
  - Documented feedback collection workflows, bug classification (P0/P1/P2), and the rollback/revocation procedures.
  - Documented findings in [first-beta-tester-onboarding-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/first-beta-tester-onboarding-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/first-beta-tester-onboarding-2026-07-04/evidence_notes.md).

## 2026-07-04 - Live Deployed Smoke Harness Dry Run

- Summary:
  - Executed the newly implemented Playwright E2E live smoke harness dry-run with the local test configuration.
  - Confirmed that the test runs and skips cleanly when required staging environment variables are not supplied.
  - Verified security validation rules to prevent the bypass secret from leaking in URLs or console logs.
  - Documented findings in [live-deployed-smoke-execution-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/live-deployed-smoke-execution-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/live-deployed-smoke-execution-2026-07-04/evidence_notes.md).

## 2026-07-04 - Live Deployed Smoke Execution Harness

- Summary:
  - Implemented a secure, clean-skipping E2E test harness for verifying live staging/preview deployments.
  - Created [deployedAccess.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/deployedAccess.ts) to handle Vercel deployment protection bypass securely via contextual cookies.
  - Created E2E test [live-deployed-smoke.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/live-deployed-smoke.spec.ts) covering app shell loading, login triggers, Kindi assistant triggers, and browser console sanitation checks.
  - Confirmed that the test skips cleanly when required access keys are not set.
  - Documented findings in [live-deployed-smoke-harness-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/live-deployed-smoke-harness-2026-07-04.md).

## 2026-07-04 - Private Beta Access Enablement Pack

- Summary:
  - Formulated and documented a secure path to transition the Live Deployed Smoke gate from Pending to executable.
  - Recommended using Vercel Automation Bypass cookies/tokens to securely bypass Deployment Protection during E2E/manual smoke testing.
  - Outlined detailed step-by-step instructions to configure bypass credentials safely on local testing/CI machines without exposing secrets in git.
  - Defined a post-smoke pre-invitation verification checklist and an access revocation/rollback plan.
  - Documented findings in [private-beta-access-enablement-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-access-enablement-2026-07-04.md).

## 2026-07-04 - Live Deployed Smoke Run / Vercel Protection Bypass Gate

- Summary:
  - Audited access paths to perform the live deployed browser smoke test.
  - Checked for Vercel bypass variables (`VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_PROTECTION_BYPASS`, `VERCEL_BYPASS_TOKEN`) and confirmed they are missing from local environments.
  - Marked the Live Deployed Smoke Gate status as Pending due to active Vercel Deployment Protection on the staging/preview branch.
  - Created a comprehensive manual and E2E test verification guide for live deployments.
  - Documented findings in [live-deployed-smoke-gate-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/live-deployed-smoke-gate-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/live-deployed-smoke-gate-2026-07-04/evidence_notes.md).

## 2026-07-04 - Vercel Environment & Deployment Smoke

- Summary:
  - Audited the presence of required Vercel environment variables (Supabase, Paddle, Gemini, Google Drive, App Origin) using the authenticated Vercel CLI session.
  - Verified that all required keys are successfully configured/encrypted under the Production environment.
  - Validated local build compilation and typechecks, confirming successful chunk split mapping and zero warnings/errors.
  - Performed a deployed URL smoke check on a protected Vercel preview deployment, observing that access is secured behind Vercel SSO deployment protection.
  - Documented findings in [vercel-env-deployment-smoke-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/vercel-env-deployment-smoke-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/vercel-env-deployment-smoke-2026-07-04/evidence_notes.md).

## 2026-07-04 - Private Beta Final Go/No-Go Checklist Update

- Summary:
  - Compiled and closed all pre-launch and post-optimization checklists into the final private beta operational decision report.
  - Updated [private-beta-release-checklist-2026-07-03.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-release-checklist-2026-07-03.md) to integrate latest Pass/Conditional Pass evidence from geography/Kindi lazy chunking, authenticated E2E role harness, and Paddle checkout API/UI validation runs.
  - Created [private-beta-go-no-go-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-go-no-go-2026-07-04.md) setting the final Go decision for beta deployment, while gating external invites on post-deployment live environment and billing checks.
  - Created [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/private-beta-go-no-go-2026-07-04/evidence_notes.md) as the consolidated audit index.

## 2026-07-04 - Paddle Sandbox Checkout Smoke

- Summary:
  - Audited the presence of all required Paddle and billing environment variables (`PADDLE_API_KEY`, `PADDLE_ENVIRONMENT`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRO_PRICE_ID`, `PADDLE_FAMILY_PRICE_ID`, `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENVIRONMENT`) in `.env.local` without printing values.
  - Performed a code audit on the serverless API endpoints (`api/billing/create-checkout-session.ts`, `api/billing/customer-portal.ts`, `api/billing/paddle-webhook.ts`) and client component (`PaywallModal.tsx`), verifying correct payload limits, token auth verification, rate limiting, and event handling.
  - Discovered and ran all 36 targeted unit tests across 9 billing test files, with all tests passing successfully.
  - Created a dedicated E2E browser test (`tests/e2e/paddle-paywall-smoke.spec.ts`) that triggers the paywall modal, clicks "Upgrade Now", intercepts the API checkout request, and confirms the UI handles checkout API responses correctly.
  - Documented findings in [paddle-sandbox-checkout-smoke-2026-07-04.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/paddle-sandbox-checkout-smoke-2026-07-04.md) and [evidence_notes.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/paddle-sandbox-checkout-2026-07-04/evidence_notes.md).

## 2026-07-03 - E2E Authenticated Role Harness Fix

- Summary:
  - Created [authState.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/authState.ts) to manage Playwright authenticated storage states, including session expiration validation and refresh flow.
  - Created [collabHelpers.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/collabHelpers.ts) to share collaboration E2E UI actions.
  - Refactored [collaboration-live.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/collaboration-live.spec.ts) and [app-smoke.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/app-smoke.spec.ts) to use the shared helpers.
  - Enforced clear skip behavior (`test.skip`) on the role transition smoke test when environment variables are missing, resolving E2E pipeline flakiness.
  - Documented setup and requirements in [e2e-auth-role-harness-2026-07-03.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/e2e-auth-role-harness-2026-07-03.md).

## 2026-07-03 - Private Beta Browser Smoke Live Run

- Summary:
  - Run full E2E browser smoke tests using Playwright against `http://localhost:3000`.
  - 14/15 E2E tests passed successfully, verifying app boot, navigation, viewer write guards, and telemetry diagnostics.
  - Confirmed successful integration of geography and Kindi lazy-loading optimization: no chunk size warnings, dynamic loading of KindiOverlayWrapper (61.55 kB) and MapViewImpl (8.02 kB) verified.
  - Final decision: **Conditional Pass** (No P0/P1 blockers, ready for private beta release).

## 2026-07-03 - Kindi Chunk Split Optimization

- Summary:
  - Created [KindiOverlayWrapper.tsx](file:///d:/AppDEV/Jozor1.1/src/features/kindi/components/KindiOverlayWrapper.tsx) to lazy-load the assistant UI, controllers, and hooks.
  - Refactored [KindiSearchTrigger.tsx](file:///d:/AppDEV/Jozor1.1/src/features/kindi/components/KindiSearchTrigger.tsx) to dynamically import the wrapper upon first click, preserving chat history when closed.
  - Replaced barrel type imports with direct type imports to break unwanted bundling of `crypto-js` and `dexie`.
  - Removed Kindi manual chunk configuration from [vite.config.ts](file:///d:/AppDEV/Jozor1.1/vite.config.ts) to enable natural Vite bundling.
  - Successfully eliminated `feature-kindi` chunk (~722 kB) and replaced it with a dynamic 61.55 kB wrapper chunk, with no remaining Vite chunk size warnings on features.
  - Validated with typecheck, lint, build, and 117 unit tests (all passed).

## 2026-07-03 - Geography Chunk Split Optimization

- Summary:
  - Extracted Leaflet rendering layer from `GeographicJourneyModal.tsx` into a lazy component `MapView.tsx`/`MapViewImpl.tsx`.
  - Removed barrel file (`types/index.ts`) imports inside the geography feature to eliminate side-effect bundling of `crypto-js`.
  - Removed the explicit `feature-geography` manual chunking rule in `vite.config.ts` to allow automatic optimization.
  - Successfully reduced geography chunk size from 598 kB to a 7.93 kB dynamic map chunk (Leaflet vendor chunk stable at 158 kB).
  - Validated build, typecheck, lint, and unit tests (all passed).

## 2026-07-03 - Private Beta Deployment Smoke Test

- Summary:
  - Ran full smoke test on commit `15cb3cd`.
  - All automated checks passed: typecheck, lint, build (3865 modules), targeted (80 tests), full suite (604 tests), Supabase migration check (70/70 matched, no drift).
  - Browser smoke marked Pending — requires live session.
  - No P0/P1 blockers found.
  - Final recommendation: **Go for private beta**.
  - Evidence notes: `docs/reviews/evidence/private-beta-smoke-2026-07-03/evidence_notes.md`.

## 2026-07-03 - Private Beta Release Checklist

- Summary:
  - Created [private-beta-release-checklist-2026-07-03.md](file:///d:/AppDEV/Jozor1.1/docs/reviews/private-beta-release-checklist-2026-07-03.md) to serve as the operational guide for the first controlled beta release.
  - Defined rollback plans, beta tester guardrails, and data policies.
  - Added Go/No-Go checklist items initialized as Pending by default.
  - Documented recommended next pack as `Private Beta Deployment Smoke Test`.

## 2026-07-03 - Launch Readiness Audit

- Summary:
  - Run comprehensive launch readiness audits across all tests (604 unit tests passed), compilation builds, and remote migrations (no drifts).
  - Audited environment configurations presence (no secrets printed).
  - Concluded the final decision **Ready for private beta**.
  - Documented results in `docs/reviews/launch-readiness-audit-2026-07-03.md`.

## 2026-07-03 - Import/Export End-to-End Validation

- Summary:
  - Added [importExportLifecycle.test.ts](file:///d:/AppDEV/Jozor1.1/src/utils/__tests__/importExportLifecycle.test.ts) covering the full lifecycle (import -> edge derivation -> export -> manuscript building -> rendering -> privacy masking).
  - Assured display names are used instead of IDs in Markdown and HTML rendering.
  - Verified viewer privacy masking prevents raw sensitive details from appearing in exported formats.
  - Verified GEDCOM `SOUR` records survive import into legacy source fields without breaking manuscript rendering.
  - Documented results and synthetic test fixtures in `docs/reviews/import-export-e2e-validation-2026-07-03.md`.

## 2026-07-03 - Pre-Launch Role QA End-to-End

- Summary:
  - Conducted a pre-launch role QA audit for roles (`owner`, `editor`, `viewer`, `guest`), combining local browser observations with code-audited checks.
  - Verified local write blockages for viewer roles and RLS data masking on the view boundary.
  - Documented flow results, untested scenarios (such as remote SMTP triggers), and matrix checklists in `docs/reviews/prelaunch-role-qa-e2e-2026-07-03.md`.
  - Found no P0/P1 blockers.

## 2026-07-03 - Supabase Baseline Squash Decision & Dry Run

- Summary:
  - Conducted a non-destructive audit and dry-run connection for all 70 Supabase SQL migrations.
  - Confirmed perfect synchronization between local files and remote database (no drifts).
  - Recommended the decision **Proceed after live migration history backup** to prevent remote deployment conflicts.
  - Documented complete inventory, options, and future baseline commands in `docs/reviews/supabase-baseline-squash-decision-2026-07-03.md`.

## 2026-07-03 - Dexie Baseline Compression

- Summary:
  - Collapsed historical IndexedDB (Dexie) versions (V1 to V6) into a single baseline version 1 structure.
  - Copied all tables and index definitions literally from the final state to preserve existing logic.
  - Removed all obsolete `.upgrade(...)` methods and references.
  - Added [db.test.ts](file:///d:/AppDEV/Jozor1.1/src/utils/__tests__/db.test.ts) verifying all table names, primary keys, and schema indexes.

## 2026-07-03 - Pre-Launch RLS & Security Final Validation

- Summary:
  - Conducted a comprehensive security audit on Row Level Security (RLS) tables, view rules (`people_secure`), and storage buckets on Supabase.
  - Verified viewer privacy restrictions, write restrictions, and data isolation.
  - Documented RLS matrices and verification status in `docs/reviews/prelaunch-rls-security-validation-2026-07-03.md`.
  - Found no P0/P1 security gaps in the audited migration/policy definitions.
  - Clarified that relationships, sources, and citations are not standalone Supabase tables in the audited migrations and currently rely on local storage and/or the `people`/`people_secure` payload boundary.

## 2026-07-03 - Pre-Launch Schema & Migration Cleanup Audit

- Summary:
  - Audited local IndexedDB (Dexie) schema configurations and Supabase migration chains (70 SQL files).
  - Evaluated compatibility layers, deprecation strategies, and RLS structures.
  - Documented findings, cleanups, and squashing recommendations in `docs/reviews/prelaunch-schema-migration-cleanup-audit-2026-07-03.md`.
  - Identified no P0 launch blockers but highlighted P1 database drift risks and P2 Dexie upgrade chain simplification opportunities.

## 2026-07-03 - GEDCOM Import RelationshipEdge Bridge

- Summary:
  - Audited and verified the GEDCOM import integration with Jozor 2.0 `RelationshipEdge` architecture.
  - No changes were made to export code or import UI.
  - Bridge correctness has been verified directly via automated tests using `deriveRelationshipsFromPeople` on the imported structures.
  - Confirmed that self-parenting, cycles, and missing reference links already cleaned by the hardening pack do not produce relationship edges.
  - Verified legacy compatibility arrays remain safely populated.

## 2026-07-03 - GEDCOM Import Hardening

- Summary:
  - Hardened the GEDCOM import engine by introducing validation layers on the parser.
  - Implemented reference checking to identify duplicate records, missing references, self-parenting links, and cyclic parental relationships.
  - Omitted only unsafe relationship links while preserving person records to prevent tree corruption.
  - Formatted standardized testable warnings and verified that valid imports remain warning-free.

## 2026-07-03 - Publishing Visual Review

- Summary:
  - Conducted a comprehensive visual review of the Family Manuscript preview features.
  - Verified 3 target scenarios (Small Tree, Medium Tree, and Real Large Tree) in real browser local environments.
  - Documented observed behaviors, RTL Arabic wrap safety, bibliography tables, and privacy masking boundaries in `docs/reviews/manuscript-real-visual-review-2026-07-03.md`.
  - Review status: `Conditional Pass` (local PDF artifacts generated but kept untracked).
  - No code changes.

## 2026-07-03 - GEDCOM Integration Completion Pack

- Summary:
  - Switched GEDCOM export defaults to `RelationshipEdge` when relationship edges are available.
  - Preserved byte-for-byte legacy fallback when relationship edges are missing or empty.
  - Accepted ADR-011 and marked the production switch phases complete.
  - Verified viewer masking remains upstream and GEDCOM privacy protections continue to pass.

## 2026-07-03 - GEDCOM Phase C2 Internal Export Mode Helper

- Summary:
  - Added `gedcomExportMode` helper with a disabled-by-default legacy GEDCOM relationship mode.
  - Added test-only override support for exercising the hook-level `relationship-edge` path without activating it for users.
  - Updated GEDCOM export hook tests to verify viewer masking remains upstream under both legacy and test-only edge modes.

## 2026-07-02 - GEDCOM Phase C1 Hook Wiring In Legacy Mode

- Summary:
  - Wired GEDCOM export calls in `useExport.ts` to pass current relationship edges into `exportToGEDCOM`.
  - Kept `relationshipMode` explicitly set to `legacy-array`, preserving current GEDCOM output behavior.
  - Added hook tests verifying viewer masking remains upstream and relationship edges do not activate edge-backed GEDCOM mode.

## 2026-07-02 - GEDCOMRelationshipAdapter Phase A/B

- Summary:
  - Added an optional adapter-backed GEDCOM relationship mode behind explicit `relationshipMode: 'relationship-edge'` options.
  - Preserved default GEDCOM export behavior as legacy arrays and kept `useExport.ts` unchanged.
  - Added regression tests proving default byte-for-byte compatibility, empty-edge legacy fallback, edge authoritative drift behavior, and viewer privacy preservation.

## 2026-07-02 - GEDCOMRelationshipAdapter Production Switch Plan

- Summary:
  - Created switch plan document `docs/reviews/gedcom-production-switch-plan-2026-07-02.md` outlining the integration strategy.
  - Recommended adapter-backed optional parameter integration with deterministic fallbacks to legacy arrays when edges are absent.
  - No runtime changes and no UI alterations.

## 2026-07-02 - GEDCOMRelationshipAdapter Integration Dry Run

- Summary:
  - Implemented `compareGedcomRelationships` comparison helper that directly contrasts legacy array groupings with edge-derived groups.
  - Added unit tests in `gedcomRelationshipComparison.test.ts` verifying fallback equivalence for undefined or empty edges, missing spouse/child mismatches, and privacy boundaries.
  - No runtime export changes and no UI alterations.

## 2026-07-02 - GEDCOM RelationshipEdge Adapter Kernel

- Summary:
  - Added an isolated `gedcomRelationshipAdapter` kernel that converts Jozor 2.0 `RelationshipEdge` data into GEDCOM-ready family groups without switching the active exporter.
  - Covered spouse normalization, parent-child edge direction, single-parent families, missing-person warnings, drift detection, deterministic output, and privacy-safe warning payloads.
  - Kept GEDCOM production export behavior unchanged pending staged adapter integration.

## 2026-07-02 - GEDCOM RelationshipEdge Adapter Design ADR

- Summary:
  - Added ADR-011 documenting the future design for the `GEDCOMRelationshipAdapter` to consume Jozor 2.0 `RelationshipEdge` data safely.
  - Defined explicit edge direction rules, deterministic spouse normalization, and privacy constraints restricting warning messages to person IDs only.
  - No runtime behavior changed.

## 2026-07-02 - GEDCOM Privacy & Relationship Readiness Audit

- Summary:
  - Conducted a comprehensive audit of GEDCOM export privacy and relationship readiness.
  - Added unit tests in `gedcomLogic.test.ts` verifying that masked people omit all sensitive biographical details.
  - Verified that masked individuals participate correctly in structural family relationships (`FAMS`, `FAMC`) without leaking raw personal identities.
  - Documented legacy array compatibility constraints and pending `RelationshipEdge` mapping integrations.
  - Created audit document `docs/reviews/gedcom-readiness-audit-2026-07-02.md`.
  - No features activated and no UI changes.

## 2026-07-02 - Publishing Export Privacy Regression Pack

- Summary:
  - Added focused regression coverage proving that all publishing/export egress paths (JSON, JOZOR, GEDCOM, Markdown, ICS, PDF fallback) respect privacy masking for viewer role.
  - Asserted that raw original names and sensitive fields (e.g. birth dates and birth places) do not leak to files.
  - Centralized metadata diagnostics filtration in `ManuscriptPdfExportService` using `sanitizeDiagnosticsMetadata` to protect all custom and default adapters.
  - No UI changes, no features activated, and Controlled PDF remains inactive.

## 2026-07-02 - Controlled PDF Phase 4

- Summary:
  - Added ADR-010 documenting the production adapter direction and requirements (headless Chromium HTML/CSS render).
  - Enforced rules that the production adapter must consume only FamilyManuscriptModel or generated HTML, and that export history must manifest privacy details.
  - No runtime behavior changed.

## 2026-07-02 - Controlled PDF Activation Readiness Phase 3

- Summary:
  - Added test-only override API `setTestOverrideForTests` functioning only inside test suites.
  - Verified default adapter stub status with flag enabled (remains an unavailable stub honestly).
  - Verified test-injected custom adapter behavior with flag enabled.
  - Controlled PDF remains disabled by default, and the default adapter remains an intentional unavailable stub. Phase 3 proves the gate can open only through test-injected renderer paths.

## 2026-07-02 - Controlled PDF Activation Readiness Phase 2

- Summary:
  - Verified end-to-end fallback contract when controlled-pdf is requested while flag is disabled.
  - Confirmed browser fallback routing, omission defaults, and safe unrevealing diagnostic metadata formatting.

## 2026-07-02 - Controlled PDF Activation Readiness Phase 1

- Summary:
  - Gated the Controlled PDF export path behind a disabled-by-default feature flag helper.
  - Hardened readiness evaluation and adapter status queries to enforce browser fallback when flag is inactive.
  - Added comprehensive test suites confirming flag defaults and safe diagnostics.

## 2026-07-02 - Manuscript Preview & Configuration Polish Phase 2

- Summary:
  - Polished neutral fallbacks for generations depth (All branch) and root person (Not selected).
  - Added visual review informational hint inside the export panel.
  - Updated unit tests verifying configuration fallbacks and preview status changes.

## 2026-07-02 - Manual Manuscript Visual Review Run

- Summary:
  - Executed manual review for manuscript narrative flow under HEAD commit `cfcdda7`.
  - Documented headless execution sandbox constraints and kept review status as `Preliminary - pending visual evidence`.

## 2026-07-02 - Manual Manuscript Review Pack

- Summary:
  - Added preliminary manual manuscript narrative review checklist and evidence folder.

## 2026-07-01 - Manuscript Narrative Flow Verification

- Summary:
  - Added end-to-end integration and renderer unit tests verifying narrative manuscript ordering.
  - Confirmed the manuscript layout hierarchy reads root, spouse, and descendants depth-first across model, HTML, and Markdown outputs.

## 2026-06-28 - Controlled PDF Export Phase 8B

- Summary:
  - Declared pending visual evidence requirements for the readiness surface and maintained conditional pass verification status.

## 2026-06-28 - Controlled PDF Export Phase 8A

- Summary:
  - Documented native browser print dialog capture limitations, resolved verification alternatives, and maintained conditional pass status for the validation report.

## 2026-06-28 - Controlled PDF Export Phase 7

- Summary:
  - Added preliminary fallback print invocation notes and updated the controlled PDF validation report to a conditional pass state pending visual screenshots.

## 2026-06-28 - Controlled PDF Export Phase 6

- Summary:
  - Added a preliminary manual verification checklist and validation evidence report under docs/reviews to capture pipeline integrity checkpoints.

## 2026-06-28 - Controlled PDF Export Phase 5

- Summary:
  - Built diagnostic React hook `useControlledPdfReadiness` to check and manage PDF pipeline status lazy states.
  - Wired a subtle read-only status indicator tag inside the Vault manuscript settings layout panel.
  - Confirmed UI print triggers remain unchanged and continue to fallback on browser prints.

## 2026-06-27 - Controlled PDF Export Phase 4

- Summary:
  - Created `ControlledPdfReadinessService` to implement a programmatic readiness decision gate for controlled PDF validation checks.
  - Enforced metadata allowlist and privacy sanitization across probe diagnostics.

## 2026-06-27 - Controlled PDF Export Phase 3

- Summary:
  - Built a local controlled PDF renderer prototype (`LocalControlledPdfRenderer`) using dynamic imports for `jspdf`.
  - Kept the default UI path set to browser fallback print without premature runtime changes.
  - Verified the integration via isolated custom adapter test suites.

## 2026-06-15 - Production Readiness Audit

- Summary:
  - Added a production-readiness audit that separates sandbox-ready status from
    true production blockers.
  - Re-ran Supabase security advisors and confirmed the only remaining warning
    is leaked-password protection.
  - Confirmed Vercel has the expected environment variable names for Supabase,
    Google, Paddle, VAPID, cron, Kindi AI, Gemini, and app origin.
  - Identified likely legacy `VITE_FIREBASE_*` Vercel variables as non-blocking
    cleanup before production.
- Current stance:
  - `https://jozor.vercel.app` remains a sandbox/staging environment until the
    production gates are explicitly completed.

## 2026-06-15 - Supabase RPC Execution Contract Revalidation

- Summary:
  - Revalidated application RPC callers against the current migration history.
  - Confirmed `sync_tree_batch` is a live browser contract used by the delta
    sync client and must remain executable by `authenticated`.
  - Confirmed the retired `create_person_and_relationship` and
    `delete_person_and_relations` RPCs have no current application callers and
    must remain unavailable to browser roles.
  - Added a read-only RPC execution contract diagnostic and removed retired RPCs
    from the required schema audit list.
- Safety:
  - No function definition, grant, table data, or application behavior changed.
  - The new diagnostic reports only contract violations.
- Live verification:
  - Ran `supabase/diagnostics/rpc_execution_contract_check.sql` against the
    linked Supabase project on 2026-06-15.
  - Result: `0` contract violations.

## 2026-06-15 - Supabase SECURITY DEFINER Boundary Revalidation

- Summary:
  - Re-ran linked Supabase security advisors and confirmed that the historical
    authenticated/anonymous SECURITY DEFINER warnings are closed.
  - Confirmed the only remaining advisor warning is leaked-password protection,
    deferred while the project remains on the Free plan.
  - Replaced the hard-coded function inventory with a dynamic public/private
    function and policy inventory.
  - Added a read-only boundary check for public privileged RPC exposure and
    private trigger-helper execution grants.
- Remaining narrow cleanup:
  - Completed through
    `20260615194119_restrict_private_trigger_function_execute.sql`.
  - Browser-role EXECUTE privileges were removed from both private trigger-only
    helpers without detaching their triggers.
- Safety:
  - No table data or application RPC contract changed.
  - The post-migration boundary check returned no violations.

## 2026-06-14 - Local Performance Observability Budgets

- Summary:
  - Centralized actionable budgets for rendering FPS, active DOM nodes, layout
    execution, and measured bootstrap phases.
  - Added local-only health classifications to the diagnostics panel:
    healthy, watch, action needed, and not measured.
  - Kept all measurements in the browser and avoided collecting family data,
    names, queries, or cloud telemetry.
- Verification:
  - Performance budget unit tests: pass
  - Diagnostics drawer tests: pass
  - `npm run lint`: pass
  - `npm run typecheck`: pass
  - `npm run build`: pass
- Operational intent:
  - Use the status to identify the slow phase before considering rendering or
    orchestration changes.

## 2026-06-14 - AI Proxy Request Validation, Batch 2

- Summary:
  - Replaced the remaining unchecked AI request cast with operation-specific
    runtime validation.
  - Added field and prompt size limits for biography, ancestor chat, story,
    extraction, image analysis, and Kindi planning requests.
  - Validated count fields and rejected unsupported operations before billing
    quota reservation.
  - Restricted image analysis to JPEG, PNG, and WebP base64 payloads with a
    bounded encoded size.
- Verification:
  - AI proxy boundary tests cover unsupported operations, malformed prompts,
    invalid counts, invalid image payloads, and empty chat messages.
- Safety:
  - No provider, billing, quota, or user-facing behavior changed for valid
    requests.

## 2026-06-13 - Kindi AI Boundary Hardening, Batch 1

- Summary:
  - Validated `kindi_plan` request shape and normalized redacted text before
    billing quota reservation or provider invocation.
  - Added a 2,000-character request limit and rejected UUID-like internal IDs.
  - Hardened provider-output sanitation with field size limits and UUID rejection.
  - Rejected invented `[NAME_n]` tokens that were absent from the redacted request.
  - Prevented non-executable classifications from retaining executable drafts.
  - Kept all AI output behind the existing local planning and confirmation flow.
- Verification:
  - AI proxy and sanitizer tests: pass
  - Kindi planning, privacy, and billing-flow tests: pass
  - `npm run lint`: pass
  - `npm run typecheck`: pass
  - `npm run typecheck:api`: pass
  - `npm run build`: pass
- Safety:
  - No automatic rule injection or direct AI execution was introduced.

## 2026-06-13 - React Stabilization Closure and Current Baseline

- Summary:
  - Completed the React Hooks and ESLint stabilization track with zero warnings.
  - Made `npm run lint` reject any future warning through `--max-warnings 0`.
  - Re-audited older roadmap assumptions against the current source tree.
  - Confirmed that the Kindi planner decomposition, ChartType pruning, rendering
    guardrails, and pending-operation projection/replay tracks are already complete.
  - Added `docs/current-execution-baseline-2026-06-13.md` as the current source of
    truth for the next implementation track.
- Verification:
  - `npm run lint`: pass
  - `npm run typecheck`: pass
  - `npm run typecheck:api`: pass
  - `npm run build`: pass
  - Unit shard 1: 370 passed, 8 skipped
  - Unit shard 2: 404 passed
- Next recommended track:
  - AI request/output boundary validation and adversarial tests.
  - No automatic cloud rule injection.

## 2026-06-07 - TypeScript Hygiene: Discussions Feature Boundary

- Summary:
  - Added explicit discussion feature types for Supabase discussion rows, realtime presence users, and collaborators.
  - Replaced remaining `any` usage inside `src/features/discussions` across the store, service, hook, and drawer.
  - Kept existing discussion UI labels and fallback behavior unchanged.
- Files changed:
  - `src/features/discussions/types.ts`
  - `src/features/discussions/store/discussionSlice.ts`
  - `src/features/discussions/services/treeDiscussionService.ts`
  - `src/features/discussions/hooks/useTreeDiscussion.ts`
  - `src/features/discussions/components/TreeDiscussionDrawer.tsx`
- Verification:
  - `npx tsc --noEmit --pretty false`: pass
  - `npx vitest run src/features/discussions/services/__tests__/treeDiscussionService.test.ts src/features/discussions/store/__tests__/discussionSlice.test.ts src/features/discussions/components/__tests__/TreeDiscussionItem.test.tsx`: pass
  - `npm run build`: pass
- Notes:
  - This is a type-safety cleanup only; realtime subscription, unread counts, message ordering, and send/delete behavior were not intentionally changed.

## 2026-06-07 - TypeScript Hygiene: Node Context Menu Translations

- Summary:
  - Replaced broad translation `any` casts in `NodeContextMenu` with a narrow local optional-translation type.
  - Preserved existing fallback labels for optional keys that are not part of the current translation schema.
- Verification:
  - `npx tsc --noEmit --pretty false`: pass
  - `npx vitest run src/components/__tests__/NodeContextMenu.test.tsx`: pass
- Notes:
  - This changed typing only; menu permissions and action behavior were not intentionally changed.

## 2026-06-07 - TypeScript Hygiene: AI Proxy Boundary

- Summary:
  - Removed the remaining broad `any` usage from `src/api/ai-proxy.ts`.
  - Typed the Supabase admin client inside the request handler and replaced an RPC `.catch(...)` chain with explicit `try/catch` error handling.
- Verification:
  - `npx vitest run src/api/__tests__/aiProxyRateLimit.test.ts src/api/__tests__/aiProxyRoot.test.ts`: pass
  - `npx tsc --noEmit --pretty false`: pass
- Notes:
  - No billing, quota, rate-limit, or provider behavior was intentionally changed.

## 2026-06-07 - TypeScript Hygiene: Low-Risk Service Cast Cleanup

- Summary:
  - Replaced low-risk `any` casts in service-layer code with narrower local types.
  - Kept behavior unchanged while improving compiler coverage around image compression, Supabase auth, import payloads, and Google Picker media selection.
- Files changed:
  - `src/services/supabaseStorageService.ts`
  - `src/services/supabaseTreeMutationService.ts`
  - `src/services/google/GoogleMediaService.ts`
  - `src/services/supabaseClient.ts`
- Verification:
  - `npx tsc --noEmit --pretty false`: pass
  - `npx vitest run src/services/__tests__/supabaseTreeMutationService.test.ts src/services/__tests__/supabaseTreeService.test.ts src/services/google/__tests__/GoogleAuthService.test.ts`: pass
- Notes:
  - This is a Phase 1 hygiene step only; no sync, rendering, or storage behavior was intentionally changed.

## M-007b-4 - Remove Legacy JSON Snapshot System (Archive-Only)

- Task ID: `M-007b-4`
- Title: `Remove Legacy JSON Snapshot System (Archive-Only)`
- Summary:
  - Simplified the snapshot system by removing the remaining legacy JSON snapshot paths.
  - Made snapshot creation, listing, and restore archive-only around `.jozor` files.
  - Kept the main tree JSON system unchanged.
- Files changed:
  - `hooks/useGoogleSync.ts`
  - `services/storageProvider.ts`
  - `services/googleDriveProvider.ts`
  - `services/google/interfaces.ts`
  - `services/google/GoogleDriveService.ts`
- Architectural impact:
  - Snapshot restore is now a single archive-based path.
  - The provider snapshot layer is now Blob-only.
  - Snapshot listing is restricted to `.jozor` archives only.
- Snapshot behavior:
  - `saveSnapshot(...)` now accepts archive blobs only.
  - Snapshot restore always uses `loadSnapshotFileRaw(...)` plus `restoreBlueprintArchive(...)`.
  - Legacy JSON snapshot branching and JSON snapshot filtering were removed.
- Verification:
  - `typecheck`: pass
- Notes:
  - Main tree file save/load remains JSON-based and was not modified.
  - `archiveService`, `archiveRestoreService`, and `loadFullState(...)` were left unchanged.

## M-007b-3 - Snapshot Creation Cutover (Blueprint Archive)

- Task ID: `M-007b-3`
- Title: `Snapshot Creation Cutover (Blueprint Archive)`
- Summary:
  - Switched snapshot creation from JSON payloads to blueprint archive blobs.
  - Reused the existing provider archive-snapshot support without changing provider APIs in this phase.
  - Kept restore compatibility by relying on the earlier format-aware routing between `.json` and `.jozor`.
- Files changed:
  - `hooks/useGoogleSync.ts`
- Architectural impact:
  - New snapshots are now created through `buildBlueprintArchive(...)` and stored as archive snapshots.
  - The safety snapshot taken before restore was also cut over to archive format.
  - JSON snapshot support remains available for previously stored snapshots.
- Snapshot behavior:
  - Snapshot creation now saves through `storageProvider.saveSnapshot(blob, treeId, label, 'archive')`.
  - Listing and rotation continue working through the earlier dual-format provider support.
  - `loadFullState(...)` and the main restore/store contract were left unchanged.
- Verification:
  - `typecheck`: pass
- Notes:
  - A local `buildSnapshotArchive(fullState, label)` helper was added in `useGoogleSync.ts`.
  - This phase changed snapshot creation only; provider APIs were not modified here.

## M-007b-2 - Snapshot Restore Routing (JSON vs Archive)

- Task ID: `M-007b-2`
- Title: `Snapshot Restore Routing (JSON vs Archive)`
- Summary:
  - Made snapshot restore format-aware without changing provider logic or snapshot creation.
  - Preserved the existing JSON restore path exactly as before.
  - Added archive snapshot routing through the blueprint archive restore service.
- Files changed:
  - `hooks/useGoogleSync.ts`
- Architectural impact:
  - `handleRestoreSnapshot(...)` now routes by snapshot filename format.
  - `.jozor` snapshots load through `loadSnapshotFileRaw(...)` and `restoreBlueprintArchive(...)`.
  - Legacy JSON snapshots still load through the existing `loadFile(...)` plus `loadFullState(...)` path.
- Restore behavior:
  - Archive restore warnings are logged without failing the restore flow.
  - Object URL cleanup was added for the archive-restore lifecycle so temporary media URLs do not accumulate indefinitely.
- Verification:
  - `typecheck`: pass
- Notes:
  - No provider-layer changes were made in this phase.
  - No snapshot creation cutover was performed in this phase.
  - This task completed restore routing only.

## M-007b-1 - Provider Snapshot Dual-Format Support (Non-Breaking)

- Task ID: `M-007b-1`
- Title: `Provider Snapshot Dual-Format Support (Non-Breaking)`
- Summary:
  - Extended the storage provider snapshot surface to support both JSON and archive snapshot formats.
  - Preserved JSON snapshot behavior as the default path.
  - Added raw snapshot blob loading support for future archive restore work.
- Files changed:
  - `services/storageProvider.ts`
  - `services/googleDriveProvider.ts`
  - `services/google/interfaces.ts`
  - `services/google/GoogleDriveService.ts`
- Architectural impact:
  - Snapshot handling in the provider layer now supports dual-format evolution without changing the main file APIs.
  - Snapshot listing now includes both `.json` and `.jozor` files under the existing tree-specific naming prefix.
  - Main Drive file operations remain JSON-only and unchanged.
- Snapshot compatibility behavior:
  - `saveSnapshot(...)` still defaults to JSON behavior with the existing upload path.
  - Archive snapshot support is now available through `Blob` payloads with `format='archive'`.
  - `loadSnapshotFileRaw(fileId)` was added for future archive snapshot restore routing.
- Verification:
  - `typecheck`: pass
- Notes:
  - No restore-flow changes were made.
  - No current snapshot creation path was cut over in this phase.
  - This task prepared the provider layer only; actual archive snapshot adoption remains a later step.

## M-007b - Archive Cutover (Snapshot + Export Creation) - Phase 1

- Task ID: `M-007b`
- Title: `Archive Cutover (Snapshot + Export Creation)`
- Phase: `Phase 1 - Export cutover only`
- Summary:
  - Switched the `.jozor` export creation path to the new blueprint archive builder.
  - Preserved the existing export UX, download flow, and output filename.
  - Kept snapshot creation and Drive-backed snapshot storage untouched in this phase.
- Files changed:
  - `hooks/useExport.ts`
- Architectural impact:
  - `useExport` now builds `.jozor` exports through `services/archiveService.ts`.
  - Export output now follows the blueprint archive layout with `tree.json`, `manifest.json`, and `media/*`.
  - No snapshot cutover was attempted because the current Drive snapshot path still depends on JSON storage and JSON restore behavior.
- Verification:
  - `typecheck`: pass
- Notes:
  - No Base64 was reintroduced into archive JSON.
  - No `storageProvider`, Google Drive provider, snapshot logic, or restore routing changes were made.
  - Snapshot cutover remains a future phase that will require provider-layer Blob support and coordinated restore-path updates.

## M-008b - Archive Restore System (Blueprint Format)

- Task ID: `M-008b`
- Title: `Archive Restore System (Blueprint Format)`
- Summary:
  - Added a new additive restore service for blueprint archives without changing the legacy importer.
  - Implemented restore parsing for `tree.json`, `manifest.json`, `media/avatars/*`, and `media/gallery/*`.
  - Reconstructed runtime media using browser-safe object URLs instead of Base64 payloads.
- Files changed:
  - `services/archiveRestoreService.ts`
- Architectural impact:
  - Introduced a new services-layer restore boundary for blueprint archives.
  - Kept `utils/archiveLogic.ts` and current import UI wiring untouched.
  - Restore output is shaped for Zustand-first loading through `FullState`, not direct Supabase writes.
- Restore behavior:
  - Returns restored `state`, parsed `manifest`, accumulated `warnings`, and `revokeObjectUrls()`.
  - Missing avatar or gallery files are tolerated safely and reported in `warnings`.
  - Runtime media references are rebuilt with object URLs created from archive blobs.
- Verification:
  - `typecheck`: pass
- Notes:
  - `voiceNotes` are restored as empty because the current blueprint archive format does not carry them.
  - This task implemented restore parsing only and did not perform legacy cutover or UI integration.

## M-009 - Visible Tree Highlighting Refactor

- Task ID: `M-009`
- Title: `Visible Tree Highlighting Refactor`
- Summary:
  - Refactored visible-tree highlighting so the final highlighting result is resolved in the layout controller instead of the render component.
  - Removed highlight-specific chart-model mapping ownership from the highlighting helper.
  - Aligned the highlighting pipeline more closely with the minimap architecture pattern while preserving current fallback behavior.
- Files changed:
  - `components/FamilyTree.tsx`
  - `domain/visibleTreeHighlighting.ts`
  - `hooks/useFamilyTreeLayoutController.ts`
- Architectural impact:
  - `FamilyTree` is now passive for highlight delivery.
  - Visible-tree highlighting vs legacy fallback vs radial suppression is resolved in `useFamilyTreeLayoutController.ts`.
  - `visibleTreeHighlighting.ts` no longer owns local chart-model mapping semantics.
  - `FamilyTree.tsx` no longer contains highlight suppression branching.
- Verification:
  - `typecheck`: pass
- Status:
  - Code complete
  - QA completed after focused regression follow-up
- Notes:
  - No `ChartType` changes were made.
  - Minimap behavior and layout core were left untouched.
  - A post-refactor regression was found and fixed in `useFamilyTreeLayoutController.ts` where `highlightedPath` read `activeChartType` before initialization.
  - The fix was minimal: move `activeChartType`, `layoutKind`, and `chartModel` initialization above the `highlightedPath` memo.
  - Follow-up investigation for Case 3 (`fan/radial` with `visibleTreeHighlighting = false`) found no additional code bug.
  - The temporary `isLoading` hang reproduced only in the secondary QA environment and was traced to QA timing during immediate scenario seeding plus chart-mode switching, not to the flag-off suppression path itself.
  - No extra code change was required for Case 3 beyond the focused initialization-order fix.

## M-008 - Backup Rotation Policy (Keep Last 3 Snapshots)

- Task ID: `M-008`
- Title: `Backup Rotation Policy (Keep Last 3 Snapshots)`
- Summary:
  - Updated the existing snapshot cleanup policy to retain only the newest 3 snapshots per tree.
  - Reused the existing provider-layer cleanup flow instead of introducing new hook-level deletion logic.
  - Preserved current snapshot ordering and error-handling behavior.
- Files changed:
  - `services/google/GoogleDriveService.ts`
- Architectural impact:
  - `storageProvider.cleanupSnapshots(treeId)` now enforces the retention rule globally through the provider layer.
  - No hook changes were made in `useGoogleSync`.
  - No `storageProvider` API changes or snapshot-format changes were introduced.
- Retention behavior:
  - Snapshot ordering still relies on `modifiedTime desc`.
  - Cleanup deletes snapshots after index `3`, keeping only the latest 3 per tree.
  - Cleanup remains scoped per tree through the existing `treeId` filtering path.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task changed retention only.
  - Archive integration and retention configurability remain out of scope.

## M-007 - Snapshot -> Archive System

- Task ID: `M-007`
- Title: `Snapshot -> Archive System`
- Summary:
  - Added a new canonical archive builder in the services layer.
  - Implemented blueprint-compliant archive generation with `tree.json`, `manifest.json`, `media/avatars/*`, and `media/gallery/*`.
  - Kept archive JSON data-only by separating media references into `manifest.json` instead of embedding Base64 payloads.
- Files changed:
  - `services/archiveService.ts`
- Architectural impact:
  - Introduced the new archive-generation boundary without changing legacy import/export wiring.
  - Preserved `utils/archiveLogic.ts` as the old archive path for now, so cutover remains a later task.
  - Did not modify `services/supabaseTreeService.ts`, snapshot UI behavior, or restore logic.
- Determinism notes:
  - Sorted people before archive assembly.
  - Sorted object keys before serializing `tree.json` and `manifest.json`.
  - Stabilized `createdAt` from snapshot metadata when available, or from the provided override.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task implemented archive generation only.
  - Legacy archive replacement and runtime cutover were intentionally deferred to a later task.

## M-001 - Move Gemini API access to Vercel proxy (cleanup + verification)

- Task ID: `M-001`
- Title: `Move Gemini API access to Vercel proxy (cleanup + verification)`
- Summary:
  - Removed legacy AI endpoints that were no longer part of the approved architecture.
  - Cleaned direct Gemini references from helper and test files that still implied direct provider usage.
  - Enforced the proxy-only flow by keeping active AI calls routed through `/api/ai-proxy`.
- Files changed:
  - `api/gemini.ts`
  - `api/ai/generate-content.ts`
  - `api/check-env.ts`
  - `test-gemini-direct.js`
  - `test-api.html`
  - `services/geminiService.ts`
- Security impact:
  - Removed client-side API key exposure paths and legacy direct-provider usage paths from the approved M-001 scope.
- Final state:
  - All active AI calls go through `/api/ai-proxy`.
- Verification results:
  - `typecheck`: pass
  - `lint`: pass (warnings outside scope)
  - `tests`: pass
- Notes:
  - The task was already partially implemented before the Phase 0 audit, so this work completed the cleanup and verification pass rather than introducing the proxy flow from scratch.

## M-002 - Remove Firebase remnants from codebase

- Task ID: `M-002`
- Title: `Remove Firebase remnants from codebase`
- Summary:
  - Removed Firebase-specific wording from active auth-related API responses and comments.
  - Removed stale Firebase env typings that were no longer used by the application.
  - Cleaned Firebase-era auth failure wording in the targeted live collaboration Playwright spec.
- Files changed:
  - `api/auth/session.ts`
  - `api/auth/exchange.ts`
  - `vite-env.d.ts`
  - `tests/e2e/collaboration-live.spec.ts`
  - `services/supabaseTreeService.ts`
- Architectural impact:
  - Supabase remains the only auth system.
  - Firebase remnants were removed from active code, comments, and env typings.
- Verification:
  - `typecheck`: pass
  - `lint`: pass (warnings outside scope)
  - `targeted Playwright spec`: skipped due to live environment gating
- Notes:
  - The task was a cleanup/remnants task, not an auth migration.

## M-004A - Safe additive shared type updates

- Task ID: `M-004A`
- Title: `Safe additive shared type updates`
- Summary:
  - Added `privacyMode` to `TreeSettings`.
  - Added `BackupManifest`.
  - Added `NotificationType`.
- Files changed:
  - `types.ts`
- Architectural note:
  - `ChartType` was intentionally left unchanged.
  - `AppNotification` ownership remains in `store/slices/uiSlice.ts` for now.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task was split out from `M-004` to avoid breaking runtime consumers.

## M-004B1 - Safe type-module bridge consolidation

- Task ID: `M-004B1`
- Title: `Safe type-module bridge consolidation`
- Summary:
  - Replaced duplicated shared type definitions in internal types modules with re-export bridges from `types.ts`.
- Files changed:
  - `types/common.ts`
  - `types/tree.ts`
  - `types/visualization.ts`
- Architectural note:
  - `types.ts` remains the single source of truth for the consolidated shared types in this phase.
  - Runtime files were intentionally not modified.
- Types consolidated in this phase:
  - `ChartType`
  - `ExportType`
  - `UserProfile`
  - `DriveFile`
  - `Collaborator`
  - `TreeNode`
  - `FanArc`
- Verification:
  - `typecheck`: pass
- Notes:
  - `TreeSettings`, `ModalType`, `TreeLink`, and `AppNotification` were explicitly deferred.

## M-004B2A - TreeLink ownership reconciliation

- Task ID: `M-004B2A`
- Title: `TreeLink ownership reconciliation`
- Summary:
  - Resolved `TreeLink` ownership to `types.ts`.
  - Removed unused `sourceCoords` from the duplicate internal type surface.
  - Replaced the duplicate definition in `types/visualization.ts` with a re-export bridge.
- Files changed:
  - `types/visualization.ts`
- Final TreeLink shape:
  - `source`
  - `target`
  - `type`
  - `customOrigin?`
- Architectural note:
  - `types.ts` is now the single source of truth for `TreeLink`.
  - No runtime files were modified.
- Verification:
  - `typecheck`: pass
- Notes:
  - `sourceCoords` was removed because no runtime consumers were found.

## M-004B2B1 - ModalType runtime inventory reconciliation

- Task ID: `M-004B2B1`
- Title: `ModalType runtime inventory reconciliation`
- Summary:
  - Aligned `ModalType` with the real runtime modal inventory.
  - Added missing active modal keys.
  - Removed stale modal keys.
  - Synchronized `types.ts` and `types/common.ts`.
- Files changed:
  - `types.ts`
  - `types/common.ts`
- Final ModalType inventory:
  - `calculator`
  - `stats`
  - `chat`
  - `consistency`
  - `timeline`
  - `share`
  - `map`
  - `login`
  - `snapshotHistory`
  - `adminHub`
  - `globalSettings`
  - `migrationMap`
- Architectural note:
  - `ModalType` now reflects the authoritative runtime modal inventory.
  - No runtime logic files were modified.
- Verification:
  - `typecheck`: pass
- Notes:
  - `story` and `layoutSettings` were removed as stale keys.
  - This task reconciled inventory only and did not change modal behavior.

## M-004B2B2 - ModalType bridge consolidation

- Task ID: `M-004B2B2`
- Title: `ModalType bridge consolidation`
- Summary:
  - Removed duplicate `ModalType` ownership from `types/common.ts`.
  - Made `types.ts` the single source of truth for `ModalType`.
  - Replaced the duplicate definition with a re-export bridge.
- Files changed:
  - `types/common.ts`
- Architectural note:
  - `types.ts` is now the canonical owner of `ModalType`.
  - No runtime files or modal behavior were changed.
- Verification:
  - `typecheck`: pass
- Notes:
  - This task followed inventory reconciliation from `M-004B2B1`.
  - Bridge consolidation was limited to the types layer only.

## M-004 - Shared Types Consolidation (COMPLETED)

- Summary:
  - Established `types.ts` as the single source of truth for shared types.
  - Removed duplicate type ownership across internal modules.
  - Consolidated low-risk shared types using bridge re-exports.
  - Reconciled `TreeLink` ownership and removed unused fields.
  - Reconciled `ModalType` against runtime inventory.
  - Converted `types/common.ts` into a bridge surface.
- Completed sub-tasks:
  - `M-004A`
  - `M-004B1`
  - `M-004B2A`
  - `M-004B2B1`
  - `M-004B2B2`
- Architectural result:
  - Clear type ownership boundaries.
  - Reduced drift between modules.
  - Safer future refactoring surface.
- Deferred:
  - `TreeSettings` consolidation moved to a future task due to runtime coupling.

## ChartType Migration Status Summary

- Migration objective:
  - Introduce a controlled, behavior-preserving migration path from raw legacy `ChartType` checks toward adapter-based runtime classification, without changing rendering behavior, fallback behavior, or the public type surface yet.
- Completed safe replacements by file:
  - `hooks/useFamilyTreeLayoutController.ts`
  - `components/FamilyTree.tsx`
  - `utils/layout.worker.ts`
  - `utils/treeLayout.ts`
- Adapter work completed:
  - Preserved existing adapter functions:
    - `getChartTypeTarget(chartType)`
    - `isLegacyFanChartType(chartType)`
    - `isLegacyFocusFamilyChartType(chartType)`
  - Added:
    - `ChartLayoutKind = 'descendant' | 'pedigree' | 'force' | 'radial'`
    - `getChartLayoutKind(chartType)`
  - Current adapter mapping:
    - `'descendant' -> 'descendant'`
    - `'pedigree' -> 'pedigree'`
    - `'force' -> 'force'`
    - `'fan' -> 'radial'`
- Files and areas intentionally not migrated:
  - `types.ts`
  - `types/tree.ts`
  - broader controller logic in `hooks/useFamilyTreeLayoutController.ts`
  - broader rendering logic in `components/FamilyTree.tsx`
  - routing structure in `utils/layout.worker.ts`
  - fallback behavior in `utils/treeLayout.ts`
- Current safe-limit status per file:
  - `hooks/useFamilyTreeLayoutController.ts`: safe isolated fan-related replacements complete; further migration remains blocked by meaningful `descendant`, `force`, and flag semantics
  - `components/FamilyTree.tsx`: safe isolated fan-related replacements complete; further migration remains blocked by behavior-sensitive prop wiring, flags, and pass-through state
  - `utils/layout.worker.ts`: safe isolated classification replacements complete for fan and force classification; routing branches remain intentionally unchanged
  - `utils/treeLayout.ts`: safe isolated classification replacements complete for descendant and pedigree branch checks; fallback remains intentionally unchanged
- Blocked areas:
  - narrowing `ChartType`
  - removing legacy `ChartType` values from the public type surface
  - changing fallback behavior in `utils/treeLayout.ts`
  - removing or consolidating force behavior
  - removing force-related settings fields
- Why blocked:
  - legacy `ChartType` values still remain in active runtime usage paths
  - fallback behavior is part of behavior preservation and was intentionally left unchanged
  - force semantics are still active runtime behavior and must not be collapsed prematurely
- Recommended next phase:
  - continue with a coordinated routing audit rather than more isolated substitutions
  - evaluate whether worker and tree layout routing can move from isolated classification replacement to controlled branch adoption while keeping fallback behavior unchanged
  - do not change `types.ts` yet
  - do not remove legacy `ChartType` values yet
- Current state summary:
  - adapter boundary is now established
  - multiple low-risk isolated classifications have been migrated successfully
  - fallback behavior remains intentionally unchanged
  - legacy `ChartType` values still remain in the type surface and runtime contract

### Fallback Semantic Contract

- In `utils/treeLayout.ts`, fallback is defined as a `non-pedigree compatibility route`.
- It is not a user-facing default layout.
- It is not equivalent to descendant identity.
- Current runtime behavior remains unchanged.
- `force` and `radial` may currently degrade through this route in `treeLayout.ts`, but this is compatibility behavior only, not architectural identity.
- After the explicit radial compatibility branch, fallback is now effectively reduced to force-only compatibility behavior for the current supported layout kinds.
- `descendant`, `pedigree`, and `radial` are now explicitly handled before fallback.
- `force` is now the only remaining unresolved compatibility-routed kind in `treeLayout.ts`.

### Radial Semantic Contract In TreeLayout

- In `utils/treeLayout.ts`, `radial` is defined as an explicitly recognized compatibility-routed layout kind.
- `radial` is not descendant identity.
- `radial` is not pedigree identity.
- `radial` is not yet a true explicit route in `treeLayout.ts`.
- `radial` currently resolves through the non-pedigree compatibility route.
- This is transitional compatibility behavior, not final architectural identity.

## Translation And UI Small Cast Cleanup

- Scope:
  - Removed low-risk translation casts from account menus, mobile account/actions, tree discussion HUD, timeline labels, geography labels, and smart persona map action.
  - Replaced broad `Record<string, string>` and `any` translation access with narrow local optional translation extensions.
  - Tightened the Paywall checkout catch boundary from `any` to `unknown`.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Deferred:
  - Renderer, gallery item, modal-routing, diagnostics window, and map library integration casts remain outside this small UI/translation package.

## Appearance Lab And Persona Translation Cast Cleanup

- Scope:
  - Removed the remaining small translation casts from Settings Drawer, Appearance Lab shell, Smart Persona bio events, and Smart Persona media upload labels.
  - Replaced Appearance Lab section props that required `Record<string, string>` with the stricter `SettingsTextOptions` contract.
  - Added explicit legacy optional labels for `names`, `photos`, and `dates` instead of allowing an open string dictionary.
- Verification:
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- Deferred:
  - Smart Persona gallery item shape casts remain a separate data-model cleanup task.
# 2026-06-14 - AI extraction output boundary hardening

- Added runtime sanitization for AI-extracted person profile data before Smart Fill updates application state.
- Restricted extraction output to the supported profile fields and accepted only valid string, gender, and boolean values.
- Added bounded lengths for names, dates, places, professions, and biographies.
- Rejected non-object extraction results and oversized AI proxy text responses.
- Added focused tests for unknown-field removal, invalid-type rejection, length limits, and explicit boolean values.

# 2026-06-14 - AI proxy structured operation boundaries

- Removed client-controlled free-form prompts from person extraction, family story, and image analysis proxy operations.
- Moved operation instructions into the server-side AI proxy and validated structured operation data before provider usage.
- Replaced family-tree UUIDs with request-local `P1`, `P2`, and related anonymized tokens before story generation.
- Added language, member-count, relation-token, image MIME, and operation-shape validation.
- Added tests proving legacy arbitrary prompts and real identifiers are rejected at the proxy boundary.
- Replaced provider and server exception messages in `500` responses with a stable public error while preserving detailed server-side logging.

# 2026-06-14 - Production CORS origin normalization

- Detected an encoded mojibake BOM prefix in the production `APP_ORIGIN` response header during deployment verification.
- Added a shared HTTP origin normalizer that removes BOM variants, validates HTTP(S), strips paths, and rejects credential-bearing URLs.
- Applied the normalizer to both AI Proxy and Paddle checkout CORS configuration.
- Added shared unit tests and endpoint-level regression coverage for polluted Vercel environment values.
- Kept checkout origin normalization local to the Node function after production verification exposed a Vercel invocation failure from the new shared import boundary.

# 2026-06-20 - Geography place normalization and migration route map

- Centralized person-place extraction across birth, death, burial, residence, address, marriage, custom events, and partner relationship places.
- Reused the same place extraction path for geocoding sync, map journeys, and data-integrity notifications so equivalent places resolve consistently instead of fragmenting by punctuation or spelling variants.
- Updated family statistics and consistency place grouping to use canonical place keys and display names.
- Reworked the geography modal into a unified map workspace with a side panel, search, route/person selection, and event/migration modes.
- Added true migration-route rendering by aggregating person journeys into curved map paths with route counts and selectable route details.
- Added focused coverage for centralized place extraction, migration link aggregation, route rendering, and geography modal route summaries.

Deferred geography improvements:

- Tune migration path visuals after wider use: smaller arrowheads, softer selected states, and better curve geometry for short routes.
- Add a map timeline filter as a separate package after route rendering stabilizes.
- Add person and branch filters later; branch filtering is intentionally deferred to avoid complicating the first route-map package.
- Consider route clustering or edge bundling if large trees produce too many overlapping paths.
- Consider route hover popups only if the side-panel details are not enough in real use.

# 2026-06-25 - Publishing renderer taxonomy direction

- Accepted ADR-006 to classify publishing renderers by output purpose rather than language or implementation detail.
- Family manuscripts and long-form book-like outputs should use the HTML/CSS document renderer, regardless of Arabic or English language.
- Posters, charts, certificates, and compact graphic exports remain under the vector/canvas/jsPDF-oriented renderer family.
- Current technical identifiers such as `html-print` and `vector-pdf` remain transitional until a contained naming cleanup is worthwhile.
- Deferred Markdown as a future manuscript content/interchange layer, not a substitute for the output renderer strategy.

# 2026-06-25 - Attached entities privacy audit

- Audited Sprint 14/15 privacy side channels around photos, gallery items, voice notes, discussions, storage object metadata, media tables, and exports.
- Confirmed `people_secure` masks attached person media fields for viewer access and viewer exports use masked people across JSON/GEDCOM/ICS/JOZOR/publishing paths.
- Added a Supabase migration to prevent viewer collaborators from listing tree-scoped avatar object metadata through `storage.objects`.
- Documented the remaining legacy public-bucket URL risk and deferred full private media/signed-URL migration to a separate package.

# 2026-06-25 - Supabase migration drift documented

- Detected linked Supabase migration-history drift while preparing to apply the attached-entities privacy migration.
- Kept the database unchanged and did not run `db push` or migration repair while remote-only migration versions are unresolved.
- Documented the safe reconciliation plan in `docs/supabase-migration-drift-2026-06-25.md`.

# 2026-06-25 - Supabase migration drift reconciled

- Fetched remote-only Sprint 14 privacy migrations into the repository so future clones match the linked migration history.
- Removed duplicate-version fetch artifacts that conflicted with existing local migration filenames.
- Applied the reviewed idempotent local reconciliation migrations and the attached-entities avatar metadata policy migration with `supabase db push --linked --include-all --yes`.
- Verified `supabase migration list --linked` is aligned through `20260625161646`.
- Verified linked privacy behavior with `npx vitest run --config vitest.integration.config.ts tests/integration/privacyDatabase.integration.test.ts`.

# 2026-06-25 - Markdown manuscript renderer kernel

- Added a Markdown renderer for `FamilyManuscriptModel` as Sprint 19A's content/interchange layer.
- Kept Markdown independent from the HTML/CSS print renderer and did not replace the active manuscript PDF/preview flow.
- Rendered person chapters, timeline entries, bibliography summaries, citation coverage, and optional technical metadata.
- Added tests for Markdown output, metadata omission, and Markdown control-character escaping.

# 2026-06-25 - Markdown manuscript export path

- Added a legacy export route for `markdown` that builds a `FamilyManuscriptModel` and downloads a `.md` manuscript.
- Reused viewer masking, relationship edges, sources, and citations so Markdown follows the same privacy and evidence boundaries as publishing.
- Added the Markdown export action to The Vault export list with English and Arabic labels.
- Added test coverage proving viewer Markdown exports use masked people and omit technical metadata.

# 2026-06-26 - Markdown manuscript layer ADR

- Accepted ADR-007 to define Markdown as a content/interchange projection generated from `FamilyManuscriptModel`.
- Kept HTML/CSS as the preferred print and preview renderer for long-form family manuscripts.
- Documented that Markdown must respect the same privacy, relationship-edge, source, and citation boundaries as the rest of publishing.
- Clarified that Markdown is not a Markdown-to-PDF replacement path, not a layout engine, and not a separate renderer family.

# 2026-06-26 - Renderer independence ADR

- Accepted ADR-008 to document that presentation is not publishing business logic.
- Kept `FamilyManuscriptModel` as the content source of truth and renderers as output projections.
- Added a small `HtmlManuscriptTheme` token object so current manuscript styling can change later without scattering design literals through renderer logic.
- Corrected mojibake Arabic strings in the HTML manuscript renderer test fixture and static labels.

# 2026-06-26 - Manuscript PDF output strategy ADR

- Accepted ADR-009 to treat manual browser printing as a transitional manuscript PDF path.
- Kept HTML/CSS as the canonical preview and print-layout renderer for long-form manuscripts.
- Documented Headless Chromium PDF generation as the preferred future professional export path.
- Added PDF technical checks to the manuscript manual review gate.
- Extracted the browser-print fallback behind `ManuscriptPdfExportService` so a controlled PDF renderer can replace it later without changing export orchestration.
- Switched export orchestration to the neutral `exportManuscriptPdf` entrypoint so the current browser-print mode remains replaceable.
- Added the Phase 1 controlled PDF export contract with an adapter hook while preserving browser print as the default fallback.
- Centralized publishing renderer identifiers behind `PUBLISHING_EXPORT_RENDERERS` to keep technical route names out of export orchestration and UI code.

# 2026-06-26 - Manuscript preview configuration

- Extended the HTML manuscript preview flow with root-person selection and branch-depth configuration.
- Passed manuscript configuration through The Vault, the export hook, and `ManuscriptStructureBuilder`.
- Added a Manuscript Control Panel summary in The Vault so users can see the selected root, scope, and included sections before preview/export.
- Replaced the manuscript root dropdown with searchable root selection to keep large-family manuscript setup usable.
- Marked open manuscript previews as stale when settings change, prompting a refresh before exporting from the preview modal.
- Added a people-in-scope estimate to the Manuscript Control Panel summary so branch exports are easier to review before previewing.
- Added a narrative ordering engine for family manuscripts so people chapters follow the family reading path instead of alphabetical data order.
- Added manuscript ordering strategies for family path, chronological, and alphabetical reading modes, with The Vault passing the same strategy to preview and PDF export.
- Recorded manuscript reading-order metadata in `FamilyManuscriptModel`, export manifests, and export history entries for auditability.
- Added a custom manuscript ordering foundation so future manual ordering can pin selected people first while preserving the remaining family-path entries.
- Added relationship-aware family context labels to manuscript person entries so renderers can show root, spouse, generation, and related-entry cues.
- Added family-path breadcrumbs to manuscript person entries so readers can see each person’s route from the selected root.
- Added branch-divider markers for manuscript person chapters so family branches are visually separated during reading.
- Added a branch overview chapter to manuscript output so readers see branch names and counts before person entries.
- Recorded manuscript branch summaries in export manifests and export history for later audit and preview alignment.
- Added generation-depth limiting for branch manuscript models while preserving the full-branch option.
- Added coverage for configured preview options and depth-limited manuscript generation.
- Added an opt-in photo inclusion toggle for manuscript previews and HTML print output without making photos part of the default manuscript export.
- Added `docs/publishing-manuscript-manual-review.md` as the manual review gate before narrative generation or final publishing design polish.
- Added a structured manuscript review report template with pass, conditional-pass, and blocked decisions for real export review runs.
- Added a standalone preview-window action for long manuscript review without changing the export renderer.
- Added a controlled manuscript PDF adapter boundary with an unavailable-by-default stub and safe fallback routing to browser print.

# 2026-06-26 - Narrative generation kernel

- Added a deterministic `NarrativeDraftBuilder` for Sprint 18B as a conservative narrative kernel with no AI dependency.
- Added opt-in manuscript narrative drafts to the preview/export options.
- Rendered narrative drafts in HTML and Markdown manuscript outputs only when enabled.
- Kept narrative generation downstream of `FamilyManuscriptModel` so renderers remain presentation layers.
- Suppressed repetitive empty narrative drafts for fully masked private entries by default.
- Localized deterministic narrative drafts for Arabic manuscripts and removed mojibake strings from the HTML manuscript renderer.
- Localized manuscript titles, chapter titles, fact labels, and birth/death timeline event labels at the model layer.

# 2026-07-02 - Manuscript narrative visual review evidence

- Captured Playwright Chromium visual evidence for the synthetic manuscript narrative review pack.
- Generated `html-preview-people-chapter.png`, `html-preview-bibliography.png`, `browser-print-flow.png`, and `generated-family-book.pdf` under `docs/reviews/evidence/manuscript-narrative-2026-07-02/`.
- Verified the rendered people chapter follows the genealogical narrative order instead of a flat alphabetical list.
- Promoted `manuscript-narrative-review-2026-07-02.md` to `Final Pass - visual renderer evidence captured`.
