Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/components/RelayRow.tsx` (+ CSS) onto the closest-fitting Coss primitive (likely a switch/row combination). Update `RelayRow.test.tsx`. Delete the hand-rolled CSS once done.

## Answer

Landed on `feat/coss-ui-migration`. Row + Coss `Switch` primitive (`src/components/ui/switch.tsx`), rendered `checked`+`readOnly` since relay has no command topic in v0 (display-only, matches the original's "no tap-to-toggle" comment). `RelayRow.css` deleted; row layout is Tailwind (`bg-card` — Coss's `--card` token, mapped to kiosk `--panel` in `.dark` per ticket 05). `RelayRow.test.tsx` rewritten against `role="switch"`/`aria-checked`/`aria-readonly` instead of the old hand-rolled `role="status"` indicator. Verified: build clean, 3/3 tests passing.
