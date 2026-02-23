// Procedural dungeon generator using BSP (Binary Space Partition)
// Produces a flat tile array + room metadata for a single dungeon floor

import { TILE } from "../data/tiles.js";

// Seeded RNG — reuse mulberry32 approach from puzzles.js
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper: random int in [min, max] inclusive
function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Helper: shuffle array in place
function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// BSP Node
class BSPNode {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = null;
    this.right = null;
    this.room = null;
  }
}

// Split BSP tree into nodes
function splitBSP(node, rng, minSize, depth) {
  if (depth <= 0 || node.w < minSize * 2 || node.h < minSize * 2) return;

  // Decide split direction based on aspect ratio + randomness
  const splitH = node.w > node.h ? rng() < 0.7 : rng() < 0.3;

  if (splitH) {
    // Vertical split
    if (node.w < minSize * 2) return;
    const split = randInt(rng, minSize, node.w - minSize);
    node.left = new BSPNode(node.x, node.y, split, node.h);
    node.right = new BSPNode(node.x + split, node.y, node.w - split, node.h);
  } else {
    // Horizontal split
    if (node.h < minSize * 2) return;
    const split = randInt(rng, minSize, node.h - minSize);
    node.left = new BSPNode(node.x, node.y, node.w, split);
    node.right = new BSPNode(node.x, node.y + split, node.w, node.h - split);
  }

  splitBSP(node.left, rng, minSize, depth - 1);
  splitBSP(node.right, rng, minSize, depth - 1);
}

// Carve a room inside a BSP leaf node
function carveRoom(node, rng, minRoomSize) {
  if (node.left || node.right) {
    if (node.left) carveRoom(node.left, rng, minRoomSize);
    if (node.right) carveRoom(node.right, rng, minRoomSize);
    return;
  }

  // Leaf node — create a room with some padding
  const padding = 2;
  const maxW = node.w - padding * 2;
  const maxH = node.h - padding * 2;
  if (maxW < minRoomSize || maxH < minRoomSize) return;

  const roomW = randInt(rng, minRoomSize, maxW);
  const roomH = randInt(rng, minRoomSize, maxH);
  const roomX = node.x + randInt(rng, padding, node.w - roomW - padding);
  const roomY = node.y + randInt(rng, padding, node.h - roomH - padding);

  node.room = { x: roomX, y: roomY, w: roomW, h: roomH, type: "standard" };
}

// Collect all leaf rooms
function collectRooms(node, rooms) {
  if (!node) return;
  if (node.room) {
    rooms.push(node.room);
  }
  collectRooms(node.left, rooms);
  collectRooms(node.right, rooms);
}

// Connect two rooms with an L-shaped corridor
function carveCorridor(map, mapW, room1, room2, rng) {
  // Centers of each room
  const cx1 = Math.floor(room1.x + room1.w / 2);
  const cy1 = Math.floor(room1.y + room1.h / 2);
  const cx2 = Math.floor(room2.x + room2.w / 2);
  const cy2 = Math.floor(room2.y + room2.h / 2);

  // Carve horizontal then vertical (or vice versa randomly)
  const horizFirst = rng() < 0.5;

  if (horizFirst) {
    carveHLine(map, mapW, cy1, cx1, cx2);
    carveVLine(map, mapW, cx2, cy1, cy2);
  } else {
    carveVLine(map, mapW, cx1, cy1, cy2);
    carveHLine(map, mapW, cy2, cx1, cx2);
  }
}

function carveHLine(map, mapW, y, x1, x2) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    const idx = y * mapW + x;
    if (map[idx] === TILE.VOID || map[idx] === TILE.WALL) {
      map[idx] = TILE.FLOOR;
    }
    // Widen corridor by 1 tile
    if (y > 0) {
      const above = (y - 1) * mapW + x;
      if (map[above] === TILE.VOID) map[above] = TILE.FLOOR;
    }
  }
}

function carveVLine(map, mapW, x, y1, y2) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const idx = y * mapW + x;
    if (map[idx] === TILE.VOID || map[idx] === TILE.WALL) {
      map[idx] = TILE.FLOOR;
    }
    // Widen corridor
    if (x > 0) {
      const left = y * mapW + (x - 1);
      if (map[left] === TILE.VOID) map[left] = TILE.FLOOR;
    }
  }
}

// Place walls around all floor tiles
function placeWalls(map, mapW, mapH) {
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      if (map[y * mapW + x] !== TILE.FLOOR) continue;
      // Check all 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= mapW || ny < 0 || ny >= mapH) continue;
          const nIdx = ny * mapW + nx;
          if (map[nIdx] === TILE.VOID) {
            // Wall above floor looks like wall_top for visual depth
            map[nIdx] = (dy === -1 && dx === 0) ? TILE.WALL_TOP : TILE.WALL;
          }
        }
      }
    }
  }
}

