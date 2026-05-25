/**
 * CampusSync — Collaborative Workspace JavaScript
 *
 * BACKEND SUMMARY (server.js — Express.js, Node.js):
 * ─────────────────────────────────────────────────
 * Database: db.json (flat-file JSON, no external DB)
 *
 * NOTES API:
 *   GET  /api/notes/:groupId   → loadNotes()         — fetches saved notes JSON for a group
 *   POST /api/notes/:groupId   → triggerCloudNotesSave() — saves full notes collection JSON
 *
 * CHATS API:
 *   GET  /api/chats/:groupId   → loadChats()         — fetches all messages for a group
 *   POST /api/chats/:groupId   → sendChatMessage()   — posts a new message (user / system / notepad link)
 *     Used by: chat send form, "Add Member" modal, "Share Notepad to Chat" button
 *
 * AUTH API (used by login.js & profile-settings.js):
 *   POST /api/auth/register       → register new user
 *   POST /api/auth/login          → validate credentials
 *   POST /api/auth/profile-update → update name/email/college/password/avatar
 *
 * QUERIES API (used by queries.js):
 *   GET  /api/queries                         → fetch all query threads
 *   POST /api/queries                         → create new query thread
 *   POST /api/queries/:threadId/reply         → add reply to a thread
 *   POST /api/queries/:threadId/resolve       → mark thread resolved
 *
 * ATTENDANCE API (used by attendance.js):
 *   POST /api/attendance → log student attendance with GPS
 *
 * NOTE: Live Session API routes exist in server.js but are NOT used in this frontend.
 *       Go Live feature has been removed.
 */

'use strict';

// ── Detect server vs static open ──
const IS_SERVER = window.location.protocol.startsWith('http');

// ── Global State ──
let currentGroupId   = 'project-5';
let currentGroupName = 'project-5';
let currentGroupColor = '#5c6bc0';

let activeNoteId     = 'note-1';
let notesCollection  = {};

// In-memory fallback for offline mode
const groupNotesMemory = {
  'project-5': JSON.stringify({
    'note-1': { title: 'Main Notes', content: '# project-5\n\nWelcome to your collaborative notes page!\n\n* Start writing here\n* Use **bold**, *italic*, or `code`\n* Draw on the canvas with the Draw button' }
  }),
  'Co25': JSON.stringify({
    'note-1': { title: 'Co25 Notes', content: '# Co25\n\nClass notes for Co25.\n\n* Topic 1\n* Topic 2' }
  })
};

const groupMembersMemory = {
  'project-5': ['Joya Sen', 'Aarav Sharma', 'Meera Nair'],
  'Co25':      ['Joya Sen', 'Aarav Sharma', 'Meera Nair']
};

const groupChatsMemory = {
  'project-5': [],
  'Co25': []
};

// ── Whiteboard State ──
let canvas = null, ctx = null;
let isDrawing = false, lastX = 0, lastY = 0;
let currentColor = '#5c6bc0', currentBrushSize = 6, currentTool = 'pencil';

// ── Chat polling ──
let chatPollInterval = null;

/* ================================================================
   BOOT
================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  initializeWorkspace();
  setupGroupSelector();
  setupChatListView();
  setupChatSystem();
  setupAddMemberModal();
  setupMarkdownEditor();
  setupWhiteboardDrawing();
  setupNotepadToggles();
  setupNotepadFeatures();
  setupTabsManager();
  setupNotesDirectory();
  setupLogoutHandler();
  setupAIVoiceRecorder();
  checkDeepLink();

  // Poll chats if server
  if (IS_SERVER) {
    chatPollInterval = setInterval(loadChats, 3000);
  }
});

/* ================================================================
   INITIALIZE
================================================================ */
function initializeWorkspace() {
  const userName = sessionStorage.getItem('userName') || 'Joya Sen';
  const userRole = sessionStorage.getItem('userRole') || 'student';

  document.body.className = userRole === 'professor' ? 'theme-professor' : 'theme-student';

  const avatarUrl = userRole === 'professor'
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';

  setTextContent('sidebarName', userName);
  setTextContent('sidebarRole', capitalize(userRole));
  setTextContent('topbarUserName', userName);
  setSrc('sidebarAvatar', avatarUrl);
  setSrc('topbarAvatar', avatarUrl);

  switchGroup('project-5', '#5c6bc0');
}

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setSrc(id, src) {
  const el = document.getElementById(id);
  if (el) el.src = src;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ================================================================
   URL DEEP LINK — auto-open a live session shared link
================================================================ */
function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const groupParam = params.get('live') || params.get('group');
  const noteParam  = params.get('note');

  if (groupParam) {
    switchGroup(groupParam);
    if (noteParam) activeNoteId = noteParam;
    showToast(`Opened shared workspace for "${groupParam}"`, 'fa-circle-check');
  }
}

