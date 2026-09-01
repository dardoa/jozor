# Jozor Pre-Beta Closure Gate

Date: 2026-09-01

## Executive Decision

Status: **Local release candidate pass / external beta handoff pending**

The application and Visual Publishing Studio do not require an architectural rewrite. The current local release candidate is suitable for final owner acceptance and deployment. External tester invitations should wait until this exact working tree is committed, pushed, deployed, and the open physical/external-service gates below are explicitly accepted.

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

## Open Gates Before External Invitations

### Required deployment gate

- Commit the current release-candidate changes.
- Push the commit to `origin/main`.
- Confirm GitHub CI is green for that exact commit.
- Confirm Vercel production is serving that exact commit.
- Rerun the live deployed smoke against the new production deployment.

### Physical print gate

Digital page geometry is verified, but no physical printer proof was performed in this pass. Print representative A3 and one large-format sample through the intended print provider and inspect trim, safe margins, Arabic readability, color, and photo quality at normal viewing distance.

### Family Book controlled PDF gate

The Vercel project currently lacks `BROWSERLESS_TOKEN` and `VITE_ENABLE_CONTROLLED_PDF`. Before presenting controlled Family Book PDF as beta-ready, either:

1. configure and redeploy the controlled renderer, then complete a real Arabic/photo PDF owner review; or
2. exclude Family Book PDF from the first beta cohort and keep Markdown plus browser-print fallback clearly labeled as transitional.

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
- Controlled Family Book PDF until Browserless activation and real-file review.
- Any claim of physical-print approval for large-format outputs.

## Acceptance Checklist

- [x] Local application smoke passes.
- [x] Existing production deployment smoke passes.
- [x] Publishing architecture and privacy boundaries remain intact.
- [x] Large-format digital artifacts pass.
- [x] Controlled Family Book implementation is code-complete and safely falls back.
- [ ] Current working tree committed and pushed.
- [ ] CI green for the new commit.
- [ ] New commit deployed and live-smoked.
- [ ] Physical print proof accepted.
- [ ] Browserless activated and Family Book controlled PDF reviewed, or feature excluded from cohort.
- [ ] Real authenticated collaboration E2E run when collaboration is in cohort scope.
- [ ] Owner explicitly authorizes first tester invitation.
