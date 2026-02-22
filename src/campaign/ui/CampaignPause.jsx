// Campaign pause menu overlay
// Options: Resume, Aggie Status, Inventory, Quit

import React, { useState } from "react";
import { getUnlockedAbilities, getXpProgress, XP_PER_LEVEL, AGGIE_ABILITIES } from "../state/campaignState.js";

const PIXEL_FONT = "'Press Start 2P', monospace";

export default function CampaignPause({
  campaignState,
  chapterName,
  floorIdx,
  onResume,
  onQuit,
  C,
}) {
  const [tab, setTab] = useState("menu"); // "menu" | "aggie" | "inventory"

  const { level, xp, evolutionStage, totalXp } = campaignState.aggie;
  const { coins, keys, potions, accessories } = campaignState.inventory;
  const { totalPuzzlesSolved, totalChestsOpened, totalFloorsCleared } = campaignState.stats;
  const xpProgress = getXpProgress(campaignState);
  const xpNeeded = XP_PER_LEVEL(level);
  const unlockedAbilities = getUnlockedAbilities(campaignState);

  const panelStyle = {
    position: "absolute", inset: 0, zIndex: 30,
    background: "rgba(0,0,0,0.92)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    fontFamily: PIXEL_FONT,
    color: "#e8e8ef",
  };

  const btnStyle = (accent) => ({
    width: "100%", maxWidth: 240, padding: "14px 20px",
    background: accent ? "rgba(154,150,204,0.2)" : "rgba(255,255,255,0.05)",
    border: `2px solid ${accent ? "#9a96cc" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 8, color: accent ? "#dddcf0" : "#aaa",
    fontFamily: PIXEL_FONT, fontSize: 9, cursor: "pointer",
    textAlign: "center", letterSpacing: 1,
  });

  if (tab === "aggie") {
    return (
      <div style={panelStyle}>
        <div style={{ width: "100%", maxWidth: 300, padding: 24 }}>
          <button onClick={() => setTab("menu")} style={{ ...btnStyle(false), width: "auto", marginBottom: 20 }}>
            \u25C0 BACK
          </button>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#dddcf0", marginBottom: 4 }}>AGGIE</div>
            <div style={{ fontSize: 8, color: "#9a96cc", marginBottom: 12, textTransform: "uppercase" }}>
              {evolutionStage} \u2022 Level {level}
            </div>

            {/* XP bar */}
            <div style={{ margin: "0 auto", width: "80%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
              <div style={{ width: `${xpProgress * 100}%`, height: "100%", background: "#9a96cc", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 7, color: "#6b6b8b" }}>
              {xp} / {xpNeeded} XP
            </div>
          </div>

          {/* Abilities */}
          <div style={{ fontSize: 8, color: "#9a96cc", marginBottom: 8 }}>ABILITIES</div>
          {AGGIE_ABILITIES.map(ability => {
            const unlocked = level >= ability.level;
            return (
              <div key={ability.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                opacity: unlocked ? 1 : 0.3,
              }}>
                <div>
                  <div style={{ fontSize: 8, color: unlocked ? "#dddcf0" : "#555" }}>{ability.name}</div>
                  <div style={{ fontSize: 6, color: "#6b6b8b", marginTop: 2 }}>{ability.desc}</div>
                </div>
                <div style={{ fontSize: 7, color: unlocked ? "#4ade80" : "#555" }}>
                  {unlocked ? "\u2713" : `Lv.${ability.level}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tab === "inventory") {
    return (
      <div style={panelStyle}>
        <div style={{ width: "100%", maxWidth: 300, padding: 24 }}>
          <button onClick={() => setTab("menu")} style={{ ...btnStyle(false), width: "auto", marginBottom: 20 }}>
            \u25C0 BACK
          </button>

          <div style={{ fontSize: 10, color: "#dddcf0", marginBottom: 16, textAlign: "center" }}>INVENTORY</div>

          {[
            { icon: "\u25C9", label: "Coins", value: coins, color: "#ffd700" },
            { icon: "\u2737", label: "Keys", value: keys, color: "#88ddff" },
            { icon: "\u2665", label: "Potions", value: potions, color: "#ff6688" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 14, color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 8, color: "#dddcf0", flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 9, color: "#fff" }}>{item.value}</span>
            </div>
          ))}

          {accessories.length > 0 && (
            <>
              <div style={{ fontSize: 8, color: "#9a96cc", marginTop: 16, marginBottom: 8 }}>FOUND ITEMS</div>
              {accessories.map((acc, i) => (
                <div key={i} style={{ fontSize: 7, color: "#aaa", padding: "4px 0" }}>{acc}</div>
              ))}
            </>
          )}

          {/* Stats */}
          <div style={{ fontSize: 8, color: "#9a96cc", marginTop: 16, marginBottom: 8 }}>STATS</div>
          {[
            { label: "Puzzles Solved", value: totalPuzzlesSolved },
            { label: "Chests Opened", value: totalChestsOpened },
            { label: "Floors Cleared", value: totalFloorsCleared },
          ].map(stat => (
            <div key={stat.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "4px 0", fontSize: 7, color: "#aaa",
            }}>
              <span>{stat.label}</span>
              <span style={{ color: "#fff" }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main pause menu
  return (
    <div style={panelStyle}>
      <div style={{
        fontSize: 12, color: "#9a96cc", marginBottom: 8,
        letterSpacing: 2,
      }}>
        PAUSED
      </div>
      <div style={{ fontSize: 7, color: "#6b6b8b", marginBottom: 32 }}>
        {chapterName} \u2022 Floor {floorIdx + 1}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 240 }}>
        <button onClick={onResume} style={btnStyle(true)}>RESUME</button>
        <button onClick={() => setTab("aggie")} style={btnStyle(false)}>AGGIE STATUS</button>
        <button onClick={() => setTab("inventory")} style={btnStyle(false)}>INVENTORY</button>
        <button onClick={onQuit} style={{ ...btnStyle(false), color: "#f87171", borderColor: "#f8717144" }}>
          QUIT TO MENU
        </button>
      </div>
    </div>
  );
}
