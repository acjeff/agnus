// Campaign progress persistence via localStorage

const CAMPAIGN_KEY = "pattrn-campaign-v1";

function getDefaultState() {
  return {
    currentChapter: 0,
    currentFloor: 0,
    chapters: {},
    aggie: {
      level: 1,
      xp: 0,
      totalXp: 0,
      evolutionStage: "hatchling",
      abilityCooldowns: {},
    },
    inventory: {
      coins: 0,
      keys: 0,
      potions: 0,
      accessories: [],
    },
    stats: {
      totalPuzzlesSolved: 0,
      totalChestsOpened: 0,
      totalFloorsCleared: 0,
      fastestFloor: null,
    },
  };
}

export function loadCampaignState() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return { ...getDefaultState(), ...parsed };
  } catch {
    return getDefaultState();
  }
}

export function saveCampaignState(state) {
  try {
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — silently fail */ }
}

// Get or initialize a chapter's state
export function getChapterState(state, chapterId) {
  if (!state.chapters[chapterId]) {
    state.chapters[chapterId] = {
      unlocked: chapterId === 0,
      completed: false,
      bestTime: null,
      floors: {},
    };
  }
  return state.chapters[chapterId];
}

// Get or initialize a floor's state within a chapter
export function getFloorState(state, chapterId, floorIdx) {
  const chapter = getChapterState(state, chapterId);
  if (!chapter.floors[floorIdx]) {
    chapter.floors[floorIdx] = {
      completed: false,
      doors: {},   // { "row-col": { solved: bool, attempts: int } }
      chests: {},  // { "row-col": true }
      traps: {},   // { "row-col": true }
      time: 0,
      explored: {},  // { "row-col": true } — visited tiles
    };
  }
  return chapter.floors[floorIdx];
}

// Mark a door as solved
export function solveDoor(state, chapterId, floorIdx, doorKey, attempts) {
  const floor = getFloorState(state, chapterId, floorIdx);
  floor.doors[doorKey] = { solved: true, attempts };
  state.stats.totalPuzzlesSolved++;
  saveCampaignState(state);
}

// Open a chest
export function openChest(state, chapterId, floorIdx, chestKey) {
  const floor = getFloorState(state, chapterId, floorIdx);
  floor.chests[chestKey] = true;
  state.stats.totalChestsOpened++;
  saveCampaignState(state);
}

// Complete a floor
export function completeFloor(state, chapterId, floorIdx, time) {
  const floor = getFloorState(state, chapterId, floorIdx);
  floor.completed = true;
  floor.time = time;
  state.stats.totalFloorsCleared++;
  if (state.stats.fastestFloor === null || time < state.stats.fastestFloor) {
    state.stats.fastestFloor = time;
  }
  saveCampaignState(state);
}

// Complete a chapter
export function completeChapter(state, chapterId, time) {
  const chapter = getChapterState(state, chapterId);
  chapter.completed = true;
  if (chapter.bestTime === null || time < chapter.bestTime) {
    chapter.bestTime = time;
  }
  // Unlock next chapter
  const nextId = chapterId + 1;
  const nextChapter = getChapterState(state, nextId);
  nextChapter.unlocked = true;
  saveCampaignState(state);
}

// XP & leveling
export const XP_PER_LEVEL = (level) => 50 * level * (level + 1) / 2;

export function getXpForNextLevel(state) {
  return XP_PER_LEVEL(state.aggie.level) - state.aggie.xp;
}

export function getXpProgress(state) {
  const needed = XP_PER_LEVEL(state.aggie.level);
  return Math.min(1, state.aggie.xp / needed);
}

export function addXp(state, amount) {
  state.aggie.xp += amount;
  state.aggie.totalXp += amount;
  let leveled = false;
  // Check for level up(s)
  while (state.aggie.level < 20 && state.aggie.xp >= XP_PER_LEVEL(state.aggie.level)) {
    state.aggie.xp -= XP_PER_LEVEL(state.aggie.level);
    state.aggie.level++;
    leveled = true;
  }
  // Update evolution stage
  if (state.aggie.level >= 20) state.aggie.evolutionStage = "ascended";
  else if (state.aggie.level >= 15) state.aggie.evolutionStage = "sage";
  else if (state.aggie.level >= 10) state.aggie.evolutionStage = "guardian";
  else if (state.aggie.level >= 5) state.aggie.evolutionStage = "sprout";
  else state.aggie.evolutionStage = "hatchling";

  saveCampaignState(state);
  return leveled;
}

// Ability definitions & unlocks
export const AGGIE_ABILITIES = [
  { id: "scout", name: "Scout", desc: "Reveal room layout before entering", level: 2, cooldown: "floor" },
  { id: "hint_whisper", name: "Hint Whisper", desc: "Free hint on one puzzle per floor", level: 4, cooldown: "floor" },
  { id: "trap_sense", name: "Trap Sense", desc: "Warns when trap tile is adjacent", level: 7, cooldown: null },
  { id: "tile_peek", name: "Tile Peek", desc: "Reveal one hidden puzzle tile for free", level: 10, cooldown: "floor" },
  { id: "shield", name: "Shield", desc: "Block one failed attempt (no penalty)", level: 13, cooldown: "floor" },
  { id: "treasure_nose", name: "Treasure Nose", desc: "Highlight chest rooms on minimap", level: 16, cooldown: null },
  { id: "master_key", name: "Master Key", desc: "Skip one non-boss puzzle per chapter", level: 20, cooldown: "chapter" },
];

export function getUnlockedAbilities(state) {
  return AGGIE_ABILITIES.filter(a => state.aggie.level >= a.level);
}

export function isAbilityReady(state, abilityId) {
  return !(state.aggie.abilityCooldowns[abilityId] > 0);
}

export function useAbility(state, abilityId) {
  const ability = AGGIE_ABILITIES.find(a => a.id === abilityId);
  if (!ability) return false;
  if (state.aggie.level < ability.level) return false;
  if (!isAbilityReady(state, abilityId)) return false;
  if (ability.cooldown) {
    state.aggie.abilityCooldowns[abilityId] = 1;
  }
  saveCampaignState(state);
  return true;
}

// Reset floor-based cooldowns (called when entering a new floor)
export function resetFloorCooldowns(state) {
  for (const ability of AGGIE_ABILITIES) {
    if (ability.cooldown === "floor") {
      delete state.aggie.abilityCooldowns[ability.id];
    }
  }
  saveCampaignState(state);
}

// Reset chapter-based cooldowns
export function resetChapterCooldowns(state) {
  for (const ability of AGGIE_ABILITIES) {
    if (ability.cooldown === "chapter" || ability.cooldown === "floor") {
      delete state.aggie.abilityCooldowns[ability.id];
    }
  }
  saveCampaignState(state);
}

// Add coins to campaign inventory
export function addCoins(state, amount) {
  state.inventory.coins += amount;
  saveCampaignState(state);
}

// Add item to inventory
export function addItem(state, itemType, amount) {
  if (itemType === "coins") {
    state.inventory.coins += amount;
  } else if (itemType === "key") {
    state.inventory.keys += amount;
  } else if (itemType === "potion") {
    state.inventory.potions += amount;
  } else if (itemType === "accessory") {
    state.inventory.accessories.push(amount); // amount is accessory id
  }
  saveCampaignState(state);
}
