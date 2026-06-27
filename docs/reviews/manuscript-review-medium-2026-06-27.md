# Preliminary Manuscript Review Report - Medium Tree (200-500 People)

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
| Tree name | Synthetic medium review scenario |
| User role | owner |
| Root person | Pending exact root person ID at visual review time |
| Branch depth | 3 / Full branch |
| Ordering strategy | narrative / chronological / alphabetical |
| Photos | off |
| Timeline | on |
| Evidence | on |
| Narrative | on |

## Scenario

- **Medium tree**: Target range: 200-500 people. Exact visual-test count: Pending. (Modeled and checked via automated tests in codebase simulations).

## Output Reviewed

- In-app preview (HTML pipeline check)
- Standalone preview window (Pipeline check)
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
| Root person appears first or in the expected reading position | PASS (Code check) | Properly formatted at the root chapter node. |
| Branch depth changes the people in scope | PASS (Code check) | Switching from depth 3 to Full Branch successfully includes deeper generation branches. |
| Branch overview matches visible branches | PASS (Code check) | Matching indexes and summaries correctly list the added branches. |
| Branch dividers appear at the correct transitions | PASS (Code check) | Division borders separate family units appropriately. |
| Family breadcrumbs are understandable | PASS (Code check) | The breadcrumb array is clear and logical. |
| Ordering strategy matches the selected mode | PASS (Code check) | Narrative strategy organizes families cleanly, chronological places them by birth decade, and alphabetical sorts by first name. |
| Timeline toggle works | PASS (Code check) | Toggle correctly adds/removes timeline chapters. |
| Evidence toggle works | PASS (Code check) | Hides/shows sources and bibliography. |
| Photo toggle works | PASS (Code check) | Standard behavior without errors. |
| Narrative toggle works | PASS (Code check) | Toggles descriptive paragraphs. |
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

**Rationale**: The manuscript data composition engine processes medium trees cleanly in our unit tests. Full visual manual verification is required to sign off on rendering and page breaks.
