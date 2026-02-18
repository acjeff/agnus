// --- VaultMode Component ---
// Main vault view: overview grid, lock interface, turn system, tile solving wrapper, pins.
// This component manages the vault-specific state and delegates to VaultLock.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import VaultLock, { TokenTile, parseToken } from "./VaultLock.jsx";
import { buildVaultPuzzles, computeUnlockedTiles, getMastermindFeedback, VAULT_DIFFICULTIES } from "./VaultGenerator.js";
import {
  subscribeToVaultSession,
  updateVaultFill,
  updateVaultTileProgress,
  updateVaultCurrentTile,
  updateVaultTileUnlocked,
  advanceVaultTurn,
  addVaultTurnHistory,
  submitVaultLock,
  submitVaultGuess,
  clearVaultGuess,
  clearLockPosition,
  kickVaultPlayer,
  sendVaultChatMessage,
  sendVaultPin,
  clearVaultPin,
  sendVaultReaction,
  clearVaultTileFills,
  completeVaultSession,
} from "./VaultFirebase.js";

const COOP_MY_COLOR = "#54A0FF";
const COOP_PARTNER_COLOR = "#FF6B6B";
const PLAYER_COLORS = ["#54A0FF", "#FF6B6B", "#4ECB71", "#FFD93D"];

