Type: task
Status: resolved
Blocked by: 06, 07, 08, 09, 10, 11, 12, 13

## Question

Every component is on Coss, kiosk theme confirmed, `SleepOverlay` decision landed. Merge (or swap) `feat/coss-ui-migration` into `main`. `backup/pre-coss-ui` remains as the pre-migration snapshot; no further action needed on it unless a rollback is required.

## Answer

`main` had no commits `feat/coss-ui-migration` lacked (`git log feat/coss-ui-migration..main` empty) — fast-forwarded `main` to `feat/coss-ui-migration`'s tip and pushed. `backup/pre-coss-ui` (pre-migration `main` snapshot) left untouched on `origin`. All 35 tests passing, `npm run build` clean at the swapped tip.