// Place doors at room connection points (corridor entrances)
function placeDoors(map, mapW, rooms, rng, config) {
  const doors = [];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    // Scan room perimeter for corridor connections
    const candidates = [];

    for (let x = room.x - 1; x <= room.x + room.w; x++) {
      for (let y = room.y - 1; y <= room.y + room.h; y++) {
        // Only check perimeter
        if (x > room.x && x < room.x + room.w - 1 && y > room.y && y < room.y + room.h - 1) continue;
        if (x < 0 || x >= mapW || y < 0) continue;
        const idx = y * mapW + x;
        if (map[idx] !== TILE.FLOOR) continue;

        // Check if this is a transition point (floor tile at room edge adjacent to corridor)
        const isPerimeterX = x === room.x - 1 || x === room.x + room.w;
        const isPerimeterY = y === room.y - 1 || y === room.y + room.h;
        if (isPerimeterX || isPerimeterY) {
          candidates.push({ x, y });
        }
      }
    }

    // Place a locked door on ~60% of eligible rooms (not the first room)
    if (i > 0 && candidates.length > 0 && rng() < 0.6) {
      const doorPos = candidates[randInt(rng, 0, candidates.length - 1)];
      const isBoss = room.type === "boss";
      map[doorPos.y * mapW + doorPos.x] = isBoss ? TILE.BOSS_DOOR : TILE.DOOR_LOCKED;
      doors.push({
        x: doorPos.x,
        y: doorPos.y,
        roomIndex: i,
        boss: isBoss,
        difficulty: config.difficulty || 1,
      });
    }
  }

  return doors;
}

// Place chests in rooms
function placeChests(map, mapW, rooms, rng, count) {
  const chests = [];
  const eligibleRooms = rooms.filter((r, i) => i > 0 && r.type !== "boss");
  shuffle(rng, eligibleRooms);

  const numChests = Math.min(count, eligibleRooms.length);
  for (let i = 0; i < numChests; i++) {
    const room = eligibleRooms[i];
    // Place in a corner-ish spot
    const cx = room.x + randInt(rng, 1, room.w - 2);
    const cy = room.y + randInt(rng, 1, room.h - 2);
    const idx = cy * mapW + cx;
    if (map[idx] === TILE.FLOOR) {
      map[idx] = TILE.CHEST_CLOSED;
      chests.push({ x: cx, y: cy, roomIndex: rooms.indexOf(room) });
    }
  }
  return chests;
}

// Place traps
function placeTraps(map, mapW, rooms, rng, count) {
  const traps = [];
  // Place in corridors or secondary rooms
  for (let i = 0; i < count; i++) {
    const room = rooms[randInt(rng, 1, rooms.length - 1)];
    const tx = room.x + randInt(rng, 1, room.w - 2);
    const ty = room.y + randInt(rng, 1, room.h - 2);
    const idx = ty * mapW + tx;
    if (map[idx] === TILE.FLOOR) {
      map[idx] = TILE.TRAP;
      traps.push({ x: tx, y: ty });
    }
  }
  return traps;
}

// Place enemies in rooms (not on top of other entities)
function placeEnemies(map, mapW, rooms, rng, count, floorDifficulty) {
  const enemies = [];
  const eligibleRooms = rooms.filter((r, i) => i > 0); // skip entry room
  if (eligibleRooms.length === 0) return enemies;

  for (let i = 0; i < count; i++) {
    const room = eligibleRooms[randInt(rng, 0, eligibleRooms.length - 1)];
    for (let attempt = 0; attempt < 10; attempt++) {
      const ex = room.x + randInt(rng, 1, Math.max(1, room.w - 2));
      const ey = room.y + randInt(rng, 1, Math.max(1, room.h - 2));
      const idx = ey * mapW + ex;
      if (map[idx] === TILE.FLOOR) {
        // Pick enemy type based on difficulty
        const types = floorDifficulty >= 3
          ? ["bat", "skeleton", "wraith"]
          : floorDifficulty >= 2
          ? ["bat", "skeleton"]
          : ["bat"];
        const type = types[randInt(rng, 0, types.length - 1)];
        const hp = type === "bat" ? 1 : type === "skeleton" ? 2 : 3;
        enemies.push({ x: ex, y: ey, type, hp, maxHp: hp, alive: true });
        break;
      }
    }
  }
  return enemies;
}

