# Two-Screen Multiplayer Matching Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the matching game into Teacher Screen (setup/control) and Game Screen (student touchscreen) with saveable decks and rosters.

**Architecture:** Two separate HTML pages connected via Socket.IO to a shared room. Teacher creates room and defines players server-side. Game screen renders board and handles touch input. localStorage persists decks/rosters on teacher's browser.

**Tech Stack:** Node.js, Express, Socket.IO, vanilla JavaScript, localStorage

---

## Task 1: Create Shared CSS File

**Files:**
- Create: `public/shared.css`
- Modify: `public/style.css` (keep existing, will be deprecated later)

**Step 1: Create shared.css with common styles**

```css
:root {
  --bg: #f4f8ff;
  --card: #ffffff;
  --text: #1f2a44;
  --muted: #6b7a99;
  --border: #cfe0ff;
  --accent: #6c8cff;
  --accent2: #ffb86b;
  --success: #7ed957;
  --danger: #ff6b6b;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
  background: var(--bg);
  color: var(--text);
}

/* Panel */
.panel {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.panel h2 { margin: 0 0 10px 0; font-size: 18px; }

/* Form elements */
.row { display: grid; gap: 6px; margin-bottom: 10px; }
.inlineRow { display: flex; gap: 10px; align-items: center; }

label { color: var(--muted); font-size: 13px; }

input, textarea, select {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: #ffffff;
  color: var(--text);
  font-size: 14px;
}

textarea { resize: vertical; }
select { cursor: pointer; }

/* Buttons */
button {
  padding: 10px 12px;
  border-radius: 14px;
  border: none;
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

button:disabled { opacity: 0.5; cursor: not-allowed; }

button.secondary {
  background: var(--muted);
}

button.danger {
  background: var(--danger);
}

button.success {
  background: var(--success);
}

/* Utilities */
.status { margin-top: 8px; color: var(--muted); font-size: 13px; }
.help { margin: 0 0 10px 0; color: var(--muted); font-size: 13px; line-height: 1.3; }
.muted { color: var(--muted); font-size: 13px; }
.hidden { display: none !important; }
```

**Step 2: Verify file created**

Run: `cat public/shared.css | head -20`
Expected: Shows CSS variables and body styles

**Step 3: Commit**

```bash
git add public/shared.css
git commit -m "feat: add shared CSS for two-screen architecture"
```

---

## Task 2: Create Teacher Screen HTML

**Files:**
- Create: `public/teacher.html`

**Step 1: Create teacher.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Teacher Control Panel - Matching Game</title>
  <link rel="stylesheet" href="shared.css" />
  <link rel="stylesheet" href="teacher.css" />
</head>
<body>
  <header>
    <h1>Teacher Control Panel</h1>
    <div class="sub" id="roomInfo">No room created</div>
  </header>

  <main>
    <!-- Room Setup -->
    <section class="panel">
      <h2>Room Setup</h2>

      <div class="row">
        <label>Room Code</label>
        <div class="inlineRow">
          <input id="roomCode" placeholder="Auto-generated" readonly />
          <button id="createRoomBtn">Create Room</button>
        </div>
      </div>

      <div class="row">
        <label>Room PIN (optional)</label>
        <div class="inlineRow">
          <input id="roomPin" placeholder="1234" maxlength="12" />
          <button id="setPinBtn" disabled>Set PIN</button>
        </div>
      </div>

      <div class="row">
        <label>Turn Timer (seconds)</label>
        <div class="inlineRow">
          <input id="turnTimer" type="number" min="5" max="120" value="20" />
          <button id="setTimerBtn" disabled>Set Timer</button>
        </div>
      </div>

      <div id="gameLink" class="help hidden">
        Game screen: <a id="gameLinkUrl" href="#" target="_blank"></a>
      </div>
    </section>

    <!-- Word Decks -->
    <section class="panel">
      <h2>Word Decks</h2>

      <div class="row">
        <label>Load Saved Deck</label>
        <div class="inlineRow">
          <select id="deckSelect">
            <option value="">-- Select deck --</option>
          </select>
          <button id="loadDeckBtn">Load</button>
          <button id="deleteDeckBtn" class="danger">Delete</button>
        </div>
      </div>

      <div class="row">
        <label>Word Pairs (one per line: word,match)</label>
        <textarea id="deckPairs" rows="8" placeholder="kite,kite
