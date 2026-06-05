"""Tests for Pydantic schemas validation."""

import pytest
from app.schemas.job import FeedCard, SwipeRequest, SavedJob, FeedResponse
from app.schemas.resume import ResumeTailorRequest
from app.schemas.matching import MatchScoreResponse, ScoreFactors
from app.schemas.interview import InterviewQuestion, QuestionType
from pydantic import ValidationError


class TestFeedCardSchema:
    def test_valid_feed_card(self):
        card = FeedCard(
            job_id=1,
            title="Senior Engineer",
            company_name="CRED",
            score=0.85,
            tier=1,
        )
        assert card.job_id == 1
        assert card.title == "Senior Engineer"
        assert card.tier == 1

    def test_defaults(self):
        card = FeedCard(job_id=1, title="Test")
        assert card.rec_id == 0
        assert card.company_name == "Company"
        assert card.score == 0.5
        assert card.tier == 3
        assert card.remote_ok is False

    def test_tier_validation(self):
        with pytest.raises(ValidationError):
            FeedCard(job_id=1, title="Test", tier=0)
        with pytest.raises(ValidationError):
            FeedCard(job_id=1, title="Test", tier=5)


class TestSwipeRequestSchema:
    def test_valid_swipe(self):
        swipe = SwipeRequest(job_id=101, action="save")
        assert swipe.action == "save"

    def test_invalid_action(self):
        with pytest.raises(ValidationError):
            SwipeRequest(job_id=101, action="invalid")

    def test_all_valid_actions(self):
        for action in ["apply", "save", "reject"]:
            swipe = SwipeRequest(job_id=1, action=action)
            assert swipe.action == action


class TestMatchScoreSchema:
    def test_valid_score(self):
        score = MatchScoreResponse(
            score=0.8, confidence=0.9, tier=1,
            score_factors=ScoreFactors(skills_overlap=0.9, experience_fit=0.7),
        )
        assert score.score == 0.8

    def test_score_bounds(self):
        with pytest.raises(ValidationError):
            MatchScoreResponse(
                score=1.5, confidence=0.5, tier=1,
                score_factors=ScoreFactors(),
            )


class TestInterviewSchema:
    def test_question_types(self):
        q = InterviewQuestion(
            type=QuestionType.TECHNICAL,
            question="What is a closure?",
            expected_answer="A closure is...",
        )
        assert q.type == QuestionType.TECHNICAL
        assert q.difficulty == "medium"


class TestResumeSchema:
    def test_tailor_request(self):
        req = ResumeTailorRequest(job_id=42)
        assert req.job_id == 42
