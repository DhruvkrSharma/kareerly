# Kareerly Improvement Plan

## Strategic Direction

Kareerly should evolve into an AI-native Career Intelligence Platform, not just a job board. The existing Next.js frontend should remain mostly stable while backend, AI, scraping, recommendation, automation, and deployment complexity moves into FastAPI/Python.

Primary ownership goal:

- Keep the UI working.
- Move business logic out of Next.js API routes incrementally.
- Build interview-grade backend and AI systems in Python.
- Prefer backend/AI complexity over frontend rewrites.

See also:

- [FastAPI target architecture](FASTAPI_ARCHITECTURE.md)
- [FastAPI migration roadmap](MIGRATION_ROADMAP.md)
- [Interview ownership notes](INTERVIEW_OWNERSHIP.md)

## Highest Priority

1. Fix the production build type failure.

   `npm run build` compiles but fails during TypeScript checking because `cloudflare/src/index.ts` references `ExecutionContext` without Cloudflare Worker types in the Next.js TypeScript context. Either exclude `cloudflare/` from the app `tsconfig.json`, add a separate worker `tsconfig`, or install/configure Worker types only for that package.

2. Migrate `middleware.ts` to the Next.js 16 `proxy` convention.

   The local Next.js build warns that `middleware` is deprecated. Read the relevant docs under `node_modules/next/dist/docs/` before changing this because the repo explicitly warns that this Next.js version has breaking conventions.

3. Choose one Cloudflare Worker implementation.

   `cloudflare/` and `cloudflare-worker/` both define `kareerly-api-gateway` but implement different caching/proxy behavior. Keep one, document its environment variables, and remove or archive the other.

4. Replace production mock fallbacks with explicit empty/error states.

   `/feed/saved`, `/feed/kanban`, and `/api/resume/tailor` can show mock data when data is missing or a job is not found. That is useful for demos but misleading in production and tests.

5. Tighten API request validation.

   Route handlers currently parse JSON bodies directly and validate only minimal fields. Add a small schema layer for `job_id`, `rec_id`, `action`, and `session_id`; reject invalid swipe actions and malformed IDs before writing.

## Security And Reliability

- Make rate limiting configurable by environment. Local development can remain fail-open, but staging/production should fail closed or alert loudly when the Edge Function is unavailable.
- Avoid caching authenticated feed responses at the Cloudflare layer unless the cache key safely varies by user/session. `/api/feed` returns personalized data.
- Restrict `next.config.ts` image `remotePatterns`; the current `hostname: '**'` allows images from any HTTPS host.
- Review `next` callback redirects. `/auth/callback` accepts `next` from query params; constrain redirects to internal paths.
- Add service-role warnings around `scripts/*`; those scripts can mutate production data.
- Sanitize or constrain generated markdown if richer markdown/HTML support is added later. `react-markdown` is currently safer than raw HTML, but AI output should still be treated as untrusted.

## Product And Data Model

- Persist profile edits in Supabase instead of `localStorage`.
- Persist application pipeline stages server-side instead of `localStorage`.
- Add a real document upload flow using Supabase Storage or another file store. The current upload is simulated.
- Unify score shape across APIs. Feed uses scores as `0..1`, saved jobs convert to percentages, and UI code expects both forms in different places.
- Define typed database result models instead of using `any` in route formatters and scripts.
- Add an explicit onboarding/profile-completion flow before recommendations depend on profile quality.

## Frontend Quality

- Replace raw `<img>` elements with `next/image` where appropriate, especially company logos and avatars.
- Fix React Hook dependency warnings in `discover`, `saved`, and `kanban` pages by using `useCallback` or moving fetch functions inside effects.
- Remove hard-coded personal/demo values in navigation and dashboard surfaces.
- Improve accessibility: add button labels for icon-only controls, modal focus management, Escape-to-close, and focus trapping.
- Reduce inline styles over time by promoting repeated tokens/components into reusable UI primitives.
- Revisit the global color palette and typography tokens for consistency; there is a typo in the `text-body-lg` font family.

## Testing

- Add a `test` script for unit tests so CI can run `npm test`.
- Add route-handler tests for auth failures, validation failures, rate-limit failures, and successful writes.
- Add tests for score formatting and saved job mapping.
- Add E2E coverage for empty states without mock fallbacks once mock/demo behavior is gated.
- Keep Playwright reports and test results out of source control/artifact scans.

## Operations And Repository Hygiene

- Add `playwright-report/`, `test-results/`, and `debug-output.html` to `.gitignore` unless they are intentionally committed artifacts.
- Consider moving SQL migrations into a `supabase/migrations/` directory with timestamped filenames.
- Replace repeated handwritten `.env.local` parsing in scripts with a shared helper or a standard dotenv loader.
- Add a documented order for data jobs: migrations, seed/scrape, embed, score, then app verification.
- Add CI steps for lint, unit tests, build, and optionally Playwright.

## Suggested First Fix Sequence

1. Exclude or separately type-check Cloudflare Worker code so `npm run build` passes.
2. Migrate `middleware.ts` to `proxy`.
3. Remove one Cloudflare Worker folder.
4. Gate demo/mock fallbacks behind an explicit development flag.
5. Add request schemas for API routes.
6. Persist profile and Kanban data in Supabase.
