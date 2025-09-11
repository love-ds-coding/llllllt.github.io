#!/usr/bin/env python3
"""
Minimal Local API Server for Voice Notes
- Accepts audio files or text input
- Returns transcript (Whisper) and summary (Ollama) 
- Exposes download/view links
- Desktop/laptop only, localhost only
"""

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import os
import uuid
import json
from datetime import datetime
import base64
import whisper
import hashlib
from werkzeug.utils import secure_filename

# Import ASR engines
try:
    from firered_engine import FireRedEngine
    FIRERED_AVAILABLE = True
except ImportError:
    FIRERED_AVAILABLE = False
    print("⚠️ FireRedASR not available. Only Whisper will be supported.")

app = Flask(__name__)

# Allow CORS for the hosted origin (your HTML file)
CORS(app, origins=["http://localhost:*", "file://*", "http://127.0.0.1:*", "*"])

# Simple in-memory storage (replace with file/database in production)
STORAGE_DIR = "voice_notes_storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Mock data storage
notes_db = {}

RECORDED_VIDEO_DIR = "recorded_video"
os.makedirs(RECORDED_VIDEO_DIR, exist_ok=True)

# Global ASR engines (lazy loading)
whisper_models = {}
firered_engine = None

def get_asr_engine(asr_model: str = "whisper", whisper_model_size: str = "tiny"):
    """
    Get ASR engine instance with lazy loading
    
    Args:
        asr_model: "whisper" or "firered"
        whisper_model_size: Whisper model size (tiny, base, small, medium, large-v3)
    
    Returns:
        ASR engine instance
    """
    global whisper_models, firered_engine
    
    if asr_model == "whisper":
        if whisper_model_size not in whisper_models:
            print(f"🎤 Loading Whisper model: {whisper_model_size}")
            whisper_models[whisper_model_size] = whisper.load_model(whisper_model_size)
        return whisper_models[whisper_model_size]
    
    elif asr_model == "firered":
        if not FIRERED_AVAILABLE:
            raise Exception("FireRedASR not available. Please install FireRedASR and download models.")
        
        if firered_engine is None:
            print("🎤 Loading FireRedASR model...")
            firered_engine = FireRedEngine()
        return firered_engine
    
    else:
        raise ValueError(f"Unsupported ASR model: {asr_model}")