/* ================================================================
   GROUP SELECTOR
================================================================ */
function setupGroupSelector() {
  // Sidebar group links
  document.querySelectorAll('[data-sidebar-group-id]').forEach(el => {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      switchGroup(this.dataset.sidebarGroupId);
    });
  });
}

function switchGroup(groupId, color) {
  currentGroupId   = groupId;
  currentGroupName = groupId;
  currentGroupColor = color || (groupId === 'Co25' ? '#0f6e56' : '#5c6bc0');

  activeNoteId = 'note-1';

  // Update titles
  const notesTitle = document.getElementById('notesRoomTitle');
  if (notesTitle) {
    notesTitle.innerHTML = `<i class="fa-solid fa-file-pen"></i> Collaborative Notes: ${groupId}`;
  }

  // Sync sidebar active state
  document.querySelectorAll('[data-sidebar-group-id]').forEach(el => {
    el.classList.toggle('active', el.dataset.sidebarGroupId === groupId);
  });

  // Update chat conversation header for the active group
  updateConvoHeader(groupId);

  // Load data
  loadNotes();
  loadChats();

  showToast(`Opened collaborative space for ${groupId}!`, 'fa-circle-check');
}

function updateConvoHeader(groupId) {
  const titleEl  = document.getElementById('activeChatTitle');
  const subEl    = document.getElementById('chatMembersSubtitle');
  const avatarEl = document.getElementById('activeConvoAvatar');

  if (titleEl)  titleEl.textContent = `${groupId} Discussion Board`;
  if (avatarEl) {
    avatarEl.textContent  = groupId === 'Co25' ? 'Co' : 'P5';
    avatarEl.style.background = groupId === 'Co25'
      ? 'linear-gradient(135deg,#0f6e56,#00897b)'
      : 'linear-gradient(135deg,#5c6bc0,#3949ab)';
  }
  if (subEl) {
    const members = groupMembersMemory[groupId] || [];
    subEl.textContent = members.map(n => n.split(' ')[0]).join(', ');
  }
}

/* ================================================================
   CHAT — LIST VIEW (WhatsApp main screen)
================================================================ */
function setupChatListView() {
  // Click on chat-list items → open conversation view
  document.querySelectorAll('.chat-list-item').forEach(item => {
    item.addEventListener('click', function () {
      const gid = this.dataset.chatGroupId;
      // Mark active
      document.querySelectorAll('.chat-list-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');

      switchGroup(gid);
      openConversationView();
    });
  });

  // Back button
  const backBtn = document.getElementById('btnBackToChats');
  if (backBtn) {
    backBtn.addEventListener('click', closeConversationView);
  }

  // Search filter
  const searchInput = document.getElementById('chatSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase().trim();
      document.querySelectorAll('.chat-list-item').forEach(item => {
        const name = item.querySelector('.chat-item-name')?.textContent?.toLowerCase() || '';
        item.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }
}

function openConversationView() {
  const listView  = document.getElementById('chatListView');
  const convoView = document.getElementById('chatConversationView');
  if (listView)  listView.classList.add('hidden');
  if (convoView) convoView.classList.remove('hidden');
}

function closeConversationView() {
  const listView  = document.getElementById('chatListView');
  const convoView = document.getElementById('chatConversationView');
  if (listView)  listView.classList.remove('hidden');
  if (convoView) convoView.classList.add('hidden');
}

/* ================================================================
   CHAT — SEND MESSAGES
================================================================ */
function setupChatSystem() {
  const form  = document.getElementById('workspaceChatForm');
  const input = document.getElementById('chatMessageInput');
  if (!form || !input) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    sendChatMessage(text);
  });

  // Emoji / Attach buttons (cosmetic — show toast)
  const emojiBtn  = document.getElementById('btnChatEmoji');
  const attachBtn = document.getElementById('btnChatAttach');

  if (emojiBtn)  emojiBtn.addEventListener('click',  () => showToast('Emoji picker coming soon!', 'fa-face-smile'));
  if (attachBtn) attachBtn.addEventListener('click', () => showToast('File attach coming soon!', 'fa-paperclip'));
}

/**
 * sendChatMessage — posts a message to the current group chat.
 *
 * BACKEND CALL: POST /api/chats/:groupId
 *   Body: { sender, role, avatar, text, time }
 *   Response: the new message object
 *
 * OFFLINE FALLBACK: pushes to groupChatsMemory[currentGroupId] and re-renders.
 *
 * @param {string} text  — message text
 * @param {string} [role] — 'student' | 'professor' | 'system'
 */
