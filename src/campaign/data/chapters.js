// Chapter definitions for the campaign
export const CAMPAIGN_CHAPTERS = [
  {
    id: 0,
    name: "The Pattern Caves",
    desc: "Ancient caves filled with puzzle-locked doors",
    theme: "cave",
    floors: 5,
    difficulty: [1, 1, 2, 2, 3], // 1=easy, 2=medium, 3=hard
    bossFloor: 4,
    mapSize: [30, 30],
    roomCount: [5, 8], // min, max rooms per floor
    chestsPerFloor: [1, 3],
    trapsPerFloor: [0, 2],
    unlock: null, // always available
  },
  {
    id: 1,
    name: "Neon Labyrinth",
    desc: "A glowing maze of electric puzzles",
    theme: "neon",
    floors: 6,
    difficulty: [2, 2, 2, 3, 3, 3],
    bossFloor: 5,
    mapSize: [35, 35],
    roomCount: [6, 10],
    chestsPerFloor: [1, 4],
    trapsPerFloor: [1, 3],
    unlock: { chapter: 0 },
  },
  {
    id: 2,
    name: "The Forgotten Tower",
    desc: "Climb the tower of lost patterns",
    theme: "tower",
    floors: 7,
    difficulty: [2, 2, 3, 3, 3, 3, 3],
    bossFloor: 6,
    mapSize: [40, 40],
    roomCount: [7, 12],
    chestsPerFloor: [2, 5],
    trapsPerFloor: [2, 4],
    unlock: { chapter: 1 },
  },
];

// Difficulty → puzzle config mapping
export const DIFFICULTY_CONFIG = {
  1: { gridSize: 5, mode: "easy", maxAttempts: 8, label: "Easy" },
  2: { gridSize: 7, mode: "medium", maxAttempts: 6, label: "Medium" },
  3: { gridSize: 7, mode: "hard", maxAttempts: 5, label: "Hard" },
};

// Boss puzzle modifiers
export const BOSS_MODIFIERS = {
  timed: { timeLimit: 120 }, // 2 minute timer
  limited: { maxAttempts: 3 },
  fog: { revealRadius: 1 }, // only see adjacent cells
};

// Loot tables for chests
export const CHEST_LOOT = [
  { type: "coins", amount: [10, 30], weight: 40 },
  { type: "coins", amount: [30, 60], weight: 20 },
  { type: "xp", amount: [10, 25], weight: 25 },
  { type: "key", amount: [1, 1], weight: 8 },
  { type: "potion", amount: [1, 1], weight: 5 },
  { type: "accessory", pool: "campaign", weight: 2 },
];

// Campaign-exclusive accessories
export const CAMPAIGN_ACCESSORIES = [
  { id: "explorer-hat", label: "Explorer Hat", category: "hat" },
  { id: "dungeon-crown", label: "Dungeon Crown", category: "hat" },
  { id: "glow-torch", label: "Torch Glow", category: "glow" },
  { id: "eyes-dungeon", label: "Dungeon Eyes", category: "eyes" },
];
