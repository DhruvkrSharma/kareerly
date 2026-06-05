"""
Matching Service - AI-powered job-candidate scoring.

Migrated from scripts/score.ts. Uses Groq to analyze fit between
a user profile and job posting, producing structured match scores.
"""

from app.services.ai_service import AIService
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.repositories.resume_repository import ResumeRepository
from app.schemas.matching import MatchScoreResponse, ScoreFactors
import logging

logger = logging.getLogger(__name__)


class MatchingService:
    def __init__(self):
        self.ai = AIService()
        self.user_repo = UserRepository()
        self.job_repo = JobRepository()
        self.resume_repo = ResumeRepository()

    async def score_job_for_user(self, user_id: str, job_id: int) -> MatchScoreResponse:
        """Generate an AI match score for a user-job pair."""
        profile = await self.user_repo.get_profile(user_id)
        job = await self.job_repo.get_job_by_id(job_id)

        if not profile or not job:
            return MatchScoreResponse(
                score=0.5, confidence=0.1, tier=4,
                score_factors=ScoreFactors()
            )

        prompt = f"""
You are an expert tech recruiter AI. Analyze the fit between this candidate and this job.
Return ONLY a valid JSON object with the following schema:
{{
  "score": <float between 0 and 1, where 1 is perfect match>,
  "confidence": <float between 0 and 1>,
  "score_factors": {{
    "skills_overlap": <float between 0 and 1>,
    "experience_fit": <float between 0 and 1>,
    "domain_match": <float between 0 and 1>,
    "requirements_match": <float between 0 and 1>
  }},
  "tier": <integer 1 to 4, where 1 is 90%+ match, 2 is 75-89%, 3 is 50-74%, 4 is <50%>,
  "why_matched": ["reason 1", "reason 2", "reason 3"],
  "resume_gaps": ["missing skill 1", "missing skill 2"]
}}

Candidate Profile:
- Skills: {', '.join(profile.get('skills', []) or ['Unknown'])}
- Experience: {profile.get('experience_years', 0)} years
- Preferred Roles: {', '.join(profile.get('preferred_roles', []) or ['Unknown'])}

Job Description:
- Title: {job['title']}
- Skills Required: {', '.join(job.get('skills_required', []) or ['Unknown'])}
- Experience Required: {job.get('experience_min', 'N/A')} to {job.get('experience_max', 'N/A')} years
- Requirements: {', '.join(job.get('requirements', []) or ['Unknown'])}
- Full Description: {(job.get('description') or 'Unknown')[:1500]}
"""

        result = await self.ai.generate_json(prompt)

        return MatchScoreResponse(
            score=result.get("score", 0.5),
            confidence=result.get("confidence", 0.3),
            tier=result.get("tier", 3),
            score_factors=ScoreFactors(
                skills_overlap=result.get("score_factors", {}).get("skills_overlap", 0),
                experience_fit=result.get("score_factors", {}).get("experience_fit", 0),
                domain_match=result.get("score_factors", {}).get("domain_match", 0),
                requirements_match=result.get("score_factors", {}).get("requirements_match", 0),
                why_matched=result.get("why_matched", []),
                resume_gaps=result.get("resume_gaps", []),
            ),
        )

    async def score_and_store(self, user_id: str, job_id: int, rank: int = 100):
        """Score a job and insert as recommendation."""
        score_result = await self.score_job_for_user(user_id, job_id)

        rec = {
            "user_id": user_id,
            "job_id": job_id,
            "score": score_result.score,
            "confidence": score_result.confidence,
            "scoring_version": "groq-llama3",
            "score_factors": {
                "skills_overlap": score_result.score_factors.skills_overlap,
                "experience_fit": score_result.score_factors.experience_fit,
                "domain_match": score_result.score_factors.domain_match,
                "requirements_match": score_result.score_factors.requirements_match,
                "why_matched": score_result.score_factors.why_matched,
                "resume_gaps": score_result.score_factors.resume_gaps,
            },
            "tier": score_result.tier,
            "feed_rank": rank,
            "status": "active",
        }

        await self.resume_repo.insert_recommendation(rec)
        return score_result
