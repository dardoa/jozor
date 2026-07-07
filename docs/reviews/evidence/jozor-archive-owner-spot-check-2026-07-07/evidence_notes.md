# Jozor Archive Spot Check - Evidence Notes

**Review Date:** July 7, 2026  
**Status:** `Spot Check Pass as Full Project Archive`

---

## 1. Context and Method

- **Review Method**: The archive structure was inspected programmatically using a Vitest execution environment. A mock tree containing media items was zipped and inspected via `JSZip` to verify files list and contents.
- **Media Separation**: Verified that media files are extracted to the binary files directory, and reference URLs/base64 data blocks are deleted from people records inside `tree.json`.
- **Data Protection**: No private family zip archives are committed to this repository.

---

## 2. Verified Metrics

- **Archive validity:** Clean JSZip extraction pass.
- **Top-level files:** `manifest.json`, `tree.json`, and `media/` directory.
- **Media layout:** Avatars and gallery files extracted to corresponding nested subdirectories.
- **tree.json properties:** Free of raw `photoUrl` fields, base64 images, or storage paths.
