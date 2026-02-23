# Campaign Mode Implementation Plan

## Overview
A campaign mode with Pokemon-aesthetic pixel art, rendered on HTML5 Canvas. Procedurally generated dungeons where puzzles unlock doors and chests. Aggie accompanies you as an active party member who evolves and gains abilities through campaign progress.

---

## Phase 1: Foundation — Canvas Engine & Tile System
**Goal**: Get a pixel-art dungeon rendering on screen with player movement.

### 1a. Create `src/campaign/` directory structure
```
src/campaign/
  CampaignMode.jsx       # Top-level React component (view wrapper)
  engine/
    canvas.js             # Canvas setup, render loop, camera system
    tilemap.js            # Tile definitions, tileset management
    sprites.js            # Sprite sheet loader, frame animation
    input.js              # Keyboard + touch/swipe input handler
  generation/
    dungeon.js            # Procedural dungeon generator (BSP + rooms)
    rooms.js              # Room templates & connection logic
    placement.js          # Door, chest, trap, NPC placement
  data/
    chapters.js           # Chapter definitions (theme, floors, difficulty)
    tiles.js              # Tile type constants (wall, floor, door, chest, etc.)
    sprites.js            # Sprite sheet frame mappings
  state/
    campaignState.js      # Campaign progress persistence (localStorage)
    aggieEvolution.js     # Aggie leveling, XP, ability unlocks
  ui/
    CampaignHUD.jsx       # React overlay: HP, coins, minimap, Aggie status
    CampaignDialogue.jsx  # Text box overlay (Pokemon-style dialogue)
    CampaignPause.jsx     # Pause menu overlay
    PuzzleBridge.jsx      # Transition: dungeon → puzzle → dungeon
```

### 1b. Canvas rendering engine (`engine/canvas.js`)
- Create a `<canvas>` element sized to the game area
- Pixel-art rendering: `imageSmoothingEnabled = false`, integer scaling
- Camera system that follows the player with smooth lerp
- Render loop via `requestAnimationFrame`
- Layer system: ground tiles → objects → entities → effects
- Target: 16x16 pixel tiles, scaled 3x-4x depending on screen size
- Viewport: ~15x11 visible tiles (adjustable)

### 1c. Tile map system (`engine/tilemap.js`)
- Tile types: floor, wall, door-locked, door-open, chest-closed, chest-open, stairs-down, trap, water, decoration
- Each tile: `{ type, walkable, interactable, sprite, metadata }`
- Map stored as 2D array of tile IDs
- Tile animations (water shimmer, torch flicker) via frame cycling

### 1d. Sprite system (`engine/sprites.js`)
- Load sprite sheets as Image objects
- Frame-based animation: walk cycles (4 dir × 4 frames), idle, interact
- Entities: player character, Aggie, NPCs, chest sparkle
- Pixel-art sprite sheets generated inline as data URIs OR small PNG assets
- **For MVP**: Generate sprites programmatically using canvas drawing (similar to how Aggie is currently rendered in SVG, but rasterized to pixel art)

### 1e. Input handling (`engine/input.js`)
- Keyboard: WASD / arrow keys for movement
- Mobile: virtual d-pad overlay OR swipe gestures
- Tile-based movement (not free movement) — move one tile at a time
- Movement queue to handle rapid inputs
- Interaction key (Space/Enter/tap) for doors, chests, NPCs

---

## Phase 2: Procedural Dungeon Generation
**Goal**: Generate varied, interesting dungeon floors with rooms, corridors, and points of interest.

### 2a. Dungeon generator (`generation/dungeon.js`)
- Use seeded RNG (reuse existing `mulberry32` from `utils/puzzles.js`)
- Algorithm: Binary Space Partition (BSP) to carve rooms + corridors
- Floor size: 30×30 to 50×50 tiles (scales with chapter difficulty)
- Generate connected room graph ensuring all rooms reachable
- Guaranteed path from entrance (stairs-up) to exit (stairs-down)
- Seed derived from: `chapter_id * 1000 + floor_number` for determinism

