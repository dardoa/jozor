# Finding Discovery Report

## CAND-001: Imported source URLs can become executable links

Affected locations:

- `services/google/DrivePayloadClient.ts:28`
- `hooks/google/drivePersistenceCommands.ts:8`
- `utils/familyLogic.ts:34`
- `components/sidebar/BioSourcesSection.tsx:97`

Source: arbitrary Google Drive/backup JSON loaded by the user or available through Drive access.

Broken control: imported `Person.sources` are preserved without URL-scheme validation.

Sink: `source.url` is rendered directly into an anchor `href` with `target="_blank"`.

Impact: a malicious imported/shared backup can set a source URL such as `javascript:...`; when the user clicks the source link, browser script can execute in the app origin. Because the app stores tokens and private tree data in browser-accessible state/storage, this is security-relevant.

Counterevidence checked: biography HTML is sanitized with DOMPurify, but that sanitizer does not cover source link URLs. Form `type="url"` only affects editing UX and does not validate imported state.
