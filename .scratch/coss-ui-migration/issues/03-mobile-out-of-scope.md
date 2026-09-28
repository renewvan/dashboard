Type: grilling
Status: resolved

## Question

`renewvan/mobile` (separate GitHub repo, Expo/React Native, hand-rolled RN components, no NativeWind/Tailwind) will also need Coss-consistent UI at some point. Does that belong on this map?

## Answer

**Out of scope for this map.** Coss is built on Base UI, which has no React Native renderer — its literal components can't run in Expo/RN. User confirmed the mobile port is deferred ("later"), without picking an approach (token-only sync vs. a future NativeWind sibling vs. something else), so there's nothing precise to ticket. If/when an approach is chosen, it's a separate effort with its own map in the `mobile` repo, not a resumption of this one.
