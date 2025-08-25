#!/usr/bin/env python3
"""
Simple test script for the Voice Notes API
Run this after starting the Flask server
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_text_processing():
    """Test text processing endpoint"""
    print("📝 Testing text processing...")
    data = {"text": "This is a test note about project requirements and timeline."}
    response = requests.post(f"{BASE_URL}/api/process-text", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_notes_listing():
    """Test notes listing endpoint"""
    print("📋 Testing notes listing...")
    response = requests.get(f"{BASE_URL}/api/notes")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_download_links():
    """Test download links (will show URLs)"""
    print("🔗 Testing download links...")
    response = requests.get(f"{BASE_URL}/api/notes")
    if response.status_code == 200:
        notes = response.json().get("notes", [])
        if notes:
            note = notes[0]
            print(f"Note ID: {note['id']}")
            print(f"Type: {note['type']}")
            if note['type'] == 'text':
                print(f"Download text: {BASE_URL}/api/download/{note['id']}/text")
                print(f"Download summary: {BASE_URL}/api/download/{note['id']}/summary")
            print()

if __name__ == "__main__":
    print("🧪 Testing Voice Notes API...")
    print("Make sure the Flask server is running on http://localhost:5000")
    print("=" * 50)
    
    try:
        test_health()
        test_text_processing()
        test_notes_listing()
        test_download_links()
        print("✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Make sure the Flask server is running.")
        print("Run: python api_server.py")
    except Exception as e:
        print(f"❌ Test failed: {e}")

