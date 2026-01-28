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

// Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

// Timer display
let timerRAF = null;

function startTimerLoop() {
  if (timerRAF) cancelAnimationFrame(timerRAF);

  const tick = () => {
    if (!roomState || !roomState.started || !roomState.turnEndsAt || roomState.paused) {
      timerEl.textContent = roomState?.paused ? 'PAUSED' : '';
      timerRAF = requestAnimationFrame(tick);
      return;
    }

    const msLeft = roomState.turnEndsAt - Date.now();
    const seconds = Math.max(0, Math.ceil(msLeft / 1000));
    timerEl.textContent = `${seconds}s`;
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
    turnIndicatorEl.textContent = 'GAME PAUSED';
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
        <span class="playerName">${escapeHtml(player.name)}</span>
        <span class="playerPoints">${player.score} pts</span>
      </div>
      <div class="matchedWords">
        ${player.stack.length === 0
          ? '<span class="muted">No matches yet</span>'
          : player.stack.map(m => `<div class="matchedWord">${escapeHtml(m.a)}</div>`).join('')
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
socket.on('match:animate', ({ cardIds, playerId }) => {
  matchSound();

  // Confetti
  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  }

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
