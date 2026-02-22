// Game Boy-style shell that wraps the campaign canvas
// Provides: physical d-pad, A/B buttons, start/select, speaker grille

import React, { useCallback, useRef, useEffect } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";

// Colors for the classic Game Boy shell
const SHELL = {
  body: "#8b8b9b",
  bodyDark: "#6b6b7b",
  bodyLight: "#a8a8b8",
  bezel: "#2a2a3a",
  bezelInner: "#1a1a28",
  dpad: "#1a1a2a",
  dpadFace: "#2a2a3a",
  btnA: "#8b2252",
  btnB: "#8b2252",
  startSelect: "#4a4a5a",
  label: "#3a3a4a",
  speakerSlot: "#5a5a6a",
  led: "#4ade80",
};

const MOVE_REPEAT_DELAY = 120; // ms between repeated d-pad moves

export default function GameBoyShell({
  canvasRef,
  onDpadPress,     // (dx, dy) => void — direct move callback
  onButtonA,       // () => void — interact / confirm
  onButtonB,       // () => void — back / cancel
  onStart,         // () => void — pause
  onSelect,        // () => void — map/inventory
  screenContent,   // React node rendered inside the screen bezel (alternative to canvasRef)
  children,        // overlays rendered inside screen area
}) {
  const repeatRef = useRef(null);
  const activeDirRef = useRef(null);

  // ── Direct d-pad movement (no synthetic keyboard events) ──
  const fireDpad = useCallback((dx, dy, dirKey) => {
    if (onDpadPress) onDpadPress(dx, dy);
  }, [onDpadPress]);

  const startDpad = useCallback((dx, dy, dirKey) => {
    // Stop any existing repeat
    if (repeatRef.current) clearInterval(repeatRef.current);
    activeDirRef.current = dirKey;

    // Fire immediately
    fireDpad(dx, dy, dirKey);

    // Start repeating
    repeatRef.current = setInterval(() => {
      fireDpad(dx, dy, dirKey);
    }, MOVE_REPEAT_DELAY);
  }, [fireDpad]);

  const stopDpad = useCallback(() => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
    activeDirRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (repeatRef.current) clearInterval(repeatRef.current);
    };
  }, []);

  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

  // ── Styles ──
  const dpadBtnStyle = {
    width: 48, height: 48,
    background: SHELL.dpadFace,
    border: `2px solid ${SHELL.dpad}`,
    borderRadius: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#888", fontSize: 18,
    cursor: "pointer",
    userSelect: "none", WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
    padding: 0,
  };

  const actionBtnStyle = (color) => ({
    width: 56, height: 56,
    borderRadius: "50%",
    background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color}88)`,
    border: `2px solid ${color}44`,
    boxShadow: `0 3px 0 ${SHELL.bodyDark}, inset 0 1px 2px rgba(255,255,255,0.15)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    userSelect: "none", WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
    fontFamily: PIXEL_FONT,
    fontSize: 14, fontWeight: 900,
    color: "rgba(255,255,255,0.9)",
    padding: 0,
  });

  const pillBtnStyle = {
    width: 52, height: 16,
    borderRadius: 8,
    background: SHELL.startSelect,
    border: "none",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
    cursor: "pointer",
    userSelect: "none", WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
    transform: "rotate(-25deg)",
    padding: 0,
  };

  // Pressed effect helpers
  const pressEffect = (e) => {
    e.currentTarget.style.boxShadow = `0 1px 0 ${SHELL.bodyDark}`;
    e.currentTarget.style.transform = "translateY(2px)";
  };
  const releaseEffect = (e) => {
    e.currentTarget.style.boxShadow = `0 3px 0 ${SHELL.bodyDark}, inset 0 1px 2px rgba(255,255,255,0.15)`;
    e.currentTarget.style.transform = "translateY(0)";
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: `linear-gradient(180deg, ${SHELL.bodyLight} 0%, ${SHELL.body} 30%, ${SHELL.bodyDark} 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start",
      overflow: "hidden",
      touchAction: "none",
      fontFamily: PIXEL_FONT,
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

      {/* ═══ Top bar: brand + power LED ═══ */}
      <div style={{
        width: "100%", maxWidth: 400,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 24px 4px",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: SHELL.led,
            boxShadow: `0 0 6px ${SHELL.led}88`,
          }} />
          <span style={{ fontSize: 6, color: SHELL.label, letterSpacing: 1 }}>POWER</span>
        </div>
        <span style={{ fontSize: 7, color: SHELL.label, letterSpacing: 2, fontWeight: 400 }}>
          AGNUS
        </span>
      </div>

      {/* ═══ Screen bezel ═══ */}
      <div style={{
        width: "calc(100% - 32px)", maxWidth: 380,
        aspectRatio: "10 / 9",
        maxHeight: "48vh",
        background: SHELL.bezel,
        borderRadius: 12,
        padding: 6,
        boxShadow: `inset 0 2px 8px rgba(0,0,0,0.5), 0 1px 0 ${SHELL.bodyLight}`,
        position: "relative",
        flexShrink: 0,
      }}>
        <div style={{
          width: "100%", height: "100%",
          background: SHELL.bezelInner,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Canvas OR custom screen content */}
          {canvasRef ? (
            <canvas
              ref={canvasRef}
              style={{
                width: "100%", height: "100%",
                display: "block",
                imageRendering: "pixelated",
              }}
            />
          ) : screenContent}

          {/* Overlays inside screen */}
          {children}
        </div>

        {/* Screen corner dots */}
        <div style={{
          position: "absolute", top: -2, left: 16,
          display: "flex", gap: 3,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: "50%",
              background: SHELL.bodyLight,
            }} />
          ))}
        </div>
      </div>

      {/* ═══ Brand text below screen ═══ */}
      <div style={{
        fontSize: 10, color: SHELL.label,
        letterSpacing: 4, marginTop: 6, marginBottom: 2,
        fontStyle: "italic", fontWeight: 900,
      }}>
        CAMPAIGN
      </div>

      {/* ═══ Controls area ═══ */}
      <div style={{
        flex: 1,
        width: "100%", maxWidth: 400,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 16,
        padding: "0 16px",
        boxSizing: "border-box",
        minHeight: 0,
      }}>

        {/* Row: D-pad + A/B buttons */}
        <div style={{
          width: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 8px",
        }}>

          {/* ─── D-Pad ─── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px 48px 48px",
              gridTemplateRows: "48px 48px 48px",
              gap: 0,
              touchAction: "none",
            }}
            onTouchEnd={(e) => { prevent(e); stopDpad(); }}
            onTouchCancel={stopDpad}
            onMouseUp={stopDpad}
            onMouseLeave={stopDpad}
          >
            {/* Up */}
            <div />
            <div
              style={dpadBtnStyle}
              onTouchStart={(e) => { prevent(e); startDpad(0, -1, "up"); }}
              onMouseDown={() => startDpad(0, -1, "up")}
            >
              {"\u25B2"}
            </div>
            <div />

            {/* Left / Center / Right */}
            <div
              style={dpadBtnStyle}
              onTouchStart={(e) => { prevent(e); startDpad(-1, 0, "left"); }}
              onMouseDown={() => startDpad(-1, 0, "left")}
            >
              {"\u25C0"}
            </div>
            <div style={{
              width: 48, height: 48,
              background: SHELL.dpad,
              borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: SHELL.dpadFace,
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.1)",
              }} />
            </div>
            <div
              style={dpadBtnStyle}
              onTouchStart={(e) => { prevent(e); startDpad(1, 0, "right"); }}
              onMouseDown={() => startDpad(1, 0, "right")}
            >
              {"\u25B6"}
            </div>

            {/* Down */}
            <div />
            <div
              style={dpadBtnStyle}
              onTouchStart={(e) => { prevent(e); startDpad(0, 1, "down"); }}
              onMouseDown={() => startDpad(0, 1, "down")}
            >
              {"\u25BC"}
            </div>
            <div />
          </div>

          {/* ─── A / B Buttons ─── */}
          <div style={{
            display: "flex", gap: 16, alignItems: "center",
            transform: "rotate(-25deg)",
          }}>
            {/* B button (left) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button
                style={actionBtnStyle(SHELL.btnB)}
                onTouchStart={(e) => { prevent(e); pressEffect(e); if (onButtonB) onButtonB(); }}
                onTouchEnd={releaseEffect}
                onMouseDown={(e) => { pressEffect(e); if (onButtonB) onButtonB(); }}
                onMouseUp={releaseEffect}
              >
                B
              </button>
              <span style={{ fontSize: 7, color: SHELL.label, transform: "rotate(25deg)" }}>B</span>
            </div>

            {/* A button (right, higher) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: -16 }}>
              <button
                style={actionBtnStyle(SHELL.btnA)}
                onTouchStart={(e) => { prevent(e); pressEffect(e); if (onButtonA) onButtonA(); }}
                onTouchEnd={releaseEffect}
                onMouseDown={(e) => { pressEffect(e); if (onButtonA) onButtonA(); }}
                onMouseUp={releaseEffect}
              >
                A
              </button>
              <span style={{ fontSize: 7, color: SHELL.label, transform: "rotate(25deg)" }}>A</span>
            </div>
          </div>
        </div>

        {/* ─── Start / Select ─── */}
        <div style={{
          display: "flex", gap: 32, alignItems: "center",
          marginTop: -4,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <button
              style={pillBtnStyle}
              onTouchStart={(e) => { prevent(e); if (onSelect) onSelect(); }}
              onMouseDown={() => { if (onSelect) onSelect(); }}
            />
            <span style={{ fontSize: 6, color: SHELL.label, letterSpacing: 1 }}>SELECT</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <button
              style={pillBtnStyle}
              onTouchStart={(e) => { prevent(e); if (onStart) onStart(); }}
              onMouseDown={() => { if (onStart) onStart(); }}
            />
            <span style={{ fontSize: 6, color: SHELL.label, letterSpacing: 1 }}>START</span>
          </div>
        </div>
      </div>

      {/* ═══ Speaker grille ═══ */}
      <div style={{
        width: "100%", maxWidth: 400,
        display: "flex", justifyContent: "flex-end",
        padding: "4px 32px 12px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, transform: "rotate(-25deg)" }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{
              width: 28 + i * 3, height: 2,
              borderRadius: 1,
              background: SHELL.speakerSlot,
              marginLeft: "auto",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export { SHELL };
