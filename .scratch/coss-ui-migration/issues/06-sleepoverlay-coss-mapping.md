Type: grilling
Status: open
Blocked by: 04, 05

## Question

`SleepOverlay` (kiosk display sleep/wake overlay) has interactive show/hide behavior, unlike `RadialGauge`. Does it map onto a Coss/Base UI primitive (`Dialog`, or a bare `Popover`/portal), or does its kiosk-specific behavior (wake on touch, timeout-driven) make it a poor fit, staying bespoke like `RadialGauge`? Per the map's Notes, resolving this ticket includes landing whichever implementation is chosen on `feat/coss-ui-migration`.
