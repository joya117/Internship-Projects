/**
 * CampusSync - Premium Dashboard JavaScript
 * Handles view switching, session synchronisation, and workspace mock creation
 */

document.addEventListener('DOMContentLoaded', function () {
  loadSessionData();
  initViewSwitcher();
  initWorkspaceModal();
  initAttendanceTriggers();
  initLogout();
});

/* ==================== LOAD SESSION DETAILS ==================== */
function loadSessionData() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  const userName = sessionStorage.getItem('userName') || 'Joya Sen';
  const userId = sessionStorage.getItem('userId') || '2K22/IT/045';
  const userRole = sessionStorage.getItem('userRole') || 'student';
  const userCollege = sessionStorage.getItem('userCollege') || 'iit-delhi';

  // Apply visual theme class to body
  if (userRole === 'professor') {
    document.body.className = 'theme-professor';
    document.getElementById('studentView')?.classList.add('hidden');
    document.getElementById('professorView')?.classList.remove('hidden');
    const toggleBtn = document.getElementById('roleViewToggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span>Switch to Student View</span>';
    }
  } else {
    document.body.className = 'theme-student';
    document.getElementById('studentView')?.classList.remove('hidden');
    document.getElementById('professorView')?.classList.add('hidden');
  }

  // Bind parameters to DOM nodes
  updateDOMText('sidebarName', userName);
  updateDOMText('sidebarRole', userRole.charAt(0).toUpperCase() + userRole.slice(1));
  updateDOMText('topbarUserName', userName);
  updateDOMText('bannerUserName', userName.split(' ')[0]);
  updateDOMText('bannerProfName', userName);

  // Set Profile Avatars depending on student vs professor genders
  const isProf = userRole === 'professor';
  const avatarUrl = isProf
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80' // Prof Avatar
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80'; // Student Avatar

  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const topbarAvatar = document.getElementById('topbarAvatar');
  if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
  if (topbarAvatar) topbarAvatar.src = avatarUrl;
}

function updateDOMText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ==================== STUDENT/PROFESSOR SWITCHER ==================== */
function initViewSwitcher() {
  const toggleBtn = document.getElementById('roleViewToggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', function () {
    const isCurrentlyStudent = document.body.classList.contains('theme-student');
    
    if (isCurrentlyStudent) {
      // Switch to Professor
      document.body.className = 'theme-professor';
      document.getElementById('studentView')?.classList.add('hidden');
      document.getElementById('professorView')?.classList.remove('hidden');
      toggleBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span>Switch to Student View</span>';
      sessionStorage.setItem('userRole', 'professor');
      loadSessionData();
      showToast('Swapped to Professor interface view!');
    } else {
      // Switch to Student
      document.body.className = 'theme-student';
      document.getElementById('studentView')?.classList.remove('hidden');
      document.getElementById('professorView')?.classList.add('hidden');
      toggleBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> <span>Switch to Professor View</span>';
      sessionStorage.setItem('userRole', 'student');
      loadSessionData();
      showToast('Swapped to Student interface view!');
    }
  });
}

/* ==================== WORKSPACE CREATION ==================== */
function initWorkspaceModal() {
  const modal = document.getElementById('createWorkspaceModal');
  const openBtn = document.getElementById('openCreateWorkspaceModal');
  const dashedBtn = document.getElementById('createWorkspaceDashed');
  const closeBtn = document.getElementById('closeWorkspaceModal');
  const cancelBtn = document.getElementById('cancelWSBtn');
  const form = document.getElementById('createWorkspaceForm');

  if (!modal) return;

  function openModal() {
    modal.classList.add('active');
    document.getElementById('wsName').value = '';
    document.getElementById('wsSubject').value = '';
    document.getElementById('wsEmoji').value = '';
  }

  function closeModal() {
    modal.classList.remove('active');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (dashedBtn) dashedBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Form Submission
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const wsName = document.getElementById('wsName').value.trim();
      const wsSubject = document.getElementById('wsSubject').value.trim();
      const wsEmoji = document.getElementById('wsEmoji').value.trim() || '📂';

      if (!wsName || !wsSubject) return;

      // Create new Workspace Card on grid
      const grid = document.querySelector('.workspaces-grid');
      if (grid) {
        const card = document.createElement('a');
        card.href = 'workspace.html';
        card.className = 'workspace-card';
        card.style.animation = 'formSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both';
        
        card.innerHTML = `
          <div class="card-body">
            <h3>${wsName}</h3>
            <p>Subject: ${wsSubject} • 1 online</p>
          </div>
        `;

        // Insert before dashed card
        const dashed = document.getElementById('createWorkspaceDashed');
        grid.insertBefore(card, dashed);
      }

      // Add to sidebar nav list
      const sidebarNav = document.querySelector('.sidebar-nav');
      if (sidebarNav) {
        // Find section title for collaborative rooms
        const sections = sidebarNav.querySelectorAll('.nav-section-title');
        let colabSection = null;
        sections.forEach(sec => {
          if (sec.textContent.includes('Rooms')) {
            colabSection = sec;
          }
        });

        if (colabSection) {
          const item = document.createElement('a');
          item.href = 'workspace.html';
          item.className = 'nav-item workspace-item';
          
          // Random pastel color for dot
          const colors = ['#a29bfe', '#ff7675', '#ffeaa7', '#55efc4', '#81ecec'];
          const randColor = colors[Math.floor(Math.random() * colors.length)];

          item.innerHTML = `
            <span class="color-dot" style="background: ${randColor}"></span>
            <span>${wsName}</span>
            <span class="online-indicator">1 online</span>
          `;

          // Insert after the section header or last workspace item
          colabSection.after(item);
        }
      }

      closeModal();
      showToast(`Created collaborative room "${wsName}" successfully!`);
    });
  }
}

/* ==================== ATTENDANCE TRIGGERS ==================== */
function initAttendanceTriggers() {
  const profBtn = document.getElementById('openAttendanceBtn');
  const profActionBtn = document.getElementById('profTriggerAttendance');

  if (profBtn) {
    profBtn.addEventListener('click', function () {
      triggerAttendanceSession();
    });
  }

  if (profActionBtn) {
    profActionBtn.addEventListener('click', function () {
      triggerAttendanceSession();
    });
  }
}

function triggerAttendanceSession() {
  window.location.href = 'attendance.html';
}

/* ==================== TOAST MESSAGES ==================== */
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
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  }
}
