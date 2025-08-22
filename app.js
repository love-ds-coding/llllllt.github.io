// YouTube Notes App - Main Application Logic
class YouTubeNotesApp {
    constructor() {
        this.currentMode = 'edit';
        this.people = [];
        this.notes = [];
        this.videoId = null;
        this.videoUrl = '';
        this.isVideoLoaded = false;
        this.player = null;
        this.currentTime = 0;
        this.duration = 0;
        this.isPlaying = false;
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.setMode(this.currentMode);
        this.renderPeople();
        this.renderNotes();
        this.updatePeopleFilter();
        this.updateNotePeopleSelect();
    }

    // Data Management
    loadData() {
        try {
            const savedData = localStorage.getItem('youtubeNotesData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.people = data.people || [];
                this.notes = data.notes || [];
                this.videoId = data.videoId || null;
                this.videoUrl = data.videoUrl || '';
                
                if (this.videoId) {
                    this.loadVideoFromId(this.videoId);
                }
                
                // Initialize project info display
                this.updateProjectInfo('Current Project', {
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    description: 'Project loaded from local storage'
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    saveData() {
        try {
            const data = {
                people: this.people,
                notes: this.notes,
                videoId: this.videoId,
                videoUrl: this.videoUrl
            };
            localStorage.setItem('youtubeNotesData', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    // YouTube API Integration
    loadVideoFromId(videoId) {
        this.videoId = videoId;
        this.videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        if (this.player) {
            this.player.loadVideoById(videoId);
        } else {
            this.createPlayer(videoId);
        }
        
        this.saveData();
    }

    createPlayer(videoId) {
        if (typeof YT === 'undefined' || !YT.Player) {
            setTimeout(() => this.createPlayer(videoId), 100);
            return;
        }

        this.player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onReady: this.onPlayerReady.bind(this),
                onStateChange: this.onPlayerStateChange.bind(this),
                onError: this.onPlayerError.bind(this)
            }
        });
    }

    onPlayerReady(event) {
        this.isVideoLoaded = true;
        this.duration = event.target.getDuration();
        this.enableControls();
        this.startUpdateInterval();
        this.updateTimeDisplay();
    }

    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        }
    }

    onPlayerError(event) {
        console.error('YouTube player error:', event);
        this.showError('Error loading video. Please check the URL and try again.');
    }

    // Video Controls
    enableControls() {
        document.getElementById('play-pause').disabled = false;
        document.getElementById('rewind-5').disabled = false;
        document.getElementById('forward-5').disabled = false;
        document.getElementById('test-seek').disabled = false;
        document.getElementById('seek-bar').style.cursor = 'pointer';
    }

    togglePlayPause() {
        if (!this.player) return;
        
        if (this.isPlaying) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
        }
    }

    seekToTime(seconds) {
        console.log('seekToTime called with:', seconds, 'Type:', typeof seconds);
        
        if (!this.player) {
            console.error('Player not initialized');
            return;
        }
        
        if (!this.isVideoLoaded) {
            console.error('Video not loaded yet');
            return;
        }
        
        // Ensure seconds is a valid number
        const time = parseFloat(seconds);
        if (isNaN(time) || time < 0) {
            console.error('Invalid timestamp:', seconds);
            return;
        }
        
        console.log('Seeking to time:', time, 'seconds');
        
        try {
            // Seek to the specified time
            this.player.seekTo(time, true);
            
            // Pause after a short delay to ensure seeking completes
            setTimeout(() => {
                if (this.player && this.player.getPlayerState) {
                    this.player.pauseVideo();
                    console.log('Video paused after seeking');
                }
            }, 200);
        } catch (error) {
            console.error('Error seeking to time:', error);
        }
    }

    jumpTime(seconds) {
        if (!this.player) return;
        
        const currentTime = this.player.getCurrentTime();
        const newTime = Math.max(0, Math.min(currentTime + seconds, this.duration));
        this.seekToTime(newTime);
    }

    seekBarClick(event) {
        if (!this.player) return;
        
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * this.duration;
        this.seekToTime(newTime);
    }

    startUpdateInterval() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        this.updateInterval = setInterval(() => {
            if (this.player && this.isVideoLoaded) {
                this.currentTime = this.player.getCurrentTime();
                this.updateTimeDisplay();
                this.updateSeekBar();
            }
        }, 100);
    }

    updateTimeDisplay() {
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            const current = this.formatTime(this.currentTime);
            const total = this.formatTime(this.duration);
            timeDisplay.textContent = `${current} / ${total}`;
        }
    }

    updateSeekBar() {
        const progress = document.getElementById('seek-progress');
        if (progress && this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            progress.style.width = `${percentage}%`;
        }
    }

