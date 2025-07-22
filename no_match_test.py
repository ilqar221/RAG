#!/usr/bin/env python3
"""
Test to reproduce the "no information" issue by testing with queries that don't match existing content
"""

import requests
import json
import time

BACKEND_URL = "https://a9be135f-dd08-4c26-8513-6540db735944.preview.emergentagent.com/api"

def test_no_match_queries():
    """Test queries that should not match existing documents"""
    session = requests.Session()
    
    # Create a session
    data = {"session_name": "No Match Test Session"}
    response = session.post(f"{BACKEND_URL}/chat/session", params=data)
    
    if response.status_code != 200:
        print("Failed to create session")
        return
    
    session_id = response.json()['id']
    print(f"Created session: {session_id}")
    
    # Check what documents exist
    response = session.get(f"{BACKEND_URL}/documents")
    if response.status_code == 200:
        documents = response.json()
        print(f"\nExisting documents ({len(documents)}):")
        for doc in documents:
            print(f"  - {doc['filename']} (chunks: {doc.get('chunk_count', 0)}, status: {doc.get('status')})")
    
    # Test queries that should NOT match existing content
    test_queries = [
        "What is the weather like today?",
        "How do I cook pasta?",
        "Tell me about quantum physics",
        "What is the capital of France?",
        "How to train a dog?",
        "What are the benefits of exercise?",
        "Explain blockchain technology",
        "How to play guitar?",
        "What is photosynthesis?",
        "Tell me about space exploration"
    ]
    
    print(f"\nTesting {len(test_queries)} queries that should NOT match existing documents:")
    
    no_info_responses = 0
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Query: '{query}'")
        
        query_data = {
            "query": query,
            "session_id": session_id,
            "max_sources": 5
        }
        
        try:
            response = session.post(
                f"{BACKEND_URL}/chat/query", 
                json=query_data,
                headers={"Content-Type": "application/json"},
                stream=True,
                timeout=30
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
                
                if is_no_info_response:
                    no_info_responses += 1
                    print(f"   ✅ EXPECTED: Got 'no information' response (sources: {len(sources)})")
                else:
                    print(f"   ⚠️  UNEXPECTED: Got response with {len(sources)} sources")
                    print(f"   Response preview: {response_content[:150]}...")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
        
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        time.sleep(0.5)  # Brief pause
    
    print(f"\n" + "="*60)
    print("RESULTS:")
    print(f"Total queries: {len(test_queries)}")
    print(f"'No information' responses: {no_info_responses}")
    print(f"Unexpected responses: {len(test_queries) - no_info_responses}")
    
    if no_info_responses == len(test_queries):
        print("✅ SYSTEM WORKING CORRECTLY: All unrelated queries returned 'no information'")
    elif no_info_responses == 0:
        print("❌ POTENTIAL ISSUE: No queries returned 'no information' - system may be over-matching")
    else:
        print(f"⚠️  MIXED RESULTS: {no_info_responses}/{len(test_queries)} queries returned 'no information'")

if __name__ == "__main__":
    test_no_match_queries()