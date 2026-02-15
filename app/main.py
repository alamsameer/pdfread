"""
PDF Reader Backend API
FastAPI application for processing PDF files with PyMuPDF
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import shutil
import uuid
from pathlib import Path
from typing import List
import logging
from datetime import datetime
import json
from sqlalchemy import text

from .config import settings
from .database import engine, get_db


from .parser import parse_pdf
from . import models
from . import schemas

# Create Database Tables
models.Base.metadata.create_all(bind=engine)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("api")

# Initialize FastAPI app
app = FastAPI(
    title="PDF Reader API",
    description="Backend for extracting structured text from PDF files using PyMuPDF",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Log only API requests to reduce noise, or all? User asked for "api endpoint"
    # Let's log all for now but prefix clearly
    if request.url.path.startswith("/api"):
        logger.info(f"👉 API Hit: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# Ensure directories exist
settings.PDFS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(settings.STATIC_DIR)), name="static")


# ============ Root & Health ============

@app.get("/")
def root():
    """Redirect to dashboard"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/dashboard")


@app.get("/dashboard")
def dashboard_page():
    """Serve the dashboard interface"""
    return FileResponse(settings.STATIC_DIR / "dashboard.html")


@app.get("/reader/{doc_id}")
def reader_page(doc_id: str):
    """Serve the reader interface"""
    return FileResponse(settings.STATIC_DIR / "reader.html")


@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "3.0.0"}


# ============ Document Endpoints ============

# @app.post("/api/upload", response_model=schemas.UploadResponse)
# async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
#     """
#     Upload and process a PDF file
#     """
    # Validate file type
from .auth import get_current_user, supabase, AuthApiError
from pydantic import BaseModel

# ============ Auth Endpoints (Proxy to Supabase) ============

class UserLogin(BaseModel):
    email: str
    password: str

@app.post("/api/auth/signup")
def signup(user: UserLogin):
    try:
        res = supabase.auth.sign_up({
            "email": user.email, 
            "password": user.password
        })
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def login(user: UserLogin):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": user.email, 
            "password": user.password
        })
        return res
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ Document Endpoints ============