function sendChatMessage(text, role) {
  const senderName  = sessionStorage.getItem('userName') || 'Joya Sen';
  const userRole    = role || sessionStorage.getItem('userRole') || 'student';
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const avatarUrl   = (sessionStorage.getItem('userRole') || 'student') === 'professor'
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';

  const msgPayload = {
    sender: senderName,
    role:   userRole,
    avatar: avatarUrl,
    text,
    time:   currentTime
  };

  if (IS_SERVER) {
    // POST /api/chats/:groupId — adds message to db.json → chats[groupId]
    fetch(`/api/chats/${currentGroupId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(msgPayload)
    })
    .then(res => res.json())
    .then(() => {
      loadChats();
      updateSnippet(currentGroupId, text, currentTime);
    })
    .catch(err => console.error('[CHAT] Send error:', err));
  } else {
    if (!groupChatsMemory[currentGroupId]) groupChatsMemory[currentGroupId] = [];
    groupChatsMemory[currentGroupId].push(msgPayload);
    loadChats();
    updateSnippet(currentGroupId, text, currentTime);
  }
}

/** Update the snippet text in the chat list view */
function updateSnippet(groupId, text, time) {
  const snippetEl = document.getElementById(`snippet-${groupId}`);
  const timeEl    = document.getElementById(`time-${groupId}`);
  if (snippetEl) snippetEl.textContent = text.length > 38 ? text.substring(0, 38) + '…' : text;
  if (timeEl)    timeEl.textContent    = time;
}

/* ================================================================
   CHAT — LOAD & RENDER
================================================================ */
/**
 * loadChats — fetches messages for the current group and renders them.
 *
 * BACKEND CALL: GET /api/chats/:groupId
 *   Response: array of message objects [{ sender, role, avatar, text, time }]
 *
 * OFFLINE FALLBACK: reads from groupChatsMemory[currentGroupId]
 */
function loadChats() {
  const chatBox    = document.getElementById('chatMessagesBox');
  const currentUser = sessionStorage.getItem('userName') || 'Joya Sen';
  if (!chatBox) return;

  if (IS_SERVER) {
    fetch(`/api/chats/${currentGroupId}`)
      .then(res => res.json())
      .then(messages => renderChatBubbles(messages, chatBox, currentUser))
      .catch(() => {
        renderChatBubbles(groupChatsMemory[currentGroupId] || [], chatBox, currentUser);
      });
  } else {
    renderChatBubbles(groupChatsMemory[currentGroupId] || [], chatBox, currentUser);
  }
}

function renderChatBubbles(messages, chatBox, currentUser) {
  chatBox.innerHTML = '';

  if (!messages || messages.length === 0) {
    chatBox.innerHTML = `
      <div style="text-align:center;padding:40px 20px;font-size:11px;color:#8696a0;">
        <i class="fa-solid fa-comments" style="font-size:24px;margin-bottom:8px;display:block;opacity:0.4;color:#00a884;"></i>
        Start the collaborative discussion for ${currentGroupId}!
      </div>
    `;
    return;
  }

  messages.forEach(msg => {
    if (msg.role === 'system' || msg.sender === 'System') {
      const sysRow = document.createElement('div');
      sysRow.className = 'chat-system-message';
      sysRow.innerHTML = `<span><i class="fa-solid fa-info-circle" style="color:#00a884;margin-right:4px;"></i>${msg.text}</span>`;
      chatBox.appendChild(sysRow);
      return;
    }

    const isSelf = msg.sender.toLowerCase().trim() === currentUser.toLowerCase().trim();
    const row = document.createElement('div');
    row.className = `chat-bubble-row ${isSelf ? 'self' : 'other'}`;

    const avatarUrl = msg.avatar || (isSelf
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80');

    if (isSelf) {
      row.innerHTML = `
        <div class="bubble-content-wrapper">
          <span class="sender-name" style="text-align:right;">${msg.sender}</span>
          <div class="bubble">
            <p style="margin:0;padding-bottom:6px;word-break:break-word;">${escapeHtml(msg.text)}</p>
            <span class="bubble-time">${msg.time} <i class="fa-solid fa-check-double" style="color:#53bdeb;font-size:10px;"></i></span>
          </div>
        </div>`;
    } else {
      row.innerHTML = `
        <img src="${avatarUrl}" alt="avatar" class="bubble-avatar" />
        <div class="bubble-content-wrapper">
          <span class="sender-name">${msg.sender}</span>
          <div class="bubble">
            <p style="margin:0;padding-bottom:6px;word-break:break-word;">${escapeHtml(msg.text)}</p>
            <span class="bubble-time">${msg.time}</span>
          </div>
        </div>`;
    }

    chatBox.appendChild(row);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ================================================================
   ADD MEMBER MODAL
================================================================ */
/**
 * setupAddMemberModal — wires the Add Member modal.
 *
 * On submit: sends a system message via POST /api/chats/:groupId
 *   telling the room that a new member was added.
 */
function setupAddMemberModal() {
  const modal     = document.getElementById('addMemberModal');
  const btnOpen   = document.getElementById('btnOpenAddMember');
  const btnClose  = document.getElementById('closeAddMemberModalBtn');
  const btnCancel = document.getElementById('cancelAddMemberBtn');
  const form      = document.getElementById('addMemberForm');
  const select    = document.getElementById('memberSelect');

  if (!modal || !btnOpen || !form) return;

  btnOpen.addEventListener('click', () => modal.classList.add('active'));

  const hideModal = () => modal.classList.remove('active');
  if (btnClose)  btnClose.addEventListener('click', hideModal);
  if (btnCancel) btnCancel.addEventListener('click', hideModal);
  modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideModal();

    const chosenName = select.value;
    const senderName = sessionStorage.getItem('userName') || 'Joya Sen';

    // Add to local members list
    if (!groupMembersMemory[currentGroupId]) groupMembersMemory[currentGroupId] = [];
    if (!groupMembersMemory[currentGroupId].includes(chosenName)) {
      groupMembersMemory[currentGroupId].push(chosenName);
    }
    updateConvoHeader(currentGroupId);

    // Send system message to the chat — uses sendChatMessage internally
    const systemText = `${senderName} added ${chosenName} to the room`;
    const sysPayload = {
      sender: 'System',
      role:   'system',
      text:   systemText,
      time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (IS_SERVER) {
      // POST /api/chats/:groupId with role=system
      fetch(`/api/chats/${currentGroupId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sysPayload)
      })
      .then(() => loadChats())
      .catch(err => console.error('[ADD_MEMBER] Error:', err));
    } else {
      if (!groupChatsMemory[currentGroupId]) groupChatsMemory[currentGroupId] = [];
      groupChatsMemory[currentGroupId].push(sysPayload);
      loadChats();
    }

    showToast(`${chosenName} added to ${currentGroupId}!`, 'fa-user-check');
  });
}

