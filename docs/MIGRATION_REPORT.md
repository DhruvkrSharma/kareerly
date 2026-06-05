# Kareerly: FastAPI Migration — Phase 1 Analysis Report
*Generated: 2026-06-05 | Status: ANALYSIS COMPLETE — Awaiting Approval*

---

## 1. Current Architecture Inventory

### 1.1 API Routes (Next.js — to be migrated)

| Route | Method | Auth | Rate Limited | Business Logic | Lines |
|-------|--------|------|-------------|----------------|-------|
| `/api/feed` | GET | ✅ Supabase cookie | ✅ Edge Fn | Profile auto-create, `get_feed` RPC, fallback to raw jobs query, FeedCard shaping | 103 |
| `/api/swipe` | POST | ✅ Supabase cookie | ✅ Edge Fn | Insert `swipe_events`, update `recommendations` swiped state | 51 |
| `/api/saved` | GET | ✅ Supabase cookie | ✅ Edge Fn | Join `recommendations → jobs → companies`, format for Kanban | 88 |
| `/api/resume/tailor` | POST | ✅ Supabase cookie | ✅ Edge Fn | Fetch profile + job, check cache, Groq LLM call, upsert `tailored_resumes` | 147 |
| `/auth/callback` | GET | N/A (OAuth flow) | ❌ | Exchange code for session (stays in Next.js) | 18 |

**Total business logic in API routes: ~389 lines of TypeScript**

### 1.2 Standalone Scripts (TypeScript — to be migrated to Python)

| Script | Purpose | External Deps | Lines |
|--------|---------|---------------|-------|
| `scripts/scrape.ts` | Playwright scraping → Groq parsing → Supabase upsert | Playwright, Groq, Browserless | 272 |
| `scripts/score.ts` | Groq-based profile↔job matching → recommendations table | Groq | 169 |
| `scripts/embed.ts` | HuggingFace all-MiniLM-L6-v2 → pgvector embeddings | HuggingFace Inference | 87 |
| `scripts/seed.ts` | Test data population | None | 181 |

**Total script logic: ~709 lines of TypeScript**

### 1.3 Supabase Edge Functions (Deno — to be absorbed by FastAPI)

| Function | Purpose | Lines |
|----------|---------|-------|
| `rate-limit` | Sliding-window rate limiter via Postgres RPC | ~50 |
| `decay-scores` | Cron-triggered score freshness decay | ~35 |

### 1.4 Database Schema (Supabase PostgreSQL)

```
┌──────────────────┐     ┌──────────────────┐
│    profiles       │     │    companies      │
│──────────────────│     │──────────────────│
│ id (uuid, PK)    │     │ id (bigint, PK)  │
│ email            │     │ name             │
│ full_name        │     │ slug (unique)    │
│ skills (text[])  │     │ location         │
│ preferred_roles  │     │ website          │
│ experience_years │     │ logo_url         │
│ embedding (384)  │     │ tech_stack       │
└──────────────────┘     │ remote_policy    │
                         │ employee_count   │
                         │ description      │
                         └────────┬─────────┘
                                  │ 1:N
                         ┌────────┴─────────┐
                         │      jobs         │
                         │──────────────────│
                         │ id (bigint, PK)  │
                         │ company_id (FK)  │
                         │ title            │
                         │ description      │
                         │ requirements[]   │
                         │ skills_required[]│
                         │ location         │
                         │ remote_ok        │
                         │ salary_min/max   │
                         │ experience_min/  │
                         │   max            │
                         │ job_type         │
                         │ apply_url        │
                         │ source_url       │
                         │ content_hash     │
                         │ is_active        │
                         │ scraped_at       │
                         │ embedding (384)  │
                         └────────┬─────────┘
                                  │ 1:N
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────┴────────┐ ┌───────┴────────┐ ┌────────┴────────┐
     │ recommendations │ │ swipe_events   │ │tailored_resumes │
     │────────────────│ │───────────────│ │────────────────│
     │ id             │ │ user_id       │ │ user_id        │
     │ user_id (FK)   │ │ job_id        │ │ job_id         │
     │ job_id (FK)    │ │ action        │ │ content        │
     │ score          │ │ session_id    │ │ unique(user,job)│
     │ confidence     │ │ created_at    │ └─────────────────┘
     │ score_factors  │ └───────────────┘
     │ tier           │
     │ feed_rank      │        ┌─────────────────┐
     │ swiped/action  │        │   rate_limits    │
     │ freshness_score│        │─────────────────│
     │ status         │        │ id (text, PK)   │
     │ generated_at   │        │ hits            │
     │ expires_at     │        │ reset_at        │
     └────────────────┘        └─────────────────┘
```

