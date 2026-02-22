// --- Shape overlays ---
export const shapeStyle = { position: "absolute", inset: 0, margin: "auto" };
export const SHAPES = [
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,5 20,19 4,19" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <line x1="12" y1="5" x2="12" y2="19" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="6" y="6" width="12" height="12" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 14.5,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.5,9.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
    </svg>
  ),
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 18,21 3,9 21,9 6,21" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
    </svg>
  ),
];

// --- Themed shape sets ---
export const CHRISTMAS_SHAPES = [
  // Snowflake
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <line x1="12" y1="4" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="5.1" y1="8" x2="18.9" y2="16" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="5.1" y1="16" x2="18.9" y2="8" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Tree
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,4 19,17 5,17" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  // 4-pointed star
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 14,10 21,12 14,14 12,21 10,14 3,12 10,10" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Bell
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M9,14 L9,9 C9,6.2 10.3,4 12,4 C13.7,4 15,6.2 15,9 L15,14 L17,17 L7,17 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="10.5" y1="17" x2="13.5" y2="17" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Gift box
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="5" y="10" width="14" height="10" rx="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="10" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="5" y1="13" x2="19" y2="13" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M9,10 C9,7 12,6 12,8 C12,6 15,7 15,10" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Candy cane
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M14,20 L14,8 C14,5.2 11,4 9,6" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  // Ornament
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="14" r="6" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="4" x2="12" y2="8" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
];

export const HALLOWEEN_SHAPES = [
  // Pumpkin
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <ellipse cx="12" cy="14" rx="7" ry="6" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="8" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
      <path d="M12,8 C12,5 10,4 9,5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Bat
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M3,8 L7,14 L10,10 L12,14 L14,10 L17,14 L21,8 C19,12 17,14 12,14 C7,14 5,12 3,8 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Ghost
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M7,20 L7,11 C7,7.1 9.2,4 12,4 C14.8,4 17,7.1 17,11 L17,20 L15,18 L13,20 L11,18 L9,20 L7,20 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Spider
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="3.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="9" y1="9" x2="4" y2="4" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="15" y1="9" x2="20" y2="4" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="9" y1="15" x2="4" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="15" y1="15" x2="20" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Skull
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M7,13 C7,8 9,5 12,5 C15,5 17,8 17,13 L17,15 L14,17 L10,17 L7,15 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="10" cy="11" r="1.2" fill={stroke || "rgba(255,255,255,0.8)"}/>
      <circle cx="14" cy="11" r="1.2" fill={stroke || "rgba(255,255,255,0.8)"}/>
    </svg>
  ),
  // Cat
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="14" r="6" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <polygon points="7,10 5,3 10,8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <polygon points="17,10 19,3 14,8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Crescent moon
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M15,4 C11,5 8,8.5 8,12.5 C8,16.5 11,20 15,21 C11,21 6,17 6,12.5 C6,8 11,4 15,4 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
];

export const OCEAN_SHAPES = [
  // Fish
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <ellipse cx="13" cy="12" rx="6" ry="4" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <polygon points="7,12 3,7 3,17" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="16" cy="11" r="1" fill={stroke || "rgba(255,255,255,0.8)"}/>
    </svg>
  ),
  // Shell
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,4 C18,10 18,18 12,20 C6,18 6,10 12,4 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="12" y1="6" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
    </svg>
  ),
  // Wave
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M3,12 C5,8 8,8 10,12 C12,16 15,16 17,12 C19,8 21,8 21,12" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  // Anchor
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="6" r="2.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="8.5" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="7" y1="12" x2="17" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6,17 C6,20 12,21 12,20 C12,21 18,20 18,17" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Starfish
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 13.8,9.5 20.5,9.5 15.2,13.5 17,20 12,16.2 7,20 8.8,13.5 3.5,9.5 10.2,9.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Seahorse
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M14,4 C16,4 17,6 15,8 C13,10 11,12 11,14 C11,17 13,19 15,18 C17,17 16,15 14,15" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="14" cy="5.5" r="0.8" fill={stroke || "rgba(255,255,255,0.8)"}/>
    </svg>
  ),
  // Trident
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <line x1="12" y1="4" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7,9 L7,4" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M17,9 L17,4" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7,9 C7,13 12,13 12,9" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M17,9 C17,13 12,13 12,9" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
    </svg>
  ),
];

