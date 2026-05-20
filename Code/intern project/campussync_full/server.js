const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Utility functions to read/write JSON db
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file:", err);
    return { users: [], notes: {}, chats: {}, queries: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

/* ==================== AUTHENTICATION API ==================== */

// User registration
app.post('/api/auth/register', (req, res) => {
  const { userId, password, name, role, college, email } = req.body;
  
  if (!userId || !password || !name || !role || !college) {
    return res.status(400).json({ error: "Missing required registration parameters." });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.userId.toLowerCase() === userId.toLowerCase());
  
  if (existingUser) {
    return res.status(400).json({ error: "User ID is already registered!" });
  }

  const newUser = {
    userId,
    password,
    name,
    role,
    college,
    email: email || `${userId}@${college.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu`
  };

  db.users.push(newUser);
  writeDB(db);

  console.log(`[AUTH] User registered successfully: ${userId} (${role})`);
  res.status(201).json({ success: true, user: { userId, name, role, college, email: newUser.email } });
});

// User login
app.post('/api/auth/login', (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: "Missing User ID or Password." });
  }

  const db = readDB();
  const user = db.users.find(u => u.userId.toLowerCase() === userId.toLowerCase() && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid User ID or Password!" });
  }

  console.log(`[AUTH] User logged in: ${userId} (${user.role})`);
  res.status(200).json({
    success: true,
    user: {
      userId: user.userId,
      name: user.name,
      role: user.role,
      college: user.college,
      email: user.email
    }
  });
});

// Profile update API
app.post('/api/auth/profile-update', (req, res) => {
  const { userId, name, email, college, password, avatar } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing User ID parameter." });
  }

  const db = readDB();
  const user = db.users.find(u => u.userId.toLowerCase() === userId.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (college) user.college = college;
  if (password) user.password = password;
  if (avatar) user.avatar = avatar;

  writeDB(db);
  console.log(`[AUTH] User profile updated successfully for: ${userId}`);
  res.status(200).json({ success: true, user: { userId: user.userId, name: user.name, email: user.email, college: user.college, avatar: user.avatar } });
});

/* ==================== WORKSPACE NOTES API ==================== */

// Get collaborative notes
app.get('/api/notes/:groupId', (req, res) => {
  const { groupId } = req.params;
  const db = readDB();
  const notesContent = db.notes[groupId] || `# Shared Notes for ${groupId}\n\nStart typing to edit notes in real time...`;
  res.json({ groupId, content: notesContent });
});

// Save collaborative notes
app.post('/api/notes/:groupId', (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: "Missing content payload." });
  }

  const db = readDB();
  db.notes[groupId] = content;
  writeDB(db);

  res.json({ success: true, message: "Notes saved successfully." });
});

/* ==================== DISCUSSION CHATS API ==================== */

// Get workspace group chats
app.get('/api/chats/:groupId', (req, res) => {
  const { groupId } = req.params;
  const db = readDB();
  const chatLogs = db.chats[groupId] || [];
  res.json(chatLogs);
});

// Post chat message
app.post('/api/chats/:groupId', (req, res) => {
  const { groupId } = req.params;
  const { sender, role, avatar, text, time } = req.body;

  if (!sender || !text) {
    return res.status(400).json({ error: "Missing sender or text fields." });
  }

  const db = readDB();
  if (!db.chats[groupId]) {
    db.chats[groupId] = [];
  }

  const newMsg = {
    sender,
    role: role || 'student',
    avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80',
    text,
    time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  db.chats[groupId].push(newMsg);
  writeDB(db);

  res.status(201).json(newMsg);
});

/* ==================== ACADEMIC QUERIES API ==================== */

// Get all support query threads
app.get('/api/queries', (req, res) => {
  const db = readDB();
  res.json(db.queries);
});

// Create new query thread
app.post('/api/queries', (req, res) => {
  const { subject, title, text, sender } = req.body;

  if (!subject || !title || !text || !sender) {
    return res.status(400).json({ error: "Missing required query thread fields." });
  }

  const db = readDB();
  const newThread = {
    id: String(db.queries.length + 1),
    subject,
    title,
    snippet: text.length > 50 ? text.substring(0, 50) + "..." : text,
    time: "Just now",
    assignedTo: "Prof. Joya Sen",
    status: subject.toLowerCase().includes("dispute") ? "Dispute flagged" : "Pending",
    messages: [
      {
        sender,
        role: "student",
        time: "Just now",
        text
      }
    ]
  };

  db.queries.unshift(newThread);
  writeDB(db);

  console.log(`[QUERIES] New query thread created: ${title}`);
  res.status(201).json(newThread);
});

// Reply to active thread
app.post('/api/queries/:threadId/reply', (req, res) => {
  const { threadId } = req.params;
  const { sender, role, text, markResolved, publishPublic } = req.body;

  if (!sender || !text) {
    return res.status(400).json({ error: "Missing reply sender or message." });
  }

  const db = readDB();
  const thread = db.queries.find(q => q.id === threadId);

  if (!thread) {
    return res.status(404).json({ error: "Query thread not found." });
  }

  // Add the message
  thread.messages.push({
    sender,
    role: role || "student",
    time: "Just now",
    text
  });

  // Apply state modifications
  if (role === "professor") {
    thread.status = "Resolved";
    thread.snippet = `Prof. ${sender}: "${text.substring(0, 30)}..."`;
  }
  if (markResolved) {
    thread.status = "Resolved";
  }
  if (publishPublic) {
    thread.isPublic = true;
  }

  writeDB(db);
  res.status(200).json(thread);
});

// Mark thread resolved
app.post('/api/queries/:threadId/resolve', (req, res) => {
  const { threadId } = req.params;
  const db = readDB();
  const thread = db.queries.find(q => q.id === threadId);

  if (!thread) {
    return res.status(404).json({ error: "Query thread not found." });
  }

  thread.status = "Resolved";
  writeDB(db);

  res.status(200).json({ success: true, thread });
});

// Attendance coordinates logger
app.post('/api/attendance', (req, res) => {
  const { studentName, status, lat, long, faceMatched } = req.body;
  console.log(`[ATTENDANCE] Recorded log: Student=${studentName}, Status=${status}, Proximity=${lat}/${long}, FaceMatched=${faceMatched}`);
  res.json({ success: true });
});

// Server default launch router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 CampusSync Full-Stack Local Web Server Running!`);
  console.log(`🔗 Local Application Portal: http://localhost:${PORT}`);
  console.log(`📂 Serving static site assets from: ${__dirname}`);
  console.log(`=======================================================`);
});
