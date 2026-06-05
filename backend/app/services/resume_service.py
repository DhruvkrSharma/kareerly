"""
Resume Service - AI-powered resume tailoring.

Migrated from app/api/resume/tailor/route.ts. Generates ATS-optimized
resume sections tailored to specific job postings.
"""

from app.services.ai_service import AIService
from app.repositories.resume_repository import ResumeRepository
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
import logging

logger = logging.getLogger(__name__)

MOCK_RESUME = """**ATS Match Analysis:** The candidate is a strong match (85%) with experience in React and Node.js. Missing explicit experience with GraphQL.

**Professional Summary:** Full-stack engineer with 2+ years of experience building scalable web applications. Proven ability to deliver high-quality software in fast-paced environments.

**Tailored Experience:**
* **Engineered** scalable RESTful APIs using Node.js and Express, improving response times by 30%.
* **Developed** responsive and interactive user interfaces using React and Next.js, increasing user engagement by 25%.
* **Collaborated** effectively with cross-functional teams to deliver complex software projects on time and within budget.
"""


class ResumeService:
    def __init__(self):
        self.ai = AIService()
        self.resume_repo = ResumeRepository()
        self.user_repo = UserRepository()
        self.job_repo = JobRepository()

    async def tailor_resume(self, user_id: str, job_id: int) -> str:
        """Generate a tailored resume for a specific job posting."""

        # Check cache first
        cached = await self.resume_repo.get_cached_resume(user_id, job_id)
        if cached:
            logger.info(f"Resume cache HIT for user={user_id}, job={job_id}")
            return cached

        # Fetch profile and job
        profile = await self.user_repo.get_profile(user_id)
        job = await self.job_repo.get_job_by_id(job_id)

        if not profile:
            return MOCK_RESUME

        if not job:
            # Mock response for Kanban mock cards
            return MOCK_RESUME

        # Generate with AI
        prompt = f"""
You are an expert technical resume writer and ATS Analyzer. Your task is to tailor a candidate's resume specifically for a target job.

Candidate Profile:
- Full Name: {profile.get('full_name', 'Candidate')}
- Skills: {', '.join(profile.get('skills', []) or ['N/A'])}
- Experience: {profile.get('experience_years', 0)} years
- Preferred Roles: {', '.join(profile.get('preferred_roles', []) or ['N/A'])}

Target Job:
- Title: {job['title']}
- Company: {job.get('companies', {}).get('name', 'Company') if isinstance(job.get('companies'), dict) else 'Company'}
- Skills Required: {', '.join(job.get('skills_required', []) or ['N/A'])}
- Requirements: {', '.join(job.get('requirements', []) or ['N/A'])}
- Description: {job.get('description', 'N/A')}

Write a tailored resume section in professional Markdown format. It must include:
1. **ATS Match Analysis:** A brief 1-2 sentence analysis of how well the candidate matches the job, highlighting matching skills.
2. **Professional Summary:** A strong, 2-sentence summary highlighting their fit for the target job.
3. **Tailored Experience:** 3-4 impactful bullet points (using the STAR method) that connect the candidate's existing skills specifically to the job requirements.
4. **Suggested Additions:** Suggest 1-2 skills or experiences to add to the resume to address any gaps identified in the requirements.

Keep it highly actionable and optimized for ATS systems. Do not include contact info.
"""

        system = "You are an expert technical resume writer. Output ONLY markdown text without any introductory conversational text."
        content = await self.ai.generate_text(prompt, system_prompt=system)

        if not content:
            content = MOCK_RESUME

        # Cache result
        await self.resume_repo.upsert_resume(user_id, job_id, content)

        return content

    async def get_history(self, user_id: str) -> list[dict]:
        """Get all tailored resumes for a user."""
        return await self.resume_repo.get_resume_history(user_id)

    async def get_by_id(self, resume_id: str, user_id: str):
        """Get a specific tailored resume."""
        return await self.resume_repo.get_resume_by_id(resume_id, user_id)