export const PASTEL_SHAPES = [
  // Flower (5 petals)
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="7" r="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="16.5" cy="10.5" r="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="14.8" cy="15.5" r="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="9.2" cy="15.5" r="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="7.5" cy="10.5" r="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
    </svg>
  ),
  // Heart
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,20 C12,20 4,14 4,9 C4,6 6.5,4 9,4 C10.5,4 11.5,5 12,6 C12.5,5 13.5,4 15,4 C17.5,4 20,6 20,9 C20,14 12,20 12,20 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Butterfly
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <ellipse cx="8" cy="10" rx="4" ry="5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" transform="rotate(-15 8 10)"/>
      <ellipse cx="16" cy="10" rx="4" ry="5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" transform="rotate(15 16 10)"/>
      <line x1="12" y1="6" x2="12" y2="19" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
    </svg>
  ),
  // Cloud
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M7,16 C4.5,16 3,14.5 3,12.5 C3,10.5 4.5,9 6.5,9 C6.5,6.5 8.5,5 11,5 C13.5,5 15.5,6.5 16,8.5 C18.5,8.5 20.5,10 20.5,12.5 C20.5,14.5 19,16 17,16 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Sun
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="4" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="3" x2="12" y2="6" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="18" x2="12" y2="21" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="12" x2="6" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="12" x2="21" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Leaf
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,4 C17,6 20,12 17,18 C14,22 8,20 6,16 C4,12 7,6 12,4 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12,4 C10,10 8,14 6,16" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Raindrop
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,3 C12,3 5,12 5,16 C5,19.3 8.1,21 12,21 C15.9,21 19,19.3 19,16 C19,12 12,3 12,3 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
];

export const RETRO_SHAPES = [
  // Pixel heart (stepped)
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M6,8 L6,6 L8,6 L8,4 L11,4 L11,6 L13,6 L13,4 L16,4 L16,6 L18,6 L18,8 L20,8 L20,12 L18,12 L18,14 L16,14 L16,16 L14,16 L14,18 L12,18 L12,20 L12,20 L12,18 L10,18 L10,16 L8,16 L8,14 L6,14 L6,12 L4,12 L4,8 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinejoin="miter"/>
    </svg>
  ),
  // Arrow
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M4,10 L14,10 L14,6 L21,12 L14,18 L14,14 L4,14 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="miter"/>
    </svg>
  ),
  // Shield
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,3 L20,7 L20,13 C20,17 16,20 12,21 C8,20 4,17 4,13 L4,7 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Lightning bolt
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="13,3 7,13 11,13 11,21 17,11 13,11" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Sword
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <line x1="12" y1="3" x2="12" y2="17" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="7" y1="14" x2="17" y2="14" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="17" x2="14" y2="17" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5" strokeLinecap="round"/>
      <polygon points="12,3 10,7 14,7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
    </svg>
  ),
  // Coin
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
    </svg>
  ),
  // Key
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="9" cy="8" r="4" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12.5" y1="10.5" x2="19" y2="17" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="19" y2="14" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
];

export const CANDY_SHAPES = [
  // Lollipop
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="9" r="5.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M12,9 C12,6 15,6 15,9 C15,12 12,12 12,9" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <line x1="12" y1="14.5" x2="12" y2="21" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Wrapped candy
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="7" y="8" width="10" height="8" rx="4" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M7,10 L4,7 M7,14 L4,17 M17,10 L20,7 M17,14 L20,17" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  // Cupcake
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M6,13 C6,10 8,8 12,8 C16,8 18,10 18,13" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M6,13 L7.5,20 L16.5,20 L18,13" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M9,8 C9,5 12,3 12,5 C12,3 15,5 15,8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  // Ice cream
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="8" r="5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <polygon points="7.5,12 12,21 16.5,12" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Donut
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
    </svg>
  ),
  // Cookie
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <circle cx="10" cy="9" r="1" fill={stroke || "rgba(255,255,255,0.8)"}/>
      <circle cx="15" cy="10" r="1" fill={stroke || "rgba(255,255,255,0.8)"}/>
      <circle cx="11" cy="14" r="1" fill={stroke || "rgba(255,255,255,0.8)"}/>
      <circle cx="15" cy="15" r="1" fill={stroke || "rgba(255,255,255,0.8)"}/>
    </svg>
  ),
  // Cherry
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="9" cy="16" r="4" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <circle cx="16" cy="14" r="3.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M9,12 C9,7 12,4 14,4 M16,10.5 C16,7 14,4 14,4" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
];

export const VALENTINE_SHAPES = [
  // Heart
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,20 C12,20 4,14 4,9 C4,6 6.5,4 9,4 C10.5,4 11.5,5 12,6 C12.5,5 13.5,4 15,4 C17.5,4 20,6 20,9 C20,14 12,20 12,20 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Arrow through heart
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,19 C12,19 5.5,14 5.5,9.5 C5.5,7 7.5,5.5 9.5,5.5 C10.8,5.5 11.5,6 12,7 C12.5,6 13.2,5.5 14.5,5.5 C16.5,5.5 18.5,7 18.5,9.5 C18.5,14 12,19 12,19 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="3" y1="15" x2="21" y2="5" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
      <polygon points="21,5 17,5.5 20.5,8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  // Rose
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,4 C14,6 16,6 16,9 C16,12 14,13 12,13 C10,13 8,12 8,9 C8,6 10,6 12,4 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M10,9 C10,7 12,6 12,8 C12,6 14,7 14,9" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="13" x2="12" y2="21" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12,16 C10,15 8,16 8,16" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Envelope
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="4" y="7" width="16" height="11" rx="1.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M4,7 L12,13 L20,7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Ring
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="14" r="6" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2.5"/>
      <polygon points="12,3 9,8 15,8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  // Bow/ribbon
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M12,12 C9,9 4,8 5,12 C6,16 11,14 12,12 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12,12 C15,9 20,8 19,12 C18,16 13,14 12,12 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M10,15 L12,21 L14,15" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Lips
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <path d="M4,12 C6,8 9,8 12,10 C15,8 18,8 20,12 C18,16 15,17 12,15 C9,17 6,16 4,12 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
];

