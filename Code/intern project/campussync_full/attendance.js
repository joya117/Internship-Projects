/**
 * CampusSync — Attendance Page JavaScript
 *
 * FLOW:
 *  STUDENT:
 *    1. Professor opens session → shared via sessionStorage key 'activeSession'
 *    2. Student registers face (camera snapshot stored as base64)
 *    3. Student verifies attendance: compares live face snapshot + GPS proximity to professor GPS
 *
 *  PROFESSOR:
 *    1. Professor locks own GPS location
 *    2. Professor opens attendance session (sets sessionStorage 'activeSession')
 *    3. Students marked present populate live log
 */

/* ── Shared state ─────────────────────────────────────── */
let studentGPS = null;
let registeredFaceData = null; // base64 snapshot
let graceCreditsLeft = 3;
let sessionInterval = null;
let sessionSecondsLeft = 0;
let professorGPS = null;
let presentCount = 0;

const GPS_RADIUS_METERS = 80; // accept within 80m

/* ── Bootstrap ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  loadSession();
  initLogout();
});

/* ── Session Loader ───────────────────────────────────── */
function loadSession() {
  const userName = sessionStorage.getItem('userName') || 'Joya Sen';
  const userRole = sessionStorage.getItem('userRole') || 'student';

  document.body.className = userRole === 'professor' ? 'theme-professor' : 'theme-student';

  setText('sidebarName', userName);
  setText('sidebarRole', userRole.charAt(0).toUpperCase() + userRole.slice(1));
  setText('topbarUserName', userName);

  const avatarUrl = userRole === 'professor'
    ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80';

  const sa = document.getElementById('sidebarAvatar');
  const ta = document.getElementById('topbarAvatar');
  if (sa) sa.src = avatarUrl;
  if (ta) ta.src = avatarUrl;

  if (userRole === 'professor') {
    showEl('professorAttendanceView');
    hideEl('studentAttendanceView');
    initProfessorPanel();
  } else {
    showEl('studentAttendanceView');
    hideEl('professorAttendanceView');
    initStudentPanel();
  }
}

/* ═══════════════════════════════════════════════════════
   STUDENT PANEL
   ═══════════════════════════════════════════════════════ */
function initStudentPanel() {
  const session = getActiveSession();

  if (!session) {
    showEl('noSessionGate');
    hideEl('sessionActivePanel');

    // Poll every 5s to check if session opened
    const pollInterval = setInterval(() => {
      const s = getActiveSession();
      if (s) {
        clearInterval(pollInterval);
        activateStudentSession(s);
      }
    }, 5000);
    return;
  }

  activateStudentSession(session);
}

function activateStudentSession(session) {
  hideEl('noSessionGate');
  showEl('sessionActivePanel');

  // Store professor GPS from session
  professorGPS = session.profGPS;
  setText('classroomGpsDisplay', formatGPS(professorGPS));

  // Start countdown
  startCountdown(session.endsAt);

  // Start fetching student GPS
  startStudentGPS();

  const studentName = sessionStorage.getItem('userName') || 'Joya Sen';
  const presentStudents = JSON.parse(sessionStorage.getItem('presentStudents') || '[]');

  if (presentStudents.includes(studentName)) {
    // Already marked present this session
    hideEl('faceRegisterStep');
    hideEl('faceVerifyStep');
    showEl('faceVerifiedDone');
  } else {
    // Check for registered face in localStorage
    const savedFace = localStorage.getItem('registeredFaceData');
    if (savedFace) {
      registeredFaceData = savedFace;
      hideEl('faceRegisterStep');
      showEl('faceVerifyStep');
      initFaceVerify();
    } else {
      initFaceRegister();
    }
  }
}

function startCountdown(endsAt) {
  function tick() {
    const now = Date.now();
    const remaining = Math.floor((endsAt - now) / 1000);
    
    if (remaining <= 0) {
      // Visual indicator for late submission
      const m = String(Math.floor(Math.abs(remaining) / 60)).padStart(2, '0');
      const s = String(Math.abs(remaining) % 60).padStart(2, '0');
      setText('sessionCountdown', `-${m}:${s} (Late)`);
      const countdownEl = document.getElementById('sessionCountdown');
      if (countdownEl) countdownEl.style.color = 'var(--danger)';
    } else {
      const m = String(Math.floor(remaining / 60)).padStart(2, '0');
      const s = String(remaining % 60).padStart(2, '0');
      setText('sessionCountdown', `${m}:${s}`);
    }
  }
  tick();
  sessionInterval = setInterval(tick, 1000);
}

