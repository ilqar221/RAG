#!/usr/bin/env python3
"""
Final test to verify the similarity threshold is working correctly
"""

import requests
import json
import time

BACKEND_URL = "https://a9be135f-dd08-4c26-8513-6540db735944.preview.emergentagent.com/api"

def test_threshold_effectiveness():
    """Test both relevant and irrelevant queries"""
    session = requests.Session()
    
    # Create a session
    data = {"session_name": "Threshold Test"}
    response = session.post(f"{BACKEND_URL}/chat/session", params=data)
    
    if response.status_code != 200:
        print("Failed to create session")
        return
    
    session_id = response.json()['id']
    print(f"Created session: {session_id}")
    
    # Test queries
    test_cases = [
        ("RELEVANT", "What is artificial intelligence?", True),
        ("RELEVANT", "Tell me about software development", True),
        ("IRRELEVANT", "What is the weather like?", False),
        ("IRRELEVANT", "How to cook pasta?", False),
        ("IRRELEVANT", "What is the capital of France?", False),
    ]
    
    print(f"\nTesting threshold effectiveness:")
    
    correct_responses = 0
    total_tests = len(test_cases)
    
    for relevance, query, should_have_sources in test_cases:
        print(f"\n{relevance}: '{query}'")
        
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
                
                has_sources = len(sources) > 0
                is_no_info_response = "don't have enough information" in response_content.lower()
                
                if should_have_sources:
                    if has_sources and not is_no_info_response:
                        print(f"   ✅ CORRECT: Found {len(sources)} sources")
                        correct_responses += 1
                    else:
                        print(f"   ❌ INCORRECT: Expected sources but got 'no information' response")
                else:
                    if not has_sources and is_no_info_response:
                        print(f"   ✅ CORRECT: Got 'no information' response (no sources)")
                        correct_responses += 1
                    else:
                        print(f"   ❌ INCORRECT: Expected 'no information' but got {len(sources)} sources")
                        
                # Show similarity scores if available
                if sources:
                    scores = [s.get('similarity_score', 0) for s in sources]
                    print(f"   Similarity scores: {[f'{s:.3f}' for s in scores]}")
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
        
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        time.sleep(1)
    
    print(f"\n" + "="*60)
    print("THRESHOLD TEST RESULTS:")
    print(f"Correct responses: {correct_responses}/{total_tests}")
    print(f"Accuracy: {correct_responses/total_tests:.1%}")
    
    if correct_responses == total_tests:
        print("✅ THRESHOLD IS WORKING PERFECTLY!")
    elif correct_responses >= total_tests * 0.8:
        print("⚠️  THRESHOLD IS MOSTLY WORKING (may need fine-tuning)")
    else:
        print("❌ THRESHOLD NEEDS ADJUSTMENT")

if __name__ == "__main__":
    test_threshold_effectiveness()