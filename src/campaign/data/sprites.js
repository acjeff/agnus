// Sprite frame definitions for canvas-drawn pixel art
// Each sprite is a 16x16 grid of pixel colors (drawn programmatically)
// null = transparent pixel

// Player character — simple RPG hero sprite
export const PLAYER_SPRITES = {
  down: [
    // Frame 0 — standing
    [
      "..._bbbb_.......",
      "..bbbbbbbb......",
      "..bSSSSSbb......",
      "..bSwSwSbb......",
      "..bSSSSSbb......",
      "..bsMMsbb.......",
      "...bbbbb........",
      "..._ccc_........",
      "..cccccc........",
      "..ccHHcc........",
      "..ccHHcc........",
      "..cc..cc........",
      "..cc..cc........",
      "..pp..pp........",
      "..pp..pp........",
      "................",
    ],
    // Frame 1 — walk left
    [
      "..._bbbb_.......",
      "..bbbbbbbb......",
      "..bSSSSSbb......",
      "..bSwSwSbb......",
      "..bSSSSSbb......",
      "..bsMMsbb.......",
      "...bbbbb........",
      "..._ccc_........",
      "..cccccc........",
      "..ccHHcc........",
      ".cccHHcc........",
      "..cc..cc........",
      "..pp..cc........",
      "..pp..pp........",
      "......pp........",
      "................",
    ],
  ],
  up: [
    [
      "..._bbbb_.......",
      "..bbbbbbbb......",
      "..bbbbbbbb......",
      "..bbbbbbbb......",
      "..bbbbbbbb......",
      "..bbbbbbbb......",
      "...bbbbb........",
      "..._ccc_........",
      "..cccccc........",
      "..ccHHcc........",
      "..ccHHcc........",
      "..cc..cc........",
      "..cc..cc........",
      "..pp..pp........",
      "..pp..pp........",
      "................",
    ],
  ],
  left: [
    [
      "..._bbbb........",
      "..bbbbbb........",
      "..bSSSSb........",
      "..bSwSSb........",
      "..bSSSSb........",
      "..bsMMbb........",
      "...bbbb.........",
      "..._ccc.........",
      "..cccccc........",
      "..cccHcc........",
      "..ccHHcc........",
      "..cc..cc........",
      "..cc..cc........",
      "..pp..pp........",
      "..pp..pp........",
      "................",
    ],
  ],
  right: [
    [
      "........bbbb_...",
      "........bbbbbb..",
      "........bSSSSb..",
      "........bSSwSb..",
      "........bSSSSb..",
      "........bbMMsb..",
      ".........bbbb...",
      ".........ccc_...",
      "........cccccc..",
      "........ccHccc..",
      "........ccHHcc..",
      "........cc..cc..",
      "........cc..cc..",
      "........pp..pp..",
      "........pp..pp..",
      "................",
    ],
  ],
};

// Color legend for sprite strings
export const SPRITE_PALETTE = {
  ".": null, // transparent
  "_": null, // transparent (spacer)
  b: "#4a3728", // hair/outline
  S: "#ffdbac", // skin
  w: "#2a2a4a", // eyes (dark)
  s: "#ffdbac", // skin shadow
  M: "#cc4444", // mouth
  c: "#3a6aaa", // shirt
  H: "#3a6aaa", // shirt highlight
  p: "#4a3a2a", // pants/shoes
};

// Aggie evolution stage sprites (pixel art versions)
export const AGGIE_CAMPAIGN_SPRITES = {
  hatchling: { size: 12, color: "#1a1624", eyeColor: "#dddcf0", glowColor: "#9a96cc" },
  sprout: { size: 14, color: "#1a1624", eyeColor: "#dddcf0", glowColor: "#b0acdf", tendrils: true },
  guardian: { size: 16, color: "#1a1624", eyeColor: "#f0eeff", glowColor: "#ccc8ff", aura: true },
  sage: { size: 16, color: "#1a1624", eyeColor: "#f0eeff", glowColor: "#e0dcff", markings: true, aura: true },
  ascended: { size: 16, color: "#1a1624", eyeColor: "#fff8ff", glowColor: "#fff0ff", crown: true, cosmic: true },
};

