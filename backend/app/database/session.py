import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

_is_serverless = bool(os.getenv("VERCEL")) or settings.ENVIRONMENT == "production"
_connect_args: dict[str, object] = {}

# Supabase transaction pooler (port 6543 / Supavisor) requires disabling prepared statements in psycopg3
if ":6543/" in settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgresql+psycopg"):
    _connect_args["prepare_threshold"] = None

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    **({"poolclass": NullPool} if _is_serverless else {}),
    **({"connect_args": _connect_args} if _connect_args else {}),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
