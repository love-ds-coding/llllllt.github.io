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
        this.capturedTimestamp = null;
        this.updateInterval = null;
        
        // Recording time tracking properties
        this.recordingStartTime = 0;        // When recording started (timestamp)
        this.recordingElapsedTime = 0;      // Total elapsed recording time
        this.isRecordingTime = false;       // Whether we're currently recording
        this.recordingPausedTime = 0;       // Time when recording was paused
        
        // Add webcam controller
        this.webcamController = new WebcamController();
        this.currentSource = 'youtube';
        
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
        if (this.currentSource === 'youtube') {
        if (!this.player) return;
        
        if (this.isPlaying) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
            }
        } else if (this.currentSource === 'local' || this.currentSource === 'webcam') {
            const videoElement = this.webcamController.videoElement;
            if (!videoElement) return;
            
            if (this.isPlaying) {
                videoElement.pause();
            } else {
                videoElement.play();
            }
        }
    }

    seekToTime(seconds) {
        console.log('seekToTime called with:', seconds, 'Type:', typeof seconds);
        
        if (this.currentSource === 'youtube') {
        if (!this.player) {
            console.error('Player not initialized');
            return;
        }
        
        if (!this.isVideoLoaded) {
            console.error('Video not loaded yet');
            return;
        }
        
        const time = parseFloat(seconds);
        if (isNaN(time) || time < 0) {
            console.error('Invalid timestamp:', seconds);
            return;
        }
        
        console.log('Seeking to time:', time, 'seconds');
        
        try {
            this.player.seekTo(time, true);
            setTimeout(() => {
                if (this.player && this.player.getPlayerState) {
                    this.player.pauseVideo();
                    console.log('Video paused after seeking');
                }
            }, 200);
        } catch (error) {
            console.error('Error seeking to time:', error);
        }
        } else if (this.currentSource === 'local') {
            const videoElement = this.webcamController.videoElement;
            if (!videoElement) return;
            
            const time = parseFloat(seconds);
            if (isNaN(time) || time < 0) {
                console.error('Invalid timestamp:', seconds);
                return;
            }
            
            videoElement.currentTime = time;
        }
        // Webcam doesn't support seeking
    }

    jumpTime(seconds) {
        if (this.currentSource === 'youtube') {
        if (!this.player) return;
        
        const currentTime = this.player.getCurrentTime();
        const newTime = Math.max(0, Math.min(currentTime + seconds, this.duration));
        this.seekToTime(newTime);
        } else if (this.currentSource === 'local') {
            const videoElement = this.webcamController.videoElement;
            if (!videoElement) return;
            
            const currentTime = videoElement.currentTime;
        const newTime = Math.max(0, Math.min(currentTime + seconds, this.duration));
        this.seekToTime(newTime);
        }
        // Webcam doesn't support seeking
    }

    seekBarClick(event) {
        if (this.currentSource === 'youtube') {
        if (!this.player) return;
        
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * this.duration;
        this.seekToTime(newTime);
        } else if (this.currentSource === 'local') {
            const videoElement = this.webcamController.videoElement;
            if (!videoElement) return;
            
            const rect = event.currentTarget.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = percentage * this.duration; // Assuming duration is available for local video
        this.seekToTime(newTime);
        }
        // Webcam doesn't support seeking
    }

    startUpdateInterval() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        this.updateInterval = setInterval(() => {
            if (this.currentSource === 'youtube' && this.player && this.isVideoLoaded) {
                this.currentTime = this.player.getCurrentTime();
                this.updateTimeDisplay();
                this.updateSeekBar();
            } else if (this.currentSource === 'local' && this.webcamController.videoElement) {
                this.currentTime = this.webcamController.videoElement.currentTime;
                this.updateTimeDisplay();
                this.updateSeekBar();
            } else if (this.currentSource === 'webcam' && this.webcamController.videoElement) {
                // For webcam mode, only use recording time if actually recording
                if (this.isRecordingTime) {
                    this.updateRecordingTime();
                } else {
                    // When not recording, keep time at 0
                    this.currentTime = 0;
                }
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

    updateCapturedTimeDisplay() {
        const capturedTimeDisplay = document.getElementById('captured-time-display');
        if (capturedTimeDisplay) {
            if (this.capturedTimestamp !== null) {
                const formattedTime = this.formatTime(this.capturedTimestamp);
                capturedTimeDisplay.textContent = `Captured: ${formattedTime}`;
                capturedTimeDisplay.style.display = 'block';
            } else {
                capturedTimeDisplay.style.display = 'none';
            }
        }
    }

    updateSeekBar() {
        const progress = document.getElementById('seek-progress');
        if (progress && this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            progress.style.width = `${percentage}%`;
        }
    }

    updateRecordingTime() {
        if (this.isRecordingTime && !this.webcamController.isPaused) {
            const now = Date.now();
            this.recordingElapsedTime = (now - this.recordingStartTime) / 1000; // Convert to seconds
            this.currentTime = this.recordingElapsedTime;
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
        // Validate file extension - now accept .ynp, .json, and .txt
        const validExtensions = ['.ynp', '.json', '.txt'];
        const fileExtension = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileExtension.endsWith(ext));
        
        if (!hasValidExtension) {
            this.showError('Invalid file type. Please select a .ynp, .json, or .txt project file.');
            return;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File too large. Please select a project file smaller than 10MB.');
            return;
        }
        
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
                this.showError('Error loading project. Please check that this is a valid .ynp project file.');
            }
        };
        
        reader.onerror = () => {
            this.showError('Error reading file. Please try again.');
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
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: transparent;
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
            
            .video-controls {
                flex-direction: column;
                gap: 8px;
            }
            
            .control-btn {
                padding: 12px 16px;
                font-size: 16px;
                min-height: 44px;
            }
            
            .seek-bar {
                height: 8px;
                min-height: 44px;
            }
            
            .note-timestamp {
                padding: 8px 12px;
                font-size: 14px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .filter-select {
                padding: 12px;
                font-size: 16px;
                min-height: 44px;
            }
            
            .mode-btn {
                padding: 12px 16px;
                font-size: 16px;
                min-height: 44px;
            }
        }
        
        /* Mobile-specific touch improvements */
        @media (hover: none) and (pointer: coarse) {
            .note-timestamp:hover {
                background: #007bff;
            }
            
            .control-btn:hover {
                background: #007bff;
            }
            
            .note-item:hover {
                transform: none;
            }
        }
        
        /* Mobile device specific styles */
        .mobile-device .note-timestamp {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }
        
        .mobile-device .control-btn {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }
        
        .mobile-device .seek-bar {
            touch-action: manipulation;
        }
        
        /* Improve mobile scrolling */
        .mobile-device .notes-list {
            -webkit-overflow-scrolling: touch;
        }
        
        /* Mobile-friendly filter controls */
        .mobile-device .people-filter {
            flex-direction: column;
            gap: 15px;
        }
        
        .mobile-device .filter-group {
            width: 100%;
        }
        
        .mobile-device .filter-select {
            width: 100%;
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
                
                // Mobile-specific optimizations
                this.setupMobileOptimizations();
                
                if (this.videoId) {
                    this.loadVideoFromId(this.videoId);
                }
            }
            
            setupMobileOptimizations() {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    // Prevent zoom on double tap
                    let lastTouchEnd = 0;
                    document.addEventListener('touchend', (event) => {
                        const now = (new Date()).getTime();
                        if (now - lastTouchEnd <= 300) {
                            event.preventDefault();
                        }
                        lastTouchEnd = now;
                    }, false);
                    
                    // Add mobile-specific CSS classes
                    document.body.classList.add('mobile-device');
                    
                    // Show mobile help section
                    const mobileHelp = document.getElementById('mobile-help');
                    if (mobileHelp) {
                        mobileHelp.style.display = 'block';
                    }
                    
                    // Optimize for mobile performance
                    if ('serviceWorker' in navigator) {
                        // Add service worker for better mobile performance if available
                        console.log('Service Worker supported on mobile');
                    }
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

                // Mobile-specific player configuration
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                this.player = new YT.Player('youtube-player', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        modestbranding: 1,
                        rel: 0,
                        playsinline: 1, // Important for mobile
                        fs: isMobile ? 0 : 1, // Disable fullscreen on mobile for better UX
                        iv_load_policy: 3, // Disable annotations on mobile
                        cc_load_policy: 0, // Disable captions by default on mobile
                        disablekb: isMobile ? 1 : 0 // Disable keyboard controls on mobile
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
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                let errorMessage = 'Error loading video. Please check the URL and try again.';
                
                // Mobile-specific error messages
                if (isMobile) {
                    switch(event.data) {
                        case 2:
                            errorMessage = 'Mobile: Invalid video ID. Please check the URL.';
                            break;
                        case 5:
                            errorMessage = 'Mobile: HTML5 player error. Try refreshing the page.';
                            break;
                        case 100:
                            errorMessage = 'Mobile: Video not available on mobile. Try a different video.';
                            break;
                        case 101:
                        case 150:
                            errorMessage = 'Mobile: Video embedding not allowed on mobile.';
                            break;
                        default:
                            errorMessage = 'Mobile: Video loading error. Please try again.';
                    }
                }
                
                this.showError(errorMessage);
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
                    // Use longer delay on mobile for better reliability
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const delay = isMobile ? 500 : 200;
                    
                    setTimeout(() => {
                        if (this.player && this.player.getPlayerState) {
                            this.player.pauseVideo();
                            console.log('Video paused after seeking');
                        }
                    }, delay);
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
                
                // Handle both mouse and touch events
                let clientX;
                if (event.type === 'touchend' && event.changedTouches && event.changedTouches[0]) {
                    clientX = event.changedTouches[0].clientX;
                } else {
                    clientX = event.clientX;
                }
                
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = clientX - rect.left;
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
                            <div class="note-timestamp" 
                                 onclick="app.seekToTime(\${timestamp})" 
                                 ontouchstart="this.style.background='#0056b3'" 
                                 ontouchend="this.style.background='#007bff'"
                                 style="cursor: pointer; -webkit-tap-highlight-color: transparent;">
                                \${this.formatTime(timestamp)}
                            </div>
                            <div class="note-people">
                                \${note.people.map(person => 
                                    \`<span class="note-person">\${this.escapeHtml(person)}</span>\`
                                ).join('')}
                            </div>
                        </div>
                        <div class="note-text">\${this.formatTime(timestamp)} - \${this.escapeHtml(note.text)}</div>
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
                document.getElementById('test-seek')?.addEventListener('click', () => this.testSeeking());
                document.getElementById('seek-bar')?.addEventListener('click', (e) => this.seekBarClick(e));

                // Mobile touch event handling
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    // Add touch events for video controls
                    document.getElementById('play-pause')?.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        this.togglePlayPause();
                    });
                    document.getElementById('rewind-5')?.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        this.jumpTime(-5);
                    });
                    document.getElementById('forward-5')?.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        this.jumpTime(5);
                    });
                    document.getElementById('seek-bar')?.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        this.seekBarClick(e);
                    });
                }

                // Keyboard shortcuts (only on desktop)
                if (!isMobile) {
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
                }

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
                    this.setupFileInputForMobile();
                    document.getElementById('load-project-file')?.click();
                });
                document.getElementById('load-project-file')?.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        const file = e.target.files[0];
                        // Validate file extension
                        if (!file.name.toLowerCase().endsWith('.ynp')) {
                            this.showError('Please select a .ynp file only');
                            return;
                        }
                        this.loadProject(file);
                    }
                });

                // Save project
                document.getElementById('save-project')?.addEventListener('click', () => this.saveProjectAsHTML());

                // Reset project
                document.getElementById('reset-project')?.addEventListener('click', () => this.resetProject());

                // Source switching
                document.querySelectorAll('input[name="video-source"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        this.switchVideoSource(e.target.value);
                    });
                });

                // Local file handling
                document.getElementById('local-video-file')?.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    const loadBtn = document.getElementById('load-local-video');
                    if (loadBtn) {
                        loadBtn.disabled = !file;
                    }
                });

                document.getElementById('load-local-video')?.addEventListener('click', () => {
                    const fileInput = document.getElementById('local-video-file');
                    if (fileInput.files[0]) {
                        this.loadLocalVideo(fileInput.files[0]);
                    }
                });

                // Webcam handling
                document.getElementById('start-webcam')?.addEventListener('click', () => {
                    this.startWebcam();
                });

                // Initialize webcam controls when webcam source is selected
                document.querySelector('input[name="video-source"][value="webcam"]')?.addEventListener('change', async () => {
                    if (this.webcamController.cameras.length === 0) {
                        const hasPermission = await this.webcamController.requestCameraPermission();
                        if (hasPermission) {
                            await this.webcamController.enumerateCameras();
                            await this.webcamController.populateCameraSelect();
                        }
                    }
                });

                // Recording controls
                document.getElementById('start-recording')?.addEventListener('click', () => {
                    this.startWebcamRecording();
                });

                document.getElementById('pause-recording')?.addEventListener('click', () => {
                    if (this.webcamController.isPaused) {
                        this.resumeWebcamRecording();
                    } else {
                        this.pauseWebcamRecording();
                    }
                });

                document.getElementById('end-recording')?.addEventListener('click', () => {
                    this.endWebcamRecording();
                });
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
                
                <div id="mobile-help" style="display: none; margin-top: 20px; padding: 15px; background: #3a3a3a; border-radius: 8px; border-left: 4px solid #28a745;">
                    <h4 style="margin-bottom: 10px; color: #28a745;">📱 Mobile Tips:</h4>
                    <ul style="margin-left: 20px; color: #b0b0b0;">
                        <li>Tap any timestamp to jump to that point in the video</li>
                        <li>Use the video controls below the player</li>
                        <li>Filter notes by selecting people from the dropdown</li>
                        <li>Switch between View and Edit modes using the toggle</li>
                    </ul>
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

    // Mobile File Input Setup
    setupFileInputForMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Update file input for mobile to force document picker on Android
            const fileInput = document.getElementById('load-project-file');
            if (fileInput) {
                if (isAndroid) {
                    // Force document picker on Android
                    fileInput.accept = '.ynp,application/json,text/plain';
                    fileInput.setAttribute('capture', 'false');
                    fileInput.setAttribute('data-android-document', 'true');
                    
                    // Add Android-specific help text
                    this.showAndroidDocumentHelp();
                } else {
                    // Regular mobile handling
                    fileInput.accept = '.ynp';
                    fileInput.setAttribute('capture', 'false');
                    
                    // Add mobile-specific help text if it doesn't exist
                    if (!document.getElementById('mobile-file-help')) {
                        const helpText = document.createElement('div');
                        helpText.id = 'mobile-file-help';
                        helpText.innerHTML = `
                            <div style="margin-top: 10px; padding: 10px; background: #3a3a3a; border-radius: 6px; border-left: 4px solid #28a745;">
                                <p style="margin: 0; color: #b0b0b0; font-size: 12px;">
                                    📱 <strong>Mobile Note:</strong> Only .ynp project files can be loaded. 
                                    If you can't see .ynp files, try using the "Share" feature from your file manager.
                                </p>
                                <div style="margin-top: 8px; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                                    <p style="margin: 0; color: #b0b0b0; font-size: 11px;">
                                        <strong>Mobile Tips:</strong><br>
                                        • Use your file manager app to find .ynp files<br>
                                        • Try the "Share" button in your file manager<br>
                                        • Make sure the file has a .ynp extension
                                    </p>
                                </div>
                            </div>
                        `;
                        
                        // Insert help text after the load project button
                        const loadButton = document.getElementById('load-project');
                        if (loadButton && loadButton.parentNode) {
                            loadButton.parentNode.insertBefore(helpText, loadButton.nextSibling);
                        }
                    }
                }
            }
            
            // Show mobile-specific instructions
            this.showMobileFileInstructions();
        }
    }
    
    // Android-specific document picker help
    showAndroidDocumentHelp() {
        if (document.getElementById('android-document-help')) return;
        
        const helpText = document.createElement('div');
        helpText.id = 'android-document-help';
        helpText.innerHTML = `
            <div style="margin-top: 10px; padding: 10px; background: #3a3a3a; border-radius: 6px; border-left: 4px solid #ff9800;">
                <p style="margin: 0; color: #e0e0e0; font-size: 12px;">
                    🤖 <strong>Android Document Picker:</strong> This should now show document options instead of just photos/videos.
                </p>
                <div style="margin-top: 8px; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                    <p style="margin: 0; color: #b0b0b0; font-size: 11px;">
                        <strong>If you still see media options:</strong><br>
                        • Look for "Browse" or "Show all files" option<br>
                        • Try "Files" or "My Files" app instead<br>
                        • Use the "Share" feature from your file manager<br>
                        • Navigate to Downloads folder manually
                    </p>
                </div>
            </div>
        `;
        
        // Insert help text after the load project button
        const loadButton = document.getElementById('load-project');
        if (loadButton && loadButton.parentNode) {
            loadButton.parentNode.insertBefore(helpText, loadButton.nextSibling);
        }
    }
    
    showMobileFileInstructions() {
        // Only show once per session
        if (sessionStorage.getItem('mobileFileInstructionsShown')) return;
        
        const instructions = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: #2d2d2d; padding: 20px; border-radius: 12px; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.8); z-index: 10000; max-width: 90%;">
                <h3 style="margin: 0 0 15px 0; color: #ff4444;">📱 Mobile File Loading</h3>
                <p style="margin: 0 0 15px 0; color: #e0e0e0; line-height: 1.5;">
                    On mobile devices, you can only load .ynp project files. Here's how:
                </p>
                <ol style="margin: 0 0 15px 0; color: #e0e0e0; line-height: 1.5; padding-left: 20px;">
                    <li>Use your file manager app to find .ynp files</li>
                    <li>Use the "Share" button in your file manager</li>
                    <li>Select "Copy to YouTube Notes" or similar</li>
                    <li>Or use the file picker below</li>
                </ol>
                <button onclick="this.parentElement.remove()" 
                        style="width: 100%; padding: 10px; background: #007bff; color: white; 
                               border: none; border-radius: 6px; cursor: pointer;">
                    Got it!
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', instructions);
        sessionStorage.setItem('mobileFileInstructionsShown', 'true');
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

        // Capture time button
        document.getElementById('capture-time-btn')?.addEventListener('click', () => {
            this.capturedTimestamp = this.currentTime;
            this.updateCapturedTimeDisplay();
            // Clear the input field since captured time takes precedence
            document.getElementById('note-timestamp').value = '';
        });

        // Clear captured timestamp when user types in the input field
        document.getElementById('note-timestamp')?.addEventListener('input', () => {
            if (this.capturedTimestamp !== null) {
                this.capturedTimestamp = null;
                this.updateCapturedTimeDisplay();
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
            
            // Priority: 1) Input field, 2) Captured timestamp, 3) Current time
            let parsedTimestamp;
            if (timestamp) {
                parsedTimestamp = this.parseTimestamp(timestamp);
            } else if (this.capturedTimestamp !== null) {
                parsedTimestamp = this.capturedTimestamp;
            } else {
                parsedTimestamp = this.currentTime;
            }
            
            if (timestamp && parsedTimestamp === null) {
                this.showError('Invalid timestamp format. Please use seconds (e.g., 90) or time format (e.g., 1:30)');
                return;
            }
            
            this.addNote(text, selectedPeople, parsedTimestamp);
            
            // Clear form
            document.getElementById('note-text').value = '';
            peopleSelect.selectedIndex = 0; // Reset to "No people selected"
            document.getElementById('note-timestamp').value = '';
            this.capturedTimestamp = null;
            this.updateCapturedTimeDisplay();
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
            this.setupFileInputForMobile();
            document.getElementById('load-project-file')?.click();
        });
        document.getElementById('load-project-file')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                const file = e.target.files[0];
                // Validate file extension
                if (!file.name.toLowerCase().endsWith('.ynp')) {
                    this.showError('Please select a .ynp file only');
                    return;
                }
                this.loadProject(file);
            }
        });

        // Save project
        document.getElementById('save-project')?.addEventListener('click', () => this.saveProjectAsHTML());

        // Reset project
        document.getElementById('reset-project')?.addEventListener('click', () => this.resetProject());

        // Source switching
        document.querySelectorAll('input[name="video-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchVideoSource(e.target.value);
            });
        });

        // Local file handling
        document.getElementById('local-video-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const loadBtn = document.getElementById('load-local-video');
            if (loadBtn) {
                loadBtn.disabled = !file;
            }
        });

        document.getElementById('load-local-video')?.addEventListener('click', () => {
            const fileInput = document.getElementById('local-video-file');
            if (fileInput.files[0]) {
                this.loadLocalVideo(fileInput.files[0]);
            }
        });

        // Webcam handling
        document.getElementById('start-webcam')?.addEventListener('click', () => {
            this.startWebcam();
        });

        // Initialize webcam controls when webcam source is selected
        document.querySelector('input[name="video-source"][value="webcam"]')?.addEventListener('change', async () => {
            if (this.webcamController.cameras.length === 0) {
                const hasPermission = await this.webcamController.requestCameraPermission();
                if (hasPermission) {
                    await this.webcamController.enumerateCameras();
                    await this.webcamController.populateCameraSelect();
                }
            }
        });

        // Recording controls
        document.getElementById('start-recording')?.addEventListener('click', () => {
            this.startWebcamRecording();
        });

        document.getElementById('pause-recording')?.addEventListener('click', () => {
            if (this.webcamController.isPaused) {
                this.resumeWebcamRecording();
            } else {
                this.pauseWebcamRecording();
            }
        });

        document.getElementById('end-recording')?.addEventListener('click', () => {
            this.endWebcamRecording();
        });
    }

    switchVideoSource(sourceType) {
        this.currentSource = sourceType;
        
        // Reset recording time if switching away from webcam
        if (sourceType !== 'webcam') {
            this.isRecordingTime = false;
            this.recordingStartTime = 0;
            this.recordingElapsedTime = 0;
            this.recordingPausedTime = 0;
        }
        
        // Hide all source controls
        document.querySelectorAll('.source-control').forEach(control => {
            control.classList.remove('active');
        });
        
        // Show selected source control
        const targetControl = document.getElementById(`${sourceType}-controls`);
        if (targetControl) {
            targetControl.classList.add('active');
        }
        
        // Call the appropriate switch method
        if (sourceType === 'youtube') {
            this.switchToYouTube();
        } else if (sourceType === 'local') {
            this.switchToLocal();
        } else if (sourceType === 'webcam') {
            this.switchToWebcam();
        }
    }

    switchToYouTube() {
        // Show YouTube player, hide others
        const youtubePlayer = document.getElementById('youtube-player');
        if (youtubePlayer) {
            youtubePlayer.style.display = 'block';
        }
        this.webcamController.hideVideoElement();
    }

    switchToLocal() {
        // Hide YouTube player, show video element for local files
        const youtubePlayer = document.getElementById('youtube-player');
        if (youtubePlayer) {
            youtubePlayer.style.display = 'none';
        }
        
        // Ensure video element exists before showing it
        if (!this.webcamController.videoElement) {
            this.webcamController.createVideoElement();
        }
        
        this.webcamController.hideVideoElement(); // Hide initially, will be shown when file loads
    }

    switchToWebcam() {
        // Hide YouTube player, show video element for webcam
        const youtubePlayer = document.getElementById('youtube-player');
        if (youtubePlayer) {
            youtubePlayer.style.display = 'none';
        }
        
        // Ensure video element exists before showing it
        if (!this.webcamController.videoElement) {
            this.webcamController.createVideoElement();
        }
        
        this.webcamController.showVideoElement();
    }

    async loadLocalVideo(file) {
        if (!file) return;
        
        this.switchToLocal();
        
        // Create video element if it doesn't exist
        if (!this.webcamController.videoElement) {
            this.webcamController.createVideoElement();
        }
        
        const videoElement = this.webcamController.videoElement;
        const url = URL.createObjectURL(file);
        videoElement.src = url;
        videoElement.style.display = 'block';
        
        // Set up video event listeners
        videoElement.onloadedmetadata = () => {
            this.duration = videoElement.duration;
            this.isVideoLoaded = true;
            this.enableControls();
            this.startUpdateInterval();
            this.updateTimeDisplay();
        };
        
        videoElement.onplay = () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        };
        
        videoElement.onpause = () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        };
        
        videoElement.ontimeupdate = () => {
            this.currentTime = videoElement.currentTime;
            this.updateTimeDisplay();
            this.updateSeekBar();
        };
    }

    async startWebcam() {
        try {
            const cameraSelect = document.getElementById('camera-select');
            const selectedCameraId = cameraSelect.value;
            
            await this.webcamController.startWebcam(selectedCameraId);
            this.switchToWebcam();
            
            // Show recording controls when webcam starts
            const recordingControls = document.getElementById('recording-controls');
            if (recordingControls) {
                recordingControls.style.display = 'block';
            }
            
            // Initialize recording button states
            this.updateRecordingButtonStates();
            
            // Set up video controls for webcam
            this.duration = Infinity; // Webcam has no end
            this.isVideoLoaded = true;
            this.enableControls();
            this.startUpdateInterval();
            this.updateTimeDisplay();
            
            this.showSuccess('Webcam started successfully!');
        } catch (error) {
            this.showError('Failed to start webcam: ' + error.message);
        }
    }

    stopWebcam() {
        this.webcamController.stopWebcam();
        this.isVideoLoaded = false;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.updateTimeDisplay();
        this.updateSeekBar();
        this.updatePlayPauseButton();
    }

    startWebcamRecording() {
        this.webcamController.startRecording();
        this.updateRecordingButtonStates();
        
        // Start recording time tracking (webcam mode only)
        if (this.currentSource === 'webcam') {
            this.recordingStartTime = Date.now();
            this.recordingElapsedTime = 0;
            this.isRecordingTime = true;
            this.recordingPausedTime = 0;
        }
        
        this.showSuccess('Recording started');
    }

    pauseWebcamRecording() {
        this.webcamController.pauseRecording();
        this.updateRecordingButtonStates();
        
        // Pause recording time tracking (webcam mode only)
        if (this.currentSource === 'webcam' && this.isRecordingTime) {
            this.recordingPausedTime = Date.now();
        }
        
        this.showSuccess('Recording paused');
    }

    resumeWebcamRecording() {
        this.webcamController.resumeRecording();
        this.updateRecordingButtonStates();
        
        // Resume recording time tracking (webcam mode only)
        if (this.currentSource === 'webcam' && this.isRecordingTime && this.recordingPausedTime > 0) {
            const pauseDuration = Date.now() - this.recordingPausedTime;
            this.recordingStartTime += pauseDuration; // Adjust start time to account for pause
            this.recordingPausedTime = 0;
        }
        
        this.showSuccess('Recording resumed');
    }

    async endWebcamRecording() {
        try {
            const blob = await this.webcamController.stopRecording();
            this.updateRecordingButtonStates();
            
            // Reset recording time tracking (webcam mode only)
            if (this.currentSource === 'webcam') {
                this.isRecordingTime = false;
                this.recordingStartTime = 0;
                this.recordingElapsedTime = 0;
                this.recordingPausedTime = 0;
                this.currentTime = 0;
            }
            
            if (blob && blob.size > 0) {
                this.downloadRecording(blob);
                this.showSuccess('Recording saved and downloaded!');
            } else {
                this.showError('No recording data available');
            }
        } catch (error) {
            console.error('Error ending recording:', error);
            this.showError('Error ending recording: ' + error.message);
        }
    }

    downloadRecording(blob) {
        if (!blob || blob.size === 0) {
            this.showError('No recording data available');
            return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcam-recording-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateRecordingButtonStates() {
        const startBtn = document.getElementById('start-recording');
        const pauseBtn = document.getElementById('pause-recording');
        const endBtn = document.getElementById('end-recording');
        
        if (!startBtn || !pauseBtn || !endBtn) return;
        
        const isRecording = this.webcamController.isRecording;
        const isPaused = this.webcamController.isPaused;
        
        // Start button: disabled when recording
        startBtn.disabled = isRecording;
        
        // Pause button: enabled when recording, text changes based on state
        pauseBtn.disabled = !isRecording;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        
        // End button: enabled when recording
        endBtn.disabled = !isRecording;
    }
}

// Add WebcamController class before the main YouTubeNotesApp class
class WebcamController {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.cameras = [];
        this.currentCameraId = null;
        
        // Recording properties
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.recordingBlob = null;
    }

    async enumerateCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');
            return this.cameras;
        } catch (error) {
            console.error('Error enumerating cameras:', error);
            return [];
        }
    }

    async requestCameraPermission() {
        try {
            // Request permission by trying to access camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Stop the stream immediately after getting permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera permission denied:', error);
            return false;
        }
    }

    async populateCameraSelect() {
        const cameraSelect = document.getElementById('camera-select');
        if (!cameraSelect) return;

        // Clear existing options except the first one
        cameraSelect.innerHTML = '<option value="">Select Camera...</option>';

        if (this.cameras.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No cameras found';
            option.disabled = true;
            cameraSelect.appendChild(option);
            return;
        }

        this.cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        cameraSelect.disabled = false;
    }

    async detectWebcamCapabilities() {
        try {
            // First, get basic stream to detect capabilities
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const capabilities = videoTrack.getCapabilities();
            
            console.log('Current settings:', settings);
            console.log('Available capabilities:', capabilities);
            
            // Stop the test stream
            stream.getTracks().forEach(track => track.stop());
            
            return {
                currentResolution: `${settings.width}x${settings.height}`,
                currentFrameRate: settings.frameRate,
                maxWidth: capabilities.width?.max || 1920,
                maxHeight: capabilities.height?.max || 1080,
                maxFrameRate: capabilities.frameRate?.max || 30,
                supportedResolutions: this.getSupportedResolutions(capabilities)
            };
        } catch (error) {
            console.error('Error detecting webcam capabilities:', error);
            return null;
        }
    }

    getSupportedResolutions(capabilities) {
        const resolutions = [
            { width: 1920, height: 1080, frameRate: 60 },
            { width: 1920, height: 1080, frameRate: 30 },
            { width: 1280, height: 720, frameRate: 60 },
            { width: 1280, height: 720, frameRate: 30 },
            { width: 640, height: 480, frameRate: 30 }
        ];
        
        return resolutions.filter(res => 
            res.width <= (capabilities.width?.max || 1920) &&
            res.height <= (capabilities.height?.max || 1080) &&
            res.frameRate <= (capabilities.frameRate?.max || 30)
        );
    }

    getBestSupportedMimeType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Priority order based on browser and quality
        const codecPriority = [];
        
        if (userAgent.includes('chrome') || userAgent.includes('edge')) {
            codecPriority.push(
                'video/webm;codecs=h264',  // Best for Chrome
                'video/webm;codecs=vp9',   // Good fallback
                'video/webm;codecs=vp8'    // Universal fallback
            );
        } else if (userAgent.includes('firefox')) {
            codecPriority.push(
                'video/webm;codecs=vp9',   // Best for Firefox
                'video/webm;codecs=vp8'    // Fallback
            );
        } else if (userAgent.includes('safari')) {
            codecPriority.push(
                'video/mp4;codecs=h264',   // Best for Safari
                'video/webm;codecs=h264'   // Fallback
            );
        } else {
            // Default priority
            codecPriority.push(
                'video/webm;codecs=h264',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8'
            );
        }
        
        for (const codec of codecPriority) {
            if (MediaRecorder.isTypeSupported(codec)) {
                console.log('Selected codec:', codec);
                return codec;
            }
        }
        
        console.warn('No supported codec found, using default');
        return 'video/webm';
    }

    getMediaRecorderOptions() {
        const mimeType = this.getBestSupportedMimeType();
        const options = { mimeType };
        
        // Get actual video settings
        const videoTrack = this.stream?.getVideoTracks()[0];
        const settings = videoTrack?.getSettings() || {};
        const resolution = (settings.width || 1280) * (settings.height || 720);
        const frameRate = settings.frameRate || 30;
        
        // Calculate bitrate based on resolution and frame rate
        let videoBitrate;
        if (resolution >= 1920 * 1080) { // 1080p
            videoBitrate = frameRate >= 60 ? 8000000 : 5000000; // 8 Mbps for 60fps, 5 Mbps for 30fps
        } else if (resolution >= 1280 * 720) { // 720p
            videoBitrate = frameRate >= 60 ? 4000000 : 2500000; // 4 Mbps for 60fps, 2.5 Mbps for 30fps
        } else { // Lower resolution
            videoBitrate = 1500000; // 1.5 Mbps
        }
        
        options.videoBitsPerSecond = videoBitrate;
        options.audioBitsPerSecond = 192000; // 192 kbps for high quality audio
        
        console.log('MediaRecorder options:', {
            mimeType,
            videoBitrate: `${(videoBitrate / 1000000).toFixed(1)} Mbps`,
            audioBitrate: '192 kbps',
            resolution: `${settings.width}x${settings.height}`,
            frameRate: `${frameRate} fps`
        });
        
        return options;
    }

    async startWebcam(cameraId = null) {
        try {
            // Stop existing stream if any
            this.stopWebcam();
            
            // Detect webcam capabilities first
            const capabilities = await this.detectWebcamCapabilities();
            console.log('Webcam capabilities:', capabilities);
            
            // Try to get the highest quality first
            const constraints = {
                video: {
                    deviceId: cameraId ? { exact: cameraId } : undefined,
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    frameRate: { ideal: 60, min: 30 },
                    facingMode: cameraId ? undefined : 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                }
            };
            
            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('High quality stream obtained');
            } catch (error) {
                console.log('High quality failed, trying medium quality...');
                // Fallback to medium quality
                constraints.video.width = { ideal: 1280, min: 640 };
                constraints.video.height = { ideal: 720, min: 480 };
                constraints.video.frameRate = { ideal: 30, min: 15 };
                
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Medium quality stream obtained');
            }
            
            this.currentCameraId = cameraId;

            // Create video element if it doesn't exist
            if (!this.videoElement) {
                this.createVideoElement();
            }

            this.videoElement.srcObject = this.stream;
            this.videoElement.play();
            
            // Log actual settings achieved
            const videoTrack = this.stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            console.log('Actual video settings:', {
                resolution: `${settings.width}x${settings.height}`,
                frameRate: settings.frameRate,
                codec: settings.codec
            });

            this.showVideoElement();
            return true;
        } catch (error) {
            console.error('Error starting webcam:', error);
            throw error;
        }
    }

    stopWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        this.currentCameraId = null;
    }

    async testWebcamCapabilities() {
        console.log('=== Webcam Capabilities Test ===');
        
        // Test codec support
        console.log('Codec Support:');
        console.log('H.264 WebM:', MediaRecorder.isTypeSupported('video/webm;codecs=h264'));
        console.log('H.264 MP4:', MediaRecorder.isTypeSupported('video/mp4;codecs=h264'));
        console.log('VP8:', MediaRecorder.isTypeSupported('video/webm;codecs=vp8'));
        console.log('VP9:', MediaRecorder.isTypeSupported('video/webm;codecs=vp9'));
        
        // Test webcam capabilities
        const capabilities = await this.detectWebcamCapabilities();
        if (capabilities) {
            console.log('Webcam Capabilities:', capabilities);
        }
        
        return capabilities;
    }

    createVideoElement() {
        const videoWrapper = document.querySelector('.video-wrapper');
        if (!videoWrapper) return;

        this.videoElement = document.createElement('video');
        this.videoElement.id = 'webcam-video-player';
        this.videoElement.style.display = 'none';
        this.videoElement.style.position = 'absolute';
        this.videoElement.style.top = '0';
        this.videoElement.style.left = '0';
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;

        videoWrapper.appendChild(this.videoElement);
    }

    showVideoElement() {
        if (this.videoElement) {
            this.videoElement.style.display = 'block';
        }
    }

    hideVideoElement() {
        if (this.videoElement) {
            this.videoElement.style.display = 'none';
        }
    }

    // Recording methods
    async startRecording() {
        if (!this.stream) {
            throw new Error('No webcam stream available');
        }
        
        if (this.isRecording) {
            return; // Already recording
        }
        
        try {
            this.recordedChunks = [];
            const options = this.getMediaRecorderOptions();
            
            console.log('Creating MediaRecorder with options:', options);
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    console.log('Data chunk received:', event.data.size, 'bytes');
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const mimeType = this.getBestSupportedMimeType();
                this.recordingBlob = new Blob(this.recordedChunks, { type: mimeType });
                console.log('Recording stopped, blob created:', this.recordingBlob);
                console.log('Final MIME type:', mimeType);
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
            };
            
            // Start recording with timeslice for better chunking
            this.mediaRecorder.start(1000); // 1 second chunks
            this.isRecording = true;
            this.isPaused = false;
            console.log('Recording started with codec:', options.mimeType);
        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }

    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
            this.isPaused = true;
            console.log('Recording paused');
        }
    }

    resumeRecording() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
            this.isPaused = false;
            console.log('Recording resumed');
        }
    }

    stopRecording() {
        return new Promise((resolve) => {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.onstop = () => {
                    this.recordingBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                    this.isRecording = false;
                    this.isPaused = false;
                    console.log('Recording stopped, blob created:', this.recordingBlob);
                    resolve(this.recordingBlob);
                };
                
                this.mediaRecorder.stop();
            } else {
                resolve(null);
            }
        });
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new YouTubeNotesApp();
});
