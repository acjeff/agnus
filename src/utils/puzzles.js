import { PALETTES } from "../constants/palettes.js";
import { SHAPES } from "../constants/shapes.jsx";

// --- Seeded RNG ---
export function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
export function shuffle(arr, r) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// --- Pattern generators (parameterized by grid size) ---
export function makeGenerators(sz) {
  const mid = Math.floor(sz / 2);
  const last = sz - 1;
  return [
    // 0: horizontal stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[c % n])),
    // 1: vertical stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[r % n])),
    // 2: diagonal stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + c) % n])),
    // 3: anti-diagonal stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + last - c) % n])),
    // 4: checkerboard
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + c) % 2])),
    // 5: horizontal mirror
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + Math.min(c, last - c)) % n])),
    // 6: vertical mirror
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.min(r, last - r) + c) % n])),
    // 7: concentric
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.max(Math.abs(r - mid), Math.abs(c - mid)) % n])),
    // 8: diamond distance
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(r - mid) + Math.abs(c - mid)) % n])),
    // 9: cross
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === mid || c === mid) ? p[1] : p[0])),
    // 10: X pattern
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === c || r === last - c) ? p[1] : p[0])),
    // 11: border
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === 0 || r === last || c === 0 || c === last) ? p[1] : p[0])),
    // 12: quadrants
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => { if (r < mid && c < mid) return p[0]; if (r < mid) return p[1]; if (c < mid) return p[2]; return p[3]; })),
    // 13: spiral offset
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r * sz + c + Math.floor(r / 2)) % n])),
    // 14: rows alternate 2-color bands
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor(r / 2) % 2 === 0 ? c % 2 : (c + 1) % 2])),
    // 15: double mirror (both axes)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.min(r, last - r) + Math.min(c, last - c)) % n])),
    // 16: radial (distance from center)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.round(Math.sqrt((r - mid) ** 2 + (c - mid) ** 2)) % n])),
    // 17: pinwheel
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => { const dr = r - mid; const dc = c - mid; const angle = (Math.atan2(dr, dc) / Math.PI + 1) * n / 2; return p[Math.floor(angle) % n]; })),
    // 18: zigzag rows
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r % 2 === 0 ? c : last - c) % n])),
    // 19: corner gradient
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor((r + c) * n / (sz * 2 - 2)) % n])),
    // 20: chevron (V-bands pointing down from top center)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(c - mid) + r) % n])),
    // 21: brick stagger (offset every other row like a brick wall)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(c + (r % 2) * Math.ceil(sz / 2)) % n])),
    // 22: sine wave (wavy vertical bands via sinusoidal row offset)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[((c + Math.round(Math.sin(r / sz * Math.PI * 2) * mid / 2)) % n + n) % n])),
    // 23: diagonal blocks (chunky 2x2 block diagonal)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.floor(r / 2) + Math.floor(c / 2)) % n])),
    // 24: XOR fractal (Sierpinski-like irregular pattern)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r ^ c) % n])),
    // 25: corner layers (L-shaped layers from top-left corner)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.min(r, c) % n])),
    // 26: wide staircase (thick diagonal step bands)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor((r + c) / 2) % n])),
    // 27: steep diagonal (steeper angle than regular diagonal)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r * 2 + c) % n])),
    // 28: horizontal chevron (sideways V-bands from left center)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(r - mid) + c) % n])),
    // 29: wave rows (wavy horizontal bands via sinusoidal column offset)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[((r + Math.round(Math.sin(c / sz * Math.PI * 2) * mid / 2)) % n + n) % n])),
  ];
}

export const GENERATORS_5 = makeGenerators(5);
export const GENERATORS_7 = makeGenerators(7);

export const TWO_COLOR_GENS = new Set([4, 9, 10, 11, 14]);
export const FOUR_COLOR_GEN = 12;
export const STRIPE_GENS = new Set([0, 1, 2, 3]);

