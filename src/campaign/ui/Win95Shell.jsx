// Win95Shell — CRT monitor + Windows 95 parody desktop shell for campaign mode
// Replaces GameBoyShell on desktop viewports
// Features: boot sequence, CRT effects, Win95 window chrome, keyboard/mouse controls

import React, { useState, useEffect, useRef, useCallback } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";
const SYSTEM_FONT = "'Segoe UI', 'MS Sans Serif', Tahoma, Geneva, sans-serif";

// ── Win95 Color Palette ──
const W95 = {
  desktop: "#008080",      // classic teal
  taskbar: "#c0c0c0",      // silver
  taskbarDark: "#808080",
  taskbarLight: "#ffffff",
  titleActive: "#000080",  // navy blue
  titleInactive: "#808080",
  titleText: "#ffffff",
  window: "#c0c0c0",
  windowText: "#000000",
  buttonFace: "#c0c0c0",
  buttonHighlight: "#ffffff",
  buttonShadow: "#808080",
  buttonDkShadow: "#000000",
  startGreen: "#008000",
  black: "#000000",
  white: "#ffffff",
  blue: "#000080",
  biosGreen: "#00ff00",
  biosAmber: "#ffaa00",
};

// ── Inset border (Win95 style) ──
function win95Border(raised = true) {
  if (raised) {
    return {
      borderTop: `2px solid ${W95.buttonHighlight}`,
      borderLeft: `2px solid ${W95.buttonHighlight}`,
      borderBottom: `2px solid ${W95.buttonDkShadow}`,
      borderRight: `2px solid ${W95.buttonDkShadow}`,
    };
  }
  return {
    borderTop: `2px solid ${W95.buttonDkShadow}`,
    borderLeft: `2px solid ${W95.buttonDkShadow}`,
    borderBottom: `2px solid ${W95.buttonHighlight}`,
    borderRight: `2px solid ${W95.buttonHighlight}`,
  };
}

// ── Boot Sequence Phases ──
const BOOT_PHASES = {
  OFF: "off",
  BIOS: "bios",
  LOADING: "loading",
  SPLASH: "splash",
  DESKTOP: "desktop",
};

const BIOS_LINES = [
  "Pattrn BIOS v4.20.69",
  "Copyright (c) 1995 Pattrn Technologies Inc.",
  "",
  "Puzzle RAM Test....... 640K OK",
  "Pattern Co-Processor.. DETECTED",
  "Aggie Companion Unit.. ONLINE",
  "",
  "Detecting Primary Pattern Drive... C:",
  "Loading PATTRN.SYS................ OK",
  "Loading AGGIE.DRV................. OK",
  "Loading PUZZLE.VXD................ OK",
  "",
  "Starting Pattrndows 95...",
];

