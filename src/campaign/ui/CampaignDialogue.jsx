// Pokemon-style dialogue box overlay (compact for Game Boy screen)
// Character-by-character text reveal with tap/A button to advance

import React, { useState, useEffect, useRef } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";
const CHAR_DELAY = 25; // ms per character

export default function CampaignDialogue({ lines, portrait, onComplete, advanceRef, C }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(true);
  const intervalRef = useRef(null);

  const currentLine = lines[lineIndex] || "";
  const displayedText = currentLine.slice(0, charIndex);

  // Character reveal timer
  useEffect(() => {
    if (!isRevealing) return;

    intervalRef.current = setInterval(() => {
      setCharIndex(prev => {
        if (prev >= currentLine.length) {
          setIsRevealing(false);
          clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, CHAR_DELAY);

    return () => clearInterval(intervalRef.current);
  }, [lineIndex, isRevealing, currentLine]);

  function handleTap() {
    if (isRevealing) {
      // Speed up — show full line
      clearInterval(intervalRef.current);
      setCharIndex(currentLine.length);
      setIsRevealing(false);
      return;
    }

    // Advance to next line
    if (lineIndex < lines.length - 1) {
      setLineIndex(lineIndex + 1);
      setCharIndex(0);
      setIsRevealing(true);
    } else {
      // All lines done
      if (onComplete) onComplete();
    }
  }

  // Expose handleTap to parent via advanceRef
  useEffect(() => {
    if (advanceRef) advanceRef.current = handleTap;
    return () => { if (advanceRef) advanceRef.current = null; };
  });

  // Listen for A button (space/enter) to advance dialogue
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!lines || lines.length === 0) return null;

  return (
    <div
      onClick={handleTap}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        pointerEvents: "auto", zIndex: 20,
        cursor: "pointer",
      }}
    >
      <div style={{
        margin: "0 4px 4px",
        background: "rgba(0,0,0,0.92)",
        borderRadius: 6,
        border: "2px solid rgba(255,255,255,0.25)",
        padding: "6px 8px",
        display: "flex", gap: 6, alignItems: "flex-start",
        minHeight: 36,
      }}>
        {/* Portrait — small */}
        {portrait && (
          <div style={{
            width: 24, height: 24, borderRadius: 4, flexShrink: 0,
            background: "rgba(154,150,204,0.15)",
            border: "1px solid rgba(154,150,204,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12,
          }}>
            {portrait}
          </div>
        )}

        {/* Text area */}
        <div style={{ flex: 1, minHeight: 20 }}>
          <div style={{
            fontFamily: PIXEL_FONT, fontSize: 6, lineHeight: 1.7,
            color: "#e8e8ef",
            wordBreak: "break-word",
          }}>
            {displayedText}
            {isRevealing && (
              <span style={{ opacity: 0.5 }}>|</span>
            )}
          </div>

          {/* Advance indicator */}
          {!isRevealing && (
            <div style={{
              textAlign: "right", marginTop: 2,
              fontSize: 6, color: "#6b6b8b",
              fontFamily: PIXEL_FONT,
              animation: "dialogueBounce 0.8s ease-in-out infinite",
            }}>
              {lineIndex < lines.length - 1 ? "\u25BC" : "\u25A0 A"}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dialogueBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
      `}</style>
    </div>
  );
}