// Place decorative torches
function placeTorches(map, mapW, mapH, rooms, rng) {
  for (const room of rooms) {
    // Place torches near walls inside rooms
    if (room.w >= 5 && room.h >= 5 && rng() < 0.7) {
      const torchPositions = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + 1 },
      ];
      for (const tp of torchPositions) {
        if (rng() < 0.5) {
          const idx = tp.y * mapW + tp.x;
          if (map[idx] === TILE.FLOOR) {
            map[idx] = TILE.TORCH;
          }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════
// Main dungeon generation function
// ═══════════════════════════════════════════
export function generateDungeon(chapterId, floorIdx, chapterConfig) {
  const seed = chapterId * 10000 + floorIdx * 100 + 42;
  const rng = mulberry32(seed);

  const [mapW, mapH] = chapterConfig.mapSize;
  const map = new Uint8Array(mapW * mapH); // All TILE.VOID (0)

  const isBossFloor = floorIdx === chapterConfig.bossFloor;
  const [minRooms, maxRooms] = chapterConfig.roomCount;
  const targetRooms = randInt(rng, minRooms, maxRooms);

  // BSP split depth based on target rooms
  const splitDepth = Math.ceil(Math.log2(targetRooms)) + 1;
  const minNodeSize = 7;

  // Create BSP tree
  const root = new BSPNode(1, 1, mapW - 2, mapH - 2);
  splitBSP(root, rng, minNodeSize, splitDepth);

  // Carve rooms
  carveRoom(root, rng, 4);

  // Collect rooms
  const rooms = [];
  collectRooms(root, rooms);

  // Trim to target count
  while (rooms.length > targetRooms) rooms.pop();

  if (rooms.length === 0) {
    // Fallback: create a single room
    rooms.push({ x: 5, y: 5, w: 10, h: 10, type: "standard" });
  }

  // Tag special rooms
  rooms[0].type = "entry"; // First room is always the entry
  if (isBossFloor && rooms.length > 1) {
    rooms[rooms.length - 1].type = "boss";
  }

  // Carve rooms into map
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x >= 0 && x < mapW && y >= 0 && y < mapH) {
          map[y * mapW + x] = TILE.FLOOR;
        }
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(map, mapW, rooms[i - 1], rooms[i], rng);
  }
  // Add a few extra connections for loops
  if (rooms.length > 3) {
    const extraConnections = randInt(rng, 1, Math.floor(rooms.length / 3));
    for (let i = 0; i < extraConnections; i++) {
      const a = randInt(rng, 0, rooms.length - 1);
      let b = randInt(rng, 0, rooms.length - 1);
      if (a !== b) carveCorridor(map, mapW, rooms[a], rooms[b], rng);
    }
  }

  // Place walls around carved areas
  placeWalls(map, mapW, mapH);

  // Place stairs
  const entryRoom = rooms[0];
  const stairsUpX = Math.floor(entryRoom.x + entryRoom.w / 2);
  const stairsUpY = Math.floor(entryRoom.y + entryRoom.h / 2);
  map[stairsUpY * mapW + stairsUpX] = TILE.STAIRS_UP;

  let stairsDownX, stairsDownY;
  if (rooms.length > 1) {
    const lastRoom = rooms[rooms.length - 1];
    stairsDownX = Math.floor(lastRoom.x + lastRoom.w / 2);
    stairsDownY = Math.floor(lastRoom.y + lastRoom.h / 2);
    map[stairsDownY * mapW + stairsDownX] = TILE.STAIRS_DOWN;
  }

  // Determine floor difficulty
  const floorDifficulty = chapterConfig.difficulty[floorIdx] || 1;

  // Place doors
  const doors = placeDoors(map, mapW, rooms, rng, { difficulty: floorDifficulty });

  // Place chests
  const [minChests, maxChests] = chapterConfig.chestsPerFloor;
  const numChests = randInt(rng, minChests, maxChests);
  const chests = placeChests(map, mapW, rooms, rng, numChests);

  // Place traps
  const [minTraps, maxTraps] = chapterConfig.trapsPerFloor;
  const numTraps = randInt(rng, minTraps, maxTraps);
  const traps = placeTraps(map, mapW, rooms, rng, numTraps);

  // Place torches
  placeTorches(map, mapW, mapH, rooms, rng);

  // Place enemies
  const [minEnemies, maxEnemies] = chapterConfig.enemiesPerFloor || [0, 0];
  const numEnemies = randInt(rng, minEnemies, maxEnemies);
  const enemies = placeEnemies(map, mapW, rooms, rng, numEnemies, floorDifficulty);

  return {
    map,
    width: mapW,
    height: mapH,
    rooms,
    doors,
    chests,
    traps,
    enemies,
    playerStart: { x: stairsUpX, y: stairsUpY },
    stairsDown: stairsDownX != null ? { x: stairsDownX, y: stairsDownY } : null,
    seed,
    isBossFloor,
    floorDifficulty,
  };
}
