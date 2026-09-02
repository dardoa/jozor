# Jozor Pre-Beta Closure Gate

Date: 2026-09-01

## Executive Decision

Status: **Production release candidate pass / external beta handoff pending**

The application and Visual Publishing Studio do not require an architectural rewrite. The release candidate is committed, pushed, and deployed to production. External tester invitations should wait until the open physical, owner-review, and authenticated-collaboration gates below are explicitly accepted or excluded from the first cohort.

## Verified In This Pass

- GitHub CI and the existing Vercel deployment were green before the current local publishing changes.
- The public production shell at `https://jozor.vercel.app/` passed the live deployed smoke with zero captured console errors.
- The local application smoke passed 15 scenarios; the authenticated multi-user scenario skipped because its dedicated E2E credentials were not supplied.
- Classic Heritage vNext is photo-led while preserving hide-photo, hide-living-photo, and initials fallback controls.
- SVG remains the canonical preview/export renderer.
- A2, A1, and A0 SVG/PDF dimensions and A2 PNG dimensions passed digital inspection.
- Branch Collection and Tiled Wall ZIP packages passed manifest, count, privacy, and structure checks.
- Focus and Radial remain active only for supported scope combinations and retain controlled capacity failures.
- Family Book now prefers a controlled, authenticated PDF path and downloads the returned PDF blob when available.
- Family Book font and profile images are embedded before controlled rendering; external storage URLs are removed from portable HTML.
- Browser print remains an explicitly labeled fallback.
- Controlled Family Book PDF is enabled in Preview and Production and the embedded-Chromium production endpoint passed an authenticated Arabic/font/image smoke proof.
- GitHub Actions run `33560351663` passed typecheck, API typecheck, lint, unit tests, and Playwright smoke tests for production commit `35d844f`; its check annotations are empty after the Node 24 action upgrade.
- A real owner-authorized Family Book passed production PDF review: 20 A4 pages, 63 person cards, 27 embedded images, embedded Arabic fonts, no blank text pages, no broken Arabic, and no private infrastructure identifiers or external resources in the portable artifact.

## Open Gates Before External Invitations

### Physical print gate

Digital page geometry is verified, but no physical printer proof was performed in this pass. Print representative A3 and one large-format sample through the intended print provider and inspect trim, safe margins, Arabic readability, color, and photo quality at normal viewing distance.

The regenerated representative files and sign-off matrix are documented in
`docs/reviews/visual-studio-physical-print-handoff-2026-09-01.md`. The workstation
currently exposes virtual printers only, so this gate remains externally pending.

### Authenticated collaboration gate

The deterministic role and persistence smoke passed. The real authenticated owner/collaborator Playwright scenario remains conditional on the staging E2E credentials. Run it before inviting a tester who will exercise shared-tree editing.

## First Cohort Scope Recommendation

Include:

- Owner tree editing and Vault navigation.
- Studio Tiered, Focus, and Radial modes within supported combinations.
- SVG, PNG, and raster/vector-derived PDF poster exports behind print-quality gates.
- A4/A3 digital poster exports.
- A2/A1/A0 and Tiled Wall as clearly labeled large-format beta features, with print-provider proof still being collected.
- Branch Collection packages.
- GEDCOM, ICS, Markdown, and Jozor backup paths according to their existing privacy labels.

Exclude or label as transitional:

- Legacy poster renderers.
- Public portable raw JSON.
- Unsupported/planned layout and scope combinations.
- Any claim of physical-print approval for large-format outputs.

## Acceptance Checklist

- [x] Local application smoke passes.
- [x] Existing production deployment smoke passes.
- [x] Publishing architecture and privacy boundaries remain intact.
- [x] Large-format digital artifacts pass.
- [x] Controlled Family Book implementation is code-complete and safely falls back.
- [x] Release-candidate implementation committed and pushed.
- [x] GitHub CI is green for production commit `35d844f`.
- [x] Vercel production deployment is Ready and the controlled endpoint is live-smoked.
- [x] Real owner-authorized Family Book controlled PDF reviewed and accepted.
- [ ] Physical print proof accepted.
- [ ] Real authenticated collaboration E2E run when collaboration is in cohort scope.
- [ ] Owner explicitly authorizes first tester invitation.
