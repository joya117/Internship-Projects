/**
 * Dashboard Data Management
 * Handles adding, saving, and deleting user data
 */

// Data storage (using localStorage for persistence)
const STORAGE_KEY = 'campusSync_data';

// Initialize data structure
function getDataStore() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        assignments: [],
        schedule: [],
        news: [],
        groups: [],
        quickNotes: '',
        activities: []
    };
}

function saveDataStore(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Update welcome message
function updateWelcomeMessage() {
    const userName = sessionStorage.getItem('userName');
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && userName) {
        welcomeElement.textContent = `Welcome back, ${userName}!`;
    }
}

// Add Assignment
function addAssignment() {
    const title = prompt('Enter assignment title:');
    if (!title) return;

    const dueDate = prompt('Enter due date (e.g., Friday, May 20):') || 'No due date';
    const subject = prompt('Enter subject/course:') || 'General';

    const data = getDataStore();
    data.assignments.push({
        id: Date.now(),
        title: title,
        dueDate: dueDate,
        subject: subject,
        completed: false
    });
    saveDataStore(data);
    renderAssignments();
}

// Render Assignments
function renderAssignments() {
    const data = getDataStore();
    const list = document.getElementById('assignmentsList');
    if (!list) return;

    if (data.assignments.length === 0) {
        list.innerHTML = `
            <li class="empty-state">
                <i class="fa-solid fa-file-lines"></i>
                <p>No assignments yet. Click "Add" to create one.</p>
            </li>
        `;
        return;
    }

    list.innerHTML = data.assignments.map(a => `
        <li>
            <div>
                <strong>${a.title}</strong>
                <p>Due: ${a.dueDate}</p>
            </div>
            <span>${a.subject}</span>
            <button class="delete-btn" onclick="deleteAssignment(${a.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </li>
    `).join('');
}

// Delete Assignment
function deleteAssignment(id) {
    if (!confirm('Delete this assignment?')) return;
    const data = getDataStore();
    data.assignments = data.assignments.filter(a => a.id !== id);
    saveDataStore(data);
    renderAssignments();
}

// Add Class to Schedule
function addClass() {
    const time = prompt('Enter time (e.g., 10:00 AM):');
    if (!time) return;

    const subject = prompt('Enter subject/course:');
    if (!subject) return;

    const location = prompt('Enter location (e.g., Room 204):') || 'TBD';
    const professor = prompt('Enter professor name:') || 'TBD';

    const data = getDataStore();
    data.schedule.push({
        id: Date.now(),
        time: time,
        subject: subject,
        location: location,
        professor: professor
    });
    saveDataStore(data);
    renderSchedule();
}

