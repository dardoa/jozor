# ADR 013: Visual Publishing Studio Direction

## Status
Proposed

## Context
As Jozor's publishing features grow, we need to design the interface through which users customize and export visual trees (e.g. posters, fan charts, timeline posters, and migration maps). 

We have already established:
1. A domain-level visual output product contract and central registry.
2. A typed options/capabilities contract defining size, orientation, style presets, photo modes, and scopes.
3. Gallery metadata including preview assets and recommended use tags.

The next strategic decision is to establish the core user interface direction for the future Visual Publishing Studio. We must choose between a **Gallery-First** model (resembling stock libraries or theme stores, focused on thumbnail browsing) or a **Preview-first, Configuration-first** model (focused on immediate rendering and modular option configuration).

Jozor is a dedicated genealogy publishing platform, not a general-purpose layout designer like Canva.

## Decision
We adopt a **Preview-first, Configuration-first** architectural and UX direction for the future Visual Publishing Studio. 

The primary interaction flow for producing a visual export follows this sequence:
```text
Product selection (e.g., Poster, Fan Chart)
-> Template selection (e.g., Classic Ancestor, Modern Ancestor)
-> Theme/Preset selection
-> Layout configuration
-> Scope configuration (e.g., Selected Root, Ancestor Line)
-> Content options
-> Live/Interactive Preview
-> Export target (PDF or PNG)
```

The future interface layout will be divided into two main panels:
1. **Large Preview Area**: Dominates the screen, rendering the current state of the generated tree layout.
2. **Configuration Panel**: Exposes modular configuration controls (Product, Template, Theme, Layout, Scope, Content) in a structured manner.

Template thumbnails will serve as supporting visual aids within the selector controls, rather than the primary entry point for interaction.

---

## Relationship to Existing Gallery Polish

The polished "product gallery" currently displayed in the Vault Visual Outputs tab is a lightweight transition phase. It allows users to quickly trigger default exports using registry metadata and passive capability tags without custom layout configuration. 

This current gallery is not the final state of the Visual Publishing Studio. In the future Studio, the preview assets and recommendation metadata will serve as supporting aids (e.g., placeholder previews shown during initial template selection), while the main workspace transitions into a preview-first canvas.

---

## Rationale
- **User Intent Alignment**: Users entering the publishing flow usually know what product they want (e.g., "I want a large printable poster for a family reunion"). A configuration-first wizard directly aligns with this target.
- **Scalability of Options**: Different visual products support completely different layout configurations. For example, a Poster supports paper size (A4-A0) and orientation, while a Snapshot uses viewport dimensions. A modular configuration panel accommodates these distinct models, whereas a unified gallery model struggles to scale.
- **Clean Separation of Concerns**: Exposing capabilities as options inside a configuration panel maps directly to our `VisualOutputCapabilities` contract, making UI state wiring predictable.

---

## Non-Goals
- No full Visual Studio implementation in this phase.
- No theme editor or custom style authoring in this phase.
- No interactive canvas editor or drag-and-drop design tools.
- No marketplace or template store browsing model.

---

## Future UI Shape
Conceptual workspace layout:

```text
+-------------------------------------------------------------+
|                                                             |
|                                                             |
|                    [ Large Preview Area ]                   |
|                  Live generated canvas view                 |
|                                                             |
|                                                             |
+------------------------------------+------------------------+
| Actions:                           | [ Configuration Panel ]|
| [ Refresh Preview ]                | - Product              |
| [ Download PNG ]                   | - Template             |
| [ Download PDF ]                   | - Theme / Preset       |
|                                    | - Layout               |
|                                    | - Scope / Root Person  |
|                                    | - Content Settings     |
+------------------------------------+------------------------+
```

---

## Implications
- The current product registry (`VISUAL_OUTPUT_DEFINITIONS`) maps directly to this flow, serving as the source of truth for the selector controls.
- Future products (e.g., fan charts, timelines) should extend registry definitions and capabilities, ensuring the configuration panel can generate custom controls dynamically.
- The Vault Visual Outputs tab can be evolved directly into this Studio interface in a future phase.
