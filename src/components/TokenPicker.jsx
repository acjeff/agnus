import { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../constants/theme.js";
import { SHAPES } from "../constants/shapes.jsx";
import { parseToken, getShapeStroke } from "../utils/helpers.js";

function TokenPicker({ tokens, selectedToken, onSelect, cellSize, mode, remaining, colorMap, shapesArr, themeId, passOption }) {
  const isEasy = mode === "easy" || mode === "blind";
  const shapes = shapesArr || SHAPES;
  const isEnigma = themeId === "enigma";
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, scrollStart: 0, moved: false, lastX: 0, lastT: 0, velX: 0, rafId: 0 });
  const arrowStateRef = useRef({ left: false, right: false, over: false });

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const has = el.scrollWidth > el.clientWidth + 1;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    const prev = arrowStateRef.current;
    if (prev.left !== left) { prev.left = left; setCanScrollLeft(left); }
    if (prev.right !== right) { prev.right = right; setCanScrollRight(right); }
    if (prev.over !== has) { prev.over = has; setOverflows(has); }
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    let rafPending = false;
    const onScroll = () => { if (!rafPending) { rafPending = true; requestAnimationFrame(() => { rafPending = false; updateArrows(); }); } };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, [updateArrows, tokens]);

  // Touch & mouse drag with momentum (parent has touchAction:none so native scroll won't work)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const d = dragRef.current;
    const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX;
    const down = (e) => {
      cancelAnimationFrame(d.rafId);
      d.active = true; d.moved = false;
      d.startX = getX(e); d.scrollStart = el.scrollLeft;
      d.lastX = d.startX; d.lastT = Date.now(); d.velX = 0;
    };
    const move = (e) => {
      if (!d.active) return;
      const x = getX(e);
      const dx = d.startX - x;
      if (Math.abs(dx) > 3) d.moved = true;
      const now = Date.now();
      const dt = now - d.lastT;
      if (dt > 0) d.velX = (d.lastX - x) / dt;
      d.lastX = x; d.lastT = now;
      el.scrollLeft = d.scrollStart + dx;
    };
    const up = () => {
      if (!d.active) return;
      d.active = false;
      // Momentum coast
      let v = d.velX * 16; // px per frame at ~60fps
      if (Math.abs(v) < 0.5) return;
      const coast = () => {
        v *= 0.95;
        if (Math.abs(v) < 0.5) return;
        el.scrollLeft += v;
        d.rafId = requestAnimationFrame(coast);
      };
      d.rafId = requestAnimationFrame(coast);
    };
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", up);
    el.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { cancelAnimationFrame(d.rafId); el.removeEventListener("touchstart", down); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", up); el.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const doScroll = (dir) => { const el = scrollRef.current; if (el) el.scrollBy({ left: dir * (cellSize + 10) * 3, behavior: "smooth" }); };
  const handleTileClick = (token) => { if (!dragRef.current.moved) onSelect(token); };

  const arrowStyle = { width: 28, height: 28, borderRadius: "50%", backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0, transition: "opacity 0.2s" };

  return (
    <div style={{ position: "relative", maxWidth: "100%", display: "flex", alignItems: "center", gap: 4 }}>
      {canScrollLeft && <button onClick={() => doScroll(-1)} style={arrowStyle} aria-label="Scroll left">{"\u2039"}</button>}
      <div ref={scrollRef} className="token-picker-scroll" style={{ display: "flex", gap: 10, justifyContent: overflows ? "flex-start" : "center", padding: "8px 16px", flexWrap: "nowrap", overflowX: "auto", flex: "1 1 auto", minWidth: 0, maxWidth: "100%", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-x", willChange: "scroll-position" }}>
        {tokens.map((token, i) => {
          const { color, shapeIndex } = parseToken(token);
          const displayColor = colorMap ? (colorMap[color] || color) : color;
          const selected = selectedToken === token;
          const left = remaining && remaining[token] !== undefined ? remaining[token] : null;
          const exhausted = left !== null && left <= 0 && mode !== "hard";
          return (
            <div key={i} onClick={() => handleTileClick(token)}
              style={{
                width: cellSize, height: cellSize,
                borderRadius: isEnigma ? "50%" : 12,
                backgroundColor: displayColor,
                border: isEnigma
                  ? (selected ? "3px solid rgba(201,168,76,0.9)" : "2px solid rgba(201,168,76,0.35)")
                  : (selected ? `3px solid ${C.text}` : "3px solid transparent"),
                cursor: exhausted ? "not-allowed" : "pointer", transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s cubic-bezier(0.4,0,0.2,1), border-color 0.2s cubic-bezier(0.4,0,0.2,1)",
                transform: selected ? "scale(1.15)" : "scale(1)",
                opacity: exhausted ? 0.35 : 1,
                boxShadow: isEnigma
                  ? (selected ? `0 0 20px rgba(201,168,76,0.4), inset 0 0 8px rgba(0,0,0,0.3)` : `inset 0 0 6px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.4)`)
                  : (selected ? `0 0 20px ${displayColor}66` : `0 2px 8px ${displayColor}33`),
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                outline: isEnigma ? "1px solid rgba(201,168,76,0.1)" : undefined,
                outlineOffset: isEnigma ? "3px" : undefined,
              }}
            >
              {shapes[shapeIndex % shapes.length](cellSize * 0.5, getShapeStroke(displayColor, isEasy))}
              {left !== null && mode !== "hard" && (
                <div style={{
                  position: "absolute", top: -6, right: -6,
                  backgroundColor: exhausted ? C.textDim : (isEnigma ? "rgba(201,168,76,0.9)" : C.text),
                  color: C.bg, fontSize: 10, fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  width: 18, height: 18, borderRadius: 9,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}>
                  {left}
                </div>
              )}
            </div>
          );
        })}
        {/* Pass tile — always shown in coop mode */}
        {passOption && (
          <div
            onClick={() => { if (!dragRef.current.moved) passOption.onPass(); }}
            style={{
              width: cellSize, height: cellSize,
              borderRadius: 12,
              backgroundColor: passOption.active ? "#54A0FF" : C.surfaceLight,
              border: passOption.active ? "3px solid #54A0FF" : `3px solid ${C.border}`,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
              transform: passOption.active ? "scale(1.15)" : "scale(1)",
              boxShadow: passOption.active ? "0 0 20px #54A0FF66" : "none",
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={cellSize * 0.45} height={cellSize * 0.45} viewBox="0 0 24 24" fill="none"
              stroke={passOption.active ? "#fff" : C.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M11 13l-7 7"/><path d="M3 16v5h5"/>
            </svg>
          </div>
        )}
      </div>
      {canScrollRight && <button onClick={() => doScroll(1)} style={arrowStyle} aria-label="Scroll right">{"\u203A"}</button>}
    </div>
  );
}

export default TokenPicker;
