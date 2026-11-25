from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.auth.router import router as auth_router
from app.modules.students.router import router as students_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- v1 routers ---
v1_prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=v1_prefix)
app.include_router(students_router, prefix=v1_prefix)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "fpt-classswap-backend"}


@app.get(f"{v1_prefix}/health", tags=["Health"])
def api_v1_health_check() -> dict[str, str]:
    return {"status": "ok", "version": settings.VERSION}
