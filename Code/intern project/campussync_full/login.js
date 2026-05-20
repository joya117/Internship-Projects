/**
 * CampusSync - Premium Login Page JavaScript
 * Handles login/register interactions, animations, and transitions
 */

const IS_SERVER = window.location.protocol.startsWith('http');

document.addEventListener('DOMContentLoaded', function () {
  initParticles();
  initFormSwitching();
  initLoginForm();
  initRegisterForms();
  initPasswordToggles();
  initRegTypeSwitching();
  initRoleDetection();
});

/* ==================== PARTICLES ==================== */
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const count = 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = 8 + Math.random() * 14 + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.width = p.style.height = (1.5 + Math.random() * 2.5) + 'px';
    p.style.opacity = 0.15 + Math.random() * 0.3;
    container.appendChild(p);
  }
}

/* ==================== FORM SWITCHING ==================== */
function initFormSwitching() {
  const container = document.getElementById('mainContainer');
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');

  if (showRegister) {
    showRegister.addEventListener('click', function (e) {
      e.preventDefault();
      container.classList.add('active');
      resetRegForms();
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', function (e) {
      e.preventDefault();
      container.classList.remove('active');
    });
  }
}

/* ==================== LOGIN ROLE DETECTION ==================== */
function initRoleDetection() {
  const userIdInput = document.getElementById('loginUserId');
  const loginBtn = document.getElementById('loginBtn');
  if (!userIdInput || !loginBtn) return;

  userIdInput.addEventListener('input', function () {
    const val = userIdInput.value.trim().toUpperCase();
    if (val.startsWith('2K')) {
      loginBtn.className = 'btn role-student';
    } else if (val.includes('FAC') || val.includes('DTU/F')) {
      loginBtn.className = 'btn role-professor';
    } else {
      loginBtn.className = 'btn';
    }
  });
}

/* ==================== LOGIN FORM ==================== */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const userId = document.getElementById('loginUserId').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!userId || !password) {
      shakeForm(loginForm);
      return;
    }

    const btn = document.getElementById('loginBtn');

    if (IS_SERVER) {
      // Call real backend authentication API
      btn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
      btn.style.pointerEvents = 'none';

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Invalid credentials');
        }
        return res.json();
      })
      .then(data => {
        const user = data.user;
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', user.name);
        sessionStorage.setItem('userId', user.userId);
        sessionStorage.setItem('userRole', user.role);
        sessionStorage.setItem('userEmail', user.email);
        sessionStorage.setItem('userCollege', user.college);
        sessionStorage.setItem('loginTime', new Date().toISOString());

        animateButtonSuccess(btn, 'Welcome!', function () {
          showSuccessOverlay(function () {
            window.location.href = 'dashboard.html';
          });
        });
      })
      .catch(err => {
        btn.innerHTML = 'Sign In';
        btn.style.pointerEvents = '';
        shakeForm(loginForm);
        alert('Invalid User ID or Password! Pre-seeded accounts:\nStudent: joyasen / student123\nProfessor: joyaprofy / prof123');
      });
    } else {
      // Static mock fallback
      const isProf = userId.toUpperCase().includes('FAC') || userId.toUpperCase().includes('DTU/F') || userId === 'joyaprofy';
      const detectedRole = isProf ? 'professor' : 'student';

      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('userName', isProf ? 'Prof. Joya Sen' : 'Joya');
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('userRole', detectedRole);
      sessionStorage.setItem('userEmail', userId.includes('@') ? userId : userId + '@campus.edu');
      sessionStorage.setItem('userCollege', 'Thapar Institute of Engineering & Technology (TIET) Patiala');
      sessionStorage.setItem('loginTime', new Date().toISOString());

      animateButtonSuccess(btn, 'Welcome!', function () {
        showSuccessOverlay(function () {
          window.location.href = 'dashboard.html';
        });
      });
    }
  });
}

/* ==================== REGISTRATION FORMS ==================== */
let collegeData = [];

