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

    const numBlanks = Math.min(6 + Math.floor(i / 4), 16);
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

const PUZZLE_SETS = {
  easy: buildEasyPuzzles(),
  medium: buildMediumPuzzles(),
  hard: buildHardPuzzles(),
  blind: buildBlindPuzzles(),
};

// --- Persistent storage using localStorage ---
const STORAGE_KEY = "pattrn-progress-v3";
const TIMES_KEY = "pattrn-times-v1";

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: {}, medium: {}, hard: {}, blind: {} };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {} };
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
    return raw ? JSON.parse(raw) : { easy: {}, medium: {}, hard: {}, blind: {} };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {} };
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

// --- Helper: parse token ---
function parseToken(token) {
  const idx = token.lastIndexOf("|");
  return { color: token.slice(0, idx), shapeIndex: parseInt(token.slice(idx + 1), 10) };
}

// --- Components ---

function Cell({ token, isBlank, isSelected, isFilled, isCorrect, isWrong, isRevealed, isLocked, onClick, onPointerDown, onPointerEnter, cellSize, iconSize, mode }) {
  const showContent = isRevealed || isLocked || !isBlank || isFilled;
  const parsed = showContent && token ? parseToken(token) : null;
  const isEasy = mode === "easy";

  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
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
        transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        opacity: isBlank && !isFilled && !isRevealed && !isLocked ? 0.45 : 1,
        boxShadow: isLocked ? `0 0 14px ${C.correct}55`
          : isCorrect ? `0 0 14px ${C.correct}55`
          : isWrong ? `0 0 12px ${C.incorrect}66`
          : isSelected ? `0 0 14px ${C.accent}44` : "none",
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none",
        animation: isWrong ? "shake 0.4s ease" : "none",
      }}
    >
      {isBlank && !isFilled && !isRevealed && !isLocked && (
        <span style={{ color: C.textDim, fontSize: cellSize > 44 ? 18 : 14, fontWeight: 300 }}>?</span>
      )}
      {showContent && parsed && SHAPES[parsed.shapeIndex % SHAPES.length](iconSize, isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)")}
    </div>
  );
}

