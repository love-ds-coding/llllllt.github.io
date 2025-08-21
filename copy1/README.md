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
├── index.html          # Main application file
├── app.js             # JavaScript application logic
└── README.md          # This documentation
```

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
