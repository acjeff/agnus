// Campaign shop overlay — town NPC store UI
// Shows items for sale with coin costs, buy button, and close

import React, { useState, useEffect, useCallback } from "react";

const PIXEL_FONT = "'Press Start 2P', monospace";

export default function CampaignShop({ title, subtitle, coins, items, onBuy, onClose, C }) {
  const [cursor, setCursor] = useState(0);

  // Keyboard nav: up/down to move cursor, Enter/Space to buy, Escape/B to close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor(prev => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor(prev => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (items[cursor]) onBuy(items[cursor]);
      } else if (e.key === "Escape" || e.key === "b" || e.key === "B") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cursor, items, onBuy, onClose]);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 25,
      background: "rgba(0,0,0,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: PIXEL_FONT, color: "#e8e8ef",
    }}>
      {/* Header */}
      <div style={{ fontSize: 11, color: "#dddcf0", marginBottom: 4, letterSpacing: 1 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 7, color: "#6b6b8b", marginBottom: 20 }}>
          {subtitle}
        </div>
      )}

      {/* Coins display */}
      <div style={{
        fontSize: 8, color: "#ffd700", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>{"\u25C9"}</span>
        <span>{coins} coins</span>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 260 }}>
        {items.map((item, i) => {
          const canAfford = coins >= item.cost;
          const active = cursor === i;
          return (
            <button
              key={item.id}
              onClick={() => onBuy(item)}
              onMouseEnter={() => setCursor(i)}
              style={{
                width: "100%", padding: "10px 14px",
                background: active ? "rgba(154,150,204,0.2)" : "rgba(255,255,255,0.04)",
                border: `2px solid ${active ? "#9a96cc" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8,
                fontFamily: PIXEL_FONT, fontSize: 8,
                color: canAfford ? "#dddcf0" : "#555",
                cursor: canAfford ? "pointer" : "default",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "background 0.1s, border-color 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 7, color: "#9a96cc", width: 10, textAlign: "center",
                  visibility: active ? "visible" : "hidden",
                  animation: active ? "shopCursorBlink 1s ease infinite" : "none",
                }}>{"\u25B6"}</span>
                <span>{item.label}</span>
              </div>
              <span style={{ fontSize: 7, color: canAfford ? "#ffd700" : "#553a00" }}>
                {item.cost} {"\u25C9"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Close hint */}
      <div
        onClick={onClose}
        style={{
          marginTop: 24, fontSize: 7, color: "#6b6b8b",
          cursor: "pointer", padding: "6px 16px",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
        }}
      >
        {"\u25C0"} CLOSE (B)
      </div>

      <style>{`
        @keyframes shopCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
