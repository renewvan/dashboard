# HeroUI v3 primitives for the Settings tab

**Date:** 2026-10-09 (docs read and rendered checks run on this date).

**Question.** The Settings tab was dropped in the HeroUI cutover (commit `8b44afb`). Its coss-ui implementation is recoverable with `git show 8b44afb^:src/tabs/SettingsTab.tsx` and `git show 8b44afb^:src/components/TemperatureSettings.tsx`. Which HeroUI v3 primitive replaces each piece, and what are the real sharp edges? This note records facts only. It makes no information-architecture or visual-design decision; those belong to the map's other tickets.

**What had to be replaced** (read from the old source):

| Old piece | Behaviour that must survive |
|---|---|
| Group rows (`GroupRow`) | Full-width button, label + description, trailing chevron; opens a subpage or a right-side sheet |
| Trail (`Breadcrumb*`) | `Settings › Connectivity › Hub`; ancestors clickable, current page not |
| Switch (`Field` + `Switch`) | Alerts toggle, Auto-sleep; `Auto-sleep` is `null` until a retained MQTT message arrives, so it renders disabled |
| Slider | Brightness 0-100, `null` until retained message, tick scale, needed a `Field`/`FieldLabel` wrapper to get an accessible name |
| Segmented pick | Timeout 1/5/15/30 min, unit C/F (home-grown `segmentedControl*` classes) |
| Text input | Sensor rename; commits on blur/Enter, Escape cancels, disabled until the name is known |
| Read-only rows (`DetailRow`) | Label left, `—` or value right |
| Scroll (`ScrollArea`) | Fading edges, scrollbar hidden |
| Grouped surfaces (`Frame`/`FramePanel`) | One panel per child |
| Sheet (`Sheet*`) | Right-side flyout portaled into a container |

**Method.**
- **Primary sources only.**
  - Installed packages: `@heroui/react` 3.2.6 and `@heroui/styles` 3.2.6 (`node_modules/@heroui/...`); `react-aria-components` 1.22.0 and `react-aria` 3.53.0 under `node_modules/.pnpm/`.
  - HeroUI v3 docs pages for each component, `https://heroui.com/en/docs/react/components/<name>` (raw MDX read from `https://heroui.com/docs/react/components/<name>.mdx`).
- **Rendered checks.** I built a throwaway page in a scratch worktree that rendered every candidate primitive with this repo's granular CSS imports, and drove it in headless Chromium through a Vite dev server. It covered roles and accessible names (accessibility-tree snapshots), measured box sizes at 900px and 400px viewport width, clicks at fixed fractions of a box, keyboard, and drag. Ten DOM/ARIA tests were also run in jsdom with Vitest (all passed). The scratch page and tests are deliberately **not committed**; findings are described here and marked "measured" when they come from them. Breakpoint behaviour was measured at those two widths only; the breakpoint values themselves (`md` = 768px, `sm` = 640px) come from the CSS and Tailwind defaults.
- **Not tested:** real touch input, gloves, a real device, screen readers. The browser was desktop Chromium with mouse events. Source-only claims are marked "(source)". Anything inferred is marked `[INFERENCE]`.
- **Citation shorthand.**
  - `RE` = `node_modules/@heroui/react/dist/components/`
  - `ST` = `node_modules/@heroui/styles/dist/components/`
  - `RAC` = `node_modules/.pnpm/react-aria-components@1.22.0_*/node_modules/react-aria-components/dist/private/`

---

## Primitive-by-need table

"Recommended" means the closest fit by structure and semantics, not a design choice. Every "sharp edge" below was either measured or read from source; details are in the per-primitive sections.

