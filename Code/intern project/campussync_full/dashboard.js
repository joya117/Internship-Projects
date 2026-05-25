/**
 * CampusSync — Dashboard JavaScript
 *
 * Features:
 *  - Role-based view (student vs professor from session)
 *  - Mac-style Sticky Notes (localStorage persisted)
 *  - Workspace modal creation
 *  - Attendance triggers
 *  - Professor Quick Actions (Assign Homework, Post Announcement)
 */

'use strict';

/* ── Sticky note colours (Mac-inspired pastel palette) ── */
const STICKY_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa'];
const STORAGE_KEY_STUDENT = 'cs_sticky_notes_student';
const STORAGE_KEY_PROF    = 'cs_sticky_notes_prof';

/* ================================================================
   BOOT
================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  loadSessionData();
  initWorkspaceModal();
  initAttendanceTriggers();
  initProfActions();
  initLogout();
  initStickyNotes('studentStickyBoard', 'btnAddStickyNote', STORAGE_KEY_STUDENT);
  initStickyNotes('profStickyBoard',    'btnAddStickyNoteProf', STORAGE_KEY_PROF);
});

/* ================================================================
   SESSION / ROLE SETUP
================================================================ */
function loadSessionData() {
  const userName = sessionStorage.getItem('userName')  || 'Joya Sen';
  const userRole = sessionStorage.getItem('userRole')  || 'student';
  const isProf   = userRole === 'professor';

  // Theme
  document.body.className = isProf ? 'theme-professor' : 'theme-student';

  // Show correct dashboard view
  const studentView  = document.getElementById('studentView');
  const professorView = document.getElementById('professorView');
  if (isProf) {
    studentView?.classList.add('hidden');
    professorView?.classList.remove('hidden');
  } else {
    studentView?.classList.remove('hidden');
    professorView?.classList.add('hidden');
  }

  // Update all name / role fields
  setEl('sidebarName',    userName);
  setEl('sidebarRole',    capitalize(userRole));
  setEl('topbarUserName', userName);
  setEl('bannerUserName', firstName(userName));
  setEl('bannerProfName', userName);
  setEl('rightName',      userName);
  setEl('rightRole',      isProf ? 'Professor · Faculty' : 'Student · B.Tech IT');

  // Avatars
  const avatarUrl = isProf
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&fit=crop&q=80';

  setSrc('sidebarAvatar', avatarUrl);
  setSrc('topbarAvatar',  avatarUrl);
  setSrc('rightAvatar',   avatarUrl);
}

function setEl(id, text)  { const e = document.getElementById(id); if (e) e.textContent = text; }
function setSrc(id, src)  { const e = document.getElementById(id); if (e) e.src = src; }
function capitalize(s)    { return s.charAt(0).toUpperCase() + s.slice(1); }
function firstName(name)  { return name.split(' ')[0]; }

/* ================================================================
   WORKSPACE CREATION MODAL
================================================================ */
function initWorkspaceModal() {
  const modal      = document.getElementById('createWorkspaceModal');
  const openBtn    = document.getElementById('openCreateWorkspaceModal');
  const dashedBtn  = document.getElementById('createWorkspaceDashed');
  const closeBtn   = document.getElementById('closeWorkspaceModal');
  const cancelBtn  = document.getElementById('cancelWSBtn');
  const form       = document.getElementById('createWorkspaceForm');
  if (!modal) return;

  const openModal  = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  openBtn?.addEventListener('click', openModal);
  dashedBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  form?.addEventListener('submit', function (e) {
    e.preventDefault();
    const wsName    = document.getElementById('wsName').value.trim();
    const wsSubject = document.getElementById('wsSubject').value.trim();
    const wsEmoji   = document.getElementById('wsEmoji').value.trim() || '📂';
    if (!wsName || !wsSubject) return;

    // Add card to grid
    const grid = document.querySelector('.workspaces-grid');
    if (grid) {
      const card = document.createElement('a');
      card.href       = 'workspace.html';
      card.className  = 'workspace-card';
      card.style.animation = 'formSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both';
      card.innerHTML  = `<div class="card-body"><h3>${wsEmoji} ${wsName}</h3><p>${wsSubject} · 1 online</p></div>`;
      grid.insertBefore(card, document.getElementById('createWorkspaceDashed'));
    }

    // Add to sidebar nav
    const rooms = document.querySelector('[data-section="rooms"]') || document.querySelector('.sidebar-nav');
    if (rooms) {
      const colors = ['#a29bfe', '#ff7675', '#ffeaa7', '#55efc4', '#81ecec'];
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const a      = document.createElement('a');
      a.href        = 'workspace.html';
      a.className   = 'nav-item workspace-item';
      a.innerHTML   = `<span class="color-dot" style="background:${color}"></span><span>${wsName}</span><span class="online-indicator">1</span>`;
      rooms.appendChild(a);
    }

    closeModal();
    showToast(`Workspace "${wsName}" created!`, 'fa-circle-check');
  });
}

