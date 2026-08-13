import os
import json
from groq import Groq

# Reuse the existing prompt or a focused one
JUDGE_PROMPT = """
You are an expert tech recruiter grading the relevance of a job posting for a candidate.
You must return a single integer score between 0 and 3 based on these rules:

0 = Irrelevant. The skills, role type, or location do not match at all, or experience levels are wildly misaligned (e.g., Intern applying to Senior role).
1 = Weak Match. Some skills match, but the role title or location is slightly off, or experience is barely a match.
2 = Good Match. Core skills, role, and location match. Candidate is a strong fit.
3 = Perfect Match. Exact skills, location, and seniority match precisely.

Candidate Profile:
{profile}

Job Posting:
{job}

Respond ONLY with the integer (0, 1, 2, or 3). Do not include any other text.
"""

def evaluate_relevance_llm(profile: dict, job: dict) -> int:
    """Uses Groq to score the relevance of a job for a given profile."""
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    # Format the profile and job cleanly
    profile_str = json.dumps({
        "skills": profile.get("skills"),
        "preferred_roles": profile.get("preferred_roles"),
        "preferred_locations": profile.get("preferred_locations"),
        "experience_years": profile.get("experience_years")
    }, indent=2)
    
    job_str = json.dumps({
        "title": job.get("title"),
        "location": job.get("location"),
        "remote_ok": job.get("remote_ok"),
        "skills_required": job.get("skills_required"),
        "experience_min": job.get("experience_min"),
        "description": job.get("description", "")[:500] # truncate to save context
    }, indent=2)
    
    prompt = JUDGE_PROMPT.format(profile=profile_str, job=job_str)
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=10
    )
    
    content = response.choices[0].message.content.strip()
    try:
        # Extract the integer
        score = int(''.join(filter(str.isdigit, content)))
        return min(max(score, 0), 3) # clamp between 0 and 3
    except ValueError:
        return 0 # Default to 0 if parsing fails

def compute_agreement(human_labels: list[int], llm_scores: list[int]) -> float:
    """
    Computes agreement percentage between human binary labels (0, 1) and LLM scores (0-3).
    We binarize LLM scores: 0-1 -> 0 (Irrelevant), 2-3 -> 1 (Relevant).
    """
    if not human_labels or len(human_labels) != len(llm_scores):
        return 0.0
        
    matches = 0
    for human, llm in zip(human_labels, llm_scores):
        llm_binary = 1 if llm >= 2 else 0
        if human == llm_binary:
            matches += 1
            
    return (matches / len(human_labels)) * 100
