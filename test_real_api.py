#!/usr/bin/env python3
"""
Test script for the real Whisper + Ollama API
Run this after starting the Flask server
"""

import requests
import json
import os

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_text_processing():
    """Test text processing endpoint"""
    print("📝 Testing text processing...")
    data = {"text": "This is a test note about project requirements and timeline."}
    response = requests.post(f"{BASE_URL}/api/process-text", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_text_processing_custom_model():
    """Test text processing with custom model"""
    print("📝 Testing text processing with custom model...")
    data = {
        "text": "This is another test note about software development best practices.",
        "summ_model": "llama3.1:8b"  # Custom model
    }
    response = requests.post(f"{BASE_URL}/api/process-text", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_audio_processing():
    """Test audio processing endpoint (requires audio file)"""
    print("🎵 Testing audio processing...")
    
    # Check if test audio file exists
    test_audio = "test_voice.wav"
    if not os.path.exists(test_audio):
        print(f"❌ Test audio file '{test_audio}' not found")
        print("   Create a test audio file or update the path")
        return
    
    with open(test_audio, 'rb') as f:
        files = {'audio': f}
        data = {
            'whisper_model': 'large-v3',  # Custom Whisper model
            'summ_model': 'qwen3:0.6b'  # Custom summary model
        }
        response = requests.post(f"{BASE_URL}/api/process-audio", files=files, data=data)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_audio_processing_firered():
    """Test audio processing with FireRedASR"""
    print("🎵 Testing audio processing with FireRedASR...")
    
    # Check if test audio file exists
    test_audio = "test_voice.wav"
    if not os.path.exists(test_audio):
        print(f"❌ Test audio file '{test_audio}' not found")
        print("   Create a test audio file or update the path")
        return
    
    with open(test_audio, 'rb') as f:
        files = {'audio': f}
        data = {
            'asr_model': 'firered',  # Use FireRedASR
            'summ_model': 'qwen3:0.6b'  # Custom summary model
        }
        response = requests.post(f"{BASE_URL}/api/process-audio", files=files, data=data)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_audio_processing_whisper():
    """Test audio processing with Whisper (explicit)"""
    print("🎵 Testing audio processing with Whisper...")
    
    # Check if test audio file exists
    test_audio = "test_voice.wav"
    if not os.path.exists(test_audio):
        print(f"❌ Test audio file '{test_audio}' not found")
        print("   Create a test audio file or update the path")
        return
    
    with open(test_audio, 'rb') as f:
        files = {'audio': f}
        data = {
            'asr_model': 'whisper',  # Use Whisper explicitly
            'whisper_model': 'base',  # Custom Whisper model size
            'summ_model': 'qwen3:0.6b'  # Custom summary model
        }
        response = requests.post(f"{BASE_URL}/api/process-audio", files=files, data=data)
    
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
            elif note['type'] == 'audio':
                print(f"Download audio: {BASE_URL}/api/download/{note['id']}/audio")
                print(f"Download transcript: {BASE_URL}/api/download/{note['id']}/transcript")
                print(f"Download summary: {BASE_URL}/api/download/{note['id']}/summary")
            print()

def print_curl_examples():
    """Print example curl commands"""
    print("🔄 Example CURL Commands:")
    print("=" * 50)
    
    print("\n1. Process Text (default model):")
    print("curl -X POST http://localhost:5000/api/process-text \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -d '{\"text\": \"Your text here\"}'")
    
    print("\n2. Process Text (custom model):")
    print("curl -X POST http://localhost:5000/api/process-text \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -d '{\"text\": \"Your text here\", \"summ_model\": \"llama3.1:8b\"}'")
    
    print("\n3. Process Audio (default Whisper):")
    print("curl -X POST http://localhost:5000/api/process-audio \\")
    print("  -F 'audio=@your_audio.wav'")
    
    print("\n4. Process Audio (Whisper with custom model):")
    print("curl -X POST http://localhost:5000/api/process-audio \\")
    print("  -F 'audio=@your_audio.wav' \\")
    print("  -F 'asr_model=whisper' \\")
    print("  -F 'whisper_model=base' \\")
    print("  -F 'summ_model=mistral:7b'")
    
    print("\n5. Process Audio (FireRedASR):")
    print("curl -X POST http://localhost:5000/api/process-audio \\")
    print("  -F 'audio=@your_audio.wav' \\")
    print("  -F 'asr_model=firered' \\")
    print("  -F 'summ_model=qwen3:0.6b'")
    
    print("\n6. Health Check:")
    print("curl http://localhost:5000/health")
    
    print("\n7. List Notes:")
    print("curl http://localhost:5000/api/notes")
    
    print("\n8. Download Transcript:")
    print("curl http://localhost:5000/api/download/{note_id}/transcript")
    
    print("\n9. Download Summary:")
    print("curl http://localhost:5000/api/download/{note_id}/summary")

if __name__ == "__main__":
    print("🧪 Testing Real Whisper + Ollama API...")
    print("Make sure the Flask server is running on http://localhost:5000")
    print("Make sure Ollama is running with available models")
    print("=" * 60)
    
    try:
        # test_health()
        # test_text_processing()
        # test_text_processing_custom_model()
        test_audio_processing()
        # test_audio_processing_whisper()
        # test_audio_processing_firered()
        # test_notes_listing()
        # test_download_links()
        
        print("✅ All tests completed!")
        
        print_curl_examples()
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Make sure the Flask server is running.")
        print("Run: python api_server.py")
    except Exception as e:
        print(f"❌ Test failed: {e}")
