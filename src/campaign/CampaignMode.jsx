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

  // Refs
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(campaignState);
  const dungeonRef = useRef(dungeon);
  const playerRef = useRef(playerPos);
  const exploredRef = useRef(new Set());
  const dialogueAdvanceRef = useRef(null);

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

    // Player is Aggie
    entities.push({
      x: playerPos.x,
      y: playerPos.y,
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
      onDpadPress={(dx, dy) => handleMove(dx, dy)}
      onButtonA={() => {
        if (dialogue && dialogueAdvanceRef.current) {
          dialogueAdvanceRef.current();
        } else {
          handleInteract();
        }
      }}
      onButtonB={() => {
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
