Type: prototype
Status: resolved
Blocked by: 04

## Question

Map the existing kiosk dark theme (`--bg`, `--panel`, `--panel-2`, `--text`, `--muted`, `--accent`, `--ok`, `--warn`, `--bad` CSS vars in `src/index.css`) into Tailwind's theme config so Coss's default (light-first) components render correctly in the kiosk's dark look. Prototype a couple of installed Coss components (e.g. a button and a tabs bar) against the mapped theme to confirm legibility/contrast before any real component migration starts.

## Answer

**Variant B (Coss follows kiosk), rebranded to the real brand palette**: Van Blue `#439eff` (primary/accent/ring), Ink `#0f1a2a` (`--panel`), Night `#0d1826` (`--bg`), Paper `#f6f8fb` (`--text`). `--panel-2` derived via `color-mix(in srgb, var(--panel) 88%, white)` (no third brand color given). `--muted` (unbranded, kept `#9aa1ad`) and `--ok`/`--warn`/`--bad` status colors unchanged — not part of the four named brand colors, not asked to change.

Rejected Variant A (visible seam between Coss's own near-black and the kiosk panel) and Variant C (breaks every not-yet-migrated legacy screen — `Tabs.css` hardcodes `background: var(--accent)` for the active tab, and Coss's own `.dark` treats "primary" as neutral gray/white; only viable if every legacy CSS file migrates in the same pass, which contradicts the ticket-by-ticket plan).

**Structural fix, not a workaround**: Coss's own `.dark` block defines `--accent`/`--muted` too (same names as kiosk's, first found in ticket 04). Renamed kiosk's two colliding vars to `--kiosk-accent`/`--kiosk-muted` everywhere (`index.css`, `ConnectionBanner.css`, `RadialGauge.css`/`.tsx`, `Tabs.css`, `SettingsTab.css`, `TanksTab.tsx` — all 8 consumer sites, none migrated yet). This frees `--accent`/`--muted` to be pure Coss semantic tokens, permanently mapped to the brand palette in `.dark`, with zero risk to legacy CSS still awaiting its own migration ticket (07–13).

`App.tsx` applies `.dark` unconditionally (kiosk is always-dark, no runtime toggle needed).

Full 3-variant prototype (switcher, sample panel, original variant CSS with inline reasoning) captured on throwaway branch `prototype/kiosk-theme-mapping` (pushed), not merged into `feat/coss-ui-migration`.

Verified: `npm run build` clean, all 33 tests pass, browser screenshots of Tanks tab (active tab correctly Van Blue) and Settings tab (not-yet-migrated legacy screen, correctly still Ink/Night/kiosk-accent — proves the rename didn't break it).
