Type: task
Status: claimed
Blocked by: none

## Question

Install the Coss toolchain on `feat/coss-ui-migration`: Tailwind CSS, Base UI (`@base-ui-components/react` or Coss's pinned dependency), PostCSS wiring for Vite, and shadcn CLI config (`components.json`) pointed at Coss's registry (not the default shadcn/ui registry). No component swaps yet — infra only, verified by a trivial `npx shadcn add` of one Coss component that builds and renders.

## Answer

Installed via `npx shadcn@latest init @coss/style` (Tailwind v4 + `@base-ui/react` + Coss's 54-component `@coss/ui` set + design tokens + fonts), after first wiring prerequisites by hand: `@tailwindcss/vite` plugin + `@` path alias in `vite.config.ts`, `paths` in both `tsconfig.app.json` and root `tsconfig.json` (the CLI only reads the root config's `compilerOptions.paths`, not the referenced project config — omitting it makes the CLI write files to a literal `./@/` folder instead of resolving into `src/`; discovered and fixed), and `@import 'tailwindcss';` in `src/index.css`.

Two bugs in the Coss preset's own output, fixed:
- `@import "geist"` in the generated CSS fails the build (`geist` package only exports `next/font` JS entrypoints, no root CSS export) — swapped for `@fontsource-variable/geist-mono`, which `@fontsource-variable/inter` (also generated) proved is the working pattern.
- The CLI's `:root` merge overwrote the kiosk theme's existing `--muted`/`--accent` custom properties in place with Coss's own default values (same var names, last-declaration-wins) — reverted those two lines to the kiosk originals so the currently-shipped look isn't broken. The real token-level reconciliation (should kiosk `--accent`/`--muted` become distinct names, or should Coss's semantic tokens be retargeted at the kiosk palette) is [ticket 05](05-kiosk-dark-theme-mapping.md)'s job, not this one's.

Registry confirmed pointed at Coss (`components.json` → `"registries": {"@coss": "https://coss.com/ui/r/{name}.json"}`), not the default shadcn/ui registry.

Verified: `npm run build` clean, all 33 existing tests pass unchanged, throwaway smoke test rendering the installed `Button` primitive passed then deleted.
