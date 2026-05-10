# Codex Security Scan Report

Repository: `D:\AppDEV\Jozor1.1`
Scan id: `ba26f1b_20260507115805`

## Findings

### MEDIUM: Imported Drive/backup source URLs can become executable links

Affected line:

- `components/sidebar/BioSourcesSection.tsx:97`

Trace:

- `services/google/DrivePayloadClient.ts:28` parses arbitrary Drive JSON.
- `hooks/google/drivePersistenceCommands.ts:8` loads it into application state.
- `utils/familyLogic.ts:34` preserves `sources` without URL validation.
- `components/sidebar/BioSourcesSection.tsx:97` renders `source.url` directly as an anchor.

Impact:

A malicious backup/Drive payload can set a person source URL to an executable scheme such as `javascript:`. If the victim imports/loads the payload and clicks the source icon, script can run in the app origin, where browser-held app state and tokens may be accessible.

Recommended fix:

Validate source URLs during import and editing, allow only expected schemes such as `https:`, `http:`, and optionally `mailto:`, and render invalid schemes as plain text. Add a regression test for imported `javascript:` source URLs.

## Suppressed / Checked Areas

- Biography HTML XSS: suppressed because `BioBiographySection.tsx` sanitizes with DOMPurify.
- API auth/proxy: no surviving auth bypass in the checked route files.
- Push/cron endpoints: protected by user auth or `CRON_SECRET`.
- Supabase tree edit RPCs: latest hardened RPCs derive edit access from owner/collaborator state.
- Archive media paths: blueprint and legacy restore helpers enforce path-prefix/traversal checks.

## Residual Risk

This is not a complete exhaustive repository-wide closure. The scan used subagents as requested, but four of five subagents failed because the account hit its usage limit. The artifact checklist records exactly which files were read; remaining runtime files are deferred rather than falsely marked complete.
