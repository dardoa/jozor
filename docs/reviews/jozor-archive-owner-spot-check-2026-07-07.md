# Jozor Archive Owner Spot Check Report

**Date:** July 7, 2026  
**Status:** `Pending Owner Archive Inspection`  
**Reviewer:** Owner / Antigravity

---

## Executive Summary

This report documents the owner spot check for the Jozor Archive (`.zip` / `.jozor`) export format. 

> [!IMPORTANT]
> **Product Classification:**
> This archive is not a clean portable/shareable data format; it is a full owner backup/archive artifact.

The status remains `Pending Owner Archive Inspection` until the generated zip archive is extracted and verified locally by the owner.

---

## Review Questions & Expected Structure

When the local archive is inspected, the following parameters must be verified:

1. **Extraction Integrity:**
   - Does the archive open/extract successfully without corruption?
   
2. **Top-Level Directory Structure:**
   - `tree.json`: Cloned tree data state.
   - `manifest.json`: Media manifest maps.
   - `media/avatars/`: Folder containing extracted avatar binaries.
   - `media/gallery/`: Folder containing gallery item binaries.

3. **JSON Structure (`tree.json`):**
   - Contains raw internal sync/app metadata (e.g., settings, theme, lastModified).
   - Deletes provider-bound storage URLs (like `photoUrl`) and base64 media blocks, replacing them with paths in `manifest.json`.

4. **Suitability:**
   - **Full Owner Backup:** Yes, suitable as a project backup.
   - **Clean Portable Data:** No, not suitable for sharing due to internal metadata.

---

## Spot Check Checklist

- [ ] Archive file valid.
- [ ] Expected files present.
- [ ] No corruption.
- [ ] Arabic text preserved in included JSON/data.
- [ ] Relationship data present.
- [ ] Media inclusion documented.
- [ ] Internal metadata inclusion documented.
- [ ] Privacy warning/classification documented.
