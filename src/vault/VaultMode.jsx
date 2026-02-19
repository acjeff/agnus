// --- VaultMode Component ---
// Main vault view: overview grid, lock interface, turn system, tile solving wrapper, pins.
// This component manages the vault-specific state and delegates to VaultLock.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import VaultLock, { TokenTile, parseToken, LOCK_SHAPES, ColorShapePicker } from "./VaultLock.jsx";
import { buildVaultPuzzles, computeUnlockedTiles, pickOneAdjacentUnlock, getAdjacentUnlockCandidates, getMastermindFeedback, VAULT_DIFFICULTIES, OUTLINE_GREY } from "./VaultGenerator.js";
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
  lockVaultPosition,
  clearAllGuessesForPosition,
  kickVaultPlayer,
  sendVaultChatMessage,
  sendVaultPin,
  clearVaultPin,
  sendVaultReaction,
  clearVaultTileFills,
  completeVaultSession,
  setVaultPendingUnlock,
  clearVaultPendingUnlock,
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
  const [vaultMeta, setVaultMeta] = useState(null); // { combination, palette, quadrantOrder, config }
  const currentTileRef = useRef(-1);
  const prevSolvedRef = useRef(new Set());
  const unsubRef = useRef(null);
  const [showRules, setShowRules] = useState(() => {
    try { return !localStorage.getItem("vault-rules-seen"); } catch { return true; }
  });
  const [rulesPage, setRulesPage] = useState(0);

  const dismissRules = useCallback(() => {
    setShowRules(false);
    setRulesPage(0);
    try { localStorage.setItem("vault-rules-seen", "1"); } catch { /* ignore */ }
  }, []);

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
  const pendingUnlockChoices = sessionData?.pendingUnlockChoices || null;
  const pendingCandidates = pendingUnlockChoices?.candidates || [];
  const pendingCandidateSet = useMemo(() => new Set(pendingCandidates), [pendingCandidates]);
  const difficulty = sessionData?.difficulty || "silver";
  const config = VAULT_DIFFICULTIES[difficulty] || VAULT_DIFFICULTIES.silver;
  const gridLayout = config.gridLayout;
  const totalPuzzles = config.totalPuzzles;

  // Compute effective unlocked map: Firebase tileUnlocked (starting + explicitly unlocked) + solved tiles
  const effectiveUnlocked = useMemo(() => {
    if (!vaultMeta) return tileUnlocked;
    // Merge starting unlocked with Firebase tileUnlocked (which tracks explicit neighbor unlocks)
    const base = { ...(vaultMeta.startingUnlocked || {}), ...tileUnlocked };
    return computeUnlockedTiles(tileProgress, base, gridLayout);
  }, [tileProgress, vaultMeta, tileUnlocked, gridLayout]);

  const solvedCount = Object.values(tileProgress).filter(v => v > 0).length;

  // --- Build puzzles from seed ---
  useEffect(() => {
    if (!sessionData?.puzzleSeed) return;
    const result = buildVaultPuzzles(sessionData.puzzleSeed, sessionData.difficulty);
    setVaultPuzzles(result.puzzles);
    setVaultMeta({
      combination: result.combination,
      palette: result.palette,
      quadrantOrder: result.quadrantOrder,
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

  // --- Ensure starting unlocked tiles are in Firebase ---
  useEffect(() => {
    if (!sessionId || !vaultMeta) return;
    const current = sessionData?.tileUnlocked || {};
    const startingUnlocked = vaultMeta.startingUnlocked || {};
    let hasNew = false;
    for (const k of Object.keys(startingUnlocked)) {
      if (!current[k]) { hasNew = true; break; }
    }
    if (hasNew) {
      updateVaultTileUnlocked(sessionId, startingUnlocked).catch(() => {});
    }
  }, [sessionId, vaultMeta]);

  // --- Handle pending unlock choice (player picks which adjacent tile to unlock) ---
  const handleUnlockChoice = useCallback(async (chosenTileIdx) => {
    if (!sessionId || !pendingUnlockChoices) return;
    if (!pendingCandidateSet.has(chosenTileIdx)) return;
    const currentUnlockedMap = sessionData?.tileUnlocked || {};
    const newUnlocked = { ...currentUnlockedMap, [chosenTileIdx]: true };
    await updateVaultTileUnlocked(sessionId, newUnlocked);
    await clearVaultPendingUnlock(sessionId);
  }, [sessionId, pendingUnlockChoices, pendingCandidateSet, sessionData?.tileUnlocked]);

  // --- Handle tile selection ---
  const handleTileClick = useCallback((tileIdx) => {
    if (!vaultPuzzles || !sessionId || isFailed) return;

    // If there are pending unlock choices and this tile is a candidate, handle the choice
    if (pendingCandidateSet.has(tileIdx)) {
      handleUnlockChoice(tileIdx);
      return;
    }

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
  }, [vaultPuzzles, sessionId, tileProgress, effectiveUnlocked, isMyTurn, isFailed, myUid, onStartPuzzle, pendingCandidateSet, handleUnlockChoice]);

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


  const handleSlotClick = useCallback((position) => {
    // Don't open picker for hard-locked (gold-confirmed) positions
    if (lock[position]?.token) return;
    setPickerPosition(position);
  }, [lock]);

  const handlePickToken = useCallback(async (token) => {
    if (pickerPosition === null || !sessionId || !myUid) return;
    await submitVaultGuess(sessionId, myUid, pickerPosition, token);
    setPickerPosition(null);
  }, [pickerPosition, sessionId, myUid]);



  // Submit lock: use consensus guesses or hard-locked positions
  // After feedback, hard-lock gold positions and clear guesses for non-gold positions
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
    } else {
      // Hard-lock gold positions (correct token in correct place) so they stay
      for (const pos of feedback.goldPositions) {
        await lockVaultPosition(sessionId, pos, guess[pos]);
        await clearAllGuessesForPosition(sessionId, pos);
      }
      // Clear guesses for non-gold positions so players re-evaluate
      const goldSet = new Set(feedback.goldPositions);
      for (let pos = 0; pos < 4; pos++) {
        if (!goldSet.has(pos) && !lock[pos]?.token) {
          await clearAllGuessesForPosition(sessionId, pos);
        }
      }
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
    <>
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.textDim,
              fontFamily: "'Inter', sans-serif", letterSpacing: 1, textTransform: "uppercase",
            }}>
              Players
            </div>
            <div
              onClick={() => { setShowRules(true); setRulesPage(0); }}
              style={{
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: C.textDim + "22",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: C.textDim,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >?</div>
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

      {/* Color + Shape Picker — inline below lock, appears when a slot is tapped */}
      {pickerPosition !== null && vaultMeta?.palette && (
        <div>
          <div style={{
            fontSize: 12, color: C.textDim, fontWeight: 600,
            fontFamily: "'Inter', sans-serif", marginBottom: 6,
            textAlign: "center",
          }}>
            Your guess for position {pickerPosition + 1}:
          </div>
          <ColorShapePicker
            palette={vaultMeta.palette}
            currentToken={lockGuesses?.[pickerPosition]?.[myUid] || null}
            onPick={handlePickToken}
            onCancel={() => setPickerPosition(null)}
            C={C}
          />
        </div>
      )}

      {/* Progress */}
      <div style={{
        fontSize: 11, color: C.textDim,
        fontFamily: "'Inter', sans-serif", fontWeight: 600,
      }}>
        {solvedCount} / {totalPuzzles} puzzles solved
      </div>

      {/* Pending unlock choice prompt */}
      {pendingCandidates.length > 0 && (
        <div style={{
          padding: "6px 14px", borderRadius: 8,
          backgroundColor: C.accent + "14",
          border: `1px solid ${C.accent}44`,
          textAlign: "center",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: C.accent,
            fontFamily: "'Inter', sans-serif",
          }}>
            Pick a tile to unlock
          </span>
        </div>
      )}

      {/* Puzzle Grid — with quadrant grouping gaps for 4x4 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: gridLayout === 4
          ? `repeat(2, ${tileSz}px) 6px repeat(2, ${tileSz}px)`
          : `repeat(${gridLayout}, 1fr)`,
        gridTemplateRows: gridLayout === 4
          ? `repeat(2, ${tileSz}px) 6px repeat(2, ${tileSz}px)`
          : undefined,
        gap: 4,
        padding: 8,
        borderRadius: 12,
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
      }}>
        {gridLayout === 4 ? (
          /* 4x4 grid with quadrant separator gaps */
          Array.from({ length: totalPuzzles }, (_, i) => {
            const gridRow = Math.floor(i / gridLayout);
            const gridCol = i % gridLayout;
            // CSS grid row/col (1-indexed), accounting for the gap row/col at position 3
            const cssRow = gridRow < 2 ? gridRow + 1 : gridRow + 2;
            const cssCol = gridCol < 2 ? gridCol + 1 : gridCol + 2;
            return { i, cssRow, cssCol };
          })
        ).map(({ i, cssRow, cssCol }) => {
          const isSolved = (tileProgress[i] || 0) > 0;
          const isUnlocked = effectiveUnlocked[i];
          const isPinned = !!pins[i];
          const puzzle = vaultPuzzles[i];
          const isCandidate = pendingCandidateSet.has(i);
          const canInteract = isUnlocked || isSolved || isCandidate;

          // Check if any other player is on this tile
          const playersHere = playerUids.filter(uid => uid !== myUid && players[uid]?.currentTile === i);

          return (
            <button
              key={i}
              onClick={() => canInteract ? handleTileClick(i) : null}
              style={{
                gridRow: cssRow, gridColumn: cssCol,
                width: tileSz, height: tileSz,
                borderRadius: 6,
                border: `1.5px solid ${
                  isCandidate ? C.accent :
                  playersHere.length > 0 ? COOP_PARTNER_COLOR :
                  isPinned ? C.accent :
                  isSolved ? C.correct + "66" :
                  isUnlocked ? C.border :
                  C.textDim + "22"
                }`,
                backgroundColor: isCandidate ? (C.accent + "18") :
                  isSolved ? C.correct + "10" :
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
                opacity: isUnlocked || isSolved || isCandidate ? 1 : 0.35,
                boxShadow: isCandidate ? `0 0 10px ${C.accent}55` :
                  isPinned ? `0 0 8px ${C.accent}44` :
                  playersHere.length > 0 ? `0 0 8px ${COOP_PARTNER_COLOR}44` : "none",
                animation: isCandidate ? "vaultPulse 2s infinite" : "none",
              }}
              onMouseEnter={e => { if (canInteract) { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.borderColor = C.accent; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = isCandidate ? C.accent : playersHere.length > 0 ? COOP_PARTNER_COLOR : isPinned ? C.accent : isSolved ? C.correct + "66" : isUnlocked ? C.border : C.textDim + "22"; }}
            >
              {/* Solved: show mini preview */}
              {isSolved && puzzle ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {puzzle.solution.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 0.5 }}>
                      {row.map((token, ci) => {
                        const { color, shapeIndex } = parseToken(token);
                        return <div key={ci} style={{
                          width: miniCellSz, height: miniCellSz,
                          borderRadius: 1, backgroundColor: color,
                          position: "relative",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {LOCK_SHAPES[shapeIndex % LOCK_SHAPES.length]?.(miniCellSz * 0.7, "rgba(255,255,255,0.55)")}
                        </div>;
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isUnlocked || isCandidate ? 13 : 10,
                  fontWeight: 700,
                  color: isCandidate ? C.accent : isUnlocked ? C.textDim : C.textDim + "55",
                  lineHeight: 1,
                }}>
                  {isUnlocked || isCandidate ? i + 1 : "\uD83D\uDD12"}
                </span>
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
        })
        : (
          /* Non-4x4 fallback: standard grid without quadrant gaps */
          Array.from({ length: totalPuzzles }, (_, i) => {
            const isSolved = (tileProgress[i] || 0) > 0;
            const isUnlocked = effectiveUnlocked[i];
            const isPinned = !!pins[i];
            const puzzle = vaultPuzzles[i];
            const isCandidate = pendingCandidateSet.has(i);
            const canInteract = isUnlocked || isSolved || isCandidate;
            const playersHere = playerUids.filter(uid => uid !== myUid && players[uid]?.currentTile === i);
            return (
              <button
                key={i}
                onClick={() => canInteract ? handleTileClick(i) : null}
                style={{
                  width: tileSz, height: tileSz, borderRadius: 6,
                  border: `1.5px solid ${
                    isCandidate ? C.accent :
                    isSolved ? C.correct + "66" : isUnlocked ? C.border : C.textDim + "22"
                  }`,
                  backgroundColor: isCandidate ? (C.accent + "18") :
                    isSolved ? C.correct + "10" : isUnlocked ? C.surface : C.bg,
                  cursor: canInteract ? "pointer" : "default",
                  padding: 2, position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: isUnlocked || isSolved || isCandidate ? 1 : 0.35,
                  boxShadow: isCandidate ? `0 0 10px ${C.accent}55` : "none",
                  animation: isCandidate ? "vaultPulse 2s infinite" : "none",
                }}
              >
                {isSolved && puzzle ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {puzzle.solution.map((row, ri) => (
                      <div key={ri} style={{ display: "flex", gap: 0.5 }}>
                        {row.map((token, ci) => {
                          const { color } = parseToken(token);
                          return <div key={ci} style={{ width: miniCellSz, height: miniCellSz, borderRadius: 1, backgroundColor: color }} />;
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{
                    fontSize: isUnlocked || isCandidate ? 13 : 10, fontWeight: 700,
                    color: isCandidate ? C.accent : C.textDim,
                  }}>
                    {isUnlocked || isCandidate ? i + 1 : "\uD83D\uDD12"}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* How to Play button */}
      <button
        onClick={() => { setShowRules(true); setRulesPage(0); }}
        style={{
          padding: "6px 14px", borderRadius: 8,
          backgroundColor: "transparent",
          border: `1px solid ${C.border}`,
          color: C.textDim, fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        <span style={{ fontSize: 13 }}>{"\uD83D\uDD10"}</span> How to Play
      </button>

      </div>

      {/* Back button — fixed bottom-left, matches standard app pattern */}
      {(() => {
        const fabSize = 56;
        const springOpen = "cubic-bezier(0.175, 0.885, 0.32, 1.175)";
        const strokeColor = "#fff";
        return (
          <div
            onClick={onBackToMenu}
            style={{
              position: "fixed",
              bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
              left: 20,
              width: fabSize,
              height: fabSize,
              borderRadius: fabSize / 2,
              background: activeTheme.gridBg || C.surface,
              backdropFilter: "blur(28px) saturate(200%)",
              WebkitBackdropFilter: "blur(28px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "none",
              zIndex: 85,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: `transform 0.15s ${springOpen}, box-shadow 0.15s ease`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            aria-label="Leave Vault"
          >
            {/* Liquid Glass sheen highlight */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute", top: 0, left: "-10%", width: "120%", height: "50%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
                borderRadius: "inherit",
              }} />
            </div>
            <ChevronLeft size={22} color={strokeColor} strokeWidth={2.5} />
          </div>
        );
      })()}

      {/* --- Vault Rules Overlay --- */}
      {showRules && (() => {
        const TOTAL_PAGES = 4;
        const accent = C.accent || "#c8f03e";
        const gold = C.gold || "#FFD700";
        const red = "#FF6B6B";
        const green = C.correct || "#4ade80";
        const dim = C.textDim || "#6b6b7b";
        const surface = C.surface || "#14141f";
        const bg = C.bg || "#0a0a0f";
        const border = C.border || "#2a2a3a";
        const text = C.text || "#e8e8ef";
        const font = "'Inter', sans-serif";

        const demoPalette = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7"];

        // Mini shape renderers for inline visuals
        const miniShape = (shapeIdx, size, stroke) => {
          const shapes = [
            <circle cx="12" cy="12" r="5.5" fill="none" stroke={stroke} strokeWidth="2.5"/>,
            <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke={stroke} strokeWidth="2.5"/>,
            <polygon points="12,5 20,19 4,19" fill="none" stroke={stroke} strokeWidth="2.5"/>,
            <><line x1="12" y1="5" x2="12" y2="19" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/></>,
            <rect x="6" y="6" width="12" height="12" fill="none" stroke={stroke} strokeWidth="2.5"/>,
            <polygon points="12,3 14.5,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.5,9.5" fill="none" stroke={stroke} strokeWidth="2"/>,
          ];
          return <svg viewBox="0 0 24 24" width={size} height={size}>{shapes[shapeIdx % shapes.length]}</svg>;
        };

        // Token tile helper
        const demoToken = (color, shapeIdx, size = 32) => (
          <div style={{
            width: size, height: size, borderRadius: Math.max(3, size / 5),
            backgroundColor: color, position: "relative",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            {miniShape(shapeIdx, size * 0.6, "rgba(255,255,255,0.85)")}
          </div>
        );

        const greyCol = "#2a2a2a";

        const pages = [
          // --- PAGE 0: The Goal ---
          <div key="p0" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {/* Visual: lock with 4 question mark slots */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  width: 44, height: 44, borderRadius: 8,
                  border: `2px dashed ${dim}66`,
                  backgroundColor: bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 18, color: dim + "55", fontWeight: 700 }}>?</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6 }}>
                Crack the combination
              </div>
              <div style={{ fontSize: 11, color: dim, lineHeight: 1.5 }}>
                The vault is locked with a secret 4-slot code.
                Each slot is a <span style={{ color: accent }}>colour</span> + <span style={{ color: accent }}>shape</span> pair.
              </div>
            </div>
            {/* Visual: what a filled lock looks like */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {demoPalette.map((col, i) => (
                <div key={i}>{demoToken(col, i, 44)}</div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: dim + "aa", textAlign: "center", lineHeight: 1.4 }}>
              Each quadrant of the grid hides one combination piece
            </div>
          </div>,

          // --- PAGE 1: Quadrant Outlines ---
          <div key="p1" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, textAlign: "center" }}>
              Shape outlines hide the code
            </div>
            {/* Quadrant demo: 2x2 mini grids with shape outline in colour */}
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              backgroundColor: bg, border: `1px solid ${border}`,
              width: "100%",
            }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 10, lineHeight: 1.4, textAlign: "center" }}>
                The 4x4 grid is split into four 2x2 quadrants. Each quadrant draws a
                <span style={{ color: accent, fontWeight: 700 }}> shape outline </span>
                in its combination
                <span style={{ color: accent, fontWeight: 700 }}> colour</span>.
              </div>
              {/* Mini 4x4 demo showing 2 quadrants with coloured outlines */}
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                {/* Quadrant with circle outline in red */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 4 }}>
                    {Array.from({ length: 16 }, (_, ci) => {
                      const r = Math.floor(ci / 4), c = ci % 4;
                      const cx = 1.5, cy = 1.5;
                      const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
                      const isOutline = dist >= 1.0 && dist <= 1.8;
                      return (
                        <div key={ci} style={{
                          width: 12, height: 12, borderRadius: 2,
                          backgroundColor: isOutline ? "#FF6B6B" : greyCol,
                        }} />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF6B6B" }} />
                    {miniShape(0, 10, "rgba(255,255,255,0.85)")}
                  </div>
                </div>
                {/* Quadrant with diamond outline in teal */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 4 }}>
                    {Array.from({ length: 16 }, (_, ci) => {
                      const r = Math.floor(ci / 4), c = ci % 4;
                      const manhattan = Math.abs(r - 1.5) + Math.abs(c - 1.5);
                      const isOutline = manhattan >= 1.3 && manhattan <= 2.0;
                      return (
                        <div key={ci} style={{
                          width: 12, height: 12, borderRadius: 2,
                          backgroundColor: isOutline ? "#4ECDC4" : greyCol,
                        }} />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ECDC4" }} />
                    {miniShape(1, 10, "rgba(255,255,255,0.85)")}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: dim + "aa", textAlign: "center", lineHeight: 1.4 }}>
              Solve puzzles to see the outlines. Deduce the colour + shape for each quadrant.
            </div>
          </div>,

          // --- PAGE 2: Turns & Grid ---
          <div key="p2" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, textAlign: "center" }}>
              Take turns
            </div>
            {/* Turn order visual */}
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 8,
              backgroundColor: bg, border: `1px solid ${border}`,
            }}>
              {["You", "P2", "P3"].map((name, i) => {
                const colors = ["#54A0FF", "#FF6B6B", "#4ECB71"];
                const active = i === 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {i > 0 && <span style={{ fontSize: 10, color: dim + "66", margin: "0 2px" }}>{"\u2192"}</span>}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 3,
                      padding: "3px 6px", borderRadius: 6,
                      border: `1.5px solid ${active ? colors[i] : "transparent"}`,
                      backgroundColor: active ? colors[i] + "18" : "transparent",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors[i] }} />
                      <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? text : dim, fontFamily: font }}>
                        {name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Mini 4x4 grid with quadrant gaps */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 34px) 6px repeat(2, 34px)", gap: 3,
              padding: 6, borderRadius: 8, backgroundColor: bg, border: `1px solid ${border}`,
            }}>
              {Array.from({ length: 16 }, (_, i) => {
                const row = Math.floor(i / 4), col = i % 4;
                const cssRow = row < 2 ? row + 1 : row + 2;
                const cssCol = col < 2 ? col + 1 : col + 2;
                const isSolvedDemo = [0, 1, 4, 5, 10].includes(i);
                const isUnlockedDemo = [2, 6, 8, 9].includes(i);
                return (
                  <div key={i} style={{
                    gridRow: cssRow, gridColumn: cssCol,
                    width: 34, height: 34, borderRadius: 4,
                    border: `1.5px solid ${isSolvedDemo ? green + "66" : isUnlockedDemo ? border : dim + "22"}`,
                    backgroundColor: isSolvedDemo ? green + "10" : isUnlockedDemo ? surface : bg,
                    opacity: !isSolvedDemo && !isUnlockedDemo ? 0.35 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: dim,
                    fontFamily: font,
                  }}>
                    {isSolvedDemo ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {[[0,1],[2,0]].map((r, ri) => (
                          <div key={ri} style={{ display: "flex", gap: 1 }}>
                            {r.map((_, ci) => {
                              const isOutlineCell = (ri + ci) % 2 === 0;
                              return (
                                <div key={ci} style={{
                                  width: 6, height: 6, borderRadius: 1,
                                  backgroundColor: isOutlineCell ? demoPalette[Math.floor(i / 4)] : greyCol,
                                }} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : isUnlockedDemo ? (
                      <span>{i + 1}</span>
                    ) : (
                      <span style={{ fontSize: 8 }}>{"\uD83D\uDD12"}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: dim + "aa", textAlign: "center", lineHeight: 1.5 }}>
              Solving a puzzle unlocks adjacent tiles.<br />
              The grid is split into 4 quadrants — each hides one lock piece.
            </div>
          </div>,

          // --- PAGE 3: Lock Guessing & Feedback ---
          <div key="p3" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, textAlign: "center" }}>
              Guess the combination
            </div>
            {/* Picker explanation */}
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              backgroundColor: bg, border: `1px solid ${border}`,
              width: "100%", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 8, lineHeight: 1.4 }}>
                Pick a <span style={{ color: accent, fontWeight: 600 }}>colour</span> then a <span style={{ color: accent, fontWeight: 600 }}>shape</span> for each lock slot. When all players agree, submit your guess.
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {demoPalette.map((col, i) => (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 6,
                    border: `2px solid ${green}88`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {demoToken(col, i, 30)}
                  </div>
                ))}
              </div>
            </div>
            {/* Feedback pips visual */}
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              backgroundColor: bg, border: `1px solid ${border}`,
              width: "100%",
            }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 8, textAlign: "center" }}>After each guess you get feedback</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: gold }} />
                  <span style={{ fontSize: 10, color: dim }}>= right spot</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff", border: "1px solid #999" }} />
                  <span style={{ fontSize: 10, color: dim }}>= wrong spot</span>
                </div>
              </div>
            </div>
            {/* Limits visual */}
            <div style={{
              display: "flex", gap: 16, justifyContent: "center", width: "100%",
            }}>
              <div style={{
                flex: 1, padding: "8px 10px", borderRadius: 8,
                backgroundColor: bg, border: `1px solid ${border}`,
                textAlign: "center",
              }}>
                <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 4 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `1.5px solid ${i < 1 ? red : dim + "33"}`,
                      backgroundColor: i < 1 ? red + "22" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 700, color: i < 1 ? red : dim + "44",
                    }}>
                      {"\u2716"}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: dim, fontWeight: 600 }}>{maxAttempts} lock attempts</div>
              </div>
              <div style={{
                flex: 1, padding: "8px 10px", borderRadius: 8,
                backgroundColor: bg, border: `1px solid ${border}`,
                textAlign: "center",
              }}>
                <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 4 }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ fontSize: 14, opacity: i < 1 ? 1 : 0.2, filter: i < 1 ? "none" : "grayscale(1)" }}>{"\u2716"}</span>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: dim, fontWeight: 600 }}>3 puzzle fails = game over</div>
              </div>
            </div>
          </div>,
        ];

        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1200,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}>
            <style>{`@keyframes rulesOverlayFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rulesSlideUp { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            {/* Backdrop */}
            <div
              onClick={dismissRules}
              style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(0,0,0,0.7)",
                animation: "rulesOverlayFade 0.25s ease both",
              }}
            />
            {/* Card */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "relative",
                backgroundColor: surface,
                borderRadius: 20,
                border: `1px solid ${border}`,
                boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px ${accent}11`,
                maxWidth: 340, width: "100%",
                padding: "20px 20px 16px",
                animation: "rulesSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
                display: "flex", flexDirection: "column", gap: 0,
                fontFamily: font,
                maxHeight: "85vh",
                overflowY: "auto",
              }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{"\uD83D\uDD10"}</div>
                <div style={{
                  fontSize: 15, fontWeight: 800, color: text,
                  letterSpacing: 0.5,
                }}>
                  How to Play
                </div>
                {/* Page dots */}
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
                  {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setRulesPage(i)}
                      style={{
                        width: i === rulesPage ? 18 : 6, height: 6,
                        borderRadius: 3,
                        backgroundColor: i === rulesPage ? accent : dim + "44",
                        transition: "all 0.25s ease",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Page content */}
              <div style={{ minHeight: 220 }}>
                {pages[rulesPage]}
              </div>

              {/* Navigation */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 16, gap: 8,
              }}>
                {rulesPage > 0 ? (
                  <button
                    onClick={() => setRulesPage(p => p - 1)}
                    style={{
                      padding: "8px 16px", borderRadius: 8,
                      backgroundColor: "transparent",
                      border: `1px solid ${border}`,
                      color: dim, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: font,
                    }}
                  >
                    Back
                  </button>
                ) : <div />}
                {rulesPage < TOTAL_PAGES - 1 ? (
                  <button
                    onClick={() => setRulesPage(p => p + 1)}
                    style={{
                      padding: "8px 20px", borderRadius: 8,
                      backgroundColor: accent,
                      border: "none",
                      color: bg, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: font,
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={dismissRules}
                    style={{
                      padding: "8px 20px", borderRadius: 8,
                      backgroundColor: accent,
                      border: "none",
                      color: bg, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: font,
                    }}
                  >
                    Got it
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
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
