# Technical Documentation: Structured PDF Reader

## 1. System Architecture

```
Client
   ↓
FastAPI Backend (Python)
   ↓
PDF Parser Service (PyMuPDF)
   ↓
SQLite Database
   ↓
Local Storage / S3 (later)
```

### Why FastAPI
- Async support
- Auto-generated docs (Swagger/ReDoc)
- Easy validation with Pydantic
- Very fast performance
- Clean typing

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI, SQLAlchemy, Pydantic |
| **Database** | SQLite (WAL mode enabled) |
| **PDF Parsing** | PyMuPDF (fitz) |
| **Background Jobs** | Celery / RQ / Dramatiq (optional later) |

---

## 3. Database Schema

Schema is designed to be **migration-compatible with Postgres**.

### Documents Table

```sql
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    file_path TEXT,
    total_pages INTEGER,
    created_at TEXT
);
```

### Blocks Table (Optimized Storage)

```sql
CREATE TABLE blocks (
    id TEXT PRIMARY KEY,
    doc_id TEXT,
    page_number INTEGER,
    block_order INTEGER,
    text TEXT,
    words_meta TEXT,      -- JSON string
    style_runs TEXT,      -- JSON string
    position_meta TEXT,   -- JSON string
    FOREIGN KEY(doc_id) REFERENCES documents(id)
);

CREATE INDEX idx_doc_block ON blocks(doc_id, page_number);
```

### Annotations Table

```sql
CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    doc_id TEXT,
    block_id TEXT,
    start_word_index INTEGER,
    end_word_index INTEGER,
    annotation_type TEXT,
    color TEXT,
    font_size TEXT,       -- e.g. "12px"
    font_style TEXT,      -- e.g. "bold", "italic", "underline"
    note TEXT,            -- User notes
    user_id TEXT,
    is_shared INTEGER,
    created_at TEXT,
    FOREIGN KEY(doc_id) REFERENCES documents(id),
    FOREIGN KEY(block_id) REFERENCES blocks(id)
);
```

---

## 4. Data Model Details

### Block JSON Fields

**words_meta** - Word positions within block text:
```json
[
  {"start": 0, "end": 5, "text": "Hello"},
  {"start": 6, "end": 11, "text": "World"}
]
```

**style_runs** - Font styling information:
```json
[
  {"start": 0, "end": 50, "fontSize": 12, "font": "Arial", "color": 0}
]
```

**position_meta** - Bounding box coordinates:
```json
[72.0, 100.5, 540.0, 120.5]  // [x0, y0, x1, y1]
```

---

## 5. API Reference

### Document Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload and process PDF |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/{id}` | Get document metadata |
| DELETE | `/api/documents/{id}` | Delete document |

### Block Retrieval

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/{id}/blocks` | Get all blocks |
| GET | `/api/documents/{id}/pages/{num}/blocks` | Get page blocks |

### Annotations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/annotations` | Create annotation |
| GET | `/api/documents/{id}/annotations` | Get annotations |
| DELETE | `/api/annotations/{id}` | Delete annotation |

---

## 6. PDF Parsing Pipeline (`parser.py`)

1. **Open PDF** with PyMuPDF
2. **Iterate pages** and extract text blocks
3. **Process each block**:
   - Combine span text into full block text
   - Build `words_meta` array (word positions)
   - Build `style_runs` array (font info per span)
   - Store `position_meta` (bounding box)
4. **Batch insert** all blocks for efficiency
5. **Commit transaction**

---

## 7. Directory Structure

```
app/
├── main.py           # FastAPI entry point & routes
├── database.py       # SQLAlchemy connection
├── models.py         # ORM models
├── schemas.py        # Pydantic validation
├── parser.py         # PyMuPDF extraction logic
├── config.py         # Settings
├── static/           # Frontend assets
└── uploads/pdfs/     # PDF file storage
```

---

## 8. Performance Optimizations

### SQLite WAL Mode
Enabled automatically for better concurrency:
```sql
PRAGMA journal_mode=WAL;
```

### Indexing
```sql
CREATE INDEX idx_doc_block ON blocks(doc_id, page_number);
```

### Batch Inserts
Blocks are collected and inserted with `bulk_save_objects()` for efficiency.

---

## 9. Migration Path to Postgres

Easy migration because:
- SQLAlchemy ORM abstraction
- JSON stored as TEXT (Postgres JSONB compatible)
- UUID string primary keys
- Mostly just change connection string

---

## 10. Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Start server
python -m uvicorn app.main:app --reload
```

API available at `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
