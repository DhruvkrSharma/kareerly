"""
AI Service - Groq LLM Client Wrapper

Interview Note: We abstract the LLM behind a service interface so the model
can be swapped (Groq → OpenAI → local Ollama) without touching business logic.
The service handles prompt formatting, retries, and JSON parsing.
"""

from groq import Groq
from app.core.config import get_settings
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.settings = get_settings()
        self.client = Groq(api_key=self.settings.GROQ_API_KEY)

    async def generate_json(self, prompt: str, system_prompt: str = None, model: str = None) -> dict:
        """
        Generate a structured JSON response from the LLM.
        Uses response_format: json_object for reliable parsing.
        """
        model = model or self.settings.GROQ_MODEL
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            messages.append({"role": "system", "content": "You are a JSON-only response bot."})

        messages.append({"role": "user", "content": prompt})

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model=model,
                temperature=0.2,
                response_format={"type": "json_object"},
            )

            content = completion.choices[0].message.content
            return json.loads(content) if content else {}
        except Exception as e:
            logger.error(f"Groq JSON generation failed: {e}")
            return {}

    async def generate_text(self, prompt: str, system_prompt: str = None, model: str = None) -> str:
        """Generate free-text response from the LLM."""
        model = model or self.settings.GROQ_RESUME_MODEL
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model=model,
                temperature=0.2,
            )

            return completion.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Groq text generation failed: {e}")
            return ""
