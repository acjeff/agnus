// Game Boy-style shell that wraps the campaign canvas
// Provides: physical d-pad, A/B buttons, start/select, speaker grille

import React, { useCallback, useRef, useEffect, useState } from "react";

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

// D-pad direction map: data-dir attribute → (dx, dy)
const DIR_MAP = {
  up:    [0, -1],
  down:  [0,  1],
  left:  [-1, 0],
  right: [1,  0],
};

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
  const [isDesktop, setIsDesktop] = useState(false);
  const repeatRef = useRef(null);
  const activeDirRef = useRef(null);
  const dpadContainerRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia?.("(hover: hover) and (pointer: fine) and (min-width: 900px)");
    if (!mq) {
      setIsDesktop(false);
      return;
    }
    const update = () => setIsDesktop(!!mq.matches);
    update();
    // Safari < 14
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  // ── Direct d-pad movement (no synthetic keyboard events) ──
  const fireDpad = useCallback((dx, dy) => {
    if (onDpadPress) onDpadPress(dx, dy);
  }, [onDpadPress]);

  const startDpad = useCallback((dx, dy, dirKey) => {
    // Don't restart if already in this direction
    if (activeDirRef.current === dirKey) return;

    // Stop any existing repeat
    if (repeatRef.current) clearInterval(repeatRef.current);
    activeDirRef.current = dirKey;

    // Fire immediately
    fireDpad(dx, dy);

    // Start repeating
    repeatRef.current = setInterval(() => {
      fireDpad(dx, dy);
    }, MOVE_REPEAT_DELAY);
  }, [fireDpad]);

  const stopDpad = useCallback(() => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
    activeDirRef.current = null;
  }, []);

  // Find which d-pad button is under a point (touch or mouse)
  const getDirAtPoint = useCallback((clientX, clientY) => {
    const container = dpadContainerRef.current;
    if (!container) return null;
    const buttons = container.querySelectorAll("[data-dir]");
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return btn.getAttribute("data-dir");
      }
    }
    return null;
  }, []);

  // Handle touch/mouse move over d-pad — switch direction without lifting
  const handleDpadTouchMove = useCallback((e) => {
    if (!activeDirRef.current) return; // not pressing
    const touch = e.touches[0];
    if (!touch) return;
    const dir = getDirAtPoint(touch.clientX, touch.clientY);
    if (dir && dir !== activeDirRef.current) {
      const [dx, dy] = DIR_MAP[dir];
      startDpad(dx, dy, dir);
    } else if (!dir) {
      // Finger left d-pad area
      stopDpad();
    }
  }, [getDirAtPoint, startDpad, stopDpad]);

  const handleDpadMouseMove = useCallback((e) => {
    if (!activeDirRef.current) return; // not pressing
    // Only track if mouse button is held
    if (e.buttons === 0) { stopDpad(); return; }
    const dir = getDirAtPoint(e.clientX, e.clientY);
    if (dir && dir !== activeDirRef.current) {
      const [dx, dy] = DIR_MAP[dir];
      startDpad(dx, dy, dir);
    } else if (!dir) {
      stopDpad();
    }
  }, [getDirAtPoint, startDpad, stopDpad]);

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

  const renderScreen = (extraScreenStyle) => (
    <div style={{
      width: "100%", height: "100%",
      background: SHELL.bezelInner,
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
      ...extraScreenStyle,
    }}>
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

      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        background: "radial-gradient(1200px 800px at 50% 30%, #1b1b24 0%, #0b0b10 55%, #05050a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: PIXEL_FONT,
        padding: "min(6vh, 56px) 24px",
        boxSizing: "border-box",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          @keyframes crtFlicker {
            0% { filter: contrast(1.08) saturate(1.18) brightness(1.03); opacity: 1; }
            7% { filter: contrast(1.06) saturate(1.16) brightness(1.01); opacity: 0.98; }
            8% { filter: contrast(1.1) saturate(1.2) brightness(1.04); opacity: 1; }
            39% { filter: contrast(1.08) saturate(1.18) brightness(1.02); opacity: 0.99; }
            40% { filter: contrast(1.12) saturate(1.22) brightness(1.05); opacity: 1; }
            100% { filter: contrast(1.08) saturate(1.18) brightness(1.03); opacity: 1; }
          }
          @keyframes crtScan {
            0% { background-position: 0 0, 0 0; }
            100% { background-position: 0 240px, 0 0; }
          }
        `}</style>

        <div style={{
          width: "min(1100px, 96vw)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}>
          <div style={{
            width: "100%",
            borderRadius: 26,
            background: "linear-gradient(180deg, #2a2a33 0%, #13131a 65%, #0b0b10 100%)",
            boxShadow: "0 22px 70px rgba(0,0,0,0.65)",
            padding: 18,
            boxSizing: "border-box",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: "100%",
              aspectRatio: "10 / 9",
              maxHeight: "78vh",
              borderRadius: 20,
              background: "radial-gradient(120% 120% at 50% 35%, #111319 0%, #07070c 60%, #030306 100%)",
              padding: 10,
              boxSizing: "border-box",
              border: "1px solid rgba(255,255,255,0.06)",
              position: "relative",
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                animation: "crtFlicker 7s infinite",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 40px rgba(0,0,0,0.75)",
              }}>
                {renderScreen({ borderRadius: 16 })}

                {/* CRT overlays */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage: [
                    "repeating-linear-gradient(to bottom, rgba(0,0,0,0.0) 0px, rgba(0,0,0,0.0) 2px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
                    "radial-gradient(120% 120% at 50% 40%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.55) 100%)",
                  ].join(","),
                  mixBlendMode: "multiply",
                  opacity: 0.65,
                  animation: "crtScan 10s linear infinite",
                }} />
                <div style={{
                  position: "absolute",
                  inset: -2,
                  pointerEvents: "none",
                  background: "radial-gradient(80% 70% at 50% 45%, rgba(96,255,170,0.10) 0%, rgba(0,0,0,0) 55%)",
                  mixBlendMode: "screen",
                  opacity: 0.35,
                }} />
              </div>

              {/* subtle glass edge */}
              <div style={{
                position: "absolute",
                inset: 8,
                borderRadius: 16,
                pointerEvents: "none",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }} />
            </div>
          </div>

          <div style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 16,
            color: "rgba(232,232,239,0.85)",
            fontSize: 8,
            letterSpacing: 0.5,
            userSelect: "none",
          }}>
            <div style={{ opacity: 0.9 }}>MOVE: WASD / ARROWS</div>
            <div style={{ opacity: 0.9 }}>INTERACT: E / ENTER / SPACE</div>
            <div style={{ opacity: 0.9 }}>ATTACK: F / RIGHT CLICK</div>
            <div style={{ opacity: 0.9 }}>PAUSE: ESC</div>
          </div>
        </div>
      </div>
    );
  }

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
        {renderScreen()}

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
            ref={dpadContainerRef}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 48px 48px",
              gridTemplateRows: "48px 48px 48px",
              gap: 0,
              touchAction: "none",
            }}
            onTouchEnd={(e) => { prevent(e); stopDpad(); }}
            onTouchCancel={stopDpad}
            onTouchMove={handleDpadTouchMove}
            onMouseUp={stopDpad}
            onMouseLeave={stopDpad}
            onMouseMove={handleDpadMouseMove}
          >
            {/* Up */}
            <div />
            <div
              data-dir="up"
              style={dpadBtnStyle}
              onTouchStart={(e) => { prevent(e); startDpad(0, -1, "up"); }}
              onMouseDown={() => startDpad(0, -1, "up")}
            >
              {"\u25B2"}
            </div>
            <div />

            {/* Left / Center / Right */}
            <div
              data-dir="left"
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
              data-dir="right"
              style={dpadBtnStyle}
              onTouchStart={(e) => { prevent(e); startDpad(1, 0, "right"); }}
              onMouseDown={() => startDpad(1, 0, "right")}
            >
              {"\u25B6"}
            </div>

            {/* Down */}
            <div />
            <div
              data-dir="down"
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button
              style={pillBtnStyle}
              onTouchStart={(e) => { prevent(e); if (onSelect) onSelect(); }}
              onMouseDown={() => { if (onSelect) onSelect(); }}
            />
            <span style={{ fontSize: 6, color: SHELL.label, letterSpacing: 1, transform: "rotate(-25deg)", marginTop: 4 }}>SELECT</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button
              style={pillBtnStyle}
              onTouchStart={(e) => { prevent(e); if (onStart) onStart(); }}
              onMouseDown={() => { if (onStart) onStart(); }}
            />
            <span style={{ fontSize: 6, color: SHELL.label, letterSpacing: 1, transform: "rotate(-25deg)", marginTop: 4 }}>START</span>
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
