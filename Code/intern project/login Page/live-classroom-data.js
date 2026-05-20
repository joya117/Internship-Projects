/**
 * Live Classroom Data Management
 * Handles data for collaborative notes
 */

const LC_STORAGE_KEY = 'campusSync_liveClassroom';

// Get data store
function getLCData() {
    const stored = localStorage.getItem(LC_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        notes: '',
        groups: [],
        members: [],
        chat: [],
        autoSaved: null
    };
}

function saveLCData(data) {
    localStorage.setItem(LC_STORAGE_KEY, JSON.stringify(data));
    updateSaveStatus();
}

// Update save status
function updateSaveStatus() {
    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
        statusEl.textContent = 'Saved ' + new Date().toLocaleTimeString();
    }
}

// Load saved notes
function loadNotes() {
    const data = getLCData();
    const editor = document.getElementById('notesEditor');
    if (editor && data.notes) {
        editor.value = data.notes;
    }
}

// Save notes function
function saveNotes() {
    const editor = document.getElementById('notesEditor');
    if (!editor) return;

    const data = getLCData();
    data.notes = editor.value;
    data.autoSaved = new Date().toISOString();
    saveLCData(data);
}

// Auto-save on typing
let saveTimeout;
document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('notesEditor');
    if (editor) {
        editor.addEventListener('input', function() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveNotes, 1000);
        });

        // Initial load
        loadNotes();
    }

    // Load groups
    loadGroupsFromDashboard();
    renderChat();
});

// Load groups from dashboard data
function loadGroupsFromDashboard() {
    const dashData = JSON.parse(localStorage.getItem('campusSync_data') || '{}');
    const groups = dashData.groups || [];

    const data = getLCData();
    if (groups.length > 0 && data.groups.length === 0) {
        data.groups = groups;
        saveLCData(data);
    }

    renderGroups();
}

// Render groups
function renderGroups() {
    const data = getLCData();
    const list = document.getElementById('groupsList');
    const count = document.getElementById('groupCount');

    if (count) {
        count.textContent = data.groups.length;
    }

    if (!list) return;

    if (data.groups.length === 0) {
        list.innerHTML = '<div class="empty-state-text"><p>No groups yet.</p></div>';
        return;
    }

    list.innerHTML = data.groups.map(g => `
        <div class="group-item" onclick="selectGroup('${g.name}')">
            <div class="group-icon" style="background: linear-gradient(135deg, ${g.color || '#ff2770'}, ${g.color || '#ff6b6b'}99);">${g.name[0]}</div>
            <div class="group-info">
                <h4>${g.name}</h4>
                <p>${g.members || 1} member${(g.members || 1) > 1 ? 's' : ''}</p>
            </div>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteGroup(${g.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Create new group
function createNewGroup() {
    const name = prompt('Enter group name:');
    if (!name) return;

    const data = getLCData();
    const colors = ['#ff2770', '#4facfe', '#00f260', '#f093fb', '#a8edea'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    data.groups.push({
        id: Date.now(),
        name: name,
        color: randomColor,
        members: 1
    });
    saveLCData(data);
    renderGroups();

    // Also save to dashboard
    const dashData = JSON.parse(localStorage.getItem('campusSync_data') || '{}');
    if (!dashData.groups) dashData.groups = [];
    dashData.groups.push({
        id: Date.now(),
        name: name,
        color: randomColor,
        members: 1,
        active: true
    });
    localStorage.setItem('campusSync_data', JSON.stringify(dashData));

    document.getElementById('noteTitle').textContent = name;
    alert(`Group "${name}" created! Start writing together.`);
}

// Select group
function selectGroup(name) {
    document.getElementById('noteTitle').textContent = name;
    alert(`Switched to "${name}" - your shared notes will appear here.`);
}

// Delete group
function deleteGroup(id) {
    if (!confirm('Delete this group?')) return;

    const data = getLCData();
    data.groups = data.groups.filter(g => g.id !== id);
    saveLCData(data);
    renderGroups();
}

// Render members
function renderMembers() {
    const data = getLCData();
    const list = document.getElementById('membersList');

    // Start with current user
    let html = `
        <div class="member-item">
            <div class="member-avatar" style="background: #ff2770;">Y</div>
            <div class="member-info">
                <h4>You</h4>
                <p>Owner</p>
            </div>
            <div class="member-status">
                <i class="fa-solid fa-circle"></i> You
            </div>
        </div>
    `;

    // Add other members
    if (data.members) {
        data.members.forEach(m => {
            html += `
                <div class="member-item">
                    <div class="member-avatar" style="background: ${m.color || '#4facfe'};">${m.name[0]}</div>
                    <div class="member-info">
                        <h4>${m.name}</h4>
                        <p>Member</p>
                    </div>
                    <button class="delete-btn" onclick="removeMember('${m.name}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        });
    }

    if (list) list.innerHTML = html;
}