// Weighted generator selection (stripes get low weight)
export const GEN_WEIGHTS = [
  1, 1, 1, 1, 2, 3, 3, 4, 4, 3, 3, 3, 3, 2, 1, 4, 4, 4, 3, 3,
  4, 3, 4, 3, 4, 3, 3, 3, 4, 4,
];

export function weightedGenIndex(r) {
  const total = GEN_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = r() * total;
  for (let i = 0; i < GEN_WEIGHTS.length; i++) {
    roll -= GEN_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return GEN_WEIGHTS.length - 1;
}

// --- EASY: 5x5, each shape gets a fixed color, pattern is shapes ---
export function buildEasyPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 200; i++) {
    const r = rng(i * 6151 + 101);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const genIdx = weightedGenIndex(r);
    const numShapes = TWO_COLOR_GENS.has(genIdx) ? 2
      : genIdx === FOUR_COLOR_GEN ? 4
      : 2 + Math.floor(r() * 2);
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_5[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    const numBlanks = Math.min(4 + Math.floor(i / 5), 10);
    const allCells = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 5, mode: "easy" });
  }
  return puzzles;
}

// --- MEDIUM: 7x7, shapes+colors always paired, always 3 tile types ---
export function buildMediumPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 200; i++) {
    const r = rng(i * 7919 + 42);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
    const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
    const totalW = validWeights.reduce((a, b) => a + b, 0);
    let roll = r() * totalW;
    let genIdx = validGens[validGens.length - 1];
    for (let vi = 0; vi < validGens.length; vi++) {
      roll -= validWeights[vi];
      if (roll <= 0) { genIdx = validGens[vi]; break; }
    }
    const numShapes = 3;
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_7[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    const numBlanks = Math.min(10 + Math.floor(i / 3), 24);
    const allCells = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 7, mode: "medium" });
  }
  return puzzles;
}

// --- HARD: 7x7, independent color + shape patterns ---
export function buildHardPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 200; i++) {
    const r = rng(i * 10007 + 777);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);

    const colorGenIdx = weightedGenIndex(r);
    const numColors = TWO_COLOR_GENS.has(colorGenIdx) ? 2
      : colorGenIdx === FOUR_COLOR_GEN ? 4
      : 2 + Math.floor(r() * 2);
    const colorGrid = GENERATORS_7[colorGenIdx](pal, numColors);

    let shapeGrid;
    const shapeGenIdx = weightedGenIndex(r);
    const numShapes = TWO_COLOR_GENS.has(shapeGenIdx) ? 2
      : shapeGenIdx === FOUR_COLOR_GEN ? Math.min(4, SHAPES.length)
      : 2 + Math.floor(r() * 2);
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    shapeGrid = GENERATORS_7[shapeGenIdx](shapeIndices, numShapes);

    const solution = colorGrid.map((row, ri) => row.map((color, ci) => `${color}|${shapeGrid[ri][ci]}`));

    const numBlanks = Math.min(20 + Math.floor(i / 4), 28);
    const allCells = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 7, mode: "hard" });
  }
  return puzzles;
}

// --- BLIND: 5x5, all cells blank, wordle-style feedback, min 3 tile types ---
export function buildBlindPuzzles() {
  const puzzles = [];
  // Only generators that support 3+ values
  const validGens = GENERATORS_5.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN);
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < 200; i++) {
    const r = rng(i * 13331 + 999);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);

    let roll = r() * totalW;
    let genIdx = validGens[validGens.length - 1];
    for (let vi = 0; vi < validGens.length; vi++) {
      roll -= validWeights[vi];
      if (roll <= 0) { genIdx = validGens[vi]; break; }
    }

    const numShapes = 3 + Math.floor(r() * 2); // 3 or 4
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_5[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    // ALL cells are blank
    const allCells = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(allCells);

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 5, mode: "blind" });
  }
  return puzzles;
}