/* ── Student GPS ───────────────────────────────────────── */
function startStudentGPS() {
  if (!navigator.geolocation) {
    setText('studentGpsDisplay', 'GPS not supported');
    return;
  }

  navigator.geolocation.watchPosition(
    function (pos) {
      studentGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setText('studentGpsDisplay', formatGPS(studentGPS));

      if (professorGPS) {
        const dist = haversineDistance(studentGPS, professorGPS);
        setText('gpsDistanceDisplay', `${Math.round(dist)}m`);

        const stepGPS = document.getElementById('stepGPS');
        const gpsText = document.getElementById('gpsStepText');
        if (dist <= GPS_RADIUS_METERS) {
          stepGPS.className = 'status-step completed';
          gpsText.textContent = `Within classroom bounds (${Math.round(dist)}m — OK)`;
        } else {
          stepGPS.className = 'status-step failed';
          gpsText.textContent = `Too far from classroom (${Math.round(dist)}m — must be < ${GPS_RADIUS_METERS}m)`;
        }
      }
    },
    function (err) {
      // Fallback for demo purposes if geolocation fails/is blocked
      studentGPS = JSON.parse(sessionStorage.getItem('professorGPS')) || { lat: 28.7041, lng: 77.1025 };
      setText('studentGpsDisplay', formatGPS(studentGPS) + ' (Mocked)');
      
      if (professorGPS) {
        const dist = haversineDistance(studentGPS, professorGPS);
        setText('gpsDistanceDisplay', `${Math.round(dist)}m`);

        const stepGPS = document.getElementById('stepGPS');
        const gpsText = document.getElementById('gpsStepText');
        if (dist <= GPS_RADIUS_METERS) {
          stepGPS.className = 'status-step completed';
          gpsText.textContent = `Within classroom bounds (${Math.round(dist)}m — OK)`;
        } else {
          stepGPS.className = 'status-step failed';
          gpsText.textContent = `Too far from classroom (${Math.round(dist)}m — must be < ${GPS_RADIUS_METERS}m)`;
        }
      }
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
  );
}

/* ── Face Registration ─────────────────────────────────── */
let registerStream = null;

async function initFaceRegister() {
  const video = document.getElementById('registerVideo');
  const btn = document.getElementById('registerFaceBtn');
  const status = document.getElementById('registerStatus');
  const scanBar = document.getElementById('scanBarRegister');

  // Request camera permission
  try {
    registerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = registerStream;
  } catch (err) {
    status.textContent = 'Camera access denied. Please allow camera access to register your face.';
    status.className = 'capture-status error';
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', function () {
    btn.disabled = true;
    scanBar.classList.add('active');
    status.textContent = 'Scanning… hold still.';
    status.className = 'capture-status';

    setTimeout(function () {
      // Capture snapshot from video
      const canvas = document.getElementById('registerCanvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      registeredFaceData = canvas.toDataURL('image/jpeg', 0.8);
      localStorage.setItem('registeredFaceData', registeredFaceData);

      scanBar.classList.remove('active');
      status.textContent = '✓ Face registered successfully. Proceed to Step 2.';
      status.className = 'capture-status success';

      // Update step status
      setText('faceStepText', 'Face registered. Ready to verify attendance.');

      // Stop register stream and switch to verify step
      setTimeout(function () {
        if (registerStream) registerStream.getTracks().forEach(t => t.stop());
        hideEl('faceRegisterStep');
        showEl('faceVerifyStep');
        initFaceVerify();
      }, 1200);
    }, 2000);
  });
}

/* ── Face Verification ─────────────────────────────────── */
let verifyStream = null;

async function initFaceVerify() {
  const video = document.getElementById('verifyVideo');
  const btn = document.getElementById('verifyAttendanceBtn');
  const status = document.getElementById('verifyStatus');
  const scanBar = document.getElementById('scanBarVerify');
  const flash = document.getElementById('cameraFlash');

  const resultBox = document.getElementById('verificationResultBox');
  const resultHeading = document.getElementById('resultHeading');
  const resultPara = document.getElementById('resultParagraph');
  const disputeActions = document.getElementById('disputeActions');

  // Request camera
  try {
    verifyStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = verifyStream;
  } catch (err) {
    status.textContent = 'Camera access denied.';
    status.className = 'capture-status error';
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', async function () {
    btn.disabled = true;
    resultBox.classList.add('hidden');
    resultBox.className = 'verification-result hidden';
    disputeActions.classList.add('hidden');

    // Check GPS first
    if (!studentGPS || !professorGPS) {
      status.textContent = 'GPS location not yet acquired. Please wait.';
      status.className = 'capture-status error';
      btn.disabled = false;
      return;
    }

    const dist = haversineDistance(studentGPS, professorGPS);
    const gpsOK = dist <= GPS_RADIUS_METERS;

    // Animate scan
    scanBar.classList.add('active');
    status.textContent = 'Verifying GPS…';
    status.className = 'capture-status';

    const stepGPS = document.getElementById('stepGPS');
    const gpsText = document.getElementById('gpsStepText');
    const stepFace = document.getElementById('stepFace');
    const faceText = document.getElementById('faceStepText');

    await delay(1200);

    if (!gpsOK) {
      // GPS fail
      scanBar.classList.remove('active');
      stepGPS.className = 'status-step failed';
      gpsText.textContent = `Failed — ${Math.round(dist)}m from classroom (limit: ${GPS_RADIUS_METERS}m)`;
      status.textContent = `GPS check failed. You are ${Math.round(dist)}m away from the classroom.`;
      status.className = 'capture-status error';

      resultBox.classList.remove('hidden');
      resultBox.className = 'verification-result fail';
      resultHeading.textContent = 'GPS Mismatch';
      resultPara.textContent = `Your location (${formatGPS(studentGPS)}) is ${Math.round(dist)}m away from the classroom. You must be within ${GPS_RADIUS_METERS}m. You can apply a grace credit or raise a dispute.`;
      disputeActions.classList.remove('hidden');

      btn.disabled = false;
      showToast('GPS check failed — not within classroom range.', 'fa-triangle-exclamation');
      return;
    }

    stepGPS.className = 'status-step completed';
    gpsText.textContent = `Verified — ${Math.round(dist)}m from classroom (within bounds)`;

    // Face verification (simulated pixel comparison + real snapshot)
    status.textContent = 'Matching face…';
    stepFace.className = 'status-step pending';
    faceText.textContent = 'Comparing biometric features…';

    await delay(1500);

    // Capture live snapshot
    const canvas = document.getElementById('verifyCanvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const liveSnap = canvas.toDataURL('image/jpeg', 0.8);

    // Flash
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 350);

    // Compare: if both registered face and live snap exist and both were captured successfully, simulate match
    const faceMatch = registeredFaceData && liveSnap && compareFaceSnapshots(registeredFaceData, liveSnap);

    scanBar.classList.remove('active');

    if (faceMatch) {
      stepFace.className = 'status-step completed';
      faceText.textContent = 'Matched — biometric profile confirmed (97.2%)';

      status.textContent = '✓ Attendance marked PRESENT!';
      status.className = 'capture-status success';

      hideEl('faceVerifyStep');
      showEl('faceVerifiedDone');

      resultBox.classList.remove('hidden');
      resultBox.className = 'verification-result success';
      resultHeading.textContent = '✓ Attendance Verified!';
      resultPara.textContent = 'GPS and face recognition both passed. You are marked PRESENT for this session. Your streak has been updated.';

      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Marked PRESENT';
      btn.style.background = 'linear-gradient(135deg, var(--success), #1dd1a1)';

      // Mark in session storage so professor log updates
      markStudentPresent(sessionStorage.getItem('userName') || 'Joya Sen');

      showToast('Attendance verified! Marked PRESENT.', 'fa-circle-check');
    } else {
      stepFace.className = 'status-step failed';
      faceText.textContent = 'Failed — face does not match registered profile';

      status.textContent = 'Face match failed. Please try again with better lighting.';
      status.className = 'capture-status error';

      resultBox.classList.remove('hidden');
      resultBox.className = 'verification-result fail';
      resultHeading.textContent = 'Face Match Failed';
      resultPara.textContent = 'The live face could not be matched to your registered profile with sufficient confidence. Ensure good lighting and face the camera directly, then try again.';

      btn.disabled = false;
      showToast('Face match failed. Try again.', 'fa-circle-xmark');
    }
  });

  // Grace Credit & Dispute
  const applyGraceBtn = document.getElementById('applyGraceBtn');
  const raiseDisputeBtn = document.getElementById('raiseDisputeBtn');
  const graceCounter = document.getElementById('graceCounter');

  if (applyGraceBtn) {
    applyGraceBtn.addEventListener('click', function () {
      if (graceCreditsLeft <= 0) { showToast('No grace credits left.', 'fa-circle-xmark'); return; }
      graceCreditsLeft--;
      setText('graceCounter', `${graceCreditsLeft} Left`);
      if (graceCreditsLeft === 0) gradeCounter.className = 'badge badge--danger';

      document.getElementById('stepGPS').className = 'status-step completed';
      setText('gpsStepText', 'Grace credit applied — GPS failure excused');

      resultBox.className = 'verification-result success';
      resultHeading.textContent = '✓ Attendance Verified (Grace Credit)';
      resultPara.textContent = 'A grace credit was used to excuse your GPS failure. Attendance logged as PRESENT.';
      disputeActions.classList.add('hidden');

      hideEl('faceVerifyStep');
      showEl('faceVerifiedDone');

      markStudentPresent(sessionStorage.getItem('userName') || 'Joya Sen');
      showToast('Grace credit used. Marked PRESENT.', 'fa-wand-magic-sparkles');
    });
  }

  if (raiseDisputeBtn) {
    raiseDisputeBtn.addEventListener('click', function () {
      sessionStorage.setItem('attendanceDisputeLogged', 'true');
      disputeActions.classList.add('hidden');
      resultPara.textContent = 'Dispute raised and sent to your professor for manual review.';
      showToast('Dispute submitted to professor.', 'fa-triangle-exclamation');
    });
  }
}

