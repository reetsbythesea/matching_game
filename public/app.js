const socket = io();

let currentRoom = null;
let myId = null;
let roomState = null;

const el = (id) => document.getElementById(id);

const joinBtn = el("joinBtn");
const startBtn = el("startBtn");
const statusEl = el("status");
const boardEl = el("board");
const playersEl = el("players");
const turnInfoEl = el("turnInfo");

function parsePairs(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split(",").map((s) => (s || "").trim());
      return a && b ? { a, b } : null;
    })
    .filter(Boolean);
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function render(room) {
  if (!room) return;

  // Turn info
  const current = room.players[room.turnIndex];
  const myTurn = current && current.id === myId;
  turnInfoEl.textContent = room.started
    ? `Turn: ${current ? current.name : "—"}${myTurn ? " (you)" : ""}`
    : "Game not started yet (teacher click Start).";

  // Board
  boardEl.innerHTML = "";
  const canFlip = room.started && myTurn && room.flipped.length < 2;

  room.cards.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.disabled = !canFlip || c.isMatched || c.isFaceUp;
    btn.textContent = c.isFaceUp ? c.text : "";
    btn.setAttribute("aria-label", "card");
    btn.dataset.face = c.isFaceUp ? "up" : "down";

    btn.onclick = () => socket.emit("game:flip", { roomId: currentRoom, cardId: c.id });

    boardEl.appendChild(btn);
  });

  // Players + stacks
  playersEl.innerHTML = "";
  room.players.forEach((p, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "player";

    const top = document.createElement("div");
    top.className = "playerTop";
    top.innerHTML = `<b>${p.name}</b> <span>${p.score} pts${idx === room.turnIndex ? " ⭐" : ""}</span>`;
    wrap.appendChild(top);

    const label = document.createElement("div");
    label.className = "stackLabel";
    label.textContent = "Matched stack:";
    wrap.appendChild(label);

    const list = document.createElement("ul");
    list.className = "stack";
    if (!p.stack.length) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "none yet";
      list.appendChild(li);
    } else {
      p.stack.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = `${s.a} ↔ ${s.b}`;
        list.appendChild(li);
      });
    }
    wrap.appendChild(list);

    playersEl.appendChild(wrap);
  });
}

joinBtn.onclick = () => {
  const roomId = el("roomId").value.trim().toUpperCase();
  const name = el("name").value.trim();
  if (!roomId) return setStatus("Enter a room code.");
  currentRoom = roomId;
  socket.emit("room:join", { roomId, name });
  setStatus(`Joined room ${roomId}. Waiting for teacher to start.`);
};

startBtn.onclick = () => {
  if (!currentRoom) return setStatus("Join a room first (same room code as students).");
  const pairs = parsePairs(el("pairs").value);
  if (pairs.length < 2) return setStatus("Add at least 2 pairs.");
  socket.emit("game:start", { roomId: currentRoom, pairs });
  setStatus("Game started/reset!");
};

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("room:update", (data) => {
  roomState = data;
  render(roomState);
});
