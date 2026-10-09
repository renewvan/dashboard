# HeroUI Spike Findings

Outcome of the HeroUI layout spike (branch `HeroUI`, spec #24): rebuild the dashboard's base layout (Header, Sidebar/bottom bar, alert toasts) on HeroUI `3.2.6` and remove coss. This records measured facts and observed defects only; the go/no-go belongs to the team (see [Recommendation](#recommendation)).

## Outcome

The base layout runs on HeroUI with coss removed. The header controls (clock, display sleep, theme, uplink status, alerts), the rail/bottom-bar navigation and the alert toasts are HeroUI components. Page content is not ported: the panes are `StubPane` placeholders, so nothing here says how HeroUI behaves on the data-dense pages (tanks, power, switches, heater, GPS, settings).

HeroUI's component CSS is imported granularly in `src/index.css` (base, theme, utilities, variants, plus button, tabs, popover, toast, tooltip, separator, chip, badge), not as the whole stylesheet.

## Measured

### Bundle (`vite build`, before = `main`, after = `HeroUI`)

| Asset | Before | After |
| --- | --- | --- |
| CSS | 251.31 kB (gzip 37.80 kB) | 87.06 kB (gzip 11.32 kB) |
| JS | 1,062.07 kB (gzip 331.47 kB) | 844.29 kB (gzip 259.43 kB) |

An earlier probe measured the HeroUI stylesheet at about 334 kB with granular component imports against about 676 kB for the whole stylesheet. That probe was not re-run for this document.

The "after" figures also reflect the removed pages, so they say nothing about HeroUI against coss. They are not a like-for-like comparison; they show only that HeroUI plus the retained layout fits in a smaller bundle than the full app did.

### Tests and files

- Test count: 211 on `main`, 184 at the cutover commit, 187 at the branch tip (the review-fix commit added three `AppToasts` tests). The deleted coss components, tabs and tank cards took their tests with them. Two kept files each lost one case on purpose: the "meets the 44x44px minimum touch target" case in `ThemeToggleButton.test.tsx` and `DisplaySleepButton.test.tsx`, because that rule is suspended on this branch. Every other kept test file has the same number of cases or more.
- The cutover commit (`8b44afb`) deleted 98 files: 54 under `src/components/ui` (the coss primitives), 12 under `src/tabs`, 7 tank cards, plus loose components, hooks, a lib file, a weather widget, two assets and `components.json`. Net against `main` the branch deletes 84 files.

## What worked

- Granular CSS imports keep the stylesheet to the components the layout uses.
- `Tabs` serves both navigation forms: a vertical rail on wide viewports and a horizontal bottom bar on narrow ones, from one `Sidebar` component and one `Tabs` root.
- `Toast.Provider` plus the `toast.*` API covers persistent, state-driven alerts (`timeout: 0`), a visible-toast cap (6) and early dismissal; `useAlertToasts` maps backend alarm state onto it.
- `Popover` and `Tooltip` carry the header's uplink and alerts surfaces. `tw-animate-css` stays: `popover.css` and `tooltip.css` use its `animate-in`, `fade-in-0`, `zoom-in-90` and `slide-in-from-*` classes.

## Defects found along the way

- **`Popover.Trigger` renders a `div role="button"`**, not a `<button>`. Anything that expects a native button (tests, styling hooks, form semantics) has to account for it.
- **A `Tabs.List` inside a portaled `Drawer` renders zero tabs.** The list has to stay inside the `Tabs` root's own tree. (Cause not investigated further.)
- **React Aria warns when the tab list follows the panels.** `Sidebar` must render before the `Tabs.Panel` children; `Sidebar.test.tsx` asserts no such warning.
- **Toast `placement` is `"top end"`** (not `"top right"`), and the region covered the header. `App.tsx` publishes the header's height as `--app-header-height` and the provider offsets itself below it.
- **`BUS_TONE` used `bg-destructive`**, a coss-only token; HeroUI's equivalent is `bg-danger`.
- **HeroUI's component CSS is unlayered, so it beats Tailwind utilities.** Overriding its spacing needs the important modifier (`m-0!`, `p-0!`, see `PANEL_CLASS` in `App.tsx`).
- **`--muted` token clashed with coss**; coss is gone after the cutover.
- **Default sizes are Button 36-40px and Tab 32px**, below the 44×44px touch-target rule in [`design-principles.md`](./design-principles.md). That rule is suspended on this branch by explicit decision (see the notice at the top of that file); it applies again on `main`.

## Accepted costs

These were decided with the spike and are not regressions to fix:

- The Settings page and the Alerts-toggle UI are removed with the other pages (the Settings entry in the sidebar is still a stub pane).
- System fonts replace Inter.
- Header buttons have no `title` attribute.
- Keyboard gap: with the `alerts` tab open, all tabs get `tabindex="-1"`. `alerts` is reachable only through the header button and `?tab=alerts`, not the rail.

## Known items for the page port

- `lib/tank-alarm.ts` and `RadialGauge.css` still reference `var(--bad)`, `var(--warn)`, `var(--ok)`, `var(--bg)` and `var(--kiosk-muted)`, and `TiltWidget.tsx` is unmounted. None of these resolve against HeroUI tokens; they are unmounted orphans that ticket 23 deliberately left for the page port.
- Comments in `src/types.ts` and `src/lib/tank-alarm.ts` naming `TankCard` describe code that returns when the pages are ported.
- Several comments point at "not yet ported" pages (Settings, Alerts); they should be revisited when those pages return.

## Unverified

None of the following was tested, so the evidence neither supports nor counts against HeroUI here:

- Safe-area insets on a real iPhone.
- `100svh` against the real mobile browser chrome.
- Phones narrower than 390px.
- Toasts were exercised only through live alarms (and in jsdom through `AppToasts.test.tsx`, which asserts they appear, are capped at six and can be dismissed, but not where they are placed).

## Recommendation

**For:**

- The layout shell works on HeroUI at both form factors, with a smaller CSS and JS payload than the full app (with the like-for-like caveat above).
- Granular imports make the stylesheet cost proportional to the components used.
- The defects found were integration details with known workarounds, not blockers.

**Against:**

- Only the shell was built; the dense pages are untested on HeroUI, and they are where the bundle and sizing cost will land.
- Default control sizes miss the 44×44px touch-target rule for a glove-operated kiosk; adopting HeroUI on `main` means either carrying the suspension over or overriding sizes component by component.
- Several defects (unlayered CSS beating utilities, the `div role="button"` trigger, tab-list ordering and portal constraints) are recurring friction rather than one-off fixes.
- Settings, the Alerts toggle, fonts and some keyboard behaviour were given up, and the unverified list above covers real-device behaviour on the primary mobile target.

The go/no-go is the team's call. The evidence above is what is available to make it; the missing pieces are real-device checks and at least one dense page ported.