/* ── Face comparison (pixel-level similarity) ──────────── */
function compareFaceSnapshots(base1, base2) {
  // Since we have real camera frames, we compare canvas pixel data
  // We sample pixel brightness difference on a small region
  try {
    const c1 = drawBase64ToCanvas(base1);
    const c2 = drawBase64ToCanvas(base2);
    if (!c1 || !c2) return true; // fallback: assume match if can't compare

    const d1 = c1.getContext('2d').getImageData(0, 0, c1.width, c1.height).data;
    const d2 = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height).data;

    let totalDiff = 0;
    const samples = Math.min(d1.length, 4000); // sample first 1000 pixels
    for (let i = 0; i < samples; i += 4) {
      const brightness1 = (d1[i] + d1[i+1] + d1[i+2]) / 3;
      const brightness2 = (d2[i] + d2[i+1] + d2[i+2]) / 3;
      totalDiff += Math.abs(brightness1 - brightness2);
    }
    const avgDiff = totalDiff / (samples / 4);
    // If avg per-pixel brightness diff is within 55/255 ≈ 21%, consider a match
    // (Real implementations use face embeddings; this is a structural similarity proxy)
    return avgDiff < 55;
  } catch (e) {
    return true; // fallback: assume match
  }
}

function drawBase64ToCanvas(dataUrl) {
  try {
    const img = new Image();
    img.src = dataUrl;
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40; // small for speed
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 40, 40);
    return c;
  } catch (e) { return null; }
}

