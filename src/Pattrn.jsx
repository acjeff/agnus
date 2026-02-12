import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  isFirebaseConfigured,
  subscribeToAuthChanges,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  loadCloudData,
  saveCloudData,
  mergeGameData,
  summariseGameData,
  saveMosaicDesign,
  updateMosaicDesign,
  loadUserMosaics,
  deleteMosaicDesign,
  submitMosaicForReview,
  loadPendingMosaics,
  approveMosaic,
  rejectMosaic,
  loadPublicMosaics,
  shareMosaicWithUser,
  loadSharedMosaics,
  saveUserEmail,
  checkIsAdmin,
  createCoopSession,
  joinCoopSession,
  subscribeToCoopSession,
  updateCoopFill,
  lockInCoopPlayer,
  unlockCoopPlayer,
  updateCoopAttempts,
  completeCoopSession,
  deleteCoopSession,
  loadCoopSession,
  checkUsernameAvailability,
  saveUsername,
  loadUserProfile,
  saveProfilePicture,
  lookupUserByUsername,
  addFriend,
  removeFriend,
  loadFriends,
} from "./firebase.js";

// --- Theme ---
const C = {
  bg: "#0a0a0f",
  surface: "#14141f",
  surfaceLight: "#1e1e2e",
  accent: "#c8f03e",
  text: "#e8e8ef",
  textDim: "#6b6b7b",
  correct: "#4ade80",
  incorrect: "#f87171",
  border: "#2a2a3a",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
  inProgress: "#eab308", // amber for cascade "started but not completed"
};

// --- Shape overlays ---
const shapeStyle = { position: "absolute", inset: 0, margin: "auto" };
const SHAPES = [
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

// --- Color palettes ---
const PALETTES = [
  ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#FF9FF3"],
  ["#E17055", "#00B894", "#0984E3", "#FDCB6E", "#6C5CE7"],
  ["#A8E6CF", "#DCEDC1", "#FFD3B6", "#FFAAA5", "#FF8B94"],
  ["#FF9FF3", "#54A0FF", "#5F27CD", "#01A3A4", "#F368E0"],
  ["#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E", "#00CEC9"],
];

// --- Themed shape sets ---
const CHRISTMAS_SHAPES = [
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

const HALLOWEEN_SHAPES = [
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

const OCEAN_SHAPES = [
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

const PASTEL_SHAPES = [
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

const RETRO_SHAPES = [
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

const CANDY_SHAPES = [
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

const VALENTINE_SHAPES = [
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

const BIRTHDAY_SHAPES = [
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
const ENIGMA_SHAPES = [
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

// --- Themed color palettes ---
const CHRISTMAS_PALETTES = [
  ["#C62828", "#2E7D32", "#FFD700", "#ECEFF1", "#880E4F"],
  ["#D32F2F", "#1B5E20", "#FFC107", "#B71C1C", "#4CAF50"],
  ["#EF5350", "#66BB6A", "#FFEE58", "#CE93D8", "#26A69A"],
  ["#F44336", "#43A047", "#8E24AA", "#00838F", "#E91E63"],
  ["#B71C1C", "#81C784", "#F06292", "#FFD54F", "#00695C"],
];

const HALLOWEEN_PALETTES = [
  ["#FF6D00", "#7B1FA2", "#FFAB00", "#1B5E20", "#BF360C"],
  ["#E65100", "#4A148C", "#00C853", "#FFD600", "#880E4F"],
  ["#FF9800", "#9C27B0", "#76FF03", "#FF1744", "#311B92"],
  ["#EF6C00", "#6A1B9A", "#00E676", "#FF3D00", "#4527A0"],
  ["#F57C00", "#8E24AA", "#AEEA00", "#D50000", "#283593"],
];

const NEON_PALETTES = [
  ["#FF0080", "#00FF80", "#FFFF00", "#8000FF", "#FF4040"],
  ["#FF6EC7", "#39FF14", "#00BFFF", "#FFD300", "#FF073A"],
  ["#F900FF", "#00FFFF", "#FF3131", "#BFFF00", "#7B68EE"],
  ["#FF1493", "#00FF7F", "#FF4500", "#1E90FF", "#ADFF2F"],
  ["#FF00FF", "#00FFCC", "#FFA500", "#7FFF00", "#4169E1"],
];

const OCEAN_PALETTES = [
  ["#0277BD", "#00897B", "#FF7043", "#FDD835", "#0097A7"],
  ["#01579B", "#00695C", "#1565C0", "#F4511E", "#00ACC1"],
  ["#4FC3F7", "#80DEEA", "#FFAB91", "#FFF176", "#26C6DA"],
  ["#039BE5", "#00796B", "#7C4DFF", "#FF6E40", "#00BFA5"],
  ["#0288D1", "#4DB6AC", "#EC407A", "#FFD740", "#006064"],
];

const PASTEL_PALETTES = [
  ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#E8BAFF", "#FFFFBA"],
  ["#FFC8DD", "#BDE0FE", "#A2D2FF", "#CDB4DB", "#CAFFBF"],
  ["#FFADAD", "#FFC6FF", "#BDB2FF", "#A0C4FF", "#FDFFB6"],
  ["#F0DBFF", "#B8F0DB", "#FFE0B8", "#B8D8F0", "#FFB8D8"],
  ["#D4A5FF", "#A5FFD4", "#FFD4A5", "#A5D4FF", "#FFA5D4"],
];

const SUNSET_PALETTES = [
  ["#FF6B35", "#F7931E", "#FFD166", "#C73E1D", "#EF476F"],
  ["#FF7B54", "#FFB26B", "#FFD56F", "#939B62", "#D35400"],
  ["#FCA311", "#E76F51", "#F4A261", "#264653", "#2A9D8F"],
  ["#FF5733", "#FFC300", "#DAF7A6", "#C70039", "#900C3F"],
  ["#E74C3C", "#F39C12", "#F1C40F", "#E67E22", "#D35400"],
];

const MONO_PALETTES = [
  ["#D4D4D8", "#A1A1AA", "#71717A", "#52525B", "#3F3F46"],
  ["#E4E4E7", "#A8A8B0", "#78788A", "#585868", "#404050"],
  ["#C8C8D0", "#9898A8", "#686878", "#484858", "#383848"],
  ["#B8B8C8", "#8888A0", "#606078", "#505068", "#404058"],
  ["#DCDCE4", "#ACACBC", "#7C7C94", "#5C5C74", "#3C3C54"],
];

const RETRO_PALETTES = [
  ["#FF0054", "#00FF9F", "#FF6700", "#00B8FF", "#FFE600"],
  ["#FF2E63", "#08D9D6", "#FF9A3C", "#3D5AF1", "#F2FF49"],
  ["#FF1E56", "#36EEE0", "#FF6B35", "#6979F8", "#FFFD82"],
  ["#E80054", "#00DDC1", "#FF8700", "#4361EE", "#FCFF4B"],
  ["#FF0066", "#00F0B5", "#FF7B00", "#2D7DD2", "#FFE93C"],
];

const FOREST_PALETTES = [
  ["#2D6A4F", "#40916C", "#D4A373", "#8B5E3C", "#588157"],
  ["#344E41", "#3A5A40", "#A3B18A", "#DAD7CD", "#6B4226"],
  ["#1B4332", "#52796F", "#84A98C", "#BC6C25", "#DDA15E"],
  ["#2D6A4F", "#74C69D", "#B07D62", "#264653", "#95D5B2"],
  ["#3A5A40", "#558B6E", "#C9ADA7", "#6B705C", "#A68A64"],
];

const GALAXY_PALETTES = [
  ["#7B2FF7", "#3B82F6", "#06B6D4", "#C084FC", "#F472B6"],
  ["#8B5CF6", "#6366F1", "#0EA5E9", "#D946EF", "#EC4899"],
  ["#A78BFA", "#818CF8", "#38BDF8", "#E879F9", "#F9A8D4"],
  ["#7C3AED", "#4F46E5", "#0284C7", "#C026D3", "#DB2777"],
  ["#6D28D9", "#3730A3", "#0369A1", "#A21CAF", "#BE185D"],
];

const CANDY_PALETTES = [
  ["#FF6B9D", "#C660E8", "#55D6C2", "#FFBC42", "#FF4F7B"],
  ["#FF85A1", "#B76CFD", "#00D4AA", "#FFD93D", "#FF6B6B"],
  ["#FF99C8", "#CB8CFF", "#69D2E7", "#FFE66D", "#FF7EB3"],
  ["#FF7096", "#A855F7", "#34D399", "#FBBF24", "#F87171"],
  ["#FF5C8A", "#9333EA", "#2DD4BF", "#F59E0B", "#EF4444"],
];

const ARCTIC_PALETTES = [
  ["#E0F2FE", "#7DD3FC", "#38BDF8", "#93C5FD", "#C7D2FE"],
  ["#F0F9FF", "#BAE6FD", "#0EA5E9", "#A5B4FC", "#DDD6FE"],
  ["#DBEAFE", "#60A5FA", "#2563EB", "#818CF8", "#E0E7FF"],
  ["#E8F4FD", "#9ED8F7", "#4BA3D0", "#88A0D4", "#C8CCE8"],
  ["#F1F5F9", "#94A3B8", "#0891B2", "#6366F1", "#CBD5E1"],
];

const VALENTINE_PALETTES = [
  ["#FF2D55", "#FF6B8A", "#FFB3C1", "#C9184A", "#FF758F"],
  ["#E11D48", "#FB7185", "#FECDD3", "#9F1239", "#FDA4AF"],
  ["#F43F5E", "#FF8FAB", "#FFD6E0", "#BE123C", "#FF6B8A"],
  ["#FF0A54", "#FF477E", "#FF85A1", "#FF0040", "#FF5C8A"],
  ["#DB2777", "#F472B6", "#FBCFE8", "#9D174D", "#EC4899"],
];

const SPRING_PALETTES = [
  ["#10B981", "#34D399", "#FBBF24", "#F472B6", "#A78BFA"],
  ["#059669", "#6EE7B7", "#F59E0B", "#EC4899", "#8B5CF6"],
  ["#047857", "#4ADE80", "#EAB308", "#D946EF", "#7C3AED"],
  ["#15803D", "#86EFAC", "#FCD34D", "#F9A8D4", "#C4B5FD"],
  ["#166534", "#A7F3D0", "#FDE68A", "#FBCFE8", "#DDD6FE"],
];

const BIRTHDAY_PALETTES = [
  ["#FF6B9D", "#FFD700", "#7B68EE", "#00CED1", "#FF8C00"],
  ["#FF69B4", "#FFC125", "#9370DB", "#40E0D0", "#FF6347"],
  ["#FF85C0", "#FFDF00", "#8A2BE2", "#48D1CC", "#FF7F50"],
  ["#F472B6", "#FFD93D", "#6C5CE7", "#2DD4BF", "#E17055"],
  ["#FF1493", "#FFB300", "#7C3AED", "#06B6D4", "#DC2626"],
];

const GLITCH_PALETTES = [
  ["#FF0040", "#00FFDD", "#FF00FF", "#80FF00", "#FFE000"],
  ["#FF2050", "#00E5CC", "#DD00FF", "#90EE00", "#FF8800"],
  ["#FF3366", "#00CCBB", "#CC00EE", "#AAFF33", "#FF6600"],
  ["#E80060", "#00FFB3", "#AA00FF", "#66FF22", "#FFCC00"],
  ["#FF004D", "#00DDAA", "#BB00DD", "#77FF44", "#FF9900"],
];

const ENIGMA_PALETTES = [
  ["#C9A84C", "#5B6B4A", "#8B7355", "#3D5C5C", "#A0522D"],
  ["#D4AF37", "#4A5D3C", "#9E8B6E", "#2F4F4F", "#B87333"],
  ["#BFA14A", "#6B7F5E", "#7D6B52", "#4A7070", "#8B6914"],
  ["#E8C547", "#546B46", "#A67B5B", "#365656", "#CD853F"],
  ["#B8960C", "#3E5432", "#6F5B3E", "#527A7A", "#946B2D"],
];

// --- Build color map from original palettes to themed palettes ---
function buildColorMap(themePalettes) {
  if (!themePalettes) return null;
  const map = {};
  for (let i = 0; i < PALETTES.length; i++) {
    for (let j = 0; j < PALETTES[i].length; j++) {
      const orig = PALETTES[i][j];
      if (!map[orig]) map[orig] = themePalettes[i][j];
    }
  }
  return map;
}

// --- Puzzle theme definitions ---
const PUZZLE_THEMES = [
  {
    id: "classic",
    name: "Classic",
    desc: "The original Agnus look",
    icon: null,
    palettes: null,
    shapes: null,
    decoration: null,
    gridBg: null,
    gridBorder: null,
    unlock: null,
  },
  {
    id: "christmas",
    name: "Christmas",
    desc: "Festive reds, greens & gold",
    icon: "\uD83C\uDF84",
    palettes: CHRISTMAS_PALETTES,
    shapes: CHRISTMAS_SHAPES,
    decoration: "snow",
    gridBg: "#0d1a12",
    gridBorder: "#2E7D3266",
    unlock: { seasonal: 12, achievement: "streak_7" },
  },
  {
    id: "halloween",
    name: "Halloween",
    desc: "Spooky oranges & purples",
    icon: "\uD83C\uDF83",
    palettes: HALLOWEEN_PALETTES,
    shapes: HALLOWEEN_SHAPES,
    decoration: "bats",
    gridBg: "#14080a",
    gridBorder: "#7B1FA266",
    unlock: { seasonal: 10, achievement: "total_100" },
  },
  {
    id: "neon",
    name: "Neon",
    desc: "Electric glow in the dark",
    icon: "\u26A1",
    palettes: NEON_PALETTES,
    shapes: null,
    decoration: "glow",
    gridBg: "#050510",
    gridBorder: "#FF008066",
    unlock: { achievement: "gold_25" },
  },
  {
    id: "ocean",
    name: "Ocean",
    desc: "Deep sea blues & corals",
    icon: "\uD83C\uDF0A",
    palettes: OCEAN_PALETTES,
    shapes: OCEAN_SHAPES,
    decoration: "bubbles",
    gridBg: "#071318",
    gridBorder: "#0277BD44",
    unlock: { achievement: "med_50" },
  },
  // --- Easy unlocks ---
  {
    id: "pastel",
    name: "Pastel",
    desc: "Soft & dreamy colours",
    icon: "\uD83C\uDF38",
    palettes: PASTEL_PALETTES,
    shapes: PASTEL_SHAPES,
    decoration: "petals",
    gridBg: "#18141e",
    gridBorder: "#E8BAFF44",
    unlock: { achievement: "first_try" },
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Warm golden hour vibes",
    icon: "\uD83C\uDF05",
    palettes: SUNSET_PALETTES,
    shapes: null,
    decoration: "rays",
    gridBg: "#1a120a",
    gridBorder: "#FF6B3544",
    unlock: { achievement: "easy_5" },
  },
  {
    id: "mono",
    name: "Monochrome",
    desc: "Elegant shades of grey",
    icon: "\u25D1",
    palettes: MONO_PALETTES,
    shapes: null,
    decoration: null,
    gridBg: "#111114",
    gridBorder: "#52525B44",
    unlock: { achievement: "under_30" },
  },
  // --- Medium unlocks ---
  {
    id: "retro",
    name: "Retro Arcade",
    desc: "80s pixel power",
    icon: "\uD83D\uDD79\uFE0F",
    palettes: RETRO_PALETTES,
    shapes: RETRO_SHAPES,
    decoration: "scanlines",
    gridBg: "#0a0a14",
    gridBorder: "#FF005444",
    unlock: { achievement: "med_5" },
  },
  {
    id: "forest",
    name: "Forest",
    desc: "Deep woodland greens",
    icon: "\uD83C\uDF32",
    palettes: FOREST_PALETTES,
    shapes: null,
    decoration: "leaves",
    gridBg: "#0c140e",
    gridBorder: "#2D6A4F44",
    unlock: { achievement: "streak_3" },
  },
  {
    id: "galaxy",
    name: "Galaxy",
    desc: "Cosmic purples & stardust",
    icon: "\uD83C\uDF0C",
    palettes: GALAXY_PALETTES,
    shapes: null,
    decoration: "stars",
    gridBg: "#080810",
    gridBorder: "#7B2FF744",
    unlock: { achievement: "gold_10" },
  },
  {
    id: "candy",
    name: "Candy Shop",
    desc: "Sweet treats & bright pinks",
    icon: "\uD83C\uDF6C",
    palettes: CANDY_PALETTES,
    shapes: CANDY_SHAPES,
    decoration: "sprinkles",
    gridBg: "#1a0e16",
    gridBorder: "#FF6B9D44",
    unlock: { achievement: "cascade_1" },
  },
  // --- Harder / Seasonal unlocks ---
  {
    id: "arctic",
    name: "Arctic",
    desc: "Icy blues & northern lights",
    icon: "\u2744\uFE0F",
    palettes: ARCTIC_PALETTES,
    shapes: null,
    decoration: "aurora",
    gridBg: "#060d14",
    gridBorder: "#38BDF844",
    unlock: { seasonal: 1, achievement: "hard_5" },
  },
  {
    id: "valentine",
    name: "Valentine",
    desc: "Hearts, roses & love",
    icon: "\u2764\uFE0F",
    palettes: VALENTINE_PALETTES,
    shapes: VALENTINE_SHAPES,
    decoration: "hearts",
    gridBg: "#1a0a10",
    gridBorder: "#FF2D5544",
    unlock: { seasonal: 2, achievement: "daily_7" },
  },
  {
    id: "spring",
    name: "Spring",
    desc: "Fresh blossoms & sunshine",
    icon: "\uD83C\uDF3C",
    palettes: SPRING_PALETTES,
    shapes: PASTEL_SHAPES,
    decoration: "springPetals",
    gridBg: "#0a1410",
    gridBorder: "#10B98144",
    unlock: { seasonal: [3, 4, 5], achievement: "all_modes" },
  },
  {
    id: "birthday",
    name: "Birthday",
    desc: "Celebrate with confetti & cake",
    icon: "\uD83C\uDF82",
    palettes: BIRTHDAY_PALETTES,
    shapes: BIRTHDAY_SHAPES,
    decoration: "confetti",
    gridBg: "#1a0e18",
    gridBorder: "#FF6B9D44",
    unlock: { achievement: "birthday_puzzle" },
  },
  {
    id: "glitch",
    name: "Glitch",
    desc: "Embrace the beautiful errors",
    icon: "\uD83D\uDC80",
    palettes: GLITCH_PALETTES,
    shapes: null,
    decoration: "static",
    gridBg: "#080008",
    gridBorder: "#FF004044",
    unlock: { achievement: "first_fail" },
  },
  // --- Secret Enigma theme — unlocked via Alan Turing birthday easter egg ---
  {
    id: "enigma",
    name: "Enigma",
    desc: "The code has been broken",
    icon: null,
    palettes: ENIGMA_PALETTES,
    shapes: ENIGMA_SHAPES,
    decoration: "rotors",
    gridBg: "#0c0c08",
    gridBorder: "#C9A84C33",
    unlock: { achievement: "cheat_turing" },
  },
];

function isThemeUnlocked(theme, achievementsList) {
  if (!theme.unlock) return true;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  if (theme.unlock.seasonal) {
    const months = Array.isArray(theme.unlock.seasonal) ? theme.unlock.seasonal : [theme.unlock.seasonal];
    if (months.includes(currentMonth)) return true;
  }
  if (theme.unlock.achievement && achievementsList) {
    const ach = achievementsList.find(a => a.id === theme.unlock.achievement);
    if (ach && ach.unlocked) return true;
  }
  // Fallback: check saved achievements directly (e.g. cheat_turing persisted via easter egg)
  if (theme.unlock.achievement) {
    try {
      const saved = loadSavedAchievements();
      if (saved.has(theme.unlock.achievement)) return true;
    } catch { /* ignore */ }
  }
  return false;
}

// --- Seeded RNG ---
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function shuffle(arr, r) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// --- Pattern generators (parameterized by grid size) ---
function makeGenerators(sz) {
  const mid = Math.floor(sz / 2);
  const last = sz - 1;
  return [
    // 0: horizontal stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[c % n])),
    // 1: vertical stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[r % n])),
    // 2: diagonal stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + c) % n])),
    // 3: anti-diagonal stripes
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + last - c) % n])),
    // 4: checkerboard
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + c) % 2])),
    // 5: horizontal mirror
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r + Math.min(c, last - c)) % n])),
    // 6: vertical mirror
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.min(r, last - r) + c) % n])),
    // 7: concentric
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.max(Math.abs(r - mid), Math.abs(c - mid)) % n])),
    // 8: diamond distance
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(r - mid) + Math.abs(c - mid)) % n])),
    // 9: cross
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === mid || c === mid) ? p[1] : p[0])),
    // 10: X pattern
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === c || r === last - c) ? p[1] : p[0])),
    // 11: border
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => (r === 0 || r === last || c === 0 || c === last) ? p[1] : p[0])),
    // 12: quadrants
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => { if (r < mid && c < mid) return p[0]; if (r < mid) return p[1]; if (c < mid) return p[2]; return p[3]; })),
    // 13: spiral offset
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r * sz + c + Math.floor(r / 2)) % n])),
    // 14: rows alternate 2-color bands
    (p) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor(r / 2) % 2 === 0 ? c % 2 : (c + 1) % 2])),
    // 15: double mirror (both axes)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.min(r, last - r) + Math.min(c, last - c)) % n])),
    // 16: radial (distance from center)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.round(Math.sqrt((r - mid) ** 2 + (c - mid) ** 2)) % n])),
    // 17: pinwheel
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => { const dr = r - mid; const dc = c - mid; const angle = (Math.atan2(dr, dc) / Math.PI + 1) * n / 2; return p[Math.floor(angle) % n]; })),
    // 18: zigzag rows
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r % 2 === 0 ? c : last - c) % n])),
    // 19: corner gradient
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor((r + c) * n / (sz * 2 - 2)) % n])),
    // 20: chevron (V-bands pointing down from top center)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(c - mid) + r) % n])),
    // 21: brick stagger (offset every other row like a brick wall)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(c + (r % 2) * Math.ceil(sz / 2)) % n])),
    // 22: sine wave (wavy vertical bands via sinusoidal row offset)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[((c + Math.round(Math.sin(r / sz * Math.PI * 2) * mid / 2)) % n + n) % n])),
    // 23: diagonal blocks (chunky 2x2 block diagonal)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.floor(r / 2) + Math.floor(c / 2)) % n])),
    // 24: XOR fractal (Sierpinski-like irregular pattern)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r ^ c) % n])),
    // 25: corner layers (L-shaped layers from top-left corner)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.min(r, c) % n])),
    // 26: wide staircase (thick diagonal step bands)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[Math.floor((r + c) / 2) % n])),
    // 27: steep diagonal (steeper angle than regular diagonal)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(r * 2 + c) % n])),
    // 28: horizontal chevron (sideways V-bands from left center)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[(Math.abs(r - mid) + c) % n])),
    // 29: wave rows (wavy horizontal bands via sinusoidal column offset)
    (p, n) => Array.from({ length: sz }, (_, r) => Array.from({ length: sz }, (_, c) => p[((r + Math.round(Math.sin(c / sz * Math.PI * 2) * mid / 2)) % n + n) % n])),
  ];
}

const GENERATORS_5 = makeGenerators(5);
const GENERATORS_7 = makeGenerators(7);

const TWO_COLOR_GENS = new Set([4, 9, 10, 11, 14]);
const FOUR_COLOR_GEN = 12;
const STRIPE_GENS = new Set([0, 1, 2, 3]);

// Weighted generator selection (stripes get low weight)
const GEN_WEIGHTS = [
  1, 1, 1, 1, 2, 3, 3, 4, 4, 3, 3, 3, 3, 2, 1, 4, 4, 4, 3, 3,
  4, 3, 4, 3, 4, 3, 3, 3, 4, 4,
];

function weightedGenIndex(r) {
  const total = GEN_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = r() * total;
  for (let i = 0; i < GEN_WEIGHTS.length; i++) {
    roll -= GEN_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return GEN_WEIGHTS.length - 1;
}

// --- EASY: 5x5, each shape gets a fixed color, pattern is shapes ---
function buildEasyPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
    const r = rng(i * 6151 + 101);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const genIdx = weightedGenIndex(r);
    const numShapes = TWO_COLOR_GENS.has(genIdx) ? 2
      : genIdx === FOUR_COLOR_GEN ? 4
      : 2 + Math.floor(r() * 2);
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_5[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    const numBlanks = Math.min(4 + Math.floor(i / 5), 10);
    const allCells = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 5, mode: "easy" });
  }
  return puzzles;
}

// --- MEDIUM: 7x7, shapes+colors always paired, always 3 tile types ---
function buildMediumPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
    const r = rng(i * 7919 + 42);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
    const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
    const totalW = validWeights.reduce((a, b) => a + b, 0);
    let roll = r() * totalW;
    let genIdx = validGens[validGens.length - 1];
    for (let vi = 0; vi < validGens.length; vi++) {
      roll -= validWeights[vi];
      if (roll <= 0) { genIdx = validGens[vi]; break; }
    }
    const numShapes = 3;
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_7[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    const numBlanks = Math.min(10 + Math.floor(i / 3), 24);
    const allCells = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 7, mode: "medium" });
  }
  return puzzles;
}

// --- HARD: 7x7, independent color + shape patterns ---
function buildHardPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
    const r = rng(i * 10007 + 777);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);

    const colorGenIdx = weightedGenIndex(r);
    const numColors = TWO_COLOR_GENS.has(colorGenIdx) ? 2
      : colorGenIdx === FOUR_COLOR_GEN ? 4
      : 2 + Math.floor(r() * 2);
    const colorGrid = GENERATORS_7[colorGenIdx](pal, numColors);

    let shapeGrid;
    const shapeGenIdx = weightedGenIndex(r);
    const numShapes = TWO_COLOR_GENS.has(shapeGenIdx) ? 2
      : shapeGenIdx === FOUR_COLOR_GEN ? Math.min(4, SHAPES.length)
      : 2 + Math.floor(r() * 2);
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    shapeGrid = GENERATORS_7[shapeGenIdx](shapeIndices, numShapes);

    const solution = colorGrid.map((row, ri) => row.map((color, ci) => `${color}|${shapeGrid[ri][ci]}`));

    const numBlanks = Math.min(20 + Math.floor(i / 4), 28);
    const allCells = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 7, mode: "hard" });
  }
  return puzzles;
}

// --- BLIND: 5x5, all cells blank, wordle-style feedback, min 3 tile types ---
function buildBlindPuzzles() {
  const puzzles = [];
  // Only generators that support 3+ values
  const validGens = GENERATORS_5.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN);
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < 50; i++) {
    const r = rng(i * 13331 + 999);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);

    let roll = r() * totalW;
    let genIdx = validGens[validGens.length - 1];
    for (let vi = 0; vi < validGens.length; vi++) {
      roll -= validWeights[vi];
      if (roll <= 0) { genIdx = validGens[vi]; break; }
    }

    const numShapes = 3 + Math.floor(r() * 2); // 3 or 4
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_5[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));

    // ALL cells are blank
    const allCells = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(allCells);

    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 5, mode: "blind" });
  }
  return puzzles;
}

// --- Daily: index 0 = today, 1 = yesterday, ... 49 = 49 days ago (UTC); dates in dd-mm-yyyy ---
function getDateString(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDailySeedForIndex(i) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const thatDayMs = todayStart.getTime() - i * 86400000;
  const thatDay = new Date(thatDayMs);
  const midnightUtc = Date.UTC(thatDay.getUTCFullYear(), thatDay.getUTCMonth(), thatDay.getUTCDate(), 0, 0, 0, 0);
  return Math.floor(midnightUtc / 1000);
}

function getDailyDateLabel(i) {
  const ts = getDailySeedForIndex(i) * 1000;
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function buildDailyPuzzle(seed) {
  const r = rng(seed);
  const palIdx = Math.floor(r() * PALETTES.length);
  const pal = shuffle(PALETTES[palIdx], r);
  const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);
  let roll = r() * totalW;
  let genIdx = validGens[validGens.length - 1];
  for (let vi = 0; vi < validGens.length; vi++) {
    roll -= validWeights[vi];
    if (roll <= 0) { genIdx = validGens[vi]; break; }
  }
  const numShapes = 3;
  const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
  const grid = GENERATORS_7[genIdx](shapeIndices, numShapes);
  const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
  const numBlanks = 14;
  const allCells = [];
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
  const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));
  const usedTokens = [...new Set(solution.flat())];
  return { id: 0, solution, blanks, usedTokens, gridSize: 7, mode: "medium" };
}

function buildDailyPuzzles() {
  return Array.from({ length: 50 }, (_, i) => {
    const p = buildDailyPuzzle(getDailySeedForIndex(i));
    return { ...p, id: i };
  });
}

function getTodayDailyIndex() {
  return 0;
}

function getDailyKey(i) {
  return getDailySeedForIndex(i);
}

function getDailySeedForDate(dateStr) {
  const [day, month, year] = dateStr.split("-").map(Number);
  const midnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  // Use Math.abs so pre-1970 dates (negative timestamps) still produce valid seeds
  return Math.abs(Math.floor(midnightUtc / 1000)) || 1;
}

function getTodayDailyDateStr() {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = now.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDailyStreak(progress) {
  const daily = progress.daily || {};
  if ((daily[getDailyKey(0)] ?? 0) <= 0) return 0;
  let streak = 1;
  for (let i = 1; i < 50; i++) {
    if ((daily[getDailyKey(i)] ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

// --- CASCADE: 50 runs, each 3×3 → 9×9; attempts persist across levels; progress = how far you got per run ---
const CASCADE_LEVELS = [3, 3, 4, 4, 5, 5, 6, 7, 8, 9]; // gridSize per level 0..9
const CASCADE_RUN_SEED_BASE = 50000;

function formatCascadeProgression(completedUpToLevel, failedAtLevel) {
  // completedUpToLevel: last level we cleared (0..6). failedAtLevel: level we failed (null if run complete).
  const parts = CASCADE_LEVELS.map((sz, i) => {
    const label = `${sz}×${sz}`;
    if (failedAtLevel != null && i === failedAtLevel) return `${label} ✗`;
    if (i <= completedUpToLevel) return `${label} ✓`;
    return null;
  }).filter(Boolean);
  return parts.join(" ");
}

function getCascadeRunSeed(runIndex) {
  return CASCADE_RUN_SEED_BASE + runIndex * 9999;
}

function buildCascadePuzzle(level, runSeed) {
  const sz = CASCADE_LEVELS[level];
  const gens = makeGenerators(sz);
  const r = rng((runSeed ?? 0) * 100 + level);
  const palIdx = Math.floor(r() * PALETTES.length);
  const pal = shuffle(PALETTES[palIdx], r);
  const validGens = gens.map((_, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
  const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
  const totalW = validWeights.reduce((a, b) => a + b, 0);
  let roll = r() * totalW;
  let genIdx = validGens[validGens.length - 1];
  for (let vi = 0; vi < validGens.length; vi++) {
    roll -= validWeights[vi];
    if (roll <= 0) { genIdx = validGens[vi]; break; }
  }
  const numShapes = Math.min(3, sz);
  const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
  const grid = gens[genIdx](shapeIndices, numShapes);
  const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
  const numBlanks = Math.max(1, Math.floor((sz * sz) * 0.25));
  const allCells = [];
  for (let row = 0; row < sz; row++) for (let col = 0; col < sz; col++) allCells.push(`${row}-${col}`);
  const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));
  const usedTokens = [...new Set(solution.flat())];
  return { id: level, solution, blanks, usedTokens, gridSize: sz, mode: "medium" };
}

// --- SPIN: 7x7 paired puzzles, grid rotates 90° periodically ---
function buildSpinPuzzles() {
  const puzzles = [];
  for (let i = 0; i < 50; i++) {
    const r = rng(i * 9001 + 555);
    const palIdx = Math.floor(r() * PALETTES.length);
    const pal = shuffle(PALETTES[palIdx], r);
    const validGens = GENERATORS_7.map((g, idx) => idx).filter(idx => !TWO_COLOR_GENS.has(idx) && idx !== FOUR_COLOR_GEN && !STRIPE_GENS.has(idx));
    const validWeights = validGens.map(idx => GEN_WEIGHTS[idx]);
    const totalW = validWeights.reduce((a, b) => a + b, 0);
    let roll = r() * totalW;
    let genIdx = validGens[validGens.length - 1];
    for (let vi = 0; vi < validGens.length; vi++) {
      roll -= validWeights[vi];
      if (roll <= 0) { genIdx = validGens[vi]; break; }
    }
    const numShapes = 3;
    const shapeIndices = Array.from({ length: numShapes }, (_, k) => k);
    const grid = GENERATORS_7[genIdx](shapeIndices, numShapes);
    const solution = grid.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
    const numBlanks = Math.min(10 + Math.floor(i / 3), 24);
    const allCells = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, r).slice(0, numBlanks));
    const usedTokens = [...new Set(solution.flat())];
    // Spin interval: starts at 10s for puzzle 0, decreases to 5s for puzzle 49
    const spinInterval = Math.max(5, 10 - Math.floor(i / 10));
    puzzles.push({ id: i, solution, blanks, usedTokens, gridSize: 7, mode: "spin", spinInterval });
  }
  return puzzles;
}

// --- MOSAIC: 25 puzzles that tile into a larger 25x25 dog pattern ---
function buildMosaicPuzzles() {
  const mr = rng(42424);
  const palIdx = Math.floor(mr() * PALETTES.length);
  const pal = shuffle(PALETTES[palIdx], mr);
  // 25×25 pixel art dog (front-facing, sitting)
  // 0 = background, 1 = body/fur, 2 = detail (eyes, nose, tongue, collar, inner ears)
  const DOG = [
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,2,2,1,1,1,1,1,1,1,1,1,2,2,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,2,1,2,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,1,1,1,2,1,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];
  const bigSolution = DOG.map(row => row.map(si => `${pal[si % pal.length]}|${si}`));
  // Slice into 25 tiles of 5x5
  const puzzles = [];
  for (let ti = 0; ti < 25; ti++) {
    const tileRow = Math.floor(ti / 5);
    const tileCol = ti % 5;
    const solution = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) {
        row.push(bigSolution[tileRow * 5 + r][tileCol * 5 + c]);
      }
      solution.push(row);
    }
    const rr = rng(ti * 7331 + 4444);
    const numBlanks = Math.min(4 + Math.floor(ti / 2), 12);
    const allCells = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
    const blanks = new Set(shuffle(allCells, rr).slice(0, numBlanks));
    const usedTokens = [...new Set(solution.flat())];
    puzzles.push({ id: ti, solution, blanks, usedTokens, gridSize: 5, mode: "mosaic" });
  }
  return puzzles;
}

const PUZZLE_SETS = {
  easy: buildEasyPuzzles(),
  medium: buildMediumPuzzles(),
  hard: buildHardPuzzles(),
  blind: buildBlindPuzzles(),
  spin: buildSpinPuzzles(),
  mosaic: buildMosaicPuzzles(),
};

// --- Migrate daily data from index-based keys (0-49) to date-based keys (UTC midnight timestamps) ---
function migrateDailyData(daily) {
  if (!daily || typeof daily !== "object") return daily;
  const keys = Object.keys(daily);
  if (keys.length === 0) return daily;
  // Old index-based keys were always 0-49; any key > 49 is a timestamp (even 1970s dates are > 80000)
  if (keys.some(k => Number(k) > 49)) return daily;
  // All keys are 0-49, convert old index-based keys to date-based keys (assumes indices are relative to today)
  const migrated = {};
  for (const k of keys) {
    const idx = parseInt(k, 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 49) continue;
    migrated[getDailyKey(idx)] = daily[k];
  }
  return migrated;
}

// --- Persistent storage using localStorage ---
const STORAGE_KEY = "pattrn-progress-v3";
const TIMES_KEY = "pattrn-times-v1";
const BIRTHDAY_KEY = "pattrn-birthday-v1";
const THEME_KEY = "pattrn-theme-v1";
const ACHIEV_KEY = "pattrn-achievements-v1";
const LOGIN_DISMISS_KEY = "pattrn-login-dismissed-v1";
const CHEAT_BIRTHDAY = "23-06-1912";

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "classic";
  } catch { return "classic"; }
}
function saveTheme(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
}

function loadSavedAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEV_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveSavedAchievements(ids) {
  try { localStorage.setItem(ACHIEV_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}

function normalizeCascadeRunState(entry) {
  if (!entry || entry.level == null) return null;
  return {
    level: entry.level,
    elapsedSeconds: typeof entry.elapsedSeconds === "number" ? entry.elapsedSeconds : 0,
    fills: entry.fills && typeof entry.fills === "object" ? entry.fills : {},
    attempts: typeof entry.attempts === "number" ? entry.attempts : 0,
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    const rawRun = base.cascadeRunState;
    let cascadeRunState = {};
    let cascadeRunStateLastIndex = base.cascadeRunStateLastIndex;
    if (rawRun != null && typeof rawRun === "object") {
      if (typeof rawRun.runIndex === "number") {
        const one = normalizeCascadeRunState(rawRun);
        if (one) {
          cascadeRunState[rawRun.runIndex] = one;
          cascadeRunStateLastIndex = rawRun.runIndex;
        }
      } else {
        for (const [k, v] of Object.entries(rawRun)) {
          const num = parseInt(k, 10);
          if (!Number.isNaN(num)) {
            const one = normalizeCascadeRunState(v);
            if (one) cascadeRunState[num] = one;
          }
        }
        if (cascadeRunStateLastIndex == null && Object.keys(cascadeRunState).length > 0) {
          cascadeRunStateLastIndex = Math.max(...Object.keys(cascadeRunState).map(Number));
        }
      }
    }
    return {
      easy: base.easy ?? {},
      medium: base.medium ?? {},
      hard: base.hard ?? {},
      blind: base.blind ?? {},
      daily: migrateDailyData(base.daily ?? {}),
      cascade: base.cascade ?? {},
      spin: base.spin ?? {},
      mosaic: base.mosaic ?? {},
      coop: base.coop ?? {},
      cascadeRunState,
      cascadeRunStateLastIndex: typeof cascadeRunStateLastIndex === "number" ? cascadeRunStateLastIndex : undefined,
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, mosaic: {}, coop: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

function loadTimes() {
  try {
    const raw = localStorage.getItem(TIMES_KEY);
    const base = raw ? JSON.parse(raw) : {};
    return {
      easy: base.easy ?? {},
      medium: base.medium ?? {},
      hard: base.hard ?? {},
      blind: base.blind ?? {},
      daily: migrateDailyData(base.daily ?? {}),
      cascade: base.cascade ?? {},
      coop: base.coop ?? {},
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, coop: {} };
  }
}

function saveTimes(times) {
  try {
    localStorage.setItem(TIMES_KEY, JSON.stringify(times));
  } catch (e) {
    console.error("Save times failed:", e);
  }
}

function formatTime(seconds) {
  if (seconds == null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function solutionFillsFromPuzzle(puzzle) {
  if (!puzzle?.blanks?.size || !puzzle.solution) return {};
  const fills = {};
  for (const key of puzzle.blanks) {
    const [r, c] = key.split("-").map(Number);
    fills[key] = puzzle.solution[r][c];
  }
  return fills;
}

// --- Helper: parse token ---
function parseToken(token) {
  const idx = token.lastIndexOf("|");
  return { color: token.slice(0, idx), shapeIndex: parseInt(token.slice(idx + 1), 10) };
}

// --- Helper: relative luminance & adaptive shape stroke ---
function hexToLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const _lumCache = {};
function getShapeStroke(bgColor, isEasy) {
  if (!bgColor || bgColor.length !== 7 || bgColor[0] !== "#") {
    return isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)";
  }
  let lum = _lumCache[bgColor];
  if (lum === undefined) { lum = hexToLuminance(bgColor); _lumCache[bgColor] = lum; }
  if (lum > 0.45) return isEasy ? "rgba(30,30,40,0.82)" : "rgba(30,30,40,0.72)";
  return isEasy ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)";
}

// --- Achievements ---
function countModeSolved(mp) { return Object.values(mp || {}).filter(v => v > 0).length; }
function countModeFailed(mp) { return Object.values(mp || {}).filter(v => v === 0).length; }
function countModeGold(mp) { return Object.values(mp || {}).filter(v => v >= 1 && v <= 2).length; }
function countModeFirstTry(mp) { return Object.values(mp || {}).filter(v => v === 1).length; }
function countCascadeClears(cp) { return Object.values(cp || {}).filter(v => v === CASCADE_LEVELS.length).length; }
function countCoopSolved(cp) { return Object.values(cp || {}).filter(v => v > 0).length; }
function countTimesUnder(mt, mp, maxSec) {
  let c = 0;
  for (const [k, t] of Object.entries(mt || {})) { if ((mp || {})[k] > 0 && t < maxSec) c++; }
  return c;
}
function getMaxDailyStreak(progress) {
  const daily = progress.daily || {};
  const seeds = Object.keys(daily).filter(k => daily[k] > 0).map(Number).sort((a, b) => b - a);
  if (seeds.length === 0) return 0;
  let max = 1, run = 1;
  for (let i = 1; i < seeds.length; i++) {
    if (seeds[i - 1] - seeds[i] === 86400) { run++; if (run > max) max = run; }
    else run = 1;
  }
  return max;
}

const ACHIEVEMENT_CATS = [
  { key: "progress", label: "Progress" },
  { key: "mastery", label: "Mastery" },
  { key: "speed", label: "Speed" },
  { key: "special", label: "Special" },
];

const SOLVE_MODES = ["easy", "medium", "hard", "blind", "spin", "mosaic"];

const ACHIEVEMENTS = [
  // Progress — per mode
  { id: "easy_5", cat: "progress", label: "Easy Going", desc: "Solve 5 Easy puzzles", tier: 1, check: (p) => countModeSolved(p.easy) >= 5 },
  { id: "easy_25", cat: "progress", label: "Easy Street", desc: "Solve 25 Easy puzzles", tier: 2, check: (p) => countModeSolved(p.easy) >= 25 },
  { id: "easy_50", cat: "progress", label: "Easy Master", desc: "Solve all 50 Easy", tier: 3, check: (p) => countModeSolved(p.easy) >= 50 },
  { id: "med_5", cat: "progress", label: "Intermediate", desc: "Solve 5 Medium puzzles", tier: 1, check: (p) => countModeSolved(p.medium) >= 5 },
  { id: "med_25", cat: "progress", label: "Seasoned", desc: "Solve 25 Medium puzzles", tier: 2, check: (p) => countModeSolved(p.medium) >= 25 },
  { id: "med_50", cat: "progress", label: "Medium Master", desc: "Solve all 50 Medium", tier: 3, check: (p) => countModeSolved(p.medium) >= 50 },
  { id: "hard_5", cat: "progress", label: "Hardened", desc: "Solve 5 Hard puzzles", tier: 1, check: (p) => countModeSolved(p.hard) >= 5 },
  { id: "hard_25", cat: "progress", label: "Tough Cookie", desc: "Solve 25 Hard puzzles", tier: 2, check: (p) => countModeSolved(p.hard) >= 25 },
  { id: "hard_50", cat: "progress", label: "Hard Master", desc: "Solve all 50 Hard", tier: 3, check: (p) => countModeSolved(p.hard) >= 50 },
  { id: "blind_5", cat: "progress", label: "Blind Faith", desc: "Solve 5 Blind puzzles", tier: 1, check: (p) => countModeSolved(p.blind) >= 5 },
  { id: "blind_25", cat: "progress", label: "Sixth Sense", desc: "Solve 25 Blind puzzles", tier: 2, check: (p) => countModeSolved(p.blind) >= 25 },
  { id: "blind_50", cat: "progress", label: "Blind Master", desc: "Solve all 50 Blind", tier: 3, check: (p) => countModeSolved(p.blind) >= 50 },
  { id: "daily_7", cat: "progress", label: "Regular", desc: "Solve 7 Daily puzzles", tier: 1, check: (p) => countModeSolved(p.daily) >= 7 },
  { id: "daily_25", cat: "progress", label: "Devoted", desc: "Solve 25 Daily puzzles", tier: 2, check: (p) => countModeSolved(p.daily) >= 25 },
  { id: "cascade_1", cat: "progress", label: "Cascade Clear", desc: "Complete a Cascade run", tier: 1, check: (p) => countCascadeClears(p.cascade) >= 1 },
  { id: "cascade_5", cat: "progress", label: "Cascade Crusher", desc: "Complete 5 Cascade runs", tier: 2, check: (p) => countCascadeClears(p.cascade) >= 5 },
  // Mastery
  { id: "first_try", cat: "mastery", label: "First Try", desc: "Solve a puzzle on the first attempt", tier: 1, check: (p) => SOLVE_MODES.some(m => countModeFirstTry(p[m]) >= 1) },
  { id: "sharp_10", cat: "mastery", label: "Sharpshooter", desc: "First-attempt 10 puzzles", tier: 2, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeFirstTry(p[m]), 0) >= 10 },
  { id: "sharp_25", cat: "mastery", label: "Sniper", desc: "First-attempt 25 puzzles", tier: 3, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeFirstTry(p[m]), 0) >= 25 },
  { id: "gold_10", cat: "mastery", label: "Gold Rush", desc: "Earn 10 gold medals", tier: 1, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeGold(p[m]), 0) >= 10 },
  { id: "gold_25", cat: "mastery", label: "Gold Hoard", desc: "Earn 25 gold medals", tier: 2, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeGold(p[m]), 0) >= 25 },
  { id: "gold_50", cat: "mastery", label: "Golden Age", desc: "Earn 50 gold medals", tier: 3, check: (p) => SOLVE_MODES.reduce((s, m) => s + countModeGold(p[m]), 0) >= 50 },
  // Speed
  { id: "under_30", cat: "speed", label: "Quick Solve", desc: "Solve a puzzle under 30 seconds", tier: 1, check: (p, t) => SOLVE_MODES.some(m => countTimesUnder(t[m], p[m], 30) >= 1) },
  { id: "under_10", cat: "speed", label: "Lightning", desc: "Solve a puzzle under 10 seconds", tier: 2, check: (p, t) => SOLVE_MODES.some(m => countTimesUnder(t[m], p[m], 10) >= 1) },
  { id: "hard_u60", cat: "speed", label: "Hard & Fast", desc: "Solve a Hard puzzle under 60s", tier: 1, check: (p, t) => countTimesUnder(t.hard, p.hard, 60) >= 1 },
  { id: "speed_5", cat: "speed", label: "Speed Demon", desc: "Solve 5 puzzles under 30s", tier: 2, check: (p, t) => SOLVE_MODES.reduce((s, m) => s + countTimesUnder(t[m], p[m], 30), 0) >= 5 },
  { id: "blitz_5", cat: "speed", label: "Blitz", desc: "Solve 5 puzzles under 10s", tier: 3, check: (p, t) => SOLVE_MODES.reduce((s, m) => s + countTimesUnder(t[m], p[m], 10), 0) >= 5 },
  // Special
  { id: "streak_3", cat: "special", label: "On a Roll", desc: "3-day daily streak", tier: 1, check: (p) => getMaxDailyStreak(p) >= 3 },
  { id: "streak_7", cat: "special", label: "Week Warrior", desc: "7-day daily streak", tier: 2, check: (p) => getMaxDailyStreak(p) >= 7 },
  { id: "all_modes", cat: "special", label: "Well Rounded", desc: "Solve a puzzle in every mode", tier: 2, check: (p) => SOLVE_MODES.every(m => countModeSolved(p[m]) >= 1) && countModeSolved(p.daily) >= 1 && countCascadeClears(p.cascade) >= 1 },
  { id: "total_100", cat: "special", label: "Centurion", desc: "Solve 100 puzzles total", tier: 3, check: (p) => [...SOLVE_MODES, "daily"].reduce((s, m) => s + countModeSolved(p[m]), 0) + countCascadeClears(p.cascade) >= 100 },
  { id: "birthday_puzzle", cat: "special", label: "Birthday Bash", desc: "Solve your birthday puzzle", tier: 2, check: (p) => { try { const bd = localStorage.getItem(BIRTHDAY_KEY); if (!bd) return false; const seed = getDailySeedForDate(bd); return (p.daily || {})[seed] > 0; } catch { return false; } } },
  { id: "first_fail", cat: "special", label: "Trial & Error", desc: "Fail a puzzle for the first time", tier: 1, check: (p) => SOLVE_MODES.some(m => countModeFailed(p[m]) >= 1) },
  { id: "coop_1", cat: "special", label: "Better Together", desc: "Complete a puzzle in Co-op mode", tier: 1, check: (p) => countCoopSolved(p.coop) >= 1 },
  { id: "cheat_turing", cat: "special", label: "Welcome Back, Alan", desc: "Born on the day the father of computing was born", tier: 3, check: () => false },
];

function computeAchievements(progress, times, savedIds) {
  const saved = savedIds || new Set();
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(progress, times) || saved.has(a.id) }));
}

// --- Components ---

function Cell({ token, isBlank, isSelected, isFilled, isCorrect, isWrong, isRevealed, isLocked, onClick, onPointerDown, onPointerUp, onPointerEnter, cellSize, iconSize, mode, isPrefilled, fallDelay = 0, wrongFallDelay = 0, emptyCellDelay, isWon, winCelebrateDelay = 0, colorMap, shapesArr, isJustPlaced, isRemoving, removingToken, themeId }) {
  const effectiveToken = isRemoving ? removingToken : token;
  const showContent = isRemoving || isRevealed || isLocked || !isBlank || isFilled;
  const parsed = showContent && effectiveToken ? parseToken(effectiveToken) : null;
  const displayColor = parsed ? (colorMap ? (colorMap[parsed.color] || parsed.color) : parsed.color) : null;
  const shapes = shapesArr || SHAPES;
  const isEasy = mode === "easy";
  const isEnigma = themeId === "enigma";
  const fallAnimation = isPrefilled ? `fallIntoPlace 0.5s ${fallDelay}s cubic-bezier(0.34, 1.56, 0.64, 1) both` : "none";
  const wrongAnimation = isWrong ? `fallOff 0.32s ${wrongFallDelay}s cubic-bezier(0.55, 0.09, 0.68, 0.53) forwards` : "none";
  const isEmptyUnfilled = isBlank && !isFilled && !isRevealed && !isLocked && !isRemoving;
  const emptyCellAnimation = isEmptyUnfilled && emptyCellDelay != null ? `emptyCellIn 0.35s ${emptyCellDelay}s ease-out forwards` : "none";
  const winAnimation = isWon && showContent
    ? (isEnigma
      ? `enigmaDecrypt 0.8s ${winCelebrateDelay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`
      : `tilesWinCelebrate 0.6s ${winCelebrateDelay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`)
    : "none";
  const placeAnimation = isJustPlaced ? "blockPlace 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both" : "none";
  const removeAnimation = isRemoving ? "blockRemove 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards" : "none";

  const resolvedAnimation = winAnimation !== "none" ? winAnimation
    : wrongAnimation !== "none" ? wrongAnimation
    : removeAnimation !== "none" ? removeAnimation
    : placeAnimation !== "none" ? placeAnimation
    : emptyCellAnimation !== "none" ? emptyCellAnimation
    : fallAnimation;

  // Enigma theme: circular tiles with brass wiring borders
  const enigmaBorderRadius = "50%";
  const enigmaEmptyBorder = `2px dashed rgba(201,168,76,0.35)`;
  const enigmaFilledBorder = showContent && displayColor
    ? `2px solid rgba(201,168,76,0.5)` : `2px solid rgba(201,168,76,0.2)`;
  const enigmaActiveBorder = isLocked ? `2.5px solid ${C.correct}`
    : isSelected ? `2.5px solid rgba(201,168,76,0.9)`
    : isWrong ? `2.5px solid ${C.incorrect}`
    : isEmptyUnfilled ? enigmaEmptyBorder
    : enigmaFilledBorder;
  const enigmaBoxShadow = isLocked ? `0 0 14px ${C.correct}55, inset 0 0 8px rgba(201,168,76,0.15)`
    : isCorrect ? `0 0 14px ${C.correct}55, inset 0 0 8px rgba(201,168,76,0.15)`
    : isWrong ? `0 0 12px ${C.incorrect}66`
    : isSelected ? `0 0 16px rgba(201,168,76,0.4), inset 0 0 10px rgba(201,168,76,0.12)`
    : showContent && displayColor ? `inset 0 0 6px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.4)` : "none";

  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      style={{
        width: cellSize, height: cellSize,
        borderRadius: isEnigma ? enigmaBorderRadius : (cellSize > 44 ? 10 : 8),
        backgroundColor: showContent && displayColor ? displayColor : (isEnigma ? "rgba(12,12,8,0.7)" : C.surfaceLight),
        border: isEnigma ? enigmaActiveBorder
          : isLocked ? `2.5px solid ${C.correct}`
          : isSelected ? `2.5px solid ${C.accent}`
          : isWrong ? `2.5px solid ${C.incorrect}`
          : isBlank && !isFilled && !isRevealed && !isRemoving ? `2.5px dashed ${C.border}`
          : "2.5px solid transparent",
        cursor: isBlank && !isRevealed && !isLocked ? "pointer" : "default",
        transition: "transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s cubic-bezier(0.4,0,0.2,1)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        opacity: isEmptyUnfilled && emptyCellDelay != null ? 0 : (isBlank && !isFilled && !isRevealed && !isLocked && !isRemoving ? 0.45 : 1),
        boxShadow: isEnigma ? enigmaBoxShadow
          : isLocked ? `0 0 14px ${C.correct}55`
          : isCorrect ? `0 0 14px ${C.correct}55`
          : isWrong ? `0 0 12px ${C.incorrect}66`
          : isSelected ? `0 0 14px ${C.accent}44` : "none",
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none",
        zIndex: isWrong ? 10 : undefined,
        animation: resolvedAnimation,
        outline: isEnigma && showContent && displayColor ? "1px solid rgba(201,168,76,0.12)" : undefined,
        outlineOffset: isEnigma ? "3px" : undefined,
      }}
    >
      {showContent && parsed && shapes[parsed.shapeIndex % shapes.length](iconSize, getShapeStroke(displayColor, isEasy))}
    </div>
  );
}

function TokenPicker({ tokens, selectedToken, onSelect, cellSize, mode, remaining, colorMap, shapesArr, themeId }) {
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
                  fontFamily: "'Space Mono', monospace",
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
      </div>
      {canScrollRight && <button onClick={() => doScroll(1)} style={arrowStyle} aria-label="Scroll right">{"\u203A"}</button>}
    </div>
  );
}

function Particles({ show }) {
  const ref = useRef(null);
  if (!show) return null;
  const ps = Array.from({ length: 24 }, (_, i) => ({
    id: i, x: 50 + (Math.random() - 0.5) * 80, y: 50 + (Math.random() - 0.5) * 80,
    size: 4 + Math.random() * 8, delay: Math.random() * 0.4,
    color: PALETTES[Math.floor(Math.random() * PALETTES.length)][Math.floor(Math.random() * 5)],
  }));
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {ps.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%", backgroundColor: p.color,
          animation: `particlePop 0.8s ${p.delay}s cubic-bezier(0.4,0,0.2,1) forwards`, opacity: 0,
        }} />
      ))}
    </div>
  );
}

// --- Grid decoration overlays ---
const SNOW_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 2 + Math.random() * 4,
  delay: Math.random() * 6,
  duration: 3 + Math.random() * 4,
  drift: -15 + Math.random() * 30,
  opacity: 0.3 + Math.random() * 0.5,
}));

const BAT_PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 5 + Math.random() * 30,
  size: 10 + Math.random() * 8,
  delay: Math.random() * 4,
  duration: 3 + Math.random() * 2,
}));

const BUBBLE_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 3 + Math.random() * 6,
  delay: Math.random() * 5,
  duration: 4 + Math.random() * 3,
  opacity: 0.15 + Math.random() * 0.3,
}));

const PETAL_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 4 + Math.random() * 5,
  delay: Math.random() * 7,
  duration: 4 + Math.random() * 4,
  drift: -20 + Math.random() * 40,
  rotation: Math.random() * 360,
  opacity: 0.25 + Math.random() * 0.35,
}));

const LEAF_PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 6 + Math.random() * 5,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 3,
  drift: -25 + Math.random() * 50,
  opacity: 0.2 + Math.random() * 0.25,
}));

const STAR_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: 5 + Math.random() * 90,
  y: 5 + Math.random() * 90,
  size: 1.5 + Math.random() * 2.5,
  delay: Math.random() * 4,
  duration: 1.5 + Math.random() * 2.5,
  opacity: 0.2 + Math.random() * 0.5,
}));

const SPRINKLE_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  width: 6 + Math.random() * 6,
  rotation: Math.random() * 180,
  color: ["#FF6B9D", "#C660E8", "#55D6C2", "#FFBC42", "#FF4F7B", "#00D4AA"][Math.floor(Math.random() * 6)],
  opacity: 0.15 + Math.random() * 0.2,
}));

const HEART_PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 6 + Math.random() * 6,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 3,
  drift: -10 + Math.random() * 20,
  opacity: 0.12 + Math.random() * 0.18,
}));

const CONFETTI_PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: 3 + Math.random() * 4,
  width: 5 + Math.random() * 7,
  delay: Math.random() * 6,
  duration: 3.5 + Math.random() * 3.5,
  drift: -20 + Math.random() * 40,
  rotation: Math.random() * 360,
  color: ["#FF6B9D", "#FFD700", "#7B68EE", "#00CED1", "#FF8C00", "#FF69B4"][Math.floor(Math.random() * 6)],
  opacity: 0.25 + Math.random() * 0.35,
}));

const ROTOR_PARTICLES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  x: 10 + (i * 20),
  y: 15 + (i % 3) * 25,
  size: 14 + Math.random() * 10,
  duration: 6 + Math.random() * 6,
  delay: i * 1.2,
  direction: i % 2 === 0 ? 1 : -1,
  opacity: 0.08 + Math.random() * 0.07,
}));

function GridDecoration({ decoration }) {
  if (!decoration) return null;

  if (decoration === "snow") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {SNOW_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -8,
            width: p.size, height: p.size, borderRadius: "50%",
            backgroundColor: "#fff", opacity: p.opacity,
            animation: `snowFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
        {/* Tinsel top border */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #C6282800, #C62828 4px, #2E7D32 8px, #FFD700 12px, #2E7D3200 16px)",
          opacity: 0.6, borderRadius: "16px 16px 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #2E7D3200, #FFD700 4px, #C62828 8px, #2E7D32 12px, #C6282800 16px)",
          opacity: 0.6, borderRadius: "0 0 16px 16px",
        }} />
      </div>
    );
  }

  if (decoration === "bats") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {BAT_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size * 0.6} viewBox="0 0 24 14" style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            opacity: 0.25,
            animation: `batFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}>
            <path d="M3,2 L7,8 L10,5 L12,8 L14,5 L17,8 L21,2 C19,6 17,8 12,8 C7,8 5,6 3,2 Z" fill="rgba(255,255,255,0.6)"/>
          </svg>
        ))}
        {/* Web corners */}
        <svg style={{ position: "absolute", top: 0, left: 0, opacity: 0.12 }} width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,0 Q20,5 40,0 M0,0 Q5,20 0,40 M0,0 Q15,15 30,30 M0,0 Q8,20 16,40 M0,0 Q20,8 40,16" fill="none" stroke="white" strokeWidth="0.8"/>
        </svg>
        <svg style={{ position: "absolute", top: 0, right: 0, opacity: 0.12, transform: "scaleX(-1)" }} width="40" height="40" viewBox="0 0 40 40">
          <path d="M0,0 Q20,5 40,0 M0,0 Q5,20 0,40 M0,0 Q15,15 30,30 M0,0 Q8,20 16,40 M0,0 Q20,8 40,16" fill="none" stroke="white" strokeWidth="0.8"/>
        </svg>
      </div>
    );
  }

  if (decoration === "glow") {
    return (
      <div style={{
        position: "absolute", inset: -2, pointerEvents: "none", borderRadius: 18,
        animation: "neonPulse 3s ease-in-out infinite",
        boxShadow: "0 0 15px #FF008044, 0 0 30px #00FF8022, inset 0 0 15px #FF008011",
      }} />
    );
  }

  if (decoration === "bubbles") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {BUBBLE_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, bottom: -10,
            width: p.size, height: p.size, borderRadius: "50%",
            border: "1px solid rgba(100,200,255,0.4)",
            backgroundColor: "rgba(100,200,255,0.08)",
            opacity: p.opacity,
            animation: `bubbleRise ${p.duration}s ${p.delay}s ease-in infinite`,
          }} />
        ))}
        {/* Wave bottom border */}
        <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, opacity: 0.15 }} viewBox="0 0 200 12" preserveAspectRatio="none" height="8">
          <path d="M0,8 C25,2 50,2 75,8 C100,14 125,14 150,8 C175,2 190,2 200,8 L200,12 L0,12 Z" fill="#4FC3F7"/>
        </svg>
      </div>
    );
  }

  if (decoration === "petals") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {PETAL_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -10,
            width: p.size, height: p.size * 0.6, borderRadius: "50% 0 50% 0",
            backgroundColor: "rgba(255,183,197,0.7)",
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            animation: `petalFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
      </div>
    );
  }

  if (decoration === "rays") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,150,50,0.12) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
          background: "linear-gradient(to top, rgba(200,50,50,0.08), transparent)",
        }} />
      </div>
    );
  }

  if (decoration === "scanlines") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
        }} />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.08,
          animation: "scanlineMove 8s linear infinite",
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,255,150,0.1) 50%, transparent 100%)",
          backgroundSize: "100% 30%",
        }} />
      </div>
    );
  }

  if (decoration === "leaves") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {LEAF_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size} viewBox="0 0 12 12" style={{
            position: "absolute", left: `${p.x}%`, top: -12,
            opacity: p.opacity,
            animation: `leafFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }}>
            <path d="M6,1 C9,3 10,7 8,10 C6,12 3,10 2,7 C1,4 3,1 6,1 Z" fill={["#588157", "#A3B18A", "#D4A373", "#40916C"][p.id % 4]} opacity="0.7"/>
          </svg>
        ))}
      </div>
    );
  }

  if (decoration === "stars") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {STAR_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            backgroundColor: "#fff",
            animation: `starTwinkle ${p.duration}s ${p.delay}s ease-in-out infinite`,
            opacity: 0,
          }} />
        ))}
        {/* Nebula tint */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 30% 40%, rgba(123,47,247,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(244,114,182,0.06) 0%, transparent 60%)",
        }} />
      </div>
    );
  }

  if (decoration === "sprinkles") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {SPRINKLE_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.width, height: p.size, borderRadius: p.size,
            backgroundColor: p.color, opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
          }} />
        ))}
      </div>
    );
  }

  if (decoration === "aurora") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "60%",
          background: "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(99,102,241,0.1) 30%, rgba(14,165,233,0.06) 60%, rgba(192,132,252,0.08) 100%)",
          animation: "auroraShift 6s ease-in-out infinite alternate",
        }} />
        <div style={{
          position: "absolute", top: "10%", left: 0, right: 0, height: "40%",
          background: "linear-gradient(45deg, rgba(52,211,153,0.06) 0%, transparent 50%, rgba(56,189,248,0.06) 100%)",
          animation: "auroraShift 8s 2s ease-in-out infinite alternate-reverse",
        }} />
      </div>
    );
  }

  if (decoration === "hearts") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {HEART_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size} viewBox="0 0 12 12" style={{
            position: "absolute", left: `${p.x}%`, bottom: -12,
            opacity: p.opacity,
            animation: `heartFloat ${p.duration}s ${p.delay}s ease-in infinite`,
            "--drift": `${p.drift}px`,
          }}>
            <path d="M6,10 C6,10 2,7 2,4.5 C2,3 3.2,2 4.5,2 C5.3,2 5.7,2.5 6,3 C6.3,2.5 6.7,2 7.5,2 C8.8,2 10,3 10,4.5 C10,7 6,10 6,10 Z" fill={["#FF2D55", "#FF6B8A", "#FFB3C1", "#C9184A"][p.id % 4]} opacity="0.6"/>
          </svg>
        ))}
      </div>
    );
  }

  if (decoration === "springPetals") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {PETAL_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -10,
            width: p.size, height: p.size * 0.6, borderRadius: "50% 0 50% 0",
            backgroundColor: ["rgba(52,211,153,0.6)", "rgba(251,191,36,0.5)", "rgba(244,114,182,0.5)", "rgba(167,139,250,0.5)"][p.id % 4],
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            animation: `petalFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
      </div>
    );
  }

  if (decoration === "confetti") {
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
        {CONFETTI_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: -10,
            width: p.width, height: p.size, borderRadius: 1,
            backgroundColor: p.color, opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s linear infinite`,
            "--drift": `${p.drift}px`,
          }} />
        ))}
        {/* Festive top/bottom borders */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #FF6B9D00, #FF6B9D 4px, #FFD700 8px, #7B68EE 12px, #00CED100 16px)",
          opacity: 0.5, borderRadius: "16px 16px 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: "repeating-linear-gradient(90deg, #7B68EE00, #00CED1 4px, #FF8C00 8px, #FF6B9D 12px, #FFD70000 16px)",
          opacity: 0.5, borderRadius: "0 0 16px 16px",
        }} />
      </div>
    );
  }

  if (decoration === "static") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        {/* CRT scanlines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.12,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
        }} />
        {/* Flicker overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.08,
          backgroundColor: "rgba(255,0,64,0.3)",
          animation: "glitchFlicker 0.15s steps(2) infinite",
        }} />
        {/* Primary glitch scan band - fast */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.25,
          animation: "glitchScan 2s linear infinite",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,0,64,0.3) 45%, rgba(0,255,221,0.3) 55%, transparent 100%)",
          backgroundSize: "100% 15%",
        }} />
        {/* Secondary scan band - offset timing */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.15,
          animation: "glitchScan 3.3s 1s linear infinite reverse",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,0,255,0.25) 48%, rgba(0,255,64,0.2) 52%, transparent 100%)",
          backgroundSize: "100% 10%",
        }} />
        {/* Horizontal glitch displacement bars */}
        <div style={{
          position: "absolute", inset: 0,
          animation: "glitchDisplace 6s steps(1) infinite",
        }}>
          <div style={{
            position: "absolute", left: 0, right: 0, top: "20%", height: 3,
            backgroundColor: "rgba(255,0,64,0.2)",
            boxShadow: "4px 0 0 rgba(0,255,221,0.3), -4px 0 0 rgba(255,0,255,0.3)",
            animation: "glitchBar 4s steps(1) infinite",
          }} />
          <div style={{
            position: "absolute", left: 0, right: 0, top: "65%", height: 2,
            backgroundColor: "rgba(0,255,221,0.15)",
            boxShadow: "3px 0 0 rgba(255,0,64,0.25), -3px 0 0 rgba(255,0,255,0.2)",
            animation: "glitchBar 5.5s 2s steps(1) infinite reverse",
          }} />
        </div>
        {/* RGB split border */}
        <div style={{
          position: "absolute", inset: -1, borderRadius: 17,
          boxShadow: "inset 3px 0 0 rgba(255,0,64,0.25), inset -3px 0 0 rgba(0,255,221,0.25), inset 0 2px 0 rgba(255,0,255,0.15), inset 0 -2px 0 rgba(0,255,64,0.15)",
          animation: "glitchBorder 2s steps(3) infinite",
        }} />
      </div>
    );
  }

  if (decoration === "rotors") {
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden",
      }}>
        {/* Slow drifting dark mechanical background */}
        <div style={{
          position: "absolute", inset: "-40%", width: "180%", height: "180%",
          animation: "enigmaBgDrift 20s ease-in-out infinite alternate",
          background: "radial-gradient(ellipse at 30% 25%, rgba(201,168,76,0.06) 0%, transparent 50%), radial-gradient(ellipse at 75% 70%, rgba(140,107,30,0.05) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(91,107,74,0.04) 0%, transparent 60%)",
        }} />
        {/* Animated wiring layer that slowly moves */}
        <svg style={{ position: "absolute", inset: "-20%", width: "140%", height: "140%", opacity: 0.07, animation: "enigmaWireDrift 25s ease-in-out infinite alternate-reverse" }} viewBox="0 0 200 200" preserveAspectRatio="none">
          <path d="M10,30 C40,10 70,70 110,50 S170,90 150,130 S90,150 50,130 S10,90 30,70" fill="none" stroke="rgba(201,168,76,0.9)" strokeWidth="0.7"/>
          <path d="M190,20 C150,40 170,90 130,110 S70,90 90,50 S130,30 170,50" fill="none" stroke="rgba(201,168,76,0.7)" strokeWidth="0.6"/>
          <path d="M30,170 C70,150 50,110 90,90 S150,110 130,150 S70,180 40,160" fill="none" stroke="rgba(201,168,76,0.6)" strokeWidth="0.5"/>
          <path d="M160,180 C130,160 140,120 100,100 S60,130 80,160" fill="none" stroke="rgba(184,150,12,0.5)" strokeWidth="0.5"/>
        </svg>
        {/* Spinning rotor gears */}
        {ROTOR_PARTICLES.map(p => (
          <svg key={p.id} width={p.size} height={p.size} viewBox="0 0 24 24" style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            opacity: p.opacity,
            animation: `enigmaRotor ${p.duration}s ${p.delay}s linear infinite${p.direction < 0 ? " reverse" : ""}`,
          }}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2"/>
            <circle cx="12" cy="12" r="6" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
            <circle cx="12" cy="12" r="2" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
            {[0,45,90,135,180,225,270,315].map(angle => (
              <line key={angle}
                x1={12 + Math.cos(angle * Math.PI / 180) * 6}
                y1={12 + Math.sin(angle * Math.PI / 180) * 6}
                x2={12 + Math.cos(angle * Math.PI / 180) * 10}
                y2={12 + Math.sin(angle * Math.PI / 180) * 10}
                stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeLinecap="round"
              />
            ))}
          </svg>
        ))}
        {/* Pulsing brass glow */}
        <div style={{
          position: "absolute", inset: -2, borderRadius: 18,
          animation: "enigmaGlow 4s ease-in-out infinite",
          boxShadow: "inset 0 0 20px rgba(201,168,76,0.06), inset 0 0 60px rgba(140,107,30,0.03)",
        }} />
        {/* Brass mechanical border lines */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), rgba(184,150,12,0.4), rgba(201,168,76,0.3), transparent)",
          borderRadius: "16px 16px 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), rgba(184,150,12,0.4), rgba(201,168,76,0.3), transparent)",
          borderRadius: "0 0 16px 16px",
        }} />
      </div>
    );
  }

  return null;
}

function AttemptDots({ max, used, won }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: "50%",
          backgroundColor: i < used ? (won ? C.correct : C.incorrect) : C.border,
          transition: "background-color 0.3s",
        }} />
      ))}
    </div>
  );
}

function ScoreBadge({ attempts }) {
  if (attempts === null || attempts === undefined) return null;
  if (attempts === 0) return <span style={{ color: C.textDim }}>&#x2717;</span>;
  const colors = [null, C.gold, C.gold, C.silver, C.silver, C.bronze];
  const labels = [null, "\u2605", "\u2605", "\u25CF", "\u25CF", "\u25C6"];
  return <span style={{ color: colors[attempts] || C.textDim, fontSize: 14 }}>{labels[attempts] || "\u25C6"}</span>;
}

