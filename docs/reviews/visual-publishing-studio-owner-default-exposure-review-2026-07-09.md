# Visual Publishing Studio Owner Default Exposure Review

- **Status**: `Enabled by Default for Owner Review`
- **Scope**: Vault Visual Outputs tab
- **Audience**: Owner / internal review before tester invitation
- **Date**: 2026-07-09

---

## 1. Decision

The Visual Publishing Studio is now shown by default in the Vault Visual Outputs tab.

Reasoning:

- The project is still in owner review.
- External beta testers have not been invited yet.
- The Studio action buttons remain disabled.
- Current visual export cards remain available below the Studio.
- The preview pipeline now passes through the sanitizer/adapter boundary.

---

## 2. Runtime Behavior

The Vault now renders:

```tsx
<VisualPublishingStudio language={language} previewSourceMode="store" />
```

This means the Studio preview telemetry is built from the current store through the safe bridge:

```text
useAppStore -> useVisualStudioStorePreviewSource -> live source mapper -> selector -> productionPreviewSanitizer -> preview adapter -> Studio
```

---

## 3. Guardrails Still Active

| Guardrail | Status |
|---|---|
| Export buttons inside Studio disabled | Active |
| Legacy visual output cards still available | Active |
| No Studio export handler wiring | Active |
| Store bridge maps allowed fields only | Active |
| Contact details excluded | Active |
| Notes/source text/metadata excluded | Active |
| Media URLs/paths reduced to boolean photo presence | Active |
| Living/private masking still applied | Active |

---

## 4. Follow-Up Before External Beta

Before inviting external testers, run a real-tree visual QA pass for:

- Studio vertical spacing inside the Vault panel.
- Arabic RTL readability in the Studio selector/config panel.
- Whether disabled action buttons should be hidden or labeled as coming soon.
- Whether the old visual cards should remain below the Studio or move into the Studio actions.
