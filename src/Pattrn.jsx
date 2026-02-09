import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// --- Theme ---
const C = {
  bg: "#0a0a0f",
  surface: "#14141f",
  surfaceLight: "#1e1e2e",
  accent: "#c8f03e",
  text: "#e8e8ef",
  textDim: "#6b6b7b",
  correct: "#4ade80",
  incorrect: "#f87171",
  border: "#2a2a3a",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
  inProgress: "#eab308", // amber for cascade "started but not completed"
};

// --- Shape overlays ---
const shapeStyle = { position: "absolute", inset: 0, margin: "auto" };
const SHAPES = [
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,5 20,19 4,19" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <line x1="12" y1="5" x2="12" y2="19" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="6" y="6" width="12" height="12" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 14.5,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.5,9.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 18,21 3,9 21,9 6,21" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
    </svg>
  ),
];

// --- Color palettes ---
const PALETTES = [
  ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#FF9FF3"],
  ["#E17055", "#00B894", "#0984E3", "#FDCB6E", "#6C5CE7"],
  ["#A8E6CF", "#DCEDC1", "#FFD3B6", "#FFAAA5", "#FF8B94"],
  ["#FF9FF3", "#54A0FF", "#5F27CD", "#01A3A4", "#F368E0"],
  ["#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#00CEC9"],
];

// --- Seeded RNG ---
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function shuffle(arr, r) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// --- Pattern generators (parameterized by grid size) ---
function makeGenerators(sz) {
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
  ];
}

const GENERATORS_5 = makeGenerators(5);
const GENERATORS_7 = makeGenerators(7);

const TWO_COLOR_GENS = new Set([4, 9, 10, 11, 14]);
const FOUR_COLOR_GEN = 12;
const STRIPE_GENS = new Set([0, 1, 2, 3]);

// Weighted generator selection (stripes get low weight)
const GEN_WEIGHTS = [
  1, 1, 1, 1, 2, 3, 3, 4, 4, 3, 3, 3, 3, 2, 1, 4, 4, 4, 3, 3,
];

