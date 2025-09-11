# YouTube Notes App

A minimal, responsive web application for creating timestamped, person-tagged notes while watching YouTube videos. Perfect for team collaboration, study groups, or personal note-taking.

## Features

### 🎥 Video Playback
- **YouTube Integration**: Embed any YouTube video using the video URL
- **Custom Controls**: Play/pause, ±5 second jumps, seek bar
- **Keyboard Shortcuts**: Space (play/pause), ←/→ arrows (±5 seconds)
- **No Autoplay**: Videos load paused for better control

### 📝 Note Management
- **Timestamped Notes**: Add notes at specific video timestamps
- **Person Tagging**: Associate notes with specific people
- **Rich Text**: Support for multi-line note content
- **Smart Filtering**: Filter notes by people (OR/AND logic)

### 👥 People Management
- **Dynamic People List**: Add/remove people as needed
- **Auto-discovery**: New people are automatically added when mentioned in notes
- **Visual Tags**: Color-coded person tags for easy identification

### 🔄 Two Modes
- **Edit Mode**: Full functionality for creating and managing notes
- **View Mode**: Read-only mode for sharing and collaboration

### 💾 Data Persistence
- **Local Storage**: All data saved automatically in your browser
- **Export/Import**: JSON format for backup and sharing
- **Self-Contained HTML**: Generate standalone HTML files for distribution

## Usage

### Getting Started
1. Open `index.html` in your web browser
2. Enter a YouTube URL in the input field
3. Click "Load Video" to start
4. Switch between Edit and View modes using the toggle buttons

### Adding Notes
1. **In Edit Mode**: Use the "Add New Note" form
2. **Note Text**: Enter your note content
3. **People**: Add comma-separated person names (optional)
4. **Timestamp**: Enter time in seconds (e.g., 90) or MM:SS format (e.g., 1:30)
5. **Current Time**: Leave timestamp empty to use current video position

### Managing People
1. **Add Person**: Enter name and click "Add Person"
2. **Remove Person**: Click the × button on person tags
3. **Auto-Add**: People are automatically added when mentioned in notes

### Video Controls
- **Play/Pause**: Click button or press Space
- **Seek**: Click on the seek bar or use ±5s buttons
- **Keyboard**: Arrow keys for ±5 second jumps
- **Timestamp Clicks**: Click any note timestamp to jump to that time

### Filtering Notes
1. **People Filter**: Select a person from the dropdown
2. **Filter Mode**: Choose between OR (any person) or AND (all people)
3. **Real-time Updates**: Filtering updates immediately

### Sharing Projects
1. **Export Data**: Download JSON file with all notes and settings
2. **Save as HTML**: Generate self-contained HTML file for sharing
3. **Import Data**: Load previously exported projects

## Technical Details

### Browser Compatibility
- Modern browsers with ES6+ support
- Mobile Safari/Chrome compatible
- Responsive design for all screen sizes

### YouTube API
- Uses YouTube IFrame API
- Handles API readiness safely
- Supports various YouTube URL formats

### Data Storage
- LocalStorage for persistence
- JSON format for data exchange
- Self-contained HTML generation

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Adaptive layout for different screen sizes

## File Structure

```
project_video_note2/
├── index.html              # Main application file
├── app.js                 # JavaScript application logic
├── api_server.py          # Flask API server with ASR support
├── fireredasr/            # FireRedASR Python package
├── pretrained_models/     # ASR model files
│   └── FireRedASR-AED-L/
├── requirements.txt       # Python dependencies
├── audio_utils.py         # Audio preprocessing utilities
├── firered_engine.py      # FireRedASR engine wrapper
└── README.md              # This documentation
```

## ASR (Automatic Speech Recognition) Setup

This project supports two ASR engines: **Whisper** and **FireRedASR**.

### Quick Start (Whisper Only)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the API server
python api_server.py
```

### Full Setup (Whisper + FireRedASR)

#### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### 2. Install FFmpeg (Required for audio processing)
- **Windows**: `choco install ffmpeg` or `scoop install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`

#### 3. Download FireRedASR Models

**Option A: Using Hugging Face CLI (Recommended)**
```bash
# Install Hugging Face CLI
pip install huggingface_hub

# Create model directory
mkdir -p pretrained_models