function loadColleges(callback) {
  if (collegeData.length > 0) {
    if (callback) callback(collegeData);
    return;
  }
  fetch('colleges.json')
    .then(res => res.json())
    .then(data => {
      collegeData = data;
      if (callback) callback(collegeData);
    })
    .catch(err => {
      console.error('Failed to load colleges database:', err);
    });
}

function initRegisterForms() {
  loadColleges(function (colleges) {
    initAutocomplete('studentCollegeSearch', 'studentCollege', 'studentCollegeDropdown', colleges);
    initAutocomplete('profCollegeSearch', 'profCollege', 'profCollegeDropdown', colleges);
  });

  // Student
  const studentForm = document.getElementById('studentRegisterForm');
  if (studentForm) {
    studentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleRegistration(studentForm);
    });
  }

  // Professor
  const professorForm = document.getElementById('professorRegisterForm');
  if (professorForm) {
    professorForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleRegistration(professorForm);
    });
  }
}

function initAutocomplete(inputId, hiddenId, dropdownId, colleges) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !hidden || !dropdown) return;

  let highlightedIndex = -1;

  function renderDropdown(items) {
    dropdown.innerHTML = '';
    highlightedIndex = -1;

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = 'No colleges found';
      dropdown.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.setAttribute('data-id', item.id);
      div.setAttribute('data-name', item.name);
      
      div.innerHTML = `
        <span>${item.name}</span>
        <span class="item-type">${item.type}</span>
      `;

      // Mouse selection - mousedown fires before blur, avoiding premature closure
      div.addEventListener('mousedown', function (e) {
        e.preventDefault();
        selectItem(item);
      });

      dropdown.appendChild(div);
    });
  }

  let isSelecting = false;

  function selectItem(item) {
    isSelecting = true;
    input.value = item.name;
    hidden.value = item.id;
    dropdown.classList.add('hidden');
    // Dispatch input event so CSS floating label responds immediately
    input.dispatchEvent(new Event('input', { bubbles: true }));
    isSelecting = false;
  }

  // Input typing and search matching - only shows dropdown when query has characters
  input.addEventListener('input', function () {
    if (isSelecting) return;

    const query = input.value.trim();
    if (query.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.classList.remove('hidden');
    const q = query.toLowerCase();
    
    const filtered = colleges.filter(c => {
      const name = c.name.toLowerCase();
      // Match full text
      if (name.includes(q)) return true;
      // Match acronym tags inside parenthesis (e.g. "IIT")
      const matchesParen = c.name.match(/\(([^)]+)\)/);
      if (matchesParen && matchesParen[1].toLowerCase().includes(q)) return true;
      return false;
    });

    renderDropdown(filtered);
  });

  // Open on focus ONLY if there is text already entered
  input.addEventListener('focus', function () {
    const query = input.value.trim();
    if (query.length > 0) {
      dropdown.classList.remove('hidden');
      // Trigger matching logic
      const isSelectReset = isSelecting;
      isSelecting = false;
      input.dispatchEvent(new Event('input'));
      isSelecting = isSelectReset;
    } else {
      dropdown.classList.add('hidden');
    }
  });

  // Blur safety
  input.addEventListener('blur', function () {
    setTimeout(function () {
      dropdown.classList.add('hidden');
    }, 150);
  });

  // Keyboard navigation support
  input.addEventListener('keydown', function (e) {
    const items = dropdown.querySelectorAll('.dropdown-item');
    if (dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        dropdown.classList.remove('hidden');
        input.dispatchEvent(new Event('input'));
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        const selectedEl = items[highlightedIndex];
        const id = selectedEl.getAttribute('data-id');
        const name = selectedEl.getAttribute('data-name');
        selectItem({ id, name });
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
      input.blur();
    }
  });

  function updateHighlight(items) {
    items.forEach((item, index) => {
      if (index === highlightedIndex) {
        item.classList.add('highlighted');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('highlighted');
      }
    });
  }
}

