Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

`SleepOverlay` (kiosk display sleep/wake overlay) has interactive show/hide behavior, unlike `RadialGauge`. Does it map onto a Coss/Base UI primitive (`Dialog`, or a bare `Popover`/portal), or does its kiosk-specific behavior (wake on touch, timeout-driven) make it a poor fit, staying bespoke like `RadialGauge`? Per the map's Notes, resolving this ticket includes landing whichever implementation is chosen on `feat/coss-ui-migration`.

## Answer

**Stays hand-rolled**, same reasoning as `RadialGauge` (ticket 02). Base UI's `Dialog` brings focus-trap, Escape-to-close, and backdrop-click-dismiss semantics — all wrong for a kiosk overlay whose only interaction is "the *first* pointerdown anywhere wakes the display," with no keyboard/focus model at all. `Popover` implies trigger-anchored positioning, also not applicable to a fullscreen always-on-top overlay. Neither primitive's unstyled-*interactive*-behavior value transfers.

Landed: `SleepOverlay.tsx` kept its existing wake-on-pointerdown logic verbatim; only its per-component `SleepOverlay.css` was deleted and its two rules (`position: fixed; inset: 0; z-index: 9999; background: var(--bg); cursor: pointer;`) ported to Tailwind utility classes (`fixed inset-0 z-[9999] cursor-pointer bg-background`) for consistency with the rest of the migrated app — `bg-background` resolves to the same `--bg` kiosk token via `.dark`'s `--background: var(--bg)` mapping (ticket 05).

Verified: all 5 existing `SleepOverlay.test.tsx` tests pass unchanged (they assert `data-testid="sleep-overlay"` presence and `onWake` call count, not styling).
