# Kareerly

Kareerly is an AI-assisted career discovery app for Indian tech roles. It combines a swipe-based job feed, saved applications, a lightweight application pipeline, company profiles, and AI-generated resume tailoring.

## Tech Stack

- Next.js 16 App Router with React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, RPC, and Edge Functions
- Groq for resume tailoring and scoring
- Hugging Face embeddings with pgvector
- Playwright and Vitest
- Optional Cloudflare Worker gateway

> Important: this repository uses a newer Next.js release with local docs in `node_modules/next/dist/docs/`. Read the relevant local guide before changing routing, middleware/proxy, or build behavior.

## Project Docs

- [Project documentation](docs/PROJECT_DOCUMENTATION.md)
- [Improvement plan](docs/IMPROVEMENT_PLAN.md)
- [FastAPI target architecture](docs/FASTAPI_ARCHITECTURE.md)
- [FastAPI migration roadmap](docs/MIGRATION_ROADMAP.md)
- [Interview ownership notes](docs/INTERVIEW_OWNERSHIP.md)

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local` with the services you need:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
HUGGINGFACE_API_KEY=
SEED_USER_ID=
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev      # start Next.js dev server
npm run build    # production build and type check
npm run start    # start production server
npm run lint     # ESLint
npm run seed     # seed Supabase demo data
npm run scrape   # scrape career pages and parse jobs with Groq
npm run embed    # generate job embeddings
npm run score    # generate recommendations for a seed user
```

Run unit tests directly:

```bash
npx vitest run tests/unit/ratelimit.test.ts
```

Run E2E tests after building:

```bash
npm run build
npx playwright test
```

## Current Health Check

As of the latest scan:

- `npm run lint` passes with 7 warnings.
- `npx vitest run tests/unit/ratelimit.test.ts` passes.
- `npm run build` compiles, then fails type checking because `cloudflare/src/index.ts` references Cloudflare Worker types that are included in the Next.js TypeScript build.
- Next.js warns that the `middleware.ts` convention is deprecated in favor of `proxy`.

See [Improvement plan](docs/IMPROVEMENT_PLAN.md) for prioritized fixes.