export default function Win95Shell({
  canvasRef,
  screenContent,
  children,
  onDpadPress,
  onButtonA,
  onButtonB,
  onStart,
  onSelect,
  title = "Campaign - Pattrn Explorer",
}) {
  const [bootPhase, setBootPhase] = useState(BOOT_PHASES.OFF);
  const [biosLine, setBiosLine] = useState(0);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [clockTime, setClockTime] = useState("");
  const [windowMaximized, setWindowMaximized] = useState(true);
  const [crtOn, setCrtOn] = useState(false);
  const bootDoneRef = useRef(false);
  const startMenuRef = useRef(null);

  // ── Boot sequence ──
  useEffect(() => {
    // Skip boot if already done this session
    if (bootDoneRef.current) {
      setBootPhase(BOOT_PHASES.DESKTOP);
      setCrtOn(true);
      return;
    }

    // Phase 1: CRT turn on
    const t0 = setTimeout(() => {
      setCrtOn(true);
      setBootPhase(BOOT_PHASES.BIOS);
    }, 400);

    return () => clearTimeout(t0);
  }, []);

  // BIOS text scroll
  useEffect(() => {
    if (bootPhase !== BOOT_PHASES.BIOS) return;
    if (biosLine >= BIOS_LINES.length) {
      const t = setTimeout(() => setBootPhase(BOOT_PHASES.LOADING), 600);
      return () => clearTimeout(t);
    }
    const delay = BIOS_LINES[biosLine] === "" ? 100 : 120 + Math.random() * 80;
    const t = setTimeout(() => setBiosLine(prev => prev + 1), delay);
    return () => clearTimeout(t);
  }, [bootPhase, biosLine]);

  // Loading bar phase
  useEffect(() => {
    if (bootPhase !== BOOT_PHASES.LOADING) return;
    const t = setTimeout(() => setBootPhase(BOOT_PHASES.SPLASH), 1800);
    return () => clearTimeout(t);
  }, [bootPhase]);

  // Splash screen
  useEffect(() => {
    if (bootPhase !== BOOT_PHASES.SPLASH) return;
    const t = setTimeout(() => {
      setBootPhase(BOOT_PHASES.DESKTOP);
      bootDoneRef.current = true;
    }, 2000);
    return () => clearTimeout(t);
  }, [bootPhase]);

  // ── Clock ──
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      setClockTime(`${h12}:${m} ${ampm}`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Close start menu on outside click ──
  useEffect(() => {
    if (!showStartMenu) return;
    const handleClick = (e) => {
      if (startMenuRef.current && !startMenuRef.current.contains(e.target)) {
        setShowStartMenu(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [showStartMenu]);

  // ── Keyboard controls ──
  useEffect(() => {
    if (bootPhase !== BOOT_PHASES.DESKTOP) return;

    const handleKey = (e) => {
      const key = e.key.toLowerCase();

      // Skip boot on any key
      if (bootPhase !== BOOT_PHASES.DESKTOP) return;

      // Escape → pause (start menu toggle for fun, but also pause)
      if (key === "escape") {
        e.preventDefault();
        if (onStart) onStart();
        return;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [bootPhase, onStart]);

  // ── Skip boot on click/key ──
  const skipBoot = useCallback(() => {
    if (bootPhase !== BOOT_PHASES.DESKTOP) {
      setBootPhase(BOOT_PHASES.DESKTOP);
      setCrtOn(true);
      bootDoneRef.current = true;
    }
  }, [bootPhase]);

  useEffect(() => {
    if (bootPhase === BOOT_PHASES.DESKTOP) return;
    const handleSkip = (e) => {
      // Skip on click or any key during boot
      if (bootPhase !== BOOT_PHASES.DESKTOP) {
        skipBoot();
      }
    };
    window.addEventListener("click", handleSkip);
    window.addEventListener("keydown", handleSkip);
    return () => {
      window.removeEventListener("click", handleSkip);
      window.removeEventListener("keydown", handleSkip);
    };
  }, [bootPhase, skipBoot]);

  // ── Start menu items ──
  const startMenuItems = [
    { icon: "\u{1F4C1}", label: "Save Progress", action: () => { setShowStartMenu(false); } },
    { icon: "\u{1F50A}", label: "Sound", action: () => { setShowStartMenu(false); } },
    { divider: true },
    { icon: "\u{2753}", label: "Help (E / Space)", action: () => { setShowStartMenu(false); } },
    { divider: true },
    { icon: "\u{1F6AA}", label: "Shut Down...", action: () => { setShowStartMenu(false); if (onSelect) onSelect(); } },
  ];

  // ── CRT screen styles ──
  const crtScreenStyle = {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    background: crtOn ? W95.black : "#111",
    borderRadius: "12px / 10px",
    transition: crtOn ? "none" : "background 0.3s",
  };

  // ── Render boot screens ──
  const renderBootScreen = () => {
    if (bootPhase === BOOT_PHASES.OFF) {
      return <div style={{ ...crtScreenStyle, background: "#050505" }} />;
    }

    if (bootPhase === BOOT_PHASES.BIOS) {
      return (
        <div style={{
          ...crtScreenStyle,
          background: W95.black,
          padding: 16,
          fontFamily: "'Courier New', monospace",
          fontSize: 11,
          color: W95.biosGreen,
          lineHeight: 1.6,
          overflow: "hidden",
        }}>
          {BIOS_LINES.slice(0, biosLine).map((line, i) => (
            <div key={i} style={{
              opacity: 1,
              minHeight: line === "" ? 8 : "auto",
            }}>
              {line}
              {i === biosLine - 1 && <span style={{ animation: "w95blink 0.5s step-end infinite" }}>{"\u2588"}</span>}
            </div>
          ))}
        </div>
      );
    }

    if (bootPhase === BOOT_PHASES.LOADING) {
      return (
        <div style={{
          ...crtScreenStyle,
          background: W95.black,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}>
          {/* Pattrndows 95 logo */}
          <div style={{
            display: "flex", alignItems: "baseline", gap: 2,
          }}>
            <span style={{
              fontFamily: SYSTEM_FONT, fontSize: 28, fontWeight: 700,
              fontStyle: "italic",
              background: "linear-gradient(180deg, #ff0000 0%, #ff8800 20%, #ffff00 40%, #00ff00 60%, #0088ff 80%, #8800ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: -1,
            }}>
              Pattrndows
            </span>
            <span style={{
              fontFamily: SYSTEM_FONT, fontSize: 36, fontWeight: 800,
              color: "#fff",
              textShadow: "2px 2px 0 #000",
            }}>
              95
            </span>
          </div>

          {/* Loading bar */}
          <div style={{
            width: 200, height: 16,
            background: W95.taskbar,
            ...win95Border(false),
            padding: 2,
          }}>
            <div style={{
              height: "100%",
              background: W95.titleActive,
              animation: "w95loadbar 1.8s linear forwards",
            }} />
          </div>

          <div style={{
            fontFamily: SYSTEM_FONT, fontSize: 10, color: "#888",
            marginTop: 4,
          }}>
            Please wait while Pattrndows starts...
          </div>
        </div>
      );
    }

    if (bootPhase === BOOT_PHASES.SPLASH) {
      return (
        <div style={{
          ...crtScreenStyle,
          background: W95.desktop,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: "w95fadein 0.5s ease",
        }}>
          <div style={{
            fontFamily: SYSTEM_FONT,
            fontSize: 14,
            color: "#fff",
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
          }}>
            Welcome to
          </div>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 3,
            marginTop: 8,
          }}>
            <span style={{
              fontFamily: SYSTEM_FONT, fontSize: 32, fontWeight: 700,
              fontStyle: "italic",
              color: "#fff",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}>
              Pattrndows
            </span>
            <span style={{
              fontFamily: SYSTEM_FONT, fontSize: 42, fontWeight: 800,
              color: "#fff",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}>
              95
            </span>
          </div>
          <div style={{
            fontFamily: SYSTEM_FONT, fontSize: 10, color: "rgba(255,255,255,0.7)",
            marginTop: 12,
          }}>
            Puzzle Edition
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Render desktop ──
  const renderDesktop = () => (
    <div style={{
      ...crtScreenStyle,
      background: W95.desktop,
      display: "flex",
      flexDirection: "column",
      animation: bootDoneRef.current ? "none" : "w95fadein 0.3s ease",
    }}>
      {/* Desktop area */}
      <div style={{
        flex: 1,
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
        padding: windowMaximized ? 0 : 8,
      }}>
        {/* Desktop icons (top-left) */}
        {!windowMaximized && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            display: "flex", flexDirection: "column", gap: 12,
            zIndex: 1,
          }}>
            <DesktopIcon icon={"\u{1F4BB}"} label="My Puzzles" onClick={() => {}} />
            <DesktopIcon icon={"\u{1F5D1}"} label="Recycle Bin" onClick={() => {}} />
          </div>
        )}

        {/* Win95 Window */}
        <div style={{
          flex: windowMaximized ? 1 : undefined,
          width: windowMaximized ? "100%" : "calc(100% - 16px)",
          height: windowMaximized ? "100%" : "calc(100% - 16px)",
          display: "flex",
          flexDirection: "column",
          background: W95.window,
          ...(windowMaximized ? {} : {
            ...win95Border(true),
            position: "absolute",
            top: 8, left: 8,
            right: 8, bottom: 8,
          }),
          zIndex: 10,
        }}>
          {/* Title bar */}
          <div style={{
            height: 22,
            minHeight: 22,
            background: `linear-gradient(90deg, ${W95.titleActive}, #1084d0)`,
            display: "flex",
            alignItems: "center",
            padding: "0 3px",
            gap: 4,
            cursor: "default",
          }}>
            {/* Icon */}
            <span style={{ fontSize: 12, lineHeight: 1 }}>{"\u{1F5FA}"}</span>
            {/* Title */}
            <span style={{
              flex: 1,
              fontFamily: SYSTEM_FONT, fontSize: 11, fontWeight: 700,
              color: W95.titleText,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {title}
            </span>
            {/* Window buttons */}
            <div style={{ display: "flex", gap: 2 }}>
              <Win95Button size={16} onClick={() => setWindowMaximized(false)} title="Minimize">
                <div style={{ width: 8, height: 2, background: W95.black, marginTop: 8 }} />
              </Win95Button>
              <Win95Button size={16} onClick={() => setWindowMaximized(!windowMaximized)} title="Maximize">
                <div style={{
                  width: 9, height: 8,
                  border: `1px solid ${W95.black}`,
                  borderTop: `2px solid ${W95.black}`,
                }} />
              </Win95Button>
              <Win95Button size={16} onClick={() => { if (onSelect) onSelect(); }} title="Close">
                <span style={{ fontSize: 11, fontWeight: 900, color: W95.black, lineHeight: 1, marginTop: -1 }}>{"\u00D7"}</span>
              </Win95Button>
            </div>
          </div>

          {/* Menu bar */}
          <div style={{
            height: 20,
            minHeight: 20,
            background: W95.window,
            display: "flex",
            alignItems: "center",
            padding: "0 4px",
            gap: 2,
            borderBottom: `1px solid ${W95.buttonShadow}`,
          }}>
            <MenuBarItem label="Dungeon" />
            <MenuBarItem label="Edit" />
            <MenuBarItem label="View" />
            <MenuBarItem label="Help" />
          </div>

          {/* Content area - game renders here */}
          <div style={{
            flex: 1,
            background: W95.black,
            ...win95Border(false),
            margin: "0 2px 2px 2px",
            position: "relative",
            overflow: "hidden",
          }}>
            {canvasRef ? (
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  imageRendering: "pixelated",
                }}
              />
            ) : screenContent}

            {/* Overlays inside content area */}
            {children}
          </div>

          {/* Status bar */}
          <div style={{
            height: 18,
            minHeight: 18,
            display: "flex",
            alignItems: "center",
            padding: "0 4px",
            gap: 2,
          }}>
            <div style={{
              flex: 2,
              height: 14,
              ...win95Border(false),
              display: "flex", alignItems: "center",
              padding: "0 4px",
              fontFamily: SYSTEM_FONT, fontSize: 10, color: W95.windowText,
            }}>
              WASD / Arrows to move \u2022 E / Space to interact
            </div>
            <div style={{
              flex: 1,
              height: 14,
              ...win95Border(false),
              display: "flex", alignItems: "center",
              padding: "0 4px",
              fontFamily: SYSTEM_FONT, fontSize: 10, color: W95.windowText,
            }}>
              ESC = Pause
            </div>
          </div>
        </div>
      </div>

      {/* ── Taskbar ── */}
      <div style={{
        height: 30,
        minHeight: 30,
        background: W95.taskbar,
        ...win95Border(true),
        borderBottom: "none",
        display: "flex",
        alignItems: "center",
        padding: "0 3px",
        gap: 4,
        zIndex: 100,
      }}>
        {/* Start button */}
        <div ref={startMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowStartMenu(!showStartMenu)}
            style={{
              height: 24,
              padding: "0 6px",
              fontFamily: SYSTEM_FONT,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 3,
              background: W95.buttonFace,
              color: W95.windowText,
              ...(showStartMenu ? win95Border(false) : win95Border(true)),
            }}
          >
            <span style={{ fontSize: 13 }}>{"\u{1F5D4}"}</span>
            Start
          </button>

          {/* Start Menu */}
          {showStartMenu && (
            <div style={{
              position: "absolute",
              bottom: 26,
              left: 0,
              width: 180,
              background: W95.window,
              ...win95Border(true),
              zIndex: 200,
              display: "flex",
            }}>
              {/* Blue sidebar */}
              <div style={{
                width: 24,
                background: `linear-gradient(180deg, ${W95.titleActive}, #000040)`,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                padding: "0 0 6px 0",
              }}>
                <span style={{
                  fontFamily: SYSTEM_FONT, fontSize: 10, fontWeight: 700,
                  color: "#ccc",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  letterSpacing: 2,
                }}>
                  Pattrndows95
                </span>
              </div>

              {/* Menu items */}
              <div style={{ flex: 1, padding: "4px 0" }}>
                {startMenuItems.map((item, i) =>
                  item.divider ? (
                    <div key={i} style={{
                      height: 1,
                      background: W95.buttonShadow,
                      margin: "3px 4px",
                      borderBottom: `1px solid ${W95.buttonHighlight}`,
                    }} />
                  ) : (
                    <div
                      key={i}
                      onClick={item.action}
                      style={{
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 8px",
                        fontFamily: SYSTEM_FONT,
                        fontSize: 11,
                        color: W95.windowText,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = W95.titleActive;
                        e.currentTarget.style.color = W95.white;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = W95.windowText;
                      }}
                    >
                      <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick launch divider */}
        <div style={{
          width: 1, height: 20,
          background: W95.buttonShadow,
          borderRight: `1px solid ${W95.buttonHighlight}`,
          margin: "0 2px",
        }} />

        {/* Active window button */}
        <button style={{
          height: 22,
          flex: "0 1 160px",
          padding: "0 6px",
          fontFamily: SYSTEM_FONT,
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: W95.buttonFace,
          color: W95.windowText,
          ...win95Border(false),
          textAlign: "left",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}>
          <span style={{ fontSize: 11 }}>{"\u{1F5FA}"}</span>
          Campaign
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* System tray */}
        <div style={{
          height: 22,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 6px",
          ...win95Border(false),
        }}>
          <span style={{ fontSize: 11 }}>{"\u{1F50A}"}</span>
          <span style={{
            fontFamily: SYSTEM_FONT,
            fontSize: 10,
            color: W95.windowText,
          }}>
            {clockTime}
          </span>
        </div>
      </div>
    </div>
  );

  // ── Main render: CRT monitor frame ──
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "#1a1a1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes w95blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes w95loadbar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes w95fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes crtTurnOn {
          0% {
            transform: scaleY(0.005) scaleX(0.3);
            filter: brightness(30);
          }
          20% {
            transform: scaleY(0.005) scaleX(1);
            filter: brightness(10);
          }
          40% {
            transform: scaleY(1) scaleX(1);
            filter: brightness(2);
          }
          70% {
            transform: scaleY(1) scaleX(1);
            filter: brightness(1.2);
          }
          100% {
            transform: scaleY(1) scaleX(1);
            filter: brightness(1);
          }
        }

        @keyframes crtFlicker {
          0% { opacity: 0.97; }
          5% { opacity: 1; }
          10% { opacity: 0.98; }
          15% { opacity: 1; }
          95% { opacity: 1; }
          100% { opacity: 0.97; }
        }

        @keyframes scanlineMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
      `}</style>

      {/* CRT Monitor body */}
      <div style={{
        position: "relative",
        width: "min(90vw, 900px)",
        aspectRatio: "4 / 3",
        maxHeight: "90vh",
        background: "linear-gradient(160deg, #3a3530 0%, #2a2520 40%, #1a1510 100%)",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)",
      }}>
        {/* Monitor bezel inner */}
        <div style={{
          width: "100%",
          height: "100%",
          background: "#0a0a08",
          borderRadius: 14,
          padding: 6,
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.8)",
          position: "relative",
        }}>
          {/* The CRT screen */}
          <div style={{
            width: "100%",
            height: "100%",
            borderRadius: "10px / 8px",
            overflow: "hidden",
            position: "relative",
            animation: crtOn ? "crtTurnOn 0.6s ease-out forwards" : "none",
            transform: crtOn ? "scaleY(1) scaleX(1)" : "scaleY(0) scaleX(0)",
          }}>
            {/* Screen content */}
            <div style={{
              width: "100%",
              height: "100%",
              position: "relative",
              animation: crtOn ? "crtFlicker 3s ease-in-out infinite" : "none",
            }}>
              {bootPhase === BOOT_PHASES.DESKTOP ? renderDesktop() : renderBootScreen()}
            </div>

            {/* ── CRT Effects Overlay ── */}

            {/* Scanlines */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
              pointerEvents: "none",
              zIndex: 50,
              animation: "scanlineMove 0.1s linear infinite",
            }} />

            {/* Horizontal scan bar (moving bright line) */}
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 3,
              background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.03), transparent)",
              pointerEvents: "none",
              zIndex: 51,
              animation: "crtScanBar 8s linear infinite",
            }} />

            {/* Vignette / screen curvature darkening */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)",
              pointerEvents: "none",
              zIndex: 52,
            }} />

            {/* Phosphor glow */}
            <div style={{
              position: "absolute",
              inset: -2,
              borderRadius: "12px / 10px",
              boxShadow: crtOn
                ? "inset 0 0 60px rgba(0,128,128,0.07), inset 0 0 20px rgba(0,0,0,0.4)"
                : "none",
              pointerEvents: "none",
              zIndex: 53,
            }} />

            {/* RGB sub-pixel effect (subtle) */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(90deg, rgba(255,0,0,0.02) 0px, rgba(0,255,0,0.02) 1px, rgba(0,0,255,0.02) 2px, transparent 3px)",
              pointerEvents: "none",
              zIndex: 54,
              mixBlendMode: "overlay",
            }} />
          </div>
        </div>

        {/* Monitor brand label */}
        <div style={{
          position: "absolute",
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: SYSTEM_FONT,
          fontSize: 9,
          color: "#5a5550",
          letterSpacing: 3,
          textTransform: "uppercase",
        }}>
          PATTRN
        </div>

        {/* Power LED */}
        <div style={{
          position: "absolute",
          bottom: 8,
          right: 30,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: crtOn ? "#4ade80" : "#333",
          boxShadow: crtOn ? "0 0 6px #4ade80, 0 0 12px rgba(74,222,128,0.3)" : "none",
          transition: "all 0.3s",
        }} />

        {/* Monitor power button */}
        <div style={{
          position: "absolute",
          bottom: 5,
          right: 50,
          width: 12,
          height: 12,
          borderRadius: 2,
          background: "#2a2a2a",
          border: "1px solid #3a3a3a",
          cursor: "pointer",
        }} />
      </div>

      {/* Moving scan bar keyframe (injected separately since it needs animation) */}
      <style>{`
        @keyframes crtScanBar {
          0% { top: -3px; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Helper Components ──

function Win95Button({ size = 16, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: size,
        height: size,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: W95.buttonFace,
        ...win95Border(true),
        cursor: "pointer",
        fontFamily: SYSTEM_FONT,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.borderTopColor = W95.buttonDkShadow;
        e.currentTarget.style.borderLeftColor = W95.buttonDkShadow;
        e.currentTarget.style.borderBottomColor = W95.buttonHighlight;
        e.currentTarget.style.borderRightColor = W95.buttonHighlight;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.borderTopColor = W95.buttonHighlight;
        e.currentTarget.style.borderLeftColor = W95.buttonHighlight;
        e.currentTarget.style.borderBottomColor = W95.buttonDkShadow;
        e.currentTarget.style.borderRightColor = W95.buttonDkShadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderTopColor = W95.buttonHighlight;
        e.currentTarget.style.borderLeftColor = W95.buttonHighlight;
        e.currentTarget.style.borderBottomColor = W95.buttonDkShadow;
        e.currentTarget.style.borderRightColor = W95.buttonDkShadow;
      }}
    >
      {children}
    </button>
  );
}

function DesktopIcon({ icon, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        cursor: "pointer",
        width: 64,
        padding: 4,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0,0,128,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{
        fontFamily: SYSTEM_FONT,
        fontSize: 10,
        color: W95.white,
        textShadow: "1px 1px 1px #000",
        textAlign: "center",
        wordBreak: "break-word",
      }}>
        {label}
      </span>
    </div>
  );
}

function MenuBarItem({ label }) {
  return (
    <span
      style={{
        fontFamily: SYSTEM_FONT,
        fontSize: 11,
        color: W95.windowText,
        padding: "1px 6px",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = W95.titleActive;
        e.currentTarget.style.color = W95.white;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = W95.windowText;
      }}
    >
      {label}
    </span>
  );
}

export { W95, win95Border };
