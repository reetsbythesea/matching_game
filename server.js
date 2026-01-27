import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/**
 * roomId -> {
 *  hostId,
 *  password, // simple room PIN (plaintext for simplicity)
 *  players: [{id, name, score, attempts, stack: [{pairId,a,b}]}],
 *  cards: [{id, pairId, text, isFaceUp, isMatched}],
 *  turnIndex,
 *  flipped: [],
 *  started: false,
 *  pairsRaw: [{a,b}],
 *  turnSeconds: number,
 *  turnEndsAt: number|null
 * }
 */
const rooms = new Map();

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const makeDeck = (pairs) => {
  const cards = [];
  const stamp = Date.now();
  pairs.forEach((p, idx) => {
    const pairId = `pair_${idx}_${stamp}`;
    cards.push(
      { id: `c_${pairId}_a`, pairId, text: p.a, isFaceUp: false, isMatched: false },
      { id: `c_${pairId}_b`, pairId, text: p.b, isFaceUp: false, isMatched: false }
    );
  });
  return shuffle(cards);
};

const sanitizeRoomId = (s) =>
  (s || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 18);

const safeName = (s) => (s || "Player").toString().trim().slice(0, 18);
const safePin = (s) => (s || "").toString().trim().slice(0, 12);

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
    turnSeconds: r.turnSeconds,
    turnEndsAt: r.turnEndsAt
  });
};

const startTurnTimer = (roomId) => {
  const r = rooms.get(roomId);
  if (!r) return;
  if (!r.started) return;
  if (!r.players.length) return;

  r.turnEndsAt = Date.now() + (r.turnSeconds || 20) * 1000;
  io.to(roomId).emit("timer:update", { turnEndsAt: r.turnEndsAt, turnSeconds: r.turnSeconds });
};

