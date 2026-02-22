// Campaign HUD — Compact overlay for Game Boy screen area
// Shows: floor info, coins, Aggie level/XP

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
      {/* Top bar — floor + inventory */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "4px 6px",
        pointerEvents: "auto",
      }}>
        {/* Left: Floor info */}
        <div style={{
          background: "rgba(0,0,0,0.7)", borderRadius: 4,
          padding: "3px 6px",
        }}>
          <div style={{ fontSize: 5, color: "#aaa", letterSpacing: 0.5, marginBottom: 1 }}>
            {chapterName}
          </div>
          <div style={{ fontSize: 6, color: "#fff" }}>
            F{floorIdx + 1}/{totalFloors}
          </div>
        </div>

        {/* Right: Coins + items compact row */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { icon: "\u25C9", value: coins, color: "#ffd700" },
            { icon: "\u2737", value: keys, color: "#88ddff" },
            { icon: "\u2665", value: potions, color: "#ff6688" },
          ].filter(item => item.value > 0).map((item, i) => (
            <div key={i} style={{
              background: "rgba(0,0,0,0.7)", borderRadius: 4,
              padding: "3px 5px",
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <span style={{ fontSize: 7, color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 6, color: "#fff" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-left: Aggie status (compact) */}
      <div style={{
        position: "absolute", bottom: 4, left: 4,
        pointerEvents: "auto",
      }}>
        <div style={{
          background: "rgba(0,0,0,0.7)", borderRadius: 4,
          padding: "3px 6px", minWidth: 70,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 5, color: "#dddcf0" }}>AGGIE</span>
            <span style={{ fontSize: 5, color: "#9a96cc" }}>Lv{level}</span>
          </div>
          {/* XP bar */}
          <div style={{
            width: "100%", height: 3, backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              width: `${xpProgress * 100}%`, height: "100%",
              backgroundColor: "#9a96cc", borderRadius: 2,
            }} />
          </div>
        </div>
      </div>

      {/* Bottom-right: Ability indicators (compact dots) */}
      {abilities.length > 0 && (
        <div style={{
          position: "absolute", bottom: 4, right: 4,
          display: "flex", gap: 3, pointerEvents: "auto",
        }}>
          {abilities.slice(0, 4).map(ability => {
            const ready = isAbilityReady(campaignState, ability.id);
            return (
              <button
                key={ability.id}
                onClick={() => ready && onUseAbility(ability.id)}
                title={ability.name}
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: ready ? "rgba(154,150,204,0.35)" : "rgba(40,40,60,0.5)",
                  border: `1px solid ${ready ? "#9a96cc88" : "#33333388"}`,
                  color: ready ? "#dddcf0" : "#555",
                  fontFamily: PIXEL_FONT, fontSize: 5,
                  cursor: ready ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: ready ? 1 : 0.4,
                  padding: 0,
                }}
              >
                {ability.name.slice(0, 2).toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
