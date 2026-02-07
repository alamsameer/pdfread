"""
SQLAlchemy ORM Models
Schema designed to be migration-compatible with Postgres
"""
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from .database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    title = Column(String)
    file_path = Column(String)
    total_pages = Column(Integer)
    created_at = Column(String)
    theme = Column(String, default="plain")
    toc = Column(Text, nullable=True)  # JSON string of table of contents

    # Relationships
    blocks = relationship("Block", back_populates="document", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="document", cascade="all, delete-orphan")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(String, primary_key=True)
    doc_id = Column(String, ForeignKey("documents.id"))
    page_number = Column(Integer)
    block_order = Column(Integer)

    text = Column(Text, nullable=True)
    block_type = Column(String, default="text") # text, image
    image_path = Column(String, nullable=True)
    
    words_meta = Column(Text)      # JSON string: [{start, end}, ...]
    style_runs = Column(Text)      # JSON string: [{start, end, fontSize, font}, ...]
    position_meta = Column(Text)   # JSON string: [x0, y0, x1, y1] bbox

    # Relationships
    document = relationship("Document", back_populates="blocks")
    annotations = relationship("Annotation", back_populates="block", cascade="all, delete-orphan")

    # Index for efficient queries
    __table_args__ = (
        Index('idx_doc_block', 'doc_id', 'page_number'),
    )


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(String, primary_key=True)
    doc_id = Column(String, ForeignKey("documents.id"))
    block_id = Column(String, ForeignKey("blocks.id"))

    start_word_index = Column(Integer)
    end_word_index = Column(Integer)

    annotation_type = Column(String)  # highlight, underline, etc.
    color = Column(String)
    font_size = Column(String, nullable=True)  # e.g. "12px", "1.2em"
    font_style = Column(String, nullable=True) # e.g. "bold", "italic"
    
    note = Column(String, nullable=True) # User notes

    user_id = Column(String)
    is_shared = Column(Integer, default=0)  # 0 = False, 1 = True
    created_at = Column(String)

    # Relationships
    document = relationship("Document", back_populates="annotations")
    block = relationship("Block", back_populates="annotations")