const advanceTurn = (roomId) => {
  const r = rooms.get(roomId);
  if (!r) return;

  // flip any currently flipped (unmatched) back down
  for (const id of r.flipped) {
    const c = r.cards.find((x) => x.id === id);
    if (c && !c.isMatched) c.isFaceUp = false;
  }
  r.flipped = [];

  r.turnIndex = (r.turnIndex + 1) % r.players.length;
  startTurnTimer(roomId);
  emitRoom(roomId);
};

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, name, pin }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;

    const playerName = safeName(name);
    const enteredPin = safePin(pin);

    // Create room on first join; first joiner becomes host (teacher)
    if (!rooms.has(rid)) {
      rooms.set(rid, {
        hostId: socket.id,
        password: enteredPin || "", // teacher sets pin on first join (or later via teacher panel)
        players: [],
        cards: [],
        turnIndex: 0,
        flipped: [],
        started: false,
        pairsRaw: [],
        turnSeconds: 20,
        turnEndsAt: null
      });
    }

    const r = rooms.get(rid);

    // Enforce PIN for joining once set
    if (r.password && enteredPin !== r.password) {
      socket.emit("room:error", { message: "Wrong room password / PIN." });
      return;
    }

    socket.join(rid);

    // prevent duplicate names (append number)
    let finalName = playerName || "Player";
    const existingNames = new Set(r.players.map((p) => p.name));
    if (existingNames.has(finalName)) {
      let n = 2;
      while (existingNames.has(`${finalName} ${n}`)) n++;
      finalName = `${finalName} ${n}`;
    }

    if (!r.players.some((p) => p.id === socket.id)) {
      r.players.push({
        id: socket.id,
        name: finalName,
        score: 0,
        attempts: 0,
        stack: []
      });
    }

    emitRoom(rid);
  });

  socket.on("teacher:setPin", ({ roomId, pin }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return;
    r.password = safePin(pin);
    emitRoom(rid);
  });

  socket.on("teacher:setTimer", ({ roomId, seconds }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return;

    const s = Number(seconds);
    r.turnSeconds = Number.isFinite(s) ? Math.max(5, Math.min(120, Math.floor(s))) : 20;

    // If game running, restart timer with new value
    if (r.started) startTurnTimer(rid);
    emitRoom(rid);
  });

  socket.on("game:start", ({ roomId, pairs }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return; // teacher only

    const cleanPairs = (pairs || [])
      .map((p) => ({ a: (p.a || "").toString().trim(), b: (p.b || "").toString().trim() }))
      .filter((p) => p.a && p.b);

    if (cleanPairs.length < 2) return;

    r.pairsRaw = cleanPairs;
    r.cards = makeDeck(cleanPairs);
    r.players = r.players.map((p) => ({ ...p, score: 0, attempts: 0, stack: [] }));
    r.turnIndex = 0;
    r.flipped = [];
    r.started = true;

    startTurnTimer(rid);
    emitRoom(rid);
  });

  socket.on("game:newRound", ({ roomId }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;
    if (r.hostId !== socket.id) return; // teacher only
    if (!r.pairsRaw || r.pairsRaw.length < 2) return;

    r.cards = makeDeck(r.pairsRaw);
    r.players = r.players.map((p) => ({ ...p, score: 0, attempts: 0, stack: [] }));
    r.turnIndex = 0;
    r.flipped = [];
    r.started = true;

    startTurnTimer(rid);
    emitRoom(rid);
  });

  socket.on("game:flip", ({ roomId, cardId }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r || !r.started) return;

    const current = r.players[r.turnIndex];
    if (!current || current.id !== socket.id) return;

    const card = r.cards.find((c) => c.id === cardId);
    if (!card || card.isMatched || card.isFaceUp) return;
    if (r.flipped.length >= 2) return;

    card.isFaceUp = true;
    r.flipped.push(cardId);
    emitRoom(rid);

    if (r.flipped.length === 2) {
      current.attempts += 1;

      const [id1, id2] = r.flipped;
      const c1 = r.cards.find((c) => c.id === id1);
      const c2 = r.cards.find((c) => c.id === id2);
      const isMatch = c1 && c2 && c1.pairId === c2.pairId;

      if (isMatch) {
        // Tell clients to animate the match BEFORE we lock them as matched
        const aText = c1.text;
        const bText = c2.text;

        io.to(rid).emit("match:animate", {
          cardIds: [c1.id, c2.id],
          playerId: current.id,
          a: aText,
          b: bText
        });

        // After animation delay, mark matched + score + stack (grid stays fixed)
        setTimeout(() => {
          c1.isMatched = true;
          c2.isMatched = true;
          c1.isFaceUp = false;
          c2.isFaceUp = false;

          current.score += 2;
          current.stack.push({ pairId: c1.pairId, a: aText, b: bText });

          r.flipped = [];

          // same player keeps turn on match; refresh timer
          startTurnTimer(rid);
          emitRoom(rid);
        }, 900);
      } else {
        setTimeout(() => {
          if (c1) c1.isFaceUp = false;
          if (c2) c2.isFaceUp = false;
          r.flipped = [];
          advanceTurn(rid);
        }, 900);
      }

      emitRoom(rid);
    }
  });

  socket.on("disconnect", () => {
    for (const [rid, r] of rooms.entries()) {
      const before = r.players.length;
      r.players = r.players.filter((p) => p.id !== socket.id);

      if (r.hostId === socket.id) {
        r.hostId = r.players[0]?.id || null;
      }

      if (r.players.length !== before) {
        if (r.players.length === 0) {
          rooms.delete(rid);
        } else {
          if (r.turnIndex >= r.players.length) r.turnIndex = 0;
          emitRoom(rid);
        }
      }
    }
  });
});

// Server-side timer enforcement
setInterval(() => {
  const now = Date.now();
  for (const [rid, r] of rooms.entries()) {
    if (!r.started) continue;
    if (!r.players.length) continue;
    if (!r.turnEndsAt) continue;

    if (now >= r.turnEndsAt) {
      advanceTurn(rid);
    }
  }
}, 250);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Running on port ${PORT}`));
