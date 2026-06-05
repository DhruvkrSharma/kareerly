# Interview Ownership Notes

## Project Narrative

Kareerly started as an AI-assisted Next.js career app. The engineering upgrade is to preserve the working frontend and re-architect the backend into a FastAPI-powered AI platform with Supabase, vector search, LLM workflows, scraping automation, recommendation systems, and production deployment.

Best one-line explanation:

> I kept the UI stable and moved the hard engineering into Python: authentication boundaries, job ingestion, embeddings, recommendations, LLM services, background workers, and deployment.

## What You Should Own Deeply

### FastAPI Backend

What it does:

- Provides production APIs for auth context, jobs, resumes, matching, recommendations, scraping, analytics, and interview prep.

Why it exists:

- Moves business logic out of Next.js and into your strongest stack.

Architecture:

- Routers receive requests.
- Schemas validate data.
- Services implement business logic.
- Repositories access Postgres.
- Workers run long jobs.

Alternatives considered:

- Keep Next.js API routes: faster short-term, weaker for your interview goals.
- Supabase Edge Functions only: lightweight, but less suitable for AI orchestration and Python ML.

Scalability concerns:

- Use async I/O.
- Move scraping and embeddings into workers.
- Cache expensive AI outputs.

Security concerns:

- Validate Supabase JWTs.
- Never expose service-role keys.
- Rate-limit AI endpoints.

Interviewer questions:

- Why FastAPI instead of Next API routes?
- How do you structure services and repositories?
- How do you test API endpoints?

### Recommendation System

What it does:

- Converts user profile, resume, job text, and user actions into personalized ranked job feeds.

Why it exists:

- This turns Kareerly from a job board into an AI Career Intelligence Platform.

Architecture:

- Generate job embeddings.
- Generate user/profile embeddings.
- Retrieve candidates with pgvector.
- Rerank using similarity, skills, experience, user actions, freshness, and diversity.
- Store recommendations and feedback signals.

Alternatives considered:

- Pure SQL scoring: explainable but less semantic.
- LLM-only scoring: expensive and harder to scale.
- pgvector-only ranking: simple but misses behavior and business rules.

Scalability concerns:

- Embeddings should be generated asynchronously.
- Vector indexes need monitoring.
- Reranking should operate on a limited candidate set.

Security concerns:

- Do not leak other users' action data.
- Keep recommendation generation scoped to authenticated users.

Interviewer questions:

- How do you handle cold start?
- Why pgvector and FAISS?
- How do you evaluate recommendation quality?
- How do swipes improve ranking?

### Scraping Infrastructure

What it does:

- Collects job postings from company career pages, parses them, deduplicates them, and stores them.

Why it exists:

- Fresh job data is the fuel for recommendations.

Architecture:

- Pipedream triggers FastAPI.
- FastAPI creates a scraper run.
- Worker uses Browserless/Playwright.
- Groq parses unstructured job text.
- Database stores jobs with content hashes.
- Embedding worker processes new jobs.

Alternatives considered:

- Manual scripts: easy but not production.
- Third-party job APIs: cleaner but less impressive and less controllable.

Scalability concerns:

- Browser scraping is slow and failure-prone.
- Needs retries, rate limits, and per-company adapters.
- Queue long-running jobs.

Security concerns:

- Validate webhook secrets.
- Avoid SSRF through arbitrary URLs.
- Store logs without secrets.

Interviewer questions:

- How do you handle dynamic websites?
- How do you deduplicate jobs?
- What do you do when extraction fails?

### Resume Service

What it does:

- Tailors a user's resume to a target job and stores generated versions.

Why it exists:

- It is a practical LLM feature tied directly to user outcomes.

Architecture:

- Fetch profile/resume and job.
- Build prompt from versioned template.
- Call Groq.
- Store markdown result and metadata.
- Return structured response.

Alternatives considered:

- Generate only on client: insecure and not persistent.
- Store only latest version: simpler but loses history.

Scalability concerns:

- Cache repeated generations.
- Rate-limit expensive LLM calls.
- Run long PDF generation asynchronously.

Security concerns:

- Treat AI output as untrusted.
- Protect private resume/profile data.

Interviewer questions:

- How do you manage prompt versions?
- How do you evaluate generated resume quality?
- How do you prevent prompt injection?

### Interview Copilot

What it does:

- Turns a job description and user profile into personalized interview preparation.

Why it exists:

- It extends the platform from discovery to preparation, making it a career intelligence product.

Architecture:

- Analyze job requirements.
- Map requirements to user strengths/gaps.
- Generate question sets.
- Store sessions and feedback.
- Track progress over time.

Alternatives considered:

- Generic question generator: easier but less personalized.
- External interview prep links: less differentiated.

Scalability concerns:

- Store generated sessions to avoid repeated calls.
- Use templates per role type.
- Batch feedback analysis where possible.

Security concerns:

- Keep user profile and resume private.
- Avoid exposing generated content across users.

Interviewer questions:

- How is this different from asking ChatGPT directly?
- How do you personalize questions?
- How do you measure improvement?

### Cloudflare And Deployment

What it does:

- Routes traffic, validates edge webhooks, adds security headers, and may cache safe anonymous responses.

Why it exists:

- Gives a production edge story without making the frontend more complex.

Architecture:

- Browser hits Cloudflare.
- Cloudflare routes UI traffic to Vercel.
- Cloudflare routes API traffic to FastAPI.
- FastAPI talks to Supabase and AI services.

Alternatives considered:

- Direct Vercel/Railway only: simpler but less production-grade.
- Put all logic at edge: poor fit for Python AI workloads.

Scalability concerns:

- Avoid caching personalized responses unless safely keyed.
- Keep expensive AI work off the edge.

Security concerns:

- Validate scraper webhooks.
- Add security headers.
- Avoid token leakage in logs.

Interviewer questions:

- What should be cached at the edge?
- How do you route frontend and backend?
- How do you secure webhooks?

## Components To Avoid Overclaiming

- Advanced Next.js SSR/ISR internals.
- Deep App Router mechanics.
- Complex frontend animation architecture.
- Cloudflare Worker internals beyond routing/security/caching.

Phrase it honestly:

> The frontend was already working. I intentionally kept it stable and focused my engineering effort on backend services, AI pipelines, recommendation systems, and production reliability.

## Interview Red Flags To Fix Before Presenting

- Build failure from Cloudflare Worker types.
- Mock fallback jobs appearing in production flows.
- localStorage-only profile and Kanban persistence.
- Manual scraper/embedding/scoring scripts.
- Recommendation system without measurable ranking logic.
- No backend tests around auth and data writes.

## Final Interview Story Arc

1. A working career app existed.
2. I identified that the real product value was AI career intelligence, not frontend complexity.
3. I preserved the UI and moved business logic into FastAPI.
4. I built data ingestion through scraping.
5. I generated embeddings and recommendations.
6. I added LLM resume and interview services.
7. I automated the pipeline.
8. I deployed it with clear frontend/backend/database/edge separation.
