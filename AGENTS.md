# Repository Guidelines

## Project Structure & Module Organization
- `app/` uses the App Router; route groups like `app/(authenticated)` gate private dashboards while `app/login` stays public. Colocate server actions, loading states, and metadata with the owning route folder.
- Shared UI lives in `components/ui`, layout scaffolding in `components/layout`, hooks in `hooks/`, and Supabase helpers/types under `lib/`. Loader modules (e.g., `lib/loaders/scorecard.ts`) centralize multi-query aggregation, and `lib/auth/session.ts` exposes `requireUser()` / `getUser()` for consistent auth access.
- Use `examples/` for prototypes, `public/` for static assets, and keep auth redirects centralized in `middleware.ts`.

## Build, Test, and Development Commands
- `npm install` syncs dependencies (Node 18+ recommended for Next 16).
- `npm run dev` starts the local server on `http://localhost:3000`.
- `npm run build` compiles the production bundle; run it before handing off or deploying.
- `npm run start` serves the `.next` build for staging smoke tests.
- `npm test` runs Vitest suites; keep coverage focused on loaders and auth helpers.
- `npm run lint` runs the project ESLint config and must pass before review.

## Coding Style & Naming Conventions
- Keep two-space indentation and TypeScript components in `PascalCase`; name hooks `useCamelCase` and utilities `kebab-case`.
- Resolve modules with the `@/` alias; prefer server components, adding `'use client'` only for browser state or Supabase client usage. When calling loaders or permission helpers, reuse the existing Supabase client instead of creating new ones.
- Tailwind CSS v4 powers styling—group utilities logically and extract variants with `class-variance-authority` helpers in `components/ui`.

## Testing Guidelines
- Unit tests run with Vitest (`npm test`) and live under `tests/`; mirror the loader/auth patterns when adding coverage and keep Supabase calls mocked.
- `npm run lint` must stay green, and new UI/flow work should include a quick manual pass via `npm run dev` before review.

## Commit & Pull Request Guidelines
- History currently uses short imperative messages; keep titles under 72 characters and add an optional scope prefix such as `dashboard:` when touching a single area.
- PRs should outline the problem, key changes, validation steps (commands run, browsers checked), link the related issue, and flag UI screenshots or env/migration updates for reviewers.

## Environment & Auth Notes
- Configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; keep secrets out of version control and rely on `lib/supabase/middleware` plus the `middleware.ts` matcher when securing new routes.
- Always access auth context through `requireUser()` / `getUser()` so server actions and loaders share the same Supabase client, and pass that client into permission helpers (`lib/auth/permissions.ts`) when chaining checks.
