// CampaignMode — Main campaign dungeon crawler component
// Manages: dungeon state, canvas lifecycle, player movement, puzzle transitions

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CAMPAIGN_CHAPTERS, DIFFICULTY_CONFIG, CHEST_LOOT } from "./data/chapters.js";
import { TILE, WALKABLE, INTERACTABLE } from "./data/tiles.js";
import { generateDungeon } from "./generation/dungeon.js";
import { createCampaignEngine } from "./engine/canvas.js";
import { createInputHandler } from "./engine/input.js";
import { drawAggieSprite, drawEnemySprite } from "./data/sprites.js";
import {
  loadCampaignState, saveCampaignState,
  getChapterState, getFloorState,
  solveDoor, openChest, completeFloor, completeChapter,
  addXp, addCoins, addItem,
  resetFloorCooldowns, resetChapterCooldowns,
  useAbility, getUnlockedAbilities,
} from "./state/campaignState.js";
import { saveAggieCoins } from "../aggie/state.js";
import CampaignHUD from "./ui/CampaignHUD.jsx";
import CampaignDialogue from "./ui/CampaignDialogue.jsx";
import CampaignPause from "./ui/CampaignPause.jsx";
import GameBoyShell from "./ui/GameBoyShell.jsx";

const PIXEL_FONT = "'Press Start 2P', monospace";
const VISIBILITY_RADIUS = 6;

// Aggie dialogue lines per context
const AGGIE_LINES = {
  floorEntry: [
    "A new floor... I sense puzzles ahead!",
    "Stay alert! This place is full of secrets.",
    "Let's explore carefully. I've got your back!",
    "Ooh, what mysteries await us here?",
  ],
  doorLocked: [
    "This door is sealed by a pattern lock!",
    "I think we need to solve a puzzle to pass.",
    "A locked door! Ready to crack it?",
  ],
  doorSolved: [
    "The door opens! Great work!",
    "You solved it! Onwards!",
    "Pattern matched! Let's go!",
  ],
  chestFound: [
    "Ooh, a treasure chest! Open it!",
    "I wonder what's inside...",
    "Treasure! Let me see!",
  ],
  chestOpen: [
    "Nice find!",
    "That'll come in handy!",
    "Treasure secured!",
  ],
  trapTriggered: [
    "Ouch! That was a trap!",
    "Watch out! Hidden trap!",
    "Careful where you step!",
  ],
  bossRoom: [
    "This is it... the final challenge of this floor!",
    "I can feel a powerful puzzle nearby...",
    "Boss room! Stay focused!",
  ],
  stairsDown: [
    "Stairs! Ready for the next floor?",
    "Going deeper... let's do this!",
  ],
  levelUp: [
    "I feel stronger! Level up!",
    "I'm evolving! New abilities unlocked!",
  ],
  chapterComplete: [
    "We did it! This dungeon is conquered!",
    "Chapter complete! What an adventure!",
  ],
};

function pickLine(rng, category) {
  const lines = AGGIE_LINES[category] || ["..."];
  return lines[Math.floor(rng() * lines.length)];
}

// Simple RNG for dialogue (non-deterministic is fine here)
function simpleRng() { return Math.random(); }

// Loot roll from chest
function rollLoot(rng) {
  const totalWeight = CHEST_LOOT.reduce((s, l) => s + l.weight, 0);
  let roll = rng() * totalWeight;
  for (const loot of CHEST_LOOT) {
    roll -= loot.weight;
    if (roll <= 0) {
      const amount = Array.isArray(loot.amount)
        ? Math.floor(rng() * (loot.amount[1] - loot.amount[0] + 1)) + loot.amount[0]
        : loot.amount;
      return { type: loot.type, amount };
    }
  }
  return { type: "coins", amount: 10 };
}