tree,tree
house,house"></textarea>
      </div>

      <div class="row">
        <label>Save Deck As</label>
        <div class="inlineRow">
          <input id="deckName" placeholder="Sight Words Week 1" />
          <button id="saveDeckBtn">Save Deck</button>
        </div>
      </div>
    </section>

    <!-- Student Roster -->
    <section class="panel">
      <h2>Student Roster</h2>

      <div class="row">
        <label>Load Saved Roster</label>
        <div class="inlineRow">
          <select id="rosterSelect">
            <option value="">-- Select roster --</option>
          </select>
          <button id="loadRosterBtn">Load</button>
          <button id="deleteRosterBtn" class="danger">Delete</button>
        </div>
      </div>

      <div class="row">
        <label>Player Names (one per line)</label>
        <textarea id="rosterNames" rows="6" placeholder="Scott
Emma
Jake"></textarea>
      </div>

      <div class="row">
        <label>Save Roster As</label>
        <div class="inlineRow">
          <input id="rosterName" placeholder="Period 2" />
          <button id="saveRosterBtn">Save Roster</button>
        </div>
      </div>
    </section>

    <!-- Game Controls -->
    <section class="panel">
      <h2>Game Controls</h2>

      <div class="inlineRow" style="flex-wrap: wrap; gap: 10px;">
        <button id="startGameBtn" class="success" disabled>Start Game</button>
        <button id="pauseGameBtn" disabled>Pause</button>
        <button id="newRoundBtn" disabled>New Round</button>
      </div>

      <div id="gameStatus" class="status"></div>
    </section>

    <!-- Live Scoreboard -->
    <section class="panel">
      <h2>Live Scoreboard</h2>
      <div id="scoreboard" class="scoreboard">
        <div class="muted">No game in progress</div>
      </div>
    </section>
  </main>

  <script src="/socket.io/socket.io.js"></script>
  <script src="teacher.js"></script>
</body>
</html>
```

**Step 2: Verify file created**

Run: `cat public/teacher.html | head -30`
Expected: Shows DOCTYPE and head section

**Step 3: Commit**

```bash
git add public/teacher.html
git commit -m "feat: add teacher screen HTML structure"
```

---

## Task 3: Create Teacher Screen CSS

**Files:**
- Create: `public/teacher.css`

**Step 1: Create teacher.css**

```css
header {
  padding: 18px 22px;
  background: linear-gradient(90deg, #6c8cff, #88e0ff);
  color: white;
}

header h1 { margin: 0; font-size: 24px; }
header .sub { margin-top: 6px; font-size: 14px; opacity: 0.9; }

main {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  padding: 14px;
  align-items: start;
}

/* Scoreboard */
.scoreboard {
  display: grid;
  gap: 8px;
}

.scoreItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #eef4ff;
  border: 2px solid var(--border);
  border-radius: 10px;
}

.scoreItem.active {
  border-color: var(--accent2);
  background: #fff8ee;
}

.scoreItem .name {
  font-weight: 600;
}

.scoreItem .points {
  color: var(--accent);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 700px) {
  main {
    grid-template-columns: 1fr;
  }
}
```

**Step 2: Commit**

```bash
git add public/teacher.css
git commit -m "feat: add teacher screen styles"
```

---

## Task 4: Create Teacher Screen JavaScript - localStorage Functions

**Files:**
- Create: `public/teacher.js`

**Step 1: Create teacher.js with localStorage helpers**

```javascript
// localStorage keys
const DECKS_KEY = 'matchingGame_decks';
const ROSTERS_KEY = 'matchingGame_rosters';

