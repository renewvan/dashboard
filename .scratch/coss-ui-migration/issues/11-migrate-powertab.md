Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/tabs/PowerTab.tsx` onto Coss components wherever it currently uses plain markup for layout/cards (it already composes `RadialGauge`, which stays bespoke — don't touch it). Update `PowerTab.test.tsx`.

## Answer

Landed on `feat/coss-ui-migration`. Battery cards now use Coss `Card`/`CardContent`; the `charge_state` pill now uses Coss `Badge` (`variant="success"`) instead of the hand-rolled `.badge.badge--ok`. `RadialGauge` untouched. Removed the now-dead shared `.tab-grid`/`.power-card`/`.power-card__readout`/`.badge`/`.badge--ok`/`.empty-state` rules from `src/index.css` (no longer referenced after this + tickets 12/13). Existing `PowerTab.test.tsx` (text-content assertions, no hand-rolled class checks) passed unchanged. Verified: build clean, 4/4 tests passing.
