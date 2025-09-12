# FireRedASR Integration

This document describes the integration of FireRedASR as an alternative ASR (Automatic Speech Recognition) engine alongside Whisper.

## Overview

The API now supports two ASR engines:
- **Whisper** (default) - OpenAI's speech recognition model
- **FireRedASR** - Industrial-grade ASR supporting Mandarin, Chinese dialects, and English

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Download FireRedASR Models

1. Create the model directory:
   ```bash
   mkdir -p pretrained_models
   ```

2. Download FireRedASR-AED model from Hugging Face and place in `pretrained_models/FireRedASR-AED-L/`

3. Set up FireRedASR environment:
   ```bash
   export PATH=$PWD/fireredasr/:$PWD/fireredasr/utils/:$PATH
   export PYTHONPATH=$PWD/:$PYTHONPATH
   ```

### 3. Install FFmpeg (if not already installed)

- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Windows**: `choco install ffmpeg` or `scoop install ffmpeg`

## API Usage

### Audio Processing

#### Default (Whisper)
```bash
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav'
```

#### Whisper with Custom Model
```bash
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav' \
  -F 'asr_model=whisper' \
  -F 'whisper_model=base' \
  -F 'summ_model=qwen3:0.6b'
```

#### FireRedASR
```bash
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav' \
  -F 'asr_model=firered' \
  -F 'summ_model=qwen3:0.6b'
```

### Text Processing

#### Default Model
```bash
curl -X POST http://localhost:5000/api/process-text \
  -H 'Content-Type: application/json' \
  -d '{"text": "Your text here"}'
```

#### Custom Model
```bash
curl -X POST http://localhost:5000/api/process-text \
  -H 'Content-Type: application/json' \
  -d '{"text": "Your text here", "summ_model": "llama3.1:8b"}'
```

## Parameters

### ASR Model Selection

- `asr_model`: Choose between `"whisper"` (default) or `"firered"`
- `whisper_model`: Whisper model size (`tiny`, `base`, `small`, `medium`, `large-v3`)
- `summ_model`: Summary model (e.g., `qwen3:0.6b`, `llama3.1:8b`, `mistral:7b`)

### Response Format

The API response now includes model information:

```json
{
  "success": true,
  "note_id": "uuid",
  "transcript": "transcribed text",
  "summary": "generated summary",
  "asr_model_used": "whisper-tiny",
  "asr_engine_used": "whisper",
  "summ_model_used": "qwen3:0.6b",
  "download_links": {
    "audio": "/api/download/{note_id}/audio",
    "transcript": "/api/download/{note_id}/transcript",
    "summary": "/api/download/{note_id}/summary"
  }
}
```

## Model Comparison

| Feature | Whisper | FireRedASR |
|---------|---------|------------|
| **Languages** | 99+ languages | Mandarin, Chinese dialects, English |
| **Performance** | Good general performance | SOTA on Mandarin benchmarks |
| **Model Size** | 39MB - 3GB | 1.1B parameters (AED) |
| **Speed** | Fast (tiny/base) | Moderate |
| **Audio Format** | Flexible | 16kHz, 16-bit, mono |
| **Use Case** | General purpose | Chinese/Mandarin focused |

## Audio Format Requirements

### Whisper
- Supports various formats (WAV, MP3, M4A, etc.)
- Automatic format conversion

### FireRedASR
- Requires 16kHz sample rate
- 16-bit PCM encoding
- Mono channel
- Automatic preprocessing is applied

## Error Handling

If FireRedASR is not available or models are missing, the API will:
1. Log a warning message
2. Fall back to Whisper for `asr_model=firered` requests
3. Return appropriate error messages

## Testing

Run the test suite to verify both engines:

```bash
python test_real_api.py
```

This will test:
- Health check
- Text processing (default and custom models)
- Audio processing (Whisper and FireRedASR)
- Notes listing
- Download links

## Troubleshooting

### FireRedASR Not Available
- Ensure FireRedASR is properly installed
- Check that models are downloaded to `pretrained_models/FireRedASR-AED-L/`
- Verify environment variables are set

### Audio Processing Errors
- Check FFmpeg installation
- Ensure audio files are in supported formats
- For FireRedASR, verify audio meets format requirements

### Model Loading Issues
- Check available disk space (models are large)
- Verify Python dependencies are installed
- Check system memory requirements
