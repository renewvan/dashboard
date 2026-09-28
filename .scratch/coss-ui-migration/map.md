# Map: Coss UI Migration

## Destination

The dashboard's hand-rolled component library (plain React + per-component CSS, no styling framework) is fully replaced by **Coss UI** (`coss.com/ui`, Base UI + Tailwind CSS, installed via the shadcn CLI pointed at Coss's own registry) wherever a Coss component exists, landed on `feat/coss-ui-migration`, then merged/swapped in as `main`. Display-only bespoke pieces with no Coss equivalent (`RadialGauge`, the kiosk dark-theme mechanics) stay hand-rolled.

## Notes

- **Execution rides with each ticket** (override of Wayfinder's plan-only default): resolving a ticket means landing the actual code on `feat/coss-ui-migration`, not just recording a decision.
- Backup of pre-migration `main` lives at `backup/pre-coss-ui` (pushed to `origin`). Working branch: `feat/coss-ui-migration` (pushed to `origin`). The final ticket below merges/swaps it into `main`.
- **Registry**: Coss publishes its own shadcn-compatible registry at `coss.com` — install with `npx shadcn add <coss-registry-url>`, *not* the default shadcn/ui registry (different registry URL, same CLI).
- Coss = Base UI (DOM-only unstyled primitives) + Tailwind CSS. No gauge/meter-with-payoff primitive; Base UI's value is unstyled *interactive* behavior, so purely-display components gain nothing from wrapping it.
- Each component ticket includes rewriting that component's `*.test.tsx` — existing tests assert on hand-rolled class names/DOM that the Coss swap will change.
- Kiosk build runs on a dev machine/CI with network access (`Dockerfile`/`docker/` present); only the built static bundle ships to the kiosk device. Coss's install step is build-time only, never touches the kiosk at runtime.
- **Known gotcha**: Coss's `@coss/style` CLI preset overwrites any pre-existing `:root` custom property that shares a name with one of its own tokens (kiosk's `--muted`/`--accent` got clobbered on install, reverted — see [ticket 04](issues/04-infra-install-coss-tooling.md)). Any future re-run of the CLI on `src/index.css` must re-check for this.

## Decisions so far

- [Coss vs. plain shadcn/ui (Radix)](issues/01-coss-vs-shadcn.md): Coss (Base UI), per the original ask and Cal.com's active, React-19-native maintenance — not plain shadcn/ui's Radix registry.
- [Bespoke pieces stay bespoke](issues/02-bespoke-stays.md): `RadialGauge` (and the kiosk dark theme's CSS-var mechanics) stay hand-rolled — no interactive behavior for Base UI to add value to.
- [Coss infra installed](issues/04-infra-install-coss-tooling.md): Tailwind v4 + Base UI + 54 Coss primitives landed in `src/components/ui/`, registry confirmed pointed at `coss.com`. Fixed two upstream CLI bugs (broken `geist` font import, `:root` var clobbering) along the way. Build clean, all 33 existing tests still pass.

## Not yet specified

- Component-specific gaps where Coss turns out to have no matching primitive beyond the already-known `RadialGauge` case — surfaces per-component ticket as each is attempted, not chartable in advance.
- Whether a design-token-sync mechanism between `dashboard` and `mobile` (shared colors/spacing/type scale, not shared components) is worth building. User deferred this ("later") without picking an approach — too unspecified to ticket; revisit once there's a concrete proposal.

## Out of scope

- [Porting `mobile` (Expo/React Native) to Coss or a NativeWind equivalent](issues/03-mobile-out-of-scope.md): Base UI has no React Native renderer, so Coss's literal components can't run there. User confirmed this is deferred, not decided — no approach exists yet to ticket. If pursued, it's a separate effort in the `mobile` repo with its own map, not a resumption of this one.
