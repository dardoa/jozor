# Preliminary Manuscript Review Report - Small Tree (20-50 People)

## Review Status

- Status: Preliminary review
- Basis: Code inspection, automated checks, and publishing pipeline behavior
- Visual evidence: Pending
- Manual browser/PDF inspection: Pending
- This report must not be treated as final until the Evidence section is completed.

## Review Metadata

| Field | Value |
| --- | --- |
| Reviewer | Antigravity AI Coding Assistant |
| Date | 2026-06-27 |
| App version / commit | Pending exact commit hash at visual review time |
| Browser / OS | Pending (Google Chrome / Windows intended) |
| Tree name | Synthetic small review scenario |
| User role | owner |
| Root person | Pending exact root person ID at visual review time |
| Branch depth | 2 / 3 / Full branch |
| Ordering strategy | narrative |
| Photos | off / on |
| Timeline | off / on |
| Evidence | off / on |
| Narrative | off / on |

## Scenario

- **Small tree**: Target range: 20-50 people. Exact visual-test count: Pending. (Modeled and checked via automated tests in codebase simulations).

## Output Reviewed

- In-app preview (HTML pipeline check)
- Standalone preview window (Pipeline check)
- Markdown export (Data composition check)
- Browser print PDF baseline (Technical CSS rules evaluation)

## Evidence Required

| Evidence | Status | Notes |
| --- | --- | --- |
| Screenshot paths | Pending | Add screenshots of preview, branch overview, people chapter, bibliography, and any layout issue. |
| Exported PDF path | Pending | Add path to browser-print PDF or controlled PDF once available. |
| Tree size verified | Pending | Add actual person count used during the review. |
| Browser / OS | Pending | Add exact browser and OS used. |
| User role tested | Pending | owner/editor/viewer as applicable. |
| Preview load time | Pending | Record approximate load time for preview. |
| PDF generation time | Pending | Record approximate time if PDF was generated. |
| Viewer privacy proof | Pending | Add note or screenshot confirming masked output for viewer role. |

## Functional Checks

| Check | Status | Notes |
| --- | --- | --- |
| Root person appears first or in the expected reading position | PASS (Code check) | Root person properly anchors the hierarchy as the primary subject in both the visual tree and manuscript view in simulation. |
| Branch depth changes the people in scope | PASS (Code check) | Excludes depth 3 descendants when depth 2 is selected. Correctly limits generations. |
| Branch overview matches visible branches | PASS (Code check) | The dynamically generated table of contents and summaries align with the selected depth. |
| Branch dividers appear at the correct transitions | PASS (Code check) | Division headers are correctly inserted between different family branches/sub-lineages. |
| Family breadcrumbs are understandable | PASS (Code check) | Path navigation indicators show the generation lineage clearly. |
| Ordering strategy matches the selected mode | PASS (Code check) | Ordering engine places descendants correctly by generation structure in "narrative" flow. |
| Timeline toggle works | PASS (Code check) | Hides the chronological event section when turned off. |
| Evidence toggle works | PASS (Code check) | Hides bibliography / references when disabled. |
| Photo toggle works | PASS (Code check) | Controls card avatar markup in html payload. |
| Narrative toggle works | PASS (Code check) | Toggles inclusion of biographical stories. |
| Viewer privacy masking | PASS (Code check) | Masks living details for unauthorized roles. |

## Layout Checks

| Check | Status | Notes |
| --- | --- | --- |
| Arabic/RTL text is readable | Pending | Needs manual review. |
| Mixed Arabic/English text does not break badly | Pending | Needs manual review. |
| Long names wrap inside cards | Pending | Needs manual review. |
| Long places wrap inside cards/tables | Pending | Needs manual review. |
| Person cards do not overlap | Pending | Needs manual review. |
| Cards are not split in a visibly broken way | Pending | Needs manual review. |
| Bibliography is readable | Pending | Needs manual review. |
| Preview remains responsive | Pending | Needs manual review. |

## Evidence-Based Decision

- Conditional pass pending visual evidence

**Rationale**: The manuscript rendering model operates correctly on small trees based on automated tests. Final decision is pending actual visual inspection.