**Postgres Functions:**
- `get_feed(p_user_id, p_limit)` — returns ranked unswiped recommendations
- `match_jobs(query_embedding, threshold, count)` — pgvector cosine similarity
- `check_rate_limit(p_id, p_window_ms, p_max_requests)` — atomic sliding window
- `decay_recommendation_scores()` — freshness decay

### 1.5 Frontend Pages (PRESERVED — no changes)

| Page | Route | Data Source |
|------|-------|-------------|
| Landing | `/` | Static redirect |
| Login | `/auth/login` | Supabase Auth (browser client) |
| Auth Callback | `/auth/callback` | Exchange code (stays Next.js) |
| Feed Dashboard | `/feed` | Static/profile |
| Discover (Swipe) | `/feed/discover` | `GET /api/feed`, `POST /api/swipe` |
| Saved Jobs | `/feed/saved` | `GET /api/saved` |
| Kanban Board | `/feed/kanban` | `GET /api/saved`, `POST /api/resume/tailor` |
| Profile | `/feed/profile` | Supabase direct |
| Company | `/feed/company/[slug]` | Supabase direct |

### 1.6 Infrastructure

| Layer | Technology | Status |
|-------|-----------|--------|
| Edge CDN | Cloudflare Worker | ✅ Scaffolded, caches `/api/feed` |
| Rate Limiting | Supabase Edge Function → Postgres RPC | ✅ Working |
| Score Decay | Supabase Edge Function (cron) | ✅ Working |
| Embeddings | HuggingFace API (remote) | ✅ Working |
| Scraping | Playwright + Browserless CDP | ✅ Working (anti-bot issues on some sites) |
| CI/CD | GitHub Actions → Vercel | ✅ Working |

---

## 2. Current Architecture Diagram

```
                    ┌─────────────────────┐
                    │     User Browser     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Cloudflare Worker  │  ← Edge cache /api/feed
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │        Next.js (Vercel)          │
              │                                  │
              │  ┌──────────┐  ┌──────────────┐ │
              │  │ Frontend  │  │  API Routes   │ │
              │  │ (React)   │  │  /api/feed    │ │
              │  │           │  │  /api/swipe   │ │
              │  │           │  │  /api/saved   │ │
              │  │           │  │  /api/resume  │ │
              │  └──────────┘  └──────┬───────┘ │
              └───────────────────────┼─────────┘
                                      │
                 ┌────────────────────▼────────────────┐
                 │            Supabase                  │
                 │  ┌──────────┐  ┌─────────────────┐ │
                 │  │ Auth     │  │   PostgreSQL     │ │
                 │  │          │  │   + pgvector     │ │
                 │  └──────────┘  └─────────────────┘ │
                 │  ┌──────────────────────────────┐   │
                 │  │  Edge Functions               │   │
                 │  │  (rate-limit, decay-scores)   │   │
                 │  └──────────────────────────────┘   │
                 └─────────────────────────────────────┘
                               ▲
     ┌─────────────────────────┼─────────────────┐
     │     Manual Scripts (npx tsx)               │
     │  scrape.ts → score.ts → embed.ts          │
     │        │          │         │              │
     │   Playwright    Groq    HuggingFace       │
     └────────────────────────────────────────────┘
```

**Key Problems with Current Architecture:**
1. Business logic embedded in Next.js API routes — not reusable, not testable independently
2. Scripts run manually — no orchestration, no scheduling, no retries
3. AI services (Groq, HuggingFace) accessed from TypeScript — Python ecosystem far richer
4. No interview prep feature, no analytics, no admin tooling
5. Rate limiting requires a round-trip to Supabase Edge Function from within Vercel
6. Recommendation engine is a simple query — no real personalization pipeline

---

## 3. Proposed Architecture Diagram

