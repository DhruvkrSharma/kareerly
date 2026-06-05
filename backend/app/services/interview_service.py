"""
Interview Service - AI Interview Copilot.

NEW FEATURE: Generates interview questions and provides AI feedback
on answers, tailored to specific job postings.

Interview Note: This is the flagship new feature that demonstrates
the advantage of Python-native AI services. The question generation
uses structured prompts with Groq, and the feedback system uses
a separate evaluation prompt that scores user answers.
"""

from app.services.ai_service import AIService
from app.repositories.job_repository import JobRepository
from app.repositories.user_repository import UserRepository
from app.schemas.interview import (
    InterviewQuestion,
    InterviewGenerateResponse,
    InterviewFeedbackResponse,
    QuestionType,
)
from typing import Optional
import uuid
import logging

logger = logging.getLogger(__name__)

# In-memory session store (would use Redis in production)
_sessions: dict[str, dict] = {}


class InterviewService:
    def __init__(self):
        self.ai = AIService()
        self.job_repo = JobRepository()
        self.user_repo = UserRepository()

    async def generate_questions(
        self,
        user_id: str,
        job_id: int,
        question_types: list[QuestionType],
        num_questions: int = 5,
    ) -> InterviewGenerateResponse:
        """Generate tailored interview questions for a specific job."""
        job = await self.job_repo.get_job_by_id(job_id)
        profile = await self.user_repo.get_profile(user_id)

        job_title = job["title"] if job else "Software Engineer"
        company_name = "Company"
        if job and isinstance(job.get("companies"), dict):
            company_name = job["companies"].get("name", "Company")

        skills = ", ".join(job.get("skills_required", []) or ["General"]) if job else "General"
        requirements = ", ".join(job.get("requirements", []) or []) if job else ""

        type_list = ", ".join([t.value for t in question_types])

        prompt = f"""
Generate exactly {num_questions} interview questions for this position.

Position: {job_title}
Company: {company_name}
Required Skills: {skills}
Requirements: {requirements}

Question types to include: {type_list}

Return a JSON object with this exact schema:
{{
  "questions": [
    {{
      "type": "<one of: technical, behavioral, hr, system_design, coding>",
      "question": "<the interview question>",
      "expected_answer": "<a model answer that would score 10/10>",
      "difficulty": "<easy|medium|hard>",
      "tips": ["tip 1", "tip 2"]
    }}
  ]
}}

Make questions specific to the role and skills. Include a mix of difficulties.
For coding questions, include a small problem statement.
For system design, include a real-world scenario.
"""

        result = await self.ai.generate_json(prompt)
        questions_data = result.get("questions", [])

        questions = []
        for q in questions_data[:num_questions]:
            questions.append(InterviewQuestion(
                type=q.get("type", "technical"),
                question=q.get("question", ""),
                expected_answer=q.get("expected_answer", ""),
                difficulty=q.get("difficulty", "medium"),
                tips=q.get("tips", []),
            ))

        session_id = str(uuid.uuid4())
        _sessions[session_id] = {
            "user_id": user_id,
            "job_id": job_id,
            "job_title": job_title,
            "company_name": company_name,
            "questions": [q.model_dump() for q in questions],
        }

        return InterviewGenerateResponse(
            job_title=job_title,
            company_name=company_name,
            questions=questions,
            session_id=session_id,
        )

    async def evaluate_answer(
        self,
        session_id: str,
        question_index: int,
        user_answer: str,
    ) -> InterviewFeedbackResponse:
        """Evaluate a user's answer to an interview question."""
        session = _sessions.get(session_id)
        if not session or question_index >= len(session["questions"]):
            return InterviewFeedbackResponse(
                score=0, feedback="Session not found",
                strengths=[], improvements=[], suggested_answer="",
            )

        question_data = session["questions"][question_index]

        prompt = f"""
Evaluate this interview answer.

Question: {question_data['question']}
Expected Answer: {question_data['expected_answer']}
User's Answer: {user_answer}

Return JSON:
{{
  "score": <float 0-10>,
  "feedback": "<2-3 sentence evaluation>",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "suggested_answer": "<improved version of the user's answer>"
}}
"""

        result = await self.ai.generate_json(prompt)

        return InterviewFeedbackResponse(
            score=result.get("score", 5.0),
            feedback=result.get("feedback", ""),
            strengths=result.get("strengths", []),
            improvements=result.get("improvements", []),
            suggested_answer=result.get("suggested_answer", ""),
        )