| Need | Recommended primitive | Sharp edge | Source |
|---|---|---|---|
| (a) Drill-down row with chevron | `Button variant="ghost" fullWidth` (native `<button>`), or a plain `<button>`. `ListBox` with `onAction` is the alternative; it is a `listbox`/`option` widget. | `.button` is unlayered and sets `h-10 md:h-9`, `justify-center`, `px-4`. Measured: `h-auto`, `md:h-auto` and `justify-between` were **ignored**; `py-3` applied. Needs `h-auto!` / `justify-between!`. Default height 36px (≥768px viewport) / 40px (<768px). `ListBox.Item` has `min-h-9` (36px), no chevron slot, role `option`. | `ST/button.css:5`, `ST/list-box-item.css:6`; measured |
| (a) Breadcrumb / back | `Breadcrumbs` + `Breadcrumbs.Item` (ancestors with `onPress`, last item plain); back = `Button isIconOnly aria-label` | Needs **both** `breadcrumbs.css` and `link.css`. Items without `href` render `<span role="link" tabindex="0">`; Enter activates, Space does not. Links are 20px tall. Last item gets `aria-current="page"`. No `<nav>` wrapper (`<ol aria-label="Breadcrumbs">`). Icon-only Button is 36x36 (≥768px) / 40x40 (<768px). | `RE/breadcrumbs/breadcrumbs.js`, `ST/breadcrumbs.css`; measured |
| (b) Switch (Alerts, Auto-sleep) | `Switch` > `Switch.Content` > `Label` + `Switch.Control` > `Switch.Thumb` | `Switch.Content` **is the `<label>`** (hidden input inside), so it is the hit area. Default is shrink-wrapped (20px tall). Whole-row needs `w-full` on both `Switch` and `Switch.Content` plus padding **inside** Content (measured: toggled at 2%/55%/98% of the row). The docs "Anatomy" block (Control outside Content) does not work in 3.2.6: clicking that Control did nothing. `null` → `isDisabled` works (input disabled, `pointer-events: none`). | `RE/switch/switch.js:10-60`, `RAC/Switch.mjs:155-205`, `ST/switch.css`; measured |
| (c) Slider 0-100 | `Slider` > `Label` + `Slider.Output` + `Slider.Track` > `Slider.Fill` + `Slider.Thumb` | Accessible name works two ways: `<Label>` child or `aria-label` on `Slider`. The inner `input[type=range]` was named in both (measured); the coss problem does not recur. `isDisabled` + `value={brightness ?? 0}` renders a disabled 0 slider. **No tick scale:** `Slider.Marks` is exported but unstyled (zero `.slider__marks` rules), undocumented, and its source says `TODO: Slider Marks`. A plain tick row inset 0.75rem lines up exactly with the thumb centres (measured). | `RE/slider/slider.js`, `ST/slider.css:94-117`, `RAC/Slider.mjs`; measured |
| (d) Segmented one-of-N (timeout, unit) | `ToggleButtonGroup selectionMode="single" disallowEmptySelection` + `ToggleButton id` | Renders `role="radiogroup"` / `role="radio"` + `aria-checked`. Controlled with a `Set`, not a scalar. Re-clicking the selected item **still fires** `onSelectionChange`. All buttons are `tabindex=0`; arrows move focus, Space selects. Empty `Set` + `isDisabled` is the "unknown" state. 36px / 40px (md), 40px / 44px (lg). `ButtonGroup` has **no selection state**. `Tabs` as a picker leaves `aria-controls` pointing at a missing panel and is fixed 32px. | `react-aria/dist/private/button/useToggleButtonGroup.mjs:22,45`, `ST/toggle-button.css`, `ST/tabs.css:124`; measured |
| (d) Alternative: one-of-N as a form control | `RadioGroup orientation="horizontal"` + `Radio` > `Radio.Content` > `Radio.Control` > `Radio.Indicator` + `Label` | `radiogroup`/`radio` semantics with a visible dot. `Radio.Content` is the `<label>`; 20px tall, 16px dot. `value={null}` + `isDisabled` shows nothing selected. | `RE/radio/radio.js`, `ST/radio.css:46,55`; jsdom + measured |
| (e) Rename input | `TextField` > `Label` + `Input` (+ `Description`), or bare `Input aria-label` | Two change signatures: `TextField onChange(value: string)` vs bare `Input onChange(event)`. The old blur/Enter commit, Escape cancel and disabled-until-known logic ran unchanged on both (measured; the disabled case only on the bare `Input`). Bare `Input` **needs** `aria-label`. Height 36px at a 900px viewport / 40px at 400px (CSS: `text-base sm:text-sm`). | `RE/textfield/textfield.js`, `RE/input/input.js`, `ST/input.css:2`; measured |
| (f) Read-only key/value row | Plain markup. Optional: `Label` + `Description` for type styles, or `<dl>`/`<dt>`/`<dd>` with the `.label`/`.description` classes. | HeroUI has no key/value component. Standalone `Label` renders an orphan `<label>` with no `for`. `Description` renders without a field (it is only gated inside `FieldSlotsGate`). | `RE/label/label.js`, `RE/description/description.js`, `RE/utils/use-has-text-slot.js`; measured |
| (g) Scroll container | `ScrollShadow` (`hideScrollBar`, `size`) | Plain `div` with `overflow-y: auto` and `position: relative`; needs a constrained height (`min-h-0 flex-1` in a flex column worked). `overscroll-behavior` stays `auto`. In `auto` mode the root **always** has a `mask-image`, so it becomes a containing block for `position: fixed` descendants (documented). Needs `scroll-shadow.css`. | `RE/scroll-shadow/scroll-shadow.js`, `ST/scroll-shadow.css:43`; measured |
| (h) Grouped surface | `Card` (`Card.Content`), `Surface`, `Fieldset` (+ `Legend`, `Group`), `Separator`; `ListBox` is a selection widget, not a plain group | `.card` is unlayered (`p-4 gap-3`, radius up to 32px); `p-0! gap-0!` measured to work. `Surface` is background only. `Fieldset` is a real `<fieldset>` (role `group` named by its legend). | `ST/card.css:5`, `ST/surface.css`, `ST/fieldset.css:5`; measured |
| (i) Sheet nav | `Drawer` (`state` from `useOverlayState`) > `Drawer.Backdrop` > `Drawer.Content placement="right"` > `Drawer.Dialog` > `Drawer.Header`/`Heading`/`Body`/`CloseTrigger`. Alternative: `Modal`. | Portaled to `document.body`. Right drawer is 384px wide at a 900px viewport / 320px at 400px (`w-80 max-w-[85vw] sm:w-96`), `p-6`, full height. `aria-label` or `Drawer.Heading` is needed for the name. Close button is 24x24. Custom container: `UNSTABLE_portalContainer` on `Drawer.Backdrop` works, but height is the visual viewport, so it also needs `absolute! h-full!` overrides. Nested drawers stack; Escape closes only the top. Needs `drawer.css` + `close-button.css`. | `RE/drawer/drawer.js`, `ST/drawer.css:45-177`; measured |

---

## Cross-cutting facts

### CSS is unlayered, so utilities lose

None of the `ST/*.css` component files uses `@layer` (`grep -c "@layer" ST/*.css` returns 0 for every file). Tailwind utilities live in a layer, so unlayered HeroUI rules beat them. Measured on `Button ghost fullWidth` with `className="h-auto justify-between py-3 md:h-auto"`:

- computed height was still `36px` (`h-auto` lost);
- computed `justify-content` was `center` (`justify-between` lost);
- padding-top was `12px` (`py-3` applied, because `.button` does not set vertical padding).

A utility only wins if HeroUI's rule does not set that property. For the `.button`, `.toggle-button`, `.card` and `.drawer__dialog` blocks, plain `className` overrides of height, padding, justification or gap need the important modifier (`h-auto!`). `Card className="p-0! gap-0!"` measured `padding: 0px`, `gap: 0px`.

### Sizes flip at the `md` (768px viewport) breakpoint, not per container

`.button`, `.toggle-button` and their size variants use `h-10 md:h-9` style pairs. The columns below are what was measured at a 900px viewport (≥768px column) and a 400px viewport (<768px column); the section width was fixed at 480px, so only the media query changed. The 768px (`md`) and 640px (`sm`) thresholds are Tailwind's defaults read from the CSS classes; I did not measure between 400 and 900.