### 2b. Room types & templates (`generation/rooms.js`)
- **Entry room**: Stairs up, safe zone, Aggie dialogue
- **Standard room**: 1-3 doors, possible enemies/traps
- **Puzzle room**: Locked door blocking path, must solve to proceed
- **Treasure room**: Chest(s) with rewards, behind optional puzzle door
- **Boss room**: Chapter-end encounter (harder puzzle + special mechanics)
- **Rest room**: Heal point, Aggie interaction, shop
- Room sizes: 5×5 to 9×9 (inner dimensions)

### 2c. Placement logic (`generation/placement.js`)
- **Doors**: Place on room connections. Critical-path doors always locked (puzzle required). Optional doors sometimes locked.
- **Chests**: Place in dead-end rooms, treasure rooms, hidden alcoves
  - Contains: coins, accessories, Aggie treats, evolution items
  - Chest puzzle difficulty scales with floor depth
- **Traps**: Floor tiles that trigger events (lose coins, harder puzzle modifier)
  - Aggie abilities can detect/disarm
- **Decorations**: Torches, cracks, moss, rubble — for atmosphere
- **NPCs**: Occasional hint-givers or merchants

---

## Phase 3: Puzzle Integration — The Core Loop
**Goal**: Doors and chests trigger Pattrn puzzles. Solving them progresses the dungeon.

### 3a. Puzzle bridge (`ui/PuzzleBridge.jsx`)
- When player interacts with locked door/chest:
  1. Freeze dungeon, show transition animation (screen wipe)
  2. Generate puzzle based on context:
     - Door puzzles: difficulty based on floor depth + critical path importance
     - Chest puzzles: slightly easier, optional
     - Boss puzzles: unique constraints (timer, limited attempts, larger grid)
  3. Transition to existing puzzle play view (`setView("play")`)
  4. On solve: return to dungeon, door opens / chest opens
  5. On fail: door stays locked, can retry (costs HP or has cooldown)

### 3b. Campaign puzzle generation
- Reuse existing `buildEasyPuzzles`, `buildMediumPuzzles`, `buildHardPuzzles` generators
- Difficulty mapping per floor:
  - Floors 1-2: Easy (5×5)
  - Floors 3-4: Medium (7×7 paired)
  - Floor 5+: Hard (7×7 mixed)
  - Boss floors: Hard + constraints
- Seed puzzles from dungeon seed + door position for determinism
- Track per-door solve state in campaign progress

### 3c. Puzzle modifiers (campaign-specific)
- **Timed**: Countdown timer (trap rooms, boss encounters)
- **Limited attempts**: Only 2-3 tries before lockout
- **Fog**: Only see adjacent cells (like blind mode, partial reveal)
- **Aggie assist**: If Aggie has abilities, can reveal a tile or get hint

---

## Phase 4: Aggie Evolution System
**Goal**: Aggie levels up, gains abilities, and visually evolves through campaign.