    updatePlayPauseButton() {
        const button = document.getElementById('play-pause');
        if (button) {
            button.textContent = this.isPlaying ? 'Pause' : 'Play';
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // URL Parsing
    extractVideoId(url) {
        if (!url) return null;
        
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }

    // Mode Management
    setMode(mode) {
        this.currentMode = mode;
        document.body.className = `${mode}-mode`;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        console.log(`Switched to ${mode} mode`);
    }

    // People Management
    addPerson(name) {
        if (!name || this.people.includes(name)) return;
        
        this.people.push(name);
        this.saveData();
        this.renderPeople();
        this.updatePeopleFilter();
        this.updateNotePeopleSelect();
    }

    removePerson(name) {
        this.people = this.people.filter(p => p !== name);
        this.saveData();
        this.renderPeople();
        this.updatePeopleFilter();
        this.updateNotePeopleSelect();
    }

    renderPeople() {
        const peopleList = document.getElementById('people-list');
        if (!peopleList) return;
        
        peopleList.innerHTML = this.people.map(name => `
            <div class="person-tag">
                <span>${this.escapeHtml(name)}</span>
                <button class="person-remove" onclick="app.removePerson('${this.escapeHtml(name)}')">&times;</button>
            </div>
        `).join('');
    }

    updatePeopleFilter() {
        const filter = document.getElementById('people-filter');
        if (!filter) return;
        
        // Preserve current multiple selections
        const currentSelectedValues = Array.from(filter.selectedOptions || [])
            .map(option => option.value)
            .filter(value => value !== '');
        
        filter.innerHTML = '<option value="">All People</option>' + 
            this.people.map(name => 
                `<option value="${this.escapeHtml(name)}" ${currentSelectedValues.includes(name) ? 'selected' : ''}>${this.escapeHtml(name)}</option>`
            ).join('');
        
        // Also update the note people selection dropdown
        this.updateNotePeopleSelect();
    }

    updateNotePeopleSelect() {
        const notePeopleSelect = document.getElementById('note-people-select');
        if (!notePeopleSelect) return;
        
        // Clear existing options except the first one
        notePeopleSelect.innerHTML = '<option value="">No people selected</option>';
        
        // Add people options
        this.people.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            notePeopleSelect.appendChild(option);
        });
    }

    // Notes Management
    addNote(text, people = [], timestamp = null) {
        if (!text.trim()) return;
        
        const note = {
            id: Date.now().toString(),
            text: text.trim(),
            people: people.filter(p => p.trim()),
            timestamp: timestamp || this.currentTime,
            createdAt: new Date().toISOString()
        };
        
        this.notes.push(note);
        this.saveData();
        this.renderNotes();
        
        // Add new people if they don't exist
        note.people.forEach(person => {
            if (!this.people.includes(person)) {
                this.addPerson(person);
            }
        });
    }

    updateNote(id, text, people, timestamp) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        
        note.text = text.trim();
        note.people = people.filter(p => p.trim());
        note.timestamp = timestamp;
        note.updatedAt = new Date().toISOString();
        
        this.saveData();
        this.renderNotes();
        
