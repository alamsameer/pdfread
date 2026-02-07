import sys
from pathlib import Path
import json
import fitz

# Add app directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import get_db, SessionLocal
from app.models import Document
from app.parser import generate_smart_toc

def fix_missing_toc():
    db = SessionLocal()
    try:
        # Get documents with missing or empty TOC
        docs = db.query(Document).filter(
            (Document.toc.is_(None)) | (Document.toc == '[]')
        ).all()
        
        print(f"Found {len(docs)} documents with missing/empty TOC.")
        
        for doc_record in docs:
            print(f"Processing document: {doc_record.title} ({doc_record.id})")
            
            # Check if file exists
            if not doc_record.file_path or not Path(doc_record.file_path).exists():
                print(f"File not found: {doc_record.file_path}")
                continue
                
            try:
                doc = fitz.open(doc_record.file_path)
                
                # Try native TOC
                toc_data = doc.get_toc()
                
                if not toc_data:
                    print("  - Native TOC empty. Generating smart TOC...")
                    toc_data = generate_smart_toc(doc)
                else:
                    print("  - Found native TOC.")
                
                # Update DB
                doc_record.toc = json.dumps(toc_data)
                db.commit()
                print(f"  + Updated TOC: {len(toc_data)} items.")
                
                doc.close()
                
            except Exception as e:
                print(f"  ! Error processing {doc_record.id}: {e}")
                
    finally:
        db.close()

if __name__ == "__main__":
    fix_missing_toc()