// --- Daily: index 0 = today, 1 = yesterday, ... 49 = 49 days ago (UTC); dates in dd-mm-yyyy ---
export function getDateString(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDailySeedForIndex(i) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const thatDayMs = todayStart.getTime() - i * 86400000;
  const thatDay = new Date(thatDayMs);
  const midnightUtc = Date.UTC(thatDay.getUTCFullYear(), thatDay.getUTCMonth(), thatDay.getUTCDate(), 0, 0, 0, 0);
  return Math.floor(midnightUtc / 1000);
}

export function getDailyDateLabel(i) {
  const ts = getDailySeedForIndex(i) * 1000;
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export function buildDailyPuzzle(seed) {
  const r = rng(seed);
  const palIdx = Math.floor(r() * PALETTES.length);
  const pal = shuffle(PALETTES[palIdx], r);
  const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);
  let roll = r() * totalW;
  let genIdx = validGens[validGens.length - 1];
  for (let vi = 0; vi < validGens.length; vi++) {
    roll -= validWeights[vi];
    if (roll <= 0) { genIdx = validGens[vi]; break; }
  }
  const numShapes = 3;
  const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
  const grid = GENERATORS_7[genIdx](shapeIndices, numShapes);
  const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
  const numBlanks = 14;
  const allCells = [];
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
  const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));
  const usedTokens = [...new Set(solution.flat())];
  return { id: 0, solution, blanks, usedTokens, gridSize: 7, mode: "medium" };
}

export function buildDailyPuzzles() {
  return Array.from({ length: 50 }, (_, i) => {
    const p = buildDailyPuzzle(getDailySeedForIndex(i));
    return { ...p, id: i };
  });
}

export function getTodayDailyIndex() {
  return 0;
}

export function getDailyKey(i) {
  return getDailySeedForIndex(i);
}

export function getDailySeedForDate(dateStr) {
  const [day, month, year] = dateStr.split("-").map(Number);
  const midnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  // Use Math.abs so pre-1970 dates (negative timestamps) still produce valid seeds
  return Math.abs(Math.floor(midnightUtc / 1000)) || 1;
}

export function getTodayDailyDateStr() {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = now.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function getDailyStreak(progress) {
  const daily = progress.daily || {};
  if ((daily[getDailyKey(0)] ?? 0) <= 0) return 0;
  let streak = 1;
  for (let i = 1; i < 50; i++) {
    if ((daily[getDailyKey(i)] ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

// --- CASCADE: 50 runs, each 3x3 -> 9x9; attempts persist across levels; progress = how far you got per run ---
export const CASCADE_LEVELS = [3, 4, 5, 6, 7, 8, 9]; // gridSize per level 0..6
export const CASCADE_RUN_SEED_BASE = 50000;
// Coin reward per cascade level (increases as you progress through the run)
export const CASCADE_LEVEL_COINS = [2, 3, 5, 8, 10, 15, 25]; // total 68 for full run

export function formatCascadeProgression(completedUpToLevel, failedAtLevel) {
  // completedUpToLevel: last level we cleared (0..6). failedAtLevel: level we failed (null if run complete).
  const parts = CASCADE_LEVELS.map((sz, i) => {
    const label = `${sz}\u00d7${sz}`;
    if (failedAtLevel != null && i === failedAtLevel) return `${label} \u2717`;
    if (i <= completedUpToLevel) return `${label} \u2713`;
    return null;
  }).filter(Boolean);
  return parts.join(" ");
}

export function getCascadeRunSeed(runIndex) {
  return CASCADE_RUN_SEED_BASE + runIndex * 9999;
}

export function buildCascadePuzzle(level, runSeed) {
  const sz = CASCADE_LEVELS[level];
  const gens = makeGenerators(sz);
  const r = rng((runSeed ?? 0) * 100 + level);
  const palIdx = Math.floor(r() * PALETTES.length);
  const pal = shuffle(PALETTES[palIdx], r);
  const validGens = gens.map((_, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);
  let roll = r() * totalW;
  let genIdx = validGens[validGens.length - 1];
  for (let vi = 0; vi < validGens.length; vi++) {
    roll -= validWeights[vi];
    if (roll <= 0) { genIdx = validGens[vi]; break; }
  }
  const numShapes = Math.min(3, sz);
  const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
  const grid = gens[genIdx](shapeIndices, numShapes);
  const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
  const numBlanks = Math.max(1, Math.floor((sz * sz) * 0.25));
  const allCells = [];
  for (let row = 0; row < sz; row++) for (let col = 0; col < sz; col++) allCells.push(`${row}-${col}`);
  const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));
  const usedTokens = [...new Set(solution.flat())];
  return { id: level, solution, blanks, usedTokens, gridSize: sz, mode: "medium" };
}

// --- SPIN: 7x7 paired puzzles, grid rotates 90 degrees periodically ---
export function buildSpinPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 200; i++) {
    const r = rng(i * 9001 + 555);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
    const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
    const totalW = validWeights.reduce((a, b) => a + b, 0);
    let roll = r() * totalW;
    let genIdx = validGens[validGens.length - 1];
    for (let vi = 0; vi < validGens.length; vi++) {
      roll -= validWeights[vi];
      if (roll <= 0) { genIdx = validGens[vi]; break; }
    }
    const numShapes = 3;
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_7[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
    const numBlanks = Math.min(10 + Math.floor(i / 3), 24);
    const allCells = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));
    const usedTokens = [...new Set(solution.flat())];
    // Spin interval: starts at 10s for puzzle 0, decreases to 5s for puzzle 49
    const spinInterval = Math.max(5, 10 - Math.floor(i / 10));
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 7, mode: "spin", spinInterval });
  }
  return puzzles;
}

