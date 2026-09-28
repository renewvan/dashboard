Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/tabs/SwitchesTab.tsx` onto Coss components — likely a direct fit with Coss's Switch primitive given the domain name. Update `SwitchesTab.test.tsx`.

## Answer

Landed on `feat/coss-ui-migration`. `SwitchesTab` itself only had a plain `.relay-list` wrapper — swapped for Tailwind (`flex flex-col gap-2`); the actual Coss `Switch` fit lives one level down in `RelayRow` (ticket 08), which `SwitchesTab` already composed and continues to compose unchanged. Existing `SwitchesTab.test.tsx` (text-content assertions) passed unchanged. Verified: build clean, 3/3 tests passing.