function TokenPicker({ tokens, selectedToken, onSelect, cellSize, mode, remaining }) {
  const isEasy = mode === "easy" || mode === "blind";
  const isBlind = mode === "blind";
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "16px 0", flexWrap: "wrap" }}>
      {tokens.map((token, i) => {
        const { color, shapeIndex } = parseToken(token);
        const selected = selectedToken === token;
        const left = remaining ? (remaining[token] ?? 0) : null;
        const exhausted = isBlind && left !== null && left <= 0;
        return (
          <div key={i} onClick={() => onSelect(token)}
            style={{
              width: cellSize, height: cellSize, borderRadius: 12, backgroundColor: color,
              border: selected ? `3px solid ${C.text}` : "3px solid transparent",
              cursor: exhausted ? "not-allowed" : "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              transform: selected ? "scale(1.15)" : "scale(1)",
              opacity: exhausted ? 0.35 : 1,
              boxShadow: selected ? `0 0 20px ${color}66` : `0 2px 8px ${color}33`,
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {SHAPES[shapeIndex % SHAPES.length](cellSize * 0.5, isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)")}
            {isBlind && left !== null && (
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
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
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
];

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
  const [showShareModal, setShowShareModal] = useState(false);
  const timerStart = useRef(null);
  const timerInterval = useRef(null);
  const isPainting = useRef(false);

  const puzzles = PUZZLE_SETS[difficulty];
  const puzzle = puzzles[currentPuzzle];
  const diffProgress = progress[difficulty] || {};
  const isBlind = difficulty === "blind";

  // For blind mode: count how many of each token exist in the solution vs placed
  const tokenRemaining = useMemo(() => {
    if (!isBlind || !puzzle) return {};
    const solutionCounts = {};
    puzzle.solution.flat().forEach(t => { solutionCounts[t] = (solutionCounts[t] || 0) + 1; });
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
    puzzle.usedTokens.forEach(t => { remaining[t] = (solutionCounts[t] || 0) - (usedCounts[t] || 0); });
    return remaining;
  }, [isBlind, puzzle, fills, lockedCells]);

  const stopTimer = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const startPuzzle = (idx, diff) => {
    if (diff) setDifficulty(diff);
    setCurrentPuzzle(idx);
    setFills({});
    setSelectedCell(null);
    setSelectedToken(null);
    setAttempts(0);
    setGameState("playing");
    setWrongCells(new Set());
    setLockedCells(new Set());
    setShowParticles(false);
    setElapsedTime(0);
    // Start timer
    stopTimer();
    timerStart.current = Date.now();
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
    }, 1000);
    setView("play");
  };

  const paintCell = useCallback((r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key)) return;
    if (lockedCells.has(key)) return;
    if (selectedToken) {
      if (isBlind && fills[key] !== selectedToken && (tokenRemaining[selectedToken] || 0) <= 0) return;
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }, [gameState, puzzle, lockedCells, selectedToken, isBlind, fills, tokenRemaining]);

  const handleCellClick = (r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key)) return;
    if (lockedCells.has(key)) return;
    if (selectedToken) {
      if (isBlind && fills[key] !== selectedToken && (tokenRemaining[selectedToken] || 0) <= 0) return;
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      setSelectedCell(key);
    }
  };

  const handleCellPointerDown = (r, c) => {
    if (!selectedToken || gameState !== "playing") return;
    isPainting.current = true;
    paintCell(r, c);
  };

  const handleCellPointerEnter = (r, c) => {
    if (!isPainting.current || !selectedToken) return;
    paintCell(r, c);
  };

  useEffect(() => {
    const stopPaint = () => { isPainting.current = false; };
    window.addEventListener("pointerup", stopPaint);
    window.addEventListener("pointercancel", stopPaint);
    return () => {
      window.removeEventListener("pointerup", stopPaint);
      window.removeEventListener("pointercancel", stopPaint);
    };
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    if (selectedCell && puzzle.blanks.has(selectedCell) && !lockedCells.has(selectedCell)) {
      if (isBlind && fills[selectedCell] !== token && (tokenRemaining[token] || 0) <= 0) return;
      setFills(prev => ({ ...prev, [selectedCell]: token }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(selectedCell); return n; });
      setSelectedCell(null);
    }
  };

  const maxAttempts = isBlind ? 6 : 5;

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
      setGameState("won");
      stopTimer();
      const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : elapsedTime;
      if (isBlind) setLockedCells(new Set([...puzzle.blanks]));
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 1500);
      const newDiffProgress = { ...diffProgress, [currentPuzzle]: newAttempts };
      const newProgress = { ...progress, [difficulty]: newDiffProgress };
      setProgress(newProgress);
      saveProgress(newProgress);
      // Save time
      const diffTimes = times[difficulty] || {};
      const newDiffTimes = { ...diffTimes, [currentPuzzle]: finalTime };
      const newTimes = { ...times, [difficulty]: newDiffTimes };
      setTimes(newTimes);
      saveTimes(newTimes);
    } else if (newAttempts >= maxAttempts) {
      setGameState("lost");
      stopTimer();
      setWrongCells(wrong);
      if (isBlind) setLockedCells(newLocked);
      const newDiffProgress = { ...diffProgress, [currentPuzzle]: 0 };
      const newProgress = { ...progress, [difficulty]: newDiffProgress };
      setProgress(newProgress);
      saveProgress(newProgress);
    } else {
      setWrongCells(wrong);
      if (isBlind) {
        setLockedCells(newLocked);
      }
      // Shake for 400ms, hold red border, then clear at 800ms
      // The cell's own CSS transition handles the smooth visual change to blank
      setTimeout(() => {
        setWrongCells(new Set());
        setFills(prev => {
          const next = { ...prev };
          for (const k of wrong) delete next[k];
          return next;
        });
      }, 800);
    }
  };

  // For blind mode: all non-locked blanks must be filled
  const activeBlanks = puzzle ? [...puzzle.blanks].filter(k => !lockedCells.has(k)) : [];
  const allFilled = isBlind
    ? activeBlanks.every(k => fills[k])
    : puzzle ? [...puzzle.blanks].every(k => fills[k]) : false;

  const completedCount = Object.keys(diffProgress).filter(k => diffProgress[k] > 0).length;
  const totalAttempted = Object.keys(diffProgress).length;

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
        const result = dp[i];
        if (result === undefined) grid.push("none");
        else if (result === 0) { failed++; grid.push("failed"); }
        else if (result <= 2) { gold++; solved++; grid.push("gold"); }
        else if (result <= 4) { silver++; solved++; grid.push("silver"); }
        else { bronze++; solved++; grid.push("bronze"); }
        if (result > 0 && dt[i] != null) {
          if (bestTime === null || dt[i] < bestTime) bestTime = dt[i];
          totalTime += dt[i];
          timedCount++;
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

  const generateShareText = () => {
    const { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll } = getShareData();
    const emojis = { easy: "\u2B50", medium: "\u26A1", hard: "\uD83D\uDD25", blind: "\uD83D\uDE48" };
    const blockChars = { none: "\u2591", failed: "\u2593", gold: "\u2588", silver: "\u2593", bronze: "\u2592" };

    let text = "PATTRN \uD83E\uDDE9\n\n";
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
    text += `Total: ${totalSolved}/200 solved`;
    if (bestTimeAll != null) text += ` \u2022 Fastest: ${formatTime(bestTimeAll)}`;
    return text;
  };

  const copyShareText = async () => {
    const text = generateShareText();
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
  const cellSize = gridSize === 7 ? 42 : 56;
  const iconSize = gridSize === 7 ? 22 : 28;
  const pickerSize = 48;

  // --- MENU VIEW ---
  if (view === "menu") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        <div style={{ textAlign: "center", marginBottom: 24, animation: "fadeUp 0.5s ease" }}>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 36, fontWeight: 700, letterSpacing: 6, margin: 0, color: C.accent, textTransform: "uppercase" }}>
            pattrn
          </h1>
          <p style={{ color: C.textDim, fontSize: 13, marginTop: 6, letterSpacing: 2 }}>
            find the pattern &middot; fill the gaps
          </p>
        </div>

        {/* Difficulty Tabs */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 20, animation: "fadeUp 0.5s 0.05s ease both",
          borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`,
        }}>
          {DIFFICULTIES.map((d, idx) => {
            const active = difficulty === d.key;
            const dp = progress[d.key] || {};
            const solved = Object.keys(dp).filter(k => dp[k] > 0).length;
            return (
              <button key={d.key} onClick={() => setDifficulty(d.key)}
                style={{
                  background: active ? (d.key === "blind" ? "#e06040" : C.accent) : C.surface,
                  color: active ? (d.key === "blind" ? "#fff" : C.bg) : C.textDim,
                  border: "none",
                  borderRight: idx < DIFFICULTIES.length - 1 ? `1px solid ${C.border}` : "none",
                  padding: "12px 12px",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  minWidth: 78,
                }}
              >
                <span>{d.label}</span>
                <span style={{
                  fontSize: 8, letterSpacing: 0.5,
                  color: active ? (d.key === "blind" ? "#fff9" : C.bg + "aa") : C.textDim,
                  fontWeight: 400,
                }}>{d.desc}</span>
                <span style={{
                  fontSize: 8, marginTop: 2,
                  color: active ? (d.key === "blind" ? "#fff7" : C.bg + "88") : C.textDim,
                  fontWeight: 400,
                }}>{solved}/50</span>
              </button>
            );
          })}
        </div>

        {/* Stats summary */}
        <div style={{
          display: "flex", gap: 24, marginBottom: 24, animation: "fadeUp 0.5s 0.1s ease both",
          padding: "12px 24px", borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Solved</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.accent }}>{completedCount}</div>
          </div>
          <div style={{ width: 1, backgroundColor: C.border }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Attempted</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700 }}>{totalAttempted}</div>
          </div>
          <div style={{ width: 1, backgroundColor: C.border }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Total</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700 }}>50</div>
          </div>
        </div>

        {/* Share button */}
        <button onClick={() => setShowShareModal(true)}
          style={{
            marginBottom: 20, padding: "10px 28px", borderRadius: 10,
            backgroundColor: "transparent", border: `1.5px solid ${C.accent}`,
            color: C.accent, cursor: "pointer", fontFamily: "'Space Mono', monospace",
            fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
            transition: "all 0.2s", animation: "fadeUp 0.5s 0.12s ease both",
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.accent; e.currentTarget.style.color = C.bg; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.accent; }}
        >
          Share Stats
        </button>

        {/* Puzzle grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
          maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
        }}>
          {puzzles.map((p, i) => {
            const result = diffProgress[i];
            const solved = result > 0;
            const failed = result === 0;
            const time = diffTimes[i];
            return (
              <button key={i} onClick={() => startPuzzle(i)}
                style={{
                  aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border}`,
                  backgroundColor: solved ? C.correct + "15" : failed ? C.incorrect + "10" : C.surface,
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1,
                  transition: "all 0.15s", position: "relative",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border; }}
              >
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700,
                  color: solved ? C.correct : failed ? C.incorrect : C.text,
                }}>
                  {i + 1}
                </span>
                {result !== undefined && <ScoreBadge attempts={result} />}
                {solved && time != null && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.textDim, lineHeight: 1 }}>
                    {formatTime(time)}
                  </span>
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
                  <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, letterSpacing: 4, margin: 0, color: C.accent, textTransform: "uppercase" }}>
                    pattrn
                  </h2>
                  <p style={{ color: C.textDim, fontSize: 11, marginTop: 4, letterSpacing: 1 }}>my stats</p>
                </div>

                {/* Overall stats */}
                <div style={{
                  display: "flex", justifyContent: "center", gap: 16, marginBottom: 20,
                  padding: "10px 16px", borderRadius: 10, backgroundColor: C.surface, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.accent }}>{totalSolved}</div>
                    <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>solved</div>
                  </div>
                  <div style={{ width: 1, backgroundColor: C.border }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700 }}>200</div>
                    <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>total</div>
                  </div>
                  {bestTimeAll != null && <>
                    <div style={{ width: 1, backgroundColor: C.border }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.correct }}>{formatTime(bestTimeAll)}</div>
                      <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>fastest</div>
                    </div>
                  </>}
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
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
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
                    {shareMsg || "Copy"}
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
  const diffLabel = DIFFICULTIES.find(d => d.key === difficulty)?.label || "";
  const totalPuzzles = puzzles.length;
  const lockedCount = lockedCells.size;
  const totalBlanks = puzzle ? puzzle.blanks.size : 0;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.bg, color: C.text,
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "24px 16px", position: "relative", overflow: "hidden",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap'); @keyframes particlePop { 0%{transform:scale(0);opacity:1} 50%{opacity:1} 100%{transform:scale(1) translateY(-40px);opacity:0} } @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} } @keyframes slideIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} } @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }`}</style>

      <Particles show={showParticles} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: gridSize === 7 ? 380 : 360, marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
        <button onClick={() => { stopTimer(); setView("menu"); }}
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
            {diffLabel}{" "}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: 3 }}>
            #{currentPuzzle + 1}
          </span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Timer + Attempt dots */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: gameState === "won" ? C.correct : gameState === "lost" ? C.incorrect : C.text, marginBottom: 6, letterSpacing: 2 }}>
        {formatTime(elapsedTime)}
      </div>
      <AttemptDots max={maxAttempts} used={attempts} won={gameState === "won"} />
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
        {gameState === "playing" ? (
          isBlind && lockedCount > 0
            ? `${lockedCount}/${totalBlanks} locked \u2022 ${maxAttempts - attempts} guess${maxAttempts - attempts !== 1 ? "es" : ""} left`
            : `${maxAttempts - attempts} ${isBlind ? "guess" : "attempt"}${maxAttempts - attempts !== 1 ? "es" : ""} left`
        ) : gameState === "won" ? `Solved in ${attempts} \u2022 ${formatTime(elapsedTime)}` : "Out of attempts"}
      </div>

      {/* Grid */}
      <div style={{ animation: "slideIn 0.3s ease", touchAction: "none" }}>
        <div style={{
          display: "flex", flexDirection: "column", gap: gridSize === 7 ? 3 : 4, padding: gridSize === 7 ? 10 : 14,
          backgroundColor: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, boxShadow: `0 8px 32px ${C.bg}88`,
        }}>
          {puzzle.solution.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: gridSize === 7 ? 3 : 4 }}>
              {row.map((token, c) => {
                const key = `${r}-${c}`;
                const isBlankCell = puzzle.blanks.has(key);
                const isLockedCell = lockedCells.has(key);
                const fillToken = isBlankCell ? (isLockedCell ? token : fills[key]) : token;
                const isRevealed = (gameState === "lost") && isBlankCell && !isLockedCell;
                const displayToken = isRevealed ? token : fillToken;
                return (
                  <Cell key={key} token={displayToken} isBlank={isBlankCell}
                    isSelected={selectedCell === key}
                    isFilled={!!fills[key] || isLockedCell}
                    isCorrect={gameState === "won" && isBlankCell}
                    isWrong={wrongCells.has(key) && gameState !== "lost"}
                    isRevealed={isRevealed}
                    isLocked={isLockedCell && gameState === "playing"}
                    onClick={() => handleCellClick(r, c)}
                    onPointerDown={() => handleCellPointerDown(r, c)}
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

      {/* Token picker */}
      {gameState === "playing" && (
        <div style={{ marginTop: 20, animation: "fadeUp 0.4s 0.1s ease both" }}>
          <div style={{ fontSize: 10, color: C.textDim, textAlign: "center", letterSpacing: 1, marginBottom: 2, textTransform: "uppercase" }}>
            {isBlind ? "Pick a tile" : puzzle.mode === "easy" ? "Pick a shape" : "Pick a tile"}
          </div>
          <TokenPicker tokens={puzzle.usedTokens} selectedToken={selectedToken} onSelect={handleTokenSelect} cellSize={pickerSize} mode={puzzle.mode} remaining={tokenRemaining} />
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 20, animation: "fadeUp 0.4s 0.2s ease both", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {gameState === "playing" && allFilled && (
          <button onClick={checkSolution}
            style={{
              backgroundColor: isBlind ? "#e06040" : C.accent,
              color: isBlind ? "#fff" : C.bg,
              border: "none",
              padding: "14px 48px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
              textTransform: "uppercase", transition: "all 0.2s",
              boxShadow: isBlind ? "0 4px 20px #e0604044" : `0 4px 20px ${C.accent}44`,
            }}
            onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.target.style.transform = "translateY(0)"}
          >
            {isBlind ? "Guess" : "Check"}
          </button>
        )}

        {gameState === "won" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.correct, marginBottom: 12, animation: "fadeUp 0.4s ease" }}>
              &#x2713; {isBlind ? "Cracked it!" : "Perfect"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => {
                const medal = attempts <= 2 ? "\u2605" : attempts <= 4 ? "\u25CF" : "\u25C6";
                const text = `PATTRN \uD83E\uDDE9 ${diffLabel} #${currentPuzzle + 1}\n${medal} Solved in ${attempts} attempt${attempts !== 1 ? "s" : ""} \u2022 ${formatTime(elapsedTime)}`;
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
              {currentPuzzle < totalPuzzles - 1 && (
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
              )}
            </div>
          </div>
        )}

        {gameState === "lost" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.incorrect, marginBottom: 4, animation: "fadeUp 0.4s ease" }}>
              Not this time
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
              The correct pattern is shown above
            </div>
            <div style={{ display: "flex", gap: 10 }}>
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
            </div>
          </div>
        )}
      </div>

      {/* Hints */}
      {gameState === "playing" && Object.keys(fills).length === 0 && lockedCells.size === 0 && (
        <div style={{ marginTop: 28, color: C.textDim, fontSize: 12, textAlign: "center", maxWidth: 280, lineHeight: 1.6, animation: "pulse 2s infinite" }}>
          {isBlind
            ? "Fill the entire grid, then guess! Correct cells lock in green after each guess."
            : puzzle.mode === "easy"
            ? "Study the shapes to find the pattern, then fill in the blanks"
            : "Colors and shapes may follow different patterns!"}
        </div>
      )}

      {wrongCells.size > 0 && gameState === "playing" && (
        <div style={{ marginTop: 14, color: C.incorrect, fontSize: 12, textAlign: "center", fontFamily: "'Space Mono', monospace", animation: "shake 0.4s ease" }}>
          {isBlind
            ? `${lockedCount} locked \u2022 ${totalBlanks - lockedCount} remaining`
            : `${wrongCells.size} cell${wrongCells.size > 1 ? "s" : ""} wrong \u2014 ${maxAttempts - attempts} tr${maxAttempts - attempts !== 1 ? "ies" : "y"} left`}
        </div>
      )}
    </div>
  );
}