/* ================================================================
   NOTES — LOAD & SAVE
================================================================ */
/**
 * loadNotes — fetches notes for the current group.
 *
 * BACKEND CALL: GET /api/notes/:groupId
 *   Response: { groupId, content: "<JSON string of notesCollection>" }
 *
 * OFFLINE FALLBACK: reads from groupNotesMemory[currentGroupId]
 */
function loadNotes() {
  if (IS_SERVER) {
    fetch(`/api/notes/${currentGroupId}`)
      .then(res => res.json())
      .then(data => {
        parseNotesCollection(data.content);
        renderNoteTabs();
        loadActiveNoteIntoDOM();
      })
      .catch(() => {
        parseNotesCollection(groupNotesMemory[currentGroupId] || '');
        renderNoteTabs();
        loadActiveNoteIntoDOM();
      });
  } else {
    parseNotesCollection(groupNotesMemory[currentGroupId] || '');
    renderNoteTabs();
    loadActiveNoteIntoDOM();
  }
}

function parseNotesCollection(contentString) {
  try {
    const parsed = JSON.parse(contentString);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      notesCollection = parsed;
      if (Object.keys(notesCollection).length === 0) {
        notesCollection = { 'note-1': { title: 'Main Notes', content: `# ${currentGroupId}\n\n`, drawing: '' } };
      }
      if (!notesCollection[activeNoteId]) {
        activeNoteId = Object.keys(notesCollection)[0];
      }
    } else {
      throw new Error('Invalid notes format');
    }
  } catch {
    notesCollection = {
      'note-1': { title: 'Main Notes', content: contentString || `# ${currentGroupId}\n\n`, drawing: '' }
    };
    activeNoteId = 'note-1';
  }
}

function loadActiveNoteIntoDOM() {
  const textarea = document.getElementById('markdownTextarea');
  if (!textarea) return;

  const note = notesCollection[activeNoteId] || { title: 'Main Notes', content: '', drawing: '' };
  textarea.value = note.content;
  updateCounters();

  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (note.drawing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src    = note.drawing;
    }
  }

  renderNotesDirectory();
}

function saveActiveNoteContentLocal(content) {
  if (notesCollection[activeNoteId]) {
    notesCollection[activeNoteId].content = content;
  }
}

/**
 * triggerCloudNotesSave — saves the full notes collection to the server.
 *
 * BACKEND CALL: POST /api/notes/:groupId
 *   Body: { content: "<JSON string of notesCollection>" }
 *   Response: { success: true }
 *
 * OFFLINE FALLBACK: stores in groupNotesMemory[currentGroupId]
 */
