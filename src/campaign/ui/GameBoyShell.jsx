// Game Boy-style shell that wraps the campaign canvas
// Provides: physical d-pad, A/B buttons, start/select, speaker grille

import React, { useCallback, useRef } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";

// Colors for the classic Game Boy shell
const SHELL = {
  body: "#8b8b9b",        // main shell gray
  bodyDark: "#6b6b7b",    // shadow
  bodyLight: "#a8a8b8",   // highlight
  bezel: "#2a2a3a",       // screen bezel
  bezelInner: "#1a1a28",  // inner bezel shadow
  screen: "#0a0a0f",      // screen bg
  dpad: "#1a1a2a",        // d-pad color
  dpadFace: "#2a2a3a",    // d-pad face
  dpadActive: "#3a3a5a",  // d-pad pressed
  btnA: "#8b2252",        // A button (raspberry)
  btnB: "#8b2252",        // B button
  btnActive: "#b83070",   // pressed state
  startSelect: "#4a4a5a", // start/select
  label: "#3a3a4a",       // text labels
  speaker: "#7b7b8b",     // speaker grille
  speakerSlot: "#5a5a6a", // speaker slots
  led: "#4ade80",         // power LED
};

export default function GameBoyShell({
  canvasRef,
  onDpadPress,     // (dx, dy) => void
  onDpadRelease,   // () => void
  onButtonA,       // () => void — interact / confirm
  onButtonB,       // () => void — back / cancel
  onStart,         // () => void — pause
  onSelect,        // () => void — map/inventory
  children,        // overlays (HUD, dialogue, pause) rendered inside screen area
}) {
  const dpadActiveRef = useRef(null);
  const repeatRef = useRef(null);

  // Dispatch keyboard events so the existing input handler picks them up
  const pressKey = useCallback((key) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }, []);
  const releaseKey = useCallback((key) => {
    window.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  }, []);

  // D-pad handlers with repeat
  const startDpad = useCallback((key, dx, dy) => {
    if (dpadActiveRef.current === key) return;
    // Release previous
    if (dpadActiveRef.current) {
      releaseKey(dpadActiveRef.current);
      clearInterval(repeatRef.current);
    }
    dpadActiveRef.current = key;
    pressKey(key);
    if (onDpadPress) onDpadPress(dx, dy);
  }, [pressKey, releaseKey, onDpadPress]);

  const stopDpad = useCallback(() => {
    if (dpadActiveRef.current) {
      releaseKey(dpadActiveRef.current);
      clearInterval(repeatRef.current);
      dpadActiveRef.current = null;
    }
    if (onDpadRelease) onDpadRelease();
  }, [releaseKey, onDpadRelease]);

  // Prevent default touch behavior
  const prevent = (e) => e.preventDefault();

  // D-pad button style
  const dpadBtn = (direction, active) => ({
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
  });

  // D-pad center nub
  const dpadCenter = {
    width: 48, height: 48,
    background: SHELL.dpad,
    borderRadius: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `inset 0 1px 3px rgba(0,0,0,0.4)`,
  };

  // Round action button style
  const actionBtn = (color, size = 56) => ({
    width: size, height: size,
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
    letterSpacing: 0,
  });

  // Small pill button (start/select)
  const pillBtn = {
    width: 52, height: 16,
    borderRadius: 8,
    background: SHELL.startSelect,
    border: "none",
    boxShadow: `inset 0 1px 2px rgba(0,0,0,0.3)`,
    cursor: "pointer",
    userSelect: "none", WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
    transform: "rotate(-25deg)",
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
        {/* Inner bezel */}
        <div style={{
          width: "100%", height: "100%",
          background: SHELL.bezelInner,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              width: "100%", height: "100%",
              display: "block",
              imageRendering: "pixelated",
            }}
          />

          {/* Overlays rendered inside screen */}
          {children}
        </div>

        {/* Screen label: top-left corner dot pattern */}
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
        gap: 12,
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
          <div style={{
            display: "grid",
            gridTemplateColumns: "48px 48px 48px",
            gridTemplateRows: "48px 48px 48px",
            gap: 0,
          }}
            onTouchEnd={stopDpad}
            onMouseUp={stopDpad}
            onMouseLeave={stopDpad}
          >
            {/* Row 1 */}
            <div />
            <div
              style={dpadBtn("up")}
              onTouchStart={(e) => { prevent(e); startDpad("ArrowUp", 0, -1); }}
              onMouseDown={() => startDpad("ArrowUp", 0, -1)}
            >
              <span style={{ transform: "scaleX(1.4)" }}>{"\u25B2"}</span>
            </div>
            <div />

            {/* Row 2 */}
            <div
              style={dpadBtn("left")}
              onTouchStart={(e) => { prevent(e); startDpad("ArrowLeft", -1, 0); }}
              onMouseDown={() => startDpad("ArrowLeft", -1, 0)}
            >
              <span style={{ transform: "scaleY(1.4)" }}>{"\u25C0"}</span>
            </div>
            <div style={dpadCenter}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: SHELL.dpadFace,
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.1)",
              }} />
            </div>
            <div
              style={dpadBtn("right")}
              onTouchStart={(e) => { prevent(e); startDpad("ArrowRight", 1, 0); }}
              onMouseDown={() => startDpad("ArrowRight", 1, 0)}
            >
              <span style={{ transform: "scaleY(1.4)" }}>{"\u25B6"}</span>
            </div>

            {/* Row 3 */}
            <div />
            <div
              style={dpadBtn("down")}
              onTouchStart={(e) => { prevent(e); startDpad("ArrowDown", 0, 1); }}
              onMouseDown={() => startDpad("ArrowDown", 0, 1)}
            >
              <span style={{ transform: "scaleX(1.4)" }}>{"\u25BC"}</span>
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
                style={actionBtn(SHELL.btnB)}
                onTouchStart={(e) => {
                  prevent(e);
                  e.currentTarget.style.boxShadow = `0 1px 0 ${SHELL.bodyDark}`;
                  e.currentTarget.style.transform = "translateY(2px)";
                  if (onButtonB) onButtonB();
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.boxShadow = `0 3px 0 ${SHELL.bodyDark}, inset 0 1px 2px rgba(255,255,255,0.15)`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = `0 1px 0 ${SHELL.bodyDark}`;
                  e.currentTarget.style.transform = "translateY(2px)";
                  if (onButtonB) onButtonB();
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = `0 3px 0 ${SHELL.bodyDark}, inset 0 1px 2px rgba(255,255,255,0.15)`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                B
              </button>
              <span style={{ fontSize: 7, color: SHELL.label, transform: "rotate(25deg)" }}>B</span>
            </div>

            {/* A button (right, higher) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: -16 }}>
              <button
                style={actionBtn(SHELL.btnA)}
                onTouchStart={(e) => {
                  prevent(e);
                  e.currentTarget.style.boxShadow = `0 1px 0 ${SHELL.bodyDark}`;
                  e.currentTarget.style.transform = "translateY(2px)";
                  // Fire interact: space key
                  pressKey(" ");
                  if (onButtonA) onButtonA();
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.boxShadow = `0 3px 0 ${SHELL.bodyDark}, inset 0 1px 2px rgba(255,255,255,0.15)`;
                  e.currentTarget.style.transform = "translateY(0)";
                  releaseKey(" ");
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = `0 1px 0 ${SHELL.bodyDark}`;
                  e.currentTarget.style.transform = "translateY(2px)";
                  pressKey(" ");
                  if (onButtonA) onButtonA();
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = `0 3px 0 ${SHELL.bodyDark}, inset 0 1px 2px rgba(255,255,255,0.15)`;
                  e.currentTarget.style.transform = "translateY(0)";
                  releaseKey(" ");
                }}
              >
                A
              </button>
              <span style={{ fontSize: 7, color: SHELL.label, transform: "rotate(25deg)" }}>A</span>
            </div>
          </div>
        </div>

        {/* ─── Start / Select ─── */}
        <div style={{
          display: "flex", gap: 24, alignItems: "center",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button
              style={pillBtn}
              onTouchStart={(e) => { prevent(e); if (onSelect) onSelect(); }}
              onMouseDown={() => { if (onSelect) onSelect(); }}
            />
            <span style={{ fontSize: 6, color: SHELL.label, letterSpacing: 1 }}>SELECT</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button
              style={pillBtn}
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
