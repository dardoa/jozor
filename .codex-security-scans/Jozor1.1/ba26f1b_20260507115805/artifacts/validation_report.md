# Validation Report

## CAND-001

Disposition: reportable.

Validated flow:

1. `services/google/DrivePayloadClient.ts:28` parses Drive media content with `JSON.parse`.
2. `hooks/google/drivePersistenceCommands.ts:8` sends full-state Drive payloads into `loadFullState`.
3. `store/useAppStore.ts` loads people into state.
4. `utils/familyLogic.ts:34` preserves `sources` arrays during person validation without validating each `url`.
5. `components/sidebar/BioSourcesSection.tsx:97` renders `href={source.url}`.

Preconditions:

- Victim imports/loads attacker-controlled or attacker-modified Drive/backup content.
- Victim opens the source link in the sidebar.

Severity: Medium. This is click-triggered stored script execution from imported content rather than automatic render-time execution, but it crosses from untrusted backup data into the app origin and can expose browser-held tokens/data.

Suggested fix:

- Normalize source URLs on import and update, allowing only `https:`, `http:`, and optionally `mailto:`.
- Render unsafe/unknown schemes as plain text or omit the anchor.
- Add regression coverage for imported `javascript:` source URLs.
