# PDF Reader Application

A FastAPI-based document processing system that transforms PDF files into structured, interactive data.

## Features

- PDF upload and processing with PyMuPDF
- Structured text extraction (blocks, words, styles)
- Word-level annotation support
- SQLite database with WAL mode for performance
- RESTful API with auto-generated documentation

## Tech Stack

- **Backend**: Python 3.11+, FastAPI
- **Database**: SQLite (Postgres-compatible schema)
- **PDF Engine**: PyMuPDF (fitz)
- **Validation**: Pydantic

## Project Structure

```
app/
├── main.py           # API routes
├── database.py       # DB connection
├── models.py         # SQLAlchemy models
├── schemas.py        # Pydantic schemas
├── parser.py         # PDF extraction
├── config.py         # Settings
└── static/           # Frontend assets
```

## Installation

```bash
pip install -r requirements.txt
```

## Running the Application

```bash
python -m uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Documents
- `POST /api/upload` - Upload and process a PDF
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get document metadata
- `DELETE /api/documents/{id}` - Delete a document

### Blocks
- `GET /api/documents/{id}/blocks` - Get all blocks
- `GET /api/documents/{id}/pages/{num}/blocks` - Get page blocks

### Annotations
- `POST /api/annotations` - Create an annotation
- `GET /api/documents/{id}/annotations` - Get document annotations
- `DELETE /api/annotations/{id}` - Delete an annotation

## Example Usage

### Upload a PDF
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@document.pdf"
```

### Get Document Blocks
```bash
curl http://localhost:8000/api/documents/{doc_id}/blocks
```

### Create Annotation
```bash
curl -X POST http://localhost:8000/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "abc123",
    "block_id": "block-uuid",
    "start_word_index": 0,
    "end_word_index": 5,
    "color": "#ffeb3b"
  }'
```
# ddf
