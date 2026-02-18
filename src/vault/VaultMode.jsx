// --- VaultMode Component ---
// Main vault view: overview grid, lock interface, turn system, tile solving wrapper, pins.
// This component manages the vault-specific state and delegates to VaultLock and VaultChat.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import VaultLock, { TokenTile, ProposalCard, parseToken } from "./VaultLock.jsx";
import { buildVaultPuzzles, computeUnlockedTiles, getMastermindFeedback, VAULT_DIFFICULTIES } from "./VaultGenerator.js";
import {
  subscribeToVaultSession,
  updateVaultFill,
  updateVaultTileProgress,
  updateVaultCurrentTile,
  updateVaultTileUnlocked,
  advanceVaultTurn,
  addVaultTurnHistory,
  proposeLockPosition,
  respondToLockProposal,
  reactToLockProposal,
  approveCounterProposal,
  submitVaultLock,
  clearLockPosition,
  sendVaultChatMessage,
  sendVaultPin,
  clearVaultPin,
  sendVaultReaction,
  clearVaultTileFills,
  completeVaultSession,
} from "./VaultFirebase.js";

const COOP_MY_COLOR = "#54A0FF";
const COOP_PARTNER_COLOR = "#FF6B6B";

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
  const playerUids = Object.keys(players);
  const partnerUid = playerUids.find(uid => uid !== myUid);
  const partnerUsername = partnerUid ? (players[partnerUid]?.username || "Partner") : null;
  const partnerCurrentTile = partnerUid ? (players[partnerUid]?.currentTile ?? -1) : -1;
  const isMyTurn = sessionData?.currentTurn === myUid;
  const isComplete = sessionData?.status === "complete";
  const tileProgress = sessionData?.tileProgress || {};
  const tileUnlocked = sessionData?.tileUnlocked || {};
  const lock = sessionData?.lock || { 0: null, 1: null, 2: null, 3: null };
  const lockAttempts = sessionData?.lockAttempts || 0;
  const maxAttempts = sessionData?.maxAttempts || 4;
  const lockFeedback = sessionData?.lockFeedback || [];
  const pins = sessionData?.pins || {};
  const chat = sessionData?.chat || {};
  const proposals = sessionData?.lockProposals || {};
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
    if (!vaultPuzzles || !sessionId) return;
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
  }, [vaultPuzzles, sessionId, tileProgress, effectiveUnlocked, isMyTurn, myUid, onStartPuzzle]);

  // --- Handle tile solved callback ---
  const handleTileSolved = useCallback(async (tileIdx, attempts, time) => {
    if (!sessionId) return;
    await updateVaultTileProgress(sessionId, tileIdx, attempts, time);
    await clearVaultTileFills(sessionId, tileIdx);

    // Advance turn to partner
    if (partnerUid) {
      await advanceVaultTurn(sessionId, partnerUid);
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
  }, [sessionId, partnerUid, myUid, onTileSolved]);

  // --- Lock proposal handlers ---
  const [proposingPosition, setProposingPosition] = useState(null);
  const [showTokenPicker, setShowTokenPicker] = useState(false);

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

  const handlePropose = useCallback((position) => {
    setProposingPosition(position);
    setShowTokenPicker(true);
  }, []);

  const handleSelectToken = useCallback(async (token) => {
    if (proposingPosition === null || !sessionId) return;
    await proposeLockPosition(sessionId, myUid, proposingPosition, token, username);
    setShowTokenPicker(false);
    setProposingPosition(null);
  }, [proposingPosition, sessionId, myUid, username]);

  const handleApproveProposal = useCallback(async (proposalId) => {
    if (!sessionId) return;
    const proposal = proposals[proposalId];
    if (!proposal) return;
    if (proposal.status === "countered" && proposal.fromUid === myUid) {
      // I'm approving a counter from my partner
      await approveCounterProposal(sessionId, proposalId, myUid);
    } else {
      await respondToLockProposal(sessionId, proposalId, "approve", { uid: myUid, username });
    }
  }, [sessionId, proposals, myUid, username]);

  const handleCounterProposal = useCallback(async (proposalId, counterToken) => {
    if (!sessionId) return;
    await respondToLockProposal(sessionId, proposalId, "counter", {
      uid: myUid, username, counterToken,
    });
  }, [sessionId, myUid, username]);

  const handleReactToProposal = useCallback(async (proposalId, emoji) => {
    if (!sessionId) return;
    await reactToLockProposal(sessionId, proposalId, myUid, emoji);
  }, [sessionId, myUid]);

  const handleSubmitLock = useCallback(async () => {
    if (!sessionId || !vaultMeta) return;
    const guess = [0, 1, 2, 3].map(pos => lock[pos]?.token || null);
    if (guess.some(t => !t)) return;
    const feedback = getMastermindFeedback(guess, vaultMeta.combination);
    await submitVaultLock(sessionId, guess, feedback);
    if (feedback.gold === 4) {
      await completeVaultSession(sessionId);
    }
  }, [sessionId, lock, vaultMeta]);

  const handleClearPosition = useCallback(async (position) => {
    if (!sessionId) return;
    await clearLockPosition(sessionId, position);
  }, [sessionId]);

  // --- Pin handlers ---
  const handlePin = useCallback(async (tileIdx) => {
    if (!sessionId) return;
    if (pins[tileIdx]) {
      await clearVaultPin(sessionId, tileIdx);
    } else {
      await sendVaultPin(sessionId, tileIdx, myUid, "Check this!");
    }
  }, [sessionId, pins, myUid]);

  // --- Active proposals (pending or countered only) ---
  const activeProposals = useMemo(() => {
    return Object.values(proposals).filter(p => p.status === "pending" || p.status === "countered");
  }, [proposals]);

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

      {/* Turn Indicator */}
      <div style={{
        padding: "6px 16px",
        borderRadius: 20,
        backgroundColor: isMyTurn ? C.correct + "22" : C.textDim + "15",
        border: `1px solid ${isMyTurn ? C.correct + "44" : C.textDim + "22"}`,
        fontSize: 13, fontWeight: 700,
        color: isMyTurn ? C.correct : C.textDim,
        fontFamily: "'Inter', sans-serif",
        display: "flex", alignItems: "center", gap: 6,
        animation: isMyTurn ? "vaultPulse 2s infinite" : "none",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: isMyTurn ? C.correct : C.textDim + "44",
        }} />
        {isComplete ? "Vault Complete!" : isMyTurn ? "Your Turn — Solve a Puzzle" : `Waiting for ${partnerUsername || "partner"}...`}
      </div>

      {/* Lock Interface */}
      <VaultLock
        lock={lock}
        lockAttempts={lockAttempts}
        maxAttempts={maxAttempts}
        lockFeedback={lockFeedback}
        proposals={proposals}
        myUid={myUid}
        onPropose={handlePropose}
        onSubmitLock={handleSubmitLock}
        onClearPosition={handleClearPosition}
        isComplete={isComplete}
        C={C}
      />

      {/* Active Proposals */}
      {activeProposals.length > 0 && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          {activeProposals.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              myUid={myUid}
              onApprove={handleApproveProposal}
              onCounter={handleCounterProposal}
              onReact={handleReactToProposal}
              allTokens={availableTokens}
              C={C}
            />
          ))}
        </div>
      )}

      {/* Token Picker for Lock Proposals */}
      {showTokenPicker && (
        <div style={{
          padding: 12, borderRadius: 12,
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          width: "100%",
        }}>
          <div style={{
            fontSize: 12, color: C.textDim, fontWeight: 600,
            fontFamily: "'Inter', sans-serif", marginBottom: 8,
          }}>
            Pick a tile for position {(proposingPosition || 0) + 1}:
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {availableTokens.map((token, i) => (
              <TokenTile
                key={i}
                token={token}
                size={36}
                onClick={() => handleSelectToken(token)}
                style={{ cursor: "pointer", border: "2px solid transparent" }}
              />
            ))}
          </div>
          <button
            onClick={() => { setShowTokenPicker(false); setProposingPosition(null); }}
            style={{
              marginTop: 8, padding: "4px 12px", borderRadius: 6,
              border: `1px solid ${C.border}`, backgroundColor: "transparent",
              color: C.textDim, fontSize: 11, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
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
          const isPartnerHere = partnerCurrentTile === i;
          const puzzle = vaultPuzzles[i];
          const canInteract = isUnlocked || isSolved;

          return (
            <button
              key={i}
              onClick={() => canInteract ? handleTileClick(i) : null}
              style={{
                width: tileSz, height: tileSz,
                borderRadius: 6,
                border: `1.5px solid ${
                  isPartnerHere ? COOP_PARTNER_COLOR :
                  isPinned ? C.accent :
                  isSolved ? C.correct + "66" :
                  isUnlocked ? C.border :
                  C.textDim + "22"
                }`,
                backgroundColor: isSolved ? C.correct + "10" :
                  isPartnerHere ? COOP_PARTNER_COLOR + "08" :
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
                  isPartnerHere ? `0 0 8px ${COOP_PARTNER_COLOR}44` : "none",
              }}
              onMouseEnter={e => { if (canInteract) { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.borderColor = C.accent; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = isPartnerHere ? COOP_PARTNER_COLOR : isPinned ? C.accent : isSolved ? C.correct + "66" : isUnlocked ? C.border : C.textDim + "22"; }}
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
                  {isUnlocked ? i + 1 : "🔒"}
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

              {/* Partner indicator */}
              {isPartnerHere && (
                <div style={{
                  position: "absolute", top: 1, right: 1,
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: COOP_PARTNER_COLOR,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 700, color: "#fff",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {(partnerUsername || "P")[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Pin button for current view */}
      {currentSolvingTile !== null && currentSolvingTile >= 0 && (
        <button
          onClick={() => handlePin(currentSolvingTile)}
          style={{
            padding: "6px 16px", borderRadius: 8,
            border: `1px solid ${C.border}`,
            backgroundColor: pins[currentSolvingTile] ? C.accent + "22" : "transparent",
            color: pins[currentSolvingTile] ? C.accent : C.textDim,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {pins[currentSolvingTile] ? "Unpin Tile" : "Pin for Partner"}
        </button>
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
