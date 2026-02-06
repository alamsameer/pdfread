"""
PDF Parser Service using PyMuPDF (fitz)
Extracts text, words, and style information from PDF files
"""
import fitz  # PyMuPDF
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from .models import Document, Block

logger = logging.getLogger("parser")


def parse_pdf(file_path: str, db_session: Session, doc_id: str, title: str) -> Document:
    """
    Parse a PDF file and store structured data in the database.
    
    Args:
        file_path: Path to the PDF file
        db_session: SQLAlchemy database session
        doc_id: UUID for the document
        title: Document title (usually filename)
    
    Returns:
        Document record
    """
    logger.info(f"Parsing PDF: {file_path}")
    
    doc = fitz.open(file_path)
    total_pages = len(doc)
    
    # Create document record
    doc_record = Document(
        id=doc_id,
        title=title,
        file_path=file_path,
        total_pages=total_pages,
        created_at=datetime.utcnow().isoformat()
    )
    db_session.add(doc_record)
    
    # Collect all blocks for batch insert
    block_records = []
    
    for page_num in range(total_pages):
        page = doc[page_num]
        
        # Get text blocks with detailed info
        blocks = page.get_text("dict")["blocks"]
        
        block_order = 0
        
        for block in blocks:
            # Handle image blocks
            if block["type"] == 1: # 1 = Image
                # Generate unique filename for the image
                image_filename = f"{doc_id}_p{page_num}_b{block_order}.png"
                
                # Check if image data is available directly or needs extraction
                if "image" in block:
                    img_bytes = block["image"]
                else:
                    # Fallback or xref extraction if needed (pymupdf dict usually has 'image' for type 1 if expanded? check docs)
                    # Actually get_text("dict") usually provides image bytes or ext
                    # If not, we might need other methods.
                    # For simplicity in this "dict" mode, if 'image' key exists (it should for type 1)
                    img_bytes = block.get("image")
                
                if not img_bytes:
                     # Attempt recovering from xref if provided?
                     # Let's try skipping empty images for now to avoid errors
                     # Or stick to text if extraction fails
                     continue
                     
                # Save image
                from .config import settings
                images_dir = settings.STATIC_DIR / "images"
                images_dir.mkdir(parents=True, exist_ok=True)
                
                image_path = images_dir / image_filename
                with open(image_path, "wb") as f:
                    f.write(img_bytes)
                
                # Create Block Record
                block_record = Block(
                    id=str(uuid.uuid4()),
                    doc_id=doc_id,
                    page_number=page_num,
                    block_order=block_order,
                    block_type="image",
                    text=None,
                    image_path=f"/static/images/{image_filename}",
                    words_meta=json.dumps([]),
                    style_runs=json.dumps([]),
                    position_meta=json.dumps(block["bbox"])
                )
                block_records.append(block_record)
                block_order += 1
                continue

            # Handle Text blocks (type 0)
            if "lines" not in block:
                continue

            # Detect Alignment (Center/Left)
            # Alignment heuristics often fail or conflict with exact positioning.
            # User requested default left alignment and exact positioning.
            # We will rely on 'x' coordinate (indentation) for visual placement.
            is_centered = False 
            
            full_text = ""
            words_meta = []
            style_runs = []
            
            char_index = 0
            
            # Process each line and span
            for line_idx, line in enumerate(block["lines"]):
                # Get line indentation (relative to page)
                lx0, ly0, _, _ = line["bbox"]
                
                is_line_start = True
                
                for span in line["spans"]:
                    span_text = span["text"]
                    if not span_text: continue
                    
                    # Style extraction
                    size = span["size"]
                    font = span["font"]
                    
                    # Clean font name
                    # Remove subset tag (e.g. "ABCDE+Arial-Bold" -> "Arial-Bold")
                    if "+" in font:
                        font = font.split("+")[-1]
                    
                    dest_color = span.get("color", 0) 
                    
                    # Convert color to hex
                    if isinstance(dest_color, int):
                         color_hex = f"#{dest_color:06x}"
                    else:
                         color_hex = "#000000"

                    # Normalize flags
                    flags = span.get("flags", 0)
                    is_bold = "Bold" in font or (flags & 16)
                    is_italic = "Italic" in font or (flags & 2)
                    
                    span_words = span_text.split()
                    
                    span_start_idx = char_index
                    full_text += span_text
                    char_index += len(span_text)
                    
                    # Record style run
                    style_runs.append({
                        "start": span_start_idx,
                        "end": char_index,
                        "fontSize": size,
                        "font": font,
                        "color": color_hex,
                        "isBold": is_bold,
                        "isItalic": is_italic,
                        "isCentered": False
                    })

                    # Extract words
                    cursor = 0
                    for i, word in enumerate(span_words):
                        w_start = span_text.find(word, cursor)
                        if w_start == -1: continue
                        
                        w_end = w_start + len(word)
                        cursor = w_end
                        
                        abs_start = span_start_idx + w_start
                        abs_end = span_start_idx + w_end
                        
                        # Determine if this word starts a new line
                        forced_newline = False
                        indent_val = 0
                        
                        if is_line_start and i == 0:
                            forced_newline = True
                            indent_val = lx0 # Store absolute x position
                            is_line_start = False 
                        
                        words_meta.append({
                            "start": abs_start,
                            "end": abs_end,
                            "text": word,
                            "fontSize": size,
                            "fontFamily": font,
                            "isBold": is_bold,
                            "isItalic": is_italic,
                            "color": color_hex,
                            "align": "left", # Force left
                            "isNewline": forced_newline,
                            "x": indent_val
                        })
                
                # Add explicit newline in text for fallback
                full_text += "\n" 
                char_index += 1

            # Skip empty blocks
            if not full_text.strip():
                continue
            
            # Create block record
            block_record = Block(
                id=str(uuid.uuid4()),
                doc_id=doc_id,
                page_number=page_num,
                block_order=block_order,
                block_type="text",
                text=full_text,
                words_meta=json.dumps(words_meta),
                style_runs=json.dumps(style_runs),
                position_meta=json.dumps(block["bbox"])
            )
            
            block_records.append(block_record)
            block_order += 1
    
    # Batch insert all blocks
    db_session.bulk_save_objects(block_records)
    db_session.commit()
    
    doc.close()
    
    logger.info(f"Parsed {total_pages} pages, {len(block_records)} blocks for doc {doc_id}")
    
    return doc_record
