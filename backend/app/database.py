"""Database configuration."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


# ═══════════════════════════════════════════════════════════════
# DECLARATIVE BASE — every model inherits from this
# ═══════════════════════════════════════════════════════════════
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════
# ENGINE
# pool_pre_ping + pool_recycle prevent idle-in-transaction drops
# ═══════════════════════════════════════════════════════════════
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # verify connection before use
    pool_recycle=280,        # recycle before Postgres' 5-min idle timeout
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    echo=False,
    future=True,
)


# ═══════════════════════════════════════════════════════════════
# SESSION FACTORY
# ═══════════════════════════════════════════════════════════════
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


# ═══════════════════════════════════════════════════════════════
# FASTAPI DEPENDENCY
# ═══════════════════════════════════════════════════════════════
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()