export const BIRTHDAY_SHAPES = [
  // Birthday cake
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="5" y="12" width="14" height="8" rx="1.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M5,15 L19,15" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="6.5" r="1.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
    </svg>
  ),
  // Balloon
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <ellipse cx="12" cy="10" rx="5.5" ry="7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <polygon points="10,16.5 12,18 14,16.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12,18 C11,19 13,20 12,21" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Present/gift
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="4" y="10" width="16" height="10" rx="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <rect x="3" y="7" width="18" height="4" rx="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="7" x2="12" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <path d="M8,7 C8,4 12,4 12,7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16,7 C16,4 12,4 12,7" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  // Party hat
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,3 5,20 19,20" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M7,14 L17,14" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6,17 L18,17" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="3" r="1.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
    </svg>
  ),
  // Candle
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="9" y="10" width="6" height="11" rx="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2"/>
      <line x1="12" y1="7" x2="12" y2="10" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12,3 C10.5,5 12,7 12,7 C12,7 13.5,5 12,3 Z" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  // Star burst / sparkle
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="12,2 13.5,9 21,9 15,13.5 17,21 12,16.5 7,21 9,13.5 3,9 10.5,9" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  // Confetti popper
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <polygon points="4,20 8,8 16,16" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="10" y1="6" x2="8" y2="3" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="14" y1="8" x2="17" y2="4" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="12" x2="20" y2="8" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8" cy="3" r="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="20" cy="8" r="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
    </svg>
  ),
];

// --- Enigma machine themed shapes ---
export const ENIGMA_SHAPES = [
  // Rotor / cipher wheel
  (s, stroke) => (
    <svg key="s0" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
      <line x1="12" y1="3" x2="12" y2="6.5" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12" y1="17.5" x2="12" y2="21" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="3" y1="12" x2="6.5" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="17.5" y1="12" x2="21" y2="12" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  // Plugboard / patch panel
  (s, stroke) => (
    <svg key="s1" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="7.5" cy="10" r="1.3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="12" cy="10" r="1.3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="16.5" cy="10" r="1.3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="9.75" cy="14" r="1.3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="14.25" cy="14" r="1.3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <path d="M7.5,10 C7.5,12 14.25,12 14.25,14" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  // Lampboard (lit indicator)
  (s, stroke) => (
    <svg key="s2" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="10" r="6" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <circle cx="12" cy="10" r="2.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5"/>
      <line x1="10" y1="16" x2="14" y2="16" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10.5" y1="18" x2="13.5" y2="18" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="11" y1="20" x2="13" y2="20" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  // Gear / cog
  (s, stroke) => (
    <svg key="s3" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <path d="M12,2 L13.5,5.5 M12,22 L10.5,18.5 M2,12 L5.5,10.5 M22,12 L18.5,13.5 M5.1,5.1 L7.8,7.2 M18.9,18.9 L16.2,16.8 M18.9,5.1 L16.8,7.8 M5.1,18.9 L7.2,16.2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  // Cipher letter (A in a circle)
  (s, stroke) => (
    <svg key="s4" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <path d="M8.5,17 L12,6 L15.5,17 M9.5,14 L14.5,14" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Typewriter key
  (s, stroke) => (
    <svg key="s5" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="12" cy="12" r="2.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
    </svg>
  ),
  // Enigma machine silhouette
  (s, stroke) => (
    <svg key="s6" viewBox="0 0 24 24" width={s} height={s} style={shapeStyle}>
      <rect x="5" y="8" width="14" height="13" rx="1.5" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.8"/>
      <path d="M7,8 L7,5 C7,3.5 8,2.5 10,2.5 L14,2.5 C16,2.5 17,3.5 17,5 L17,8" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="14" x2="19" y2="14" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1.2"/>
      <circle cx="9" cy="11" r="1.2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1"/>
      <circle cx="12" cy="11" r="1.2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1"/>
      <circle cx="15" cy="11" r="1.2" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="1"/>
      <circle cx="9" cy="17.5" r="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="0.8"/>
      <circle cx="12" cy="17.5" r="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="0.8"/>
      <circle cx="15" cy="17.5" r="1" fill="none" stroke={stroke || "rgba(255,255,255,0.8)"} strokeWidth="0.8"/>
    </svg>
  ),
];
