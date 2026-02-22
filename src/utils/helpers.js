import { CASCADE_LEVELS } from "./puzzles.js";

export function formatTime(seconds) {
  if (seconds == null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function solutionFillsFromPuzzle(puzzle) {
  if (!puzzle?.blanks?.size || !puzzle.solution) return {};
  const fills = {};
  for (const key of puzzle.blanks) {
    const [r, c] = key.split("-").map(Number);
    fills[key] = puzzle.solution[r][c];
  }
  return fills;
}

export function parseToken(token) {
  const idx = token.lastIndexOf("|");
  return { color: token.slice(0, idx), shapeIndex: parseInt(token.slice(idx + 1), 10) };
}

export function hexToLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export const _lumCache = {};
export function getShapeStroke(bgColor, isEasy) {
  if (!bgColor || bgColor.length !== 7 || bgColor[0] !== "#") {
    return isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)";
  }
  let lum = _lumCache[bgColor];
  if (lum === undefined) { lum = hexToLuminance(bgColor); _lumCache[bgColor] = lum; }
  if (lum > 0.45) return isEasy ? "rgba(30,30,40,0.82)" : "rgba(30,30,40,0.72)";
  return isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)";
}

export function countModeSolved(mp) { return Object.values(mp || {}).filter(v => v > 0).length; }
export function countModeFailed(mp) { return Object.values(mp || {}).filter(v => v === 0).length; }
export function countModeGold(mp) { return Object.values(mp || {}).filter(v => v >= 1 && v <= 2).length; }
export function countModeFirstTry(mp) { return Object.values(mp || {}).filter(v => v === 1).length; }
export function countCascadeClears(cp) { return Object.values(cp || {}).filter(v => v === CASCADE_LEVELS.length).length; }
export function countCoopSolved(cp) { return Object.values(cp || {}).filter(v => v > 0).length; }
export function countTimesUnder(mt, mp, maxSec) {
  let c = 0;
  for (const [k, t] of Object.entries(mt || {})) { if ((mp || {})[k] > 0 && t < maxSec) c++; }
  return c;
}
export function getMaxDailyStreak(progress) {
  const daily = progress.daily || {};
  const seeds = Object.keys(daily).filter(k => daily[k] > 0).map(Number).sort((a, b) => b - a);
  if (seeds.length === 0) return 0;
  let max = 1, run = 1;
  for (let i = 1; i < seeds.length; i++) {
    if (seeds[i - 1] - seeds[i] === 86400) { run++; if (run > max) max = run; }
    else run = 1;
  }
  return max;
}