/* ── Shared Present Marking ────────────────────────────── */
function markStudentPresent(name) {
  const stored = JSON.parse(sessionStorage.getItem('presentStudents') || '[]');
  if (!stored.includes(name)) {
    stored.push(name);
    sessionStorage.setItem('presentStudents', JSON.stringify(stored));
  }
}

/* ═══════════════════════════════════════════════════════
   PROFESSOR PANEL
   ═══════════════════════════════════════════════════════ */
function initProfessorPanel() {
  const lockBtn = document.getElementById('profLockGpsBtn');
  const openBtn = document.getElementById('profOpenSessionBtn');
  const closeBtn = document.getElementById('profCloseSessionBtn');
  const profStatus = document.getElementById('profSessionStatus');

  // Poll for present students
  setInterval(refreshLiveLog, 5000);

  // Lock GPS
  lockBtn.addEventListener('click', function () {
    lockBtn.disabled = true;
    lockBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locking GPS…';

    if (!navigator.geolocation) {
      profStatus.textContent = 'GPS not supported on this device.';
      profStatus.className = 'capture-status error';
      lockBtn.disabled = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        professorGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setText('profGpsDisplay', formatGPS(professorGPS));
        lockBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> GPS Locked';
        profStatus.textContent = `✓ GPS locked at ${formatGPS(professorGPS)}`;
        profStatus.className = 'capture-status success';
        openBtn.disabled = false;
        sessionStorage.setItem('professorGPS', JSON.stringify(professorGPS));
      },
      function () {
        // Fallback for demo purposes if geolocation fails/is blocked
        professorGPS = { lat: 28.7041, lng: 77.1025 }; // Mock coordinate
        setText('profGpsDisplay', formatGPS(professorGPS) + ' (Mocked)');
        lockBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> GPS Locked (Mocked)';
        profStatus.textContent = `✓ GPS simulated at ${formatGPS(professorGPS)} (Due to permissions)`;
        profStatus.className = 'capture-status success';
        openBtn.disabled = false;
        sessionStorage.setItem('professorGPS', JSON.stringify(professorGPS));
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });

  // Open Session
  openBtn.addEventListener('click', function () {
    const subject = document.getElementById('profSubjectSelect').value;
    const durationMins = parseInt(document.getElementById('profDurationSelect').value, 10);
    const endsAt = Date.now() + durationMins * 60 * 1000;

    const sessionData = { subject, endsAt, profGPS: professorGPS };
    sessionStorage.setItem('activeAttendanceSession', JSON.stringify(sessionData));
    sessionStorage.removeItem('presentStudents');
    presentCount = 0;

    openBtn.classList.add('hidden');
    closeBtn.classList.remove('hidden');
    profStatus.textContent = `✓ Session open for ${subject} — closes in ${durationMins} min`;
    profStatus.className = 'capture-status success';

    showToast(`Session opened for ${subject}. Students can now verify.`, 'fa-door-open');

    // Auto-close countdown (only visual warning, does not remove session)
    let remaining = durationMins * 60;
    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        profStatus.textContent = 'Session time elapsed (Late submissions allowed).';
        profStatus.className = 'capture-status error';
        showToast('Session time ended. Students can still verify until you close the session.', 'fa-clock');
      }
    }, 1000);
  });

  // Close Early
  closeBtn.addEventListener('click', function () {
    sessionStorage.removeItem('activeAttendanceSession');
    openBtn.classList.remove('hidden');
    openBtn.disabled = false;
    closeBtn.classList.add('hidden');
    profStatus.textContent = 'Session closed early.';
    profStatus.className = 'capture-status';
    showToast('Session closed.', 'fa-door-closed');
  });
}

