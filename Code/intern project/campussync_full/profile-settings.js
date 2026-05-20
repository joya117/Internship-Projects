/**
 * CampusSync - Global Interactive Profile Settings JS
 * Dynamically injects a beautiful glassmorphic settings drawer, handles selectable avatars,
 * college autocomplete registries, and synchronises updates to sessionStorage and Express backend.
 */

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    injectProfileStyles();
    injectProfileHTML();
    bindProfileEvents();
  });

  // Dynamic CSS styling injection for premium glassmorphic overlay
  function injectProfileStyles() {
    const css = `
      /* Drawer Overlay CSS */
      .profile-settings-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(8, 8, 10, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 9999;
        display: flex;
        justify-content: flex-end;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .profile-settings-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .profile-settings-drawer {
        width: 440px;
        height: 100%;
        background: rgba(18, 18, 22, 0.85);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        padding: 40px 30px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transform: translateX(100%);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
        overflow-y: auto;
      }
      .profile-settings-overlay.active .profile-settings-drawer {
        transform: translateX(0);
      }

      /* Core styles */
      .profile-drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
      }
      .profile-drawer-header h2 {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .close-drawer-btn {
        background: transparent;
        border: none;
        color: #a0a0a5;
        font-size: 20px;
        cursor: pointer;
        transition: color 0.2s ease;
      }
      .close-drawer-btn:hover {
        color: #fff;
      }

      /* Avatars Row picker */
      .avatar-picker-section {
        text-align: center;
        margin-bottom: 28px;
        background: rgba(255, 255, 255, 0.02);
        padding: 20px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .current-avatar-preview {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--primary, #534ab7);
        margin-bottom: 12px;
        transition: border-color 0.3s ease;
      }
      body.theme-professor .current-avatar-preview {
        border-color: var(--prof-primary, #0f6e56);
      }
      .avatar-options-grid {
        display: flex;
        justify-content: center;
        gap: 10px;
      }
      .avatar-option-item {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }
      .avatar-option-item:hover {
        transform: scale(1.1);
      }
      .avatar-option-item.selected {
        border-color: var(--primary, #534ab7);
      }
      body.theme-professor .avatar-option-item.selected {
        border-color: var(--prof-primary, #0f6e56);
      }

      /* Fields controls */
      .profile-form-body {
        flex: 1;
      }
      .form-input-group {
        position: relative;
        margin-bottom: 20px;
      }
      .form-input-group label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #a0a0a5;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .form-input-group input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px 16px;
        color: #fff;
        outline: none;
        font-size: 13px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .form-input-group input:focus {
        border-color: var(--primary, #534ab7);
        background: rgba(255, 255, 255, 0.05);
      }
      body.theme-professor .form-input-group input:focus {
        border-color: var(--prof-primary, #0f6e56);
      }

      /* College search dropdown search */
      .college-search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: rgba(18, 18, 22, 0.95);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        margin-top: 5px;
        max-height: 180px;
        overflow-y: auto;
        z-index: 100;
        display: none;
      }
      .college-search-dropdown.active {
        display: block;
      }
      .college-dropdown-item {
        padding: 10px 16px;
        color: #d1d1d6;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      .college-dropdown-item:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }

      /* Actions footer */
      .profile-drawer-footer {
        display: flex;
        gap: 12px;
        margin-top: 30px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 24px;
      }
      .drawer-action-btn {
        flex: 1;
        height: 46px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-cancel {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #d1d1d6;
      }
      .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
      }
      .btn-save {
        background: var(--primary, #534ab7);
        border: none;
        color: #fff;
        box-shadow: 0 4px 15px rgba(83, 74, 183, 0.2);
      }
      .btn-save:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(83, 74, 183, 0.3);
      }
      body.theme-professor .btn-save {
        background: var(--prof-primary, #0f6e56);
        box-shadow: 0 4px 15px rgba(15, 110, 86, 0.2);
      }
      body.theme-professor .btn-save:hover {
        box-shadow: 0 6px 20px rgba(15, 110, 86, 0.35);
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.innerHTML = css;
    document.head.appendChild(styleEl);
  }

  // Dynamic injection of overlay DOM HTML structure
  function injectProfileHTML() {
    if (document.getElementById('profileSettingsOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'profileSettingsOverlay';
    overlay.className = 'profile-settings-overlay';

    overlay.innerHTML = `
      <div class="profile-settings-drawer">
        <div class="profile-drawer-header">
          <h2><i class="fa-solid fa-user-gear"></i> Profile Settings</h2>
          <button class="close-drawer-btn" id="closeProfileDrawerBtn">&times;</button>
        </div>

        <div class="avatar-picker-section">
          <img src="" alt="avatar" class="current-avatar-preview" id="profileAvatarPreview" />
          <div class="avatar-options-grid">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80" class="avatar-option-item" data-avatar-id="student-female" />
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80" class="avatar-option-item" data-avatar-id="student-male" />
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80" class="avatar-option-item" data-avatar-id="avatar-alt" />
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80" class="avatar-option-item" data-avatar-id="professor-female" />
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80" class="avatar-option-item" data-avatar-id="professor-male" />
          </div>
        </div>

        <form class="profile-form-body" id="profileDrawerForm">
          <div class="form-input-group">
            <label for="profileInputName">Full Name</label>
            <input type="text" id="profileInputName" required />
          </div>

          <div class="form-input-group">
            <label for="profileInputEmail">Email Address</label>
            <input type="email" id="profileInputEmail" required />
          </div>

          <div class="form-input-group" style="position: relative;">
            <label for="profileInputCollege">College / University</label>
            <input type="text" id="profileInputCollege" required autocomplete="off" />
            <div class="college-search-dropdown" id="profileCollegeDropdown"></div>
          </div>

          <div class="form-input-group">
            <label for="profileInputPass">Update Password</label>
            <input type="password" id="profileInputPass" placeholder="Leave blank to keep current password" />
          </div>

          <div class="profile-drawer-footer">
            <button type="button" class="drawer-action-btn btn-cancel" id="cancelProfileDrawerBtn">Cancel</button>
            <button type="submit" class="drawer-action-btn btn-save" id="saveProfileDrawerBtn">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // Bind triggers, select events, and autocomplete queries
  function bindProfileEvents() {
    const trigger = document.getElementById('profileNav');
    const overlay = document.getElementById('profileSettingsOverlay');
    const closeBtn = document.getElementById('closeProfileDrawerBtn');
    const cancelBtn = document.getElementById('cancelProfileDrawerBtn');
    const form = document.getElementById('profileDrawerForm');
    
    const preview = document.getElementById('profileAvatarPreview');
    const optionItems = document.querySelectorAll('.avatar-option-item');
    const collegeInput = document.getElementById('profileInputCollege');
    const collegeDropdown = document.getElementById('profileCollegeDropdown');

    if (!trigger || !overlay) return;

    // A list of premier colleges matching colleges.json
    const collegesRegistry = [
      "Thapar Institute of Engineering & Technology (TIET) Patiala",
      "Indian Institute of Technology (IIT) Delhi",
      "Indian Institute of Technology (IIT) Bombay",
      "Indian Institute of Technology (IIT) Madras",
      "Delhi Technological University (DTU) Delhi",
      "Netaji Subhas University of Technology (NSUT) Delhi",
      "Birla Institute of Technology and Science (BITS) Pilani"
    ];

    // Open drawer action
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      
      // Load current cached fields
      const cachedName = sessionStorage.getItem('userName') || 'Joya Sen';
      const cachedEmail = sessionStorage.getItem('userEmail') || 'joya@tiet.edu';
      const cachedCollege = sessionStorage.getItem('userCollege') || 'Thapar Institute of Engineering & Technology (TIET) Patiala';
      const cachedRole = sessionStorage.getItem('userRole') || 'student';
      
      const defaultAvatar = cachedRole === 'professor'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';
      const cachedAvatar = sessionStorage.getItem('userAvatar') || defaultAvatar;

      document.getElementById('profileInputName').value = cachedName;
      document.getElementById('profileInputEmail').value = cachedEmail;
      collegeInput.value = cachedCollege;
      document.getElementById('profileInputPass').value = '';
      
      preview.src = cachedAvatar;

      // Select matching avatar option item
      optionItems.forEach(item => {
        item.classList.remove('selected');
        if (item.src === cachedAvatar) {
          item.classList.add('selected');
        }
      });

      overlay.classList.add('active');
    });

    // Close actions
    function closeDrawer() {
      overlay.classList.remove('active');
      collegeDropdown.classList.remove('active');
    }
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (cancelBtn) cancelBtn.addEventListener('click', closeDrawer);

    // Select Avatar Option
    optionItems.forEach(item => {
      item.addEventListener('click', function () {
        optionItems.forEach(x => x.classList.remove('selected'));
        item.classList.add('selected');
        preview.src = item.src;
      });
    });

    // College Search Autocomplete Dropdown
    collegeInput.addEventListener('input', function () {
      const q = collegeInput.value.trim().toLowerCase();
      if (!q) {
        collegeDropdown.classList.remove('active');
        return;
      }

      const filtered = collegesRegistry.filter(c => c.toLowerCase().includes(q));
      if (filtered.length === 0) {
        collegeDropdown.classList.remove('active');
        return;
      }

      collegeDropdown.innerHTML = '';
      filtered.forEach(college => {
        const div = document.createElement('div');
        div.className = 'college-dropdown-item';
        div.textContent = college;
        div.addEventListener('click', function () {
          collegeInput.value = college;
          collegeDropdown.classList.remove('active');
        });
        collegeDropdown.appendChild(div);
      });

      collegeDropdown.classList.add('active');
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (e.target !== collegeInput) {
        collegeDropdown.classList.remove('active');
      }
    });

    // Save profile form submission
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('profileInputName').value.trim();
      const email = document.getElementById('profileInputEmail').value.trim();
      const college = collegeInput.value.trim();
      const password = document.getElementById('profileInputPass').value.trim();
      const avatar = preview.src;

      const userId = sessionStorage.getItem('userId') || 'joyasen';

      const saveBtn = document.getElementById('saveProfileDrawerBtn');
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      const payload = { userId, name, email, college, avatar };
      if (password) payload.password = password;

      // Sync backend Express server
      const IS_SERVER = window.location.protocol.startsWith('http');
      if (IS_SERVER) {
        fetch('/api/auth/profile-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            updateSessionAndDOM(name, email, college, avatar);
            showActionToast('Profile settings saved successfully!', 'fa-user-check');
            closeDrawer();
          } else {
            alert('Failed to update profile: ' + (data.error || 'Server error'));
          }
          saveBtn.textContent = 'Save Changes';
          saveBtn.disabled = false;
        })
        .catch(err => {
          console.error("Profile sync error:", err);
          // Fallback to local session storage saving anyway
          updateSessionAndDOM(name, email, college, avatar);
          showActionToast('Saved local session settings!', 'fa-circle-check');
          closeDrawer();
          saveBtn.textContent = 'Save Changes';
          saveBtn.disabled = false;
        });
      } else {
        // Fallback for double-clicked static HTML
        setTimeout(() => {
          updateSessionAndDOM(name, email, college, avatar);
          showActionToast('Saved local session settings!', 'fa-circle-check');
          closeDrawer();
          saveBtn.textContent = 'Save Changes';
          saveBtn.disabled = false;
        }, 800);
      }
    });
  }

  // Update sessionStorage and refresh visual DOM nodes instantly
  function updateSessionAndDOM(name, email, college, avatar) {
    sessionStorage.setItem('userName', name);
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userCollege', college);
    sessionStorage.setItem('userAvatar', avatar);

    // Sidebar usernames
    const sideName = document.getElementById('sidebarName');
    if (sideName) sideName.textContent = name;

    // Sidebar Avatars
    const sideAv = document.getElementById('sidebarAvatar');
    if (sideAv) sideAv.src = avatar;

    // Topbar Avatars
    const topAv = document.getElementById('topbarAvatar');
    if (topAv) topAv.src = avatar;

    // Topbar Name chips
    const topName = document.getElementById('topbarUserName');
    if (topName) topName.textContent = name;

    // Welcome Greetings
    const welcome = document.getElementById('bannerUserName');
    if (welcome) welcome.textContent = name.split(' ')[0];

    const welcomeProf = document.getElementById('bannerProfName');
    if (welcomeProf) welcomeProf.textContent = name;
  }

  // Helper action toast flashes
  function showActionToast(message, icon = 'fa-circle-check') {
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
})();
