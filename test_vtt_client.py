#!/usr/bin/env python3
# pip install requests
"""
Test client for voice→text→summary server
Usage: python test_vtt_client.py --audio /path/to/your_audio.wav
"""

import requests
import argparse
import time
import subprocess
import sys
import os
from urllib.parse import urljoin

def check_server_health(base_url):
    """Check if server is healthy"""
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        return response.status_code == 200 and response.json().get("status") == "healthy"
    except:
        return False

def start_server():
    """Start the API server as a subprocess"""
    print("🚀 Starting API server...")
    process = subprocess.Popen([sys.executable, "api_server.py"])
    
    # Wait for server to be ready
    max_wait = 30
    for i in range(max_wait):
        if check_server_health("http://localhost:5000"):
            print("✅ Server is healthy and ready!")
            return process
        time.sleep(1)
        if i % 5 == 0:
            print(f"⏳ Waiting for server... ({i}/{max_wait}s)")
    
    print("❌ Server failed to start within 30 seconds")
    process.terminate()
    sys.exit(1)

def process_audio_file(base_url, audio_file_path):
    """POST audio file to server and return response"""
    if not os.path.exists(audio_file_path):
        print(f"❌ Audio file not found: {audio_file_path}")
        sys.exit(1)
    
    print(f"📤 Uploading audio file: {audio_file_path}")
    
    with open(audio_file_path, 'rb') as audio_file:
        files = {'audio': audio_file}
        response = requests.post(f"{base_url}/api/process-audio", files=files)
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code} - {response.text}")
        sys.exit(1)
    
    return response.json()

def main():
    parser = argparse.ArgumentParser(description="Test voice→text→summary server")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    args = parser.parse_args()
    
    base_url = "http://localhost:5000"
    server_process = None
    
    try:
        # Check if server is running
        if not check_server_health(base_url):
            print("⚠️  Server not healthy, starting new instance...")
            server_process = start_server()
        else:
            print("✅ Server is already running and healthy")
        
        # Process audio file
        result = process_audio_file(base_url, args.audio)
        
        # Print results
        print("\n📋 Raw JSON Response:")
        print(result)
        
        print("\n📝 Extracted Information:")
        print(f"Summary: {result.get('summary', 'N/A')}")
        
        # Extract URLs from download_links
        download_links = result.get('download_links', {})
        transcript_url = urljoin(base_url, download_links.get('transcript', ''))
        audio_url = urljoin(base_url, download_links.get('audio', ''))
        
        print(f"Transcript URL: {transcript_url}")
        print(f"Audio URL: {audio_url}")
        
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up server process if we started it
        if server_process:
            print("\n🛑 Terminating server process...")
            server_process.terminate()
            server_process.wait()

if __name__ == "__main__":
    main()
