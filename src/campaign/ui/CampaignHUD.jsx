// Campaign HUD — React overlay on top of the canvas
// Shows: floor info, coins, Aggie level/XP, minimap, ability bar

import React from "react";
import { getXpProgress, getUnlockedAbilities, isAbilityReady } from "../state/campaignState.js";

const PIXEL_FONT = "'Press Start 2P', monospace";

export default function CampaignHUD({
  campaignState,
  chapterName,
  floorIdx,
  totalFloors,
  onPause,
  onUseAbility,
  C,
}) {
  const xpProgress = getXpProgress(campaignState);
  const abilities = getUnlockedAbilities(campaignState);
  const { level, evolutionStage } = campaignState.aggie;
  const { coins, keys, potions } = campaignState.inventory;

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: "none", zIndex: 10,
      fontFamily: PIXEL_FONT,
    }}>
      {/* Top bar — floor info + coins */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "12px 16px", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
        pointerEvents: "auto",
      }}>
        {/* Left: Floor info */}
        <div style={{
          background: "rgba(0,0,0,0.75)", borderRadius: 8,
          padding: "8px 12px", border: "2px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: 8, color: "#aaa", marginBottom: 4, letterSpacing: 1 }}>
            {chapterName}
          </div>
          <div style={{ fontSize: 10, color: "#fff" }}>
            Floor {floorIdx + 1}/{totalFloors}
          </div>
        </div>

        {/* Right: Pause button */}
        <button
          onClick={onPause}
          style={{
            background: "rgba(0,0,0,0.75)", borderRadius: 8,
            padding: "8px 12px", border: "2px solid rgba(255,255,255,0.1)",
            color: "#fff", fontFamily: PIXEL_FONT, fontSize: 10,
            cursor: "pointer", pointerEvents: "auto",
          }}
        >
          II
        </button>
      </div>

      {/* Top-right: Inventory */}
      <div style={{
        position: "absolute", top: 60, right: 16,
        display: "flex", flexDirection: "column", gap: 6,
        pointerEvents: "auto",
      }}>
        {[
          { icon: "\u25C9", value: coins, color: "#ffd700", label: "coins" },
          { icon: "\u2737", value: keys, color: "#88ddff", label: "keys" },
          { icon: "\u2665", value: potions, color: "#ff6688", label: "potions" },
        ].filter(item => item.value > 0).map(item => (
          <div key={item.label} style={{
            background: "rgba(0,0,0,0.75)", borderRadius: 6,
            padding: "4px 8px", border: `1px solid ${item.color}44`,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12, color: item.color }}>{item.icon}</span>
            <span style={{ fontSize: 8, color: "#fff" }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Bottom-left: Aggie status */}
      <div style={{
        position: "absolute", bottom: 16, left: 16,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        pointerEvents: "auto",
      }}>
        <div style={{
          background: "rgba(0,0,0,0.8)", borderRadius: 10,
          padding: "10px 14px", border: "2px solid rgba(255,255,255,0.1)",
          minWidth: 120,
        }}>
          {/* Aggie name + level */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 8, color: "#dddcf0" }}>AGGIE</span>
            <span style={{ fontSize: 8, color: "#9a96cc" }}>Lv.{level}</span>
          </div>
          {/* XP bar */}
          <div style={{
            width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 3, overflow: "hidden", marginBottom: 4,
          }}>
            <div style={{
              width: `${xpProgress * 100}%`, height: "100%",
              backgroundColor: "#9a96cc",
              borderRadius: 3,
              transition: "width 0.3s ease",
            }} />
          </div>
          {/* Evolution stage */}
          <div style={{ fontSize: 7, color: "#6b6b8b", textTransform: "uppercase", letterSpacing: 1 }}>
            {evolutionStage}
          </div>
        </div>
      </div>

      {/* Bottom-center: Ability bar */}
      {abilities.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          display: "flex", gap: 8, pointerEvents: "auto",
        }}>
          {abilities.map(ability => {
            const ready = isAbilityReady(campaignState, ability.id);
            return (
              <button
                key={ability.id}
                onClick={() => ready && onUseAbility(ability.id)}
                title={`${ability.name}: ${ability.desc}`}
                style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: ready ? "rgba(154,150,204,0.3)" : "rgba(40,40,60,0.5)",
                  border: `2px solid ${ready ? "#9a96cc" : "#333"}`,
                  color: ready ? "#dddcf0" : "#555",
                  fontFamily: PIXEL_FONT, fontSize: 7,
                  cursor: ready ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: ready ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
              >
                {ability.name.slice(0, 3).toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile D-pad (only on touch devices) */}
      <MobileDPad />
    </div>
  );
}

// Virtual D-pad for mobile
function MobileDPad() {
  const [isTouchDevice] = React.useState(() =>
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );

  if (!isTouchDevice) return null;

  const btnStyle = (active) => ({
    width: 44, height: 44, borderRadius: 8,
    background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
    border: "2px solid rgba(255,255,255,0.15)",
    color: "#fff", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", pointerEvents: "auto",
    userSelect: "none", WebkitUserSelect: "none",
  });

  // Dispatch keyboard events for d-pad buttons
  const press = (key) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  };
  const release = (key) => {
    window.dispatchEvent(new KeyboardEvent("keyup", { key }));
  };

  return (
    <div style={{
      position: "absolute", bottom: 24, right: 16,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      display: "grid",
      gridTemplateColumns: "44px 44px 44px",
      gridTemplateRows: "44px 44px 44px",
      gap: 4,
      pointerEvents: "auto",
    }}>
      <div />
      <div
        style={btnStyle(false)}
        onTouchStart={() => press("ArrowUp")}
        onTouchEnd={() => release("ArrowUp")}
      >\u25B2</div>
      <div />
      <div
        style={btnStyle(false)}
        onTouchStart={() => press("ArrowLeft")}
        onTouchEnd={() => release("ArrowLeft")}
      >\u25C0</div>
      <div
        style={{ ...btnStyle(false), fontSize: 8, fontFamily: PIXEL_FONT }}
        onTouchStart={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }))}
        onTouchEnd={() => window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }))}
      >ACT</div>
      <div
        style={btnStyle(false)}
        onTouchStart={() => press("ArrowRight")}
        onTouchEnd={() => release("ArrowRight")}
      >\u25B6</div>
      <div />
      <div
        style={btnStyle(false)}
        onTouchStart={() => press("ArrowDown")}
        onTouchEnd={() => release("ArrowDown")}
      >\u25BC</div>
      <div />
    </div>
  );
}
