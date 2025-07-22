from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, AsyncGenerator, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
import os
import logging
import uuid
from datetime import datetime
import json
import asyncio
import io
import hashlib

# RAG System Imports
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF
from langdetect import detect
import nltk
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Emergent integrations for Gemini
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize RAG components
# Use in-memory Qdrant for development (no Docker needed)
qdrant_client = QdrantClient(":memory:")

# Multi-language embedding model
embedding_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-mpnet-base-v2')

# Create FastAPI app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    sources: List[Dict[str, Any]] = []
    confidence: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DocumentChunk(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    text: str
    page_number: int
    chunk_index: int
    language: str
    embedding: Optional[List[float]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    content: str
    page_count: int
    language: str
    file_hash: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    processing_status: str = "pending"  # pending, processing, completed, failed
    chunk_count: int = 0

class QueryRequest(BaseModel):
    query: str
    session_id: str
    max_sources: int = 5

class QueryResponse(BaseModel):
    content: str
    sources: List[Dict[str, Any]]
    confidence: float
    is_complete: bool

# RAG System Classes
class AdvancedPDFProcessor:
    """Advanced PDF processing with multilingual support"""
    
    async def process_pdf(self, file_content: bytes, filename: str) -> Document:
        """Process PDF and extract text content"""
        try:
            # Create document hash
            file_hash = hashlib.md5(file_content).hexdigest()
            
            # Check if already processed
            existing_doc = await db.documents.find_one({"file_hash": file_hash})
            if existing_doc:
                return Document(**existing_doc)
            
            # Extract text from PDF
            pdf_doc = fitz.open(stream=file_content, filetype="pdf")
            full_text = ""
            page_count = len(pdf_doc)
            
            for page_num in range(page_count):
                page = pdf_doc[page_num]
                text = page.get_text()
                full_text += f"[Page {page_num + 1}]\n{text}\n\n"
            
            # Detect language
            try:
                language = detect(full_text[:1000])  # Sample first 1000 chars
            except:
                language = 'en'
            
            # Create document record
            document = Document(
                filename=filename,
                content=full_text,
                page_count=page_count,
                language=language,
                file_hash=file_hash,
                processing_status="processing"
            )
            
            # Save to MongoDB
            await db.documents.insert_one(document.model_dump())
            
            # Process chunks in background
            asyncio.create_task(self._process_chunks(document))
            
            return document
            
        except Exception as e:
            logging.error(f"PDF processing error: {e}")
            raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(e)}")
    
    async def _process_chunks(self, document: Document):
        """Process document into chunks and create embeddings"""
        try:
            # Create semantic chunks
            chunker = SemanticChunker()
            chunks = await chunker.create_chunks(document.content, document.id)
            
            # Create embeddings and store in Qdrant
            vector_store = QdrantVectorStore()
            await vector_store.store_chunks(chunks)
            
            # Update document status
            await db.documents.update_one(
                {"id": document.id},
                {"$set": {"processing_status": "completed", "chunk_count": len(chunks)}}
            )
            
        except Exception as e:
            logging.error(f"Chunk processing error: {e}")
            await db.documents.update_one(
                {"id": document.id},
                {"$set": {"processing_status": "failed"}}
            )

class SemanticChunker:
    """Advanced chunking with semantic awareness"""
    
    async def create_chunks(self, text: str, document_id: str) -> List[DocumentChunk]:
        """Create semantic chunks from document text"""
        chunks = []
        
        # Split by pages first
        pages = text.split('[Page ')
        
        for i, page_content in enumerate(pages[1:], 1):  # Skip first empty split
            # Extract page number and content
            if ']\n' in page_content:
                page_num_str, content = page_content.split(']\n', 1)
                page_number = int(page_num_str)
            else:
                continue
            
            # Split into semantic chunks (paragraphs)
            paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
            
            for chunk_idx, paragraph in enumerate(paragraphs):
                # Detect language for this chunk
                try:
                    chunk_language = detect(paragraph)
                except:
                    chunk_language = 'en'
                
                # Create embedding
                embedding = embedding_model.encode([paragraph])[0].tolist()
                
                chunk = DocumentChunk(
                    document_id=document_id,
                    text=paragraph,
                    page_number=page_number,
                    chunk_index=len(chunks),
                    language=chunk_language,
                    embedding=embedding
                )
                
                chunks.append(chunk)
                
                # Store in MongoDB
                await db.document_chunks.insert_one(chunk.model_dump())
        
        return chunks

class QdrantVectorStore:
    """Qdrant vector database operations"""
    
    def __init__(self):
        self.collection_name = "document_chunks"
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Create collection if it doesn't exist"""
        try:
            collections = qdrant_client.get_collections().collections
            collection_names = [col.name for col in collections]
            
            if self.collection_name not in collection_names:
                qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=768,  # Multilingual model dimension
                        distance=Distance.COSINE
                    )
                )
        except Exception as e:
            logging.error(f"Qdrant collection error: {e}")
    
    async def store_chunks(self, chunks: List[DocumentChunk]):
        """Store chunks in Qdrant"""
        try:
            points = []
            for chunk in chunks:
                if chunk.embedding:
                    points.append({
                        "id": chunk.id,
                        "vector": chunk.embedding,
                        "payload": {
                            "text": chunk.text,
                            "document_id": chunk.document_id,
                            "page_number": chunk.page_number,
                            "chunk_index": chunk.chunk_index,
                            "language": chunk.language
                        }
                    })
            
            if points:
                qdrant_client.upsert(
                    collection_name=self.collection_name,
                    points=points
                )
                
        except Exception as e:
            logging.error(f"Vector store error: {e}")
    
    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for similar chunks"""
        try:
            # Create query embedding
            query_embedding = embedding_model.encode([query])[0].tolist()
            
            # Search in Qdrant
            results = qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=limit
            )
            
            return [
                {
                    "text": result.payload["text"],
                    "document_id": result.payload["document_id"],
                    "page_number": result.payload["page_number"],
                    "similarity_score": result.score,
                    "language": result.payload["language"]
                }
                for result in results
            ]
            
        except Exception as e:
            logging.error(f"Vector search error: {e}")
            return []

class StreamingRAGEngine:
    """RAG engine with streaming responses"""
    
    def __init__(self):
        self.vector_store = QdrantVectorStore()
    
    async def stream_response(
        self, 
        query: str, 
        session_id: str
    ) -> AsyncGenerator[QueryResponse, None]:
        """Stream RAG response"""
        try:
            # Search for relevant chunks
            relevant_chunks = await self.vector_store.search(query, limit=5)
            
            if not relevant_chunks:
                yield QueryResponse(
                    content="I don't have enough information to answer that question based on the uploaded documents.",
                    sources=[],
                    confidence=0.1,
                    is_complete=True
                )
                return
            
            # Build context
            context = self._build_context(relevant_chunks)
            
            # Create Gemini chat
            gemini_api_key = os.environ.get('GOOGLE_API_KEY')
            if not gemini_api_key:
                raise HTTPException(status_code=500, detail="Google API key not configured")
            
            chat = LlmChat(
                api_key=gemini_api_key,
                session_id=session_id,
                system_message="""You are an expert document analyst. Answer questions based ONLY on the provided context from uploaded documents. 

