Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/components/Tabs.tsx` (+ `Tabs.css`) — the Tanks/Power/Switches tab bar + panel — onto Coss's Tabs primitive. Update `Tabs.test.tsx` for the new markup/behavior. Delete the hand-rolled CSS once the Coss version is in.

## Answer

Landed on `feat/coss-ui-migration`. `Tabs.tsx` now wraps Coss's `Tabs`/`TabsList`/`TabsTab`/`TabsPanel` (Base UI-backed, `src/components/ui/tabs.tsx`), controlled via `value`/`onValueChange` against the existing `activeId`/`onSelect` domain API — callers (`App.tsx`) unchanged. `Tabs.css` deleted. Existing `Tabs.test.tsx` (role/`aria-selected`-based, no class-name assertions) passed unchanged against the new implementation — no rewrite needed. Verified: build clean, full suite passing, browser screenshot confirms Van Blue active-tab styling.
