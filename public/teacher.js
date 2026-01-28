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