# Download FireRedASR-AED-L model
huggingface-cli download FireRedTeam/FireRedASR-AED-L --local-dir pretrained_models/FireRedASR-AED-L
```

**Option B: Manual Download**
1. Go to [FireRedASR-AED-L on Hugging Face](https://huggingface.co/FireRedTeam/FireRedASR-AED-L)
2. Download all files to `pretrained_models/FireRedASR-AED-L/`

#### 4. Clone FireRedASR Repository
```bash
# Clone to parent directory
cd ..
git clone https://github.com/FireRedTeam/FireRedASR.git

# Copy fireredasr folder to your project
cd project_video_note2
xcopy ..\FireRedASR\fireredasr fireredasr /E /I

# Clean up (optional)
rmdir /s ..\FireRedASR
```

#### 5. Set Environment Variables (Windows)

**PowerShell:**
```powershell
# Add to PowerShell profile
notepad $PROFILE

# Add these lines:
$env:PATH += ";C:\Users\tongl\Downloads\project_video_note2\fireredasr;C:\Users\tongl\Downloads\project_video_note2\fireredasr\utils"
$env:PYTHONPATH = "C:\Users\tongl\Downloads\project_video_note2"
```

**Command Prompt:**
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click "Environment Variables"
3. Add to PATH: `C:\Users\tongl\Downloads\project_video_note2\fireredasr;C:\Users\tongl\Downloads\project_video_note2\fireredasr\utils`
4. Add PYTHONPATH: `C:\Users\tongl\Downloads\project_video_note2`

#### 6. Test Installation
```bash
# Test FireRedASR availability
python -c "from firered_engine import FireRedEngine; print('FireRedASR available!')"

# Start the API server
python api_server.py
```

## API Usage

### Process Audio with Whisper (Default)
```bash
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav'
```

### Process Audio with FireRedASR
```bash
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav' \
  -F 'asr_model=firered'
```

### Process Audio with Custom Models
```bash
curl -X POST http://localhost:5000/api/process-audio \
  -F 'audio=@your_audio.wav' \
  -F 'asr_model=whisper' \
  -F 'whisper_model=base' \
  -F 'summ_model=qwen3:0.6b'
```

### Process Text
```bash
curl -X POST http://localhost:5000/api/process-text \
  -H 'Content-Type: application/json' \
  -d '{"text": "Your text here"}'
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

## Troubleshooting

### FireRedASR not available
- Ensure `fireredasr/` folder is in your project directory
- Check that models are downloaded to `pretrained_models/FireRedASR-AED-L/`
- Verify environment variables are set correctly

### Audio processing errors
- Check FFmpeg installation
- Ensure audio files are in supported formats
- For FireRedASR, verify audio meets format requirements (16kHz, 16-bit, mono)

### Model loading issues
- Check available disk space (models are large)
- Verify Python dependencies are installed
- Check system memory requirements

## URL Formats Supported

The app automatically detects and extracts video IDs from:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← | Rewind 5 seconds |
| → | Forward 5 seconds |

## Error Handling

- **Invalid URLs**: Clear error messages for malformed YouTube links
- **API Failures**: Graceful fallbacks for YouTube API issues
- **Data Validation**: Input validation for timestamps and person names
- **Network Issues**: Helpful error messages for connection problems

## Best Practices

### For Note Taking
- Use descriptive note text
- Tag relevant people consistently
- Use timestamps for easy navigation
- Group related notes with similar tags

### For Collaboration
- Export projects as HTML for easy sharing
- Use consistent person naming conventions
- Filter notes by team members for focused review
- Combine OR/AND filtering for complex queries

### For Performance
- Keep notes concise and focused
- Use person tags efficiently
- Export large projects as HTML files
- Clear browser cache if needed

## Troubleshooting

### Video Won't Load
- Check YouTube URL format
- Ensure internet connection
- Try refreshing the page
- Check browser console for errors

### Notes Not Saving
- Verify browser supports localStorage
- Check available disk space
- Try different browser
- Export data as backup

### Generated HTML Issues
- Ensure YouTube API is accessible
- Check file size limits
- Verify all data is properly embedded
- Test in different browsers

## Future Enhancements

- Cloud storage integration
- Real-time collaboration
- Advanced search and filtering
- Note templates and categories
- Video playlist support
- Mobile app versions

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify YouTube API availability
4. Test with different video URLs

---

**Enjoy taking notes with your YouTube videos!** 🎬📝
