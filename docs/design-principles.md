# Design Principles

Standing constraints on this dashboard's UI, independent of any single feature. Consult before sizing or spacing interactive controls.

> **The 44×44px rule applies again on branch `HeroUI`.** The HeroUI layout spike (map: "HeroUI base layout: rebuild Header and Sidebar on HeroUI, coss removed") first shipped HeroUI's default component sizes (Button 36-40px, Tab 32px) and dropped the minimum for that effort only. The surfaces ported since re-adopted it: the sidebar rail items, the toast close button and the Tanks page's Configure button. Components not yet re-sized still ship HeroUI's defaults until their page is ported. The rule is not retired for the project: `main`'s standard stands.

## Touch targets: design for fat fingers and gloves

> "Develop these for people with fat fingers, assume that they maybe are using gloves in winter."

The kiosk is a touchscreen mounted in a van, operated by a driver who may be wearing winter gloves and glancing at the screen rather than looking closely. This rules out anything sized or spaced for a mouse pointer or a bare fingertip on a phone.

Concretely:

- **Minimum touch target: 44×44px**, matching [WCAG 2.5.5 (AAA)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) and the iOS/Android platform minimums — not the smaller 24px WCAG AA floor. A glove blunts precision; err toward the larger end whenever a control's visual size can grow without crowding its neighbors.
- **Space out adjacent controls.** A tight row of small toggles (e.g. `RelayRow`'s switches, `Sidebar` nav items) needs enough gap that a miss lands on empty space, not the next control.
- **Prefer whole-row hit areas over small controls.** Where a row already has a toggle/switch, make the entire row clickable rather than only the visual switch — the Settings Alerts and Auto-sleep rows (`AlertsView`, `DisplayView` in `src/components/settings/general/preferences/`) make the whole row one `Switch`, with the label and control inside `Switch.Content` and the padding inside it too (native hidden-input association, not a manual `onClick`), so tapping anywhere in the row toggles it. `RelayRow`'s switch is read-only display only (no command topic in v0) and has no click target at all, by design, not an exception to this rule.
- **No hover-only affordances.** A gloved finger on a touchscreen has no hover state; every interactive cue (selected-tab highlighting, focus rings) must be visible from a static touch/press state, not a `:hover` reveal.
  - HeroUI's `Toast` reveals its close button on `:hover` only, so on the kiosk it was unreachable. `src/index.css` overrides it: always visible on the frontmost toast, 44×44px hit area. Toasts also dismiss by swiping sideways (`AppToasts`), at HeroUI's default placement.

Applies to every interactive surface in `src/`: nav items, switches, buttons, sliders if any are added later.
