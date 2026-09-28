Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/tabs/TanksTab.tsx` onto Coss components wherever it currently uses plain markup for layout/cards (it already composes `RadialGauge`, which stays bespoke — don't touch it). Update `TanksTab.test.tsx`.

## Answer

Landed on `feat/coss-ui-migration`. Only plain markup here was the `.tab-grid` wrapper (no per-tank card chrome — `RadialGauge` renders the whole tile) — swapped for the equivalent Tailwind grid utility. `RadialGauge` and its `--kiosk-accent`/`--bad` status coloring untouched. Existing `TanksTab.test.tsx` (text-content assertions) passed unchanged. Verified: build clean, 4/4 tests passing.
