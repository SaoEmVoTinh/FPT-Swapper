from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.academic.router import router as academic_router
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.chat.router import router as chat_router
from app.modules.class_swap.router import router as class_swap_router
from app.modules.matching.router import router as matching_router
from app.modules.notifications.router import router as notifications_router
from app.modules.realtime.hub import realtime_hub
from app.modules.realtime.router import router as realtime_router
from app.modules.reports.router import router as reports_router
from app.modules.students.router import router as students_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await realtime_hub.start()
    try:
        yield
    finally:
        await realtime_hub.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    lifespan=lifespan,
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
app.include_router(academic_router, prefix=v1_prefix)
app.include_router(class_swap_router, prefix=v1_prefix)
app.include_router(matching_router, prefix=v1_prefix)
app.include_router(chat_router, prefix=v1_prefix)
app.include_router(notifications_router, prefix=v1_prefix)
app.include_router(realtime_router, prefix=v1_prefix)
app.include_router(reports_router, prefix=v1_prefix)
app.include_router(admin_router, prefix=v1_prefix)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "fpt-classswap-backend"}


@app.get(f"{v1_prefix}/health", tags=["Health"])
def api_v1_health_check() -> dict[str, str]:
    return {"status": "ok", "version": settings.VERSION}
