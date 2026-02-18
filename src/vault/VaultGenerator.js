// --- Vault Mode Puzzle Generator ---
// Generates a grid of puzzles with 4 hidden shape silhouettes embedded in solutions.
// Each silhouette encodes one tile of a 4-position combination lock.

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
// Shape Silhouette Masks
// ============================================================
// Each shape has a pixel-art mask for 5x5 and 7x7 grids.
// The mask is an array of "row-col" strings indicating which cells
// form the silhouette. Shapes match the SHAPES array indices:
// 0: Circle, 1: Diamond, 2: Triangle, 3: Plus/Cross, 4: Square, 5: Star, 6: Pentagon

const SILHOUETTES_5 = {
  // Circle (shape 0) — approximated as a filled circle
  0: ["0-1","0-2","0-3", "1-0","1-1","1-2","1-3","1-4", "2-0","2-1","2-2","2-3","2-4", "3-0","3-1","3-2","3-3","3-4", "4-1","4-2","4-3"],
  // Diamond (shape 1)
  1: ["0-2", "1-1","1-2","1-3", "2-0","2-1","2-2","2-3","2-4", "3-1","3-2","3-3", "4-2"],
  // Triangle (shape 2)
  2: ["0-2", "1-1","1-2","1-3", "2-1","2-2","2-3", "3-0","3-1","3-2","3-3","3-4", "4-0","4-1","4-2","4-3","4-4"],
  // Plus/Cross (shape 3)
  3: ["0-2", "1-2", "2-0","2-1","2-2","2-3","2-4", "3-2", "4-2"],
  // Square (shape 4)
  4: ["0-0","0-1","0-2","0-3","0-4", "1-0","1-4", "2-0","2-4", "3-0","3-4", "4-0","4-1","4-2","4-3","4-4"],
  // Star (shape 5)
  5: ["0-2", "1-0","1-1","1-2","1-3","1-4", "2-1","2-2","2-3", "3-0","3-1","3-3","3-4", "4-0","4-4"],
  // Pentagon (shape 6)
  6: ["0-2", "1-1","1-3", "2-0","2-4", "3-0","3-1","3-2","3-3","3-4", "4-0","4-1","4-2","4-3","4-4"],
};

const SILHOUETTES_7 = {
  // Circle (shape 0)
  0: ["0-2","0-3","0-4", "1-1","1-2","1-3","1-4","1-5", "2-0","2-1","2-2","2-3","2-4","2-5","2-6", "3-0","3-1","3-2","3-3","3-4","3-5","3-6", "4-0","4-1","4-2","4-3","4-4","4-5","4-6", "5-1","5-2","5-3","5-4","5-5", "6-2","6-3","6-4"],
  // Diamond (shape 1)
  1: ["0-3", "1-2","1-3","1-4", "2-1","2-2","2-3","2-4","2-5", "3-0","3-1","3-2","3-3","3-4","3-5","3-6", "4-1","4-2","4-3","4-4","4-5", "5-2","5-3","5-4", "6-3"],
  // Triangle (shape 2)
  2: ["0-3", "1-2","1-3","1-4", "2-2","2-3","2-4", "3-1","3-2","3-3","3-4","3-5", "4-1","4-2","4-3","4-4","4-5", "5-0","5-1","5-2","5-3","5-4","5-5","5-6", "6-0","6-1","6-2","6-3","6-4","6-5","6-6"],
  // Plus/Cross (shape 3)
  3: ["0-3", "1-3", "2-3", "3-0","3-1","3-2","3-3","3-4","3-5","3-6", "4-3", "5-3", "6-3"],
  // Square (shape 4)
  4: ["0-0","0-1","0-2","0-3","0-4","0-5","0-6", "1-0","1-6", "2-0","2-6", "3-0","3-6", "4-0","4-6", "5-0","5-6", "6-0","6-1","6-2","6-3","6-4","6-5","6-6"],
  // Star (shape 5)
  5: ["0-3", "1-2","1-3","1-4", "2-0","2-1","2-2","2-3","2-4","2-5","2-6", "3-1","3-2","3-3","3-4","3-5", "4-0","4-1","4-2","4-4","4-5","4-6", "5-0","5-1","5-5","5-6", "6-0","6-6"],
  // Pentagon (shape 6)
  6: ["0-3", "1-1","1-2","1-4","1-5", "2-0","2-6", "3-0","3-6", "4-0","4-1","4-5","4-6", "5-1","5-2","5-3","5-4","5-5", "6-1","6-2","6-3","6-4","6-5"],
};

