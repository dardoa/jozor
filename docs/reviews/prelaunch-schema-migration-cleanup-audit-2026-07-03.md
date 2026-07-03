# Pre-Launch Schema & Migration Cleanup Audit Report

This report evaluates IndexedDB schemas, Supabase migrations, compatibility layers, and RLS policies for Jozor 2.0 to identify structural optimization and reset opportunities before production launch.

---

## 1. Executive Summary

Since Jozor 2.0 is in pre-launch stage with **no production users to preserve**, we have a unique window to simplify local and remote schemas. We can safely flatten migration histories, clean up legacy Dexie version chains, and trim deprecated fields without risking customer data loss.

- **Total Supabase Migrations**: 70 files.
- **Dexie DB Version**: 6 versions.
- **Status**: **Conditional Pass** (Structures are safe and fully verified, but optimization before launch is highly recommended).

---

## 2. Findings Table

| ID | Finding | Severity | Category | Status / Observations |
|---|---|---|---|---|
| **F-01** | High number of migration files (70 files) creates slow deployment & drift risks. | **P1** | Supabase | Migration chain can be squashed/consolidated. |
| **F-02** | Dexie upgrade chains (V1 -> V6) are verbose. | **P2** | IndexedDB | Since there are no live databases, we can compress Dexie definition to a single V1 block. |
| **F-03** | RLS coverage on `relationships`, `sources`, and `citations`. | **P1** | Security | Verify RLS policies cover these tables on Supabase remote db. |
| **F-04** | Deprecated fields in `Person` model (like legacy drive keys). | **P2** | Codebase | Compatibility arrays remain active for simple UI mapping, but obsolete database columns can be removed. |

---

## 3. Recommended Implementation Pack (Next Steps)

### Step 1: Migration Squashing (Optional but Recommended)
Squash the 70 Supabase SQL migrations into a single cohesive baseline migration file `20260703_baseline.sql` to clean history and ensure faster fresh installs.

### Step 2: Dexie Schema Compression
Define a consolidated Dexie schema directly under `version(1)` and eliminate version-upgrade scripts to reduce local bundle footprint and simplify schema upgrades.

### Step 3: RLS Security Audit Verification
Run a final security check verifying RLS configuration on newly introduced relationship tables.

---

## 4. Decision & Recommendation
- **Recommendation**: Proceed with **RLS & Security Final Validation** as the next implementation pack, followed by a schema consolidation process right before final deployment.
