/**
 * Live Classroom - Collaborative Notes JavaScript
 * Handles real-time collaboration features
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initNotesEditor();
    initToolbarButtons();
    initChatSystem();
    initGroupSelection();
});

/**
 * Initialize the notes editor with real-time collaboration
 */
function initNotesEditor() {
    const notesEditor = document.getElementById('notesEditor');
    if (!notesEditor) return;

    let typingTimeout;

    // Track typing activity
    notesEditor.addEventListener('input', function() {
        // Simulate broadcasting changes to other users
        broadcastChanges();

        // Clear and reset typing indicator
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            updateEditingStatus('typing');
        }, 1000);
    });

    // Track cursor position for collaboration visualization
    notesEditor.addEventListener('click', function(e) {
        const position = e.target.selectionStart;
        broadcastCursorPosition(position);
    });

    // Handle focus events
    notesEditor.addEventListener('focus', function() {
        updateUserStatus('You', 'editing');
    });

    // Auto-save functionality
    notesEditor.addEventListener('blur', function() {
        saveNotes();
    });
}

/**
 * Simulate broadcasting changes to other users
 */
function broadcastChanges() {
    console.log('Broadcasting changes to collaborators...');
    // Here you would integrate with WebSocket/Firebase
    updateLastSaved('Saving...');

    // Simulate save completion
    setTimeout(() => {
        updateLastSaved('Saved just now');
    }, 500);
}

/**
 * Update the last saved status
 */
function updateLastSaved(status) {
    const savedElement = document.querySelector('.last-saved');
    if (savedElement) {
        savedElement.innerHTML = `<i class="fa-solid fa-cloud"></i> ${status}`;
    }
}

/**
 * Update user's editing status
 */
function updateEditingStatus(status) {
    const statusElement = document.querySelector('.user-presence .editing-status');
    if (statusElement) {
        const icon = statusElement.querySelector('i');
        if (icon) {
            if (status === 'typing') {
                icon.className = 'fa-solid fa-pen';
                statusElement.innerHTML = '<i class="fa-solid fa-pen"></i> typing...';
            } else {
                icon.className = 'fa-solid fa-eye';
                statusElement.innerHTML = '<i class="fa-solid fa-eye"></i> viewing';
            }
        }
    }
}

/**
 * Update user status
 */
function updateUserStatus(userName, status) {
    console.log(`${userName} is now ${status}`);
    // Here you would broadcast to other users
}

/**
 * Broadcast cursor position
 */
function broadcastCursorPosition(position) {
    console.log('Cursor at position:', position);
    // Here you would broadcast cursor position to other users
}

/**
 * Save notes (simulated)
 */
function saveNotes() {
    console.log('Saving notes...');
    // Here you would integrate with backend storage
}

/**
 * Initialize toolbar buttons
 */
function initToolbarButtons() {
    const toolbarButtons = document.querySelectorAll('.editor-toolbar button');

    toolbarButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const command = this.getAttribute('title') || 'format';
            applyFormatting(command);

            // Toggle active state
            this.classList.toggle('active');
        });
    });
}

/**
 * Apply formatting to the editor
 */
function applyFormatting(command) {
    const editor = document.getElementById('notesEditor');
    if (!editor) return;

    const selection = window.getSelection();
    const selectedText = selection.toString();

    // Map command to document.execCommand or custom actions
    const commands = {
        'Bold': 'bold',
        'Italic': 'italic',
        'Underline': 'underline',
        'Bullet List': 'insertUnorderedList',
        'Numbered List': 'insertOrderedList',
        'Checklist': 'customChecklist',
        'Heading': 'formatBlock',
        'Quote': 'formatBlock',
        'Code': 'formatBlock'
    };

    if (commands[command]) {
        if (command === 'Heading') {
            document.execCommand(commands[command], false, '<h3>');
        } else if (command === 'Quote') {
            document.execCommand(commands[command], false, '<blockquote>');
        } else if (command === 'Code') {
            document.execCommand(commands[command], false, '<pre>');
        } else {
            document.execCommand(commands[command], false, null);
        }
    }
}

/**
 * Initialize chat system
 */
function initChatSystem() {
    const chatInput = document.querySelector('.chat-input-box input');
    const chatButton = document.querySelector('.chat-input-box button');

    if (chatInput && chatButton) {
        chatButton.addEventListener('click', () => sendChatMessage(chatInput));
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage(chatInput);
            }
        });
    }
}

/**
 * Send chat message
 */
function sendChatMessage(inputElement) {
    const message = inputElement.value.trim();
    if (!message) return;

    // Add message to chat (simulated)
    addChatMessage('You', message);

    // Clear input
    inputElement.value = '';
}

/**
 * Add message to chat display
 */
function addChatMessage(userName, message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const messageHTML = `
        <div class="chat-msg-item">
            <div class="chat-msg-header">
                <span class="chat-user">${userName}</span>
                <span class="chat-time">${time}</span>
            </div>
            <div class="chat-text">${message}</div>
        </div>
    `;

    chatMessages.insertAdjacentHTML('beforeend', messageHTML);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Initialize group selection
 */
function initGroupSelection() {
    const groupItems = document.querySelectorAll('.group-item');

    groupItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all groups
            groupItems.forEach(g => g.classList.remove('active'));

            // Add active class to clicked group
            this.classList.add('active');

            // Get group name and load notes
            const groupName = this.querySelector('.group-info h4').textContent;
            loadGroupNotes(groupName);
        });
    });
}

/**
 * Load notes for selected group
 */
function loadGroupNotes(groupName) {
    console.log(`Loading notes for group: ${groupName}`);
    // Here you would fetch group notes from backend

    // Update UI to show loading
    const notesEditor = document.getElementById('notesEditor');
    if (notesEditor) {
        notesEditor.value = `Loading notes for ${groupName}...\n\nNote: In a real implementation, this would load the group's shared notes from a database.`;
    }
}

/**
 * Initialize mini video call
 */
function initVideoCall() {
    const videoButton = document.querySelector('.video-toggle-btn');
    if (videoButton) {
        videoButton.addEventListener('click', function() {
            // Toggle video call
            console.log('Opening video call...');
            // Here you would integrate with WebRTC or a video service
            alert('Video call feature would open here!\n\nIn a production app, this would connect to a video conferencing service.');
        });
    }
}

// Simulate receiving updates from other users (demo)
setInterval(() => {
    // This would be replaced with actual WebSocket/realtime DB integration
    // For demo purposes, we'll just log
    // console.log('Checking for updates...');
}, 10000);

// Export functions for global access
window.liveClassroom = {
    initNotesEditor,
    initToolbarButtons,
    initChatSystem,
    initGroupSelection,
    initVideoCall,
    addChatMessage,
    updateLastSaved
};