# coss ui vs HeroUI: does adopting HeroUI improve future native app development?

**Date:** 2026-10-09 (all pages and APIs below were accessed on this date).

**Question.** The Renewvan dashboard is a touchscreen kiosk web app. Its stack is React 19.2, Vite 8, Tailwind 4.3, and `@base-ui/react` ^1.8. The UI layer is coss ui, copied in through a shadcn-CLI registry ([`package.json`](../../package.json), [`components.json`](../../components.json)). There is no React Native or Expo dependency today. The decisive question is **whether moving to HeroUI would improve, or enable, a future native (React Native) app compared with staying on coss ui.** Migration effort is explicitly not a factor. Only long-term native-app upside counts. Every factual claim below links to a primary source: official docs, the library's own repos and APIs, or this repo. Anything I inferred is marked `[INFERENCE]`. Anything I could not find is listed in [Risks and unknowns](#risks-and-unknowns).

---

## Verdict

- **HeroUI is the only one of the two with a first-party native path, but adopting HeroUI on the web does not by itself enable or unlock it.**
  - coss ui has no native offering or roadmap item ([roadmap](https://coss.com/ui/docs/roadmap.md)). Base UI, which coss is built on, has publicly deprioritised React Native ([mui/base-ui#2612](https://github.com/mui/base-ui/issues/2612)).
  - HeroUI Native is a *separate npm package* (`heroui-native`) with its own primitives. It has no dependency on `@heroui/react` or `@heroui/styles` ([native `package.json`](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/package.json), [web `package.json`](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/react/package.json)).
  - `[INFERENCE]` A native app could therefore adopt HeroUI Native while the web stays on coss. Migrating web does not unlock it.
- **What migrating the web to HeroUI would actually buy is convention-level alignment, not code reuse.**
  - Per HeroUI's own docs, the two platforms share a *design-token set*. They also share "familiar component names, dot notation, and prop patterns wherever possible", and both use Tailwind v4 ([v3.0.0 release notes](https://heroui.com/en/docs/react/releases/v3-0-0)).
  - The same page says the native library has a "different rendering engine". Nothing in the docs claims shared component code.
  - The token files are two hand-maintained copies, one per repo ([native `variables.css`](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/variables.css), [web `variables.css`](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/themes/default/variables.css)).
- **HeroUI Native is real but young and narrow.**
  - It is Apache-2.0 and reached v1.0.0 on 2026-03-21. The latest version is v1.0.10 (2026-09-21) ([releases API](https://api.github.com/repos/heroui-inc/heroui-native/releases?per_page=30)).
  - It lists 39 component pages against 72 on web ([native index](https://heroui.com/native/llms.txt), [web index](https://heroui.com/react/llms.txt)). The native index has no Table, Calendar/DatePicker, Combobox/Autocomplete, NumberField, Tooltip, Progress/Meter, Toolbar, Toggle/ToggleGroup, or Sidebar.
  - About 95% of all commits come from one contributor: 1,486 of 1,560 across 26 contributors ([contributors API](https://api.github.com/repos/heroui-inc/heroui-native/contributors?per_page=100)).
  - It is coupled to a fast-moving stack: Uniwind, Reanimated 4, and Expo/RN ([quick start](https://heroui.com/en/docs/native/getting-started/quick-start)).
- **Moving the web app to HeroUI has costs that matter for this project.**
  - HeroUI web's docs index lists no Sidebar, Command, or Context Menu, all of which the repo's `src/components/ui` currently uses (see [Q5](#5-gapsrisks)).
  - Its default control sizes are below the 44px floor in [`docs/design-principles.md`](../design-principles.md). coss's Button already adds a 44px coarse-pointer hit area.
- **Net `[INFERENCE]`:** the gain for a future native app is a *modest* positive on optionality: one vendor, a shared token vocabulary, and a shared mental model. It is not an enabler, and it is not decisive.
  - The one-way-door risk is lower than it looks, because HeroUI Native can be adopted later without having migrated web first. Native-specific hurdles that no UI library addresses remain, for example the DOM-only `leaflet`/`react-leaflet` dependencies in [`package.json`](../../package.json).
  - [What would change the verdict](#what-would-change-the-verdict) lists the triggers that would flip this.

---

## Comparison table

| Dimension | coss ui | HeroUI (web, v3) | HeroUI Native |
|---|---|---|---|
| **Headless foundation** | Base UI (`@base-ui/react`); "built on Base UI from the ground up" ([intro](https://coss.com/ui/docs)). Local dep `^1.8.0`; upstream `apps/ui` pins `1.8.0` ([apps/ui/package.json](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/apps/ui/package.json)). | React Aria Components: peer `react-aria-components ^1.21.1`, `react-aria ^3.52.1` ([packages/react/package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/react/package.json)); [llms.txt](https://heroui.com/llms.txt). | Primitives "adapted from **rn-primitives**" (MIT) ([src/primitives/README.md](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/primitives/README.md)). Not React Aria. |
| **Styling approach** | Tailwind v4 utilities plus shadcn-style CSS variables, with extra `--info`/`--success`/`--warning` tokens ([get-started](https://coss.com/ui/docs/get-started.md)). | `@heroui/styles`: standalone CSS with BEM classes on Tailwind v4, imported with `@import "@heroui/styles"` ([quick start](https://heroui.com/docs/react/getting-started/quick-start.mdx), [v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)). | Tailwind v4 *via Uniwind*; theming through CSS variables ([intro](https://heroui.com/en/docs/native/getting-started), [theming](https://heroui.com/en/docs/native/getting-started/theming)). |
| **Tailwind version** | v4 required ([get-started](https://coss.com/ui/docs/get-started.md)). | `tailwindcss >=4.0.0` peer ([styles/package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/package.json)). | v4 only ([Uniwind quickstart: "Uniwind only supports Tailwind 4"](https://docs.uniwind.dev/quickstart.md)). |
| **Distribution** | Copy-paste source via shadcn CLI registry (`npx shadcn@latest add @coss/...`); "Instead of installing a package, you get the source code" ([intro](https://coss.com/ui/docs)). | npm packages `@heroui/react` + `@heroui/styles`; "HeroUI v3 does not require a Provider" ([quick start](https://heroui.com/docs/react/getting-started/quick-start.mdx)). | npm package `heroui-native` plus mandatory peers and a required provider ([quick start](https://heroui.com/en/docs/native/getting-started/quick-start)). |
| **License** | Mixed. `apps/ui` and `apps/origin` are MIT; "all other directories" are AGPL-3.0 ([LICENSING.md](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/LICENSING.md), [README](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/README.md)). GitHub reports repo license as AGPL-3.0 ([repo API](https://api.github.com/repos/cosscom/coss)). See [unknowns](#risks-and-unknowns). | Apache-2.0 ([LICENSE](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/LICENSE), [v3.0.3 notes](https://github.com/heroui-inc/heroui/releases/tag/v3.0.3)). `package.json` fields still say `MIT`. | Apache-2.0 ([LICENSE](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/LICENSE), [package.json](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/package.json)). |
| **Native offering** | **None found** in primary sources (see [Q2](#2-does-coss-ui-have-a-native-offering-or-roadmap)). | n/a (web). Vendor ships a sibling native library ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)). | Itself the native offering. Targets iOS/Android. "Currently not recommended for web use" ([quick start](https://heroui.com/en/docs/native/getting-started/quick-start)). |
| **Component coverage** | ~50+ primitives ([roadmap](https://coss.com/ui/docs/roadmap.md)), 53 per [get-started](https://coss.com/ui/docs/get-started.md) (agent-skills note). Index in [llms.txt](https://coss.com/ui/llms.txt). | 72 component pages in [index](https://heroui.com/react/llms.txt) (release notes say "75+"). | 39 component pages in [index](https://heroui.com/native/llms.txt) (launch notes said 37). |
| **Maturity / stability label** | No version tags or releases on GitHub (releases API returned none). Dated changelog; latest entry Aug 19, 2026 ([changelog](https://coss.com/ui/docs/changelog.md)). | `@heroui/react` v3.2.6, 2026-09-17, stable ([releases API](https://api.github.com/repos/heroui-inc/heroui/releases?per_page=12)). | v1.0.0 stable 2026-03-21, v1.0.10 2026-09-21 ([releases API](https://api.github.com/repos/heroui-inc/heroui-native/releases?per_page=30), [release page](https://heroui.com/en/docs/native/releases)). |

---

## 1. What is each library's foundation?

### coss ui
- **Headless primitives.** "coss ui is built on **Base UI** from the ground up—not as an adaptation or port from Radix UI" ([intro](https://coss.com/ui/docs)). Primitives are also re-exported from the registry components: `import { SliderPrimitive } from "@coss/ui/components/slider"` ([get-started](https://coss.com/ui/docs/get-started.md)).
- **Styling.** Tailwind CSS v4 is a prerequisite ([get-started](https://coss.com/ui/docs/get-started.md)). Tokens follow Cal.com's design-token system, "the same as shadcn/ui", with additions `--destructive-foreground`, `--info*`, `--success*`, `--warning*` ([get-started](https://coss.com/ui/docs/get-started.md)).
- **Distribution.** Copy-paste via the shadcn CLI, or manual copy. "Instead of installing a package, you get the source code" ([intro](https://coss.com/ui/docs), [get-started](https://coss.com/ui/docs/get-started.md)). This repo wires the `@coss` registry in [`components.json`](../../components.json).
- **Layering.** The vendor defines *primitives* (Base UI-based), *particles* (assembled patterns), and *atoms* ("API-enhanced Particles", e.g. Cal.com scheduling) ([intro](https://coss.com/ui/docs)).
- **Ownership.** coss ui is Cal.com's design system, evolved from Origin UI after acquisition ([roadmap](https://coss.com/ui/docs/roadmap.md), [repo description](https://api.github.com/repos/cosscom/coss)). The repo is a Turborepo of Next.js apps ([README](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/README.md)).

### HeroUI web (v3)
- **Headless primitives.** React Aria Components ([llms.txt](https://heroui.com/llms.txt)). "Migrated from React Aria hooks to React Aria Components" ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)). Peers are `react-aria-components ^1.21.1` and `react-aria ^3.52.1` ([package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/react/package.json)). **It does not use Base UI.**
- **Styling.** `@heroui/styles` is standalone CSS ("BEM class names make every slot customizable") on Tailwind v4 and OKLCH CSS variables. Removing the styles import "gives you a headless library" ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)).
- **Requirements.** React 19+ and Tailwind v4 ([quick start](https://heroui.com/docs/react/getting-started/quick-start.mdx)).
- **Distribution.** npm packages `@heroui/react` + `@heroui/styles`, no Provider ([quick start](https://heroui.com/docs/react/getting-started/quick-start.mdx)). Not a copy-paste registry.
- **Version.** `@heroui/react` 3.2.6 on the `v3` branch ([package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/react/package.json)).

### HeroUI Native
See the [deep-dive](#heroui-native-deep-dive).

---

## 2. Does coss ui have a native offering or roadmap?

**No. I found none in any primary source.** Where I looked:

- **Docs navigation.** Overview, Components, Hooks, and Resources contain no native/mobile section ([docs index](https://coss.com/ui/docs)). The machine-readable [llms.txt](https://coss.com/ui/llms.txt) lists only web components and two web hooks.
- **Roadmap page.** "Current Status" is 50+ primitives and particles. "What's Next" is more primitives, more particles, and "atoms". Native is not mentioned ([roadmap](https://coss.com/ui/docs/roadmap.md)).
- **Requirements.** Get-started requires "a React project set up with Tailwind CSS", with Next.js font examples ([get-started](https://coss.com/ui/docs/get-started.md)).
- **Source repo.** `apps/` and `packages/` contain `www`, `ui`, `origin`, `ui` (shared package), and TypeScript configs, with no native app or package ([README](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/README.md), [packages API](https://api.github.com/repos/cosscom/coss/contents/packages)).
- **Issues and PRs.** I ran GitHub issue searches for `"react native"`, `expo`, `nativewind`, `"native app"`, and `"mobile"` ([search: "react native"](https://api.github.com/search/issues?q=repo:cosscom/coss+%22react+native%22), [search: expo](https://api.github.com/search/issues?q=repo:cosscom/coss+expo+in:title,body), [search: nativewind](https://api.github.com/search/issues?q=repo:cosscom/coss+nativewind)). There was no issue or PR requesting or planning React Native support. The only text matches I read were [#116](https://github.com/cosscom/coss/pull/116) (wording about "native React integration" in an unrelated input refactor) and [#770](https://github.com/cosscom/coss/issues/770) (an alert-dialog scroll bug). The "mobile" hits (#806, #685, #571, #537, #170) are all about web layout on small viewports.
- **Foundation.** coss sits on Base UI, which has no React Native support (next paragraph).

### Base UI's own statement
Base UI (the foundation coss depends on) has an open discussion, [mui/base-ui#2612 "Base UI Integration with React Native?"](https://github.com/mui/base-ui/issues/2612). It was opened 2025-09-02 by a project member (`oliviertassinari`, `author_association: MEMBER`) and remains open. It says: "we can't support React Native **and** provide an amazing React DOM support (our priority). So we could almost keep this issue closed." A separate request to support `react-strict-dom` ([#2264](https://github.com/mui/base-ui/issues/2264)) is labelled `on hold` and is also open.

Base UI's [About page](https://base-ui.com/react/overview/about.md) and [llms.txt](https://base-ui.com/llms.txt) describe it only as a React library for web interfaces ("compatible with Tailwind, CSS Modules, plain CSS…"). I found no React Native mention in either document.

**Conclusion for Q2:** coss ui has no native offering and no stated roadmap for one. Its foundation is explicitly web-first. A native app on coss means an independent native stack.

---

## 3. HeroUI Native: what exactly is it?

See the [deep-dive](#heroui-native-deep-dive) below for the full detail. In short:

- **It is a separate React Native library**, `heroui-native`, in a separate repo ([heroui-inc/heroui-native](https://github.com/heroui-inc/heroui-native), Apache-2.0).
- **Requirements** (peer deps; [package.json](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/package.json)):
  - `react >=19.0.0`
  - `react-native >=0.81.0`
  - `react-native-reanimated ^4.1.1`
  - `react-native-gesture-handler ^2.28.0`
  - `react-native-worklets >=0.5.1`
  - `react-native-safe-area-context ^5.6.0`
  - `react-native-svg ^15.12.1`
  - `tailwind-merge ^3.4.0`
  - `tailwind-variants ^3.2.2`
  - Optional: `@gorhom/bottom-sheet ^5.2.9`, `expo-blur >=14`, and `react-native-screens >=4`.
- **Styling engine:** Tailwind v4 via [Uniwind](https://uniwind.dev/) ([intro](https://heroui.com/en/docs/native/getting-started)).
- **Stability label:** stable 1.0 (v1.0.0, March 2026, "graduating from beta and release candidate stages") ([release page](https://heroui.com/en/docs/native/releases)). The FAQ calls it "production-ready" ([intro](https://heroui.com/en/docs/native/getting-started)); that is a vendor claim, not independent evidence.
- **Separate codebase with separate APIs.** Native has its own primitives and its own token CSS. It has no runtime dependency on the web packages (see Q4).

---

## 4. How much can be shared between web HeroUI and HeroUI Native?

### What the docs state

| Shared item | Documented claim | Source |
|---|---|---|
| **Design tokens** | "Both platforms read from the same token set. Colors like `accent`, `surface`, `danger`, and `success` resolve identically across web and native." | [v3.0.0 notes, "Shared Design Tokens"](https://heroui.com/en/docs/react/releases/v3-0-0) |
| **Component names / API patterns** | "Familiar component names, dot notation, and prop patterns wherever possible. Where the platforms diverge (layout primitives, gestures, navigation), the APIs adapt to feel native." | [v3.0.0 notes, "Familiar Across Platforms"](https://heroui.com/en/docs/react/releases/v3-0-0) |
| **Mental model** | "Different rendering engine, same mental model." "Teams working on both web and mobile share knowledge and patterns." | [v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0) |
| **Tailwind** | "Tailwind CSS v4 on both platforms. Uniwind on native, standard Tailwind on web." | [v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0) |
| **Theme variable vocabulary** | Native theming uses the same semantic names (`--background`, `--surface`, `--accent`, `--danger`, `--field-*`) and the same `-foreground` suffix convention. | [native theming](https://heroui.com/en/docs/native/getting-started/theming) |

### What the docs do NOT state
- **No shared component code.** The v3.0.0 notes call native "a brand-new library" with a "different rendering engine". I found no statement that components, hooks, or logic are shared.
- **No shared package.** The native package has no `dependencies` and no `@heroui/*` peer dependency ([native package.json](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/package.json)). The web package depends on `@heroui/styles` workspace, React Aria, and others, and nothing native ([web package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/react/package.json)).
- **Tokens are two parallel files.** Native has `src/styles/variables.css` in its own repo ([native variables.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/variables.css)). Web has `packages/styles/themes/default/variables.css` ([web variables.css](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/themes/default/variables.css)).
  - I compared specific values by eye. `--accent: oklch(0.6204 0.195 253.83)` and `--success: oklch(0.7329 0.1935 150.81)` match in both. `--background` light is `oklch(0.9702 0 0)` in native and in the web release notes. I did not diff the full files.
  - The file structure and mechanics differ. Native uses Uniwind's `@variant light`/`@variant dark` ([native theming](https://heroui.com/en/docs/native/getting-started/theming)). Web uses `:root`/`[data-theme]` ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)).
  - The native theming page links its "Theme source" to the *web* repo's `packages/styles/themes` ([native theming](https://heroui.com/en/docs/native/getting-started/theming)). That is documentation convenience, not a documented runtime import.
- **Animation engines differ.** Web: "native CSS transitions and keyframes" replaced Framer Motion ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)). Native: Reanimated is a mandatory peer ([quick start](https://heroui.com/en/docs/native/getting-started/quick-start)).
- **Native on web is not the shared-code route.** "HeroUI Native is currently not recommended for web use … please use HeroUI React instead" ([quick start](https://heroui.com/en/docs/native/getting-started/quick-start)). Native issues for web usage ([#456](https://github.com/heroui-inc/heroui-native/issues/456), [#379](https://github.com/heroui-inc/heroui-native/issues/379), [#390](https://github.com/heroui-inc/heroui-native/issues/390)) are closed, but the docs stance stands.
- **Docs live together.** Native docs sources are in the *web* repo (`apps/docs`), e.g. [design-principles.mdx](https://heroui.com/docs/native/getting-started/design-principles.mdx) links to `heroui-inc/heroui/.../apps/docs/content/docs/en/native/...`. That aids docs consistency but is not code sharing.

### What this means in practice `[INFERENCE]`
- Shared: brand colors and semantic token names, plus developer familiarity. Copying the token block between the two `global.css` files is mechanical.
- Not shared: component implementations, tests, accessibility behavior, animation code. Screens must be written twice, as for any React Native app.

---

## 5. Gaps/risks

### Component parity gaps (index-to-index comparison)

Native has **39** component pages; web has **72** ([native index](https://heroui.com/native/llms.txt), [web index](https://heroui.com/react/llms.txt); extracted by listing `/components/<slug>` links).

- **On web only, not in native:** alert-dialog, autocomplete, avatar-group, badge, breadcrumbs, button-group, calendar, checkbox-group, color-* components, combo-box, date-field, date-picker, date-range-picker, disclosure(-group), drawer, dropdown, error-message, fieldset, form, kbd, link, list-box, meter, modal, number-field, pagination, progress-bar, progress-circle, range-calendar, table, time-field, toggle-button(-group), toolbar, tooltip.
- **Native only:** bottom-sheet, control-field, dialog, link-button, list-group, menu, pressable-feedback, skeleton-group.
- **Native roadmap.** Table, Combobox, DateTime Picker, Number Field, ListBox, and Carousel appear under "Under consideration" on the [native roadmap](https://herouinative.featurebase.app/roadmap). That column holds user requests, not committed work. "Next up" has 1 item and "In Progress" has 1.

**Against this repo's actual `src/components/ui` (~55 coss components)**, the following have *no same-named page* in the native index: autocomplete, calendar, combobox, command, context-menu, date-picker, empty, field/fieldset/form, frame, group, kbd, meter, number-field, pagination, preview-card, progress, scroll-area, sidebar, table, toggle, toggle-group, toolbar, tooltip, badge, breadcrumb, collapsible, checkbox-group. Some have an obvious analog (Drawer/Sheet → BottomSheet, Alert-dialog → Dialog, Badge → Chip, Collapsible → Accordion). Others have none.

**Against the web side**, HeroUI web's index also has no Sidebar, Command, Context Menu, Empty, Frame, or Sheet. Some of these the repo uses today ([web index](https://heroui.com/react/llms.txt)). If this repo moved to HeroUI web, those would need custom builds. `[INFERENCE]` The cost does not depend on native plans.

### Maturity / stability / breaking-change risk
- **HeroUI Native is 1.0.x.** There is a stable label, but 10 patch releases in 6 months (2026-03-21 → 2026-09-21, [releases API](https://api.github.com/repos/heroui-inc/heroui-native/releases?per_page=30)). Several patches carry API-affecting changes:
  - v1.0.5 raised the toolchain to Expo 57 / RN 0.86 and changed field border styling.
  - v1.0.6 migrated all component styling to BEM CSS files.
  - v1.0.8 changed `Card.Header` and `TagGroup.List` child alignment ([release page](https://heroui.com/en/docs/native/releases)).
  - v1.0.4 renamed `Text` → `Typography`, keeping deprecated exports ([release page](https://heroui.com/en/docs/native/releases)).
- **Dependency coupling.** The quick start asks for exact pinned peers and warns "Version mismatches may cause unexpected bugs" ([quick start](https://heroui.com/en/docs/native/getting-started/quick-start)). A user-filed issue reports that 1.0.10 pins Uniwind 1.12.0 with Tailwind 4.3.3, which was hit by an upstream platform-variant leak bug ([heroui-native#507](https://github.com/heroui-inc/heroui-native/issues/507)). The upstream Uniwind issue ([uni-stack/uniwind#668](https://github.com/uni-stack/uniwind/issues/668)) is now closed. The proposed fix PR #671 was *not* merged, so how it was resolved is unverified.
- **Uniwind is a separate project.** The free version is MIT. A paid "Pro" version (commercial C++ engine) exists ([Uniwind Pro](https://docs.uniwind.dev/pro-version.md)). I found no HeroUI doc stating that Native requires Pro.
- **Web v3 is also moving.** v3.2.0 shipped "breaking Radio, Checkbox, and Switch composition changes", and v3.0.5 renamed `Text` → `Typography` as breaking ([web llms.txt release index](https://heroui.com/llms.txt)).
- **coss.** There are no tagged releases; breaking changes are copy-paste migrations documented in a [changelog](https://coss.com/ui/docs/changelog.md), for example `Toggle` → `ToggleGroupItem`, the removed `input-otp`, and Form default classes removed.

### License
- **HeroUI web and Native: Apache-2.0** ([web LICENSE](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/LICENSE), [native LICENSE](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/LICENSE)). The web `package.json` `license` fields (`@heroui/react`, `@heroui/styles`) still say `MIT`. That is metadata drift against the LICENSE file and the [v3.0.3 notes](https://github.com/heroui-inc/heroui/releases/tag/v3.0.3). Either way it is permissive.
- **coss ui is mixed.** `apps/ui` (where the registry source lives) is MIT. Everything else, including `packages/ui`, is AGPL-3.0 ([LICENSING.md](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/LICENSING.md), [apps/ui/package.json](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/apps/ui/package.json) `"license": "MIT"`, [packages/ui/package.json](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/packages/ui/package.json) `"license": "AGPL-3.0-or-later"`). The registry item JSON for Button has `"license": null` and points to `registry/default/ui/button.tsx` ([button.json](https://coss.com/ui/r/button.json)). `[INFERENCE]` Files delivered by the registry come from the MIT-licensed `apps/ui`. This is not stated in the delivered artifact, so a license check is advisable. This affects neither library's native story directly.

### Bus factor / maintenance signals
- **HeroUI Native.** One contributor, `vvv-sss`, has 1,486 of 1,560 commits (about 95%) among 26 contributors ([contributors API](https://api.github.com/repos/heroui-inc/heroui-native/contributors?per_page=100)). The 8 most recent commits are all by that account, up to the 2026-09-21 release ([commits API](https://api.github.com/repos/heroui-inc/heroui-native/commits?per_page=8)). The README says "Only core team can add new components" ([README](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/README.md)). Last push was 2026-09-25 ([repo API](https://api.github.com/repos/heroui-inc/heroui-native)).
- **HeroUI web.** Top contributors are `jrgarciadev` (2,911) and `wingkwong` (445); commits on 2026-10-09 ([contributors API](https://api.github.com/repos/heroui-inc/heroui/contributors?per_page=8), [commits API](https://api.github.com/repos/heroui-inc/heroui/commits?per_page=5)). There is a commercial arm: HeroUI Pro (paid components/templates) is advertised in the same docs ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)).
- **coss.** `pasqualevitiello` is the top contributor (975); repo pushed 2026-10-07 ([contributors API](https://api.github.com/repos/cosscom/coss/contributors?per_page=10), [repo API](https://api.github.com/repos/cosscom/coss)). Backed by Cal.com, which "will be progressively adopting" it ([intro](https://coss.com/ui/docs)). I did not compute the full contributor distribution.
- **Base UI.** Maintained by a listed team of seven, "from the creators of Radix, Material UI, and Floating UI" ([About](https://base-ui.com/react/overview/about.md)).
- **Open issues on native.** 9 open issues, 122 closed ([search: open](https://api.github.com/search/issues?q=repo:heroui-inc/heroui-native+is:issue+is:open), [search: closed](https://api.github.com/search/issues?q=repo:heroui-inc/heroui-native+is:issue+is:closed)). Examples: iOS freeze with `PressableFeedback` lists ([#506](https://github.com/heroui-inc/heroui-native/issues/506)), iOS crash toggling `ControlField` + `Checkbox` rows ([#426](https://github.com/heroui-inc/heroui-native/issues/426)), toast frame drops ([#369](https://github.com/heroui-inc/heroui-native/issues/369)).

### Kiosk / touch-target suitability (vs [`docs/design-principles.md`](../design-principles.md): min 44×44px, whole-row hit areas, no hover-only cues)

| Library | Evidence | Reading |
|---|---|---|
| **coss (this repo)** | Button base class includes `pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11` (44px minimum hit area on coarse pointers) in [`src/components/ui/button.tsx`](../../src/components/ui/button.tsx) line 11. The same class string is in upstream [`registry/default/ui/button.tsx`](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/apps/ui/registry/default/ui/button.tsx). Visible height is `h-9 sm:h-8`. | Button already meets the 44px rule via an expanded hit area. I checked Button only. |
| **HeroUI web** | `.button` is `h-10 … md:h-9` (40px, 36px on md+); `--sm` is `h-9 md:h-8`; `--lg` is `h-11 md:h-10` (44px on small, 40px on md+); icon-only `w-10 md:w-9` ([button.css](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/components/button.css) lines 4, 69-70, 86-87, 144-153). A `grep` for `coarse`/`min-h-11`/`44px` in `button.css`, `switch.css`, `checkbox.css`, `tabs.css` found 0 matches. Hover styles are gated by `@media (hover: hover)` on Button. | Default sizes are below 44px at desktop breakpoints, so a kiosk would need overrides. Hover is already gated on Button. Only 4 files sampled. |
| **HeroUI Native** | Button heights: `sm` = `spacing*10` (40), `md` = `spacing*12` (48), `lg` = `spacing*14` (56) ([button.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/components/button.css) lines 43-60). Switch root is 48×24 ([switch.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/components/switch.css)). `ControlField` "combines a label, description … and a control (Switch or Checkbox) into a single pressable area" ([component list](https://heroui.com/native/llms.txt); [Switch docs](https://heroui.com/docs/native/components/switch.mdx): "creating a larger touch target"). | Maps directly onto the design-principles rule "make the entire row clickable". Default Button `md` is above the floor (units are density-independent pixels, not CSS px). No 44px/hitSlop rule found in `button.css`, `switch.css`, `tabs.css`. |

I found no HeroUI or coss documentation addressing gloved use, kiosk mode, or Android lock-task. The design-principles requirement is a project constraint, not something either vendor documents.

### Accessibility
- **coss/Base UI.** Base UI components "adhere to WAI-ARIA design patterns" and are "tested on a wide range of platforms, devices, browsers, screen readers" ([About](https://base-ui.com/react/overview/about.md)).
- **HeroUI web.** React Aria Components for keyboard navigation, focus management, and screen readers ([v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0)).
- **HeroUI Native.** Docs claim VoiceOver/TalkBack labels and "touch accessibility" ([design principles](https://heroui.com/docs/native/getting-started/design-principles.mdx)). v1.0.2 added "VoiceOver modal containment support across all portal-based overlays" ([release page](https://heroui.com/en/docs/native/releases)). One open issue reports that `BottomSheet.Portal` hides the *entire* app accessibility tree on iOS even when the sheet is closed ([#372](https://github.com/heroui-inc/heroui-native/issues/372), open since 2026-04-07). I did not reproduce it.

---

## HeroUI Native deep-dive

| Aspect | Findings | Source |
|---|---|---|
| **Version / label** | v1.0.10 (2026-09-21); v1.0.0 stable 2026-03-21; previous alpha.14 (2025-10-02) → beta → rc → 1.0. "Stable releases: v1.0.0 shipped Q1 2026." | [releases API](https://api.github.com/repos/heroui-inc/heroui-native/releases?per_page=30), [release page](https://heroui.com/en/docs/native/releases) |
| **Cadence** | v1.0.0 (03-21) → .1 (04-01) → .2 (04-15) → .3 (05-11) → .4 (05-26) → .5 (07-02) → .6 (07-21) → .7 (07-28) → .8 (07-31) → .9 (08-31) → .10 (09-21). Gaps range from ~3 days to ~5 weeks. | [releases API](https://api.github.com/repos/heroui-inc/heroui-native/releases?per_page=30) |
| **Platform** | iOS/Android (React Native/Expo). Not recommended on web. A "Preview App" is on the iOS App Store; "Android: Coming soon". | [quick start](https://heroui.com/en/docs/native/getting-started/quick-start), [README](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/README.md) |
| **React/RN requirements** | `react >=19`, `react-native >=0.81.0`, Reanimated `^4.1.1`, Gesture Handler `^2.28.0`, Worklets `>=0.5.1`, Safe Area Context `^5.6.0`, SVG `^15.12.1`, `tailwind-variants ^3.2.2`, `tailwind-merge ^3.4.0`; optional `@gorhom/bottom-sheet`, `expo-blur`, `react-native-screens`. | [package.json](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/package.json) |
| **Expo support** | Quick start covers "a React Native or Expo project". The CLI scaffolds Expo (Router) with TS, Uniwind, and provider. The toolchain moved to Expo 57 / RN 0.86 in v1.0.5; Expo 55 compat in RC 3. | [quick start](https://heroui.com/en/docs/native/getting-started/quick-start), [release page](https://heroui.com/en/docs/native/releases) |
| **Styling engine** | Uniwind (Tailwind v4 for RN), configured via Metro (`withUniwindConfig`) and `global.css` with `@import 'tailwindcss'; @import 'uniwind'; @import 'heroui-native/styles';`. NativeWind migration guide linked. | [quick start](https://heroui.com/en/docs/native/getting-started/quick-start), [Uniwind quickstart](https://docs.uniwind.dev/quickstart.md) |
| **Provider requirement** | Must wrap the app in `GestureHandlerRootView` and `HeroUINativeProvider`. | [quick start](https://heroui.com/en/docs/native/getting-started/quick-start) |
| **Foundation primitives** | Own `src/primitives/*` adapted from MIT-licensed rn-primitives: accordion, alert, avatar, bottom-sheet, checkbox, dialog, input-otp, label, menu, popover, radio(-group), select, slider, switch, tabs, tag-group, toast, etc. | [primitives README](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/primitives/README.md), [src tree](https://api.github.com/repos/heroui-inc/heroui-native/contents/src/primitives) |
| **Component coverage** | 39 component pages: buttons (Button, CloseButton, LinkButton), Menu, TagGroup, Slider, Switch, Chip, Alert, Skeleton(Group), Spinner, forms (Checkbox, ControlField, Description, FieldError, Input, InputGroup, InputOTP, Label, RadioGroup, SearchField, Select, TextArea, TextField), Card, Separator, Surface, Avatar, Accordion, ListGroup, Tabs, BottomSheet, Dialog, Popover, Toast, Typography, PressableFeedback, ScrollShadow. | [native llms.txt](https://heroui.com/native/llms.txt), [components page](https://heroui.com/en/docs/native/components) |
| **Theming** | CSS variables via Uniwind `@variant light`/`dark`; custom themes require registering in Metro config (`extraThemes`); same semantic color names as web; optional `heroui-native/styles/vibrant` palette. | [theming](https://heroui.com/en/docs/native/getting-started/theming) |
| **Shareability with web** | Tokens and vocabulary: yes (documented). Components/code: not stated. See [Q4](#4-how-much-can-be-shared-between-web-heroui-and-heroui-native). | [v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0) |
| **Roadmap / governance** | Public roadmap on Featurebase. "Only core team can add new components." | [roadmap](https://herouinative.featurebase.app/roadmap), [README](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/README.md) |
| **Known limitations** | iOS/Android only. Several open crash/freeze/a11y issues. No Table/Calendar/Combobox/NumberField. | See [Q5](#5-gapsrisks). |

---

## Independent native route (for the "stay on coss" side)

This section is limited to what primary sources show; it is not a recommendation of a specific library.

- HeroUI Native's own primitives come from **rn-primitives**, described as "Style-agnostic, accessible React Native components for iOS, Android, and Web", MIT, last push 2026-08-08 ([repo API](https://api.github.com/repos/roninoss/rn-primitives)).
- **React Native Reusables** ("Bringing shadcn/ui to React Native … Nativewind/Uniwind") is MIT; last push 2026-09-27 ([repo API](https://api.github.com/repos/founded-labs/react-native-reusables), [README](https://github.com/founded-labs/react-native-reusables/blob/main/README.md)).
- coss tokens "are the same as shadcn/ui" ([get-started](https://coss.com/ui/docs/get-started.md)).
- `[INFERENCE]` A shadcn-token-based RN library plus Uniwind could reuse the same CSS-variable vocabulary as coss. That would give coss a comparable "shared tokens, separate components" arrangement to HeroUI's. I did not test this, and did not verify that library's component coverage, maturity, or accessibility.
- **React Aria and React Native.**
  - React Aria's official docs ([getting started](https://react-aria.adobe.com/getting-started.md), [llms.txt](https://react-aria.adobe.com/llms.txt)) contain no React Native mention that I could find.
  - The community `react-native-aria` repo (GeekyAnts) is archived, and its README says "DEPRECATED … migrated … to gluestack-ui" ([repo API](https://api.github.com/repos/GeekyAnts/react-native-aria), [README](https://github.com/GeekyAnts/react-native-aria/blob/main/README.md)).
  - HeroUI Native does not use React Aria; its foundation is rn-primitives (above).
  - Two recent react-spectrum PRs mention React Native in `react-stately` ([#10550](https://github.com/adobe/react-spectrum/pull/10550), [#10512](https://github.com/adobe/react-spectrum/issues/10512)), but they are bug fixes and not a support statement.

---

## Risks and unknowns

**Not found in primary sources (looked where stated):**
- **Any coss ui statement on React Native/Expo/mobile-native support.** Looked at: the [docs](https://coss.com/ui/docs), [roadmap](https://coss.com/ui/docs/roadmap.md), [changelog](https://coss.com/ui/docs/changelog.md), [llms.txt](https://coss.com/ui/llms.txt), the repo [README](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/README.md), and GitHub issue/PR searches. Absence of evidence is not proof they will never do it.
- **Any HeroUI statement of shared component code or hooks between web and native.** Looked at: the [v3.0.0 notes](https://heroui.com/en/docs/react/releases/v3-0-0), native [intro](https://heroui.com/en/docs/native/getting-started), [theming](https://heroui.com/en/docs/native/getting-started/theming), and both `package.json` files.
- **HeroUI Native behavior on kiosk-style deployments** (Android tablet, lock-task mode, always-on display). No doc addresses it. `[INFERENCE]` A kiosk native build would most plausibly be an Android app; no source says whether HeroUI Native has been exercised in that setting.
- **Whether HeroUI Native components enforce a 44px minimum hit area.** Only `button.css`, `switch.css`, and `tabs.css` were grepped; hit-slop may live in component TSX, which I did not read.
- **Dated commitments for native roadmap items** (Table, Combobox, DateTime Picker, NumberField). The roadmap lists only user requests under "Under consideration".
- **How Uniwind issue #668 was resolved.** The upstream issue is closed, but the proposed PR #671 is unmerged ([uniwind#668](https://github.com/uni-stack/uniwind/issues/668)). Whether `heroui-native` 1.0.10's pinned Uniwind is safe today is unverified. I did not install or run anything.
- **Whether HeroUI Native depends on any Uniwind Pro-only feature.** Not found in the HeroUI docs I read. `variables.css` mentions "overridden by Pro theme CSS", which refers to HeroUI Pro, not Uniwind Pro ([native variables.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/variables.css)).

**Ambiguities and limits:**
- **coss licensing of delivered files.** The shadcn registry item has `license: null`. The source directory is MIT per [LICENSING.md](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/LICENSING.md), but the repo-wide default and `packages/ui` are AGPL-3.0. Needs a legal read before any redistribution decision.
- **HeroUI `package.json` license fields** say MIT while the LICENSE file is Apache-2.0.
- **Contributor stats.** The native count came from the first 100 contributors (only 26 existed). The web and coss counts are top-N only.
- **Vendor claims.** "Production-ready", "75+ components", and "37 components" are vendor statements. My own counts come from the component indexes ([web](https://heroui.com/react/llms.txt) = 72, [native](https://heroui.com/native/llms.txt) = 39) and may differ from marketing numbers.
- **I did not install, build, or run either library.** No hands-on verification of behavior; everything is from docs, repo files, and GitHub APIs.
- **Non-UI portability is out of scope.** `leaflet`, `react-leaflet`, and `mqtt` in [`package.json`](../../package.json) have their own native-portability story that neither UI library changes. `[INFERENCE]` Leaflet is DOM-based; a native map would need a different library.

---

## What would change the verdict

**Toward "migrate web to HeroUI now" (a stronger yes on native upside):**
- A documented shared-code path between `@heroui/react` and `heroui-native` (shared hooks, a shared tokens package, or a universal API). Today, none is stated.
- A committed, dated native roadmap covering Table, Combobox, NumberField, and Calendar, with more than one core maintainer.
- A decision to ship a native app soon *and* to keep one design-token source of truth across both clients. In that case the shared vocabulary matters more than the cost of a web migration.
- HeroUI web adding Sidebar/Command-class components, or coarse-pointer 44px hit areas, reducing the web-side cost.

**Toward "stay on coss ui" (a stronger no):**
- Native app plans stay hypothetical. HeroUI Native can then be adopted later without having migrated web first (see Verdict `[INFERENCE]`).
- The kiosk device stays a web (PWA/browser) target. Per [`docs/design-principles.md`](../design-principles.md) and [`CONTEXT.md`](../../CONTEXT.md), there is no native requirement today.
- HeroUI Native's single-maintainer concentration persists or worsens, or the Uniwind/Reanimated/Expo coupling causes repeated breakage ([#507](https://github.com/heroui-inc/heroui-native/issues/507)).
- coss gains a native story (nothing indicates it will), or an independent shadcn-token RN stack proves out for the project.

---

## Sources

All accessed 2026-10-09. "Version/tag read" is the version, tag, or commit I read.

**Repo (this project)**
- [`docs/design-principles.md`](../design-principles.md), [`CONTEXT.md`](../../CONTEXT.md), [`package.json`](../../package.json), [`components.json`](../../components.json), [`src/components/ui/button.tsx`](../../src/components/ui/button.tsx). Version: `dashboard` 0.1.29.

**coss ui**
- https://coss.com/ui (home, component list)
- https://coss.com/ui/docs (introduction)
- https://coss.com/ui/docs/get-started.md
- https://coss.com/ui/docs/roadmap.md
- https://coss.com/ui/docs/changelog.md (latest entry Aug 19, 2026)
- https://coss.com/ui/llms.txt
- https://coss.com/ui/r/button.json (registry item)
- https://github.com/cosscom/coss, commit `81151ba8fd3fae78c58beff7577594ce5deda5a8` (main): [README](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/README.md), [LICENSING.md](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/LICENSING.md), [apps/ui/package.json](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/apps/ui/package.json), [packages/ui/package.json](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/packages/ui/package.json), [apps/ui/registry/default/ui/button.tsx](https://github.com/cosscom/coss/blob/81151ba8fd3fae78c58beff7577594ce5deda5a8/apps/ui/registry/default/ui/button.tsx)
- GitHub APIs: [repo](https://api.github.com/repos/cosscom/coss), [contributors](https://api.github.com/repos/cosscom/coss/contributors?per_page=10), [issue search "react native"](https://api.github.com/search/issues?q=repo:cosscom/coss+%22react+native%22), [issue search expo](https://api.github.com/search/issues?q=repo:cosscom/coss+expo+in:title,body), [issue search nativewind](https://api.github.com/search/issues?q=repo:cosscom/coss+nativewind), [issues #116](https://github.com/cosscom/coss/pull/116), [#770](https://github.com/cosscom/coss/issues/770). No releases/tags returned.

**HeroUI web (v3)**
- https://heroui.com/llms.txt, https://heroui.com/react/llms.txt (v3.2.6 release index)
- https://heroui.com/en/docs/react/releases/v3-0-0 (March 2026)
- https://heroui.com/docs/react/getting-started/quick-start.mdx
- https://github.com/heroui-inc/heroui, branch `v3`, commit `ece1e4e15ea5d21e86cc4dcd11dd21647f96c678`: [packages/react/package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/react/package.json) (3.2.6), [packages/styles/package.json](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/package.json), [button.css](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/components/button.css), [themes/default/variables.css](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/packages/styles/themes/default/variables.css), [LICENSE](https://github.com/heroui-inc/heroui/blob/ece1e4e15ea5d21e86cc4dcd11dd21647f96c678/LICENSE)
- GitHub APIs: [repo](https://api.github.com/repos/heroui-inc/heroui), [releases](https://api.github.com/repos/heroui-inc/heroui/releases?per_page=12), [contributors](https://api.github.com/repos/heroui-inc/heroui/contributors?per_page=8), [commits](https://api.github.com/repos/heroui-inc/heroui/commits?per_page=5), [v3.0.3 release](https://github.com/heroui-inc/heroui/releases/tag/v3.0.3)

**HeroUI Native**
- https://heroui.com/en/docs/native/getting-started (intro/FAQ)
- https://heroui.com/en/docs/native/getting-started/quick-start
- https://heroui.com/en/docs/native/getting-started/theming
- https://heroui.com/docs/native/getting-started/design-principles.mdx
- https://heroui.com/docs/native/components/switch.mdx
- https://heroui.com/en/docs/native/components
- https://heroui.com/en/docs/native/releases (latest v1.0.10, Sept 2026)
- https://heroui.com/native/llms.txt
- https://herouinative.featurebase.app/roadmap
- https://github.com/heroui-inc/heroui-native, tag/package `v1.0.10`, main commit `122f63db3159f2192a9de38c0e85e5ae9004473a`: [package.json](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/package.json), [README](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/README.md), [LICENSE](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/LICENSE), [primitives README](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/primitives/README.md), [variables.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/variables.css), [button.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/components/button.css), [switch.css](https://github.com/heroui-inc/heroui-native/blob/122f63db3159f2192a9de38c0e85e5ae9004473a/src/styles/components/switch.css)
- GitHub APIs: [repo](https://api.github.com/repos/heroui-inc/heroui-native), [releases](https://api.github.com/repos/heroui-inc/heroui-native/releases?per_page=30), [contributors](https://api.github.com/repos/heroui-inc/heroui-native/contributors?per_page=100), [commits](https://api.github.com/repos/heroui-inc/heroui-native/commits?per_page=8), [src/primitives](https://api.github.com/repos/heroui-inc/heroui-native/contents/src/primitives), issues [#372](https://github.com/heroui-inc/heroui-native/issues/372), [#369](https://github.com/heroui-inc/heroui-native/issues/369), [#379](https://github.com/heroui-inc/heroui-native/issues/379), [#390](https://github.com/heroui-inc/heroui-native/issues/390), [#426](https://github.com/heroui-inc/heroui-native/issues/426), [#456](https://github.com/heroui-inc/heroui-native/issues/456), [#506](https://github.com/heroui-inc/heroui-native/issues/506), [#507](https://github.com/heroui-inc/heroui-native/issues/507)

**Uniwind**
- https://docs.uniwind.dev/quickstart.md, https://docs.uniwind.dev/pro-version.md, https://docs.uniwind.dev/llms.txt
- https://github.com/uni-stack/uniwind/issues/668 (closed 2026-10-01); latest release read: v1.12.2 (2026-10-05)

**Base UI**
- https://base-ui.com/react/overview/about.md, https://base-ui.com/llms.txt (latest listed: v1.9.0, Oct 9, 2026)
- https://github.com/mui/base-ui/issues/2612, https://github.com/mui/base-ui/issues/2264
- https://api.github.com/repos/mui/base-ui (MIT; main branch `master`)

**React Aria / React Native ecosystem**
- https://react-aria.adobe.com/getting-started.md, https://react-aria.adobe.com/llms.txt
- https://github.com/GeekyAnts/react-native-aria (archived; README "DEPRECATED")
- https://github.com/roninoss/rn-primitives (MIT; v/tag not read)
- https://github.com/founded-labs/react-native-reusables (MIT; latest release listed: `rn-primitives@1.4.0`, 2026-03-28)
- https://github.com/adobe/react-spectrum/pull/10550, https://github.com/adobe/react-spectrum/issues/10512
