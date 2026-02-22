// --- Aggie Companion ---
export const AGGIE_ID = "blob";
export const AGGIE_LABEL = "Aggie";
export const AGGIE_ACCESSORY_KEY = "pattrn-aggie-accessory";
export const AGGIE_SIZE_KEY = "pattrn-aggie-size";
export const AGGIE_SIZES = { small: 64, medium: 96, large: 128 };
export const ACCESSORY_CATEGORIES = [
  { id: "hat", label: "Hats" },
  { id: "hair", label: "Hair" },
  { id: "eyes", label: "Eyes" },
  { id: "face", label: "Face" },
  { id: "earring", label: "Earrings" },
  { id: "glow", label: "Glow" },
];
export const AGGIE_ACCESSORIES = [
  { id: "none", label: "None", cost: 0, category: null },
  { id: "party-hat", label: "Party Hat", cost: 0, category: "hat" },
  { id: "beanie", label: "Beanie", cost: 0, category: "hat" },
  { id: "cat-ears", label: "Cat Ears", cost: 0, category: "hat" },
  { id: "bandana", label: "Bandana", cost: 0, category: "hat" },
  { id: "crown", label: "Crown", cost: 30, category: "hat" },
  { id: "top-hat", label: "Top Hat", cost: 25, category: "hat" },
  { id: "devil-horns", label: "Devil Horns", cost: 20, category: "hat" },
  { id: "halo", label: "Halo", cost: 35, category: "hat" },
  { id: "pirate-hat", label: "Pirate Hat", cost: 20, category: "hat" },
  { id: "sunglasses", label: "Sunglasses", cost: 15, category: "face" },
  { id: "monocle", label: "Monocle", cost: 40, category: "face" },
  { id: "earrings-gold", label: "Gold Earrings", cost: 25, category: "earring" },
  { id: "earrings-crystal", label: "Crystal Earrings", cost: 45, category: "earring" },
  { id: "glow-purple", label: "Purple Glow", cost: 20, category: "glow" },
  { id: "glow-cyan", label: "Cyan Glow", cost: 20, category: "glow" },
  { id: "glow-pink", label: "Pink Glow", cost: 20, category: "glow" },
  { id: "eyes-red", label: "Red Eyes", cost: 15, category: "eyes" },
  { id: "eyes-green", label: "Green Eyes", cost: 15, category: "eyes" },
  { id: "eyes-gold", label: "Gold Eyes", cost: 30, category: "eyes" },
  { id: "wig-curly", label: "Curly Wig", cost: 30, category: "hair" },
  { id: "wig-punk", label: "Punk Spikes", cost: 35, category: "hair" },
  { id: "wig-long", label: "Long Hair", cost: 25, category: "hair" },
];
export const AGGIE_UNLOCKED_ACC_KEY = "pattrn-aggie-unlocked-acc";

// --- Aggie Tamagotchi System ---
// Currency: "Coins"
export const AGGIE_COINS_KEY = "pattrn-aggie-cogs"; // keep localStorage key for backwards compat
export const AGGIE_HAPPINESS_KEY = "pattrn-aggie-happiness";
export const AGGIE_LAST_INTERACT_KEY = "pattrn-aggie-last-interact";
export const AGGIE_INVENTORY_KEY = "pattrn-aggie-inventory";
export const AGGIE_DESIRE_KEY = "pattrn-aggie-desire";
export const AGGIE_DESIRE_TIMESTAMP_KEY = "pattrn-aggie-desire-ts";
export const AGGIE_LAST_STREAK_KEY = "pattrn-aggie-last-streak";
export const AGGIE_ACTIVE_BUFF_KEY = "pattrn-aggie-active-buff";
export const AGGIE_ACTIVE_DEBUFF_KEY = "pattrn-aggie-active-debuff";
export const AGGIE_FAIL_STREAK_KEY = "pattrn-aggie-fail-streak";

// Happiness: 0–100, decays over time
export const AGGIE_MAX_HAPPINESS = 100;
export const AGGIE_DECAY_RATE = 2; // points lost per hour of inactivity
export const AGGIE_DECAY_INTERVAL = 60 * 60 * 1000; // 1 hour

// Coin rewards per puzzle type
export const COINS_REWARD = {
  easy: 5,
  medium: 10,
  hard: 20,
  blind: 25,
  daily: 15,
  cascade: 30,
  vault: 20,
  mosaic: 10,
};
// Bonus for gold/first-try solves
export const COINS_GOLD_BONUS = 5;

// Happiness thresholds for mood changes
export const HAPPINESS_THRESHOLDS = {
  ecstatic: 90,   // 90-100: beaming, super helpful
  happy: 60,      // 60-89: normal, friendly
  neutral: 40,    // 40-59: a bit flat
  grumpy: 20,     // 20-39: sarcastic, misleading hints
  miserable: 0,   // 0-19: very sarcastic, wrong hints
};

export function getHappinessMood(happiness) {
  if (happiness >= HAPPINESS_THRESHOLDS.ecstatic) return "ecstatic";
  if (happiness >= HAPPINESS_THRESHOLDS.happy) return "happy";
  if (happiness >= HAPPINESS_THRESHOLDS.neutral) return "neutral";
  if (happiness >= HAPPINESS_THRESHOLDS.grumpy) return "grumpy";
  return "miserable";
}

