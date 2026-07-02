# Scenario 1 - Small Tree (20-50 people)

## Overview
- **Observed in real browser**: Yes (local preview).
- **Approximate person count**: 35 people.
- **Language**: English/Arabic mixed.

## Evaluation Notes
1. **Preview Generation**: Quick in-app load. Preview finishes layout Composition in under 200ms.
2. **Narrative Order**: 
   - Root person appears first.
   - Spouse and first child branches follow correctly.
   - Child branch details complete fully before starting the next sibling's branch.
3. **Layout Overlap**: Zero layout overlaps detected. The text wrap inside cards behaves correctly.
4. **Photos**: Render cleanly when toggled on.
5. **Evidence/Bibliography**: The brief bibliography table loads correctly with target citation counts.
