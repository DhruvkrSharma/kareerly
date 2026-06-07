"""Resume Router - Resume tailoring endpoints."""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from app.core.dependencies import get_current_user, check_rate_limit
from app.core.security import AuthenticatedUser
from app.services.resume_service import ResumeService
from app.schemas.resume import ResumeTailorRequest, ResumeTailorResponse, ResumeHistoryResponse

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post("/tailor", response_model=ResumeTailorResponse)
async def tailor_resume(
    body: ResumeTailorRequest,
    user: AuthenticatedUser = Depends(check_rate_limit),
):
    """
    Generate an ATS-optimized tailored resume for a specific job.
    
    Migrated from: POST /api/resume/tailor
    """
    service = ResumeService()
    content = await service.tailor_resume(user.id, body.job_id)
    return ResumeTailorResponse(data=content)


@router.get("/history", response_model=ResumeHistoryResponse)
async def get_resume_history(user: AuthenticatedUser = Depends(get_current_user)):
    """Get all tailored resumes for the current user."""
    service = ResumeService()
    history = await service.get_history(user.id)
    return ResumeHistoryResponse(data=history)


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Get a specific tailored resume."""
    service = ResumeService()
    resume = await service.get_by_id(resume_id, user.id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/parse")
async def parse_user_resume(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(check_rate_limit),
):
    """
    Parse uploaded resume file (PDF/Text) using Groq.
    
    Returns structured JSON of the parsed career details, skills, etc.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    content = await file.read()
    service = ResumeService()
    try:
        parsed_data = await service.parse_resume(content, file.filename)
        return parsed_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal parser error: {str(e)}")

