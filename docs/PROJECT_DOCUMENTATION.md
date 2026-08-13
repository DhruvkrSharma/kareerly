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

Kareerly uses the Next.js App Router. The frontend calls `/api/*` paths that are rewritten to the FastAPI backend (`FASTAPI_URL`, default `http://127.0.0.1:8000`). FastAPI validates Supabase JWTs, applies rate limiting, and reads/writes Supabase data.

Core data-backed flows:

- `/api/feed` → `GET /jobs/feed`: personalized recommendations via `get_feed` RPC with active-job fallback.
- `/api/swipe` → `POST /jobs/swipe`: records swipe events and updates recommendations.
- `/api/saved` → `GET /jobs/bookmarks`: saved/applied jobs for Saved and Kanban views.
- `/api/pipeline-stage` → `POST /jobs/pipeline-stage`: persists Kanban pipeline stages.
- `/api/resume/tailor` → `POST /resume/tailor`: Groq-generated resume tailoring with Postgres cache.

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

- Profile edits are stored in Supabase (`profiles` table); the profile page also caches locally for offline viewing.
- Kanban pipeline stages are stored in Supabase (`recommendations.pipeline_stage` via `007_pipeline_stage.sql`).
- Generated resume markdown is cached client-side by job ID and server-side in `tailored_resumes`.
- Saved and Kanban pages show demo cards only when `NEXT_PUBLIC_DEMO_MODE=true`.

## AI And Job Pipeline

Operational scripts are intended to be run manually or in automation:

- `npm run seed`: inserts demo companies, jobs, and recommendations.
- `npm run scrape`: uses Playwright to collect job pages and Groq to parse postings.
- `npm run embed`: uses Hugging Face `sentence-transformers/all-MiniLM-L6-v2` to populate job embeddings.
- `npm run score`: uses Groq to score jobs for `SEED_USER_ID`.

The `002_pgvector_setup.sql` migration adds `vector(384)` columns and indexes for jobs/profiles and creates a `match_jobs` RPC.

## Rate Limiting

FastAPI calls the Postgres `check_rate_limit()` RPC directly from `backend/app/core/dependencies.py`.

Current behavior:

- Missing rate-limit RPC failures fail **open** in development/test.
- Production/staging environments fail **closed** with HTTP 503 when the rate-limit check is unavailable.

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

There is one Cloudflare Worker gateway in `cloudflare/` (pass-through proxy with webhook auth; **does not cache** personalized `/api/feed` responses).

## Required Environment Variables

Common app variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FASTAPI_URL` (Next.js rewrite target for `/api/*`, e.g. Railway backend URL in production)
- `NEXT_PUBLIC_DEMO_MODE` (set `true` to show demo job cards when DB is empty)

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
