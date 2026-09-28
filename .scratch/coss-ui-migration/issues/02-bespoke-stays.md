Type: grilling
Status: resolved

## Question

`RadialGauge` (custom conic-gradient dial for tank %/battery SoC%) and the kiosk dark theme's CSS-var mechanics have no direct Coss equivalent. Rebuild on Base UI primitives (e.g. `Progress`/`Meter`) for a unified foundation, or leave them hand-rolled?

## Answer

**Leave hand-rolled.** `RadialGauge` is read-only display (no click/drag/keyboard/focus state) — Base UI's value is unstyled *interactive* behavior (focus management, ARIA, keyboard nav), so wrapping a static readout in `Progress`/`Meter` adds a dependency and API surface for zero behavioral gain. The dark kiosk theme is a Tailwind-config/CSS-variable question orthogonal to Base UI (Base UI ships no styling regardless of what sits on it).
