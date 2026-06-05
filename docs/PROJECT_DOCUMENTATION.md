# Kareerly Project Documentation

## Purpose

Kareerly helps candidates discover and manage tech career opportunities. The product currently supports authentication, a recommendation feed, a swipe deck, saved jobs, an application board, company pages, profile editing, and AI resume tailoring.

## Repository Map

- `app/`: Next.js App Router pages, layouts, route handlers, and auth callback.
- `components/`: reusable UI components, currently navigation and swipe-card surfaces.
- `lib/`: shared types, Supabase clients, and rate-limit helper.
- `scripts/`: operational scripts for seeding, scraping, embedding, and scoring.
- `supabase/functions/`: Supabase Edge Functions.
- `cloudflare/` and `cloudflare-worker/`: Cloudflare Worker gateway variants.
- `tests/unit/`: Vitest unit tests.
- `tests/e2e/`: Playwright E2E tests.
- `*.sql`: database migrations/RPC setup files.

Generated or local artifacts include `node_modules/`, `.next/`, `playwright-report/`, `test-results/`, `debug-output.html`, and `tsconfig.tsbuildinfo`.

## Runtime Architecture

Kareerly uses the Next.js App Router. Route handlers under `app/api/*` validate the current Supabase user, apply rate limiting, and read/write Supabase data.

Core data-backed flows:

- `/api/feed`: creates a user profile if missing, calls the `get_feed` RPC, and falls back to active jobs if no recommendations exist.
- `/api/swipe`: records swipe events and marks recommendations as swiped.
- `/api/saved`: reads saved/applied recommendations joined to jobs and companies.
- `/api/resume/tailor`: reads profile and job data, generates markdown via Groq, and caches output in `tailored_resumes`.

Main UI routes:

- `/`: redirects authenticated users to `/feed`, otherwise `/auth/login`.
- `/auth/login`: email/password login, signup, and password reset.
- `/feed`: dashboard-style overview with mostly static/demo content.
- `/feed/discover`: swipe deck backed by `/api/feed` and `/api/swipe`.
- `/feed/saved`: saved/applied jobs backed by `/api/saved`, with mock fallback data.
- `/feed/kanban`: application pipeline backed by `/api/saved`, with local stage overrides.
- `/feed/profile`: local-storage profile editor and simulated document uploads.
- `/feed/company/[slug]`: server-rendered company profile and open jobs.

## Data And Persistence

Supabase is the primary backend:

- Auth sessions are read through `@supabase/ssr`.
- Jobs, companies, recommendations, profiles, swipe events, rate limits, and tailored resumes live in Postgres.
- SQL migrations configure pgvector, tailored resume caching, score decay, and rate-limit RPCs.

Local-only/demo persistence:

- Profile edits are stored in `localStorage` under `kareerly_profile`.
- Kanban stage overrides are stored in `localStorage` under `kareerly-kanban-stages`.
- Generated resume markdown is also cached client-side by job ID.
- Saved and Kanban pages fall back to mock jobs when the backend has no data or fails.

## AI And Job Pipeline

Operational scripts are intended to be run manually or in automation:

- `npm run seed`: inserts demo companies, jobs, and recommendations.
- `npm run scrape`: uses Playwright to collect job pages and Groq to parse postings.
- `npm run embed`: uses Hugging Face `sentence-transformers/all-MiniLM-L6-v2` to populate job embeddings.
- `npm run score`: uses Groq to score jobs for `SEED_USER_ID`.

The `002_pgvector_setup.sql` migration adds `vector(384)` columns and indexes for jobs/profiles and creates a `match_jobs` RPC.

## Rate Limiting

`lib/ratelimit.ts` calls the Supabase Edge Function at `/functions/v1/rate-limit`. The Edge Function invokes the `check_rate_limit` Postgres RPC from `005_rate_limits.sql`.

Current behavior is fail-open:

- Missing Supabase env vars disable app-side rate limiting.
- Edge Function failures allow requests by default.
- Missing Edge Function secrets allow requests.

This is convenient locally but should be revisited before production hardening.

## Authentication

`middleware.ts` redirects unauthenticated page requests to `/auth/login` and allows all `/api/*` requests to pass to their route handlers. An `e2e-bypass` cookie bypass exists for browser tests.

Next.js 16.2.6 emits a deprecation warning for the `middleware` file convention. The local Next docs and build warning say to migrate to `proxy`.

## Testing

Current test layers:

- Vitest unit coverage exists for the rate-limit helper.
- Playwright tests cover app, navigation, auth, profile, discover, Kanban, API, and scraper behavior.

Useful commands:

```bash
npm run lint
npx vitest run tests/unit/ratelimit.test.ts
npm run build
npx playwright test
```

## Deployment Notes

The app is configured for Vercel via `vercel.json` and normal Next.js deployment.

There are two Cloudflare Worker folders:

- `cloudflare/`: broader gateway/proxy with webhook auth and `/api/feed` caching.
- `cloudflare-worker/`: narrower `/api/feed` cache proxy.

Both use the same worker name, `kareerly-api-gateway`. Pick one source of truth before deploying a Worker.

## Required Environment Variables

Common app variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Privileged script/function variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `HUGGINGFACE_API_KEY`
- `SEED_USER_ID`

Cloudflare variants:

- `NEXTJS_ORIGIN`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Current Verification Snapshot

- Lint: passes with warnings.
- Unit test: `tests/unit/ratelimit.test.ts` passes.
- Build: compilation succeeds, type checking fails on Cloudflare Worker globals included in the Next TypeScript build.
