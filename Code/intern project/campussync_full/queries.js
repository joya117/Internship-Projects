/**
 * CampusSync - Subject Queries Desk JavaScript
 * Handles async academic threading, resolved markings, new question modals, and professor public publishes
 */

const IS_SERVER = window.location.protocol.startsWith('http');

document.addEventListener('DOMContentLoaded', function () {
  loadQueriesSession();
  initQueriesThreads();
  initQueriesModals();
  initLogout();
});

/* ==================== LOAD PROFILE & DISPUTE SYNC ==================== */
function loadQueriesSession() {
  const userName = sessionStorage.getItem('userName') || 'Joya Sen';
  const userRole = sessionStorage.getItem('userRole') || 'student';
  const openNewQueryBtn = document.getElementById('openNewQueryModal');

  const paneTitle = document.querySelector('.threads-pane .pane-header h3');

  if (userRole === 'professor') {
    document.body.className = 'theme-professor';
    // Show professor public toggle checkboxes
    document.getElementById('profControlsRow')?.classList.remove('hidden');
    if (openNewQueryBtn) openNewQueryBtn.style.display = 'none';
    if (paneTitle) paneTitle.textContent = 'Student Queries Inbox';

    // Show a clean welcome state for the professor advising them to click a card
    const threadTitle = document.getElementById('activeThreadTitle');
    const threadMeta = document.getElementById('activeThreadMeta');
    const chatMessagesBox = document.getElementById('inboxMessagesBox');
    const replyForm = document.getElementById('queryReplyForm');

    if (threadTitle) threadTitle.textContent = 'Queries Response Desk';
    if (threadMeta) threadMeta.textContent = 'CampusSync • Professor Portal';
    if (chatMessagesBox) {
      chatMessagesBox.innerHTML = `
        <div class="inbox-msg-row professor">
          <div class="inbox-meta-head">
            <span class="name">Academic Assistant</span>
            <span class="time">Active</span>
          </div>
          <div class="msg-bubble">
            <p>Welcome, Professor Joya! Please select an active student query thread from the sidebar inbox on the left to review details and submit your expert answer.</p>
          </div>
        </div>
      `;
    }
    if (replyForm) replyForm.style.display = 'none'; // Keep hidden until thread selected
  } else {
    document.body.className = 'theme-student';
    document.getElementById('profControlsRow')?.classList.add('hidden');
    if (openNewQueryBtn) openNewQueryBtn.style.display = 'none';
    if (paneTitle) paneTitle.textContent = 'Your Query History';

    // Force show reply form by default for empty chatbox query entry
    const replyForm = document.getElementById('queryReplyForm');
    const replyInput = document.getElementById('replyMessageInput');
    if (replyForm) {
      replyForm.style.display = 'block';
      if (replyInput) replyInput.placeholder = "Type your academic question/query here to ask your professor...";
    }
  }

  // Update DOM parameters
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
}

function updateDOMText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ==================== ACADEMIC THREADING CONTROLLER ==================== */
let threadMockMessages = {
  2: [
    { sender: 'Joya Sen', role: 'student', text: 'I was marked absent today in CS301 due to a GPS calibration error. Telemetry variance shows 68.4m, which drifted outside the 50m boundaries while I was sitting inside Lecture Hall 4. Here are my coordinates: 28.6143 N, 77.2096 E. Please review my dispute.', time: 'Just now' },
    { sender: 'system', role: 'system', text: 'Dispute submitted. Awaiting professor manual override log...', time: '' }
  ],
  3: [
    { sender: 'Meera Nair', role: 'student', text: 'Due to the upcoming DTU hackathon, can we request an extension on Web Lab 3?', time: '2 days ago' },
    { sender: 'Dr. Priya', role: 'professor', text: 'Sure Meera, the deadline has been extended by 48 hours for the entire batch. Good luck in the hackathon!', time: '1 day ago' }
  ],
  4: [
    { sender: 'Aarav Sharma', role: 'student', text: 'Will there be questions relating to circular permutations on the quiz tomorrow?', time: '5 days ago' },
    { sender: 'Dr. A. K. Ray', role: 'professor', text: 'Yes, circular permutations will make up at least one question. Revise the (n-1)! formula.', time: '4 days ago' }
  ]
};