// Load decks from localStorage
function loadDecks() {
  try {
    const data = localStorage.getItem(DECKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save decks to localStorage
function saveDecks(decks) {
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

// Load rosters from localStorage
function loadRosters() {
  try {
    const data = localStorage.getItem(ROSTERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save rosters to localStorage
function saveRosters(rosters) {
  localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters));
}

// Parse deck text into pairs array
function parsePairs(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [a, b] = line.split(',').map(s => (s || '').trim());
      return a && b ? { a, b } : null;
    })
    .filter(Boolean);
}

// Parse roster text into names array
function parseRoster(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

// Populate deck dropdown
function populateDeckSelect() {
  const select = document.getElementById('deckSelect');
  const decks = loadDecks();

  select.innerHTML = '<option value="">-- Select deck --</option>';
  decks.forEach((deck, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${deck.name} (${deck.pairs.length} pairs)`;
    select.appendChild(opt);
  });
}

// Populate roster dropdown
function populateRosterSelect() {
  const select = document.getElementById('rosterSelect');
  const rosters = loadRosters();

  select.innerHTML = '<option value="">-- Select roster --</option>';
  rosters.forEach((roster, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${roster.name} (${roster.players.length} players)`;
    select.appendChild(opt);
  });
}

// Initialize dropdowns on load
document.addEventListener('DOMContentLoaded', () => {
  populateDeckSelect();
  populateRosterSelect();
});
```

**Step 2: Verify file created**

Run: `cat public/teacher.js | head -30`
Expected: Shows localStorage functions

**Step 3: Commit**

```bash
git add public/teacher.js
git commit -m "feat: add teacher.js localStorage functions"
```

---

## Task 5: Add Teacher Screen UI Event Handlers

**Files:**
- Modify: `public/teacher.js`

**Step 1: Add UI event handlers to teacher.js**

Append to `public/teacher.js`:

```javascript

// DOM elements
const el = id => document.getElementById(id);

const roomCodeEl = el('roomCode');
const roomInfoEl = el('roomInfo');
const gameLinkEl = el('gameLink');
const gameLinkUrlEl = el('gameLinkUrl');
const gameStatusEl = el('gameStatus');
const scoreboardEl = el('scoreboard');

const createRoomBtn = el('createRoomBtn');
const setPinBtn = el('setPinBtn');
const setTimerBtn = el('setTimerBtn');
const startGameBtn = el('startGameBtn');
const pauseGameBtn = el('pauseGameBtn');
const newRoundBtn = el('newRoundBtn');

const loadDeckBtn = el('loadDeckBtn');
const saveDeckBtn = el('saveDeckBtn');
const deleteDeckBtn = el('deleteDeckBtn');
const loadRosterBtn = el('loadRosterBtn');
const saveRosterBtn = el('saveRosterBtn');
const deleteRosterBtn = el('deleteRosterBtn');

// Deck management
loadDeckBtn.onclick = () => {
  const idx = el('deckSelect').value;
  if (idx === '') return;

  const decks = loadDecks();
  const deck = decks[idx];
  if (!deck) return;

  el('deckPairs').value = deck.pairs.map(p => `${p.a},${p.b}`).join('\n');
  el('deckName').value = deck.name;
};

saveDeckBtn.onclick = () => {
  const name = el('deckName').value.trim();
  if (!name) return alert('Enter a deck name');

  const pairs = parsePairs(el('deckPairs').value);
  if (pairs.length < 2) return alert('Add at least 2 word pairs');

  const decks = loadDecks();
  const existingIdx = decks.findIndex(d => d.name === name);

  if (existingIdx >= 0) {
    decks[existingIdx] = { name, pairs };
  } else {
    decks.push({ name, pairs });
  }

  saveDecks(decks);
  populateDeckSelect();
  alert(`Deck "${name}" saved!`);
};

deleteDeckBtn.onclick = () => {
  const idx = el('deckSelect').value;
  if (idx === '') return;

  const decks = loadDecks();
  const deck = decks[idx];
  if (!deck) return;

  if (!confirm(`Delete deck "${deck.name}"?`)) return;

  decks.splice(idx, 1);
  saveDecks(decks);
  populateDeckSelect();
  el('deckPairs').value = '';
  el('deckName').value = '';
};

// Roster management
loadRosterBtn.onclick = () => {
  const idx = el('rosterSelect').value;
  if (idx === '') return;

  const rosters = loadRosters();
  const roster = rosters[idx];
  if (!roster) return;

  el('rosterNames').value = roster.players.join('\n');
  el('rosterName').value = roster.name;
};

saveRosterBtn.onclick = () => {
  const name = el('rosterName').value.trim();
  if (!name) return alert('Enter a roster name');

  const players = parseRoster(el('rosterNames').value);
  if (players.length < 1) return alert('Add at least 1 player');

  const rosters = loadRosters();
  const existingIdx = rosters.findIndex(r => r.name === name);

  if (existingIdx >= 0) {
    rosters[existingIdx] = { name, players };
  } else {
    rosters.push({ name, players });
  }

  saveRosters(rosters);
  populateRosterSelect();
  alert(`Roster "${name}" saved!`);
};

deleteRosterBtn.onclick = () => {
  const idx = el('rosterSelect').value;
  if (idx === '') return;

  const rosters = loadRosters();
  const roster = rosters[idx];
  if (!roster) return;

  if (!confirm(`Delete roster "${roster.name}"?`)) return;

  rosters.splice(idx, 1);
  saveRosters(rosters);
  populateRosterSelect();
  el('rosterNames').value = '';
  el('rosterName').value = '';
};
```

**Step 2: Commit**

```bash
git add public/teacher.js
git commit -m "feat: add deck and roster UI handlers"
```

---

## Task 6: Update Server - Room Creation and Roster Support

**Files:**
- Modify: `server.js`

**Step 1: Add generateRoomCode function after imports**

Add after line 8 (`const io = new Server(server);`):

```javascript

// Generate random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

**Step 2: Add new socket events for teacher controls**

Add before the `socket.on("disconnect"` handler (around line 287):

```javascript

  // Teacher creates a new room
  socket.on("room:create", (callback) => {
    let roomId = generateRoomCode();
    // Ensure unique
    while (rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    rooms.set(roomId, {
      hostId: socket.id,
      password: "",
      players: [],
      cards: [],
      turnIndex: 0,
      flipped: [],
      started: false,
      paused: false,
      pairsRaw: [],
      turnSeconds: 20,
      turnEndsAt: null
    });

    socket.join(roomId);
    callback({ roomId });
  });

  // Teacher sets roster (player names without socket connections)
  socket.on("room:setRoster", ({ roomId, players }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return;

    r.players = players.map((name, idx) => ({
      id: `player_${idx}`,
      name: safeName(name),
      score: 0,
      attempts: 0,
      stack: []
    }));

    emitRoom(rid);
  });

  // Teacher sets deck
  socket.on("room:setDeck", ({ roomId, pairs }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return;

    const cleanPairs = (pairs || [])
      .map(p => ({ a: (p.a || "").toString().trim(), b: (p.b || "").toString().trim() }))
      .filter(p => p.a && p.b);

    r.pairsRaw = cleanPairs;
    emitRoom(rid);
  });

  // Pause/resume game
  socket.on("game:pause", ({ roomId }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return;

    r.paused = true;
    r.turnEndsAt = null;
    emitRoom(rid);
  });

  socket.on("game:resume", ({ roomId }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return;

    r.paused = false;
    if (r.started) {
      startTurnTimer(rid);
    }
    emitRoom(rid);
  });

  // Game screen joins room (view-only connection)
  socket.on("game:join", ({ roomId }, callback) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);

    if (!r) {
      callback({ error: "Room not found" });
      return;
    }

    socket.join(rid);
    callback({ success: true });
    emitRoom(rid);
  });
```

**Step 3: Update emitRoom to include paused state**

Modify the `emitRoom` function to include `paused`:

```javascript
const emitRoom = (roomId) => {
  const r = rooms.get(roomId);
  if (!r) return;

  io.to(roomId).emit("room:update", {
    roomId,
    hostId: r.hostId,
    players: r.players,
    cards: r.cards,
    turnIndex: r.turnIndex,
    flipped: r.flipped,
    started: r.started,
    paused: r.paused,
    turnSeconds: r.turnSeconds,
    turnEndsAt: r.turnEndsAt,
    pairsCount: r.pairsRaw ? r.pairsRaw.length : 0
  });
};
```

**Step 4: Update timer loop to respect paused state**

Modify the `setInterval` at the bottom to check for paused:

```javascript
setInterval(() => {
  const now = Date.now();
  for (const [rid, r] of rooms.entries()) {
    if (!r.started) continue;
    if (r.paused) continue;
    if (!r.players.length) continue;
    if (!r.turnEndsAt) continue;

    if (now >= r.turnEndsAt) {
      advanceTurn(rid);
    }
  }
}, 250);
```

**Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add room creation, roster, and pause support"
```

---

## Task 7: Add Socket.IO to Teacher Screen

**Files:**
- Modify: `public/teacher.js`

**Step 1: Add Socket.IO connection and room management**

Append to `public/teacher.js`:

```javascript

// Socket.IO connection
const socket = io();
let currentRoom = null;
let roomState = null;

// Room creation
createRoomBtn.onclick = () => {
  socket.emit("room:create", (response) => {
    if (response.roomId) {
      currentRoom = response.roomId;
      roomCodeEl.value = response.roomId;
      roomInfoEl.textContent = `Room: ${response.roomId}`;

      // Show game link
      const gameUrl = `${window.location.origin}/game.html?room=${response.roomId}`;
      gameLinkUrlEl.href = gameUrl;
      gameLinkUrlEl.textContent = gameUrl;
      gameLinkEl.classList.remove('hidden');

      // Enable controls
      setPinBtn.disabled = false;
      setTimerBtn.disabled = false;
      startGameBtn.disabled = false;

      updateStatus('Room created! Set up your deck and roster.');
    }
  });
};

// Set PIN
setPinBtn.onclick = () => {
  if (!currentRoom) return;
  const pin = el('roomPin').value.trim();
  socket.emit("teacher:setPin", { roomId: currentRoom, pin });
  updateStatus('PIN updated');
};

// Set timer
setTimerBtn.onclick = () => {
  if (!currentRoom) return;
  const seconds = parseInt(el('turnTimer').value) || 20;
  socket.emit("teacher:setTimer", { roomId: currentRoom, seconds });
  updateStatus(`Turn timer set to ${seconds}s`);
};

// Start game
startGameBtn.onclick = () => {
  if (!currentRoom) return;

  const pairs = parsePairs(el('deckPairs').value);
  if (pairs.length < 2) return alert('Add at least 2 word pairs');

  const players = parseRoster(el('rosterNames').value);
  if (players.length < 1) return alert('Add at least 1 player');

  // Set roster first, then deck, then start
  socket.emit("room:setRoster", { roomId: currentRoom, players });
  socket.emit("room:setDeck", { roomId: currentRoom, pairs });
  socket.emit("game:start", { roomId: currentRoom, pairs });

  pauseGameBtn.disabled = false;
  newRoundBtn.disabled = false;
  updateStatus('Game started!');
};

// Pause/resume
pauseGameBtn.onclick = () => {
  if (!currentRoom || !roomState) return;

  if (roomState.paused) {
    socket.emit("game:resume", { roomId: currentRoom });
    pauseGameBtn.textContent = 'Pause';
  } else {
    socket.emit("game:pause", { roomId: currentRoom });
    pauseGameBtn.textContent = 'Resume';
  }
};

// New round
newRoundBtn.onclick = () => {
  if (!currentRoom) return;
  socket.emit("game:newRound", { roomId: currentRoom });
  updateStatus('New round started!');
};

// Room updates
socket.on("room:update", (data) => {
  roomState = data;
  renderScoreboard(data);

  if (data.paused) {
    pauseGameBtn.textContent = 'Resume';
  } else {
    pauseGameBtn.textContent = 'Pause';
  }
});

// Render scoreboard
function renderScoreboard(room) {
  if (!room || !room.players.length) {
    scoreboardEl.innerHTML = '<div class="muted">No players yet</div>';
    return;
  }

  scoreboardEl.innerHTML = room.players.map((p, idx) => `
    <div class="scoreItem ${idx === room.turnIndex && room.started ? 'active' : ''}">
      <span class="name">${p.name}${idx === room.turnIndex && room.started ? ' ⭐' : ''}</span>
      <span class="points">${p.score} pts</span>
    </div>
  `).join('');
}

// Status updates
function updateStatus(msg) {
  gameStatusEl.textContent = msg;
}
```

**Step 2: Commit**

```bash
git add public/teacher.js
git commit -m "feat: add Socket.IO room management to teacher screen"
```

---

## Task 8: Create Game Screen HTML

**Files:**
- Create: `public/game.html`

**Step 1: Create game.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Matching Game</title>
  <link rel="stylesheet" href="shared.css" />
  <link rel="stylesheet" href="game.css" />
</head>
<body>
  <header>
    <div class="headerLeft">
      <h1>Matching Game</h1>
      <div class="roomCode" id="roomCode">Room: ---</div>
    </div>
    <div class="headerRight">
      <div class="timer" id="timer"></div>
    </div>
  </header>

  <main>
    <section class="boardSection">
      <div class="turnIndicator" id="turnIndicator">
        Waiting for teacher to start...
      </div>
      <div class="board" id="board"></div>
    </section>

    <aside class="scoreboardSection">
      <h2>Scoreboard</h2>
      <div class="scoreboard" id="scoreboard">
        <div class="muted">No players yet</div>
      </div>
    </aside>
  </main>

  <!-- Confetti library -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add public/game.html
git commit -m "feat: add game screen HTML"
```

---

## Task 9: Create Game Screen CSS

**Files:**
- Create: `public/game.css`

**Step 1: Create game.css**

```css
html, body {
  height: 100%;
  overflow: hidden;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(90deg, #6c8cff, #88e0ff);
  color: white;
}

header h1 {
  margin: 0;
  font-size: 22px;
}

.roomCode {
  font-size: 14px;
  opacity: 0.9;
}

.timer {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

main {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 14px;
  padding: 14px;
  height: calc(100vh - 70px);
  overflow: hidden;
}

/* Board Section */
.boardSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.turnIndicator {
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  padding: 12px;
  background: white;
  border-radius: 16px;
  border: 3px solid var(--accent);
  animation: pulse 1.5s ease-in-out infinite;
}

.turnIndicator.paused {
  background: #fff3cd;
  border-color: var(--accent2);
  color: #856404;
  animation: none;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 4px;
}

/* Cards */
.card {
  height: 100px;
  font-size: 22px;
  font-weight: 600;
  background: #dbe7ff;
  border: 4px solid #9bb8ff;
  color: var(--text);
  border-radius: 18px;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.2s;
  user-select: none;
  -webkit-user-select: none;
}

.card:hover:not(:disabled) {
  transform: scale(1.03);
}

.card:active:not(:disabled) {
  transform: scale(0.98);
}

.card[data-face="up"] {
  background: #ffffff;
  border-color: var(--accent2);
  box-shadow: 0 6px 14px rgba(0,0,0,0.15);
}

.card.cleared {
  background: #f0f4ff;
  border: 3px dashed var(--border);
  cursor: default;
}

.card:disabled {
  cursor: default;
}

.card.matchPop {
  animation: matchPop 0.6s ease;
}

@keyframes matchPop {
  0% { transform: scale(1); box-shadow: 0 0 0 rgba(255,184,107,0); }
  50% { transform: scale(1.15); box-shadow: 0 0 30px rgba(255,184,107,0.8); }
  100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,184,107,0); }
}

/* Scoreboard */
.scoreboardSection {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  overflow-y: auto;
}

.scoreboardSection h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
}

.scoreboard {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.playerCard {
  padding: 12px;
  background: #eef4ff;
  border: 3px solid var(--border);
  border-radius: 14px;
  transition: all 0.3s ease;
}

.playerCard.active {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 4px 12px rgba(108,140,255,0.3);
}

.playerCard.celebrating {
  animation: celebrate 0.5s ease;
  border-color: var(--accent2);
  background: #fff8ee;
}

@keyframes celebrate {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.05) rotate(-1deg); }
  75% { transform: scale(1.05) rotate(1deg); }
}

.playerHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.playerName {
  font-size: 18px;
  font-weight: 700;
}

.playerPoints {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.playerPoints .plus {
  color: var(--success);
  animation: fadeUp 0.5s ease forwards;
}

@keyframes fadeUp {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

.matchedWords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.matchedWord {
  padding: 4px 8px;
  background: white;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
}

.matchedWord.new {
  animation: popIn 0.3s ease;
  border-color: var(--accent2);
}

@keyframes popIn {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* Responsive */
@media (max-width: 800px) {
  main {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }

  .scoreboardSection {
    max-height: 200px;
  }
}
```

**Step 2: Commit**

```bash
git add public/game.css
git commit -m "feat: add game screen styles with animations"
```

---

## Task 10: Create Game Screen JavaScript

**Files:**
- Create: `public/game.js`

**Step 1: Create game.js**

```javascript
const socket = io();

// Get room from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

let roomState = null;

// DOM elements
const roomCodeEl = document.getElementById('roomCode');
const timerEl = document.getElementById('timer');
const turnIndicatorEl = document.getElementById('turnIndicator');
const boardEl = document.getElementById('board');
const scoreboardEl = document.getElementById('scoreboard');

// Sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(freq = 440, ms = 120) {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.value = 0.08;
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  setTimeout(() => o.stop(), ms);
}

function flipSound() { beep(520, 70); }
function matchSound() { beep(740, 140); setTimeout(() => beep(980, 160), 160); }
function noMatchSound() { beep(240, 140); }

// Timer display
let timerRAF = null;

function startTimerLoop() {
  if (timerRAF) cancelAnimationFrame(timerRAF);

  const tick = () => {
    if (!roomState || !roomState.started || !roomState.turnEndsAt || roomState.paused) {
      timerEl.textContent = roomState?.paused ? '⏸ PAUSED' : '';
      timerRAF = requestAnimationFrame(tick);
      return;
    }

    const msLeft = roomState.turnEndsAt - Date.now();
    const seconds = Math.max(0, Math.ceil(msLeft / 1000));
    timerEl.textContent = `⏱ ${seconds}s`;
    timerRAF = requestAnimationFrame(tick);
  };

  tick();
}

// Render board
function renderBoard(room) {
  boardEl.innerHTML = '';

  if (!room.cards.length) {
    boardEl.innerHTML = '<div class="muted" style="grid-column: 1/-1; text-align: center; padding: 40px;">Waiting for teacher to start game...</div>';
    return;
  }

  const canFlip = room.started && !room.paused && room.flipped.length < 2;

  room.cards.forEach(card => {
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.id = `card_${card.id}`;

    if (card.isMatched) {
      btn.classList.add('cleared');
      btn.disabled = true;
    } else {
      btn.disabled = !canFlip || card.isFaceUp;
      btn.textContent = card.isFaceUp ? card.text : '';
      btn.dataset.face = card.isFaceUp ? 'up' : 'down';

      btn.onclick = () => {
        flipSound();
        socket.emit('game:flip', { roomId, cardId: card.id });
      };
    }

    boardEl.appendChild(btn);
  });
}

// Render turn indicator
function renderTurnIndicator(room) {
  if (!room.started) {
    turnIndicatorEl.textContent = 'Waiting for teacher to start...';
    turnIndicatorEl.classList.remove('paused');
    return;
  }

  if (room.paused) {
    turnIndicatorEl.textContent = '⏸ GAME PAUSED';
    turnIndicatorEl.classList.add('paused');
    return;
  }

  turnIndicatorEl.classList.remove('paused');
  const current = room.players[room.turnIndex];
  if (current) {
    turnIndicatorEl.textContent = `${current.name.toUpperCase()}'S TURN!`;
  }
}

// Render scoreboard
function renderScoreboard(room) {
  if (!room.players.length) {
    scoreboardEl.innerHTML = '<div class="muted">No players yet</div>';
    return;
  }

  scoreboardEl.innerHTML = room.players.map((player, idx) => `
    <div class="playerCard ${idx === room.turnIndex && room.started ? 'active' : ''}" id="player_${player.id}">
      <div class="playerHeader">
        <span class="playerName">${player.name}</span>
        <span class="playerPoints">${player.score} pts</span>
      </div>
      <div class="matchedWords">
        ${player.stack.length === 0
          ? '<span class="muted">No matches yet</span>'
          : player.stack.map(m => `<div class="matchedWord">${m.a}</div>`).join('')
        }
      </div>
    </div>
  `).join('');
}

// Full render
function render(room) {
  if (!room) return;

  roomCodeEl.textContent = `Room: ${room.roomId}`;
  renderBoard(room);
  renderTurnIndicator(room);
  renderScoreboard(room);
  startTimerLoop();
}

// Match animation
socket.on('match:animate', ({ cardIds, playerId, a, b }) => {
  matchSound();

  // Confetti
  confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

  // Card pop animation
  cardIds.forEach(id => {
    const card = document.getElementById(`card_${id}`);
    if (card) {
      card.classList.add('matchPop');
      setTimeout(() => card.classList.remove('matchPop'), 600);
    }
  });

  // Player celebration
  const playerCard = document.getElementById(`player_${playerId}`);
  if (playerCard) {
    playerCard.classList.add('celebrating');
    setTimeout(() => playerCard.classList.remove('celebrating'), 500);
  }
});

// Room updates
socket.on('room:update', data => {
  roomState = data;
  render(data);
});

socket.on('room:error', e => {
  alert(e.message);
});

// Join room on load
if (roomId) {
  socket.emit('game:join', { roomId }, response => {
    if (response.error) {
      turnIndicatorEl.textContent = `Error: ${response.error}`;
    }
  });
} else {
  turnIndicatorEl.textContent = 'No room specified. Add ?room=CODE to URL.';
}
```

**Step 2: Commit**

```bash
git add public/game.js
git commit -m "feat: add game screen JavaScript with animations"
```

---

## Task 11: Update Landing Page

**Files:**
- Modify: `public/index.html`

**Step 1: Replace index.html with landing page**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Matching Game</title>
  <link rel="stylesheet" href="shared.css" />
  <style>
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
    }

    h1 {
      font-size: 36px;
      margin-bottom: 10px;
      color: var(--accent);
    }

    .subtitle {
      color: var(--muted);
      margin-bottom: 40px;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 400px;
    }

    .option {
      padding: 24px;
      background: white;
      border: 3px solid var(--border);
      border-radius: 20px;
      text-decoration: none;
      color: var(--text);
      transition: all 0.2s ease;
    }

    .option:hover {
      border-color: var(--accent);
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
    }

    .option h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      color: var(--accent);
    }

    .option p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>Matching Game</h1>
  <p class="subtitle">Word recognition game for the classroom</p>

  <div class="options">
    <a href="/teacher.html" class="option">
      <h2>Teacher</h2>
      <p>Create rooms, manage word decks, and control the game</p>
    </a>

    <a href="/game.html" class="option">
      <h2>Game Screen</h2>
      <p>Display for classroom touchscreen (requires room code)</p>
    </a>
  </div>
</body>
</html>
```

**Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat: update landing page with teacher/game links"
```

---

## Task 12: Test End-to-End Flow

**Step 1: Start the server**

Run: `npm start`
Expected: "Running on port 3000"

**Step 2: Open teacher screen**

Open: `http://localhost:3000/teacher.html`
Expected: Teacher Control Panel loads

**Step 3: Create a room**

- Click "Create Room"
- Expected: Room code appears, game link shown

**Step 4: Add deck and roster**

- Enter word pairs: `kite,kite` and `tree,tree`
- Enter players: `Scott` and `Emma`
- Click "Start Game"

**Step 5: Open game screen**

- Open the game link in new tab
- Expected: Board with cards, scoreboard with Scott and Emma

**Step 6: Play a turn**

- Click two cards on game screen
- Expected: Cards flip, match/no-match animation plays

**Step 7: Verify localStorage**

- Save a deck named "Test Deck"
- Refresh teacher page
- Expected: "Test Deck" appears in dropdown

**Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete two-screen matching game implementation"
```

---

## Summary

This implementation creates:
1. **Teacher Screen** (`/teacher.html`) - Full control panel with localStorage persistence
2. **Game Screen** (`/game.html`) - Touch-friendly student display
3. **Updated Server** - Roster-based players, pause/resume, room creation
4. **Landing Page** - Simple navigation to both screens

All existing game logic (matching, turns, timer) is preserved and enhanced.
