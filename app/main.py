"""
PDF Reader Backend API
FastAPI application for processing PDF files with PyMuPDF
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
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

# Ensure directories exist
settings.PDFS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(settings.STATIC_DIR)), name="static")


# ============ Root & Health ============

@app.get("/")
async def root():
    """Redirect to dashboard"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/dashboard")


@app.get("/dashboard")
async def dashboard_page():
    """Serve the dashboard interface"""
    return FileResponse(settings.STATIC_DIR / "dashboard.html")


@app.get("/reader/{doc_id}")
async def reader_page(doc_id: str):
    """Serve the reader interface"""
    return FileResponse(settings.STATIC_DIR / "reader.html")


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "3.0.0"}


# ============ Document Endpoints ============

@app.post("/api/upload", response_model=schemas.UploadResponse)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload and process a PDF file
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    logger.info(f"Received upload: {file.filename} ({file_size} bytes)")
    
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Generate document ID and save file
    doc_id = str(uuid.uuid4())[:8]
    pdf_path = settings.PDFS_DIR / file.filename
    
    try:
        # Save uploaded file
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"File saved to {pdf_path}")
        
        # Parse PDF and store in database
        doc_record = parse_pdf(
            file_path=str(pdf_path),
            db_session=db,
            doc_id=doc_id,
            title=file.filename
        )
        
        logger.info(f"Document {doc_id} processed successfully")
        
        return schemas.UploadResponse(
            status="ok",
            document_id=doc_record.id,
            title=doc_record.title,
            total_pages=doc_record.total_pages
        )
    
    except Exception as e:
        # Cleanup on failure
        if pdf_path.exists():
            pdf_path.unlink()
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@app.get("/api/documents", response_model=schemas.DocumentListResponse)
async def list_documents(db: Session = Depends(get_db)):
    """
    List all processed documents
    """
    docs = db.query(models.Document).all()
    return schemas.DocumentListResponse(
        total=len(docs),
        documents=docs
    )


@app.get("/api/documents/{doc_id}", response_model=schemas.DocumentResponse)
async def get_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Get document metadata
    """
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.delete("/api/documents/{doc_id}", response_model=schemas.StatusResponse)
async def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Delete a document and its associated data
    """
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete PDF file
    pdf_path = Path(doc.file_path)
    if pdf_path.exists():
        pdf_path.unlink()
    
    # Delete from database (cascade deletes blocks and annotations)
    db.delete(doc)
    db.commit()
    
    logger.info(f"Document {doc_id} deleted")
    
    return schemas.StatusResponse(status="ok", message="Document deleted")


@app.patch("/api/documents/{doc_id}", response_model=schemas.DocumentResponse)
async def update_document(doc_id: str, data: schemas.DocumentUpdate, db: Session = Depends(get_db)):
    """
    Update document metadata (e.g. theme)
    """
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if data.theme is not None:
        doc.theme = data.theme
    if data.title is not None:
        doc.title = data.title
        
    db.commit()
    db.refresh(doc)
    return doc


# ============ Database Migration Helper (Dev Only) ============
@app.on_event("startup")
def ensure_db_schema():
    """Ensure new columns exist in SQLite"""
    try:
        with engine.connect() as conn:
            # Check if theme column exists
            result = conn.execute(text("PRAGMA table_info(documents)"))
            columns = [row.name for row in result]
            if "theme" not in columns:
                logger.info("Migrating DB: Adding 'theme' column to 'documents' table")
                conn.execute(text("ALTER TABLE documents ADD COLUMN theme TEXT DEFAULT 'plain'"))
            
            if "toc" not in columns:
                logger.info("Migrating DB: Adding 'toc' column to 'documents' table")
                conn.execute(text("ALTER TABLE documents ADD COLUMN toc TEXT"))
                
            conn.commit()
    except Exception as e:
        logger.warning(f"DB Migration check failed: {e}")


# ============ Block Endpoints ============

@app.get("/api/documents/{doc_id}/blocks", response_model=List[schemas.BlockResponse])
async def get_blocks(doc_id: str, db: Session = Depends(get_db)):
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
async def get_page_blocks(doc_id: str, page_number: int, db: Session = Depends(get_db)):
    """
    Get blocks for a specific page
    """
    blocks = db.query(models.Block).filter(
        models.Block.doc_id == doc_id,
        models.Block.page_number == page_number
    ).order_by(models.Block.block_order).all()
    
    return blocks


@app.post("/api/documents/{doc_id}/blocks/{block_id}/split", response_model=List[schemas.BlockResponse])
async def split_block(
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
    try:
        words = json.loads(block.words_meta) if block.words_meta else []
        styles = block.style_runs 
        pos = block.position_meta
    except json.JSONDecodeError:
        words = []

    split_idx = data.split_index
    
    if split_idx <= 0 or split_idx >= len(words):
        raise HTTPException(status_code=400, detail="Invalid split index")
        
    # 3. Split Data
    words_1 = words[:split_idx]
    words_2 = words[split_idx:]
    
    text_1 = " ".join([w.get("word", "") for w in words_1])
    text_2 = " ".join([w.get("word", "") for w in words_2])
    
    # 4. Shift subsequent blocks
    subsequent_blocks = db.query(models.Block).filter(
        models.Block.doc_id == doc_id,
        models.Block.page_number == block.page_number,
        models.Block.block_order > block.block_order
    ).order_by(models.Block.block_order.desc()).all()
    
    for b in subsequent_blocks:
        b.block_order += 1
        
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
        words_meta=json.dumps(words_2),
        style_runs=styles,
        position_meta=pos
    )
    
    # 6. Update old block
    block.text = text_1
    block.words_meta = json.dumps(words_1)
    
    db.add(new_block)
    db.commit()
    db.refresh(block)
    db.refresh(new_block)
    
    return [block, new_block]


# ============ Annotation Endpoints ============

@app.post("/api/annotations", response_model=schemas.AnnotationResponse)
async def create_annotation(data: schemas.AnnotationCreate, db: Session = Depends(get_db)):
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
async def update_annotation(annotation_id: str, data: schemas.AnnotationUpdate, db: Session = Depends(get_db)):
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
async def get_annotations(doc_id: str, db: Session = Depends(get_db)):
    """
    Get all annotations for a document
    """
    annotations = db.query(models.Annotation).filter(
        models.Annotation.doc_id == doc_id
    ).all()
    
    return annotations


@app.delete("/api/annotations/{annotation_id}", response_model=schemas.StatusResponse)
async def delete_annotation(annotation_id: str, db: Session = Depends(get_db)):
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
async def get_user_preferences(user_id: str, db: Session = Depends(get_db)):
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
async def update_user_preferences(user_id: str, data: schemas.UserPreferenceUpdate, db: Session = Depends(get_db)):
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