const DIFFICULTIES = [
  { key: "easy", label: "Easy", desc: "5\u00D75 \u2022 Paired", cat: "classic" },
  { key: "medium", label: "Medium", desc: "7\u00D77 \u2022 Paired", cat: "classic" },
  { key: "hard", label: "Hard", desc: "7\u00D77 \u2022 Mixed", cat: "classic" },
  { key: "blind", label: "Blind", desc: "5\u00D75 \u2022 No Clues", cat: "special" },
  { key: "daily", label: "Daily", desc: "1 a day", cat: "special" },
  { key: "cascade", label: "Cascade", desc: "Keep on", cat: "special" },
  { key: "spin", label: "Spin", desc: "7\u00D77 \u2022 Dizzy", cat: "special" },
  { key: "mosaic", label: "Mosaic", desc: "5\u00D75 \u2022 Big picture", cat: "special" },
];

const MODE_CATEGORIES = ["classic", "special"];
const VALID_MODES = new Set(["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"]);

const VALID_VIEWS = new Set(["gallery", "creator", "custom-mosaic"]);

function getSearchParams() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode");
  const level = params.get("level");
  const date = params.get("date");
  const viewParam = params.get("view");
  const coop = params.get("coop");
  return {
    mode: mode && VALID_MODES.has(mode) ? mode : null,
    level: level != null ? Math.max(0, Math.min(49, parseInt(level, 10) || 0)) : null,
    date: date && /^\d{2}-\d{2}-\d{4}$/.test(date) ? date : null,
    view: viewParam && VALID_VIEWS.has(viewParam) ? viewParam : null,
    coop: coop || null,
  };
}

function updateUrl(mode, level, replace = true, date = null, viewParam = null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (mode === "daily" && date) {
    params.set("date", date);
  } else if (level != null) {
    params.set("level", String(level));
  }
  if (viewParam) params.set("view", viewParam);
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
}

// --- Main App ---
function friendlyAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use": return "An account with this email already exists.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "Password must be at least 6 characters.";
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password.";
    case "auth/invalid-credential": return "Invalid email or password.";
    case "auth/too-many-requests": return "Too many attempts. Please try again later.";
    case "auth/network-request-failed": return "Network error. Check your connection.";
    default: return "Something went wrong. Please try again.";
  }
}

