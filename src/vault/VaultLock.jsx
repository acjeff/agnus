// --- VaultLock Component ---
// Renders the 4-position combination lock, Mastermind feedback, and proposal/approval UI.

import { useState, useRef } from "react";

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
        width: size, height: size, borderRadius: 8,
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

export default function VaultLock({
  lock,             // { 0: { token, confirmedBy } | null, 1: ..., 2: ..., 3: ... }
  lockAttempts,
  maxAttempts,
  lockFeedback,     // [{ guess, gold, white, goldPositions, whitePositions }]
  proposals,        // { id: proposal } — active lock proposals
  myUid,
  onPropose,        // (position) => void — open token picker for this position
  onSubmitLock,     // () => void — submit the full lock
  onClearPosition,  // (position) => void
  isComplete,
  C,                // color constants
}) {
  const allFilled = lock && lock[0] && lock[1] && lock[2] && lock[3];
  const attemptsRemaining = maxAttempts - (lockAttempts || 0);

  return (
    <div style={{
      padding: "12px 8px",
      borderRadius: 14,
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
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
          const slot = lock?.[pos];
          const hasToken = slot && slot.token;
          return (
            <div key={pos} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                {pos + 1}
              </div>
              <div
                onClick={() => {
                  if (isComplete) return;
                  if (hasToken) {
                    onClearPosition?.(pos);
                  } else {
                    onPropose?.(pos);
                  }
                }}
                style={{
                  width: 52, height: 52,
                  borderRadius: 10,
                  border: hasToken
                    ? `2px solid ${C.correct}88`
                    : `2px dashed ${C.textDim}44`,
                  backgroundColor: hasToken ? "transparent" : C.surfaceLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: isComplete ? "default" : "pointer",
                  transition: "all 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {hasToken ? (
                  <TokenTile token={slot.token} size={46} />
                ) : (
                  <span style={{ fontSize: 20, color: C.textDim + "44", fontWeight: 700 }}>?</span>
                )}
              </div>
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

      {/* Submit Button */}
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

// ============================================================
// Proposal Card — shown when a player proposes a tile for a lock position
// ============================================================
export function ProposalCard({
  proposal,
  myUid,
  onApprove,
  onCounter,
  onReact,
  allTokens,    // available tokens for counter-picking
  C,
}) {
  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const isFromMe = proposal.fromUid === myUid;
  const isCountered = proposal.status === "countered";
  const isPending = proposal.status === "pending";
  const counterIsFromMe = proposal.counterByUid === myUid;

  // Quick emoji reactions
  const quickEmojis = ["👍", "👎", "🤔", "❓", "💡", "🔥"];

  if (proposal.status === "approved" || proposal.status === "rejected") return null;

  return (
    <div style={{
      padding: 12, borderRadius: 12,
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {/* Header */}
      <div style={{ fontSize: 12, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
        <strong style={{ color: C.text }}>{isFromMe ? "You" : (proposal.fromUsername || "Partner")}</strong>
        {" think position "}
        <strong style={{ color: C.accent }}>{proposal.position + 1}</strong>
        {" is:"}
      </div>

      {/* Proposed token */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TokenTile token={proposal.token} size={36} />
        {isCountered && (
          <>
            <span style={{ color: C.textDim, fontSize: 16 }}>→</span>
            <TokenTile token={proposal.counterToken} size={36} />
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
              ({counterIsFromMe ? "You" : (proposal.counterByUsername || "Partner")})
            </span>
          </>
        )}
      </div>

      {/* Action buttons — only for the other player */}
      {isPending && !isFromMe && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => onApprove(proposal.id)} style={{
            padding: "5px 12px", borderRadius: 6, border: "none",
            backgroundColor: C.correct + "33", color: C.correct,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>Agree</button>
          <button onClick={() => setShowCounterPicker(!showCounterPicker)} style={{
            padding: "5px 12px", borderRadius: 6, border: "none",
            backgroundColor: C.accent + "22", color: C.accent,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>Counter</button>
        </div>
      )}

      {/* Counter from me — waiting for partner to approve */}
      {isCountered && counterIsFromMe && (
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
          Waiting for {proposal.fromUsername || "partner"} to respond...
        </div>
      )}

      {/* Counter from partner — I can approve */}
      {isCountered && !counterIsFromMe && isFromMe && (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onApprove(proposal.id)} style={{
            padding: "5px 12px", borderRadius: 6, border: "none",
            backgroundColor: C.correct + "33", color: C.correct,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
          }}>Accept Counter</button>
        </div>
      )}

      {/* Counter token picker */}
      {showCounterPicker && (
        <div style={{
          display: "flex", gap: 4, flexWrap: "wrap",
          padding: 6, borderRadius: 8,
          backgroundColor: C.bg,
        }}>
          {allTokens?.map((token, i) => (
            <TokenTile
              key={i}
              token={token}
              size={30}
              onClick={() => {
                onCounter(proposal.id, token);
                setShowCounterPicker(false);
              }}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      )}

      {/* Emoji reactions */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {quickEmojis.map(emoji => (
          <button key={emoji} onClick={() => onReact(proposal.id, emoji)} style={{
            width: 26, height: 26, borderRadius: 13,
            border: "none", cursor: "pointer",
            backgroundColor: proposal.reactions?.[myUid] === emoji ? C.accent + "33" : "transparent",
            fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            {emoji}
          </button>
        ))}
        {/* Show partner's reaction */}
        {Object.entries(proposal.reactions || {}).filter(([uid]) => uid !== myUid).map(([uid, emoji]) => (
          <span key={uid} style={{ fontSize: 14, marginLeft: 4 }}>{emoji}</span>
        ))}
      </div>
    </div>
  );
}

export { TokenTile, parseToken, LOCK_SHAPES };