export default function CampaignMode({
  onStartPuzzle,  // (puzzleConfig, doorKey, callback) => void
  onExit,          // () => void — return to main menu
  C,               // color constants
  aggieBuff,       // active buff from main game { type, charges, freqMult? }
  aggieDebuff,     // active debuff from main game { type, charges }
  aggieHappiness,  // current happiness (0-100) from main game
}) {
  // ─── State ─────────────────────────────
  const [campaignState, setCampaignState] = useState(() => loadCampaignState());
  const [screen, setScreen] = useState("chapter-select"); // "chapter-select" | "dungeon" | "puzzle" | "transition"
  const [menuCursor, setMenuCursor] = useState(0); // cursor index for chapter select
  const [paused, setPaused] = useState(false);
  const [dialogue, setDialogue] = useState(null); // { lines: [], portrait }
  const [notification, setNotification] = useState(null); // { text, color }

  // Current dungeon state
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeFloor, setActiveFloor] = useState(null);
  const [dungeon, setDungeon] = useState(null);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [playerDir, setPlayerDir] = useState("down");
  const [floorStartTime, setFloorStartTime] = useState(null);
  const [enemies, setEnemies] = useState([]); // { x, y, type, hp, maxHp, alive }
  const [attackAnim, setAttackAnim] = useState(null); // { x, y, frame } for slash effect

  // Refs
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(campaignState);
  const dungeonRef = useRef(dungeon);
  const playerRef = useRef(playerPos);
  const exploredRef = useRef(new Set());
  const dialogueAdvanceRef = useRef(null);
  const enemiesRef = useRef(enemies);

  // Pause menu handler refs (CampaignPause writes its handlers here)
  const pauseDpadRef = useRef(null);
  const pauseARef = useRef(null);
  const pauseBRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { stateRef.current = campaignState; }, [campaignState]);
  useEffect(() => { dungeonRef.current = dungeon; }, [dungeon]);
  useEffect(() => { playerRef.current = playerPos; }, [playerPos]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);

  // ─── Notification helper ─────────────────
  const showNotification = useCallback((text, color) => {
    setNotification({ text, color });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // ─── Enter a chapter ─────────────────
  const enterChapter = useCallback((chapterId) => {
    const chapter = CAMPAIGN_CHAPTERS[chapterId];
    if (!chapter) return;

    const state = stateRef.current;
    const chapterState = getChapterState(state, chapterId);

    // Find the first incomplete floor, or start at 0
    let startFloor = 0;
    for (let i = 0; i < chapter.floors; i++) {
      const floorState = chapterState.floors[i];
      if (!floorState || !floorState.completed) {
        startFloor = i;
        break;
      }
      startFloor = i + 1;
    }
    if (startFloor >= chapter.floors) startFloor = 0; // replay from beginning

    setActiveChapter(chapterId);
    resetChapterCooldowns(state);
    enterFloor(chapterId, startFloor);
  }, []);

  // ─── Enter a floor ─────────────────
  const enterFloor = useCallback((chapterId, floorIdx) => {
    const chapter = CAMPAIGN_CHAPTERS[chapterId];
    const dg = generateDungeon(chapterId, floorIdx, chapter);

    setActiveFloor(floorIdx);
    setDungeon(dg);
    setPlayerPos(dg.playerStart);
    setPlayerDir("down");
    setFloorStartTime(Date.now());
    setEnemies(dg.enemies || []);
    setScreen("dungeon");
    exploredRef.current = new Set();

    // Reset floor cooldowns
    const state = stateRef.current;
    resetFloorCooldowns(state);

    // Entry dialogue
    setDialogue({
      lines: [
        `${chapter.name} - Floor ${floorIdx + 1}`,
        pickLine(simpleRng, "floorEntry"),
      ],
      portrait: "\u{1F47E}",
    });
  }, []);

  // ─── Canvas lifecycle ─────────────────
  useEffect(() => {
    if (screen !== "dungeon" || !canvasRef.current || !dungeon) return;

    const chapter = CAMPAIGN_CHAPTERS[activeChapter];
    const engine = createCampaignEngine(canvasRef.current, chapter?.theme || "cave");
    engineRef.current = engine;

    engine.setMap(dungeon.map, dungeon.width, dungeon.height);
    engine.setCamera(playerPos.x, playerPos.y, true);

    // Compute initial visibility
    engine.computeVisibility(playerPos.x, playerPos.y, VISIBILITY_RADIUS);
    engine.setExplored(exploredRef.current);

    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [screen, dungeon, activeChapter]);

  // ─── Update engine entities & camera on player move ─────
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !dungeon) return;

    engine.setCamera(playerPos.x, playerPos.y);
    const vis = engine.computeVisibility(playerPos.x, playerPos.y, VISIBILITY_RADIUS);

    // Build entity list
    const entities = [];

    // Player is Aggie — faces the direction they're moving
    const currentDir = playerDir;
    entities.push({
      id: "player",
      x: playerPos.x,
      y: playerPos.y,
      alwaysVisible: true,
      smooth: true,
      draw: (ctx, sx, sy, ts, frame) => {
        drawAggieSprite(ctx, stateRef.current.aggie.evolutionStage, sx, sy, ts, frame, currentDir);
      },
    });

    // Enemies
    const currentEnemies = enemiesRef.current;
    currentEnemies.forEach((enemy, idx) => {
      if (!enemy.alive) return;
      entities.push({
        id: `enemy-${idx}`,
        x: enemy.x,
        y: enemy.y,
        smooth: true,
        draw: (ctx, sx, sy, ts, frame) => {
          drawEnemySprite(ctx, enemy.type, sx, sy, ts, frame, enemy.hp, enemy.maxHp);
        },
      });
    });

    // Attack slash animation — travels from Aggie toward target
    const atk = attackAnim;
    if (atk) {
      // We render this as a separate entity at the target, but offset the visuals
      // to sweep from the player (fromX/fromY) toward the target (x/y)
      entities.push({
        id: "attack-slash",
        x: atk.x,
        y: atk.y,
        alwaysVisible: true,
        draw: (ctx, sx, sy, ts) => {
          const s = Math.floor(ts / 16);
          const progress = (Date.now() - atk.startTime) / 280; // 280ms animation
          if (progress >= 1) return;

          // Direction offset: slash sweeps from Aggie's tile toward target
          const dx = atk.x - atk.fromX;
          const dy = atk.y - atk.fromY;
          // Start position: edge of Aggie's tile, end: center of target tile
          const startX = sx + ts / 2 - dx * ts * 0.5;
          const startY = sy + ts / 2 - dy * ts * 0.5;
          const endX = sx + ts / 2;
          const endY = sy + ts / 2;
          const cx = startX + (endX - startX) * Math.min(1, progress * 1.5);
          const cy = startY + (endY - startY) * Math.min(1, progress * 1.5);

          // Rotation angle based on attack direction
          const angle = Math.atan2(dy, dx);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);

          // Slash arc — sweeps across
          ctx.globalAlpha = 1 - progress * 0.8;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2.5 * s;
          ctx.beginPath();
          const r = ts * 0.35 * (0.4 + progress * 0.6);
          ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.stroke();

          // Inner energy line
          ctx.strokeStyle = "#9a96cc";
          ctx.lineWidth = 1.5 * s;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.6, -Math.PI * 0.4, Math.PI * 0.4);
          ctx.stroke();

          // Sparkle trail particles
          ctx.fillStyle = "#ffd700";
          for (let i = 0; i < 4; i++) {
            const sparkAngle = -0.4 + i * 0.27;
            const sr = r * (0.6 + progress * 0.6);
            const sparkX = Math.cos(sparkAngle) * sr;
            const sparkY = Math.sin(sparkAngle) * sr;
            const sparkSize = s * (1.5 - progress);
            ctx.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize);
          }

          // Glowing eye-color energy burst at leading edge
          ctx.fillStyle = "#dddcf0";
          ctx.globalAlpha = (1 - progress) * 0.6;
          ctx.beginPath();
          ctx.arc(r * 0.3, 0, s * 2 * (1 - progress * 0.5), 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.restore();
        },
      });
    }

    engine.setEntities(entities);
  }, [playerPos, playerDir, dungeon, enemies, attackAnim]);

  // ─── Player movement ─────────────────
  const handleMove = useCallback((dx, dy) => {
    if (paused || dialogue || screen !== "dungeon") return;

    const dg = dungeonRef.current;
    if (!dg) return;

    const pos = playerRef.current;
    const newX = pos.x + dx;
    const newY = pos.y + dy;

    // Update facing direction
    if (dy < 0) setPlayerDir("up");
    else if (dy > 0) setPlayerDir("down");
    else if (dx < 0) setPlayerDir("left");
    else if (dx > 0) setPlayerDir("right");

    // Bounds check
    if (newX < 0 || newX >= dg.width || newY < 0 || newY >= dg.height) return;

    const tileType = dg.map[newY * dg.width + newX];

    // Can we walk there?
    if (WALKABLE.has(tileType)) {
      // Block if an alive enemy is there
      const blocked = enemiesRef.current.some(e => e.alive && e.x === newX && e.y === newY);
      if (blocked) return;

      setPlayerPos({ x: newX, y: newY });

      // Check for trap
      if (tileType === TILE.TRAP) {
        handleTrap(newX, newY);
      }
    }
  }, [paused, dialogue, screen]);

  // ─── Attack (B button) ─────────────────
  const handleAttack = useCallback(() => {
    if (paused || dialogue || screen !== "dungeon") return;

    const pos = playerRef.current;
    const dir = { down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const off = dir[playerDir] || dir.down;
    const targetX = pos.x + off.x;
    const targetY = pos.y + off.y;

    // Show slash animation traveling from Aggie to target tile
    setAttackAnim({ x: targetX, y: targetY, fromX: pos.x, fromY: pos.y, dir: playerDir, startTime: Date.now() });
    setTimeout(() => setAttackAnim(null), 280);

    // Check if an enemy is at the target position
    const currentEnemies = [...enemiesRef.current];
    const hitIdx = currentEnemies.findIndex(e => e.alive && e.x === targetX && e.y === targetY);
    if (hitIdx < 0) return;

    const enemy = { ...currentEnemies[hitIdx] };
    enemy.hp -= 1;

    if (enemy.hp <= 0) {
      enemy.alive = false;
      // XP and coins for kill
      const state = { ...stateRef.current };
      const xpGain = enemy.type === "wraith" ? 30 : enemy.type === "skeleton" ? 20 : 10;
      const coinGain = enemy.type === "wraith" ? 15 : enemy.type === "skeleton" ? 10 : 5;
      addXp(state, xpGain);
      addCoins(state, coinGain);
      setCampaignState({ ...state });
      showNotification(`Defeated ${enemy.type}! +${xpGain} XP`, "#4ade80");
    }

    currentEnemies[hitIdx] = enemy;
    setEnemies(currentEnemies);
  }, [paused, dialogue, screen, playerDir, showNotification]);

  // ─── Enemy AI — simple chase behavior ─────────────────
  useEffect(() => {
    if (screen !== "dungeon" || paused) return;

    const ENEMY_MOVE_INTERVAL = 800; // enemies move every 800ms
    const CHASE_RADIUS = 5; // tiles within which enemies chase

    const interval = setInterval(() => {
      const dg = dungeonRef.current;
      const pos = playerRef.current;
      if (!dg || !pos) return;

      setEnemies(prev => {
        let changed = false;
        const next = prev.map(enemy => {
          if (!enemy.alive) return enemy;

          const dx = pos.x - enemy.x;
          const dy = pos.y - enemy.y;
          const dist = Math.abs(dx) + Math.abs(dy);

          // Only chase if within radius and not adjacent (don't overlap player)
          if (dist > CHASE_RADIUS || dist <= 1) return enemy;

          // Move one step toward player (prefer larger axis)
          let moveX = 0, moveY = 0;
          if (Math.abs(dx) >= Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
          } else {
            moveY = dy > 0 ? 1 : -1;
          }

          const newX = enemy.x + moveX;
          const newY = enemy.y + moveY;

          // Check walkability
          if (newX < 0 || newX >= dg.width || newY < 0 || newY >= dg.height) return enemy;
          const tile = dg.map[newY * dg.width + newX];
          if (!WALKABLE.has(tile)) return enemy;

          // Don't overlap with other enemies
          const occupied = prev.some(e => e !== enemy && e.alive && e.x === newX && e.y === newY);
          if (occupied) return enemy;

          // Don't move onto player position
          if (newX === pos.x && newY === pos.y) return enemy;

          changed = true;
          return { ...enemy, x: newX, y: newY };
        });
        return changed ? next : prev;
      });
    }, ENEMY_MOVE_INTERVAL);

    return () => clearInterval(interval);
  }, [screen, paused]);

  // ─── Enemy contact damage ─────────────────
  useEffect(() => {
    if (screen !== "dungeon") return;
    // Check if any alive enemy is adjacent to the player (Manhattan distance 1)
    const adjacent = enemies.some(e =>
      e.alive && Math.abs(e.x - playerPos.x) + Math.abs(e.y - playerPos.y) === 1
    );
    // We don't auto-damage, enemies just block and chase.
    // Damage is through traps only for now; enemies are obstacles you attack with B.
  }, [enemies, playerPos, screen]);

  // ─── Interaction ─────────────────
  const handleInteract = useCallback(() => {
    if (paused || screen !== "dungeon") return;

    // If dialogue is showing, ignore (dialogue handles its own taps)
    if (dialogue) return;

    const dg = dungeonRef.current;
    if (!dg) return;

    const pos = playerRef.current;

    // First check if standing on stairs (interact from current tile)
    const standingTile = dg.map[pos.y * dg.width + pos.x];
    if (standingTile === TILE.STAIRS_DOWN) {
      handleStairsDown();
      return;
    }

    // Then check the tile we're facing
    const dirOffset = {
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const off = dirOffset[playerDir] || dirOffset.down;
    const targetX = pos.x + off.x;
    const targetY = pos.y + off.y;

    if (targetX < 0 || targetX >= dg.width || targetY < 0 || targetY >= dg.height) return;

    const tileType = dg.map[targetY * dg.width + targetX];

    if (tileType === TILE.DOOR_LOCKED || tileType === TILE.BOSS_DOOR) {
      handleDoorInteract(targetX, targetY, tileType === TILE.BOSS_DOOR);
    } else if (tileType === TILE.CHEST_CLOSED) {
      handleChestInteract(targetX, targetY);
    } else if (tileType === TILE.STAIRS_DOWN) {
      handleStairsDown();
    }
  }, [paused, dialogue, screen, playerDir]);

  // ─── Door puzzle interaction ─────────────────
  const handleDoorInteract = useCallback((doorX, doorY, isBoss) => {
    const doorKey = `${doorX}-${doorY}`;
    const state = stateRef.current;
    const floorState = getFloorState(state, activeChapter, activeFloor);

    // Already solved?
    if (floorState.doors[doorKey]?.solved) return;

    const chapter = CAMPAIGN_CHAPTERS[activeChapter];
    const difficulty = chapter.difficulty[activeFloor] || 1;
    const config = DIFFICULTY_CONFIG[difficulty];

    setDialogue({
      lines: [pickLine(simpleRng, isBoss ? "bossRoom" : "doorLocked")],
      portrait: "\u{1F47E}",
    });

    // After dialogue, trigger puzzle
    // We set a flag so the dialogue onComplete starts the puzzle
    const puzzleConfig = {
      type: "door",
      mode: config.mode,
      gridSize: config.gridSize,
      maxAttempts: isBoss ? 3 : config.maxAttempts,
      doorKey,
      doorX,
      doorY,
      isBoss,
      difficulty,
    };

    // Store pending puzzle config
    pendingPuzzleRef.current = puzzleConfig;
  }, [activeChapter, activeFloor]);

  const pendingPuzzleRef = useRef(null);
  const pendingDescentRef = useRef(false);

  // Actually descend to next floor / complete chapter
  const performDescent = useCallback(() => {
    const chapter = CAMPAIGN_CHAPTERS[activeChapter];
    if (!chapter) return;

    const state = { ...stateRef.current };
    const elapsed = Math.floor((Date.now() - floorStartTime) / 1000);
    completeFloor(state, activeChapter, activeFloor, elapsed);

    if (activeFloor >= chapter.floors - 1) {
      // Chapter complete!
      completeChapter(state, activeChapter, elapsed);
      addXp(state, 200);
      addCoins(state, 100);
      setCampaignState({ ...state });

      setDialogue({
        lines: [pickLine(simpleRng, "chapterComplete"), "Returning to chapter select..."],
        portrait: "\u{1F47E}",
      });

      setTimeout(() => {
        setScreen("chapter-select");
        setDialogue(null);
      }, 3000);
    } else {
      setCampaignState({ ...state });
      setTimeout(() => {
        enterFloor(activeChapter, activeFloor + 1);
      }, 500);
    }
  }, [activeChapter, activeFloor, floorStartTime, enterFloor]);

  // Handle dialogue completion — check if we should start a puzzle
  const handleDialogueComplete = useCallback(() => {
    setDialogue(null);

    // If stairs were unlocked, descend now
    if (pendingDescentRef.current) {
      pendingDescentRef.current = false;
      performDescent();
      return;
    }

    if (pendingPuzzleRef.current) {
      const config = pendingPuzzleRef.current;
      pendingPuzzleRef.current = null;
      // Signal to parent to start puzzle
      if (onStartPuzzle) {
        if (inputRef.current) inputRef.current.setEnabled(false);
        onStartPuzzle(config, config.doorKey, (solved, attempts) => {
          handlePuzzleResult(config, solved, attempts);
          if (inputRef.current) inputRef.current.setEnabled(true);
        });
      }
    }
  }, [onStartPuzzle, activeChapter, activeFloor, performDescent]);

  // ─── Puzzle result handler (handles doors, chests, and stairs) ─────────────────
  const handlePuzzleResult = useCallback((config, solved, attempts) => {
    setScreen("dungeon");
    const state = { ...stateRef.current };
    const dg = dungeonRef.current;

    if (!solved) {
      showNotification("Puzzle failed! Try again.", "#f87171");
      return;
    }

    const xpGain = config.isBoss ? 50 : config.difficulty * 15;
    const leveled = addXp(state, xpGain);
    addCoins(state, config.difficulty * 10);

    if (config.type === "door") {
      // Open the door on the map
      if (dg) {
        const idx = config.doorY * dg.width + config.doorX;
        dg.map[idx] = config.isBoss ? TILE.BOSS_DOOR_OPEN : TILE.DOOR_OPEN;
        setDungeon({ ...dg });
      }
      solveDoor(state, activeChapter, activeFloor, config.doorKey, attempts);
      showNotification(`+${xpGain} XP \u2022 +${config.difficulty * 10} coins`, "#4ade80");
      setDialogue({
        lines: [
          pickLine(simpleRng, "doorSolved"),
          ...(leveled ? [pickLine(simpleRng, "levelUp")] : []),
        ],
        portrait: "\u{1F47E}",
      });
    } else if (config.type === "chest") {
      // Open the chest on the map
      if (dg) {
        dg.map[config.doorY * dg.width + config.doorX] = TILE.CHEST_OPEN;
        setDungeon({ ...dg });
      }
      openChest(state, activeChapter, activeFloor, config.doorKey);
      // Roll loot
      const loot = rollLoot(simpleRng);
      addItem(state, loot.type, loot.amount);
      addXp(state, 10);
      const lootLabel = loot.type === "coins" ? `${loot.amount} coins`
        : loot.type === "xp" ? `${loot.amount} bonus XP`
        : loot.type === "key" ? "a skeleton key"
        : loot.type === "potion" ? "a potion"
        : "a rare item";
      showNotification(`Found: ${lootLabel}!`, "#ffd700");
      setDialogue({
        lines: [pickLine(simpleRng, "chestOpen"), `You found ${lootLabel}!`],
        portrait: "\u{1F47E}",
      });
    } else if (config.type === "stairs") {
      // Mark stairs as unlocked and proceed
      const floorState = getFloorState(state, activeChapter, activeFloor);
      floorState.stairsUnlocked = true;
      showNotification(`+${xpGain} XP \u2022 Stairs unlocked!`, "#4ade80");
      setDialogue({
        lines: ["The way forward is open!", ...(leveled ? [pickLine(simpleRng, "levelUp")] : [])],
        portrait: "\u{1F47E}",
      });
      // After dialogue, actually descend (handled by pending descent flag)
      pendingDescentRef.current = true;
    }

    setCampaignState({ ...state });
  }, [activeChapter, activeFloor, showNotification]);

  // ─── Chest interaction (requires puzzle) ─────────────────
  const handleChestInteract = useCallback((chestX, chestY) => {
    const chestKey = `${chestX}-${chestY}`;
    const state = stateRef.current;
    const floorState = getFloorState(state, activeChapter, activeFloor);

    if (floorState.chests[chestKey]) return; // Already opened

    const chapter = CAMPAIGN_CHAPTERS[activeChapter];
    const floorDiff = chapter.difficulty[activeFloor] || 1;
    // Chests use one step easier puzzle (min 1)
    const chestDiff = Math.max(1, floorDiff - 1);
    const config = DIFFICULTY_CONFIG[chestDiff];

    setDialogue({
      lines: [pickLine(simpleRng, "chestFound")],
      portrait: "\u{1F47E}",
    });

    pendingPuzzleRef.current = {
      type: "chest",
      mode: config.mode,
      gridSize: config.gridSize,
      maxAttempts: config.maxAttempts,
      doorKey: chestKey,
      doorX: chestX,
      doorY: chestY,
      difficulty: chestDiff,
    };
  }, [activeChapter, activeFloor]);

  // ─── Trap handler ─────────────────
  const handleTrap = useCallback((tx, ty) => {
    const state = stateRef.current;
    const abilities = getUnlockedAbilities(state);
    const hasTrapSense = abilities.some(a => a.id === "trap_sense");

    const dg = dungeonRef.current;
    if (dg) {
      dg.map[ty * dg.width + tx] = TILE.TRAP_REVEALED;
      setDungeon({ ...dg });
    }

    if (hasTrapSense) {
      showNotification("Aggie sensed the trap! No damage.", "#9a96cc");
    } else {
      // Lose some coins (syncs to shared coin store)
      const loss = Math.min(state.inventory.coins, 10);
      state.inventory.coins -= loss;
      saveAggieCoins(state.inventory.coins);
      saveCampaignState(state);
      setCampaignState({ ...state });
      showNotification(`Trap! Lost ${loss} coins.`, "#f87171");
      setDialogue({
        lines: [pickLine(simpleRng, "trapTriggered")],
        portrait: "\u{1F47E}",
      });
    }
  }, [showNotification]);

  // ─── Stairs down (requires puzzle to unlock) ─────────────────
  const handleStairsDown = useCallback(() => {
    const chapter = CAMPAIGN_CHAPTERS[activeChapter];
    if (!chapter) return;

    const state = stateRef.current;
    const floorState = getFloorState(state, activeChapter, activeFloor);

    // If stairs already unlocked, descend immediately
    if (floorState.stairsUnlocked) {
      performDescent();
      return;
    }

    // Otherwise, require a puzzle to unlock
    const floorDiff = chapter.difficulty[activeFloor] || 1;
    const config = DIFFICULTY_CONFIG[floorDiff];

    setDialogue({
      lines: [pickLine(simpleRng, "stairsDown")],
      portrait: "\u{1F47E}",
    });

    pendingPuzzleRef.current = {
      type: "stairs",
      mode: config.mode,
      gridSize: config.gridSize,
      maxAttempts: config.maxAttempts,
      doorKey: `stairs-${activeFloor}`,
      doorX: 0,
      doorY: 0,
      difficulty: floorDiff,
    };
  }, [activeChapter, activeFloor]);

  // ─── Ability usage ─────────────────
  const handleUseAbility = useCallback((abilityId) => {
    const state = { ...stateRef.current };
    const success = useAbility(state, abilityId);
    if (!success) {
      showNotification("Ability not ready!", "#f87171");
      return;
    }

    setCampaignState({ ...state });

    if (abilityId === "scout") {
      // Reveal more of the map
      const engine = engineRef.current;
      if (engine) {
        engine.computeVisibility(playerPos.x, playerPos.y, VISIBILITY_RADIUS * 2);
        showNotification("Aggie scouts the area!", "#9a96cc");
      }
    } else if (abilityId === "treasure_nose") {
      showNotification("Aggie sniffs out treasure nearby!", "#ffd700");
      // Reveal chests on minimap (visual effect handled in HUD)
    } else {
      showNotification(`${abilityId} activated!`, "#9a96cc");
    }
  }, [playerPos, showNotification]);

  // ─── Input handler lifecycle ─────────────────
  useEffect(() => {
    if (screen !== "dungeon") return;

    const input = createInputHandler(handleMove, handleInteract);
    inputRef.current = input;
    input.attach(canvasRef.current);

    return () => {
      input.detach(canvasRef.current);
      inputRef.current = null;
    };
  }, [screen, handleMove, handleInteract]);

  // ─── Escape key for pause ─────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && screen === "dungeon") {
        setPaused(p => !p);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen]);

  // ─── Chapter select menu helpers ─────────────────
  const menuItems = [
    ...CAMPAIGN_CHAPTERS.map((ch, idx) => ({ type: "chapter", chapter: ch, idx })),
    { type: "back" },
  ];

  const handleMenuDpad = useCallback((dx, dy) => {
    if (screen !== "chapter-select") return;
    setMenuCursor(prev => {
      const next = prev + dy;
      if (next < 0) return menuItems.length - 1;
      if (next >= menuItems.length) return 0;
      return next;
    });
  }, [screen, menuItems.length]);

  const handleMenuA = useCallback(() => {
    if (screen !== "chapter-select") return;
    const item = menuItems[menuCursor];
    if (!item) return;
    if (item.type === "back") {
      onExit();
    } else if (item.type === "chapter") {
      const ch = item.chapter;
      const isUnlocked = ch.unlock === null ||
        (ch.unlock.chapter != null && stateRef.current.chapters[ch.unlock.chapter]?.completed);
      if (isUnlocked) enterChapter(ch.id);
    }
  }, [screen, menuCursor, menuItems, onExit, enterChapter]);

  const handleMenuB = useCallback(() => {
    if (screen !== "chapter-select") return;
    onExit();
  }, [screen, onExit]);

  // ─── Chapter select screen (inside Game Boy shell) ─────────────────
  if (screen === "chapter-select") {
    const menuScreenContent = (
      <div style={{
        width: "100%", height: "100%",
        backgroundColor: "#0a0a0f", color: "#e8e8ef",
        fontFamily: PIXEL_FONT,
        display: "flex", flexDirection: "column",
        overflow: "auto",
        padding: "8px 10px",
        boxSizing: "border-box",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: C?.accent || "#c8f03e", marginBottom: 3 }}>
            CAMPAIGN
          </div>
          <div style={{
            display: "flex", justifyContent: "center", gap: 12, fontSize: 6, color: "#6b6b8b",
          }}>
            <span>Lv.{campaignState.aggie.level}</span>
            <span>\u25C9 {campaignState.inventory.coins}</span>
          </div>
        </div>

        {/* Chapter list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {CAMPAIGN_CHAPTERS.map((chapter, idx) => {
            const chState = getChapterState(campaignState, chapter.id);
            const isUnlocked = chapter.unlock === null ||
              (chapter.unlock.chapter != null && campaignState.chapters[chapter.unlock.chapter]?.completed);
            const isCompleted = chState.completed;
            const isCursorHere = menuCursor === idx;

            let floorsCleared = 0;
            for (let i = 0; i < chapter.floors; i++) {
              if (chState.floors[i]?.completed) floorsCleared++;
            }

            return (
              <div
                key={chapter.id}
                onClick={() => isUnlocked && enterChapter(chapter.id)}
                style={{
                  padding: "6px 8px", borderRadius: 4,
                  background: isCursorHere ? "rgba(154,150,204,0.15)" : "transparent",
                  border: isCursorHere ? "1px solid rgba(154,150,204,0.4)" : "1px solid transparent",
                  opacity: isUnlocked ? 1 : 0.35,
                  cursor: isUnlocked ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "background 0.15s",
                }}
              >
                {/* Cursor arrow */}
                <span style={{
                  fontSize: 8, color: "#9a96cc", width: 10, textAlign: "center",
                  animation: isCursorHere ? "cursorBlink 1s ease infinite" : "none",
                  visibility: isCursorHere ? "visible" : "hidden",
                }}>
                  {"\u25B6"}
                </span>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 7, color: isCompleted ? "#4ade80" : "#e8e8ef", marginBottom: 2 }}>
                    {isCompleted ? "\u2713 " : ""}{chapter.name}
                    {!isUnlocked && " \uD83D\uDD12"}
                  </div>
                  <div style={{ fontSize: 5, color: "#6b6b8b" }}>
                    {chapter.desc} \u2022 {floorsCleared}/{chapter.floors}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Back option */}
          <div
            onClick={onExit}
            style={{
              padding: "6px 8px", borderRadius: 4,
              background: menuCursor === CAMPAIGN_CHAPTERS.length ? "rgba(154,150,204,0.15)" : "transparent",
              border: menuCursor === CAMPAIGN_CHAPTERS.length ? "1px solid rgba(154,150,204,0.4)" : "1px solid transparent",
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", marginTop: 4,
            }}
          >
            <span style={{
              fontSize: 8, color: "#9a96cc", width: 10, textAlign: "center",
              animation: menuCursor === CAMPAIGN_CHAPTERS.length ? "cursorBlink 1s ease infinite" : "none",
              visibility: menuCursor === CAMPAIGN_CHAPTERS.length ? "visible" : "hidden",
            }}>
              {"\u25B6"}
            </span>
            <span style={{ fontSize: 7, color: "#f87171" }}>
              \u25C0 BACK
            </span>
          </div>
        </div>
      </div>
    );

    return (
      <GameBoyShell
        screenContent={menuScreenContent}
        onDpadPress={handleMenuDpad}
        onButtonA={handleMenuA}
        onButtonB={handleMenuB}
        onStart={handleMenuA}
        onSelect={handleMenuB}
      />
    );
  }

  // ─── Dungeon view (inside Game Boy shell) ─────────────────
  return (
    <GameBoyShell
      canvasRef={canvasRef}
      onDpadPress={(dx, dy) => {
        if (paused && pauseDpadRef.current) {
          pauseDpadRef.current(dx, dy);
        } else {
          handleMove(dx, dy);
        }
      }}
      onButtonA={() => {
        if (paused && pauseARef.current) {
          pauseARef.current();
        } else if (dialogue && dialogueAdvanceRef.current) {
          dialogueAdvanceRef.current();
        } else {
          handleInteract();
        }
      }}
      onButtonB={() => {
        if (paused && pauseBRef.current) {
          pauseBRef.current();
        } else if (dialogue) {
          handleDialogueComplete();
        } else {
          handleAttack();
        }
      }}
      onStart={() => setPaused(p => !p)}
      onSelect={() => setPaused(p => !p)}
    >
      {/* All overlays render inside the screen area */}

      {/* HUD overlay */}
      {!paused && !dialogue && (
        <CampaignHUD
          campaignState={campaignState}
          chapterName={CAMPAIGN_CHAPTERS[activeChapter]?.name || ""}
          floorIdx={activeFloor}
          totalFloors={CAMPAIGN_CHAPTERS[activeChapter]?.floors || 0}
          onPause={() => setPaused(true)}
          onUseAbility={handleUseAbility}
          aggieBuff={aggieBuff}
          aggieDebuff={aggieDebuff}
          C={C}
        />
      )}

      {/* Dialogue overlay */}
      {dialogue && (
        <CampaignDialogue
          lines={dialogue.lines}
          portrait={dialogue.portrait}
          onComplete={handleDialogueComplete}
          advanceRef={dialogueAdvanceRef}
          C={C}
        />
      )}

      {/* Pause overlay */}
      {paused && (
        <CampaignPause
          campaignState={campaignState}
          chapterName={CAMPAIGN_CHAPTERS[activeChapter]?.name || ""}
          floorIdx={activeFloor}
          onResume={() => setPaused(false)}
          onQuit={() => { setPaused(false); setScreen("chapter-select"); }}
          onDpadPress={pauseDpadRef}
          onButtonA={pauseARef}
          onButtonB={pauseBRef}
          C={C}
        />
      )}

      {/* Notification toast */}
      {notification && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)", borderRadius: 6,
          padding: "6px 12px", border: `2px solid ${notification.color}44`,
          fontFamily: PIXEL_FONT, fontSize: 7, color: notification.color,
          zIndex: 25, animation: "notifIn 0.3s ease",
          pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          {notification.text}
        </div>
      )}

      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </GameBoyShell>
  );
}
