Type: grilling
Status: resolved

## Question

Adopt Coss (`coss.com/ui`, Base UI primitives, Cal.com's design system) or plain shadcn/ui (default registry, Radix UI primitives)? Both install via the identical `npx shadcn add <url>` CLI + Tailwind, so the tooling is the same either way; the primitive foundation differs.

## Answer

**Coss.** Reasoning: original ask named Coss (`cosscom/coss`) specifically; it's actively maintained by a funded team (Cal.com) with React-19-native primitives (Base UI), vs. Radix's older React-19 rough edges (largely settled but present historically). Trade-off acknowledged: Radix/shadcn-default has more battle-hours and community coverage; Base UI is newer. User confirmed Coss after reviewing the tradeoff table.
