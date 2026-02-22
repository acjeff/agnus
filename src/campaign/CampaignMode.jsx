// CampaignMode — Main campaign dungeon crawler component
// Manages: dungeon state, canvas lifecycle, player movement, puzzle transitions

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CAMPAIGN_CHAPTERS, DIFFICULTY_CONFIG, CHEST_LOOT } from "./data/chapters.js";
import { TILE, WALKABLE, INTERACTABLE } from "./data/tiles.js";
import { generateDungeon } from "./generation/dungeon.js";
import { createCampaignEngine } from "./engine/canvas.js";
import { createInputHandler } from "./engine/input.js";
import { drawAggieSprite } from "./data/sprites.js";
import {
  loadCampaignState, saveCampaignState,
  getChapterState, getFloorState,
  solveDoor, openChest, completeFloor, completeChapter,
  addXp, addCoins, addItem,
  resetFloorCooldowns, resetChapterCooldowns,
  useAbility, getUnlockedAbilities,
} from "./state/campaignState.js";
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
}) {
  // ─── State ─────────────────────────────
  const [campaignState, setCampaignState] = useState(() => loadCampaignState());
  const [screen, setScreen] = useState("chapter-select"); // "chapter-select" | "dungeon" | "puzzle" | "transition"
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

  // Refs
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(campaignState);
  const dungeonRef = useRef(dungeon);
  const playerRef = useRef(playerPos);
  const exploredRef = useRef(new Set());

  // Keep refs in sync
  useEffect(() => { stateRef.current = campaignState; }, [campaignState]);
  useEffect(() => { dungeonRef.current = dungeon; }, [dungeon]);
  useEffect(() => { playerRef.current = playerPos; }, [playerPos]);

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

    // Player entity
    entities.push({
      x: playerPos.x,
      y: playerPos.y,
      alwaysVisible: true,
      draw: (ctx, sx, sy, ts, frame) => {
        // Simple pixel character
        const s = Math.floor(ts / 16);
        // Body
        ctx.fillStyle = "#3a6aaa";
        ctx.fillRect(sx + 4 * s, sy + 4 * s, 8 * s, 10 * s);
        // Head
        ctx.fillStyle = "#ffdbac";
        ctx.fillRect(sx + 5 * s, sy + 1 * s, 6 * s, 5 * s);
        // Hair
        ctx.fillStyle = "#4a3728";
        ctx.fillRect(sx + 5 * s, sy, 6 * s, 2 * s);
        // Eyes
        ctx.fillStyle = "#2a2a4a";
        ctx.fillRect(sx + 6 * s, sy + 3 * s, 2 * s, s);
        ctx.fillRect(sx + 9 * s, sy + 3 * s, 2 * s, s);
        // Shoes
        ctx.fillStyle = "#4a3a2a";
        ctx.fillRect(sx + 4 * s, sy + 14 * s, 3 * s, 2 * s);
        ctx.fillRect(sx + 9 * s, sy + 14 * s, 3 * s, 2 * s);
      },
    });

    // Aggie companion (follows 1 tile behind)
    const aggieOffset = {
      down: { x: 0, y: -1 },
      up: { x: 0, y: 1 },
      left: { x: 1, y: 0 },
      right: { x: -1, y: 0 },
    };
    const off = aggieOffset[playerDir] || aggieOffset.down;
    entities.push({
      x: playerPos.x + off.x,
      y: playerPos.y + off.y,
      alwaysVisible: true,
      draw: (ctx, sx, sy, ts, frame) => {
        drawAggieSprite(ctx, stateRef.current.aggie.evolutionStage, sx, sy, ts, frame);
      },
    });

    engine.setEntities(entities);
  }, [playerPos, playerDir, dungeon]);

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
      setPlayerPos({ x: newX, y: newY });

      // Check for trap
      if (tileType === TILE.TRAP) {
        handleTrap(newX, newY);
      }

      // Check for stairs down
      if (tileType === TILE.STAIRS_DOWN) {
        handleStairsDown();
      }
    }
  }, [paused, dialogue, screen]);

  // ─── Interaction ─────────────────
  const handleInteract = useCallback(() => {
    if (paused || screen !== "dungeon") return;

    // If dialogue is showing, ignore (dialogue handles its own taps)
    if (dialogue) return;

    const dg = dungeonRef.current;
    if (!dg) return;

    const pos = playerRef.current;
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

  // Handle dialogue completion — check if we should start a puzzle
  const handleDialogueComplete = useCallback(() => {
    setDialogue(null);
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
  }, [onStartPuzzle, activeChapter, activeFloor]);

  // ─── Puzzle result handler ─────────────────
  const handlePuzzleResult = useCallback((config, solved, attempts) => {
    setScreen("dungeon");
    const state = { ...stateRef.current };

    if (solved) {
      // Open the door on the map
      const dg = dungeonRef.current;
      if (dg) {
        const idx = config.doorY * dg.width + config.doorX;
        dg.map[idx] = config.isBoss ? TILE.BOSS_DOOR_OPEN : TILE.DOOR_OPEN;
        setDungeon({ ...dg });
      }

      // Record solve
      solveDoor(state, activeChapter, activeFloor, config.doorKey, attempts);

      // XP reward
      const xpGain = config.isBoss ? 50 : config.difficulty * 15;
      const leveled = addXp(state, xpGain);
      addCoins(state, config.difficulty * 10);

      showNotification(`+${xpGain} XP \u2022 +${config.difficulty * 10} coins`, "#4ade80");

      setDialogue({
        lines: [
          pickLine(simpleRng, "doorSolved"),
          ...(leveled ? [pickLine(simpleRng, "levelUp")] : []),
        ],
        portrait: "\u{1F47E}",
      });

      setCampaignState({ ...state });
    } else {
      showNotification("Puzzle failed! Try again later.", "#f87171");
    }
  }, [activeChapter, activeFloor, showNotification]);

  // ─── Chest interaction ─────────────────
  const handleChestInteract = useCallback((chestX, chestY) => {
    const chestKey = `${chestX}-${chestY}`;
    const state = stateRef.current;
    const floorState = getFloorState(state, activeChapter, activeFloor);

    if (floorState.chests[chestKey]) return; // Already opened

    // Open the chest on map
    const dg = dungeonRef.current;
    if (dg) {
      dg.map[chestY * dg.width + chestX] = TILE.CHEST_OPEN;
      setDungeon({ ...dg });
    }

    // Roll loot
    const loot = rollLoot(simpleRng);
    openChest(state, activeChapter, activeFloor, chestKey);
    addItem(state, loot.type, loot.amount);
    addXp(state, 10);

    const lootLabel = loot.type === "coins" ? `${loot.amount} coins`
      : loot.type === "xp" ? `${loot.amount} bonus XP`
      : loot.type === "key" ? "a skeleton key"
      : loot.type === "potion" ? "a potion"
      : "a rare item";

    showNotification(`Found: ${lootLabel}!`, "#ffd700");

    setDialogue({
      lines: [pickLine(simpleRng, "chestFound"), `You found ${lootLabel}!`],
      portrait: "\u{1F47E}",
    });

    setCampaignState({ ...state });
  }, [activeChapter, activeFloor, showNotification]);

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
      // Lose some coins
      const loss = Math.min(state.inventory.coins, 10);
      state.inventory.coins -= loss;
      saveCampaignState(state);
      setCampaignState({ ...state });
      showNotification(`Trap! Lost ${loss} coins.`, "#f87171");
      setDialogue({
        lines: [pickLine(simpleRng, "trapTriggered")],
        portrait: "\u{1F47E}",
      });
    }
  }, [showNotification]);

  // ─── Stairs down ─────────────────
  const handleStairsDown = useCallback(() => {
    const chapter = CAMPAIGN_CHAPTERS[activeChapter];
    if (!chapter) return;

    const state = stateRef.current;
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

      // After dialogue, return to chapter select
      setTimeout(() => {
        setScreen("chapter-select");
        setDialogue(null);
      }, 3000);
    } else {
      // Next floor
      setCampaignState({ ...state });
      setDialogue({
        lines: [pickLine(simpleRng, "stairsDown")],
        portrait: "\u{1F47E}",
      });
      setTimeout(() => {
        enterFloor(activeChapter, activeFloor + 1);
      }, 1500);
    }
  }, [activeChapter, activeFloor, floorStartTime, enterFloor]);

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

  // ─── Chapter select screen ─────────────────
  if (screen === "chapter-select") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#0a0a0f", color: "#e8e8ef",
        fontFamily: PIXEL_FONT, display: "flex", flexDirection: "column",
        alignItems: "center", padding: 24,
        paddingTop: "calc(24px + env(safe-area-inset-top, 0px))",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

        {/* Header */}
        <button
          onClick={onExit}
          style={{
            alignSelf: "flex-start", background: "none", border: "none",
            color: "#6b6b8b", fontFamily: PIXEL_FONT, fontSize: 8,
            cursor: "pointer", marginBottom: 16,
          }}
        >
          \u25C0 BACK
        </button>

        <div style={{ fontSize: 14, letterSpacing: 3, marginBottom: 8, color: C?.accent || "#c8f03e" }}>
          CAMPAIGN
        </div>
        <div style={{ fontSize: 7, color: "#6b6b8b", marginBottom: 32, letterSpacing: 1 }}>
          DUNGEON CRAWLER
        </div>

        {/* Aggie status card */}
        <div style={{
          width: "100%", maxWidth: 360, marginBottom: 24,
          background: "rgba(154,150,204,0.08)", borderRadius: 12,
          border: "2px solid rgba(154,150,204,0.2)", padding: "16px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, color: "#dddcf0", marginBottom: 4 }}>
                AGGIE \u2022 Lv.{campaignState.aggie.level}
              </div>
              <div style={{ fontSize: 7, color: "#9a96cc", textTransform: "uppercase" }}>
                {campaignState.aggie.evolutionStage}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#ffd700" }}>{campaignState.inventory.coins}</div>
                <div style={{ fontSize: 6, color: "#6b6b8b" }}>COINS</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4ade80" }}>{campaignState.stats.totalFloorsCleared}</div>
                <div style={{ fontSize: 6, color: "#6b6b8b" }}>FLOORS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter list */}
        <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          {CAMPAIGN_CHAPTERS.map((chapter, idx) => {
            const chState = getChapterState(campaignState, chapter.id);
            const isUnlocked = chapter.unlock === null ||
              (chapter.unlock.chapter != null && campaignState.chapters[chapter.unlock.chapter]?.completed);
            const isCompleted = chState.completed;

            // Count completed floors
            let floorsCleared = 0;
            for (let i = 0; i < chapter.floors; i++) {
              if (chState.floors[i]?.completed) floorsCleared++;
            }

            return (
              <button
                key={chapter.id}
                onClick={() => isUnlocked && enterChapter(chapter.id)}
                disabled={!isUnlocked}
                style={{
                  width: "100%", padding: "16px 20px", borderRadius: 12,
                  background: isUnlocked
                    ? isCompleted
                      ? "rgba(74,222,128,0.08)"
                      : "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: `2px solid ${isUnlocked
                    ? isCompleted ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.05)"}`,
                  cursor: isUnlocked ? "pointer" : "default",
                  opacity: isUnlocked ? 1 : 0.4,
                  textAlign: "left", fontFamily: PIXEL_FONT,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: isCompleted ? "#4ade80" : "#e8e8ef" }}>
                    {isCompleted ? "\u2713 " : ""}{chapter.name}
                  </span>
                  {!isUnlocked && (
                    <span style={{ fontSize: 7, color: "#555" }}>\uD83D\uDD12</span>
                  )}
                </div>
                <div style={{ fontSize: 7, color: "#6b6b8b", marginBottom: 6 }}>
                  {chapter.desc}
                </div>
                {isUnlocked && (
                  <div style={{ fontSize: 7, color: "#555" }}>
                    {floorsCleared}/{chapter.floors} floors
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Dungeon view (inside Game Boy shell) ─────────────────
  return (
    <GameBoyShell
      canvasRef={canvasRef}
      onButtonA={() => {
        // A = interact (fires space key via shell)
      }}
      onButtonB={() => {
        // B = cancel / back — dismiss dialogue or open pause
        if (dialogue) {
          handleDialogueComplete();
        } else {
          setPaused(p => !p);
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
          C={C}
        />
      )}

      {/* Dialogue overlay */}
      {dialogue && (
        <CampaignDialogue
          lines={dialogue.lines}
          portrait={dialogue.portrait}
          onComplete={handleDialogueComplete}
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
