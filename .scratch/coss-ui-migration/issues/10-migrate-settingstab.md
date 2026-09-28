Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/tabs/SettingsTab.tsx` (+ `SettingsTab.css`)'s controls onto their closest-fitting Coss form primitives (inputs/selects/toggles as applicable). Update `SettingsTab.test.tsx`. Delete the hand-rolled CSS once done.

## Answer

Landed on `feat/coss-ui-migration`. No text inputs/selects/toggles here (sleep is a one-shot action, not a stateful control) — sections now use Coss `Card`/`CardHeader`/`CardTitle`/`CardContent` and the sleep action uses Coss `Button` (`variant="secondary"`). `SettingsTab.css` deleted. Existing `SettingsTab.test.tsx` (testid-based, no hand-rolled class assertions) passed unchanged — no rewrite needed. Verified: build clean, 5/5 tests passing, browser screenshot confirms both Card sections render correctly.
