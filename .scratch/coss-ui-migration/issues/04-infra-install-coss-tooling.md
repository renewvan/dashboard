Type: task
Status: open
Blocked by: none

## Question

Install the Coss toolchain on `feat/coss-ui-migration`: Tailwind CSS, Base UI (`@base-ui-components/react` or Coss's pinned dependency), PostCSS wiring for Vite, and shadcn CLI config (`components.json`) pointed at Coss's registry (not the default shadcn/ui registry). No component swaps yet — infra only, verified by a trivial `npx shadcn add` of one Coss component that builds and renders.