// --- MOSAIC: 25 puzzles that tile into a larger 25x25 dog pattern ---
export function buildMosaicPuzzles() {
  const mr = rng(42424);
  const palIdx = Math.floor(mr() * PALETTES.length);
  const pal = shuffle(PALETTES[palIdx], mr);
  // 25x25 pixel art dog (front-facing, sitting)
  // 0 = background, 1 = body/fur, 2 = detail (eyes, nose, tongue, collar, inner ears)
  const DOG = [
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,2,2,1,1,1,1,1,1,1,1,1,2,2,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,2,1,2,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,1,1,1,2,1,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];
  const bigSolution = DOG.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
  // Slice into 25 tiles of 5x5
  const puzzles = [];
  for (let ti = 0; ti < 25; ti++) {
    const tileRow = Math.floor(ti / 5);
    const tileCol = ti % 5;
    const solution = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) {
        row.push(bigSolution[tileRow * 5 + r][tileCol * 5 + c]);
      }
      solution.push(row);
    }
    const rr = rng(ti * 7331 + 4444);
    const numBlanks = Math.min(4 + Math.floor(ti / 2), 12);
    const allCells = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, rr).slice(0, numBlanks));
    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: ti, solution, blanks, usedTokens, gridSize: 5, mode: "mosaic" });
  }
  return puzzles;
}

export const PUZZLE_SETS = {
  easy: buildEasyPuzzles(),
  medium: buildMediumPuzzles(),
  hard: buildHardPuzzles(),
  blind: buildBlindPuzzles(),
  spin: buildSpinPuzzles(),
  mosaic: buildMosaicPuzzles(),
};

// --- Migrate daily data from index-based keys (0-49) to date-based keys (UTC midnight timestamps) ---
export function migrateDailyData(daily) {
  if (!daily || typeof daily !== "object") return daily;
  const keys = Object.keys(daily);
  if (keys.length === 0) return daily;
  // Old index-based keys were always 0-49; any key > 49 is a timestamp (even 1970s dates are > 80000)
  if (keys.some(k => Number(k) > 49)) return daily;
  // All keys are 0-49, convert old index-based keys to date-based keys (assumes indices are relative to today)
  const migrated = {};
  for (const k of keys) {
    const idx = parseInt(k, 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 49) continue;
    migrated[getDailyKey(idx)] = daily[k];
  }
  return migrated;
}
