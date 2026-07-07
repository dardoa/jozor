# JSON Export Owner Spot Check Report

**Date:** July 7, 2026  
**Status:** `Blocked for Limited Beta as Public Portable JSON`  
**Current Classification:** `Internal Raw Export / Debug Backup`  
**Reviewer:** Owner / Antigravity

---

## Executive Summary

This report documents the owner spot check for the JSON export format. While the exported payload parses successfully and preserves basic data integrity, it is heavily cluttered with private media storage details, internal synchronization metadata, and normalized database placeholders. 

Consequently, the JSON output is classified as an **Internal Raw Export / Debug Backup** and is marked as **Blocked for Limited Beta as Public Portable JSON**.

---

## Spot Check Evaluation & Verified Metrics

### 1. Functional Baseline (PASSED)
- Exported JSON parses successfully as valid JSON.
- Top-level properties include `settings`, `theme`, `people`, and `metadata`.
- **People count:** `90`
- **Relationship references checked:** `310`
- **Missing relationship references:** `0`
- **Language Support:** Arabic text values are fully preserved.

### 2. Privacy & Media Leakage (FAILED - BLOCKER)
The current payload contains explicit links and paths to cloud assets:
- **Non-empty `photoUrl` count:** `49`
- **Non-empty `photoPath` count:** `30`
- **Embedded base64 images:** `19`
- **Supabase URL occurrences:** `30`

### 3. Internal Sync/Runtime Metadata Leakage (FAILED - BLOCKER)
The export contains sync history and client state properties that are irrelevant for portable genealogy data:
- `lastUpdated`, `lastUpdatedOps`
- `client_id`, `client_version`
- Internal project settings.

### 4. Date Precision Ambiguity (FAILED - BLOCKER)
- Dates entered as year-only values (e.g. `1977`) are normalized internally to `1977-01-01` and exported as full ISO-like strings, leading to false day/month precision.

---

## Conclusion & Decision

> [!IMPORTANT]
> **Decision:**
> The current JSON output cannot be presented as a user-facing portable data export.
> It remains restricted to internal backup/restore workflows. A separate clean portable JSON export format must be designed and implemented before JSON can be marked as beta-ready.
