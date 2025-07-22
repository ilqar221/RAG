#!/usr/bin/env python3
"""
Direct test of the backend API to check raw similarity scores
"""

import requests
import json

BACKEND_URL = "https://a9be135f-dd08-4c26-8513-6540db735944.preview.emergentagent.com/api"

def test_raw_scores():
    """Test to see raw similarity scores without threshold"""
    session = requests.Session()
    
    # Create a session
    data = {"session_name": "Raw Score Test"}
    response = session.post(f"{BACKEND_URL}/chat/session", params=data)
    
    if response.status_code != 200:
        print("Failed to create session")
        return
    
    session_id = response.json()['id']
    print(f"Created session: {session_id}")
    
    # Test with a query that should match
    query_data = {
        "query": "artificial intelligence",
        "session_id": session_id,
        "max_sources": 3
    }
    
    print(f"\nTesting query: '{query_data['query']}'")
    
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
            
            print(f"Response content length: {len(response_content)}")
            print(f"Sources found: {len(sources)}")
            
            if "don't have enough information" in response_content.lower():
                print("❌ Got 'no information' response")
            else:
                print("✅ Got valid response")
                
            for i, source in enumerate(sources, 1):
                score = source.get('similarity_score', 'N/A')
                print(f"Source {i} score: {score}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_raw_scores()