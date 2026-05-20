/**
 * Calendar Page JavaScript
 * Handles timetable upload and calendar display
 */

const CALENDAR_KEY = 'campusSync_calendar';

// Get stored timetable
function getTimetable() {
    const stored = localStorage.getItem(CALENDAR_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: []
    };
}

function saveTimetableData(data) {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(data));
}

// Temporary storage for modal
let tempTimetable = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: []
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCalendar();
    updateTodaySchedule();
});

// Load calendar with saved data
function loadCalendar() {
    const timetable = getTimetable();
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    days.forEach(day => {
        const container = document.getElementById('classes-' + day);
        if (!container) return;

        if (timetable[day].length === 0) {
            container.innerHTML = '<p class="no-classes">No classes</p>';
        } else {
            container.innerHTML = timetable[day].map((cls, index) => `
                <div class="class-item">
                    <button class="delete-class" onclick="deleteClass('${day}', ${index})">
                        <i class="fa-solid fa-times"></i>
                    </button>
                    <div class="class-time">${cls.time}</div>
                    <div class="class-name">${cls.name}</div>
                    <div class="class-room">${cls.room}</div>
                </div>
            `).join('');
        }
    });

    // Update status
    const totalClasses = Object.values(timetable).flat().length;
    const statusEl = document.getElementById('timetableStatus');
    if (statusEl) {
        statusEl.textContent = totalClasses > 0 ? `${totalClasses} classes added` : 'No timetable uploaded';
    }
}

// Update today's schedule in sidebar
function updateTodaySchedule() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[new Date().getDay()];
    const timetable = getTimetable();

    const container = document.getElementById('todaySchedule');
    if (!container) return;

    const todayClasses = timetable[today];

    if (todayClasses.length === 0) {
        container.innerHTML = '<p class="no-classes">No classes today</p>';
    } else {
        container.innerHTML = todayClasses.map(cls => `
            <div class="sidebar-class-item">
                <div class="class-time">${cls.time}</div>
                <div class="class-name">${cls.name}</div>
                <div class="class-room">${cls.room}</div>
            </div>
        `).join('');
    }
}

// Open upload modal
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.add('active');

    // Load existing data into temp
    tempTimetable = JSON.parse(JSON.stringify(getTimetable()));
    updateTimetablePreview();
}

// Close upload modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.remove('active');
}

// Add class to temp timetable
function addClass() {
    const day = document.getElementById('classDay').value;
    const name = document.getElementById('className').value;
    const time = document.getElementById('classTime').value;
    const room = document.getElementById('classRoom').value;

    if (!day || !name || !time) {
        alert('Please fill in day, class name, and time!');
        return;
    }

    tempTimetable[day].push({
        name: name,
        time: time,
        room: room || 'TBD'
    });

    // Clear inputs
    document.getElementById('className').value = '';
    document.getElementById('classTime').value = '';
    document.getElementById('classRoom').value = '';
    document.getElementById('classDay').value = '';

    updateTimetablePreview();
}

// Update timetable preview in modal
function updateTimetablePreview() {
    const container = document.getElementById('timetablePreview');
    const dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

    let html = '';
    let hasClasses = false;

    Object.keys(tempTimetable).forEach(day => {
        if (tempTimetable[day].length > 0) {
            hasClasses = true;
            tempTimetable[day].forEach((cls, index) => {
                html += `
                    <div class="class-item">
                        <button class="remove-class" onclick="removeTempClass('${day}', ${index})">
                            <i class="fa-solid fa-times"></i>
                        </button>
                        <div class="class-time">${dayNames[day]} - ${cls.time}</div>
                        <div class="class-name">${cls.name}</div>
                        <div class="class-room">${cls.room}</div>
                    </div>
                `;
            });
        }
    });

    if (!hasClasses) {
        html = '<p class="no-classes">No classes added yet</p>';
    }

    container.innerHTML = html;
}

// Remove class from temp timetable
function removeTempClass(day, index) {
    tempTimetable[day].splice(index, 1);
    updateTimetablePreview();
}

// Save timetable
function saveTimetable() {
    saveTimetableData(tempTimetable);
    loadCalendar();
    updateTodaySchedule();
    closeUploadModal();
    alert('Timetable saved successfully!');
}

// Delete class from calendar
function deleteClass(day, index) {
    if (!confirm('Delete this class?')) return;

    const timetable = getTimetable();
    timetable[day].splice(index, 1);
    saveTimetableData(timetable);
    loadCalendar();
    updateTodaySchedule();
}

// Make functions global
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.addClass = addClass;
window.saveTimetable = saveTimetable;
window.deleteClass = deleteClass;
window.removeTempClass = removeTempClass;