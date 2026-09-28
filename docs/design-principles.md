# Design Principles

Standing constraints on this dashboard's UI, independent of any single feature. Consult before sizing or spacing interactive controls.

## Touch targets: design for fat fingers and gloves

> "Develop these for people with fat fingers, assume that they maybe are using gloves in winter."

The kiosk is a touchscreen mounted in a van, operated by a driver who may be wearing winter gloves and glancing at the screen rather than looking closely. This rules out anything sized or spaced for a mouse pointer or a bare fingertip on a phone.

Concretely:

- **Minimum touch target: 44×44px**, matching [WCAG 2.5.5 (AAA)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) and the iOS/Android platform minimums — not the smaller 24px WCAG AA floor. A glove blunts precision; err toward the larger end whenever a control's visual size can grow without crowding its neighbors.
- **Space out adjacent controls.** A tight row of small toggles (e.g. `RelayRow`'s switches, `Sidebar` nav items) needs enough gap that a miss lands on empty space, not the next control.
- **Prefer whole-row hit areas over small controls.** Where a row already has a toggle/switch, make the entire row clickable rather than only the visual switch — `SettingsTab`'s rows wrap each `Switch` in a `<label>` (native `for`/hidden-input association, not a manual `onClick`) so tapping anywhere in the row toggles it. `RelayRow`'s switch is read-only display only (no command topic in v0) and has no click target at all, by design, not an exception to this rule.
- **No hover-only affordances.** A gloved finger on a touchscreen has no hover state; every interactive cue (selected-tab highlighting, focus rings) must be visible from a static touch/press state, not a `:hover` reveal.

Applies to every interactive surface in `src/`: nav items, switches, buttons, sliders if any are added later.