        // Add new people if they don't exist
        note.people.forEach(person => {
            if (!this.people.includes(person)) {
                this.addPerson(person);
            }
        });
    }

    deleteNote(id) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.saveData();
        this.renderNotes();
    }

    renderNotes() {
        const notesList = document.getElementById('notes-list');
        if (!notesList) return;
        
        const filteredNotes = this.getFilteredNotes();
        
        console.log('Rendering notes:', filteredNotes);
        
        notesList.innerHTML = filteredNotes.map(note => {
            console.log('Note timestamp:', note.timestamp, 'Type:', typeof note.timestamp);
            
            // Ensure timestamp is a valid number
            const timestamp = parseFloat(note.timestamp);
            if (isNaN(timestamp) || timestamp < 0) {
                console.error('Invalid timestamp for note:', note.id, 'Timestamp:', note.timestamp);
                return `
                <div class="note-item" data-note-id="${note.id}">
                    <div class="note-header">
                        <div class="note-timestamp" style="background: #dc3545; cursor: not-allowed;" title="Invalid timestamp">
                            ${this.formatTime(note.timestamp)}
                        </div>
                        <div class="note-people">
                            ${note.people.map(person => 
                                `<span class="note-person">${this.escapeHtml(person)}</span>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="note-text">${this.escapeHtml(note.text)}</div>
                    <div class="note-actions edit-only">
                        <button class="action-btn edit-btn" onclick="app.editNote('${note.id}')">Edit</button>
                        <button class="action-btn delete-btn" onclick="app.deleteNote('${note.id}')">Delete</button>
                    </div>
                </div>
            `;
            }
            
            return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-header">
                    <div class="note-timestamp" onclick="app.seekToTime(${timestamp})" style="cursor: pointer;">
                        ${this.formatTime(timestamp)}
                    </div>
                    <div class="note-people">
                        ${note.people.map(person => 
                            `<span class="note-person">${this.escapeHtml(person)}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="note-text">${this.escapeHtml(note.text)}</div>
                <div class="note-actions edit-only">
                    <button class="action-btn edit-btn" onclick="app.editNote('${note.id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="app.deleteNote('${note.id}')">Delete</button>
                </div>
            </div>
        `;
        }).join('');
    }

    getFilteredNotes() {
        const peopleFilter = document.getElementById('people-filter');
        const filterMode = document.getElementById('filter-mode')?.value || 'or';
        
        // Get all selected people (multiple selection)
        const selectedPeople = Array.from(peopleFilter?.selectedOptions || [])
            .map(option => option.value)
            .filter(value => value !== ''); // Filter out the "All People" option
        
        if (selectedPeople.length === 0) return this.notes.sort((a, b) => a.timestamp - b.timestamp);
        
        const filteredNotes = this.notes.filter(note => {
            if (filterMode === 'and') {
                // AND mode: note must contain ALL selected people
                return selectedPeople.every(person => note.people.includes(person));
            } else {
                // OR mode: note must contain AT LEAST ONE of the selected people
                return selectedPeople.some(person => note.people.includes(person));
            }
        });
        
        // Sort notes by timestamp in ascending order
        return filteredNotes.sort((a, b) => a.timestamp - b.timestamp);
    }

    editNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        
        const newText = prompt('Edit note text:', note.text);
        if (newText === null) return;
        
        // Create a simple people selection interface
        let newPeople = '';
        if (this.people.length > 0) {
            const peopleList = this.people.map((person, index) => `${index + 1}. ${person}`).join('\n');
            const selection = prompt(`Select people by number (comma-separated):\n${peopleList}\n\nCurrent: ${note.people.join(', ')}`);
            if (selection === null) return;
            
            // Parse the selection
            const selectedIndices = selection.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < this.people.length);
            newPeople = selectedIndices.map(i => this.people[i]).join(', ');
        } else {
            newPeople = prompt('Edit people (comma-separated):', note.people.join(', '));
            if (newPeople === null) return;
        }
        
        const newTimestamp = prompt('Edit timestamp (in seconds):', note.timestamp);
        if (newTimestamp === null) return;
        
        const timestamp = this.parseTimestamp(newTimestamp);
        if (timestamp === null) {
            this.showError('Invalid timestamp format. Please use seconds (e.g., 90) or time format (e.g., 1:30)');
            return;
        }
        
        this.updateNote(id, newText, newPeople.split(',').map(p => p.trim()), timestamp);
    }

    parseTimestamp(input) {
        if (!input) return null;
        
        // Try parsing as seconds first
        const seconds = parseFloat(input);
        if (!isNaN(seconds) && seconds >= 0) return seconds;
        
        // Try parsing as MM:SS format
        const timeMatch = input.match(/^(\d+):(\d{2})$/);
        if (timeMatch) {
            const minutes = parseInt(timeMatch[1]);
            const secs = parseInt(timeMatch[2]);
            if (secs < 60) return minutes * 60 + secs;
        }
        
        return null;
    }

    // Export/Import
    exportData() {
        const data = {
            youtubeId: this.videoId,
            videoUrl: this.videoUrl,
            people: this.people,
            notes: this.notes,
            settings: {
                currentMode: this.currentMode
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `youtube-notes-${this.videoId || 'project'}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.youtubeId) {
                    this.loadVideoFromId(data.youtubeId);
                }
                
                this.people = data.people || [];
                this.notes = data.notes || [];
                
                this.saveData();
                this.renderPeople();
                this.renderNotes();
                this.updatePeopleFilter();
                this.updateNotePeopleSelect();
                
                this.showSuccess('Data imported successfully!');
            } catch (error) {
                console.error('Error importing data:', error);
                this.showError('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    // Enhanced Project Management Functions
    saveProjectAs(projectName = null, description = '') {
        // Generate project name if not provided
        const name = projectName || `Project_${new Date().toISOString().split('T')[0]}`;
        
        const projectData = {
            metadata: {
                name: name,
                description: description,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                version: "1.0",
                appVersion: "2.0"
            },
            data: {
                youtubeId: this.videoId,
                videoUrl: this.videoUrl,
                people: this.people,
                notes: this.notes,
                settings: {
                    currentMode: this.currentMode
                }
            }
        };
        
        // Save as JSON file with .ynp extension
        const blob = new Blob([JSON.stringify(projectData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.ynp`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        // Update project info display
        this.updateProjectInfo(name, projectData.metadata);
        
        this.showSuccess(`Project "${name}" saved successfully!`);
    }

    loadProject(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                
                // Check if this is a project file with metadata
                if (projectData.metadata && projectData.data) {
                    // Load the project data
                    if (projectData.data.youtubeId) {
                        this.loadVideoFromId(projectData.data.youtubeId);
                    }
                    
                    this.people = projectData.data.people || [];
                    this.notes = projectData.data.notes || [];
                    
                    // Update project info display
                    this.updateProjectInfo(projectData.metadata.name, projectData.metadata);
                    
                    // Update UI
                    this.saveData();
                    this.renderPeople();
                    this.renderNotes();
                    this.updatePeopleFilter();
                    this.updateNotePeopleSelect();
                    
                    this.showSuccess(`Project "${projectData.metadata.name}" loaded successfully!`);
                } else {
                    // Fallback for old format JSON files
                    this.importData(file);
                }
            } catch (error) {
                console.error('Error loading project:', error);
                this.showError('Error loading project. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    updateProjectInfo(name, metadata) {
        const projectNameEl = document.getElementById('project-name');
        const projectMetaEl = document.getElementById('project-meta');
        
        if (projectNameEl && projectMetaEl) {
            projectNameEl.textContent = name;
            
            if (metadata.created && metadata.lastModified) {
                const created = new Date(metadata.created).toLocaleDateString();
                const modified = new Date(metadata.lastModified).toLocaleDateString();
                
                projectMetaEl.innerHTML = `
                    <div>Created: ${created}</div>
                    <div>Last Modified: ${modified}</div>
                    ${metadata.description ? `<div>Description: ${metadata.description}</div>` : ''}
                `;
            } else {
                projectMetaEl.innerHTML = '';
            }
        }
    }

    showSaveProjectDialog() {
        const name = prompt('Enter project name (optional):', `Project_${new Date().toISOString().split('T')[0]}`);
        if (name !== null) {
            const description = prompt('Enter project description (optional):', '');
            this.saveProjectAs(name, description);
        }
    }

    // Save Project as HTML
    saveProjectAsHTML() {
        const data = {
            youtubeId: this.videoId,
            videoUrl: this.videoUrl,
            people: this.people,
            notes: this.notes,
            settings: {
                currentMode: 'view' // Always start in view mode for shared projects
            }
        };
        
        const htmlContent = this.generateSelfContainedHTML(data);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `youtube-notes-${this.videoId || 'project'}.html`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showSuccess('Project saved as HTML file!');
    }

    // Reset Project
    resetProject() {
        if (confirm('Are you sure you want to reset the entire project? This will:\n\n• Clear the video link\n• Remove all people\n• Delete all notes\n\nThis action cannot be undone.')) {
            // Clear all data
            this.videoId = null;
            this.videoUrl = '';
            this.people = [];
            this.notes = [];
            this.currentTime = 0;
            this.duration = 0;
            this.isVideoLoaded = false;
            
            // Clear video player
            if (this.player) {
                this.player.destroy();
                this.player = null;
            }
            
            // Clear URL input
            const urlInput = document.getElementById('video-url');
            if (urlInput) urlInput.value = '';
            
            // Clear note form
            const noteText = document.getElementById('note-text');
            if (noteText) noteText.value = '';
            
            const noteTimestamp = document.getElementById('note-timestamp');
            if (noteTimestamp) noteTimestamp.value = '';
            
            const notePeopleSelect = document.getElementById('note-people-select');
            if (notePeopleSelect) notePeopleSelect.selectedIndex = 0;
            
            // Clear new person input
            const newPerson = document.getElementById('new-person');
            if (newPerson) newPerson.value = '';
            
            // Reset video player display
            const playerDiv = document.getElementById('youtube-player');
            if (playerDiv) {
                playerDiv.innerHTML = '<div>Enter a YouTube URL above to load a video</div>';
                playerDiv.className = 'loading';
            }
            
            // Disable video controls
            document.getElementById('play-pause').disabled = true;
            document.getElementById('rewind-5').disabled = true;
            document.getElementById('forward-5').disabled = true;
            document.getElementById('seek-bar').style.cursor = 'default';
            
            // Reset time display
            document.getElementById('time-display').textContent = '0:00 / 0:00';
            document.getElementById('seek-progress').style.width = '0%';
            
            // Clear project info
            this.updateProjectInfo('No project loaded', {
                created: '',
                lastModified: '',
                description: ''
            });
            
            // Save cleared data
            this.saveData();
            
            // Re-render everything
            this.renderPeople();
            this.renderNotes();
            this.updatePeopleFilter();
            this.updateNotePeopleSelect();
            
            this.showSuccess('Project reset successfully! All data has been cleared.');
        }
    }

    generateSelfContainedHTML(data) {
        const css = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #e0e0e0;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            margin-bottom: 20px;
        }

        .title {
            font-size: 2rem;
            font-weight: 700;
            color: #ff4444;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #b0b0b0;
            font-size: 1rem;
        }

        .video-section {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 20px;
            margin-bottom: 20px;
        }

        .video-container {
            background: #2d2d2d;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .video-wrapper {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
        }

        #youtube-player {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }

        .video-controls {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .control-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #007bff;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }

        .control-btn:hover {
            background: #0056b3;
        }

        .control-btn:disabled {
            background: #555;
            cursor: not-allowed;
        }

        .seek-bar {
            flex: 1;
            height: 6px;
            background: #555;
            border-radius: 3px;
            cursor: pointer;
            position: relative;
        }

        .seek-progress {
            height: 100%;
            background: #007bff;
            border-radius: 3px;
            width: 0%;
        }

        .time-display {
            font-family: monospace;
            font-size: 14px;
            color: #b0b0b0;
            min-width: 100px;
        }

        .notes-section {
            background: #2d2d2d;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #e0e0e0;
        }

        .mode-toggle {
            display: flex;
            background: #555;
            border-radius: 8px;
            padding: 4px;
        }

        .mode-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: transparent;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            color: #e0e0e0;
        }

        .mode-btn.active {
            background: #007bff;
            color: white;
        }

        .people-filter {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .filter-label {
            font-weight: 600;
            color: #b0b0b0;
            font-size: 14px;
        }

        .filter-select {
            padding: 8px 12px;
            border: 2px solid #555;
            border-radius: 6px;
            font-size: 14px;
            background: #1a1a1a;
            color: #e0e0e0;
        }

        .filter-select[multiple] {
            min-height: 80px;
        }

        .filter-select[multiple] option {
            padding: 4px 8px;
        }

        .filter-select[multiple] option:checked {
            background: #007bff;
            color: white;
        }

        .filter-select:focus {
            outline: none;
            border-color: #007bff;
        }

        .notes-list {
            display: grid;
            gap: 15px;
        }

        .note-item {
            background: #3a3a3a;
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid #007bff;
            transition: all 0.2s;
        }

        .note-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            gap: 15px;
        }

        .note-timestamp {
            background: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .note-timestamp:hover {
            background: #0056b3;
        }

        .note-people {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }

        .note-person {
            background: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
        }

        .note-text {
            color: #e0e0e0;
            line-height: 1.5;
            margin-bottom: 10px;
        }

        .form-help {
            color: #b0b0b0;
            font-size: 12px;
            margin-top: 4px;
            font-style: italic;
        }

        .hidden {
            display: none !important;
        }

        .edit-only {
            display: none;
        }

        .view-only {
            display: block;
        }

        .edit-mode .edit-only {
            display: block;
        }

        .view-mode .view-only {
            display: block;
        }

        .view-mode .add-note-section,
        .view-mode .people-management,
        .view-mode .note-actions,
        .view-mode .export-import,
        .view-mode .save-project-btn {
            display: none;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .video-section {
                grid-template-columns: 1fr;
                gap: 15px;
            }
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #b0b0b0;
        }

        .error {
            background: #4a2a2a;
            color: #ffcccc;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border: 1px solid #8b4444;
        }

        .success {
            background: #2a4a2a;
            color: #ccffcc;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border: 1px solid #448b44;
        }
        `;

        const js = `
        // YouTube Notes App - Self-Contained Version
        class YouTubeNotesApp {
            constructor() {
                this.currentMode = 'view';
                this.people = ${JSON.stringify(data.people)};
                this.notes = ${JSON.stringify(data.notes)};
                this.videoId = '${data.youtubeId}';
                this.videoUrl = '${data.videoUrl}';
                this.isVideoLoaded = false;
                this.player = null;
                this.currentTime = 0;
                this.duration = 0;
                this.isPlaying = false;
                this.updateInterval = null;
                
                this.init();
            }

            init() {
                this.setupEventListeners();
                this.setMode(this.currentMode);
                this.renderNotes();
                this.updatePeopleFilter();
                
                if (this.videoId) {
                    this.loadVideoFromId(this.videoId);
                }
            }

            // YouTube API Integration
            loadVideoFromId(videoId) {
                this.videoId = videoId;
                
                if (this.player) {
                    this.player.loadVideoById(videoId);
                } else {
                    this.createPlayer(videoId);
                }
            }

            createPlayer(videoId) {
                if (typeof YT === 'undefined' || !YT.Player) {
                    setTimeout(() => this.createPlayer(videoId), 100);
                    return;
                }

                this.player = new YT.Player('youtube-player', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        modestbranding: 1,
                        rel: 0
                    },
                    events: {
                        onReady: this.onPlayerReady.bind(this),
                        onStateChange: this.onPlayerStateChange.bind(this),
                        onError: this.onPlayerError.bind(this)
                    }
                });
            }

            onPlayerReady(event) {
                this.isVideoLoaded = true;
                this.duration = event.target.getDuration();
                this.enableControls();
                this.startUpdateInterval();
                this.updateTimeDisplay();
            }

            onPlayerStateChange(event) {
                if (event.data === YT.PlayerState.PLAYING) {
                    this.isPlaying = true;
                    this.updatePlayPauseButton();
                } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                }
            }

            onPlayerError(event) {
                console.error('YouTube player error:', event);
                this.showError('Error loading video. Please check the URL and try again.');
            }

            // Video Controls
            enableControls() {
                document.getElementById('play-pause').disabled = false;
                document.getElementById('rewind-5').disabled = false;
                document.getElementById('forward-5').disabled = false;
                document.getElementById('seek-bar').style.cursor = 'pointer';
            }

            togglePlayPause() {
                if (!this.player) return;
                
                if (this.isPlaying) {
                    this.player.pauseVideo();
                } else {
                    this.player.playVideo();
                }
            }

            seekToTime(seconds) {
                console.log('seekToTime called with:', seconds, 'Type:', typeof seconds);
                
                if (!this.player) {
                    console.error('Player not initialized');
                    return;
                }
                
                if (!this.isVideoLoaded) {
                    console.error('Video not loaded yet');
                    return;
                }
                
                // Ensure seconds is a valid number
                const time = parseFloat(seconds);
                if (isNaN(time) || time < 0) {
                    console.error('Invalid timestamp:', seconds);
                    return;
                }
                
                console.log('Seeking to time:', time, 'seconds');
                
                try {
                    // Seek to the specified time
                    this.player.seekTo(time, true);
                    
                    // Pause after a short delay to ensure seeking completes
                    setTimeout(() => {
                        if (this.player && this.player.getPlayerState) {
                            this.player.pauseVideo();
                            console.log('Video paused after seeking');
                        }
                    }, 200);
                } catch (error) {
                    console.error('Error seeking to time:', error);
                }
            }

            jumpTime(seconds) {
                if (!this.player) return;
                
                const currentTime = this.player.getCurrentTime();
                const newTime = Math.max(0, Math.min(currentTime + seconds, this.duration));
                this.seekToTime(newTime);
            }

            seekBarClick(event) {
                if (!this.player) return;
                
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newTime = percentage * this.duration;
                this.seekToTime(newTime);
            }

            startUpdateInterval() {
                if (this.updateInterval) clearInterval(this.updateInterval);
                
                this.updateInterval = setInterval(() => {
                    if (this.player && this.isVideoLoaded) {
                        this.currentTime = this.player.getCurrentTime();
                        this.updateTimeDisplay();
                        this.updateSeekBar();
                    }
                }, 100);
            }

            updateTimeDisplay() {
                const timeDisplay = document.getElementById('time-display');
                if (timeDisplay) {
                    const current = this.formatTime(this.currentTime);
                    const total = this.formatTime(this.duration);
                    timeDisplay.textContent = \`\${current} / \${total}\`;
                }
            }

            updateSeekBar() {
                const progress = document.getElementById('seek-progress');
                if (progress && this.duration > 0) {
                    const percentage = (this.currentTime / this.duration) * 100;
                    progress.style.width = \`\${percentage}%\`;
                }
            }

            updatePlayPauseButton() {
                const button = document.getElementById('play-pause');
                if (button) {
                    button.textContent = this.isPlaying ? 'Pause' : 'Play';
                }
            }

            formatTime(seconds) {
                if (!seconds || isNaN(seconds)) return '0:00';
                
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
            }

            // Mode Management
            setMode(mode) {
                this.currentMode = mode;
                document.body.className = \`\${mode}-mode\`;
                
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === mode);
                });
            }

            // Notes Management
            renderNotes() {
                const notesList = document.getElementById('notes-list');
                if (!notesList) return;
                
                const filteredNotes = this.getFilteredNotes();
                
                console.log('Rendering notes (self-contained):', filteredNotes);
                
                notesList.innerHTML = filteredNotes.map(note => {
                    console.log('Note timestamp (self-contained):', note.timestamp, 'Type:', typeof note.timestamp);
                    
                    // Ensure timestamp is a valid number
                    const timestamp = parseFloat(note.timestamp);
                    if (isNaN(timestamp) || timestamp < 0) {
                        console.error('Invalid timestamp for note (self-contained):', note.id, 'Timestamp:', note.timestamp);
                        return \`
                        <div class="note-item" data-note-id="\${note.id}">
                            <div class="note-header">
                                <div class="note-timestamp" style="background: #dc3545; cursor: not-allowed;" title="Invalid timestamp">
                                    \${this.formatTime(note.timestamp)}
                                </div>
                                <div class="note-people">
                                    \${note.people.map(person => 
                                        \`<span class="note-person">\${this.escapeHtml(person)}</span>\`
                                    ).join('')}
                                </div>
                            </div>
                            <div class="note-text">\${this.escapeHtml(note.text)}</div>
                        </div>
                    \`;
                    }
                    
                    return \`
                    <div class="note-item" data-note-id="\${note.id}">
                        <div class="note-header">
                            <div class="note-timestamp" onclick="app.seekToTime(\${timestamp})" style="cursor: pointer;">
                                \${this.formatTime(timestamp)}
                            </div>
                            <div class="note-people">
                                \${note.people.map(person => 
                                    \`<span class="note-person">\${this.escapeHtml(person)}</span>\`
                                ).join('')}
                            </div>
                        </div>
                        <div class="note-text">\${this.escapeHtml(note.text)}</div>
                    </div>
                \`;
                }).join('');
            }

                         getFilteredNotes() {
                 const peopleFilter = document.getElementById('people-filter');
                 const filterMode = document.getElementById('filter-mode')?.value || 'or';
                 
                 // Get all selected people (multiple selection)
                 const selectedPeople = Array.from(peopleFilter?.selectedOptions || [])
                     .map(option => option.value)
                     .filter(value => value !== ''); // Filter out the "All People" option
                 
                 if (selectedPeople.length === 0) return this.notes.sort((a, b) => a.timestamp - b.timestamp);
                 
                 const filteredNotes = this.notes.filter(note => {
                     if (filterMode === 'and') {
                         // AND mode: note must contain ALL selected people
                         return selectedPeople.every(person => note.people.includes(person));
                         
                     } else {
                         // OR mode: note must contain AT LEAST ONE of the selected people
                         return selectedPeople.some(person => note.people.includes(person));
                     }
                 });
                 
                 // Sort notes by timestamp in ascending order
                 return filteredNotes.sort((a, b) => a.timestamp - b.timestamp);
             }

                         updatePeopleFilter() {
                 const filter = document.getElementById('people-filter');
                 if (!filter) return;
                 
                 // Preserve current multiple selections
                 const currentSelectedValues = Array.from(filter.selectedOptions || [])
                     .map(option => option.value)
                     .filter(value => value !== '');
                 
                 filter.innerHTML = '<option value="">All People</option>' + 
                     this.people.map(name => 
                         \`<option value="\${this.escapeHtml(name)}" \${currentSelectedValues.includes(name) ? 'selected' : ''}>\${this.escapeHtml(name)}</option>\`
                     ).join('');
             }

            // Utility Functions
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            showError(message) {
                this.showMessage(message, 'error');
            }

            showSuccess(message) {
                this.showMessage(message, 'success');
            }

            showMessage(message, type) {
                const existing = document.querySelector(\`.\${type}\`);
                if (existing) existing.remove();
                
                const messageDiv = document.createElement('div');
                messageDiv.className = type;
                messageDiv.textContent = message;
                
                const container = document.querySelector('.container');
                container.insertBefore(messageDiv, container.firstChild);
                
                setTimeout(() => messageDiv.remove(), 5000);
            }

            // Event Listeners Setup
            setupEventListeners() {
                // Mode switching
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.setMode(e.target.dataset.mode);
                    });
                });

                // Video controls
                document.getElementById('play-pause')?.addEventListener('click', () => this.togglePlayPause());
                document.getElementById('rewind-5')?.addEventListener('click', () => this.jumpTime(-5));
                document.getElementById('forward-5')?.addEventListener('click', () => this.jumpTime(5));
                document.getElementById('seek-bar')?.addEventListener('click', (e) => this.seekBarClick(e));

                // Keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    
                    switch(e.code) {
                        case 'Space':
                            e.preventDefault();
                            this.togglePlayPause();
                            break;
                        case 'ArrowLeft':
                            e.preventDefault();
                            this.jumpTime(-5);
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            this.jumpTime(5);
                            break;
                    }
                });

                // People filter
                document.getElementById('people-filter')?.addEventListener('change', () => this.renderNotes());
                document.getElementById('filter-mode')?.addEventListener('change', () => this.renderNotes());
            }
        }

        // Initialize the app when the page loads
        let app;
        document.addEventListener('DOMContentLoaded', () => {
            app = new YouTubeNotesApp();
        });
        `;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Notes - ${data.youtubeId || 'Project'}</title>
    <style>${css}</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">YouTube Notes</h1>
            <p class="subtitle">${data.videoUrl ? 'Video: ' + data.videoUrl : 'Project Notes'}</p>
        </div>

        <div class="video-section">
            <div class="video-container">
                <div class="video-wrapper">
                    <div id="youtube-player" class="loading">
                        <div>Loading video...</div>
                    </div>
                </div>
                <div class="video-controls">
                    <button id="play-pause" class="control-btn" disabled>Play</button>
                    <button id="rewind-5" class="control-btn" disabled>-5s</button>
                    <button id="forward-5" class="control-btn" disabled>+5s</button>
                    <div class="seek-bar" id="seek-bar">
                        <div class="seek-progress" id="seek-progress"></div>
                    </div>
                    <div class="time-display" id="time-display">0:00 / 0:00</div>
                </div>
            </div>

            <div class="notes-section">
                <div class="section-header">
                    <h2 class="section-title">Notes</h2>
                    <div class="mode-toggle">
                        <button class="mode-btn active" data-mode="view">View</button>
                        <button class="mode-btn" data-mode="edit">Edit</button>
                    </div>
                </div>

                <div class="people-filter">
                    <div class="filter-group">
                        <label class="filter-label">Filter by People:</label>
                        <select id="people-filter" class="filter-select" multiple>
                            <option value="">All People</option>
                        </select>
                        <small class="form-help">Hold Ctrl/Cmd to select multiple people</small>
                    </div>
                    <select id="filter-mode" class="filter-select">
                        <option value="or">OR (any person)</option>
                        <option value="and">AND (all people)</option>
                    </select>
                </div>

                <div class="notes-list" id="notes-list">
                    <!-- Notes will be populated here -->
                </div>
            </div>
        </div>
    </div>

    <script src="https://www.youtube.com/iframe_api"></script>
    <script>${js}</script>
</body>
</html>`;
    }

    // Test seeking functionality
    testSeeking() {
        console.log('Testing seeking functionality...');
        console.log('Player:', this.player);
        console.log('Is video loaded:', this.isVideoLoaded);
        console.log('Current time:', this.currentTime);
        console.log('Duration:', this.duration);
        
        if (this.player && this.isVideoLoaded) {
            // Test seeking to 30 seconds
            this.seekToTime(30);
        } else {
            console.error('Cannot test seeking - player not ready');
        }
    }

    // Debug notes and timestamps
    debugNotes() {
        console.log('=== Notes Debug Info ===');
        console.log('Total notes:', this.notes.length);
        console.log('All notes:', this.notes);
        
        this.notes.forEach((note, index) => {
            console.log(`Note ${index + 1}:`, {
                id: note.id,
                text: note.text,
                timestamp: note.timestamp,
                timestampType: typeof note.timestamp,
                people: note.people
            });
        });
        
        console.log('=== End Debug Info ===');
    }

    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const existing = document.querySelector(`.${type}`);
        if (existing) existing.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);
        
        setTimeout(() => messageDiv.remove(), 5000);
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });

        // Video URL input
        document.getElementById('load-video')?.addEventListener('click', () => {
            const url = document.getElementById('video-url')?.value;
            if (!url) {
                this.showError('Please enter a YouTube URL');
                return;
            }
            
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                this.showError('Invalid YouTube URL. Please check the format.');
                return;
            }
            
            this.loadVideoFromId(videoId);
            this.showSuccess('Video loaded successfully!');
        });

        // Video controls
        document.getElementById('play-pause')?.addEventListener('click', () => this.togglePlayPause());
        document.getElementById('rewind-5')?.addEventListener('click', () => this.jumpTime(-5));
        document.getElementById('forward-5')?.addEventListener('click', () => this.jumpTime(5));
        document.getElementById('test-seek')?.addEventListener('click', () => this.testSeeking());
        document.getElementById('seek-bar')?.addEventListener('click', (e) => this.seekBarClick(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.jumpTime(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.jumpTime(5);
                    break;
            }
        });

        // Add note form
        document.getElementById('add-note-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const text = document.getElementById('note-text')?.value;
            const peopleSelect = document.getElementById('note-people-select');
            const timestamp = document.getElementById('note-timestamp')?.value;
            
            if (!text) return;
            
            // Get selected people from the multiple select dropdown
            const selectedPeople = Array.from(peopleSelect?.selectedOptions || [])
                .map(option => option.value)
                .filter(value => value !== ''); // Filter out the "No people selected" option
            
            const parsedTimestamp = timestamp ? this.parseTimestamp(timestamp) : this.currentTime;
            
            if (timestamp && parsedTimestamp === null) {
                this.showError('Invalid timestamp format. Please use seconds (e.g., 90) or time format (e.g., 1:30)');
                return;
            }
            
            this.addNote(text, selectedPeople, parsedTimestamp);
            
            // Clear form
            document.getElementById('note-text').value = '';
            peopleSelect.selectedIndex = 0; // Reset to "No people selected"
            document.getElementById('note-timestamp').value = '';
        });

        // Add person
        document.getElementById('add-person')?.addEventListener('click', () => {
            const name = document.getElementById('new-person')?.value;
            if (!name) return;
            
            this.addPerson(name);
            document.getElementById('new-person').value = '';
        });

        // People filter
        document.getElementById('people-filter')?.addEventListener('change', () => this.renderNotes());
        document.getElementById('filter-mode')?.addEventListener('change', () => this.renderNotes());

        // Export/Import
        document.getElementById('export-data')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-data')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });
        document.getElementById('debug-notes')?.addEventListener('click', () => this.debugNotes());
        document.getElementById('import-file')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importData(e.target.files[0]);
            }
        });

        // Project Management
        document.getElementById('save-project-as')?.addEventListener('click', () => this.showSaveProjectDialog());
        document.getElementById('load-project')?.addEventListener('click', () => {
            document.getElementById('load-project-file')?.click();
        });
        document.getElementById('load-project-file')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadProject(e.target.files[0]);
            }
        });

        // Save project
        document.getElementById('save-project')?.addEventListener('click', () => this.saveProjectAsHTML());

        // Reset project
        document.getElementById('reset-project')?.addEventListener('click', () => this.resetProject());
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new YouTubeNotesApp();
});