def transcribe_audio(audio_path: str, asr_model: str = "whisper", whisper_model_size: str = "tiny") -> dict:
    """
    Transcribe audio using the specified ASR model
    
    Args:
        audio_path: Path to audio file
        asr_model: "whisper" or "firered"
        whisper_model_size: Whisper model size
    
    Returns:
        Dictionary with transcription results
    """
    if asr_model == "whisper":
        model = get_asr_engine("whisper", whisper_model_size)
        print("🎵 Transcribing with Whisper...")
        result = model.transcribe(audio_path)
        return {
            "text": result["text"].strip(),
            "model": f"whisper-{whisper_model_size}",
            "engine": "whisper"
        }
    
    elif asr_model == "firered":
        engine = get_asr_engine("firered")
        print("🎵 Transcribing with FireRedASR...")
        result = engine.transcribe(audio_path)
        return {
            "text": result["text"],
            "model": result["model"],
            "engine": result["engine"]
        }
    
    else:
        raise ValueError(f"Unsupported ASR model: {asr_model}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/api/process-audio', methods=['POST'])
def process_audio():
    """Process audio file and return transcript + summary"""
    try:
        # Get audio file from request
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400
        
        # Get optional parameters
        user_prompt = request.form.get('user_prompt', '')
        asr_model = request.form.get('asr_model', 'whisper')  # Default to whisper for backward compatibility
        whisper_model_size = request.form.get('whisper_model', 'tiny')  # Whisper model size
        summ_model = request.form.get('summ_model', 'qwen3:0.6b')  # Summary model
        
        default_prompt = "Summarize this transcript in 2-3 sentences"
        
        # Validate ASR model
        if asr_model not in ['whisper', 'firered']:
            return jsonify({"error": f"Unsupported ASR model: {asr_model}. Use 'whisper' or 'firered'."}), 400
        
        # Generate unique ID for this note
        note_id = str(uuid.uuid4())
        
        # Save audio file
        audio_path = os.path.join(STORAGE_DIR, f"{note_id}.wav")
        audio_file.save(audio_path)
        
        # Transcribe audio using selected ASR model
        print(f"🎤 Using ASR model: {asr_model}")
        transcription_result = transcribe_audio(audio_path, asr_model, whisper_model_size)
        real_transcript = transcription_result["text"]
        
        # Print the transcribed text for debugging
        print(f"📝 Transcribed text: {real_transcript}")
        
        # Real summary using Ollama with better error handling
        print(" Generating summary with Ollama...")
        import requests
        
        try:
            # Use custom prompt if provided, otherwise use default
            if user_prompt:
                prompt = f"{user_prompt}\n\nTranscript: {real_transcript}"
                print(f"🔍 Using custom prompt: {user_prompt}")
            else:
                prompt = f"{default_prompt}: {real_transcript}"
                print(f"🔍 Using default prompt: {default_prompt}")
            
            ollama_response = requests.post("http://localhost:11434/api/generate", json={
                "model": summ_model,
                "prompt": prompt,
                "stream": False
            })
            
            # Print full response for debugging
            print(f"🔍 Ollama response status: {ollama_response.status_code}")
            print(f"🔍 Ollama response headers: {ollama_response.headers}")
            print(f"🔍 Ollama response text: {ollama_response.text}")
            
            if ollama_response.status_code != 200:
                print(f"❌ Ollama API error: {ollama_response.status_code} - {ollama_response.text}")
                raise Exception(f"Ollama API returned status {ollama_response.status_code}")
            
            ollama_json = ollama_response.json()
            print(f"🔍 Ollama JSON response: {ollama_json}")
            
            if "response" not in ollama_json:
                print(f"❌ Missing 'response' key in Ollama response. Available keys: {list(ollama_json.keys())}")
                raise Exception("Ollama response missing 'response' key")
            
            real_summary = ollama_json["response"]
            print(f"✅ Generated summary: {real_summary}")
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error calling Ollama: {e}")
            raise Exception(f"Failed to connect to Ollama: {e}")
        except ValueError as e:
            print(f"❌ JSON parsing error: {e}")
            print(f" Raw response: {ollama_response.text}")
            raise Exception(f"Invalid JSON response from Ollama: {e}")
        except Exception as e:
            print(f"❌ Unexpected error with Ollama: {e}")
            raise Exception(f"Ollama processing failed: {e}")
        
        # Create note record
        note_data = {
            "id": note_id,
            "timestamp": datetime.now().isoformat(),
            "type": "audio",
            "audio_path": audio_path,
            "transcript": real_transcript,
            "summary": real_summary,
            "duration": "00:00:15",  # You could calculate real duration here
            "file_size": os.path.getsize(audio_path),
            "asr_model": transcription_result["model"],
            "asr_engine": transcription_result["engine"],
            "summ_model": summ_model
        }
        
        # Store in memory (replace with persistent storage)
        notes_db[note_id] = note_data
        
        return jsonify({
            "success": True,
            "note_id": note_id,
            "transcript": real_transcript,
            "summary": real_summary,
            "asr_model_used": transcription_result["model"],
            "asr_engine_used": transcription_result["engine"],
            "summ_model_used": summ_model,
            "download_links": {
                "audio": f"/api/download/{note_id}/audio",
                "transcript": f"/api/download/{note_id}/transcript",
                "summary": f"/api/download/{note_id}/summary"
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Process text input and return summary"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        summ_model = data.get('summ_model', 'qwen3:0.6b')  # Default summary model
        note_id = str(uuid.uuid4())
        
        # Real summary using Ollama
        print(f"🔍 Generating summary with model: {summ_model}")
        import requests
        
        try:
            prompt = f"Summarize this text in 2-3 sentences: {text}"
            
            ollama_response = requests.post("http://localhost:11434/api/generate", json={
                "model": summ_model,
                "prompt": prompt,
                "stream": False
            })
            
            if ollama_response.status_code != 200:
                raise Exception(f"Ollama API returned status {ollama_response.status_code}")
            
            ollama_json = ollama_response.json()
            if "response" not in ollama_json:
                raise Exception("Ollama response missing 'response' key")
            
            real_summary = ollama_json["response"]
            print(f"✅ Generated summary: {real_summary}")
            
        except Exception as e:
            print(f"❌ Error with Ollama: {e}")
            # Fallback to mock summary
            real_summary = f"Mock summary of text input: {text[:50]}{'...' if len(text) > 50 else ''}"
        
        # Create note record
        note_data = {
            "id": note_id,
            "timestamp": datetime.now().isoformat(),
            "type": "text",
            "text": text,
            "summary": real_summary,
            "word_count": len(text.split()),
            "summ_model": summ_model
        }
        
        # Store in memory
        notes_db[note_id] = note_data
        
        return jsonify({
            "success": True,
            "note_id": note_id,
            "summary": real_summary,
            "summ_model_used": summ_model,
            "download_links": {
                "text": f"/api/download/{note_id}/text",
                "summary": f"/api/download/{note_id}/summary"
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload-recording', methods=['POST'])
def upload_recording():
    """Upload and save recorded webcam video"""
    try:
        # Validate request
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        # Validate file type
        if not video_file.content_type or not video_file.content_type.startswith('video/'):
            return jsonify({"error": "Invalid file type. Video files only."}), 400
        
        # Generate collision-safe filename
        # Use timestamp + hash of content for uniqueness
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Read file content to generate hash
        file_content = video_file.read()
        file_hash = hashlib.md5(file_content).hexdigest()[:8]
        
        # Determine file extension from content type
        content_type_to_ext = {
            'video/webm': '.webm',
            'video/mp4': '.mp4',
            'video/avi': '.avi',
            'video/mov': '.mov',
            'video/quicktime': '.mov'
        }
        file_ext = content_type_to_ext.get(video_file.content_type, '.webm')
        
        # Create unique filename
        filename = f"recording_{timestamp}_{file_hash}{file_ext}"
        file_path = os.path.join(RECORDED_VIDEO_DIR, filename)
        
        # Reset file pointer and save
        video_file.seek(0)
        video_file.save(file_path)
        
        # Verify file was saved
        if not os.path.exists(file_path):
            return jsonify({"error": "Failed to save video file"}), 500
        
        # Get file size for response
        file_size = os.path.getsize(file_path)
        
        # Return success response with file info
        return jsonify({
            "success": True,
            "filename": filename,
            "file_path": file_path,
            "file_url": f"/api/recorded-video/{filename}",
            "file_size": file_size,
            "content_type": video_file.content_type,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/api/recorded-video/<filename>', methods=['GET'])
def serve_recorded_video(filename):
    """Serve recorded video files"""
    try:
        # Security: ensure filename is safe and exists
        safe_filename = secure_filename(filename)
        if safe_filename != filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        file_path = os.path.join(RECORDED_VIDEO_DIR, safe_filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Video not found"}), 404
        
        # Determine content type from file extension
        ext = os.path.splitext(safe_filename)[1].lower()
        content_types = {
            '.webm': 'video/webm',
            '.mp4': 'video/mp4',
            '.avi': 'video/avi',
            '.mov': 'video/quicktime'
        }
        content_type = content_types.get(ext, 'video/webm')
        
        return send_file(file_path, mimetype=content_type)
        
    except Exception as e:
        return jsonify({"error": f"Failed to serve video: {str(e)}"}), 500

@app.route('/api/recorded-videos', methods=['GET'])
def list_recorded_videos():
    """List all recorded videos"""
    try:
        videos = []
        for filename in os.listdir(RECORDED_VIDEO_DIR):
            if os.path.isfile(os.path.join(RECORDED_VIDEO_DIR, filename)):
                file_path = os.path.join(RECORDED_VIDEO_DIR, filename)
                file_stat = os.stat(file_path)
                
                videos.append({
                    "filename": filename,
                    "file_url": f"/api/recorded-video/{filename}",
                    "file_size": file_stat.st_size,
                    "created": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat()
                })
        
        # Sort by creation time (newest first)
        videos.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({
            "success": True,
            "videos": videos,
            "count": len(videos)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to list videos: {str(e)}"}), 500

@app.route('/api/download/<note_id>/<file_type>', methods=['GET'])
def download_file(note_id, file_type):
    """Download various file types for a note"""
    if note_id not in notes_db:
        return jsonify({"error": "Note not found"}), 404
    
    note = notes_db[note_id]
    
    try:
        if file_type == "audio" and note["type"] == "audio":
            return send_file(note["audio_path"], as_attachment=True)
        
        elif file_type == "transcript" and note["type"] == "audio":
            transcript_content = note["transcript"]
            # Fix: Properly encode the transcript content with UTF-8
            return Response(
                transcript_content.encode('utf-8'),
                mimetype='text/plain; charset=utf-8',
                headers={'Content-Disposition': 'inline'}
            )
        
        elif file_type == "summary":
            summary_content = note["summary"]
            # Fix: Properly encode the summary content with UTF-8
            return Response(
                summary_content.encode('utf-8'),
                mimetype='text/plain; charset=utf-8',
                headers={'Content-Disposition': 'inline'}
            )
        
        elif file_type == "text" and note["type"] == "text":
            text_content = note["text"]
            # Fix: Properly encode the text content with UTF-8
            return Response(
                text_content.encode('utf-8'),
                mimetype='text/plain; charset=utf-8',
                headers={'Content-Disposition': 'inline'}
            )
        
        else:
            return jsonify({"error": "Invalid file type"}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes', methods=['GET'])
def list_notes():
    """List all notes"""
    return jsonify({
        "notes": list(notes_db.values()),
        "count": len(notes_db)
    })

@app.route('/api/notes/<note_id>', methods=['GET'])
def get_note(note_id):
    """Get specific note details"""
    if note_id not in notes_db:
        return jsonify({"error": "Note not found"}), 404
    
    return jsonify(notes_db[note_id])

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    if note_id not in notes_db:
        return jsonify({"error": "Note not found"}), 404
    
    note = notes_db[note_id]
    
    # Remove audio file if it exists
    if note["type"] == "audio" and os.path.exists(note["audio_path"]):
        os.remove(note["audio_path"])
    
    # Remove from memory
    del notes_db[note_id]
    
    return jsonify({"success": True, "message": "Note deleted"})

@app.route('/debug/ollama', methods=['GET'])
def debug_ollama():
    """Debug endpoint to test Ollama connection"""
    try:
        import requests
        
        # Test basic connection
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        print(f"🔍 Ollama tags response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            models = response.json().get("models", [])
            available_models = [model["name"] for model in models]
            print(f"🔍 Available models: {available_models}")
            
            return jsonify({
                "status": "connected",
                "models": available_models,
                "response": response.json()
            })
        else:
            return jsonify({
                "status": "error",
                "status_code": response.status_code,
                "response": response.text
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        })

@app.route('/voice-interface')
def voice_interface():
    return send_file('voice_interface.html')

if __name__ == '__main__':
    print("🚀 Starting Voice Notes API Server...")
    print("📍 Server will run on: http://localhost:5000")
    print("🔧 Health check: http://localhost:5000/health")
    print("📝 API endpoints:")
    print("   POST /api/process-audio - Process audio files")
    print("   POST /api/process-text - Process text input")
    print("   POST /api/upload-recording - Upload recorded webcam videos")
    print("   GET  /api/recorded-video/<filename> - Serve recorded videos")
    print("   GET  /api/recorded-videos - List all recorded videos")
    print("   GET  /api/notes - List all notes")
    print("   GET  /api/download/<id>/<type> - Download files")
    print("\n⚠️  This is a mock server - replace Whisper/Ollama calls with real APIs")
    
    app.run(host='localhost', port=5000, debug=True)