export default function VaultMode({
  sessionId,
  myUid,
  username,
  firebaseUser,
  C,                    // color constants
  activeTheme,
  onStartPuzzle,        // (puzzleIdx, puzzle, isMyTurn) => void — start solving a tile
  onBackToMenu,         // () => void — return to main menu
  currentSolvingTile,   // number | null — which tile is being solved right now
  onTileSolved,         // (tileIdx, attempts, time) => void — callback when tile solving finishes
  gameState,            // "playing" | "won" — from parent
  setView,              // (view) => void
  onSessionData,        // (data) => void — callback with latest session data for parent
}) {
  // --- Session state from Firebase ---
  const [sessionData, setSessionData] = useState(null);
  const [vaultPuzzles, setVaultPuzzles] = useState(null);
  const [vaultMeta, setVaultMeta] = useState(null); // { combination, clueTiles, decoyTiles, config }
  const currentTileRef = useRef(-1);
  const prevSolvedRef = useRef(new Set());
  const unsubRef = useRef(null);

  // --- Derived state ---
  const players = sessionData?.players || {};
  const playerUids = Object.keys(players).sort(); // stable sort for consistent ordering
  const playerCount = playerUids.length;
  const playerNames = useMemo(() => {
    const names = {};
    for (const uid of playerUids) {
      names[uid] = players[uid]?.username || "Player";
    }
    return names;
  }, [players, playerUids]);
  const isHost = sessionData?.hostUid === myUid;
  const turnOrder = playerUids; // simple round-robin
  const currentTurnUid = sessionData?.currentTurn;
  const isMyTurn = currentTurnUid === myUid;
  const isComplete = sessionData?.status === "complete";
  const isFailed = sessionData?.status === "failed";
  const isWaiting = sessionData?.status === "waiting";
  const strikes = sessionData?.strikes || 0;
  const tileProgress = sessionData?.tileProgress || {};
  const tileUnlocked = sessionData?.tileUnlocked || {};
  const lock = sessionData?.lock || { 0: null, 1: null, 2: null, 3: null };
  const lockGuesses = sessionData?.lockGuesses || {};
  const lockAttempts = sessionData?.lockAttempts || 0;
  const maxAttempts = sessionData?.maxAttempts || 4;
  const lockFeedback = sessionData?.lockFeedback || [];
  const pins = sessionData?.pins || {};
  const difficulty = sessionData?.difficulty || "silver";
  const config = VAULT_DIFFICULTIES[difficulty] || VAULT_DIFFICULTIES.silver;
  const gridLayout = config.gridLayout;
  const totalPuzzles = config.totalPuzzles;

  // Compute effective unlocked map (starting + adjacency from solved)
  const effectiveUnlocked = useMemo(() => {
    if (!vaultMeta) return tileUnlocked;
    return computeUnlockedTiles(tileProgress, vaultMeta.config.totalPuzzles === 9
      ? { 0: true, 2: true, 6: true, 8: true }
      : vaultMeta.startingUnlocked, gridLayout);
  }, [tileProgress, vaultMeta, tileUnlocked, gridLayout]);

  const solvedCount = Object.values(tileProgress).filter(v => v > 0).length;

  // --- Build puzzles from seed ---
  useEffect(() => {
    if (!sessionData?.puzzleSeed) return;
    const result = buildVaultPuzzles(sessionData.puzzleSeed, sessionData.difficulty);
    setVaultPuzzles(result.puzzles);
    setVaultMeta({
      combination: result.combination,
      clueTiles: result.clueTiles,
      decoyTiles: result.decoyTiles,
      startingUnlocked: result.startingUnlocked,
      config: result.config,
    });
  }, [sessionData?.puzzleSeed, sessionData?.difficulty]);

  // --- Subscribe to session ---
  useEffect(() => {
    if (!sessionId) return;
    if (unsubRef.current) unsubRef.current();
    const unsub = subscribeToVaultSession(sessionId, (data) => {
      if (!data) return;
      setSessionData(data);
      onSessionData?.(data);
    });
    unsubRef.current = unsub;
    return () => { unsub(); unsubRef.current = null; };
  }, [sessionId]);

  // --- Sync unlocked tiles to Firebase when we solve a puzzle ---
  useEffect(() => {
    if (!sessionId || !vaultMeta) return;
    const newUnlocked = computeUnlockedTiles(tileProgress, vaultMeta.startingUnlocked, gridLayout);
    // Only write if there are new unlocks
    const current = sessionData?.tileUnlocked || {};
    let hasNew = false;
    for (const k of Object.keys(newUnlocked)) {
      if (!current[k]) { hasNew = true; break; }
    }
    if (hasNew) {
      updateVaultTileUnlocked(sessionId, newUnlocked).catch(() => {});
    }
  }, [tileProgress, sessionId, vaultMeta, gridLayout]);

  // --- Handle tile selection ---
  const handleTileClick = useCallback((tileIdx) => {
    if (!vaultPuzzles || !sessionId || isFailed) return;
    const isSolved = (tileProgress[tileIdx] || 0) > 0;
    const isUnlocked = effectiveUnlocked[tileIdx];

    if (!isUnlocked && !isSolved) return; // Can't access locked tiles

    currentTileRef.current = tileIdx;
    updateVaultCurrentTile(sessionId, myUid, tileIdx).catch(() => {});

    if (isSolved) {
      // View completed tile (anyone can review solved tiles anytime)
      onStartPuzzle?.(tileIdx, vaultPuzzles[tileIdx], false);
    } else if (isMyTurn) {
      // Solve this tile (only on my turn)
      onStartPuzzle?.(tileIdx, vaultPuzzles[tileIdx], true);
    }
    // If not my turn and not solved, just view (read-only)
  }, [vaultPuzzles, sessionId, tileProgress, effectiveUnlocked, isMyTurn, isFailed, myUid, onStartPuzzle]);

  // --- Handle tile solved callback ---
  const handleTileSolved = useCallback(async (tileIdx, attempts, time) => {
    if (!sessionId) return;
    await updateVaultTileProgress(sessionId, tileIdx, attempts, time);
    await clearVaultTileFills(sessionId, tileIdx);

    // Advance turn to next player in order
    const myIdx = turnOrder.indexOf(myUid);
    const nextIdx = (myIdx + 1) % turnOrder.length;
    const nextUid = turnOrder[nextIdx];
    if (nextUid && nextUid !== myUid) {
      await advanceVaultTurn(sessionId, nextUid);
      await addVaultTurnHistory(sessionId, {
        uid: myUid,
        tileIdx,
        result: "solved",
        timestamp: Date.now(),
      });
    }

    currentTileRef.current = -1;
    updateVaultCurrentTile(sessionId, myUid, -1).catch(() => {});
    onTileSolved?.(tileIdx, attempts, time);
  }, [sessionId, turnOrder, myUid, onTileSolved]);

  // --- Lock guess handlers (new system: per-player guesses) ---
  const [pickerPosition, setPickerPosition] = useState(null); // which slot is being picked

  // Gather all unique tokens from solved puzzles for the token picker
  const availableTokens = useMemo(() => {
    if (!vaultPuzzles) return [];
    const tokenSet = new Set();
    for (const [idx, attempts] of Object.entries(tileProgress)) {
      if (attempts > 0 && vaultPuzzles[idx]) {
        for (const token of vaultPuzzles[idx].usedTokens) {
          tokenSet.add(token);
        }
      }
    }
    return [...tokenSet];
  }, [vaultPuzzles, tileProgress]);

  const handleSlotClick = useCallback((position) => {
    setPickerPosition(position);
  }, []);

  const handlePickToken = useCallback(async (token) => {
    if (pickerPosition === null || !sessionId || !myUid) return;
    await submitVaultGuess(sessionId, myUid, pickerPosition, token);
    setPickerPosition(null);
  }, [pickerPosition, sessionId, myUid]);

  const handleClearMyGuess = useCallback(async () => {
    if (pickerPosition === null || !sessionId || !myUid) return;
    await clearVaultGuess(sessionId, myUid, pickerPosition);
    setPickerPosition(null);
  }, [pickerPosition, sessionId, myUid]);

  // Submit lock: use consensus guesses or hard-locked positions
  const handleSubmitLock = useCallback(async () => {
    if (!sessionId || !vaultMeta) return;
    const guess = [0, 1, 2, 3].map(pos => {
      if (lock[pos]?.token) return lock[pos].token;
      const posGuesses = lockGuesses[pos] || {};
      const tokens = Object.values(posGuesses);
      if (tokens.length > 0 && tokens.every(t => t === tokens[0])) return tokens[0];
      return null;
    });
    if (guess.some(t => !t)) return;
    const feedback = getMastermindFeedback(guess, vaultMeta.combination);
    await submitVaultLock(sessionId, guess, feedback);
    if (feedback.gold === 4) {
      await completeVaultSession(sessionId);
    }
  }, [sessionId, lock, lockGuesses, vaultMeta]);

  // --- Kick player handler ---
  const handleKickPlayer = useCallback(async (uid) => {
    if (!sessionId || !isHost || uid === myUid) return;
    await kickVaultPlayer(sessionId, uid);
  }, [sessionId, isHost, myUid]);

  // --- Pin handlers ---
  const handlePin = useCallback(async (tileIdx) => {
    if (!sessionId) return;
    if (pins[tileIdx]) {
      await clearVaultPin(sessionId, tileIdx);
    } else {
      await sendVaultPin(sessionId, tileIdx, myUid, "Check this!");
    }
  }, [sessionId, pins, myUid]);

  // --- Clue tile detection ---
  // Identify which unsolved tiles are clue tiles (tiles that contain silhouette clues)
  const clueTileSet = useMemo(() => {
    if (!vaultMeta?.clueTiles) return new Set();
    return new Set(vaultMeta.clueTiles);
  }, [vaultMeta]);

  const decoyTileSet = useMemo(() => {
    if (!vaultMeta?.decoyTiles) return new Set();
    return new Set(vaultMeta.decoyTiles);
  }, [vaultMeta]);

  // --- Tile sizing ---
  const tileSz = Math.min(60, Math.floor((280 - gridLayout * 4) / gridLayout));
  const miniCellSz = Math.floor((tileSz - 6) / (config.gridSize || 5));

  if (!sessionData || !vaultPuzzles) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "60vh", color: C.textDim, fontFamily: "'Inter', sans-serif",
      }}>
        Loading vault...
      </div>
    );
  }

  // --- Currently solving a tile (parent handles actual puzzle UI) ---
  if (currentSolvingTile !== null && currentSolvingTile !== undefined && currentSolvingTile >= 0) {
    return null; // Parent renders the puzzle solving UI
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 12, padding: "12px 8px", maxWidth: 400, margin: "0 auto",
      animation: "fadeUp 0.3s ease both",
    }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes vaultPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(200,240,62,0); } 50% { box-shadow: 0 0 12px 2px rgba(200,240,62,0.3); } }`}</style>

      {/* Player Roster & Turn Indicator */}
      <div style={{
        width: "100%", padding: "8px 12px", borderRadius: 12,
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.textDim,
            fontFamily: "'Inter', sans-serif", letterSpacing: 1, textTransform: "uppercase",
          }}>
            Players
          </div>
          {isWaiting && (
            <div style={{
              fontSize: 9, color: C.accent, fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              animation: "coopPulse 2s infinite",
            }}>
              Waiting for players...
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {turnOrder.map((uid, idx) => {
            const name = playerNames[uid] || "Player";
            const isMe = uid === myUid;
            const isTurn = uid === currentTurnUid;
            const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
            const playerTile = players[uid]?.currentTile;
            return (
              <div key={uid} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 8px", borderRadius: 8,
                backgroundColor: isTurn ? color + "18" : "transparent",
                border: `1.5px solid ${isTurn ? color : "transparent"}`,
                transition: "all 0.2s",
                animation: isTurn ? "vaultPulse 2s infinite" : "none",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: color,
                }} />
                <span style={{
                  fontSize: 11, fontWeight: isTurn ? 700 : 500,
                  color: isTurn ? C.text : C.textDim,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {isMe ? "You" : name}
                </span>
                {isTurn && !isComplete && (
                  <span style={{ fontSize: 8, color, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                    {isMe ? "(your turn)" : "(their turn)"}
                  </span>
                )}
                {isHost && !isMe && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleKickPlayer(uid); }}
                    title="Remove player"
                    style={{
                      marginLeft: 2, width: 14, height: 14, borderRadius: 7,
                      border: "none", backgroundColor: "#FF6B6B22", color: "#FF6B6B",
                      fontSize: 8, cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", fontWeight: 700,
                    }}
                  >{"\u2715"}</button>
                )}
              </div>
            );
          })}
        </div>
        {!isComplete && !isFailed && (
          <div style={{
            fontSize: 9, color: C.textDim + "88", fontFamily: "'Inter', sans-serif",
          }}>
            Turn order: {turnOrder.map((uid, i) => (uid === myUid ? "You" : (playerNames[uid] || "?"))).join(" \u2192 ")}
          </div>
        )}
      </div>

      {/* Strikes indicator — always visible */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 8,
        backgroundColor: strikes >= 3 ? "#FF6B6B22" : strikes > 0 ? "#FF6B6B11" : C.surface,
        border: `1px solid ${strikes >= 3 ? "#FF6B6B44" : strikes > 0 ? "#FF6B6B22" : C.border}`,
      }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              fontSize: 14,
              opacity: i < strikes ? 1 : 0.2,
              filter: i < strikes ? "none" : "grayscale(1)",
            }}>{"\u2716"}</span>
          ))}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: strikes >= 3 ? "#FF6B6B" : C.textDim,
          fontFamily: "'Inter', sans-serif",
        }}>
          {strikes >= 3 ? "Vault Failed" : `${strikes}/3 strikes`}
        </span>
      </div>

      {/* Vault Failed overlay */}
      {isFailed && (
        <div style={{
          padding: 16, borderRadius: 12,
          backgroundColor: "#FF6B6B11", border: `1px solid #FF6B6B33`,
          textAlign: "center", width: "100%",
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#FF6B6B",
            fontFamily: "'Inter', sans-serif", marginBottom: 6,
          }}>
            Vault Breached
          </div>
          <div style={{
            fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif",
          }}>
            3 puzzles failed. The vault has locked you out.
          </div>
        </div>
      )}

      {/* Lock Interface */}
      <VaultLock
        lock={lock}
        lockGuesses={lockGuesses}
        lockAttempts={lockAttempts}
        maxAttempts={maxAttempts}
        lockFeedback={lockFeedback}
        playerUids={playerUids}
        playerNames={playerNames}
        myUid={myUid}
        onSlotClick={handleSlotClick}
        onSubmitLock={handleSubmitLock}
        isComplete={isComplete}
        C={C}
      />

      {/* Token Picker — inline below lock, appears when a slot is tapped */}
      {pickerPosition !== null && (
        <div style={{
          padding: 12, borderRadius: 12,
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          width: "100%",
          animation: "fadeUp 0.2s ease both",
        }}>
          <div style={{
            fontSize: 12, color: C.textDim, fontWeight: 600,
            fontFamily: "'Inter', sans-serif", marginBottom: 8,
          }}>
            Your guess for position {pickerPosition + 1}:
          </div>
          {availableTokens.length === 0 ? (
            <div style={{ fontSize: 11, color: C.textDim + "88", fontFamily: "'Inter', sans-serif" }}>
              Solve puzzles to discover tokens for the lock.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {availableTokens.map((token, i) => {
                const isSelected = lockGuesses?.[pickerPosition]?.[myUid] === token;
                return (
                  <div key={i} style={{ position: "relative" }}>
                    <TokenTile
                      token={token}
                      size={36}
                      onClick={() => handlePickToken(token)}
                      style={{
                        cursor: "pointer",
                        border: isSelected ? `2px solid ${C.correct}` : "2px solid transparent",
                        boxShadow: isSelected ? `0 0 8px ${C.correct}44` : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {lockGuesses?.[pickerPosition]?.[myUid] && (
              <button
                onClick={handleClearMyGuess}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${C.border}`, backgroundColor: "transparent",
                  color: C.textDim, fontSize: 11, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setPickerPosition(null)}
              style={{
                padding: "5px 12px", borderRadius: 6,
                border: `1px solid ${C.border}`, backgroundColor: "transparent",
                color: C.textDim, fontSize: 11, cursor: "pointer",
                fontFamily: "'Inter', sans-serif", fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      <div style={{
        fontSize: 11, color: C.textDim,
        fontFamily: "'Inter', sans-serif", fontWeight: 600,
      }}>
        {solvedCount} / {totalPuzzles} puzzles solved
      </div>

      {/* Puzzle Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridLayout}, 1fr)`,
        gap: 4,
        padding: 8,
        borderRadius: 12,
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
      }}>
        {Array.from({ length: totalPuzzles }, (_, i) => {
          const isSolved = (tileProgress[i] || 0) > 0;
          const isUnlocked = effectiveUnlocked[i];
          const isPinned = !!pins[i];
          const isClue = clueTileSet.has(i);
          const isDecoy = decoyTileSet.has(i);
          const puzzle = vaultPuzzles[i];
          const canInteract = isUnlocked || isSolved;

          // Check if any other player is on this tile
          const playersHere = playerUids.filter(uid => uid !== myUid && players[uid]?.currentTile === i);

          return (
            <button
              key={i}
              onClick={() => canInteract ? handleTileClick(i) : null}
              style={{
                width: tileSz, height: tileSz,
                borderRadius: 6,
                border: `1.5px solid ${
                  playersHere.length > 0 ? COOP_PARTNER_COLOR :
                  isPinned ? C.accent :
                  isSolved ? C.correct + "66" :
                  isUnlocked ? C.border :
                  C.textDim + "22"
                }`,
                backgroundColor: isSolved ? C.correct + "10" :
                  playersHere.length > 0 ? COOP_PARTNER_COLOR + "08" :
                  isUnlocked ? C.surface :
                  C.bg,
                cursor: canInteract ? "pointer" : "default",
                padding: 2,
                position: "relative",
                display: "flex", flexDirection: "column", gap: 0.5,
                alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                overflow: "hidden",
                opacity: isUnlocked || isSolved ? 1 : 0.35,
                boxShadow: isPinned ? `0 0 8px ${C.accent}44` :
                  playersHere.length > 0 ? `0 0 8px ${COOP_PARTNER_COLOR}44` : "none",
              }}
              onMouseEnter={e => { if (canInteract) { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.borderColor = C.accent; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = playersHere.length > 0 ? COOP_PARTNER_COLOR : isPinned ? C.accent : isSolved ? C.correct + "66" : isUnlocked ? C.border : C.textDim + "22"; }}
            >
              {/* Solved: show mini preview */}
              {isSolved && puzzle ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {puzzle.solution.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 0.5 }}>
                      {row.map((token, ci) => {
                        const { color } = parseToken(token);
                        return <div key={ci} style={{
                          width: miniCellSz, height: miniCellSz,
                          borderRadius: 1, backgroundColor: color,
                        }} />;
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isUnlocked ? 13 : 10,
                  fontWeight: 700,
                  color: isUnlocked ? C.textDim : C.textDim + "55",
                  lineHeight: 1,
                }}>
                  {isUnlocked ? i + 1 : "\uD83D\uDD12"}
                </span>
              )}

              {/* Clue indicator — gold star badge, visible on solved tiles too */}
              {isClue && (isUnlocked || isSolved) && (
                <div style={{
                  position: "absolute", bottom: 1, right: 1,
                  width: isSolved ? 14 : 6, height: isSolved ? 14 : 6,
                  borderRadius: isSolved ? 3 : 3,
                  backgroundColor: (C.gold || "#FFD700") + (isSolved ? "DD" : "FF"),
                  boxShadow: `0 0 ${isSolved ? 6 : 4}px ${C.gold || "#FFD700"}88`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 900, color: "#000",
                  lineHeight: 1,
                }}>
                  {isSolved ? "\u2605" : ""}
                </div>
              )}

              {/* Decoy indicator — dim X badge on solved tiles */}
              {isDecoy && (isUnlocked || isSolved) && (
                <div style={{
                  position: "absolute", bottom: 1, right: 1,
                  width: isSolved ? 14 : 5, height: isSolved ? 14 : 5,
                  borderRadius: isSolved ? 3 : 3,
                  backgroundColor: C.textDim + (isSolved ? "44" : "55"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 900, color: C.textDim,
                  lineHeight: 1,
                }}>
                  {isSolved ? "\u2717" : ""}
                </div>
              )}

              {/* Pin indicator */}
              {isPinned && (
                <div style={{
                  position: "absolute", top: 2, left: 2,
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: C.accent,
                }} />
              )}

              {/* Other players here */}
              {playersHere.map((uid, pi) => (
                <div key={uid} style={{
                  position: "absolute", top: 1, right: 1 + pi * 10,
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: PLAYER_COLORS[playerUids.indexOf(uid) % PLAYER_COLORS.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 700, color: "#fff",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {(playerNames[uid] || "P")[0]}
                </div>
              ))}
            </button>
          );
        })}
      </div>

      {/* Legend for tile indicators */}
      {solvedCount > 0 && (
        <div style={{
          display: "flex", gap: 12, alignItems: "center",
          fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3,
              backgroundColor: (C.gold || "#FFD700") + "DD",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 900, color: "#000",
            }}>{"\u2605"}</span>
            Clue tile
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3,
              backgroundColor: C.textDim + "44",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 900, color: C.textDim,
            }}>{"\u2717"}</span>
            Decoy
          </span>
        </div>
      )}

      {/* Back to Menu */}
      <button
        onClick={onBackToMenu}
        style={{
          padding: "8px 20px", borderRadius: 8,
          border: `1px solid ${C.border}`,
          backgroundColor: "transparent",
          color: C.textDim, fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
          transition: "all 0.15s",
        }}
      >
        Leave Vault
      </button>
    </div>
  );
}

// --- Helper: Get vault status summary for session list ---
export function getVaultSummary(sessionData) {
  if (!sessionData) return null;
  const tp = sessionData.tileProgress || {};
  const solvedCount = Object.values(tp).filter(v => v > 0).length;
  const config = VAULT_DIFFICULTIES[sessionData.difficulty] || VAULT_DIFFICULTIES.silver;
  const lockFilled = [0, 1, 2, 3].filter(i => sessionData.lock?.[i]?.token).length;
  return {
    solvedCount,
    totalPuzzles: config.totalPuzzles,
    lockFilled,
    attemptsUsed: sessionData.lockAttempts || 0,
    maxAttempts: sessionData.maxAttempts || 4,
    isComplete: sessionData.status === "complete",
    difficulty: sessionData.difficulty,
    label: config.label,
  };
}
