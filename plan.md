# Scorecard Performance Improvement Plan

## Objective
Deliver the scorecard detail payload in a single Supabase call so the page renders faster and avoids multiple network round trips.

## Steps
1. **Design Supabase Aggregation**
   - Create a Postgres view or RPC (e.g., `scorecard_aggregate(id uuid)`) that returns scorecard metadata, metrics with recent entries, owner profiles, and eligible employees in one structured JSON result.
   - Ensure the RPC respects team vs. personal scorecards and only returns active metrics/entries.

2. **Implement Loader Integration**
   - Update `lib/loaders/scorecard.ts` to call the new endpoint; remove the existing multi-query logic once parity is validated.
   - Adjust TypeScript types (`lib/types/scorecards.ts`) to match the RPC payload and streamline map transformations.

3. **Validate & Measure**
   - Run `npm run lint` and `npm test` to confirm no regressions.
   - Manually profile before/after (e.g., Chrome DevTools or `performance.mark`) to confirm reduced latency, targeting ≥30% faster TTFB for the scorecard page.
   - Capture follow-up notes for incremental optimizations (caching, pagination) if needed.

## Considerations
- Gate the RPC with RLS policies matching current access checks (`requireUser`, `canManageTeamMembers`).
- Ensure migration scripts or SQL files are committed if schema changes are required.
- Document the new endpoint in `AGENTS.md` once implemented.