```
                    ┌─────────────────────┐
                    │     User Browser     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Cloudflare Worker  │  ← /api/* → FastAPI
                    │   (Edge Gateway)     │  ← /app/* → Vercel
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
  ┌───────▼───────┐    ┌──────▼──────────┐          │
  │  Next.js       │    │   FastAPI        │          │
  │  (Vercel)      │    │   (Railway)      │          │
  │                │    │                  │          │
  │  • Pages only  │    │  /auth/me        │          │
  │  • No API      │    │  /jobs/*         │          │
  │    routes*     │    │  /resume/*       │          │
  │  • Auth UI     │    │  /matching/*     │          │
  │  • Components  │    │  /recommendations│          │
  │                │    │  /interview/*    │          │
  │  *except       │    │  /scraper/*      │          │
  │   /auth/       │    │  /analytics/*    │          │
  │   callback     │    │                  │          │
  └───────────────┘    │  ┌────────────┐  │          │
                        │  │ Services   │  │          │
                        │  │ • AI       │  │          │
                        │  │ • Scraper  │  │          │
                        │  │ • Matching │  │          │
                        │  │ • Resume   │  │          │
                        │  └─────┬──────┘  │          │
                        │        │         │          │
                        │  ┌─────▼──────┐  │          │
                        │  │ Workers    │  │          │
                        │  │ APScheduler│  │          │
                        │  └─────┬──────┘  │          │
                        └────────┼─────────┘          │
                                 │                    │
                   ┌─────────────▼──────────────┐     │
                   │          Supabase           │     │
                   │  Auth + PostgreSQL + pgvec  │◄────┘
                   └────────────────────────────┘
```

---

## 4. Dependency Graph

```
Browser
  └─► Cloudflare Worker
        ├─► Next.js (Vercel) — pages, auth callback
        │     └─► Supabase Auth (cookie exchange)
        │
        └─► FastAPI (Railway) — all /api/* business logic
              │
              ├─► Supabase PostgreSQL (via supabase-py / httpx)
              │     ├── profiles
              │     ├── companies
              │     ├── jobs (+ pgvector embeddings)
              │     ├── recommendations
              │     ├── swipe_events
              │     ├── tailored_resumes
              │     └── rate_limits
              │
              ├─► Groq API (LLM)
              │     ├── Job scoring (matching service)
              │     ├── Resume tailoring (resume service)
              │     ├── Job parsing from HTML (scraper service)
              │     └── Interview question generation (interview service)
              │
              ├─► sentence-transformers (local Python model)
              │     └── BAAI/bge-small-en-v1.5 or all-MiniLM-L6-v2
              │
              ├─► Playwright + Browserless
              │     └── Career page scraping
              │
              └─► APScheduler (in-process)
                    ├── Scrape worker (every 6h)
                    ├── Embedding worker (every 1h)
                    ├── Decay worker (daily)
                    └── Recommendation refresh (every 2h)
```

---

## 5. Migration Strategy

### 5.1 Approach: Strangler Fig Pattern

The frontend continues calling its existing `/api/*` routes. We introduce FastAPI alongside, then redirect routes one-by-one using **Next.js rewrites**. The existing Next.js API routes become thin proxies to FastAPI during transition, then are removed.

### 5.2 Frontend Integration (Zero Frontend Changes)

The frontend currently calls:
- `fetch('/api/feed')` → will be proxied to `FASTAPI_URL/jobs/feed`
- `fetch('/api/swipe', { method: 'POST' })` → proxied to `FASTAPI_URL/jobs/swipe`
- `fetch('/api/saved')` → proxied to `FASTAPI_URL/jobs/bookmarks`
- `fetch('/api/resume/tailor', { method: 'POST' })` → proxied to `FASTAPI_URL/resume/tailor`

**Mechanism: Next.js rewrites in `next.config.ts`**
```ts
rewrites: async () => [
  { source: '/api/:path*', destination: 'http://fastapi:8000/:path*' }
]
```
Zero frontend file changes required.

### 5.3 Auth Token Flow

```
1. User logs in via Supabase Auth (browser-side, unchanged)
2. Browser stores Supabase JWT in cookies
3. Next.js forwards request (with cookies) via rewrite
4. FastAPI middleware extracts JWT from cookie/header
5. FastAPI validates JWT against Supabase JWKS endpoint
6. FastAPI injects authenticated user into request context
```

