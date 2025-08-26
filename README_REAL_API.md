# Voice Notes API with Real Whisper + Ollama Pipeline

A working local HTTP API that processes audio/text input using real Whisper transcription and Ollama summarization.

## Features

- **Real Whisper Integration**: Uses faster-whisper (recommended) or openai-whisper
- **Real Ollama Integration**: Connects to local Ollama instance for summarization
- **Timing Metrics**: Logs performance for each stage (ingest → transcribe → summarize)
- **Model Selection**: Optional parameters to choose different Whisper/Ollama models
- **File Persistence**: Saves audio files and metadata locally
- **Download Links**: Provides URLs for audio, transcript, and summary files

## Quick Start (5 lines)

1. **Install dependencies**: `pip install -r requirements.txt`
2. **Start Ollama**: `ollama serve` (in background)
3. **Pull models**: `ollama pull qwen2.5:7b` and `ollama pull tiny`
4. **Start API**: `python api_server.py`
5. **Test**: `python test_real_api.py` or use curl examples below

## Default Models

- **Whisper**: `tiny` (fastest, lowest quality)
- **Summary**: `qwen2.5:7b` (balanced performance)

## API Endpoints

### Process Audio
```bash
# Default models
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav'

# Custom models
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav' \
  -F 'whisper_model=base' \
  -F 'summ_model=mistral:7b'
```

### Process Text
```bash
# Default model
curl -X POST http://localhost:5000/api/process-text \
  -H 'Content-Type: application/json' \
  -d '{"text": "Your text here"}'

# Custom model
curl -X POST http://localhost:5000/api/process-text \
  -H 'Content-Type: application/json' \
  -d '{"text": "Your text here", "summ_model": "llama3.1:8b"}'
```

## Response Format

```json
{
  "success": true,
  "note_id": "uuid-string",
  "transcript": "Transcribed text...",
  "summary": "AI-generated summary...",
  "timings": {
    "ingest": 0.123,
    "transcribe": 2.456,
    "summarize": 1.789,
    "total": 4.368
  },
  "download_links": {
    "audio": "/api/download/{id}/audio",
    "transcript": "/api/download/{id}/transcript",
    "summary": "/api/download/{id}/summary"
  }
}
```

## Requirements

- Python 3.8+
- Flask + Flask-CORS
- faster-whisper (recommended) or openai-whisper
- requests
- Ollama running locally with available models

## Troubleshooting

- **Ollama not responding**: Check if `ollama serve` is running
- **Model not found**: Use `ollama list` to see available models
- **Whisper import error**: Install with `pip install faster-whisper`
- **Audio format issues**: Supports WAV, MP3, M4A, etc.

## Performance Notes

- **Whisper tiny**: ~2-5s for 1min audio
- **Whisper base**: ~5-10s for 1min audio  
- **qwen2.5:7b**: ~1-3s for summarization
- **Total pipeline**: Usually under 10s for typical audio files