function triggerCloudNotesSave() {
  const syncStatus   = document.getElementById('syncStatus');
  const payloadString = JSON.stringify(notesCollection);

  groupNotesMemory[currentGroupId] = payloadString;

  if (IS_SERVER) {
    if (syncStatus) syncStatus.innerHTML = '<span class="pulse-green" style="background:var(--warning);"></span> Syncing…';

    fetch(`/api/notes/${currentGroupId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: payloadString })
    })
    .then(() => {
      if (syncStatus) {
        syncStatus.innerHTML = '<span class="pulse-green"></span> Saved (just now)';
      }
    })
    .catch(() => {
      if (syncStatus) {
        syncStatus.innerHTML = '<span class="pulse-green" style="background:var(--danger);"></span> Sync failed';
      }
    });
  }
}

/* ================================================================
   NOTE TABS
================================================================ */
function renderNoteTabs() {
  const wrapper = document.getElementById('noteTabsWrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  Object.keys(notesCollection).forEach(nid => {
    const note = notesCollection[nid];
    const tab  = document.createElement('div');
    tab.className    = `note-tab${nid === activeNoteId ? ' active' : ''}`;
    tab.dataset.noteId = nid;
    tab.innerHTML    = `<i class="fa-solid fa-file-lines"></i> <span>${note.title}</span>`;

    tab.addEventListener('click', function () {
      const textarea = document.getElementById('markdownTextarea');
      if (textarea) saveActiveNoteContentLocal(textarea.value);
      activeNoteId = this.dataset.noteId;
      loadActiveNoteIntoDOM();
      renderNoteTabs();
      showToast(`Switched to "${note.title}"`, 'fa-file-lines');
    });

    wrapper.appendChild(tab);
  });
}

function setupTabsManager() {
  const btnCreate = document.getElementById('btnCreateNewNote');
  if (!btnCreate) return;

  btnCreate.addEventListener('click', function () {
    const title = prompt('Enter Note Title:', 'New Notes Page');
    if (title === null) return;

    const cleanTitle = title.trim() || 'Untitled Notes';
    const newId      = 'note-' + Date.now();

    const textarea = document.getElementById('markdownTextarea');
    if (textarea) saveActiveNoteContentLocal(textarea.value);

    notesCollection[newId] = {
      title:   cleanTitle,
      content: `# ${cleanTitle}\n\n`,
      drawing: ''
    };

    activeNoteId = newId;
    loadActiveNoteIntoDOM();
    renderNoteTabs();
    triggerCloudNotesSave();
    showToast(`Created note "${cleanTitle}"!`, 'fa-circle-check');
  });
}

/* ================================================================
   NOTES DIRECTORY (Saved Notes panel)
================================================================ */
function setupNotesDirectory() {
  const searchInput = document.getElementById('noteSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      renderNotesDirectory(this.value);
    });
  }
}

