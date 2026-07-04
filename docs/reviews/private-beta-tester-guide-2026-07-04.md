# Private Beta Tester Guide - Jozor 2.0 🌱

Thank you for participating in the Jozor 2.0 closed Private Beta! This guide outlines how to get started, what to test, and how to stay safe while using this staging version.

---

## 1. Safety Rules & Data Guidelines (CRITICAL)

Because this is a beta release running in a staging environment:

* **Use Copied / Synthetic Data Only**:
  * Import or create only a **copied or duplicated** family tree.
  * Do not upload or use your primary/original family database files without backing them up locally first.
* **Strictly Prohibited Material**:
  * **No Legal Identity Documents**: Do not upload passports, national IDs, driving licenses, or private certificates.
  * **No Highly Private Media**: Avoid uploading sensitive private photos or media during this testing phase.
  * Jozor takes security seriously, but staging databases may be reset or wiped during testing updates.

---

## 2. Core Testing Walkthroughs

Please try to test the following key flows during your session:

### Flow 1: Authentication & App Load
- Navigate to the provided staging URL.
- Log in or sign up using your email.
- Verify that the app loads the dashboard shell quickly without freezing or showing a blank screen.

### Flow 2: Interactive Tree Building
- Create a new family tree or add members manually.
- Add relationships (parents, spouses, siblings, children).
- Verify card linkages update and redraw smoothly.

### Flow 3: Viewer Privacy Masking
- Navigate to tree settings and invite a secondary test email address with the **Guest / Viewer** role.
- Log out, then log in as the viewer.
- Confirm that biographical details (full names, birth dates) of all living members are hidden/masked under your view.

### Flow 4: GEDCOM Import/Export
- Import a copied GEDCOM file. Confirm relations parse correctly.
- Export the tree back to a GEDCOM file.
- If exported from a Guest/Viewer session, confirm that the exported file has all living data sanitized and masked.

### Flow 5: Family Manuscript narrative
- Open the Vault/Manuscript panel.
- Select members and generate a printed preview narrative.
- Confirm the layout renders without errors.

### Flow 6: Kindi AI Assistant (Lazy-loaded component)
- Click the Kindi trigger in the bottom overlay or header.
- Try voice or text commands: "Add child to [Name]", "Show ancestors of [Name]", or simple searches.
- Confirm Kindi triggers and responds contextually.

### Flow 7: Geography Map (Lazy-loaded component)
- Open the migration map modal.
- Verify the Leaflet map clusters markers correctly and renders migration paths smoothly.

### Flow 8: Paddle Billing Sandbox Upgrade
- Open pricing settings and trigger the upgrade paywall.
- Click Pro or Family upgrade.
- Verify that the Paddle checkout overlay initiates in sandbox mode. Do not input real credit card details.

---

## 3. How to Report Feedback

Please log any confusion, layout bugs, or crashes via the private feedback form:
[Feedback Link]

If a crash or blocker occurs, please note the exact steps, browser, and device used so our engineering team can replicate and resolve it immediately.
