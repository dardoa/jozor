# ADR 010: Controlled PDF Production Adapter Strategy

## Status
Proposed

## Context
1. **Current Printing Baseline**: The default printing method for long-form family manuscripts is the client-side browser print fallback. 
2. **Readiness Framework Established**:
   - The controlled PDF execution path has been designed and tested behind a disabled-by-default feature flag helper (`ControlledPdfFeatureFlag`).
   - A readiness service `ControlledPdfReadinessService` performs isolated synthetic checks before allowing execution.
   - The default runtime adapter `ControlledManuscriptPdfAdapter` remains an unavailable stub returning `available: false` with fallback recommended.
3. **Renderer Strengths**: Long-form family manuscripts rely on a canonical HTML/CSS renderer that supports complex Arabic fonts, shaping, RTL directionality, low-citation warnings, and extensive typography layouts which client-side PDF libraries (like jsPDF) struggle to process correctly.

## Decision
1. **Headless Chromium Adapter**: Use an HTML/CSS to PDF controlled adapter based on a headless Chromium-compatible renderer for long-form Family Manuscripts.
2. **Maintain jsPDF for Visuals**: Retain jsPDF/vector PDF libraries for graphic-heavy ancestor posters, charts, and simple structured exports where text directionality and typography constraints are minimal.
3. **Strict Input Limits**:
   - The controlled production adapter must consume `FamilyManuscriptModel` or generated manuscript HTML, not raw application store state. This prevents bypassing privacy masking layers, relationship builders, citation metrics, and export history manifests.
4. **Fallback Path Coexistence**: Keep browser print fallback as the active default export route until the controlled adapter satisfies all visual and privacy validation criteria.

## Options Considered

### 1. Client Browser Print Fallback
- **Pros**: Zero backend dependencies, minimal resource consumption, already implemented.
- **Cons**: Relies on browser-specific print preview dialog layouts, hard to automate, visual styling varies across browsers.

### 2. Client-Side jsPDF
- **Pros**: Runs entirely on the client, zero data egress, offline capabilities.
- **Cons**: Poor Arabic shaping support, weak RTL handling, high CPU consumption on long-form family trees.

### 3. Headless Chromium HTML/CSS Rendering
- **Pros**: Full typography fidelity, matches preview layout precisely, superior Arabic/RTL handling.
- **Cons**: Requires a rendering environment, careful boundary management, data egress validation.

### 4. Serverless Background Worker Rendering
- **Pros**: Consistent output sizes, non-blocking asynchronous exports.
- **Cons**: High security overhead, database synchronization requirements, data leakage risks during transit.

## Privacy & Data Boundary
- Viewer accounts must utilize masked datasets exclusively before compiling inputs.
- Diagnostic logs must only contain allowlisted scalar keys (e.g., `templateId`, `scopePersonCount`). Unallowlisted metadata, raw HTML text, or personal names must be filtered out.
- Headless print payloads must be minimized and strip unnecessary tree models or session details.

## Activation Gates
The controlled PDF path can only be enabled for production users once the following gates are satisfied:
1. Feature flag is enabled in the staging/production environment.
2. `ControlledPdfReadinessService` returns successful ready status.
3. Default production adapter is fully implemented and is no longer a stub.
4. Visual review evidence (screenshots/output PDFs) passes layout verification.
5. Export manifest and export history entries must record the renderer path and privacy mode used.
6. Browser print fallback remains fully functional as a safe fallback on render failures.

## Consequences
- Controlled PDF path remains inactive by default for now.
- Implementation of the production adapter can proceed with clear data boundaries.
- HTML renderer remains the core manuscript print renderer.
- jsPDF remains appropriate for graphic/vector exports.
