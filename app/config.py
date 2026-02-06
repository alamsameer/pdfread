"""
Configuration settings for PDF Reader Backend
"""
from pathlib import Path


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


settings = Settings()
