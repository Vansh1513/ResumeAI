import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from app.config import get_settings
from app.database import Base, engine
from app.models import User, Resume, JobAnalysis  # noqa: F401 — register tables
from app.routes import api_router

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    upload_path = Path(settings.upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)
    logger.info("Upload directory ready: %s", upload_path)
    Base.metadata.create_all(bind=engine)
    _ensure_job_analysis_columns()
    yield


def _ensure_job_analysis_columns() -> None:
    """Add AI analysis columns to existing PostgreSQL tables (safe IF NOT EXISTS)."""
    statements = [
        "ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS ats_score DOUBLE PRECISION",
        "ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS strengths JSONB",
        "ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS weaknesses JSONB",
        "ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS improved_bullets JSONB",
        "ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS summary TEXT",
        "ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS analysis_source VARCHAR(32)",
    ]
    try:
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
        logger.info("Job analysis schema verified")
    except Exception:
        logger.exception("Could not migrate job_analyses columns (non-PostgreSQL?)")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
