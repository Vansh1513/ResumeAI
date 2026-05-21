from fastapi import APIRouter

from app.routes import auth, resumes, analysis, dashboard

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
