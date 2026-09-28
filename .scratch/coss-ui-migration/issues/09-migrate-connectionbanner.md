Type: task
Status: resolved
Blocked by: 04, 05

## Question

Migrate `src/components/ConnectionBanner.tsx` (+ CSS) onto Coss's Alert/Banner primitive. Update `ConnectionBanner.test.tsx`. Delete the hand-rolled CSS once done.

## Answer

Landed on `feat/coss-ui-migration`. Wraps Coss `Alert`/`AlertDescription` (`src/components/ui/alert.tsx`), mapping `connected`→`success`, `connecting`→`warning`, `disconnected`→`error` variants — a stronger, more distinguishable signal than the old text-color-only treatment (satisfies the original "distinguishable from legitimate last-known-state values" requirement more directly). `ConnectionBanner.css` deleted. `ConnectionBanner.test.tsx` rewritten to assert against `role="alert"` instead of the old `data-testid` text match, plus a new test asserting distinct content across all three statuses. Verified: build clean, 3/3 tests passing.
