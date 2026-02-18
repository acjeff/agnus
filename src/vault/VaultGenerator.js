// --- Vault Mode Puzzle Generator ---
// Generates a grid of puzzles with quadrant-based shape outlines.
// Each 2x2 quadrant of tiles draws a 1-cell-thick outline of one combination shape
// in its combination colour across the combined puzzle area. Non-outline cells are dark grey.
// Players deduce the combination (colour + shape per quadrant) from the outlines.

// --- Seeded RNG (same as Pattrn.jsx) ---
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function shuffle(arr, r) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// --- Color Palettes (same as Pattrn.jsx) ---
const PALETTES = [
  ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#FF9FF3"],
  ["#E17055", "#00B894", "#0984E3", "#FDCB6E", "#6C5CE7"],
  ["#A8E6CF", "#DCEDC1", "#FFD3B6", "#FFAAA5", "#FF8B94"],
  ["#FF9FF3", "#54A0FF", "#5F27CD", "#01A3A4", "#F368E0"],
  ["#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#00CEC9"],
];

// --- Pattern Generators (same as Pattrn.jsx) ---
function makeGenerators(sz) {
  const mid = Math.floor(sz / 2);
  const last = sz - 1;
  return [
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[c % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[r % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + last - c) % n])),
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + c) % 2])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + Math.min(c, last - c)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.min(r, last - r) + c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.max(Math.abs(r - mid), Math.abs(c - mid)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(r - mid) + Math.abs(c - mid)) % n])),
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === mid || c === mid) ? p[1] : p[0])),
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === c || r === last - c) ? p[1] : p[0])),
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === 0 || r === last || c === 0 || c === last) ? p[1] : p[0])),
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => { if (r < mid && c < mid) return p[0]; if (r < mid) return p[1]; if (c < mid) return p[2]; return p[3]; })),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r * sz + c + Math.floor(r / 2)) % n])),
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor(r / 2) % 2 === 0 ? c % 2 : (c + 1) % 2])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.min(r, last - r) + Math.min(c, last - c)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.round(Math.sqrt((r - mid) ** 2 + (c - mid) ** 2)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => { const dr = r - mid; const dc = c - mid; const angle = (Math.atan2(dr, dc) / Math.PI + 1) * n / 2; return p[Math.floor(angle) % n]; })),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r % 2 === 0 ? c : last - c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor((r + c) * n / (sz * 2 - 2)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(c - mid) + r) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(c + (r % 2) * Math.ceil(sz / 2)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[((c + Math.round(Math.sin(r / sz * Math.PI * 2) * mid / 2)) % n + n) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.floor(r / 2) + Math.floor(c / 2)) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r ^ c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.min(r, c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor((r + c) / 2) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r * 2 + c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(r - mid) + c) % n])),
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[((r + Math.round(Math.sin(c / sz * Math.PI * 2) * mid / 2)) % n + n) % n])),
  ];
}

const GENERATORS_5 = makeGenerators(5);
const GENERATORS_7 = makeGenerators(7);

const GEN_WEIGHTS = [
  1, 1, 1, 1, 2, 3, 3, 4, 4, 3, 3, 3, 3, 2, 1, 4, 4, 4, 3, 3,
  4, 3, 4, 3, 4, 3, 3, 3, 4, 4,
];
const TWO_COLOR_GENS = new Set([4, 9, 10, 11, 14]);
const FOUR_COLOR_GEN = 12;

function weightedGenIndex(r) {
  const total = GEN_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = r() * total;
  for (let i = 0; i < GEN_WEIGHTS.length; i++) {
    roll -= GEN_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return GEN_WEIGHTS.length - 1;
}

// ============================================================
// Quadrant Outline Generators
// ============================================================
// Each function returns a Set of "row-col" strings forming a 1-cell-thick outline
// on an NxN combined grid (N = gridSize * 2, e.g. 10 for silver, 14 for gold).

const OUTLINE_GREY = "#2a2a2a";

// Bresenham line rasterizer — returns array of [row, col]
function rasterLine(r0, c0, r1, c1) {
  const pts = [];
  let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
  let sr = r0 < r1 ? 1 : -1, sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0, c = c0;
  while (true) {
    pts.push([r, c]);
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) { err -= dc; r += sr; }
    if (e2 < dr) { err += dr; c += sc; }
  }
  return pts;
}