| Element | ≥768px | <768px | Source |
|---|---|---|---|
| `Button` md | 36px | 40px | `ST/button.css:5` |
| `Button` icon-only md / lg | 36x36 / 40x40 | 40x40 / 44x44 | `ST/button.css:144-154` |
| `ToggleButton` md | 36px | 40px | `ST/toggle-button.css:7` |
| `ToggleButton` lg | 40px | 44px | `ST/toggle-button.css:109` |
| `Button`/`ToggleButton` sm | 32px (source: `h-9 md:h-8`) | 36px (source) | `ST/button.css:69` (not measured) |
| `Input` | 36px (900px viewport) | 40px (400px viewport) | `ST/input.css:2` (`text-base sm:text-sm`, so the flip is at 640px by CSS) |
| `Tabs.Tab` | 32px | 32px (fixed, no variants) | `ST/tabs.css:124` |
| `Switch.Control` sm / md / lg | 32x16 / 40x20 / 48x24 | same | `ST/switch.css` |
| `Slider.Track` / thumb hit box | 20px tall / 28x20 | same | `ST/slider.css:94,117` |
| `Radio.Control` | 16x16 | same | `ST/radio.css:55` |
| `ListBox.Item` | min 36px | same | `ST/list-box-item.css:6` |
| `Breadcrumbs` link | 20px | same | measured |
| `Drawer.CloseTrigger` | 24x24 | same | measured |

The only measured 44px controls are `lg` icon-only `Button` and `lg` `ToggleButton` **below** 768px. The project's 44x44px touch-target rule in [`docs/design-principles.md`](../design-principles.md) is suspended on branch `HeroUI`; this table is the evidence of what is lost without it.

### `Label`, `<label>` and which element is the hit area

- `Switch.Content` and `Radio.Content` are RAC `SwitchButton` / `RadioButton`, which render a `<label>` containing a visually hidden `<input>` (`RAC/Switch.mjs:185-198`; DOM dump for radio). A `Label` inside them is forced to a `<span>` (`LABEL_SPAN_CONTEXT`, `RE/switch/switch.js:10`).
- Inside `Slider` and `ListBox.Item`, `Label` renders a real `<label>`.
- The design principle "rows wrap each `Switch` in a `<label>`" is therefore satisfied by `Switch.Content` itself. Nesting another `<label>` around it was not tested and is not needed.

### Class names in the docs vs the installed CSS

The Slider docs list `.slider-track`, `.slider-fill` and `.slider-thumb`. The installed CSS and DOM use `.slider__track`, `.slider__fill` and `.slider__thumb` (`ST/slider.css`; DOM dump). The Switch docs "Anatomy" shape does not work (see the Switch section). Trust the installed source over the docs prose where they differ.

### Import shape

All components come from `@heroui/react`; hooks too (`useOverlayState` is exported). This repo imports CSS **per component** in `src/index.css` (currently `button`, `tabs`, `popover`, `toast`, `tooltip`, `separator`, `chip`, `badge`). The needed lines are listed per primitive below. I derived them by collecting the CSS classes present in the rendered DOM of each primitive and mapping every class to the file that defines it. I then rendered all primitives together with `src/index.css` plus exactly the union of those files, and styles applied. `field-error.css` and `list-box-section.css` were not imported and nothing broke. Primitives were not rendered in isolation, so a file listed for one primitive may in practice be pulled in by another's list.

---

## (a) Drill-down rows, trail and back

**Imports.** `import { Breadcrumbs, Button, ListBox, Label, Description } from '@heroui/react'`

**CSS.**
```css
@import '@heroui/styles/components/button.css';      /* already imported */
@import '@heroui/styles/components/breadcrumbs.css'; /* Breadcrumbs */
@import '@heroui/styles/components/link.css';        /* Breadcrumbs.Item renders a HeroUI Link */
@import '@heroui/styles/components/list-box.css';    /* ListBox */
@import '@heroui/styles/components/list-box-item.css';
@import '@heroui/styles/components/label.css';       /* Label / Description inside rows */
@import '@heroui/styles/components/description.css';
```

### Row: `Button` (measured, source)
- `Button` is a native `<button type="button">` with `data-slot="button"`; `onPress` fired on click (measured). The ghost + `fullWidth` shape measured 462x36 in a 462px-wide section.
- Whole-row hit area is automatic: the button is the row.
- A two-line label (title + description) works as children, but vertical sizing must be overridden with `!` (see cross-cutting).
- Accessible name is the text content (`button "Connectivity Ethernet, Wi-Fi"`).
- HeroUI has **no** chevron or trailing-icon slot on Button; an icon is a child (`svg`). `justify-between` needs `!` to push it right.

### Row: `ListBox` with `onAction` (measured, source)
- `ListBox.Item id` + `onAction(key)` on the `ListBox` fired on click and on Enter after ArrowDown (measured).
- DOM is `div role="listbox"` containing `div role="option"`. Without `selectionMode`, options have no `aria-selected` (jsdom). Name was `option "Nodes 1 entity"`.
- `.list-box-item` is `min-h-9` (36px), gets hover styling only under `@media (hover: hover)`, and `.list-box` adds `p-1` plus `overflow-clip` (`ST/list-box.css:6`).
- `[INFERENCE]` A navigation row announced as an `option` inside a `listbox` is a selection-widget role. I did not test with a screen reader.

### Trail: `Breadcrumbs` (measured, source)
- Shape: `<Breadcrumbs><Breadcrumbs.Item onPress={...}>Settings</Breadcrumbs.Item> ... <Breadcrumbs.Item>Hub</Breadcrumbs.Item></Breadcrumbs>`.
- With `onPress` and no `href` an item is `<span role="link" tabindex="0">`. Click and Enter fire `onPress`; **Space does not** (measured), which matches the link role. With `href` it is an `<a>` (measured).
- The last item (no handler) is `link "Hub" [disabled]` in the accessibility tree and `aria-current="page"` (jsdom).
- A chevron separator (`IconChevronRight`) is rendered after every non-current item automatically. `separator` prop overrides it.
- The list is `<ol aria-label="Breadcrumbs">` (default label), no `<nav>`.
- Each link is only 20px tall (measured 54.9x20, 83.3x20, 27.3x20): the hit area is the text.
- `Breadcrumbs.Item` forwards its `...props` to both the RAC `Breadcrumb` and the inner `Link` (`BreadcrumbsItem` in `RE/breadcrumbs/breadcrumbs.js`).

