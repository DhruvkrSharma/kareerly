# FastAPI Migration Roadmap

## Migration Principles

- Keep the current Next.js UI operational at every step.
- Do not remove Next.js API routes until FastAPI endpoint parity is proven.
- Preserve Supabase data and table names where possible.
- Prefer backend and AI ownership over frontend rewrites.
- Every phase should end with tests, documentation, and interview notes.

## Phase 0: Stabilize Current Repo

Purpose:

- Make the current app easier to build and reason about before adding FastAPI.

Work:

- Fix Next build type failure caused by Cloudflare Worker types.
- Decide which Cloudflare Worker folder is canonical.
- Keep generated test artifacts out of repo noise.
- Document local env variables.

Exit criteria:

- `npm run build` passes.
- `npm run lint` passes or known warnings are accepted.
- One Cloudflare worker source of truth exists.

## Phase 1: Backend Foundation

Purpose:

- Introduce FastAPI without touching frontend behavior.

Work:

- Add `backend/` skeleton.
- Add FastAPI app, health endpoint, config, logging, CORS, and error handling.
- Add pytest and HTTPX test setup.
- Add Dockerfile or local run instructions.

Exit criteria:

- `GET /health` works.
- Backend tests run.
- No Next.js functionality changes.

## Phase 2: Auth Boundary

Purpose:

- Keep Supabase Auth but let FastAPI verify user identity.

Work:

- Implement JWT verification middleware/dependency.
- Implement `GET /auth/me`.
- Add role/user context model.
- Document token flow from frontend to FastAPI.

Exit criteria:

- Authenticated FastAPI request can identify Supabase user.
- Invalid/missing tokens are rejected.
- Frontend login remains unchanged.

## Phase 3: Job Feed Parity

Purpose:

- Move the most important read path into FastAPI.

Work:

- Implement `GET /jobs/feed`.
- Match existing `/api/feed` response shape.
- Implement `GET /jobs` and `GET /jobs/{id}`.
- Add pagination and filters after parity.

Exit criteria:

- FastAPI feed returns the same fields the swipe UI expects.
- Tests cover authenticated success, unauthenticated failure, and empty feed behavior.

## Phase 4: Swipe, Save, Apply

Purpose:

- Move user action capture into FastAPI.

Work:

- Implement `POST /jobs/save`.
- Implement `DELETE /jobs/save/{id}`.
- Implement `POST /jobs/apply`.
- Preserve `swipe_events` and `recommendations` updates.

Exit criteria:

- Saved/applied jobs match existing UI behavior.
- User actions become available as recommendation signals.

## Phase 5: Resume Service

Purpose:

- Turn resume tailoring into a serious AI backend feature.

Work:

- Implement `POST /resume/tailor`.
- Add prompt templates and prompt versions.
- Persist tailored resume versions.
- Add `GET /resume/history`.
- Plan future upload/PDF support.

Exit criteria:

- Existing Kanban tailor workflow can call FastAPI.
- Generated outputs are stored with version metadata.

## Phase 6: Matching Service

Purpose:

- Make job-fit scoring explainable and structured.

Work:

- Implement `POST /matching/score`.
- Separate deterministic features from LLM explanation.
- Store score results in Supabase.
- Return score, matched reasons, missing skills, and resume gaps.

Exit criteria:

- Matching outputs are typed, testable, and interview-explainable.

## Phase 7: Recommendation Engine

Purpose:

- Upgrade from simple seeded recommendations to a real AI recommendation system.

Work:

- Generate embeddings for jobs and user profiles/resumes.
- Use pgvector for candidate retrieval.
- Add FAISS experiments for offline reranking.
- Rank using similarity, skills, actions, freshness, and diversity.
- Implement `POST /recommendations/generate`.
- Implement `GET /recommendations/user/{id}`.

Exit criteria:

- Feed can be generated from user profile and behavior.
- Recommendation quality can be explained and measured.

## Phase 8: Scraper Service

Purpose:

- Replace manual scripts with a production scraper orchestration service.

Work:

- Implement scraper endpoints.
- Integrate Browserless.
- Move extraction and Groq parsing into services.
- Add run history, statuses, errors, retry logic, and deduplication.

Exit criteria:

- Scrapes can run by API trigger.
- New jobs flow into embeddings and recommendations.

## Phase 9: Interview Copilot

Purpose:

- Add a new AI-native feature that is highly interview-relevant.

Work:

- Implement prep generation from job + profile.
- Generate technical, HR, system design, and coding questions.
- Store interview sessions.
- Add feedback endpoint.

Exit criteria:

- A user can generate and save interview prep for a target job.

## Phase 10: Automation And Deployment

Purpose:

- Make the platform autonomous and production deployable.

Work:

- Pipedream scheduled scraper workflow.
- Worker-based recommendation refresh.
- Dockerfile and deployment docs.
- Railway backend deployment.
- Vercel frontend deployment.
- Cloudflare routing to frontend and backend.

Exit criteria:

- No manual script execution is required for routine data refresh.
- Deployment flow is documented.

## Phase 11: Frontend Cutover

Purpose:

- Move frontend calls from Next API routes to FastAPI safely.

Work:

- Add frontend API client wrapper.
- Switch one route at a time.
- Keep legacy Next API routes as fallback during migration.
- Remove legacy business routes only after parity and tests.

Exit criteria:

- Next.js is primarily UI.
- FastAPI owns backend business logic.

## Suggested Order For Immediate Work

1. Stabilize build and Cloudflare folder ambiguity.
2. Add FastAPI skeleton.
3. Add auth verification.
4. Port feed read path.
5. Port save/apply action path.
6. Port resume tailoring.
7. Build recommendation engine.
