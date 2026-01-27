import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/**
 * roomId -> {
 *  players: [{id, name, score, stack: [{pairId,a,b}]}],
 *  cards: [{id, pairId, text, isFaceUp, isMatched}],
 *  turnIndex,
 *  flipped: [],
 *  started: false,
 *  pairsRaw: [{a,b}]
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
  pairs.forEach((p, idx) => {
    const pairId = `pair_${idx}_${Date.now()}`;
    cards.push(
      { id: `c_${pairId}_a`, pairId, text: p.a, isFaceUp: false, isMatched: false },
      { id: `c_${pairId}_b`, pairId, text: p.b, isFaceUp: false, isMatched: false }
    );
  });
  return shuffle(cards);
};

const sanitizeRoomId = (s) =>
  (s || "").toString().trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 18);

const emitRoom = (roomId) => {
  const r = rooms.get(roomId);
  if (!r) return;
  io.to(roomId).emit("room:update", {
    roomId,
    players: r.players,
    cards: r.cards,
    turnIndex: r.turnIndex,
    flipped: r.flipped,
    started: r.started
  });
};

io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId, name }) => {
    const rid = sanitizeRoomId(roomId);
    if (!rid) return;

    // Create room if it doesn't exist yet (teacher can be first, or students can pre-join)
    if (!rooms.has(rid)) {
      rooms.set(rid, {
        players: [],
        cards: [],
        turnIndex: 0,
        flipped: [],
        started: false,
        pairsRaw: []
      });
    }

    const r = rooms.get(rid);
    socket.join(rid);

    // Add player if not present
    if (!r.players.some((p) => p.id === socket.id)) {
      r.players.push({
        id: socket.id,
        name: (name || "Player").toString().slice(0, 18),
        score: 0,
        stack: []
      });
    }

    emitRoom(rid);
  });

  socket.on("game:start", ({ roomId, pairs }) => {
    const rid = sanitizeRoomId(roomId);
    const r = rooms.get(rid);
    if (!r) return;

    // Only allow start if there is at least 1 player
    const hasPlayer = r.players.length > 0;
    if (!hasPlayer) return;

    // Teacher can start from any socket in room (simple classroom model)
    const cleanPairs = (pairs || [])
      .map((p) => ({
        a: (p.a || "").toString().trim(),
        b: (p.b || "").toString().trim()
      }))
      .filter((p) => p.a && p.b);

    r.pairsRaw = cleanPairs;
    r.cards = makeDeck(cleanPairs);
    r.players = r.players.map((p) => ({ ...p, score: 0, stack: [] }));
    r.turnIndex = 0;
    r.flipped = [];
    r.started = true;

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
      const [id1, id2] = r.flipped;
      const c1 = r.cards.find((c) => c.id === id1);
      const c2 = r.cards.find((c) => c.id === id2);
      const isMatch = c1 && c2 && c1.pairId === c2.pairId;

      if (isMatch) {
        c1.isMatched = true;
        c2.isMatched = true;

        current.score += 2;

        // Find original pair text
        const found = r.pairsRaw.find((_p, i) => {
          // We can’t perfectly map index after Date.now; store by matching text:
          // still fine for stack display:
          return (_p.a === c1.text && _p.b === c2.text) || (_p.a === c2.text && _p.b === c1.text);
        });

        current.stack.push({
          pairId: c1.pairId,
          a: found ? found.a : c1.text,
          b: found ? found.b : c2.text
        });

        // Remove matched cards from board
        r.cards = r.cards.filter((c) => !c.isMatched);

        r.flipped = [];
        emitRoom(rid);

        // Optional: keep same player's turn on match (common rule)
        // If you want to PASS turn on match, uncomment next 2 lines:
        // r.turnIndex = (r.turnIndex + 1) % r.players.length;
        // emitRoom(rid);
      } else {
        setTimeout(() => {
          if (c1) c1.isFaceUp = false;
          if (c2) c2.isFaceUp = false;
          r.flipped = [];
          // Pass turn
          r.turnIndex = (r.turnIndex + 1) % r.players.length;
          emitRoom(rid);
        }, 900);
      }
    }
  });

  socket.on("disconnect", () => {
    for (const [rid, r] of rooms.entries()) {
      const before = r.players.length;
      r.players = r.players.filter((p) => p.id !== socket.id);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Running on port ${PORT}`));