function renderNotesDirectory(searchQuery = '') {
  const container = document.getElementById('notesListDirectoryContainer');
  if (!container) return;

  container.innerHTML = '';
  const query = searchQuery.toLowerCase().trim();

  Object.keys(notesCollection).forEach(nid => {
    const note = notesCollection[nid];
    if (query && !note.title.toLowerCase().includes(query)) return;

    const cleanSnippet = (note.content || '')
      .replace(/[#*`_\-]/g, '')
      .replace(/\n+/g, ' ')
      .trim() || 'No content…';

    const card = document.createElement('div');
    card.className = `note-directory-card${nid === activeNoteId ? ' active' : ''}`;
    card.dataset.noteId = nid;
    card.innerHTML = `
      <h4 class="note-card-title">
        <i class="fa-solid fa-file-lines" style="color:var(--primary);"></i>
        <span>${note.title}</span>
      </h4>
      <p class="note-card-snippet">${cleanSnippet}</p>
      <div class="note-card-footer">
        <span class="note-card-date">Ruled Sheet</span>
        <button class="note-card-delete-btn" title="Delete Note" onclick="event.stopPropagation(); deleteNotePage('${nid}');">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    card.addEventListener('click', function () {
      const textarea = document.getElementById('markdownTextarea');
      if (textarea) saveActiveNoteContentLocal(textarea.value);
      activeNoteId = nid;
      loadActiveNoteIntoDOM();
      renderNoteTabs();
      showToast(`Loaded "${note.title}"`, 'fa-file-lines');
    });

    container.appendChild(card);
  });

  if (container.children.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;font-size:11px;color:var(--text-muted);font-weight:600;">
        <i class="fa-solid fa-folder-open" style="font-size:16px;margin-bottom:6px;display:block;color:var(--border);"></i>
        No saved notes found…
      </div>`;
  }
}

window.deleteNotePage = function (nid) {
  const note = notesCollection[nid];
  if (!note) return;

  if (!confirm(`Delete the note "${note.title}"? This cannot be undone.`)) return;

  delete notesCollection[nid];

  if (activeNoteId === nid) {
    const keys = Object.keys(notesCollection);
    if (keys.length > 0) {
      activeNoteId = keys[0];
    } else {
      activeNoteId = 'note-1';
      notesCollection[activeNoteId] = { title: 'Main Notes', content: `# ${currentGroupId}\n\n`, drawing: '' };
    }
  }

  loadActiveNoteIntoDOM();
  renderNoteTabs();
  triggerCloudNotesSave();
  showToast('Note deleted!', 'fa-trash-can');
};

/* ================================================================
   MARKDOWN EDITOR
================================================================ */
function setupMarkdownEditor() {
  const textarea = document.getElementById('markdownTextarea');
  if (!textarea) return;

  let autoSaveTimeout = null;

  textarea.addEventListener('input', function () {
    saveActiveNoteContentLocal(textarea.value);
    updateCounters();
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(triggerCloudNotesSave, 1400);
  });
}

function updateCounters() {
  const textarea = document.getElementById('markdownTextarea');
  const display  = document.getElementById('charCountDisplay');
  if (!textarea || !display) return;

  const text  = textarea.value;
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(w => w.length > 0).length;
  display.textContent = `${words} words | ${chars} chars`;
}

/* ================================================================
   NOTEPAD TOGGLES (Draw mode)
================================================================ */
function setupNotepadToggles() {
  const btnDraw = document.getElementById('btnModeDraw');
  if (!btnDraw) return;

  btnDraw.addEventListener('click', function () {
    const isActive = this.classList.contains('active');
    if (isActive) {
      switchMode('text');
      this.classList.remove('active');
    } else {
      switchMode('draw');
      this.classList.add('active');
    }
  });
}

function switchMode(mode) {
  const canvasEl  = document.getElementById('whiteboardCanvas');
  const toolbar   = document.getElementById('floatingDrawingToolbar');
  const btnDraw   = document.getElementById('btnModeDraw');

  if (mode === 'draw') {
    if (canvasEl) canvasEl.style.pointerEvents = 'auto';
    if (toolbar)  toolbar.classList.remove('hidden');
    if (btnDraw)  btnDraw.classList.add('active');
  } else {
    if (canvasEl) canvasEl.style.pointerEvents = 'none';
    if (toolbar)  toolbar.classList.add('hidden');
    if (btnDraw)  btnDraw.classList.remove('active');
  }
}

/* ================================================================
   WHITEBOARD DRAWING
================================================================ */
function setupWhiteboardDrawing() {
  canvas = document.getElementById('whiteboardCanvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

  function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  function startDraw(e) {
    isDrawing = true;
    const c = getCoords(e);
    lastX = c.x; lastY = c.y;
  }

  function draw(e) {
    if (!isDrawing) return;
    const c = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(c.x, c.y);
    ctx.strokeStyle = currentTool === 'eraser' ? 'rgba(255,255,255,1)' : currentColor;
    ctx.lineWidth   = currentTool === 'eraser' ? currentBrushSize * 3 : currentBrushSize;
    ctx.stroke();
    lastX = c.x; lastY = c.y;
  }

  function stopDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    if (notesCollection[activeNoteId]) {
      notesCollection[activeNoteId].drawing = canvas.toDataURL();
    }
    triggerCloudNotesSave();
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup',   stopDraw);
  canvas.addEventListener('mouseout',  stopDraw);
  canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) startDraw(e.touches[0]); }, { passive: true });
  canvas.addEventListener('touchmove',  e => { if (e.touches.length === 1) { e.preventDefault(); draw(e.touches[0]); } });
  canvas.addEventListener('touchend',   stopDraw);

  // Color pickers
  document.querySelectorAll('.color-dot-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.color-dot-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = 'transparent';
        b.style.boxShadow   = 'none';
      });
      this.classList.add('active');
      this.style.borderColor = '#fff';
      this.style.boxShadow   = '0 0 0 2px var(--primary)';
      currentColor = this.dataset.color;
      currentTool  = 'pencil';

      const btnEraser = document.getElementById('btnToolEraser');
      if (btnEraser) btnEraser.classList.remove('active');
    });
  });

  // Brush size
  const brushSelect = document.getElementById('brushSizeSelect');
  if (brushSelect) {
    brushSelect.addEventListener('change', function () {
      currentBrushSize = parseInt(this.value, 10);
    });
  }

  // Eraser
  const btnEraser = document.getElementById('btnToolEraser');
  if (btnEraser) {
    btnEraser.addEventListener('click', function () {
      if (currentTool === 'eraser') {
        currentTool = 'pencil';
        this.classList.remove('active');
      } else {
        currentTool = 'eraser';
        this.classList.add('active');
      }
    });
  }

  // Clear canvas
  const btnClear = document.getElementById('btnToolClear');
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      if (!confirm('Clear the drawing canvas?')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (notesCollection[activeNoteId]) notesCollection[activeNoteId].drawing = '';
      triggerCloudNotesSave();
      showToast('Canvas cleared!', 'fa-trash-can');
    });
  }
}

