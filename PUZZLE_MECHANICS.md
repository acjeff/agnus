# Pattrn — Core Puzzle Mechanics Specification

A complete description of the puzzle game mechanics, suitable for reimplementation in any framework or engine.

---

## 1. Concept

Pattrn is a **pattern-recognition puzzle game**. The player is presented with a grid of colored tiles, each containing a shape. Some tiles are filled in (given as clues); the rest are blank. The player must deduce the underlying mathematical pattern and fill in every blank tile with the correct color+shape combination.

---

## 2. Tokens

A **token** is the fundamental unit of the game. Each token is a combination of:

- **Color**: A hex color value (e.g., `#FF6B6B`)
- **Shape**: One of 7 outline shapes drawn on top of the color

### The 7 Base Shapes

| Index | Shape        | Description                          |
|-------|-------------|--------------------------------------|
| 0     | Circle       | Simple circle outline                |
| 1     | Diamond      | Rotated square / rhombus             |
| 2     | Triangle     | Equilateral triangle pointing up     |
| 3     | Cross/Plus   | Two perpendicular lines              |
| 4     | Square       | Square outline                       |
| 5     | Star         | 5-pointed star outline               |
| 6     | Pentagram    | 5-pointed star drawn with one stroke |

### Token Rendering

Each cell in the grid renders a token as:
- **Background**: Filled with the token's color
- **Foreground**: The shape drawn as an outline (stroke only, no fill) centered in the cell
- **Shape stroke color**: White on dark backgrounds, dark on light backgrounds (determined by the color's luminance)

### Color Palettes

Colors come from predefined 5-color palettes. Each puzzle randomly selects one palette and shuffles it. Example palette: `["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#FF9FF3"]`.

---

## 3. Grid & Cell States

### Grid Sizes

- **5x5** (25 cells) — used by Easy, Blind, Mosaic
- **7x7** (49 cells) — used by Medium, Hard, Daily, Spin
- **Variable** (3x3 through 9x9) — used by Cascade

### Cell Types

Every cell is one of two types:

1. **Given (Prefilled)**: Displays the correct token. Cannot be modified by the player. Rendered with reduced opacity (45%) and a dashed border to distinguish from player-placed tiles.

2. **Blank**: Empty cell the player must fill. Rendered with a dashed border, transparent background, and no shape. Becomes filled when the player places a token.

### Player-Filled Cell States

A blank cell can be in these states:
- **Empty**: No token placed yet (dashed border, transparent)
- **Filled**: Player has placed a token (colored background + shape visible)
- **Correct** (Blind mode only): Confirmed correct, locked in with a green glow
- **Wrong** (after checking): Shown with a red border and glow, then cleared

---

## 4. Solution Generation

Every puzzle has a **solution grid** — a 2D array where each cell contains the correct token. Solutions are generated deterministically from a seed using a seeded pseudo-random number generator (LCG: `s = (s * 16807) % 2147483647`).

### Pattern Generators

The solution grid is created by applying a **mathematical pattern function** to an array of token indices. There are 30 pattern generators:

| # | Name | Description |
|---|------|-------------|
| 0 | Horizontal stripes | Columns repeat in a cycle |
| 1 | Vertical stripes | Rows repeat in a cycle |
| 2 | Diagonal stripes | `(row + col) % n` |
| 3 | Anti-diagonal stripes | `(row + lastCol - col) % n` |
| 4 | Checkerboard | `(row + col) % 2` — always 2 tokens |
| 5 | Horizontal mirror | Symmetrical left-right |
| 6 | Vertical mirror | Symmetrical top-bottom |
| 7 | Concentric squares | Rings from center outward |
| 8 | Diamond distance | Manhattan distance from center |
| 9 | Cross | Center row + center column differ from rest — always 2 tokens |
| 10 | X pattern | Both diagonals differ from rest — always 2 tokens |
| 11 | Border | Edge cells differ from interior — always 2 tokens |
| 12 | Quadrants | Each corner quadrant gets a different token — always 4 tokens |
| 13 | Spiral offset | Row-major with row-based offset |
| 14 | Alternating row bands | 2-row bands with alternating checkerboard — always 2 tokens |
| 15 | Double mirror | Symmetrical on both axes |
| 16 | Radial | Euclidean distance from center |
| 17 | Pinwheel | Angle-based sectors from center |
| 18 | Zigzag rows | Even rows left-to-right, odd rows right-to-left |
| 19 | Corner gradient | Diagonal gradient from top-left |
| 20 | Chevron (vertical) | V-shaped bands pointing down from top center |
| 21 | Brick stagger | Offset every other row (brick wall pattern) |
| 22 | Sine wave (vertical) | Wavy vertical bands via sinusoidal row offset |
| 23 | Diagonal blocks | 2x2 block diagonal pattern |
| 24 | XOR fractal | `(row XOR col) % n` — Sierpinski-like |
| 25 | Corner layers | L-shaped layers from top-left corner |
| 26 | Wide staircase | Thick diagonal step bands |
| 27 | Steep diagonal | `(row*2 + col) % n` |
| 28 | Horizontal chevron | V-shaped bands pointing right from left center |
| 29 | Wave rows | Wavy horizontal bands via sinusoidal column offset |

### Generator Selection

Generators are selected randomly using weighted probabilities:
- **Low weight (1)**: Stripe patterns (too simple)
- **Medium weight (2-3)**: Cross, X, border, spiral, zigzag, brick, etc.
- **High weight (3-4)**: Mirror, concentric, diamond, radial, pinwheel, chevron, sine — visually interesting and appropriately challenging

Some generators only support 2 tokens (checkerboard, cross, X, border, alternating bands). One generator (quadrants) always uses exactly 4 tokens. The rest support variable numbers (2-4).

### Token Assignment

Each pattern generator produces a grid of **indices** (e.g., 0, 1, 2). These indices are mapped to tokens:

**Paired mode** (Easy, Medium, Blind, Daily, Cascade, Spin):
- Index `i` maps to color `palette[i]` AND shape index `i`
- Color and shape are always paired: if you see red-circle, red always means circle
- Token string: `"#FF6B6B|0"` (color `palette[0]`, shape `0`)

**Independent mode** (Hard):
- Two separate patterns are generated: one for colors, one for shapes
- Color pattern uses the palette colors directly
- Shape pattern uses shape indices
- The two patterns are overlaid: cell gets `colorGrid[r][c]` + `shapeGrid[r][c]`
- Same color can appear with different shapes; same shape can appear with different colors
- Creates many more unique token combinations

---

## 5. Blank Selection

After generating the solution, a subset of cells are marked as blanks:

1. All cell coordinates are listed
2. The list is shuffled (using the seeded RNG)
3. The first `N` cells become blanks

**Number of blanks by mode:**

| Mode | Grid | Blank Count | Formula |
|------|------|-------------|---------|
| Easy | 5x5 | 4–10 | `min(4 + floor(puzzleIndex / 5), 10)` |
| Medium | 7x7 | 10–24 | `min(10 + floor(puzzleIndex / 3), 24)` |
| Hard | 7x7 | 20–28 | `min(20 + floor(puzzleIndex / 4), 28)` |
| Blind | 5x5 | 25 (all) | Every cell is blank |
| Daily | 7x7 | 14 | Fixed |
| Cascade | varies | 25% of grid | `max(1, floor(gridSize^2 * 0.25))` |
| Spin | 7x7 | 10–24 | Same as Medium |
| Mosaic | 5x5 | 4–12 | Per tile |

Note: Blank count increases with puzzle index in Easy, Medium, Hard, and Spin, making later puzzles more challenging.

---

## 6. Player Interaction

### Token Picker

A horizontal scrollable bar at the bottom of the screen displays all tokens used in the current puzzle's solution (`usedTokens`). The player taps a token to select it as their "brush."

**Remaining counts** (non-Hard modes): Each token in the picker shows a badge indicating how many more times it needs to be placed. This count equals `(total occurrences in blank cells) - (times already placed by the player)`. When a token's count reaches 0, it grays out. The selection auto-advances to the next available token.

**Hard mode exception**: Token counts are not shown and tokens are unlimited. The player can place any token any number of times.

### Placing Tokens

- **Tap a blank cell**: Places the currently selected token
- **Tap a filled blank cell with the same token**: Removes it
- **Tap a filled blank cell with a different token**: Replaces it (swap)
- **Click-drag across cells**: "Painting" mode — places the selected token in every blank cell the pointer crosses
- **Tap a given/prefilled cell**: No effect (locked)

### Submitting / Checking

**Standard modes** (Easy, Medium, Hard, Daily, Spin, Cascade):
- The game automatically checks the solution when the player has filled all blank cells (or the player can trigger a check)
- Each blank cell is compared to the solution: `playerFill[row][col] === solution[row][col]`
- If ALL blanks match: **Win**
- If ANY are wrong: wrong cells flash red and fall off, attempt counter increments, player can try again

**Blind mode** (Wordle-style):
1. Player fills all 25 blank cells
2. Player taps "Lock In" to submit
3. Correct cells lock in place (green glow, can't be changed)
4. Wrong cells flash red and are cleared
5. Player re-fills the remaining unlocked cells and submits again
6. Repeat until all cells are locked correct, or attempts run out

---

## 7. Attempts & Scoring

### Attempt System

- Attempts start at 0
- Each failed check increments attempts by 1
- Maximum attempts before game over:

| Mode | Max Attempts |
|------|-------------|
| Easy, Medium, Hard, Daily, Spin | 5 |
| Blind | 6 |
| Cascade | 5 (shared across all levels in a run) |

### Score Badges

Awarded based on number of wrong attempts before solving:

| Badge | Attempts Used | Description |
|-------|--------------|-------------|
| Gold | 0 (first try) | Solved perfectly on the first check |
| Silver | 1 | One wrong attempt |
| Bronze | 2–3 | Multiple wrong attempts |
| No badge | 4+ | Solved but struggled |
| Game Over | 5 (or 6 for Blind) | Failed — puzzle resets |

### Attempt Dots

A visual indicator showing 5-6 small circles:
- Empty circles = attempts remaining
- Filled circles = attempts used
- The most recent dot is colored green (if won) or red (if wrong)

---

## 8. Game Modes

### Easy (5x5, Paired Tokens)
- Grid: 5x5
- Tokens: 2-3 distinct tokens, color+shape always paired
- Blanks: 4-10 (increases with puzzle index)
- Pattern generators: All 30 available (including simple stripes)
- Token counts: Shown and limited
- Good for: Learning the pattern mechanics

### Medium (7x7, Paired Tokens)
- Grid: 7x7
- Tokens: Always 3 distinct tokens, paired
- Blanks: 10-24 (increases with puzzle index)
- Pattern generators: Stripes and 2-token generators excluded
- Token counts: Shown and limited
- The standard difficulty

### Hard (7x7, Independent Color+Shape)
- Grid: 7x7
- Tokens: 2-4 colors x 2-4 shapes, independently patterned
- Blanks: 20-28 (increases with puzzle index)
- Key difference: Color and shape follow DIFFERENT patterns overlaid on each other
- Token counts: NOT shown; unlimited placement
- Much harder because you can't rely on "red = circle" — red might be circle in one area and triangle in another

### Blind (5x5, All Blank, Wordle-Style)
- Grid: 5x5
- Tokens: 3-4 distinct tokens, paired
- Blanks: ALL 25 cells (no clues given at all)
- Pattern generators: Only those supporting 3+ tokens, no stripes
- Feedback: Wordle-style — correct cells lock in, wrong cells reset
- Max attempts: 6
- Pure deduction through trial and error

### Daily (7x7, One Per Day)
- Grid: 7x7
- Tokens: 3 paired tokens
- Blanks: Fixed at 14
- Seed: Derived from UTC date (same puzzle for all players on a given day)
- Same mechanics as Medium
- Supports streaks (consecutive days solved)

### Cascade (Progressive 3x3 → 9x9)
- 10 levels per run: 3x3, 3x3, 4x4, 4x4, 5x5, 5x5, 6x6, 7x7, 8x8, 9x9
- Tokens: Up to 3 per level, paired
- Blanks: 25% of grid per level
- Attempts: 5 total shared across ALL levels in a run
- Win a level → auto-advance to next
- Fail → run ends, best level recorded
- 50 unique runs available

### Spin (7x7, Rotating Grid)
- Same base mechanics as Medium (7x7, 3 paired tokens, 10-24 blanks)
- Key twist: The entire grid visually rotates 90 degrees at regular intervals
- Rotation interval: 10 seconds for early puzzles, decreasing to 5 seconds for later ones
- Rotation is purely visual — the solution positions don't change, but spatial reasoning becomes harder as the grid spins

### Mosaic (25 Tiled 5x5 Puzzles)
- 25 separate 5x5 puzzles arranged in a 5x5 meta-grid
- Together they form a 25x25 pixel art image (a dog)
- Each puzzle uses Easy-like mechanics
- Pixel art is encoded as indices (0=background, 1=body, 2=detail) mapped to palette colors
- Can be played solo or cooperatively
- Community members can create custom mosaic designs

---

## 9. The Solving Experience

### What Makes Puzzles Solvable

1. **Visual pattern recognition**: The given (prefilled) cells reveal parts of the underlying mathematical pattern. Players look for repeating structures — stripes, symmetry, concentric rings, gradients — and extend them into blank areas.

2. **Token count deduction** (non-Hard modes): The remaining-count badges tell you exactly how many of each token are still needed. If only one blank is left and one token has a count of 1, the answer is determined.

3. **Process of elimination**: As blanks are filled, the remaining counts narrow possibilities. Near the end of a puzzle, many blanks have only one valid option.

4. **Spatial reasoning**: Understanding how patterns tile across a grid — does this stripe continue? Does this mirror reflect here? — is the core skill.

### What Makes It Challenging

1. **Ambiguity**: Early in a puzzle, multiple patterns might explain the given cells. The player must consider which pattern fits ALL the clues.

2. **Overlapping patterns** (Hard mode): Two independent patterns layered together require decomposing the visual into separate color and shape structures.

3. **No clues at all** (Blind mode): Pure trial-and-error with Wordle-style feedback. Players must develop strategies for which cells to test first.

4. **Distraction** (Spin mode): Periodic rotation disrupts spatial memory and orientation.

5. **Scaling** (Cascade): As grids grow from 3x3 to 9x9, patterns become more complex and blanks more numerous, while attempts don't reset.

---

## 10. Puzzle Data Structure

For implementation, each puzzle is an object with:

```
{
  id:         number,          // Puzzle index
  solution:   string[][],      // 2D array of token strings ("COLOR|SHAPE_INDEX")
  blanks:     Set<string>,     // Set of "row-col" keys for blank cells
  usedTokens: string[],        // List of distinct tokens in the solution
  gridSize:   number,          // 5, 7, or 3-9 for cascade
  mode:       string,          // "easy", "medium", "hard", "blind", "spin"
  spinInterval?: number        // Seconds between rotations (Spin mode only)
}
```

### Token Format

`"#HEXCOLOR|SHAPEINDEX"` — e.g., `"#4ECDC4|1"` means color `#4ECDC4` with shape index `1` (diamond).

Parse by splitting on the last `|` character:
- Everything before `|` = hex color string
- Everything after `|` = shape index (integer)

---

## 11. Random Number Generator

The game uses a deterministic **Linear Congruential Generator** so puzzles are reproducible from a seed:

```
function rng(seed):
    s = seed
    return function next():
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646    // Returns float in [0, 1)
```

**Shuffle** (Fisher-Yates):
```
function shuffle(array, randomFn):
    for i from length-1 down to 1:
        j = floor(randomFn() * (i + 1))
        swap array[i] and array[j]
    return array
```

### Seeds by Mode

| Mode | Seed Formula |
|------|-------------|
| Easy | `puzzleIndex * 6151 + 101` |
| Medium | `puzzleIndex * 7919 + 42` |
| Hard | `puzzleIndex * 10007 + 777` |
| Blind | `puzzleIndex * 13331 + 999` |
| Daily | `floor(UTC_midnight_timestamp / 1000)` |
| Cascade | `(50000 + runIndex * 9999) * 100 + levelIndex` |
| Spin | `puzzleIndex * 9001 + 555` |
| Mosaic | `42424` (fixed seed for the dog image) |
