// Pokemon-style dialogue box overlay
// Character-by-character text reveal with tap to advance

import React, { useState, useEffect, useRef } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";
const CHAR_DELAY = 30; // ms per character

export default function CampaignDialogue({ lines, portrait, onComplete, C }) {
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

  if (!lines || lines.length === 0) return null;

  return (
    <div
      onClick={handleTap}
      onTouchEnd={(e) => { e.preventDefault(); handleTap(); }}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        pointerEvents: "auto", zIndex: 20,
        cursor: "pointer",
      }}
    >
      <div style={{
        margin: "0 12px 12px",
        background: "rgba(0,0,0,0.92)",
        borderRadius: 12,
        border: "3px solid rgba(255,255,255,0.2)",
        padding: "16px 20px",
        display: "flex", gap: 14, alignItems: "flex-start",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        minHeight: 60,
      }}>
        {/* Portrait */}
        {portrait && (
          <div style={{
            width: 48, height: 48, borderRadius: 8, flexShrink: 0,
            background: "rgba(154,150,204,0.15)",
            border: "2px solid rgba(154,150,204,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>
            {portrait}
          </div>
        )}

        {/* Text area */}
        <div style={{ flex: 1, minHeight: 40 }}>
          <div style={{
            fontFamily: PIXEL_FONT, fontSize: 9, lineHeight: 1.8,
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
              textAlign: "right", marginTop: 4,
              fontSize: 8, color: "#6b6b8b",
              fontFamily: PIXEL_FONT,
              animation: "dialogueBounce 0.8s ease-in-out infinite",
            }}>
              {lineIndex < lines.length - 1 ? "\u25BC" : "[OK]"}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dialogueBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>
    </div>
  );
}