/* ================================================================
   NOTEPAD FEATURES — Formatting + Copy / Download / Clear / Share
================================================================ */
function setupNotepadFeatures() {
  // Formatting toolbar
  const fmtMap = {
    'btnFormatBold':   ['**', '**'],
    'btnFormatItalic': ['*',  '*'],
    'btnFormatHeader': ['# ', ''],
    'btnFormatList':   ['* ', ''],
    'btnFormatCode':   ['`',  '`']
  };

  Object.entries(fmtMap).forEach(([id, [before, after]]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => insertAtCursor(before, after));
  });

  // Copy
  const btnCopy = document.getElementById('btnCopyNote');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const textarea = document.getElementById('markdownTextarea');
      if (!textarea) return;
      navigator.clipboard.writeText(textarea.value)
        .then(() => showToast('Note copied to clipboard!', 'fa-copy'))
        .catch(() => showToast('Copy failed — try selecting and copying manually.', 'fa-circle-xmark'));
    });
  }

  // Download
  const btnDownload = document.getElementById('btnDownloadNote');
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      const textarea = document.getElementById('markdownTextarea');
      if (!textarea) return;
      const noteTitle = (notesCollection[activeNoteId]?.title || 'note')
        .toLowerCase().replace(/[^a-z0-9]/g, '-');
      const blob = new Blob([textarea.value], { type: 'text/markdown;charset=utf-8;' });
      const link = document.createElement('a');
      link.href     = URL.createObjectURL(blob);
      link.download = `${noteTitle}.md`;
      link.click();
      showToast('Note downloaded as .md!', 'fa-download');
    });
  }

  // Clear
  const btnClear = document.getElementById('btnClearNote');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const textarea = document.getElementById('markdownTextarea');
      if (!textarea) return;
      if (!confirm('Clear this note? This cannot be undone.')) return;
      textarea.value = '';
      textarea.dispatchEvent(new Event('input'));
      showToast('Note cleared!', 'fa-eraser');
    });
  }

  /**
   * Share Notepad to Chat — posts a shareable notepad link message into the active group chat.
   *
   * BACKEND CALL: POST /api/chats/:groupId (same as regular chat messages)
   *   Body: { sender, role, text: "📎 [Notepad shared] <URL>", time }
   *
   * OFFLINE FALLBACK: pushes directly to groupChatsMemory[currentGroupId]
   *
   * The shared URL uses query parameters: ?live=<groupId>&note=<activeNoteId>
   * When someone opens this link, checkDeepLink() auto-opens that group's notes.
   */
  const btnShareToChat = document.getElementById('btnShareNoteToChat');
  if (btnShareToChat) {
    btnShareToChat.addEventListener('click', () => {
      // Auto-open the conversation view so user sees the message appear
      openConversationView();

      const shareUrl   = `${window.location.origin}${window.location.pathname}?live=${encodeURIComponent(currentGroupId)}&note=${encodeURIComponent(activeNoteId)}`;
      const noteTitle  = notesCollection[activeNoteId]?.title || 'Notes';
      const shareText  = `📎 [Notepad shared] "${noteTitle}" in ${currentGroupId} — Click to open: ${shareUrl}`;

      sendChatMessage(shareText);
      showToast('Notepad link shared in chat!', 'fa-share-nodes');
    });
  }
}

function insertAtCursor(textBefore, textAfter = '') {
  const textarea = document.getElementById('markdownTextarea');
  if (!textarea) return;

  textarea.focus();
  const start     = textarea.selectionStart;
  const end       = textarea.selectionEnd;
  const value     = textarea.value;
  const selected  = value.substring(start, end);
  const replacement = textBefore + selected + textAfter;

  textarea.value = value.substring(0, start) + replacement + value.substring(end);
  textarea.selectionStart = start + textBefore.length;
  textarea.selectionEnd   = start + textBefore.length + selected.length;

  textarea.dispatchEvent(new Event('input'));
}

/* ================================================================
   LOGOUT
================================================================ */
function setupLogoutHandler() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  }
}