/* ================================================================
   ATTENDANCE TRIGGERS
================================================================ */
function initAttendanceTriggers() {
  document.getElementById('openAttendanceBtn')?.addEventListener('click',  () => window.location.href = 'attendance.html');
  document.getElementById('profTriggerAttendance')?.addEventListener('click', () => window.location.href = 'attendance.html');
}

/* ================================================================
   PROFESSOR QUICK ACTIONS
================================================================ */
function initProfActions() {
  // "Assign Homework" — simple prompt + toast
  const btnHomework = document.querySelectorAll('.action-btn-node')[1];
  if (btnHomework) {
    btnHomework.addEventListener('click', function () {
      const task = prompt('Homework title:', 'Assignment 3 — Graph Theory');
      if (task === null) return;
      showToast(`Homework "${task}" posted to all students!`, 'fa-book-open');
    });
  }

  // "Post Announcement"
  const btnAnnounce = document.querySelectorAll('.action-btn-node')[2];
  if (btnAnnounce) {
    btnAnnounce.addEventListener('click', function () {
      const msg = prompt('Announcement:', 'No lecture tomorrow due to holiday.');
      if (msg === null) return;
      showToast(`Announcement posted: "${msg}"`, 'fa-bullhorn');
    });
  }
}

/* ================================================================
   MAC-STYLE STICKY NOTES
   Persisted in localStorage per role (student / professor)
================================================================ */

/**
 * initStickyNotes — sets up a sticky note board.
 * @param {string} boardId       — ID of the container div
 * @param {string} addBtnId      — ID of the "+ Add Note" button
 * @param {string} storageKey    — localStorage key
 */
function initStickyNotes(boardId, addBtnId, storageKey) {
  const board  = document.getElementById(boardId);
  const addBtn = document.getElementById(addBtnId);
  if (!board || !addBtn) return;

  // Load and render existing notes
  renderStickyNotes(board, storageKey);

  // Add new sticky note on button click
  addBtn.addEventListener('click', function () {
    const notes   = getStickyNotes(storageKey);
    const newNote = {
      id:      Date.now(),
      text:    '',
      color:   STICKY_COLORS[notes.length % STICKY_COLORS.length],
      created: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    };
    notes.push(newNote);
    saveStickyNotes(storageKey, notes);
    renderStickyNotes(board, storageKey);

    // Focus the new textarea
    setTimeout(() => {
      const newTextarea = board.querySelector(`.sticky-note[data-id="${newNote.id}"] .sticky-textarea`);
      if (newTextarea) newTextarea.focus();
    }, 60);
  });
}

function getStickyNotes(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveStickyNotes(key, notes) {
  localStorage.setItem(key, JSON.stringify(notes));
}

function renderStickyNotes(board, storageKey) {
  const notes = getStickyNotes(storageKey);
  board.innerHTML = '';

  if (notes.length === 0) {
    board.innerHTML = `
      <div class="sticky-empty-state">
        <i class="fa-regular fa-note-sticky"></i>
        <p>No notes yet. Click <strong>Add Note</strong> to create one.</p>
      </div>`;
    return;
  }

  notes.forEach((note, idx) => {
    const div = document.createElement('div');
    div.className       = 'sticky-note';
    div.dataset.id      = note.id;
    div.style.background = note.color;

    div.innerHTML = `
      <div class="sticky-note-top">
        <span class="sticky-date">${note.created}</span>
        <button class="sticky-delete-btn" title="Delete note" data-idx="${idx}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <textarea class="sticky-textarea" placeholder="Write your note...">${escStickyText(note.text)}</textarea>
    `;

    // Auto-save on input
    const textarea = div.querySelector('.sticky-textarea');
    textarea.addEventListener('input', function () {
      const all = getStickyNotes(storageKey);
      const target = all.find(n => n.id === note.id);
      if (target) {
        target.text = this.value;
        saveStickyNotes(storageKey, all);
      }
    });

    // Delete note
    div.querySelector('.sticky-delete-btn').addEventListener('click', function () {
      const all     = getStickyNotes(storageKey);
      const updated = all.filter(n => n.id !== note.id);
      saveStickyNotes(storageKey, updated);
      renderStickyNotes(board, storageKey);
    });

    board.appendChild(div);
  });
}

function escStickyText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ================================================================
   TOAST
================================================================ */
function showToast(message, icon = 'fa-circle-check') {
  const toast  = document.getElementById('actionToast');
  const msgEl  = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  const iconEl = toast.querySelector('i');
  if (iconEl) iconEl.className = `fa-solid ${icon}`;

  toast.classList.add('active');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('active'), 4000);
}

/* ================================================================
   LOGOUT
================================================================ */
function initLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}
