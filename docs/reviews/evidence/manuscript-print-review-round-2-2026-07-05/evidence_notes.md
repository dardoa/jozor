# Evidence Notes - Manuscript Print Review Round 2 (2026-07-05)

## Visual Evidence Context

Due to strict privacy guidelines regarding personal and family trees, high-resolution screenshots containing real names are kept locally and are not committed to the repository. The following notes document the specific visual checkpoints verified during the review session.

## Checkpoint Details

### 1. Arabized Word-Wrapping Check
- **Location:** Person cards and bibliography table columns.
- **Verification:** Verified that name strings containing up to 8 nested grandparent/ancestor chains (e.g. `محمد بن عبد الرحمن بن محمد بن علي بن أحمد آل القاضي`) do not overflow their card headers. The CSS rules for `overflow-wrap: anywhere` break LTR/RTL names at character boundaries if needed.

### 2. Bibliography Table layout
- **Location:** Manuscript chapter `المراجع` (Evidence).
- **Verification:** Verified that long source titles (such as titles referring to specific manuscript volumes, publishing dates, and library codes) wrap cleanly within the second column of the `.bibliography-table`. The columns sizes (`44px` for index, `86px` for citation count) remain static while the remaining width is distributed to source title and target fields.

### 3. Print Spacing & Page Break Controls
- **Location:** Iframe print emulation mode.
- **Verification:** Emulated printing via Chrome DevTools print stylesheet view. Verified that:
  - `.chapter-page` starts on a new page.
  - Individual `.person-card` elements are never cut horizontally across page breaks.
  - Bibliography table rows do not get orphaned at page margins.

### 4. Metadata Completeness in Local Store
- **Location:** IndexedDB Export History Entry.
- **Verification:** Inspected state metadata after triggering export. Verified that all manuscript options (`rootPersonId`, `generationsDepth`, `orderingStrategy`, `includeImages`, `includeNarrative`, `includeTimeline`, `includeEvidence`) were logged inside the `manuscript` field.