// Render Schedule
function renderSchedule() {
    const data = getDataStore();
    const list = document.getElementById('scheduleList');
    if (!list) return;

    if (data.schedule.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-calendar"></i>
                <p>No classes yet. Click "Add" to add your schedule.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = data.schedule.map(s => `
        <div class="schedule-item">
            <strong>${s.time}</strong>
            <div>
                <h4>${s.subject}</h4>
                <p>${s.location} · ${s.professor}</p>
            </div>
            <button class="delete-btn" onclick="deleteClass(${s.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Delete Class
function deleteClass(id) {
    if (!confirm('Delete this class?')) return;
    const data = getDataStore();
    data.schedule = data.schedule.filter(s => s.id !== id);
    saveDataStore(data);
    renderSchedule();
}

// Add News
function addNews() {
    const news = prompt('Enter news/announcement:');
    if (!news) return;

    const data = getDataStore();
    data.news.push({
        id: Date.now(),
        text: news,
        date: new Date().toLocaleDateString()
    });
    saveDataStore(data);
    renderNews();
}

// Render News
function renderNews() {
    const data = getDataStore();
    const list = document.getElementById('newsList');
    if (!list) return;

    if (data.news.length === 0) {
        list.innerHTML = '<p class="empty-msg">No news yet. Add your campus updates.</p>';
        return;
    }

    list.innerHTML = data.news.map(n => `
        <div class="news-item">
            <p>${n.text}</p>
            <button class="delete-btn" onclick="deleteNews(${n.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Delete News
function deleteNews(id) {
    if (!confirm('Delete this news?')) return;
    const data = getDataStore();
    data.news = data.news.filter(n => n.id !== id);
    saveDataStore(data);
    renderNews();
}

// Quick Notes Functions
function saveQuickNotes() {
    const notes = document.getElementById('quickNotes').value;
    const data = getDataStore();
    data.quickNotes = notes;
    saveDataStore(data);
    alert('Notes saved!');
}

function loadQuickNotes() {
    const data = getDataStore();
    const notes = document.getElementById('quickNotes');
    if (notes && data.quickNotes) {
        notes.value = data.quickNotes;
    }
}

// Activity/Chat Functions
function addActivity() {
    const input = document.getElementById('activityInput');
    const text = input.value.trim();
    if (!text) return;

    const data = getDataStore();
    data.activities.push({
        id: Date.now(),
        text: text,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
    saveDataStore(data);
    renderActivities();
    input.value = '';
}

function renderActivities() {
    const data = getDataStore();
    const container = document.getElementById('collabActivity');
    if (!container) return;

    if (data.activities.length === 0) {
        container.innerHTML = `
            <div class="chat-msg">
                <span class="msg-user">System:</span>
                <span class="msg-text">Create a group to start collaborating!</span>
            </div>
        `;
        return;
    }

    container.innerHTML = data.activities.map(a => `
        <div class="chat-msg">
            <span class="msg-user">You:</span>
            <span class="msg-text">${a.text}</span>
        </div>
    `).join('');
}

// Group Functions
function createGroup() {
    const name = prompt('Enter group name:');
    if (!name) return;

    const data = getDataStore();
    const colors = ['#ff2770', '#4facfe', '#00f260', '#f093fb', '#a8edea'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    data.groups.push({
        id: Date.now(),
        name: name,
        color: randomColor,
        members: 1,
        active: true
    });
    saveDataStore(data);
    renderGroups();
    alert(`Group "${name}" created! Go to Collab Notes to start writing together.`);
}

function joinGroup() {
    const code = prompt('Enter group code to join:');
    if (!code) return;
    alert('Group joining feature - use the group code shared by your friend!');
}

function renderGroups() {
    const data = getDataStore();
    const list = document.getElementById('groupsList');
    if (!list) return;

    if (data.groups.length === 0) {
        list.innerHTML = `
            <div class="group-item empty-state" onclick="createGroup()">
                <div class="group-icon" style="background: linear-gradient(135deg, #ff2770, #ff6b6b);">+</div>
                <div class="group-info">
                    <h5>Create New Group</h5>
                    <p>Start collaborating</p>
                </div>
            </div>
        `;
        return;
    }

    list.innerHTML = data.groups.map(g => `
        <div class="group-item" onclick="openGroup('${g.name}')">
            <div class="group-icon" style="background: linear-gradient(135deg, ${g.color}, ${g.color}88);">${g.name[0]}</div>
            <div class="group-info">
                <h5>${g.name}</h5>
                <p>${g.members} member${g.members > 1 ? 's' : ''}</p>
            </div>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteGroup(${g.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function openGroup(name) {
    window.location.href = 'live-classroom.html?group=' + encodeURIComponent(name);
}

function deleteGroup(id) {
    if (!confirm('Delete this group?')) return;
    const data = getDataStore();
    data.groups = data.groups.filter(g => g.id !== id);
    saveDataStore(data);
    renderGroups();
}

// Generic Quick Action
function addQuickAction(type) {
    switch(type) {
        case 'nextClass':
            addClass();
            break;
        case 'tasks':
            addAssignment();
            break;
        case 'assignment':
            addAssignment();
            break;
        case 'class':
            addClass();
            break;
        case 'profile':
            alert('Profile editing coming soon!');
            break;
    }
}

// Add stat card (placeholder)
function addStatCard(type) {
    switch(type) {
        case 'courses':
            const course = prompt('Enter course name:');
            if (course) alert(`Course "${course}" added!`);
            break;
        case 'classes':
            addClass();
            break;
        case 'attendance':
            const percent = prompt('Enter attendance percentage:');
            if (percent) alert(`Attendance updated to ${percent}%!`);
            break;
        case 'announcements':
            addNews();
            break;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateWelcomeMessage();
    renderAssignments();
    renderSchedule();
    renderNews();
    loadQuickNotes();
    renderActivities();
    renderGroups();
});

// Make functions globally available
window.addAssignment = addAssignment;
window.deleteAssignment = deleteAssignment;
window.addClass = addClass;
window.deleteClass = deleteClass;
window.addNews = addNews;
window.deleteNews = deleteNews;
window.saveQuickNotes = saveQuickNotes;
window.addActivity = addActivity;
window.createGroup = createGroup;
window.joinGroup = joinGroup;
window.deleteGroup = deleteGroup;
window.openGroup = openGroup;
window.addQuickAction = addQuickAction;
window.addStatCard = addStatCard;