// --- VaultLock Component ---
// Renders the 4-position combination lock with per-player mini guess tiles in each slot.
// Each player's guess appears as a small icon within the slot, arranged in quadrants.

import { useState } from "react";

// Shape renderers (same as Pattrn.jsx SHAPES but as filled shapes for lock display)
const shapeStyle = { position: "absolute", inset: 0, margin: "auto" };
const LOCK_SHAPES = [
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={stroke || "#fff"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke={stroke || "#fff"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,5 20,19 4,19" fill="none" stroke={stroke || "#fff"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <line x1="12" y1="5" x2="12" y2="19" stroke={stroke || "#fff"} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke={stroke || "#fff"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="6" y="6" width="12" height="12" fill="none" stroke={stroke || "#fff"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 14.5,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.5,9.5" fill="none" stroke={stroke || "#fff"} strokeWidth="2"/>
    </svg>
  ),
  (s, stroke) => (
    <svg viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 18,21 3,9 21,9 6,21" fill="none" stroke={stroke || "#fff"} strokeWidth="2"/>
    </svg>
  ),
];

function parseToken(token) {
  if (!token) return { color: "#666", shapeIndex: 0 };
  const idx = token.lastIndexOf("|");
  return { color: token.slice(0, idx), shapeIndex: parseInt(token.slice(idx + 1), 10) };
}

// Render a single token tile (color bg + shape overlay)
function TokenTile({ token, size = 44, dimmed = false, onClick, style: extraStyle }) {
  const { color, shapeIndex } = parseToken(token);
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: Math.max(2, size / 6),
        backgroundColor: color,
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: dimmed ? 0.4 : 1,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        ...extraStyle,
      }}
    >
      {LOCK_SHAPES[shapeIndex % LOCK_SHAPES.length]?.(size * 0.6, "rgba(255,255,255,0.85)")}
    </div>
  );
}

// Mini token for showing a player's guess inside a slot quadrant
function MiniToken({ token, size = 20 }) {
  const { color, shapeIndex } = parseToken(token);
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.max(2, size / 5),
      backgroundColor: color, position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {LOCK_SHAPES[shapeIndex % LOCK_SHAPES.length]?.(size * 0.55, "rgba(255,255,255,0.8)")}
    </div>
  );
}

// Quadrant layout positions for 1-4 players
// Each entry: { top, left } as fractions of slot size
function getQuadrantPositions(count) {
  if (count === 1) return [{ top: "50%", left: "50%" }];
  if (count === 2) return [
    { top: "50%", left: "28%" },
    { top: "50%", left: "72%" },
  ];
  if (count === 3) return [
    { top: "30%", left: "50%" },
    { top: "70%", left: "28%" },
    { top: "70%", left: "72%" },
  ];
  return [
    { top: "30%", left: "30%" },
    { top: "30%", left: "70%" },
    { top: "70%", left: "30%" },
    { top: "70%", left: "70%" },
  ];
}