If the context doesn't contain enough information, clearly state what's missing.
Always cite specific sources when making claims.
For multilingual documents, maintain the language consistency of the user's question.
Structure your response clearly with relevant details."""
            ).with_model("gemini", "gemini-2.5-pro-preview-05-06")
            
            # Create prompt
            prompt = f"""Context from documents:
{context}

User Question: {query}

Please provide a comprehensive answer based on the context above."""
            
            user_message = UserMessage(text=prompt)
            
            # Get response (note: streaming not directly supported in current version)
            response = await chat.send_message(user_message)
            
            # Extract sources
            sources = [
                {
                    "text": chunk["text"][:200] + "...",
                    "page_number": chunk["page_number"],
                    "similarity_score": chunk["similarity_score"],
                    "language": chunk["language"]
                }
                for chunk in relevant_chunks
            ]
            
            yield QueryResponse(
                content=response,
                sources=sources,
                confidence=0.8,
                is_complete=True
            )
            
        except Exception as e:
            logging.error(f"RAG engine error: {e}")
            yield QueryResponse(
                content=f"Error generating response: {str(e)}",
                sources=[],
                confidence=0.0,
                is_complete=True
            )
    
    def _build_context(self, chunks: List[Dict]) -> str:
        """Build context from retrieved chunks"""
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(
                f"Source {i} (Page {chunk['page_number']}, Similarity: {chunk['similarity_score']:.2f}):\n{chunk['text']}\n"
            )
        return "\n".join(context_parts)

# Initialize processors
pdf_processor = AdvancedPDFProcessor()
rag_engine = StreamingRAGEngine()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Advanced RAG System API"}

@api_router.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process PDF document"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        content = await file.read()
        document = await pdf_processor.process_pdf(content, file.filename)
        
        return {
            "document_id": document.id,
            "filename": document.filename,
            "page_count": document.page_count,
            "language": document.language,
            "status": document.processing_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/documents")
async def get_documents():
    """Get all uploaded documents"""
    documents = await db.documents.find().sort("uploaded_at", -1).to_list(100)
    return [
        {
            "id": doc["id"],
            "filename": doc["filename"],
            "page_count": doc["page_count"],
            "language": doc["language"],
            "status": doc["processing_status"],
            "chunk_count": doc.get("chunk_count", 0),
            "uploaded_at": doc["uploaded_at"]
        }
        for doc in documents
    ]

@api_router.post("/chat/session")
async def create_chat_session(session_name: str = "New Chat"):
    """Create a new chat session"""
    session = ChatSession(session_name=session_name)
    await db.chat_sessions.insert_one(session.model_dump())
    return session

@api_router.get("/chat/sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    sessions = await db.chat_sessions.find().sort("updated_at", -1).to_list(100)
    return [ChatSession(**session) for session in sessions]

@api_router.get("/chat/{session_id}/messages")
async def get_chat_messages(session_id: str):
    """Get messages for a chat session"""
    messages = await db.chat_messages.find({"session_id": session_id}).sort("timestamp", 1).to_list(1000)
    return [ChatMessage(**message) for message in messages]

@api_router.post("/chat/query")
async def query_documents(request: QueryRequest):
    """Query documents and get streaming response"""
    try:
        # Save user message
        user_message = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.query
        )
        await db.chat_messages.insert_one(user_message.model_dump())
        
        # Generate response
        async def generate_response():
            response_content = ""
            sources = []
            
            async for partial_response in rag_engine.stream_response(request.query, request.session_id):
                response_content = partial_response.content
                sources = partial_response.sources
                
                # Stream response
                yield f"data: {json.dumps(partial_response.model_dump())}\n\n"
            
            # Save assistant message
            assistant_message = ChatMessage(
                session_id=request.session_id,
                role="assistant",
                content=response_content,
                sources=sources,
                confidence=0.8
            )
            await db.chat_messages.insert_one(assistant_message.model_dump())
        
        return StreamingResponse(
            generate_response(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its chunks"""
    # Delete from MongoDB
    await db.documents.delete_one({"id": document_id})
    await db.document_chunks.delete_many({"document_id": document_id})
    
    # Delete from Qdrant (filter by document_id)
    try:
        qdrant_client.delete(
            collection_name="document_chunks",
            points_selector={"filter": {"must": [{"key": "document_id", "match": {"value": document_id}}]}}
        )
    except:
        pass
    
    return {"message": "Document deleted successfully"}

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()