// 0: Circle — midpoint circle algorithm
function outlineCircle(N) {
  const s = new Set();
  const cx = (N - 1) / 2, cy = (N - 1) / 2;
  const radius = Math.floor(N / 2) - 1;
  let x = radius, y = 0, d = 1 - radius;
  const plot = (px, py) => {
    const rr = Math.round(cy + py), cc = Math.round(cx + px);
    if (rr >= 0 && rr < N && cc >= 0 && cc < N) s.add(`${rr}-${cc}`);
  };
  while (x >= y) {
    plot(x, y); plot(-x, y); plot(x, -y); plot(-x, -y);
    plot(y, x); plot(-y, x); plot(y, -x); plot(-y, -x);
    y++;
    if (d <= 0) { d += 2 * y + 1; }
    else { x--; d += 2 * (y - x) + 1; }
  }
  return s;
}

// 1: Diamond — four diagonal lines connecting edge midpoints
function outlineDiamond(N) {
  const s = new Set();
  const mid = Math.floor((N - 1) / 2);
  const top = [0, mid], right = [mid, N - 1], bottom = [N - 1, mid], left = [mid, 0];
  for (const [r, c] of rasterLine(...top, ...right)) s.add(`${r}-${c}`);
  for (const [r, c] of rasterLine(...right, ...bottom)) s.add(`${r}-${c}`);
  for (const [r, c] of rasterLine(...bottom, ...left)) s.add(`${r}-${c}`);
  for (const [r, c] of rasterLine(...left, ...top)) s.add(`${r}-${c}`);
  return s;
}

// 2: Triangle — equilateral-ish, apex at top-center, base at bottom
function outlineTriangle(N) {
  const s = new Set();
  const apex = [0, Math.floor((N - 1) / 2)];
  const bl = [N - 1, 0], br = [N - 1, N - 1];
  for (const [r, c] of rasterLine(...apex, ...bl)) s.add(`${r}-${c}`);
  for (const [r, c] of rasterLine(...apex, ...br)) s.add(`${r}-${c}`);
  for (const [r, c] of rasterLine(...bl, ...br)) s.add(`${r}-${c}`);
  return s;
}

// 3: Plus/Cross — vertical + horizontal lines through center
function outlinePlus(N) {
  const s = new Set();
  const mid = Math.floor((N - 1) / 2);
  const arm = Math.floor(N * 0.3); // arm width from center
  // Vertical bar
  for (let r = 0; r < N; r++) {
    for (let c = mid - arm; c <= mid + arm; c++) {
      if (c >= 0 && c < N) {
        if (r === 0 || r === N - 1 || c === mid - arm || c === mid + arm) s.add(`${r}-${c}`);
      }
    }
  }
  // Horizontal bar
  for (let c = 0; c < N; c++) {
    for (let r = mid - arm; r <= mid + arm; r++) {
      if (r >= 0 && r < N) {
        if (c === 0 || c === N - 1 || r === mid - arm || r === mid + arm) s.add(`${r}-${c}`);
      }
    }
  }
  return s;
}

// 4: Square — rectangular border with margin
function outlineSquare(N) {
  const s = new Set();
  const margin = Math.max(1, Math.floor(N * 0.1));
  const lo = margin, hi = N - 1 - margin;
  for (let c = lo; c <= hi; c++) { s.add(`${lo}-${c}`); s.add(`${hi}-${c}`); }
  for (let r = lo; r <= hi; r++) { s.add(`${r}-${lo}`); s.add(`${r}-${hi}`); }
  return s;
}

// 5: Star — 5-pointed star outline
function outlineStar(N) {
  const s = new Set();
  const cx = (N - 1) / 2, cy = (N - 1) / 2;
  const outerR = Math.floor(N / 2) - 0.5;
  const innerR = outerR * 0.38;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    pts.push([Math.round(cy + outerR * Math.sin(outerAngle)), Math.round(cx + outerR * Math.cos(outerAngle))]);
    pts.push([Math.round(cy + innerR * Math.sin(innerAngle)), Math.round(cx + innerR * Math.cos(innerAngle))]);
  }
  for (let i = 0; i < pts.length; i++) {
    const [r0, c0] = pts[i];
    const [r1, c1] = pts[(i + 1) % pts.length];
    for (const [r, c] of rasterLine(r0, c0, r1, c1)) {
      if (r >= 0 && r < N && c >= 0 && c < N) s.add(`${r}-${c}`);
    }
  }
  return s;
}

