# Pattrn - AI Development Guide

## Project Overview
Pattrn is a pattern-matching puzzle game built with React + Vite. It features multiple puzzle modes, a virtual pet companion (Aggie), multiplayer co-op, and Firebase backend.

## Architecture

### Source Structure
```
src/
  constants/          # Pure data: no side effects, no imports from utils/
    theme.js          # Color palette (C, BASE_COLORS)
    shapes.jsx        # SVG shape render functions (SHAPES, themed variants)
    palettes.js       # Color palettes + buildColorMap()
    puzzleThemes.js   # Theme definitions + isThemeUnlocked()
    achievements.js   # Achievement definitions + computeAchievements()
    difficulties.js   # Mode/difficulty metadata

  utils/              # Pure functions: may import from constants/
    puzzles.js        # RNG, pattern generators, puzzle builders, PUZZLE_SETS
    storage.js        # localStorage load/save (progress, times, theme, etc.)
    helpers.js        # formatTime, parseToken, getShapeStroke, count helpers
    url.js            # URL param read/write (getSearchParams, updateUrl)
    auth.js           # Firebase auth error messages

  aggie/              # Virtual pet companion system
    constants.js      # Aggie data: accessories, shop items, traits, rewards
    state.js          # Aggie localStorage persistence (coins, happiness, etc.)
    renderer.jsx      # SVG rendering (renderAggieSVG, renderAccessoryPreview)
    speech.js         # Dialogue lines, mood-based speech, interaction data

  components/         # Standalone React components (no app state coupling)
    Cell.jsx          # Single puzzle grid cell
    TokenPicker.jsx   # Horizontal scrollable token selector
    Particles.jsx     # Win celebration particle burst
    GridDecoration.jsx# Theme-specific grid overlays (snow, bats, etc.)
    DraggableDrawer.jsx # Mobile bottom sheet
    AttemptDots.jsx   # Attempt indicator dots
    ScoreBadge.jsx    # Gold/Silver/Bronze badge
    PeerAggie.jsx     # Other player's Aggie in co-op
    AggieInteractionMenu.jsx # Aggie interaction popup

  vault/              # Vault mode (separate feature)
  Pattrn.jsx          # Main app component (~16k lines, contains views)
  firebase.js         # Firebase configuration and API
  main.jsx            # Entry point
```

### Key Patterns
- **No TypeScript** — project uses plain JSX
- **Inline styles** — no CSS modules or styled-components; all styles are inline
- **localStorage** — game progress, times, aggie state all persisted in localStorage
- **Firebase** — auth, cloud sync, co-op, mosaics, social features
- **Single main component** — `Pattrn()` manages all views via a `view` state variable

### Dependency Flow
```
constants/ → (no internal deps, only React for JSX)
utils/     → imports from constants/
aggie/     → imports from constants/, utils/
components/→ imports from constants/, utils/, aggie/
Pattrn.jsx → imports from all above + firebase.js + vault/
```

### Build & Dev
```bash
npm run dev      # Start dev server
npm run build    # Production build (Vite)
```

### Puzzle Modes
- **Easy**: 5x5, paired color+shape
- **Medium**: 7x7, paired, 3 tile types
- **Hard**: 7x7, independent color + shape patterns
- **Blind**: 5x5, all blank, wordle-style feedback
- **Daily**: One per day (UTC), 7x7
- **Cascade**: Progressive 3x3 → 9x9 runs
- **Spin**: 7x7 with periodic 90-degree rotation
- **Mosaic**: 25 puzzles forming a pixel art image

### Views in Pattrn.jsx
The main component uses `view` state to switch between:
- `null` (menu) → play mode → puzzle view
- `"profile"` → user profile + achievements
- `"gallery"` → community mosaic gallery
- `"creator"` → mosaic designer
- `"custom-mosaic"` → play custom mosaics
- `"coop"` → co-op puzzle sessions

### Future Refactoring Opportunities
- Extract views from Pattrn.jsx into separate components (MenuView, PlayView, etc.)
- The Context Button/FAB section (~5000 lines) could become its own component
- Create a React context for shared puzzle state to reduce prop drilling
