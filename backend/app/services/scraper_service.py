"""
Scraper Service - Configuration-driven career page scraping.

Migrated from scripts/scrape.ts. Uses Playwright + Browserless for
resilient scraping and Groq for AI-powered job parsing.

Interview Note: Instead of one scraper file per company, we use a
configuration-driven approach. Scraper configs are stored in the
database (or in-memory list). A generic scraper loads config dynamically,
meaning new companies can be added without code changes.
"""

from app.services.ai_service import AIService
from app.repositories.job_repository import JobRepository
from app.core.config import get_settings
import hashlib
import logging

logger = logging.getLogger(__name__)

# Default scraper targets (will eventually move to database table)
SCRAPER_TARGETS = [
    {"name": "Razorpay", "url": "https://razorpay.com/jobs/"},
    {"name": "Zepto", "url": "https://careers.zeptonow.com/"},
    {"name": "CRED", "url": "https://careers.cred.club/"},
    {"name": "Meesho", "url": "https://careers.meesho.com/"},
    {"name": "Swiggy", "url": "https://careers.swiggy.com/"},
    {"name": "BrowserStack", "url": "https://www.browserstack.com/careers"},
    {"name": "PhonePe", "url": "https://careers.phonepe.com/"},
    {"name": "Flipkart", "url": "https://www.flipkartcareers.com/"},
    {"name": "Zomato", "url": "https://www.zomato.com/careers"},
    {"name": "Paytm", "url": "https://careers.paytm.com/"},
]


def generate_content_hash(title: str, company: str, url: str) -> str:
    """SHA-256 hash for deduplication."""
    raw = f"{title}-{company}-{url}"
    return hashlib.sha256(raw.encode()).hexdigest()


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    import re
    return re.sub(r"(^-|-$)+", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))