const OUTLINE_GENERATORS = [outlineCircle, outlineDiamond, outlineTriangle, outlinePlus, outlineSquare, outlineStar];

// Map tile index to quadrant (0-3) and position within quadrant for a 4x4 grid layout
function getQuadrantInfo(tileIdx, gridLayout) {
  if (gridLayout !== 4) return null; // Only works for 4x4 grids
  const row = Math.floor(tileIdx / gridLayout);
  const col = tileIdx % gridLayout;
  const qRow = Math.floor(row / 2); // 0 or 1
  const qCol = Math.floor(col / 2); // 0 or 1
  const quadrant = qRow * 2 + qCol; // 0=TL, 1=TR, 2=BL, 3=BR
  const posInQuad = (row % 2) * 2 + (col % 2); // 0=TL, 1=TR, 2=BL, 3=BR within quadrant
  return { quadrant, posInQuad };
}

// Compute the combined-grid (row, col) for a cell within a tile, given its position in the quadrant
function combinedGridPos(cellRow, cellCol, posInQuad, gridSize) {
  const offsetRow = Math.floor(posInQuad / 2) * gridSize; // 0 for top, gridSize for bottom
  const offsetCol = (posInQuad % 2) * gridSize; // 0 for left, gridSize for right
  return [offsetRow + cellRow, offsetCol + cellCol];
}

// ============================================================
// Difficulty Configurations
// ============================================================
export const VAULT_DIFFICULTIES = {
  bronze:   { gridLayout: 3, gridSize: 5, totalPuzzles: 9,  maxAttempts: 2, label: "Bronze Vault" },
  silver:   { gridLayout: 4, gridSize: 5, totalPuzzles: 16, maxAttempts: 2, label: "Silver Vault" },
  gold:     { gridLayout: 4, gridSize: 7, totalPuzzles: 16, maxAttempts: 2, label: "Gold Vault" },
  obsidian: { gridLayout: 5, gridSize: 7, totalPuzzles: 25, maxAttempts: 2, label: "Obsidian Vault" },
};