function handleRegistration(form) {
  const isStudent = form.id === 'studentRegisterForm';
  
  const nameInput = document.getElementById(isStudent ? 'studentName' : 'profName');
  const idInput = document.getElementById(isStudent ? 'studentId' : 'profEmployeeId');
  const emailInput = document.getElementById(isStudent ? 'studentEmail' : 'profEmail');
  const collegeInput = document.getElementById(isStudent ? 'studentCollege' : 'profCollege');
  const passwordInput = document.getElementById(isStudent ? 'studentPassword' : 'profPassword');
  
  const fullName = nameInput?.value.trim();
  const userId = idInput?.value.trim();
  const email = emailInput?.value.trim();
  const collegeName = collegeInput?.value || "Thapar Institute of Engineering & Technology (TIET) Patiala";
  const password = passwordInput?.value;

  if (!fullName || !userId || !email || !collegeName || !password) {
    shakeForm(form);
    return;
  }

  const btn = form.querySelector('.btn');
  const detectedRole = isStudent ? 'student' : 'professor';

  if (IS_SERVER) {
    btn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
    btn.style.pointerEvents = 'none';

    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        password,
        name: fullName,
        role: detectedRole,
        college: collegeName,
        email
      })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(errData => {
          throw new Error(errData.error || 'Registration failed');
        });
      }
      return res.json();
    })
    .then(data => {
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('userName', fullName);
      sessionStorage.setItem('userId', userId);
      sessionStorage.setItem('userRole', detectedRole);
      sessionStorage.setItem('userEmail', email);
      sessionStorage.setItem('userCollege', collegeName);
      sessionStorage.setItem('loginTime', new Date().toISOString());

      animateButtonSuccess(btn, 'Account Created!', function () {
        showSuccessOverlay(function () {
          window.location.href = 'dashboard.html';
        });
      });
    })
    .catch(err => {
      btn.innerHTML = isStudent ? 'Complete Registration' : 'Register Professor Account';
      btn.style.pointerEvents = '';
      shakeForm(form);
      alert(err.message || 'Registration failed. User ID might already exist!');
    });
  } else {
    // Local fallback
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userName', fullName);
    sessionStorage.setItem('userId', userId);
    sessionStorage.setItem('userRole', detectedRole);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userCollege', collegeName);
    sessionStorage.setItem('loginTime', new Date().toISOString());

    animateButtonSuccess(btn, 'Account Created!', function () {
      showSuccessOverlay(function () {
        window.location.href = 'dashboard.html';
      });
    });
  }
}