// Draw a sprite from string art to a canvas context
export function drawSpriteFromArt(ctx, art, palette, x, y, scale) {
  for (let row = 0; row < art.length; row++) {
    const line = art[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const color = palette[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

// Enemy sprite configs
const ENEMY_CONFIG = {
  slime: { color: "#2a8a4a", eyeColor: "#fff", shadowColor: "#1a5a2a" },
  bat: { color: "#5a3a6a", eyeColor: "#ff4444", shadowColor: "#3a1a4a" },
  skeleton: { color: "#d0c8b8", eyeColor: "#ff2200", shadowColor: "#8a8070" },
  wraith: { color: "#4a2a6a", eyeColor: "#cc88ff", shadowColor: "#2a1a4a" },
};

// Draw an enemy sprite on the canvas
export function drawEnemySprite(ctx, type, x, y, tileSize, frame, hp, maxHp) {
  const config = ENEMY_CONFIG[type] || ENEMY_CONFIG.slime;
  const s = Math.floor(tileSize / 16);
  const cx = x + tileSize / 2;
  const cy = y + tileSize / 2;
  const bobOffset = Math.sin(frame * 0.06 + (type === "bat" ? 1.5 : 0)) * 2 * s;

  if (type === "slime") {
    // Bouncy slime blob
    const squish = 1 + Math.sin(frame * 0.1) * 0.1;
    const r = 6 * s;
    ctx.fillStyle = config.shadowColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bobOffset + 2 * s, r * 1.1, r * 0.4 / squish, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bobOffset, r * squish, r / squish, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = config.color + "88";
    ctx.beginPath();
    ctx.ellipse(cx - 2 * s, cy + bobOffset - 2 * s, 2 * s, 1.5 * s, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = config.eyeColor;
    ctx.beginPath();
    ctx.arc(cx - 2 * s, cy + bobOffset - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2 * s, cy + bobOffset - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(cx - 1.5 * s, cy + bobOffset - 0.5 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2.5 * s, cy + bobOffset - 0.5 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "bat") {
    // Flapping bat
    const wingAngle = Math.sin(frame * 0.15) * 0.6;
    // Body
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bobOffset, 4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.fillStyle = config.color + "cc";
    // Left wing
    ctx.beginPath();
    ctx.moveTo(cx - 3 * s, cy + bobOffset);
    ctx.quadraticCurveTo(cx - 10 * s, cy + bobOffset - 6 * s * (1 + wingAngle), cx - 8 * s, cy + bobOffset + 2 * s);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(cx + 3 * s, cy + bobOffset);
    ctx.quadraticCurveTo(cx + 10 * s, cy + bobOffset - 6 * s * (1 + wingAngle), cx + 8 * s, cy + bobOffset + 2 * s);
    ctx.fill();
    // Eyes
    ctx.fillStyle = config.eyeColor;
    ctx.beginPath();
    ctx.arc(cx - 1.5 * s, cy + bobOffset - 0.5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 1.5 * s, cy + bobOffset - 0.5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "skeleton") {
    // Skeleton — boxy with skull
    const sway = Math.sin(frame * 0.04) * s;
    // Body
    ctx.fillStyle = config.color;
    ctx.fillRect(cx - 3 * s + sway, cy - 2 * s, 6 * s, 8 * s);
    // Ribs
    ctx.fillStyle = config.shadowColor;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 2 * s + sway, cy + i * 2 * s, 4 * s, s);
    }
    // Skull
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(cx + sway, cy - 4 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    // Eye sockets
    ctx.fillStyle = config.eyeColor;
    ctx.fillRect(cx - 2.5 * s + sway, cy - 5 * s, 2 * s, 2 * s);
    ctx.fillRect(cx + 0.5 * s + sway, cy - 5 * s, 2 * s, 2 * s);
    // Jaw
    ctx.fillStyle = config.shadowColor;
    ctx.fillRect(cx - 2 * s + sway, cy - 2 * s, 4 * s, s);
  } else if (type === "wraith") {
    // Ghostly wraith — floating, semi-transparent
    const drift = Math.sin(frame * 0.03) * 2 * s;
    // Ghost body
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.ellipse(cx + drift, cy + bobOffset - 2 * s, 5 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wispy tail
    ctx.beginPath();
    ctx.moveTo(cx - 4 * s + drift, cy + bobOffset + 4 * s);
    ctx.quadraticCurveTo(cx + drift, cy + bobOffset + 10 * s + Math.sin(frame * 0.08) * 2 * s, cx + 4 * s + drift, cy + bobOffset + 4 * s);
    ctx.fill();
    // Eyes
    ctx.globalAlpha = 1;
    ctx.fillStyle = config.eyeColor;
    ctx.beginPath();
    ctx.arc(cx - 2 * s + drift, cy + bobOffset - 3 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2 * s + drift, cy + bobOffset - 3 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // HP bar (if damaged)
  if (hp < maxHp) {
    const barW = tileSize * 0.7;
    const barH = 2 * s;
    const barX = cx - barW / 2;
    const barY = y + 1 * s;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hp / maxHp > 0.5 ? "#4ade80" : hp / maxHp > 0.25 ? "#ffd700" : "#f87171";
    ctx.fillRect(barX, barY, barW * (hp / maxHp), barH);
  }
}

// Draw Aggie pixel sprite based on evolution stage
export function drawAggieSprite(ctx, stage, x, y, tileSize, frame) {
  const config = AGGIE_CAMPAIGN_SPRITES[stage] || AGGIE_CAMPAIGN_SPRITES.hatchling;
  const s = Math.floor(tileSize / 16); // pixel scale
  const cx = x + tileSize / 2;
  const cy = y + tileSize / 2;
  const bobOffset = Math.sin(frame * 0.08) * 2 * s;

  // Glow aura
  if (config.aura) {
    const gradient = ctx.createRadialGradient(cx, cy + bobOffset, 0, cx, cy + bobOffset, tileSize * 0.6);
    gradient.addColorStop(0, config.glowColor + "40");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy + bobOffset, tileSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body — dark blob
  const blobR = (config.size / 2) * s;
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.ellipse(cx, cy + bobOffset, blobR, blobR * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Darker edge
  ctx.fillStyle = "#0a0810";
  ctx.beginPath();
  ctx.ellipse(cx, cy + bobOffset, blobR * 0.85, blobR * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes — glowing dots
  const eyeSpread = blobR * 0.45;
  const eyeY = cy + bobOffset - blobR * 0.1;
  const eyeR = s * 2;

  // Eye glow
  ctx.fillStyle = config.glowColor + "60";
  ctx.beginPath();
  ctx.arc(cx - eyeSpread, eyeY, eyeR * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpread, eyeY, eyeR * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Eye core
  ctx.fillStyle = config.eyeColor;
  ctx.beginPath();
  ctx.arc(cx - eyeSpread, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpread, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Tendrils for sprout+
  if (config.tendrils) {
    ctx.strokeStyle = config.glowColor + "80";
    ctx.lineWidth = s;
    const tendrilWave = Math.sin(frame * 0.06) * 3 * s;
    ctx.beginPath();
    ctx.moveTo(cx - blobR * 0.6, cy + bobOffset - blobR * 0.5);
    ctx.quadraticCurveTo(cx - blobR - 2 * s, cy + bobOffset - blobR + tendrilWave, cx - blobR * 0.3, cy + bobOffset - blobR * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + blobR * 0.6, cy + bobOffset - blobR * 0.5);
    ctx.quadraticCurveTo(cx + blobR + 2 * s, cy + bobOffset - blobR - tendrilWave, cx + blobR * 0.3, cy + bobOffset - blobR * 0.9);
    ctx.stroke();
  }

  // Crown for ascended
  if (config.crown) {
    ctx.fillStyle = "#ffd700";
    const crownY = cy + bobOffset - blobR - 2 * s;
    ctx.fillRect(cx - 4 * s, crownY, 8 * s, 2 * s);
    ctx.fillRect(cx - 4 * s, crownY - 3 * s, 2 * s, 3 * s);
    ctx.fillRect(cx - 1 * s, crownY - 4 * s, 2 * s, 4 * s);
    ctx.fillRect(cx + 2 * s, crownY - 3 * s, 2 * s, 3 * s);
  }

  // Cosmic sparkles for ascended
  if (config.cosmic) {
    ctx.fillStyle = "#fff8ff";
    for (let i = 0; i < 5; i++) {
      const angle = (frame * 0.02 + i * 1.256);
      const dist = blobR * 1.2 + Math.sin(frame * 0.05 + i) * 3 * s;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + bobOffset + Math.sin(angle) * dist;
      const sparkleSize = (Math.sin(frame * 0.1 + i * 2) * 0.5 + 0.5) * s * 1.5;
      ctx.fillRect(sx - sparkleSize / 2, sy - sparkleSize / 2, sparkleSize, sparkleSize);
    }
  }
}
