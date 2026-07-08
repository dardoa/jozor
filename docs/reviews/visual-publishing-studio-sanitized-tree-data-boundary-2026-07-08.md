# Visual Publishing Studio Sanitized Tree Data Boundary

## Status

`Accepted` (governed by [ADR 014](file:///d:/AppDEV/Jozor1.1/docs/adr/014-visual-publishing-studio-preview-integration.md))

---

## Purpose

To establish a strict, sandboxed boundary separating the raw user family tree database from the UI preview layout engines. This prevents personal data leaks, ensures privacy compliance, and guarantees high-performance renders.

> [!IMPORTANT]
> **Raw tree entities must never be passed directly into preview renderers.** Every data flow from the family store or database must pass through a sanitization pipeline before reaching the preview panel.

---

## Allowed Preview Fields

The sanitized model represents an abstract layout schema. Only the following minimal set of fields is permitted:

### For Person Nodes
- **`id`**: A generated, session-isolated preview node ID (e.g. `preview-node-1`). Never the raw database UUID.
- **`displayName`**: The name string, filtered according to active privacy masking.
- **`generation`**: Numeric generation level relative to root (e.g. `1`, `2`, `3`).
- **`isMasked`**: Boolean flag indicating if the profile name was redacted.
- **`hasPhoto`**: Boolean flag indicating if a profile photo exists.
- **`lifeStatus`**: Limited status enum: `'living' | 'deceased' | 'unknown'`.
- **`yearsRange`**: Year-only range string (e.g. `1910 - 1980` or `1985 - Present`) if public/deceased. omitted entirely if private.

### For Relationship Edges
- **`fromId`**: Generated preview ID of origin.
- **`toId`**: Generated preview ID of destination.
- **`relationshipType`**: Relationship category: `'parent-child' | 'spouse' | 'ancestor'`.
- **`generationDirection`**: Numeric direction indication (e.g. `1` for down, `-1` for up).

---

## Forbidden Fields

The following fields must be strictly blacklisted and completely stripped at the boundary:
- **Raw Database Person IDs** (UUIDs or sync keys)
- **Raw Relationship IDs**
- **Contact Details** (Email addresses, phone numbers, home/work addresses)
- **Exact Dates** (Days/months of births, deaths, marriages)
- **Media URLs & Image Payloads** (Supabase storage URLs, file paths, base64 image data)
- **Cloud Sync Status & Metadata**
- **User Notes** (Private/public notes, stories, descriptions)
- **Raw Citation Text & Source Snippets**
- **Audit/History Metadata** (Created at, modified by, version numbers)

---

## Privacy Masking Rules

1. **Living / Private Profiles**:
   - The name must be replaced by a masked placeholder (e.g., `"Living Relative"` / `"قريب حي"`).
   - Photos are omitted (`hasPhoto: false`).
   - Exact dates and year ranges are completely excluded.
2. **Owner-Full Mode**:
   - **`owner-full` mode must still pass through the sanitizer.** It is not allowed to bypass the adapter boundary. It only adjusts the masking policy within the sanitizer to allow displaying unmasked names for public/deceased ancestors, while keeping all contact details, raw IDs, and notes fully stripped.

---

## Product-Specific Needs

- **Poster**:
  - Requires a root-based ancestor or descendant slice.
  - Hardcoded generation depth caps based on print size capability.
  - Strictly limited node counts.
- **Snapshot**:
  - Represents only the visible viewport subset.
  - Coordinates are mapped to virtual bounds relative to current zoom/pan state.
- **Future Fan Chart**:
  - Radial generation slice with radial coordinates.

---

## Performance Boundaries

- **Product-Specific Caps**: Maximum node bounds will be configured as conservative defaults per product type.
- **Dynamic Re-profiling**: Node limits will be revisited and adjusted after runtime profiling on test datasets.
- **Debounced Processing**: Any rendering updates or layout calculations must be debounced and cancellable to ensure a lag-free UI experience.
- **Truncation Notifications**: If tree limits are exceeded, a clean truncation indicator is displayed.

---

## Implications

- **Phase 3D - Sanitizer Contract Types (Completed)**: Formalized the boundary design rules into TypeScript contracts in [`previewSanitizerTypes.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewSanitizerTypes.ts) and [`previewSanitizerContract.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewSanitizerContract.ts). The contract abstracts raw tree entities using generics (`TRawGraph = unknown`) and forces `previewId` as the unique identifier to assert absolute decoupling.

---

## Open Questions

1. **Setting Alignment**: Should preview privacy policies exactly copy export settings, or default to a tighter mask?
2. **Photo Opt-in**: Should profile photo presence indicators require explicit user opt-in before rendering silhouettes?
3. **Source Snippets**: Should any source citations be allowed in previews (e.g. for manuscripts), or should they be replaced by generic icons?