### Back
- `Button isIconOnly aria-label="Back"` measured 36x36 (≥768px) and 40x40 (<768px); `size="lg"` measured 40x40 / 44x44.

**Docs.** [Button](https://heroui.com/en/docs/react/components/button), [Breadcrumbs](https://heroui.com/en/docs/react/components/breadcrumbs), [ListBox](https://heroui.com/en/docs/react/components/list-box) (`onAction` prop, API table).

---

## (b) Switch

**Imports.** `import { Switch, Label, Description } from '@heroui/react'` (sub-components: `Switch.Content`, `Switch.Control`, `Switch.Thumb`, `Switch.Icon`; `SwitchGroup` also exported).

**CSS.**
```css
@import '@heroui/styles/components/switch.css';
@import '@heroui/styles/components/label.css';        /* if Label is used */
@import '@heroui/styles/components/description.css';  /* if Description is used */
```

**Structure (3.2.6).** `Switch` = RAC `SwitchField` → a `<div class="switch">` (flex column). `Switch.Content` = RAC `SwitchButton` → the `<label>` that wraps the hidden `<input role="switch">`, `Switch.Control`, `Switch.Thumb` and the label text (`RE/switch/switch.js:28,56`, `RAC/Switch.mjs:96,155,185,198`). The `switch.js` comment states that `Description` and `FieldError` belong as siblings of `Switch.Content`.

Verified shape (measured, controlled):
```tsx
<Switch isSelected={alerts} onChange={setAlerts} className="w-full">
  <Switch.Content className="w-full justify-between px-3.5 py-2.5">
    <Label>Show alert notifications</Label>
    <Switch.Control><Switch.Thumb /></Switch.Control>
  </Switch.Content>
</Switch>
```

**Whole-row hit area.**
- Default shape (docs "Usage") is shrink-wrapped: `Switch.Content` measured 172.8x20 inside a 462px-wide root. A click on the root **outside** the Content did not toggle.
- With the shape above (`w-full` on `Switch`, `w-full` plus padding on `Switch.Content`), the Content box was 462x40 and clicks at 2%, 55% and 98% of its width, and in the bottom-right padding, all toggled. The click target is a real `<label>` with a native input association; no manual `onClick`.
- The docs "Anatomy" example puts `Switch.Control` as a **sibling** of `Switch.Content`. In 3.2.6 that Control is outside the `<label>`: clicking it did nothing (measured), and it is absent from the accessibility tree. The docs "Usage" shape (Control inside Content) is the working one.

**Accessible name.**
- `Label` inside `Switch.Content`: `switch "Show alert notifications"` (measured, jsdom `getByRole('switch', {name})`).
- No visible label: `aria-label` on `Switch` names the input (`switch "bare sm"`), measured.
- `Description` placed **inside** `Switch.Content` is merged into the name (`switch "Docs anatomy shape desc"`); sibling placement follows the source comment (not rendered here).

**Controlled and unknown.**
- API is RAC naming: `isSelected`, `onChange(isSelected: boolean)`, `isDisabled`, `onPress`.
- `isSelected={value ?? false} isDisabled={value === null}` rendered a disabled switch: input `disabled`, root `data-disabled`, computed `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`, and clicks logged nothing (measured).

**Sizes (measured).** `Switch.Control`: sm 32x16, md 40x20, lg 48x24. The whole-row Content is as tall as its padding makes it (40px with `py-2.5`).

**Gotchas.** `switch.css` hover and pressed colours use bare `:hover` / `:active` selectors as well as `data-hovered`; they are not wrapped in `@media (hover: hover)` (`ST/switch.css`, "Hover states" block). `Switch.Control` is `overflow-hidden rounded-xl`. `[INFERENCE]` Sticky hover on touch is possible; not tested.

**Docs.** [Switch](https://heroui.com/en/docs/react/components/switch): props table lists `isSelected`, `defaultSelected`, `isDisabled`, `onChange`, `size`.

---

## (c) Slider

**Imports.** `import { Slider, Label } from '@heroui/react'` (sub-components: `Slider.Output`, `Slider.Track`, `Slider.Fill`, `Slider.Thumb`, `Slider.Marks`).

**CSS.**
```css
@import '@heroui/styles/components/slider.css';
@import '@heroui/styles/components/label.css';
```

**Structure (measured).** `Slider` → `div[role=group]` (grid: `"label output" / "track track"`); `Slider.Track` → `div[data-slot=slider-track]`; `Slider.Thumb` → a `div` containing a visually hidden `input[type=range]` (`RAC/Slider.mjs:161-205`).

Verified shape:
```tsx
<Slider value={brightness ?? 0} isDisabled={brightness === null} onChange={...} onChangeEnd={...}>
  <Label>Brightness</Label>
  <Slider.Output>{brightness === null ? '—' : `${brightness}%`}</Slider.Output>
  <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
</Slider>
```

**Accessible name (measured; jsdom).**
- With `<Label>` as a child: group `aria-labelledby` → label id; the range input `aria-labelledby` → the same label id. Accessibility tree: `group "Brightness"` containing `slider "Brightness": "40"`.
- With only `aria-label="Brightness aria"` on `Slider`: the group carries `aria-label`, and the **input's `aria-labelledby` points at the group id**, so the tree shows `slider "Brightness aria"`.
- So the old coss failure (a bare `aria-label` only naming the outer group) does not apply; a `Label` wrapper is not required. Clicking the `Label` text moved focus to the range input (measured).
- `Slider.Output` is an `<output>` exposed as `status` with `aria-live="off"`; default content is the formatted value, custom children are accepted.

**Controlled and unknown.**
- Props: `value`, `defaultValue`, `onChange(value)`, `onChangeEnd(value)`, `minValue` (0), `maxValue` (100), `step` (1), `isDisabled`, `formatOptions`. The callback value is typed `number | number[]`; the docs' controlled example narrows with `typeof nextValue === "number"`, and my harness used a cast.
- `value={brightness ?? 0}` + `isDisabled={brightness === null}`: input `disabled`, `value="0"`, root `data-disabled`, opacity 0.5, `pointer-events: none`; clicking the track logged nothing (measured).
- `value={null}` (type-unsafe) did not throw or warn and rendered as 0 (measured with `isDisabled`). `[INFERENCE]` Not documented; the typed `number` fallback above is the documented path.

**Events (measured).** A click at 75% of the track set the value to 75 and fired `onChange(75)` then `onChangeEnd(75)`. A thumb drag fired `onChange` for every intermediate value (13 calls for one drag) and `onChangeEnd` once on release. Keyboard: ArrowRight +1, PageUp +10, Home 0, End 100, and each key press fired **both** `onChange` and `onChangeEnd`.

**Hit area and sizes (measured).** Track 20px tall and full width; thumb hit box 28x20 (visual thumb `::after` 24x16); `.slider` root 44px tall with a label/output row, 24px without. The track has `border-x-[0.75rem]` transparent so the thumb can sit at the edges (`ST/slider.css:94-97`). Only the track and thumb respond to pointer input; the rest of a row does not.

**Tick scale.**
- **Not provided as a feature.** `Slider.Marks` is exported (`RE/slider/slider.js`, `SliderMarks`) but is a bare `div` with class `slider__marks`. `ST/slider.css` has zero `.slider__marks` rules, the docs do not mention it, and the source says `TODO: Slider Marks` (line 161). In a Label-less slider it was auto-placed **above** the track (grid auto-placement).
- **Expressible with plain markup.** A tick row inset by the track's 0.75rem border lined up with the thumb: at value 0 the thumb centre was x=37 and the first tick x=37; at value 100 thumb 475 and last tick 475 (track x=25, width 462). A `role="group" aria-label` row, as the old code had, stays outside the slider's own tree.

**Gotchas.** Dragging works inside a portaled `Drawer.Body` (measured: drag to 80% gave 78 and the dialog stayed open). Docs say `.slider-track` etc.; the installed classes are `.slider__track` etc.

**Docs.** [Slider](https://heroui.com/en/docs/react/components/slider).

---

## (d) Segmented one-of-N: timeout 1/5/15/30 and unit C/F

### `ToggleButtonGroup` + `ToggleButton` (present in 3.2.6)

**Imports.** `import { ToggleButtonGroup, ToggleButton } from '@heroui/react'` (`ToggleButtonGroup.Separator`).

**CSS.**
```css
@import '@heroui/styles/components/toggle-button.css';
@import '@heroui/styles/components/toggle-button-group.css';
```

Verified shape:
```tsx
<ToggleButtonGroup
  aria-label="Sleep after" selectionMode="single" disallowEmptySelection
  selectedKeys={new Set([String(minutes)])}
  onSelectionChange={(keys) => { const k = [...keys][0]; if (k !== undefined) set(Number(k)) }}
>
  {[1, 5, 15, 30].map((m, i) => (
    <ToggleButton key={m} id={String(m)}>{i > 0 && <ToggleButtonGroup.Separator />}{m}m</ToggleButton>
  ))}
</ToggleButtonGroup>
```

- **Semantics.** With `selectionMode="single"` RAC sets `role="radiogroup"` on the group and `role="radio"` plus `aria-checked` on each button (`react-aria/dist/private/button/useToggleButtonGroup.mjs:22,45`). Accessibility tree: `radiogroup "Sleep after"` with `radio "5m" [checked]`.
- **Controlled.** `selectedKeys` takes an `Iterable<Key>` and `onSelectionChange` receives a `Set<Key>`. Every `ToggleButton` needs a unique `id`. Keys are strings here, so numbers must be mapped.
- **Re-click.** With `disallowEmptySelection`, clicking the selected button keeps it selected but **still calls `onSelectionChange`** with the same key (measured, and in jsdom).
- **Keyboard.** All four buttons have `tabindex="0"`. ArrowRight moves focus without selecting; Space selects (measured).
- **Unknown value.** `isDisabled` plus `selectedKeys={new Set()}` rendered `radiogroup [disabled]` with every radio `aria-checked="false"` and disabled; supplying a value afterwards enabled and checked it (measured).
- **Whole-row.** There is no row; the group is `w-fit`. `fullWidth` makes each button `flex-1` (measured 115.5px each in a 462px group). Each button is its own hit area.
- **Sizes (measured).** md 36px (≥768px) / 40px (<768px); lg 40px / 44px. Labels `1m`..`30m` are 51-62px wide (`px-4`). `size` on the group propagates to buttons via context.
- **Separator.** Docs say to put `ToggleButtonGroup.Separator` inside every button except the first.
- **Styling.** `.toggle-button-group .toggle-button` sets `rounded-none` plus first/last radii, so per-button radius overrides need `!`. `isDetached` switches to gapped buttons (source only).
- **Hover.** Hover colours are gated by `@media (hover: hover)` (`ST/toggle-button.css`).

### `ButtonGroup` (no selection)
- `ButtonGroup` = RAC `Group` (`role="group"`) of `Button`s with connected radii and a separator (`RE/button-group/button-group.js`, `ST/button-group.css`). It has no selection state and does not set `aria-pressed`. Selection has to be hand-wired: measured with `aria-pressed={selected}` plus a `variant` swap, the tree showed `button "5m" [pressed]` inside `group "Sleep after buttons"`. Heights equal `Button` (36/40px).
- CSS: `button-group.css` plus `button.css`.

### `RadioGroup` + `Radio`
- Shape: `RadioGroup` > `Radio value` > `Radio.Content` > `Radio.Control` > `Radio.Indicator`, then a `Label`. `orientation="horizontal"` is a documented example.
- `Radio.Content` is the `<label>` wrapping `input[type=radio]` (`RE/radio/radio.js`, docs `Radio.Content` section). Measured: 20px tall, content width shrink-wrapped (62-74px), control 16x16. Widening to a row would use the same `w-full` plus padding approach as `Switch.Content`; `[INFERENCE]` not clicked here.
- Accessibility tree: `radiogroup "Sleep after radio"` with `radio "5 min" [checked]`.
- `RadioGroup value={null}` with `isDisabled`: no radio checked, all disabled (jsdom).
- CSS: `radio.css`, `radio-group.css`, `label.css`.

### `Tabs` as a picker
- Works as `tablist`/`tab` with `aria-selected`, but each `tab` carries `aria-controls` pointing at `…-tabpanel-<key>`, which does not exist without a `Tabs.Panel` (measured and in jsdom: `document.getElementById` returned `null`).
- `.tabs__tab` is fixed `h-8` (32px) at every viewport width; the list container is 40px (measured).
- `Tabs.ListContainer` renders `ScrollShadow` plus two hidden `<button aria-label="Scroll tabs left/right" tabindex="-1">` (`RE/tabs/tabs.js`, lines 155-162), so it needs `scroll-shadow.css` as well as `tabs.css`. In this repo `tabs.css` is already imported and `scroll-shadow.css` is not.
- Spike finding (`docs/heroui-spike-findings.md`): a `Tabs.List` inside a portaled `Drawer`, with its `Tabs` root outside, renders zero tabs. Measured here: a **complete** `Tabs` root inside `Drawer.Body` rendered both tabs. I did not reproduce the split case or investigate its cause.

---

## (e) Rename input: `TextField` / `Input`

**Imports.** `import { TextField, Input, Label, Description } from '@heroui/react'`

**CSS.**
```css
@import '@heroui/styles/components/input.css';
@import '@heroui/styles/components/textfield.css';
@import '@heroui/styles/components/label.css';
@import '@heroui/styles/components/description.css';
```

**Structure (measured).**
- `TextField` = RAC `TextField` → `div.textfield` (flex column, `gap-1`). It wires `<label for>` to the input, plus `aria-labelledby` and `aria-describedby` (the `Description` span). Accessibility tree: `textbox "Sensor name"`.
- Bare `Input` is a RAC `Input` with class `input`; with no field it needs its own name (`aria-label="Name for sensor"`).
- Heights: 36px at a 900px viewport, 40px at 400px (CSS `text-base sm:text-sm` plus `py-2`, `ST/input.css:2`). Bare `Input` is content-sized (178px at 900px); inside `TextField` it stretches to 462px.

**Change/commit signatures.**
- `TextField onChange(value: string)` and `isDisabled` are in the HeroUI API table (`text-field` page). `onBlur`, `onFocus` and `onKeyDown` on `TextField` are inherited RAC props; they are not in that table but worked when measured.
- Bare `Input onChange(event)`, `onFocus`, `onBlur`, `onKeyDown` (`disabled`) (docs example at `text-field.mdx` line 477).

**Old commit logic reproduced (measured, both variants).** The draft/`editing` state, a `cancelled` ref and `blur()` calls were copied verbatim from the old `SensorName`:

| Action | Result |
|---|---|
| Type while focused | Value updates, **no** commit logged |
| Enter | `blur()` fired, one commit with the typed text |
| Escape | `cancelled` ref set, `blur()` fired, **no** commit; value reverted to the bus value |
| Click elsewhere | blur fired, one commit |
| `name === undefined` (bare `Input` with `disabled`) | input `disabled`, empty value, computed opacity 0.5 |

HeroUI's `Input` did not swallow Escape or Enter; RAC `TextField` has no Escape behaviour for `type="text"`. `TextField isDisabled` was **not** exercised in the rendered page (only bare `Input disabled` was).

**Gotchas.** Two `onChange` shapes (string vs event). A `data-testid` on `TextField` lands on the root `div`, on `Input` it lands on the `<input>`. The invalid state hides `[data-slot=description]` (`ST/textfield.css`).

**Docs.** [TextField](https://heroui.com/en/docs/react/components/text-field), [Input](https://heroui.com/en/docs/react/components/input), [Label](https://heroui.com/en/docs/react/components/label), [Description](https://heroui.com/en/docs/react/components/description).

---

## (f) Read-only key/value rows

- **Plain markup measured 462x40** for `flex items-center justify-between px-3.5 py-2.5`.
- **`Label` + `Description` standalone** (`import { Label, Description }`): `Label` rendered `<label class="label" data-slot="label">` with no `for` and no control, 14px / weight 500; `Description` rendered `<span class="description" slot="description">`, 12px muted. The accessibility tree showed both as plain `generic` text (no relationship). `Description` returns `null` only inside a `FieldSlotsGate` before its slot exists; standalone it always renders (`RE/utils/use-has-text-slot.js`).
- **`<dl>` with `<dt class="label">` and `<dd class="description">`** gives `term` / `definition` roles in the tree (measured) and picks up HeroUI type styles via the class names; no component is involved.
- HeroUI has no description-list / key-value / `Item` component in the 3.2.6 export list (checked against the `RE` index).
- CSS: `label.css` and `description.css` for the first two options; none for plain markup.

---

## (g) Scroll container: `ScrollShadow`

**Imports.** `import { ScrollShadow } from '@heroui/react'`

**CSS.** `@import '@heroui/styles/components/scroll-shadow.css';`

**Measured** inside `div.flex.h-[240px].flex-col` with `<ScrollShadow className="min-h-0 flex-1">` and 30 rows: client height 216, scroll height 1440, `overflow-y: auto`, `position: relative`, `overscroll-behavior-y: auto`, `scrollbar-width: thin`. A wheel event scrolled it (`scrollTop` 463).
- **Props (docs/source).** `orientation`, `size` (default 40), `offset`, `hideScrollBar`, `isEnabled`, `visibility`, `onVisibilityChange`.
- **`hideScrollBar`** gives `scrollbar-width: none` (measured).
- **Fade.** In `auto` mode the fade is a CSS scroll-driven `mask-image` (`animation-timeline: scroll(self)`) with `data-top-scroll`/`data-bottom-scroll`/`data-top-bottom-scroll` attributes as fallback. The `mask-image` resolves **even when nothing overflows** (measured: `scrollHeight == clientHeight` still had a mask). The docs state the consequence: the root is a stacking context and a containing block for `position: fixed` descendants, and an `animate-*` utility on the same element replaces the fade's `animation`.
- **No overscroll containment.** `overscroll-behavior` stays `auto`; the old coss `ScrollArea` was configured with `overscrollContain`.
- It is a plain scrollable `div` with no ARIA role.

**Docs.** [ScrollShadow](https://heroui.com/en/docs/react/components/scroll-shadow).

---

## (h) Grouped-surface containers

**Imports.** `import { Card, Surface, Fieldset, Separator } from '@heroui/react'`

**CSS.**
```css
@import '@heroui/styles/components/card.css';
@import '@heroui/styles/components/surface.css';
@import '@heroui/styles/components/fieldset.css';
@import '@heroui/styles/components/separator.css'; /* already imported */
```

- **`Card`** (`Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`). Measured defaults: `display: flex`, `padding: 16px`, `gap: 12px`, `border-radius: 32px`, `overflow: visible`, background the surface token, no border. It renders a `div` with `data-slot="card"` and no ARIA role. `Card className="gap-0! p-0!"` measured `padding: 0px; gap: 0px`. Card also provides a `SurfaceContext` so inner HeroUI parts can pick on-surface colours (`RE/card/card.js`).
- **`Surface`** (`variant`: `default`, `secondary`, `tertiary`, `transparent`). Measured: background colour only; padding and radius come from your classes. No ARIA role.
- **`Fieldset`** (`Fieldset.Legend`, `Fieldset.Group`, `Fieldset.Actions`). Renders `<fieldset>` and `<legend>`; the tree shows `group "Display"` (named by the legend). `.fieldset` is `flex flex-col gap-6` with `shrink grow basis-0` (a Safari fix); measured `flex-grow: 1` and `flex-basis: 0px`, so inside a flex parent it grows. `Fieldset.Group` is `space-y-4`.
- **`Separator`** renders `<hr role="separator">` (`separator separator--horizontal`), measured inside the `Card`.
- **`ListBox` as a container** adds `p-1`, `overflow-clip`, `mt-1` between children, and is a `listbox`. It is not a neutral wrapper.
- A translucent glass panel (old `bg-card/20 backdrop-blur-md`) is a styling choice outside this note's scope.

**Docs.** [Card](https://heroui.com/en/docs/react/components/card), [Surface](https://heroui.com/en/docs/react/components/surface), [Fieldset](https://heroui.com/en/docs/react/components/fieldset).

---

## (i) Overlay for a sheet nav style: `Drawer` (and `Modal`)

**Imports.** `import { Drawer, Modal, Button, useOverlayState } from '@heroui/react'`

**CSS.**
```css
@import '@heroui/styles/components/drawer.css';
@import '@heroui/styles/components/close-button.css'; /* Drawer.CloseTrigger / Modal.CloseTrigger */
@import '@heroui/styles/components/modal.css';        /* only for Modal */
```

**Structure (measured, source).**
```tsx
const state = useOverlayState()
<Drawer state={state}>
  <Drawer.Backdrop>
    <Drawer.Content placement="right">
      <Drawer.Dialog aria-label="Connectivity">
        <Drawer.CloseTrigger />
        <Drawer.Header><Drawer.Heading>Connectivity</Drawer.Heading></Drawer.Header>
        <Drawer.Body>…</Drawer.Body>
      </Drawer.Dialog>
    </Drawer.Content>
  </Drawer.Backdrop>
</Drawer>
```
- `Drawer` is RAC `DialogTrigger` and takes `state` (`useOverlayState()`: `isOpen`, `open`, `close`, `toggle`, `setOpen`). `Drawer.Backdrop` is RAC `ModalOverlay` (`isDismissable`, `isKeyboardDismissDisabled`, `variant`). `Drawer.Content` takes `placement` (`top`/`bottom`/`left`/`right`, default **`bottom`**). `Drawer.Dialog` is the `role="dialog"`. A separate `Drawer.Trigger` is not needed with controlled state.
- **Portal.** The dialog's ancestors were `drawer-dialog < drawer-content < drawer-backdrop` directly under `body`; the app root was marked hidden (`aria-hidden` or `inert`; my probe read either) while open. Escape closed the drawer and focus returned to the opener (measured).
- **Name.** `aria-label` on `Drawer.Dialog`, or `Drawer.Heading` (a RAC `Heading slot="title"`). The accessibility tree showed `dialog "Connectivity"`.
- **Right placement size (measured).** Full viewport height, 320px wide at a 400px viewport and 384px at 900px (`w-80 max-w-[85vw] sm:w-96`, `ST/drawer.css:172-177`), padding 24px, body scrollable. `Drawer.CloseTrigger` measured 24x24.
- **Touch handling (source).** Dialog `touch-action: none`, body `touch-action: pan-y`. Drag-to-dismiss starts from the handle, header or footer; it is ignored when the pointer target is inside `input, textarea, button, [role='button'], select, a` or `[data-slot='drawer-body']` (`RE/drawer/drawer.js:63`).
- **Contents inside (measured).** `Switch` row toggled, `Slider` dragged, `ToggleButtonGroup` rendered as `radiogroup`, a complete `Tabs` rendered two tabs.
- **Nested drawers.** A second `Drawer` opened from a button inside the first landed at the same geometry and `z-index` (100000). Escape closed only the top one, then the next Escape closed the first.
- **Custom portal container.** `UNSTABLE_portalContainer` is on `Drawer.Backdrop`'s props type (RAC `Modal.d.ts:39`) and documented for `Modal` ("Custom Portal", API table), not for `Drawer`. Measured with a `relative h-[300px] overflow-hidden` container whose style is `transform: translate(0)`:
  - Without class overrides, the backdrop was container-relative (the `fixed` element resolved against the transformed container), but its height was the visual viewport height: a 462x900 backdrop in a 462x300 container, clipped.
  - With `className="absolute! h-full!"` on `Drawer.Backdrop` and `Drawer.Content`, the backdrop, content and dialog (384x300) all fit inside the container.
  - The old coss sheet used a `portalContainer` prop for the same purpose.
- **`Modal`.** `Modal > Modal.Backdrop > Modal.Container (placement, scroll, size) > Modal.Dialog > Modal.Header/Heading/Body/Footer/CloseTrigger`. Measured centred, 448px wide in a 900px viewport. Custom portal and scroll inside/outside are documented.

**Docs.** [Drawer](https://heroui.com/en/docs/react/components/drawer) (Navigation Drawer example, `useOverlayState`), [Modal](https://heroui.com/en/docs/react/components/modal) (Custom Portal).

---

## Open questions the doc could not settle

- **Real touch and gloves.** All interaction was desktop Chromium with mouse events at 900px and 400px viewport widths. Touch events, hit-slop, `touch-action` conflicts (Drawer `touch-action: none`/`pan-y` against a horizontal slider, Slider thumb `touch-action: none`) and sticky `:hover` on Switch were not tested on a real touch device.
- **Slider inside Drawer chrome.** Drawer drag-to-dismiss ignores only `input`, `textarea`, `button`, `[role='button']`, `select`, `a` and the body. A `Slider.Thumb` target is a `div`, so `[INFERENCE]` a slider placed in `Drawer.Header` or `Drawer.Footer` could start a dismiss drag. Only a slider inside `Drawer.Body` was tested.
- **MQTT publish rate.** `Slider.onChange` fires on every intermediate value during a drag (13 calls in one measured drag); `onChangeEnd` fires once on release but also on every keyboard press. Which one drives publishing is an application decision this note does not settle.
- **`Slider.Marks` future.** It is unstyled and marked TODO in 3.2.6; whether a later 3.x release ships styling is unknown. `value={null}` works at runtime but is undocumented and type-unsafe.
- **`TextField isDisabled`.** Only a bare `Input` with `disabled` was exercised for the disabled-until-known case.
- **Row-wide `Radio`.** The `w-full` plus padding recipe was verified on `Switch.Content`, not clicked on `Radio.Content`.
- **Screen readers.** Roles and names come from the Chromium accessibility tree and jsdom, not from VoiceOver or TalkBack. In particular a navigation row exposed as `listbox`/`option` (`ListBox`) was not heard.
- **Breadcrumbs with long or many labels.** Only three short items were rendered; RAC overflow behaviour was not tested, and each link is a 20px-tall hit area.
- **`Tabs.List` inside a portaled `Drawer`.** The spike's "zero tabs" case was not reproduced and its cause was not investigated; only a self-contained `Tabs` inside `Drawer.Body` was shown to work.
- **Docs drift.** The Switch "Anatomy" block and the Slider class names disagree with the installed 3.2.6 source. Whether upstream has fixed or intends to fix them was not checked.
- **44px rule.** This note shows which primitives reach 44px (only `lg` icon `Button` / `ToggleButton` below 768px) and which do not. Whether to override sizes or carry the suspension is out of scope.

---

## Sources

All accessed 2026-10-09.

**This repo**
- [`docs/design-principles.md`](../design-principles.md), [`docs/heroui-spike-findings.md`](../heroui-spike-findings.md), [`src/index.css`](../../src/index.css), [`package.json`](../../package.json).
- Old Settings: `git show 8b44afb^:src/tabs/SettingsTab.tsx`, `git show 8b44afb^:src/components/TemperatureSettings.tsx`.

**Installed packages** (`@heroui/react` 3.2.6, `@heroui/styles` 3.2.6, `react-aria-components` 1.22.0, `react-aria` 3.53.0)
- `node_modules/@heroui/react/dist/components/{breadcrumbs,button-group,card,description,drawer,fieldset,input,label,list-box,list-box-item,modal,radio,radio-group,scroll-shadow,slider,surface,switch,tabs,textfield,toggle-button,toggle-button-group}/*.js`, `node_modules/@heroui/react/dist/utils/use-has-text-slot.js`.
- `node_modules/@heroui/styles/dist/components/{breadcrumbs,button,button-group,card,close-button,description,drawer,fieldset,input,label,link,list-box,list-box-item,modal,radio,radio-group,scroll-shadow,separator,slider,surface,switch,tabs,textfield,toggle-button,toggle-button-group}.css`.
- `react-aria-components/dist/private/{Switch,Slider}.mjs`, `react-aria-components/dist/types/src/Modal.d.ts`, `react-aria/dist/private/button/useToggleButtonGroup.mjs`.

**HeroUI v3 docs** (`https://heroui.com/en/docs/react/components/<name>`; raw MDX at `https://heroui.com/docs/react/components/<name>.mdx`)
- [switch](https://heroui.com/en/docs/react/components/switch), [slider](https://heroui.com/en/docs/react/components/slider), [toggle-button](https://heroui.com/en/docs/react/components/toggle-button), [toggle-button-group](https://heroui.com/en/docs/react/components/toggle-button-group), [button-group](https://heroui.com/en/docs/react/components/button-group), [radio-group](https://heroui.com/en/docs/react/components/radio-group), [tabs](https://heroui.com/en/docs/react/components/tabs), [breadcrumbs](https://heroui.com/en/docs/react/components/breadcrumbs), [list-box](https://heroui.com/en/docs/react/components/list-box), [text-field](https://heroui.com/en/docs/react/components/text-field), [input](https://heroui.com/en/docs/react/components/input), [label](https://heroui.com/en/docs/react/components/label), [description](https://heroui.com/en/docs/react/components/description), [scroll-shadow](https://heroui.com/en/docs/react/components/scroll-shadow), [surface](https://heroui.com/en/docs/react/components/surface), [card](https://heroui.com/en/docs/react/components/card), [fieldset](https://heroui.com/en/docs/react/components/fieldset), [drawer](https://heroui.com/en/docs/react/components/drawer), [modal](https://heroui.com/en/docs/react/components/modal).
