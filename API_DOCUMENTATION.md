# Backend API Documentation

This document describes the backend architecture and API endpoints for the PDF Reader application.

## Overview

- **Base URL:** `http://localhost:8000`
- **Authentication:** None (Anonymous access)
- **Data Format:** JSON
- **Date Format:** ISO 8601 Strings

---

## 1. Document Management

### Upload PDF
Upload and process a new PDF file. This triggers asynchronous parsing.

- **Endpoint:** `POST /api/upload`
- **Content-Type:** `multipart/form-data`

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | file | The PDF document to upload (max 50MB) |

**Response (200 OK):**
```json
{
  "status": "ok",
  "document_id": "a1b2c3d4",
  "title": "Machine_Learning_Intro.pdf",
  "total_pages": 42
}
```

### List Documents
Get a list of all processed documents.

- **Endpoint:** `GET /api/documents`

**Response (200 OK):**
```json
{
  "total": 2,
  "documents": [
    {
      "id": "a1b2c3d4",
      "title": "Machine_Learning_Intro.pdf",
      "file_path": "c:/.../uploads/Machine_Learning_Intro.pdf",
      "total_pages": 42,
      "created_at": "2023-10-27T10:00:00"
    },
    {
      "id": "x9y8z7w6",
      "title": "Project_Specs.pdf",
      "file_path": "c:/.../uploads/Project_Specs.pdf",
      "total_pages": 5,
      "created_at": "2023-10-26T15:30:00"
    }
  ]
}
```

### Delete Document
Remove a document and all its associated data (blocks, annotations).

- **Endpoint:** `DELETE /api/documents/{doc_id}`

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Document deleted"
}
```

---

## 2. Block Content (PDF Structure)

The PDF content is pre-parsed into "Blocks". Each block represents a paragraph or an image.
Clients should fetch blocks page-by-page.

### Get Page Blocks
Get all content blocks for a specific page.

- **Endpoint:** `GET /api/documents/{doc_id}/pages/{page_number}/blocks`
- **Parameters:**
  - `page_number` (int): 1-indexed page number (e.g., `1` for the first page).

**Response (200 OK):**
An array of Block objects.

```json
[
  {
    "id": "block-uuid-1",
    "doc_id": "a1b2c3d4",
    "page_number": 1,
    "block_order": 0,
    "block_type": "text", 
    "text": "Introduction\nThis is the first paragraph...",
    "image_path": null,
    
    // JSON Strings (Must be parsed by client)
    "position_meta": "[50.5, 100.2, 500.5, 120.2]", // [x0, y0, x1, y1]
    
    "style_runs": "[{\"start\": 0, \"end\": 12, \"fontSize\": 18, \"font\": \"Arial-Bold\", \"isBold\": true, \"color\": \"#000000\"}]",
    
    "words_meta": "[{\"start\": 0, \"end\": 12, \"text\": \"Introduction\", \"fontSize\": 18, \"isNewline\": true, \"x\": 50.5, \"y\": 100.2}]"
  },
  {
    "id": "block-uuid-2",
    "block_type": "image",
    "image_path": "/static/images/docID_p0_b1.png",
    "text": null
    // ...
  }
]
```

### Detailed Field Descriptions (JSON content)

1.  **`words_meta`** (Word-level precision):
    array of objects, where each object represents a word:
    ```json
    {
      "start": 0,          // Absolute char index in block text
      "end": 5,            // End char index
      "text": "Hello",
      "fontSize": 12.0,
      "fontFamily": "Arial",
      "isBold": true,
      "isItalic": false,
      "color": "#000000",
      "isNewline": true,   // Does this word start a new visual line?
      "x": 45.3            // Absolute X-position (indentation)
    }
    ```

2.  **`style_runs`** (Formatting ranges):
    array of objects describing style spans:
    ```json
    {
      "start": 0,
      "end": 20,
      "fontSize": 14.0,
      "font": "Times-Roman",
      "isBold": false,
      "color": "#333333"
    }
    ```

---

## 3. Annotations (Highlights)

Manage user highlights and notes.

### Create Annotation
Add a highlight to a text range.

- **Endpoint:** `POST /api/annotations`
- **Content-Type:** `application/json`

**Payload:**
```json
{
  "doc_id": "a1b2c3d4",
  "block_id": "block-uuid-1",
  "start_word_index": 5,      // Index of the first highlighted word in 'words_meta' list
  "end_word_index": 8,        // Index of the last highlighted word
  "color": "#ffeb3b",         // Default: Yellow
  "note": "Important definition",
  "user_id": "user123"        // Optional
}
```

**Response (200 OK):**
```json
{
  "id": "anno-uuid-1",
  "doc_id": "a1b2c3d4",
  "block_id": "block-uuid-1",
  "start_word_index": 5,
  "end_word_index": 8,
  "annotation_type": "highlight",
  "color": "#ffeb3b",
  "note": "Important definition",
  "created_at": "2023-10-27T10:05:00"
}
```

### Update Annotation
Modify an existing annotation (e.g., change color or edit note).

- **Endpoint:** `PUT /api/annotations/{annotation_id}`
- **Content-Type:** `application/json`

**Payload:**
```json
{
  "color": "#ff0000", // Change to Red
  "note": "Updated note context"
}
```

**Response:** Returns the updated Annotation object (same as Create).

### Get Document Annotations
Fetch all annotations for a document to overlay on the UI.

- **Endpoint:** `GET /api/documents/{doc_id}/annotations`

**Response:**
Array of Annotation objects.

### Delete Annotation
- **Endpoint:** `DELETE /api/annotations/{annotation_id}`

**Response:**
```json
{
  "status": "ok",
  "message": "Annotation deleted"
}
```
