# Private Beta - Publishing Experience Test Script (2026-07-06)

This document provides a structured, step-by-step test script for private beta testers reviewing the Jozor 1.0 Publishing & Printing experience.

---

## 1. Safety and Setup Rules

Before beginning, please read and follow these safety guidelines:
1. **Sanitized Data Only:** Do not import your primary/active family tree if it contains highly sensitive personal identifiers or private media. Use a copied, synthetic, or anonymized version of your data for this test.
2. **No Real IDs:** Never upload scans of real passports, official identity cards, or legal document attachments.
3. **Backup First:** Verify you have an offline backup of your data. Never run beta tests directly on your only original family record.

---

## 2. Test Execution Flow

Follow this sequence of steps to evaluate the publishing and printing pipeline:

### Step 2.1: Navigation & Layout Discovery
- Open the Vault and navigate to the **Export & Cloud** tab.
- Observe the layout of the sections: **Family Book**, **Tree Posters & Images**, **Data Exports**, and **Publishing History & Quality**.
- Verify if the interface sections look organized and clear.

### Step 2.2: Manuscript Configuration & Preview
- Under **Classic Family Book Manuscript**, locate the **Manuscript Control Panel**.
- Set the following options:
  - **Manuscript root:** Search for and select a root person with spouse and children.
  - **Branch depth:** Select `3 generations`.
  - **Reading order:** Select `Family path`.
  - **Toggles:** Toggle "Include available profile photos", "Draft biography text", "Include timeline", and "Include bibliography" to `true`.
- Click the **Preview Manuscript** button.
- In the preview window:
  - Verify that the Arabic/English text is legible with correct RTL alignment.
  - Check if long name strings wrap cleanly without clipping.
  - Scroll through the biography, timeline, and bibliography list.

### Step 2.3: Printing and History Check
- In the preview header (or directly in the card panel), click the **Family Book PDF** button.
- Verify that your system's print preview dialog opens.
- Cancel the print dialog and close the preview modal.
- Look at the **Publishing History & Quality** panel at the bottom:
  - Verify that your export is recorded.
  - Inspect the calculated **Health Score**, **Citation Coverage**, and **Issues** count.
- Click **Clear History** once, verify that the button changes to **Confirm clear**, then click again to confirm history removal.

### Step 2.4: Poster & Data Exports
- Under **Tree Posters & Images**, click **Download PNG** or **Download PDF** for either the vintage or modern poster template.
- Under **Data Exports**, trigger a **GEDCOM** or **JSON** export.
- Verify that files download successfully to your device.

---

## 3. Feedback Questionnaire

Please provide your feedback on the following questions:
1. Did the Export & Cloud tab layout feel intuitive? Was the distinction between the Family Book, Tree Posters, and Data Exports clear?
2. Was the Family Book Preview helpful? Did you notice any visual layout bugs (e.g. text overlapping, page margin overflows)?
3. Did the Family Book's "Family path" reading order follow a logical narrative flow?
4. Did the **Publishing History & Quality** panel provide helpful info? Was the two-step "Clear History" confirmation clear?
5. What terminology or labels did you find confusing or technical?
6. Did you encounter any performance lag during rendering or exporting?

---

## 4. Immediate Stop Conditions

Stop the test and report immediately if you encounter:
- Any leakage of private/hidden data in public-facing exports.
- Application crashes or freezes.
- Empty or corrupted PDF output.
- Viewer-role users gaining access to editor-only publishing options.