export default function Pattrn() {
  const [view, setView] = useState("menu");
  const [difficulty, setDifficulty] = useState("easy");
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [fills, setFills] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [gameState, setGameState] = useState("playing");
  const [wrongCells, setWrongCells] = useState(new Set());
  const [lockedCells, setLockedCells] = useState(new Set()); // for blind mode
  const [showParticles, setShowParticles] = useState(false);
  const [progress, setProgress] = useState(() => loadProgress());
  const [times, setTimes] = useState(() => loadTimes());
  const [savedAchievementIds, setSavedAchievementIds] = useState(() => loadSavedAchievements());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [shareMsg, setShareMsg] = useState("");
  const [dailyShareMsg, setDailyShareMsg] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [cascadeLevel, setCascadeLevel] = useState(0);
  const [cascadeLives, setCascadeLives] = useState(3);
  const [cascadeRunIndex, setCascadeRunIndex] = useState(0);
  const timerStart = useRef(null);
  const timerInterval = useRef(null);
  const timerIsCascadeRun = useRef(false);
  const cascadeFillsRef = useRef({});
  const cascadeAttemptsRef = useRef(0);
  const cascadeRunIndexRef = useRef(0);
  const isPainting = useRef(false);
  const pendingCellRef = useRef(null);
  const justHandledInPointerUpRef = useRef(null);
  const wrongCellClearTimeoutRef = useRef(null);
  const playViewScrollRef = useRef(null);

  const [currentDailyDate, setCurrentDailyDate] = useState(null); // "dd-mm-yyyy"
  const [calendarYear, setCalendarYear] = useState(() => new Date().getUTCFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getUTCMonth());

  const [clearedBlanks, setClearedBlanks] = useState(() => new Set());
  const [justPlacedCells, setJustPlacedCells] = useState(() => new Set());
  const [removingCells, setRemovingCells] = useState({});
  const removingTimersRef = useRef({});
  const [gridEpoch, setGridEpoch] = useState(0);
  const [spinAngle, setSpinAngle] = useState(0);
  const spinTimerRef = useRef(null);
  const hasSyncedUrl = useRef(false);
  // Birthday: stored as "dd-mm-yyyy" (or "dd-mm" if no year), null if not set
  const [birthday, setBirthday] = useState(() => {
    try { return localStorage.getItem(BIRTHDAY_KEY) || null; } catch { return null; }
  });
  const [showBirthdayPrompt, setShowBirthdayPrompt] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [achievementToast, setAchievementToast] = useState(null); // { label, tier, key }
  const [toastDismissing, setToastDismissing] = useState(false);
  const achievementQueueRef = useRef([]);
  const achievementToastTimer = useRef(null);
  const toastDismissTimer = useRef(null);
  const prevUnlockedRef = useRef(null);
  const [birthdayInput, setBirthdayInput] = useState("");
  const goToDateRef = useRef(null);

  // Theme state
  const [activeThemeId, setActiveThemeId] = useState(() => loadTheme());
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [themeToast, setThemeToast] = useState(null); // { id, name, icon, key }
  const [themeToastDismissing, setThemeToastDismissing] = useState(false);
  const themeToastTimer = useRef(null);
  const prevUnlockedThemesRef = useRef(null);

  const activeTheme = useMemo(() => PUZZLE_THEMES.find(t => t.id === activeThemeId) || PUZZLE_THEMES[0], [activeThemeId]);
  const themeColorMap = useMemo(() => buildColorMap(activeTheme.palettes), [activeTheme]);
  const themedShapes = activeTheme.shapes || SHAPES;

  // --- Account / Firebase state ---
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountTab, setAccountTab] = useState("login"); // "login" | "signup"
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "", "syncing", "synced", "error"
  const cloudSyncInFlight = useRef(false);
  const firebaseConfigured = isFirebaseConfigured();
  const [autoLoginModal, setAutoLoginModal] = useState(false); // true when modal was auto-opened
  const [loginHintToast, setLoginHintToast] = useState(false);
  const [loginHintDismissing, setLoginHintDismissing] = useState(false);
  const loginHintTimer = useRef(null);
  // Sync choice prompt state (shown when both local + cloud data exist on login)
  const [showSyncChoice, setShowSyncChoice] = useState(false);
  const [syncChoiceData, setSyncChoiceData] = useState(null); // { uid, localData, cloudData, localSummary, cloudSummary }

  // --- Username & Profile state ---
  const [username, setUsername] = useState(null); // current user's username
  const [profilePicture, setProfilePicture] = useState(null); // base64 data URL
  const [showUsernameModal, setShowUsernameModal] = useState(false); // mandatory username prompt
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null | true | false
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [profilePictureLoading, setProfilePictureLoading] = useState(false);
  const usernameCheckTimer = useRef(null);
  const hasCheckedUsername = useRef(false);

  // --- Coop mode state ---
  const [coopSessionId, setCoopSessionId] = useState(null);
  const [coopRole, setCoopRole] = useState(null); // "host" | "guest" | null
  const [coopMyBlanks, setCoopMyBlanks] = useState(null); // Set of cell keys assigned to me
  const [coopPartnerBlanks, setCoopPartnerBlanks] = useState(null); // Set of cell keys assigned to partner
  const [coopPartnerFills, setCoopPartnerFills] = useState({}); // partner's fills from Firebase
  const [coopMyLockedIn, setCoopMyLockedIn] = useState(false);
  const [coopPartnerLockedIn, setCoopPartnerLockedIn] = useState(false);
  const [coopPartnerCorrect, setCoopPartnerCorrect] = useState(false);
  const [coopPartnerConnected, setCoopPartnerConnected] = useState(false);
  const [showCoopInvite, setShowCoopInvite] = useState(false); // invite modal
  const [coopStatus, setCoopStatus] = useState(null); // "waiting" | "playing" | "complete"
  const coopUnsubRef = useRef(null); // unsubscribe function for Firebase listener
  const coopWriteThrottleRef = useRef({}); // throttle writes to Firebase
  const coopPendingLoginRef = useRef(false); // auto-start coop after login
  const coopOriginalThemeRef = useRef(null); // guest's original theme before coop override
  const activeThemeIdRef = useRef(activeThemeId); // current theme ref for coop subscription
  activeThemeIdRef.current = activeThemeId;
  const isCoop = !!coopSessionId;

  // --- Mosaic Creator state ---
  const CREATOR_GRID_SIZE = 25; // 25x25 grid → 25 tiles of 5x5, matching mosaic mode
  const CREATOR_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#FF9FF3", "#E17055", "#00B894", "#0984E3", "#FDCB6E", "#A8E6CF", "#FF8B94", "#01A3A4", "#F368E0", "#54A0FF", "#5F27CD", "#ffffff", "#333333"];
  const [creatorGrid, setCreatorGrid] = useState(() => Array.from({ length: 25 }, () => Array(25).fill(null)));
  const [creatorColor, setCreatorColor] = useState("#FF6B6B");
  const [creatorTool, setCreatorTool] = useState("draw"); // "draw" | "fill"
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorEditingId, setCreatorEditingId] = useState(null);
  const creatorPaintingRef = useRef(false);
  const creatorGridRef = useRef(null); // for pointer-move based painting
  const [myMosaics, setMyMosaics] = useState([]);
  const [sharedMosaics, setSharedMosaics] = useState([]);
  const [publicMosaicsList, setPublicMosaicsList] = useState([]);
  const [pendingMosaicsList, setPendingMosaicsList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mosaicLoading, setMosaicLoading] = useState(false);
  const [mosaicMsg, setMosaicMsg] = useState("");
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [shareTargetMosaic, setShareTargetMosaic] = useState(null);
  const [mosaicGalleryTab, setMosaicGalleryTab] = useState("mine"); // "mine" | "shared" | "public"
  const [customMosaicPlay, setCustomMosaicPlay] = useState(null); // mosaic object being played
  const [customMosaicProgress, setCustomMosaicProgress] = useState({}); // { tileIndex: attempts }
  const customMosaicPuzzlesRef = useRef(null); // array of 25 puzzle objects when playing custom mosaic
  const [creatorReturnView, setCreatorReturnView] = useState("menu"); // where to go when leaving creator
  const [friendsList, setFriendsList] = useState([]); // array of { uid, username, profilePicture }
  const [addFriendInput, setAddFriendInput] = useState("");
  const [addFriendMsg, setAddFriendMsg] = useState("");
  const [addFriendLoading, setAddFriendLoading] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsub = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
    });
    return unsub;
  }, [firebaseConfigured]);

  // Check admin status and save email for lookup when user logs in
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) { setIsAdmin(false); return; }
    checkIsAdmin(firebaseUser.uid).then(setIsAdmin).catch(() => setIsAdmin(false));
    if (firebaseUser.email) {
      saveUserEmail(firebaseUser.uid, firebaseUser.email).catch(() => {});
    }
  }, [firebaseUser, firebaseConfigured]);

  // Load username and profile picture when user logs in, prompt if missing
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) {
      setUsername(null);
      setProfilePicture(null);
      hasCheckedUsername.current = false;
      return;
    }
    if (hasCheckedUsername.current) return;
    hasCheckedUsername.current = true;
    loadUserProfile(firebaseUser.uid).then(profile => {
      if (profile?.username) {
        setUsername(profile.username);
        setProfilePicture(profile.profilePicture || null);
      } else {
        // User has no username — show mandatory modal
        setShowUsernameModal(true);
        setProfilePicture(profile?.profilePicture || null);
      }
    }).catch(() => {
      setShowUsernameModal(true);
    });
  }, [firebaseUser, firebaseConfigured]);

  // --- Mosaic Creator helpers ---
  const resetCreator = useCallback(() => {
    setCreatorGrid(Array.from({ length: 25 }, () => Array(25).fill(null)));
    setCreatorTitle("");
    setCreatorEditingId(null);
    setCreatorTool("draw");
  }, []);

  // Pointer-move based painting: uses element coordinates for smooth drag across tiny cells
  const creatorColorRef = useRef("#FF6B6B");
  useEffect(() => { creatorColorRef.current = creatorColor; }, [creatorColor]);
  const creatorToolRef = useRef("draw");
  useEffect(() => { creatorToolRef.current = creatorTool; }, [creatorTool]);

  const getCellFromPointer = useCallback((e) => {
    const el = creatorGridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellPx = rect.width / 25;
    const c = Math.floor(x / cellPx);
    const r = Math.floor(y / cellPx);
    if (r < 0 || r >= 25 || c < 0 || c >= 25) return null;
    return { r, c };
  }, []);

  const creatorFloodFill = useCallback((grid, startR, startC, fillColor) => {
    const targetColor = grid[startR][startC];
    if (targetColor === fillColor) return grid; // already the same color, no-op
    const next = grid.map(row => [...row]);
    const stack = [[startR, startC]];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      if (r < 0 || r >= 25 || c < 0 || c >= 25) continue;
      if (next[r][c] !== targetColor) continue;
      next[r][c] = fillColor;
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
    return next;
  }, []);

  const creatorPointerDown = useCallback((e) => {
    e.preventDefault();
    const cell = getCellFromPointer(e);
    if (!cell) return;
    if (creatorToolRef.current === "fill") {
      setCreatorGrid(g => creatorFloodFill(g, cell.r, cell.c, creatorColorRef.current));
      return;
    }
    creatorPaintingRef.current = true;
    setCreatorGrid(g => {
      const next = g.map(row => [...row]);
      next[cell.r][cell.c] = next[cell.r][cell.c] === creatorColorRef.current ? null : creatorColorRef.current;
      return next;
    });
  }, [getCellFromPointer, creatorFloodFill]);

  const creatorPointerMove = useCallback((e) => {
    if (!creatorPaintingRef.current || creatorToolRef.current === "fill") return;
    const cell = getCellFromPointer(e);
    if (!cell) return;
    setCreatorGrid(g => {
      if (g[cell.r][cell.c] === creatorColorRef.current) return g; // no change needed
      const next = g.map(row => [...row]);
      next[cell.r][cell.c] = creatorColorRef.current;
      return next;
    });
  }, [getCellFromPointer]);

  const creatorPointerUp = useCallback(() => {
    creatorPaintingRef.current = false;
  }, []);

  // Build playable 25 puzzle tiles from a custom 25x25 color grid
  const buildCustomMosaicPuzzles = useCallback((grid) => {
    const bgColor = "#1a1a2e"; // background color for null cells
    // Collect unique colors to assign shape indices
    const colorSet = new Set();
    for (const row of grid) for (const c of row) colorSet.add(c || bgColor);
    const colorList = [...colorSet];
    const colorToShape = {};
    colorList.forEach((c, i) => { colorToShape[c] = i % 7; });
    // Build 25x25 token grid
    const tokenGrid = grid.map(row => row.map(c => {
      const color = c || bgColor;
      return `${color}|${colorToShape[color]}`;
    }));
    // Slice into 25 tiles of 5x5
    const puzzles = [];
    for (let ti = 0; ti < 25; ti++) {
      const tileRow = Math.floor(ti / 5);
      const tileCol = ti % 5;
      const solution = [];
      for (let r = 0; r < 5; r++) {
        const row = [];
        for (let c = 0; c < 5; c++) {
          row.push(tokenGrid[tileRow * 5 + r][tileCol * 5 + c]);
        }
        solution.push(row);
      }
      const mr = rng(ti * 9973 + 1234);
      const numBlanks = Math.min(4 + Math.floor(ti / 2), 12);
      const allCells = [];
      for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) allCells.push(`${row}-${col}`);
      const blanks = new Set(shuffle(allCells, mr).slice(0, numBlanks));
      const usedTokens = [...new Set(solution.flat())];
      puzzles.push({ id: ti, solution, blanks, usedTokens, gridSize: 5, mode: "mosaic" });
    }
    return puzzles;
  }, []);

  const startCustomMosaicPlay = useCallback((mosaic) => {
    const puzzles = buildCustomMosaicPuzzles(mosaic.grid);
    customMosaicPuzzlesRef.current = puzzles;
    setCustomMosaicPlay(mosaic);
    setCustomMosaicProgress({});
    setView("custom-mosaic");
  }, [buildCustomMosaicPuzzles]);

  const handleSaveMosaic = useCallback(async () => {
    if (!firebaseUser) { setMosaicMsg("Sign in to save mosaics"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    const hasContent = creatorGrid.some(row => row.some(c => c !== null));
    if (!hasContent) { setMosaicMsg("Paint something first!"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    setMosaicLoading(true);
    try {
      const mosaicData = {
        title: creatorTitle || "Untitled",
        grid: creatorGrid,
        gridSize: 25,
        authorUsername: username || "",
      };
      if (creatorEditingId) {
        await updateMosaicDesign(firebaseUser.uid, creatorEditingId, mosaicData);
        setMosaicMsg("Mosaic updated!");
      } else {
        const id = await saveMosaicDesign(firebaseUser.uid, mosaicData);
        setCreatorEditingId(id);
        setMosaicMsg("Mosaic saved!");
      }
      // Refresh list
      const list = await loadUserMosaics(firebaseUser.uid);
      setMyMosaics(list);
    } catch (e) {
      console.error("Save mosaic failed:", e);
      const isPermErr = e?.message?.includes("PERMISSION_DENIED");
      setMosaicMsg(isPermErr ? "Save failed — database rules need to be deployed (see database.rules.json)" : "Save failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 4000);
    }
  }, [firebaseUser, creatorGrid, creatorTitle, creatorEditingId]);

  const handleDeleteMosaic = useCallback(async (mosaicId) => {
    if (!firebaseUser) return;
    setMosaicLoading(true);
    try {
      await deleteMosaicDesign(firebaseUser.uid, mosaicId);
      const list = await loadUserMosaics(firebaseUser.uid);
      setMyMosaics(list);
      setMosaicMsg("Mosaic deleted");
    } catch (e) {
      console.error("Delete mosaic failed:", e);
      setMosaicMsg("Delete failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, [firebaseUser]);

  const handleSubmitForReview = useCallback(async (mosaic) => {
    if (!firebaseUser) return;
    if (mosaic.publicStatus === "pending") { setMosaicMsg("Already submitted for review"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    if (mosaic.publicStatus === "approved") { setMosaicMsg("Already published!"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    setMosaicLoading(true);
    try {
      await submitMosaicForReview(firebaseUser.uid, mosaic.id, mosaic);
      const list = await loadUserMosaics(firebaseUser.uid);
      setMyMosaics(list);
      setMosaicMsg("Submitted for review!");
    } catch (e) {
      console.error("Submit failed:", e);
      const isPermErr = e?.message?.includes("PERMISSION_DENIED");
      setMosaicMsg(isPermErr ? "Submit failed — database rules need to be deployed (see database.rules.json)" : "Submit failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 4000);
    }
  }, [firebaseUser]);

  const handleShareMosaic = useCallback(async (mosaic, identifier) => {
    if (!firebaseUser || !identifier) return;
    setMosaicLoading(true);
    try {
      // Look up by username
      const target = await lookupUserByUsername(identifier.trim());
      if (!target) { setMosaicMsg("User not found"); setMosaicLoading(false); setTimeout(() => setMosaicMsg(""), 2500); return; }
      if (target.uid === firebaseUser.uid) { setMosaicMsg("Can't share with yourself"); setMosaicLoading(false); setTimeout(() => setMosaicMsg(""), 2500); return; }
      await shareMosaicWithUser(firebaseUser.uid, target.uid, mosaic.id, {
        ...mosaic,
        sharedByUsername: username || "",
      });
      setMosaicMsg("Shared!");
      setShareTargetMosaic(null);
      setShareEmailInput("");
    } catch (e) {
      console.error("Share failed:", e);
      const isPermErr = e?.message?.includes("PERMISSION_DENIED");
      setMosaicMsg(isPermErr ? "Share failed — database rules need to be deployed (see database.rules.json)" : "Share failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 4000);
    }
  }, [firebaseUser, username]);

  const handleAddFriend = useCallback(async () => {
    if (!firebaseUser || !addFriendInput.trim()) return;
    setAddFriendLoading(true);
    setAddFriendMsg("");
    try {
      const target = await lookupUserByUsername(addFriendInput.trim());
      if (!target) { setAddFriendMsg("User not found"); return; }
      if (target.uid === firebaseUser.uid) { setAddFriendMsg("Can't add yourself"); return; }
      if (friendsList.some(f => f.uid === target.uid)) { setAddFriendMsg("Already friends"); return; }
      await addFriend(firebaseUser.uid, target.uid);
      const updated = await loadFriends(firebaseUser.uid);
      setFriendsList(updated);
      setAddFriendInput("");
      setAddFriendMsg("Friend added!");
    } catch (e) {
      console.error("Add friend failed:", e);
      setAddFriendMsg("Failed to add friend");
    } finally {
      setAddFriendLoading(false);
      setTimeout(() => setAddFriendMsg(""), 3000);
    }
  }, [firebaseUser, addFriendInput, friendsList]);

  const handleRemoveFriend = useCallback(async (friendUid) => {
    if (!firebaseUser) return;
    try {
      await removeFriend(firebaseUser.uid, friendUid);
      setFriendsList(prev => prev.filter(f => f.uid !== friendUid));
    } catch (e) {
      console.error("Remove friend failed:", e);
    }
  }, [firebaseUser]);

  const handleApproveMosaic = useCallback(async (mosaic) => {
    setMosaicLoading(true);
    try {
      await approveMosaic(mosaic.id, mosaic);
      const list = await loadPendingMosaics();
      setPendingMosaicsList(list);
      setMosaicMsg("Approved!");
    } catch (e) {
      console.error("Approve failed:", e);
      setMosaicMsg("Approve failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, []);

  const handleRejectMosaic = useCallback(async (mosaic) => {
    setMosaicLoading(true);
    try {
      await rejectMosaic(mosaic.id, mosaic);
      const list = await loadPendingMosaics();
      setPendingMosaicsList(list);
      setMosaicMsg("Rejected");
    } catch (e) {
      console.error("Reject failed:", e);
      setMosaicMsg("Reject failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, []);

  const loadMosaicData = useCallback(async (tab) => {
    setMosaicLoading(true);
    try {
      if (tab === "mine" && firebaseUser) {
        const [userResult, sharedResult, friendsResult] = await Promise.allSettled([
          loadUserMosaics(firebaseUser.uid),
          loadSharedMosaics(firebaseUser.uid),
          loadFriends(firebaseUser.uid),
        ]);
        setMyMosaics(userResult.status === "fulfilled" ? userResult.value : []);
        setSharedMosaics(sharedResult.status === "fulfilled" ? sharedResult.value : []);
        if (friendsResult.status === "fulfilled") setFriendsList(friendsResult.value);
        const failed = [userResult, sharedResult].filter(r => r.status === "rejected");
        if (failed.length > 0) {
          const isPermErr = failed.some(r => r.reason?.message?.includes("PERMISSION_DENIED") || r.reason?.message?.includes("Permission denied"));
          setMosaicMsg(isPermErr ? "Load failed — database rules need to be deployed (see database.rules.json)" : "Failed to load some mosaic data");
          setTimeout(() => setMosaicMsg(""), 4000);
        }
      } else if (tab === "shared" && firebaseUser) {
        const sharedList = await loadSharedMosaics(firebaseUser.uid);
        setSharedMosaics(sharedList);
      } else if (tab === "public") {
        const pubList = await loadPublicMosaics();
        setPublicMosaicsList(pubList);
      } else if (tab === "friends" && firebaseUser) {
        const friends = await loadFriends(firebaseUser.uid);
        setFriendsList(friends);
      } else if (tab === "admin" && isAdmin) {
        const pendList = await loadPendingMosaics();
        setPendingMosaicsList(pendList);
      }
    } catch (e) {
      console.error("Load mosaic data failed:", e);
      const isPermErr = e?.message?.includes("PERMISSION_DENIED") || e?.message?.includes("Permission denied");
      setMosaicMsg(isPermErr ? "Load failed — database rules need to be deployed (see database.rules.json)" : "Failed to load mosaic data");
      setTimeout(() => setMosaicMsg(""), 4000);
    } finally {
      setMosaicLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  const editMosaic = useCallback((mosaic) => {
    setCreatorGrid(mosaic.grid || Array.from({ length: 25 }, () => Array(25).fill(null)));
    setCreatorTitle(mosaic.title || "");
    setCreatorEditingId(mosaic.id);
    setCreatorReturnView("gallery");
    setView("creator");
  }, []);

  // Load mosaic carousel data when mosaic mode is selected on menu
  const mosaicCarouselLoadedRef = useRef(false);
  useEffect(() => {
    if (difficulty !== "mosaic" || view !== "menu") return;
    if (mosaicCarouselLoadedRef.current) return;
    mosaicCarouselLoadedRef.current = true;
    // Load public mosaics (always) and user mosaics (if signed in)
    loadPublicMosaics().then(setPublicMosaicsList).catch(() => {});
    if (firebaseUser) {
      loadUserMosaics(firebaseUser.uid).then(setMyMosaics).catch(() => {});
    }
  }, [difficulty, view, firebaseUser]);

  // Helper: render a mosaic grid thumbnail (using canvas-like div grid)
  const MosaicThumbnail = useCallback(({ grid, size = 80 }) => {
    const gs = grid?.length || 25;
    const cellSz = size / gs;
    return (
      <div style={{ width: size, height: size, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}`, position: "relative" }}>
        <canvas ref={el => {
          if (!el || !grid) return;
          const ctx = el.getContext("2d");
          el.width = size;
          el.height = size;
          for (let r = 0; r < gs; r++) {
            for (let c = 0; c < (grid[r]?.length || 0); c++) {
              ctx.fillStyle = grid[r][c] || "#14141f";
              ctx.fillRect(c * cellSz, r * cellSz, Math.ceil(cellSz), Math.ceil(cellSz));
            }
          }
        }} width={size} height={size} style={{ width: size, height: size, display: "block" }} />
      </div>
    );
  }, []);

  // Helper: gather all local data into a single object for cloud sync
  const gatherLocalData = useCallback(() => ({
    progress: {
      easy: progress.easy || {},
      medium: progress.medium || {},
      hard: progress.hard || {},
      blind: progress.blind || {},
      daily: progress.daily || {},
      cascade: progress.cascade || {},
      spin: progress.spin || {},
      mosaic: progress.mosaic || {},
      cascadeRunState: progress.cascadeRunState || {},
      cascadeRunStateLastIndex: progress.cascadeRunStateLastIndex ?? null,
    },
    times: {
      easy: times.easy || {},
      medium: times.medium || {},
      hard: times.hard || {},
      blind: times.blind || {},
      daily: times.daily || {},
      cascade: times.cascade || {},
    },
    achievements: [...savedAchievementIds],
    theme: coopOriginalThemeRef.current ?? activeThemeId,
    birthday,
  }), [progress, times, savedAchievementIds, activeThemeId, birthday]);

  // Apply merged data to local state + localStorage
  const applyMergedData = useCallback((merged) => {
    if (merged.progress) {
      setProgress(merged.progress);
      saveProgress(merged.progress);
    }
    if (merged.times) {
      setTimes(merged.times);
      saveTimes(merged.times);
    }
    if (merged.achievements) {
      const ids = new Set(merged.achievements);
      setSavedAchievementIds(ids);
      saveSavedAchievements(ids);
    }
    if (merged.theme) {
      setActiveThemeId(merged.theme);
      saveTheme(merged.theme);
    }
    if (merged.birthday) {
      setBirthday(merged.birthday);
      try { localStorage.setItem(BIRTHDAY_KEY, merged.birthday); } catch { /* ignore */ }
    }
  }, []);

  // Sync local data to cloud (debounced, called after every save when logged in)
  const syncToCloud = useCallback(async (uid, data) => {
    if (!uid || cloudSyncInFlight.current) return;
    cloudSyncInFlight.current = true;
    setSyncStatus("syncing");
    try {
      await saveCloudData(uid, data);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 2000);
    } catch (e) {
      console.error("Cloud sync failed:", e);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(""), 3000);
    } finally {
      cloudSyncInFlight.current = false;
    }
  }, []);

  // Handle sign up: create account, merge local->cloud, push to cloud, then prompt username
  const handleSignUp = useCallback(async (email, password) => {
    setAccountLoading(true);
    setAccountError("");
    try {
      const user = await signUpWithEmail(email, password);
      // New account: push all local data to cloud
      const localData = gatherLocalData();
      await saveCloudData(user.uid, localData);
      setShowAccountModal(false);
      setAutoLoginModal(false);
      setAccountEmail("");
      setAccountPassword("");
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 2000);
      // New account has no username yet — show the mandatory modal
      setShowUsernameModal(true);
    } catch (e) {
      setAccountError(friendlyAuthError(e.code));
    } finally {
      setAccountLoading(false);
    }
  }, [gatherLocalData]);

  // After login, check for cloud vs local conflict and show choice prompt if needed
  const handlePostLoginSync = useCallback(async (uid) => {
    const cloudData = await loadCloudData(uid);
    const localData = gatherLocalData();
    const localSummary = summariseGameData(localData);
    const cloudSummary = summariseGameData(cloudData);
    const hasLocal = localSummary.totalSolved > 0 || localSummary.achievements > 0;
    const hasCloud = cloudData && (cloudSummary.totalSolved > 0 || cloudSummary.achievements > 0);

    if (hasLocal && hasCloud) {
      // Both sides have progress — ask the user what to do
      setSyncChoiceData({ uid, localData, cloudData, localSummary, cloudSummary });
      setShowSyncChoice(true);
      setShowAccountModal(false);
      setAutoLoginModal(false);
      setAccountEmail("");
      setAccountPassword("");
      return;
    }

    // Only one side has data (or neither): use the merge path which handles it correctly
    const merged = mergeGameData(localData, cloudData);
    applyMergedData(merged);
    await saveCloudData(uid, merged);
    setShowAccountModal(false);
    setAutoLoginModal(false);
    setAccountEmail("");
    setAccountPassword("");
    setSyncStatus("synced");
    setTimeout(() => setSyncStatus(""), 2000);
  }, [gatherLocalData, applyMergedData]);

  // Handle sign in: pull cloud data, check for conflict
  const handleSignIn = useCallback(async (email, password) => {
    setAccountLoading(true);
    setAccountError("");
    try {
      const user = await signInWithEmail(email, password);
      await handlePostLoginSync(user.uid);
    } catch (e) {
      setAccountError(friendlyAuthError(e.code));
    } finally {
      setAccountLoading(false);
    }
  }, [handlePostLoginSync]);

  // Handle Google sign in
  const handleGoogleSignIn = useCallback(async () => {
    setAccountLoading(true);
    setAccountError("");
    try {
      const user = await signInWithGoogle();
      await handlePostLoginSync(user.uid);
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        setAccountError(friendlyAuthError(e.code));
      }
    } finally {
      setAccountLoading(false);
    }
  }, [handlePostLoginSync]);

  // Sync choice handlers: user picks how to resolve local vs cloud conflict
  const handleSyncChoice = useCallback(async (choice) => {
    if (!syncChoiceData) return;
    const { uid, localData, cloudData } = syncChoiceData;
    setSyncStatus("syncing");
    setShowSyncChoice(false);
    try {
      let dataToApply;
      if (choice === "local") {
        // Overwrite cloud with local data
        dataToApply = localData;
      } else if (choice === "cloud") {
        // Overwrite local with cloud data
        dataToApply = cloudData;
      } else {
        // Merge both (best of both worlds)
        dataToApply = mergeGameData(localData, cloudData);
      }
      applyMergedData(dataToApply);
      await saveCloudData(uid, dataToApply);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 2000);
    } catch (e) {
      console.error("Sync choice failed:", e);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(""), 3000);
    } finally {
      setSyncChoiceData(null);
    }
  }, [syncChoiceData, applyMergedData]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await logOut();
      setShowAccountModal(false);
      setShowProfilePage(false);
      setSyncStatus("");
      setUsername(null);
      setProfilePicture(null);
      hasCheckedUsername.current = false;
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  }, []);

  // Debounced username availability check
  const checkUsernameDebounced = useCallback((value) => {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameAvailable(null);
      setUsernameError("Only letters, numbers, and underscores");
      return;
    }
    if (trimmed.length > 20) {
      setUsernameAvailable(null);
      setUsernameError("Max 20 characters");
      return;
    }
    setUsernameError("");
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(trimmed);
        setUsernameAvailable(available);
        if (!available) setUsernameError("Username already taken");
        else setUsernameError("");
      } catch {
        setUsernameAvailable(null);
      }
    }, 400);
  }, []);

  // Handle saving username from the mandatory modal
  const handleSaveUsername = useCallback(async () => {
    if (!firebaseUser || !usernameInput.trim()) return;
    const trimmed = usernameInput.trim();
    if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError("Username must be 3-20 characters (letters, numbers, underscores)");
      return;
    }
    setUsernameLoading(true);
    setUsernameError("");
    try {
      await saveUsername(firebaseUser.uid, trimmed);
      setUsername(trimmed);
      setShowUsernameModal(false);
      setUsernameInput("");
      setUsernameAvailable(null);
    } catch (e) {
      setUsernameError(e.message || "Failed to save username");
    } finally {
      setUsernameLoading(false);
    }
  }, [firebaseUser, usernameInput]);

  // Handle profile picture upload
  const handleProfilePictureUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    if (!file.type.startsWith("image/")) return;
    // Limit to 500KB for Firebase Realtime Database
    if (file.size > 512000) {
      setUsernameError("Image must be under 500KB");
      setTimeout(() => setUsernameError(""), 3000);
      return;
    }
    setProfilePictureLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      // Resize to 128x128 for storage efficiency
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        // Center-crop to square
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        try {
          await saveProfilePicture(firebaseUser.uid, dataUrl);
          setProfilePicture(dataUrl);
        } catch {
          setUsernameError("Failed to save profile picture");
          setTimeout(() => setUsernameError(""), 3000);
        } finally {
          setProfilePictureLoading(false);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, [firebaseUser]);

  // Handle removing profile picture
  const handleRemoveProfilePicture = useCallback(async () => {
    if (!firebaseUser) return;
    setProfilePictureLoading(true);
    try {
      await saveProfilePicture(firebaseUser.uid, null);
      setProfilePicture(null);
    } catch {
      // ignore
    } finally {
      setProfilePictureLoading(false);
    }
  }, [firebaseUser]);

  // Show a toast hint that login is available via the menu button
  const showLoginHint = useCallback(() => {
    setLoginHintToast(true);
    setLoginHintDismissing(false);
    if (loginHintTimer.current) clearTimeout(loginHintTimer.current);
    loginHintTimer.current = setTimeout(() => {
      setLoginHintDismissing(true);
      setTimeout(() => { setLoginHintToast(false); setLoginHintDismissing(false); loginHintTimer.current = null; }, 400);
    }, 5000);
  }, []);

  // Close the auto-opened login modal (shows hint toast)
  const dismissAutoLogin = useCallback(() => {
    setShowAccountModal(false);
    setAutoLoginModal(false);
    showLoginHint();
  }, [showLoginHint]);

  // "Don't ask me again" handler
  const dismissAutoLoginPermanently = useCallback(() => {
    try { localStorage.setItem(LOGIN_DISMISS_KEY, "1"); } catch { /* ignore */ }
    setShowAccountModal(false);
    setAutoLoginModal(false);
    showLoginHint();
  }, [showLoginHint]);

  // Auto-open login modal on first visit if not logged in and not dismissed
  const hasAutoOpenedLogin = useRef(false);
  useEffect(() => {
    if (!firebaseConfigured || hasAutoOpenedLogin.current) return;
    hasAutoOpenedLogin.current = true;
    // Wait for auth state to settle, then check
    const timeout = setTimeout(() => {
      if (firebaseUser) return; // already logged in
      try {
        if (localStorage.getItem(LOGIN_DISMISS_KEY)) return; // user dismissed permanently
      } catch { /* ignore */ }
      setAutoLoginModal(true);
      setShowAccountModal(true);
      setAccountError("");
    }, 800);
    return () => clearTimeout(timeout);
  }, [firebaseConfigured, firebaseUser]);

  // Auto-sync to cloud when data changes and user is logged in
  const cloudSyncTimer = useRef(null);
  useEffect(() => {
    if (!firebaseUser) return;
    // Debounce cloud syncs to avoid excessive writes
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = setTimeout(() => {
      const data = gatherLocalData();
      syncToCloud(firebaseUser.uid, data);
    }, 2000);
    return () => {
      if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    };
  }, [firebaseUser, progress, times, savedAchievementIds, activeThemeId, birthday, gatherLocalData, syncToCloud]);

  // On initial auth (page reload while logged in): pull cloud data and merge
  const hasRestoredFromCloud = useRef(false);
  useEffect(() => {
    if (!firebaseUser || hasRestoredFromCloud.current) return;
    hasRestoredFromCloud.current = true;
    (async () => {
      try {
        const cloudData = await loadCloudData(firebaseUser.uid);
        if (cloudData) {
          const localData = gatherLocalData();
          const merged = mergeGameData(localData, cloudData);
          applyMergedData(merged);
        }
      } catch (e) {
        console.error("Failed to restore cloud data:", e);
      }
    })();
  }, [firebaseUser, gatherLocalData, applyMergedData]);

  // Viewport size tracking for dynamic grid sizing
  const [viewportSize, setViewportSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll play view to top when entering or changing puzzle
  useEffect(() => {
    if (view !== "play") return;
    const scrollToTop = () => {
      const el = playViewScrollRef.current;
      if (el) {
        el.scrollTop = 0;
        el.scrollTo(0, 0);
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    const t = requestAnimationFrame(scrollToTop);
    const t2 = setTimeout(scrollToTop, 50);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(t2);
    };
  }, [view, currentPuzzle, cascadeLevel, difficulty, cascadeRunIndex]);

  const cancelWrongCellClear = useCallback(() => {
    if (wrongCellClearTimeoutRef.current) {
      clearTimeout(wrongCellClearTimeoutRef.current);
      wrongCellClearTimeoutRef.current = null;
    }
  }, []);

  // Initial load: read URL or restore saved cascade run
  useEffect(() => {
    const { mode, level, date, view: viewParam, coop: coopParam } = getSearchParams();
    const levelNum = level != null ? parseInt(level, 10) : null;
    const hasDailyDeepLink = mode === "daily" && date;
    const hasDeepLink = hasDailyDeepLink || (mode && levelNum != null && !Number.isNaN(levelNum));

    // Handle coop join link — defer until Firebase auth is ready
    if (coopParam && mode && levelNum != null) {
      setDifficulty(mode);
      setCurrentPuzzle(levelNum);
      // Store the coop session ID; actual joining happens once auth is ready (see coop join effect)
      setCoopSessionId(coopParam);
      setCoopRole("guest");
      setCoopStatus("joining");
      setFills({});
      setAttempts(0);
      setElapsedTime(0);
      setGameState("playing");
      setWrongCells(new Set());
      setLockedCells(new Set());
      setShowParticles(false);
      setSelectedCell(null);
      setSelectedToken(null);
      setView("play");
      // Clear coop param from URL
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete("coop");
      const cleanUrl = cleanParams.toString() ? `${window.location.pathname}?${cleanParams}` : window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      return;
    }

    // Handle view param (gallery, creator, custom-mosaic)
    if (viewParam) {
      if (viewParam === "gallery") {
        setView("gallery");
        setMosaicGalleryTab("mine");
        loadMosaicData("mine");
      } else if (viewParam === "creator") {
        resetCreator();
        setView("creator");
      }
      // custom-mosaic can't be restored without mosaic data, fallback to menu
      return;
    }

    // Handle mode-only URL (no level) — restore selected game mode on menu
    if (mode && !hasDeepLink && !hasDailyDeepLink) {
      setDifficulty(mode);
      return;
    }
    const runStateMap = progress.cascadeRunState || {};
    const lastIndex = progress.cascadeRunStateLastIndex;

    const restoreRun = (runIndex) => {
      const rs = runStateMap[runIndex];
      if (!rs) return;
      setCascadeRunIndex(runIndex);
      cascadeRunIndexRef.current = runIndex;
      setCascadeLevel(rs.level);
      setFills(rs.fills ?? {});
      setAttempts(rs.attempts ?? 0);
      const secs = rs.elapsedSeconds ?? 0;
      setElapsedTime(secs);
      timerStart.current = Date.now() - secs * 1000;
      timerIsCascadeRun.current = true;
      cascadeRunIndexRef.current = runIndex;
      timerInterval.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
        const p = loadProgress();
        const ri = cascadeRunIndexRef.current;
        const cur = p.cascadeRunState?.[ri];
        if (cur) {
          const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
          saveProgress({
            ...p,
            cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
            cascadeRunStateLastIndex: ri,
          });
        }
      }, 1000);
    };

    if (hasDeepLink) {
      if (mode) setDifficulty(mode);
      if (mode === "cascade") {
        setCascadeRunIndex(levelNum);
        cascadeRunIndexRef.current = levelNum;
        const prog = loadProgress();
        const tms = loadTimes();
        const cascadeBest = (prog.cascade || {})[levelNum];
        const cascadeTime = (tms.cascade || {})[levelNum];
        const fullyCompleted = cascadeBest === CASCADE_LEVELS.length && cascadeTime != null;
        if (fullyCompleted) {
          const puz = buildCascadePuzzle(CASCADE_LEVELS.length - 1, getCascadeRunSeed(levelNum));
          setCascadeLevel(CASCADE_LEVELS.length - 1);
          setFills(solutionFillsFromPuzzle(puz));
          setAttempts(0);
          setElapsedTime(cascadeTime);
          setGameState("won");
          setLockedCells(new Set(puz.blanks));
          setWrongCells(new Set());
          setShowParticles(false);
          setSelectedCell(null);
          setSelectedToken(null);
        } else {
          const rs = runStateMap[levelNum];
          if (rs) {
            restoreRun(levelNum);
          } else {
            setElapsedTime(0);
            timerStart.current = Date.now();
            timerIsCascadeRun.current = true;
            const initialRunState = { level: 0, elapsedSeconds: 0, fills: {}, attempts: 0 };
            const p = loadProgress();
            saveProgress({ ...p, cascadeRunState: { ...(p.cascadeRunState || {}), [levelNum]: initialRunState }, cascadeRunStateLastIndex: levelNum });
            timerInterval.current = setInterval(() => {
              setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
              const p2 = loadProgress();
              const ri = cascadeRunIndexRef.current;
              const cur = p2.cascadeRunState?.[ri];
              if (cur) {
                const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
                saveProgress({
                  ...p2,
                  cascadeRunState: { ...p2.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
                  cascadeRunStateLastIndex: ri,
                });
              }
            }, 1000);
          }
        }
      } else if (hasDailyDeepLink) {
        setCurrentDailyDate(date);
        const seed = getDailySeedForDate(date);
        const puz = buildDailyPuzzle(seed);
        const prog = loadProgress();
        const tms = loadTimes();
        const dProg = prog.daily || {};
        const dTimes = tms.daily || {};
        const alreadyCompleted = (dProg[seed] ?? 0) > 0 && dTimes[seed] != null;
        if (alreadyCompleted) {
          setFills(solutionFillsFromPuzzle(puz));
          setAttempts(dProg[seed]);
          setElapsedTime(dTimes[seed]);
          setGameState("won");
          setLockedCells(new Set(puz.blanks));
          setWrongCells(new Set());
          setShowParticles(false);
        } else {
          const todaySeed = getDailySeedForIndex(0);
          if (seed > todaySeed) {
            setView("menu"); return; // future date — go to menu
          }
          setFills({});
          setAttempts(0);
          setElapsedTime(0);
          setGameState("playing");
          setWrongCells(new Set());
          setLockedCells(new Set());
          setShowParticles(false);
          if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
          timerStart.current = Date.now();
          timerInterval.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
          }, 1000);
        }
        setSelectedCell(null);
        setSelectedToken(null);
      } else {
        setCurrentPuzzle(levelNum);
        const puzzleSet = PUZZLE_SETS[mode] || [];
        const puz = puzzleSet[levelNum];
        const prog = loadProgress();
        const tms = loadTimes();
        const dProg = prog[mode] || {};
        const dTimes = tms[mode] || {};
        const alreadyCompleted = (dProg[levelNum] ?? 0) > 0 && dTimes[levelNum] != null && puz;
        if (alreadyCompleted) {
          setFills(solutionFillsFromPuzzle(puz));
          setAttempts(dProg[levelNum]);
          setElapsedTime(dTimes[levelNum]);
          setGameState("won");
          setLockedCells(new Set(puz.blanks));
          setWrongCells(new Set());
          setShowParticles(false);
        } else {
          setFills({});
          setAttempts(0);
          setElapsedTime(0);
          setGameState("playing");
          setWrongCells(new Set());
          setLockedCells(new Set());
          setShowParticles(false);
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
          timerStart.current = Date.now();
          timerInterval.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
          }, 1000);
        }
        setSelectedCell(null);
        setSelectedToken(null);
      }
      setView("play");
      return;
    }

  }, []);

  // Keep URL in sync with view + mode + level (skip first mount so we don't overwrite incoming params)
  useEffect(() => {
    if (!hasSyncedUrl.current) {
      hasSyncedUrl.current = true;
      return;
    }
    if (view === "play") {
      if (difficulty === "daily") {
        updateUrl("daily", null, true, currentDailyDate);
      } else {
        const level = difficulty === "cascade" ? cascadeRunIndex : currentPuzzle;
        updateUrl(difficulty, level);
      }
    } else if (view === "gallery" || view === "creator" || view === "custom-mosaic") {
      updateUrl(null, null, true, null, view);
    } else {
      updateUrl(difficulty, null);
    }
  }, [view, difficulty, currentPuzzle, cascadeRunIndex, currentDailyDate]);

  const todayDateStr = getDateString();
  const isDaily = difficulty === "daily";
  const isCascade = difficulty === "cascade";
  if (isCascade) {
    cascadeFillsRef.current = fills;
    cascadeAttemptsRef.current = attempts;
    cascadeRunIndexRef.current = cascadeRunIndex;
  }
  const isMosaic = difficulty === "mosaic";
  const puzzles = isCascade ? [] : isDaily ? [] : (customMosaicPuzzlesRef.current && isMosaic ? customMosaicPuzzlesRef.current : (PUZZLE_SETS[difficulty] || []));
  const cascadePuzzle = useMemo(
    () => (isCascade ? buildCascadePuzzle(cascadeLevel, getCascadeRunSeed(cascadeRunIndex)) : null),
    [isCascade, cascadeLevel, cascadeRunIndex]
  );
  const currentDailyPuzzle = useMemo(() => {
    if (!isDaily || !currentDailyDate) return null;
    const seed = getDailySeedForDate(currentDailyDate);
    return buildDailyPuzzle(seed);
  }, [isDaily, currentDailyDate]);
  const puzzle = isCascade ? cascadePuzzle : isDaily ? currentDailyPuzzle : puzzles[currentPuzzle];
  const diffProgress = progress[difficulty] || {};
  const isBlind = difficulty === "blind" && !isDaily;
  const isSpin = difficulty === "spin";
  const progressKey = isCascade ? cascadeRunIndex : isDaily ? (currentDailyDate ? getDailySeedForDate(currentDailyDate) : null) : currentPuzzle;

  // How many of each token still need to be placed (only counts blanks, not full grid)
  const tokenRemaining = useMemo(() => {
    if (!puzzle) return {};
    // In coop mode, only count tokens needed for my blanks
    const blanksToCount = coopMyBlanks || puzzle.blanks;
    const neededInBlanks = {};
    for (const key of blanksToCount) {
      const [r, c] = key.split("-").map(Number);
      const token = puzzle.solution[r][c];
      if (token) neededInBlanks[token] = (neededInBlanks[token] || 0) + 1;
    }
    const usedCounts = {};
    for (const key of blanksToCount) {
      let token;
      if (lockedCells.has(key)) {
        const [r, c] = key.split("-").map(Number);
        token = puzzle.solution[r][c];
      } else if (fills[key]) {
        token = fills[key];
      }
      if (token) usedCounts[token] = (usedCounts[token] || 0) + 1;
    }
    const remaining = {};
    puzzle.usedTokens.forEach(t => { remaining[t] = (neededInBlanks[t] || 0) - (usedCounts[t] || 0); });
    return remaining;
  }, [puzzle, fills, lockedCells, coopMyBlanks]);

  // Default to first tile when game loads with no selection
  useEffect(() => {
    if (view === "play" && puzzle?.usedTokens?.length && selectedToken === null) {
      setSelectedToken(puzzle.usedTokens[0]);
    }
  }, [view, puzzle, selectedToken]);

  // Auto-advance to next available token when current selection is exhausted
  useEffect(() => {
    if (!puzzle || puzzle.mode === "hard" || !selectedToken) return;
    if ((tokenRemaining[selectedToken] ?? 0) > 0) return;
    const tokens = puzzle.usedTokens;
    const currentIdx = tokens.indexOf(selectedToken);
    if (currentIdx === -1) return;
    for (let i = 1; i < tokens.length; i++) {
      const nextToken = tokens[(currentIdx + i) % tokens.length];
      if ((tokenRemaining[nextToken] ?? 0) > 0) {
        setSelectedToken(nextToken);
        return;
      }
    }
  }, [tokenRemaining, selectedToken, puzzle]);

  const stopTimer = useCallback(() => {
    timerIsCascadeRun.current = false;
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (timerStart.current != null) return Math.floor((Date.now() - timerStart.current) / 1000);
    return 0;
  }, []);

  const showNextToast = useCallback(() => {
    if (achievementQueueRef.current.length === 0) {
      setAchievementToast(null);
      setToastDismissing(false);
      achievementToastTimer.current = null;
      return;
    }
    const next = achievementQueueRef.current.shift();
    setToastDismissing(false);
    setAchievementToast({ label: next.label, desc: next.desc, tier: next.tier, key: next.id + "-" + Date.now() });
    // After display duration, start dismiss animation
    achievementToastTimer.current = setTimeout(() => {
      setToastDismissing(true);
      // After exit animation completes, show next or clear
      toastDismissTimer.current = setTimeout(() => showNextToast(), 400);
    }, 2800);
  }, []);

  // Keep old name for compatibility with showNewAchievements
  const advanceAchievementQueue = showNextToast;

  const showThemeToast = useCallback((theme) => {
    setThemeToastDismissing(false);
    setThemeToast({ id: theme.id, name: theme.name, icon: theme.icon, key: theme.id + "-" + Date.now() });
    if (themeToastTimer.current) clearTimeout(themeToastTimer.current);
    themeToastTimer.current = setTimeout(() => {
      setThemeToastDismissing(true);
      setTimeout(() => { setThemeToast(null); setThemeToastDismissing(false); themeToastTimer.current = null; }, 400);
    }, 4500);
  }, []);

  const showNewAchievements = useCallback((newProgress, newTimes) => {
    const beforeSet = prevUnlockedRef.current;
    const currentSaved = loadSavedAchievements();
    const after = computeAchievements(newProgress, newTimes, currentSaved);
    const newlyUnlocked = after.filter(a => a.unlocked && (!beforeSet || !beforeSet.has(a.id)));
    prevUnlockedRef.current = new Set(after.filter(a => a.unlocked).map(a => a.id));
    // Persist any newly unlocked achievements permanently
    const allUnlockedIds = new Set(currentSaved);
    let changed = false;
    for (const a of after) {
      if (a.unlocked && !allUnlockedIds.has(a.id)) { allUnlockedIds.add(a.id); changed = true; }
    }
    if (changed) {
      saveSavedAchievements(allUnlockedIds);
      setSavedAchievementIds(allUnlockedIds);
    }
    if (newlyUnlocked.length > 0) {
      achievementQueueRef.current.push(...newlyUnlocked);
      // Only kick off the queue if not already showing
      if (!achievementToastTimer.current) {
        advanceAchievementQueue();
      }
    }

    // Check for newly unlocked themes
    const beforeThemes = prevUnlockedThemesRef.current;
    const nowUnlockedThemes = PUZZLE_THEMES.filter(t => isThemeUnlocked(t, after));
    prevUnlockedThemesRef.current = new Set(nowUnlockedThemes.map(t => t.id));
    if (beforeThemes) {
      const newThemes = nowUnlockedThemes.filter(t => !beforeThemes.has(t.id));
      if (newThemes.length > 0) {
        // Delay theme toast so it appears after achievement toasts finish
        const achDelay = newlyUnlocked.length * 3600; // ~3.2s per achievement toast + buffer
        setTimeout(() => showThemeToast(newThemes[0]), achDelay + 400);
      }
    }
  }, [advanceAchievementQueue, showThemeToast]);

  // Snapshot current achievements & unlocked themes on puzzle start so we can diff on win
  useEffect(() => {
    if (view === "play" && gameState === "playing") {
      const current = computeAchievements(progress, times, savedAchievementIds);
      prevUnlockedRef.current = new Set(current.filter(a => a.unlocked).map(a => a.id));
      // Snapshot currently unlocked themes
      prevUnlockedThemesRef.current = new Set(
        PUZZLE_THEMES.filter(t => isThemeUnlocked(t, current)).map(t => t.id)
      );
    }
  }, [view, gameState === "playing"]);

  const startPuzzle = (idx, diff, forceRestart = false, dailyDate = null) => {
    cancelWrongCellClear();
    if (diff) setDifficulty(diff);
    const effectiveDiff = diff ?? difficulty;
    if (effectiveDiff === "daily" && dailyDate) {
      setCurrentDailyDate(dailyDate);
    } else {
      setCurrentPuzzle(idx);
    }
    let cascadeElapsed = 0;
    if (effectiveDiff === "cascade") {
      setCascadeRunIndex(idx);
      cascadeRunIndexRef.current = idx;
      const prog = loadProgress();
      const tms = loadTimes();
      const cascadeBest = (prog.cascade || {})[idx];
      const cascadeTime = (tms.cascade || {})[idx];
      const fullyCompleted = !forceRestart && cascadeBest === CASCADE_LEVELS.length && cascadeTime != null;
      if (fullyCompleted) {
        const puz = buildCascadePuzzle(CASCADE_LEVELS.length - 1, getCascadeRunSeed(idx));
        setCascadeLevel(CASCADE_LEVELS.length - 1);
        setFills(solutionFillsFromPuzzle(puz));
        setAttempts(0);
        setElapsedTime(cascadeTime);
        setGameState("won");
        setLockedCells(new Set(puz.blanks));
        setSelectedCell(null);
        setSelectedToken(null);
        setWrongCells(new Set());
        setClearedBlanks(new Set());
        setJustPlacedCells(new Set());
        setRemovingCells({});
        setShowParticles(false);
        setGridEpoch((e) => e + 1);
        stopTimer();
        setView("play");
        return;
      }
      const runStateMap = prog.cascadeRunState || {};
      const saved = runStateMap[idx];
      const resume = !!saved;
      const startLevel = resume ? saved.level : 0;
      cascadeElapsed = resume ? (saved.elapsedSeconds ?? 0) : 0;
      const startFills = resume ? (saved.fills ?? {}) : {};
      const startAttempts = resume ? (saved.attempts ?? 0) : 0;
      setCascadeLevel(startLevel);
      setCascadeLives(3);
      setFills(startFills);
      setAttempts(startAttempts);
      setElapsedTime(cascadeElapsed);
      const runState = { level: startLevel, elapsedSeconds: cascadeElapsed, fills: startFills, attempts: startAttempts };
      const nextProgress = { ...progress, cascadeRunState: { ...(progress.cascadeRunState || {}), [idx]: runState }, cascadeRunStateLastIndex: idx };
      setProgress(nextProgress);
      saveProgress(nextProgress);
    } else {
      // Non-cascade: if level already completed (and not force restart), show completed state (filled grid + time)
      let puz;
      let lookupKey;
      if (effectiveDiff === "daily" && dailyDate) {
        const seed = getDailySeedForDate(dailyDate);
        puz = buildDailyPuzzle(seed);
        lookupKey = seed;
      } else {
        const puzzleSet = (customMosaicPuzzlesRef.current && effectiveDiff === "mosaic") ? customMosaicPuzzlesRef.current : (PUZZLE_SETS[effectiveDiff] || []);
        puz = puzzleSet[idx];
        lookupKey = idx;
      }
      const isCustomMosaic = !!customMosaicPuzzlesRef.current && effectiveDiff === "mosaic";
      const prog = loadProgress();
      const tms = loadTimes();
      const dProg = isCustomMosaic ? customMosaicProgress : (prog[effectiveDiff] || {});
      const dTimes = isCustomMosaic ? {} : (tms[effectiveDiff] || {});
      const savedAttempts = dProg[lookupKey] ?? 0;
      const savedTime = dTimes[lookupKey];
      const alreadyCompleted = !forceRestart && savedAttempts > 0 && savedTime != null && puz;
      if (alreadyCompleted) {
        setFills(solutionFillsFromPuzzle(puz));
        setAttempts(savedAttempts);
        setElapsedTime(savedTime);
        setGameState("won");
        setLockedCells(new Set(puz.blanks));
        setSelectedCell(null);
        setSelectedToken(null);
        setWrongCells(new Set());
        setClearedBlanks(new Set());
        setShowParticles(false);
        setGridEpoch((e) => e + 1);
        stopTimer();
        setView("play");
        return;
      }
      setFills({});
      setAttempts(0);
    }
    setSelectedCell(null);
    setSelectedToken(null);
    setGameState("playing");
    setWrongCells(new Set());
    setLockedCells(new Set());
    setClearedBlanks(new Set());
    setJustPlacedCells(new Set());
    setRemovingCells({});
    setShowParticles(false);
    setGridEpoch((e) => e + 1);
    // Reset spin angle
    setSpinAngle(0);
    if (effectiveDiff !== "cascade") setElapsedTime(0);
    stopTimer();
    timerIsCascadeRun.current = effectiveDiff === "cascade";
    timerStart.current = Date.now() - cascadeElapsed * 1000;
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
      if (timerIsCascadeRun.current) {
        const p = loadProgress();
        const ri = cascadeRunIndexRef.current;
        const cur = p.cascadeRunState?.[ri];
        if (cur) {
          const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
          saveProgress({
            ...p,
            cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
            cascadeRunStateLastIndex: ri,
          });
        }
      }
    }, 1000);
    setView("play");
  };

  const resetCascadeLevelState = useCallback(() => {
    setFills({});
    // Attempts persist across cascade levels — do not reset
    setGameState("playing");
    setWrongCells(new Set());
    setClearedBlanks(new Set());
    setJustPlacedCells(new Set());
    setRemovingCells({});
    setSelectedCell(null);
    setSelectedToken(null);
    setGridEpoch((e) => e + 1);
    // Timer is not reset — it persists across cascade stages for the whole run
  }, []);

  const resetBoard = () => {
    cancelWrongCellClear();
    setFills({});
    setSelectedCell(null);
    setSelectedToken(null);
    setAttempts(0);
    setWrongCells(new Set());
    setLockedCells(new Set());
    setClearedBlanks(new Set());
    setJustPlacedCells(new Set());
    setRemovingCells({});
    setGridEpoch((e) => e + 1);
    // Restart the timer
    stopTimer();
    setElapsedTime(0);
    const isCasc = difficulty === "cascade";
    timerStart.current = Date.now();
    timerIsCascadeRun.current = isCasc;
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
      if (timerIsCascadeRun.current) {
        const p = loadProgress();
        const ri = cascadeRunIndexRef.current;
        const cur = p.cascadeRunState?.[ri];
        if (cur) {
          const elapsed = Math.floor((Date.now() - timerStart.current) / 1000);
          saveProgress({
            ...p,
            cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, elapsedSeconds: elapsed, fills: cascadeFillsRef.current, attempts: cascadeAttemptsRef.current } },
            cascadeRunStateLastIndex: ri,
          });
        }
      }
    }, 1000);
    // Update persisted cascade run state if applicable
    if (isCasc) {
      setCascadeLevel(0);
      const p = loadProgress();
      const ri = cascadeRunIndexRef.current;
      const cur = p.cascadeRunState?.[ri];
      if (cur) {
        saveProgress({
          ...p,
          cascadeRunState: { ...p.cascadeRunState, [ri]: { ...cur, level: 0, elapsedSeconds: 0, fills: {}, attempts: 0 } },
        });
      }
    }
  };

  const triggerPlaceAnimation = useCallback((key) => {
    setJustPlacedCells(prev => new Set(prev).add(key));
    setTimeout(() => setJustPlacedCells(prev => { const n = new Set(prev); n.delete(key); return n; }), 200);
  }, []);

  const triggerRemoveAnimation = useCallback((key, token) => {
    if (removingTimersRef.current[key]) clearTimeout(removingTimersRef.current[key]);
    setRemovingCells(prev => ({ ...prev, [key]: token }));
    removingTimersRef.current[key] = setTimeout(() => {
      setRemovingCells(prev => { const n = { ...prev }; delete n[key]; return n; });
      delete removingTimersRef.current[key];
    }, 200);
  }, []);

  const paintCell = useCallback((r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key)) return;
    if (lockedCells.has(key)) return;
    // Coop: only allow filling my blanks, and not if I'm locked in
    if (isCoop && coopMyBlanks && !coopMyBlanks.has(key)) return;
    if (isCoop && coopMyLockedIn) return;
    if (selectedToken) {
      if (fills[key] === selectedToken) {
        cancelWrongCellClear();
        triggerRemoveAnimation(key, fills[key]);
        setClearedBlanks(prev => new Set(prev).add(key));
        setFills(prev => { const next = { ...prev }; delete next[key]; return next; });
        setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        return;
      }
      cancelWrongCellClear();
      if (puzzle.mode !== "hard" && (tokenRemaining[selectedToken] ?? 0) <= 0) return;
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      triggerPlaceAnimation(key);
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }, [gameState, puzzle, lockedCells, selectedToken, fills, tokenRemaining, cancelWrongCellClear, triggerPlaceAnimation, triggerRemoveAnimation, isCoop, coopMyBlanks, coopMyLockedIn]);

  const applyCellAction = useCallback((r, c) => {
    const key = `${r}-${c}`;
    if (!puzzle.blanks.has(key) || lockedCells.has(key)) return;
    // Coop: only allow filling my blanks, and not if I'm locked in
    if (isCoop && coopMyBlanks && !coopMyBlanks.has(key)) return;
    if (isCoop && coopMyLockedIn) return;
    if (selectedToken) {
      if (fills[key] === selectedToken) {
        cancelWrongCellClear();
        triggerRemoveAnimation(key, fills[key]);
        setClearedBlanks(prev => new Set(prev).add(key));
        setFills(prev => { const next = { ...prev }; delete next[key]; return next; });
        setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        return;
      }
      cancelWrongCellClear();
      if (puzzle.mode !== "hard" && (tokenRemaining[selectedToken] ?? 0) <= 0) return;
      setFills(prev => ({ ...prev, [key]: selectedToken }));
      triggerPlaceAnimation(key);
      setWrongCells(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      setSelectedCell(key);
    }
  }, [gameState, puzzle, lockedCells, selectedToken, fills, tokenRemaining, cancelWrongCellClear, triggerPlaceAnimation, triggerRemoveAnimation, isCoop, coopMyBlanks, coopMyLockedIn]);

  const handleCellPointerUp = useCallback((r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    const isSameCellAsPress = pendingCellRef.current === key;
    if (isSameCellAsPress) {
      applyCellAction(r, c);
      justHandledInPointerUpRef.current = key;
      pendingCellRef.current = null;
    }
  }, [gameState, applyCellAction]);

  const handleCellClick = (r, c) => {
    if (gameState !== "playing") return;
    const key = `${r}-${c}`;
    if (key === justHandledInPointerUpRef.current) {
      justHandledInPointerUpRef.current = null;
      return;
    }
    applyCellAction(r, c);
  };

  const handleCellPointerDown = (r, c) => {
    if (!selectedToken || gameState !== "playing") return;
    isPainting.current = true;
    pendingCellRef.current = `${r}-${c}`;
  };

  const handleCellPointerEnter = (r, c) => {
    if (!isPainting.current || !selectedToken) return;
    pendingCellRef.current = null;
    paintCell(r, c);
  };

  useEffect(() => {
    const stopPaint = () => {
      isPainting.current = false;
      if (pendingCellRef.current) {
        const key = pendingCellRef.current;
        pendingCellRef.current = null;
        const [r, c] = key.split("-").map(Number);
        paintCell(r, c);
      }
    };
    window.addEventListener("pointerup", stopPaint);
    window.addEventListener("pointercancel", stopPaint);
    return () => {
      window.removeEventListener("pointerup", stopPaint);
      window.removeEventListener("pointercancel", stopPaint);
    };
  }, [paintCell]);

  // Spin mode timer: rotate grid every N seconds
  useEffect(() => {
    if (spinTimerRef.current) { clearInterval(spinTimerRef.current); spinTimerRef.current = null; }
    if (difficulty !== "spin" || view !== "play" || gameState !== "playing" || !puzzle) return;
    const interval = (puzzle.spinInterval || 8) * 1000;
    spinTimerRef.current = setInterval(() => {
      setSpinAngle(prev => (prev + 90) % 360);
    }, interval);
    return () => { if (spinTimerRef.current) { clearInterval(spinTimerRef.current); spinTimerRef.current = null; } };
  }, [difficulty, view, gameState, puzzle]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (achievementToastTimer.current) { clearTimeout(achievementToastTimer.current); achievementToastTimer.current = null; }
      if (toastDismissTimer.current) { clearTimeout(toastDismissTimer.current); toastDismissTimer.current = null; }
      if (themeToastTimer.current) { clearTimeout(themeToastTimer.current); themeToastTimer.current = null; }
    };
  }, [stopTimer]);

  // --- Coop mode helpers ---

  // Split blank cells into two halves by column position (left/right of grid center)
  const splitBlanksForCoop = useCallback((blanksSet, gridSz) => {
    const blanksArr = [...blanksSet];
    const mid = gridSz / 2;
    const left = [];
    const right = [];
    const middle = [];
    for (const key of blanksArr) {
      const c = parseInt(key.split("-")[1], 10);
      if (c < Math.floor(mid)) left.push(key);
      else if (c >= Math.ceil(mid)) right.push(key);
      else middle.push(key);
    }
    // Distribute middle column blanks evenly
    middle.sort();
    for (let i = 0; i < middle.length; i++) {
      if (left.length <= right.length) left.push(middle[i]);
      else right.push(middle[i]);
    }
    return { hostBlanks: new Set(left), guestBlanks: new Set(right) };
  }, []);

  // Create a coop session for the current puzzle
  const startCoopSession = useCallback(async () => {
    if (!firebaseUser || !puzzle) return;
    const sessionId = await createCoopSession(firebaseUser.uid, {
      mode: difficulty,
      level: currentPuzzle,
      dailyDate: isDaily ? currentDailyDate : null,
      hostTheme: activeThemeId,
    });
    if (!sessionId) return;
    setCoopSessionId(sessionId);
    setCoopRole("host");
    setCoopStatus("waiting");
    setCoopMyLockedIn(false);
    setCoopPartnerLockedIn(false);
    setCoopPartnerCorrect(false);
    setCoopPartnerConnected(false);
    setCoopPartnerFills({});
    // Split blanks
    const { hostBlanks, guestBlanks } = splitBlanksForCoop(puzzle.blanks, puzzle.gridSize);
    setCoopMyBlanks(hostBlanks);
    setCoopPartnerBlanks(guestBlanks);
    // Reset game state for coop
    setFills({});
    setAttempts(0);
    setGameState("playing");
    setWrongCells(new Set());
    setLockedCells(new Set());
    setShowParticles(false);
    setSelectedCell(null);
    // Restart timer
    stopTimer();
    setElapsedTime(0);
    timerStart.current = Date.now();
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
    }, 1000);
    setShowCoopInvite(true);
  }, [firebaseUser, puzzle, difficulty, currentPuzzle, isDaily, currentDailyDate, splitBlanksForCoop, stopTimer, activeThemeId]);

  // Auto-start coop after login if user clicked Co-op while logged out
  useEffect(() => {
    if (firebaseUser && coopPendingLoginRef.current && !coopSessionId && puzzle) {
      coopPendingLoginRef.current = false;
      startCoopSession();
    }
  }, [firebaseUser, coopSessionId, puzzle, startCoopSession]);

  // Leave coop session and clean up
  const leaveCoopSession = useCallback(() => {
    if (coopUnsubRef.current) {
      coopUnsubRef.current();
      coopUnsubRef.current = null;
    }
    if (coopSessionId && firebaseUser) {
      deleteCoopSession(coopSessionId).catch(() => {});
    }
    // Restore guest's original theme (don't persist the host's theme)
    if (coopOriginalThemeRef.current !== null) {
      setActiveThemeId(coopOriginalThemeRef.current);
      saveTheme(coopOriginalThemeRef.current);
      coopOriginalThemeRef.current = null;
    }
    setCoopSessionId(null);
    setCoopRole(null);
    setCoopMyBlanks(null);
    setCoopPartnerBlanks(null);
    setCoopPartnerFills({});
    setCoopMyLockedIn(false);
    setCoopPartnerLockedIn(false);
    setCoopPartnerCorrect(false);
    setCoopPartnerConnected(false);
    setCoopStatus(null);
    setShowCoopInvite(false);
    coopWriteThrottleRef.current = {};
  }, [coopSessionId, firebaseUser]);

  // Subscribe to coop session changes (real-time sync)
  useEffect(() => {
    if (!coopSessionId || !firebaseUser) return;
    // Clean up previous subscription
    if (coopUnsubRef.current) coopUnsubRef.current();

    const unsub = subscribeToCoopSession(coopSessionId, (data) => {
      if (!data) {
        // Session was deleted
        leaveCoopSession();
        return;
      }
      const isHost = data.hostUid === firebaseUser.uid;
      const partnerConnected = isHost ? !!data.guestUid : true;
      setCoopPartnerConnected(partnerConnected);
      setCoopStatus(data.status);

      // Sync shared attempt counter from Firebase
      const remoteAttempts = data.attempts ?? 0;
      setAttempts(remoteAttempts);

      // Shared fail: if shared attempts exhausted, both players lose
      if (remoteAttempts >= 5 && data.status !== "complete") {
        setGameState("lost");
        stopTimer();
      }

      // Sync host theme to guest: apply the host's theme for this coop session
      if (!isHost && data.hostTheme) {
        if (coopOriginalThemeRef.current === null) {
          // Save the guest's original theme on first sync so we can restore it later
          coopOriginalThemeRef.current = activeThemeIdRef.current;
        }
        if (activeThemeIdRef.current !== data.hostTheme) {
          setActiveThemeId(data.hostTheme);
        }
      }

      // Update partner lock-in status
      if (isHost) {
        setCoopPartnerLockedIn(!!data.guestLockedIn);
        setCoopPartnerCorrect(!!data.guestCorrect);
      } else {
        setCoopPartnerLockedIn(!!data.hostLockedIn);
        setCoopPartnerCorrect(!!data.hostCorrect);
      }

      // Sync fills from Firebase
      const remoteFills = data.fills || {};
      if (coopMyBlanks) {
        // Extract partner fills (fills for cells NOT in my blanks)
        const partnerFillsObj = {};
        for (const [key, val] of Object.entries(remoteFills)) {
          if (!coopMyBlanks.has(key)) {
            partnerFillsObj[key] = val;
          }
        }
        setCoopPartnerFills(partnerFillsObj);
      }

      // Check if both locked in correctly → complete
      if (data.hostLockedIn && data.guestLockedIn && data.hostCorrect && data.guestCorrect && data.status !== "complete") {
        completeCoopSession(coopSessionId).catch(() => {});
      }
    });

    coopUnsubRef.current = unsub;
    return () => {
      unsub();
      coopUnsubRef.current = null;
    };
  }, [coopSessionId, firebaseUser, coopMyBlanks, stopTimer]);

  // Handle guest joining: once auth is ready and we have a session ID with role=guest, actually join
  useEffect(() => {
    if (coopRole !== "guest" || coopStatus !== "joining" || !firebaseUser || !coopSessionId) return;
    let cancelled = false;
    (async () => {
      const session = await joinCoopSession(coopSessionId, firebaseUser.uid);
      if (cancelled || !session) {
        if (!cancelled) {
          // Session doesn't exist or is full
          setCoopSessionId(null);
          setCoopRole(null);
          setCoopStatus(null);
          setView("menu");
        }
        return;
      }
      // Set the puzzle info from the session
      const mode = session.mode;
      const level = session.level;
      if (mode) setDifficulty(mode);
      if (level != null) setCurrentPuzzle(level);
      if (session.dailyDate) setCurrentDailyDate(session.dailyDate);

      setCoopStatus("playing");
    })();
    return () => { cancelled = true; };
  }, [coopRole, coopStatus, firebaseUser, coopSessionId]);

  // Once guest has joined and puzzle is loaded, split blanks and assign guest side
  useEffect(() => {
    if (coopRole !== "guest" || coopStatus !== "playing" || !puzzle || coopMyBlanks) return;
    const { hostBlanks, guestBlanks } = splitBlanksForCoop(puzzle.blanks, puzzle.gridSize);
    setCoopMyBlanks(guestBlanks);
    setCoopPartnerBlanks(hostBlanks);
    // Start timer for guest
    stopTimer();
    setElapsedTime(0);
    timerStart.current = Date.now();
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
    }, 1000);
  }, [coopRole, coopStatus, puzzle, coopMyBlanks, splitBlanksForCoop, stopTimer]);

  // Sync my fills to Firebase when they change in coop mode
  useEffect(() => {
    if (!isCoop || !coopMyBlanks || !coopSessionId) return;
    // Write my fills to Firebase for cells in my blanks
    for (const key of coopMyBlanks) {
      const val = fills[key] || null;
      const prev = coopWriteThrottleRef.current[key];
      if (prev !== val) {
        coopWriteThrottleRef.current[key] = val;
        updateCoopFill(coopSessionId, key, val).catch(() => {});
      }
    }
  }, [isCoop, fills, coopMyBlanks, coopSessionId]);

  // Clean up coop on unmount or when leaving play view
  useEffect(() => {
    return () => {
      if (coopUnsubRef.current) {
        coopUnsubRef.current();
        coopUnsubRef.current = null;
      }
    };
  }, []);

  const handleTokenSelect = useCallback((token) => {
    setSelectedToken(token);
    if (selectedCell && puzzle?.blanks.has(selectedCell) && !lockedCells.has(selectedCell)) {
      // Coop: only allow filling my blanks
      if (isCoop && coopMyBlanks && !coopMyBlanks.has(selectedCell)) return;
      if (isCoop && coopMyLockedIn) return;
      if (puzzle.mode !== "hard" && fills[selectedCell] !== token && (tokenRemaining[token] ?? 0) <= 0) return;
      cancelWrongCellClear();
      setFills(prev => ({ ...prev, [selectedCell]: token }));
      setWrongCells(prev => { const n = new Set(prev); n.delete(selectedCell); return n; });
      setSelectedCell(null);
    }
  }, [selectedCell, puzzle, lockedCells, fills, tokenRemaining, cancelWrongCellClear, isCoop, coopMyBlanks, coopMyLockedIn]);

  // Arrow keys to cycle through token options
  useEffect(() => {
    if (view !== "play" || gameState !== "playing" || !puzzle?.usedTokens?.length) return;
    const tokens = puzzle.usedTokens;
    const handler = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const currentIdx = tokens.indexOf(selectedToken);
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const nextIdx = (currentIdx + dir + tokens.length) % tokens.length;
      handleTokenSelect(tokens[nextIdx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, gameState, puzzle, selectedToken, handleTokenSelect]);

  const maxAttempts = isCascade ? 11 : isBlind ? 6 : 5;

  const checkSolution = () => {
    if (!puzzle) return;

    let allCorrect = true;
    const wrong = new Set();
    const newLocked = new Set(lockedCells);

    // Check which blanks are still active (not locked)
    const activeBlanks = [...puzzle.blanks].filter(k => !lockedCells.has(k));

    for (const key of activeBlanks) {
      const [r, c] = key.split("-").map(Number);
      if (fills[key] === puzzle.solution[r][c]) {
        if (isBlind) newLocked.add(key); // lock correct cells in blind mode
      } else {
        allCorrect = false;
        wrong.add(key);
      }
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // In blind mode, also need all locked from before to count
    if (isBlind) {
      // Check if ALL blanks are now correct (locked + newly correct active)
      const allBlanksCorrect = [...puzzle.blanks].every(k => {
        const [r, c] = k.split("-").map(Number);
        return fills[k] === puzzle.solution[r][c];
      });
      allCorrect = allBlanksCorrect;
    }

    if (allCorrect) {
      if (isCascade) {
        const levelsCompleted = cascadeLevel + 1;
        const prevBest = (progress.cascade || {})[cascadeRunIndex] ?? 0;
        const newBest = Math.max(prevBest, levelsCompleted);
        const nextLevel = cascadeLevel + 1;
        if (cascadeLevel < CASCADE_LEVELS.length - 1) {
          const runState = { level: nextLevel, elapsedSeconds: getElapsedSeconds(), fills: {}, attempts: newAttempts };
          const nextRunState = { ...(progress.cascadeRunState || {}), [cascadeRunIndex]: runState };
          const newProgress = { ...progress, cascade: { ...(progress.cascade || {}), [cascadeRunIndex]: newBest }, cascadeRunState: nextRunState, cascadeRunStateLastIndex: cascadeRunIndex };
          setProgress(newProgress);
          saveProgress(newProgress);
        } else {
          const nextRunState = { ...(progress.cascadeRunState || {}) };
          delete nextRunState[cascadeRunIndex];
          const newProgress = { ...progress, cascade: { ...(progress.cascade || {}), [cascadeRunIndex]: newBest }, cascadeRunState: nextRunState, cascadeRunStateLastIndex: cascadeRunIndex };
          setProgress(newProgress);
          saveProgress(newProgress);
          const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : 0;
          const tms = loadTimes();
          const newCascadeTimes = { ...(tms.cascade || {}), [cascadeRunIndex]: finalTime };
          const newTimes = { ...tms, cascade: newCascadeTimes };
          setTimes(newTimes);
          saveTimes(newTimes);
          showNewAchievements(newProgress, newTimes);
        }
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1500);
        if (cascadeLevel < CASCADE_LEVELS.length - 1) {
          // Don't stop timer — it continues across cascade levels
          // Batch level change with state reset so the new puzzle and
          // cleared fills render in the same React commit — avoids a
          // flash of stale cell colours from the previous level.
          setTimeout(() => {
            setCascadeLevel((l) => l + 1);
            resetCascadeLevelState();
          }, 400);
        } else {
          setGameState("won");
          stopTimer();
        }
      } else {
        setGameState("won");
        stopTimer();
        const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : elapsedTime;
        if (isBlind) setLockedCells(new Set([...puzzle.blanks]));
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1500);
        // Custom mosaic: track progress locally only (don't save to normal progress)
        if (customMosaicPuzzlesRef.current && isMosaic) {
          setCustomMosaicProgress(prev => ({ ...prev, [progressKey]: newAttempts }));
        } else {
          const newDiffProgress = { ...diffProgress, [progressKey]: newAttempts };
          const newProgress = { ...progress, [difficulty]: newDiffProgress };
          setProgress(newProgress);
          saveProgress(newProgress);
          const diffTimes = times[difficulty] || {};
          const newDiffTimes = { ...diffTimes, [progressKey]: finalTime };
          const newTimes = { ...times, [difficulty]: newDiffTimes };
          setTimes(newTimes);
          saveTimes(newTimes);
          showNewAchievements(newProgress, newTimes);
        }
      }
      } else if (newAttempts >= maxAttempts) {
      if (isCascade) {
        const levelsReached = cascadeLevel;
        const prevBest = (progress.cascade || {})[cascadeRunIndex] ?? 0;
        const newBest = Math.max(prevBest, levelsReached);
        const nextRunState = { ...(progress.cascadeRunState || {}) };
        delete nextRunState[cascadeRunIndex];
        const newProgress = { ...progress, cascade: { ...(progress.cascade || {}), [cascadeRunIndex]: newBest }, cascadeRunState: nextRunState, cascadeRunStateLastIndex: cascadeRunIndex };
        setProgress(newProgress);
        saveProgress(newProgress);
        setGameState("lost");
        stopTimer();
        setWrongCells(wrong);
        showNewAchievements(newProgress, times);
      } else {
        setGameState("lost");
        stopTimer();
        setWrongCells(wrong);
        if (isBlind) setLockedCells(newLocked);
        const newDiffProgress = { ...diffProgress, [progressKey]: 0 };
        const newProgress = { ...progress, [difficulty]: newDiffProgress };
        setProgress(newProgress);
        saveProgress(newProgress);
        showNewAchievements(newProgress, times);
      }
    } else {
      setWrongCells(wrong);
      if (isBlind) {
        setLockedCells(newLocked);
      }
      // Wait for all wrong-cell fall-off animations to finish (staggered delay + duration) before clearing
      if (wrongCellClearTimeoutRef.current) {
        clearTimeout(wrongCellClearTimeoutRef.current);
        wrongCellClearTimeoutRef.current = null;
      }
      const n = puzzle.gridSize * puzzle.gridSize;
      const maxStagger = (n - 1) * 0.015;
      const fallOffDuration = 0.32;
      const clearDelayMs = (maxStagger + fallOffDuration + 0.05) * 1000;
      const wrongSet = wrong;
      wrongCellClearTimeoutRef.current = setTimeout(() => {
        wrongCellClearTimeoutRef.current = null;
        setClearedBlanks(prev => { const next = new Set(prev); for (const k of wrongSet) next.add(k); return next; });
        setFills(prev => {
          const next = { ...prev };
          for (const k of wrongSet) delete next[k];
          return next;
        });
        setWrongCells(new Set());
      }, clearDelayMs);
    }
  };

  // Coop lock-in: check only my half of the blanks against the solution
  const coopLockIn = async () => {
    if (!puzzle || !isCoop || !coopMyBlanks || !coopSessionId || coopMyLockedIn) return;
    let allCorrect = true;
    const wrong = new Set();
    for (const key of coopMyBlanks) {
      const [r, c] = key.split("-").map(Number);
      if (fills[key] === puzzle.solution[r][c]) {
        // correct
      } else {
        allCorrect = false;
        wrong.add(key);
      }
    }
    // Shared attempt counter: increment and sync to Firebase for both players
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    updateCoopAttempts(coopSessionId, newAttempts).catch(() => {});

    if (allCorrect) {
      setCoopMyLockedIn(true);
      // Lock my cells visually
      setLockedCells(prev => {
        const next = new Set(prev);
        for (const k of coopMyBlanks) next.add(k);
        return next;
      });
      await lockInCoopPlayer(coopSessionId, coopRole, true);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 1500);
    } else if (newAttempts >= 5) {
      // Failed all shared attempts — both players lose (subscription handles partner)
      setGameState("lost");
      setWrongCells(wrong);
      await lockInCoopPlayer(coopSessionId, coopRole, false);
    } else {
      // Show wrong cells, allow retry
      setWrongCells(wrong);
      if (wrongCellClearTimeoutRef.current) {
        clearTimeout(wrongCellClearTimeoutRef.current);
        wrongCellClearTimeoutRef.current = null;
      }
      const n = puzzle.gridSize * puzzle.gridSize;
      const maxStagger = (n - 1) * 0.015;
      const fallOffDuration = 0.32;
      const clearDelayMs = (maxStagger + fallOffDuration + 0.05) * 1000;
      const wrongSet = wrong;
      wrongCellClearTimeoutRef.current = setTimeout(() => {
        wrongCellClearTimeoutRef.current = null;
        setClearedBlanks(prev => { const next = new Set(prev); for (const k of wrongSet) next.add(k); return next; });
        setFills(prev => {
          const next = { ...prev };
          for (const k of wrongSet) delete next[k];
          return next;
        });
        setWrongCells(new Set());
      }, clearDelayMs);
    }
  };

  // Detect coop completion: both players locked in correctly
  const coopComplete = isCoop && coopMyLockedIn && coopPartnerLockedIn && coopPartnerCorrect && gameState === "playing";

  // Effect: when coop is complete, trigger win state and save progress
  useEffect(() => {
    if (!coopComplete || !puzzle) return;

    setGameState("won");
    stopTimer();
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 1500);

    // Lock all cells
    setLockedCells(new Set(puzzle.blanks));

    // Save progress as coop completion — read fresh from localStorage to avoid stale closure
    const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : elapsedTime;
    const freshProgress = loadProgress();
    const coopProgress = freshProgress.coop || {};
    const newCoopProgress = { ...coopProgress, [`${difficulty}_${progressKey}`]: attempts || 1 };
    const newProgress = { ...freshProgress, coop: newCoopProgress };
    setProgress(newProgress);
    saveProgress(newProgress);

    const freshTimes = loadTimes();
    const coopTimes = freshTimes.coop || {};
    const newCoopTimes = { ...coopTimes, [`${difficulty}_${progressKey}`]: finalTime };
    const newTimes = { ...freshTimes, coop: newCoopTimes };
    setTimes(newTimes);
    saveTimes(newTimes);

    showNewAchievements(newProgress, newTimes);
  }, [coopComplete, puzzle, stopTimer, elapsedTime, difficulty, progressKey, attempts, showNewAchievements]);

  // For blind mode: all non-locked blanks must be filled
  const activeBlanks = puzzle ? [...puzzle.blanks].filter(k => !lockedCells.has(k)) : [];
  const coopMyBlanksArr = isCoop && coopMyBlanks ? [...coopMyBlanks] : [];
  const allFilled = isCoop
    ? coopMyBlanksArr.every(k => fills[k])
    : isBlind
      ? activeBlanks.every(k => fills[k])
      : puzzle ? [...puzzle.blanks].every(k => fills[k]) : false;

  const completedCount = isCascade
    ? Object.keys(diffProgress).filter(k => /^\d+$/.test(k) && diffProgress[k] === CASCADE_LEVELS.length).length
    : isDaily
      ? Object.values(diffProgress).filter(v => v > 0).length
      : Object.keys(diffProgress).filter(k => diffProgress[k] > 0).length;
  const totalAttempted = isCascade
    ? Object.keys(diffProgress).filter(k => /^\d+$/.test(k)).length
    : Object.keys(diffProgress).length;

  const diffTimes = times[difficulty] || {};

  const getShareData = () => {
    const sections = [];
    let totalSolved = 0;
    let totalGold = 0, totalSilver = 0, totalBronze = 0, totalFailed = 0;
    let bestTimeAll = null;

    for (const d of DIFFICULTIES) {
      const dp = progress[d.key] || {};
      const dt = times[d.key] || {};
      let solved = 0, gold = 0, silver = 0, bronze = 0, failed = 0;
      let bestTime = null, totalTime = 0, timedCount = 0;
      const grid = [];

      for (let i = 0; i < 50; i++) {
        const key = d.key === "daily" ? getDailyKey(i) : i;
        const result = dp[key];
        if (d.key === "cascade") {
          if (result === undefined) grid.push("none");
          else if (result === CASCADE_LEVELS.length) { solved++; gold++; grid.push("gold"); }
          else { failed++; grid.push("failed"); }
        } else {
          if (result === undefined) grid.push("none");
          else if (result === 0) { failed++; grid.push("failed"); }
          else if (result <= 2) { gold++; solved++; grid.push("gold"); }
          else if (result <= 4) { silver++; solved++; grid.push("silver"); }
          else { bronze++; solved++; grid.push("bronze"); }
          if (result > 0 && dt[key] != null) {
            if (bestTime === null || dt[key] < bestTime) bestTime = dt[key];
            totalTime += dt[key];
            timedCount++;
          }
        }
      }

      totalSolved += solved;
      totalGold += gold; totalSilver += silver; totalBronze += bronze; totalFailed += failed;
      if (bestTime != null && (bestTimeAll === null || bestTime < bestTimeAll)) bestTimeAll = bestTime;

      sections.push({
        ...d, solved, gold, silver, bronze, failed, bestTime, grid,
        avgTime: timedCount > 0 ? Math.round(totalTime / timedCount) : null,
      });
    }

    return { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll };
  };

  const tryNativeShare = async ({ title = "Agnus", text, url }) => {
    if (typeof navigator !== "undefined" && navigator.share && (text || url)) {
      try {
        await navigator.share({ title, text: text || undefined, url: url || undefined });
        return "shared";
      } catch (e) {
        if (e.name === "AbortError") return "cancelled";
      }
    }
    return "unavailable";
  };

  const generateShareText = () => {
    const { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll } = getShareData();
    const emojis = { easy: "\u2B50", medium: "\u26A1", hard: "\uD83D\uDD25", blind: "\uD83D\uDE48", daily: "\uD83D\uDCC5", cascade: "\uD83C\uDF00" };
    const blockChars = { none: "\u2591", failed: "\u2593", gold: "\u2588", silver: "\u2593", bronze: "\u2592" };

    let text = "Agnus \uD83E\uDDE9\n\n";
    for (const s of sections) {
      text += `${emojis[s.key]} ${s.label}: ${s.solved}/50 solved`;
      if (s.bestTime != null) text += ` \u2022 best ${formatTime(s.bestTime)}`;
      if (s.avgTime != null) text += ` \u2022 avg ${formatTime(s.avgTime)}`;
      text += "\n";
      for (let row = 0; row < 5; row++) {
        text += s.grid.slice(row * 10, (row + 1) * 10).map(g => blockChars[g]).join("") + "\n";
      }
      text += "\n";
    }
    text += `\u2605 ${totalGold} gold \u2022 \u25CF ${totalSilver} silver \u2022 \u25C6 ${totalBronze} bronze \u2022 \u2717 ${totalFailed} failed\n`;
    text += `Total: ${totalSolved}/300 solved`;
    if (bestTimeAll != null) text += ` \u2022 Fastest: ${formatTime(bestTimeAll)}`;
    return text;
  };

  const copyShareText = async () => {
    const text = generateShareText();
    const result = await tryNativeShare({ text });
    if (result === "shared") {
      setShareMsg("Shared!");
      setTimeout(() => setShareMsg(""), 2000);
      return;
    }
    if (result === "cancelled") return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setShareMsg("Copied!");
    setTimeout(() => setShareMsg(""), 2000);
  };

  const copyDailyShareText = async () => {
    const dailyData = progress.daily || {};
    const dailySolved = Object.values(dailyData).filter(v => v > 0).length;
    const cascadeSolved = Object.keys(progress.cascade || {}).filter(k => /^\d+$/.test(k) && (progress.cascade || {})[k] === CASCADE_LEVELS.length).length;
    const text = `Agnus \uD83E\uDDE9\n\uD83D\uDCC5 Daily: ${dailySolved} solved\n\uD83C\uDF00 Cascade: ${cascadeSolved}/50`;
    const result = await tryNativeShare({ text });
    if (result === "shared") {
      setShareMsg("Shared!");
      setTimeout(() => setShareMsg(""), 2000);
      return;
    }
    if (result === "cancelled") return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setShareMsg("Copied!");
    setTimeout(() => setShareMsg(""), 2000);
  };

  const gridSize = puzzle ? puzzle.gridSize : 5;
  const isMobile = viewportSize.w < 480;
  const gridGap = gridSize >= 7 ? (isMobile ? 2 : 3) : 4;
  const gridPad = gridSize >= 7 ? (isMobile ? 6 : 10) : (isMobile ? 10 : 14);
  const availW = viewportSize.w - (isMobile ? 24 : 50) - (gridSize - 1) * gridGap - 2 * gridPad;
  const availH = viewportSize.h - (isMobile ? 290 : 320) - (gridSize - 1) * gridGap - 2 * gridPad;
  const dynamicCell = Math.min(Math.floor(availW / gridSize), Math.floor(availH / gridSize));
  const cellSize = Math.max(28, Math.min(dynamicCell, 80));
  const iconSize = Math.max(14, Math.round(cellSize * 0.5));
  const pickerSize = 48;

  // --- Theme Picker (shared across views) ---
  const themePickerEl = showThemePicker ? (() => {
    const achList = computeAchievements(progress, times, savedAchievementIds);
    return (
      <div onClick={() => setShowThemePicker(false)} style={{
        position: "fixed", inset: 0, zIndex: 1100,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        animation: "drawerOverlayFade 0.25s ease both",
      }}>
        <style>{`@keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes drawerOverlayFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
        <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} />
        <div onClick={e => e.stopPropagation()} style={{
          backgroundColor: C.bg, borderRadius: "20px 20px 0 0",
          border: `1px solid ${C.border}`, borderBottom: "none",
          maxHeight: "75vh", display: "flex", flexDirection: "column",
          animation: "drawerSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
        }}>
          <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, margin: "0 auto 16px" }} />
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: 1 }}>
              Themes
            </h2>
            <p style={{ fontSize: 11, color: C.textDim, margin: "0 0 16px", lineHeight: 1.5 }}>
              Unlock themes through achievements or play on themed days
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
            {PUZZLE_THEMES.map(theme => {
              const unlocked = isThemeUnlocked(theme, achList);
              const isActive = activeThemeId === theme.id;
              const seasonalMonth = theme.unlock?.seasonal;
              const achId = theme.unlock?.achievement;
              const ach = achId ? ACHIEVEMENTS.find(a => a.id === achId) : null;
              let unlockHint = "";
              if (theme.unlock) {
                const parts = [];
                if (seasonalMonth) {
                  const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  parts.push(`Play in ${monthNames[seasonalMonth]}`);
                }
                if (ach) parts.push(`"${ach.label}" achievement`);
                unlockHint = parts.join(" or ");
              }

              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    if (unlocked) {
                      setActiveThemeId(theme.id);
                      saveTheme(theme.id);
                    }
                  }}
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 12,
                    backgroundColor: isActive ? (theme.gridBg || C.surface) : C.surface,
                    border: isActive ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                    cursor: unlocked ? "pointer" : "default",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "all 0.15s",
                    opacity: unlocked ? 1 : 0.5,
                  }}
                  onMouseEnter={e => { if (unlocked && !isActive) e.currentTarget.style.borderColor = C.accent + "88"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = C.border; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    backgroundColor: theme.gridBg || C.surfaceLight,
                    border: `1.5px solid ${theme.gridBorder || C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                    flexWrap: "wrap", padding: 4, position: "relative", overflow: "hidden",
                  }}>
                    {theme.icon ? (
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{theme.icon}</span>
                    ) : (
                      <>
                        {(theme.palettes || PALETTES)[0].slice(0, 4).map((col, ci) => (
                          <div key={ci} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: col }} />
                        ))}
                      </>
                    )}
                    {!unlocked && (
                      <div style={{
                        position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="2" y="6" width="10" height="7" rx="1.5" fill="none" stroke={C.textDim} strokeWidth="1.5"/>
                          <path d="M4.5,6 V4 C4.5,2.3 5.6,1 7,1 C8.4,1 9.5,2.3 9.5,4 V6" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                      color: isActive ? C.accent : C.text, letterSpacing: 0.5,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {theme.name}
                      {isActive && <span style={{ fontSize: 9, color: C.accent, fontWeight: 400 }}>(active)</span>}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                      {!unlocked ? unlockHint : theme.desc}
                    </div>
                  </div>

                  {unlocked && !isActive && (
                    <span style={{ color: C.textDim, fontSize: 11, fontFamily: "'Space Mono', monospace", flexShrink: 0 }}>Select</span>
                  )}
                  {isActive && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M3 8.5L6.5 12L13 4" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{
            padding: "16px 24px", paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            borderTop: `1px solid ${C.border}`, marginTop: 8, flexShrink: 0,
          }}>
            <button onClick={() => setShowThemePicker(false)}
              style={{
                width: "100%", backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                textTransform: "uppercase", transition: "all 0.15s",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  })() : null;

  // --- CUSTOM MOSAIC PLAY VIEW (puzzle selection for user-created mosaics) ---
  if (view === "custom-mosaic" && customMosaicPlay) {
    const cPuzzles = customMosaicPuzzlesRef.current || [];
    const gridPxCm = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 40 : 340);
    const tileSzCm = Math.floor((gridPxCm - 20) / 5);
    const miniCellSzCm = Math.floor((tileSzCm - 8) / 5);
    const solvedCount = Object.values(customMosaicProgress).filter(v => v > 0).length;
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", alignItems: "center", gap: 12, marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
          <button onClick={() => { setView("gallery"); setCustomMosaicPlay(null); customMosaicPuzzlesRef.current = null; }}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
              color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontSize: 12, letterSpacing: 1, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            &larr; Back
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent }}>
              {customMosaicPlay.title || "Untitled"}
            </h2>
            {customMosaicPlay.authorUsername && (
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>by {customMosaicPlay.authorUsername}</div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 10, animation: "fadeUp 0.3s 0.02s ease both" }}>
          Solve all 25 tiles to reveal the picture
        </div>

        {/* 5x5 tile grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3,
          padding: 8, borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
          animation: "fadeUp 0.3s 0.04s ease both",
        }}>
          {cPuzzles.map((p, i) => {
            const solved = (customMosaicProgress[i] || 0) > 0;
            return (
              <button key={i} onClick={() => {
                startPuzzle(i, "mosaic", true);
              }}
                style={{
                  width: tileSzCm, height: tileSzCm, borderRadius: 6,
                  border: `1.5px solid ${solved ? C.correct + "66" : C.border}`,
                  backgroundColor: solved ? C.correct + "10" : C.surface,
                  cursor: "pointer", padding: 2, position: "relative",
                  display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", overflow: "hidden",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = solved ? C.correct + "66" : C.border; }}
              >
                {solved ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {p.solution.map((row, ri) => (
                      <div key={ri} style={{ display: "flex", gap: 0.5 }}>
                        {row.map((token, ci) => {
                          const { color } = parseToken(token);
                          return <div key={ci} style={{ width: miniCellSzCm, height: miniCellSzCm, borderRadius: 1, backgroundColor: color }} />;
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                    color: C.textDim, lineHeight: 1,
                  }}>
                    {i + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 16, fontSize: 12, color: C.textDim, fontFamily: "'Space Mono', monospace", animation: "fadeUp 0.3s 0.06s ease both" }}>
          {solvedCount}/25 tiles solved
        </div>

        {/* Full picture preview when all solved */}
        {solvedCount === 25 && (
          <div style={{ marginTop: 20, animation: "fadeUp 0.4s ease both", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.correct, marginBottom: 12 }}>
              Picture revealed!
            </div>
            <MosaicThumbnail grid={customMosaicPlay.grid} size={Math.min(280, typeof window !== "undefined" ? window.innerWidth - 80 : 280)} />
          </div>
        )}
      </div>
    );
  }

  // --- MOSAIC CREATOR VIEW ---
  if (view === "creator") {
    const gridPx = Math.min(360, typeof window !== "undefined" ? window.innerWidth - 32 : 360);
    const cellPx = gridPx / CREATOR_GRID_SIZE;
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", alignItems: "center", gap: 12, marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
          <button onClick={() => {
            const returnTo = creatorReturnView || "menu";
            resetCreator();
            setCreatorReturnView("menu");
            if (returnTo === "gallery") {
              setView("gallery");
              loadMosaicData(mosaicGalleryTab || "mine");
            } else {
              setView("menu");
            }
          }}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
              color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontSize: 12, letterSpacing: 1, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            &larr; Back
          </button>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            {creatorEditingId ? "Edit Mosaic" : "Create Mosaic"}
          </h2>
        </div>

        {/* Title input */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 12, animation: "fadeUp 0.3s 0.02s ease both" }}>
          <input
            type="text"
            value={creatorTitle}
            onChange={e => setCreatorTitle(e.target.value)}
            placeholder="Mosaic title..."
            maxLength={40}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 16, fontFamily: "'Space Mono', monospace",
              outline: "none", boxSizing: "border-box", letterSpacing: 0.5,
            }}
            onFocus={e => { e.target.style.borderColor = C.accent; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
        </div>

        {/* Color palette */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 12, animation: "fadeUp 0.3s 0.04s ease both" }}>
          <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>
            Colors
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CREATOR_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setCreatorColor(color)}
                style={{
                  width: 28, height: 28, borderRadius: 6, backgroundColor: color, border: creatorColor === color ? `2.5px solid ${C.accent}` : `1.5px solid ${C.border}`,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: creatorColor === color ? `0 0 8px ${C.accent}66` : "none",
                }}
              />
            ))}
            {/* Eraser */}
            <button
              onClick={() => setCreatorColor(null)}
              style={{
                width: 28, height: 28, borderRadius: 6, backgroundColor: C.surface,
                border: creatorColor === null ? `2.5px solid ${C.accent}` : `1.5px solid ${C.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: C.textDim, transition: "all 0.15s",
              }}
              title="Eraser"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-8 8-3 1 1-3z" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* Tools */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 12, animation: "fadeUp 0.3s 0.045s ease both" }}>
          <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>
            Tools
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Draw tool */}
            <button
              onClick={() => setCreatorTool("draw")}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6,
                backgroundColor: creatorTool === "draw" ? C.accent + "22" : C.surface,
                border: creatorTool === "draw" ? `2px solid ${C.accent}` : `1.5px solid ${C.border}`,
                cursor: "pointer", fontSize: 11, color: creatorTool === "draw" ? C.accent : C.textDim,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, transition: "all 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2.5 13.5l1-3 8-8 2 2-8 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Draw
            </button>
            {/* Fill tool */}
            <button
              onClick={() => setCreatorTool("fill")}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6,
                backgroundColor: creatorTool === "fill" ? C.accent + "22" : C.surface,
                border: creatorTool === "fill" ? `2px solid ${C.accent}` : `1.5px solid ${C.border}`,
                cursor: "pointer", fontSize: 11, color: creatorTool === "fill" ? C.accent : C.textDim,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, transition: "all 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 9c0 2-1.5 4-3 4s-3-2-3-4 3-7 3-7 3 5 3 7z" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.5 11l4-4 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Fill
            </button>
          </div>
        </div>

        {/* 25x25 info */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 6, animation: "fadeUp 0.3s 0.05s ease both" }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, fontFamily: "'Space Mono', monospace", textAlign: "center" }}>
            25x25 grid &middot; becomes 25 playable puzzle tiles
          </div>
        </div>

        {/* Grid - uses pointer-move on container for smooth finger drag */}
        <div
          ref={creatorGridRef}
          style={{
            width: gridPx, height: gridPx, marginBottom: 16, animation: "fadeUp 0.3s 0.06s ease both",
            borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`,
            touchAction: "none", userSelect: "none", position: "relative",
            display: "grid", gridTemplateColumns: `repeat(25, 1fr)`, gridTemplateRows: `repeat(25, 1fr)`,
          }}
          onPointerDown={creatorPointerDown}
          onPointerMove={creatorPointerMove}
          onPointerUp={creatorPointerUp}
          onPointerLeave={creatorPointerUp}
          onPointerCancel={creatorPointerUp}
        >
          {creatorGrid.flat().map((color, i) => (
            <div
              key={i}
              style={{
                backgroundColor: color || C.surface,
                outline: (i % 5 === 4 && (i % 25) < 24) || (Math.floor(i / 25) % 5 === 4 && Math.floor(i / 25) < 24) ? `0.5px solid ${C.border}88` : "none",
              }}
            />
          ))}
          {/* 5x5 tile grid lines overlay */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {[1,2,3,4].map(i => (
              <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${i * 20}%`, width: 1, backgroundColor: C.accent + "44" }} />
            ))}
            {[1,2,3,4].map(i => (
              <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${i * 20}%`, height: 1, backgroundColor: C.accent + "44" }} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.3s 0.08s ease both" }}>
          {mosaicMsg && (
            <div style={{
              textAlign: "center", padding: "8px 12px", borderRadius: 8,
              backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
              fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.accent, letterSpacing: 0.5,
            }}>
              {mosaicMsg}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSaveMosaic}
              disabled={mosaicLoading}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 1.5,
                background: C.accent, color: C.bg, border: "none", cursor: mosaicLoading ? "not-allowed" : "pointer",
                textTransform: "uppercase", transition: "all 0.15s", opacity: mosaicLoading ? 0.6 : 1,
              }}
            >
              {mosaicLoading ? "Saving..." : creatorEditingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => { resetCreator(); }}
              style={{
                padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                textTransform: "uppercase", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
            >
              Clear
            </button>
          </div>
          {!firebaseUser && firebaseConfigured && (
            <div style={{ textAlign: "center", fontSize: 11, color: C.textDim, marginTop: 4 }}>
              Sign in from the menu to save your creations
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MOSAIC GALLERY VIEW ---
  if (view === "gallery") {
    const currentList = mosaicGalleryTab === "mine" ? myMosaics
      : mosaicGalleryTab === "shared" ? sharedMosaics
      : mosaicGalleryTab === "public" ? publicMosaicsList
      : [];
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", alignItems: "center", gap: 12, marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
          <button onClick={() => setView("menu")}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
              color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontSize: 12, letterSpacing: 1, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            &larr; Back
          </button>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            Mosaics
          </h2>
          {firebaseUser && (
            <button onClick={() => { resetCreator(); setCreatorReturnView("gallery"); setView("creator"); }}
              style={{
                background: C.accent, color: C.bg, border: "none", borderRadius: 8, padding: "6px 14px",
                cursor: "pointer", fontFamily: "'Space Mono', monospace",
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
              }}
            >
              + New
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 16, animation: "fadeUp 0.3s 0.02s ease both" }}>
          {[
            { key: "mine", label: "My Mosaics" },
            { key: "shared", label: "Shared" },
            { key: "public", label: "Public" },
            { key: "friends", label: "Friends" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setMosaicGalleryTab(tab.key); loadMosaicData(tab.key); }}
              style={{
                flex: 1, padding: "10px 0", fontSize: 11, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                background: mosaicGalleryTab === tab.key ? C.accent : "transparent",
                color: mosaicGalleryTab === tab.key ? C.bg : C.textDim,
                border: "none", cursor: "pointer", textTransform: "uppercase",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mosaicMsg && (
          <div style={{
            width: "100%", maxWidth: 400, textAlign: "center", padding: "8px 12px", borderRadius: 8, marginBottom: 12,
            backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
            fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.accent,
          }}>
            {mosaicMsg}
          </div>
        )}

        {/* Share modal */}
        {shareTargetMosaic && (
          <div onClick={() => { setShareTargetMosaic(null); setShareEmailInput(""); }} style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
              padding: 24, maxWidth: 340, width: "100%", animation: "fadeUp 0.25s ease",
              maxHeight: "80vh", overflowY: "auto",
            }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent, margin: "0 0 12px", textAlign: "center" }}>
                Share Mosaic
              </h3>
              <p style={{ fontSize: 11, color: C.textDim, textAlign: "center", marginBottom: 16 }}>
                Share "{shareTargetMosaic.title}" with a friend
              </p>
              {/* Friends list */}
              {friendsList.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>
                    Friends
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {friendsList.map(friend => (
                      <button
                        key={friend.uid}
                        onClick={() => handleShareMosaic(shareTargetMosaic, friend.username)}
                        disabled={mosaicLoading}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                          borderRadius: 10, backgroundColor: C.surface, border: `1px solid ${C.border}`,
                          cursor: mosaicLoading ? "not-allowed" : "pointer", transition: "all 0.15s",
                          width: "100%", textAlign: "left",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                      >
                        {friend.profilePicture ? (
                          <img src={friend.profilePicture} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: C.accent + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                            {(friend.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", color: C.text, fontWeight: 600 }}>
                          {friend.username}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0 0" }} />
                </div>
              )}
              {/* Manual username entry */}
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>
                {friendsList.length > 0 ? "Or enter a username" : "Enter a username"}
              </div>
              <input
                type="text"
                value={shareEmailInput}
                onChange={e => setShareEmailInput(e.target.value)}
                placeholder="Username"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  backgroundColor: C.surface, border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 16, fontFamily: "'Space Mono', monospace",
                  outline: "none", boxSizing: "border-box", marginBottom: 12,
                }}
                onFocus={e => { e.target.style.borderColor = C.accent; }}
                onBlur={e => { e.target.style.borderColor = C.border; }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleShareMosaic(shareTargetMosaic, shareEmailInput)}
                  disabled={!shareEmailInput.trim() || mosaicLoading}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    background: shareEmailInput.trim() ? C.accent : C.surfaceLight,
                    color: shareEmailInput.trim() ? C.bg : C.textDim,
                    border: "none", cursor: shareEmailInput.trim() ? "pointer" : "not-allowed",
                    textTransform: "uppercase",
                  }}
                >
                  {mosaicLoading ? "Sharing..." : "Share"}
                </button>
                <button
                  onClick={() => { setShareTargetMosaic(null); setShareEmailInput(""); }}
                  style={{
                    padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {mosaicGalleryTab === "friends" ? (
          /* Friends tab content */
          !firebaseUser ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, lineHeight: 1.8 }}>
              Sign in to manage friends<br/>
              <button onClick={() => { setShowAccountModal(true); setAutoLoginModal(false); setAccountError(""); }}
                style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", background: C.accent, color: C.bg, border: "none", cursor: "pointer" }}
              >Sign In</button>
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.3s ease" }}>
              {/* Add friend input */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>
                  Add Friend by Username
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={addFriendInput}
                    onChange={e => setAddFriendInput(e.target.value)}
                    placeholder="Enter username"
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      color: C.text, fontSize: 14, fontFamily: "'Space Mono', monospace",
                      outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={e => { e.target.style.borderColor = C.accent; }}
                    onBlur={e => { e.target.style.borderColor = C.border; }}
                    onKeyDown={e => { if (e.key === "Enter" && addFriendInput.trim()) handleAddFriend(); }}
                  />
                  <button
                    onClick={handleAddFriend}
                    disabled={!addFriendInput.trim() || addFriendLoading}
                    style={{
                      padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: addFriendInput.trim() ? C.accent : C.surfaceLight,
                      color: addFriendInput.trim() ? C.bg : C.textDim,
                      border: "none", cursor: addFriendInput.trim() ? "pointer" : "not-allowed",
                      textTransform: "uppercase", flexShrink: 0,
                    }}
                  >
                    {addFriendLoading ? "..." : "Add"}
                  </button>
                </div>
                {addFriendMsg && (
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 6, fontFamily: "'Space Mono', monospace" }}>
                    {addFriendMsg}
                  </div>
                )}
              </div>
              {/* Friends list */}
              {friendsList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: C.textDim, fontSize: 13, lineHeight: 1.8 }}>
                  No friends added yet. Add friends by their username to quickly share mosaics with them.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                    Your Friends ({friendsList.length})
                  </div>
                  {friendsList.map(friend => (
                    <div key={friend.uid} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
                    }}>
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.accent + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.accent, fontWeight: 700, flexShrink: 0 }}>
                          {(friend.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {friend.username}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.uid)}
                        title="Remove friend"
                        style={{
                          background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                          padding: "4px 10px", color: C.textDim, cursor: "pointer", fontSize: 10,
                          fontFamily: "'Space Mono', monospace", transition: "all 0.15s", flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.incorrect; e.currentTarget.style.color = C.incorrect; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : mosaicLoading && currentList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 13 }}>Loading...</div>
        ) : !firebaseUser && mosaicGalleryTab !== "public" ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, lineHeight: 1.8 }}>
            Sign in to see your mosaics<br/>
            <button onClick={() => { setShowAccountModal(true); setAutoLoginModal(false); setAccountError(""); }}
              style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", background: C.accent, color: C.bg, border: "none", cursor: "pointer" }}
            >Sign In</button>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, lineHeight: 1.8, animation: "fadeUp 0.3s ease" }}>
            {mosaicGalleryTab === "mine" ? "No mosaics yet. Create your first one!" :
             mosaicGalleryTab === "shared" ? "No mosaics shared with you yet." :
             "No public mosaics yet."}
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.3s 0.04s ease both" }}>
            {currentList.map(mosaic => (
              <div key={mosaic.id} style={{
                display: "flex", gap: 12, padding: "12px", borderRadius: 12,
                backgroundColor: C.surface, border: `1px solid ${C.border}`, alignItems: "center",
              }}>
                <div style={{ cursor: "pointer" }} onClick={() => mosaic.grid && startCustomMosaicPlay(mosaic)}>
                  <MosaicThumbnail grid={mosaic.grid} size={64} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mosaic.title || "Untitled"}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim }}>
                    {mosaicGalleryTab === "shared" && mosaic.sharedByUsername ? `From ${mosaic.sharedByUsername}` :
                     mosaicGalleryTab === "public" && mosaic.authorUsername ? `By ${mosaic.authorUsername}` :
                     mosaic.publicStatus === "approved" ? "Published" :
                     mosaic.publicStatus === "pending" ? "Pending review" :
                     mosaic.publicStatus === "rejected" ? "Not approved" : ""}
                  </div>
                </div>
                {mosaic.grid && (
                  <button onClick={() => startCustomMosaicPlay(mosaic)} title="Play as puzzle"
                    style={{ background: C.accent, border: "none", borderRadius: 6, padding: "4px 10px", color: C.bg, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", flexShrink: 0, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >Play</button>
                )}
                {mosaicGalleryTab === "mine" && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => editMosaic(mosaic)} title="Edit"
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.textDim, cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                    >Edit</button>
                    <button onClick={() => setShareTargetMosaic(mosaic)} title="Share"
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.textDim, cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#4ECDC4"; e.currentTarget.style.color = "#4ECDC4"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                    >Share</button>
                    {!mosaic.publicStatus && (
                      <button onClick={() => handleSubmitForReview(mosaic)} title="Submit to public gallery"
                        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.textDim, cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#FFE66D"; e.currentTarget.style.color = "#FFE66D"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                      >Publish</button>
                    )}
                    <button onClick={() => handleDeleteMosaic(mosaic.id)} title="Delete"
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.textDim, cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.incorrect; e.currentTarget.style.color = C.incorrect; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                    >Del</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- ADMIN REVIEW VIEW ---
  if (view === "admin-review") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", gap: 12, marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
          <button onClick={() => setView("menu")}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
              color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontSize: 12, letterSpacing: 1, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            &larr; Back
          </button>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            Review Mosaics
          </h2>
          <button onClick={() => loadMosaicData("admin")}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
              color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontSize: 11, letterSpacing: 0.5, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            Refresh
          </button>
        </div>

        {mosaicMsg && (
          <div style={{
            width: "100%", maxWidth: 480, textAlign: "center", padding: "8px 12px", borderRadius: 8, marginBottom: 12,
            backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
            fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.accent,
          }}>
            {mosaicMsg}
          </div>
        )}

        {mosaicLoading && pendingMosaicsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 13 }}>Loading...</div>
        ) : pendingMosaicsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, animation: "fadeUp 0.3s ease" }}>
            No mosaics pending review
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.3s 0.02s ease both" }}>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
              {pendingMosaicsList.length} pending
            </div>
            {pendingMosaicsList.map(mosaic => (
              <div key={mosaic.id} style={{
                padding: 16, borderRadius: 14,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
                  <MosaicThumbnail grid={mosaic.grid} size={100} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                      {mosaic.title || "Untitled"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>
                      By: {mosaic.authorUsername || "Unknown"}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim }}>
                      {mosaic.gridSize || 8}x{mosaic.gridSize || 8} grid
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleApproveMosaic(mosaic)}
                    disabled={mosaicLoading}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: C.correct, color: C.bg, border: "none", cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s", opacity: mosaicLoading ? 0.6 : 1,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectMosaic(mosaic)}
                    disabled={mosaicLoading}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: C.incorrect, color: "#fff", border: "none", cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s", opacity: mosaicLoading ? 0.6 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Account modal (shared across views) ---
  const accountModalEl = showAccountModal && firebaseConfigured && (
    <div onClick={() => autoLoginModal ? dismissAutoLogin() : setShowAccountModal(false)} style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "24px", maxWidth: 380, width: "100%",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        animation: "fadeUp 0.25s ease",
      }}>
        {firebaseUser ? (
          // Signed in: redirect to profile page
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              {/* Profile picture */}
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
                backgroundColor: C.surface, display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${C.border}`, overflow: "hidden",
              }}>
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#60A5FA" strokeWidth="2" fill="none"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#60A5FA" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <h3 style={{
                fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: C.accent, margin: "0 0 6px",
              }}>
                {username || "Signed In"}
              </h3>
              <p style={{ color: C.textDim, fontSize: 12, margin: 0, wordBreak: "break-all" }}>
                {firebaseUser.email}
              </p>
            </div>

            <div style={{
              padding: "12px 16px", borderRadius: 10, backgroundColor: C.surface,
              border: `1px solid ${C.border}`, marginBottom: 12, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>Cloud Sync</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.correct }}>
                {syncStatus === "syncing" ? "Syncing..." : syncStatus === "error" ? "Sync error" : "Active"}
              </div>
            </div>

            <button
              onClick={() => { setShowAccountModal(false); setShowProfilePage(true); }}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                background: C.accent, color: C.bg, border: "none", cursor: "pointer",
                textTransform: "uppercase", transition: "all 0.15s", marginBottom: 8,
              }}
            >
              Edit Profile
            </button>

            <button
              onClick={handleSignOut}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                textTransform: "uppercase", transition: "all 0.15s",
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          // Sign in / Sign up view
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", margin: "0 auto 12px",
                backgroundColor: "#60A5FA22", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #60A5FA44",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#60A5FA" strokeWidth="2" fill="none"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#60A5FA" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 style={{
                fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: C.accent, margin: "0 0 6px",
              }}>
                {accountTab === "login" ? "Sign In" : "Create Account"}
              </h3>
              <p style={{ color: C.textDim, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                {accountTab === "login"
                  ? "Sign in to sync your progress across devices"
                  : "Your current progress will be saved to your new account"}
              </p>
            </div>

            {/* Tab toggle */}
            <div style={{
              display: "flex", borderRadius: 8, overflow: "hidden",
              border: `1px solid ${C.border}`, marginBottom: 16,
            }}>
              {["login", "signup"].map(tab => (
                <button key={tab} onClick={() => { setAccountTab(tab); setAccountError(""); }} style={{
                  flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                  background: accountTab === tab ? C.accent : "transparent",
                  color: accountTab === tab ? C.bg : C.textDim,
                  border: "none", cursor: "pointer", textTransform: "uppercase",
                  transition: "all 0.15s",
                }}>
                  {tab === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Google sign in */}
            <button
              onClick={handleGoogleSignIn}
              disabled={accountLoading}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                cursor: accountLoading ? "not-allowed" : "pointer",
                opacity: accountLoading ? 0.5 : 1, textTransform: "uppercase",
                transition: "all 0.15s", marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
            }}>
              <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            </div>

            {/* Email / password form */}
            <form onSubmit={e => {
              e.preventDefault();
              if (accountTab === "login") handleSignIn(accountEmail, accountPassword);
              else handleSignUp(accountEmail, accountPassword);
            }}>
              <input
                type="email"
                placeholder="Email"
                value={accountEmail}
                onChange={e => setAccountEmail(e.target.value)}
                autoComplete="email"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 16,
                  fontFamily: "'DM Sans', sans-serif",
                  background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                  outline: "none", marginBottom: 8, boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <input
                type="password"
                placeholder="Password"
                value={accountPassword}
                onChange={e => setAccountPassword(e.target.value)}
                autoComplete={accountTab === "login" ? "current-password" : "new-password"}
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 16,
                  fontFamily: "'DM Sans', sans-serif",
                  background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                  outline: "none", marginBottom: 12, boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />

              {accountError && (
                <div style={{
                  padding: "8px 12px", borderRadius: 8, marginBottom: 12,
                  backgroundColor: C.incorrect + "18", border: `1px solid ${C.incorrect}44`,
                  fontSize: 11, color: C.incorrect, textAlign: "center",
                }}>
                  {accountError}
                </div>
              )}

              <button
                type="submit"
                disabled={accountLoading || !accountEmail || !accountPassword}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                  background: C.accent, color: C.bg, border: "none",
                  cursor: (accountLoading || !accountEmail || !accountPassword) ? "not-allowed" : "pointer",
                  opacity: (accountLoading || !accountEmail || !accountPassword) ? 0.5 : 1,
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
              >
                {accountLoading ? "..." : accountTab === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </>
        )}

        {/* Don't ask me again (only shown when modal was auto-opened and user is not signed in) */}
        {autoLoginModal && !firebaseUser && (
          <button
            onClick={dismissAutoLoginPermanently}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 11, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3,
              background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
              transition: "all 0.15s", marginTop: 12,
            }}
          >
            Don't ask me again
          </button>
        )}

        {/* Close button */}
        <button
          onClick={() => autoLoginModal ? dismissAutoLogin() : setShowAccountModal(false)}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 11, fontWeight: 700,
            fontFamily: "'Space Mono', monospace", letterSpacing: 1,
            background: "none", border: "none", color: C.textDim, cursor: "pointer",
            textTransform: "uppercase", transition: "all 0.15s", marginTop: autoLoginModal && !firebaseUser ? 6 : 12,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  // --- Username modal (non-dismissible when logged in without username, dismissible when changing) ---
  const usernameModalEl = showUsernameModal && firebaseUser && firebaseConfigured && (
    <div onClick={username ? () => { setShowUsernameModal(false); setUsernameError(""); } : undefined} style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 1200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "24px", maxWidth: 380, width: "100%",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        animation: "fadeUp 0.25s ease",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", margin: "0 auto 12px",
            backgroundColor: C.accent + "22", display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.accent}44`,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke={C.accent} strokeWidth="2" fill="none"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={C.accent} strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: C.accent, margin: "0 0 6px",
          }}>
            Choose a Username
          </h3>
          <p style={{ color: C.textDim, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            Pick a unique username. This will be your public identity for sharing and invites.
          </p>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Username"
            value={usernameInput}
            onChange={e => {
              const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
              setUsernameInput(v);
              checkUsernameDebounced(v);
            }}
            autoComplete="username"
            style={{
              width: "100%", padding: "11px 14px", paddingRight: 40, borderRadius: 10, fontSize: 16,
              fontFamily: "'Space Mono', monospace",
              background: C.surface, border: `1px solid ${usernameError ? C.incorrect : usernameAvailable === true ? C.correct : C.border}`,
              color: C.text, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
          />
          {usernameInput.trim().length >= 3 && usernameAvailable !== null && (
            <div style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 16, lineHeight: 1,
            }}>
              {usernameAvailable ? (
                <span style={{ color: C.correct }}>{"\u2713"}</span>
              ) : (
                <span style={{ color: C.incorrect }}>{"\u2717"}</span>
              )}
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, paddingLeft: 2 }}>
          3-20 characters. Letters, numbers, and underscores only.
        </div>

        {usernameError && (
          <div style={{
            padding: "8px 12px", borderRadius: 8, marginBottom: 12,
            backgroundColor: C.incorrect + "18", border: `1px solid ${C.incorrect}44`,
            fontSize: 11, color: C.incorrect, textAlign: "center",
          }}>
            {usernameError}
          </div>
        )}

        <button
          onClick={handleSaveUsername}
          disabled={usernameLoading || !usernameInput.trim() || usernameInput.trim().length < 3 || usernameAvailable !== true}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
            fontFamily: "'Space Mono', monospace", letterSpacing: 2,
            background: (usernameAvailable === true && usernameInput.trim().length >= 3) ? C.accent : C.surfaceLight,
            color: (usernameAvailable === true && usernameInput.trim().length >= 3) ? C.bg : C.textDim,
            border: "none",
            cursor: (usernameAvailable === true && usernameInput.trim().length >= 3 && !usernameLoading) ? "pointer" : "not-allowed",
            opacity: usernameLoading ? 0.5 : 1,
            textTransform: "uppercase", transition: "all 0.15s",
          }}
        >
          {usernameLoading ? "Saving..." : username ? "Update Username" : "Set Username"}
        </button>

        {/* Close button only when user already has a username (changing it) */}
        {username && (
          <button
            onClick={() => { setShowUsernameModal(false); setUsernameError(""); }}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 11, fontWeight: 700,
              fontFamily: "'Space Mono', monospace", letterSpacing: 1,
              background: "none", border: "none", color: C.textDim, cursor: "pointer",
              textTransform: "uppercase", transition: "all 0.15s", marginTop: 8,
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  // --- Profile page modal ---
  const profilePageEl = showProfilePage && firebaseUser && firebaseConfigured && (
    <div onClick={() => setShowProfilePage(false)} style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "24px", maxWidth: 400, width: "100%",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        animation: "fadeUp 0.25s ease",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {/* Profile picture */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto",
              backgroundColor: C.surface, display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${C.border}`, overflow: "hidden", position: "relative",
            }}>
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke={C.textDim} strokeWidth="2" fill="none"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={C.textDim} strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <label style={{
              position: "absolute", bottom: -2, right: -2,
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: C.accent, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: profilePictureLoading ? "not-allowed" : "pointer",
              border: `2px solid ${C.bg}`,
              opacity: profilePictureLoading ? 0.5 : 1,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                disabled={profilePictureLoading}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </label>
          </div>

          {profilePicture && (
            <button
              onClick={handleRemoveProfilePicture}
              disabled={profilePictureLoading}
              style={{
                display: "block", margin: "4px auto 0", background: "none", border: "none",
                color: C.textDim, fontSize: 10, cursor: "pointer", textDecoration: "underline",
              }}
            >
              Remove photo
            </button>
          )}

          <h3 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: C.accent,
            margin: profilePicture ? "8px 0 4px" : "0 0 4px",
          }}>
            Profile
          </h3>
          <p style={{ color: C.textDim, fontSize: 12, margin: 0, wordBreak: "break-all" }}>
            {firebaseUser.email}
          </p>
        </div>

        {/* Username section */}
        <div style={{
          padding: "14px 16px", borderRadius: 10, backgroundColor: C.surface,
          border: `1px solid ${C.border}`, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>Username</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              flex: 1, fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
              color: username ? C.text : C.textDim,
            }}>
              {username || "Not set"}
            </div>
            <button
              onClick={() => {
                setUsernameInput(username || "");
                setUsernameError("");
                setUsernameAvailable(null);
                setShowProfilePage(false);
                setShowUsernameModal(true);
              }}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                fontFamily: "'Space Mono', monospace",
                background: "none", border: `1px solid ${C.border}`, color: C.textDim,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
              }}
            >
              {username ? "Change" : "Set"}
            </button>
          </div>
        </div>

        {/* Cloud sync section */}
        <div style={{
          padding: "12px 16px", borderRadius: 10, backgroundColor: C.surface,
          border: `1px solid ${C.border}`, marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>Cloud Sync</div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.correct }}>
            {syncStatus === "syncing" ? "Syncing..." : syncStatus === "error" ? "Sync error" : "Active"}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
            fontFamily: "'Space Mono', monospace", letterSpacing: 1,
            background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
            textTransform: "uppercase", transition: "all 0.15s", marginBottom: 8,
          }}
        >
          Sign out
        </button>

        <button
          onClick={() => setShowProfilePage(false)}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 11, fontWeight: 700,
            fontFamily: "'Space Mono', monospace", letterSpacing: 1,
            background: "none", border: "none", color: C.textDim, cursor: "pointer",
            textTransform: "uppercase", transition: "all 0.15s",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  // --- MENU VIEW ---
  if (view === "menu") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(32px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } @keyframes achievementToastIn { 0%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.6)} 40%{opacity:1;transform:translateX(-50%) translateY(6px) scale(1.05)} 60%{transform:translateX(-50%) translateY(-3px) scale(0.98)} 80%{transform:translateX(-50%) translateY(1px) scale(1.01)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} } @keyframes achievementToastOut { 0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.85)} } @keyframes achievementBadgeSpin { 0%{transform:rotateY(0deg) scale(1)} 30%{transform:rotateY(180deg) scale(1.2)} 60%{transform:rotateY(360deg) scale(1.1)} 100%{transform:rotateY(360deg) scale(1)} } @keyframes achievementGlow { 0%{box-shadow:0 0 0px transparent} 30%{box-shadow:0 0 24px currentColor} 100%{box-shadow:0 0 0px transparent} } @keyframes achievementShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} } @keyframes achievementSparkle { 0%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1) rotate(180deg)} 100%{opacity:0;transform:scale(0) rotate(360deg)} }`}</style>

        <div style={{ textAlign: "center", marginBottom: 16, animation: "fadeUp 0.5s ease", position: "relative", width: "100%", maxWidth: 360 }}>
          {/* Menu button */}
          <button
            onClick={() => setShowGameMenu(true)}
            style={{
              position: "absolute", top: 2, right: 0,
              background: "none", border: `1px solid ${C.border}`, borderRadius: 10,
              width: 38, height: 38, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="2" rx="1" fill={C.textDim} />
              <rect x="2" y="8" width="14" height="2" rx="1" fill={C.textDim} />
              <rect x="2" y="13" width="14" height="2" rx="1" fill={C.textDim} />
            </svg>
          </button>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: 4, margin: 0, color: C.accent }}>
            Agnus
          </h1>
          <p style={{ color: C.textDim, fontSize: 13, marginTop: 6, letterSpacing: 2 }}>
            find the pattern &middot; fill the gaps
          </p>
          {firebaseConfigured && firebaseUser && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 6, fontSize: 10, color: C.textDim,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor: syncStatus === "syncing" ? C.inProgress : syncStatus === "error" ? C.incorrect : C.correct,
                transition: "background-color 0.3s",
              }} />
              <span>Signed in as {username || firebaseUser.email}</span>
            </div>
          )}
        </div>

        {/* Daily overview: streak, play today, share */}
        {(() => {
          const todayIdx = getTodayDailyIndex();
          const todayKey = getDailyKey(todayIdx);
          const todayResult = (progress.daily || {})[todayKey];
          const todayTime = (times.daily || {})[todayKey];
          const streak = getDailyStreak(progress);
          const todayLabel = getDailyDateLabel(todayIdx);
          return (
            <div style={{
              width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.02s ease both",
              borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`,
              backgroundColor: C.surface, padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.accent }}>Today: {todayLabel}</span>
                  {streak > 0 && (
                    <span style={{ fontSize: 12, color: C.textDim }}>🔥 {streak} day streak</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {todayResult > 0 && (
                    <span style={{ fontSize: 11, color: C.textDim }}>
                      <ScoreBadge attempts={todayResult} />
                      {todayTime != null && ` ${formatTime(todayTime)}`}
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      const medal = todayResult <= 2 ? "\u2605" : todayResult <= 4 ? "\u25CF" : "\u25C6";
                      const streakPart = streak > 0 ? ` 🔥 ${streak} day streak` : "";
                      const dailyUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=daily&date=${todayLabel}` : "";
                      const text = todayResult > 0
                        ? `Agnus Daily ${todayLabel}\n${medal} Solved in ${todayResult} attempt${todayResult !== 1 ? "s" : ""} \u2022 ${formatTime(todayTime)}${streakPart}`
                        : `Agnus Daily ${todayLabel}\n\uD83E\uDDE9 One puzzle per day`;
                      const result = await tryNativeShare({ text, url: dailyUrl });
                      if (result === "shared") {
                        setDailyShareMsg("Shared!");
                        setTimeout(() => setDailyShareMsg(""), 2000);
                        return;
                      }
                      if (result === "cancelled") return;
                      try { await navigator.clipboard.writeText(text + "\n" + dailyUrl); } catch { /* fallback */ }
                      setDailyShareMsg("Copied!");
                      setTimeout(() => setDailyShareMsg(""), 2000);
                    }}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                      background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                    }}
                  >
                    {dailyShareMsg || "Share"}
                  </button>
                  <button
                    onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, todayLabel); }}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: C.accent, color: C.bg, border: "none", cursor: "pointer",
                    }}
                  >
                    {todayResult > 0 ? "View today's result" : "Play today"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Mode selector: categorized auto-wrapping grid */}
        <div style={{
          marginBottom: 20, animation: "fadeUp 0.5s 0.05s ease both",
          width: "100%", maxWidth: 360,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {MODE_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div style={{
                fontSize: 9, color: C.textDim, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 6,
                fontFamily: "'Space Mono', monospace",
              }}>{cat}</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 8,
              }}>
                {DIFFICULTIES.filter((d) => d.cat === cat).map((d) => {
                  const active = difficulty === d.key;
                  const dp = progress[d.key] || {};
                  const solved = d.key === "cascade"
                    ? Object.keys(dp).filter((k) => /^\d+$/.test(k) && dp[k] === CASCADE_LEVELS.length).length
                    : Object.keys(dp).filter((k) => dp[k] > 0).length;
                  const modeTotal = d.key === "mosaic" ? 25 : 50;
                  const isCleared = d.key !== "daily" && solved >= modeTotal;
                  return (
                    <button
                      key={d.key}
                      onClick={() => setDifficulty(d.key)}
                      style={{
                        padding: "12px 8px",
                        background: active ? (isCleared ? C.gold : d.key === "blind" ? "#e06040" : C.accent) : C.surface,
                        color: active ? (d.key === "blind" && !isCleared ? "#fff" : C.bg) : isCleared ? C.gold : C.textDim,
                        border: active ? "1px solid transparent" : isCleared ? `1.5px solid ${C.gold}88` : `1px solid ${C.border}`,
                        borderRadius: 10,
                        cursor: "pointer",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 11,
                        fontWeight: active ? 700 : isCleared ? 600 : 400,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        transition: "background 0.2s, color 0.2s, border 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        position: "relative",
                      }}
                    >
                      <span style={{ whiteSpace: "nowrap" }}>{d.label}</span>
                      <span style={{
                        fontSize: 8,
                        color: active ? (d.key === "blind" && !isCleared ? "#fff9" : C.bg + "aa") : isCleared ? C.gold + "cc" : C.textDim,
                      }}>{d.desc}</span>
                      <span style={{ fontSize: 8, color: active ? (d.key === "blind" && !isCleared ? "#fff7" : C.bg + "88") : isCleared ? C.gold + "bb" : C.textDim }}>{d.key === "daily" ? `${solved} solved` : d.key === "mosaic" ? `${solved}/25` : `${solved}/50`}{isCleared ? " \u2713" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Stats summary with inline share */}
        {isDaily ? (
          <div style={{
            width: "100%", maxWidth: 360,
            display: "flex", gap: 24, marginBottom: 24, animation: "fadeUp 0.5s 0.1s ease both",
            padding: "12px 24px", borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
            alignItems: "center", boxSizing: "border-box",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Solved</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.accent }}>{completedCount}</div>
            </div>
            <div style={{ width: 1, alignSelf: "stretch", backgroundColor: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Streak</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.gold }}>{getDailyStreak(progress)}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowShareModal(true)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
            >
              Stats
            </button>
          </div>
        ) : (
          <div style={{
            width: "100%", maxWidth: 360,
            display: "flex", gap: 24, marginBottom: 24, animation: "fadeUp 0.5s 0.1s ease both",
            padding: "12px 24px", borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
            alignItems: "center", boxSizing: "border-box",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Solved</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: C.accent }}>{completedCount}</div>
            </div>
            <div style={{ width: 1, alignSelf: "stretch", backgroundColor: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>Attempted</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700 }}>{totalAttempted}</div>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowShareModal(true)}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
            >
              Stats
            </button>
          </div>
        )}

        {/* Achievements button — now also accessible from game menu */}
        {(() => {
          const achs = computeAchievements(progress, times, savedAchievementIds);
          const unlocked = achs.filter(a => a.unlocked).length;
          const total = achs.length;
          return (
            <div style={{
              width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.12s ease both",
            }}>
              <button onClick={() => setShowAchievements(true)} style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  backgroundColor: C.accent + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${C.accent}44`,
                }}>
                  <span style={{ fontSize: 14, color: C.accent, lineHeight: 1 }}>{"\u2605"}</span>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                    Achievements
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.accent, fontWeight: 700 }}>
                    {unlocked}/{total}
                  </span>
                  <div style={{
                    height: 4, width: 40, borderRadius: 2, backgroundColor: C.surfaceLight, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 2, backgroundColor: C.accent,
                      width: `${(unlocked / total) * 100}%`,
                    }} />
                  </div>
                </div>
              </button>
            </div>
          );
        })()}

        {/* Birthday panel — same layout as "play today" */}
        {isDaily && (() => {
          const todaySeed = getDailySeedForIndex(0);
          if (!birthday) {
            return (
              <div style={{
                width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.03s ease both",
                borderRadius: 12, overflow: "hidden", border: `1px solid #F472B633`,
                backgroundColor: C.surface, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: "#F472B6" }}>
                    {"\uD83C\uDF82"} Birthday puzzle
                  </span>
                  <button
                    onClick={() => setShowBirthdayPrompt(true)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: "#F472B6", color: "#fff", border: "none", cursor: "pointer",
                    }}
                  >
                    Set birthday
                  </button>
                </div>
              </div>
            );
          }
          const bdParts = birthday.split("-").map(Number);
          const bdDay = bdParts[0], bdMonthNum = bdParts[1], bdYearNum = bdParts.length === 3 ? bdParts[2] : null;
          const bdDateStr = birthday;
          const bdSeed = getDailySeedForDate(bdDateStr);
          const bdResult = (progress.daily || {})[bdSeed];
          const bdTime = (times.daily || {})[bdSeed];
          const bdSolved = bdResult > 0;
          const bdIsFuture = bdSeed > todaySeed;
          const bdUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=daily&date=${bdDateStr}` : "";
          const bdLabel = `${String(bdDay).padStart(2, "0")}-${String(bdMonthNum).padStart(2, "0")}${bdYearNum ? `-${bdYearNum}` : ""}`;
          return (
            <div style={{
              width: "100%", maxWidth: 360, marginBottom: 16, animation: "fadeUp 0.5s 0.03s ease both",
              borderRadius: 12, overflow: "hidden", border: `1px solid #F472B633`,
              backgroundColor: C.surface, padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: "#F472B6" }}>
                    {"\uD83C\uDF82"} {bdLabel}
                  </span>
                  {bdSolved && (
                    <span style={{ fontSize: 11, color: C.textDim }}>
                      <ScoreBadge attempts={bdResult} />
                      {bdTime != null && ` ${formatTime(bdTime)}`}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {bdYearNum && !bdIsFuture && (
                    <button
                      onClick={async () => {
                        const medal = bdSolved && bdResult <= 2 ? "\u2605" : bdResult <= 4 ? "\u25CF" : "\u25C6";
                        const text = bdSolved
                          ? `\uD83C\uDF82 My Agnus birthday puzzle (${bdDateStr})\n${medal} Solved in ${bdResult} attempt${bdResult !== 1 ? "s" : ""} \u2022 ${formatTime(bdTime)}\nCan you beat it?\n${bdUrl}`
                          : `\uD83C\uDF82 Try my Agnus birthday puzzle!\n${bdDateStr}\n${bdUrl}`;
                        const result = await tryNativeShare({ text, url: bdUrl });
                        if (result === "shared") { setDailyShareMsg("Shared!"); setTimeout(() => setDailyShareMsg(""), 2000); return; }
                        if (result === "cancelled") return;
                        try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
                        setDailyShareMsg("Copied!");
                        setTimeout(() => setDailyShareMsg(""), 2000);
                      }}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                        background: "none", border: `1px solid #F472B644`, color: "#F472B6", cursor: "pointer",
                      }}
                    >
                      {dailyShareMsg || "Share"}
                    </button>
                  )}
                  {bdYearNum && !bdIsFuture ? (
                    <button
                      onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, bdDateStr); }}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                        background: "#F472B6", color: "#fff", border: "none", cursor: "pointer",
                      }}
                    >
                      {bdSolved ? "View" : "Play"}
                    </button>
                  ) : bdIsFuture ? (
                    <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Space Mono', monospace" }}>
                      Not yet available
                    </span>
                  ) : null}
                  <button
                    onClick={() => setShowBirthdayPrompt(true)}
                    style={{
                      padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                      background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Daily calendar picker */}
        {isDaily && (() => {
          const todaySeed = getDailySeedForIndex(0);
          const now = new Date();
          const todayUTCYear = now.getUTCFullYear();
          const todayUTCMonth = now.getUTCMonth();
          const todayUTCDate = now.getUTCDate();
          const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
          const firstDayOfWeek = new Date(Date.UTC(calendarYear, calendarMonth, 1)).getUTCDay();
          const startOffset = (firstDayOfWeek + 6) % 7; // Monday = 0
          const canGoForward = calendarYear < todayUTCYear || (calendarYear === todayUTCYear && calendarMonth < todayUTCMonth);
          const isViewingCurrentMonth = calendarYear === todayUTCYear && calendarMonth === todayUTCMonth;
          // Parse birthday for calendar highlighting
          const bdParts = birthday ? birthday.split("-").map(Number) : null;
          const bdDay = bdParts ? bdParts[0] : null;
          const bdMonth = bdParts ? bdParts[1] : null;
          const bdYear = bdParts && bdParts.length === 3 ? bdParts[2] : null;
          const isBirthdayMonth = bdMonth != null && (calendarMonth + 1) === bdMonth;
          const cells = [];
          for (let i = 0; i < startOffset; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${String(d).padStart(2, "0")}-${String(calendarMonth + 1).padStart(2, "0")}-${calendarYear}`;
            const seed = getDailySeedForDate(dateStr);
            const result = (progress.daily || {})[seed];
            const time = (times.daily || {})[seed];
            const isFuture = seed > todaySeed;
            const isToday = calendarYear === todayUTCYear && calendarMonth === todayUTCMonth && d === todayUTCDate;
            const isBirthday = isBirthdayMonth && d === bdDay;
            const isExactBirthday = isBirthday && bdYear != null && calendarYear === bdYear;
            cells.push({ day: d, dateStr, seed, result, time, isFuture, isToday, isBirthday, isExactBirthday });
          }
          const handleGoToDate = (e) => {
            const val = e.target.value;
            if (!val) return;
            const [year, month, day] = val.split("-").map(Number);
            if (!year || !month || !day) return;
            setCalendarYear(year);
            setCalendarMonth(month - 1);
            // Reset the input so the same date can be re-selected
            e.target.value = "";
          };
          const todayISO = `${todayUTCYear}-${String(todayUTCMonth + 1).padStart(2, "0")}-${String(todayUTCDate).padStart(2, "0")}`;
          return (
            <div style={{ maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both" }}>
              {/* Month navigation with Today button */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
              }}>
                <button
                  onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }}
                  style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px",
                    color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 14, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                >&larr;</button>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 1 }}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={() => { if (canGoForward) { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); } }}
                  disabled={!canGoForward}
                  style={{
                    background: "none", border: `1px solid ${canGoForward ? C.border : C.border + "44"}`, borderRadius: 8, padding: "6px 12px",
                    color: canGoForward ? C.textDim : C.textDim + "44", cursor: canGoForward ? "pointer" : "default",
                    fontFamily: "'Space Mono', monospace", fontSize: 14, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canGoForward) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                  onMouseLeave={e => { if (canGoForward) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; } }}
                >&rarr;</button>
              </div>
              {/* Today button + Go to date */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", justifyContent: "center" }}>
                {!isViewingCurrentMonth && (
                  <button
                    onClick={() => { setCalendarYear(todayUTCYear); setCalendarMonth(todayUTCMonth); }}
                    style={{
                      background: "none", border: `1px solid ${C.accent}`, borderRadius: 8, padding: "5px 12px",
                      color: C.accent, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10,
                      fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.accent; e.currentTarget.style.color = C.bg; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.accent; }}
                  >
                    Today
                  </button>
                )}
                <label
                  style={{
                    position: "relative", display: "inline-block",
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px",
                    color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10,
                    fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                >
                  Jump to date
                  <input
                    ref={goToDateRef}
                    type="date"
                    max={todayISO}
                    onChange={handleGoToDate}
                    style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                      opacity: 0, cursor: "pointer", colorScheme: "dark",
                    }}
                  />
                </label>
              </div>
              {/* Day-of-week headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} style={{
                    textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: 9,
                    color: C.textDim, letterSpacing: 0.5, padding: "4px 0",
                  }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {cells.map((cell, i) => {
                  if (!cell) return <div key={`empty-${i}`} />;
                  const solved = cell.result > 0;
                  const failed = cell.result === 0 && cell.result !== undefined;
                  const isBd = cell.isBirthday || cell.isExactBirthday;
                  const borderColor = cell.isToday ? C.accent : isBd ? "#F472B6" : solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border;
                  const bgColor = isBd ? "#F472B620" : solved ? C.correct + "15" : failed ? C.incorrect + "10" : C.surface;
                  const numColor = cell.isFuture ? C.textDim + "44" : cell.isToday ? C.accent : isBd ? "#F472B6" : solved ? C.correct : failed ? C.incorrect : C.text;
                  return (
                    <button
                      key={cell.day}
                      disabled={cell.isFuture}
                      onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, cell.dateStr); }}
                      style={{
                        aspectRatio: "1", borderRadius: 8, border: `1.5px solid ${borderColor}`,
                        backgroundColor: bgColor,
                        cursor: cell.isFuture ? "default" : "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 1,
                        transition: "all 0.15s", position: "relative", minWidth: 0,
                        opacity: cell.isFuture ? 0.35 : 1,
                      }}
                      onMouseEnter={e => { if (!cell.isFuture) { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.borderColor = C.accent; } }}
                      onMouseLeave={e => { if (!cell.isFuture) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = borderColor; } }}
                    >
                      {isBd && (
                        <span style={{ position: "absolute", top: -2, right: -2, fontSize: 9, lineHeight: 1 }}>
                          {cell.isExactBirthday ? "\uD83C\uDF82" : "\uD83C\uDF70"}
                        </span>
                      )}
                      <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: cell.isToday ? 800 : isBd ? 800 : 600,
                        color: numColor, lineHeight: 1,
                      }}>{cell.day}</span>
                      {solved && <ScoreBadge attempts={cell.result} />}
                      {solved && cell.time != null && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: C.textDim, lineHeight: 1 }}>
                          {formatTime(cell.time)}
                        </span>
                      )}
                      {failed && <span style={{ fontSize: 8, color: C.incorrect }}>{"\u2717"}</span>}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{
                marginTop: 16, display: "flex", gap: 16, fontSize: 11, color: C.textDim,
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
                flexWrap: "wrap", justifyContent: "center",
              }}>
                <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
                <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
                <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
                <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
                {birthday && <span><span style={{ color: "#F472B6" }}>{"\uD83C\uDF82"}</span> birthday</span>}
              </div>

            </div>
          );
        })()}

        {/* Birthday prompt drawer */}
        {showBirthdayPrompt && (
          <div onClick={() => setShowBirthdayPrompt(false)} style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1000,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0",
              maxWidth: 480, width: "100%", overflow: "hidden",
              boxShadow: `0 -12px 48px rgba(0,0,0,0.5)`,
              animation: "drawerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
              </div>

              <div style={{ padding: "8px 24px 0", overflow: "hidden" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 32 }}>{"\uD83C\uDF82"}</span>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "#F472B6", margin: "8px 0 4px" }}>
                    Set your birthday
                  </h3>
                  <p style={{ color: C.textDim, fontSize: 11, margin: 0 }}>
                    We'll highlight it on the calendar and let you play &amp; share the puzzle from your birth date.
                  </p>
                </div>
                <input
                  type="date"
                  value={birthdayInput}
                  onChange={e => setBirthdayInput(e.target.value)}
                  max={(() => { const n = new Date(); return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,"0")}-${String(n.getUTCDate()).padStart(2,"0")}`; })()}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`,
                    backgroundColor: C.surface, color: C.text, fontFamily: "'Space Mono', monospace", fontSize: 16,
                    outline: "none", boxSizing: "border-box", minWidth: 0,
                    colorScheme: "dark",
                  }}
                />
              </div>

              {/* Sticky footer buttons */}
              <div style={{
                padding: "16px 24px", paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <button
                  onClick={() => {
                    if (!birthdayInput) return;
                    const [y, m, d] = birthdayInput.split("-").map(Number);
                    const bdStr = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
                    setBirthday(bdStr);
                    try { localStorage.setItem(BIRTHDAY_KEY, bdStr); } catch { /* ignore */ }
                    if (bdStr === CHEAT_BIRTHDAY) {
                      const saved = loadSavedAchievements();
                      if (!saved.has("cheat_turing")) {
                        // Show achievement toast
                        achievementQueueRef.current.push({ id: "cheat_turing", label: "Welcome Back, Alan", desc: "The enigma has been decoded", tier: 3 });
                        if (!achievementToastTimer.current) advanceAchievementQueue();
                        // Persist so it survives birthday changes
                        saved.add("cheat_turing");
                        saveSavedAchievements(saved);
                        setSavedAchievementIds(new Set(saved));
                        // Show Enigma theme unlock toast after achievement toast
                        const enigmaTheme = PUZZLE_THEMES.find(t => t.id === "enigma");
                        if (enigmaTheme) {
                          setTimeout(() => showThemeToast(enigmaTheme), 3800);
                        }
                      }
                    }
                    setShowBirthdayPrompt(false);
                    setBirthdayInput("");
                    setCalendarYear(y);
                    setCalendarMonth(m - 1);
                  }}
                  disabled={!birthdayInput}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                    background: birthdayInput ? "#F472B6" : C.surfaceLight, color: birthdayInput ? "#fff" : C.textDim,
                    border: "none", cursor: birthdayInput ? "pointer" : "not-allowed",
                    textTransform: "uppercase",
                  }}
                >
                  Save
                </button>
                {birthday && (
                  <button
                    onClick={() => {
                      setBirthday(null);
                      try { localStorage.removeItem(BIRTHDAY_KEY); } catch { /* ignore */ }
                      setShowBirthdayPrompt(false);
                      setBirthdayInput("");
                    }}
                    style={{
                      width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      background: "none", border: `1px solid ${C.incorrect}`, color: C.incorrect,
                      cursor: "pointer", textTransform: "uppercase",
                    }}
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => { setShowBirthdayPrompt(false); setBirthdayInput(""); }}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    background: "none", border: `1px solid ${C.border}`, color: C.textDim,
                    cursor: "pointer", textTransform: "uppercase",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mosaic grid: 5x5 mini-thumbnails forming the big picture */}
        {isMosaic && (<>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
        }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
            Solve all 25 tiles to reveal the pattern
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3,
            padding: 8, borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
          }}>
            {puzzles.map((p, i) => {
              const result = diffProgress[i];
              const solved = result > 0;
              const failed = result === 0;
              const miniSize = 56;
              const miniCellSize = Math.floor((miniSize - 8) / 5);
              return (
                <button key={i} onClick={() => { customMosaicPuzzlesRef.current = null; startPuzzle(i, "mosaic"); }}
                  style={{
                    width: miniSize, height: miniSize, borderRadius: 6,
                    border: `1.5px solid ${solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border}`,
                    backgroundColor: solved ? C.correct + "10" : failed ? C.incorrect + "08" : C.surface,
                    cursor: "pointer", padding: 2, position: "relative",
                    display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", overflow: "hidden",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = solved ? C.correct + "66" : failed ? C.incorrect + "44" : C.border; }}
                >
                  {solved ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {p.solution.map((row, ri) => (
                        <div key={ri} style={{ display: "flex", gap: 0.5 }}>
                          {row.map((token, ci) => {
                            const { color } = parseToken(token);
                            const dc = themeColorMap ? (themeColorMap[color] || color) : color;
                            return <div key={ci} style={{ width: miniCellSize, height: miniCellSize, borderRadius: 1, backgroundColor: dc }} />;
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                      color: failed ? C.incorrect : C.textDim, lineHeight: 1,
                    }}>
                      {failed ? "\u2717" : i + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          marginTop: 16, display: "flex", gap: 16, fontSize: 11, color: C.textDim,
          fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, animation: "fadeUp 0.5s 0.25s ease both",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
          <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
          <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
          <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
        </div>

        {/* Community & your mosaics carousel */}
        {(() => {
          const carouselMosaics = [
            ...(publicMosaicsList || []).map(m => ({ ...m, _source: "public" })),
            ...(myMosaics || []).filter(m => !publicMosaicsList?.some(p => p.id === m.id)).map(m => ({ ...m, _source: "mine" })),
          ];
          if (carouselMosaics.length === 0) return null;
          return (
            <div style={{
              width: "100%", maxWidth: 360, marginTop: 24, animation: "fadeUp 0.5s 0.3s ease both",
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8,
                fontFamily: "'Space Mono', monospace",
              }}>Community Mosaics</div>
              <div className="mosaic-carousel" style={{
                display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8,
                scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
                msOverflowStyle: "none", scrollbarWidth: "none",
              }}>
                <style>{`.mosaic-carousel::-webkit-scrollbar { display: none; }`}</style>
                {carouselMosaics.map((mosaic) => (
                  <button
                    key={mosaic.id}
                    onClick={() => startCustomMosaicPlay(mosaic)}
                    style={{
                      flexShrink: 0, width: 100, scrollSnapAlign: "start",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      padding: "10px 8px", borderRadius: 10,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <MosaicThumbnail grid={mosaic.grid} size={72} />
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 600,
                      color: C.text, textAlign: "center", lineHeight: 1.2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      width: "100%",
                    }}>
                      {mosaic.title || "Untitled"}
                    </div>
                    <div style={{
                      fontSize: 8, color: C.textDim, letterSpacing: 0.5,
                    }}>
                      {mosaic._source === "mine" ? "You" : mosaic.authorUsername || ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        </>)}

        {/* Puzzle grid: 50 for non-daily modes (not mosaic) */}
        {!isDaily && !isMosaic && (<>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
          maxWidth: 360, width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
        }}>
          {(isCascade ? Array.from({ length: 50 }, (_, i) => i) : puzzles).map((p, i) => {
            const idx = isCascade ? i : p?.id ?? i;
            const result = isCascade ? (diffProgress[idx] ?? -1) : diffProgress[idx];
            const solved = isCascade ? result === CASCADE_LEVELS.length : result > 0;
            const failed = isCascade ? (result >= 0 && result < CASCADE_LEVELS.length) : result === 0;
            const cascadeRunState = progress.cascadeRunState || {};
            const cascadeInProgress = isCascade && result === -1 && cascadeRunState[idx] != null;
            const time = diffTimes[idx];
            const cascadeLevels = result >= 0 && result <= CASCADE_LEVELS.length ? result : null;
            const cascadeInProgressLevel = cascadeInProgress && cascadeRunState[idx]?.level != null ? cascadeRunState[idx].level : null;
            const cascadeLevelValid = (l) => typeof l === "number" && l >= 0 && l < CASCADE_LEVELS.length;
            const cascadeSizeLabel = isCascade
              ? cascadeLevels === CASCADE_LEVELS.length
                ? `${CASCADE_LEVELS[CASCADE_LEVELS.length - 1]}×${CASCADE_LEVELS[CASCADE_LEVELS.length - 1]}`
                : cascadeLevelValid(cascadeLevels)
                  ? `${CASCADE_LEVELS[cascadeLevels]}×${CASCADE_LEVELS[cascadeLevels]}`
                  : cascadeLevelValid(cascadeInProgressLevel)
                    ? `${CASCADE_LEVELS[cascadeInProgressLevel]}×${CASCADE_LEVELS[cascadeInProgressLevel]}`
                    : (cascadeLevels !== null || cascadeInProgressLevel !== null) ? "…" : null
              : null;
            const borderColor = solved ? C.correct + "66" : failed ? C.incorrect + "44" : cascadeInProgress ? C.inProgress + "99" : C.border;
            const bgColor = solved ? C.correct + "15" : failed ? C.incorrect + "10" : cascadeInProgress ? C.inProgress + "18" : C.surface;
            const numColor = solved ? C.correct : failed ? C.incorrect : cascadeInProgress ? C.inProgress : C.text;
            return (
              <button key={i} onClick={() => startPuzzle(i, view === "menu" ? difficulty : undefined)}
                style={{
                  aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${borderColor}`,
                  backgroundColor: bgColor,
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1,
                  transition: "all 0.15s", position: "relative", minWidth: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = borderColor; }}
              >
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700,
                  color: numColor, lineHeight: 1,
                }}>
                  {i + 1}
                </span>
                {isCascade ? (
                  cascadeSizeLabel ? <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 9, color: cascadeInProgress ? C.inProgress : C.textDim,
                    lineHeight: 1.2,
                  }}>
                    {cascadeSizeLabel}
                  </span> : null
                ) : (
                  <>
                    {result !== undefined && <ScoreBadge attempts={result} />}
                    {solved && time != null && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.textDim, lineHeight: 1 }}>
                        {formatTime(time)}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: 24, display: "flex", gap: 16, fontSize: 11, color: C.textDim,
          fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, animation: "fadeUp 0.5s 0.25s ease both",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
          <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
          <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
          <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
        </div>
        </>)}

        {/* Stats drawer */}
        {showShareModal && (() => {
          const { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll } = getShareData();
          const gridColors = { none: C.border, failed: C.incorrect, gold: C.gold, silver: C.silver, bronze: C.bronze };
          return (
            <div onClick={() => setShowShareModal(false)} style={{
              position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1000,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
              <style>{`@keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes drawerOverlayFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
              <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0",
                padding: "0", maxWidth: 480, width: "100%",
                boxShadow: `0 -12px 48px rgba(0,0,0,0.5)`, maxHeight: "85vh",
                display: "flex", flexDirection: "column",
                animation: "drawerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {/* Drag handle */}
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
                </div>

                {/* Scrollable content */}
                <div style={{ overflowY: "auto", padding: "8px 24px 0", flex: 1 }}>
                  {/* Drawer header */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, margin: 0, color: C.accent }}>
                      Agnus
                    </h2>
                    <p style={{ color: C.textDim, fontSize: 11, marginTop: 4, letterSpacing: 1 }}>my stats</p>
                  </div>

                  {/* Overall stats */}
                  <div style={{
                    display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 20,
                    padding: "10px 16px", borderRadius: 10, backgroundColor: C.surface, border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.accent }}>{totalSolved}</div>
                      <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>solved</div>
                    </div>
                    <div style={{ width: 1, backgroundColor: C.border }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700 }}>300</div>
                      <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>total</div>
                    </div>
                    {getDailyStreak(progress) > 0 && (
                      <>
                        <div style={{ width: 1, backgroundColor: C.border }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.gold }}>🔥 {getDailyStreak(progress)}</div>
                          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>day streak</div>
                        </div>
                      </>
                    )}
                    {bestTimeAll != null && (
                      <>
                        <div style={{ width: 1, backgroundColor: C.border }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: C.correct }}>{formatTime(bestTimeAll)}</div>
                          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>fastest</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Per-difficulty sections */}
                  {sections.map(s => (
                    <div key={s.key} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: s.key === "blind" ? "#e06040" : C.text, letterSpacing: 1, textTransform: "uppercase" }}>
                          {s.label}
                        </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.accent, fontWeight: 700 }}>
                          {s.solved}/50
                        </span>
                        {s.bestTime != null && (
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.textDim }}>
                            best {formatTime(s.bestTime)}
                          </span>
                        )}
                        {s.avgTime != null && (
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.textDim }}>
                            avg {formatTime(s.avgTime)}
                          </span>
                        )}
                      </div>
                      {/* Visual grid - 25 columns */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(25, 1fr)", gap: 2 }}>
                        {s.grid.map((g, i) => (
                          <div key={i} style={{
                            aspectRatio: "1", borderRadius: 2,
                            backgroundColor: g === "none" ? C.surface : gridColors[g] + (g === "none" ? "" : "cc"),
                            border: `1px solid ${g === "none" ? C.border : gridColors[g]}44`,
                          }} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Medal summary */}
                  <div style={{
                    display: "flex", justifyContent: "center", gap: 14, marginTop: 16, marginBottom: 8,
                    fontSize: 11, fontFamily: "'Space Mono', monospace", color: C.textDim,
                  }}>
                    <span><span style={{ color: C.gold }}>{"\u2605"}</span> {totalGold}</span>
                    <span><span style={{ color: C.silver }}>{"\u25CF"}</span> {totalSilver}</span>
                    <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> {totalBronze}</span>
                    <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> {totalFailed}</span>
                  </div>
                </div>

                {/* Sticky footer buttons */}
                <div style={{
                  padding: "12px 24px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                  borderTop: `1px solid ${C.border}`,
                  display: "flex", flexDirection: "column", gap: 8, flexShrink: 0,
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={copyShareText}
                      style={{
                        flex: 1, backgroundColor: C.accent, color: C.bg, border: "none",
                        padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                        textTransform: "uppercase", transition: "all 0.15s",
                      }}
                    >
                      {shareMsg || "Share all"}
                    </button>
                    <button onClick={copyDailyShareText}
                      style={{
                        flex: 1, backgroundColor: "transparent", color: C.accent, border: `1.5px solid ${C.accent}`,
                        padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                        textTransform: "uppercase", transition: "all 0.15s",
                      }}
                    >
                      Share Daily
                    </button>
                  </div>
                  <button onClick={() => setShowShareModal(false)}
                    style={{
                      width: "100%", backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                      padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Game Menu drawer */}
        {showGameMenu && (() => {
          const achs = computeAchievements(progress, times, savedAchievementIds);
          const achUnlocked = achs.filter(a => a.unlocked).length;
          const achTotal = achs.length;
          const totalSolvedAll = [...SOLVE_MODES, "daily"].reduce((s, m) => s + countModeSolved(progress[m]), 0)
            + Object.values(progress.cascade || {}).filter(v => v === CASCADE_LEVELS.length).length;
          return (
            <div onClick={() => setShowGameMenu(false)} style={{
              position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1000,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
              <style>{`@keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
              <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0",
                padding: "0", maxWidth: 480, width: "100%",
                boxShadow: `0 -12px 48px rgba(0,0,0,0.5)`,
                display: "flex", flexDirection: "column",
                maxHeight: "85vh",
                animation: "drawerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {/* Drag handle */}
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", flexShrink: 0 }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
                </div>

                <div style={{ padding: "8px 24px 0", overflowY: "auto", flex: 1, minHeight: 0, WebkitOverflowScrolling: "touch" }}>
                  {/* Header */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, margin: 0, color: C.accent }}>
                      Menu
                    </h2>
                  </div>

                  {/* Menu items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Achievements */}
                    <button onClick={() => { setShowGameMenu(false); setShowAchievements(true); }} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: C.accent + "22", display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${C.accent}44`, flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 16, color: C.accent, lineHeight: 1 }}>{"\u2605"}</span>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                          Achievements
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          {achUnlocked}/{achTotal} unlocked
                        </div>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                    </button>

                    {/* Stats */}
                    <button onClick={() => { setShowGameMenu(false); setShowShareModal(true); }} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: "#4ECDC422", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid #4ECDC444", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="1" y="9" width="3" height="6" rx="0.5" fill="#4ECDC4" />
                          <rect x="6" y="5" width="3" height="10" rx="0.5" fill="#4ECDC4" />
                          <rect x="11" y="1" width="3" height="14" rx="0.5" fill="#4ECDC4" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                          Statistics
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          {totalSolvedAll} puzzles solved
                        </div>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                    </button>

                    {/* Birthday */}
                    <button onClick={() => { setShowGameMenu(false); setShowBirthdayPrompt(true); }} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#F472B6"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: "#F472B622", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid #F472B644", flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{"\uD83C\uDF82"}</span>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                          Birthday Puzzle
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          {birthday ? `Set: ${birthday}` : "Set your birthday"}
                        </div>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                    </button>

                    {/* Themes */}
                    <button onClick={() => { setShowGameMenu(false); setShowThemePicker(true); }} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#A78BFA"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: "#A78BFA22", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid #A78BFA44", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="5" cy="5" r="3" fill="#FF6B6B" opacity="0.8"/>
                          <circle cx="11" cy="5" r="3" fill="#4ECDC4" opacity="0.8"/>
                          <circle cx="8" cy="11" r="3" fill="#FFE66D" opacity="0.8"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                          Themes
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          {activeTheme.id === "classic" ? "Classic" : `${activeTheme.icon || ""} ${activeTheme.name}`}
                        </div>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                    </button>

                    {/* Mosaic Creator */}
                    <button onClick={() => { setShowGameMenu(false); resetCreator(); setCreatorReturnView("menu"); setView("creator"); }} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#F59E0B"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: "#F59E0B22", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid #F59E0B44", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="2" width="5" height="5" rx="1" fill="#F59E0B" opacity="0.8"/>
                          <rect x="9" y="2" width="5" height="5" rx="1" fill="#F59E0B" opacity="0.5"/>
                          <rect x="2" y="9" width="5" height="5" rx="1" fill="#F59E0B" opacity="0.5"/>
                          <rect x="9" y="9" width="5" height="5" rx="1" fill="#F59E0B" opacity="0.3"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                          Create Mosaic
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          Paint your own design
                        </div>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                    </button>

                    {/* Mosaic Gallery */}
                    <button onClick={() => { setShowGameMenu(false); setMosaicGalleryTab("mine"); setView("gallery"); loadMosaicData("mine"); }} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#10B981"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: "#10B98122", display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1.5px solid #10B98144", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="1" y="1" width="6" height="6" rx="1" stroke="#10B981" strokeWidth="1.5" fill="none"/>
                          <rect x="9" y="1" width="6" height="6" rx="1" stroke="#10B981" strokeWidth="1.5" fill="none"/>
                          <rect x="1" y="9" width="6" height="6" rx="1" stroke="#10B981" strokeWidth="1.5" fill="none"/>
                          <rect x="9" y="9" width="6" height="6" rx="1" stroke="#10B981" strokeWidth="1.5" fill="none"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                          Mosaic Gallery
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          Browse &amp; share mosaics
                        </div>
                      </div>
                      <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                    </button>

                    {/* Admin Review (only for admins) */}
                    {isAdmin && (
                      <button onClick={() => { setShowGameMenu(false); setView("admin-review"); loadMosaicData("admin"); }} style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        backgroundColor: C.surface, border: `1px solid ${C.incorrect}33`,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.incorrect + "33"; }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          backgroundColor: "#EF444422", display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1.5px solid #EF444444", flexShrink: 0,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9.5 4.5 11.5 5 8 2.5 5.5 6 5z" stroke="#EF4444" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                            Review Mosaics
                          </div>
                          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                            Admin: approve submissions
                          </div>
                        </div>
                        <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                      </button>
                    )}

                    {/* Account / Profile */}
                    {firebaseConfigured && (
                      <button onClick={() => {
                        setShowGameMenu(false);
                        if (firebaseUser) {
                          setShowProfilePage(true);
                        } else {
                          setShowAccountModal(true); setAutoLoginModal(false); setAccountError("");
                        }
                      }} style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        backgroundColor: C.surface, border: `1px solid ${C.border}`,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#60A5FA"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          backgroundColor: "#60A5FA22", display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1.5px solid #60A5FA44", flexShrink: 0, overflow: "hidden",
                        }}>
                          {firebaseUser && profilePicture ? (
                            <img src={profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="5" r="3" stroke="#60A5FA" strokeWidth="1.5" fill="none"/>
                              <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                            {firebaseUser ? (username || "Profile") : "Account"}
                          </div>
                          <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                            {firebaseUser ? firebaseUser.email : "Sign in to sync progress"}
                          </div>
                        </div>
                        {firebaseUser && syncStatus === "synced" && (
                          <span style={{ fontSize: 10, color: C.correct }}>Synced</span>
                        )}
                        {firebaseUser && syncStatus === "syncing" && (
                          <span style={{ fontSize: 10, color: C.textDim }}>Syncing...</span>
                        )}
                        <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                      </button>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />

                    {/* Clear All Data */}
                    <button onClick={() => setShowClearConfirm(true)} style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.incorrect; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: C.incorrect + "22", display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${C.incorrect}44`, flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 4L12 12M12 4L4 12" stroke={C.incorrect} strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.incorrect, letterSpacing: 0.5 }}>
                          Clear All Data
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                          Reset all progress and start fresh
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: "16px 24px", paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                  borderTop: `1px solid ${C.border}`, marginTop: 16, flexShrink: 0,
                }}>
                  <button onClick={() => setShowGameMenu(false)}
                    style={{
                      width: "100%", backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                      padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {themePickerEl}

        {/* Clear All Data confirmation dialog */}
        {showClearConfirm && (
          <div onClick={() => setShowClearConfirm(false)} style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              backgroundColor: C.bg, border: `1px solid ${C.incorrect}44`, borderRadius: 16,
              padding: "24px", maxWidth: 340, width: "100%",
              boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 40px ${C.incorrect}22`,
              animation: "fadeUp 0.25s ease",
            }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px",
                  backgroundColor: C.incorrect + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${C.incorrect}44`,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v4m0 4h.01M12 3L2 21h20L12 3z" stroke={C.incorrect} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: C.incorrect, margin: "0 0 8px",
                }}>
                  Clear All Data?
                </h3>
                <p style={{ color: C.textDim, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                  This will permanently delete <strong style={{ color: C.text }}>all your progress</strong>, solve times, achievements, streak, birthday, and saved data. This cannot be undone.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={async () => {
                    try {
                      localStorage.removeItem(STORAGE_KEY);
                      localStorage.removeItem(TIMES_KEY);
                      localStorage.removeItem(BIRTHDAY_KEY);
                      localStorage.removeItem(THEME_KEY);
                      localStorage.removeItem(ACHIEV_KEY);
                    } catch { /* ignore */ }
                    // Sign out if logged in (clears cloud sync link)
                    if (firebaseUser) {
                      try { await logOut(); } catch { /* ignore */ }
                    }
                    setProgress({ easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, mosaic: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined });
                    setTimes({ easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {} });
                    setSavedAchievementIds(new Set());
                    setBirthday(null);
                    setActiveThemeId("classic");
                    setShowClearConfirm(false);
                    setShowGameMenu(false);
                  }}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                    background: C.incorrect, color: "#fff", border: "none", cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}
                >
                  Clear everything
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    background: "none", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {accountModalEl}
        {usernameModalEl}
        {profilePageEl}

        {/* Sync choice prompt (local vs cloud data on login) */}
        {showSyncChoice && syncChoiceData && (() => {
          const { localSummary, cloudSummary } = syncChoiceData;
          const localMore = localSummary.totalSolved > cloudSummary.totalSolved;
          const cloudMore = cloudSummary.totalSolved > localSummary.totalSolved;
          const SyncOption = ({ label, tag, summary, highlight, onClick }) => (
            <button onClick={onClick} style={{
              width: "100%", padding: "14px 16px", borderRadius: 12, textAlign: "left",
              background: highlight ? C.accent + "14" : C.surface,
              border: `1px solid ${highlight ? C.accent + "66" : C.border}`,
              cursor: "pointer", transition: "all 0.15s", marginBottom: 8,
              position: "relative",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: C.text }}>
                  {label}
                </span>
                {tag && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                    padding: "2px 6px", borderRadius: 4,
                    backgroundColor: C.correct + "22", color: C.correct,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {tag}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                {summary.totalSolved} puzzle{summary.totalSolved !== 1 ? "s" : ""} solved
                {summary.achievements > 0 && (<span> &middot; {summary.achievements} achievement{summary.achievements !== 1 ? "s" : ""}</span>)}
              </div>
            </button>
          );
          return (
            <div onClick={() => {}} style={{
              position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1100,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
                padding: "24px", maxWidth: 400, width: "100%",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)", animation: "fadeUp 0.25s ease",
              }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", margin: "0 auto 12px",
                    backgroundColor: "#F59E0B22", display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #F59E0B44",
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3L4 9v12h16V9l-8-6z" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                      <path d="M9 21v-6h6v6" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent, margin: "0 0 6px",
                  }}>
                    Existing Save Found
                  </h3>
                  <p style={{ color: C.textDim, fontSize: 11, margin: 0, lineHeight: 1.5, maxWidth: 300, marginInline: "auto" }}>
                    You have progress saved in the cloud and on this device. Which would you like to keep?
                  </p>
                </div>

                <SyncOption
                  label="Use This Device"
                  tag={localMore ? "More progress" : null}
                  summary={localSummary}
                  highlight={localMore}
                  onClick={() => handleSyncChoice("local")}
                />
                <SyncOption
                  label="Use Cloud Save"
                  tag={cloudMore ? "More progress" : null}
                  summary={cloudSummary}
                  highlight={cloudMore}
                  onClick={() => handleSyncChoice("cloud")}
                />
                <button onClick={() => handleSyncChoice("merge")} style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                  background: C.accent, color: C.bg, border: "none",
                  cursor: "pointer", textTransform: "uppercase", transition: "all 0.15s", marginTop: 4,
                }}>
                  Merge Both
                </button>
                <p style={{
                  fontSize: 10, color: C.textDim, textAlign: "center", margin: "10px 0 0",
                  lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif",
                }}>
                  Merge keeps the best results from both saves
                </p>
              </div>
            </div>
          );
        })()}

        {/* Achievements drawer */}
        {showAchievements && (() => {
          const achievements = computeAchievements(progress, times, savedAchievementIds);
          const unlocked = achievements.filter(a => a.unlocked).length;
          const total = achievements.length;
          const tierColors = { 1: C.bronze, 2: C.silver, 3: C.gold };
          const tierSymbols = { 1: "\u25C6", 2: "\u25CF", 3: "\u2605" };
          return (
            <div onClick={() => setShowAchievements(false)} style={{
              position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1000,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
              <style>{`@keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
              <div onClick={e => e.stopPropagation()} style={{
                backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0",
                padding: "0", maxWidth: 480, width: "100%",
                boxShadow: `0 -12px 48px rgba(0,0,0,0.5)`, maxHeight: "85vh",
                display: "flex", flexDirection: "column",
                animation: "drawerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {/* Drag handle */}
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
                </div>

                {/* Scrollable content */}
                <div style={{ overflowY: "auto", padding: "8px 24px 0", flex: 1 }}>
                  {/* Header */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, margin: 0, color: C.accent }}>
                      Achievements
                    </h2>
                    <p style={{ color: C.textDim, fontSize: 11, marginTop: 4, letterSpacing: 1 }}>{unlocked}/{total} unlocked</p>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 6, borderRadius: 3, backgroundColor: C.surfaceLight, marginBottom: 20, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3, backgroundColor: C.accent,
                      width: `${(unlocked / total) * 100}%`, transition: "width 0.5s ease",
                    }} />
                  </div>

                  {/* Achievement categories */}
                  {ACHIEVEMENT_CATS.map(cat => {
                    const catAchs = achievements.filter(a => a.cat === cat.key);
                    return (
                      <div key={cat.key} style={{ marginBottom: 16 }}>
                        <div style={{
                          fontSize: 10, color: C.textDim, textTransform: "uppercase",
                          letterSpacing: 1.5, marginBottom: 8,
                          fontFamily: "'Space Mono', monospace",
                        }}>{cat.label}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {catAchs.map(a => (
                            <div key={a.id} style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "10px 12px", borderRadius: 10,
                              backgroundColor: C.surface,
                              border: `1px solid ${a.unlocked ? tierColors[a.tier] + "44" : C.border}`,
                              opacity: a.unlocked ? 1 : 0.4,
                              transition: "all 0.2s",
                            }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                backgroundColor: a.unlocked ? tierColors[a.tier] + "22" : C.surfaceLight,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: `1.5px solid ${a.unlocked ? tierColors[a.tier] : C.border}`,
                                flexShrink: 0,
                              }}>
                                <span style={{
                                  fontSize: 16, color: a.unlocked ? tierColors[a.tier] : C.textDim,
                                  lineHeight: 1,
                                }}>{tierSymbols[a.tier]}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                                  color: a.unlocked ? C.text : C.textDim,
                                  letterSpacing: 0.5,
                                }}>{a.label}</div>
                                <div style={{
                                  fontSize: 10, color: C.textDim, lineHeight: 1.3, marginTop: 2,
                                }}>{a.desc}</div>
                              </div>
                              {a.unlocked && (
                                <span style={{ color: C.correct, fontSize: 14, flexShrink: 0 }}>{"\u2713"}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sticky footer */}
                <div style={{
                  padding: "12px 24px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                  borderTop: `1px solid ${C.border}`, flexShrink: 0,
                }}>
                  <button onClick={() => setShowAchievements(false)}
                    style={{
                      width: "100%", backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                      padding: "12px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Achievement toast (menu view) */}
      {achievementToast && (() => {
        const tierColors = { 1: C.bronze, 2: C.silver, 3: C.gold };
        const tierSymbols = { 1: "\u25C6", 2: "\u25CF", 3: "\u2605" };
        const tc = tierColors[achievementToast.tier] || C.accent;
        const sparkles = Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const dist = 18 + Math.random() * 10;
          return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, delay: i * 0.06, size: 3 + Math.random() * 3 };
        });
        return (
          <div key={achievementToast.key} style={{
            position: "fixed", top: "calc(100px + env(safe-area-inset-top, 0px))", left: "50%",
            transform: "translateX(-50%)", zIndex: 100,
            animation: toastDismissing
              ? "achievementToastOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
              : "achievementToastIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            pointerEvents: "none",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px 12px 14px", borderRadius: 14,
              backgroundColor: C.surface, border: `1.5px solid ${tc}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 30px ${tc}44, inset 0 1px 0 rgba(255,255,255,0.06)`,
              backgroundImage: `linear-gradient(90deg, transparent 0%, ${tc}11 50%, transparent 100%)`,
              backgroundSize: "200% 100%",
              animation: "achievementShimmer 2s 0.6s ease-in-out",
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {sparkles.map(s => (
                  <div key={s.id} style={{
                    position: "absolute", left: "50%", top: "50%",
                    width: s.size, height: s.size, borderRadius: "50%",
                    backgroundColor: tc,
                    transform: `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px))`,
                    animation: `achievementSparkle 0.6s ${0.3 + s.delay}s ease-out both`,
                    opacity: 0,
                  }} />
                ))}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  backgroundColor: tc + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${tc}`,
                  color: tc,
                  animation: "achievementBadgeSpin 0.8s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both, achievementGlow 1.2s 0.3s ease-out both",
                  perspective: 200,
                }}>
                  <span style={{ fontSize: 18, color: tc, lineHeight: 1 }}>
                    {tierSymbols[achievementToast.tier]}
                  </span>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                  color: tc, letterSpacing: 1.5, textTransform: "uppercase",
                  marginBottom: 3,
                }}>Achievement unlocked</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                  color: C.text, letterSpacing: 0.5,
                }}>{achievementToast.label}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: C.textDim,
                  marginTop: 2, lineHeight: 1.3,
                }}>{achievementToast.desc}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Theme unlock toast (menu view) */}
      {themeToast && (
        <div key={themeToast.key} style={{
          position: "fixed",
          top: achievementToast
            ? "calc(170px + env(safe-area-inset-top, 0px))"
            : "calc(100px + env(safe-area-inset-top, 0px))",
          left: "50%",
          transform: "translateX(-50%)", zIndex: 100,
          maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
          animation: themeToastDismissing
            ? "achievementToastOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
            : "achievementToastIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          pointerEvents: "auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 14,
            backgroundColor: C.surface, border: `1.5px solid ${C.accent}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${C.accent}33`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              backgroundColor: C.accent + "18", display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${C.accent}66`, fontSize: 18, flexShrink: 0,
            }}>
              {themeToast.icon || "\uD83C\uDFA8"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2,
              }}>Theme unlocked</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                color: C.text, letterSpacing: 0.5,
              }}>{themeToast.name}</div>
            </div>
            <button
              onClick={() => {
                setActiveThemeId(themeToast.id);
                saveTheme(themeToast.id);
                setThemeToastDismissing(true);
                setTimeout(() => { setThemeToast(null); setThemeToastDismissing(false); }, 350);
                if (themeToastTimer.current) { clearTimeout(themeToastTimer.current); themeToastTimer.current = null; }
              }}
              style={{
                background: C.accent, border: "none", borderRadius: 8, padding: "6px 12px",
                color: C.bg, cursor: "pointer", fontFamily: "'Space Mono', monospace",
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap",
                transition: "opacity 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              Use it
            </button>
          </div>
        </div>
      )}

      {/* Login hint toast */}
      {loginHintToast && (
        <div style={{
          position: "fixed", bottom: "calc(32px + env(safe-area-inset-bottom, 0px))", left: "50%",
          transform: "translateX(-50%)", zIndex: 1200,
          maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
          animation: loginHintDismissing
            ? "achievementToastOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
            : "achievementToastIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          pointerEvents: "auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 14,
            backgroundColor: C.surface, border: `1.5px solid ${C.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke={C.accent} strokeWidth="2" fill="none"/>
              <path d="M12 7v6M12 16v1" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.text, lineHeight: 1.4,
            }}>
              You can sign in anytime from the <strong style={{ color: C.accent }}>menu button</strong>
            </span>
            <button
              onClick={() => {
                setLoginHintDismissing(true);
                setTimeout(() => { setLoginHintToast(false); setLoginHintDismissing(false); }, 350);
                if (loginHintTimer.current) { clearTimeout(loginHintTimer.current); loginHintTimer.current = null; }
              }}
              style={{
                background: "none", border: "none", color: C.textDim, cursor: "pointer",
                padding: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      </div>
    );
  }

  // --- PLAY VIEW ---
  const diffLabel = isDaily ? "Daily" : isCascade ? "Cascade" : DIFFICULTIES.find(d => d.key === difficulty)?.label || "";
  const cascadeLevelLabel = isCascade && puzzle ? `${puzzle.gridSize}×${puzzle.gridSize}` : null;
  const totalPuzzles = puzzles.length;
  const lockedCount = lockedCells.size;
  const totalBlanks = puzzle ? puzzle.blanks.size : 0;

  return (
    <div
      ref={playViewScrollRef}
      style={{
      height: "100dvh", minHeight: "100dvh", backgroundColor: C.bg, color: C.text,
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 16px", position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      overflow: "hidden", overscrollBehavior: "none", touchAction: "none",
      boxSizing: "border-box",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap'); * { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; touch-action: manipulation; } @keyframes particlePop { 0%{transform:scale(0);opacity:1} 50%{opacity:1} 100%{transform:scale(1) translateY(-40px);opacity:0} } @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} } @keyframes slideIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} } @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} } @keyframes fallIntoPlace { 0%{opacity:0;transform:translateY(-36px) scale(0.82)} 60%{transform:translateY(3px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} } @keyframes fallOff { 0%{opacity:1;transform:translateY(0) scale(1) rotate(0deg)} 8%{transform:translateY(-4px) scale(1.04) rotate(-3deg)} 100%{opacity:0;transform:translateY(180%) scale(0.75) rotate(18deg)} } @keyframes emptyCellIn { 0%{opacity:0} 100%{opacity:0.45} } @keyframes tilesWinCelebrate { 0%{transform:translateY(0) rotate(0deg) scale(1)} 30%{transform:translateY(-28px) rotate(180deg) scale(1.08)} 70%{transform:translateY(-32px) rotate(360deg) scale(1.08)} 100%{transform:translateY(0) rotate(360deg) scale(1)} } .token-picker-scroll::-webkit-scrollbar { display: none; } @keyframes achievementToastIn { 0%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.6)} 40%{opacity:1;transform:translateX(-50%) translateY(6px) scale(1.05)} 60%{transform:translateX(-50%) translateY(-3px) scale(0.98)} 80%{transform:translateX(-50%) translateY(1px) scale(1.01)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} } @keyframes achievementBadgeSpin { 0%{transform:rotateY(0deg) scale(1)} 30%{transform:rotateY(180deg) scale(1.2)} 60%{transform:rotateY(360deg) scale(1.1)} 100%{transform:rotateY(360deg) scale(1)} } @keyframes achievementGlow { 0%{box-shadow:0 0 0px transparent} 30%{box-shadow:0 0 24px currentColor} 100%{box-shadow:0 0 0px transparent} } @keyframes achievementShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} } @keyframes achievementSparkle { 0%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1) rotate(180deg)} 100%{opacity:0;transform:scale(0) rotate(360deg)} } @keyframes achievementToastOut { 0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.85)} } @keyframes snowFall { 0%{transform:translateY(0) translateX(0);opacity:1} 100%{transform:translateY(calc(100% + 300px)) translateX(var(--drift, 10px));opacity:0.2} } @keyframes batFloat { 0%,100%{transform:translateY(0) translateX(0)} 25%{transform:translateY(-8px) translateX(6px)} 50%{transform:translateY(2px) translateX(-4px)} 75%{transform:translateY(-5px) translateX(8px)} } @keyframes neonPulse { 0%,100%{box-shadow:0 0 15px #FF008044,0 0 30px #00FF8022,inset 0 0 15px #FF008011} 33%{box-shadow:0 0 20px #00FF8044,0 0 40px #FF008022,inset 0 0 20px #00FF8011} 66%{box-shadow:0 0 20px #FFFF0044,0 0 40px #8000FF22,inset 0 0 20px #FFFF0011} } @keyframes bubbleRise { 0%{transform:translateY(0) translateX(0);opacity:1} 50%{transform:translateY(-150px) translateX(8px);opacity:0.6} 100%{transform:translateY(-300px) translateX(-4px);opacity:0} } @keyframes petalFall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1} 100%{transform:translateY(calc(100% + 300px)) translateX(var(--drift, 10px)) rotate(360deg);opacity:0.15} } @keyframes leafFall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1} 50%{transform:translateY(150px) translateX(var(--drift, 15px)) rotate(180deg);opacity:0.7} 100%{transform:translateY(calc(100% + 300px)) translateX(calc(var(--drift, 15px) * -0.5)) rotate(360deg);opacity:0} } @keyframes starTwinkle { 0%,100%{opacity:0} 50%{opacity:var(--opacity, 0.6)} } @keyframes scanlineMove { 0%{background-position:0 -100%} 100%{background-position:0 200%} } @keyframes auroraShift { 0%{opacity:0.6;transform:translateX(-5%)} 100%{opacity:1;transform:translateX(5%)} } @keyframes heartFloat { 0%{transform:translateY(0) translateX(0) scale(1);opacity:1} 50%{transform:translateY(-150px) translateX(var(--drift, 5px)) scale(1.1);opacity:0.6} 100%{transform:translateY(-300px) translateX(calc(var(--drift, 5px) * -1)) scale(0.8);opacity:0} } @keyframes blockPlace { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.06);opacity:1} 100%{transform:scale(1);opacity:1} } @keyframes blockRemove { 0%{transform:scale(1);opacity:1} 100%{transform:scale(0.6);opacity:0} } @keyframes confettiFall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1} 25%{transform:translateY(75px) translateX(calc(var(--drift, 10px) * 0.5)) rotate(180deg);opacity:0.8} 50%{transform:translateY(150px) translateX(var(--drift, 10px)) rotate(360deg);opacity:0.6} 100%{transform:translateY(calc(100% + 300px)) translateX(calc(var(--drift, 10px) * -0.3)) rotate(720deg);opacity:0} } @keyframes glitchScan { 0%{background-position:0 -100%} 100%{background-position:0 300%} } @keyframes glitchBorder { 0%{box-shadow:inset 3px 0 0 rgba(255,0,64,0.25),inset -3px 0 0 rgba(0,255,221,0.25),inset 0 2px 0 rgba(255,0,255,0.15),inset 0 -2px 0 rgba(0,255,64,0.15)} 33%{box-shadow:inset -4px 0 0 rgba(255,0,64,0.35),inset 4px 0 0 rgba(0,255,221,0.3),inset 0 -2px 0 rgba(255,0,255,0.2),inset 0 2px 0 rgba(0,255,64,0.1)} 66%{box-shadow:inset 2px 0 0 rgba(0,255,221,0.2),inset -2px 0 0 rgba(255,0,64,0.3),inset 0 3px 0 rgba(255,0,255,0.15),inset 0 -1px 0 rgba(0,255,64,0.2)} 100%{box-shadow:inset 3px 0 0 rgba(255,0,64,0.25),inset -3px 0 0 rgba(0,255,221,0.25),inset 0 2px 0 rgba(255,0,255,0.15),inset 0 -2px 0 rgba(0,255,64,0.15)} } @keyframes glitchFlicker { 0%{opacity:0.08} 50%{opacity:0} } @keyframes glitchDisplace { 0%,92%{transform:translateX(0)} 93%{transform:translateX(-3px)} 94%{transform:translateX(4px)} 95%{transform:translateX(-2px)} 96%,100%{transform:translateX(0)} } @keyframes glitchBar { 0%,80%{opacity:0.6;transform:translateX(0)} 82%{opacity:1;transform:translateX(6px)} 84%{opacity:0.8;transform:translateX(-4px)} 86%{opacity:1;transform:translateX(3px)} 88%,100%{opacity:0.6;transform:translateX(0)} } @keyframes enigmaRotor { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} } @keyframes enigmaBgDrift { 0%{transform:translate(0%,0%) rotate(0deg)} 33%{transform:translate(5%,-3%) rotate(1deg)} 66%{transform:translate(-3%,5%) rotate(-1deg)} 100%{transform:translate(2%,2%) rotate(0.5deg)} } @keyframes enigmaWireDrift { 0%{transform:translate(0%,0%) scale(1)} 50%{transform:translate(3%,-2%) scale(1.02)} 100%{transform:translate(-2%,3%) scale(0.98)} } @keyframes enigmaGlow { 0%,100%{box-shadow:inset 0 0 20px rgba(201,168,76,0.04),inset 0 0 60px rgba(140,107,30,0.02)} 50%{box-shadow:inset 0 0 30px rgba(201,168,76,0.08),inset 0 0 80px rgba(140,107,30,0.04)} } @keyframes enigmaDecrypt { 0%{transform:rotateY(0deg) scale(1);opacity:0.4;filter:brightness(0.5)} 25%{transform:rotateY(90deg) scale(0.9);opacity:0.6;filter:brightness(0.7)} 50%{transform:rotateY(180deg) scale(0.95);opacity:0.8;filter:brightness(1.3)} 75%{transform:rotateY(270deg) scale(1.02);filter:brightness(1.1)} 100%{transform:rotateY(360deg) scale(1);opacity:1;filter:brightness(1)} }`}</style>

      <Particles show={showParticles} />

      {/* Achievement toast */}
      {achievementToast && (() => {
        const tierColors = { 1: C.bronze, 2: C.silver, 3: C.gold };
        const tierSymbols = { 1: "\u25C6", 2: "\u25CF", 3: "\u2605" };
        const tc = tierColors[achievementToast.tier] || C.accent;
        const sparkles = Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const dist = 18 + Math.random() * 10;
          return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, delay: i * 0.06, size: 3 + Math.random() * 3 };
        });
        return (
          <div key={achievementToast.key} style={{
            position: "fixed", top: "calc(100px + env(safe-area-inset-top, 0px))", left: "50%",
            transform: "translateX(-50%)", zIndex: 100,
            animation: toastDismissing
              ? "achievementToastOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
              : "achievementToastIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            pointerEvents: "none",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px 12px 14px", borderRadius: 14,
              backgroundColor: C.surface, border: `1.5px solid ${tc}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 30px ${tc}44, inset 0 1px 0 rgba(255,255,255,0.06)`,
              backgroundImage: `linear-gradient(90deg, transparent 0%, ${tc}11 50%, transparent 100%)`,
              backgroundSize: "200% 100%",
              animation: "achievementShimmer 2s 0.6s ease-in-out",
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {sparkles.map(s => (
                  <div key={s.id} style={{
                    position: "absolute", left: "50%", top: "50%",
                    width: s.size, height: s.size, borderRadius: "50%",
                    backgroundColor: tc,
                    transform: `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px))`,
                    animation: `achievementSparkle 0.6s ${0.3 + s.delay}s ease-out both`,
                    opacity: 0,
                  }} />
                ))}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  backgroundColor: tc + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${tc}`,
                  color: tc,
                  animation: "achievementBadgeSpin 0.8s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both, achievementGlow 1.2s 0.3s ease-out both",
                  perspective: 200,
                }}>
                  <span style={{ fontSize: 18, color: tc, lineHeight: 1 }}>
                    {tierSymbols[achievementToast.tier]}
                  </span>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                  color: tc, letterSpacing: 1.5, textTransform: "uppercase",
                  marginBottom: 3,
                }}>Achievement unlocked</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                  color: C.text, letterSpacing: 0.5,
                }}>{achievementToast.label}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: C.textDim,
                  marginTop: 2, lineHeight: 1.3,
                }}>{achievementToast.desc}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Theme unlock toast — positioned at top, below achievement toast if visible */}
      {themeToast && (
        <div key={themeToast.key} style={{
          position: "fixed",
          top: achievementToast
            ? "calc(170px + env(safe-area-inset-top, 0px))"
            : "calc(100px + env(safe-area-inset-top, 0px))",
          left: "50%",
          transform: "translateX(-50%)", zIndex: 100,
          maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
          animation: themeToastDismissing
            ? "achievementToastOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
            : "achievementToastIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          pointerEvents: "auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 14,
            backgroundColor: C.surface, border: `1.5px solid ${C.accent}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${C.accent}33`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              backgroundColor: C.accent + "18", display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${C.accent}66`, fontSize: 18, flexShrink: 0,
            }}>
              {themeToast.icon || "\uD83C\uDFA8"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2,
              }}>Theme unlocked</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                color: C.text, letterSpacing: 0.5,
              }}>{themeToast.name}</div>
            </div>
            <button
              onClick={() => {
                setActiveThemeId(themeToast.id);
                saveTheme(themeToast.id);
                setThemeToastDismissing(true);
                setTimeout(() => { setThemeToast(null); setThemeToastDismissing(false); }, 350);
                if (themeToastTimer.current) { clearTimeout(themeToastTimer.current); themeToastTimer.current = null; }
              }}
              style={{
                background: C.accent, border: "none", borderRadius: 8, padding: "6px 12px",
                color: C.bg, cursor: "pointer", fontFamily: "'Space Mono', monospace",
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap",
                transition: "opacity 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              Use it
            </button>
          </div>
        </div>
      )}

      {/* Top bar - fixed at top so it always stays visible */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: C.bg,
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
        display: "flex", justifyContent: "center", boxSizing: "border-box",
        touchAction: "manipulation",
      }}>
        <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: gridSize >= 7 ? 380 : 360, animation: "fadeUp 0.3s ease" }}>
        <button onClick={() => {
          if (isCoop) leaveCoopSession();
          if (difficulty === "cascade") {
            const runState = { level: cascadeLevel, elapsedSeconds: getElapsedSeconds(), fills: { ...fills }, attempts };
            const nextProgress = { ...progress, cascadeRunState: { ...(progress.cascadeRunState || {}), [cascadeRunIndex]: runState }, cascadeRunStateLastIndex: cascadeRunIndex };
            setProgress(nextProgress);
            saveProgress(nextProgress);
          }
          stopTimer();
          if (customMosaicPuzzlesRef.current && isMosaic) {
            setView("custom-mosaic");
          } else {
            setView("menu");
          }
        }}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px",
            color: C.textDim, cursor: "pointer", fontFamily: "'Space Mono', monospace",
            fontSize: 12, letterSpacing: 1, transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
        >
          &larr; {customMosaicPuzzlesRef.current && isMosaic ? "MOSAIC" : "PUZZLES"}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setShowThemePicker(true)}
            style={{
              background: "none", border: `1px solid ${activeThemeId !== "classic" ? (activeTheme.gridBorder || C.border).replace(/44$/, "88") : C.border}`,
              borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1,
              transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center",
              color: activeThemeId !== "classic" ? C.text : C.textDim,
              minWidth: 32, height: 30,
            }}
            title="Change theme"
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = activeThemeId !== "classic" ? (activeTheme.gridBorder || C.border).replace(/44$/, "88") : C.border; e.currentTarget.style.color = activeThemeId !== "classic" ? C.text : C.textDim; }}
          >
            {activeTheme.icon || <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>}
          </button>
          <button
            onClick={async () => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              const result = await tryNativeShare({ title: "Agnus", text: "Check out this puzzle", url: url || undefined });
              if (result === "shared") {
                setShareMsg("Shared!");
                setTimeout(() => setShareMsg(""), 2000);
                return;
              }
              if (result === "cancelled") return;
              try { await navigator.clipboard.writeText(url); } catch { /* fallback */ }
              setShareMsg("Copied!");
              setTimeout(() => setShareMsg(""), 2000);
            }}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px",
              color: C.textDim, cursor: "pointer", fontSize: 12, transition: "all 0.15s",
            }}
            title="Share link to this level"
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
          >
            {shareMsg || "Share"}
          </button>
          {/* Coop invite button - visible when playing supported modes, prompts login if needed */}
          {!isCoop && gameState === "playing" && !isCascade && !isMosaic && (
            <button
              onClick={() => {
                if (!firebaseUser) {
                  coopPendingLoginRef.current = true;
                  setShowAccountModal(true);
                  return;
                }
                startCoopSession();
              }}
              style={{
                background: "none", border: `1px solid #54A0FF55`, borderRadius: 8, padding: "6px 10px",
                color: "#54A0FF", cursor: "pointer", fontSize: 12, transition: "all 0.15s",
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5, fontWeight: 700,
              }}
              title="Invite a friend to play co-op"
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#54A0FF"; e.currentTarget.style.backgroundColor = "#54A0FF11"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#54A0FF55"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              Co-op
            </button>
          )}
          {/* Coop leave button when in coop */}
          {isCoop && (
            <button
              onClick={() => { leaveCoopSession(); }}
              style={{
                background: "none", border: `1px solid #f8717188`, borderRadius: 8, padding: "6px 10px",
                color: "#f87171", cursor: "pointer", fontSize: 11, transition: "all 0.15s",
                fontFamily: "'Space Mono', monospace", letterSpacing: 0.5,
              }}
              title="Leave co-op session"
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#f8717188"; }}
            >
              Leave
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Coop invite modal */}
      {showCoopInvite && coopSessionId && (
        <div onClick={() => setShowCoopInvite(false)} style={{
          position: "fixed", inset: 0, zIndex: 1200, backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeUp 0.2s ease both",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: C.surface, borderRadius: 16, padding: 24, maxWidth: 340, width: "90%",
            border: `1px solid ${C.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              Co-op Invite
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
              Share this link with a friend to solve together
            </div>
            <div style={{
              backgroundColor: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 12,
              fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.text, wordBreak: "break-all",
              border: `1px solid ${C.border}`,
            }}>
              {typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=${difficulty}&level=${currentPuzzle}&coop=${coopSessionId}` : ""}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}${window.location.pathname}?mode=${difficulty}&level=${currentPuzzle}&coop=${coopSessionId}`;
                  const result = await tryNativeShare({ title: "Agnus Co-op", text: "Join me for a co-op puzzle!", url });
                  if (result === "shared") {
                    setShowCoopInvite(false);
                    return;
                  }
                  if (result === "cancelled") return;
                  try { await navigator.clipboard.writeText(url); } catch {}
                  setShowCoopInvite(false);
                }}
                style={{
                  flex: 1, backgroundColor: "#54A0FF", color: "#fff", border: "none",
                  padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowCoopInvite(false)}
                style={{
                  backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                  padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Close
              </button>
            </div>
            {!coopPartnerConnected && (
              <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: C.textDim, fontFamily: "'Space Mono', monospace", animation: "pulse 2s infinite" }}>
                Waiting for partner to join...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info row: fixed below header */}
      <div style={{
        position: "fixed", top: "calc(48px + env(safe-area-inset-top, 0px))", left: 0, right: 0, zIndex: 10,
        backgroundColor: C.bg, display: "flex", justifyContent: "center",
        paddingTop: 4, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: gridSize >= 7 ? 380 : 360 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: gameState === "won" ? C.correct : gameState === "lost" ? C.incorrect : C.text, letterSpacing: 2 }}>
            {formatTime(elapsedTime)}
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isBlind ? "#e06040" : C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>
              {isCoop ? "Co-op " : ""}{diffLabel}{isDaily && currentDailyDate ? ` ${currentDailyDate}` : ""}{isCascade && cascadeLevelLabel ? ` ${cascadeLevelLabel}` : ""}{" "}
            </span>
            {!isDaily && !isCascade && (
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 2 }}>
                #{currentPuzzle + 1}
              </span>
            )}
          </div>
          <AttemptDots max={isCoop ? 5 : maxAttempts} used={attempts} won={gameState === "won"} />
        </div>
        {/* Coop status bar */}
        {isCoop && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            marginTop: 6, width: "100%", maxWidth: gridSize >= 7 ? 380 : 360,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 0.5,
              color: coopMyLockedIn ? C.correct : "#54A0FF",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                backgroundColor: coopMyLockedIn ? C.correct : "#54A0FF",
                display: "inline-block",
              }} />
              YOU {coopMyLockedIn ? "\u2713" : ""}
            </div>
            <div style={{ width: 1, height: 10, backgroundColor: C.border }} />
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 0.5,
              color: !coopPartnerConnected ? C.textDim : coopPartnerLockedIn ? (coopPartnerCorrect ? C.correct : C.incorrect) : "#FF9FF3",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                backgroundColor: !coopPartnerConnected ? C.textDim : coopPartnerLockedIn ? (coopPartnerCorrect ? C.correct : C.incorrect) : "#FF9FF3",
                display: "inline-block",
                animation: !coopPartnerConnected ? "pulse 2s infinite" : "none",
              }} />
              PARTNER {!coopPartnerConnected ? "..." : coopPartnerLockedIn ? "\u2713" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Coop waiting overlay - when partner hasn't joined yet */}
      {isCoop && !coopPartnerConnected && coopStatus === "waiting" && (
        <div style={{
          position: "fixed", top: "calc(100px + env(safe-area-inset-top, 0px))", left: "50%",
          transform: "translateX(-50%)", zIndex: 20,
          backgroundColor: C.surface, border: `1px solid #54A0FF44`, borderRadius: 12,
          padding: "12px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          fontFamily: "'Space Mono', monospace", fontSize: 12, color: C.text,
          textAlign: "center", animation: "fadeUp 0.3s ease both",
        }}>
          <div style={{ marginBottom: 4, fontWeight: 700, color: "#54A0FF" }}>Waiting for partner</div>
          <div style={{ fontSize: 10, color: C.textDim }}>Share the invite link to start</div>
          <button
            onClick={() => setShowCoopInvite(true)}
            style={{
              marginTop: 8, backgroundColor: "#54A0FF", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Show Link
          </button>
        </div>
      )}

      {/* Grid area: fills available space between fixed header and footer, centers grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "calc(88px + env(safe-area-inset-top, 0px))", paddingBottom: "calc(140px + env(safe-area-inset-bottom, 0px))", width: "calc(100% + 32px)", margin: "0 -16px", overflow: "hidden", backgroundColor: activeTheme.gridBg || C.surface, position: "relative", boxSizing: "border-box" }}>
        <GridDecoration decoration={activeTheme.decoration} />
      <div key={gridEpoch} style={{ animation: "slideIn 0.3s ease both", touchAction: "none" }}>
      <div style={{
        transform: isSpin ? `rotate(${spinAngle}deg)` : undefined,
        transition: isSpin ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
      }}>
        <div style={{
          display: "flex", flexDirection: "column", gap: gridGap, padding: gridPad,
          position: "relative", zIndex: 1,
        }}>
          {puzzle.solution.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: gridGap, position: "relative", zIndex: 1 }}>
              {row.map((token, c) => {
                const key = `${r}-${c}`;
                const isBlankCell = puzzle.blanks.has(key);
                const isLockedCell = lockedCells.has(key);
                // In coop mode, show partner fills for their blanks
                const partnerFill = isCoop && coopPartnerBlanks?.has(key) ? coopPartnerFills[key] : null;
                const myFill = fills[key];
                const effectiveFill = isBlankCell ? (isLockedCell ? token : (myFill || partnerFill)) : null;
                const fillToken = isBlankCell ? (effectiveFill || null) : token;
                const isRevealed = false;
                const displayToken = fillToken;
                const cellIndex = r * gridSize + c;
                const isWrongCell = wrongCells.has(key) && gameState !== "lost";
                const fallDelay = isBlankCell ? 0 : cellIndex * 0.032;
                const wrongFallDelay = isWrongCell ? cellIndex * 0.015 : 0;
                const totalCells = gridSize * gridSize;
                const emptyCellDelayRaw = (totalCells - 1) * 0.032 + 0.5;
                const emptyCellDelay = isBlankCell && clearedBlanks.has(key) ? null : emptyCellDelayRaw;
                const isWon = gameState === "won";
                const winCelebrateDelay = isWon ? cellIndex * 0.04 : 0;
                // Coop ownership visual hints
                const isCoopMine = isCoop && coopMyBlanks?.has(key);
                const isCoopPartner = isCoop && coopPartnerBlanks?.has(key);
                return (
                  <div key={key} style={{ position: "relative" }}>
                    <Cell token={displayToken} isBlank={isBlankCell}
                      isSelected={selectedCell === key}
                      isFilled={!!(myFill || partnerFill) || isLockedCell}
                      isCorrect={isWon && isBlankCell}
                      isWrong={isWrongCell}
                      isRevealed={isRevealed}
                      isLocked={(isLockedCell && gameState === "playing") || (isCoop && isBlankCell && isCoopPartner && !isWon)}
                      isPrefilled={!isBlankCell}
                      fallDelay={fallDelay}
                      wrongFallDelay={wrongFallDelay}
                      emptyCellDelay={emptyCellDelay}
                      isWon={isWon}
                      winCelebrateDelay={winCelebrateDelay}
                      onClick={() => handleCellClick(r, c)}
                      onPointerDown={() => handleCellPointerDown(r, c)}
                      onPointerUp={() => handleCellPointerUp(r, c)}
                      onPointerEnter={() => handleCellPointerEnter(r, c)}
                      cellSize={cellSize} iconSize={iconSize}
                      mode={puzzle.mode}
                      colorMap={themeColorMap}
                      shapesArr={themedShapes}
                      themeId={activeThemeId}
                      isJustPlaced={justPlacedCells.has(key)}
                      isRemoving={!!removingCells[key]}
                      removingToken={removingCells[key] || null}
                    />
                    {/* Coop ownership indicator dot */}
                    {isCoop && isBlankCell && gameState === "playing" && !isWon && (
                      <div style={{
                        position: "absolute", top: 2, right: 2,
                        width: 5, height: 5, borderRadius: "50%",
                        backgroundColor: isCoopMine ? "#54A0FF" : "#FF9FF3",
                        opacity: 0.7, pointerEvents: "none",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>
      </div>

      {/* Fixed bottom bar: token picker + actions */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, backgroundColor: C.bg, paddingTop: 10, paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderTop: `1px solid ${C.border}` }}>
        {/* Token picker row */}
        {gameState === "playing" && (
          <TokenPicker tokens={puzzle.usedTokens} selectedToken={selectedToken} onSelect={handleTokenSelect} cellSize={pickerSize} mode={puzzle.mode} remaining={tokenRemaining} colorMap={themeColorMap} shapesArr={themedShapes} themeId={activeThemeId} />
        )}
        {gameState === "playing" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Coop: show Lock In or waiting state; Normal: show Check */}
            {isCoop && coopMyLockedIn ? (
              <div style={{
                padding: "14px 32px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                textTransform: "uppercase", color: C.correct,
                border: `2px solid ${C.correct}44`, backgroundColor: `${C.correct}11`,
              }}>
                {"\u2713"} Locked In {!coopPartnerLockedIn ? "- Waiting..." : ""}
              </div>
            ) : (
              <button
                onClick={allFilled ? (isCoop ? coopLockIn : checkSolution) : undefined}
                disabled={!allFilled}
                style={{
                  backgroundColor: allFilled ? (isCoop ? "#54A0FF" : isBlind ? "#e06040" : C.accent) : C.surfaceLight,
                  color: allFilled ? (isCoop ? "#fff" : isBlind ? "#fff" : C.bg) : C.textDim,
                  border: "none",
                  padding: "14px 48px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 2,
                  cursor: allFilled ? "pointer" : "not-allowed",
                  textTransform: "uppercase", transition: "all 0.2s",
                  boxShadow: allFilled ? (isCoop ? "0 4px 20px #54A0FF44" : isBlind ? "0 4px 20px #e0604044" : `0 4px 20px ${C.accent}44`) : "none",
                  opacity: allFilled ? 1 : 0.7,
                }}
                onMouseEnter={e => { if (allFilled) e.target.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.target.style.transform = "translateY(0)"; }}
              >
                {isCoop ? "Lock In" : isBlind ? "Guess" : "Check"}
              </button>
            )}
            {!isCoop && (Object.keys(fills).length > 0 || attempts > 0) && (
              <button
                onClick={resetBoard}
                style={{
                  backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                  padding: "14px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
              >
                Reset
              </button>
            )}
          </div>
        )}

        {gameState === "won" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.correct, marginBottom: 12, animation: "fadeUp 0.4s ease" }}>
              &#x2713; {isCoop ? "Co-op complete!" : isCascade ? "Cascade complete!" : isBlind ? "Cracked it!" : isSpin ? "Nailed it!" : isMosaic ? "Tile complete!" : "Perfect"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={async () => {
                let text;
                if (isCoop) {
                  text = `Agnus Co-op \uD83E\uDDE9 ${diffLabel} #${currentPuzzle + 1}\nSolved together \u2022 ${formatTime(elapsedTime)}`;
                } else if (isCascade) {
                  text = `Agnus Cascade \uD83E\uDDE9\nCompleted 3×3 → 9×9 \u2022 ${formatTime(elapsedTime)}`;
                } else if (isDaily) {
                  const medal = attempts <= 2 ? "\u2605" : attempts <= 4 ? "\u25CF" : "\u25C6";
                  const dailyUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=daily&date=${currentDailyDate}` : "";
                  text = `Agnus Daily ${currentDailyDate}\n${medal} Solved in ${attempts} attempt${attempts !== 1 ? "s" : ""} \u2022 ${formatTime(elapsedTime)}\n${dailyUrl}`;
                } else {
                  const medal = attempts <= 2 ? "\u2605" : attempts <= 4 ? "\u25CF" : "\u25C6";
                  text = `Agnus \uD83E\uDDE9 ${diffLabel} #${currentPuzzle + 1}\n${medal} Solved in ${attempts} attempt${attempts !== 1 ? "s" : ""} \u2022 ${formatTime(elapsedTime)}`;
                }
                const result = await tryNativeShare({ text });
                if (result === "shared") {
                  setShareMsg("Shared!");
                  setTimeout(() => setShareMsg(""), 2000);
                  return;
                }
                if (result === "cancelled") return;
                navigator.clipboard.writeText(text).catch(() => {});
                setShareMsg("Copied!");
                setTimeout(() => setShareMsg(""), 2000);
              }}
                style={{
                  backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                  padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
              >
                {shareMsg || "Share"}
              </button>
              <button onClick={() => { if (isCoop) leaveCoopSession(); startPuzzle(isCascade ? cascadeRunIndex : currentPuzzle, isCascade ? "cascade" : undefined, true, isDaily ? currentDailyDate : null); }}
                style={{
                  backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                  padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
              >
                Retry
              </button>
              {isCoop ? (
                <button onClick={() => { leaveCoopSession(); setView("menu"); }}
                  style={{
                    backgroundColor: "#54A0FF", color: "#fff", border: "none",
                    padding: "12px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.2s",
                    boxShadow: "0 4px 20px #54A0FF44",
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  Back to puzzles
                </button>
              ) : (isDaily || isCascade || (customMosaicPuzzlesRef.current && isMosaic)) ? (
                <button onClick={() => { setView(customMosaicPuzzlesRef.current && isMosaic ? "custom-mosaic" : "menu"); }}
                  style={{
                    backgroundColor: C.accent, color: C.bg, border: "none",
                    padding: "12px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.2s",
                    boxShadow: `0 4px 20px ${C.accent}44`,
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  {customMosaicPuzzlesRef.current && isMosaic ? "Back to mosaic" : "Back to puzzles"}
                </button>
              ) : currentPuzzle < totalPuzzles - 1 ? (
                <button onClick={() => startPuzzle(currentPuzzle + 1)}
                  style={{
                    backgroundColor: C.accent, color: C.bg, border: "none",
                    padding: "12px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 2, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.2s",
                    boxShadow: `0 4px 20px ${C.accent}44`,
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  Next &rarr;
                </button>
              ) : null}
            </div>
          </div>
        )}

        {gameState === "lost" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: C.incorrect, marginBottom: 4, animation: "fadeUp 0.4s ease" }}>
              {isCoop ? "Co-op failed" : isCascade ? "Run over" : "Not this time"}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
              {isCoop ? "Out of attempts" : isCascade ? (
                <div>Reached {puzzle?.gridSize ?? 0}×{puzzle?.gridSize ?? 0}</div>
              ) : "Better luck next time"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {isCascade && !isCoop && (
                <button onClick={async () => {
                  const sz = puzzle?.gridSize ?? 0;
                  const text = `Agnus Cascade \uD83E\uDDE9\nReached ${sz}×${sz}`;
                  const result = await tryNativeShare({ text });
                  if (result === "shared") {
                    setShareMsg("Shared!");
                    setTimeout(() => setShareMsg(""), 2000);
                    return;
                  }
                  if (result === "cancelled") return;
                  navigator.clipboard.writeText(text).catch(() => {});
                  setShareMsg("Copied!");
                  setTimeout(() => setShareMsg(""), 2000);
                }}
                  style={{
                    backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                  onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.text; }}
                >
                  {shareMsg || "Share"}
                </button>
              )}
              {isCoop ? (
                <button onClick={() => { leaveCoopSession(); setView("menu"); }}
                  style={{
                    backgroundColor: "#54A0FF", color: "#fff", border: "none",
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                    textTransform: "uppercase", transition: "all 0.15s",
                    boxShadow: "0 4px 16px #54A0FF44",
                  }}
                  onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                >
                  Back to puzzles
                </button>
              ) : isCascade ? (
                <>
                  <button onClick={() => startPuzzle(cascadeRunIndex, "cascade", true)}
                    style={{
                      backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                      padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.text; }}
                  >
                    Retry
                  </button>
                  <button onClick={() => { setView("menu"); }}
                    style={{
                      backgroundColor: C.accent, color: C.bg, border: "none",
                      padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                      boxShadow: `0 4px 16px ${C.accent}44`,
                    }}
                    onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                    onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                  >
                    Back to puzzles
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => startPuzzle(currentPuzzle)}
                    style={{
                      backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}`,
                      padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                      textTransform: "uppercase", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.text; }}
                  >
                    Retry
                  </button>
                  {currentPuzzle < totalPuzzles - 1 && (
                    <button onClick={() => startPuzzle(currentPuzzle + 1)}
                      style={{
                        backgroundColor: C.accent, color: C.bg, border: "none",
                        padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                        fontFamily: "'Space Mono', monospace", letterSpacing: 1, cursor: "pointer",
                        textTransform: "uppercase", transition: "all 0.15s",
                        boxShadow: `0 4px 16px ${C.accent}44`,
                      }}
                      onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
                      onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                    >
                      Next &rarr;
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {themePickerEl}
      {accountModalEl}
      {usernameModalEl}
      {profilePageEl}
    </div>
  );
}