// Add member
function addMember() {
    const name = prompt('Enter member name to add:');
    if (!name) return;

    const data = getLCData();
    const colors = ['#4facfe', '#00f260', '#f093fb', '#a8edea'];
    data.members.push({
        name: name,
        color: colors[Math.floor(Math.random() * colors.length)]
    });
    saveLCData(data);
    renderMembers();

    // Add system message
    addChatMessage('System', `${name} joined the group!`);
}

// Remove member
function removeMember(name) {
    if (!confirm(`Remove ${name} from the group?`)) return;

    const data = getLCData();
    data.members = data.members.filter(m => m.name !== name);
    saveLCData(data);
    renderMembers();
}

// Chat functions
function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    addChatMessage('You', text);
    input.value = '';
}

function addChatMessage(user, text) {
    const data = getLCData();
    data.chat.push({
        id: Date.now(),
        user: user,
        text: text,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
    saveLCData(data);
    renderChat();
}

// Handle Enter key in chat
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

function renderChat() {
    const data = getLCData();
    const container = document.getElementById('chatMessages');
    const count = document.getElementById('chatCount');

    if (count) {
        count.textContent = data.chat.length;
    }

    if (!container) return;

    if (data.chat.length === 0) {
        container.innerHTML = `
            <div class="chat-msg-item">
                <div class="chat-msg-header">
                    <span class="chat-user">System</span>
                </div>
                <div class="chat-text">Start a conversation! Add members to collaborate.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = data.chat.map(m => `
        <div class="chat-msg-item">
            <div class="chat-msg-header">
                <span class="chat-user">${m.user}</span>
                <span class="chat-time">${m.time}</span>
            </div>
            <div class="chat-text">${m.text}</div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

// Formatting functions
function formatText(command, value = null) {
    document.execCommand(command, false, value);
}

function addChecklist() {
    const editor = document.getElementById('notesEditor');
    const checked = prompt('Enter item for checklist:');
    if (checked) {
        const checkbox = '\n[ ] ' + checked;
        editor.value += checkbox;
        saveNotes();
    }
}

function insertLink() {
    const url = prompt('Enter URL:');
    const text = prompt('Enter link text:');
    if (url && text) {
        const editor = document.getElementById('notesEditor');
        editor.value += `\n[${text}](${url})`;
        saveNotes();
    }
}

function insertImage() {
    const url = prompt('Enter image URL:');
    if (url) {
        const editor = document.getElementById('notesEditor');
        editor.value += `\n![Image](${url})`;
        saveNotes();
    }
}

function addTable() {
    const rows = prompt('Enter number of rows:', '3');
    const cols = prompt('Enter number of columns:', '2');

    if (rows && cols) {
        let table = '\n|';
        for (let c = 0; c < cols; c++) {
            table += ' Column ' + (c+1) + ' |';
        }
        table += '\n|';
        for (let c = 0; c < cols; c++) {
            table += ' --- |';
        }
        for (let r = 0; r < rows; r++) {
            table += '\n|';
            for (let c = 0; c < cols; c++) {
                table += '   |';
            }
        }
        const editor = document.getElementById('notesEditor');
        editor.value += table;
        saveNotes();
    }
}

// Invite collaborator
function inviteCollaborator() {
    alert('Share this page link with your friends to collaborate!\n\nIn a real app, this would generate a unique invite link.');
}

// Share notes
function shareNotes() {
    const notes = document.getElementById('notesEditor').value;
    if (!notes) {
        alert('Write some notes first!');
        return;
    }
    alert('Notes shared! In a real app, this would generate a shareable link.');
}

// Start video call
function startVideoCall() {
    alert('Video call feature!\n\nIn a production app, this would connect to a video conferencing service like WebRTC or Zoom API.');
}

// Make functions global
window.createNewGroup = createNewGroup;
window.selectGroup = selectGroup;
window.deleteGroup = deleteGroup;
window.addMember = addMember;
window.removeMember = removeMember;
window.sendMessage = sendMessage;
window.formatText = formatText;
window.addChecklist = addChecklist;
window.insertLink = insertLink;
window.insertImage = insertImage;
window.addTable = addTable;
window.inviteCollaborator = inviteCollaborator;
window.shareNotes = shareNotes;
window.startVideoCall = startVideoCall;
window.saveNotes = saveNotes;
window.loadNotes = loadNotes;