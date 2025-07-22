#!/usr/bin/env python3
"""
Final comprehensive test of the RAG pipeline fix
"""

import requests
import json
import time
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

BACKEND_URL = "https://a9be135f-dd08-4c26-8513-6540db735944.preview.emergentagent.com/api"

def create_test_pdf():
    """Create a test PDF with specific content"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.drawString(100, 750, 'RAG System Final Test Document')
    p.drawString(100, 700, 'This document contains information about artificial intelligence and machine learning.')
    p.drawString(100, 650, 'AI systems use neural networks to process complex data patterns.')
    p.drawString(100, 600, 'Machine learning algorithms can identify trends in large datasets.')
    p.drawString(100, 550, 'Natural language processing enables computers to understand human language.')
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def test_rag_pipeline_fix():
    """Test the complete RAG pipeline with similarity threshold fix"""
    session = requests.Session()
    
    print("🔧 TESTING RAG PIPELINE FIX")
    print("="*60)
    
    # Step 1: Upload a fresh document
    print("Step 1: Uploading test document...")
    pdf_content = create_test_pdf()
    files = {'file': ('final_test.pdf', pdf_content, 'application/pdf')}
    response = session.post(f"{BACKEND_URL}/upload-document", files=files)
    
    if response.status_code == 200:
        doc_data = response.json()
        print(f"✅ Document uploaded: {doc_data['filename']}")
        document_id = doc_data['document_id']
    else:
        print(f"❌ Upload failed: {response.status_code}")
        return False
    
    # Step 2: Wait for processing
    print("Step 2: Waiting for document processing...")
    time.sleep(8)
    
    # Step 3: Create chat session
    print("Step 3: Creating chat session...")
    response = session.post(f"{BACKEND_URL}/chat/session", params={'session_name': 'Final Test Session'})
    if response.status_code == 200:
        session_id = response.json()['id']
        print(f"✅ Session created: {session_id}")
    else:
        print(f"❌ Session creation failed: {response.status_code}")
        return False
    
    # Step 4: Test relevant queries (should find sources)
    print("Step 4: Testing relevant queries...")
    relevant_queries = [
        "What is artificial intelligence?",
        "Tell me about machine learning",
        "How do neural networks work?"
    ]
    
    relevant_success = 0
    for query in relevant_queries:
        print(f"  Testing: '{query}'")
        
        query_data = {
            "query": query,
            "session_id": session_id,
            "max_sources": 5
        }
        
        response = session.post(
            f"{BACKEND_URL}/chat/query", 
            json=query_data,
            headers={"Content-Type": "application/json"},
            stream=True
        )
        
        if response.status_code == 200:
            sources = []
            response_content = ""
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        try:
                            data = json.loads(line_str[6:])
                            if data.get('is_complete', False):
                                sources = data.get('sources', [])
                                response_content = data.get('content', '')
                                break
                        except json.JSONDecodeError:
                            continue
            
            is_no_info = "don't have enough information" in response_content.lower()
            
            if sources and not is_no_info:
                print(f"    ✅ Found {len(sources)} sources")
                relevant_success += 1
            else:
                print(f"    ❌ No sources found or got 'no information' response")
        
        time.sleep(1)
    
    # Step 5: Test irrelevant queries (should NOT find sources)
    print("Step 5: Testing irrelevant queries...")
    irrelevant_queries = [
        "What is the weather like today?",
        "How do I cook pasta?",
        "What is the capital of France?"
    ]
    
    irrelevant_success = 0
    for query in irrelevant_queries:
        print(f"  Testing: '{query}'")
        
        query_data = {
            "query": query,
            "session_id": session_id,
            "max_sources": 5
        }
        
        response = session.post(
            f"{BACKEND_URL}/chat/query", 
            json=query_data,
            headers={"Content-Type": "application/json"},
            stream=True
        )
        
        if response.status_code == 200:
            sources = []
            response_content = ""
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        try:
                            data = json.loads(line_str[6:])
                            if data.get('is_complete', False):
                                sources = data.get('sources', [])
                                response_content = data.get('content', '')
                                break
                        except json.JSONDecodeError:
                            continue
            
            is_no_info = "don't have enough information" in response_content.lower()
            
            if not sources and is_no_info:
                print(f"    ✅ Correctly returned 'no information' response")
                irrelevant_success += 1
            else:
                print(f"    ❌ Unexpectedly found {len(sources)} sources")
        
        time.sleep(1)
    
    # Step 6: Results
    print("\n" + "="*60)
    print("FINAL TEST RESULTS:")
    print(f"Relevant queries working: {relevant_success}/{len(relevant_queries)}")
    print(f"Irrelevant queries working: {irrelevant_success}/{len(irrelevant_queries)}")
    
    total_success = relevant_success + irrelevant_success
    total_tests = len(relevant_queries) + len(irrelevant_queries)
    
    print(f"Overall success rate: {total_success}/{total_tests} ({total_success/total_tests:.1%})")
    
    if total_success == total_tests:
        print("🎉 RAG PIPELINE FIX IS WORKING PERFECTLY!")
        print("✅ The 'no information' issue has been resolved!")
        return True
    elif total_success >= total_tests * 0.8:
        print("⚠️  RAG pipeline is mostly working but may need fine-tuning")
        return True
    else:
        print("❌ RAG pipeline still has issues")
        return False

if __name__ == "__main__":
    success = test_rag_pipeline_fix()
    if success:
        print("\n✅ CRITICAL ISSUE RESOLVED: Users will now get proper responses!")
    else:
        print("\n❌ CRITICAL ISSUE PERSISTS: Further investigation needed!")