/**
 * CampusSync - Collaborative Workspace Room JavaScript
 * Handles split markdown editing, regex parsing, live chats, and file downloads
 */

const IS_SERVER = window.location.protocol.startsWith('http');

document.addEventListener('DOMContentLoaded', function () {
  loadWorkspaceSession();
  initMarkdownEditor();
  initWorkspaceChat();
  initFileDownloads();
});

/* ==================== LOAD PROFILE & THEME ==================== */
function loadWorkspaceSession() {
  const userName = sessionStorage.getItem('userName') || 'Joya Sen';
  const userRole = sessionStorage.getItem('userRole') || 'student';

  if (userRole === 'professor') {
    document.body.className = 'theme-professor';
  } else {
    document.body.className = 'theme-student';
  }

  // Update profile parameters
  updateDOMText('sidebarName', userName);
  updateDOMText('sidebarRole', userRole.charAt(0).toUpperCase() + userRole.slice(1));
  updateDOMText('topbarUserName', userName);

  // Set Profile Avatars
  const isProf = userRole === 'professor';
  const avatarUrl = isProf
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';

  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const topbarAvatar = document.getElementById('topbarAvatar');
  if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
  if (topbarAvatar) topbarAvatar.src = avatarUrl;

  // Render initial chat box scroll position
  const chatBox = document.getElementById('chatMessagesBox');
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

  // Check if opened with Quick Notes trigger
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('newNote') === 'true') {
    const textarea = document.getElementById('markdownTextarea');
    if (textarea) {
      textarea.value = `# New Study Note\n\n**Topic:** Graph midterms\n**Author:** Joya Sen\n\n* Write ideas here...\n`;
      textarea.focus();
    }
  }
}

function updateDOMText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ==================== MARKDOWN SPLIT EDITOR ==================== */
function initMarkdownEditor() {
  const textarea = document.getElementById('markdownTextarea');
  const preview = document.getElementById('markdownPreview');
  const btnEditView = document.getElementById('btnEditView');
  const btnFullPreview = document.getElementById('btnFullPreview');
  const panes = document.getElementById('editorPanes');
  const syncStatus = document.getElementById('syncStatus');

  if (!textarea || !preview) return;

  // 1. Load active notes
  if (IS_SERVER) {
    if (syncStatus) {
      syncStatus.innerHTML = '<span class="pulse-green" style="background: var(--warning);"></span> Loading note room...';
    }
    fetch('/api/notes/dsa_group')
      .then(res => res.json())
      .then(data => {
        textarea.value = data.content;
        updatePreview(data.content, preview);
        if (syncStatus) {
          syncStatus.innerHTML = '<span class="pulse-green"></span> Connected to cloud sync (Ready)';
        }
      })
      .catch(err => {
        console.error('Note fetch failed:', err);
        updatePreview(textarea.value, preview);
      });
  } else {
    updatePreview(textarea.value, preview);
  }

  // 2. Typing Input Listener with dynamic Auto-Save
  let saveTimeout;
  textarea.addEventListener('input', function () {
    updatePreview(textarea.value, preview);

    if (IS_SERVER) {
      if (syncStatus) {
        syncStatus.innerHTML = '<span class="pulse-green" style="background: var(--warning);"></span> Syncing...';
      }
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        fetch('/api/notes/dsa_group', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textarea.value })
        })
        .then(res => res.json())
        .then(() => {
          if (syncStatus) {
            syncStatus.innerHTML = '<span class="pulse-green"></span> Saved to cloud (Last sync: just now)';
          }
        })
        .catch(err => {
          if (syncStatus) {
            syncStatus.innerHTML = '<span class="pulse-green" style="background: var(--danger);"></span> Offline / Sync failed';
          }
        });
      }, 1500); // Debounced 1.5 seconds auto-save
    }
  });

  // 3. View Switchers
  if (btnEditView && btnFullPreview && panes) {
    btnEditView.addEventListener('click', function () {
      btnEditView.classList.add('active');
      btnFullPreview.classList.remove('active');
      panes.className = 'editor-split-panes';
    });

    btnFullPreview.addEventListener('click', function () {
      btnFullPreview.classList.add('active');
      btnEditView.classList.remove('active');
      panes.className = 'editor-split-panes full-preview';
    });
  }

  // 4. Auto-save Simulation (Only for static fallback mode)
  if (!IS_SERVER) {
    setInterval(function () {
      if (syncStatus) {
        syncStatus.innerHTML = '<span class="pulse-green" style="background: var(--warning);"></span> Syncing changes with DSA Group...';
        
        setTimeout(function () {
          syncStatus.innerHTML = '<span class="pulse-green"></span> Saved to cloud (Last sync: just now)';
        }, 1000);
      }
    }, 12000);
  }
}