/* ==================== REG TYPE SWITCHING ==================== */
function initRegTypeSwitching() {
  const regTypeSection = document.getElementById('regTypeSelection');
  const studentBtn = document.getElementById('studentRegBtn');
  const professorBtn = document.getElementById('professorRegBtn');
  const studentForm = document.getElementById('studentRegisterForm');
  const professorForm = document.getElementById('professorRegisterForm');
  const studentBack = document.getElementById('studentBackBtn');
  const professorBack = document.getElementById('professorBackBtn');
  const registerBox = document.getElementById('registerBox');

  if (studentBtn) {
    studentBtn.addEventListener('click', function () {
      regTypeSection.style.display = 'none';
      if (registerBox) registerBox.classList.add('form-active');
      studentForm.classList.remove('hidden');
      studentForm.style.animation = 'formSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    });
  }

  if (professorBtn) {
    professorBtn.addEventListener('click', function () {
      regTypeSection.style.display = 'none';
      if (registerBox) registerBox.classList.add('form-active');
      professorForm.classList.remove('hidden');
      professorForm.style.animation = 'formSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    });
  }

  if (studentBack) {
    studentBack.addEventListener('click', function () {
      resetRegForms();
    });
  }

  if (professorBack) {
    professorBack.addEventListener('click', function () {
      resetRegForms();
    });
  }
}

function resetRegForms() {
  const regTypeSection = document.getElementById('regTypeSelection');
  const studentForm = document.getElementById('studentRegisterForm');
  const professorForm = document.getElementById('professorRegisterForm');
  const registerBox = document.getElementById('registerBox');

  if (regTypeSection) regTypeSection.style.display = '';
  
  if (studentForm) {
    studentForm.classList.add('hidden');
    studentForm.style.animation = '';
    
    // Clean fields and reset float labels
    const studentName = document.getElementById('studentName');
    const studentCollegeSearch = document.getElementById('studentCollegeSearch');
    const studentCollege = document.getElementById('studentCollege');
    const studentId = document.getElementById('studentId');
    const studentEmail = document.getElementById('studentEmail');
    const studentPassword = document.getElementById('studentPassword');

    if (studentName) studentName.value = '';
    if (studentCollegeSearch) studentCollegeSearch.value = '';
    if (studentCollege) studentCollege.value = '';
    if (studentId) studentId.value = '';
    if (studentEmail) studentEmail.value = '';
    if (studentPassword) studentPassword.value = '';

    studentForm.querySelectorAll('input').forEach(input => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  
  if (professorForm) {
    professorForm.classList.add('hidden');
    professorForm.style.animation = '';
    
    // Clean fields and reset float labels
    const profName = document.getElementById('profName');
    const profCollegeSearch = document.getElementById('profCollegeSearch');
    const profCollege = document.getElementById('profCollege');
    const profEmployeeId = document.getElementById('profEmployeeId');
    const profEmail = document.getElementById('profEmail');
    const profPassword = document.getElementById('profPassword');

    if (profName) profName.value = '';
    if (profCollegeSearch) profCollegeSearch.value = '';
    if (profCollege) profCollege.value = '';
    if (profEmployeeId) profEmployeeId.value = '';
    if (profEmail) profEmail.value = '';
    if (profPassword) profPassword.value = '';

    professorForm.querySelectorAll('input').forEach(input => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  
  if (registerBox) {
    registerBox.classList.remove('form-active');
  }
}

/* ==================== PASSWORD VISIBILITY ==================== */
function initPasswordToggles() {
  const toggle = document.getElementById('loginPasswordToggle');
  if (!toggle) return;

  toggle.addEventListener('click', function () {
    const input = document.getElementById('loginPassword');
    if (input.type === 'password') {
      input.type = 'text';
      toggle.classList.remove('fa-lock');
      toggle.classList.add('fa-lock-open');
    } else {
      input.type = 'password';
      toggle.classList.remove('fa-lock-open');
      toggle.classList.add('fa-lock');
    }
  });
}

/* ==================== ANIMATIONS ==================== */
function animateButtonSuccess(btn, message, callback) {
  if (!btn) {
    callback();
    return;
  }

  // Loading state
  btn.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
  btn.style.pointerEvents = 'none';

  setTimeout(function () {
    // Success state
    btn.innerHTML = '<span><i class="fa-solid fa-check"></i> ' + message + '</span>';
    btn.style.background = 'linear-gradient(135deg, #00f260, #4facfe)';
    btn.style.boxShadow = '0 8px 32px rgba(0, 242, 96, 0.35)';

    setTimeout(function () {
      if (callback) callback();
    }, 500);
  }, 900);
}

function showSuccessOverlay(callback) {
  const overlay = document.getElementById('successOverlay');
  if (!overlay) {
    if (callback) callback();
    return;
  }

  overlay.classList.add('active');

  setTimeout(function () {
    if (callback) callback();
  }, 700);
}

function shakeForm(form) {
  form.style.animation = 'none';
  form.offsetHeight; // trigger reflow
  form.style.animation = 'shake 0.4s ease';
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

/* ==================== AUTH UTILITIES ==================== */

function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  if (!isLoggedIn) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// Make functions globally available
window.logout = logout;
window.checkAuth = checkAuth;
