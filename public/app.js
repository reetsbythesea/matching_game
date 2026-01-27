const socket = io();

let currentRoom = null;
let myId = null;
let roomState = null;

const el = (id) => document.getElementById(id);

const joinBtn = el("joinBtn");
const startBtn = el("startBtn");
const newRoundBtn = el("newRoundBtn");
const statusEl = el("status");
const boardEl = el("board");
const playersEl = el("players");
const turnInfoEl = el("turnInfo");
const timerEl = el("timer");

const teacherPanel = el("teacherPanel");
const setPinBtn = el("setPinBtn");
const setTimerBtn = el("setTimerBtn");

const soundToggle = el("soundToggle");

// Sound effects
const ctx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq = 440, ms = 120) {
  if (!soundToggle.checked) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.value = 0.06;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  setTimeout(() => o.stop(), ms);
}
function matchSound() { beep(740, 140); setTimeout(() => beep(980, 160), 160); }
function flipSound() { beep(520, 70); }
function noMatchSound() { beep(240, 140); }

function parsePairs(text) {
  return text.split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [a,b] = line.split(",").map(s => (s||"").trim());
      return a && b ? {a,b} : null;
    })
    .filter(Boolean);
}

function setStatus(msg) { statusEl.textContent = msg || ""; }
function isHost(room) { return room && room.hostId && room.hostId === myId; }

function formatTime(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return `${s}s`;
}

let timerRAF = null;
function startTimerLoop() {
  if (timerRAF) cancelAnimationFrame(timerRAF);
  const tick = () => {
    if (!roomState || !roomState.started || !roomState.turnEndsAt) {
      timerEl.textContent = "";
      timerRAF = requestAnimationFrame(tick);
      return;
    }
    const msLeft = roomState.turnEndsAt - Date.now();
    timerEl.textContent = `⏱ ${formatTime(msLeft)}`;
    timerRAF = requestAnimationFrame(tick);
  };
  tick();
}

function render(room) {
  if (!room) return;

  teacherPanel.style.display = isHost(room) ? "block" : "none";

  const current = room.players[room.turnIndex];
  const myTurn = current && current.id === myId;

  turnInfoEl.textContent = !room.started
    ? "Board locked — teacher must click Start."
    : `Turn: ${current ? current.name : "—"}${myTurn ? " (you)" : ""}`;

  boardEl.innerHTML = "";
  const canFlip = room.started && myTurn && room.flipped.length < 2;

  room.cards.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "card";

    if (c.isMatched) {
      btn.classList.add("cleared");
      btn.disabled = true;
    } else {
      btn.disabled = !canFlip || c.isFaceUp;
      btn.textContent = c.isFaceUp ? c.text : "";
      btn.dataset.face = c.isFaceUp ? "up" : "down";
      btn.onclick = () => {
        flipSound();
        socket.emit("game:flip", { roomId: currentRoom, cardId: c.id });
      };
    }
    btn.id = `card_${c.id}`;
    boardEl.appendChild(btn);
  });

  playersEl.innerHTML = "";
  room.players.forEach((p, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "player";
    wrap.innerHTML = `
      <div class="playerTop">
        <b>${p.name}</b>
        <span>${p.score} pts • ${p.attempts} attempts${idx===room.turnIndex?" ⭐":""}</span>
      </div>
      <div class="stackLabel">Matched deck:</div>
    `;

    const list = document.createElement("div");
    list.className = "stackTiles";
    if (!p.stack.length) {
      list.innerHTML = `<div class="muted">none yet</div>`;
    } else {
      p.stack.slice().reverse().forEach(s => {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.textContent = `${s.a} ↔ ${s.b}`;
        list.appendChild(tile);
      });
    }
    wrap.appendChild(list);
    playersEl.appendChild(wrap);
  });

  startTimerLoop();
}

joinBtn.onclick = () => {
  const roomId = el("roomId").value.trim().toUpperCase();
  const name = el("name").value.trim();
  const pin = el("pin").value.trim();
  if (!roomId) return setStatus("Enter a room code.");
  currentRoom = roomId;
  socket.emit("room:join", { roomId, name, pin });
  setStatus(`Joined room ${roomId}. Waiting for teacher to start.`);
};

startBtn.onclick = () => {
  if (!currentRoom) return setStatus("Join a room first.");
  const pairs = parsePairs(el("pairs").value);
  if (pairs.length < 2) return setStatus("Add at least 2 pairs.");
  socket.emit("game:start", { roomId: currentRoom, pairs });
  setStatus("Game started!");
};

newRoundBtn.onclick = () => {
  if (!currentRoom) return;
  socket.emit("game:newRound", { roomId: currentRoom });
  setStatus("New round started!");
};

setPinBtn.onclick = () => {
  socket.emit("teacher:setPin", { roomId: currentRoom, pin: el("teacherPin").value.trim() });
};

setTimerBtn.onclick = () => {
  socket.emit("teacher:setTimer", { roomId: currentRoom, seconds: Number(el("timerSeconds").value) });
};

socket.on("connect", () => { myId = socket.id; });

socket.on("match:animate", ({ cardIds }) => {
  matchSound();

  // 🎉 CONFETTI
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });

  const [a, b] = cardIds.map(id => document.getElementById(`card_${id}`));
  if (!a || !b) return;
  a.classList.add("matchPop");
  b.classList.add("matchPop");
  setTimeout(() => {
    a.classList.remove("matchPop");
    b.classList.remove("matchPop");
  }, 700);
});

socket.on("room:update", data => {
  roomState = data;
  render(roomState);
});

socket.on("room:error", e => alert(e.message));
