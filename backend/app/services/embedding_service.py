"""
Embedding Service - Vector embedding generation using sentence-transformers.

Migrated from scripts/embed.ts. Runs embedding model locally in Python
for zero-latency embedding generation (no HuggingFace API calls needed).

Interview Note: Moving from HuggingFace Inference API to local
sentence-transformers eliminates network latency and API rate limits.
The model is loaded once at startup and kept in memory.
"""

from app.core.config import get_settings
from app.core.database import get_supabase_rest_headers
import httpx
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Lazy-loaded model to avoid slow startup
_model = None


def _get_model():
    """Lazy-load the sentence-transformer model."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            settings = get_settings()
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded successfully")
        except ImportError:
            logger.warning("sentence-transformers not installed, using HuggingFace API fallback")
            _model = "api_fallback"
    return _model


class EmbeddingService:
    def __init__(self):
        self.settings = get_settings()

    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        model = _get_model()

        if model == "api_fallback":
            return self._api_fallback(text)

        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def generate_batch_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts at once."""
        model = _get_model()

        if model == "api_fallback":
            return [self._api_fallback(t) for t in texts]

        embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32)
        return embeddings.tolist()

    def _api_fallback(self, text: str) -> list[float]:
        """Fallback to HuggingFace API if local model isn't available."""
        import requests
        response = requests.post(
            f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.settings.EMBEDDING_MODEL}",
            headers={"Authorization": f"Bearer {self.settings.HUGGINGFACE_API_KEY}"},
            json={"inputs": text},
        )
        if response.status_code == 200:
            result = response.json()
            return result[0] if isinstance(result[0], list) else result
        return [0.0] * self.settings.EMBEDDING_DIMENSION

    async def embed_unembedded_jobs(self) -> int:
        """Find jobs without embeddings and generate them."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/jobs"
            f"?embedding=is.null&is_active=is.true&limit=50"
            f"&select=id,title,description,skills_required"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                return 0
            jobs = response.json()

        if not jobs:
            logger.info("No unembedded jobs found")
            return 0

        count = 0
        for job in jobs:
            text = f"{job['title']}. {job.get('description', '')} {' '.join(job.get('skills_required', []))}"
            embedding = self.generate_embedding(text)

            update_url = f"{self.settings.SUPABASE_URL}/rest/v1/jobs?id=eq.{job['id']}"
            async with httpx.AsyncClient() as client:
                resp = await client.patch(update_url, json={"embedding": embedding}, headers=headers)
                if resp.status_code in (200, 204):
                    count += 1
                    logger.info(f"Embedded job {job['id']}: {job['title']}")

        return count
