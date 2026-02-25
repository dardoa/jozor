# Jozor 1.1 Design Documentation

## Philosophy: Glass-Modern & Heritage
Jozor 1.1 blends modern digital aesthetics with the concept of heritage. We use **Glassmorphism** (transparency + blur) to represent the layers of history and family connections.

## Design Tokens

### Colors
We use a primary brand color (Teal/Brand 600) with dynamic theme overrides.
- `--primary-600`: `#0d9488` (Default Brand)
- `--theme-bg`: Main canvas background.
- `--card-bg`: Node backgrounds with high opacity or blur.

### Typography
- **Arabic**: `Cairo`, `Noto Naskh Arabic`.
- **English**: `Inter`, `Merriweather`.
- Serif fonts are reserved for headers and names to convey a sense of formal heritage.

### Motion Principles
1. **Morphing**: Layout changes should be fluid. Nodes move from point A to B instead of teleporting.
2. **Pulse**: Used for loading states and skeleton screens.
3. **Glass-Blur**: Backdrops should smoothly fade in/out.

## Maintenance Guide
- **Adding Toggles**: New settings should be added to `SettingsDrawer.tsx`.
- **New Icons**: Use `lucide-react` with `w-5 h-5` as standard size.
- **Glass Effect**: Use the `.glass` utility class for containers.
- **Micro-animations**: Use Tailwind `animate-in` or custom `@keyframes` in `index.html`.

## Component Tokens (`utils/tokens.ts`)
Internal logic for animations and D3 transitions should use the constants defined in `utils/tokens.ts` to stay in sync with CSS.