### 5.4 Phase Order

```
Phase 1: Analysis                          ◄── YOU ARE HERE
Phase 2: FastAPI scaffold + core infra
Phase 3: Auth layer (JWT verification)
Phase 4: Jobs service (feed, swipe, saved)
Phase 5: Resume service (tailor)
Phase 6: Recommendation engine (embeddings + vector search)
Phase 7: Interview copilot (new feature)
Phase 8: Scraper platform (config-driven)
Phase 9: AI Source Builder (new feature)
Phase 10: Background workers (APScheduler)
Phase 11: Analytics service (new feature)
Phase 12: Cloudflare routing update
Phase 13: Pipedream automation
Phase 14: Testing (80%+ coverage target)
Phase 15: Deployment (Docker, Railway, CI/CD)
```

---

## 6. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Auth token format mismatch | 🔴 High | Medium | Validate JWT against Supabase JWKS endpoint before any migration |
| Frontend fetch paths break | 🔴 High | Low | Use Next.js rewrites — zero frontend changes needed |
| Supabase RLS blocks FastAPI | 🟡 Medium | Medium | FastAPI uses service_role_key, bypasses RLS. User-scoping enforced in app code |
| Groq model deprecation | 🟡 Medium | Low | Abstract behind service interface, model name is config |
| Playwright anti-bot on career sites | 🟡 Medium | High | Already mitigated with Browserless; config-driven scraper adds retry/fallback |
| Database migration conflicts | 🟡 Medium | Low | Alembic manages migrations separately from Supabase SQL files |
| CI/CD pipeline breaks | 🟢 Low | Medium | Add FastAPI test job to existing GitHub Actions |
| Performance regression (Python vs Node) | 🟢 Low | Low | Async FastAPI with connection pooling; edge caching compensates |

---

## 7. What Gets Migrated vs. What Stays

| Component | Action | Rationale |
|-----------|--------|-----------|
| `app/api/feed/route.ts` | **MIGRATE** → FastAPI `/jobs/feed` | Core business logic |
| `app/api/swipe/route.ts` | **MIGRATE** → FastAPI `/jobs/swipe` | Core business logic |
| `app/api/saved/route.ts` | **MIGRATE** → FastAPI `/jobs/bookmarks` | Core business logic |
| `app/api/resume/tailor/route.ts` | **MIGRATE** → FastAPI `/resume/tailor` | AI service, better in Python |
| `app/auth/callback/route.ts` | **KEEP** in Next.js | OAuth code exchange needs server-side cookies |
| `scripts/scrape.ts` | **MIGRATE** → FastAPI scraper service | Python Playwright, config-driven |
| `scripts/score.ts` | **MIGRATE** → FastAPI matching service | Python-native AI |
| `scripts/embed.ts` | **MIGRATE** → FastAPI recommendation engine | sentence-transformers local |
| `scripts/seed.ts` | **MIGRATE** → FastAPI management command | Better as API endpoint |
| `supabase/functions/rate-limit` | **ABSORB** into FastAPI middleware | Eliminate Edge Function dep |
| `supabase/functions/decay-scores` | **ABSORB** into FastAPI APScheduler | Proper scheduling |
| `middleware.ts` | **KEEP** | Auth redirect logic stays in Next.js |
| `lib/supabase/*` | **KEEP** | Frontend browser client unchanged |
| `lib/ratelimit.ts` | **DELETE** after migration | Replaced by FastAPI middleware |
| `lib/types.ts` | **KEEP** | Frontend types unchanged |
| `cloudflare/src/index.ts` | **UPDATE** routing | Split traffic edge→frontend, edge→backend |
| All `app/feed/**` pages | **KEEP** | Frontend pages unchanged |
| All `components/**` | **KEEP** | UI components unchanged |
| `app/globals.css` | **KEEP** | Design system unchanged |

---

## 8. FastAPI Directory Structure (Proposed)