class ScraperService:
    def __init__(self):
        self.settings = get_settings()
        self.ai = AIService()
        self.job_repo = JobRepository()

    async def _get_browser(self, pw):
        """Connect to Browserless or launch local Chromium."""
        if self.settings.BROWSERLESS_API_KEY:
            logger.info("Connecting to Browserless.io...")
            return await pw.chromium.connect_over_cdp(
                f"wss://chrome.browserless.io?token={self.settings.BROWSERLESS_API_KEY}"
            )
        else:
            logger.info("Launching local Chromium...")
            return await pw.chromium.launch(headless=True)

    async def extract_job_links(self, page, base_url: str) -> list[str]:
        """Extract potential job links from a career page."""
        try:
            await page.goto(base_url, wait_until="domcontentloaded", timeout=30000)
            links = await page.eval_on_selector_all("a", "els => els.map(a => a.href)")

            job_links = []
            for href in links:
                lower = href.lower()
                if lower.startswith("mailto:") or lower.startswith("tel:"):
                    continue
                if href == base_url or href.rstrip("/") == base_url.rstrip("/"):
                    continue
                if any(kw in lower for kw in ["/job", "/careers/", "/openings/", "gh_jid", "req", "position"]):
                    job_links.append(href)
                elif any(c.isdigit() for c in href.split("/")[-1]) and len(href.split("/")[-1]) >= 5:
                    job_links.append(href)

            unique = list(dict.fromkeys(job_links))
            return unique[: self.settings.SCRAPER_MAX_JOBS_PER_COMPANY]
        except Exception as e:
            logger.error(f"Failed to extract links from {base_url}: {e}")
            return []

    async def parse_job_with_ai(self, text: str, url: str, company_name: str) -> dict | None:
        """Use AI to extract structured job data from page text."""
        prompt = f"""You are a job parser. Extract the following details from this job posting text.
If a field is missing, use null or appropriate defaults.
Job URL: {url}
Company: {company_name}

Extract as JSON with exact keys:
- title (string)
- description (string, full summary of the job)
- requirements (array of strings)
- skills_required (array of strings, e.g., ["React", "Python"])
- location (string)
- remote_ok (boolean)
- experience_min (number or null)
- experience_max (number or null)
- job_type (string: fulltime, parttime, contract, internship)
- salary_min (number or null)
- salary_max (number or null)

Text:
{text[:6000]}"""

        result = await self.ai.generate_json(prompt)
        return result if result and result.get("title") else None

    async def run_scrape(self, targets: list[dict] = None) -> dict:
        """
        Run the full scraping pipeline.
        
        Returns summary with counts of companies and jobs processed.
        """
        targets = targets or SCRAPER_TARGETS
        companies_to_insert = []
        jobs_to_insert = []

        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await self._get_browser(p)
            context = await browser.new_context()
            page = await context.new_page()

            for target in targets:
                logger.info(f"Scraping {target['name']}...")
                slug = slugify(target["name"])

                companies_to_insert.append({
                    "name": target["name"],
                    "slug": slug,
                    "logo_url": None,
                    "website": target["url"],
                    "location": "India",
                    "description": "Tech company",
                })

                job_links = await self.extract_job_links(page, target["url"])
                logger.info(f"  Found {len(job_links)} job links")

                for link in job_links:
                    try:
                        await page.goto(link, wait_until="domcontentloaded", timeout=20000)
                        body_text = await page.evaluate("() => document.body.innerText")

                        if len(body_text) < 200:
                            continue

                        parsed = await self.parse_job_with_ai(body_text, link, target["name"])
                        if not parsed:
                            continue

                        jobs_to_insert.append({
                            "company_slug": slug,
                            "title": parsed["title"],
                            "description": parsed.get("description", ""),
                            "requirements": parsed.get("requirements", []),
                            "skills_required": parsed.get("skills_required", []),
                            "location": parsed.get("location", "India"),
                            "remote_ok": parsed.get("remote_ok", False),
                            "experience_min": parsed.get("experience_min"),
                            "experience_max": parsed.get("experience_max"),
                            "job_type": parsed.get("job_type", "fulltime"),
                            "salary_min": parsed.get("salary_min"),
                            "salary_max": parsed.get("salary_max"),
                            "apply_url": link,
                        })
                    except Exception as e:
                        logger.error(f"  Error processing {link}: {e}")

            await browser.close()

        if not jobs_to_insert:
            return {"companies": 0, "jobs": 0, "status": "no_jobs_found"}

        # Deduplicate companies
        unique_companies = list({c["slug"]: c for c in companies_to_insert}.values())
        await self.job_repo.upsert_companies(unique_companies)

        # Fetch company ID map
        all_companies = await self.job_repo.get_all_companies()
        company_map = {c["slug"]: c for c in all_companies}

        # Build job records
        from datetime import datetime
        jobs = []
        for data in jobs_to_insert:
            company = company_map.get(data["company_slug"])
            if not company:
                continue

            content_hash = generate_content_hash(data["title"], company["name"], data["apply_url"])
            jobs.append({
                "company_id": company["id"],
                "title": data["title"],
                "description": data["description"],
                "requirements": data["requirements"],
                "skills_required": data["skills_required"],
                "location": data["location"],
                "remote_ok": data["remote_ok"],
                "salary_min": data["salary_min"],
                "salary_max": data["salary_max"],
                "experience_min": data["experience_min"],
                "experience_max": data["experience_max"],
                "job_type": data["job_type"],
                "apply_url": data["apply_url"],
                "source_url": data["apply_url"],
                "content_hash": content_hash,
                "is_active": True,
                "scraped_at": datetime.utcnow().isoformat(),
            })

        # Deduplicate by content_hash
        unique_jobs = list({j["content_hash"]: j for j in jobs}.values())
        result = await self.job_repo.upsert_jobs(unique_jobs)

        return {
            "companies": len(unique_companies),
            "jobs": len(result),
            "status": "completed",
        }

    async def run_single_company(self, company_name: str) -> dict:
        """Scrape a single company by name."""
        target = next((t for t in SCRAPER_TARGETS if t["name"].lower() == company_name.lower()), None)
        if not target:
            return {"error": f"Company '{company_name}' not in targets", "status": "not_found"}
        return await self.run_scrape([target])
