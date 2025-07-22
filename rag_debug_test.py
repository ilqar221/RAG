#!/usr/bin/env python3
"""
RAG Pipeline Debug Test
Comprehensive debugging of the RAG pipeline to identify why queries return "I don't have enough information"
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

class RAGPipelineDebugger:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {}
        self.session_id = None
        self.document_id = None
        
    def log_debug(self, step, success, message, details=None):
        """Log debug results"""
        status = "✅" if success else "❌"
        print(f"{status} {step}: {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
        
        self.test_results[step] = {
            "success": success,
            "message": message,
            "details": details
        }
    
    def create_test_pdf(self, content="This document discusses artificial intelligence and machine learning concepts. AI systems use neural networks to process data. Machine learning algorithms can identify patterns in large datasets. Natural language processing enables computers to understand human language."):
        """Create a test PDF with specific content for debugging"""
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add content to PDF
        p.drawString(100, 750, "RAG System Debug Test Document")
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
    
    def debug_step_1_upload(self):
        """Debug Step 1: Document Upload"""
        print("\n🔍 DEBUG STEP 1: Document Upload and Initial Processing")
        
        try:
            # Create test PDF with specific content
            pdf_content = self.create_test_pdf()
            
            # Upload PDF
            files = {
                'file': ('debug_test.pdf', pdf_content, 'application/pdf')
            }
            
            response = self.session.post(f"{BACKEND_URL}/upload-document", files=files)
            
            if response.status_code == 200:
                data = response.json()
                self.document_id = data.get('document_id')
                
                self.log_debug("Document Upload", True, "PDF uploaded successfully", {
                    "document_id": self.document_id,
                    "filename": data.get('filename'),
                    "page_count": data.get('page_count'),
                    "language": data.get('language'),
                    "initial_status": data.get('status')
                })
                return True
            else:
                self.log_debug("Document Upload", False, f"Upload failed: HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_debug("Document Upload", False, f"Upload error: {str(e)}")
            return False
    
    def debug_step_2_processing_status(self):
        """Debug Step 2: Document Processing Status"""
        print("\n🔍 DEBUG STEP 2: Document Processing Status Check")
        
        if not self.document_id:
            self.log_debug("Processing Status", False, "No document ID available")
            return False
        
        try:
            # Wait for processing and check status multiple times
            max_attempts = 10
            for attempt in range(max_attempts):
                print(f"   Checking processing status (attempt {attempt + 1}/{max_attempts})...")
                
                response = self.session.get(f"{BACKEND_URL}/documents")
                
                if response.status_code == 200:
                    documents = response.json()
                    test_doc = next((doc for doc in documents if doc.get('id') == self.document_id), None)
                    
                    if test_doc:
                        status = test_doc.get('status', 'unknown')
                        chunk_count = test_doc.get('chunk_count', 0)
                        
                        print(f"   Status: {status}, Chunks: {chunk_count}")
                        
                        if status == 'completed' and chunk_count > 0:
                            self.log_debug("Processing Status", True, f"Document processed successfully", {
                                "status": status,
                                "chunk_count": chunk_count,
                                "processing_time_seconds": (attempt + 1) * 2
                            })
                            return True
                        elif status == 'failed':
                            self.log_debug("Processing Status", False, "Document processing failed", test_doc)
                            return False
                        elif attempt == max_attempts - 1:
                            self.log_debug("Processing Status", False, f"Processing timeout - still {status} after {max_attempts * 2} seconds", test_doc)
                            return False
                    else:
                        self.log_debug("Processing Status", False, "Document not found in listing")
                        return False
                else:
                    self.log_debug("Processing Status", False, f"Failed to get documents: HTTP {response.status_code}")
                    return False
                
                time.sleep(2)  # Wait 2 seconds between checks
            
        except Exception as e:
            self.log_debug("Processing Status", False, f"Status check error: {str(e)}")
            return False
    
    def debug_step_3_create_session(self):
        """Debug Step 3: Create Chat Session"""
        print("\n🔍 DEBUG STEP 3: Chat Session Creation")
        
        try:
            data = {"session_name": "RAG Debug Session"}
            response = self.session.post(f"{BACKEND_URL}/chat/session", params=data)
            
            if response.status_code == 200:
                session_data = response.json()
                self.session_id = session_data.get('id')
                
                self.log_debug("Session Creation", True, "Chat session created", {
                    "session_id": self.session_id,
                    "session_name": session_data.get('session_name')
                })
                return True
            else:
                self.log_debug("Session Creation", False, f"Session creation failed: HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_debug("Session Creation", False, f"Session creation error: {str(e)}")
            return False
    
    def debug_step_4_simple_query(self):
        """Debug Step 4: Simple Query Test"""
        print("\n🔍 DEBUG STEP 4: Simple Query Test")
        
        if not self.session_id:
            self.log_debug("Simple Query", False, "No session ID available")
            return False
        
        try:
            # Test with a very simple query that should match our document content
            query_data = {
                "query": "What is artificial intelligence?",
                "session_id": self.session_id,
                "max_sources": 5
            }
            
            print(f"   Sending query: {query_data['query']}")
            
            response = self.session.post(
                f"{BACKEND_URL}/chat/query", 
                json=query_data,
                headers={"Content-Type": "application/json"},
                stream=True
            )
            
            if response.status_code == 200:
                response_content = ""
                sources = []
                confidence = 0
                
                print("   Processing streaming response...")
                
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])
                                if 'content' in data:
                                    response_content = data['content']
                                    sources = data.get('sources', [])
                                    confidence = data.get('confidence', 0)
                                    
                                    if data.get('is_complete', False):
                                        break
                            except json.JSONDecodeError as e:
                                print(f"   JSON decode error: {e}")
                                continue
                
                # Analyze the response
                is_no_info_response = "don't have enough information" in response_content.lower()
                
                if is_no_info_response:
                    self.log_debug("Simple Query", False, "CRITICAL ISSUE: Got 'no information' response", {
                        "response_content": response_content,
                        "sources_count": len(sources),
                        "confidence": confidence,
                        "query": query_data['query']
                    })
                    return False
                else:
                    self.log_debug("Simple Query", True, "Query returned valid response", {
                        "response_length": len(response_content),
                        "sources_count": len(sources),
                        "confidence": confidence,
                        "response_preview": response_content[:200] + "..." if len(response_content) > 200 else response_content
                    })
                    return True
            else:
                self.log_debug("Simple Query", False, f"Query failed: HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_debug("Simple Query", False, f"Query error: {str(e)}")
            return False
    
    def debug_step_5_vector_search_test(self):
        """Debug Step 5: Vector Search Functionality Test"""
        print("\n🔍 DEBUG STEP 5: Vector Search Functionality Test")
        
        # Test multiple queries with different complexity
        test_queries = [
            "artificial intelligence",
            "machine learning",
            "neural networks",
            "What is AI?",
            "Tell me about machine learning algorithms"
        ]
        
        successful_queries = 0
        
        for i, query in enumerate(test_queries, 1):
            print(f"   Testing query {i}/{len(test_queries)}: '{query}'")
            
            try:
                query_data = {
                    "query": query,
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
                    response_content = ""
                    sources = []
                    
                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')
                            if line_str.startswith('data: '):
                                try:
                                    data = json.loads(line_str[6:])
                                    if 'content' in data and data.get('is_complete', False):
                                        response_content = data['content']
                                        sources = data.get('sources', [])
                                        break
                                except json.JSONDecodeError:
                                    continue
                    
                    is_no_info_response = "don't have enough information" in response_content.lower()
                    
                    if not is_no_info_response and len(sources) > 0:
                        successful_queries += 1
                        print(f"     ✅ Success: {len(sources)} sources found")
                    else:
                        print(f"     ❌ Failed: No information response or no sources")
                
                time.sleep(1)  # Brief pause between queries
                
            except Exception as e:
                print(f"     ❌ Error: {str(e)}")
        
        success_rate = successful_queries / len(test_queries)
        
        if success_rate >= 0.6:  # At least 60% success rate
            self.log_debug("Vector Search Test", True, f"Vector search working", {
                "successful_queries": successful_queries,
                "total_queries": len(test_queries),
                "success_rate": f"{success_rate:.1%}"
            })
            return True
        else:
            self.log_debug("Vector Search Test", False, f"Vector search failing", {
                "successful_queries": successful_queries,
                "total_queries": len(test_queries),
                "success_rate": f"{success_rate:.1%}"
            })
            return False
    
    def debug_step_6_backend_logs(self):
        """Debug Step 6: Check Backend Logs for Errors"""
        print("\n🔍 DEBUG STEP 6: Backend Logs Analysis")
        
        try:
            # This is a placeholder - in a real environment, we'd check actual logs
            # For now, we'll make a test query and analyze the response structure
            
            query_data = {
                "query": "Debug test query to check backend processing",
                "session_id": self.session_id,
                "max_sources": 1
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/chat/query", 
                json=query_data,
                headers={"Content-Type": "application/json"},
                stream=True,
                timeout=30
            )
            
            if response.status_code == 200:
                # Check response headers and structure
                headers = dict(response.headers)
                
                response_data = []
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])
                                response_data.append(data)
                            except json.JSONDecodeError:
                                pass
                
                self.log_debug("Backend Logs", True, "Backend responding correctly", {
                    "response_headers": headers,
                    "streaming_chunks": len(response_data),
                    "final_response": response_data[-1] if response_data else None
                })
                return True
            else:
                self.log_debug("Backend Logs", False, f"Backend error: HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_debug("Backend Logs", False, f"Backend communication error: {str(e)}")
            return False
    
    def run_debug_pipeline(self):
        """Run complete RAG pipeline debug"""
        print("=" * 80)
        print("RAG PIPELINE COMPREHENSIVE DEBUG")
        print("=" * 80)
        print(f"Testing backend at: {BACKEND_URL}")
        print()
        
        debug_steps = [
            ("Document Upload", self.debug_step_1_upload),
            ("Processing Status", self.debug_step_2_processing_status),
            ("Session Creation", self.debug_step_3_create_session),
            ("Simple Query Test", self.debug_step_4_simple_query),
            ("Vector Search Test", self.debug_step_5_vector_search_test),
            ("Backend Communication", self.debug_step_6_backend_logs),
        ]
        
        passed = 0
        total = len(debug_steps)
        failed_at_step = None
        
        for step_name, step_func in debug_steps:
            print(f"\n{'='*20} {step_name} {'='*20}")
            if step_func():
                passed += 1
            else:
                if failed_at_step is None:
                    failed_at_step = step_name
                # Continue with remaining steps to get full picture
            time.sleep(1)
        
        print("\n" + "=" * 80)
        print("RAG PIPELINE DEBUG SUMMARY")
        print("=" * 80)
        print(f"Passed: {passed}/{total}")
        print(f"Failed: {total - passed}/{total}")
        
        if failed_at_step:
            print(f"🚨 CRITICAL ISSUE IDENTIFIED AT: {failed_at_step}")
        
        if passed == total:
            print("🎉 RAG PIPELINE IS WORKING CORRECTLY!")
            print("   The 'no information' issue may be due to:")
            print("   - Query not matching document content semantically")
            print("   - Document processing timing issues")
            print("   - Gemini API rate limiting")
        else:
            print("⚠️  RAG PIPELINE HAS ISSUES!")
            print(f"   First failure at: {failed_at_step}")
            
            # Provide specific recommendations based on where it failed
            if failed_at_step == "Document Upload":
                print("   RECOMMENDATION: Check file upload endpoint and PDF processing")
            elif failed_at_step == "Processing Status":
                print("   RECOMMENDATION: Check document chunking and embedding creation")
            elif failed_at_step == "Session Creation":
                print("   RECOMMENDATION: Check MongoDB connection and session management")
            elif failed_at_step == "Simple Query Test":
                print("   RECOMMENDATION: Check vector search and Qdrant integration")
            elif failed_at_step == "Vector Search Test":
                print("   RECOMMENDATION: Check embedding model and similarity search")
            elif failed_at_step == "Backend Communication":
                print("   RECOMMENDATION: Check Gemini API integration and streaming")
        
        return passed == total

def main():
    """Main debug execution"""
    debugger = RAGPipelineDebugger()
    success = debugger.run_debug_pipeline()
    
    if success:
        print("\n✅ RAG pipeline is functioning correctly!")
        print("   If users still get 'no information' responses, check:")
        print("   - Document content relevance to queries")
        print("   - Gemini API quotas and rate limits")
        print("   - Query phrasing and semantic matching")
    else:
        print("\n❌ RAG pipeline has critical issues that need fixing!")
        print("   Check the debug output above for specific failure points.")
    
    return success

if __name__ == "__main__":
    main()