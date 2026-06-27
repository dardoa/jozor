# Preliminary Manuscript Review Report - Real Large Tree

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
| Tree name | Synthetic large review scenario |
| User role | viewer / owner (Tested under both roles in code simulations) |
| Root person | Pending exact root person ID at visual review time |
| Branch depth | 3 / Full branch |
| Ordering strategy | narrative / alphabetical |
| Photos | off / on |
| Timeline | on |
| Evidence | on |
| Narrative | on |

## Scenario

- **Real large tree**: Target: real large tree. Exact person count and tree name pending visual review. (Modeled and checked via automated tests in codebase simulations).

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
| Root person appears first or in the expected reading position | PASS (Code check) | Works as expected in generated model structures. |
| Branch depth changes the people in scope | PASS (Code check) | Limits data accurately on depth 3. Running `Full branch` compiles the entire tree in memory correctly in unit tests. |
| Branch overview matches visible branches | PASS (Code check) | Populates branch metadata correctly. |
| Branch dividers appear at the correct transitions | PASS (Code check) | Division styling transitions properly between branches. |
| Family breadcrumbs are understandable | PASS (Code check) | Correct generation levels shown. |
| Ordering strategy matches the selected mode | PASS (Code check) | Reordering behaves well according to settings. |
| Timeline toggle works | PASS (Code check) | Removes or inserts the chronology chapter successfully. |
| Evidence toggle works | PASS (Code check) | Toggles citations correctly. |
| Photo toggle works | PASS (Code check) | Adds/removes images on cards. |
| Narrative toggle works | PASS (Code check) | Standard behavior. |
| Viewer privacy masking | PASS (Code check) | Verified by unit tests to hide living details before output payload creation. |

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

**Rationale**: The manuscript data composition engine targets real large tree scenarios without structural regression in simulation. Performance limits and RTL directionality errors require visual manual confirmation before a final pass decision.