@app.post("/api/upload", response_model=schemas.UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """
    Upload and process a PDF file (Authenticated)
    """
    logger.info(f"User {current_user.id} uploading file: {file.filename}")
    
    # ... (validation checks same as before) ...
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_FILE_SIZE:
        logger.warning(f"Upload failed: File too large ({file_size} bytes)")
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    doc_id = str(uuid.uuid4())[:8]
    
    try:
        file_content = await file.read()
        logger.info(f"File read successful ({len(file_content)} bytes). Parsing...")
            
        # Extract user ID safely
        user_id = getattr(current_user, "id", None)
        if not user_id and isinstance(current_user, dict):
            user_id = current_user.get("id")
            
        if not user_id:
            logger.error(f"Could not extract user ID from user object: {current_user}")
            raise HTTPException(status_code=500, detail="User identification failed")

        doc_record = parse_pdf(
            file_path=file.filename,
            db_session=db,
            doc_id=doc_id,
            title=file.filename,
            file_bytes=file_content,
            user_id=user_id
        )
        
        logger.info(f"Document {doc_id} processed successfully for user {user_id}")
        
        return schemas.UploadResponse(
            status="ok",
            document_id=doc_record.id,
            title=doc_record.title,
            total_pages=doc_record.total_pages
        )
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@app.get("/api/documents", response_model=schemas.DocumentListResponse)
def list_documents(
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """List documents owned by the user"""
    logger.info(f"User {current_user.id} fetching document list")
    from sqlalchemy.orm import defer
    
    docs = db.query(models.Document).filter(
        models.Document.user_id == current_user.id
    ).options(
        defer(models.Document.file_data)
    ).all()
    
    logger.info(f"Found {len(docs)} documents for user {current_user.id}")
    return schemas.DocumentListResponse(
        total=len(docs),
        documents=docs
    )


@app.get("/api/documents/{doc_id}", response_model=schemas.DocumentResponse)
def get_document(
    doc_id: str, 
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """Get document metadata (Owner only)"""
    logger.info(f"User {current_user.id} fetching metadata for doc {doc_id}")
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not doc:
        logger.warning(f"Document {doc_id} not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/api/documents/{doc_id}/download")
def download_document(
    doc_id: str, 
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """
    Download/View the original PDF file (Owner only)
    """
    logger.info(f"User {current_user.id} downloading doc {doc_id}")
    from fastapi.responses import Response
    
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="Document data not found")
        
    # Determine filename
    filename = (doc.title or f"{doc_id}.pdf")
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
        
    return Response(
        content=doc.file_data, 
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@app.get("/api/documents/{doc_id}/thumbnail")
def get_document_thumbnail(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """Generate a thumbnail of the first page of the PDF"""
    from fastapi.responses import Response
    import fitz
    
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        pdf = fitz.open(stream=doc.file_data, filetype="pdf")
        page = pdf[0]  # First page
        
        # Render at 2x for good quality thumbnails
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        pdf.close()
        
        logger.info(f"Generated thumbnail for doc {doc_id}")
        return Response(
            content=img_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate thumbnail")


@app.delete("/api/documents/{doc_id}", response_model=schemas.StatusResponse)
def delete_document(
    doc_id: str, 
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """
    Delete a document and its associated data (Owner only)
    """
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete PDF file - No longer needed as file is in DB
    # if doc.file_path and Path(doc.file_path).exists():
    #     try:
    #         Path(doc.file_path).unlink()
    #     except Exception:
    #         pass # Ignore errors if file doesn't exist
    
    # Explicitly delete dependent records to ensure cleanup
    try:
        # 1. Delete Annotations
        db.query(models.Annotation).filter(models.Annotation.doc_id == doc_id).delete()
        
        # 2. Delete Blocks
        db.query(models.Block).filter(models.Block.doc_id == doc_id).delete()
        
        # 3. Delete Document
        db.delete(doc)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting document {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")
    
    logger.info(f"Document {doc_id} deleted")
    
    return schemas.StatusResponse(status="ok", message="Document deleted")


@app.patch("/api/documents/{doc_id}", response_model=schemas.DocumentResponse)
def update_document(
    doc_id: str, 
    data: schemas.DocumentUpdate, 
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """
    Update document metadata (e.g. theme) (Owner only)
    """
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if data.theme is not None:
        doc.theme = data.theme
    if data.title is not None:
        doc.title = data.title
        
    db.commit()
    db.refresh(doc)
    return doc


# ============ Reading Session Endpoints ============

@app.post("/api/reading/start", response_model=schemas.ReadingSessionResponse)
def start_reading_session(
    data: schemas.ReadingSessionCreate,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """Start a new reading session for a document"""
    logger.info(f"User {current_user.id} starting reading session for doc {data.document_id}")
    
    # Verify the document belongs to the user
    doc = db.query(models.Document).filter(
        models.Document.id == data.document_id,
        models.Document.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    from datetime import datetime
    
    session = models.ReadingSession(
        id=str(uuid.uuid4())[:8],
        user_id=current_user.id,
        document_id=data.document_id,
        start_time=datetime.utcnow().isoformat(),
        end_time=datetime.utcnow().isoformat(),
        duration_seconds=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    logger.info(f"Reading session {session.id} started")
    return session


@app.post("/api/reading/{session_id}/heartbeat", response_model=schemas.ReadingSessionResponse)
def heartbeat_reading_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """Update reading session end_time (called every ~30 seconds by frontend)"""
    session = db.query(models.ReadingSession).filter(
        models.ReadingSession.id == session_id,
        models.ReadingSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Reading session not found")
    
    from datetime import datetime
    
    now = datetime.utcnow()
    session.end_time = now.isoformat()
    
    # Calculate duration from start_time
    start = datetime.fromisoformat(session.start_time)
    session.duration_seconds = int((now - start).total_seconds())
    
    db.commit()
    db.refresh(session)
    
    logger.info(f"Session {session_id} heartbeat: {session.duration_seconds}s elapsed")
    return session


@app.get("/api/documents/{doc_id}/stats", response_model=schemas.ReadingStatsResponse)
def get_document_reading_stats(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    """Get aggregated reading time stats for a document"""
    from sqlalchemy import func
    
    sessions = db.query(models.ReadingSession).filter(
        models.ReadingSession.document_id == doc_id,
        models.ReadingSession.user_id == current_user.id
    ).all()
    
    total_seconds = sum(s.duration_seconds or 0 for s in sessions)
    total_sessions = len(sessions)
    last_session_date = sessions[-1].end_time if sessions else None
    
    logger.info(f"Stats for doc {doc_id}: {total_seconds}s across {total_sessions} sessions")
    
    return schemas.ReadingStatsResponse(
        total_seconds=total_seconds,
        total_sessions=total_sessions,
        last_session_date=last_session_date
    )


# ============ Database Migration Helper (Dev Only) ============
# ============ Database Migration Helper (Dev Only) ============
@app.on_event("startup")
def ensure_db_schema():
    """Ensure new columns exist in Postgres (Simple manual migration)"""
    try:
        with engine.connect() as conn:
            # Check if image_data column exists in blocks
            # Postgres specific query
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='blocks' AND column_name='image_data';"
            ))
            if not result.fetchone():
                logger.info("Migrating DB: Adding 'image_data' column to 'blocks' table")
                conn.execute(text("ALTER TABLE blocks ADD COLUMN image_data BYTEA"))
            
            # Check if file_data column exists in documents
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='documents' AND column_name='file_data';"
            ))
            if not result.fetchone():
                logger.info("Migrating DB: Adding 'file_data' column to 'documents' table")
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_data BYTEA"))
            
            # Check if user_id column exists in documents
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id';"
            ))
            if not result.fetchone():
                logger.info("Migrating DB: Adding 'user_id' column to 'documents' table")
                conn.execute(text("ALTER TABLE documents ADD COLUMN user_id VARCHAR"))
                
                
            # Create reading_sessions table if not exists (using SQLAlchemy create_all is safer for new tables)
            # But here we just check if we need to run create_all
            result = conn.execute(text(
                "SELECT to_regclass('public.reading_sessions');"
            ))
            if not result.fetchone()[0]:
                logger.info("Migrating DB: Creating 'reading_sessions' table")
                models.Base.metadata.create_all(bind=engine)

            conn.commit()
    except Exception as e:
        logger.warning(f"DB Migration check failed: {e}")

# ============ Image Endpoint ============

@app.get("/api/images/{block_id}")
def get_image(block_id: str, db: Session = Depends(get_db)):
    """
    Serve image directly from database
    """
    block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not block.image_data:
        # Fallback to file system if path exists but no data in DB (legacy)
        # But user asked to remove local files. 
        # For new system, we expect data in DB.
        raise HTTPException(status_code=404, detail="Image data not found")

    from fastapi.responses import Response
    return Response(content=block.image_data, media_type="image/png")


# ============ Block Endpoints ============

@app.get("/api/documents/{doc_id}/blocks", response_model=List[schemas.BlockResponse])
def get_blocks(doc_id: str, db: Session = Depends(get_db)):
    """
    Get all blocks for a document
    """
    # Verify document exists
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    blocks = db.query(models.Block).filter(
        models.Block.doc_id == doc_id
    ).order_by(
        models.Block.page_number,
        models.Block.block_order
    ).all()
    
    return blocks


@app.get("/api/documents/{doc_id}/pages/{page_number}/blocks", response_model=List[schemas.BlockResponse])
def get_page_blocks(doc_id: str, page_number: int, db: Session = Depends(get_db)):
    """
    Get blocks for a specific page
    """
    blocks = db.query(models.Block).filter(
        models.Block.doc_id == doc_id,
        models.Block.page_number == page_number
    ).order_by(models.Block.block_order).all()
    
    return blocks


@app.post("/api/documents/{doc_id}/blocks/{block_id}/split", response_model=List[schemas.BlockResponse])
def split_block(
    doc_id: str, 
    block_id: str, 
    data: schemas.BlockSplitRequest, 
    db: Session = Depends(get_db)
):
    """
    Split a block into two at the specified word index.
    The word at split_index becomes the first word of the new block.
    """
    # 1. Get original block
    block = db.query(models.Block).filter(
        models.Block.id == block_id,
        models.Block.doc_id == doc_id
    ).first()
    
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
        
    # 2. Parse metadata
    # With JSONB, these are already Python objects (lists/dicts)
    words = block.words_meta if block.words_meta else []
    styles = block.style_runs 
    pos = block.position_meta

    split_idx = data.split_index
    
    if split_idx <= 0 or split_idx >= len(words):
        raise HTTPException(status_code=400, detail="Invalid split index")
        
    # 3. Split Data
    words_1 = words[:split_idx]
    words_2 = words[split_idx:]
    
    text_1 = " ".join([w.get("word", "") for w in words_1])
    text_2 = " ".join([w.get("word", "") for w in words_2])
    
    # 4. Shift subsequent blocks
    db.query(models.Block).filter(
        models.Block.doc_id == doc_id,
        models.Block.page_number == block.page_number,
        models.Block.block_order > block.block_order
    ).update({models.Block.block_order: models.Block.block_order + 1}, synchronize_session=False)
        
    # 5. Create new block
    new_block_id = str(uuid.uuid4())
    new_block = models.Block(
        id=new_block_id,
        doc_id=doc_id,
        page_number=block.page_number,
        block_order=block.block_order + 1,
        text=text_2,
        block_type=block.block_type,
        image_path=block.image_path,
        words_meta=words_2,
        style_runs=styles,
        position_meta=pos
    )
    
    # 6. Update old block
    block.text = text_1
    block.words_meta = words_1
    
    db.add(new_block)
    db.commit()
    db.refresh(block)
    db.refresh(new_block)
    
    return [block, new_block]


# ============ Annotation Endpoints ============

@app.post("/api/annotations", response_model=schemas.AnnotationResponse)
def create_annotation(data: schemas.AnnotationCreate, db: Session = Depends(get_db)):
    """
    Create a new annotation (highlight)
    """
    # Verify block exists
    block = db.query(models.Block).filter(models.Block.id == data.block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    annotation = models.Annotation(
        id=str(uuid.uuid4()),
        doc_id=data.doc_id,
        block_id=data.block_id,
        start_word_index=data.start_word_index,
        end_word_index=data.end_word_index,
        annotation_type="highlight",
        color=data.color,
        font_size=data.font_size,
        font_style=data.font_style,
        note=data.note,
        user_id=data.user_id,
        is_shared=0,
        created_at=datetime.utcnow().isoformat()
    )
    
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    
    logger.info(f"Annotation created: {annotation.id}")
    
    return annotation


@app.put("/api/annotations/{annotation_id}", response_model=schemas.AnnotationResponse)
def update_annotation(annotation_id: str, data: schemas.AnnotationUpdate, db: Session = Depends(get_db)):
    """
    Update an annotation (partial update)
    """
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
        
    if data.color is not None:
        annotation.color = data.color
    if data.font_size is not None:
        annotation.font_size = data.font_size
    if data.font_style is not None:
        annotation.font_style = data.font_style
    if data.note is not None:
        annotation.note = data.note
    
    db.commit()
    db.refresh(annotation)
    return annotation


@app.get("/api/documents/{doc_id}/annotations", response_model=List[schemas.AnnotationResponse])
def get_annotations(doc_id: str, db: Session = Depends(get_db)):
    """
    Get all annotations for a document
    """
    annotations = db.query(models.Annotation).filter(
        models.Annotation.doc_id == doc_id
    ).all()
    
    return annotations


@app.delete("/api/annotations/{annotation_id}", response_model=schemas.StatusResponse)
def delete_annotation(annotation_id: str, db: Session = Depends(get_db)):
    """
    Delete an annotation
    """
    annotation = db.query(models.Annotation).filter(
        models.Annotation.id == annotation_id
    ).first()
    
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    db.delete(annotation)
    db.commit()
    
    return schemas.StatusResponse(status="ok", message="Annotation deleted")


# ============ User Preference Endpoints ============

@app.get("/api/preferences/{user_id}", response_model=schemas.UserPreferenceResponse)
def get_user_preferences(user_id: str, db: Session = Depends(get_db)):
    """
    Get user preferences. Creates default if not exists.
    """
    pref = db.query(models.UserPreference).filter(models.UserPreference.user_id == user_id).first()
    if not pref:
        # Create default
        pref = models.UserPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    
    return pref


@app.patch("/api/preferences/{user_id}", response_model=schemas.UserPreferenceResponse)
def update_user_preferences(user_id: str, data: schemas.UserPreferenceUpdate, db: Session = Depends(get_db)):
    """
    Update user preferences
    """
    pref = db.query(models.UserPreference).filter(models.UserPreference.user_id == user_id).first()
    if not pref:
        pref = models.UserPreference(user_id=user_id)
        db.add(pref)
    
    if data.font_size is not None:
        pref.font_size = data.font_size
    if data.font_family is not None:
        pref.font_family = data.font_family
    if data.line_height is not None:
        pref.line_height = data.line_height
        
    db.commit()
    db.refresh(pref)
    return pref


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
