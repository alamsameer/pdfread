"""
Configuration settings for PDF Reader Backend
"""
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Base directories
    BASE_DIR = Path(__file__).parent
    UPLOAD_DIR = BASE_DIR / "uploads"
    PDFS_DIR = UPLOAD_DIR / "pdfs"
    STATIC_DIR = BASE_DIR / "static"
    
    # File upload settings
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {".pdf"}
    
    # API settings
    API_PREFIX = "/api"
    CORS_ORIGINS = ["*"]  # In production, specify exact origins
    
    # Server settings
    HOST = "0.0.0.0"
    PORT = 8000
    
    # Database
    import os
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # Supabase Auth
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL must be set")
    if "sqlite" in DATABASE_URL:
        raise ValueError("SQLite is no longer supported. Please use PostgreSQL/Supabase.")


settings = Settings()
