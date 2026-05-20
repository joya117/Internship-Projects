/**
 * CampusSync - Smart Calendar & AI Note-taking JavaScript
 * Handles month grid generation, recording simulator, Whisper/Claude loaders
 */

document.addEventListener('DOMContentLoaded', function () {
  loadCalendarSession();
  generateMonthGrid();
  initRecorderSimulator();
});

/* ==================== LOAD PROFILE & THEME ==================== */
function loadCalendarSession() {
  const userName = sessionStorage.getItem('userName') || 'Joya Sen';
  const userRole = sessionStorage.getItem('userRole') || 'student';

  // Apply visual theme class to body
  if (userRole === 'professor') {
    document.body.className = 'theme-professor';
  } else {
    document.body.className = 'theme-student';
  }

  // Update profile cards
  updateText('sidebarName', userName);
  updateText('sidebarRole', userRole.charAt(0).toUpperCase() + userRole.slice(1));
  updateText('topbarUserName', userName);

  // Set Profile Avatars
  const isProf = userRole === 'professor';
  const avatarUrl = isProf
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';

  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const topbarAvatar = document.getElementById('topbarAvatar');
  if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
  if (topbarAvatar) topbarAvatar.src = avatarUrl;

  // Check if calendar was opened from "Record" Quick Action
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('startClass') === 'true') {
    setTimeout(function() {
      document.getElementById('startRecordingBtn')?.click();
      // Scroll to recorder panel
      document.getElementById('recorderPanel')?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  }
}

function updateText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ==================== MONTH GRID GENERATOR ==================== */
function generateMonthGrid() {
  const grid = document.getElementById('calendarMonthGrid');
  if (!grid) return;

  // Clear previous dates (keep labels)
  const labels = grid.querySelectorAll('.day-label');
  grid.innerHTML = '';
  labels.forEach(lbl => grid.appendChild(lbl));

  // May 2026 starts on Friday (Friday is day 5 in Mon-Sun indexing: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5)
  const offsetDays = 4;
  const daysInMonth = 31;

  // Render offset days (April days)
  const prevMonthStart = 27; // April has 30 days
  for (let i = 0; i < offsetDays; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="day-number">${prevMonthStart + i}</span>`;
    grid.appendChild(cell);
  }

  // Render current month days (May 1 to 31)
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    if (d === 19) {
      cell.classList.add('today');
    }

    cell.innerHTML = `
      <span class="day-number">${d}</span>
      <div class="cell-events" id="events-day-${d}"></div>
    `;

    // Append some dots for events
    grid.appendChild(cell);
    
    // Add specific dots
    const dotsContainer = document.getElementById(`events-day-${d}`);
    if (dotsContainer) {
      if (d === 8) {
        addEventDot(dotsContainer, '#ff7675'); // red (deadline)
      } else if (d === 12) {
        addEventDot(dotsContainer, '#a29bfe'); // purple (lecture)
        addEventDot(dotsContainer, '#ffeaa7'); // yellow (quiz)
      } else if (d === 19) {
        addEventDot(dotsContainer, '#a29bfe'); // purple (live lecture today)
        addEventDot(dotsContainer, '#ff7675'); // red (lab overdue)
      } else if (d === 25) {
        addEventDot(dotsContainer, '#00f260'); // green (evaluation)
      }
    }

    // Add click handler to cell to focus agenda
    cell.addEventListener('click', function () {
      updateAgendaDate(d);
    });
  }
}

function addEventDot(container, color) {
  const dot = document.createElement('span');
  dot.className = 'event-dot';
  dot.style.background = color;
  container.appendChild(dot);
}

function updateAgendaDate(day) {
  const agendaTitle = document.querySelector('.agenda-card h3');
  if (agendaTitle && !agendaTitle.textContent.includes('AI Note-Taking')) {
    agendaTitle.textContent = `Lectures Agenda (May ${day}, 2026)`;
  }
}

/* ==================== AI RECORDER SIMULATOR ==================== */
let recordInterval = null;
let secondsRecorded = 0;

function initRecorderSimulator() {
  const startBtn = document.getElementById('startRecordingBtn');
  const stopBtn = document.getElementById('stopRecordingBtn');
  const wave = document.getElementById('waveform');
  const timerEl = document.getElementById('recordingTimer');
  const loader = document.getElementById('transcribeProcessing');
  const statusEl = document.getElementById('processingStatus');
  const notesCard = document.getElementById('aiGeneratedNotesCard');
  const noteContent = document.getElementById('generatedNoteContent');
  const closeNotesBtn = document.getElementById('closeNotesCardBtn');
  const saveBtn = document.getElementById('saveNoteToWorkspace');

  if (!startBtn || !stopBtn) return;

  // 1. Click Start
  startBtn.addEventListener('click', function () {
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    wave.classList.add('active');
    
    // Reset timer
    secondsRecorded = 0;
    timerEl.textContent = '00:00';
    
    recordInterval = setInterval(function () {
      secondsRecorded++;
      const m = Math.floor(secondsRecorded / 60).toString().padStart(2, '0');
      const s = (secondsRecorded % 60).toString().padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }, 1000);

    showToast('Class launched! Background audio recording initiated...', 'fa-microphone');
  });

  // 2. Click Stop
  stopBtn.addEventListener('click', function () {
    clearInterval(recordInterval);
    wave.classList.remove('active');
    stopBtn.classList.add('hidden');
    loader.classList.remove('hidden');

    // Run progressive Whisper & Claude loaders simulation
    simulateAIProcessing(function (notesHTML) {
      loader.classList.add('hidden');
      startBtn.classList.remove('hidden');
      timerEl.textContent = '00:00';

      // Display notes
      noteContent.innerHTML = notesHTML;
      notesCard.classList.remove('hidden');
    });
  });

  // Close Notes
  if (closeNotesBtn) {
    closeNotesBtn.addEventListener('click', function () {
      notesCard.classList.add('hidden');
    });
  }

  // Save Notes to Workspace
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      showToast('AI Lecture notes successfully saved to "DSA Study Group" workspace!', 'fa-circle-check');
      sessionStorage.setItem('savedLectureNote', 'true');
      notesCard.classList.add('hidden');
    });
  }
}

function simulateAIProcessing(callback) {
  const statusEl = document.getElementById('processingStatus');
  const subtextEl = document.querySelector('.progress-subtext');

  setTimeout(function () {
    statusEl.textContent = 'Speech segment verified. Transcribing lecture audio...';
    subtextEl.textContent = 'Invoking OpenAI Whisper API Endpoint';
  }, 1000);

  setTimeout(function () {
    statusEl.textContent = 'Transcription complete! Parsing key concepts...';
    subtextEl.textContent = 'Analyzing syntax & transcribing voice vectors';
  }, 2200);

  setTimeout(function () {
    statusEl.textContent = 'Claude generates structured chapter-wise notes...';
    subtextEl.textContent = 'Invoking Claude Sonnet API note-taking model';
  }, 3500);

  setTimeout(function () {
    statusEl.textContent = 'Structuring definitions, summaries, and Markdown content...';
    subtextEl.textContent = 'Note structure matching CampusSync Design system';
  }, 4800);

  setTimeout(function () {
    const notesHTML = `
      <h2>CS301 - Data Structures & Algorithms</h2>
      <p><strong>Topic:</strong> Graph Traversals (DFS vs BFS)<br><strong>Date:</strong> 19 May 2026 • Live Lecture Session</p>
      
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border);">

      <h3>1. Depth-First Search (DFS)</h3>
      <p>DFS is an algorithm for traversing or searching tree or graph data structures. The algorithm starts at the root node (selecting some arbitrary node as the root in the case of a graph) and explores as far as possible along each branch before backtracking.</p>
      <ul>
        <li><strong>Data Structure:</strong> Utilises call stack recursion (or an explicit stack structure).</li>
        <li><strong>Time Complexity:</strong> O(V + E) where V is vertices and E is edges.</li>
        <li><strong>Applications:</strong> Cycle detection, topological sorting, solving puzzles like mazes.</li>
      </ul>

      <h3>2. Breadth-First Search (BFS)</h3>
      <p>BFS starts at the tree root (or some arbitrary node of a graph) and explores all of the neighbor nodes at the present depth prior to moving on to the nodes at the next depth level.</p>
      <ul>
        <li><strong>Data Structure:</strong> Utilises a FIFO (First In First Out) Queue.</li>
        <li><strong>Time Complexity:</strong> O(V + E)</li>
        <li><strong>Applications:</strong> Shortest path in unweighted graphs, GPS location search, crawler search engines.</li>
      </ul>

      <h3>3. Comparative Summary</h3>
      <p>Use <strong>DFS</strong> when you need to search deep and backtrack, and memory space is a priority. Use <strong>BFS</strong> when searching for the shortest distance or relations closer to the starting root element.</p>
    `;
    callback(notesHTML);
  }, 6200);
}

/* ==================== TOAST NOTIFICATION ==================== */
function showToast(message, icon = 'fa-circle-check') {
  const toast = document.getElementById('actionToast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  const iconEl = toast.querySelector('i');
  if (iconEl) iconEl.className = `fa-solid ${icon}`;

  toast.classList.add('active');

  setTimeout(function () {
    toast.classList.remove('active');
  }, 4000);
}

/* ==================== LOGOUT FUNCTION ==================== */
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}
