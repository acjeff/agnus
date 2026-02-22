import {
  AGGIE_UNLOCKED_ACC_KEY,
  AGGIE_ACCESSORY_KEY,
  AGGIE_ACCESSORIES,
  AGGIE_SIZE_KEY,
  AGGIE_SIZES,
  AGGIE_COINS_KEY,
  AGGIE_HAPPINESS_KEY,
  AGGIE_MAX_HAPPINESS,
  AGGIE_LAST_INTERACT_KEY,
  AGGIE_INVENTORY_KEY,
  AGGIE_DESIRE_KEY,
  AGGIE_DESIRE_TIMESTAMP_KEY,
  AGGIE_ACTIVE_BUFF_KEY,
  AGGIE_ACTIVE_DEBUFF_KEY,
  AGGIE_FAIL_STREAK_KEY,
  AGGIE_SHOP_ITEMS,
  AGGIE_PUZZLE_DESIRES,
  AGGIE_TRAITS_KEY,
  AGGIE_TRAITS,
  AGGIE_DECAY_RATE,
  AGGIE_DECAY_INTERVAL,
} from "../aggie/constants.js";

export function loadUnlockedAccessories() {
  try { const raw = localStorage.getItem(AGGIE_UNLOCKED_ACC_KEY); return raw ? new Set(JSON.parse(raw)) : new Set(); } catch { return new Set(); }
}
export function saveUnlockedAccessories(set) {
  try { localStorage.setItem(AGGIE_UNLOCKED_ACC_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

// Accessory slots: { hat: "crown", eyes: "eyes-red", glow: "glow-purple", ... }
// Backward compat: old format was a single string like "crown"
export function loadAggieAccessory() {
  try {
    const raw = localStorage.getItem(AGGIE_ACCESSORY_KEY);
    if (!raw || raw === "none") return {};
    // Try parsing as JSON object (new multi-slot format)
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch { /* not JSON, treat as legacy single-accessory string */ }
    // Legacy: single accessory id string — migrate to slotted format
    const acc = AGGIE_ACCESSORIES.find(a => a.id === raw);
    if (acc && acc.category) return { [acc.category]: raw };
    return {};
  } catch { return {}; }
}
export function saveAggieAccessory(slots) {
  try {
    // slots is an object like { hat: "crown", eyes: "eyes-red" }
    const clean = {};
    for (const [k, v] of Object.entries(slots || {})) { if (v && v !== "none") clean[k] = v; }
    if (Object.keys(clean).length > 0) localStorage.setItem(AGGIE_ACCESSORY_KEY, JSON.stringify(clean));
    else localStorage.removeItem(AGGIE_ACCESSORY_KEY);
  } catch { /* ignore */ }
}
// Helper: get array of active accessory IDs from slots object
export function getActiveAccessoryIds(slots) {
  if (!slots || typeof slots !== "object") return [];
  return Object.values(slots).filter(v => v && v !== "none");
}

export function loadAggieSize() {
  try { const s = localStorage.getItem(AGGIE_SIZE_KEY); return s && AGGIE_SIZES[s] ? s : "medium"; } catch { return "medium"; }
}
export function saveAggieSize(size) {
  try { localStorage.setItem(AGGIE_SIZE_KEY, size); } catch { /* ignore */ }
}

export function loadAggieCoins() {
  try { return parseInt(localStorage.getItem(AGGIE_COINS_KEY), 10) || 0; } catch { return 0; }
}
export function saveAggieCoins(coins) {
  try { localStorage.setItem(AGGIE_COINS_KEY, String(Math.max(0, Math.floor(coins)))); } catch { /* ignore */ }
}

export function loadAggieHappiness() {
  try {
    const stored = localStorage.getItem(AGGIE_HAPPINESS_KEY);
    if (stored === null) return 70; // start at 70 (happy)
    const val = parseInt(stored, 10);
    return isNaN(val) ? 70 : Math.max(0, Math.min(AGGIE_MAX_HAPPINESS, val));
  } catch { return 70; }
}
export function saveAggieHappiness(h) {
  try { localStorage.setItem(AGGIE_HAPPINESS_KEY, String(Math.max(0, Math.min(AGGIE_MAX_HAPPINESS, Math.floor(h))))); } catch { /* ignore */ }
}

export function loadAggieLastInteract() {
  try { return parseInt(localStorage.getItem(AGGIE_LAST_INTERACT_KEY), 10) || Date.now(); } catch { return Date.now(); }
}
export function saveAggieLastInteract(ts) {
  try { localStorage.setItem(AGGIE_LAST_INTERACT_KEY, String(ts)); } catch { /* ignore */ }
}

export function loadAggieInventory() {
  try { const raw = localStorage.getItem(AGGIE_INVENTORY_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
export function saveAggieInventory(inv) {
  try { localStorage.setItem(AGGIE_INVENTORY_KEY, JSON.stringify(inv)); } catch { /* ignore */ }
}

export function loadAggieDesire() {
  try {
    const d = localStorage.getItem(AGGIE_DESIRE_KEY);
    const ts = parseInt(localStorage.getItem(AGGIE_DESIRE_TIMESTAMP_KEY), 10) || 0;
    // Desires expire after 6 hours
    if (d && Date.now() - ts < 6 * 60 * 60 * 1000) return JSON.parse(d);
    return null;
  } catch { return null; }
}
export function saveAggieDesire(desire) {
  try {
    localStorage.setItem(AGGIE_DESIRE_KEY, JSON.stringify(desire));
    localStorage.setItem(AGGIE_DESIRE_TIMESTAMP_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export function pickNewDesire() {
  // 50% chance puzzle desire, 50% chance item desire
  if (Math.random() < 0.5) {
    const d = AGGIE_PUZZLE_DESIRES[Math.floor(Math.random() * AGGIE_PUZZLE_DESIRES.length)];
    return { type: "puzzle", ...d };
  } else {
    const item = AGGIE_SHOP_ITEMS[Math.floor(Math.random() * AGGIE_SHOP_ITEMS.length)];
    return { type: "item", id: item.id, label: item.label, happiness: Math.floor(item.happiness * 0.8) };
  }
}

// Active buff persistence — { type, charges, freqMult? }
export function loadAggieBuff() {
  try {
    const raw = localStorage.getItem(AGGIE_ACTIVE_BUFF_KEY);
    if (!raw) return null;
    const buff = JSON.parse(raw);
    return buff && buff.charges > 0 ? buff : null;
  } catch { return null; }
}
export function saveAggieBuff(buff) {
  try {
    if (buff && buff.charges > 0) localStorage.setItem(AGGIE_ACTIVE_BUFF_KEY, JSON.stringify(buff));
    else localStorage.removeItem(AGGIE_ACTIVE_BUFF_KEY);
  } catch { /* ignore */ }
}

// Active debuff persistence — { type, charges }
// Debuff types:
//   "brain_fog"     — hints are suppressed entirely (applied on puzzle failure)
//   "fumble"        — coin earnings halved (applied on 3+ wrong attempts in a single puzzle)
//   "bad_luck"      — hints are inverted/misleading (applied on consecutive puzzle failures)
export function loadAggieDebuff() {
  try {
    const raw = localStorage.getItem(AGGIE_ACTIVE_DEBUFF_KEY);
    if (!raw) return null;
    const debuff = JSON.parse(raw);
    return debuff && debuff.charges > 0 ? debuff : null;
  } catch { return null; }
}
export function saveAggieDebuff(debuff) {
  try {
    if (debuff && debuff.charges > 0) localStorage.setItem(AGGIE_ACTIVE_DEBUFF_KEY, JSON.stringify(debuff));
    else localStorage.removeItem(AGGIE_ACTIVE_DEBUFF_KEY);
  } catch { /* ignore */ }
}

export function loadFailStreak() {
  try { return parseInt(localStorage.getItem(AGGIE_FAIL_STREAK_KEY), 10) || 0; } catch { return 0; }
}
export function saveFailStreak(n) {
  try { localStorage.setItem(AGGIE_FAIL_STREAK_KEY, String(n)); } catch { /* ignore */ }
}

export function rollAggieTraits() {
  // Give 1-2 traits randomly (weighted: ~60% chance of 1 trait, ~40% chance of 2)
  const count = Math.random() < 0.4 ? 2 : 1;
  const shuffled = [...AGGIE_TRAITS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(t => t.id);
}

export function loadAggieTraits() {
  try {
    const raw = localStorage.getItem(AGGIE_TRAITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // First load — roll traits
    const traits = rollAggieTraits();
    saveAggieTraits(traits);
    return traits;
  } catch {
    const traits = rollAggieTraits();
    saveAggieTraits(traits);
    return traits;
  }
}

export function saveAggieTraits(traits) {
  try { localStorage.setItem(AGGIE_TRAITS_KEY, JSON.stringify(traits)); } catch { /* ignore */ }
}

// Helper: check if a trait set (own or shared) includes a specific effect
export function hasTraitEffect(traitIds, effect) {
  return traitIds.some(id => { const t = AGGIE_TRAITS.find(x => x.id === id); return t && t.effect === effect; });
}

// Calculate decayed happiness based on time since last interaction
export function calcDecayedHappiness(stored, lastInteract) {
  const elapsed = Date.now() - lastInteract;
  const decayPeriods = Math.floor(elapsed / AGGIE_DECAY_INTERVAL);
  return Math.max(0, stored - decayPeriods * AGGIE_DECAY_RATE);
}
