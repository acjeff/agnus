import { C } from "../constants/theme.js";
import { AGGIE_ACCESSORIES } from "./constants.js";

export function renderAggieSVG(size, mood, animate, accessory, happinessMood) {
  const w = size || 48;
  const isSad = mood === "sad";
  const isHappy = mood === "celebrate";
  const isGrumpy = !mood && (happinessMood === "grumpy" || happinessMood === "miserable");
  const isMiserable = !mood && happinessMood === "miserable";
  const isEcstatic = !mood && happinessMood === "ecstatic";
  const blink = animate ? (isGrumpy ? "blobBlink 5s ease-in-out infinite" : "blobBlink 3.5s ease-in-out infinite") : "none";
  // Normalize accessory input to an array of active IDs
  const accIds = (() => {
    if (!accessory) return [];
    if (typeof accessory === "string") return accessory !== "none" ? [accessory] : [];
    if (Array.isArray(accessory)) return accessory.filter(a => a && a !== "none");
    if (typeof accessory === "object") return Object.values(accessory).filter(a => a && a !== "none");
    return [];
  })();
  const uid = `ag${w}`;

  // Eye color overrides from eye accessories
  const eyeOverrides = {
    "eyes-red": { color: "#ff6666", glow: "#cc3333" },
    "eyes-green": { color: "#66ff88", glow: "#33aa55" },
    "eyes-gold": { color: "#FFD700", glow: "#DAA520" },
  };
  const eyeOv = accIds.reduce((ov, id) => eyeOverrides[id] || ov, null);

  // Glow color overrides from glow accessories
  const glowOverrides = {
    "glow-purple": "#a855f7",
    "glow-cyan": "#22d3ee",
    "glow-pink": "#f472b6",
  };
  const glowColor = accIds.reduce((gc, id) => glowOverrides[id] || gc, null);

  // Dark spirit colors — smoky, shadowy; grumpy = slightly reddish tint
  const bodyCore = isSad ? "#0e0c14" : isGrumpy ? "#100810" : "#0a0810";
  const bodyMid = isSad ? "#16131e" : isGrumpy ? "#18101a" : "#12101a";
  const bodyEdge = isSad ? "#1e1a2a" : isGrumpy ? "#221826" : "#1a1624";
  const eyeColor = eyeOv ? eyeOv.color : isSad ? "#8888aa" : isHappy ? "#f0eeff" : isGrumpy ? "#cc8888" : isEcstatic ? "#f0eeff" : "#dddcf0";
  const eyeGlow = eyeOv ? eyeOv.glow : isSad ? "#5555770" : isHappy ? "#ccc8ff" : isGrumpy ? "#884444" : isEcstatic ? "#ccc8ff" : "#9a96cc";
  const mouthColor = isSad ? "#66668840" : isHappy ? "#dddcf0" : isGrumpy ? "#aa666688" : "#9a96ccaa";

  // Eyes — bright glowing dots peering out of the dark
  const eyes = isHappy || isEcstatic ? (
    <>
      <circle cx="36" cy="44" r="7" fill={eyeGlow} opacity="0.35" filter={`url(#${uid}glow)`} />
      <circle cx="64" cy="44" r="7" fill={eyeGlow} opacity="0.35" filter={`url(#${uid}glow)`} />
      <path d="M31 44 Q36 38 41 44" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M59 44 Q64 38 69 44" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </>
  ) : isSad ? (
    <>
      <circle cx="36" cy="44" r="6" fill={eyeGlow} opacity="0.2" filter={`url(#${uid}glow)`} />
      <circle cx="64" cy="44" r="6" fill={eyeGlow} opacity="0.2" filter={`url(#${uid}glow)`} />
      <circle cx="36" cy="44" r="3.5" fill={eyeColor} />
      <circle cx="64" cy="44" r="3.5" fill={eyeColor} />
    </>
  ) : isMiserable ? (
    // Miserable: half-lidded, narrowed eyes with annoyed look
    <g style={animate ? { transformOrigin: "50px 44px", animation: blink } : undefined}>
      <circle cx="36" cy="46" r="5" fill={eyeGlow} opacity="0.2" filter={`url(#${uid}glow)`} />
      <circle cx="64" cy="46" r="5" fill={eyeGlow} opacity="0.2" filter={`url(#${uid}glow)`} />
      <circle cx="36" cy="46" r="2.5" fill={eyeColor} />
      <circle cx="64" cy="46" r="2.5" fill={eyeColor} />
      {/* Heavy eyelids — droopy, unamused */}
      <path d="M28 43 Q36 40 44 44" stroke={bodyCore} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M56 44 Q64 40 72 43" stroke={bodyCore} strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ) : isGrumpy ? (
    // Grumpy: slightly narrowed, angled brows
    <g style={animate ? { transformOrigin: "50px 44px", animation: blink } : undefined}>
      <circle cx="36" cy="45" r="6" fill={eyeGlow} opacity="0.25" filter={`url(#${uid}glow)`} />
      <circle cx="64" cy="45" r="6" fill={eyeGlow} opacity="0.25" filter={`url(#${uid}glow)`} />
      <circle cx="36" cy="45" r="3" fill={eyeColor} />
      <circle cx="64" cy="45" r="3" fill={eyeColor} />
      {/* Furrowed brows */}
      <path d="M28 38 L44 41" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M72 38 L56 41" stroke={eyeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
    </g>
  ) : (
    <g style={animate ? { transformOrigin: "50px 44px", animation: blink } : undefined}>
      <circle cx="36" cy="44" r="7" fill={eyeGlow} opacity="0.3" filter={`url(#${uid}glow)`} />
      <circle cx="64" cy="44" r="7" fill={eyeGlow} opacity="0.3" filter={`url(#${uid}glow)`} />
      <circle cx="36" cy="44" r="3.5" fill={eyeColor} />
      <circle cx="64" cy="44" r="3.5" fill={eyeColor} />
    </g>
  );

  const mouth = isHappy || isEcstatic
    ? <path d="M42 62 Q50 70 58 62" stroke={mouthColor} strokeWidth="2" strokeLinecap="round" fill="none" />
    : isSad
      ? <path d="M42 66 Q50 61 58 66" stroke={mouthColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      : isMiserable
        ? <path d="M42 66 Q50 60 58 66" stroke={mouthColor} strokeWidth="2" strokeLinecap="round" fill="none" />
        : isGrumpy
          ? <path d="M44 64 L56 64" stroke={mouthColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          : <path d="M44 63 Q50 66 56 63" stroke={mouthColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />;

  // Accessory overlays — positioned on the 100x100 viewBox
  // Render each active accessory as an overlay element
  const accessoryOverlays = {
    "party-hat": (
      <g key="party-hat">
        <polygon points="50,0 34,22 66,22" fill="#7c5cbf" stroke="#9b7ed8" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="40" y1="14" x2="60" y2="14" stroke="#c8f03e" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="50" cy="0" r="3" fill="#c8f03e" />
      </g>
    ),
    "crown": (
      <g key="crown">
        <path d="M28 24 L32 10 L40 20 L50 6 L60 20 L68 10 L72 24Z" fill="#FFD700" stroke="#DAA520" strokeWidth="1" strokeLinejoin="round" />
        <circle cx="40" cy="22" r="2" fill="#DAA520" /><circle cx="50" cy="20" r="2" fill="#DAA520" /><circle cx="60" cy="22" r="2" fill="#DAA520" />
      </g>
    ),
    "top-hat": (
      <g key="top-hat">
        <rect x="32" y="4" width="36" height="22" rx="3" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="1.5" />
        <rect x="26" y="24" width="48" height="5" rx="2" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="1.5" />
        <line x1="34" y1="15" x2="66" y2="15" stroke="#4a4a6a" strokeWidth="1" />
      </g>
    ),
    "beanie": (
      <g key="beanie">
        <path d="M22 28 Q22 6 50 4 Q78 6 78 28" fill="#4a6fa5" stroke="#5a82b8" strokeWidth="1.5" />
        <line x1="22" y1="28" x2="78" y2="28" stroke="#3a5a8a" strokeWidth="2.5" />
        <line x1="26" y1="26" x2="74" y2="26" stroke="#5a82b8" strokeWidth="1" opacity="0.5" />
        <circle cx="50" cy="2" r="4" fill="#5a82b8" />
      </g>
    ),
    "cat-ears": (
      <g key="cat-ears">
        <polygon points="18,28 24,2 38,22" fill="#0e0c14" stroke="#2a2636" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="82,28 76,2 62,22" fill="#0e0c14" stroke="#2a2636" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="22,24 26,8 34,20" fill="#1a1624" opacity="0.6" />
        <polygon points="78,24 74,8 66,20" fill="#1a1624" opacity="0.6" />
      </g>
    ),
    "devil-horns": (
      <g key="devil-horns">
        <path d="M22 28 Q18 14 14 4" stroke="#cc3333" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M78 28 Q82 14 86 4" stroke="#cc3333" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="14" cy="4" r="2.5" fill="#ff4444" />
        <circle cx="86" cy="4" r="2.5" fill="#ff4444" />
      </g>
    ),
    "halo": (
      <g key="halo">
        <ellipse cx="50" cy="6" rx="22" ry="6" fill="none" stroke="#FFD700" strokeWidth="2.5" opacity="0.8" />
        <ellipse cx="50" cy="6" rx="22" ry="6" fill="none" stroke="#FFF8DC" strokeWidth="1" opacity="0.4" />
      </g>
    ),
    "pirate-hat": (
      <g key="pirate-hat">
        <path d="M16 28 Q16 8 50 2 Q84 8 84 28Z" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
        <path d="M16 28 Q50 34 84 28" fill="none" stroke="#333" strokeWidth="1.5" />
        <circle cx="50" cy="18" r="5" fill="none" stroke="#e8e8ef" strokeWidth="1.5" />
        <line x1="47" y1="15" x2="53" y2="21" stroke="#e8e8ef" strokeWidth="1.5" />
        <line x1="53" y1="15" x2="47" y2="21" stroke="#e8e8ef" strokeWidth="1.5" />
      </g>
    ),
    "bandana": (
      <g key="bandana">
        <path d="M18 30 Q18 20 50 18 Q82 20 82 30" fill="#cc4444" stroke="#aa3333" strokeWidth="1.5" />
        <path d="M74 26 L88 36 L82 28" fill="#cc4444" stroke="#aa3333" strokeWidth="1" />
        <circle cx="38" cy="26" r="1.5" fill="#FFD700" /><circle cx="50" cy="24" r="1.5" fill="#FFD700" /><circle cx="62" cy="26" r="1.5" fill="#FFD700" />
      </g>
    ),
    "sunglasses": (
      <g key="sunglasses">
        <rect x="20" y="36" width="22" height="14" rx="3" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="1.5" />
        <rect x="58" y="36" width="22" height="14" rx="3" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="1.5" />
        <line x1="42" y1="42" x2="58" y2="42" stroke="#3a3a5a" strokeWidth="1.5" />
        <line x1="20" y1="42" x2="12" y2="38" stroke="#3a3a5a" strokeWidth="1.5" />
        <line x1="80" y1="42" x2="88" y2="38" stroke="#3a3a5a" strokeWidth="1.5" />
      </g>
    ),
    "monocle": (
      <g key="monocle">
        <circle cx="64" cy="44" r="10" fill="none" stroke="#DAA520" strokeWidth="2" />
        <circle cx="64" cy="44" r="8" fill="none" stroke="#DAA520" strokeWidth="0.5" opacity="0.4" />
        <path d="M70 54 Q74 68 70 80" stroke="#DAA520" strokeWidth="1.5" fill="none" />
      </g>
    ),
    "earrings-gold": (
      <g key="earrings-gold">
        <circle cx="16" cy="54" r="3.5" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
        <circle cx="16" cy="54" r="1.5" fill="#FFF8DC" opacity="0.6" />
        <line x1="18" y1="44" x2="16" y2="50" stroke="#DAA520" strokeWidth="1" />
        <circle cx="84" cy="54" r="3.5" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
        <circle cx="84" cy="54" r="1.5" fill="#FFF8DC" opacity="0.6" />
        <line x1="82" y1="44" x2="84" y2="50" stroke="#DAA520" strokeWidth="1" />
      </g>
    ),
    "earrings-crystal": (
      <g key="earrings-crystal">
        <line x1="18" y1="44" x2="15" y2="52" stroke="#8b6ff0" strokeWidth="1" />
        <polygon points="15,52 11,62 15,60 19,62" fill="#a78bfa" stroke="#8b6ff0" strokeWidth="0.8" />
        <polygon points="15,52 13,57 17,57" fill="#c8b8ff" opacity="0.5" />
        <line x1="82" y1="44" x2="85" y2="52" stroke="#8b6ff0" strokeWidth="1" />
        <polygon points="85,52 81,62 85,60 89,62" fill="#a78bfa" stroke="#8b6ff0" strokeWidth="0.8" />
        <polygon points="85,52 83,57 87,57" fill="#c8b8ff" opacity="0.5" />
      </g>
    ),
  };
  const accessoryEl = accIds.length === 0 ? null : accIds.map(id => accessoryOverlays[id]).filter(Boolean);

  // Smoky body shape
  const bodyPath = "M50 6 C30 6 16 16 10 32 C6 44 8 58 12 68 C18 82 30 92 50 94 C70 92 82 82 88 68 C92 58 94 44 90 32 C84 16 70 6 50 6Z";

  return (
    <svg width={w} height={w} viewBox="0 0 100 100" fill="none">
      <defs>
        {/* Dark smoky body — radial fade from dense core to transparent edge */}
        <radialGradient id={`${uid}body`} cx="50%" cy="45%" r="48%">
          <stop offset="0%" stopColor={bodyCore} />
          <stop offset="20%" stopColor={bodyMid} />
          <stop offset="45%" stopColor={bodyEdge} stopOpacity="0.6" />
          <stop offset="70%" stopColor={bodyEdge} stopOpacity="0.25" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Soft-edge mask — blurred body shape creates feathered boundary */}
        <filter id={`${uid}edge`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <mask id={`${uid}mask`}>
          <path d={bodyPath} fill="white" filter={`url(#${uid}edge)`} />
        </mask>
        {/* Eye glow filter */}
        <filter id={`${uid}glow`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {/* Body glow filter for glow accessories */}
        {glowColor && (
          <filter id={`${uid}bodyglow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        )}
      </defs>

      {/* Glow aura behind body when glow accessory is active */}
      {glowColor && (
        <g>
          <path d={bodyPath} fill={glowColor} opacity="0.25" filter={`url(#${uid}bodyglow)`}>
            {animate && <animate attributeName="opacity" values="0.15;0.3;0.15" dur="3s" repeatCount="indefinite" />}
          </path>
          <path d={bodyPath} fill={glowColor} opacity="0.1" transform="scale(1.1) translate(-5,-5)">
            {animate && <animate attributeName="opacity" values="0.05;0.15;0.05" dur="2.5s" repeatCount="indefinite" />}
          </path>
        </g>
      )}

      {/* Main body — drawn through the soft-edge mask so edges dissolve */}
      <g mask={`url(#${uid}mask)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}body)`} />
      </g>

      {eyes}
      {mouth}
      {accessoryEl}
    </svg>
  );
}

// Render accessory preview only (no body) for grid thumbnails
export function renderAccessoryPreview(accId, size) {
  const w = size || 32;
  const previews = {
    "party-hat": <><polygon points="50,6 36,26 64,26" fill="#7c5cbf" stroke="#9b7ed8" strokeWidth="2" strokeLinejoin="round" /><circle cx="50" cy="6" r="3.5" fill="#c8f03e" /></>,
    "crown": <path d="M24 60 L30 30 L40 48 L50 24 L60 48 L70 30 L76 60Z" fill="#FFD700" stroke="#DAA520" strokeWidth="1.5" strokeLinejoin="round" />,
    "top-hat": <><rect x="30" y="20" width="40" height="36" rx="4" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="2" /><rect x="22" y="54" width="56" height="8" rx="3" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="2" /></>,
    "beanie": <><path d="M20 60 Q20 18 50 14 Q80 18 80 60" fill="#4a6fa5" stroke="#5a82b8" strokeWidth="2" /><circle cx="50" cy="12" r="5" fill="#5a82b8" /></>,
    "cat-ears": <><polygon points="16,70 28,14 46,58" fill="#3a3a4a" stroke="#5a5a6a" strokeWidth="2" /><polygon points="84,70 72,14 54,58" fill="#3a3a4a" stroke="#5a5a6a" strokeWidth="2" /></>,
    "devil-horns": <><path d="M26 70 Q20 40 14 16" stroke="#cc3333" strokeWidth="4.5" strokeLinecap="round" fill="none" /><path d="M74 70 Q80 40 86 16" stroke="#cc3333" strokeWidth="4.5" strokeLinecap="round" fill="none" /><circle cx="14" cy="16" r="4" fill="#ff4444" /><circle cx="86" cy="16" r="4" fill="#ff4444" /></>,
    "halo": <ellipse cx="50" cy="40" rx="30" ry="10" fill="none" stroke="#FFD700" strokeWidth="3.5" opacity="0.8" />,
    "pirate-hat": <><path d="M14 65 Q14 20 50 12 Q86 20 86 65Z" fill="#1a1a1a" stroke="#333" strokeWidth="2" /><circle cx="50" cy="42" r="8" fill="none" stroke="#e8e8ef" strokeWidth="2" /></>,
    "bandana": <><path d="M16 58 Q16 38 50 34 Q84 38 84 58" fill="#cc4444" stroke="#aa3333" strokeWidth="2" /><path d="M76 50 L92 64 L84 54" fill="#cc4444" /></>,
    "sunglasses": <><rect x="16" y="34" width="28" height="20" rx="4" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="2" /><rect x="56" y="34" width="28" height="20" rx="4" fill="#1a1a2e" stroke="#3a3a5a" strokeWidth="2" /><line x1="44" y1="44" x2="56" y2="44" stroke="#3a3a5a" strokeWidth="2" /></>,
    "monocle": <><circle cx="50" cy="42" r="16" fill="none" stroke="#DAA520" strokeWidth="3" /><path d="M58 58 Q64 76 60 90" stroke="#DAA520" strokeWidth="2" fill="none" /></>,
    "earrings-gold": <><circle cx="24" cy="56" r="7" fill="#FFD700" stroke="#DAA520" strokeWidth="1.5" /><circle cx="24" cy="56" r="3" fill="#FFF8DC" opacity="0.6" /><circle cx="76" cy="56" r="7" fill="#FFD700" stroke="#DAA520" strokeWidth="1.5" /><circle cx="76" cy="56" r="3" fill="#FFF8DC" opacity="0.6" /></>,
    "earrings-crystal": <><polygon points="24,36 18,56 24,52 30,56" fill="#a78bfa" stroke="#8b6ff0" strokeWidth="1.5" /><polygon points="24,36 21,46 27,46" fill="#c8b8ff" opacity="0.5" /><polygon points="76,36 70,56 76,52 82,56" fill="#a78bfa" stroke="#8b6ff0" strokeWidth="1.5" /><polygon points="76,36 73,46 79,46" fill="#c8b8ff" opacity="0.5" /></>,
    "glow-purple": <><circle cx="50" cy="50" r="36" fill="#a855f7" opacity="0.25" /><circle cx="50" cy="50" r="28" fill="#a855f7" opacity="0.35" /><circle cx="50" cy="50" r="16" fill="#c084fc" opacity="0.4" /></>,
    "glow-cyan": <><circle cx="50" cy="50" r="36" fill="#22d3ee" opacity="0.25" /><circle cx="50" cy="50" r="28" fill="#22d3ee" opacity="0.35" /><circle cx="50" cy="50" r="16" fill="#67e8f9" opacity="0.4" /></>,
    "glow-pink": <><circle cx="50" cy="50" r="36" fill="#f472b6" opacity="0.25" /><circle cx="50" cy="50" r="28" fill="#f472b6" opacity="0.35" /><circle cx="50" cy="50" r="16" fill="#f9a8d4" opacity="0.4" /></>,
    "eyes-red": <><circle cx="36" cy="48" r="10" fill="#cc3333" opacity="0.3" /><circle cx="36" cy="48" r="5" fill="#ff6666" /><circle cx="64" cy="48" r="10" fill="#cc3333" opacity="0.3" /><circle cx="64" cy="48" r="5" fill="#ff6666" /></>,
    "eyes-green": <><circle cx="36" cy="48" r="10" fill="#33aa55" opacity="0.3" /><circle cx="36" cy="48" r="5" fill="#66ff88" /><circle cx="64" cy="48" r="10" fill="#33aa55" opacity="0.3" /><circle cx="64" cy="48" r="5" fill="#66ff88" /></>,
    "eyes-gold": <><circle cx="36" cy="48" r="10" fill="#DAA520" opacity="0.3" /><circle cx="36" cy="48" r="5" fill="#FFD700" /><circle cx="64" cy="48" r="10" fill="#DAA520" opacity="0.3" /><circle cx="64" cy="48" r="5" fill="#FFD700" /></>,
  };
  return (
    <svg width={w} height={w} viewBox="0 0 100 100" fill="none">
      {previews[accId] || null}
    </svg>
  );
}

// Render shop item icons for Aggie's room preview
export function renderRoomItemIcon(itemId, size) {
  const w = size || 20;
  const icons = {
    "treat": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" fill="#f0a0c0" opacity="0.8" />
        <circle cx="12" cy="12" r="4" fill="#e06090" />
        <circle cx="10" cy="10" r="1.5" fill="#fff" opacity="0.6" />
      </svg>
    ),
    "toy": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="5" width="14" height="14" rx="2" fill="#7c5cbf" stroke="#9b7ed8" strokeWidth="1" />
        <rect x="8" y="8" width="8" height="8" rx="1" fill="#9b7ed8" stroke="#c8b8ff" strokeWidth="0.5" />
        <circle cx="12" cy="12" r="2" fill="#c8b8ff" />
      </svg>
    ),
    "blanket": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <path d="M4 8 Q4 4 8 4 L16 4 Q20 4 20 8 L20 18 Q20 20 18 20 L6 20 Q4 20 4 18Z" fill="#6a8ab8" opacity="0.7" />
        <path d="M6 8 L18 8 M6 12 L18 12 M6 16 L18 16" stroke="#8ab0d8" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
    "music-box": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="8" width="14" height="12" rx="2" fill="#DAA520" stroke="#B8860B" strokeWidth="1" />
        <rect x="5" y="8" width="14" height="4" rx="1" fill="#B8860B" />
        <circle cx="12" cy="16" r="2" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
        <path d="M10 5 Q12 2 14 5" stroke="#DAA520" strokeWidth="1" fill="none" />
        <circle cx="10" cy="5" r="1" fill="#DAA520" /><circle cx="14" cy="5" r="1" fill="#DAA520" />
      </svg>
    ),
    "book": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <rect x="6" y="4" width="12" height="16" rx="1" fill="#4a6fa5" stroke="#3a5a8a" strokeWidth="1" />
        <rect x="8" y="4" width="10" height="16" rx="1" fill="#5a82b8" />
        <line x1="10" y1="8" x2="16" y2="8" stroke="#8ab0d8" strokeWidth="0.8" />
        <line x1="10" y1="11" x2="16" y2="11" stroke="#8ab0d8" strokeWidth="0.8" />
        <line x1="10" y1="14" x2="14" y2="14" stroke="#8ab0d8" strokeWidth="0.8" />
      </svg>
    ),
    "lamp": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="6" fill="#FFD700" opacity="0.25" />
        <circle cx="12" cy="8" r="3" fill="#FFD700" opacity="0.6" />
        <circle cx="12" cy="8" r="1.5" fill="#fff" opacity="0.8" />
        <rect x="10" y="14" width="4" height="6" rx="1" fill="#666" />
        <rect x="8" y="19" width="8" height="2" rx="1" fill="#888" />
      </svg>
    ),
    "plant": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <rect x="8" y="16" width="8" height="6" rx="1" fill="#8B4513" stroke="#6B3410" strokeWidth="0.5" />
        <path d="M12 16 Q8 10 10 6 Q12 4 12 4 Q12 4 14 6 Q16 10 12 16" fill="#2d8a4e" />
        <path d="M12 14 Q15 10 14 7" stroke="#1a6b3a" strokeWidth="0.5" fill="none" />
        <path d="M12 12 Q9 9 10 7" stroke="#1a6b3a" strokeWidth="0.5" fill="none" />
      </svg>
    ),
    "gem": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <polygon points="12,3 20,10 12,21 4,10" fill="#a78bfa" stroke="#8b6ff0" strokeWidth="1" />
        <polygon points="12,3 16,10 12,21" fill="#8b6ff0" opacity="0.6" />
        <line x1="4" y1="10" x2="20" y2="10" stroke="#c8b8ff" strokeWidth="0.5" />
        <polygon points="12,3 8,10 12,10" fill="#c8b8ff" opacity="0.3" />
      </svg>
    ),
    "focus-lens": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" fill="#e0f0ff" opacity="0.4" stroke="#4a9eff" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="3" fill="#4a9eff" opacity="0.5" />
        <circle cx="11" cy="11" r="1" fill="#fff" opacity="0.8" />
        <line x1="16" y1="16" x2="21" y2="21" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    "wisdom-scroll": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <rect x="6" y="3" width="12" height="18" rx="2" fill="#f5e6c8" stroke="#c9a96e" strokeWidth="1" />
        <path d="M6 5 Q4 5 4 7 L4 17 Q4 19 6 19" fill="#e8d5a8" stroke="#c9a96e" strokeWidth="0.5" />
        <line x1="9" y1="8" x2="15" y2="8" stroke="#c9a96e" strokeWidth="0.8" />
        <line x1="9" y1="11" x2="15" y2="11" stroke="#c9a96e" strokeWidth="0.8" />
        <line x1="9" y1="14" x2="13" y2="14" stroke="#c9a96e" strokeWidth="0.8" />
        <circle cx="12" cy="17" r="1.5" fill="#FFD700" opacity="0.6" />
      </svg>
    ),
    "lucky-clover": (
      <svg width={w} height={w} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="4" fill="#2ecc71" opacity="0.7" />
        <circle cx="15" cy="8" r="4" fill="#27ae60" opacity="0.7" />
        <circle cx="9" cy="14" r="4" fill="#27ae60" opacity="0.7" />
        <circle cx="15" cy="14" r="4" fill="#2ecc71" opacity="0.7" />
        <line x1="12" y1="15" x2="12" y2="22" stroke="#1a8a4a" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="11" r="1.5" fill="#fff" opacity="0.4" />
      </svg>
    ),
  };
  return icons[itemId] || null;
}
