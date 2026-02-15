"""
PDF Parser Service using PyMuPDF (fitz)
Extracts text, words, and style information from PDF files
"""
import fitz  # PyMuPDF
import json
import uuid
from collections import Counter
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from .models import Document, Block

logger = logging.getLogger("parser")


def generate_smart_toc(doc) -> list:
    """
    Generate a table of contents based on font sizes (heuristic).
    Returns list of [level, title, page].
    """
    try:
        # 1. Collect font sizes and lines
        font_counts = Counter()
        text_lines = [] # (text, size, page_num)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if block["type"] != 0: continue # Skip non-text
                
                for line in block["lines"]:
                    if not line["spans"]: continue
                    
                    # Compute average/max size for the line
                    max_size = 0
                    line_text = ""
                    for span in line["spans"]:
                        if span["size"] > max_size:
                            max_size = span["size"]
                        line_text += span["text"] + " "
                    
                    line_text = line_text.strip()
                    if not line_text: continue
                    
                    # Round size to minimize noise
                    rounded_size = round(max_size * 2) / 2
                    font_counts[rounded_size] += len(line_text)
                    
                    text_lines.append({
                        "text": line_text,
                        "size": rounded_size,
                        "page": page_num + 1
                    })
        
        if not font_counts:
            return []

        # 2. Identify Body Text (most common size)
        if not font_counts:
            return []
            
        body_size = font_counts.most_common(1)[0][0]
        
        # 3. Identify Heading Candidates (larger than body)
        # We consider sizes at least 10% larger than body
        candidates = sorted([s for s in font_counts if s > body_size * 1.1], reverse=True)
        
        # Map top 3 sizes to levels 1, 2, 3
        # Use simple mapping: Largest -> 1, Second -> 2...
        if not candidates:
            return []
            
        heading_levels = {size: i + 1 for i, size in enumerate(candidates[:3])}
        
        # 4. Construct TOC
        toc = []
        for line in text_lines:
            lvl = heading_levels.get(line["size"])
            if lvl:
                toc.append([lvl, line["text"], line["page"]])
                
        return toc

    except Exception as e:
        logger.error(f"Smart TOC generation failed: {e}")
        return []



def parse_pdf(file_path: str, db_session: Session, doc_id: str, title: str, file_bytes: bytes = None, user_id: str = None) -> Document:
    # ... (code) ...
    if file_bytes:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    else:
        doc = fitz.open(file_path)
    
    try:
        total_pages = len(doc)
        
        # Get TOC (native or smart)
        toc_data = doc.get_toc()
        # ...
        
        # Create document record
        doc_record = Document(
            id=doc_id,
            title=title,
            file_path=file_path,
            file_data=file_bytes,
            total_pages=total_pages,
            created_at=datetime.utcnow().isoformat(),
            user_id=user_id,
            toc=toc_data
        )
        db_session.add(doc_record)
        db_session.flush() # Ensure doc is inserted before blocks (FK constraint)
        
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
                         
                    # Generate Block ID
                    block_id = str(uuid.uuid4())
                    
                    # Create Block Record with image data in DB
                    block_record = Block(
                        id=block_id,
                        doc_id=doc_id,
                        page_number=page_num,
                        block_order=block_order,
                        block_type="image",
                        text=None,
                        image_path=f"/api/images/{block_id}", # Point to API endpoint
                        image_data=img_bytes,                 # Store bytes
                        words_meta=[],
                        style_runs=[],
                        position_meta=block["bbox"]
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
                        
                        # Sanitize text: PostgreSQL cannot handle NULL bytes (0x00) in text fields
                        span_text = span_text.replace("\x00", "")
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
                    words_meta=words_meta,
                    style_runs=style_runs,
                    position_meta=block["bbox"]
                )
                
                block_records.append(block_record)
                block_order += 1
        
        # Batch insert all blocks
        if block_records:
            # bulk_save_objects does not work well with relationships needing FKs unless flushed
            # but since we flushed Document, it should be fine.
            db_session.bulk_save_objects(block_records)
            db_session.commit()
            
        logger.info(f"Parsed {total_pages} pages, {len(block_records)} blocks for doc {doc_id}")
        
    finally:
        doc.close() # Always close the file handle
    
    return doc_record
