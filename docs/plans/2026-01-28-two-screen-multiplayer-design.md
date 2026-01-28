# Two-Screen Multiplayer Matching Game Design

## Overview

Transform the current single-page matching game into a two-screen classroom experience:
- **Teacher Screen** (`/teacher`) - Setup and control panel
- **Game Screen** (`/game?room=CODE`) - Student-facing touchscreen display

The teacher controls the game from one tab while students interact with the game board on a shared classroom touchscreen in another tab.

## Use Case

A teacher projects/shares the Game Screen to a classroom touchscreen. Students take turns physically tapping cards on the touchscreen. The teacher manages word decks, student rosters, and game flow from their own device or a separate browser tab.

---

## Teacher Screen (`/teacher`)

### Room Management
- Create room with auto-generated code (e.g., "MATH3")
- Set optional PIN for security
- Set turn timer (5-120 seconds, default 20)

### Word Deck Management
- Text area to enter word pairs (format: `word,match` per line)
- Save decks with custom names (e.g., "Sight Words Week 1")
- Load saved decks from dropdown
- Delete decks no longer needed
- Stored in browser localStorage

### Student/Team Roster Management
- Text area to enter player names (one per line)
- Save rosters with custom names (e.g., "Period 2")
- Load saved rosters from dropdown
- Players added to game in order listed
- Stored in browser localStorage

### Game Controls
- **Start Game** - Begins with loaded deck and roster
- **New Round** - Reshuffles deck, resets scores
- **Pause/Resume** - Freeze game if needed
- Live view of current scores and game state

---

## Game Screen (`/game?room=CODE`)

### Layout (optimized for touchscreen)
- **Top bar**: Room code, turn timer countdown
- **Center**: Card grid with large, touch-friendly buttons
- **Right sidebar**: Scoreboard with all players

### Turn Indicator
- Large, prominent display: "SCOTT'S TURN!"
- Player's name pulses/glows when active
- Clear visual so students know who taps next

### Scoreboard
- Each player displayed as a card/panel
- Shows: name, points, matched words underneath
- Current player's panel highlighted
- Matched words appear under the player who matched them

### Match Celebration
- Matched cards animate/fly toward player's score panel
- Player's name flashes with celebration color
- Confetti burst
- Sound effect (match chime)
- "+2" points appears briefly

### Restrictions
- No setup controls visible
- Students can only tap cards during their turn
- All game control happens from Teacher Screen

---

## Technical Implementation

### New Files
```
public/
  teacher.html      # Teacher control panel markup
  teacher.js        # Teacher screen logic
  game.html         # Student game view markup
  game.js           # Game screen logic
  shared.css        # Shared styles (extracted from style.css)
```

### Server Changes (`server.js`)

1. **Roster-based players**: Teacher sends player names; server creates players without requiring socket connections from each student

2. **New events**:
   - `room:create` - Teacher creates room, returns room code
   - `room:setRoster` - Teacher sets player names
   - `room:setDeck` - Teacher sets word pairs
   - `game:pause` / `game:resume` - Pause/resume game
   - `game:screen:join` - Game screen connects to room (view-only for setup, interactive for card flips)

3. **Modified game flow**:
   - Players exist without socket IDs (teacher-defined)
   - Game screen handles card flips on behalf of current player
   - Turn advancement automatic on timer or after flip

### localStorage Structure

```javascript
// Saved word decks
localStorage.matchingGame_decks = JSON.stringify([
  {
    name: "Sight Words Week 1",
    pairs: [
      { a: "kite", b: "kite" },
      { a: "tree", b: "tree" }
    ]
  }
])

// Saved rosters
localStorage.matchingGame_rosters = JSON.stringify([
  {
    name: "Period 2",
    players: ["Scott", "Emma", "Jake"]
  }
])
```

### Existing Code Reuse
- Card deck creation logic (`makeDeck`)
- Turn timer logic
- Match detection logic
- Room sanitization helpers
- Sound effects and confetti

---

## Migration Path

1. Keep `index.html` as landing page with links to `/teacher` and `/game`
2. Existing game logic in `server.js` largely reusable
3. Extract shared styles to `shared.css`
4. Old single-page flow remains functional for backward compatibility

---

## Out of Scope (Future Enhancements)

- Server-side persistence (database)
- Multiple simultaneous games per teacher
- Remote student devices (each student on own device)
- Game history/statistics
- Export game results

---

## Success Criteria

1. Teacher can save/load word decks and rosters
2. Teacher and game screens sync in real-time
3. Students see clear turn indicators on touchscreen
4. Match celebrations are prominent and engaging
5. No setup controls visible on student-facing screen