/* ================================================================
   TOAST NOTIFICATION
================================================================ */
/**
 * showToast — displays a non-blocking toast notification.
 * @param {string} message — text to display
 * @param {string} [icon]  — FontAwesome icon class (e.g. 'fa-copy')
 */
function showToast(message, icon = 'fa-circle-check') {
  const toast   = document.getElementById('actionToast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');

  if (!toast || !toastMsg) return;

  if (toastIcon) toastIcon.className = `fa-solid ${icon}`;
  toastMsg.textContent = message;

  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 3200);
}
/* ================================================================
   AI VOICE RECORDER → NOTES
   Uses the Web Speech API (SpeechRecognition) for real audio-to-text.
   Fallback: simulated transcript if browser doesn't support it.
   On stop → creates a new note tab with the full transcript.
================================================================ */
function setupAIVoiceRecorder() {
  const btnStart    = document.getElementById('btnWsStartRecord');
  const btnStop     = document.getElementById('btnWsStopRecord');
  const waveform    = document.getElementById('wsWaveform');
  const timerEl     = document.getElementById('wsRecordingTimer');
  const transcriptEl = document.getElementById('wsLiveTranscript');
  const processingEl = document.getElementById('wsAiProcessing');
  const statusEl    = document.getElementById('wsAiStatus');

  if (!btnStart || !btnStop) return;

  // ── Try Web Speech API ──
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition  = null;
  let transcript   = '';
  let timerInterval = null;
  let seconds      = 0;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = 'en-IN';

    recognition.onresult = function (event) {
      let interimTranscript = '';
      let finalTranscript   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interimTranscript += t;
        }
      }

      transcript += finalTranscript;
      if (transcriptEl) {
        transcriptEl.textContent = (transcript + interimTranscript).trim() || 'Listening...';
      }
    };

    recognition.onerror = function (e) {
      console.warn('[AI Recorder] SpeechRecognition error:', e.error);
      if (transcriptEl && e.error !== 'no-speech') {
        transcriptEl.textContent = `Mic error: ${e.error}. Check browser permissions.`;
      }
    };
  }

  function startTimer() {
    seconds = 0;
    timerEl.textContent = '00:00';
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerEl.textContent = '00:00';
  }

  // ── START RECORDING ──
  btnStart.addEventListener('click', function () {
    transcript = '';
    if (transcriptEl) transcriptEl.textContent = 'Listening... start speaking!';

    btnStart.classList.add('hidden');
    btnStop.classList.remove('hidden');
    if (waveform) waveform.classList.add('recording');
    startTimer();

    if (recognition) {
      try {
        recognition.start();
      } catch (err) {
        console.warn('[AI Recorder] Recognition start error:', err);
      }
    } else {
      // Browser doesn't support Speech API — simulate
      if (transcriptEl) transcriptEl.textContent = 'Recording audio... (browser speech API unavailable — transcript will be simulated)';
    }

    showToast('Voice recording started! Start speaking.', 'fa-microphone');
  });

  // ── STOP RECORDING ──
  btnStop.addEventListener('click', function () {
    btnStop.classList.add('hidden');
    if (waveform) waveform.classList.remove('recording');
    stopTimer();

    if (recognition) {
      recognition.stop();
    }

    // Show processing state
    if (processingEl) processingEl.classList.remove('hidden');
    if (statusEl) statusEl.textContent = 'Transcribing audio…';

    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Building structured note…';
    }, 1000);

    setTimeout(() => {
      if (processingEl) processingEl.classList.add('hidden');
      btnStart.classList.remove('hidden');

      // ── Build final note content ──
      const finalText = transcript.trim() ||
        '(No speech detected — make sure your microphone is allowed in the browser)';

      const now        = new Date();
      const dateStr    = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr    = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const noteTitle  = `Voice Note — ${dateStr}`;
      const noteContent = `# ${noteTitle}\n> Recorded at ${timeStr}\n\n---\n\n${finalText}`;

      // Create new note tab
      const newId = 'voice-' + Date.now();
      notesCollection[newId] = {
        title:   noteTitle,
        content: noteContent,
        drawing: ''
      };

      // Switch to the new note
      const textarea = document.getElementById('markdownTextarea');
      if (textarea) saveActiveNoteContentLocal(textarea.value);
      activeNoteId = newId;
      loadActiveNoteIntoDOM();
      renderNoteTabs();
      triggerCloudNotesSave();

      // Reset transcript preview
      if (transcriptEl) transcriptEl.textContent = 'Press Record and start speaking...';
      transcript = '';

      showToast(`Voice note saved: "${noteTitle}"!`, 'fa-circle-check');
    }, 2000);
  });
}