```
backend/
├── app/
│   ├── main.py                    # FastAPI app factory, CORS, lifespan
│   ├── core/
│   │   ├── config.py              # Pydantic Settings (env vars)
│   │   ├── database.py            # Async Supabase client
│   │   ├── security.py            # JWT validation, Supabase JWKS
│   │   └── dependencies.py        # get_current_user, get_db
│   ├── middleware/
│   │   ├── rate_limit.py          # Sliding window (replaces Edge Fn)
│   │   └── logging.py             # Request/response logging
│   ├── api/
│   │   ├── auth/
│   │   │   └── router.py          # GET /auth/me, POST /auth/validate
│   │   ├── jobs/
│   │   │   └── router.py          # GET /jobs/feed, POST /jobs/swipe, etc.
│   │   ├── resume/
│   │   │   └── router.py          # POST /resume/tailor, GET /resume/history
│   │   ├── matching/
│   │   │   └── router.py          # POST /matching/score
│   │   ├── recommendations/
│   │   │   └── router.py          # POST /recs/generate, GET /recs/user/{id}
│   │   ├── interview/
│   │   │   └── router.py          # POST /interview/generate, feedback
│   │   ├── scraper/
│   │   │   └── router.py          # POST /scraper/run, GET /scraper/status
│   │   └── analytics/
│   │       └── router.py          # GET /analytics/user, skills
│   ├── services/
│   │   ├── ai_service.py          # Groq client wrapper
│   │   ├── embedding_service.py   # sentence-transformers (local or API)
│   │   ├── scraper_service.py     # Playwright + Browserless orchestration
│   │   ├── matching_service.py    # Score computation logic
│   │   ├── resume_service.py      # Prompt management + generation
│   │   ├── interview_service.py   # Interview question generation
│   │   └── recommendation_service.py # Vector search + ranking
│   ├── repositories/
│   │   ├── job_repository.py      # Jobs CRUD
│   │   ├── user_repository.py     # Profiles CRUD
│   │   ├── recommendation_repo.py
│   │   ├── swipe_repository.py
│   │   └── resume_repository.py
│   ├── schemas/
│   │   ├── job.py                 # Pydantic models for jobs
│   │   ├── user.py                # Pydantic models for users
│   │   ├── feed.py                # FeedCard schema (mirrors lib/types.ts)
│   │   ├── resume.py
│   │   ├── matching.py
│   │   └── interview.py
│   ├── models/
│   │   └── database.py            # SQLAlchemy ORM models (optional)
│   └── workers/
│       ├── scheduler.py           # APScheduler setup
│       ├── scrape_worker.py       # Periodic scraping
│       ├── embed_worker.py        # Periodic embedding generation
│       ├── decay_worker.py        # Score freshness decay
│       └── recommendation_worker.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_jobs.py
│   ├── test_resume.py
│   ├── test_matching.py
│   ├── test_scraper.py
│   └── test_interview.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── .env.example
```

---

## 9. Interview-Ready Talking Points

### Why FastAPI over keeping Next.js API Routes?

> "Next.js API routes are tightly coupled to the Vercel serverless runtime. They're excellent for BFF patterns but become limiting for AI-heavy workloads. Python has the richest ML/AI ecosystem — sentence-transformers, FAISS, scikit-learn, and Playwright all have first-class Python support. FastAPI gives us async performance comparable to Node.js, automatic OpenAPI documentation, and Pydantic validation. Most importantly, it lets us run background workers (APScheduler) in the same process, which serverless Next.js cannot do."

### Why Strangler Fig Pattern?

> "We can't afford downtime or a big-bang rewrite. The Strangler Fig approach lets us migrate one endpoint at a time, validate it independently, and roll back instantly by removing a single Next.js rewrite rule. The frontend never knows the difference."

### Why not just use Supabase Edge Functions for everything?

> "Edge Functions are great for lightweight tasks like rate limiting, but they run in Deno with a 150ms cold start, limited CPU, and no persistent state. Our recommendation engine needs to load ML models, maintain connection pools, and run scheduled background jobs — all things that require a long-running process."

---

## 10. Approval Checklist

Before proceeding to Phase 2 (implementation), confirm:

- [ ] Architecture diagrams are acceptable
- [ ] Frontend preservation approach (Next.js rewrites) is approved
- [ ] FastAPI directory structure is approved
- [ ] Migration order (Phases 2-15) is approved
- [ ] Auth strategy (Supabase JWT → FastAPI verification) is approved
- [ ] Risk mitigations are acceptable
- [ ] Interview copilot feature scope is approved
- [ ] Config-driven scraper design is approved

**Ready to proceed to Phase 2 on your approval.**
