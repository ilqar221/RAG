#!/usr/bin/env python3
"""
Test to check similarity scores being returned by the vector search
"""

import requests
import json
import time

BACKEND_URL = "https://a9be135f-dd08-4c26-8513-6540db735944.preview.emergentagent.com/api"

def test_similarity_scores():
    """Test to see what similarity scores are being returned"""
    session = requests.Session()
    
    # Create a session
    data = {"session_name": "Similarity Score Test"}
    response = session.post(f"{BACKEND_URL}/chat/session", params=data)
    
    if response.status_code != 200:
        print("Failed to create session")
        return
    
    session_id = response.json()['id']
    print(f"Created session: {session_id}")
    
    # Test queries with different relevance levels
    test_queries = [
        ("High relevance", "What is artificial intelligence?"),  # Should match debug_test.pdf
        ("Medium relevance", "Tell me about software development"),  # Should match Azerbaijani doc
        ("Low relevance", "What is the weather like?"),  # Should have low scores
        ("Very low relevance", "How to cook pasta?"),  # Should have very low scores
    ]
    
    print(f"\nTesting similarity scores for different query types:")
    
    for relevance_level, query in test_queries:
        print(f"\n{relevance_level}: '{query}'")
        
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
                sources = []
                
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8')
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])
                                if 'sources' in data and data.get('is_complete', False):
                                    sources = data.get('sources', [])
                                    break
                            except json.JSONDecodeError:
                                continue
                
                print(f"   Sources found: {len(sources)}")
                for i, source in enumerate(sources, 1):
                    score = source.get('similarity_score', 'N/A')
                    page = source.get('page_number', 'N/A')
                    text_preview = source.get('text', '')[:100] + "..." if len(source.get('text', '')) > 100 else source.get('text', '')
                    print(f"   {i}. Score: {score:.4f} | Page: {page} | Text: {text_preview}")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
        
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        time.sleep(1)

if __name__ == "__main__":
    test_similarity_scores()