// Regex-based simple Markdown parser
function updatePreview(mdText, previewEl) {
  let html = mdText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullets
  html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1<\/ul>');
  
  // Clean redundant nested ul lists
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Code inline
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Paragraph lines
  html = html.split('\n').map(line => {
    if (line.trim().startsWith('<h') || line.trim().startsWith('<ul') || line.trim().startsWith('<li') || line.trim().startsWith('</ul') || line.trim() === '') {
      return line;
    }
    return `<p>${line}</p>`;
  }).join('\n');

  previewEl.innerHTML = html;
}

/* ==================== WORKSPACE STUDY ROOM CHAT ==================== */
function initWorkspaceChat() {
  const form = document.getElementById('workspaceChatForm');
  const input = document.getElementById('chatMessageInput');
  const chatBox = document.getElementById('chatMessagesBox');

  if (!form || !input || !chatBox) return;

  const userName = sessionStorage.getItem('userName') || 'Joya Sen';

  // Helper to draw bubble UI
  function appendChatBubble(sender, text, time, isSelf, avatar = null) {
    const bubble = document.createElement('div');
    bubble.className = isSelf ? 'chat-bubble-row self' : 'chat-bubble-row other';
    
    const avatarImg = avatar || (isSelf
      ? (sessionStorage.getItem('userRole') === 'professor' 
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80')
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&fit=crop&q=80');

    if (isSelf) {
      bubble.innerHTML = `
        <div class="bubble-content-wrapper">
          <span class="sender-name">${sender} (You)</span>
          <div class="bubble">
            <p>${text}</p>
          </div>
          <span class="bubble-time">${time}</span>
        </div>
      `;
    } else {
      bubble.innerHTML = `
        <img src="${avatarImg}" alt="avatar" class="bubble-avatar" />
        <div class="bubble-content-wrapper">
          <span class="sender-name">${sender}</span>
          <div class="bubble">
            <p>${text}</p>
          </div>
          <span class="bubble-time">${time}</span>
        </div>
      `;
    }
    chatBox.appendChild(bubble);
  }

  // Load chat logs on server mode
  function fetchChats() {
    fetch('/api/chats/dsa_group')
      .then(res => res.json())
      .then(messages => {
        // Only replace content if count changes to prevent scroll bouncing
        const currentCount = chatBox.querySelectorAll('.chat-bubble-row').length;
        if (messages.length !== currentCount) {
          chatBox.innerHTML = '';
          messages.forEach(msg => {
            const isSelf = msg.sender.toLowerCase().includes(userName.split(' ')[0].toLowerCase());
            appendChatBubble(msg.sender, msg.text, msg.time, isSelf, msg.avatar);
          });
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      })
      .catch(err => console.error("Chat sync failed:", err));
  }

  if (IS_SERVER) {
    chatBox.innerHTML = '';
    fetchChats();
    // Poll chat server every 3s
    setInterval(fetchChats, 3000);
  }

  // Form Submit Handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const msg = input.value.trim();
    if (!msg) return;

    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (IS_SERVER) {
      const userRole = sessionStorage.getItem('userRole') || 'student';
      const avatarUrl = userRole === 'professor'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';

      fetch('/api/chats/dsa_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: userName,
          role: userRole,
          avatar: avatarUrl,
          text: msg,
          time: t
        })
      })
      .then(res => res.json())
      .then(() => {
        fetchChats();
        input.value = '';
        showToast('Message sent to study board!', 'fa-paper-plane');
      });
    } else {
      // Mock Fallback
      appendChatBubble(userName, msg, t, true);
      chatBox.scrollTop = chatBox.scrollHeight;
      input.value = '';
      showToast('Message sent to study board!', 'fa-paper-plane');

      // Async mock response from Aarav
      setTimeout(function () {
        appendChatBubble('Aarav Sharma', `Ah, got it! Thanks for updating the note draft, ${userName.split(' ')[0]}. That makes it super clear.`, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), false);
        chatBox.scrollTop = chatBox.scrollHeight;
      }, 1800);
    }
  });
}

/* ==================== RESOURCE DOWNLOADS ==================== */
function initFileDownloads() {
  const d1 = document.getElementById('mockFileDownload1');
  const d2 = document.getElementById('mockFileDownload2');

  if (d1) {
    d1.addEventListener('click', function () {
      showToast('Downloading document "syllabus_ds.pdf"...', 'fa-file-pdf');
    });
  }

  if (d2) {
    d2.addEventListener('click', function () {
      showToast('Downloading document "midterm_key.docx"...', 'fa-file-word');
    });
  }
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
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}
