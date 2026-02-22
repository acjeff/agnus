// Canvas rendering engine for campaign dungeon crawler
// Handles: canvas setup, camera, render loop, tile drawing, lighting

import { TILE, getTileColors } from "../data/tiles.js";

const TILE_SIZE = 16;  // base tile pixels
const DEFAULT_SCALE = 3;

export function createCampaignEngine(canvasEl, theme) {
  const ctx = canvasEl.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let scale = DEFAULT_SCALE;
  let tileSize = TILE_SIZE * scale;
  let viewportW = 0;
  let viewportH = 0;
  let tilesX = 0;
  let tilesY = 0;

  // Camera position (in tile coordinates, float for smooth scrolling)
  let camX = 0;
  let camY = 0;
  let camTargetX = 0;
  let camTargetY = 0;
  const CAM_LERP = 0.12;

  // Current dungeon map
  let map = null;
  let mapW = 0;
  let mapH = 0;
  let colors = getTileColors(theme || "cave");

  // Entities to render
  let entities = []; // { x, y, draw(ctx, x, y, tileSize, frame) }

  // Animation frame counter
  let frame = 0;
  let running = false;
  let rafId = null;

  // Fog of war — explored tiles
  let explored = new Set();
  let visible = new Set();

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    viewportW = rect.width;
    viewportH = rect.height;

    // Calculate scale to fit ~15 tiles across
    scale = Math.max(2, Math.floor(viewportW / (15 * TILE_SIZE)));
    tileSize = TILE_SIZE * scale;
    tilesX = Math.ceil(viewportW / tileSize) + 2;
    tilesY = Math.ceil(viewportH / tileSize) + 2;
  }

  function setMap(newMap, width, height) {
    map = newMap;
    mapW = width;
    mapH = height;
  }

  function setTheme(newTheme) {
    colors = getTileColors(newTheme);
  }

  function setCamera(x, y, instant) {
    camTargetX = x;
    camTargetY = y;
    if (instant) {
      camX = x;
      camY = y;
    }
  }

  function setEntities(newEntities) {
    entities = newEntities;
  }

  function setExplored(exploredSet) {
    explored = exploredSet;
  }

  function setVisible(visibleSet) {
    visible = visibleSet;
  }

  // Update camera with smooth lerp
  function updateCamera() {
    camX += (camTargetX - camX) * CAM_LERP;
    camY += (camTargetY - camY) * CAM_LERP;
  }

  // Calculate visibility from player position
  function computeVisibility(playerX, playerY, radius) {
    const vis = new Set();
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = playerX + dx;
        const ty = playerY + dy;
        if (tx >= 0 && tx < mapW && ty >= 0 && ty < mapH) {
          if (dx * dx + dy * dy <= radius * radius) {
            const key = `${tx},${ty}`;
            vis.add(key);
            explored.add(key);
          }
        }
      }
    }
    visible = vis;
    return vis;
  }

  // Draw a single tile
  function drawTile(tileType, screenX, screenY, tileX, tileY) {
    const ts = tileSize;

    switch (tileType) {
      case TILE.VOID:
        ctx.fillStyle = colors.void;
        ctx.fillRect(screenX, screenY, ts, ts);
        break;

      case TILE.FLOOR: {
        // Subtle texture variation based on position
        const floorVariant = (tileX * 7 + tileY * 13) % 3;
        ctx.fillStyle = colors.floor[floorVariant];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Tiny specks for texture
        if ((tileX + tileY) % 5 === 0) {
          ctx.fillStyle = colors.floor[0] + "40";
          const speckX = ((tileX * 31) % 12) * scale;
          const speckY = ((tileY * 37) % 12) * scale;
          ctx.fillRect(screenX + speckX, screenY + speckY, scale, scale);
        }
        break;
      }

      case TILE.WALL:
        ctx.fillStyle = colors.wall;
        ctx.fillRect(screenX, screenY, ts, ts);
        // Shadow at bottom edge
        ctx.fillStyle = colors.wallShadow;
        ctx.fillRect(screenX, screenY + ts - 2 * scale, ts, 2 * scale);
        // Highlight at top
        ctx.fillStyle = colors.wallTop + "40";
        ctx.fillRect(screenX, screenY, ts, scale);
        break;

      case TILE.WALL_TOP:
        ctx.fillStyle = colors.wallTop;
        ctx.fillRect(screenX, screenY, ts, ts);
        // Brick pattern
        const brickOffset = (tileY % 2) * (ts / 2);
        ctx.strokeStyle = colors.wallShadow;
        ctx.lineWidth = scale * 0.5;
        ctx.strokeRect(screenX + brickOffset, screenY, ts / 2, ts / 2);
        ctx.strokeRect(screenX + brickOffset - ts / 2, screenY + ts / 2, ts / 2, ts / 2);
        break;

      case TILE.DOOR_LOCKED:
        // Floor underneath
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Door frame
        ctx.fillStyle = colors.door;
        ctx.fillRect(screenX + 2 * scale, screenY, ts - 4 * scale, ts);
        // Door planks
        ctx.fillStyle = colors.door + "cc";
        ctx.fillRect(screenX + 4 * scale, screenY + scale, scale, ts - 2 * scale);
        ctx.fillRect(screenX + 8 * scale, screenY + scale, scale, ts - 2 * scale);
        ctx.fillRect(screenX + 12 * scale, screenY + scale, scale, ts - 2 * scale);
        // Lock — pulsing glow
        const lockPulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
        ctx.fillStyle = colors.doorLock;
        ctx.globalAlpha = lockPulse;
        ctx.fillRect(screenX + 6 * scale, screenY + 6 * scale, 4 * scale, 4 * scale);
        ctx.globalAlpha = 1;
        break;

      case TILE.DOOR_OPEN:
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Open doorway — dark opening
        ctx.fillStyle = colors.doorOpen;
        ctx.fillRect(screenX + 2 * scale, screenY, ts - 4 * scale, ts);
        break;

      case TILE.CHEST_CLOSED: {
        // Floor underneath
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Chest body
        const chestX = screenX + 3 * scale;
        const chestY = screenY + 5 * scale;
        const chestW = 10 * scale;
        const chestH = 8 * scale;
        ctx.fillStyle = colors.chest;
        ctx.fillRect(chestX, chestY, chestW, chestH);
        // Chest lid
        ctx.fillStyle = colors.chest;
        ctx.fillRect(chestX - scale, chestY - 2 * scale, chestW + 2 * scale, 3 * scale);
        // Gold clasp — sparkle
        const sparkle = Math.sin(frame * 0.08) * 0.4 + 0.6;
        ctx.fillStyle = colors.chestGold;
        ctx.globalAlpha = sparkle;
        ctx.fillRect(chestX + 4 * scale, chestY - scale, 2 * scale, 2 * scale);
        ctx.globalAlpha = 1;
        break;
      }

      case TILE.CHEST_OPEN: {
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Open chest body
        const oChestX = screenX + 3 * scale;
        const oChestY = screenY + 6 * scale;
        ctx.fillStyle = colors.chest + "88";
        ctx.fillRect(oChestX, oChestY, 10 * scale, 7 * scale);
        // Open lid (tilted back)
        ctx.fillStyle = colors.chest + "66";
        ctx.fillRect(oChestX - scale, oChestY - 4 * scale, 12 * scale, 3 * scale);
        break;
      }

      case TILE.STAIRS_DOWN:
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Stair steps descending
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? colors.stairs : colors.stairsShadow;
          ctx.fillRect(screenX + 3 * scale, screenY + i * 4 * scale, 10 * scale, 4 * scale);
        }
        // Arrow indicator
        ctx.fillStyle = colors.accent;
        ctx.fillRect(screenX + 7 * scale, screenY + 12 * scale, 2 * scale, 2 * scale);
        break;

      case TILE.STAIRS_UP:
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 === 0 ? colors.stairs : colors.stairsShadow;
          ctx.fillRect(screenX + 3 * scale, screenY + (3 - i) * 4 * scale, 10 * scale, 4 * scale);
        }
        ctx.fillStyle = colors.accent;
        ctx.fillRect(screenX + 7 * scale, screenY + 2 * scale, 2 * scale, 2 * scale);
        break;

      case TILE.TRAP:
        // Looks like normal floor
        ctx.fillStyle = colors.trap;
        ctx.fillRect(screenX, screenY, ts, ts);
        break;

      case TILE.TRAP_REVEALED:
        ctx.fillStyle = colors.trap;
        ctx.fillRect(screenX, screenY, ts, ts);
        // Spike marks
        ctx.fillStyle = colors.trapSpike;
        ctx.fillRect(screenX + 4 * scale, screenY + 4 * scale, 2 * scale, 8 * scale);
        ctx.fillRect(screenX + 8 * scale, screenY + 6 * scale, 2 * scale, 6 * scale);
        ctx.fillRect(screenX + 12 * scale, screenY + 3 * scale, 2 * scale, 9 * scale);
        break;

      case TILE.WATER: {
        ctx.fillStyle = colors.water;
        ctx.fillRect(screenX, screenY, ts, ts);
        // Animated shimmer
        const shimmerOffset = (frame + tileX * 3 + tileY * 7) % 30;
        if (shimmerOffset < 10) {
          ctx.fillStyle = colors.waterShimmer + "40";
          ctx.fillRect(screenX + shimmerOffset * scale, screenY + 4 * scale, 4 * scale, scale);
        }
        break;
      }

      case TILE.TORCH: {
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Torch post
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(screenX + 7 * scale, screenY + 6 * scale, 2 * scale, 10 * scale);
        // Flame — animated
        const flicker = Math.sin(frame * 0.15 + tileX * 5) * scale + scale;
        ctx.fillStyle = colors.torch;
        ctx.fillRect(screenX + 6 * scale, screenY + 3 * scale - flicker, 4 * scale, 4 * scale + flicker);
        // Glow around torch
        const gradient = ctx.createRadialGradient(
          screenX + 8 * scale, screenY + 4 * scale, 0,
          screenX + 8 * scale, screenY + 4 * scale, ts * 1.5
        );
        gradient.addColorStop(0, colors.torchGlow);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(screenX - ts, screenY - ts, ts * 3, ts * 3);
        break;
      }

      case TILE.DECORATION:
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Small rock/rubble
        ctx.fillStyle = colors.wall + "44";
        ctx.fillRect(screenX + 3 * scale, screenY + 10 * scale, 3 * scale, 3 * scale);
        ctx.fillRect(screenX + 8 * scale, screenY + 11 * scale, 4 * scale, 2 * scale);
        break;

      case TILE.BOSS_DOOR:
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        // Larger, more ornate door
        ctx.fillStyle = colors.door;
        ctx.fillRect(screenX + scale, screenY, ts - 2 * scale, ts);
        // Ornate border
        ctx.strokeStyle = colors.doorLock;
        ctx.lineWidth = scale;
        ctx.strokeRect(screenX + 2 * scale, screenY + scale, ts - 4 * scale, ts - 2 * scale);
        // Boss lock — larger, pulsing more intensely
        const bossPulse = Math.sin(frame * 0.08) * 0.5 + 0.5;
        ctx.fillStyle = "#ff4444";
        ctx.globalAlpha = bossPulse;
        ctx.fillRect(screenX + 5 * scale, screenY + 5 * scale, 6 * scale, 6 * scale);
        ctx.globalAlpha = 1;
        break;

      case TILE.BOSS_DOOR_OPEN:
        ctx.fillStyle = colors.floor[0];
        ctx.fillRect(screenX, screenY, ts, ts);
        ctx.fillStyle = colors.doorOpen;
        ctx.fillRect(screenX + scale, screenY, ts - 2 * scale, ts);
        break;

      default:
        ctx.fillStyle = colors.void;
        ctx.fillRect(screenX, screenY, ts, ts);
    }
  }

  // Main render function
  function render() {
    ctx.clearRect(0, 0, viewportW, viewportH);

    // Fill background with void
    ctx.fillStyle = colors.void;
    ctx.fillRect(0, 0, viewportW, viewportH);

    if (!map) return;

    // Camera offset — center camera on target
    const offsetX = viewportW / 2 - camX * tileSize;
    const offsetY = viewportH / 2 - camY * tileSize;

    // Calculate visible tile range
    const startTileX = Math.max(0, Math.floor(-offsetX / tileSize) - 1);
    const startTileY = Math.max(0, Math.floor(-offsetY / tileSize) - 1);
    const endTileX = Math.min(mapW, startTileX + tilesX + 2);
    const endTileY = Math.min(mapH, startTileY + tilesY + 2);

    // Draw tiles
    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        const screenX = Math.floor(tx * tileSize + offsetX);
        const screenY = Math.floor(ty * tileSize + offsetY);
        const key = `${tx},${ty}`;

        if (visible.has(key)) {
          // Fully visible
          const tileType = map[ty * mapW + tx];
          drawTile(tileType, screenX, screenY, tx, ty);
        } else if (explored.has(key)) {
          // Previously seen — dim
          const tileType = map[ty * mapW + tx];
          drawTile(tileType, screenX, screenY, tx, ty);
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
        } else {
          // Unexplored — black
          ctx.fillStyle = colors.void;
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }

    // Draw entities (sorted by y for depth)
    const sortedEntities = [...entities].sort((a, b) => a.y - b.y);
    for (const entity of sortedEntities) {
      const key = `${entity.x},${entity.y}`;
      if (visible.has(key) || entity.alwaysVisible) {
        const ex = Math.floor(entity.x * tileSize + offsetX);
        const ey = Math.floor(entity.y * tileSize + offsetY);
        entity.draw(ctx, ex, ey, tileSize, frame);
      }
    }

    frame++;
  }

  // Game loop
  function tick() {
    updateCamera();
    render();
    if (running) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    tick();
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function destroy() {
    stop();
    window.removeEventListener("resize", resize);
  }

  // Listen for resize
  window.addEventListener("resize", resize);

  return {
    resize,
    setMap,
    setTheme,
    setCamera,
    setEntities,
    setExplored,
    setVisible,
    computeVisibility,
    start,
    stop,
    destroy,
    render,
    get tileSize() { return tileSize; },
    get scale() { return scale; },
    get frame() { return frame; },
  };
}
