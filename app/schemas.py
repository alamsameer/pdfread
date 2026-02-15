"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel
from typing import List, Optional, Any


# ============ Document Schemas ============

class DocumentCreate(BaseModel):
    title: str


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_path: str
    total_pages: int
    created_at: str
    theme: str = "plain"
    toc: Optional[List[Any]] = None

    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    theme: Optional[str] = None


class DocumentListResponse(BaseModel):
    total: int
    documents: List[DocumentResponse]


# ============ Block Schemas ============

class BlockResponse(BaseModel):
    id: str
    doc_id: str
    page_number: int
    block_order: int
    text: Optional[str] = None
    block_type: str
    image_path: Optional[str] = None
    words_meta: List[Any]      # JSON object
    style_runs: List[Any]      # JSON object
    position_meta: List[Any]   # JSON object

    class Config:
        from_attributes = True


class BlockSplitRequest(BaseModel):
    split_index: int


# ============ Annotation Schemas ============

class AnnotationCreate(BaseModel):
    doc_id: str
    block_id: str
    start_word_index: int
    end_word_index: int
    color: str = "#ffeb3b"
    font_size: Optional[str] = None
    font_style: Optional[str] = None
    note: Optional[str] = None
    user_id: str = "anonymous"


class AnnotationUpdate(BaseModel):
    color: Optional[str] = None
    font_size: Optional[str] = None
    font_style: Optional[str] = None
    note: Optional[str] = None


class AnnotationResponse(BaseModel):
    id: str
    doc_id: str
    block_id: str
    start_word_index: int
    end_word_index: int
    annotation_type: str
    color: str
    font_size: Optional[str] = None
    font_style: Optional[str] = None
    note: Optional[str] = None
    user_id: str
    is_shared: int
    created_at: str

    class Config:
        from_attributes = True


# ============ API Response Schemas ============

class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None


class UploadResponse(BaseModel):
    status: str
    document_id: str
    title: str
    total_pages: int


# ============ Preference Schemas ============

class UserPreferenceBase(BaseModel):
    user_id: str = "user"
    font_size: int = 18
    font_family: str = "Merriweather"
    line_height: str = "1.6"


class UserPreferenceUpdate(BaseModel):
    font_size: Optional[int] = None
    font_family: Optional[str] = None
    line_height: Optional[str] = None


class UserPreferenceResponse(UserPreferenceBase):
    class Config:
        from_attributes = True