### 4a. XP & leveling (`state/aggieEvolution.js`)
- Separate campaign XP system (doesn't replace existing coins/happiness)
- XP sources:
  - Solve door puzzle: 10-30 XP (based on difficulty + attempts)
  - Open chest: 5-15 XP
  - Complete floor: 50 XP
  - Complete chapter: 200 XP
  - Gold solve (first try): 2× XP bonus
- Level thresholds: `level_n = 50 * n * (n + 1) / 2` (50, 150, 300, 500, ...)
- Max level: 20 (for MVP)

### 4b. Abilities (unlocked at level milestones)
- **Lv 2 — Scout**: Reveal room layout before entering (minimap enhancement)
- **Lv 4 — Hint Whisper**: Free hint on one puzzle per floor
- **Lv 7 — Trap Sense**: Aggie warns when trap tile is adjacent
- **Lv 10 — Tile Peek**: Reveal one hidden tile in a puzzle for free
- **Lv 13 — Shield**: Block one failed puzzle attempt (no HP loss), once per floor
- **Lv 16 — Treasure Nose**: Highlight chest rooms on minimap
- **Lv 20 — Master Key**: Skip one non-boss puzzle per chapter
- Abilities have cooldowns (per-floor or per-chapter) to stay balanced
- Stored in localStorage alongside campaign progress

### 4c. Visual evolution
- Aggie's pixel-art sprite changes at key levels:
  - **Lv 1-4 (Hatchling)**: Small blob, single color, basic eyes
  - **Lv 5-9 (Sprout)**: Slightly larger, small tendrils/appendages, brighter eyes
  - **Lv 10-14 (Guardian)**: Medium size, glowing aura, defined features
  - **Lv 15-19 (Sage)**: Larger, ornate markings, wisdom aura
  - **Lv 20 (Ascended)**: Full glow, cosmic patterns, crown-like features
- Render these as canvas sprite variations (programmatic drawing)
- Evolution animation when leveling up (flash + transform)
- Evolved forms visible in main game Aggie display too (cosmetic prestige)

### 4d. Aggie campaign dialogue
- Context-aware speech:
  - Entering new floor: "I sense puzzles ahead..."
  - Near locked door: "This door needs solving!"
  - Near trap: "Watch your step!" (if Trap Sense unlocked)
  - After solving: Mood-appropriate celebration
  - Boss room: "This is it... the final puzzle!"
- Use existing happiness/mood system to flavor dialogue
- Dialogue shown in Pokemon-style text box at bottom of screen

---

## Phase 5: Campaign State & Progression
**Goal**: Persist campaign progress, integrate with existing systems.

### 5a. Campaign state structure (`state/campaignState.js`)
```javascript
// localStorage key: "pattrn-campaign-v1"
{
  currentChapter: 0,
  currentFloor: 2,
  chapters: {
    0: {
      unlocked: true,
      completed: false,
      bestTime: null,
      floors: {
        0: { completed: true, doors: { "5-3": { solved: true, attempts: 1 }, ... }, chests: { "8-6": true }, time: 145 },
        1: { completed: true, ... },
        2: { completed: false, doors: {}, chests: {}, time: 0 },
      }
    }
  },
  aggie: {
    level: 7,
    xp: 340,
    totalXp: 340,
    abilities: ["scout", "hint_whisper", "trap_sense"],
    evolutionStage: "sprout",
    abilityCooldowns: { hint_whisper: 0, shield: 1 },
  },
  inventory: {
    coins: 150,       // campaign coins (separate from main game coins? or shared?)
    keys: 2,          // optional: skeleton keys to skip a puzzle
    potions: 1,       // restore HP / retry
  },
  stats: {
    totalPuzzlesSolved: 34,
    totalChestsOpened: 12,
    totalFloorsCleared: 7,
    fastestFloor: 89,
  }
}
```

### 5b. Integration with existing progress
- Add `campaign` key to existing `loadProgress()` / `saveProgress()` in `utils/storage.js`
- Campaign puzzle solves count toward main game achievements
- Campaign coins optionally shared with (or converted to) main Aggie coins
- Campaign mode appears in profile stats

### 5c. Chapter definitions (`data/chapters.js`)
```javascript
export const CAMPAIGN_CHAPTERS = [
  {
    id: 0,
    name: "The Pattern Caves",
    desc: "Ancient caves filled with puzzle-locked doors",
    theme: "cave",        // Tileset theme
    floors: 5,
    difficulty: [1, 1, 2, 2, 3],  // per-floor: 1=easy, 2=medium, 3=hard
    bossFloor: 4,
    tilesetColors: { wall: "#2a1f3d", floor: "#1a1428", accent: "#7c5cbf" },
    unlock: null,  // First chapter always unlocked
  },
  {
    id: 1,
    name: "Neon Labyrinth",
    desc: "A glowing maze of electric puzzles",
    theme: "neon",
    floors: 6,
    difficulty: [2, 2, 2, 3, 3, 3],
    bossFloor: 5,
    tilesetColors: { wall: "#0a0a2e", floor: "#05051a", accent: "#ff0080" },
    unlock: { chapter: 0 },  // Complete chapter 0
  },
  {
    id: 2,
    name: "The Forgotten Tower",
    desc: "Climb the tower of lost patterns",
    theme: "tower",
    floors: 7,
    difficulty: [2, 2, 3, 3, 3, 3, 3],
    bossFloor: 6,
    tilesetColors: { wall: "#1a2a1a", floor: "#0f1a0f", accent: "#4ade80" },
    unlock: { chapter: 1 },
  },
  // ... more chapters added over time
];
```

---

## Phase 6: UI & HUD
**Goal**: React overlays on top of the canvas for HUD, dialogue, menus.

### 6a. Campaign HUD (`ui/CampaignHUD.jsx`)
- Rendered as React absolutely-positioned over the canvas
- Shows: floor number, coin count, Aggie HP/level, minimap toggle
- Minimap: small top-right overlay showing explored rooms
- Ability bar: bottom or side, shows available Aggie abilities with cooldown indicators
- Style: pixel-art border frames, retro font (Press Start 2P or similar)

### 6b. Dialogue system (`ui/CampaignDialogue.jsx`)
- Pokemon-style text box at bottom of screen
- Character-by-character text reveal (typewriter effect)
- Tap/click to advance or speed up
- Portrait: Aggie's current evolution stage
- Used for: room entry flavor text, Aggie comments, NPC dialogue, puzzle intro

### 6c. Puzzle transition (`ui/PuzzleBridge.jsx`)
- Screen wipe animation (black bars slide in)
- Brief context card: "Locked Door — Solve to proceed" with difficulty indicator
- Transitions to existing puzzle view
- On return: reverse wipe, door/chest opens with animation
- Sound effect cues (if audio is ever added)

### 6d. Pause menu (`ui/CampaignPause.jsx`)
- Accessible via Escape / pause button
- Options: Resume, Aggie Status, Inventory, Quit to Menu
- Aggie Status: shows level, XP bar, abilities, evolution stage
- Inventory: keys, potions, collected items

---

## Phase 7: Integration with Pattrn.jsx
**Goal**: Wire campaign mode into the main app's view system.

### 7a. Add campaign view
```javascript
// In Pattrn.jsx
if (view === "campaign") {
  return <CampaignMode
    progress={progress}
    times={times}
    onStartPuzzle={(puzzle, context) => {
      setCampaignPuzzleContext(context);
      setDifficulty("campaign");
      startPuzzle(puzzle.id, "campaign", false);
    }}
    onPuzzleSolved={(context, attempts, time) => {
      // Update campaign state, return to dungeon
    }}
    onExit={() => setView("menu")}
    aggieState={aggieState}
    C={C}
  />;
}
```

### 7b. Add to menu
- New campaign card on main menu (similar to daily hero card)
- Shows: current chapter, floor progress, Aggie level
- "Continue" and "New Game" buttons
- Locked chapters show unlock requirements

### 7c. Add to difficulties
```javascript
// In constants/difficulties.js
{ key: "campaign", label: "Glyphwalk", desc: "Adventure", cat: "adventure", icon: "map" }
```

### 7d. Add to Aggie rewards
```javascript
// In aggie/constants.js - COINS_REWARD
campaign: 15,  // per puzzle solve in campaign
```

### 7e. Achievement integration
- New campaign achievements:
  - "First Steps" — Complete first campaign floor
  - "Chapter Closed" — Complete a full chapter
  - "Aggie Evolved" — Reach Aggie evolution stage 2
  - "Master Explorer" — Open all chests on a floor
  - "Speed Runner" — Complete a floor in under 3 minutes
  - "Campaign Complete" — Finish all available chapters

---

## Phase 8: Polish & Pixel Art
**Goal**: Make it look and feel like a Pokemon/retro RPG.

### 8a. Tileset art style
- 16×16 base tile size, rendered at 3-4× scale
- Dark dungeon palette per chapter theme
- Wall tiles with depth/shadow (top face darker)
- Floor tiles with subtle texture variation
- Door tiles: wooden with iron bands, glowing lock symbol when locked
- Chest tiles: wooden chest, golden sparkle when unopened
- Stairs: spiral staircase descending into darkness

### 8b. Character sprites
- Player character: simple 16×16 sprite, 4-direction walk cycle
- Aggie: custom pixel-art version of each evolution stage
  - Follows 1 tile behind player
  - Bobbing idle animation
  - Reaction sprites (surprise, happy, worried)
- NPCs: simple shopkeeper, mysterious figure, etc.

### 8c. Effects & animation
- Door unlock: glow effect, lock shatters into particles
- Chest open: lid flips, sparkle burst, item floats up
- Floor transition: stairs descent animation, floor counter
- Puzzle transition: screen wipe with pattern motif
- Aggie level up: flash white, particles, evolution morph
- Torch/light flicker on wall tiles

### 8d. Retro UI styling
- Pixel-art border frames for UI panels
- Retro font: "Press Start 2P" (Google Fonts, free)
- Item icons: 16×16 pixel art
- HP bar: chunky segmented bar
- XP bar: thin bar under Aggie portrait
- Menu cursor: animated arrow bouncing

---

## Implementation Order (Recommended)

1. **Phase 1a-1c**: Directory structure, canvas engine, tile map (get something rendering)
2. **Phase 2a-2b**: Procedural dungeon generation (see rooms on screen)
3. **Phase 1d-1e**: Sprites + input (player walks around the dungeon)
4. **Phase 3a-3b**: Puzzle integration (doors trigger puzzles, solving opens them)
5. **Phase 5a-5c**: Campaign state persistence (save/load progress)
6. **Phase 7a-7e**: Main app integration (menu entry, view wiring)
7. **Phase 4a-4b**: Aggie XP, leveling, abilities
8. **Phase 6a-6d**: HUD, dialogue, pause menu
9. **Phase 4c-4d**: Aggie visual evolution + campaign dialogue
10. **Phase 3c**: Puzzle modifiers (timed, limited, fog)
11. **Phase 8**: Polish, full tileset art, effects, retro font

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | HTML5 Canvas (raw) | No new deps, full control, pixel-perfect rendering |
| Tile size | 16×16 px | Classic Pokemon/RPG standard, scales well |
| Dungeon gen | BSP + seeded RNG | Deterministic, reusable RNG from existing codebase |
| State | localStorage | Consistent with all existing game state |
| Sprites | Programmatic canvas drawing | No asset loading needed for MVP, can add PNGs later |
| Font | Press Start 2P (Google Fonts) | Free, authentic retro feel |
| Aggie pixel art | Canvas-drawn variants | Each evolution stage drawn programmatically |
| React integration | Canvas + React overlay | Canvas for game world, React for UI/HUD/menus |

---

## Files to Modify (Existing)

1. `src/constants/difficulties.js` — Add campaign mode
2. `src/utils/storage.js` — Add campaign progress load/save
3. `src/aggie/constants.js` — Add campaign coin rewards, desires
4. `src/constants/achievements.js` — Add campaign achievements
5. `src/Pattrn.jsx` — Add campaign view routing, menu card, state
6. `src/firebase.js` — Add campaign data to cloud sync (if needed)

## New Files to Create

~20 new files in `src/campaign/` as outlined in Phase 1a.
