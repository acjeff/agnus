import { useState, useEffect, useCallback, useRef } from "react";

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
    const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN);
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

    const numBlanks = Math.min(5 + Math.floor(i / 4), 14);
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
        transform: isSelected ? "scale(1.08)" : isWrong ? "scale(0.95)" : "scale(1)",
        opacity: isBlank && !isFilled && !isRevealed && !isLocked ? 0.45 : 1,
        boxShadow: isLocked ? `0 0 14px ${C.correct}55`
          : isCorrect ? `0 0 14px ${C.correct}55`
          : isSelected ? `0 0 14px ${C.accent}44` : "none",
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none",
      }}
    >
      {isBlank && !isFilled && !isRevealed && !isLocked && (
        <span style={{ color: C.textDim, fontSize: cellSize > 44 ? 18 : 14, fontWeight: 300 }}>?</span>
      )}
      {showContent && parsed && SHAPES[parsed.shapeIndex % SHAPES.length](iconSize, isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)")}
    </div>
  );
}

function TokenPicker({ tokens, selectedToken, onSelect, cellSize, mode }) {
  const isEasy = mode === "easy" || mode === "blind";
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "16px 0", flexWrap: "wrap" }}>
      {tokens.map((token, i) => {
        const { color, shapeIndex } = parseToken(token);
        const selected = selectedToken === token;
        return (
          <div key={i} onClick={() => onSelect(token)}
            style={{
              width: cellSize, height: cellSize, borderRadius: 12, backgroundColor: color,
              border: selected ? `3px solid ${C.text}` : "3px solid transparent",
              cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              transform: selected ? "scale(1.15)" : "scale(1)",
              boxShadow: selected ? `0 0 20px ${color}66` : `0 2px 8px ${color}33`,
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {SHAPES[shapeIndex % SHAPES.length](cellSize * 0.5, isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)")}
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
  const isPainting = useRef(false);

  const puzzles = PUZZLE_SETS[difficulty];
  const puzzle = puzzles[currentPuzzle];
  const diffProgress = progress[difficulty] || {};
  const isBlind = difficulty === "blind";

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
    setView("play");
  };

  const paintCell = useCallback((r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key)) return;
    if (lockedCells.has(key)) return;
    if (selectedToken) {
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }, [gameState, puzzle, lockedCells, selectedToken]);

  const handleCellClick = (r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key)) return;
    if (lockedCells.has(key)) return;
    if (selectedToken) {
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

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    if (selectedCell && puzzle.blanks.has(selectedCell) && !lockedCells.has(selectedCell)) {
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
      if (isBlind) setLockedCells(new Set([...puzzle.blanks]));
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 1500);
      const newDiffProgress = { ...diffProgress, [currentPuzzle]: newAttempts };
      const newProgress = { ...progress, [difficulty]: newDiffProgress };
      setProgress(newProgress);
      saveProgress(newProgress);
    } else if (newAttempts >= maxAttempts) {
      setGameState("lost");
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
        // Clear wrong fills so player can re-fill them
        setFills(prev => {
          const next = { ...prev };
          for (const k of wrong) delete next[k];
          return next;
        });
      }
    }
  };

  // For blind mode: all non-locked blanks must be filled
  const activeBlanks = puzzle ? [...puzzle.blanks].filter(k => !lockedCells.has(k)) : [];
  const allFilled = isBlind
    ? activeBlanks.every(k => fills[k])
    : puzzle ? [...puzzle.blanks].every(k => fills[k]) : false;

  const completedCount = Object.keys(diffProgress).filter(k => diffProgress[k] > 0).length;
  const totalAttempted = Object.keys(diffProgress).length;

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

        {/* Puzzle grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
          maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
        }}>
          {puzzles.map((p, i) => {
            const result = diffProgress[i];
            const solved = result > 0;
            const failed = result === 0;
            return (
              <button key={i} onClick={() => startPuzzle(i)}
                style={{
                  aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border}`,
                  backgroundColor: solved ? C.correct + "15" : failed ? C.incorrect + "10" : C.surface,
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
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
        <button onClick={() => setView("menu")}
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

      {/* Attempt dots */}
      <AttemptDots max={maxAttempts} used={attempts} won={gameState === "won"} />
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
        {gameState === "playing" ? (
          isBlind && lockedCount > 0
            ? `${lockedCount}/${totalBlanks} locked \u2022 ${maxAttempts - attempts} guess${maxAttempts - attempts !== 1 ? "es" : ""} left`
            : `${maxAttempts - attempts} ${isBlind ? "guess" : "attempt"}${maxAttempts - attempts !== 1 ? "es" : ""} left`
        ) : gameState === "won" ? `Solved in ${attempts}!` : "Out of attempts"}
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
          <TokenPicker tokens={puzzle.usedTokens} selectedToken={selectedToken} onSelect={handleTokenSelect} cellSize={pickerSize} mode={puzzle.mode} />
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
