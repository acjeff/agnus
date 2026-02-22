import {
  countModeSolved,
  countModeFailed,
  countModeGold,
  countModeFirstTry,
  countCascadeClears,
  countCoopSolved,
  countTimesUnder,
  getMaxDailyStreak,
} from "../utils/helpers.js";
import { getDailySeedForDate } from "../utils/puzzles.js";
import { BIRTHDAY_KEY } from "../utils/storage.js";

export const ACHIEVEMENT_CATS = [
  { key: "progress", label: "Progress" },
  { key: "mastery", label: "Mastery" },
  { key: "speed", label: "Speed" },
  { key: "special", label: "Special" },
];

export const SOLVE_MODES = ["easy", "medium", "hard", "blind", "spin", "mosaic"];

export const ACHIEVEMENTS = [
  // Progress — per mode
  { id: "easy_5", cat: "progress", label: "Easy Going", desc: "Solve 5 Easy puzzles", tier: 1, check: (p) => countModeSolved(p.easy) >= 5 },
  { id: "easy_25", cat: "progress", label: "Easy Street", desc: "Solve 25 Easy puzzles", tier: 2, check: (p) => countModeSolved(p.easy) >= 25 },
  { id: "easy_50", cat: "progress", label: "Easy Master", desc: "Solve 50 Easy puzzles", tier: 3, check: (p) => countModeSolved(p.easy) >= 50 },
  { id: "med_5", cat: "progress", label: "Intermediate", desc: "Solve 5 Medium puzzles", tier: 1, check: (p) => countModeSolved(p.medium) >= 5 },
  { id: "med_25", cat: "progress", label: "Seasoned", desc: "Solve 25 Medium puzzles", tier: 2, check: (p) => countModeSolved(p.medium) >= 25 },
  { id: "med_50", cat: "progress", label: "Medium Master", desc: "Solve 50 Medium puzzles", tier: 3, check: (p) => countModeSolved(p.medium) >= 50 },
  { id: "hard_5", cat: "progress", label: "Hardened", desc: "Solve 5 Hard puzzles", tier: 1, check: (p) => countModeSolved(p.hard) >= 5 },
  { id: "hard_25", cat: "progress", label: "Tough Cookie", desc: "Solve 25 Hard puzzles", tier: 2, check: (p) => countModeSolved(p.hard) >= 25 },
  { id: "hard_50", cat: "progress", label: "Hard Master", desc: "Solve 50 Hard puzzles", tier: 3, check: (p) => countModeSolved(p.hard) >= 50 },
  { id: "blind_5", cat: "progress", label: "Blind Faith", desc: "Solve 5 Blind puzzles", tier: 1, check: (p) => countModeSolved(p.blind) >= 5 },
  { id: "blind_25", cat: "progress", label: "Sixth Sense", desc: "Solve 25 Blind puzzles", tier: 2, check: (p) => countModeSolved(p.blind) >= 25 },
  { id: "blind_50", cat: "progress", label: "Blind Master", desc: "Solve 50 Blind puzzles", tier: 3, check: (p) => countModeSolved(p.blind) >= 50 },
  { id: "daily_7", cat: "progress", label: "Regular", desc: "Solve 7 Daily puzzles", tier: 1, check: (p) => countModeSolved(p.daily) >= 7 },
  { id: "daily_25", cat: "progress", label: "Devoted", desc: "Solve 25 Daily puzzles", tier: 2, check: (p) => countModeSolved(p.daily) >= 25 },
  { id: "cascade_1", cat: "progress", label: "Cascade Clear", desc: "Complete a Cascade run", tier: 1, check: (p) => countCascadeClears(p.cascade) >= 1 },
  { id: "cascade_5", cat: "progress", label: "Cascade Crusher", desc: "Complete 5 Cascade runs", tier: 2, check: (p) => countCascadeClears(p.cascade) >= 5 },
  // Mastery
  { id: "first_try", cat: "mastery", label: "First Try", desc: "Solve a puzzle on the first attempt", tier: 1, check: (p) => SOLVE_MODES.some(m => countModeFirstTry(p[m]) >= 1) },
  { id: "sharp_10", cat: "mastery", label: "Sharpshooter", desc: "First-attempt 10 puzzles", tier: 2, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeFirstTry(p[m]), 0) >= 10 },
  { id: "sharp_25", cat: "mastery", label: "Sniper", desc: "First-attempt 25 puzzles", tier: 3, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeFirstTry(p[m]), 0) >= 25 },
  { id: "gold_10", cat: "mastery", label: "Gold Rush", desc: "Earn 10 gold medals", tier: 1, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeGold(p[m]), 0) >= 10 },
  { id: "gold_25", cat: "mastery", label: "Gold Hoard", desc: "Earn 25 gold medals", tier: 2, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeGold(p[m]), 0) >= 25 },
  { id: "gold_50", cat: "mastery", label: "Golden Age", desc: "Earn 50 gold medals", tier: 3, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeGold(p[m]), 0) >= 50 },
  // Speed
  { id: "under_30", cat: "speed", label: "Quick Solve", desc: "Solve a puzzle under 30 seconds", tier: 1, check: (p, t) => SOLVE_MODES.some(m => countTimesUnder(t[m], p[m], 30) >= 1) },
  { id: "under_10", cat: "speed", label: "Lightning", desc: "Solve a puzzle under 10 seconds", tier: 2, check: (p, t) => SOLVE_MODES.some(m => countTimesUnder(t[m], p[m], 10) >= 1) },
  { id: "hard_u60", cat: "speed", label: "Hard & Fast", desc: "Solve a Hard puzzle under 60s", tier: 1, check: (p, t) => countTimesUnder(t.hard, p.hard, 60) >= 1 },
  { id: "speed_5", cat: "speed", label: "Speed Demon", desc: "Solve 5 puzzles under 30s", tier: 2, check: (p, t) => SOLVE_MODES.reduce((s, m) => s + countTimesUnder(t[m], p[m], 30), 0) >= 5 },
  { id: "blitz_5", cat: "speed", label: "Blitz", desc: "Solve 5 puzzles under 10s", tier: 3, check: (p, t) => SOLVE_MODES.reduce((s, m) => s + countTimesUnder(t[m], p[m], 10), 0) >= 5 },
  // Special
  { id: "streak_3", cat: "special", label: "On a Roll", desc: "3-day daily streak", tier: 1, check: (p) => getMaxDailyStreak(p) >= 3 },
  { id: "streak_7", cat: "special", label: "Week Warrior", desc: "7-day daily streak", tier: 2, check: (p) => getMaxDailyStreak(p) >= 7 },
  { id: "all_modes", cat: "special", label: "Well Rounded", desc: "Solve a puzzle in every mode", tier: 2, check: (p) => SOLVE_MODES.every(m => countModeSolved(p[m]) >= 1) && countModeSolved(p.daily) >= 1 && countCascadeClears(p.cascade) >= 1 },
  { id: "total_100", cat: "special", label: "Centurion", desc: "Solve 100 puzzles total", tier: 3, check: (p) => [...SOLVE_MODES, "daily"].reduce((s, m) => s + countModeSolved(p[m]), 0) + countCascadeClears(p.cascade) >= 100 },
  { id: "birthday_puzzle", cat: "special", label: "Birthday Bash", desc: "Solve your birthday puzzle", tier: 2, check: (p) => { try { const bd = localStorage.getItem(BIRTHDAY_KEY); if (!bd) return false; const seed = getDailySeedForDate(bd); return (p.daily || {})[seed] > 0; } catch { return false; } } },
  { id: "first_fail", cat: "special", label: "Trial & Error", desc: "Fail a puzzle for the first time", tier: 1, check: (p) => SOLVE_MODES.some(m => countModeFailed(p[m]) >= 1) },
  { id: "coop_1", cat: "special", label: "Better Together", desc: "Complete a puzzle in Co-op mode", tier: 1, check: (p) => countCoopSolved(p.coop) >= 1 },
  { id: "cheat_turing", cat: "special", label: "Welcome Back, Alan", desc: "Born on the day the father of computing was born", tier: 3, check: () => false },
  // Campaign
  { id: "campaign_floor_1", cat: "special", label: "First Steps", desc: "Complete your first campaign floor", tier: 1, check: (p) => (p.campaign?.floorsCleared || 0) >= 1 },
  { id: "campaign_chapter", cat: "special", label: "Chapter Closed", desc: "Complete a campaign chapter", tier: 2, check: (p) => (p.campaign?.chaptersCompleted || 0) >= 1 },
  { id: "campaign_all", cat: "special", label: "Dungeon Master", desc: "Complete all campaign chapters", tier: 3, check: (p) => (p.campaign?.chaptersCompleted || 0) >= 3 },
];

export function computeAchievements(progress, times, savedIds) {
  const saved = savedIds || new Set();
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(progress, times) || saved.has(a.id) }));
}
