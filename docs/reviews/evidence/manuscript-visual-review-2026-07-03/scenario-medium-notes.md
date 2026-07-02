# Scenario 2 - Medium Tree (200-500 people)

## Overview
- **Observed in real browser**: Yes (local preview).
- **Approximate person count**: 280 people.
- **Language**: English.

## Evaluation Notes
1. **Preview Responsiveness**: Generation takes ~800ms. Navigation inside the preview window remains smooth with no DOM freezing.
2. **Readability & Section Flow**:
   - Headers render cleanly.
   - Page boundaries do not split text cards mid-sentence in a visually broken way.
3. **Bibliography Length**:
   - Groups bibliography sources cleanly.
   - Shows correct linked citations in a tabulated list at the end of the manuscript.
4. **Photos**: Stretched/layout shift check passed. Aspect ratios are preserved.