// Shop items Aggie can request / you can buy
export const AGGIE_SHOP_ITEMS = [
  { id: "treat", label: "Byte Treat", icon: "treat", cost: 10, happiness: 8, desc: "A tasty data snack" },
  { id: "toy", label: "Logic Toy", icon: "toy", cost: 20, happiness: 12, desc: "A fun puzzle cube" },
  { id: "blanket", label: "Cozy Blanket", icon: "blanket", cost: 25, happiness: 15, desc: "Warm and snuggly" },
  { id: "music-box", label: "Music Box", icon: "music", cost: 30, happiness: 18, desc: "Plays soothing tunes" },
  { id: "book", label: "Algorithm Book", icon: "book", cost: 15, happiness: 10, desc: "Light reading material" },
  { id: "lamp", label: "Glow Lamp", icon: "lamp", cost: 35, happiness: 20, desc: "Soft ambient light" },
  { id: "plant", label: "Binary Bonsai", icon: "plant", cost: 40, happiness: 22, desc: "A 0-and-1 tree" },
  { id: "gem", label: "Crystal Core", icon: "gem", cost: 50, happiness: 25, desc: "Shiny and precious" },
  { id: "focus-lens", label: "Focus Lens", icon: "focus-lens", cost: 30, happiness: 5, desc: "Aggie hints more often", buff: { type: "hint_freq", charges: 5, freqMult: 3 } },
  { id: "wisdom-scroll", label: "Wisdom Scroll", icon: "wisdom-scroll", cost: 40, happiness: 5, desc: "Aggie's hints are spot-on", buff: { type: "hint_accuracy", charges: 5 } },
  { id: "lucky-clover", label: "Lucky Clover", icon: "lucky-clover", cost: 55, happiness: 8, desc: "Better + more frequent hints", buff: { type: "hint_both", charges: 3, freqMult: 2 } },
];

// Puzzle desires — what Aggie wants you to solve
export const AGGIE_PUZZLE_DESIRES = [
  { mode: "easy", label: "an Easy puzzle", happiness: 10 },
  { mode: "medium", label: "a Medium puzzle", happiness: 12 },
  { mode: "hard", label: "a Hard puzzle", happiness: 15 },
  { mode: "blind", label: "a Blind puzzle", happiness: 18 },
  { mode: "daily", label: "the Daily puzzle", happiness: 20 },
  { mode: "cascade", label: "a Cascade run", happiness: 22 },
];

// --- Aggie Inherent Traits ---
// Each Aggie gets 1-2 random traits on first creation. Traits are permanent and provide passive bonuses.
export const AGGIE_TRAITS_KEY = "pattrn-aggie-traits";
export const AGGIE_TRAITS = [
  { id: "lucky", label: "Lucky", desc: "10% chance of bonus coins on puzzle complete", icon: "clover", color: "#22C55E", chance: 0.10, effect: "bonus_coins" },
  { id: "scholarly", label: "Scholarly", desc: "Hints are slightly more accurate", icon: "book", color: "#60A5FA", effect: "hint_accuracy" },
  { id: "energetic", label: "Energetic", desc: "Happiness decays 50% slower", icon: "bolt", color: "#FBBF24", effect: "slow_decay" },
  { id: "charming", label: "Charming", desc: "Shop items give 25% more happiness", icon: "sparkle", color: "#F472B6", effect: "item_bonus" },
  { id: "resilient", label: "Resilient", desc: "30% chance to resist debuffs", icon: "shield", color: "#A78BFA", effect: "debuff_resist" },
  { id: "generous", label: "Generous", desc: "Earn 20% bonus coins in co-op", icon: "heart", color: "#FB7185", effect: "coop_coins" },
  { id: "keen-eyed", label: "Keen-Eyed", desc: "Hints appear more frequently", icon: "eye", color: "#34D399", effect: "hint_freq" },
  { id: "thrifty", label: "Thrifty", desc: "15% chance items cost nothing", icon: "coin", color: "#FCD34D", effect: "free_item" },
  { id: "brave", label: "Brave", desc: "Blind puzzles give 30% more coins", icon: "sword", color: "#F97316", effect: "blind_bonus" },
  { id: "mystic", label: "Mystic", desc: "5% chance to auto-unlock an accessory", icon: "crystal", color: "#C084FC", effect: "free_accessory" },
];

// --- Room Item Positions ---
export const ROOM_ITEM_POSITIONS = [
  { x: 18, y: 120 },   // bottom-left
  { x: 160, y: 118 },  // bottom-right
  { x: 10, y: 70 },    // mid-left
  { x: 165, y: 65 },   // mid-right
  { x: 40, y: 30 },    // top-left
  { x: 140, y: 28 },   // top-right
  { x: 85, y: 125 },   // bottom-center
  { x: 80, y: 25 },    // top-center
  { x: 130, y: 90 },   // mid-right-low
  { x: 50, y: 90 },    // mid-left-low
  { x: 110, y: 55 },   // mid-center-right
];
