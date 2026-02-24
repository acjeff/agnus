// Procedural town hub generator
// Produces a small walkable town map with NPC shops for the campaign overworld

import { TILE } from "../data/tiles.js";

// Seeded RNG — same mulberry32 approach used in dungeon.js
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Generate a small town hub map.
 * Returns the same world shape as generateDungeon so the engine can render it.
 */
export function generateTown() {
  const seed = 77777;
  const rng = mulberry32(seed);

  const w = 30;
  const h = 24;
  const map = new Uint8Array(w * h);

  // Fill everything with void first
  map.fill(TILE.VOID);

  // Carve a central open plaza (leave 2-tile wall border)
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      map[y * w + x] = TILE.FLOOR;
    }
  }

  // Perimeter walls
  for (let x = 1; x < w - 1; x++) {
    map[1 * w + x] = TILE.WALL_TOP;
    map[(h - 2) * w + x] = TILE.WALL;
  }
  for (let y = 1; y < h - 1; y++) {
    map[y * w + 1] = TILE.WALL;
    map[y * w + (w - 2)] = TILE.WALL;
  }
  // Corners
  map[1 * w + 1] = TILE.WALL;
  map[1 * w + (w - 2)] = TILE.WALL;
  map[(h - 2) * w + 1] = TILE.WALL;
  map[(h - 2) * w + (w - 2)] = TILE.WALL;

  // --- Build small shop stalls (3 buildings) ---
  // Inn — top-left area
  const innX = 5;
  const innY = 4;
  const innW = 6;
  const innH = 5;
  carveBuilding(map, w, innX, innY, innW, innH);

  // Item shop — top-right area
  const itemsX = 19;
  const itemsY = 4;
  const itemsW = 6;
  const itemsH = 5;
  carveBuilding(map, w, itemsX, itemsY, itemsW, itemsH);

  // Keysmith — bottom-center area
  const keysX = 12;
  const keysY = 15;
  const keysW = 6;
  const keysH = 5;
  carveBuilding(map, w, keysX, keysY, keysW, keysH);

  // Place NPC tiles at building entrances (one tile south of center of building)
  const npcs = [
    { id: "inn", x: innX + Math.floor(innW / 2), y: innY + innH },
    { id: "items", x: itemsX + Math.floor(itemsW / 2), y: itemsY + itemsH },
    { id: "keys", x: keysX + Math.floor(keysW / 2), y: keysY + keysH },
  ];

  for (const npc of npcs) {
    map[npc.y * w + npc.x] = TILE.NPC;
  }

  // Scatter some torches for atmosphere
  const torchSpots = [
    { x: 4, y: 12 },
    { x: w - 5, y: 12 },
    { x: Math.floor(w / 2), y: 3 },
    { x: Math.floor(w / 2), y: h - 4 },
  ];
  for (const t of torchSpots) {
    if (map[t.y * w + t.x] === TILE.FLOOR) {
      map[t.y * w + t.x] = TILE.TORCH;
    }
  }

  // A few decorations
  for (let i = 0; i < 6; i++) {
    const dx = randInt(rng, 3, w - 4);
    const dy = randInt(rng, 3, h - 4);
    if (map[dy * w + dx] === TILE.FLOOR) {
      map[dy * w + dx] = TILE.DECORATION;
    }
  }

  // Spawn point — center-bottom of town
  const spawn = { x: Math.floor(w / 2), y: h - 4 };
  // Make sure spawn tile is walkable
  if (map[spawn.y * w + spawn.x] !== TILE.FLOOR) {
    map[spawn.y * w + spawn.x] = TILE.FLOOR;
  }

  return {
    map,
    width: w,
    height: h,
    spawn,
    theme: "tower",
    npcs,
    rooms: [],
    seed,
  };
}

/**
 * Carve a small rectangular building — walls around the perimeter,
 * floor inside. The south-center wall tile is left as floor for an entrance.
 */
function carveBuilding(map, mapW, bx, by, bw, bh) {
  // Interior floor
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      map[y * mapW + x] = TILE.FLOOR;
    }
  }
  // Top wall
  for (let x = bx; x < bx + bw; x++) {
    map[by * mapW + x] = TILE.WALL_TOP;
  }
  // Bottom wall (leave entrance gap at center)
  const entranceX = bx + Math.floor(bw / 2);
  for (let x = bx; x < bx + bw; x++) {
    if (x !== entranceX) {
      map[(by + bh - 1) * mapW + x] = TILE.WALL;
    }
  }
  // Side walls
  for (let y = by; y < by + bh; y++) {
    map[y * mapW + bx] = TILE.WALL;
    map[y * mapW + (bx + bw - 1)] = TILE.WALL;
  }
}
