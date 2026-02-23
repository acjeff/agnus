// CRT monitor shell for desktop campaign mode
// Wraps the game canvas in a retro CRT monitor with visual effects:
// scanlines, vignette, phosphor glow, flicker, glass reflection
//
// Same prop interface as GameBoyShell for easy swapping.
// Mouse: left-click = A button (interact), right-click = B button (attack)
// Keyboard controls shown in legend below the monitor.

import React, { useCallback } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";

const CRT = {
  body: "#1e1e22",
  bodyEdge: "#111114",
  bodyHighlight: "#2a2a30",
  bezel: "#0c0c0f",
  bezelInner: "#080810",
  led: "#4ade80",
  brand: "#3a3a42",
  legend: "#3a3a44",
};

export default function CRTShell({
  canvasRef,
  onDpadPress,     // unused on desktop (keyboard handles movement)
  onButtonA,       // triggered on left-click
  onButtonB,       // triggered on right-click
  onStart,         // unused on desktop (keyboard handles pause)
  onSelect,        // unused on desktop
  screenContent,   // React node rendered inside screen (alternative to canvas)
  children,        // overlays rendered inside screen area
}) {
  // Left-click → interact (A button equivalent)
  // Only in canvas mode (dungeon); screenContent (chapter select) has its own handlers
  const handleClick = useCallback((e) => {
    if (!canvasRef) return;
    // Only trigger for clicks on the screen container or canvas itself,
    // not on overlay children (dialogue, HUD buttons, pause menu)
    if (e.target !== e.currentTarget && e.target !== canvasRef?.current) return;
    if (onButtonA) onButtonA();
  }, [onButtonA, canvasRef]);

  // Right-click → attack (B button equivalent)
  const handleContextMenu = useCallback((e) => {
    e.preventDefault(); // always suppress context menu on the screen
    if (!canvasRef) return;
    if (e.target !== e.currentTarget && e.target !== canvasRef?.current) return;
    if (onButtonB) onButtonB();
  }, [onButtonB, canvasRef]);

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#06060a",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column",
      fontFamily: PIXEL_FONT,
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes crtFlicker {
          0% { opacity: 1; }
          3% { opacity: 0.985; }
          6% { opacity: 1; }
          89% { opacity: 1; }
          92% { opacity: 0.98; }
          95% { opacity: 1; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* ═══ CRT Monitor body ═══ */}
      <div style={{
        background: `linear-gradient(170deg, ${CRT.bodyHighlight} 0%, ${CRT.body} 25%, ${CRT.bodyEdge} 100%)`,
        borderRadius: 20,
        padding: "14px 20px 10px",
        boxShadow: "0 40px 100px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        maxWidth: 880,
        width: "90vw",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}>

        {/* Top bar: power LED + brand */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8, padding: "0 6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: CRT.led,
              boxShadow: `0 0 4px ${CRT.led}aa, 0 0 10px ${CRT.led}44`,
            }} />
            <span style={{ fontSize: 5, color: CRT.brand, letterSpacing: 1 }}>POWER</span>
          </div>
          <span style={{
            fontSize: 8, color: CRT.brand, letterSpacing: 4,
            fontStyle: "italic", fontWeight: 900,
          }}>
            AGNUS
          </span>
        </div>

        {/* ═══ Screen bezel ═══ */}
        <div style={{
          background: `linear-gradient(180deg, #0a0a0e, ${CRT.bezel})`,
          borderRadius: 14,
          padding: 8,
          boxShadow: "inset 0 3px 15px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.03)",
        }}>
          {/* Inner screen with CRT effects */}
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              maxHeight: "68vh",
              background: CRT.bezelInner,
              borderRadius: 6,
              overflow: "hidden",
              position: "relative",
              cursor: canvasRef ? "crosshair" : "default",
              animation: "crtFlicker 5s infinite",
            }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          >
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

            {/* Overlays rendered inside screen (HUD, dialogue, pause, etc.) */}
            {children}

            {/* ── CRT Effect Layers ── */}

            {/* Scanlines: subtle horizontal lines */}
            <div style={{
              position: "absolute", inset: 0,
              pointerEvents: "none",
              zIndex: 50,
              background: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
            }} />

            {/* Vignette: darker edges */}
            <div style={{
              position: "absolute", inset: 0,
              pointerEvents: "none",
              zIndex: 51,
              background: "radial-gradient(ellipse 80% 80% at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
            }} />

            {/* Inner shadow: screen curvature illusion */}
            <div style={{
              position: "absolute", inset: 0,
              pointerEvents: "none",
              zIndex: 52,
              borderRadius: 6,
              boxShadow: "inset 0 0 30px rgba(0,0,0,0.35), inset 0 0 80px rgba(0,0,0,0.15)",
            }} />

            {/* Glass reflection highlight */}
            <div style={{
              position: "absolute", inset: 0,
              pointerEvents: "none",
              zIndex: 53,
              background: "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.01) 100%)",
            }} />

            {/* Subtle phosphor tint */}
            <div style={{
              position: "absolute", inset: 0,
              pointerEvents: "none",
              zIndex: 48,
              background: "rgba(120,255,160,0.008)",
              mixBlendMode: "screen",
            }} />
          </div>
        </div>

        {/* Keyboard controls legend */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 12,
          marginTop: 8, fontSize: 5, color: CRT.legend,
          flexWrap: "wrap", letterSpacing: 0.5,
          padding: "0 4px",
        }}>
          <span>WASD MOVE</span>
          <span style={{ color: "#222" }}>{"\u00B7"}</span>
          <span>SPACE INTERACT</span>
          <span style={{ color: "#222" }}>{"\u00B7"}</span>
          <span>B ATTACK</span>
          <span style={{ color: "#222" }}>{"\u00B7"}</span>
          <span>ESC PAUSE</span>
          <span style={{ color: "#222" }}>{"\u00B7"}</span>
          <span>CLICK INTERACT</span>
          <span style={{ color: "#222" }}>{"\u00B7"}</span>
          <span>R-CLICK ATTACK</span>
        </div>
      </div>

      {/* ═══ Monitor stand ═══ */}
      {/* Neck */}
      <div style={{
        width: 80, height: 20,
        background: `linear-gradient(180deg, ${CRT.bodyHighlight}, ${CRT.bodyEdge})`,
        borderRadius: "0 0 2px 2px",
      }} />
      {/* Base */}
      <div style={{
        width: 180, height: 8,
        background: `linear-gradient(180deg, ${CRT.body}, ${CRT.bodyEdge})`,
        borderRadius: "0 0 10px 10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        marginTop: -1,
      }} />
    </div>
  );
}