export default function VaultLock({
  lock,             // { 0: { token, confirmedBy } | null, ... } — consensus-locked tokens
  lockGuesses,      // { 0: { uid: token, ... }, 1: ..., ... } — per-player guesses
  lockAttempts,
  maxAttempts,
  lockFeedback,     // [{ guess, gold, white, goldPositions, whitePositions }]
  playerUids,       // [uid, ...] — all player UIDs in stable order
  playerNames,      // { uid: name } — display names
  myUid,
  onSlotClick,      // (position) => void — open token picker for this position
  onSubmitLock,     // () => void — submit the full lock
  isComplete,
  C,                // color constants
}) {
  const attemptsRemaining = maxAttempts - (lockAttempts || 0);

  // Check if all positions have consensus (all players agree)
  const consensus = [0, 1, 2, 3].map(pos => {
    const guesses = lockGuesses?.[pos] || {};
    const tokens = Object.values(guesses);
    if (tokens.length === 0 || tokens.length < playerUids.length) return null;
    const first = tokens[0];
    return tokens.every(t => t === first) ? first : null;
  });
  const allConsensus = consensus.every(t => t !== null);

  // Also check the hard-locked positions (from previous proposal system — backwards compat)
  const effectiveLock = [0, 1, 2, 3].map(pos => {
    if (lock?.[pos]?.token) return lock[pos].token;
    return consensus[pos];
  });
  const allFilled = effectiveLock.every(t => t !== null);

  return (
    <div style={{
      padding: "12px 8px",
      borderRadius: 14,
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      width: "100%",
    }}>
      {/* Lock Title */}
      <div style={{
        fontSize: 13, fontWeight: 700, color: C.text,
        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
        textTransform: "uppercase",
      }}>
        {isComplete ? "Vault Opened" : "Combination Lock"}
      </div>

      {/* 4 Lock Slots */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {[0, 1, 2, 3].map(pos => {
          const hardLocked = lock?.[pos]?.token;
          const posGuesses = lockGuesses?.[pos] || {};
          const guessEntries = playerUids
            .filter(uid => posGuesses[uid])
            .map(uid => ({ uid, token: posGuesses[uid] }));
          const hasConsensus = consensus[pos] !== null;
          const effectiveToken = hardLocked || consensus[pos];

          return (
            <div key={pos} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: hardLocked ? (C.gold || "#FFD700") : C.textDim, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                {hardLocked ? "\u2713" : pos + 1}
              </div>
              <div
                onClick={() => {
                  if (isComplete || hardLocked) return;
                  onSlotClick?.(pos);
                }}
                style={{
                  width: 56, height: 56,
                  borderRadius: 10,
                  border: hardLocked
                    ? `2px solid ${C.gold || "#FFD700"}`
                    : effectiveToken
                      ? `2px solid ${hasConsensus ? C.correct + "88" : C.accent + "66"}`
                      : `2px dashed ${C.textDim}44`,
                  backgroundColor: hardLocked ? (C.gold || "#FFD700") + "11" : effectiveToken ? "transparent" : C.surfaceLight || C.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: isComplete || hardLocked ? "default" : "pointer",
                  transition: "all 0.2s",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: hardLocked ? `0 0 8px ${C.gold || "#FFD700"}44` : "none",
                }}
              >
                {/* If everyone agrees or it's hard-locked: show full token */}
                {effectiveToken ? (
                  <TokenTile token={effectiveToken} size={50} />
                ) : guessEntries.length > 0 ? (
                  /* Show mini guess tiles in quadrant layout */
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    {(() => {
                      const positions = getQuadrantPositions(guessEntries.length);
                      const miniSize = guessEntries.length === 1 ? 28 : guessEntries.length <= 2 ? 22 : 18;
                      return guessEntries.map((entry, gi) => (
                        <div key={entry.uid} style={{
                          position: "absolute",
                          top: positions[gi].top,
                          left: positions[gi].left,
                          transform: "translate(-50%, -50%)",
                        }}>
                          <MiniToken token={entry.token} size={miniSize} />
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <span style={{ fontSize: 20, color: C.textDim + "44", fontWeight: 700 }}>?</span>
                )}
              </div>
              {/* Show who guessed what below the slot (initials) */}
              {guessEntries.length > 0 && !effectiveToken && (
                <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  {guessEntries.map(entry => {
                    const name = playerNames?.[entry.uid] || "?";
                    const isMe = entry.uid === myUid;
                    return (
                      <div key={entry.uid} style={{
                        width: 12, height: 12, borderRadius: 6,
                        backgroundColor: isMe ? "#54A0FF33" : "#FF6B6B33",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 7, fontWeight: 700, color: isMe ? "#54A0FF" : "#FF6B6B",
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {name[0]?.toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Attempts remaining */}
      <div style={{
        fontSize: 11, color: attemptsRemaining <= 1 ? C.incorrect : C.textDim,
        fontFamily: "'Inter', sans-serif", fontWeight: 600,
      }}>
        {isComplete ? "Cracked!" : `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} remaining`}
      </div>

      {/* Consensus hint */}
      {!isComplete && !allFilled && playerUids.length > 1 && (
        <div style={{
          fontSize: 10, color: C.textDim + "88", fontFamily: "'Inter', sans-serif",
          textAlign: "center",
        }}>
          All players must agree on each position to lock it in
        </div>
      )}

      {/* Mastermind Feedback Pips */}
      {lockFeedback && lockFeedback.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          {lockFeedback.map((fb, fi) => (
            <div key={fi} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 8px", borderRadius: 8,
              backgroundColor: C.bg + "80",
            }}>
              <div style={{ display: "flex", gap: 3, flex: 1 }}>
                {fb.guess?.map((token, ti) => (
                  <TokenTile key={ti} token={token} size={24} dimmed />
                ))}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: fb.gold || 0 }).map((_, i) => (
                  <div key={`g${i}`} style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: C.gold,
                  }} />
                ))}
                {Array.from({ length: fb.white || 0 }).map((_, i) => (
                  <div key={`w${i}`} style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: "#fff",
                    border: "1px solid #999",
                  }} />
                ))}
                {Array.from({ length: 4 - (fb.gold || 0) - (fb.white || 0) }).map((_, i) => (
                  <div key={`n${i}`} style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: C.textDim + "33",
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Button — shows when all positions have consensus */}
      {allFilled && !isComplete && attemptsRemaining > 0 && (
        <button
          onClick={onSubmitLock}
          style={{
            padding: "8px 24px", borderRadius: 8,
            backgroundColor: C.accent, color: C.bg,
            fontWeight: 700, fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            border: "none", cursor: "pointer",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Submit Combination
        </button>
      )}
    </div>
  );
}

export { TokenTile, parseToken, LOCK_SHAPES };