// Offset a silhouette mask into a specific quadrant of the grid.
// quadrant: 0=TL, 1=TR, 2=BL, 3=BR
// For a 5x5 grid the silhouette is already full-size, so we just return it centered.
// For larger grids we could offset, but for vault puzzles the silhouette fills most of the grid
// and the quadrant is encoded by shifting the shape slightly toward a corner.
function offsetSilhouette(mask, gridSize, quadrant) {
  if (gridSize <= 5) {
    // For 5x5, the shape already fills the grid. Apply a 1-cell nudge toward the quadrant corner.
    const dr = quadrant < 2 ? -1 : 1; // top vs bottom
    const dc = quadrant % 2 === 0 ? -1 : 1; // left vs right
    const shifted = [];
    for (const key of mask) {
      const [r, c] = key.split("-").map(Number);
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
        shifted.push(`${nr}-${nc}`);
      }
    }
    // Only use shifted if we kept enough cells (>60% of original)
    return shifted.length >= mask.length * 0.6 ? shifted : mask;
  }
  // For 7x7, apply a 1-cell nudge
  const dr = quadrant < 2 ? -1 : 1;
  const dc = quadrant % 2 === 0 ? -1 : 1;
  const shifted = [];
  for (const key of mask) {
    const [r, c] = key.split("-").map(Number);
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
      shifted.push(`${nr}-${nc}`);
    }
  }
  return shifted.length >= mask.length * 0.6 ? shifted : mask;
}

// Create a partial (decoy) silhouette — remove 20-35% of cells randomly
function makeDecoyMask(mask, r) {
  const removeCount = Math.max(2, Math.floor(mask.length * (0.2 + r() * 0.15)));
  const shuffled = shuffle([...mask], r);
  return shuffled.slice(removeCount);
}

// ============================================================
// Difficulty Configurations
// ============================================================
export const VAULT_DIFFICULTIES = {
  bronze:   { gridLayout: 3, gridSize: 5, totalPuzzles: 9,  maxAttempts: 5, decoyCount: 1, label: "Bronze Vault" },
  silver:   { gridLayout: 4, gridSize: 5, totalPuzzles: 16, maxAttempts: 4, decoyCount: 2, label: "Silver Vault" },
  gold:     { gridLayout: 4, gridSize: 7, totalPuzzles: 16, maxAttempts: 3, decoyCount: 3, label: "Gold Vault" },
  obsidian: { gridLayout: 5, gridSize: 7, totalPuzzles: 25, maxAttempts: 3, decoyCount: 4, label: "Obsidian Vault" },
};