function initQueriesThreads() {
  const threadsContainer = document.getElementById('threadsContainer');
  const chatMessagesBox = document.getElementById('inboxMessagesBox');
  const threadTitle = document.getElementById('activeThreadTitle');
  const threadMeta = document.getElementById('activeThreadMeta');
  const markResolvedBtn = document.getElementById('markResolvedBtn');
  const replyForm = document.getElementById('queryReplyForm');
  const replyInput = document.getElementById('replyMessageInput');

  if (!chatMessagesBox) return;

  const userName = sessionStorage.getItem('userName') || 'Joya Sen';

  // HELPER: Select Thread & Render Inbox
  function selectThread(thread, cardElement) {
    const threads = document.querySelectorAll('.thread-card');
    threads.forEach(c => c.classList.remove('active'));
    if (cardElement) cardElement.classList.add('active');

    threadTitle.textContent = thread.title;
    threadMeta.textContent = thread.subject + ' • ' + thread.assignedTo;

    const isResolved = thread.status.toLowerCase().includes('resolved');
    const userRole = sessionStorage.getItem('userRole') || 'student';

    if (userRole === 'student') {
      // Students get a clean chat input to ask/chat direct queries
      if (markResolvedBtn) markResolvedBtn.style.display = 'none';
      if (replyForm) {
        replyForm.style.display = 'block';
        replyInput.placeholder = "Type your query or ask follow-up questions directly here...";
      }
      document.getElementById('profControlsRow')?.classList.add('hidden');
    } else {
      // Professors get answers, resolved updates, and public switches
      document.getElementById('profControlsRow')?.classList.remove('hidden');
      if (isResolved) {
        if (markResolvedBtn) markResolvedBtn.style.display = 'none';
        if (replyForm) replyForm.style.display = 'none';
      } else {
        if (markResolvedBtn) markResolvedBtn.style.display = 'inline-flex';
        if (replyForm) {
          replyForm.style.display = 'block';
          replyInput.placeholder = "Type your expert academic response here...";
        }
      }
    }

    // Render messages
    chatMessagesBox.innerHTML = '';
    thread.messages.forEach(msg => {
      const row = document.createElement('div');
      if (msg.role === 'system') {
        row.className = 'inbox-msg-row student';
        row.innerHTML = `
          <div class="inbox-meta-head">
            <span class="name">System Status</span>
          </div>
          <div class="msg-bubble status-waiting">
            <p><em>${msg.text}</em></p>
          </div>
        `;
      } else {
        row.className = `inbox-msg-row ${msg.role || 'student'}`;
        row.innerHTML = `
          <div class="inbox-meta-head">
            <span class="name">${msg.sender}</span>
            <span class="time">${msg.time}</span>
          </div>
          <div class="msg-bubble">
            <p>${msg.text}</p>
          </div>
        `;
      }
      chatMessagesBox.appendChild(row);
    });
    chatMessagesBox.scrollTop = chatBoxScrollHeight();
  }

  function chatBoxScrollHeight() {
    return chatMessagesBox.scrollHeight;
  }

  // HELPER: Fetch and dynamically render thread listing from Express API
  let currentQueries = [];
  function loadAndRenderQueries(autoSelectId = null) {
    if (IS_SERVER) {
      fetch('/api/queries')
        .then(res => res.json())
        .then(data => {
          currentQueries = data;
          
          // Inject GPS Proximity Lock Dispute if logged on attendance screen
          const disputeLogged = sessionStorage.getItem('attendanceDisputeLogged');
          if (disputeLogged === 'true' && !currentQueries.find(q => q.id === '2')) {
            const disputeThread = {
              id: '2',
              subject: 'CS301 - Data Structures',
              title: 'GPS Proximity Lock Dispute',
              snippet: 'I was marked absent today in CS301 due to a GPS calibration error...',
              time: 'Just now',
              assignedTo: 'Prof. Joya Sen',
              status: 'Dispute flagged',
              messages: [
                {
                  sender: 'Joya Sen',
                  role: 'student',
                  time: 'Just now',
                  text: 'I was marked absent today in CS301 due to a GPS calibration error. Telemetry variance shows 68.4m, which drifted outside the 50m boundaries while I was sitting inside Lecture Hall 4. Here are my coordinates: 28.6143 N, 77.2096 E. Please review my dispute.'
                }
              ]
            };
            currentQueries.unshift(disputeThread);
          }

          renderCards(currentQueries, autoSelectId);
        });
    } else {
      // Local fallbacks matching HTML cards
      const staticCards = document.querySelectorAll('.thread-card');
      staticCards.forEach(card => {
        card.addEventListener('click', function () {
          const tid = card.getAttribute('data-thread-id');
          threadsContainer.querySelectorAll('.thread-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');

          const staticThread = {
            id: tid,
            title: card.querySelector('h4').textContent,
            subject: card.querySelector('.subject-tag').textContent,
            assignedTo: card.querySelector('.thread-time').textContent.split(' • ')[1] || 'Prof. Joya Sen',
            status: card.querySelector('.status-pill').textContent,
            messages: threadMockMessages[tid] || []
          };
          selectThread(staticThread, card);
        });
      });

      // Handle dispute card loading
      const disputeLogged = sessionStorage.getItem('attendanceDisputeLogged');
      const disputeItem = document.getElementById('disputeThreadItem');
      if (disputeLogged === 'true' && disputeItem) {
        disputeItem.style.display = 'block';
        setTimeout(() => disputeItem.click(), 300);
      } else {
        const first = document.querySelector('.thread-card');
        if (first) first.click();
      }
    }
  }

  function renderCards(queries, autoSelectId) {
    if (!threadsContainer) return;
    threadsContainer.innerHTML = '';

    if (queries.length === 0) {
      threadsContainer.innerHTML = `
        <div class="empty-threads-placeholder" style="padding: 24px 16px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; border: 1.5px dashed var(--border); border-radius: 12px; margin: 12px 0; background: #ffffff;">
          <i class="fa-solid fa-folder-open" style="font-size: 1.8rem; margin-bottom: 10px; color: var(--primary); opacity: 0.8; display: block;"></i>
          <span style="font-weight: 500; display: block; margin-bottom: 4px; color: var(--text-primary);">No Queries Logged Yet</span>
          Ask your first question directly in the chatbox!
        </div>
      `;
      return;
    }

    queries.forEach(thread => {
      const card = document.createElement('div');
      
      let statusClass = 'pending';
      if (thread.status.toLowerCase().includes('resolve')) {
        statusClass = 'resolved';
      }

      card.className = 'thread-card';
      card.setAttribute('data-thread-id', thread.id);
      card.innerHTML = `
        <div class="thread-meta">
          <span class="subject-tag">${thread.subject}</span>
          <span class="status-pill status-pill--${statusClass}">${thread.status}</span>
        </div>
        <h4>${thread.title}</h4>
        <p class="thread-snippet">"${thread.snippet}"</p>
        <span class="thread-time">${thread.time} • ${thread.assignedTo}</span>
      `;
      
      card.addEventListener('click', function () {
        selectThread(thread, card);
      });

      threadsContainer.appendChild(card);
    });

    if (autoSelectId) {
      const targetCard = threadsContainer.querySelector(`[data-thread-id="${autoSelectId}"]`);
      if (targetCard) {
        targetCard.click();
        targetCard.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (threadsContainer.firstChild) {
      threadsContainer.firstChild.click();
    }
  }

  // Load queries lists
  loadAndRenderQueries();

  // Reply submission
  if (replyForm) {
    replyForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const text = replyInput.value.trim();
      if (!text) return;

      const activeCard = threadsContainer.querySelector('.thread-card.active') || document.querySelector('.thread-card.active');
      const userName = sessionStorage.getItem('userName') || 'Joya Sen';
      const userRole = sessionStorage.getItem('userRole') || 'student';

      if (!activeCard) {
        // Clear input field early
        replyInput.value = '';
        
        // No active thread context, so we automatically spawn a new one!
        if (IS_SERVER) {
          fetch('/api/queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: 'General Support',
              title: text.length > 40 ? text.substring(0, 40) + '...' : text,
              text: text,
              sender: userName
            })
          })
          .then(res => res.json())
          .then(newThread => {
            showToast('Academic query posted successfully!', 'fa-circle-check');
            // Append the message to our current chatbox view
            const chatMessagesBox = document.getElementById('inboxMessagesBox');
            if (chatMessagesBox) {
              const row = document.createElement('div');
              row.className = 'inbox-msg-row student';
              row.innerHTML = `
                <div class="inbox-meta-head">
                  <span class="name">${userName}</span>
                  <span class="time">Just now</span>
                </div>
                <div class="msg-bubble">
                  <p>${text}</p>
                </div>
              `;
              chatMessagesBox.appendChild(row);
              chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
            }
            
            // Reload server list in background or sync
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          });
        } else {
          // Local mockup fallback
          const newId = Object.keys(threadMockMessages).length + 2;
          threadMockMessages[newId] = [
            { sender: userName, role: 'student', text: text, time: 'Just now' }
          ];
          showToast('Academic query logged locally!', 'fa-circle-check');
          window.location.reload();
        }
        return;
      }
      const publicCheck = document.getElementById('publicToggleCheckbox');
      const isPublic = publicCheck ? publicCheck.checked : false;

      if (IS_SERVER) {
        fetch(`/api/queries/${threadId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: userName,
            role: userRole,
            text: text,
            publishPublic: isPublic
          })
        })
        .then(res => res.json())
        .then(() => {
          replyInput.value = '';
          if (isPublic) {
            showToast('Answer published to public Q&A catalog! (Student anonymised)', 'fa-bullhorn');
            if (publicCheck) publicCheck.checked = false;
          } else {
            showToast('Query response posted successfully!', 'fa-reply');
          }
          loadAndRenderQueries(threadId);
        });
      } else {
        // Local Fallback simulation
        if (!threadMockMessages[threadId]) {
          threadMockMessages[threadId] = [];
        }
        threadMockMessages[threadId] = threadMockMessages[threadId].filter(msg => msg.role !== 'system');
        threadMockMessages[threadId].push({
          sender: userName,
          role: userRole,
          text: text,
          time: 'Just now'
        });

        // Re-render
        const currentThread = {
          id: threadId,
          title: activeCard.querySelector('h4').textContent,
          subject: activeCard.querySelector('.subject-tag').textContent,
          assignedTo: activeCard.querySelector('.thread-time').textContent.split(' • ')[1] || 'Prof. Joya Sen',
          status: activeCard.querySelector('.status-pill').textContent,
          messages: threadMockMessages[threadId]
        };
        selectThread(currentThread, activeCard);
        replyInput.value = '';

        if (isPublic) {
          showToast('Answer published to public Q&A catalog! (Student anonymised)', 'fa-bullhorn');
          if (publicCheck) publicCheck.checked = false;
        } else {
          showToast('Query response posted successfully!', 'fa-reply');
        }

        // Prof auto-reply for student cycles question
        if (userRole === 'student' && threadId === '1') {
          setTimeout(function () {
            threadMockMessages[1].push({
              sender: 'Prof. Joya Sen',
              role: 'professor',
              text: 'Hello Joya. Yes! BFS can absolutely detect cycles in undirected graphs by tracking parent nodes during traversal. If you visit an adjacent node that is already marked but is not the direct parent, a cycle is present.',
              time: 'Just now'
            });
            currentThread.messages = threadMockMessages[1];
            selectThread(currentThread, activeCard);
            
            const pill = activeCard.querySelector('.status-pill');
            if (pill) {
              pill.textContent = 'Reply Received';
              pill.style.background = 'rgba(29, 158, 117, 0.12)';
              pill.style.color = 'var(--success)';
            }
          }, 2000);
        }
      }
    });
  }

  // Mark Resolved Action
  if (markResolvedBtn) {
    markResolvedBtn.addEventListener('click', function () {
      const activeCard = threadsContainer.querySelector('.thread-card.active') || document.querySelector('.thread-card.active');
      if (!activeCard) return;
      const threadId = activeCard.getAttribute('data-thread-id');

      if (IS_SERVER) {
        fetch(`/api/queries/${threadId}/resolve`, {
          method: 'POST'
        })
        .then(res => res.json())
        .then(() => {
          showToast('Thread successfully marked RESOLVED!', 'fa-circle-check');
          loadAndRenderQueries(threadId);
        });
      } else {
        // Local Fallback simulation
        const pill = activeCard.querySelector('.status-pill');
        if (pill) {
          pill.textContent = 'Resolved';
          pill.className = 'status-pill status-pill--resolved';
        }
        markResolvedBtn.style.display = 'none';
        replyForm.style.display = 'none';
        showToast('Thread successfully marked RESOLVED!', 'fa-circle-check');
        const sidebarBadge = document.getElementById('queryBadge');
        if (sidebarBadge) {
          sidebarBadge.textContent = '3';
        }
      }
    });
  }
}

/* ==================== CREATE NEW QUERY FORM MODALS ==================== */
function initQueriesModals() {
  const modal = document.getElementById('newQueryModal');
  const openBtn = document.getElementById('openNewQueryModal');
  const closeBtn = document.getElementById('closeQueryModal');
  const cancelBtn = document.getElementById('cancelQueryBtn');
  const form = document.getElementById('newQueryForm');
  const threadsContainer = document.getElementById('threadsContainer');

  if (!modal) return;

  function open() {
    modal.classList.add('active');
    document.getElementById('querySubject').value = '';
    document.getElementById('queryTitle').value = '';
    document.getElementById('queryText').value = '';
  }

  function close() {
    modal.classList.remove('active');
  }

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);

  if (form && threadsContainer) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const subject = document.getElementById('querySubject').value.trim();
      const title = document.getElementById('queryTitle').value.trim();
      const text = document.getElementById('queryText').value.trim();
      const userName = sessionStorage.getItem('userName') || 'Joya Sen';

      if (!subject || !title || !text) return;

      if (IS_SERVER) {
        fetch('/api/queries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            title,
            text,
            sender: userName
          })
        })
        .then(res => res.json())
        .then(newThread => {
          close();
          showToast(`Subject query "${title}" logged successfully!`, 'fa-circle-check');
          
          // Force queries list reload and focus the newly created query thread
          // Access threading methods indirectly via reload bindings
          const activeCard = document.querySelector('.thread-card');
          if (activeCard) {
            // Delay slightly to allow database save completion
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        });
      } else {
        // Local simulation fallback
        const newId = Object.keys(threadMockMessages).length + 1;
        threadMockMessages[newId] = [
          { sender: userName, role: 'student', text: text, time: 'Just now' },
          { sender: 'system', role: 'system', text: 'Professor has not replied to this query thread yet.', time: '' }
        ];

        const card = document.createElement('div');
        card.className = 'thread-card';
        card.setAttribute('data-thread-id', newId);
        card.style.animation = 'formSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both';
        card.innerHTML = `
          <div class="thread-meta">
            <span class="subject-tag">${subject}</span>
            <span class="status-pill status-pill--pending">Pending</span>
          </div>
          <h4>${title}</h4>
          <p class="thread-snippet">"${text}"</p>
          <span class="thread-time">Just now • Awaiting reply</span>
        `;

        threadsContainer.insertBefore(card, threadsContainer.firstChild);

        // Bind clicks for the newly simulated item
        card.addEventListener('click', function () {
          threadsContainer.querySelectorAll('.thread-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');

          document.getElementById('activeThreadTitle').textContent = title;
          document.getElementById('activeThreadMeta').textContent = subject + ' • Awaiting reply';
          document.getElementById('markResolvedBtn').style.display = 'inline-flex';
          document.getElementById('queryReplyForm').style.display = 'block';

          // Trigger local render
          const inboxMessagesBox = document.getElementById('inboxMessagesBox');
          inboxMessagesBox.innerHTML = '';
          threadMockMessages[newId].forEach(msg => {
            const row = document.createElement('div');
            row.className = `inbox-msg-row ${msg.role || 'student'}`;
            row.innerHTML = `
              <div class="inbox-meta-head">
                <span class="name">${msg.sender}</span>
                <span class="time">${msg.time}</span>
              </div>
              <div class="msg-bubble">
                <p>${msg.text}</p>
              </div>
            `;
            inboxMessagesBox.appendChild(row);
          });
          inboxMessagesBox.scrollTop = inboxMessagesBox.scrollHeight;
        });

        close();
        showToast(`Subject query "${title}" logged successfully!`, 'fa-circle-check');
        card.click();
      }
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
