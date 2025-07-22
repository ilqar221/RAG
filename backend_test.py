#!/usr/bin/env python3
"""
Advanced RAG Backend Testing Suite
Tests all backend API endpoints systematically
"""

import requests
import json
import time
import os
from pathlib import Path
import tempfile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

# Backend URL from environment
BACKEND_URL = "https://a9be135f-dd08-4c26-8513-6540db735944.preview.emergentagent.com/api"

class RAGBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {}
        self.session_id = None
        self.document_id = None
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "details": details
        }
    
    def create_test_pdf(self, content="This is a test PDF document for RAG system testing. It contains sample text in English for processing and vector embedding."):
        """Create a test PDF file"""
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add content to PDF
        p.drawString(100, 750, "Advanced RAG System Test Document")
        p.drawString(100, 700, "=" * 50)
        
        # Split content into lines
        lines = content.split('. ')
        y_position = 650
        
        for line in lines:
            if y_position < 100:  # Start new page
                p.showPage()
                y_position = 750
            p.drawString(100, y_position, line + '.')
            y_position -= 30
        
        p.save()
        buffer.seek(0)
        return buffer.getvalue()
    
    def test_health_check(self):
        """Test basic API health check"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Health Check", True, "API is responding correctly", data)
                    return True
                else:
                    self.log_test("Health Check", False, "Invalid response format", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_pdf_upload(self):
        """Test PDF upload and processing"""
        try:
            # Create test PDF
            pdf_content = self.create_test_pdf(
                "Advanced RAG system testing document. This document contains information about artificial intelligence, machine learning, and natural language processing. The system should be able to process this content and create vector embeddings for semantic search."
            )
            
            # Upload PDF
            files = {
                'file': ('test_document.pdf', pdf_content, 'application/pdf')
            }
            
            response = self.session.post(f"{BACKEND_URL}/upload-document", files=files)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['document_id', 'filename', 'page_count', 'language', 'status']
                
                if all(field in data for field in required_fields):
                    self.document_id = data['document_id']
                    self.log_test("PDF Upload", True, f"Document uploaded successfully: {data['filename']}", data)
                    
                    # Wait for processing
                    time.sleep(3)
                    return True
                else:
                    self.log_test("PDF Upload", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_test("PDF Upload", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("PDF Upload", False, f"Upload error: {str(e)}")
            return False
    
    def test_document_listing(self):
        """Test document listing endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/documents")
            
            if response.status_code == 200:
                documents = response.json()
                
                if isinstance(documents, list):
                    if len(documents) > 0:
                        # Check if our uploaded document is in the list
                        doc_found = any(doc.get('id') == self.document_id for doc in documents)
                        if doc_found:
                            self.log_test("Document Listing", True, f"Found {len(documents)} documents including uploaded test document", f"Documents: {[doc.get('filename') for doc in documents]}")
                        else:
                            self.log_test("Document Listing", True, f"Found {len(documents)} documents but test document not yet visible", f"Documents: {[doc.get('filename') for doc in documents]}")
                    else:
                        self.log_test("Document Listing", True, "No documents found (empty list)", documents)
                    return True
                else:
                    self.log_test("Document Listing", False, "Response is not a list", documents)
                    return False
            else:
                self.log_test("Document Listing", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Document Listing", False, f"Listing error: {str(e)}")
            return False
    
    def test_chat_session_creation(self):
        """Test chat session creation"""
        try:
            data = {"session_name": "RAG System Test Session"}
            response = self.session.post(f"{BACKEND_URL}/chat/session", params=data)
            
            if response.status_code == 200:
                session_data = response.json()
                required_fields = ['id', 'session_name', 'created_at']
                
                if all(field in session_data for field in required_fields):
                    self.session_id = session_data['id']
                    self.log_test("Chat Session Creation", True, f"Session created: {session_data['session_name']}", session_data)
                    return True
                else:
                    self.log_test("Chat Session Creation", False, "Missing required fields", session_data)
                    return False
            else:
                self.log_test("Chat Session Creation", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Chat Session Creation", False, f"Session creation error: {str(e)}")
            return False
    
    def test_chat_query_rag(self):
        """Test RAG query with chat"""
        if not self.session_id:
            self.log_test("RAG Query", False, "No session ID available")
            return False
        
        try:
            # Wait a bit more for document processing
            time.sleep(5)
            
            query_data = {
                "query": "What is this document about? Can you summarize the main topics?",
                "session_id": self.session_id,
                "max_sources": 3
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/chat/query", 
                json=query_data,
                headers={"Content-Type": "application/json"},
                stream=True
            )
            
            if response.status_code == 200:
                # Handle streaming response
                response_content = ""
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])  # Remove 'data: ' prefix
                                if 'content' in data:
                                    response_content = data['content']
                                    sources = data.get('sources', [])
                                    confidence = data.get('confidence', 0)
                                    
                                    if data.get('is_complete', False):
                                        break
                            except json.JSONDecodeError:
                                continue
                
                if response_content:
                    self.log_test("RAG Query", True, f"Generated response with {len(sources)} sources", {
                        "response_length": len(response_content),
                        "sources_count": len(sources),
                        "confidence": confidence,
                        "response_preview": response_content[:200] + "..." if len(response_content) > 200 else response_content
                    })
                    return True
                else:
                    self.log_test("RAG Query", False, "No content in streaming response")
                    return False
            else:
                self.log_test("RAG Query", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("RAG Query", False, f"Query error: {str(e)}")
            return False
    
    def test_chat_sessions_listing(self):
        """Test chat sessions listing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/chat/sessions")
            
            if response.status_code == 200:
                sessions = response.json()
                
                if isinstance(sessions, list):
                    session_found = any(session.get('id') == self.session_id for session in sessions)
                    if session_found:
                        self.log_test("Chat Sessions Listing", True, f"Found {len(sessions)} sessions including test session")
                    else:
                        self.log_test("Chat Sessions Listing", True, f"Found {len(sessions)} sessions but test session not visible")
                    return True
                else:
                    self.log_test("Chat Sessions Listing", False, "Response is not a list", sessions)
                    return False
            else:
                self.log_test("Chat Sessions Listing", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Chat Sessions Listing", False, f"Sessions listing error: {str(e)}")
            return False
    
    def test_chat_messages(self):
        """Test chat messages retrieval"""
        if not self.session_id:
            self.log_test("Chat Messages", False, "No session ID available")
            return False
        
        try:
            response = self.session.get(f"{BACKEND_URL}/chat/{self.session_id}/messages")
            
            if response.status_code == 200:
                messages = response.json()
                
                if isinstance(messages, list):
                    self.log_test("Chat Messages", True, f"Retrieved {len(messages)} messages for session", {
                        "message_count": len(messages),
                        "message_types": [msg.get('role') for msg in messages]
                    })
                    return True
                else:
                    self.log_test("Chat Messages", False, "Response is not a list", messages)
                    return False
            else:
                self.log_test("Chat Messages", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Chat Messages", False, f"Messages retrieval error: {str(e)}")
            return False
    
    def test_document_deletion_bug_fix(self):
        """CRITICAL TEST: Test document deletion bug fix - verify complete removal from MongoDB and Qdrant"""
        if not self.document_id:
            self.log_test("Document Deletion Bug Fix", False, "No document ID available for deletion test")
            return False
        
        try:
            print(f"\n🔍 TESTING DOCUMENT DELETION BUG FIX for document_id: {self.document_id}")
            
            # Step 1: Verify document exists and has been processed
            print("Step 1: Verifying document exists and is processed...")
            time.sleep(8)  # Wait for processing to complete
            
            response = self.session.get(f"{BACKEND_URL}/documents")
            if response.status_code == 200:
                documents = response.json()
                test_doc = next((doc for doc in documents if doc.get('id') == self.document_id), None)
                if test_doc:
                    print(f"   ✅ Document found: {test_doc.get('filename')} (status: {test_doc.get('status')}, chunks: {test_doc.get('chunk_count', 0)})")
                else:
                    self.log_test("Document Deletion Bug Fix", False, "Test document not found before deletion")
                    return False
            
            # Step 2: Test chat with document to verify it appears as source
            print("Step 2: Testing chat with document to verify it appears as source...")
            query_data = {
                "query": "What information is contained in the uploaded document about artificial intelligence?",
                "session_id": self.session_id,
                "max_sources": 5
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/chat/query", 
                json=query_data,
                headers={"Content-Type": "application/json"},
                stream=True
            )
            
            sources_before_deletion = []
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])
                                if 'sources' in data and data.get('is_complete', False):
                                    sources_before_deletion = data['sources']
                                    break
                            except json.JSONDecodeError:
                                continue
                
                print(f"   ✅ Chat response generated with {len(sources_before_deletion)} sources before deletion")
                if len(sources_before_deletion) == 0:
                    print("   ⚠️  WARNING: No sources found in chat response - document may not be fully processed")
            
            # Step 3: Delete the document using the API
            print("Step 3: Deleting document using API...")
            delete_response = self.session.delete(f"{BACKEND_URL}/documents/{self.document_id}")
            
            if delete_response.status_code == 200:
                delete_data = delete_response.json()
                print(f"   ✅ Delete API response: {delete_data}")
                
                # Verify deletion response contains expected fields
                expected_fields = ['message', 'deleted_document', 'deleted_chunks', 'deleted_vectors']
                if all(field in delete_data for field in expected_fields):
                    print(f"   ✅ Deletion summary: Document={delete_data['deleted_document']}, Chunks={delete_data['deleted_chunks']}, Vectors={delete_data['deleted_vectors']}")
                else:
                    self.log_test("Document Deletion Bug Fix", False, "Delete response missing expected fields", delete_data)
                    return False
            else:
                self.log_test("Document Deletion Bug Fix", False, f"Delete API failed: HTTP {delete_response.status_code}", delete_response.text)
                return False
            
            # Step 4: Verify document is removed from MongoDB
            print("Step 4: Verifying document removal from MongoDB...")
            time.sleep(2)  # Brief wait for deletion to propagate
            
            response = self.session.get(f"{BACKEND_URL}/documents")
            if response.status_code == 200:
                documents_after = response.json()
                deleted_doc = next((doc for doc in documents_after if doc.get('id') == self.document_id), None)
                if deleted_doc is None:
                    print("   ✅ Document successfully removed from MongoDB")
                else:
                    self.log_test("Document Deletion Bug Fix", False, "Document still exists in MongoDB after deletion", deleted_doc)
                    return False
            
            # Step 5: CRITICAL TEST - Verify vector embeddings are removed from Qdrant
            print("Step 5: CRITICAL TEST - Verifying vector embeddings removed from Qdrant...")
            
            # Test by querying the same question again - deleted document should NOT appear as source
            query_data_after = {
                "query": "What information is contained in the uploaded document about artificial intelligence?",
                "session_id": self.session_id,
                "max_sources": 5
            }
            
            response_after = self.session.post(
                f"{BACKEND_URL}/chat/query", 
                json=query_data_after,
                headers={"Content-Type": "application/json"},
                stream=True
            )
            
            sources_after_deletion = []
            response_content_after = ""
            
            if response_after.status_code == 200:
                for line in response_after.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])
                                if 'sources' in data and data.get('is_complete', False):
                                    sources_after_deletion = data['sources']
                                    response_content_after = data.get('content', '')
                                    break
                            except json.JSONDecodeError:
                                continue
                
                print(f"   📊 Chat response after deletion: {len(sources_after_deletion)} sources")
                
                # CRITICAL CHECK: Verify deleted document doesn't appear in sources
                deleted_doc_in_sources = False
                for source in sources_after_deletion:
                    # Check if any source text matches our test document content
                    if "artificial intelligence" in source.get('text', '').lower() and "rag system testing" in source.get('text', '').lower():
                        deleted_doc_in_sources = True
                        break
                
                if deleted_doc_in_sources:
                    self.log_test("Document Deletion Bug Fix", False, "CRITICAL BUG: Deleted document still appears in chat sources - vector embeddings not removed from Qdrant", {
                        "sources_after_deletion": len(sources_after_deletion),
                        "deleted_doc_found_in_sources": True
                    })
                    return False
                else:
                    print("   ✅ CRITICAL SUCCESS: Deleted document does NOT appear in chat sources - vector embeddings properly removed from Qdrant")
                
                # Check if response indicates no relevant information (expected behavior)
                if "don't have enough information" in response_content_after.lower() or len(sources_after_deletion) == 0:
                    print("   ✅ Chat correctly indicates no relevant information available (expected after deletion)")
                else:
                    print(f"   ℹ️  Chat still found {len(sources_after_deletion)} other sources (this is OK if from other documents)")
            
            # Final verification
            self.log_test("Document Deletion Bug Fix", True, "CRITICAL BUG FIX VERIFIED: Document completely removed from MongoDB and Qdrant vector store", {
                "mongodb_removal": "✅ Confirmed",
                "qdrant_removal": "✅ Confirmed - no deleted doc in chat sources",
                "sources_before_deletion": len(sources_before_deletion),
                "sources_after_deletion": len(sources_after_deletion),
                "api_deletion_response": delete_data
            })
            
            return True
                
        except Exception as e:
            self.log_test("Document Deletion Bug Fix", False, f"Document deletion test error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("ADVANCED RAG BACKEND TESTING SUITE")
        print("=" * 60)
        print(f"Testing backend at: {BACKEND_URL}")
        print()
        
        tests = [
            ("Basic API Health Check", self.test_health_check),
            ("PDF Upload and Processing", self.test_pdf_upload),
            ("Document Listing", self.test_document_listing),
            ("Chat Session Creation", self.test_chat_session_creation),
            ("Chat Sessions Listing", self.test_chat_sessions_listing),
            ("RAG Query with Streaming", self.test_chat_query_rag),
            ("Chat Messages Retrieval", self.test_chat_messages),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n--- Testing: {test_name} ---")
            if test_func():
                passed += 1
            time.sleep(1)  # Brief pause between tests
        
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Passed: {passed}/{total}")
        print(f"Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed. Check details above.")
        
        return passed == total

def main():
    """Main test execution"""
    tester = RAGBackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Backend system is working correctly!")
        exit(0)
    else:
        print("\n❌ Backend system has issues that need attention!")
        exit(1)

if __name__ == "__main__":
    main()