// ============================================================
// Main Vault Puzzle Builder
// ============================================================
export function buildVaultPuzzles(seed, difficulty = "silver") {
  const config = VAULT_DIFFICULTIES[difficulty] || VAULT_DIFFICULTIES.silver;
  const { gridLayout, gridSize, totalPuzzles } = config;
  const masterRng = rng(seed);
  const generators = gridSize === 5 ? GENERATORS_5 : GENERATORS_7;

  // 1. Pick a palette for the combination
  const comboPalIdx = Math.floor(masterRng() * PALETTES.length);
  const comboPal = shuffle(PALETTES[comboPalIdx], masterRng);

  // 2. Generate the 4-tile combination (unique color+shape pairs)
  const comboShapes = shuffle([0, 1, 2, 3, 4, 5], masterRng).slice(0, 4);
  const combination = comboShapes.map((shapeIdx, i) => `${comboPal[i % comboPal.length]}|${shapeIdx}`);

  // 3. Assign quadrant positions (0-3) — this is the lock order
  const quadrantOrder = shuffle([0, 1, 2, 3], masterRng);

  // 4. For 4x4 grids: precompute outline sets for each quadrant
  const combinedSize = gridSize * 2;
  const quadrantOutlines = {}; // quadrant -> Set of "row-col" in combined grid
  const quadrantCombo = {};    // quadrant -> { color, shapeIndex, token }
  if (gridLayout === 4) {
    for (let q = 0; q < 4; q++) {
      const comboIdx = quadrantOrder[q];
      const token = combination[comboIdx];
      const sepIdx = token.lastIndexOf("|");
      const color = token.slice(0, sepIdx);
      const shapeIndex = parseInt(token.slice(sepIdx + 1), 10);
      quadrantCombo[q] = { color, shapeIndex, token, comboIdx };
      quadrantOutlines[q] = OUTLINE_GENERATORS[shapeIndex % OUTLINE_GENERATORS.length](combinedSize);
    }
  }

  // 5. Compute starting unlocked tiles (corners of the grid)
  const startingUnlocked = {};
  const corners = [0, gridLayout - 1, totalPuzzles - gridLayout, totalPuzzles - 1];
  corners.forEach(idx => { if (idx < totalPuzzles) startingUnlocked[idx] = true; });

  // 6. Generate all puzzles
  const puzzles = [];
  for (let i = 0; i < totalPuzzles; i++) {
    const puzzleSeed = seed * 31 + i * 6151 + 101;
    const r = rng(puzzleSeed);
    const genIdx = weightedGenIndex(r);
    const numShapes = TWO_COLOR_GENS.has(genIdx) ? 2
      : genIdx === FOUR_COLOR_GEN ? 4
      : 2 + Math.floor(r() * 2);
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = generators[genIdx](shapeIndices, numShapes);

    // Determine quadrant info for this tile (4x4 grids only)
    const qInfo = getQuadrantInfo(i, gridLayout);

    // Build solution: shapes from pattern algo, colours from outline membership
    let solution;
    if (qInfo && quadrantOutlines[qInfo.quadrant]) {
      const outlineSet = quadrantOutlines[qInfo.quadrant];
      const comboColor = quadrantCombo[qInfo.quadrant].color;
      solution = grid.map((row, ri) => row.map((si, ci) => {
        const [combR, combC] = combinedGridPos(ri, ci, qInfo.posInQuad, gridSize);
        const isOnOutline = outlineSet.has(`${combR}-${combC}`);
        const cellColor = isOnOutline ? comboColor : OUTLINE_GREY;
        return `${cellColor}|${si}`;
      }));
    } else {
      // Fallback for non-4x4 grids: normal coloured puzzles
      const palIdx = Math.floor(r() * PALETTES.length);
      const pal = shuffle(PALETTES[palIdx], r);
      solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
    }

    // Generate blanks
    const numBlanks = gridSize === 5
      ? Math.min(4 + Math.floor(i / 3), 12)
      : Math.min(10 + Math.floor(i / 2), 24);
    const allCells = [];
    for (let row = 0; row < gridSize; row++) for (let col = 0; col < gridSize; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set([...blanks].map(k => { const [r2, c2] = k.split("-").map(Number); return solution[r2][c2]; }).filter(Boolean))];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize, mode: "vault" });
  }

  return {
    puzzles,
    combination,
    palette: comboPal,
    quadrantOrder,
    startingUnlocked,
    config,
  };
}

// ============================================================
// Adjacency Helpers
// ============================================================
export function getAdjacentTiles(tileIdx, gridLayout) {
  const row = Math.floor(tileIdx / gridLayout);
  const col = tileIdx % gridLayout;
  const neighbors = [];
  if (row > 0) neighbors.push((row - 1) * gridLayout + col);
  if (row < gridLayout - 1) neighbors.push((row + 1) * gridLayout + col);
  if (col > 0) neighbors.push(row * gridLayout + (col - 1));
  if (col < gridLayout - 1) neighbors.push(row * gridLayout + (col + 1));
  return neighbors;
}

// Compute which tiles should be unlocked given current solved tiles + starting unlocked
export function computeUnlockedTiles(solvedTiles, startingUnlocked, gridLayout) {
  const unlocked = { ...startingUnlocked };
  for (const tileIdx of Object.keys(solvedTiles)) {
    const idx = Number(tileIdx);
    if (solvedTiles[tileIdx] > 0) {
      unlocked[idx] = true;
      for (const neighbor of getAdjacentTiles(idx, gridLayout)) {
        unlocked[neighbor] = true;
      }
    }
  }
  return unlocked;
}

// ============================================================
// Mastermind Feedback
// ============================================================
export function getMastermindFeedback(guess, answer) {
  const gold = []; // correct tile in correct position
  const white = []; // correct tile in wrong position
  const answerUsed = [false, false, false, false];
  const guessUsed = [false, false, false, false];

  // First pass: find exact matches (gold)
  for (let i = 0; i < 4; i++) {
    if (guess[i] === answer[i]) {
      gold.push(i);
      answerUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // Second pass: find color+shape matches in wrong position (white)
  for (let i = 0; i < 4; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (answerUsed[j]) continue;
      if (guess[i] === answer[j]) {
        white.push(i);
        answerUsed[j] = true;
        break;
      }
    }
  }

  return { gold: gold.length, white: white.length, goldPositions: gold, whitePositions: white };
}

export { rng, shuffle, PALETTES, OUTLINE_GREY };
