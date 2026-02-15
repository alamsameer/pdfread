"""
Database connection and session management
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

# Database URL from settings
DATABASE_URL = settings.DATABASE_URL

# Handle SSL for Supabase/PostgreSQL if needed
# connect_args = {"sslmode": "require"} if "supabase" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    # connect_args=connect_args, # Uncomment if SSL is required and not in URL
    pool_pre_ping=True
)

# Debug: Print active database URL (masked)
masked_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "PostgreSQL"
print(f"🔥 Database: PostgreSQL/Supabase (Connected to ...{masked_url})")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
