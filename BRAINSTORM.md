# Pattrn - Game Feature Brainstorm

## New Game Modes

### 1. Versus (Multiplayer)
Two players race to solve the same puzzle simultaneously. Both see the same grid and pattern, and the first to correctly fill all blanks wins. Could work as:
- **Local**: Split-screen on one device, each player gets half the screen
- **Async**: Share a puzzle link; both players solve it and compare times/attempts after
- **Live**: Real-time via WebSocket, see opponent's progress as a small ghost grid

### 2. Zen / Infinite
An endless, no-pressure mode with no attempt limits and no timer. Puzzles get progressively harder (grid size slowly increases, more blanks, more complex patterns). No scoring - just a peaceful way to play. Could include ambient background color shifts and softer animations.

### 3. Speed Run
A timed gauntlet of 5 puzzles (randomized from easy to hard). Total time is your score. Leaderboard-worthy. Each puzzle auto-advances on correct solve. Wrong answers add a time penalty (e.g., +5 seconds) instead of costing an attempt. Great for competitive players who've mastered the existing modes.

### 4. Reverse / Creator
Instead of filling blanks, the player is shown a completed grid and must **identify which pattern rule** generated it (from a multiple-choice list). Flips the cognitive challenge - instead of pattern application, it's pattern recognition and naming. Could also have a variant where the player *creates* a pattern and the game checks if it's valid/consistent.

### 5. Fog of War
Like Medium/Hard but the grid is mostly hidden. Cells only reveal themselves in a small radius around cells you've already correctly filled. You start with a few "seed" cells visible and must work outward. Creates a satisfying expanding-island feel. Wrong guesses don't reveal anything.

### 6. Mutation
Start with a solved grid. Every few seconds, one cell "mutates" (changes to a wrong value). The player must spot and fix mutations before too many accumulate. If more than N cells are wrong at any point, you lose. Tests quick pattern recall and vigilance rather than deduction.

### 7. Mirror
A 2-phase puzzle: Phase 1 shows you a completed pattern for a limited time (say 5-10 seconds). Phase 2 blanks the entire grid and you must recreate it from memory. Smaller grids (3x3, 4x4) to keep it fair. A memory challenge layered on top of pattern recognition.

### 8. Duel (Asymmetric)
One player places blanks on a completed grid (choosing which cells to hide), the other player tries to solve it. The "blanker" scores points for puzzles the solver fails; the solver scores for ones they crack. Could work as pass-and-play on one device.

---

## New Features for Existing Modes

### 9. Hints System
Spend a "hint token" to reveal one cell. Earn hint tokens by completing puzzles with gold medals, or watch a short wait timer. Using a hint disqualifies gold medal for that puzzle but still allows silver/bronze. Gives players a lifeline without removing challenge.

### 10. Undo Button
Allow undoing the last placed tile (or last N tiles). Simple quality-of-life improvement. Doesn't affect scoring. Especially useful on mobile where mis-taps happen during drag-to-paint.

### 11. Custom Color Themes
Let players choose from additional color palettes or even a light mode. Could unlock palettes by reaching milestones (e.g., 10 golds unlocks "Ocean", 25 golds unlocks "Sunset"). Gives a sense of progression beyond just puzzle completion.

### 12. Weekly Challenge
Like Daily but drops once a week with a much harder puzzle (9x9 or 10x10 grid, complex pattern, limited attempts). A community event - show how many players worldwide solved it. Could display a global solve-rate percentage.

### 13. Achievements / Badges
Trackable milestones that give players goals beyond individual puzzles:
- "First Steps" - Complete your first puzzle
- "Streak Master" - 30-day daily streak
- "Perfectionist" - Gold medal on all 50 Easy puzzles
- "Speed Demon" - Solve any puzzle in under 10 seconds
- "Blind Faith" - Complete all 50 Blind puzzles
- "Cascader" - Clear all 10 levels in a single Cascade run
- "No Mistakes" - Solve a Hard puzzle on the first attempt

### 14. Puzzle of the Week Replay
Archive notable daily puzzles that were particularly clever or tricky. A curated "best of" collection that players can revisit anytime, separate from the regular daily rotation.

### 15. Ghost Replay
After solving a puzzle, watch an animated replay of your solve path (which cells you filled in what order). Could also show an "optimal" solve path. Satisfying to watch and educational for improving strategy.

### 16. Streaks & XP System
Award XP for each puzzle solved (more for harder modes, bonuses for gold medals). Level up over time. Display a player level on the menu screen. Doesn't gate any content - purely cosmetic progression that rewards consistent play.

### 17. Colorblind Accessibility Mode
Add optional letter/number labels inside each shape to distinguish colors without relying on hue alone. Important for accessibility and expands the potential player base.

---

## Wild / Experimental Ideas

### 18. Audio Mode
Each tile type maps to a musical note/instrument. The completed pattern plays a melody. Wrong cells create dissonance. Players can "hear" when something is off. The win celebration plays the full harmonious pattern.

### 19. 3D Pattrn
A cube where each face is a small pattern grid. Patterns wrap around edges. Rotate the cube to see all faces. Dramatically harder but visually striking. Could be a special unlockable mode.

### 20. Collaborative Daily
The daily puzzle but with a massive grid (e.g., 15x15). Each player can only fill in 5 cells per day. The community collectively solves it. Shows a live heatmap of which cells have been attempted most.
