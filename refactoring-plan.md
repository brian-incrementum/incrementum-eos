# Refactoring Plan

## High-Priority Initiatives
- **Centralize Supabase session + user retrieval**  
  - _Why_: Every server action and protected route repeats `const supabase = await createClient()` followed by `supabase.auth.getUser()` and manual error handling (e.g., `lib/actions/metrics.ts`, `lib/actions/teams.ts`, `app/(authenticated)/scorecards/page.tsx`). This duplication makes auth handling inconsistent and error-prone.  
  - _Plan_: Add a helper such as `lib/auth/session.ts` exporting `requireUser()` that returns `{ supabase, user }`, throws on failure, and standardizes logging. Update actions/pages to use it and return typed `Result` objects instead of ad-hoc `{ error?: string }`.  
  - _Impact_: Less boilerplate, consistent auth messaging, and easier to compose follow-up refactors (permissions, caching).

- **Introduce typed data loaders for scorecards**  
  - _Why_: `app/(authenticated)/scorecards/[id]/page.tsx` mixes routing concerns, Supabase queries, and data shaping. It also mis-types `params` as a `Promise` and relies on `any` casts when combining metrics, entries, and owners.  
  - _Plan_: Move the aggregation logic into `lib/loaders/scorecard.ts` (or similar) that fetches scorecard, metrics, entries, owners, and employees in parallel via `Promise.all`. Return a well-defined `ScorecardAggregate` type to the page/component. Fix the `PageProps` signature and push employee-selection logic into the loader or dedicated helper.  
  - _Impact_: Clear separation between data and rendering, easier to test, and fewer runtime surprises when route params change.

- **Collapse N+1 Supabase queries in team actions**  
  - _Why_: `lib/actions/teams.ts` fetches member counts, scorecard counts, and members inside `Promise.all` per team, resulting in 3 extra round trips per team.  
  - _Plan_: Replace per-team loops with single batched queries (e.g., `select('*, team_members(count), scorecards(count)')`, or a view/RPC that returns counts). Ensure helper functions in `lib/auth/permissions.ts` accept an existing client to prevent additional connections during permission checks.  
  - _Impact_: Dramatically fewer network calls, better latency for `/teams`, and lower Supabase quotas.

- **Normalize scorecard listing aggregation**  
  - _Why_: `getOrganizedScorecards` in `lib/actions/scorecards.ts` performs multiple passes over scorecards, metrics, and membership IDs. The current approach builds maps manually and uses implicit `any` values.  
  - _Plan_: Query scorecards once using Supabase joins, fetch metric counts with a grouped query, and return typed arrays. Encapsulate membership-id collection in a helper that can be reused when adding new scorecard filters.  
  - _Impact_: Easier to evolve listings (e.g., filtering, pagination), less code, and stronger type coverage.

## Medium-Priority Initiatives
- **Streamline scorecard UI tabs**  
  - _Why_: `app/(authenticated)/scorecards/[id]/components/scorecard-view.tsx` repeats identical `<TabsContent>` blocks and manual filtering logic.  
  - _Plan_: Define an array of cadence configs (`[{ id: 'weekly', label: 'Weekly', currentStart: ... }, …]`) and map over it to render content. Move derived period helpers into a memoized hook.  
  - _Impact_: Reduces clone-and-edit bugs when adding new cadences and simplifies future design tweaks.

- **Rationalize employee/profile joining**  
  - _Why_: `lib/actions/employees.ts` loads employees and profiles separately, then stitches them in userland. A join with Supabase or a view could deliver the combined dataset directly.  
  - _Plan_: Create a dedicated RPC or use `select('*, profiles!inner(...)')` so the database returns `profile_id` and metadata in one query. Fall back to local merge only when the RPC is unavailable.  
  - _Impact_: Cleaner code in both employee actions and scorecard loaders, plus better performance.

- **Audit unused actions and dead imports**  
  - _Why_: `syncEmployeeProfiles` is imported in `lib/actions/employees.ts` but never invoked; similar unused hooks likely exist.  
  - _Plan_: Remove unused imports, or wire these helpers into admin flows with clear entry points. Add ESLint rule `no-unused-vars` for TypeScript (`@typescript-eslint/no-unused-vars`).  
  - _Impact_: Keeps the action layer lean and clarifies which workflows remain TODO.

## Enablement Tasks
- Add unit tests (Vitest or similar) targeting the new loader/output contracts to lock in behavior before and after refactors.
- Document the new helper modules (`requireUser`, loaders) in `AGENTS.md` so contributors apply the patterns consistently.