// ============================================================
// Main Vault Puzzle Builder
// ============================================================
export function buildVaultPuzzles(seed, difficulty = "silver") {
  const config = VAULT_DIFFICULTIES[difficulty] || VAULT_DIFFICULTIES.silver;
  const { gridLayout, gridSize, totalPuzzles, decoyCount } = config;
  const masterRng = rng(seed);
  const generators = gridSize === 5 ? GENERATORS_5 : GENERATORS_7;
  const silhouettes = gridSize === 5 ? SILHOUETTES_5 : SILHOUETTES_7;

  // 1. Pick a palette for the combination
  const comboPalIdx = Math.floor(masterRng() * PALETTES.length);
  const comboPal = shuffle(PALETTES[comboPalIdx], masterRng);

  // 2. Generate the 4-tile combination (unique color+shape pairs)
  const comboShapes = shuffle([0, 1, 2, 3, 4, 5, 6], masterRng).slice(0, 4);
  const combination = comboShapes.map((shapeIdx, i) => `${comboPal[i % comboPal.length]}|${shapeIdx}`);

  // 3. Assign quadrant positions (0-3) — this is the lock order
  const quadrantOrder = shuffle([0, 1, 2, 3], masterRng);

  // 4. Pick which puzzle indices contain clues (4 of totalPuzzles)
  const allIndices = Array.from({ length: totalPuzzles }, (_, i) => i);
  const shuffledIndices = shuffle(allIndices, masterRng);
  const clueTiles = shuffledIndices.slice(0, 4).sort((a, b) => a - b);
  const clueMap = {}; // tileIdx -> { token, quadrant, shapeIdx }
  clueTiles.forEach((tileIdx, i) => {
    const token = combination[i];
    const [color, shapeIdx] = [token.slice(0, token.lastIndexOf("|")), parseInt(token.slice(token.lastIndexOf("|") + 1), 10)];
    clueMap[tileIdx] = { token, quadrant: quadrantOrder[i], shapeIdx, color };
  });

  // 5. Pick decoy tiles (avoid clue tiles)
  const nonClueTiles = shuffledIndices.filter(i => !clueTiles.includes(i));
  const decoyTiles = nonClueTiles.slice(0, decoyCount);
  const decoyMap = {}; // tileIdx -> { shapeIdx, color }
  decoyTiles.forEach((tileIdx, i) => {
    // Pick a shape and color NOT in the combination to avoid confusion
    const unusedShapes = [0, 1, 2, 3, 4, 5, 6].filter(s => !comboShapes.includes(s));
    const decoyShape = unusedShapes.length > 0 ? unusedShapes[i % unusedShapes.length] : comboShapes[i % 4];
    const decoyPal = shuffle(PALETTES[(comboPalIdx + i + 1) % PALETTES.length], masterRng);
    decoyMap[tileIdx] = { shapeIdx: decoyShape, color: decoyPal[0] };
  });

  // 6. Compute starting unlocked tiles (corners of the grid)
  const startingUnlocked = {};
  const corners = [0, gridLayout - 1, totalPuzzles - gridLayout, totalPuzzles - 1];
  corners.forEach(idx => { if (idx < totalPuzzles) startingUnlocked[idx] = true; });

  // 7. Generate all puzzles
  const puzzles = [];
  for (let i = 0; i < totalPuzzles; i++) {
    const puzzleSeed = seed * 31 + i * 6151 + 101;
    const r = rng(puzzleSeed);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const genIdx = weightedGenIndex(r);
    const numShapes = TWO_COLOR_GENS.has(genIdx) ? 2
      : genIdx === FOUR_COLOR_GEN ? 4
      : 2 + Math.floor(r() * 2);
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = generators[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    // Embed silhouette for clue tiles
    if (clueMap[i]) {
      const { shapeIdx, color, quadrant } = clueMap[i];
      const baseMask = silhouettes[shapeIdx] || silhouettes[0];
      const mask = offsetSilhouette(baseMask, gridSize, quadrant);
      const maskSet = new Set(mask);
      // Override masked cells to use both the clue color AND the clue shape,
      // so the silhouette stands out as a clear block of identical color+shape tokens
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const key = `${r}-${c}`;
          if (maskSet.has(key)) {
            solution[r][c] = `${color}|${shapeIdx}`;
          }
        }
      }
    }

    // Embed partial silhouette for decoy tiles
    if (decoyMap[i]) {
      const { shapeIdx, color } = decoyMap[i];
      const baseMask = silhouettes[shapeIdx] || silhouettes[0];
      const decoyMask = makeDecoyMask(baseMask, r);
      const maskSet = new Set(decoyMask);
      for (let ri = 0; ri < gridSize; ri++) {
        for (let ci = 0; ci < gridSize; ci++) {
          const key = `${ri}-${ci}`;
          if (maskSet.has(key)) {
            const existingToken = solution[ri][ci];
            const existingShapeIdx = parseInt(existingToken.slice(existingToken.lastIndexOf("|") + 1), 10);
            solution[ri][ci] = `${color}|${existingShapeIdx}`;
          }
        }
      }
    }

    // Generate blanks
    const numBlanks = gridSize === 5
      ? Math.min(4 + Math.floor(i / 3), 12)
      : Math.min(10 + Math.floor(i / 2), 24);
    const allCells = [];
    for (let row = 0; row < gridSize; row++) for (let col = 0; col < gridSize; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize, mode: "vault" });
  }

  return {
    puzzles,
    combination,
    clueTiles,
    decoyTiles,
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

export { rng, shuffle, PALETTES };