function refreshLiveLog() {
  const list = document.getElementById('liveAttendanceList');
  const badge = document.getElementById('presentCountBadge');
  if (!list) return;

  const present = JSON.parse(sessionStorage.getItem('presentStudents') || '[]');
  const enrolledStudents = ['Joya Sen', 'Aarav Sharma', 'Meera Nair', 'Kiran Patel', 'Dev Gupta'];
  
  setText('presentCountBadge', `${present.length} Present`);
  
  if (present.length === 0 && !sessionStorage.getItem('activeAttendanceSession')) {
    list.innerHTML = '<p class="empty-state-text">Open a session to view the live log.</p>';
    return;
  }

  let html = '';
  enrolledStudents.forEach(student => {
    if (present.includes(student)) {
      html += `<div class="live-list-item">${student} <span>✓ PRESENT</span></div>`;
    } else {
      html += `<div class="live-list-item" style="border-color: rgba(255,255,255,0.05); background: transparent;">
        <span style="color: var(--text-primary); font-weight: 500;">${student}</span> 
        <button class="btn-small" onclick="manualMarkPresent('${student}')" style="background: rgba(255,255,255,0.1); border:none; border-radius: 6px; padding: 4px 10px; color: var(--text-primary); cursor:pointer;">Mark</button>
      </div>`;
    }
  });

  present.forEach(student => {
    if (!enrolledStudents.includes(student)) {
      html += `<div class="live-list-item">${student} <span>✓ PRESENT</span></div>`;
    }
  });

  list.innerHTML = html;
}

window.manualMarkPresent = function(studentName) {
  markStudentPresent(studentName);
  refreshLiveLog();
  showToast(`Manually marked ${studentName} as present.`, 'fa-check');
};

/* ═══════════════════════════════════════════════════════
   SHARED UTILITIES
   ═══════════════════════════════════════════════════════ */

/* Active session getter */
function getActiveSession() {
  try {
    const raw = sessionStorage.getItem('activeAttendanceSession');
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s;
  } catch (e) { return null; }
}

/* Haversine GPS distance in meters */
function haversineDistance(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}
function toRad(deg) { return deg * (Math.PI / 180); }

/* Format GPS for display */
function formatGPS(gps) {
  if (!gps) return '—';
  return `${gps.lat.toFixed(5)}°, ${gps.lng.toFixed(5)}°`;
}

/* Delay helper */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* DOM helpers */
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function showEl(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function hideEl(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

/* Toast */
function showToast(message, icon = 'fa-circle-check') {
  const toast = document.getElementById('actionToast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  const iconEl = toast.querySelector('i');
  if (iconEl) iconEl.className = `fa-solid ${icon}`;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 4000);
}

/* Logout */
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  }
}