function weightedGenIndex(r) {
  const total = GEN_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = r() * total;
  for (let i = 0; i < GEN_WEIGHTS.length; i++) {
    roll -= GEN_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return GEN_WEIGHTS.length - 1;
}

// --- EASY: 5x5, each shape gets a fixed color, pattern is shapes ---
function buildEasyPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
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
function buildMediumPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
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
function buildHardPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
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
function buildBlindPuzzles() {
  const puzzles = [];
  // Only generators that support 3+ values
  const validGens = GENERATORS_5.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN);
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < 50; i++) {
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
function getDateString(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDailySeedForIndex(i) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const thatDayMs = todayStart.getTime() - i * 86400000;
  const thatDay = new Date(thatDayMs);
  const midnightUtc = Date.UTC(thatDay.getUTCFullYear(), thatDay.getUTCMonth(), thatDay.getUTCDate(), 0, 0, 0, 0);
  return Math.floor(midnightUtc / 1000);
}

function getDailyDateLabel(i) {
  const ts = getDailySeedForIndex(i) * 1000;
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function buildDailyPuzzle(seed) {
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

function buildDailyPuzzles() {
  return Array.from({ length: 50 }, (_, i) => {
    const p = buildDailyPuzzle(getDailySeedForIndex(i));
    return { ...p, id: i };
  });
}

function getTodayDailyIndex() {
  return 0;
}

function getDailyKey(i) {
  return getDailySeedForIndex(i);
}

function getDailySeedForDate(dateStr) {
  const [day, month, year] = dateStr.split("-").map(Number);
  const midnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  // Use Math.abs so pre-1970 dates (negative timestamps) still produce valid seeds
  return Math.abs(Math.floor(midnightUtc / 1000)) || 1;
}

function getTodayDailyDateStr() {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = now.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDailyStreak(progress) {
  const daily = progress.daily || {};
  if ((daily[getDailyKey(0)] ?? 0) <= 0) return 0;
  let streak = 1;
  for (let i = 1; i < 50; i++) {
    if ((daily[getDailyKey(i)] ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

// --- CASCADE: 50 runs, each 3×3 → 9×9; attempts persist across levels; progress = how far you got per run ---
const CASCADE_LEVELS = [3, 3, 4, 4, 5, 5, 6, 7, 8, 9]; // gridSize per level 0..9
const CASCADE_RUN_SEED_BASE = 50000;

function formatCascadeProgression(completedUpToLevel, failedAtLevel) {
  // completedUpToLevel: last level we cleared (0..6). failedAtLevel: level we failed (null if run complete).
  const parts = CASCADE_LEVELS.map((sz, i) => {
    const label = `${sz}×${sz}`;
    if (failedAtLevel != null && i === failedAtLevel) return `${label} ✗`;
    if (i <= completedUpToLevel) return `${label} ✓`;
    return null;
  }).filter(Boolean);
  return parts.join(" ");
}

function getCascadeRunSeed(runIndex) {
  return CASCADE_RUN_SEED_BASE + runIndex * 9999;
}

function buildCascadePuzzle(level, runSeed) {
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

const PUZZLE_SETS = {
  easy: buildEasyPuzzles(),
  medium: buildMediumPuzzles(),
  hard: buildHardPuzzles(),
  blind: buildBlindPuzzles(),
};

// --- Migrate daily data from index-based keys (0-49) to date-based keys (UTC midnight timestamps) ---
function migrateDailyData(daily) {
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

// --- Persistent storage using localStorage ---
const STORAGE_KEY = "pattrn-progress-v3";
const TIMES_KEY = "pattrn-times-v1";
const HOMESCREEN_HINT_KEY = "pattrn-homescreen-hint-dismissed-v1";
const BIRTHDAY_KEY = "pattrn-birthday-v1";

function isIOSSafariForHomescreenHint() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = !!navigator.standalone;
  return isIOS && !isStandalone;
}

function normalizeCascadeRunState(entry) {
  if (!entry || entry.level == null) return null;
  return {
    level: entry.level,
    elapsedSeconds: typeof entry.elapsedSeconds === "number" ? entry.elapsedSeconds : 0,
    fills: entry.fills && typeof entry.fills === "object" ? entry.fills : {},
    attempts: typeof entry.attempts === "number" ? entry.attempts : 0,
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    const rawRun = base.cascadeRunState;
    let cascadeRunState = {};
    let cascadeRunStateLastIndex = base.cascadeRunStateLastIndex;
    if (rawRun != null && typeof rawRun === "object") {
      if (typeof rawRun.runIndex === "number") {
        const one = normalizeCascadeRunState(rawRun);
        if (one) {
          cascadeRunState[rawRun.runIndex] = one;
          cascadeRunStateLastIndex = rawRun.runIndex;
        }
      } else {
        for (const [k, v] of Object.entries(rawRun)) {
          const num = parseInt(k, 10);
          if (!Number.isNaN(num)) {
            const one = normalizeCascadeRunState(v);
            if (one) cascadeRunState[num] = one;
          }
        }
        if (cascadeRunStateLastIndex == null && Object.keys(cascadeRunState).length > 0) {
          cascadeRunStateLastIndex = Math.max(...Object.keys(cascadeRunState).map(Number));
        }
      }
    }
    return {
      easy: base.easy ?? {},
      medium: base.medium ?? {},
      hard: base.hard ?? {},
      blind: base.blind ?? {},
      daily: migrateDailyData(base.daily ?? {}),
      cascade: base.cascade ?? {},
      cascadeRunState,
      cascadeRunStateLastIndex: typeof cascadeRunStateLastIndex === "number" ? cascadeRunStateLastIndex : undefined,
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

function loadTimes() {
  try {
    const raw = localStorage.getItem(TIMES_KEY);
    const base = raw ? JSON.parse(raw) : {};
    return {
      easy: base.easy ?? {},
      medium: base.medium ?? {},
      hard: base.hard ?? {},
      blind: base.blind ?? {},
      daily: migrateDailyData(base.daily ?? {}),
      cascade: base.cascade ?? {},
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {} };
  }
}

function saveTimes(times) {
  try {
    localStorage.setItem(TIMES_KEY, JSON.stringify(times));
  } catch (e) {
    console.error("Save times failed:", e);
  }
}

function formatTime(seconds) {
  if (seconds == null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function solutionFillsFromPuzzle(puzzle) {
  if (!puzzle?.blanks?.size || !puzzle.solution) return {};
  const fills = {};
  for (const key of puzzle.blanks) {
    const [r, c] = key.split("-").map(Number);
    fills[key] = puzzle.solution[r][c];
  }
  return fills;
}

// --- Helper: parse token ---
function parseToken(token) {
  const idx = token.lastIndexOf("|");
  return { color: token.slice(0, idx), shapeIndex: parseInt(token.slice(idx + 1), 10) };
}

// --- Components ---

function Cell({ token, isBlank, isSelected, isFilled, isCorrect, isWrong, isRevealed, isLocked, onClick, onPointerDown, onPointerUp, onPointerEnter, cellSize, iconSize, mode, isPrefilled, fallDelay = 0, wrongFallDelay = 0, emptyCellDelay, isWon, winCelebrateDelay = 0 }) {
  const showContent = isRevealed || isLocked || !isBlank || isFilled;
  const parsed = showContent && token ? parseToken(token) : null;
  const isEasy = mode === "easy";
  const fallAnimation = isPrefilled ? `fallIntoPlace 0.5s ${fallDelay}s cubic-bezier(0.34, 1.56, 0.64, 1) both` : "none";
  const wrongAnimation = isWrong ? `fallOff 0.32s ${wrongFallDelay}s cubic-bezier(0.55, 0.09, 0.68, 0.53) forwards` : "none";
  const isEmptyUnfilled = isBlank && !isFilled && !isRevealed && !isLocked;
  const emptyCellAnimation = isEmptyUnfilled && emptyCellDelay != null ? `emptyCellIn 0.35s ${emptyCellDelay}s ease-out forwards` : "none";
  const winAnimation = isWon && showContent ? `tilesWinCelebrate 0.6s ${winCelebrateDelay}s cubic-bezier(0.34, 1.56, 0.64, 1) both` : "none";

  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      style={{
        width: cellSize, height: cellSize, borderRadius: cellSize > 44 ? 10 : 8,
        backgroundColor: showContent && parsed ? parsed.color : C.surfaceLight,
        border: isLocked ? `2.5px solid ${C.correct}`
          : isSelected ? `2.5px solid ${C.accent}`
          : isWrong ? `2.5px solid ${C.incorrect}`
          : isBlank && !isFilled && !isRevealed ? `2.5px dashed ${C.border}`
          : "2.5px solid transparent",
        cursor: isBlank && !isRevealed && !isLocked ? "pointer" : "default",
        transition: "transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s cubic-bezier(0.4,0,0.2,1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        opacity: isEmptyUnfilled && emptyCellDelay != null ? 0 : (isBlank && !isFilled && !isRevealed && !isLocked ? 0.45 : 1),
        boxShadow: isLocked ? `0 0 14px ${C.correct}55`
          : isCorrect ? `0 0 14px ${C.correct}55`
          : isWrong ? `0 0 12px ${C.incorrect}66`
          : isSelected ? `0 0 14px ${C.accent}44` : "none",
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none",
        zIndex: isWrong ? 10 : undefined,
        animation: winAnimation !== "none" ? winAnimation : wrongAnimation !== "none" ? wrongAnimation : emptyCellAnimation !== "none" ? emptyCellAnimation : fallAnimation,
      }}
    >
      {showContent && parsed && SHAPES[parsed.shapeIndex % SHAPES.length](iconSize, isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)")}
    </div>
  );
}

function TokenPicker({ tokens, selectedToken, onSelect, cellSize, mode, remaining }) {
  const isEasy = mode === "easy" || mode === "blind";
  return (
    <div className="token-picker-scroll" style={{ display: "flex", gap: 10, justifyContent: "center", padding: "8px 16px", flexWrap: "nowrap", overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {tokens.map((token, i) => {
        const { color, shapeIndex } = parseToken(token);
        const selected = selectedToken === token;
        const left = remaining && remaining[token] !== undefined ? remaining[token] : null;
        const exhausted = left !== null && left <= 0 && mode !== "hard";
        return (
          <div key={i} onClick={() => onSelect(token)}
            style={{
              width: cellSize, height: cellSize, borderRadius: 12, backgroundColor: color,
              border: selected ? `3px solid ${C.text}` : "3px solid transparent",
              cursor: exhausted ? "not-allowed" : "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              transform: selected ? "scale(1.15)" : "scale(1)",
              opacity: exhausted ? 0.35 : 1,
              boxShadow: selected ? `0 0 20px ${color}66` : `0 2px 8px ${color}33`,
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {SHAPES[shapeIndex % SHAPES.length](cellSize * 0.5, isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)")}
            {left !== null && mode !== "hard" && (
              <div style={{
                position: "absolute", top: -6, right: -6,
                backgroundColor: exhausted ? C.textDim : C.text,
                color: C.bg, fontSize: 10, fontWeight: 700,
                fontFamily: "'Space Mono', monospace",
                width: 18, height: 18, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>
                {left}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Particles({ show }) {
  const ref = useRef(null);
  if (!show) return null;
  const ps = Array.from({ length: 24 }, (_, i) => ({
    id: i, x: 50 + (Math.random() - 0.5) * 80, y: 50 + (Math.random() - 0.5) * 80,
    size: 4 + Math.random() * 8, delay: Math.random() * 0.4,
    color: PALETTES[Math.floor(Math.random() * PALETTES.length)][Math.floor(Math.random() * 5)],
  }));
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {ps.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%", backgroundColor: p.color,
          animation: `particlePop 0.8s ${p.delay}s cubic-bezier(0.4,0,0.2,1) forwards`, opacity: 0,
        }} />
      ))}
    </div>
  );
}

function AttemptDots({ max, used, won }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: "50%",
          backgroundColor: i < used ? (won ? C.correct : C.incorrect) : C.border,
          transition: "background-color 0.3s",
        }} />
      ))}
    </div>
  );
}

function ScoreBadge({ attempts }) {
  if (attempts === null || attempts === undefined) return null;
  if (attempts === 0) return <span style={{ color: C.textDim }}>&#x2717;</span>;
  const colors = [null, C.gold, C.gold, C.silver, C.silver, C.bronze];
  const labels = [null, "\u2605", "\u2605", "\u25CF", "\u25CF", "\u25C6"];
  return <span style={{ color: colors[attempts] || C.textDim, fontSize: 14 }}>{labels[attempts] || "\u25C6"}</span>;
}

const DIFFICULTIES = [
  { key: "easy", label: "Easy", desc: "5\u00D75 \u2022 Paired" },
  { key: "medium", label: "Medium", desc: "7\u00D77 \u2022 Paired" },
  { key: "hard", label: "Hard", desc: "7\u00D77 \u2022 Mixed" },
  { key: "blind", label: "Blind", desc: "5\u00D75 \u2022 No Clues" },
  { key: "daily", label: "Daily", desc: "1 a day" },
  { key: "cascade", label: "Cascade", desc: "Keep on" },
];

const ROW1_KEYS = ["easy", "medium", "hard"];
const ROW2_KEYS = ["blind", "daily", "cascade"];
const VALID_MODES = new Set(["easy", "medium", "hard", "blind", "daily", "cascade"]);

function getSearchParams() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode");
  const level = params.get("level");
  const date = params.get("date");
  return {
    mode: mode && VALID_MODES.has(mode) ? mode : null,
    level: level != null ? Math.max(0, Math.min(49, parseInt(level, 10) || 0)) : null,
    date: date && /^\d{2}-\d{2}-\d{4}$/.test(date) ? date : null,
  };
}

function updateUrl(mode, level, replace = true, date = null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (mode === "daily" && date) {
    params.set("date", date);
  } else if (level != null) {
    params.set("level", String(level));
  }
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
}

// --- Main App ---
export default function Pattrn() {
  const [view, setView] = useState("menu");
  const [difficulty, setDifficulty] = useState("easy");
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [fills, setFills] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [gameState, setGameState] = useState("playing");
  const [wrongCells, setWrongCells] = useState(new Set());
  const [lockedCells, setLockedCells] = useState(new Set()); // for blind mode
  const [showParticles, setShowParticles] = useState(false);
  const [progress, setProgress] = useState(() => loadProgress());
  const [times, setTimes] = useState(() => loadTimes());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shareMsg, setShareMsg] = useState("");
  const [dailyShareMsg, setDailyShareMsg] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [cascadeLevel, setCascadeLevel] = useState(0);
  const [cascadeLives, setCascadeLives] = useState(3);
  const [cascadeRunIndex, setCascadeRunIndex] = useState(0);
  const timerStart = useRef(null);
  const timerInterval = useRef(null);
  const timerIsCascadeRun = useRef(false);
  const cascadeFillsRef = useRef({});
  const cascadeAttemptsRef = useRef(0);
  const cascadeRunIndexRef = useRef(0);
  const isPainting = useRef(false);
  const pendingCellRef = useRef(null);
  const justHandledInPointerUpRef = useRef(null);
  const wrongCellClearTimeoutRef = useRef(null);
  const playViewScrollRef = useRef(null);

  const [currentDailyDate, setCurrentDailyDate] = useState(null); // "dd-mm-yyyy"
  const [calendarYear, setCalendarYear] = useState(() => new Date().getUTCFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getUTCMonth());

  const [clearedBlanks, setClearedBlanks] = useState(() => new Set());
  const [gridEpoch, setGridEpoch] = useState(0);
  const hasSyncedUrl = useRef(false);
  const [homescreenHintDismissed, setHomescreenHintDismissed] = useState(() => {
    try { return !!localStorage.getItem(HOMESCREEN_HINT_KEY); } catch { return false; }
  });

  // Birthday: stored as "dd-mm-yyyy" (or "dd-mm" if no year), null if not set
  const [birthday, setBirthday] = useState(() => {
    try { return localStorage.getItem(BIRTHDAY_KEY) || null; } catch { return null; }
  });
  const [showBirthdayPrompt, setShowBirthdayPrompt] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState("");
  const goToDateRef = useRef(null);

  // Scroll play view to top when entering or changing puzzle
  useEffect(() => {
    if (view !== "play") return;
    const scrollToTop = () => {
      const el = playViewScrollRef.current;
      if (el) {
        el.scrollTop = 0;
        el.scrollTo(0, 0);
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    const t = requestAnimationFrame(scrollToTop);
    const t2 = setTimeout(scrollToTop, 50);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(t2);
    };
  }, [view, currentPuzzle, cascadeLevel, difficulty, cascadeRunIndex]);

  const cancelWrongCellClear = useCallback(() => {
    if (wrongCellClearTimeoutRef.current) {
      clearTimeout(wrongCellClearTimeoutRef.current);
      wrongCellClearTimeoutRef.current = null;
    }
  }, []);

  // Initial load: read URL or restore saved cascade run
  useEffect(() => {
    const { mode, level, date } = getSearchParams();
    const levelNum = level != null ? parseInt(level, 10) : null;
    const hasDailyDeepLink = mode === "daily" && date;
    const hasDeepLink = hasDailyDeepLink || (mode && levelNum != null && !Number.isNaN(levelNum));
    const runStateMap = progress.cascadeRunState || {};
    const lastIndex = progress.cascadeRunStateLastIndex;

    const restoreRun = (runIndex) => {
      const rs = runStateMap[runIndex];
      if (!rs) return;
      setCascadeRunIndex(runIndex);
      cascadeRunIndexRef.current = runIndex;
      setCascadeLevel(rs.level);
      setFills(rs.fills ?? {});
      setAttempts(rs.attempts ?? 0);
      const secs = rs.elapsedSeconds ?? 0;
      setElapsedTime(secs);
      timerStart.current = Date.now() - secs * 1000;
      timerIsCascadeRun.current = true;
      cascadeRunIndexRef.current = runIndex;
      timerInterval.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
        const p = loadProgress();
        const ri = cascadeRunIndexRef.current;
        const cur = p.cascadeRunState?.[ri];
        if (cur) {
          const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
          saveProgress({
            ...p,
            cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
            cascadeRunStateLastIndex: ri,
          });
        }
      }, 1000);
    };

    if (hasDeepLink) {
      if (mode) setDifficulty(mode);
      if (mode === "cascade") {
        setCascadeRunIndex(levelNum);
        cascadeRunIndexRef.current = levelNum;
        const prog = loadProgress();
        const tms = loadTimes();
        const cascadeBest = (prog.cascade || {})[levelNum];
        const cascadeTime = (tms.cascade || {})[levelNum];
        const fullyCompleted = cascadeBest === CASCADE_LEVELS.length && cascadeTime != null;
        if (fullyCompleted) {
          const puz = buildCascadePuzzle(CASCADE_LEVELS.length - 1, getCascadeRunSeed(levelNum));
          setCascadeLevel(CASCADE_LEVELS.length - 1);
          setFills(solutionFillsFromPuzzle(puz));
          setAttempts(0);
          setElapsedTime(cascadeTime);
          setGameState("won");
          setLockedCells(new Set(puz.blanks));
          setWrongCells(new Set());
          setShowParticles(false);
          setSelectedCell(null);
          setSelectedToken(null);
        } else {
          const rs = runStateMap[levelNum];
          if (rs) {
            restoreRun(levelNum);
          } else {
            setElapsedTime(0);
            timerStart.current = Date.now();
            timerIsCascadeRun.current = true;
            const initialRunState = { level: 0, elapsedSeconds: 0, fills: {}, attempts: 0 };
            const p = loadProgress();
            saveProgress({ ...p, cascadeRunState: { ...(p.cascadeRunState || {}), [levelNum]: initialRunState }, cascadeRunStateLastIndex: levelNum });
            timerInterval.current = setInterval(() => {
              setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
              const p2 = loadProgress();
              const ri = cascadeRunIndexRef.current;
              const cur = p2.cascadeRunState?.[ri];
              if (cur) {
                const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
                saveProgress({
                  ...p2,
                  cascadeRunState: { ...p2.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
                  cascadeRunStateLastIndex: ri,
                });
              }
            }, 1000);
          }
        }
      } else if (hasDailyDeepLink) {
        setCurrentDailyDate(date);
        const seed = getDailySeedForDate(date);
        const puz = buildDailyPuzzle(seed);
        const prog = loadProgress();
        const tms = loadTimes();
        const dProg = prog.daily || {};
        const dTimes = tms.daily || {};
        const alreadyCompleted = (dProg[seed] ?? 0) > 0 && dTimes[seed] != null;
        if (alreadyCompleted) {
          setFills(solutionFillsFromPuzzle(puz));
          setAttempts(dProg[seed]);
          setElapsedTime(dTimes[seed]);
          setGameState("won");
          setLockedCells(new Set(puz.blanks));
          setWrongCells(new Set());
          setShowParticles(false);
        } else {
          const todaySeed = getDailySeedForIndex(0);
          if (seed > todaySeed) {
            setView("menu"); return; // future date — go to menu
          }
          setFills({});
          setAttempts(0);
          setElapsedTime(0);
          setGameState("playing");
          setWrongCells(new Set());
          setLockedCells(new Set());
          setShowParticles(false);
          if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
          timerStart.current = Date.now();
          timerInterval.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
          }, 1000);
        }
        setSelectedCell(null);
        setSelectedToken(null);
      } else {
        setCurrentPuzzle(levelNum);
        const puzzleSet = PUZZLE_SETS[mode] || [];
        const puz = puzzleSet[levelNum];
        const prog = loadProgress();
        const tms = loadTimes();
        const dProg = prog[mode] || {};
        const dTimes = tms[mode] || {};
        const alreadyCompleted = (dProg[levelNum] ?? 0) > 0 && dTimes[levelNum] != null && puz;
        if (alreadyCompleted) {
          setFills(solutionFillsFromPuzzle(puz));
          setAttempts(dProg[levelNum]);
          setElapsedTime(dTimes[levelNum]);
          setGameState("won");
          setLockedCells(new Set(puz.blanks));
          setWrongCells(new Set());
          setShowParticles(false);
        } else {
          setFills({});
          setAttempts(0);
          setElapsedTime(0);
          setGameState("playing");
          setWrongCells(new Set());
          setLockedCells(new Set());
          setShowParticles(false);
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
          timerStart.current = Date.now();
          timerInterval.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
          }, 1000);
        }
        setSelectedCell(null);
        setSelectedToken(null);
      }
      setView("play");
      return;
    }

  }, []);

  // Keep URL in sync with view + mode + level (skip first mount so we don't overwrite incoming params)
  useEffect(() => {
    if (!hasSyncedUrl.current) {
      hasSyncedUrl.current = true;
      return;
    }
    if (view === "play") {
      if (difficulty === "daily") {
        updateUrl("daily", null, true, currentDailyDate);
      } else {
        const level = difficulty === "cascade" ? cascadeRunIndex : currentPuzzle;
        updateUrl(difficulty, level);
      }
    } else {
      updateUrl(difficulty, null);
    }
  }, [view, difficulty, currentPuzzle, cascadeRunIndex, currentDailyDate]);

  const todayDateStr = getDateString();
  const isDaily = difficulty === "daily";
  const isCascade = difficulty === "cascade";
  if (isCascade) {
    cascadeFillsRef.current = fills;
    cascadeAttemptsRef.current = attempts;
    cascadeRunIndexRef.current = cascadeRunIndex;
  }
  const puzzles = isCascade ? [] : isDaily ? [] : (PUZZLE_SETS[difficulty] || []);
  const cascadePuzzle = useMemo(
    () => (isCascade ? buildCascadePuzzle(cascadeLevel, getCascadeRunSeed(cascadeRunIndex)) : null),
    [isCascade, cascadeLevel, cascadeRunIndex]
  );
  const currentDailyPuzzle = useMemo(() => {
    if (!isDaily || !currentDailyDate) return null;
    const seed = getDailySeedForDate(currentDailyDate);
    return buildDailyPuzzle(seed);
  }, [isDaily, currentDailyDate]);
  const puzzle = isCascade ? cascadePuzzle : isDaily ? currentDailyPuzzle : puzzles[currentPuzzle];
  const diffProgress = progress[difficulty] || {};
  const isBlind = difficulty === "blind" && !isDaily;
  const progressKey = isCascade ? cascadeRunIndex : isDaily ? (currentDailyDate ? getDailySeedForDate(currentDailyDate) : null) : currentPuzzle;

  // How many of each token still need to be placed (only counts blanks, not full grid)
  const tokenRemaining = useMemo(() => {
    if (!puzzle) return {};
    const neededInBlanks = {};
    for (const key of puzzle.blanks) {
      const [r, c] = key.split("-").map(Number);
      const token = puzzle.solution[r][c];
      if (token) neededInBlanks[token] = (neededInBlanks[token] || 0) + 1;
    }
    const usedCounts = {};
    for (const key of puzzle.blanks) {
      let token;
      if (lockedCells.has(key)) {
        const [r, c] = key.split("-").map(Number);
        token = puzzle.solution[r][c];
      } else if (fills[key]) {
        token = fills[key];
      }
      if (token) usedCounts[token] = (usedCounts[token] || 0) + 1;
    }
    const remaining = {};
    puzzle.usedTokens.forEach(t => { remaining[t] = (neededInBlanks[t] || 0) - (usedCounts[t] || 0); });
    return remaining;
  }, [puzzle, fills, lockedCells]);

  // Default to first tile when game loads with no selection
  useEffect(() => {
    if (view === "play" && puzzle?.usedTokens?.length && selectedToken === null) {
      setSelectedToken(puzzle.usedTokens[0]);
    }
  }, [view, puzzle, selectedToken]);

  // Auto-advance to next available token when current selection is exhausted
  useEffect(() => {
    if (!puzzle || puzzle.mode === "hard" || !selectedToken) return;
    if ((tokenRemaining[selectedToken] ?? 0) > 0) return;
    const tokens = puzzle.usedTokens;
    const currentIdx = tokens.indexOf(selectedToken);
    if (currentIdx === -1) return;
    for (let i = 1; i < tokens.length; i++) {
      const nextToken = tokens[(currentIdx + i) % tokens.length];
      if ((tokenRemaining[nextToken] ?? 0) > 0) {
        setSelectedToken(nextToken);
        return;
      }
    }
  }, [tokenRemaining, selectedToken, puzzle]);

  const stopTimer = useCallback(() => {
    timerIsCascadeRun.current = false;
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (timerStart.current != null) return Math.floor((Date.now() - timerStart.current) / 1000);
    return 0;
  }, []);

  const startPuzzle = (idx, diff, forceRestart = false, dailyDate = null) => {
    cancelWrongCellClear();
    if (diff) setDifficulty(diff);
    const effectiveDiff = diff ?? difficulty;
    if (effectiveDiff === "daily" && dailyDate) {
      setCurrentDailyDate(dailyDate);
    } else {
      setCurrentPuzzle(idx);
    }
    let cascadeElapsed = 0;
    if (effectiveDiff === "cascade") {
      setCascadeRunIndex(idx);
      cascadeRunIndexRef.current = idx;
      const prog = loadProgress();
      const tms = loadTimes();
      const cascadeBest = (prog.cascade || {})[idx];
      const cascadeTime = (tms.cascade || {})[idx];
      const fullyCompleted = !forceRestart && cascadeBest === CASCADE_LEVELS.length && cascadeTime != null;
      if (fullyCompleted) {
        const puz = buildCascadePuzzle(CASCADE_LEVELS.length - 1, getCascadeRunSeed(idx));
        setCascadeLevel(CASCADE_LEVELS.length - 1);
        setFills(solutionFillsFromPuzzle(puz));
        setAttempts(0);
        setElapsedTime(cascadeTime);
        setGameState("won");
        setLockedCells(new Set(puz.blanks));
        setSelectedCell(null);
        setSelectedToken(null);
        setWrongCells(new Set());
        setClearedBlanks(new Set());
        setShowParticles(false);
        setGridEpoch((e) => e + 1);
        stopTimer();
        setView("play");
        return;
      }
      const runStateMap = prog.cascadeRunState || {};
      const saved = runStateMap[idx];
      const resume = !!saved;
      const startLevel = resume ? saved.level : 0;
      cascadeElapsed = resume ? (saved.elapsedSeconds ?? 0) : 0;
      const startFills = resume ? (saved.fills ?? {}) : {};
      const startAttempts = resume ? (saved.attempts ?? 0) : 0;
      setCascadeLevel(startLevel);
      setCascadeLives(3);
      setFills(startFills);
      setAttempts(startAttempts);
      setElapsedTime(cascadeElapsed);
      const runState = { level: startLevel, elapsedSeconds: cascadeElapsed, fills: startFills, attempts: startAttempts };
      const nextProgress = { ...progress, cascadeRunState: { ...(progress.cascadeRunState || {}), [idx]: runState }, cascadeRunStateLastIndex: idx };
      setProgress(nextProgress);
      saveProgress(nextProgress);
    } else {
      // Non-cascade: if level already completed (and not force restart), show completed state (filled grid + time)
      let puz;
      let lookupKey;
      if (effectiveDiff === "daily" && dailyDate) {
        const seed = getDailySeedForDate(dailyDate);
        puz = buildDailyPuzzle(seed);
        lookupKey = seed;
      } else {
        const puzzleSet = PUZZLE_SETS[effectiveDiff] || [];
        puz = puzzleSet[idx];
        lookupKey = idx;
      }
      const prog = loadProgress();
      const tms = loadTimes();
      const dProg = prog[effectiveDiff] || {};
      const dTimes = tms[effectiveDiff] || {};
      const savedAttempts = dProg[lookupKey] ?? 0;
      const savedTime = dTimes[lookupKey];
      const alreadyCompleted = !forceRestart && savedAttempts > 0 && savedTime != null && puz;
      if (alreadyCompleted) {
        setFills(solutionFillsFromPuzzle(puz));
        setAttempts(savedAttempts);
        setElapsedTime(savedTime);
        setGameState("won");
        setLockedCells(new Set(puz.blanks));
        setSelectedCell(null);
        setSelectedToken(null);
        setWrongCells(new Set());
        setClearedBlanks(new Set());
        setShowParticles(false);
        setGridEpoch((e) => e + 1);
        stopTimer();
        setView("play");
        return;
      }
      setFills({});
      setAttempts(0);
    }
    setSelectedCell(null);
    setSelectedToken(null);
    setGameState("playing");
    setWrongCells(new Set());
    setLockedCells(new Set());
    setClearedBlanks(new Set());
    setShowParticles(false);
    setGridEpoch((e) => e + 1);
    if (effectiveDiff !== "cascade") setElapsedTime(0);
    stopTimer();
    timerIsCascadeRun.current = effectiveDiff === "cascade";
    timerStart.current = Date.now() - cascadeElapsed * 1000;
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
      if (timerIsCascadeRun.current) {
        const p = loadProgress();
        const ri = cascadeRunIndexRef.current;
        const cur = p.cascadeRunState?.[ri];
        if (cur) {
          const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
          saveProgress({
            ...p,
            cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
            cascadeRunStateLastIndex: ri,
          });
        }
      }
    }, 1000);
    setView("play");
  };

  const resetCascadeLevelState = useCallback(() => {
    setFills({});
    // Attempts persist across cascade levels — do not reset
    setGameState("playing");
    setWrongCells(new Set());
    setClearedBlanks(new Set());
    setSelectedCell(null);
    setSelectedToken(null);
    setGridEpoch((e) => e + 1);
    // Timer is not reset — it persists across cascade stages for the whole run
  }, []);

  const resetBoard = () => {
    cancelWrongCellClear();
    setFills({});
    setSelectedCell(null);
    setSelectedToken(null);
    setAttempts(0);
    setWrongCells(new Set());
    setLockedCells(new Set());
    setClearedBlanks(new Set());
    setGridEpoch((e) => e + 1);
    // Restart the timer
    stopTimer();
    setElapsedTime(0);
    const isCasc = difficulty === "cascade";
    timerStart.current = Date.now();
    timerIsCascadeRun.current = isCasc;
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
      if (timerIsCascadeRun.current) {
        const p = loadProgress();
        const ri = cascadeRunIndexRef.current;
        const cur = p.cascadeRunState?.[ri];
        if (cur) {
          const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
          saveProgress({
            ...p,
            cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
            cascadeRunStateLastIndex: ri,
          });
        }
      }
    }, 1000);
    // Update persisted cascade run state if applicable
    if (isCasc) {
      const p = loadProgress();
      const ri = cascadeRunIndexRef.current;
      const cur = p.cascadeRunState?.[ri];
      if (cur) {
        saveProgress({
          ...p,
          cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: 0, fills: {}, attempts: 0 } },
        });
      }
    }
  };

  const paintCell = useCallback((r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key)) return;
    if (lockedCells.has(key)) return;
    if (selectedToken) {
      if (fills[key] === selectedToken) {
        cancelWrongCellClear();
        setClearedBlanks(prev => new Set(prev).add(key));
        setFills(prev => { const next = { ...prev }; delete next[key]; return next; });
        setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        return;
      }
      cancelWrongCellClear();
      if (puzzle.mode !== "hard" && (tokenRemaining[selectedToken] ?? 0) <= 0) return;
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }, [gameState, puzzle, lockedCells, selectedToken, fills, tokenRemaining, cancelWrongCellClear]);

  const applyCellAction = useCallback((r, c) => {
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key) || lockedCells.has(key)) return;
    if (selectedToken) {
      if (fills[key] === selectedToken) {
        cancelWrongCellClear();
        setClearedBlanks(prev => new Set(prev).add(key));
        setFills(prev => { const next = { ...prev }; delete next[key]; return next; });
        setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        return;
      }
      cancelWrongCellClear();
      if (puzzle.mode !== "hard" && (tokenRemaining[selectedToken] ?? 0) <= 0) return;
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      setSelectedCell(key);
    }
  }, [gameState, puzzle, lockedCells, selectedToken, fills, tokenRemaining, cancelWrongCellClear]);

  const handleCellPointerUp = useCallback((r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    const isSameCellAsPress = pendingCellRef.current === key;
    if (isSameCellAsPress) {
      applyCellAction(r, c);
      justHandledInPointerUpRef.current = key;
      pendingCellRef.current = null;
    }
  }, [gameState, applyCellAction]);

  const handleCellClick = (r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (key === justHandledInPointerUpRef.current) {
      justHandledInPointerUpRef.current = null;
      return;
    }
    applyCellAction(r, c);
  };

  const handleCellPointerDown = (r, c) => {
    if (!selectedToken || gameState !== "playing") return;
    isPainting.current = true;
    pendingCellRef.current = `${r}-${c}`;
  };

  const handleCellPointerEnter = (r, c) => {
    if (!isPainting.current || !selectedToken) return;
    pendingCellRef.current = null;
    paintCell(r, c);
  };

  useEffect(() => {
    const stopPaint = () => {
      isPainting.current = false;
      if (pendingCellRef.current) {
        const key = pendingCellRef.current;
        pendingCellRef.current = null;
        const [r, c] = key.split("-").map(Number);
        paintCell(r, c);
      }
    };
    window.addEventListener("pointerup", stopPaint);
    window.addEventListener("pointercancel", stopPaint);
    return () => {
      window.removeEventListener("pointerup", stopPaint);
      window.removeEventListener("pointercancel", stopPaint);
    };
  }, [paintCell]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    if (selectedCell && puzzle.blanks.has(selectedCell) && !lockedCells.has(selectedCell)) {
      if (puzzle.mode !== "hard" && fills[selectedCell] !== token && (tokenRemaining[token] ?? 0) <= 0) return;
      cancelWrongCellClear();
      setFills(prev => ({ ...prev, [selectedCell]: token }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(selectedCell); return n; });
      setSelectedCell(null);
    }
  };

  const maxAttempts = isCascade ? 11 : isBlind ? 6 : 5;

  const checkSolution = () => {
    if (!puzzle) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    let allCorrect = true;
    const wrong = new Set();
    const newLocked = new Set(lockedCells);

    // Check which blanks are still active (not locked)
    const activeBlanks = [...puzzle.blanks].filter(k => !lockedCells.has(k));

    for (const key of activeBlanks) {
      const [r, c] = key.split("-").map(Number);
      if (fills[key] === puzzle.solution[r][c]) {
        if (isBlind) newLocked.add(key); // lock correct cells in blind mode
      } else {
        allCorrect = false;
        wrong.add(key);
      }
    }

    // In blind mode, also need all locked from before to count
    if (isBlind) {
      // Check if ALL blanks are now correct (locked + newly correct active)
      const allBlanksCorrect = [...puzzle.blanks].every(k => {
        const [r, c] = k.split("-").map(Number);
        return fills[k] === puzzle.solution[r][c];
      });
      allCorrect = allBlanksCorrect;
    }

    if (allCorrect) {
      if (isCascade) {
        const levelsCompleted = cascadeLevel + 1;
        const prevBest = (progress.cascade || {})[cascadeRunIndex] ?? 0;
        const newBest = Math.max(prevBest, levelsCompleted);
        const nextLevel = cascadeLevel + 1;
        if (cascadeLevel < CASCADE_LEVELS.length - 1) {
          const runState = { level: nextLevel, elapsedSeconds: getElapsedSeconds(), fills: {}, attempts: newAttempts };
          const nextRunState = { ...(progress.cascadeRunState || {}), [cascadeRunIndex]: runState };
          const newProgress = { ...progress, cascade: { ...(progress.cascade || {}), [cascadeRunIndex]: newBest }, cascadeRunState: nextRunState, cascadeRunStateLastIndex: cascadeRunIndex };
          setProgress(newProgress);
          saveProgress(newProgress);
        } else {
          const nextRunState = { ...(progress.cascadeRunState || {}) };
          delete nextRunState[cascadeRunIndex];
          const newProgress = { ...progress, cascade: { ...(progress.cascade || {}), [cascadeRunIndex]: newBest }, cascadeRunState: nextRunState, cascadeRunStateLastIndex: cascadeRunIndex };
          setProgress(newProgress);
          saveProgress(newProgress);
          const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : 0;
          const tms = loadTimes();
          const newCascadeTimes = { ...(tms.cascade || {}), [cascadeRunIndex]: finalTime };
          const newTimes = { ...tms, cascade: newCascadeTimes };
          setTimes(newTimes);
          saveTimes(newTimes);
        }
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1500);
        if (cascadeLevel < CASCADE_LEVELS.length - 1) {
          // Don't stop timer — it continues across cascade levels
          // Batch level change with state reset so the new puzzle and
          // cleared fills render in the same React commit — avoids a
          // flash of stale cell colours from the previous level.
          setTimeout(() => {
            setCascadeLevel((l) => l + 1);
            resetCascadeLevelState();
          }, 400);
        } else {
          setGameState("won");
          stopTimer();
        }
      } else {
        setGameState("won");
        stopTimer();
        const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : elapsedTime;
        if (isBlind) setLockedCells(new Set([...puzzle.blanks]));
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1500);
        const newDiffProgress = { ...diffProgress, [progressKey]: newAttempts };
        const newProgress = { ...progress, [difficulty]: newDiffProgress };
        setProgress(newProgress);
        saveProgress(newProgress);
        const diffTimes = times[difficulty] || {};
        const newDiffTimes = { ...diffTimes, [progressKey]: finalTime };
        const newTimes = { ...times, [difficulty]: newDiffTimes };
        setTimes(newTimes);
        saveTimes(newTimes);
      }
      } else if (newAttempts >= maxAttempts) {
      if (isCascade) {
        const levelsReached = cascadeLevel;
        const prevBest = (progress.cascade || {})[cascadeRunIndex] ?? 0;
        const newBest = Math.max(prevBest, levelsReached);
        const nextRunState = { ...(progress.cascadeRunState || {}) };
        delete nextRunState[cascadeRunIndex];
        const newProgress = { ...progress, cascade: { ...(progress.cascade || {}), [cascadeRunIndex]: newBest }, cascadeRunState: nextRunState, cascadeRunStateLastIndex: cascadeRunIndex };
        setProgress(newProgress);
        saveProgress(newProgress);
        setGameState("lost");
        stopTimer();
        setWrongCells(wrong);
      } else {
        setGameState("lost");
        stopTimer();
        setWrongCells(wrong);
        if (isBlind) setLockedCells(newLocked);
        const newDiffProgress = { ...diffProgress, [progressKey]: 0 };
        const newProgress = { ...progress, [difficulty]: newDiffProgress };
        setProgress(newProgress);
        saveProgress(newProgress);
      }
    } else {
      setWrongCells(wrong);
      if (isBlind) {
        setLockedCells(newLocked);
      }
      // Wait for all wrong-cell fall-off animations to finish (staggered delay + duration) before clearing
      if (wrongCellClearTimeoutRef.current) {
        clearTimeout(wrongCellClearTimeoutRef.current);
        wrongCellClearTimeoutRef.current = null;
      }
      const n = puzzle.gridSize * puzzle.gridSize;
      const maxStagger = (n - 1) * 0.015;
      const fallOffDuration = 0.32;
      const clearDelayMs = (maxStagger + fallOffDuration + 0.05) * 1000;
      const wrongSet = wrong;
      wrongCellClearTimeoutRef.current = setTimeout(() => {
        wrongCellClearTimeoutRef.current = null;
        setClearedBlanks(prev => { const next = new Set(prev); for (const k of wrongSet) next.add(k); return next; });
        setFills(prev => {
          const next = { ...prev };
          for (const k of wrongSet) delete next[k];
          return next;
        });
        setWrongCells(new Set());
      }, clearDelayMs);
    }
  };

  // For blind mode: all non-locked blanks must be filled
  const activeBlanks = puzzle ? [...puzzle.blanks].filter(k => !lockedCells.has(k)) : [];
  const allFilled = isBlind
    ? activeBlanks.every(k => fills[k])
    : puzzle ? [...puzzle.blanks].every(k => fills[k]) : false;

  const completedCount = isCascade
    ? Object.keys(diffProgress).filter(k => /^\d+$/.test(k) && diffProgress[k] === CASCADE_LEVELS.length).length
    : isDaily
      ? Object.values(diffProgress).filter(v => v > 0).length
      : Object.keys(diffProgress).filter(k => diffProgress[k] > 0).length;
  const totalAttempted = isCascade
    ? Object.keys(diffProgress).filter(k => /^\d+$/.test(k)).length
    : Object.keys(diffProgress).length;

  const diffTimes = times[difficulty] || {};

  const getShareData = () => {
    const sections = [];
    let totalSolved = 0;
    let totalGold = 0, totalSilver = 0, totalBronze = 0, totalFailed = 0;
    let bestTimeAll = null;

    for (const d of DIFFICULTIES) {
      const dp = progress[d.key] || {};
      const dt = times[d.key] || {};
      let solved = 0, gold = 0, silver = 0, bronze = 0, failed = 0;
      let bestTime = null, totalTime = 0, timedCount = 0;
      const grid = [];

      for (let i = 0; i < 50; i++) {
        const key = d.key === "daily" ? getDailyKey(i) : i;
        const result = dp[key];
        if (d.key === "cascade") {
          if (result === undefined) grid.push("none");
          else if (result === CASCADE_LEVELS.length) { solved++; gold++; grid.push("gold"); }
          else { failed++; grid.push("failed"); }
        } else {
          if (result === undefined) grid.push("none");
          else if (result === 0) { failed++; grid.push("failed"); }
          else if (result <= 2) { gold++; solved++; grid.push("gold"); }
          else if (result <= 4) { silver++; solved++; grid.push("silver"); }
          else { bronze++; solved++; grid.push("bronze"); }
          if (result > 0 && dt[key] != null) {
            if (bestTime === null || dt[key] < bestTime) bestTime = dt[key];
            totalTime += dt[key];
            timedCount++;
          }
        }
      }

      totalSolved += solved;
      totalGold += gold; totalSilver += silver; totalBronze += bronze; totalFailed += failed;
      if (bestTime != null && (bestTimeAll === null || bestTime < bestTimeAll)) bestTimeAll = bestTime;

      sections.push({
        ...d, solved, gold, silver, bronze, failed, bestTime, grid,
        avgTime: timedCount > 0 ? Math.round(totalTime / timedCount) : null,
      });
    }

    return { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll };
  };

  const tryNativeShare = async ({ title = "Agnus", text, url }) => {
    if (typeof navigator !== "undefined" && navigator.share && (text || url)) {
      try {
        await navigator.share({ title, text: text || undefined, url: url || undefined });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "cancelled";
      }
    }
    return "unavailable";
  };

  const generateShareText = () => {
    const { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll } = getShareData();
    const emojis = { easy: "\u2B50", medium: "\u26A1", hard: "\uD83D\uDD25", blind: "\uD83D\uDE48", daily: "\uD83D\uDCC5", cascade: "\uD83C\uDF00" };
    const blockChars = { none: "\u2591", failed: "\u2593", gold: "\u2588", silver: "\u2593", bronze: "\u2592" };

    let text = "Agnus \uD83E\uDDE9\n\n";
    for (const s of sections) {
      text += `${emojis[s.key]} ${s.label}: ${s.solved}/50 solved`;
      if (s.bestTime != null) text += ` \u2022 best ${formatTime(s.bestTime)}`;
      if (s.avgTime != null) text += ` \u2022 avg ${formatTime(s.avgTime)}`;
      text += "\n";
      for (let row = 0; row < 5; row++) {
        text += s.grid.slice(row * 10, (row + 1) * 10).map(g => blockChars[g]).join("") + "\n";
      }
      text += "\n";
    }
    text += `\u2605 ${totalGold} gold \u2022 \u25CF ${totalSilver} silver \u2022 \u25C6 ${totalBronze} bronze \u2022 \u2717 ${totalFailed} failed\n`;
    text += `Total: ${totalSolved}/300 solved`;
    if (bestTimeAll != null) text += ` \u2022 Fastest: ${formatTime(bestTimeAll)}`;
    return text;
  };

  const copyShareText = async () => {
    const text = generateShareText();
    const result = await tryNativeShare({ text });
    if (result === "shared") {
      setShareMsg("Shared!");
      setTimeout(() => setShareMsg(""), 2000);
      return;
    }
    if (result === "cancelled") return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setShareMsg("Copied!");
    setTimeout(() => setShareMsg(""), 2000);
  };

  const copyDailyShareText = async () => {
    const dailyData = progress.daily || {};
    const dailySolved = Object.values(dailyData).filter(v => v > 0).length;
    const cascadeSolved = Object.keys(progress.cascade || {}).filter(k => /^\d+$/.test(k) && (progress.cascade || {})[k] === CASCADE_LEVELS.length).length;
    const text = `Agnus \uD83E\uDDE9\n\uD83D\uDCC5 Daily: ${dailySolved} solved\n\uD83C\uDF00 Cascade: ${cascadeSolved}/50`;
    const result = await tryNativeShare({ text });
    if (result === "shared") {
      setShareMsg("Shared!");
      setTimeout(() => setShareMsg(""), 2000);
      return;
    }
    if (result === "cancelled") return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setShareMsg("Copied!");
    setTimeout(() => setShareMsg(""), 2000);
  };

  const gridSize = puzzle ? puzzle.gridSize : 5;
  const cellSize = gridSize <= 5 ? 56 : gridSize === 6 ? 48 : gridSize === 7 ? 42 : gridSize === 8 ? 38 : 34;
  const iconSize = gridSize <= 5 ? 28 : gridSize === 6 ? 24 : gridSize === 7 ? 22 : gridSize === 8 ? 18 : 16;
  const pickerSize = 48;

  // --- MENU VIEW ---
  if (view === "menu") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        <div style={{ textAlign: "center", marginBottom: 16, animation: "fadeUp 0.5s ease" }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: 4, margin: 0, color: C.accent }}>
            Agnus
          </h1>
          <p style={{ color: C.textDim, fontSize: 13, marginTop: 6, letterSpacing: 2 }}>
            find the pattern &middot; fill the gaps
          </p>
        </div>

        {/* Add to Home Screen hint for iOS Safari */}
        {isIOSSafariForHomescreenHint() && !homescreenHintDismissed && (
          <div style={{
            width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.01s ease both",
            borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.surface,
            padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>📱</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 4 }}>Add to Home Screen</div>
              <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5, margin: 0 }}>
                Tap the Share button (square with arrow) at the bottom of Safari, then scroll down and tap &ldquo;Add to Home Screen&rdquo; for quick access.
              </p>
            </div>
            <button
              onClick={() => {
                try { localStorage.setItem(HOMESCREEN_HINT_KEY, "1"); } catch { /* ignore */ }
                setHomescreenHintDismissed(true);
              }}
              style={{
                background: "none", border: "none", color: C.textDim, cursor: "pointer", padding: 4,
                fontSize: 18, lineHeight: 1, flexShrink: 0,
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Daily overview: streak, play today, share */}
        {(() => {
          const todayIdx = getTodayDailyIndex();
          const todayKey = getDailyKey(todayIdx);
          const todayResult = (progress.daily || {})[todayKey];
          const todayTime = (times.daily || {})[todayKey];
          const streak = getDailyStreak(progress);
          const todayLabel = getDailyDateLabel(todayIdx);
          return (
            <div style={{
              width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.02s ease both",
              borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`,
              backgroundColor: C.surface, padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.accent }}>Today: {todayLabel}</span>
                  {streak > 0 && (
                    <span style={{ fontSize: 12, color: C.textDim }}>🔥 {streak} day streak</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {todayResult > 0 && (
                    <span style={{ fontSize: 11, color: C.textDim }}>
                      <ScoreBadge attempts={todayResult} />
                      {todayTime != null && ` ${formatTime(todayTime)}`}
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      const medal = todayResult <= 2 ? "\u2605" : todayResult <= 4 ? "\u25CF" : "\u25C6";
                      const streakPart = streak > 0 ? ` 🔥 ${streak} day streak` : "";
                      const dailyUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=daily&date=${todayLabel}` : "";
                      const text = todayResult > 0
                        ? `Agnus Daily ${todayLabel}\n${medal} Solved in ${todayResult} attempt${todayResult !== 1 ? "s" : ""} \u2022 ${formatTime(todayTime)}${streakPart}`
                        : `Agnus Daily ${todayLabel}\n\uD83E\uDDE9 One puzzle per day`;
                      const result = await tryNativeShare({ text, url: dailyUrl });
                      if (result === "shared") {
                        setDailyShareMsg("Shared!");
                        setTimeout(() => setDailyShareMsg(""), 2000);
                        return;
                      }
                      if (result === "cancelled") return;
                      try { await navigator.clipboard.writeText(text + "\n" + dailyUrl); } catch { /* fallback */ }
                      setDailyShareMsg("Copied!");
                      setTimeout(() => setDailyShareMsg(""), 2000);
                    }}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                      background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                    }}
                  >
                    {dailyShareMsg || "Share"}
                  </button>
                  <button
                    onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, todayLabel); }}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: C.accent, color: C.bg, border: "none", cursor: "pointer",
                    }}
                  >
                    {todayResult > 0 ? "View today's result" : "Play today"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Mode selector: two rows — Easy / Medium / Hard, then Blind / Daily / Cascade */}
        <div style={{
          marginBottom: 20, animation: "fadeUp 0.5s 0.05s ease both",
          width: "100%", maxWidth: 360,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {[ROW1_KEYS, ROW2_KEYS].map((rowKeys, rowIdx) => (
            <div key={rowIdx} style={{ display: "flex", gap: 8 }}>
              {rowKeys.map((key) => {
                const d = DIFFICULTIES.find((x) => x.key === key);
                if (!d) return null;
                const active = difficulty === d.key;
                const dp = progress[d.key] || {};
                const solved = d.key === "cascade"
                  ? Object.keys(dp).filter((k) => /^\d+$/.test(k) && dp[k] === CASCADE_LEVELS.length).length
                  : Object.keys(dp).filter((k) => dp[k] > 0).length;
                return (
                  <button
                    key={d.key}
                    onClick={() => setDifficulty(d.key)}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      background: active ? (d.key === "blind" ? "#e06040" : C.accent) : C.surface,
                      color: active ? (d.key === "blind" ? "#fff" : C.bg) : C.textDim,
                      border: `1px solid ${active ? "transparent" : C.border}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      fontWeight: active ? 700 : 400,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      transition: "background 0.2s, color 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{d.label}</span>
                    <span style={{
                      fontSize: 8,
                      color: active ? (d.key === "blind" ? "#fff9" : C.bg + "aa") : C.textDim,
                    }}>{d.desc}</span>
                    <span style={{ fontSize: 8, color: active ? (d.key === "blind" ? "#fff7" : C.bg + "88") : C.textDim }}>{d.key === "daily" ? `${solved} solved` : `${solved}/50`}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Stats summary with inline share */}
        {isDaily ? (
          <div style={{
            display: "flex", gap: 24, marginBottom: 24, animation: "fadeUp 0.5s 0.1s ease both",
            padding: "12px 24px", borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
            alignItems: "center",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Solved</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.accent }}>{completedCount}</div>
            </div>
            <div style={{ width: 1, alignSelf: "stretch", backgroundColor: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Streak</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.gold }}>{getDailyStreak(progress)}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowShareModal(true)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
            >
              Stats
            </button>
          </div>
        ) : (
          <div style={{
            display: "flex", gap: 24, marginBottom: 24, animation: "fadeUp 0.5s 0.1s ease both",
            padding: "12px 24px", borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
            alignItems: "center",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Solved</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.accent }}>{completedCount}</div>
            </div>
            <div style={{ width: 1, alignSelf: "stretch", backgroundColor: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Attempted</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700 }}>{totalAttempted}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowShareModal(true)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
            >
              Stats
            </button>
          </div>
        )}

        {/* Birthday panel — same layout as "play today" */}
        {isDaily && (() => {
          const todaySeed = getDailySeedForIndex(0);
          if (!birthday) {
            return (
              <div style={{
                width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.03s ease both",
                borderRadius: 12, overflow: "hidden", border: `1px solid #F472B633`,
                backgroundColor: C.surface, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: "#F472B6" }}>
                    {"\uD83C\uDF82"} Birthday puzzle
                  </span>
                  <button
                    onClick={() => setShowBirthdayPrompt(true)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: "#F472B6", color: "#fff", border: "none", cursor: "pointer",
                    }}
                  >
                    Set birthday
                  </button>
                </div>
              </div>
            );
          }
          const bdParts = birthday.split("-").map(Number);
          const bdDay = bdParts[0], bdMonthNum = bdParts[1], bdYearNum = bdParts.length === 3 ? bdParts[2] : null;
          const bdDateStr = birthday;
          const bdSeed = getDailySeedForDate(bdDateStr);
          const bdResult = (progress.daily || {})[bdSeed];
          const bdTime = (times.daily || {})[bdSeed];
          const bdSolved = bdResult > 0;
          const bdIsFuture = bdSeed > todaySeed;
          const bdUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=daily&date=${bdDateStr}` : "";
          const bdLabel = `${String(bdDay).padStart(2, "0")}-${String(bdMonthNum).padStart(2, "0")}${bdYearNum ? `-${bdYearNum}` : ""}`;
          return (
            <div style={{
              width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.03s ease both",
              borderRadius: 12, overflow: "hidden", border: `1px solid #F472B633`,
              backgroundColor: C.surface, padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: "#F472B6" }}>
                    {"\uD83C\uDF82"} {bdLabel}
                  </span>
                  {bdSolved && (
                    <span style={{ fontSize: 11, color: C.textDim }}>
                      <ScoreBadge attempts={bdResult} />
                      {bdTime != null && ` ${formatTime(bdTime)}`}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {bdYearNum && !bdIsFuture && (
                    <button
                      onClick={async () => {
                        const medal = bdSolved && bdResult <= 2 ? "\u2605" : bdResult <= 4 ? "\u25CF" : "\u25C6";
                        const text = bdSolved
                          ? `\uD83C\uDF82 My Agnus birthday puzzle (${bdDateStr})\n${medal} Solved in ${bdResult} attempt${bdResult !== 1 ? "s" : ""} \u2022 ${formatTime(bdTime)}\nCan you beat it?\n${bdUrl}`
                          : `\uD83C\uDF82 Try my Agnus birthday puzzle!\n${bdDateStr}\n${bdUrl}`;
                        const result = await tryNativeShare({ text, url: bdUrl });
                        if (result === "shared") { setDailyShareMsg("Shared!"); setTimeout(() => setDailyShareMsg(""), 2000); return; }
                        if (result === "cancelled") return;
                        try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
                        setDailyShareMsg("Copied!");
                        setTimeout(() => setDailyShareMsg(""), 2000);
                      }}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                        background: "none", border: `1px solid #F472B644`, color: "#F472B6", cursor: "pointer",
                      }}
                    >
                      {dailyShareMsg || "Share"}
                    </button>
                  )}
                  {bdYearNum && !bdIsFuture ? (
                    <button
                      onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, bdDateStr); }}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                        background: "#F472B6", color: "#fff", border: "none", cursor: "pointer",
                      }}
                    >
                      {bdSolved ? "View" : "Play"}
                    </button>
                  ) : bdIsFuture ? (
                    <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Space Mono', monospace" }}>
                      Not yet available
                    </span>
                  ) : null}
                  <button
                    onClick={() => setShowBirthdayPrompt(true)}
                    style={{
                      padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                      background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Daily calendar picker */}
        {isDaily && (() => {
          const todaySeed = getDailySeedForIndex(0);
          const now = new Date();
          const todayUTCYear = now.getUTCFullYear();
          const todayUTCMonth = now.getUTCMonth();
          const todayUTCDate = now.getUTCDate();
          const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
          const firstDayOfWeek = new Date(Date.UTC(calendarYear, calendarMonth, 1)).getUTCDay();
          const startOffset = (firstDayOfWeek + 6) % 7; // Monday = 0
          const canGoForward = calendarYear < todayUTCYear || (calendarYear === todayUTCYear && calendarMonth < todayUTCMonth);
          const isViewingCurrentMonth = calendarYear === todayUTCYear && calendarMonth === todayUTCMonth;
          // Parse birthday for calendar highlighting
          const bdParts = birthday ? birthday.split("-").map(Number) : null;
          const bdDay = bdParts ? bdParts[0] : null;
          const bdMonth = bdParts ? bdParts[1] : null;
          const bdYear = bdParts && bdParts.length === 3 ? bdParts[2] : null;
          const isBirthdayMonth = bdMonth != null && (calendarMonth + 1) === bdMonth;
          const cells = [];
          for (let i = 0; i < startOffset; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${String(d).padStart(2, "0")}-${String(calendarMonth + 1).padStart(2, "0")}-${calendarYear}`;
            const seed = getDailySeedForDate(dateStr);
            const result = (progress.daily || {})[seed];
            const time = (times.daily || {})[seed];
            const isFuture = seed > todaySeed;
            const isToday = calendarYear === todayUTCYear && calendarMonth === todayUTCMonth && d === todayUTCDate;
            const isBirthday = isBirthdayMonth && d === bdDay;
            const isExactBirthday = isBirthday && bdYear != null && calendarYear === bdYear;
            cells.push({ day: d, dateStr, seed, result, time, isFuture, isToday, isBirthday, isExactBirthday });
          }
          const handleGoToDate = (e) => {
            const val = e.target.value;
            if (!val) return;
            const [year, month, day] = val.split("-").map(Number);
            if (!year || !month || !day) return;
            setCalendarYear(year);
            setCalendarMonth(month - 1);
            // Reset the input so the same date can be re-selected
            e.target.value = "";
          };
          const todayISO = `${todayUTCYear}-${String(todayUTCMonth + 1).padStart(2, "0")}-${String(todayUTCDate).padStart(2, "0")}`;
          return (
            <div style={{ maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both" }}>
              {/* Month navigation with Today button */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
              }}>
                <button
                  onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }}
                  style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px",
                    color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 14, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                >&larr;</button>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 1 }}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={() => { if (canGoForward) { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); } }}
                  disabled={!canGoForward}
                  style={{
                    background: "none", border: `1px solid ${canGoForward ? C.border : C.border + "44"}`, borderRadius: 8, padding: "6px 12px",
                    color: canGoForward ? C.textDim : C.textDim + "44", cursor: canGoForward ? "pointer" : "default",
                    fontFamily: "'Space Mono', monospace", fontSize: 14, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canGoForward) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                  onMouseLeave={e => { if (canGoForward) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; } }}
                >&rarr;</button>
              </div>
              {/* Today button + Go to date */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", justifyContent: "center" }}>
                {!isViewingCurrentMonth && (
                  <button
                    onClick={() => { setCalendarYear(todayUTCYear); setCalendarMonth(todayUTCMonth); }}
                    style={{
                      background: "none", border: `1px solid ${C.accent}`, borderRadius: 8, padding: "5px 12px",
                      color: C.accent, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10,
                      fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.accent; e.currentTarget.style.color = C.bg; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.accent; }}
                  >
                    Today
                  </button>
                )}
                <label
                  style={{
                    position: "relative", display: "inline-block",
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px",
                    color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10,
                    fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                >
                  Jump to date
                  <input
                    ref={goToDateRef}
                    type="date"
                    max={todayISO}
                    onChange={handleGoToDate}
                    style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                      opacity: 0, cursor: "pointer", colorScheme: "dark",
                    }}
                  />
                </label>
              </div>
              {/* Day-of-week headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} style={{
                    textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: 9,
                    color: C.textDim, letterSpacing: 0.5, padding: "4px 0",
                  }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {cells.map((cell, i) => {
                  if (!cell) return <div key={`empty-${i}`} />;
                  const solved = cell.result > 0;
                  const failed = cell.result === 0 && cell.result !== undefined;
                  const isBd = cell.isBirthday || cell.isExactBirthday;
                  const borderColor = cell.isToday ? C.accent : isBd ? "#F472B6" : solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border;
                  const bgColor = isBd ? "#F472B620" : solved ? C.correct + "15" : failed ? C.incorrect + "10" : C.surface;
                  const numColor = cell.isFuture ? C.textDim + "44" : cell.isToday ? C.accent : isBd ? "#F472B6" : solved ? C.correct : failed ? C.incorrect : C.text;
                  return (
                    <button
                      key={cell.day}
                      disabled={cell.isFuture}
                      onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, cell.dateStr); }}
                      style={{
                        aspectRatio: "1", borderRadius: 8, border: `1.5px solid ${borderColor}`,
                        backgroundColor: bgColor,
                        cursor: cell.isFuture ? "default" : "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 1,
                        transition: "all 0.15s", position: "relative", minWidth: 0,
                        opacity: cell.isFuture ? 0.35 : 1,
                      }}
                      onMouseEnter={e => { if (!cell.isFuture) { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.borderColor = C.accent; } }}
                      onMouseLeave={e => { if (!cell.isFuture) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = borderColor; } }}
                    >
                      {isBd && (
                        <span style={{ position: "absolute", top: -2, right: -2, fontSize: 9, lineHeight: 1 }}>
                          {cell.isExactBirthday ? "\uD83C\uDF82" : "\uD83C\uDF70"}
                        </span>
                      )}
                      <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: cell.isToday ? 800 : isBd ? 800 : 600,
                        color: numColor, lineHeight: 1,
                      }}>{cell.day}</span>
                      {solved && <ScoreBadge attempts={cell.result} />}
                      {solved && cell.time != null && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: C.textDim, lineHeight: 1 }}>
                          {formatTime(cell.time)}
                        </span>
                      )}
                      {failed && <span style={{ fontSize: 8, color: C.incorrect }}>{"\u2717"}</span>}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{
                marginTop: 16, display: "flex", gap: 16, fontSize: 11, color: C.textDim,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                flexWrap: "wrap", justifyContent: "center",
              }}>
                <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
                <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
                <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
                <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
                {birthday && <span><span style={{ color: "#F472B6" }}>{"\uD83C\uDF82"}</span> birthday</span>}
              </div>

            </div>
          );
        })()}

        {/* Birthday prompt modal */}
        {showBirthdayPrompt && (
          <div onClick={() => setShowBirthdayPrompt(false)} style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            animation: "fadeUp 0.25s ease",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 20,
              padding: "28px 24px", maxWidth: 340, width: "100%",
              boxShadow: `0 24px 64px rgba(0,0,0,0.5)`,
            }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>{"\uD83C\uDF82"}</span>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#F472B6", margin: "8px 0 4px" }}>
                  Set your birthday
                </h3>
                <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                  We'll highlight it on the calendar and let you play &amp; share the puzzle from your birth date.
                </p>
              </div>
              <input
                type="date"
                value={birthdayInput}
                onChange={e => setBirthdayInput(e.target.value)}
                max={(() => { const n = new Date(); return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,"0")}-${String(n.getUTCDate()).padStart(2,"0")}`; })()}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`,
                  backgroundColor: C.surface, color: C.text, fontFamily: "'Space Mono', monospace", fontSize: 14,
                  outline: "none", boxSizing: "border-box", marginBottom: 16,
                  colorScheme: "dark",
                }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  onClick={() => {
                    if (!birthdayInput) return;
                    const [y, m, d] = birthdayInput.split("-").map(Number);
                    const bdStr = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
                    setBirthday(bdStr);
                    try { localStorage.setItem(BIRTHDAY_KEY, bdStr); } catch { /* ignore */ }
                    setShowBirthdayPrompt(false);
                    setBirthdayInput("");
                    // Navigate calendar to birthday month/year
                    setCalendarYear(y);
                    setCalendarMonth(m - 1);
                  }}
                  disabled={!birthdayInput}
                  style={{
                    padding: "10px 28px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                    background: birthdayInput ? "#F472B6" : C.surfaceLight, color: birthdayInput ? "#fff" : C.textDim,
                    border: "none", cursor: birthdayInput ? "pointer" : "not-allowed",
                    textTransform: "uppercase",
                  }}
                >
                  Save
                </button>
                {birthday && (
                  <button
                    onClick={() => {
                      setBirthday(null);
                      try { localStorage.removeItem(BIRTHDAY_KEY); } catch { /* ignore */ }
                      setShowBirthdayPrompt(false);
                      setBirthdayInput("");
                    }}
                    style={{
                      padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: "none", border: `1px solid ${C.incorrect}`, color: C.incorrect,
                      cursor: "pointer", textTransform: "uppercase",
                    }}
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => { setShowBirthdayPrompt(false); setBirthdayInput(""); }}
                  style={{
                    padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    background: "none", border: `1px solid ${C.border}`, color: C.textDim,
                    cursor: "pointer", textTransform: "uppercase",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Puzzle grid: 50 for non-daily modes */}
        {!isDaily && (<>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
          maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
        }}>
          {(isCascade ? Array.from({ length: 50 }, (_, i) => i) : puzzles).map((p, i) => {
            const idx = isCascade ? i : p?.id ?? i;
            const result = isCascade ? (diffProgress[idx] ?? -1) : diffProgress[idx];
            const solved = isCascade ? result === CASCADE_LEVELS.length : result > 0;
            const failed = isCascade ? (result >= 0 && result < CASCADE_LEVELS.length) : result === 0;
            const cascadeRunState = progress.cascadeRunState || {};
            const cascadeInProgress = isCascade && result === -1 && cascadeRunState[idx] != null;
            const time = diffTimes[idx];
            const cascadeLevels = result >= 0 && result <= CASCADE_LEVELS.length ? result : null;
            const cascadeInProgressLevel = cascadeInProgress && cascadeRunState[idx]?.level != null ? cascadeRunState[idx].level : null;
            const cascadeLevelValid = (l) => typeof l === "number" && l >= 0 && l < CASCADE_LEVELS.length;
            const cascadeSizeLabel = isCascade
              ? cascadeLevels === CASCADE_LEVELS.length
                ? `${CASCADE_LEVELS[CASCADE_LEVELS.length - 1]}×${CASCADE_LEVELS[CASCADE_LEVELS.length - 1]}`
                : cascadeLevelValid(cascadeLevels)
                  ? `${CASCADE_LEVELS[cascadeLevels]}×${CASCADE_LEVELS[cascadeLevels]}`
                  : cascadeLevelValid(cascadeInProgressLevel)
                    ? `${CASCADE_LEVELS[cascadeInProgressLevel]}×${CASCADE_LEVELS[cascadeInProgressLevel]}`
                    : (cascadeLevels !== null || cascadeInProgressLevel !== null) ? "…" : null
              : null;
            const borderColor = solved ? C.correct + "66" : failed ? C.incorrect + "44" : cascadeInProgress ? C.inProgress + "99" : C.border;
            const bgColor = solved ? C.correct + "15" : failed ? C.incorrect + "10" : cascadeInProgress ? C.inProgress + "18" : C.surface;
            const numColor = solved ? C.correct : failed ? C.incorrect : cascadeInProgress ? C.inProgress : C.text;
            return (
              <button key={i} onClick={() => startPuzzle(i, view === "menu" ? difficulty : undefined)}
                style={{
                  aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${borderColor}`,
                  backgroundColor: bgColor,
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1,
                  transition: "all 0.15s", position: "relative", minWidth: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = borderColor; }}
              >
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700,
                  color: numColor, lineHeight: 1,
                }}>
                  {i + 1}
                </span>
                {isCascade ? (
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 9, color: cascadeInProgress ? C.inProgress : C.textDim,
                    minHeight: 12, display: "block", lineHeight: 1.2,
                  }}>
                    {cascadeSizeLabel ?? ""}
                  </span>
                ) : (
                  <>
                    {result !== undefined && <ScoreBadge attempts={result} />}
                    {solved && time != null && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.textDim, lineHeight: 1 }}>
                        {formatTime(time)}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: 24, display: "flex", gap: 16, fontSize: 11, color: C.textDim,
          fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, animation: "fadeUp 0.5s 0.25s ease both",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
          <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
          <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
          <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
        </div>
        </>)}

        {/* Share Modal */}
        {showShareModal && (() => {
          const { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll } = getShareData();
          const gridColors = { none: C.border, failed: C.incorrect, gold: C.gold, silver: C.silver, bronze: C.bronze };
          return (
            <div onClick={() => setShowShareModal(false)} style={{
              position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1000,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
              animation: "fadeUp 0.25s ease",
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 20,
                padding: "28px 24px", maxWidth: 380, width: "100%",
                boxShadow: `0 24px 64px rgba(0,0,0,0.5)`, maxHeight: "90vh", overflowY: "auto",
              }}>
                {/* Modal header */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, margin: 0, color: C.accent }}>
                    Agnus
                  </h2>
                  <p style={{ color: C.textDim, fontSize: 11, marginTop: 4, letterSpacing: 1 }}>my stats</p>
                </div>

                {/* Overall stats */}
                <div style={{
                  display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 20,
                  padding: "10px 16px", borderRadius: 10, backgroundColor: C.surface, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.accent }}>{totalSolved}</div>
                    <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>solved</div>
                  </div>
                  <div style={{ width: 1, backgroundColor: C.border }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700 }}>300</div>
                    <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>total</div>
                  </div>
                  {getDailyStreak(progress) > 0 && (
                    <>
                      <div style={{ width: 1, backgroundColor: C.border }} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.gold }}>🔥 {getDailyStreak(progress)}</div>
                        <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>day streak</div>
                      </div>
                    </>
                  )}
                  {bestTimeAll != null && (
                    <>
                      <div style={{ width: 1, backgroundColor: C.border }} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.correct }}>{formatTime(bestTimeAll)}</div>
                        <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>fastest</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Per-difficulty sections */}
                {sections.map(s => (
                  <div key={s.key} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: s.key === "blind" ? "#e06040" : C.text, letterSpacing: 1, textTransform: "uppercase" }}>
                        {s.label}
                      </span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.accent, fontWeight: 700 }}>
                        {s.solved}/50
                      </span>
                      {s.bestTime != null && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.textDim }}>
                          best {formatTime(s.bestTime)}
                        </span>
                      )}
                      {s.avgTime != null && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.textDim }}>
                          avg {formatTime(s.avgTime)}
                        </span>
                      )}
                    </div>
                    {/* Visual grid - 10 columns x 5 rows */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(25, 1fr)", gap: 2 }}>
                      {s.grid.map((g, i) => (
                        <div key={i} style={{
                          aspectRatio: "1", borderRadius: 2,
                          backgroundColor: g === "none" ? C.surface : gridColors[g] + (g === "none" ? "" : "cc"),
                          border: `1px solid ${g === "none" ? C.border : gridColors[g]}44`,
                        }} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Medal summary */}
                <div style={{
                  display: "flex", justifyContent: "center", gap: 14, marginTop: 16, marginBottom: 18,
                  fontSize: 11, fontFamily: "'Space Mono', monospace", color: C.textDim,
                }}>
                  <span><span style={{ color: C.gold }}>{"\u2605"}</span> {totalGold}</span>
                  <span><span style={{ color: C.silver }}>{"\u25CF"}</span> {totalSilver}</span>
                  <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> {totalBronze}</span>
                  <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> {totalFailed}</span>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={copyShareText}
                    style={{
                      backgroundColor: C.accent, color: C.bg, border: "none",
                      padding: "10px 28px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    {shareMsg || "Copy all"}
                  </button>
                  <button onClick={copyDailyShareText}
                    style={{
                      backgroundColor: "transparent", color: C.accent, border: `1.5px solid ${C.accent}`,
                      padding: "10px 28px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.accent; e.currentTarget.style.color = C.bg; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.accent; }}
                  >
                    Copy Daily
                  </button>
                  <button onClick={() => setShowShareModal(false)}
                    style={{
                      backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                      padding: "10px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // --- PLAY VIEW ---
  const diffLabel = isDaily ? "Daily" : isCascade ? "Cascade" : DIFFICULTIES.find(d => d.key === difficulty)?.label || "";
  const cascadeLevelLabel = isCascade && puzzle ? `${puzzle.gridSize}×${puzzle.gridSize}` : null;
  const totalPuzzles = puzzles.length;
  const lockedCount = lockedCells.size;
  const totalBlanks = puzzle ? puzzle.blanks.size : 0;

  return (
    <div
      ref={playViewScrollRef}
      style={{
      height: "100dvh", minHeight: "100dvh", backgroundColor: C.bg, color: C.text,
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 16px", position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      overflow: "hidden", overscrollBehavior: "none", touchAction: "none",
      boxSizing: "border-box",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap'); @keyframes particlePop { 0%{transform:scale(0);opacity:1} 50%{opacity:1} 100%{transform:scale(1) translateY(-40px);opacity:0} } @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} } @keyframes slideIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} } @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} } @keyframes fallIntoPlace { 0%{opacity:0;transform:translateY(-36px) scale(0.82)} 60%{transform:translateY(3px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} } @keyframes fallOff { 0%{opacity:1;transform:translateY(0) scale(1) rotate(0deg)} 8%{transform:translateY(-4px) scale(1.04) rotate(-3deg)} 100%{opacity:0;transform:translateY(180%) scale(0.75) rotate(18deg)} } @keyframes emptyCellIn { 0%{opacity:0} 100%{opacity:0.45} } @keyframes tilesWinCelebrate { 0%{transform:translateY(0) rotate(0deg) scale(1)} 30%{transform:translateY(-28px) rotate(180deg) scale(1.08)} 70%{transform:translateY(-32px) rotate(360deg) scale(1.08)} 100%{transform:translateY(0) rotate(360deg) scale(1)} } .token-picker-scroll::-webkit-scrollbar { display: none; }`}</style>

      <Particles show={showParticles} />

      {/* Top bar - fixed at top so it always stays visible */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: C.bg,
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
        display: "flex", justifyContent: "center", boxSizing: "border-box",
        touchAction: "manipulation",
      }}>
        <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: gridSize >= 7 ? 380 : 360, animation: "fadeUp 0.3s ease" }}>
        <button onClick={() => {
          if (difficulty === "cascade") {
            const runState = { level: cascadeLevel, elapsedSeconds: getElapsedSeconds(), fills: { ...fills }, attempts };
            const nextProgress = { ...progress, cascadeRunState: { ...(progress.cascadeRunState || {}), [cascadeRunIndex]: runState }, cascadeRunStateLastIndex: cascadeRunIndex };
            setProgress(nextProgress);
            saveProgress(nextProgress);
          }
          stopTimer();
          setView("menu");
        }}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
            color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
            fontSize: 12, letterSpacing: 1, transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
        >
          &larr; PUZZLES
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: isBlind ? "#e06040" : C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>
            {diffLabel}{isDaily && currentDailyDate ? ` ${currentDailyDate}` : ""}{isCascade && cascadeLevelLabel ? ` ${cascadeLevelLabel}` : ""}{" "}
          </span>
          {!isDaily && !isCascade && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: 3 }}>
              #{currentPuzzle + 1}
            </span>
          )}
        </div>
        <div style={{ width: 80, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <button
            onClick={async () => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              const result = await tryNativeShare({ title: "Agnus", text: "Check out this puzzle", url: url || undefined });
              if (result === "shared") {
                setShareMsg("Shared!");
                setTimeout(() => setShareMsg(""), 2000);
                return;
              }
              if (result === "cancelled") return;
              try { await navigator.clipboard.writeText(url); } catch { /* fallback */ }
              setShareMsg("Copied!");
              setTimeout(() => setShareMsg(""), 2000);
            }}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px",
              color: C.textDim, cursor: "pointer", fontSize: 12, transition: "all 0.15s",
            }}
            title="Share link to this level"
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            {shareMsg || "Share"}
          </button>
        </div>
        </div>
      </div>

      {/* Info row: fixed below header */}
      <div style={{
        position: "fixed", top: "calc(48px + env(safe-area-inset-top, 0px))", left: 0, right: 0, zIndex: 10,
        backgroundColor: C.bg, display: "flex", justifyContent: "center",
        paddingTop: 4, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: gridSize >= 7 ? 380 : 360 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: gameState === "won" ? C.correct : gameState === "lost" ? C.incorrect : C.text, letterSpacing: 2 }}>
            {formatTime(elapsedTime)}
          </div>
          <AttemptDots max={maxAttempts} used={attempts} won={gameState === "won"} />
        </div>
      </div>

      {/* Grid area: fills available space between fixed header and footer, centers grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "calc(80px + env(safe-area-inset-top, 0px))", paddingBottom: 140, width: "100%", overflow: "hidden" }}>
      <div key={gridEpoch} style={{ animation: "slideIn 0.3s ease both", touchAction: "none" }}>
        <div style={{
          display: "flex", flexDirection: "column", gap: gridSize >= 7 ? 3 : 4, padding: gridSize >= 7 ? 10 : 14,
          backgroundColor: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, boxShadow: `0 8px 32px ${C.bg}88`,
          overflow: "visible",
        }}>
          {puzzle.solution.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: gridSize >= 7 ? 3 : 4 }}>
              {row.map((token, c) => {
                const key = `${r}-${c}`;
                const isBlankCell = puzzle.blanks.has(key);
                const isLockedCell = lockedCells.has(key);
                const fillToken = isBlankCell ? (isLockedCell ? token : fills[key]) : token;
                const isRevealed = (gameState === "lost") && isBlankCell && !isLockedCell;
                const displayToken = isRevealed ? token : fillToken;
                const cellIndex = r * gridSize + c;
                const isWrongCell = wrongCells.has(key) && gameState !== "lost";
                const fallDelay = isBlankCell ? 0 : cellIndex * 0.032;
                const wrongFallDelay = isWrongCell ? cellIndex * 0.015 : 0;
                const totalCells = gridSize * gridSize;
                const emptyCellDelayRaw = (totalCells - 1) * 0.032 + 0.5;
                const emptyCellDelay = isBlankCell && clearedBlanks.has(key) ? null : emptyCellDelayRaw;
                const isWon = gameState === "won";
                const winCelebrateDelay = isWon ? cellIndex * 0.04 : 0;
                return (
                  <Cell key={key} token={displayToken} isBlank={isBlankCell}
                    isSelected={selectedCell === key}
                    isFilled={!!fills[key] || isLockedCell}
                    isCorrect={isWon && isBlankCell}
                    isWrong={isWrongCell}
                    isRevealed={isRevealed}
                    isLocked={isLockedCell && gameState === "playing"}
                    isPrefilled={!isBlankCell}
                    fallDelay={fallDelay}
                    wrongFallDelay={wrongFallDelay}
                    emptyCellDelay={emptyCellDelay}
                    isWon={isWon}
                    winCelebrateDelay={winCelebrateDelay}
                    onClick={() => handleCellClick(r, c)}
                    onPointerDown={() => handleCellPointerDown(r, c)}
                    onPointerUp={() => handleCellPointerUp(r, c)}
                    onPointerEnter={() => handleCellPointerEnter(r, c)}
                    cellSize={cellSize} iconSize={iconSize}
                    mode={puzzle.mode}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Fixed bottom bar: token picker + actions */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, backgroundColor: C.bg, paddingTop: 10, paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderTop: `1px solid ${C.border}` }}>
        {/* Token picker row */}
        {gameState === "playing" && (
          <TokenPicker tokens={puzzle.usedTokens} selectedToken={selectedToken} onSelect={handleTokenSelect} cellSize={pickerSize} mode={puzzle.mode} remaining={tokenRemaining} />
        )}
        {gameState === "playing" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={allFilled ? checkSolution : undefined}
              disabled={!allFilled}
              style={{
                backgroundColor: allFilled ? (isBlind ? "#e06040" : C.accent) : C.surfaceLight,
                color: allFilled ? (isBlind ? "#fff" : C.bg) : C.textDim,
                border: "none",
                padding: "14px 48px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                cursor: allFilled ? "pointer" : "not-allowed",
                textTransform: "uppercase", transition: "all 0.2s",
                boxShadow: allFilled ? (isBlind ? "0 4px 20px #e0604044" : `0 4px 20px ${C.accent}44`) : "none",
                opacity: allFilled ? 1 : 0.7,
              }}
              onMouseEnter={e => { if (allFilled) e.target.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; }}
            >
              {isBlind ? "Guess" : "Check"}
            </button>
            {(Object.keys(fills).length > 0 || attempts > 0) && (
              <button
                onClick={resetBoard}
                style={{
                  backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                  padding: "14px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
              >
                Reset
              </button>
            )}
          </div>
        )}

        {gameState === "won" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.correct, marginBottom: 12, animation: "fadeUp 0.4s ease" }}>
              &#x2713; {isCascade ? "Cascade complete!" : isBlind ? "Cracked it!" : "Perfect"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={async () => {
                let text;
                if (isCascade) {
                  text = `Agnus Cascade \uD83E\uDDE9\nCompleted 3×3 → 9×9 \u2022 ${formatTime(elapsedTime)}`;
                } else if (isDaily) {
                  const medal = attempts <= 2 ? "\u2605" : attempts <= 4 ? "\u25CF" : "\u25C6";
                  const dailyUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=daily&date=${currentDailyDate}` : "";
                  text = `Agnus Daily ${currentDailyDate}\n${medal} Solved in ${attempts} attempt${attempts !== 1 ? "s" : ""} \u2022 ${formatTime(elapsedTime)}\n${dailyUrl}`;
                } else {
                  const medal = attempts <= 2 ? "\u2605" : attempts <= 4 ? "\u25CF" : "\u25C6";
                  text = `Agnus \uD83E\uDDE9 ${diffLabel} #${currentPuzzle + 1}\n${medal} Solved in ${attempts} attempt${attempts !== 1 ? "s" : ""} \u2022 ${formatTime(elapsedTime)}`;
                }
                const result = await tryNativeShare({ text });
                if (result === "shared") {
                  setShareMsg("Shared!");
                  setTimeout(() => setShareMsg(""), 2000);
                  return;
                }
                if (result === "cancelled") return;
                navigator.clipboard.writeText(text).catch(() => {});
                setShareMsg("Copied!");
                setTimeout(() => setShareMsg(""), 2000);
              }}
                style={{
                  backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                  padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
              >
                {shareMsg || "Share"}
              </button>
              <button onClick={() => startPuzzle(isCascade ? cascadeRunIndex : currentPuzzle, isCascade ? "cascade" : undefined, true, isDaily ? currentDailyDate : null)}
                style={{
                  backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                  padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
              >
                Retry
              </button>
              {(isDaily || isCascade) ? (
                <button onClick={() => { setView("menu"); }}
                  style={{
                    backgroundColor: C.accent, color: C.bg, border: "none",
                    padding: "12px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.2s",
                    boxShadow: `0 4px 20px ${C.accent}44`,
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  Back to puzzles
                </button>
              ) : currentPuzzle < totalPuzzles - 1 ? (
                <button onClick={() => startPuzzle(currentPuzzle + 1)}
                  style={{
                    backgroundColor: C.accent, color: C.bg, border: "none",
                    padding: "12px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.2s",
                    boxShadow: `0 4px 20px ${C.accent}44`,
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  Next &rarr;
                </button>
              ) : null}
            </div>
          </div>
        )}

        {gameState === "lost" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.incorrect, marginBottom: 4, animation: "fadeUp 0.4s ease" }}>
              {isCascade ? "Run over" : "Not this time"}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
              {isCascade ? (
                <div>Reached {puzzle?.gridSize ?? 0}×{puzzle?.gridSize ?? 0}</div>
              ) : "The correct pattern is shown above"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {isCascade && (
                <button onClick={async () => {
                  const sz = puzzle?.gridSize ?? 0;
                  const text = `Agnus Cascade \uD83E\uDDE9\nReached ${sz}×${sz}`;
                  const result = await tryNativeShare({ text });
                  if (result === "shared") {
                    setShareMsg("Shared!");
                    setTimeout(() => setShareMsg(""), 2000);
                    return;
                  }
                  if (result === "cancelled") return;
                  navigator.clipboard.writeText(text).catch(() => {});
                  setShareMsg("Copied!");
                  setTimeout(() => setShareMsg(""), 2000);
                }}
                  style={{
                    backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.text; }}
                >
                  {shareMsg || "Share"}
                </button>
              )}
              {isCascade ? (
                <button onClick={() => { setView("menu"); }}
                  style={{
                    backgroundColor: C.accent, color: C.bg, border: "none",
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.15s",
                    boxShadow: `0 4px 16px ${C.accent}44`,
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  Back to puzzles
                </button>
              ) : (
                <>
                  <button onClick={() => startPuzzle(currentPuzzle)}
                    style={{
                      backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                      padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.text; }}
                  >
                    Retry
                  </button>
                  {currentPuzzle < totalPuzzles - 1 && (
                    <button onClick={() => startPuzzle(currentPuzzle + 1)}
                      style={{
                        backgroundColor: C.accent, color: C.bg, border: "none",
                        padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                        textTransform: "uppercase", transition: "all 0.15s",
                        boxShadow: `0 4px 16px ${C.accent}44`,
                      }}
                      onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                      onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                    >
                      Next &rarr;
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
