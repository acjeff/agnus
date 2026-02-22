import { migrateDailyData } from "./puzzles.js";

// --- Persistent storage using localStorage ---
export const STORAGE_KEY = "pattrn-progress-v3";
export const TIMES_KEY = "pattrn-times-v1";
export const BIRTHDAY_KEY = "pattrn-birthday-v1";
export const THEME_KEY = "pattrn-theme-v1";
export const ACHIEV_KEY = "pattrn-achievements-v1";
export const ACTIVE_COSMETIC_KEY = "pattrn-active-cosmetic-v1";
export const CHEAT_BIRTHDAY = "23-06-1912";

const AGGIE_ID = "blob";

export function loadActiveCosmetic() {
  try {
    const val = localStorage.getItem(ACTIVE_COSMETIC_KEY);
    if (val === null) return AGGIE_ID; // first visit — show by default
    if (val === "off") return null; // explicitly hidden
    return val || AGGIE_ID;
  } catch { return AGGIE_ID; }
}
export function saveActiveCosmetic(id) {
  try {
    localStorage.setItem(ACTIVE_COSMETIC_KEY, id || "off");
  } catch { /* ignore */ }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "classic";
  } catch { return "classic"; }
}
export function saveTheme(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
}

export function loadSavedAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEV_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
export function saveSavedAchievements(ids) {
  try { localStorage.setItem(ACHIEV_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}

export function normalizeCascadeRunState(entry) {
  if (!entry || entry.level == null) return null;
  return {
    level: entry.level,
    elapsedSeconds: typeof entry.elapsedSeconds === "number" ? entry.elapsedSeconds : 0,
    fills: entry.fills && typeof entry.fills === "object" ? entry.fills : {},
    attempts: typeof entry.attempts === "number" ? entry.attempts : 0,
  };
}

export function loadProgress() {
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
      spin: base.spin ?? {},
      mosaic: base.mosaic ?? {},
      coop: base.coop ?? {},
      campaign: base.campaign ?? {},
      mosaicCompletions: base.mosaicCompletions ?? {},
      cascadeRunState,
      cascadeRunStateLastIndex: typeof cascadeRunStateLastIndex === "number" ? cascadeRunStateLastIndex : undefined,
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, mosaic: {}, coop: {}, mosaicCompletions: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined };
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

export function loadTimes() {
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
      spin: base.spin ?? {},
      coop: base.coop ?? {},
      mosaicCompletionTimes: base.mosaicCompletionTimes ?? {},
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, coop: {}, mosaicCompletionTimes: {} };
  }
}

export function saveTimes(times) {
  try {
    localStorage.setItem(TIMES_KEY, JSON.stringify(times));
  } catch (e) {
    console.error("Save times failed:", e);
  }
}
