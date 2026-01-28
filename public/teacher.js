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
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    return true;
  } catch (error) {
    console.error('Failed to save decks:', error);
    return false;
  }
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
  try {
    localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters));
    return true;
  } catch (error) {
    console.error('Failed to save rosters:', error);
    return false;
  }
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
  if (!select) return;
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
  if (!select) return;
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