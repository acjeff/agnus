import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Play, Pencil, User, Home, LayoutGrid, Trophy, Globe, FolderOpen, Plus, Users, ChevronLeft, Grid3X3, Eye, Zap, Shuffle, Calendar, Layers, Star, Compass, Menu, Palette, Share2, Search, UserPlus, Upload, LogIn, LogOut, Check, RotateCcw, ChevronRight, HandHelping, Handshake, Clock, Bell, PaintBucket, Eraser, Settings, Cake, Trash2, Edit3, Award, X, Copy, Lightbulb, SmilePlus, Undo2, Redo2 } from "lucide-react";
import {
  isFirebaseConfigured,
  subscribeToAuthChanges,
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  deleteAccount,
  reauthenticateUser,
  loadCloudData,
  saveCloudData,
  mergeGameData,
  summariseGameData,
  saveMosaicDesign,
  updateMosaicDesign,
  deleteMosaicDesign,
  submitMosaicForReview,
  approveMosaic,
  rejectMosaic,
  shareMosaicWithUser,
  saveUserEmail,
  checkIsAdmin,
  createCoopSession,
  joinCoopSession,
  subscribeToCoopSession,
  updateCoopFill,
  passCoopCell,
  sendCoopPassRequest,
  respondCoopPassRequest,
  cancelCoopPassRequest,
  sendCoopCellSuggestion,
  cancelCoopCellSuggestion,
  lockInCoopPlayer,
  unlockCoopPlayer,
  updateCoopAttempts,
  completeCoopSession,
  resetCoopSession,
  deleteCoopSession,
  loadCoopSession,
  closeCoopSession,
  loadUserCoopSessions,
  subscribeToUserCoopSessionIndex,
  sendNotification,
  subscribeToNotifications,
  dismissNotification,
  checkUsernameAvailability,
  saveUsername,
  loadUserProfile,
  saveProfilePicture,
  lookupUserByUsername,
  updatePublicMosaicFields,
  unpublishMosaic,
  setStaffPick,
  clearStaffPick,
  addFriend,
  removeFriend,
  registerAdminIndex,
  loadAdminUids,
  savePublicStats,
  loadPublicStats,
  savePuzzleCompletion,
  updatePresence,
  subscribeToFriendPresence,
  loadAllPublicStats,
  subscribeToAllPublicStats,
  subscribeToAllPresence,
  loadAllPuzzleCompletionsForMode,
  subscribeToFriends,
  subscribeToUserMosaics,
  subscribeToPublicMosaics,
  subscribeToPendingMosaics,
  subscribeToSharedMosaics,
  subscribeToStaffPick,
  subscribeToPuzzleCompletions,
  createCoopMosaicSession,
  joinCoopMosaicSession,
  subscribeToCoopMosaicSession,
  updateCoopMosaicFill,
  updateCoopMosaicCurrentTile,
  updateCoopMosaicTileProgress,
  clearCoopMosaicTileFills,
  completeCoopMosaicSession,
  playerLeaveCoopMosaicSession,
  closeCoopMosaicSession,
  loadCoopMosaicSession,
  updateCoopMosaicTileLockedCells,
  addCoopInvitedUid,
  addCoopMosaicInvitedUid,
  generateCoopMosaicSessionId,
  sendFriendReaction,
  subscribeToFriendReactions,
} from "./firebase.js";
import VaultMode, { getVaultSummary } from "./vault/VaultMode.jsx";
import VaultChat, { getUnreadCount } from "./vault/VaultChat.jsx";
import { buildVaultPuzzles, VAULT_DIFFICULTIES, computeUnlockedTiles, getMastermindFeedback } from "./vault/VaultGenerator.js";
import {
  generateVaultSessionId,
  createVaultSession,
  joinVaultSession,
  loadVaultSession,
  subscribeToVaultSession,
  updateVaultFill,
  updateVaultCurrentTile,
  updateVaultTileProgress,
  clearVaultTileFills,
  updateVaultTileUnlocked,
  advanceVaultTurn,
  sendVaultChatMessage,
  sendVaultReaction,
  closeVaultSession,
  playerLeaveVaultSession,
  addVaultInvitedUid,
} from "./vault/VaultFirebase.js";

// --- Theme ---
const BASE_COLORS = {
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
  coop: "#60a5fa", // blue for co-op completions
};
const C = { ...BASE_COLORS };

// --- Draggable Drawer (mobile bottom sheet with drag-to-dismiss) ---
function DraggableDrawer({ isOpen, onClose, children, maxHeight, zIndex }) {
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);
  const handleRef = useRef(null);
  const dragState = useRef({ active: false, startY: 0, current: 0 });

  const onTouchStart = useCallback((e) => {
    const handleEl = handleRef.current;
    const drawerEl = drawerRef.current;
    if (!handleEl || !drawerEl) return;
    const isHandle = handleEl.contains(e.target);
    const scrollEl = drawerEl.querySelector("[data-drawer-scroll]");
    const isScrolledToTop = !scrollEl || scrollEl.scrollTop <= 0;
    if (!isHandle && !isScrolledToTop) return;
    dragState.current = { active: true, startY: e.touches[0].clientY, current: 0 };
    drawerEl.style.transition = "none";
    drawerEl.style.animation = "none";
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragState.current.active) return;
    const dy = e.touches[0].clientY - dragState.current.startY;
    if (dy > 0) {
      e.preventDefault();
      dragState.current.current = dy;
      if (drawerRef.current) drawerRef.current.style.transform = `translateY(${dy}px)`;
      if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / 400));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const dy = dragState.current.current;
    if (drawerRef.current) drawerRef.current.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
    if (dy > 100) {
      if (drawerRef.current) drawerRef.current.style.transform = "translateY(100%)";
      if (backdropRef.current) { backdropRef.current.style.transition = "opacity 0.3s"; backdropRef.current.style.opacity = "0"; }
      setTimeout(() => onClose(), 300);
    } else {
      if (drawerRef.current) drawerRef.current.style.transform = "translateY(0)";
      if (backdropRef.current) backdropRef.current.style.opacity = "1";
    }
    dragState.current.current = 0;
  }, [onClose]);

  // Attach non-passive touch listeners so e.preventDefault() works on mobile
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, onTouchStart, onTouchMove, onTouchEnd]);

  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const html = document.documentElement;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = "";
      html.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: zIndex || 1100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} role="dialog" aria-modal="true">
      <style>{`@keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } @keyframes drawerOverlayFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div ref={backdropRef} onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", animation: "drawerOverlayFade 0.25s ease both" }} />
      <div ref={drawerRef} onClick={e => e.stopPropagation()} style={{
        position: "relative", backgroundColor: C.bg, borderRadius: "20px 20px 0 0",
        border: `1px solid ${C.border}`, borderBottom: "none",
        maxHeight: maxHeight || "85vh", display: "flex", flexDirection: "column",
        animation: "drawerSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
        width: "100%", maxWidth: 480, alignSelf: "center",
      }}>
        <div ref={handleRef} style={{ padding: "12px 0 8px", flexShrink: 0, cursor: "grab", touchAction: "none" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, margin: "0 auto" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

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
    uiColors: null,
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
    uiColors: { bg: "#0a100a", surface: "#141f14", surfaceLight: "#1e2e1e", accent: "#d4a017", text: "#e8efe8", textDim: "#5b7b5b", border: "#2a3a2a" },
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
    uiColors: { bg: "#0f0a10", surface: "#1a1420", surfaceLight: "#2a1e30", accent: "#ff8c00", text: "#e8e0ef", textDim: "#7b6b8b", border: "#3a2a4a" },
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
    uiColors: { bg: "#050510", surface: "#0a0a1f", surfaceLight: "#14142e", accent: "#ff0080", text: "#e0e8ff", textDim: "#6b6bab", border: "#2a2a5a" },
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
    uiColors: { bg: "#060d14", surface: "#0e1820", surfaceLight: "#162230", accent: "#00bcd4", text: "#d8e8f0", textDim: "#5b7b8b", border: "#1a3040" },
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
    uiColors: { bg: "#100e14", surface: "#1a1820", surfaceLight: "#24202e", accent: "#e8a0d0", text: "#f0e8f5", textDim: "#8b7b9b", border: "#302a3a" },
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
    uiColors: { bg: "#100a06", surface: "#1f1410", surfaceLight: "#2e1e18", accent: "#ff8c42", text: "#f0e8e0", textDim: "#8b7b6b", border: "#3a2a1a" },
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
    uiColors: { bg: "#0c0c0e", surface: "#161618", surfaceLight: "#202022", accent: "#a0a0a8", text: "#d8d8dc", textDim: "#68686e", border: "#303034" },
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
    uiColors: { bg: "#0a0a14", surface: "#14142a", surfaceLight: "#1e1e3a", accent: "#ff0054", text: "#e8e8ff", textDim: "#6b6b9b", border: "#2a2a4a" },
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
    uiColors: { bg: "#080e0a", surface: "#101a12", surfaceLight: "#18241a", accent: "#4caf50", text: "#d8e8da", textDim: "#5b7b5d", border: "#1a3a1e" },
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
    uiColors: { bg: "#080810", surface: "#10101e", surfaceLight: "#1a1a2e", accent: "#9c6bff", text: "#e0e0f0", textDim: "#7070a0", border: "#2a2a50" },
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
    uiColors: { bg: "#120a10", surface: "#1e1218", surfaceLight: "#2a1a22", accent: "#ff6b9d", text: "#f0e0ea", textDim: "#9b6b8b", border: "#3a2232" },
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
    uiColors: { bg: "#060a10", surface: "#0c1420", surfaceLight: "#141e30", accent: "#38bdf8", text: "#d8e8f8", textDim: "#5b7b9b", border: "#1a2a40" },
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
    uiColors: { bg: "#100608", surface: "#1e0e12", surfaceLight: "#2e161e", accent: "#ff4d6d", text: "#f0e0e4", textDim: "#9b6b7b", border: "#3a1a24" },
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
    uiColors: { bg: "#080e08", surface: "#101a10", surfaceLight: "#182418", accent: "#10b981", text: "#d8f0d8", textDim: "#5b8b5b", border: "#1a3a1a" },
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
    uiColors: { bg: "#100810", surface: "#1e1018", surfaceLight: "#2a1822", accent: "#ff69b4", text: "#f0e0f0", textDim: "#9b6b9b", border: "#3a1a3a" },
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
    uiColors: { bg: "#080008", surface: "#140010", surfaceLight: "#1e0018", accent: "#ff0040", text: "#e0d0e0", textDim: "#8b5b7b", border: "#3a0a2a" },
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
    uiColors: { bg: "#0a0a06", surface: "#14140e", surfaceLight: "#1e1e16", accent: "#c9a84c", text: "#e8e8d8", textDim: "#7b7b5b", border: "#2a2a1a" },
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
      mosaicCompletions: base.mosaicCompletions ?? {},
      cascadeRunState,
      cascadeRunStateLastIndex: typeof cascadeRunStateLastIndex === "number" ? cascadeRunStateLastIndex : undefined,
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, mosaic: {}, coop: {}, mosaicCompletions: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined };
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
      spin: base.spin ?? {},
      coop: base.coop ?? {},
      mosaicCompletionTimes: base.mosaicCompletionTimes ?? {},
    };
  } catch {
    return { easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, coop: {}, mosaicCompletionTimes: {} };
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

function Cell({ token, isBlank, isSelected, isFilled, isCorrect, isWrong, isRevealed, isLocked, onClick, onPointerDown, onPointerUp, onPointerEnter, cellSize, iconSize, mode, isPrefilled, fallDelay = 0, wrongFallDelay = 0, emptyCellDelay, isWon, winCelebrateDelay = 0, colorMap, shapesArr, isJustPlaced, isRemoving, removingToken, themeId, coopOwnerColor, coopBorderColor }) {
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
        backgroundColor: showContent && displayColor ? displayColor
          : coopOwnerColor && isBlank && !isFilled && !isRevealed && !isLocked ? coopOwnerColor
          : (isEnigma ? "rgba(12,12,8,0.7)" : C.surfaceLight),
        border: isEnigma ? enigmaActiveBorder
          : isLocked ? `2.5px solid ${C.correct}`
          : isSelected ? `2.5px solid ${C.accent}`
          : isWrong ? `2.5px solid ${C.incorrect}`
          : isBlank && !isFilled && !isRevealed && !isRemoving ? (coopBorderColor ? `2.5px solid ${coopBorderColor}` : `2.5px dashed ${C.border}`)
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

function TokenPicker({ tokens, selectedToken, onSelect, cellSize, mode, remaining, colorMap, shapesArr, themeId, passOption }) {
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
                  fontFamily: "'Inter', sans-serif",
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
        {/* Pass tile — always shown in coop mode */}
        {passOption && (
          <div
            onClick={() => { if (!dragRef.current.moved) passOption.onPass(); }}
            style={{
              width: cellSize, height: cellSize,
              borderRadius: 12,
              backgroundColor: passOption.active ? "#54A0FF" : C.surfaceLight,
              border: passOption.active ? "3px solid #54A0FF" : `3px solid ${C.border}`,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
              transform: passOption.active ? "scale(1.15)" : "scale(1)",
              boxShadow: passOption.active ? "0 0 20px #54A0FF66" : "none",
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width={cellSize * 0.45} height={cellSize * 0.45} viewBox="0 0 24 24" fill="none"
              stroke={passOption.active ? "#fff" : C.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M11 13l-7 7"/><path d="M3 16v5h5"/>
            </svg>
          </div>
        )}
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
  { key: "easy", label: "Easy", desc: "5\u00D75 \u2022 Paired", cat: "classic", icon: "grid" },
  { key: "medium", label: "Medium", desc: "7\u00D77 \u2022 Paired", cat: "classic", icon: "layers" },
  { key: "hard", label: "Hard", desc: "7\u00D77 \u2022 Mixed", cat: "classic", icon: "zap" },
  { key: "blind", label: "Blind", desc: "5\u00D75 \u2022 No Clues", cat: "special", icon: "eye" },
  { key: "daily", label: "Daily", desc: "1 a day", cat: "special", icon: "calendar" },
  { key: "cascade", label: "Cascade", desc: "Keep on", cat: "special", icon: "layers" },
  { key: "spin", label: "Spin", desc: "7\u00D77 \u2022 Dizzy", cat: "special", icon: "shuffle" },
  { key: "mosaic", label: "Mosaic", desc: "5\u00D75 \u2022 Big picture", cat: "special", icon: "gallery" },
];

const MODE_CATEGORIES = ["classic", "special"];
const CATEGORY_ICONS = { classic: "compass", special: "star" };
const VALID_MODES = new Set(["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"]);

const VALID_VIEWS = new Set(["gallery", "creator", "custom-mosaic", "coop", "profile"]);

function getSearchParams() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode");
  const level = params.get("level");
  const date = params.get("date");
  const viewParam = params.get("view");
  const coop = params.get("coop");
  const coopMosaic = params.get("coopMosaic");
  const vault = params.get("vault");
  return {
    mode: mode && VALID_MODES.has(mode) ? mode : null,
    level: level != null ? Math.max(0, Math.min(49, parseInt(level, 10) || 0)) : null,
    date: date && /^\d{2}-\d{2}-\d{4}$/.test(date) ? date : null,
    view: viewParam && VALID_VIEWS.has(viewParam) ? viewParam : null,
    coop: coop || null,
    coopMosaic: coopMosaic || null,
    vault: vault || null,
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
  // Preserve active coop session params across URL updates
  const current = new URLSearchParams(window.location.search);
  const coopVal = current.get("coop");
  const coopMosaicVal = current.get("coopMosaic");
  const vaultVal = current.get("vault");
  if (coopVal) params.set("coop", coopVal);
  if (coopMosaicVal) params.set("coopMosaic", coopMosaicVal);
  if (vaultVal) params.set("vault", vaultVal);
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  if (replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
}

function setCoopUrlParam(paramName, value) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set(paramName, value);
  const url = `${window.location.pathname}?${params}`;
  window.history.replaceState({}, "", url);
}

function clearCoopUrlParam(paramName) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete(paramName);
  const url = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
  window.history.replaceState({}, "", url);
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
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [coopSetupMode, setCoopSetupMode] = useState(null); // null | difficulty key | "mosaic"
  const [coopSetupLevel, setCoopSetupLevel] = useState(0);
  const [coopSetupMosaic, setCoopSetupMosaic] = useState(null); // selected mosaic for coop setup
  const [coopSetupStarting, setCoopSetupStarting] = useState(false);
  const [achievementToast, setAchievementToast] = useState(null); // { label, tier, key }
  const [toastDismissing, setToastDismissing] = useState(false);
  const achievementQueueRef = useRef([]);
  const achievementToastTimer = useRef(null);
  const toastDismissTimer = useRef(null);
  const prevUnlockedRef = useRef(null);
  const [birthdayInput, setBirthdayInput] = useState("");
  const goToDateRef = useRef(null);

  // Radial context button state — stack for nested menus (empty = closed, ["root"] = top level, ["root","play"] = sub-menu)
  const [radialMenuStack, setRadialMenuStack] = useState([]);
  // Lock body scroll when context menu is open
  useEffect(() => {
    const menuOpen = radialMenuStack.length > 0;
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => { document.body.style.overflow = ""; document.body.style.touchAction = ""; };
  }, [radialMenuStack.length]);

  // Theme state
  const [activeThemeId, setActiveThemeId] = useState(() => loadTheme());
  const [themeToast, setThemeToast] = useState(null); // { id, name, icon, key }
  const [themeToastDismissing, setThemeToastDismissing] = useState(false);
  const themeToastTimer = useRef(null);
  const prevUnlockedThemesRef = useRef(null);

  const activeTheme = useMemo(() => PUZZLE_THEMES.find(t => t.id === activeThemeId) || PUZZLE_THEMES[0], [activeThemeId]);
  const themeColorMap = useMemo(() => buildColorMap(activeTheme.palettes), [activeTheme]);
  const themedShapes = activeTheme.shapes || SHAPES;

  // Apply theme UI colors to the shared C object so all components pick them up
  useMemo(() => {
    const themed = activeTheme.uiColors || {};
    Object.keys(BASE_COLORS).forEach(k => { C[k] = themed[k] || BASE_COLORS[k]; });
  }, [activeTheme]);

  // Sync document background color with theme
  useEffect(() => {
    const bg = C.bg;
    document.body.style.backgroundColor = bg;
    document.documentElement.style.backgroundColor = bg;
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, [activeThemeId]);

  // --- Account / Firebase state ---
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [accountTab, setAccountTab] = useState("login"); // "login" | "signup"
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "", "syncing", "synced", "error"
  const cloudSyncInFlight = useRef(false);
  const firebaseConfigured = isFirebaseConfigured();
  // Sync choice prompt state (shown when both local + cloud data exist on login)
  const [syncChoiceData, setSyncChoiceData] = useState(null); // { uid, localData, cloudData, localSummary, cloudSummary }

  // --- Username & Profile state ---
  const [username, setUsername] = useState(null); // current user's username
  const [profilePicture, setProfilePicture] = useState(null); // base64 data URL
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null | true | false
  const [profilePictureLoading, setProfilePictureLoading] = useState(false);
  const usernameCheckTimer = useRef(null);
  const hasCheckedUsername = useRef(false);

  // --- Coop mode state ---
  const [coopSessionId, setCoopSessionId] = useState(null);
  const [coopRole, setCoopRole] = useState(null); // "host" | "guest" | null
  const [coopMyBlanks, setCoopMyBlanks] = useState(null); // Set of cell keys assigned to me
  const [coopPartnerBlanks, setCoopPartnerBlanks] = useState(null); // Set of cell keys assigned to partner
  const [coopPartnerFills, setCoopPartnerFills] = useState({}); // partner's fills from Firebase
  const prevCoopPartnerFillsRef = useRef({}); // previous partner fills for animation diffing
  const [coopMyLockedIn, setCoopMyLockedIn] = useState(false);
  const [coopPartnerLockedIn, setCoopPartnerLockedIn] = useState(false);
  const [coopPartnerCorrect, setCoopPartnerCorrect] = useState(false);
  const [coopEveryoneLockedCorrect, setCoopEveryoneLockedCorrect] = useState(false); // true only when Firebase confirms ALL players locked in + correct
  const [coopPartnerConnected, setCoopPartnerConnected] = useState(false);
  const [coopPartnerName, setCoopPartnerName] = useState(null); // partner's username in regular coop
  const [coopPartnerPic, setCoopPartnerPic] = useState(null); // partner's profile picture in regular coop
  const [showCoopInvite, setShowCoopInvite] = useState(false); // invite modal
  const [coopStatus, setCoopStatus] = useState(null); // "waiting" | "playing" | "complete"
  const coopUnsubRef = useRef(null); // unsubscribe function for Firebase listener
  const coopWriteThrottleRef = useRef({}); // throttle writes to Firebase
  const coopPendingLoginRef = useRef(false); // auto-start coop after login
  const coopOriginalThemeRef = useRef(null); // guest's original theme before coop override
  const coopHostTimerStartRef = useRef(null); // last known hostTimerStart for sync
  const coopPartnerPicFetchedRef = useRef(null); // UID of partner whose pic was already fetched
  const activeThemeIdRef = useRef(activeThemeId); // current theme ref for coop subscription
  activeThemeIdRef.current = activeThemeId;
  const isCoop = !!coopSessionId;
  const [coopPlayers, setCoopPlayers] = useState({}); // { uid: { username, lockedIn, correct, ... } } — all OTHER players in normal coop
  const [coopInvitedUids, setCoopInvitedUids] = useState(new Set()); // UIDs invited to normal coop session
  const coopPlayerUidsRef = useRef(""); // serialized sorted player UIDs for detecting changes
  const [coopPlayerColorMap, setCoopPlayerColorMap] = useState({}); // { uid: neonColor } — unique color per OTHER player
  const [coopCellOwnerMap, setCoopCellOwnerMap] = useState({}); // { cellKey: uid } — which player owns each blank cell
  const [coopCellOverrides, setCoopCellOverrides] = useState({}); // { cellKey: uid } — manual cell reassignments from Firebase
  const [coopPassingCell, setCoopPassingCell] = useState(null); // cellKey being passed to another player
  const [coopPlayersExpanded, setCoopPlayersExpanded] = useState(false); // expanded player list in top bar
  const [coopPassMode, setCoopPassMode] = useState(null); // { targetUid, targetName, targetColor } — in pass-cell-selection mode
  const [coopIncomingPass, setCoopIncomingPass] = useState(null); // { fromUid, fromName, fromColor, cellKey } — incoming pass request
  const [coopPendingPassCell, setCoopPendingPassCell] = useState(null); // cellKey of outgoing pending pass
  const [coopPassPlayerPicker, setCoopPassPlayerPicker] = useState(false); // show player picker for pass
  const [pendingPassOpen, setPendingPassOpen] = useState(false); // toggle pending pass UI in pill
  // --- Cell suggestion state (suggest what a cell could be to another player) ---
  const [coopSuggestMode, setCoopSuggestMode] = useState(null); // { targetUid, targetName, targetColor } — in suggest-cell-selection mode
  const [coopSuggestPlayerPicker, setCoopSuggestPlayerPicker] = useState(false); // show player picker for suggest
  const [coopSuggestCell, setCoopSuggestCell] = useState(null); // cellKey selected for suggestion, waiting for token pick
  const [coopAllSuggestions, setCoopAllSuggestions] = useState([]); // all suggestions (incoming + outgoing) for grid display: [{ fromUid, fromName, fromColor, cellKey, suggestedToken, isMine }]
  // --- Coop reaction state ---
  const [coopFloatingReactions, setCoopFloatingReactions] = useState([]); // floating reaction animations: [{ id, emoji, fromName, fromColor, x, type }]
  const coopSeenReactionsRef = useRef(new Set()); // track already-seen reaction keys to detect new ones
  // All reactions in one flat list: emoji, then patterns, then text words
  const COOP_REACTIONS = [
    // Emoji
    { content: "\u{1F44D}", type: "emoji" }, { content: "\u{1F44E}", type: "emoji" },
    { content: "\u2764\uFE0F", type: "emoji" }, { content: "\u{1F525}", type: "emoji" },
    { content: "\u{1F602}", type: "emoji" }, { content: "\u{1F62E}", type: "emoji" },
    { content: "\u{1F914}", type: "emoji" }, { content: "\u{1F44F}", type: "emoji" },
    { content: "\u{1F389}", type: "emoji" }, { content: "\u{1F4AF}", type: "emoji" },
    { content: "\u{1F60E}", type: "emoji" }, { content: "\u{1F622}", type: "emoji" },
    { content: "\u{1F631}", type: "emoji" }, { content: "\u{1F92F}", type: "emoji" },
    { content: "\u{1F64F}", type: "emoji" }, { content: "\u{1F440}", type: "emoji" },
    { content: "\u{1F680}", type: "emoji" }, { content: "\u{1F3AF}", type: "emoji" },
    { content: "\u{1F4A1}", type: "emoji" }, { content: "\u{1F48E}", type: "emoji" },
    { content: "\u26A1", type: "emoji" }, { content: "\u{1F47B}", type: "emoji" },
    { content: "\u{1F984}", type: "emoji" }, { content: "\u2728", type: "emoji" },
    // Patterns
    { content: "\u25CB", type: "pattern" }, { content: "\u25C7", type: "pattern" },
    { content: "\u25B3", type: "pattern" }, { content: "\u271A", type: "pattern" },
    { content: "\u25A1", type: "pattern" }, { content: "\u2606", type: "pattern" },
    { content: "\u2735", type: "pattern" }, { content: "\u2191", type: "pattern" },
    { content: "\u2193", type: "pattern" }, { content: "\u2190", type: "pattern" },
    { content: "\u2192", type: "pattern" }, { content: "\u2195", type: "pattern" },
    { content: "\u2194", type: "pattern" }, { content: "\u25CF", type: "pattern" },
    { content: "\u25C6", type: "pattern" }, { content: "\u25B2", type: "pattern" },
    { content: "\u25A0", type: "pattern" }, { content: "\u2605", type: "pattern" },
    { content: "\u2573", type: "pattern" }, { content: "\u2502", type: "pattern" },
    { content: "\u2500", type: "pattern" }, { content: "\u254B", type: "pattern" },
    // Text — Elden Ring style
    { content: "Behold", type: "text" }, { content: "Dog", type: "text" },
    { content: "Seek", type: "text" }, { content: "Hidden", type: "text" },
    { content: "Praise", type: "text" }, { content: "Likely", type: "text" },
    { content: "Liar", type: "text" }, { content: "Ahh", type: "text" },
    { content: "Try", type: "text" }, { content: "Fort", type: "text" },
    { content: "Visions", type: "text" }, { content: "Gorgeous", type: "text" },
    { content: "Vigor", type: "text" }, { content: "Offer", type: "text" },
    { content: "Ahead", type: "text" }, { content: "Rump", type: "text" },
    { content: "Pickle", type: "text" }, { content: "Huzzah", type: "text" },
    { content: "Why", type: "text" }, { content: "Treasure", type: "text" },
    { content: "Despair", type: "text" }, { content: "Grace", type: "text" },
    { content: "Bravery", type: "text" }, { content: "Futile", type: "text" },
    { content: "Betrayal", type: "text" }, { content: "Madness", type: "text" },
    { content: "Victory", type: "text" }, { content: "Doubt", type: "text" },
    { content: "Finger", type: "text" }, { content: "But", type: "text" },
    { content: "Hole", type: "text" }, { content: "Edge", type: "text" },
  ];
  const COOP_NEON_COLORS = ["#FF6B6B", "#00E676", "#FF9100", "#E040FB", "#FFEA00", "#00E5FF", "#FF4081", "#76FF03"];
  const COOP_MY_COLOR = "#54A0FF";

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
  // mosaic save now uses Liquid Glass menu ("mosaic-save" in radialMenuStack)
  const [creatorConfirmAction, setCreatorConfirmAction] = useState(null); // null | { type: "clear" | "leave", action?: () => void }
  const creatorUndoStack = useRef([]); // past grid states for undo
  const creatorRedoStack = useRef([]); // future grid states for redo
  const [creatorCanUndo, setCreatorCanUndo] = useState(false);
  const [creatorCanRedo, setCreatorCanRedo] = useState(false);
  const creatorColorScrollRef = useRef(null); // color picker carousel scroll container
  const creatorColorDragRef = useRef({ active: false, startX: 0, scrollStart: 0, moved: false, lastX: 0, lastT: 0, velX: 0, rafId: 0 });
  const [friendsList, setFriendsList] = useState([]); // array of { uid, username, profilePicture }
  const [addFriendInput, setAddFriendInput] = useState("");
  const [addFriendMsg, setAddFriendMsg] = useState("");
  const [addFriendLoading, setAddFriendLoading] = useState(false);

  // --- Friends Modal & Comparison state ---
  const [friendsModalTab, setFriendsModalTab] = useState("list"); // "list" | "compare"
  const [compareFriend, setCompareFriend] = useState(null); // friend object being compared
  const [compareFriendStats, setCompareFriendStats] = useState(null); // loaded public stats for comparison
  const [compareFriendLoading, setCompareFriendLoading] = useState(false);
  const [friendsPuzzleData, setFriendsPuzzleData] = useState({}); // { uid: { attempts, time } } for current puzzle
  const [friendsPuzzleLoading, setFriendsPuzzleLoading] = useState(false);
  const [puzzleRanking, setPuzzleRanking] = useState(null); // { rank, total } for current puzzle
  const [puzzleRankingLoading, setPuzzleRankingLoading] = useState(false);

  // --- Friend Activity / Presence state ---
  const [friendPresence, setFriendPresence] = useState({}); // { uid: { online, lastSeen, currentMode, currentPuzzle, lastSolvedMode, lastSolvedPuzzle, lastSolvedAt } }
  const [friendPresenceLoading, setFriendPresenceLoading] = useState(false);
  const presenceIntervalRef = useRef(null);
  const [friendStats, setFriendStats] = useState({}); // { uid: { totalSolved, achievements, progress, updatedAt } }
  const [friendStatsLoading, setFriendStatsLoading] = useState(false);

  // --- Confirmation for friend removal (stores uid of friend being removed) ---
  const [removeFriendConfirm, setRemoveFriendConfirm] = useState(null); // uid or null

  // --- Friend Reactions state ---
  const [friendReactionPickerOpen, setFriendReactionPickerOpen] = useState(false); // show friend reaction panel in Liquid Glass pill
  const [friendReactionSelectedFriends, setFriendReactionSelectedFriends] = useState(new Set()); // multi-select: Set of friend uids to send reactions to
  const [friendFloatingReactions, setFriendFloatingReactions] = useState([]); // floating reaction animations: [{ id, emoji, fromName, fromColor, x, type }]
  const friendSeenReactionsRef = useRef(new Set()); // track already-seen friend reaction keys

  // --- Admin Metrics state ---
  const [adminMetrics, setAdminMetrics] = useState(null); // computed metrics object
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false);
  const [adminMetricsTab, setAdminMetricsTab] = useState("overview"); // "overview" | "difficulty" | "engagement"

  // --- Admin User Activity state ---
  const [adminUserActivity, setAdminUserActivity] = useState([]); // array of user activity objects
  const [adminUserActivityLoading, setAdminUserActivityLoading] = useState(false);
  const [adminUserActivitySearch, setAdminUserActivitySearch] = useState("");
  const [adminUserActivitySort, setAdminUserActivitySort] = useState("lastSeen"); // "lastSeen" | "totalSolved" | "username"

  // --- Notifications & Active Sessions state ---
  const [notifications, setNotifications] = useState([]); // array of notification objects
  const [showNotifications, setShowNotifications] = useState(false); // notification panel visible
  const notifUnsubRef = useRef(null); // unsubscribe function for notification listener
  const [activeCoopSessions, setActiveCoopSessions] = useState([]); // user's active coop sessions
  const [activeSessionsLoading, setActiveSessionsLoading] = useState(false);
  const [showCoopFriendPicker, setShowCoopFriendPicker] = useState(false); // friend picker for coop
  const [coopSelectedFriends, setCoopSelectedFriends] = useState(new Set()); // multi-select friends for coop invites
  const [coopInviteUsernameInput, setCoopInviteUsernameInput] = useState(""); // username input for inviting non-friends in coop
  const [coopInviteUsernameMsg, setCoopInviteUsernameMsg] = useState(""); // feedback message for coop username invite
  const [coopInviteUsernameLoading, setCoopInviteUsernameLoading] = useState(false); // loading state for coop username invite
  const [coopPartnerLockToast, setCoopPartnerLockToast] = useState(null); // toast when partner locks in
  const coopPartnerLockToastTimer = useRef(null);
  const prevCoopPartnerLockedRef = useRef(false); // track partner lock state changes
  const coopGuestJoinedRef = useRef(false); // tracks whether guest has actually joined (prevents false kick detection)
  const coopJoiningRef = useRef(false); // true while guest join is in-flight (prevents subscription from overriding status)
  const [coopCompletedBreakdown, setCoopCompletedBreakdown] = useState(null); // session object to show completed breakdown modal

  // --- Local mosaic navigate modal ---
  const [showCoopMosaicNavigate, setShowCoopMosaicNavigate] = useState(false);

  // --- Global co-op invite toast (shown on any view) ---
  const [coopInviteToast, setCoopInviteToast] = useState(null); // notification object for the toast
  const coopInviteToastTimer = useRef(null);
  const seenNotifIdsRef = useRef(new Set()); // track previously seen notification IDs
  const notifInitialLoadRef = useRef(true); // skip toasting on initial load

  // --- Coop Mosaic state (n-player) ---
  const [coopMosaicSessionId, setCoopMosaicSessionId] = useState(null);
  const [coopMosaicRole, setCoopMosaicRole] = useState(null); // "host" | "guest"
  const [coopMosaicStatus, setCoopMosaicStatus] = useState(null); // "waiting" | "playing" | "complete"
  const [coopMosaicPlayers, setCoopMosaicPlayers] = useState({}); // { uid: { username, currentTile } } — all OTHER players
  const [coopMosaicPlayerPics, setCoopMosaicPlayerPics] = useState({}); // { uid: base64 dataURL | null } — profile pics for coop players
  const [coopMosaicSharedProgress, setCoopMosaicSharedProgress] = useState({}); // { tileIdx: attempts } synced from Firebase
  const [coopMosaicSharedTileTimes, setCoopMosaicSharedTileTimes] = useState({}); // { tileIdx: seconds }
  const [coopMosaicOtherFills, setCoopMosaicOtherFills] = useState({}); // merged fills from all other players for current tile { "r-c": token }
  const prevCoopMosaicOtherFillsRef = useRef({}); // previous mosaic fills for animation diffing
  const [showCoopMosaicInvite, setShowCoopMosaicInvite] = useState(false);
  const coopMosaicUnsubRef = useRef(null);
  const coopMosaicWriteThrottleRef = useRef({});
  const coopMosaicCurrentTileRef = useRef(null); // tracks which tile index the local player is in (-1 for overview)
  const coopMosaicJoinedRef = useRef(false); // tracks whether we've actually joined (prevents false kick detection)
  const coopMosaicJoiningRef = useRef(false); // true while mosaic guest join is in-flight
  const coopMosaicPrevSolvedRef = useRef(new Set()); // tracks tiles already seen as solved to detect partner completions
  const coopMosaicSeenReactionsRef = useRef(new Set()); // tracks reaction keys already displayed
  const coopMosaicCreatingRef = useRef(false); // true while createCoopMosaicSession is in-flight (guards subscription + tile solve)
  const isCoopMosaic = !!coopMosaicSessionId;
  const [coopMosaicInvitedUids, setCoopMosaicInvitedUids] = useState(new Set()); // UIDs invited to coop mosaic session
  // Derived: number of other connected players (currentTile != null means connected)
  const coopMosaicOtherPlayerCount = Object.keys(coopMosaicPlayers).length;
  const coopMosaicAnyConnected = coopMosaicOtherPlayerCount > 0;

  // --- Vault Mode state ---
  const [vaultSessionId, setVaultSessionId] = useState(null);
  const [vaultRole, setVaultRole] = useState(null); // "host" | "guest"
  const [vaultSolvingTile, setVaultSolvingTile] = useState(null); // tile index being solved
  const [vaultChatLastRead, setVaultChatLastRead] = useState(0); // timestamp for unread tracking
  const vaultPuzzlesRef = useRef(null); // generated vault puzzles cache
  const vaultSessionDataRef = useRef(null); // latest session data for chat access
  const [vaultInvitedUids, setVaultInvitedUids] = useState(new Set()); // UIDs invited to vault session
  const isVault = !!vaultSessionId;

  // --- Staff Pick & Admin Manage state ---
  const [staffPickMosaic, setStaffPickMosaic] = useState(null); // the staff pick mosaic object
  const staffPickPuzzlesRef = useRef(null); // puzzles built from staff pick grid
  // Mosaic preview now renders inside the Liquid Glass menu via "mosaic-preview" sub-menu
  const customMosaicReturnViewRef = useRef("gallery"); // where to go when leaving custom-mosaic view

  // Listen for auth state changes
  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsub = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
      setFirebaseAuthReady(true);
    });
    return unsub;
  }, [firebaseConfigured]);

  // Check admin status and save email for lookup when user logs in
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) { setIsAdmin(false); return; }
    checkIsAdmin(firebaseUser.uid).then((admin) => {
      setIsAdmin(admin);
      if (admin) registerAdminIndex(firebaseUser.uid).catch(() => {});
    }).catch(() => setIsAdmin(false));
    if (firebaseUser.email) {
      saveUserEmail(firebaseUser.uid, firebaseUser.email).catch(() => {});
    }
  }, [firebaseUser, firebaseConfigured]);

  // Presence heartbeat: update online status every 60s while logged in
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) {
      if (presenceIntervalRef.current) { clearInterval(presenceIntervalRef.current); presenceIntervalRef.current = null; }
      return;
    }
    const sendHeartbeat = () => {
      updatePresence(firebaseUser.uid, { online: true, status: "active" }).catch(() => {});
    };
    sendHeartbeat();
    presenceIntervalRef.current = setInterval(sendHeartbeat, 60000);
    return () => {
      if (presenceIntervalRef.current) { clearInterval(presenceIntervalRef.current); presenceIntervalRef.current = null; }
    };
  }, [firebaseUser, firebaseConfigured]);

  // Update presence status when view changes (menu = idle, play = playing)
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) return;
    if (view === "menu" || view === "gallery" || view === "creator" || view === "profile" || view === "coop") {
      updatePresence(firebaseUser.uid, { online: true, status: "idle", currentMode: null, currentPuzzle: null, currentCoopSessionId: null }).catch(() => {});
    }
  }, [view, firebaseUser, firebaseConfigured]);

  // Real-time friends list subscription
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) return;
    const unsub = subscribeToFriends(firebaseUser.uid, (friends) => {
      setFriendsList(friends);
    });
    return unsub;
  }, [firebaseUser, firebaseConfigured]);

  // Real-time friend presence subscriptions: subscribe to each friend's presence
  const friendPresenceUnsubsRef = useRef([]);
  useEffect(() => {
    // Clean up previous subscriptions
    friendPresenceUnsubsRef.current.forEach(unsub => unsub());
    friendPresenceUnsubsRef.current = [];
    if (!firebaseUser || !firebaseConfigured || friendsList.length === 0) return;
    const unsubs = friendsList.map(friend =>
      subscribeToFriendPresence(friend.uid, (presence) => {
        setFriendPresence(prev => ({ ...prev, [friend.uid]: presence }));
      })
    );
    friendPresenceUnsubsRef.current = unsubs;
    return () => {
      unsubs.forEach(unsub => unsub());
      friendPresenceUnsubsRef.current = [];
    };
  }, [firebaseUser, firebaseConfigured, friendsList]);

  // Fetch public stats for all friends
  useEffect(() => {
    if (!firebaseConfigured || friendsList.length === 0) return;
    setFriendStatsLoading(true);
    const fetchStats = async () => {
      const stats = {};
      await Promise.all(
        friendsList.map(async (friend) => {
          try {
            const publicStats = await loadPublicStats(friend.uid);
            if (publicStats) {
              stats[friend.uid] = {
                totalSolved: publicStats.totalSolved || 0,
                achievements: publicStats.achievements || 0,
                progress: publicStats.progress || {},
                updatedAt: publicStats.updatedAt || 0,
              };
            }
          } catch (e) {
            console.error(`Failed to load stats for ${friend.uid}:`, e);
          }
        })
      );
      setFriendStats(stats);
      setFriendStatsLoading(false);
    };
    fetchStats();
  }, [firebaseConfigured, friendsList]);

  // Compute online friends count from real-time presence data
  const onlineFriendsCount = useMemo(() => {
    if (friendsList.length === 0) return 0;
    return friendsList.filter(f => {
      const p = friendPresence[f.uid];
      return p && p.lastSeen && (Date.now() - p.lastSeen) < 120000;
    }).length;
  }, [friendsList, friendPresence]);

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
        setRadialMenuStack(["root", "profile", "username-edit"]);
        setProfilePicture(profile?.profilePicture || null);
      }
    }).catch(() => {
      setRadialMenuStack(["root", "profile", "username-edit"]);
    });
  }, [firebaseUser, firebaseConfigured]);

  // Subscribe to real-time notifications when user is signed in
  useEffect(() => {
    if (notifUnsubRef.current) {
      notifUnsubRef.current();
      notifUnsubRef.current = null;
    }
    if (!firebaseUser || !firebaseConfigured) {
      setNotifications([]);
      return;
    }
    notifInitialLoadRef.current = true;
    seenNotifIdsRef.current = new Set();
    const unsub = subscribeToNotifications(firebaseUser.uid, (notifs) => {
      setNotifications(notifs);
      // Detect new co-op invite notifications and show a toast
      const currentIds = new Set(notifs.map(n => n.id));
      if (notifInitialLoadRef.current) {
        // First load: just record existing IDs, don't toast
        seenNotifIdsRef.current = currentIds;
        notifInitialLoadRef.current = false;
      } else {
        // Find new co-op invites that weren't in the previous set
        for (const notif of notifs) {
          if ((notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") && !seenNotifIdsRef.current.has(notif.id)) {
            // Show toast for this new co-op invite
            setCoopInviteToast(notif);
            if (coopInviteToastTimer.current) clearTimeout(coopInviteToastTimer.current);
            coopInviteToastTimer.current = setTimeout(() => {
              setCoopInviteToast(null);
              coopInviteToastTimer.current = null;
            }, 15000);
            break; // Only show one toast at a time
          }
        }
        seenNotifIdsRef.current = currentIds;
      }
    });
    notifUnsubRef.current = unsub;
    return () => {
      unsub();
      notifUnsubRef.current = null;
    };
  }, [firebaseUser, firebaseConfigured]);

  // Subscribe to incoming friend reactions in real-time
  useEffect(() => {
    if (!firebaseUser || !firebaseConfigured) return;
    friendSeenReactionsRef.current = new Set();
    let initialLoad = true;
    const unsub = subscribeToFriendReactions(firebaseUser.uid, (reactions) => {
      const keys = Object.keys(reactions);
      if (initialLoad) {
        friendSeenReactionsRef.current = new Set(keys);
        initialLoad = false;
        return;
      }
      for (const key of keys) {
        if (!friendSeenReactionsRef.current.has(key)) {
          const r = reactions[key];
          if (r.fromUid !== firebaseUser.uid) {
            const id = Date.now() + Math.random();
            const x = 10 + Math.random() * 80;
            const color = COOP_NEON_COLORS[Math.abs(r.fromUid.charCodeAt(0)) % COOP_NEON_COLORS.length];
            setFriendFloatingReactions(prev => [...prev, { id, emoji: r.emoji, fromName: r.fromUsername || "Friend", fromColor: color, x, type: r.type || "emoji" }]);
            setTimeout(() => {
              setFriendFloatingReactions(prev => prev.filter(fr => fr.id !== id));
            }, 3500);
          }
        }
      }
      friendSeenReactionsRef.current = new Set(keys);
    });
    return () => unsub();
  }, [firebaseUser, firebaseConfigured]);

  // Load active coop sessions (one-shot, used by callbacks)
  const loadActiveCoopSessions = useCallback(async () => {
    if (!firebaseUser || !firebaseConfigured) {
      setActiveCoopSessions([]);
      return;
    }
    setActiveSessionsLoading(true);
    try {
      const sessions = await loadUserCoopSessions(firebaseUser.uid);
      setActiveCoopSessions(sessions.filter(s => s.status !== "closed"));
    } catch {
      // Don't clear sessions on error — preserve any optimistically-added sessions
    } finally {
      setActiveSessionsLoading(false);
    }
  }, [firebaseUser, firebaseConfigured]);

  // Subscribe to user's coop session index for real-time updates
  const coopSessionIndexUnsubRef = useRef(null);
  useEffect(() => {
    if (coopSessionIndexUnsubRef.current) {
      coopSessionIndexUnsubRef.current();
      coopSessionIndexUnsubRef.current = null;
    }
    if (!firebaseUser || !firebaseConfigured) {
      setActiveCoopSessions([]);
      return;
    }
    const unsub = subscribeToUserCoopSessionIndex(firebaseUser.uid, (sessions) => {
      setActiveCoopSessions(sessions.filter(s => s.status !== "closed"));
      setActiveSessionsLoading(false);
    });
    coopSessionIndexUnsubRef.current = unsub;
    return () => {
      unsub();
      coopSessionIndexUnsubRef.current = null;
    };
  }, [firebaseUser, firebaseConfigured]);

  // --- Mosaic Creator helpers ---
  const resetCreator = useCallback(() => {
    setCreatorGrid(Array.from({ length: 25 }, () => Array(25).fill(null)));
    setCreatorTitle("");
    setCreatorEditingId(null);
    setCreatorTool("draw");
    creatorUndoStack.current = [];
    creatorRedoStack.current = [];
    setCreatorCanUndo(false);
    setCreatorCanRedo(false);
  }, []);

  // Push a snapshot onto the undo stack before a grid mutation
  const creatorPushUndo = useCallback((gridSnapshot) => {
    creatorUndoStack.current = [...creatorUndoStack.current.slice(-49), gridSnapshot];
    creatorRedoStack.current = [];
    setCreatorCanUndo(true);
    setCreatorCanRedo(false);
  }, []);

  const creatorUndo = useCallback(() => {
    if (creatorUndoStack.current.length === 0) return;
    setCreatorGrid(prev => {
      creatorRedoStack.current = [...creatorRedoStack.current, prev];
      setCreatorCanRedo(true);
      const undone = creatorUndoStack.current[creatorUndoStack.current.length - 1];
      creatorUndoStack.current = creatorUndoStack.current.slice(0, -1);
      setCreatorCanUndo(creatorUndoStack.current.length > 0);
      return undone;
    });
  }, []);

  const creatorRedo = useCallback(() => {
    if (creatorRedoStack.current.length === 0) return;
    setCreatorGrid(prev => {
      creatorUndoStack.current = [...creatorUndoStack.current, prev];
      setCreatorCanUndo(true);
      const redone = creatorRedoStack.current[creatorRedoStack.current.length - 1];
      creatorRedoStack.current = creatorRedoStack.current.slice(0, -1);
      setCreatorCanRedo(creatorRedoStack.current.length > 0);
      return redone;
    });
  }, []);

  // Color picker carousel — momentum drag (mirrors TokenPicker)
  useEffect(() => {
    const el = creatorColorScrollRef.current;
    if (!el) return;
    const d = creatorColorDragRef.current;
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
      let v = d.velX * 16;
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
      setCreatorGrid(g => { creatorPushUndo(g); return creatorFloodFill(g, cell.r, cell.c, creatorColorRef.current); });
      return;
    }
    creatorPaintingRef.current = true;
    setCreatorGrid(g => {
      creatorPushUndo(g);
      const next = g.map(row => [...row]);
      next[cell.r][cell.c] = next[cell.r][cell.c] === creatorColorRef.current ? null : creatorColorRef.current;
      return next;
    });
  }, [getCellFromPointer, creatorFloodFill, creatorPushUndo]);

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
    // If a coop mosaic session is active, leave it before starting solo play.
    // Without this, isCoopMosaic stays true and solo completions bleed into
    // the coop Firebase session instead of persisting to local storage.
    if (coopMosaicSessionId) {
      if (firebaseUser) {
        updateCoopMosaicCurrentTile(coopMosaicSessionId, firebaseUser.uid, null).catch(() => {});
      }
      if (coopMosaicUnsubRef.current) {
        coopMosaicUnsubRef.current();
        coopMosaicUnsubRef.current = null;
      }
      clearCoopUrlParam("coopMosaic");
      setCoopMosaicSessionId(null);
      setCoopMosaicRole(null);
      setCoopMosaicStatus(null);
      setCoopMosaicPlayers({});
      setCoopMosaicSharedProgress({});
      setCoopMosaicSharedTileTimes({});
      setCoopMosaicOtherFills({});
      setShowCoopMosaicInvite(false);
      coopMosaicWriteThrottleRef.current = {};
      coopMosaicCurrentTileRef.current = null;
      coopMosaicJoinedRef.current = false;
      coopMosaicJoiningRef.current = false;
      coopMosaicPrevSolvedRef.current = new Set();
      coopMosaicSeenReactionsRef.current = new Set();
      coopMosaicCreatingRef.current = false;
    }
    const puzzles = buildCustomMosaicPuzzles(mosaic.grid);
    customMosaicPuzzlesRef.current = puzzles;
    setCustomMosaicPlay(mosaic);
    // Restore saved progress for this mosaic if available
    const saved = mosaic.id ? (progress.mosaicCompletions || {})[mosaic.id] : null;
    setCustomMosaicProgress(saved && typeof saved === "object" ? { ...saved } : {});
    setDifficulty("mosaic");
    setView("custom-mosaic");
  }, [buildCustomMosaicPuzzles, progress.mosaicCompletions, coopMosaicSessionId, firebaseUser]);

  // Pre-save validation — opens the naming drawer if valid
  const handleSaveClick = useCallback(() => {
    if (!firebaseUser) { setMosaicMsg("Sign in to save mosaics"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    const allFilled = creatorGrid.every(row => row.every(c => c !== null));
    if (!allFilled) { setMosaicMsg("Fill in all cells before saving!"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    // Pre-fill title for edits
    if (creatorEditingId && !creatorTitle.trim()) setCreatorTitle("");
    setRadialMenuStack(["root", "mosaic-save"]);
  }, [firebaseUser, creatorGrid, creatorEditingId, creatorTitle]);

  const handleSaveMosaic = useCallback(async (titleFromDrawer) => {
    const title = (titleFromDrawer || "").trim();
    if (!firebaseUser) { setMosaicMsg("Sign in to save mosaics"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    if (!title) { setMosaicMsg("Give your mosaic a name first!"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    const allFilled = creatorGrid.every(row => row.every(c => c !== null));
    if (!allFilled) { setMosaicMsg("Fill in all cells before saving!"); setTimeout(() => setMosaicMsg(""), 2500); return; }
    setMosaicLoading(true);
    setRadialMenuStack([]);
    try {
      const mosaicData = {
        title,
        grid: creatorGrid,
        gridSize: 25,
        authorUsername: username || "",
      };
      let savedId = creatorEditingId;
      if (creatorEditingId) {
        await updateMosaicDesign(firebaseUser.uid, creatorEditingId, mosaicData);
      } else {
        savedId = await saveMosaicDesign(firebaseUser.uid, mosaicData);
        setCreatorEditingId(savedId);
      }
      setCreatorTitle(title);
      // Show post-save panel asking if user wants to publish
      setMosaicLoading(false);
      setRadialMenuStack(["root", "creator-post-save"]);
      return;
    } catch (e) {
      console.error("Save mosaic failed:", e);
      const isPermErr = e?.message?.includes("PERMISSION_DENIED");
      setMosaicMsg(isPermErr ? "Save failed — database rules need to be deployed (see database.rules.json)" : "Save failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 4000);
    }
  }, [firebaseUser, creatorGrid, creatorEditingId]);

  const handleDeleteMosaic = useCallback(async (mosaicId) => {
    if (!firebaseUser) return;
    setMosaicLoading(true);
    try {
      await deleteMosaicDesign(firebaseUser.uid, mosaicId);
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
      setMosaicMsg("Submitted for review!");
      // Notify all admins about the new pending mosaic
      loadAdminUids().then((adminUids) => {
        for (const adminUid of adminUids) {
          if (adminUid === firebaseUser.uid) continue; // don't notify yourself
          sendNotification(adminUid, {
            type: "mosaic_pending_review",
            fromUid: firebaseUser.uid,
            fromUsername: username || firebaseUser.email,
            data: { mosaicId: mosaic.id, title: mosaic.title || "Untitled" },
          }).catch(() => {});
        }
      }).catch(() => {});
    } catch (e) {
      console.error("Submit failed:", e);
      const isPermErr = e?.message?.includes("PERMISSION_DENIED");
      setMosaicMsg(isPermErr ? "Submit failed — database rules need to be deployed (see database.rules.json)" : "Submit failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 4000);
    }
  }, [firebaseUser, username]);

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
      // Send notification to recipient
      sendNotification(target.uid, {
        type: "mosaic_shared",
        fromUid: firebaseUser.uid,
        fromUsername: username || firebaseUser.email,
        data: { mosaicId: mosaic.id, title: mosaic.title || "Untitled" },
      }).catch(() => {});
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

  // Invite a user by username in the coop start menu (looks up user, adds to selected friends for invite)
  const handleCoopInviteByUsername = useCallback(async () => {
    if (!firebaseUser || !coopInviteUsernameInput.trim()) return;
    setCoopInviteUsernameLoading(true);
    setCoopInviteUsernameMsg("");
    try {
      const target = await lookupUserByUsername(coopInviteUsernameInput.trim());
      if (!target) { setCoopInviteUsernameMsg("User not found"); return; }
      if (target.uid === firebaseUser.uid) { setCoopInviteUsernameMsg("Can't invite yourself"); return; }
      if (coopSelectedFriends.has(target.uid)) { setCoopInviteUsernameMsg("Already selected"); return; }
      setCoopSelectedFriends(prev => { const next = new Set(prev); next.add(target.uid); return next; });
      setCoopInviteUsernameInput("");
      setCoopInviteUsernameMsg(`${target.username} added!`);
    } catch (e) {
      console.error("Coop invite by username failed:", e);
      setCoopInviteUsernameMsg("Failed to look up user");
    } finally {
      setCoopInviteUsernameLoading(false);
      setTimeout(() => setCoopInviteUsernameMsg(""), 3000);
    }
  }, [firebaseUser, coopInviteUsernameInput, coopSelectedFriends]);

  const handleRemoveFriend = useCallback(async (friendUid) => {
    if (!firebaseUser) return;
    try {
      await removeFriend(firebaseUser.uid, friendUid);
      setRemoveFriendConfirm(null); // Close confirmation modal
    } catch (e) {
      console.error("Remove friend failed:", e);
    }
  }, [firebaseUser]);

  const handleApproveMosaic = useCallback(async (mosaic) => {
    setMosaicLoading(true);
    try {
      await approveMosaic(mosaic.id, mosaic);
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
      setMosaicMsg("Rejected");
    } catch (e) {
      console.error("Reject failed:", e);
      setMosaicMsg("Reject failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, []);

  const handleUnpublishMosaic = useCallback(async (mosaic) => {
    setMosaicLoading(true);
    try {
      await unpublishMosaic(mosaic.id, mosaic);
      setMosaicMsg("Unpublished");
    } catch (e) {
      console.error("Unpublish failed:", e);
      setMosaicMsg("Unpublish failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, [staffPickMosaic]);

  const handleSetStaffPick = useCallback(async (mosaic) => {
    setMosaicLoading(true);
    try {
      await setStaffPick(mosaic.id);
      setMosaicMsg("Staff pick set!");
    } catch (e) {
      console.error("Set staff pick failed:", e);
      setMosaicMsg("Set staff pick failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, [buildCustomMosaicPuzzles]);

  const handleClearStaffPick = useCallback(async () => {
    setMosaicLoading(true);
    try {
      await clearStaffPick();
      setMosaicMsg("Staff pick cleared");
    } catch (e) {
      console.error("Clear staff pick failed:", e);
      setMosaicMsg("Clear staff pick failed");
    } finally {
      setMosaicLoading(false);
      setTimeout(() => setMosaicMsg(""), 2500);
    }
  }, []);

  const handleMovePublicMosaic = useCallback(async (mosaicId, direction) => {
    const idx = publicMosaicsList.findIndex(m => m.id === mosaicId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= publicMosaicsList.length) return;
    setMosaicLoading(true);
    try {
      // Swap displayOrder values
      const orderA = publicMosaicsList[idx].displayOrder ?? idx;
      const orderB = publicMosaicsList[swapIdx].displayOrder ?? swapIdx;
      await Promise.all([
        updatePublicMosaicFields(publicMosaicsList[idx].id, { displayOrder: orderB }),
        updatePublicMosaicFields(publicMosaicsList[swapIdx].id, { displayOrder: orderA }),
      ]);
    } catch (e) {
      console.error("Reorder failed:", e);
      setMosaicMsg("Reorder failed");
      setTimeout(() => setMosaicMsg(""), 2500);
    } finally {
      setMosaicLoading(false);
    }
  }, [publicMosaicsList]);

  // Data is kept fresh via real-time subscriptions — no manual load needed
  const loadMosaicData = useCallback(async () => {}, []);

  const editMosaic = useCallback((mosaic) => {
    setCreatorGrid(mosaic.grid || Array.from({ length: 25 }, () => Array(25).fill(null)));
    setCreatorTitle(mosaic.title || "");
    setCreatorEditingId(mosaic.id);
    setCreatorReturnView("gallery");
    setView("creator");
  }, []);

  // Real-time mosaic subscriptions
  useEffect(() => {
    const unsub = subscribeToPublicMosaics(setPublicMosaicsList);
    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubUser = subscribeToUserMosaics(firebaseUser.uid, setMyMosaics);
    const unsubShared = subscribeToSharedMosaics(firebaseUser.uid, setSharedMosaics);
    return () => { unsubUser(); unsubShared(); };
  }, [firebaseUser]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToPendingMosaics(setPendingMosaicsList);
    return unsub;
  }, [isAdmin]);

  useEffect(() => {
    const unsub = subscribeToStaffPick((sp) => {
      setStaffPickMosaic(sp);
      if (sp && sp.grid) {
        staffPickPuzzlesRef.current = buildCustomMosaicPuzzles(sp.grid);
      } else {
        staffPickPuzzlesRef.current = null;
      }
    });
    return unsub;
  }, [buildCustomMosaicPuzzles]);

  // Helper: render a mosaic grid thumbnail (using canvas-like div grid)
  // When hidden=true, renders an obscured placeholder instead of the actual image
  // When completedTiles is provided (object { tileIndex: attempts }), only reveal
  // cells from completed tiles (attempts > 0); uncompleted areas are dimmed.
  const MosaicThumbnail = useCallback(({ grid, size = 80, hidden = false, completedTiles = null }) => {
    const gs = grid?.length || 25;
    const cellSz = size / gs;
    if (hidden && !completedTiles) {
      return (
        <div style={{
          width: size, height: size, borderRadius: 6, overflow: "hidden", flexShrink: 0,
          border: `1px solid ${C.border}`, position: "relative",
          backgroundColor: C.surface,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: Math.max(size * 0.35, 16), fontWeight: 700,
            color: C.textDim, fontFamily: "'Inter', sans-serif",
            opacity: 0.5, userSelect: "none",
          }}>?</div>
        </div>
      );
    }
    return (
      <div style={{ width: size, height: size, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}`, position: "relative" }}>
        <canvas ref={el => {
          if (!el || !grid) return;
          const ctx = el.getContext("2d");
          el.width = size;
          el.height = size;
          const tileSize = gs === 25 ? 5 : gs; // 25x25 grids have 5x5 tiles
          const hasPartial = completedTiles && typeof completedTiles === "object";
          const dimColor = "#14141f";
          for (let r = 0; r < gs; r++) {
            for (let c = 0; c < (grid[r]?.length || 0); c++) {
              if (hasPartial && gs === 25) {
                const tileRow = Math.floor(r / tileSize);
                const tileCol = Math.floor(c / tileSize);
                const tileIdx = tileRow * 5 + tileCol;
                const tileSolved = (completedTiles[tileIdx] || 0) > 0;
                ctx.fillStyle = tileSolved ? (grid[r][c] || dimColor) : dimColor;
              } else {
                ctx.fillStyle = grid[r][c] || dimColor;
              }
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
      mosaicCompletions: progress.mosaicCompletions || {},
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
      mosaicCompletionTimes: times.mosaicCompletionTimes || {},
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
      // Also update public stats summary for friend comparisons
      const summary = summariseGameData(data);
      const publicStats = {
        progress: summary.modes,
        totalSolved: summary.totalSolved,
        achievements: summary.achievements,
        times: data.times || {},
      };
      if (username) {
        publicStats.username = username;
      }
      savePublicStats(uid, publicStats).catch(() => {});
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 2000);
    } catch (e) {
      console.error("Cloud sync failed:", e);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(""), 3000);
    } finally {
      cloudSyncInFlight.current = false;
    }
  }, [username]);

  // Handle sign up: create account, merge local->cloud, push to cloud, then prompt username
  const handleSignUp = useCallback(async (email, password) => {
    setAccountLoading(true);
    setAccountError("");
    try {
      const user = await signUpWithEmail(email, password);
      // New account: push all local data to cloud
      const localData = gatherLocalData();
      await saveCloudData(user.uid, localData);
      setRadialMenuStack([]);
      setAccountEmail("");
      setAccountPassword("");
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus(""), 2000);
      // New account has no username yet — show the mandatory modal
      setRadialMenuStack(["root", "profile", "username-edit"]);
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
      setRadialMenuStack(["root", "sync-choice"]);
      setRadialMenuStack([]);
      setAccountEmail("");
      setAccountPassword("");
      return;
    }

    // Only one side has data (or neither): use the merge path which handles it correctly
    const merged = mergeGameData(localData, cloudData);
    applyMergedData(merged);
    await saveCloudData(uid, merged);
    setRadialMenuStack([]);
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
    setRadialMenuStack([]);
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
      setRadialMenuStack([]);
      setRadialMenuStack([]);
      setSyncStatus("");
      setUsername(null);
      setProfilePicture(null);
      hasCheckedUsername.current = false;
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  }, []);

  // Handle account deletion (App Store requirement: users must be able to delete their account)
  const handleDeleteAccount = useCallback(async () => {
    if (!firebaseUser) return;
    setDeleteAccountLoading(true);
    setDeleteAccountError("");
    try {
      // Re-authenticate first (required by Firebase for account deletion)
      const providerIds = firebaseUser.providerData.map(p => p.providerId);
      const isPasswordUser = providerIds.includes("password");
      if (isPasswordUser && !deleteAccountPassword) {
        setDeleteAccountError("Please enter your password to confirm.");
        setDeleteAccountLoading(false);
        return;
      }
      await reauthenticateUser(isPasswordUser ? deleteAccountPassword : null);
      // Delete account and all data
      await deleteAccount(firebaseUser.uid);
      // Clear local data
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMES_KEY);
        localStorage.removeItem(BIRTHDAY_KEY);
        localStorage.removeItem(THEME_KEY);
        localStorage.removeItem(ACHIEV_KEY);
      } catch { /* ignore */ }
      setProgress({ easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, mosaic: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined });
      setTimes({ easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {} });
      setSavedAchievementIds(new Set());
      setBirthday(null);
      setActiveThemeId("classic");
      setRadialMenuStack([]);
      setRadialMenuStack([]);
      setRadialMenuStack([]);
      setShowGameMenu(false);
      setSyncStatus("");
      setUsername(null);
      setProfilePicture(null);
      hasCheckedUsername.current = false;
      setDeleteAccountPassword("");
      setView("menu");
    } catch (e) {
      console.error("Account deletion failed:", e);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setDeleteAccountError("Incorrect password. Please try again.");
      } else if (e.code === "auth/too-many-requests") {
        setDeleteAccountError("Too many attempts. Please try again later.");
      } else if (e.code === "auth/requires-recent-login") {
        setDeleteAccountError("Please sign out and sign back in, then try again.");
      } else {
        setDeleteAccountError("Failed to delete account. Please try again.");
      }
    } finally {
      setDeleteAccountLoading(false);
    }
  }, [firebaseUser, deleteAccountPassword]);

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
      // Also update publicStats so admin view reflects the username immediately
      savePublicStats(firebaseUser.uid, { username: trimmed }).catch(() => {});
      setUsername(trimmed);
      setRadialMenuStack([]);
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

  // Get max birthday date (today)
  const getMaxBirthdayDate = () => {
    const n = new Date();
    return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,"0")}-${String(n.getUTCDate()).padStart(2,"0")}`;
  };

  // Handle saving birthday
  const handleSaveBirthday = useCallback((dateStr) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split("-").map(Number);
    const bdStr = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
    setBirthday(bdStr);
    try { localStorage.setItem(BIRTHDAY_KEY, bdStr); } catch { /* ignore */ }
    if (bdStr === CHEAT_BIRTHDAY) {
      const saved = loadSavedAchievements();
      if (!saved.has("cheat_turing")) {
        achievementQueueRef.current.push({ id: "cheat_turing", label: "Welcome Back, Alan", desc: "The enigma has been decoded", tier: 3 });
        if (!achievementToastTimer.current) advanceAchievementQueue();
        saved.add("cheat_turing");
        saveSavedAchievements(saved);
        setSavedAchievementIds(new Set(saved));
        const enigmaTheme = PUZZLE_THEMES.find(t => t.id === "enigma");
        if (enigmaTheme) { setTimeout(() => showThemeToast(enigmaTheme), 3800); }
      }
    }
    setRadialMenuStack([]);
    setCalendarYear(y);
    setCalendarMonth(m - 1);
  }, []);

  // Handle removing birthday
  const handleRemoveBirthday = useCallback(() => {
    setBirthday(null);
    try { localStorage.removeItem(BIRTHDAY_KEY); } catch { /* ignore */ }
    setRadialMenuStack([]);
  }, []);

  // Handle clear all data
  const handleClearData = useCallback(async () => {
    try {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(TIMES_KEY);
      localStorage.removeItem(BIRTHDAY_KEY);
      localStorage.removeItem(THEME_KEY);
      localStorage.removeItem(ACHIEV_KEY);
    } catch { /* ignore */ }
    if (firebaseUser) { try { await logOut(); } catch { /* ignore */ } }
    setProgress({ easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {}, spin: {}, mosaic: {}, cascadeRunState: {}, cascadeRunStateLastIndex: undefined });
    setTimes({ easy: {}, medium: {}, hard: {}, blind: {}, daily: {}, cascade: {} });
    setSavedAchievementIds(new Set());
    setBirthday(null);
    setActiveThemeId("classic");
    setRadialMenuStack([]);
    setShowGameMenu(false);
    setView("menu");
  }, [firebaseUser]);

  // Show a toast hint that login is available via the menu button
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
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(140);
  const [infoRowHeight, setInfoRowHeight] = useState(40);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const infoRowRef = useRef(null);
  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const barObserverRef = useRef(null);
  useEffect(() => {
    if (barObserverRef.current) barObserverRef.current.disconnect();
    const hEl = headerRef.current;
    const fEl = footerRef.current;
    const iEl = infoRowRef.current;
    if (!hEl && !fEl && !iEl) return;
    const ro = new ResizeObserver(() => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
      if (footerRef.current) setFooterHeight(footerRef.current.offsetHeight);
      if (infoRowRef.current) setInfoRowHeight(infoRowRef.current.offsetHeight);
    });
    if (hEl) { ro.observe(hEl); setHeaderHeight(hEl.offsetHeight); }
    if (fEl) { ro.observe(fEl); setFooterHeight(fEl.offsetHeight); }
    if (iEl) { ro.observe(iEl); setInfoRowHeight(iEl.offsetHeight); }
    barObserverRef.current = ro;
    return () => ro.disconnect();
  }, [view, gameState]);

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
    const { mode, level, date, view: viewParam, coop: coopParam, coopMosaic: coopMosaicParam, vault: vaultParam } = getSearchParams();
    const levelNum = level != null ? parseInt(level, 10) : null;
    const hasDailyDeepLink = mode === "daily" && date;
    const hasDeepLink = hasDailyDeepLink || (mode && levelNum != null && !Number.isNaN(levelNum));

    // Handle vault join link — defer until Firebase auth is ready
    if (vaultParam) {
      setVaultSessionId(vaultParam);
      setVaultRole("guest");
      setView("vault");
      return;
    }

    // Handle coop mosaic join link — defer until Firebase auth is ready
    // URL param is kept so refreshing the page rejoins the session
    if (coopMosaicParam) {
      setCoopMosaicSessionId(coopMosaicParam);
      setCoopMosaicRole("guest");
      setCoopMosaicStatus("joining");
      coopMosaicJoiningRef.current = true;
      return;
    }

    // Handle coop join link — defer until Firebase auth is ready
    // URL param is kept so refreshing the page rejoins the session
    if (coopParam && mode && levelNum != null) {
      setDifficulty(mode);
      setCurrentPuzzle(levelNum);
      // Store the coop session ID; actual joining happens once auth is ready (see coop join effect)
      setCoopSessionId(coopParam);
      setCoopRole("guest");
      setCoopStatus("joining");
      coopJoiningRef.current = true;
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
  // --- Bottom Tab Bar helper ---
  // --- Context Button (Liquid Glass FAB) ---
  // Close radial menu when view changes
  const prevViewRef = useRef(view);
  if (prevViewRef.current !== view) {
    prevViewRef.current = view;
    if (radialMenuStack.length > 0) setRadialMenuStack([]);
  }

  // SVG icon components for radial menu (minimal, monochrome stroke icons)
  const radialIcons = {
    play: (c) => <Play size={18} color={c} strokeWidth={2} />,
    create: (c) => <Pencil size={18} color={c} strokeWidth={2} />,
    profile: (c) => <User size={18} color={c} strokeWidth={2} />,
    "user-avatar": (c) => (
      profilePicture ? (
        <img src={profilePicture} alt="" style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          backgroundColor: C.accent + "33",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: C.accent,
          fontWeight: 700
        }}>
          {(username || firebaseUser?.email || "?")[0].toUpperCase()}
        </div>
      )
    ),
    home: (c) => <Home size={18} color={c} strokeWidth={2} />,
    gallery: (c) => <LayoutGrid size={18} color={c} strokeWidth={2} />,
    trophy: (c) => <Trophy size={18} color={c} strokeWidth={2} />,
    globe: (c) => <Globe size={18} color={c} strokeWidth={2} />,
    friends: (c) => {
      return (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={18} color={c} strokeWidth={2} />
          {onlineFriendsCount > 0 && (
            <span style={{
              position: "absolute",
              top: -6,
              right: -8,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#22C55E",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
            }}>
              {onlineFriendsCount > 99 ? "99+" : onlineFriendsCount}
            </span>
          )}
        </span>
      );
    },
    folder: (c) => <FolderOpen size={18} color={c} strokeWidth={2} />,
    plus: (c) => <Plus size={18} color={c} strokeWidth={2} />,
    users: (c) => <Users size={18} color={c} strokeWidth={2} />,
    handshake: (c) => {
      const activeCount = activeCoopSessions.filter(s => s.status !== "complete").length;
      return (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Handshake size={18} color={c} strokeWidth={2} />
          {activeCount > 0 && (
            <span style={{
              position: "absolute",
              top: -6,
              right: -8,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#A855F7",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 8px rgba(168, 85, 247, 0.6)",
            }}>
              {activeCount > 99 ? "99+" : activeCount}
            </span>
          )}
        </span>
      );
    },
    back: (c) => <ChevronLeft size={18} color={c} strokeWidth={2} />,
    grid: (c) => <Grid3X3 size={18} color={c} strokeWidth={2} />,
    eye: (c) => <Eye size={18} color={c} strokeWidth={2} />,
    zap: (c) => <Zap size={18} color={c} strokeWidth={2} />,
    shuffle: (c) => <Shuffle size={18} color={c} strokeWidth={2} />,
    calendar: (c) => <Calendar size={18} color={c} strokeWidth={2} />,
    layers: (c) => <Layers size={18} color={c} strokeWidth={2} />,
    star: (c) => <Star size={18} color={c} strokeWidth={2} />,
    compass: (c) => <Compass size={18} color={c} strokeWidth={2} />,
    burger: (c) => <Menu size={18} color={c} strokeWidth={2} />,
    palette: (c) => <Palette size={18} color={c} strokeWidth={2} />,
    share: (c) => <Share2 size={18} color={c} strokeWidth={2} />,
    search: (c) => <Search size={18} color={c} strokeWidth={2} />,
    "user-plus": (c) => <UserPlus size={18} color={c} strokeWidth={2} />,
    upload: (c) => <Upload size={18} color={c} strokeWidth={2} />,
    login: (c) => <LogIn size={18} color={c} strokeWidth={2} />,
    logout: (c) => <LogOut size={18} color={c} strokeWidth={2} />,
    check: (c) => <Check size={20} color={c} strokeWidth={2.5} />,
    refresh: (c) => <RotateCcw size={18} color={c} strokeWidth={2} />,
    forward: (c) => <ChevronRight size={18} color={c} strokeWidth={2} />,
    pass: (c) => <HandHelping size={18} color={c} strokeWidth={2} />,
    bell: (c) => (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Bell size={18} color={c} strokeWidth={2} />
        {notifications.length > 0 && (
          <span style={{
            position: "absolute",
            top: -6,
            right: -8,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#54A0FF",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            boxShadow: "0 0 8px rgba(84, 160, 255, 0.6)",
          }}>
            {notifications.length > 99 ? "99+" : notifications.length}
          </span>
        )}
      </span>
    ),
    pencil: (c) => <Pencil size={18} color={c} strokeWidth={2} />,
    "paint-bucket": (c) => <PaintBucket size={18} color={c} strokeWidth={2} />,
    eraser: (c) => <Eraser size={18} color={c} strokeWidth={2} />,
    "pass-pending": (c) => (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <HandHelping size={18} color={c} strokeWidth={2} />
        <Clock size={10} color="#f59e0b" strokeWidth={2.5} style={{ position: "absolute", bottom: -2, right: -4 }} />
      </span>
    ),
    suggest: (c) => <Lightbulb size={18} color={c} strokeWidth={2} />,
    reaction: (c) => <SmilePlus size={18} color={c} strokeWidth={2} />,
    "suggest-pending": (c) => (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <Lightbulb size={18} color={c} strokeWidth={2} />
        <Clock size={10} color="#f59e0b" strokeWidth={2.5} style={{ position: "absolute", bottom: -2, right: -4 }} />
      </span>
    ),
    settings: (c) => <Settings size={18} color={c} strokeWidth={2} />,
    cake: (c) => <Cake size={18} color={c} strokeWidth={2} />,
    trash: (c) => <Trash2 size={18} color={c} strokeWidth={2} />,
    edit: (c) => <Edit3 size={18} color={c} strokeWidth={2} />,
    award: (c) => <Award size={18} color={c} strokeWidth={2} />,
    close: (c) => <X size={18} color={c} strokeWidth={2} />,
    copy: (c) => <Copy size={18} color={c} strokeWidth={2} />,
    "message-square": (c) => (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    lock: (c) => (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  };

  // Quick Play sub-menu — shared across all views (accessed from nav)
  // Pick a random uncompleted puzzle index for a given difficulty, fallback to 0
  const getRandomUncompletedPuzzle = (diff) => {
    const puzzles = PUZZLE_SETS[diff] || [];
    const diffProg = progress[diff] || {};
    const uncompleted = [];
    for (let i = 0; i < puzzles.length; i++) {
      if (!diffProg[i] || diffProg[i] <= 0) uncompleted.push(i);
    }
    if (uncompleted.length === 0) return Math.floor(Math.random() * puzzles.length); // all done, pick random
    return uncompleted[Math.floor(Math.random() * uncompleted.length)];
  };

  const quickPlayStart = (diff, idx, dailyDate) => {
    if (coopSessionId) leaveCoopSession();
    startPuzzle(idx, diff, true, dailyDate);
  };
  const playSubMenu = [
    { id: "easy", icon: "grid", label: "Easy", action: () => { quickPlayStart("easy", getRandomUncompletedPuzzle("easy")); } },
    { id: "medium", icon: "layers", label: "Medium", action: () => { quickPlayStart("medium", getRandomUncompletedPuzzle("medium")); } },
    { id: "hard", icon: "zap", label: "Hard", action: () => { quickPlayStart("hard", getRandomUncompletedPuzzle("hard")); } },
    { id: "daily", icon: "calendar", label: "Daily", action: () => { quickPlayStart("daily", null, getTodayDailyDateStr()); } },
    { id: "cascade", icon: "layers", label: "Cascade", action: () => { quickPlayStart("cascade", cascadeRunIndex); } },
  ];

  // Theme sub-menu — select a theme inline
  const themeAchList = computeAchievements(progress, times, savedAchievementIds);
  const themeSubMenu = [
    ...PUZZLE_THEMES.map(theme => {
      const unlocked = isThemeUnlocked(theme, themeAchList);
      const isActive = activeThemeId === theme.id;
      return {
        id: `theme-${theme.id}`,
        icon: "palette",
        label: theme.name + (isActive ? " \u2713" : ""),
        dimmed: !unlocked,
        action: unlocked ? () => { setActiveThemeId(theme.id); saveTheme(theme.id); } : null,
      };
    }),
  ];

  // Account sub-menu — nested account management options
  // Admin submenu — nested under Profile
  const adminSubMenu = [
    { id: "admin-review", icon: "star", label: "Review", action: () => { setView("admin-review"); loadMosaicData("admin"); } },
    { id: "admin-manage", icon: "list", label: "Manage", action: () => { setView("admin-manage"); loadMosaicData("manage"); } },
    { id: "admin-metrics", icon: "chart", label: "Metrics", action: () => { setView("admin-metrics"); loadAdminMetricsData(); } },
    { id: "admin-users", icon: "users", label: "Users", action: () => { setView("admin-users"); } },
  ];

  // Co-op submenu — global co-op menu
  const coopSubMenu = [
    { id: "coop-create", icon: "play", label: "Create Session", sub: "coop-create" },
    { id: "coop-vault", icon: "lock", label: "Vault", action: () => {
      if (!firebaseUser) { setRadialMenuStack(["root", "sign-in"]); return; }
      // Create a new vault session
      const seed = Math.floor(Math.random() * 2147483647);
      const diff = "silver"; // default difficulty
      const config = VAULT_DIFFICULTIES[diff];
      const result = buildVaultPuzzles(seed, diff);
      const existingId = generateVaultSessionId();
      createVaultSession(firebaseUser.uid, {
        difficulty: diff,
        puzzleSeed: seed,
        combination: result.combination,
        clueTiles: result.clueTiles,
        decoyTiles: result.decoyTiles,
        startingUnlocked: result.startingUnlocked,
        gridLayout: config.gridLayout,
        maxAttempts: config.maxAttempts,
        hostUsername: username || firebaseUser.email,
        hostTheme: activeTheme?.name || "classic",
      }, existingId).then((id) => {
        if (id) {
          setVaultSessionId(id);
          setVaultRole("host");
          setView("vault");
          // Open invite panel so host can share link / invite friends
          setCoopSelectedFriends(new Set());
          setCoopInviteUsernameInput("");
          setCoopInviteUsernameMsg("");
          setRadialMenuStack(["root", "coop-start"]);
        }
      }).catch(() => {});
    }},
    { id: "coop-active", icon: "handshake", label: "Active Sessions", sub: "coop-active" },
    { id: "coop-completed", icon: "check", label: "Completed", sub: "coop-completed" },
    { id: "coop-friends", icon: "users", label: "Friends", sub: "friends-view" },
  ];

  // Profile submenu — now global, includes account items + admin
  const profileSubMenu = [
    { id: "profile-view-item", icon: "profile", label: "View Profile", sub: "profile-view" },
    { id: "profile-achievements", icon: "trophy", label: "Achievements", sub: "achievements-view" },
    { id: "profile-share", icon: "share", label: "Share Stats", sub: "share-stats" },
    { id: "profile-username", icon: "edit", label: "Change Username", sub: "username-edit" },
    { id: "profile-birthday", icon: "cake", label: "Set Birthday", sub: "birthday-edit" },
    ...(progress && Object.keys(progress).length > 0 ? [{ id: "profile-clear", icon: "trash", label: "Clear All Data", sub: "clear-confirm" }] : []),
    { id: "profile-delete", icon: "trash", label: "Delete Account", sub: "delete-account" },
    { id: "profile-signout", icon: "logout", label: "Sign Out", action: () => { handleSignOut(); } },
    ...(isAdmin ? [{ id: "profile-admin", icon: "shield", label: "Admin", sub: "admin" }] : []),
  ];

  // Contextual menu items per view — page-specific actions
  const getContextualMenuTree = (currentView) => {
    // Build play contextual items dynamically (some are conditional)
    const playRoot = [];
    playRoot.push({ id: "theme", icon: "palette", label: "Theme", sub: "theme" });
    if (!isCoop && gameState === "playing" && !isCascade && !isMosaic) {
      playRoot.push({ id: "coop-start", icon: "user-plus", label: "Play w/ Friends", sub: "coop-start", beforeSub: () => {
        if (!firebaseUser) { coopPendingLoginRef.current = true; setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError(""); return false; }
        setCoopSelectedFriends(new Set()); setCoopInviteUsernameInput(""); setCoopInviteUsernameMsg("");
        return true;
      }});
    }
    if (isCoop) {
      playRoot.push({ id: "coop-invite", icon: "user-plus", label: "Invite", sub: "coop-start", beforeSub: () => { setCoopSelectedFriends(new Set()); setCoopInviteUsernameInput(""); setCoopInviteUsernameMsg(""); return true; } });
    }
    // Back action defined as pill button at call site

    // Menu view items
    const menuRoot = [];
    if (firebaseConfigured && firebaseUser && notifications.length > 0) {
      menuRoot.push({ id: "notifications", icon: "bell", label: "Notifications", sub: "notifications-view" });
    }

    // Creator view items
    const creatorRoot = [];

    // Custom mosaic view items
    const customMosaicRoot = [];
    if (firebaseConfigured && firebaseUser && !isCoopMosaic) {
      customMosaicRoot.push({ id: "coop-mosaic", icon: "user-plus", label: "Play w/ Friends", sub: "coop-start", beforeSub: () => {
        setCoopSelectedFriends(new Set()); setCoopInviteUsernameInput(""); setCoopInviteUsernameMsg("");
        return true;
      } });
    }

    // Admin view items
    // Admin back buttons defined as pill buttons at call sites
    const adminReviewRoot = [
      { id: "refresh", icon: "refresh", label: "Refresh", action: () => { loadMosaicData("admin"); } },
    ];
    const adminManageRoot = [
      { id: "refresh", icon: "refresh", label: "Refresh", action: () => { loadMosaicData("manage"); } },
    ];
    const adminMetricsRoot = [
      { id: "refresh", icon: "refresh", label: "Refresh", action: () => { loadAdminMetricsData(); } },
    ];
    const adminUsersRoot = [];

    // Global menu structure — available in all views (profile, themes, etc.)
    const globalMenuStructure = {
      play: playSubMenu,
      profile: firebaseConfigured && firebaseUser ? profileSubMenu : [],
      admin: adminSubMenu,
      coop: firebaseConfigured && firebaseUser ? coopSubMenu : [],
      "coop-create": [],
      "coop-active": [],
      "coop-completed": [],
      "achievements-view": [],
      "share-stats": [],
      "profile-view": [],
      "username-edit": [],
      "birthday-edit": [],
      "delete-account": [],
      "clear-confirm": [],
      "friends-view": [],
      "notifications-view": [],
      "theme-list": [],
      theme: themeSubMenu,
      "coop-start": [],
      "sign-in": [],
      "mosaic-save": [],
      "mosaic-preview": [],
      "creator-confirm": [],
      "creator-post-save": [],
      "vault-chat": [],
    };

    // Build root menu with global Profile and Co-op items
    const buildRootWithProfile = (viewSpecificItems) => {
      const items = [...viewSpecificItems];
      // Add Co-op as a permanent item if signed in
      if (firebaseConfigured && firebaseUser) {
        items.push({ id: "nav-coop-menu", icon: "handshake", label: "Co-op", sub: "coop" });
      }
      // Add Profile as a permanent item if signed in
      if (firebaseConfigured && firebaseUser) {
        items.push({ id: "nav-profile-menu", icon: "user-avatar", label: username || "Profile", sub: "profile" });
      }
      return items;
    };

    const trees = {
      menu: {
        root: buildRootWithProfile(menuRoot),
        ...globalMenuStructure,
      },
      gallery: {
        root: buildRootWithProfile([
          { id: "public", icon: "globe", label: "Public", action: () => { setMosaicGalleryTab("public"); loadMosaicData("public"); } },
          { id: "mine", icon: "folder", label: "My Mosaics", action: () => { setMosaicGalleryTab("mine"); loadMosaicData("mine"); } },
        ]),
        ...globalMenuStructure,
      },
      play: {
        root: buildRootWithProfile(playRoot),
        ...globalMenuStructure,
      },
      profile: {
        root: buildRootWithProfile([]),
        ...globalMenuStructure,
      },
      creator: {
        root: buildRootWithProfile(creatorRoot),
        ...globalMenuStructure,
      },
      "custom-mosaic": {
        root: buildRootWithProfile(customMosaicRoot),
        ...globalMenuStructure,
      },
      coop: {
        root: buildRootWithProfile([]),
        ...globalMenuStructure,
      },
      "admin-review": {
        root: buildRootWithProfile(adminReviewRoot),
        ...globalMenuStructure,
      },
      "admin-manage": {
        root: buildRootWithProfile(adminManageRoot),
        ...globalMenuStructure,
      },
      "admin-metrics": {
        root: buildRootWithProfile(adminMetricsRoot),
        ...globalMenuStructure,
      },
      "admin-users": {
        root: buildRootWithProfile(adminUsersRoot),
        ...globalMenuStructure,
      },
      vault: {
        root: buildRootWithProfile([
          ...(isVault ? [{ id: "vault-invite-item", icon: "user-plus", label: "Invite", sub: "coop-start", beforeSub: () => { setCoopSelectedFriends(new Set()); setCoopInviteUsernameInput(""); setCoopInviteUsernameMsg(""); return true; } }] : []),
          ...(isVault ? [{ id: "vault-chat-item", icon: "message-square", label: "Chat", sub: "vault-chat" }] : []),
          { id: "theme", icon: "palette", label: "Theme", sub: "theme" },
        ]),
        ...globalMenuStructure,
      },
    };
    return trees[currentView] || { root: [] };
  };

  // Persistent nav items — always show all core page links
  const navItems = [
    { id: "nav-play", icon: "play", label: "Quick Play", sub: "play" },
    { id: "nav-home", icon: "home", label: "Home", action: () => { setView("menu"); } },
    { id: "nav-gallery", icon: "gallery", label: "Mosaic", action: () => { setMosaicGalleryTab("public"); setView("gallery"); loadMosaicData("public"); } },
    ...(firebaseConfigured && !firebaseUser ? [{ id: "nav-sign-in", icon: "login", label: "Sign In", sub: "sign-in", beforeSub: () => { setAccountTab("login"); setAccountError(""); return true; } }] : []),
  ];

  // FAB icon — always the burger menu
  const getFabIcon = () => "burger";

  const renderContextButton = (currentView, pillButtons = [], bottomPx = 16) => {
    const menuTree = getContextualMenuTree(currentView);
    const isOpen = radialMenuStack.length > 0;
    const currentMenuKey = isOpen ? radialMenuStack[radialMenuStack.length - 1] : "root";
    const isSubMenu = currentMenuKey !== "root";
    const isCoopStartMenu = currentMenuKey === "coop-start";
    const isMosaicSaveMenu = currentMenuKey === "mosaic-save";
    const isSignInMenu = currentMenuKey === "sign-in";
    const isMosaicPreviewMenu = currentMenuKey === "mosaic-preview";
    const isAchievementsView = currentMenuKey === "achievements-view";
    const isFriendsView = currentMenuKey === "friends-view";
    const isShareStats = currentMenuKey === "share-stats";
    const isProfileView = currentMenuKey === "profile-view";
    const isUsernameEdit = currentMenuKey === "username-edit";
    const isBirthdayEdit = currentMenuKey === "birthday-edit";
    const isDeleteAccount = currentMenuKey === "delete-account";
    const isClearConfirm = currentMenuKey === "clear-confirm";
    const isThemeList = currentMenuKey === "theme-list";
    const isSyncChoice = currentMenuKey === "sync-choice";
    const isCoopCreate = currentMenuKey === "coop-create";
    const isCoopActive = currentMenuKey === "coop-active";
    const isCoopCompleted = currentMenuKey === "coop-completed";
    const isNotificationsView = currentMenuKey === "notifications-view";
    const isCreatorConfirm = currentMenuKey === "creator-confirm";
    const isCreatorPostSave = currentMenuKey === "creator-post-save";
    const isVaultChat = currentMenuKey === "vault-chat";
    const isCustomPanel = isCoopStartMenu || isMosaicSaveMenu || isSignInMenu || isMosaicPreviewMenu ||
                          isAchievementsView || isFriendsView || isShareStats || isProfileView ||
                          isUsernameEdit || isBirthdayEdit || isDeleteAccount || isClearConfirm ||
                          isThemeList || isSyncChoice || isCoopCreate || isCoopActive || isCoopCompleted ||
                          isNotificationsView || isCreatorConfirm || isCreatorPostSave || isVaultChat;
    const contextualItems = isCustomPanel ? [] : (menuTree[currentMenuKey] || []);

    // Filter out the current page from nav
    const viewToNavId = { menu: "nav-home", gallery: "nav-gallery", creator: "nav-gallery", "custom-mosaic": "nav-gallery" };
    const filteredNav = navItems.filter(item => item.id !== viewToNavId[currentView]);

    const fabIconKey = isOpen ? null : getFabIcon();
    const strokeColor = "#fff";
    const activeStroke = C.accent;
    const renderIcon = (key, color) => radialIcons[key] ? radialIcons[key](color) : null;

    // Coop start menu state
    const isCoopFromVault = isCoopStartMenu && isVault && !!vaultSessionId;
    const isCoopFromMosaic = isCoopStartMenu && !isCoopFromVault && currentView === "custom-mosaic" && !!customMosaicPlay;
    const coopPickerColor = isCoopFromVault ? "#C8F03E" : isCoopFromMosaic ? C.coop : "#54A0FF";

    // Panel sizing
    const fabSize = 56;
    const hasPillButtons = pillButtons.length > 0;
    const closedWidth = hasPillButtons ? (pillButtons.length + 1) * fabSize : fabSize;
    // Calculate panel width: when open, add space for close button (~50px) and back button if submenu (~70px)
    const openExtraWidth = hasPillButtons ? (isSubMenu ? 120 : 50) : 0;
    const panelWidth = isCustomPanel ? 300 : Math.max(200, closedWidth + openExtraWidth);
    const itemHeight = 44;
    const panelPad = 8;
    const dividerHeight = 13;
    const showNav = !isSubMenu;
    const hasContextual = contextualItems.length > 0;
    const showDivider = showNav && hasContextual;
    const visibleItemCount = (showNav ? filteredNav.length : 0) + contextualItems.length;

    // Pass UI state — rendered inside the Liquid Glass panel
    const showPassPlayerPicker = coopPassPlayerPicker && !coopPassMode;
    const showPassBanner = !!coopPassMode;
    const showPassPending = pendingPassOpen && !!coopPendingPassCell;
    const showPassIncoming = gameState === "playing" && isCoop && coopIncomingPass && selectedCell === coopIncomingPass.cellKey;
    // Suggest UI state — rendered inside the Liquid Glass panel
    const showSuggestPlayerPicker = coopSuggestPlayerPicker && !coopSuggestMode;
    const showSuggestBanner = !!coopSuggestMode && !coopSuggestCell;
    const showSuggestTokenPick = !!coopSuggestCell && !!coopSuggestMode;
    // Friend reaction picker state — shows friend checkboxes + reaction grid
    const onlineFriendsList = friendsList.filter(f => { const p = friendPresence[f.uid]; return p && p.lastSeen && (Date.now() - p.lastSeen) < 120000; });
    const showFriendReactionPicker = friendReactionPickerOpen && !showPassPlayerPicker && !showPassBanner && !showPassPending && !showPassIncoming && !showSuggestPlayerPicker && !showSuggestBanner && !showSuggestTokenPick;
    const hasPassUI = isCustomPanel ? false : (showPassPlayerPicker || showPassBanner || showPassPending || showPassIncoming || showSuggestPlayerPicker || showSuggestBanner || showSuggestTokenPick || showFriendReactionPicker);
    const passPlayerCount = showPassPlayerPicker ? Object.keys(coopPlayers).length : (showSuggestPlayerPicker ? Object.keys(coopPlayers).length : 0);
    const suggestTokenCount = showSuggestTokenPick ? (puzzle?.usedTokens?.length || 0) : 0;
    const friendReactionPickerHeight = showFriendReactionPicker ? (Math.min(onlineFriendsList.length, 3) * 40 + 24 + 228) : 0; // friend rows + label + reaction grid
    const passRowHeight = (showPassPlayerPicker || showSuggestPlayerPicker) ? (passPlayerCount > 2 ? 88 : 56) : showSuggestTokenPick ? Math.max(56, 36 + Math.ceil(suggestTokenCount / 6) * 36) : showFriendReactionPicker ? friendReactionPickerHeight : showPassIncoming ? 56 : 48;
    const passUIHeight = hasPassUI ? passRowHeight + 17 : 0; // +16px padding + 1px divider

    // Coop start menu height — back button + header + subtitle + mosaic card + friends list + action buttons
    const coopHasActiveSession = isCoopStartMenu && (
      isCoopFromVault ? !!vaultSessionId :
      (isCoopFromMosaic || (isCoopMosaic && !!coopMosaicSessionId)) ? !!coopMosaicSessionId : !!coopSessionId
    );
    const coopStartContentHeight = (() => {
      if (!isCoopStartMenu) return 0;
      let h = panelPad + fabSize; // padding + bottom bar (includes sub-menu back button)
      h += 24 + 4 + 18 + 12; // header + gap + subtitle + margin
      if (coopHasActiveSession) {
        h += 18 + 6; // "Invite Link" label + margin
        h += 40 + 8; // link display + margin
        h += 42; // copy link button
        if (friendsList.length > 0) h += 12; // margin before friends
      } else {
        if (isCoopFromMosaic) h += 70; // mosaic info card
      }
      if (friendsList.length > 0) {
        h += 24 + 8; // "Friends" label + margin
        h += Math.min(friendsList.length, 4) * 46; // friend rows (cap visual height at 4, rest scrolls)
        h += 16; // bottom margin
      }
      h += 18 + 6 + 36 + 12; // invite by username: label + margin + input row + bottom margin
      if (!coopHasActiveSession) h += 48; // action buttons
      if (coopHasActiveSession && !(isCoopFromVault ? (vaultSessionDataRef.current?.players && Object.keys(vaultSessionDataRef.current.players).length >= 2) : (isCoopFromMosaic || isCoopMosaic) ? false : coopPartnerConnected)) h += 30; // waiting text
      return h;
    })();

    // Mosaic save menu height — header + input + button
    const mosaicSaveContentHeight = (() => {
      if (!isMosaicSaveMenu) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 44 + 12; // input field + margin
      h += 42; // save button
      h += 12; // container bottom padding
      return h;
    })();

    // Mosaic preview menu height — header + canvas + bottom padding
    const mosaicPreviewContentHeight = (() => {
      if (!isMosaicPreviewMenu) return 0;
      const canvasSize = 300 - 32 - 2; // panelWidth minus padding minus border
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += canvasSize + 2; // canvas + border
      h += 12; // container bottom padding
      return h;
    })();

    // Sign-in menu height — header + subtitle + tabs + google btn + divider + email + password + error + submit
    const signInContentHeight = (() => {
      if (!isSignInMenu) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 18 + 4; // header + margin
      h += 14 + 12; // subtitle + margin
      h += 30 + 12; // tab toggle + margin
      h += 36 + 8; // google button + margin
      h += 16 + 8; // "or" divider + margin
      h += 36 + 6; // email input + margin
      h += 36 + 8; // password input + margin
      if (accountError) h += 32 + 8; // error display + margin
      h += 36; // submit button
      h += 12; // container bottom padding
      return h;
    })();

    // Achievements view height — header + subtitle + scrollable list
    const achievementsContentHeight = (() => {
      if (!isAchievementsView) return 0;
      const achList = computeAchievements(progress, times, savedAchievementIds);
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 4; // header + margin
      h += 12 + 16; // subtitle + margin
      h += Math.min(achList.length, 6) * 58; // achievement items (cap at 6, rest scrolls)
      h += 12; // bottom padding
      return h;
    })();

    // Friends view height — header + tabs + content
    const friendsContentHeight = (() => {
      if (!isFriendsView) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 36 + 8; // add friend input + margin
      h += Math.min(friendsList.length, 5) * 46 + 16; // friend list items (cap at 5, rest scrolls)
      h += 12; // bottom padding
      return h;
    })();

    // Share stats height — header + stats display + buttons
    const shareStatsContentHeight = (() => {
      if (!isShareStats) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 200; // stats content
      h += 48 + 8; // buttons + margin
      h += 12; // bottom padding
      return h;
    })();

    // Profile view height — header + profile info + buttons
    const profileViewContentHeight = (() => {
      if (!isProfileView) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 80 + 16; // profile picture + margin
      h += 200; // profile info
      h += 12; // bottom padding
      return h;
    })();

    // Username edit height — header + input + button
    const usernameEditContentHeight = (() => {
      if (!isUsernameEdit) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 44 + 12; // input + margin
      h += 14 + 12; // availability status + margin
      h += 42; // save button
      h += 12; // bottom padding
      return h;
    })();

    // Birthday edit height — header + date input + buttons
    const birthdayEditContentHeight = (() => {
      if (!isBirthdayEdit) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 44 + 16; // date input + margin
      h += 42 + 8; // save button + margin
      if (birthday) h += 42 + 8; // remove button if exists
      h += 12; // bottom padding
      return h;
    })();

    // Delete account height — header + warning + password + button
    const deleteAccountContentHeight = (() => {
      if (!isDeleteAccount) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 60 + 12; // warning message + margin
      h += 44 + 12; // password input + margin
      if (accountError) h += 32 + 8; // error display + margin
      h += 42; // delete button
      h += 12; // bottom padding
      return h;
    })();

    // Clear confirm height — header + warning + buttons
    const clearConfirmContentHeight = (() => {
      if (!isClearConfirm) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 80 + 16; // warning message + margin
      h += 42 + 8; // clear button + margin
      h += 42; // cancel button
      h += 12; // bottom padding
      return h;
    })();

    // Creator confirm height — header + message + buttons
    const creatorConfirmContentHeight = (() => {
      if (!isCreatorConfirm) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 60 + 16; // message + margin
      h += 42 + 8; // confirm button + margin
      h += 42; // cancel button
      h += 12; // bottom padding
      return h;
    })();

    // Theme list height — header + theme list
    const themeListContentHeight = (() => {
      if (!isThemeList) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 4; // header + margin
      h += 12 + 16; // subtitle + margin
      h += Math.min(PUZZLE_THEMES.length, 5) * 66; // theme items (cap at 5, rest scrolls)
      h += 12; // bottom padding
      return h;
    })();

    // Sync choice height — header + options
    const syncChoiceContentHeight = (() => {
      if (!isSyncChoice) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 80 + 16; // description + margin
      h += 60 + 8; // local option + margin
      h += 60 + 8; // cloud option + margin
      h += 60; // merge option
      h += 12; // bottom padding
      return h;
    })();

    // Co-op create session height — header + mode selection + puzzle selection + start button
    const coopCreateContentHeight = (() => {
      if (!isCoopCreate) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += 40 + 16; // description + margin
      h += 70 + 12; // mode selection + margin
      h += 80 + 16; // puzzle/mosaic selection + margin
      h += 48; // start button
      h += 12; // bottom padding
      return h;
    })();

    // Co-op active sessions height — scrollable list
    const coopActiveContentHeight = (() => {
      if (!isCoopActive) return 0;
      const activeSessions = activeCoopSessions.filter(s => s.status !== "complete");
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      if (activeSessions.length === 0) {
        h += 80; // empty state
      } else {
        h += Math.min(activeSessions.length, 5) * 56; // session cards (cap at 5, rest scrolls)
      }
      h += 12; // bottom padding
      return h;
    })();

    // Co-op completed sessions height — scrollable list
    const coopCompletedContentHeight = (() => {
      if (!isCoopCompleted) return 0;
      const completedSessions = activeCoopSessions.filter(s => s.status === "complete");
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      if (completedSessions.length === 0) {
        h += 80; // empty state
      } else {
        h += Math.min(completedSessions.length, 5) * 56; // session cards (cap at 5, rest scrolls)
      }
      h += 12; // bottom padding
      return h;
    })();

    // Notifications view height — scrollable list
    const notificationsViewContentHeight = (() => {
      if (!isNotificationsView) return 0;
      let h = panelPad + fabSize; // padding + bottom bar
      h += 20 + 8; // header + margin
      h += Math.min(notifications.length, 5) * 60; // notification items (cap at 5, rest scrolls)
      h += 12; // bottom padding
      return h;
    })();

    const contentHeight = isAchievementsView ? achievementsContentHeight :
                          isFriendsView ? friendsContentHeight :
                          isShareStats ? shareStatsContentHeight :
                          isProfileView ? profileViewContentHeight :
                          isUsernameEdit ? usernameEditContentHeight :
                          isBirthdayEdit ? birthdayEditContentHeight :
                          isDeleteAccount ? deleteAccountContentHeight :
                          isClearConfirm ? clearConfirmContentHeight :
                          isCreatorConfirm ? creatorConfirmContentHeight :
                          isThemeList ? themeListContentHeight :
                          isSyncChoice ? syncChoiceContentHeight :
                          isCoopCreate ? coopCreateContentHeight :
                          isCoopActive ? coopActiveContentHeight :
                          isCoopCompleted ? coopCompletedContentHeight :
                          isNotificationsView ? notificationsViewContentHeight :
                          isMosaicPreviewMenu ? mosaicPreviewContentHeight :
                          isSignInMenu ? signInContentHeight :
                          isMosaicSaveMenu ? mosaicSaveContentHeight :
                          isCoopStartMenu ? coopStartContentHeight :
                          isVaultChat ? (panelPad + fabSize + 20 + 8 + 200 + 8 + 36 + 12) :
                          (visibleItemCount * itemHeight + (showDivider ? dividerHeight : 0) + panelPad + fabSize + passUIHeight);
    // Cap panel height so it never goes off-screen (leave 20px margin top + bottom position)
    const bottomOffset = bottomPx; // matches the bottom positioning
    const maxPanelHeight = typeof window !== "undefined" ? window.innerHeight - bottomOffset - 20 : 600;
    const openHeight = Math.min(contentHeight, maxPanelHeight);
    const needsScroll = contentHeight > maxPanelHeight;

    // Liquid Glass spring curves — fast initial movement, subtle overshoot, quick settle
    const springOpen = "cubic-bezier(0.175, 0.885, 0.32, 1.175)";
    const springClose = "cubic-bezier(0.4, 0, 0.7, 1)";

    const handleToggle = () => {
      // Don't allow closing if username is required
      if (isOpen && !username && isUsernameEdit) return;
      if (isOpen) { setRadialMenuStack([]); setFriendReactionPickerOpen(false); }
      else setRadialMenuStack(["root"]);
    };

    // Shared item renderer — uses CSS transitions (not animations) so items animate in AND out
    const renderItem = (item, animIndex, dimmed) => {
      const handleClick = () => {
        // Don't allow navigation away from username-edit if username is required
        if (!username && isUsernameEdit) return;
        if (item.isBack) setRadialMenuStack(prev => prev.slice(0, -1));
        else if (item.sub) {
          if (item.beforeSub && !item.beforeSub()) return; // guard check — return false to cancel
          setRadialMenuStack(prev => [...prev, item.sub]);
        }
        else if (item.action) {
          // Guard navigation when in creator view with unsaved work
          if (currentView === "creator" && creatorGrid.some(row => row.some(cell => cell !== null))) {
            setCreatorConfirmAction({ type: "leave", action: () => { resetCreator(); item.action(); } });
            setRadialMenuStack(["root", "creator-confirm"]);
            return;
          }
          item.action(); setRadialMenuStack([]);
        }
      };
      const staggerIn = 0.04 + animIndex * 0.03;

      // Define glow configurations for special menu items
      const getItemGlow = () => {
        const hasActiveSessions = activeCoopSessions.filter(s => s.status !== "complete").length > 0;

        // Blue glow for notifications (rectangular gradient from center)
        if (item.id === "notifications" && notifications.length > 0) {
          return {
            background: "linear-gradient(90deg, transparent 0%, rgba(84, 160, 255, 0.08) 20%, rgba(84, 160, 255, 0.25) 50%, rgba(84, 160, 255, 0.08) 80%, transparent 100%)",
            hoverBackground: "linear-gradient(90deg, transparent 0%, rgba(84, 160, 255, 0.12) 20%, rgba(84, 160, 255, 0.35) 50%, rgba(84, 160, 255, 0.12) 80%, transparent 100%)",
            animation: "subtleGlowPulse 2.5s ease-in-out infinite",
          };
        }

        // Purple glow for coop items when there are active sessions (rectangular gradient from center)
        if ((item.id === "nav-coop-menu" || item.id === "coop-active") && hasActiveSessions) {
          return {
            background: "linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.08) 20%, rgba(168, 85, 247, 0.25) 50%, rgba(168, 85, 247, 0.08) 80%, transparent 100%)",
            hoverBackground: "linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.12) 20%, rgba(168, 85, 247, 0.35) 50%, rgba(168, 85, 247, 0.12) 80%, transparent 100%)",
            animation: "subtleGlowPulse 2.5s ease-in-out infinite",
          };
        }

        // Green glow for Quick Play (rectangular gradient from center)
        if (item.id === "nav-play") {
          return {
            background: "linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.08) 20%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.08) 80%, transparent 100%)",
            hoverBackground: "linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.12) 20%, rgba(34, 197, 94, 0.35) 50%, rgba(34, 197, 94, 0.12) 80%, transparent 100%)",
            animation: "subtleGlowPulse 2.5s ease-in-out infinite",
          };
        }

        return null;
      };

      const glowConfig = getItemGlow();
      const hasGlow = !!glowConfig;

      return (
        <button
          key={item.id}
          onClick={handleClick}
          style={{
            width: "100%", height: itemHeight,
            display: "flex", alignItems: "center", gap: 12,
            padding: "0 16px",
            background: hasGlow ? glowConfig.background : "none",
            border: "none",
            cursor: dimmed && !item.isBack ? "default" : "pointer",
            color: dimmed ? C.textDim : C.text,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11, fontWeight: 600,
            letterSpacing: 0.5, textTransform: "uppercase",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateY(0)" : "translateY(8px)",
            transition: isOpen
              ? `opacity 0.2s ${springOpen} ${staggerIn}s, transform 0.25s ${springOpen} ${staggerIn}s, background 0.3s ease`
              : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s, background 0.3s ease`,
            pointerEvents: isOpen ? "auto" : "none",
            borderRadius: hasGlow ? 8 : 0,
            backdropFilter: hasGlow ? "blur(8px)" : "none",
            WebkitBackdropFilter: hasGlow ? "blur(8px)" : "none",
            animation: hasGlow ? glowConfig.animation : "none",
            position: "relative",
            overflow: "visible",
          }}
          onMouseEnter={e => {
            if (isOpen) {
              if (hasGlow) {
                e.currentTarget.style.background = glowConfig.hoverBackground;
              } else {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }
            }
          }}
          onMouseLeave={e => {
            if (hasGlow) {
              e.currentTarget.style.background = glowConfig.background;
            } else {
              e.currentTarget.style.background = "none";
            }
          }}
        >
          <span style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            flexShrink: 0,
          }}>
            {renderIcon(item.icon, dimmed ? C.textDim : strokeColor)}
          </span>
          <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
          {item.sub && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </button>
      );
    };

    const defaultShadow = "none";
    const hoverShadow = "none";

    return (
      <>
        {/* Click-away layer — blocks scrolling underneath */}
        {isOpen && (
          <div
            onClick={() => {
              // Don't allow closing modal if username is required
              if (!username && isUsernameEdit) return;
              setRadialMenuStack([]);
              setFriendReactionPickerOpen(false);
            }}
            onTouchMove={e => e.preventDefault()}
            style={{ position: "fixed", inset: 0, zIndex: 84, touchAction: "none", overscrollBehavior: "none" }}
          />
        )}
        {/* Click-away layer for reaction picker when menu is closed */}
        {!isOpen && showFriendReactionPicker && (
          <div
            onClick={() => setFriendReactionPickerOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 84 }}
          />
        )}

        {/* Expanding Liquid Glass panel / pill */}
        <div
          style={{
            position: "fixed",
            bottom: `calc(${bottomPx}px + env(safe-area-inset-bottom, 0px))`,
            right: 20,
            width: isOpen ? panelWidth : (hasPassUI ? Math.max(panelWidth, closedWidth) : closedWidth),
            height: isOpen ? openHeight : fabSize + passUIHeight,
            maxHeight: isOpen ? `calc(100vh - ${bottomPx}px - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px) - 20px)` : undefined,
            borderRadius: isOpen ? 22 : (hasPassUI ? 22 : fabSize / 2),
            background: activeTheme.gridBg || C.surface,
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            border: isOpen ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.16)",
            boxShadow: defaultShadow,
            zIndex: 85,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: isOpen
              ? `width 0.3s ${springOpen}, height 0.3s ${springOpen}, max-height 0.3s ${springOpen}, border-radius 0.3s ${springOpen}, box-shadow 0.15s ease`
              : `width 0.22s ${springClose}, height 0.22s ${springClose}, max-height 0.22s ${springClose}, border-radius 0.22s ${springClose}, box-shadow 0.15s ease`,
          }}
          aria-label="Quick actions"
        >
          {/* Liquid Glass sheen highlight */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", top: 0, left: "-10%", width: "120%", height: "50%",
              background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
              borderRadius: "inherit",
            }} />
          </div>

          {/* Menu content — always rendered, animated via transitions */}
          <div style={{ padding: isOpen ? `${panelPad}px 0 0 0` : "0", flex: isOpen ? 1 : 0, height: isOpen ? undefined : 0, display: "flex", flexDirection: "column", minHeight: 0, overflowX: "hidden", overflowY: isOpen ? "auto" : "hidden", WebkitOverflowScrolling: "touch" }}>
            {isSignInMenu ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                      {accountTab === "login" ? "Sign In" : "Create Account"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
                      {accountTab === "login"
                        ? "Sync your progress across devices"
                        : "Progress will be saved to your account"}
                    </div>

                    {/* Tab toggle */}
                    <div style={{
                      display: "flex", borderRadius: 6, overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)", marginBottom: 12,
                    }}>
                      {["login", "signup"].map(tab => (
                        <button
                          key={tab}
                          onClick={() => { setAccountTab(tab); setAccountError(""); }}
                          style={{
                            flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 700,
                            fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                            background: accountTab === tab ? C.accent : "transparent",
                            color: accountTab === tab ? C.bg : C.textDim,
                            border: "none", cursor: "pointer", textTransform: "uppercase",
                            transition: "all 0.15s",
                          }}
                        >
                          {tab === "login" ? "Sign In" : "Sign Up"}
                        </button>
                      ))}
                    </div>

                    {/* Google sign in */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={accountLoading}
                      style={{
                        width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: C.text,
                        cursor: accountLoading ? "not-allowed" : "pointer",
                        opacity: accountLoading ? 0.5 : 1, textTransform: "uppercase",
                        transition: "all 0.15s", marginBottom: 8,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      Google
                    </button>

                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                    }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                      <span style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>or</span>
                      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
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
                          width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                          fontFamily: "'Inter', sans-serif",
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: C.text,
                          outline: "none", marginBottom: 6, boxSizing: "border-box",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={e => { e.target.style.borderColor = C.accent; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={accountPassword}
                        onChange={e => setAccountPassword(e.target.value)}
                        autoComplete={accountTab === "login" ? "current-password" : "new-password"}
                        style={{
                          width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                          fontFamily: "'Inter', sans-serif",
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: C.text,
                          outline: "none", marginBottom: 8, boxSizing: "border-box",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={e => { e.target.style.borderColor = C.accent; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      />

                      {accountError && (
                        <div style={{
                          padding: "6px 10px", borderRadius: 6, marginBottom: 8,
                          backgroundColor: C.incorrect + "18", border: `1px solid ${C.incorrect}44`,
                          fontSize: 10, color: C.incorrect, textAlign: "center",
                        }}>
                          {accountError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={accountLoading || !accountEmail || !accountPassword}
                        style={{
                          width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                          background: C.accent, color: C.bg, border: "none",
                          cursor: (accountLoading || !accountEmail || !accountPassword) ? "not-allowed" : "pointer",
                          opacity: (accountLoading || !accountEmail || !accountPassword) ? 0.5 : 1,
                          textTransform: "uppercase", transition: "all 0.15s",
                        }}
                      >
                        {accountLoading ? "Loading..." : accountTab === "login" ? "Sign In" : "Create Account"}
                      </button>
                    </form>
                  </div>
                </>
              );
            })() : isMosaicSaveMenu ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                      {creatorEditingId ? "Update Mosaic" : "Name Your Mosaic"}
                    </div>
                    <input
                      type="text"
                      defaultValue={creatorTitle}
                      placeholder="Mosaic title..."
                      maxLength={40}
                      autoFocus
                      id="save-drawer-title-input"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif",
                        outline: "none", boxSizing: "border-box", letterSpacing: 0.3,
                      }}
                      onFocus={e => { e.target.style.borderColor = C.accent; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveMosaic(e.target.value);
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById("save-drawer-title-input");
                        handleSaveMosaic(input ? input.value : "");
                      }}
                      disabled={mosaicLoading}
                      style={{
                        width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 8,
                        backgroundColor: C.accent, color: "#fff", border: "none",
                        fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                        letterSpacing: 1, textTransform: "uppercase", cursor: mosaicLoading ? "default" : "pointer",
                        opacity: mosaicLoading ? 0.5 : 1, transition: "opacity 0.15s",
                      }}
                    >
                      {mosaicLoading ? "Saving..." : (creatorEditingId ? "Update" : "Save")}
                    </button>
                  </div>
                </>
              );
            })() : isMosaicPreviewMenu ? (() => {
              const canvasSize = 300 - 32 - 2;
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                      Mosaic Preview — Tile {currentPuzzle + 1}
                    </div>
                    <canvas ref={el => {
                      if (!el || !customMosaicPlay?.grid) return;
                      const grid = customMosaicPlay.grid;
                      const gs = grid.length;
                      const cellSz = canvasSize / gs;
                      const ctx = el.getContext("2d");
                      el.width = canvasSize; el.height = canvasSize;
                      const dimColor = "#14141f";
                      const tileRow = Math.floor(currentPuzzle / 5);
                      const tileCol = currentPuzzle % 5;
                      for (let r = 0; r < gs; r++) {
                        for (let c = 0; c < (grid[r]?.length || 0); c++) {
                          const tr = Math.floor(r / 5); const tc = Math.floor(c / 5);
                          const tileIdx = tr * 5 + tc;
                          const isCurrentTile = (tr === tileRow && tc === tileCol);
                          const effectiveProgress = isCoopMosaic ? { ...customMosaicProgress, ...coopMosaicSharedProgress } : customMosaicProgress;
                          const tileSolved = (effectiveProgress[tileIdx] || 0) > 0;
                          if (isCurrentTile) {
                            const localR = r - tileRow * 5; const localC = c - tileCol * 5;
                            const cellKey = `${localR}-${localC}`;
                            const puz = customMosaicPuzzlesRef.current?.[currentPuzzle];
                            if (puz) {
                              const isBlankCell = puz.blanks.has(cellKey);
                              if (!isBlankCell || tileSolved) { ctx.fillStyle = grid[r][c] || dimColor; }
                              else if (fills[cellKey]) {
                                const parsed = fills[cellKey].split("|");
                                ctx.fillStyle = parsed.length >= 2 ? parsed[1] : grid[r][c] || dimColor;
                              } else { ctx.fillStyle = dimColor + "88"; }
                            } else { ctx.fillStyle = grid[r][c] || dimColor; }
                          } else if (tileSolved) { ctx.fillStyle = grid[r][c] || dimColor; }
                          else { ctx.fillStyle = dimColor; }
                          ctx.fillRect(c * cellSz, r * cellSz, cellSz, cellSz);
                        }
                      }
                      ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
                      ctx.strokeRect(tileCol * 5 * cellSz, tileRow * 5 * cellSz, 5 * cellSz, 5 * cellSz);
                    }} style={{ borderRadius: 8, border: `1px solid ${C.border}`, width: canvasSize, height: canvasSize, display: "block" }} />
                  </div>
                </>
              );
            })() : isAchievementsView ? (() => {
              const achievements = computeAchievements(progress, times, savedAchievementIds);
              const unlocked = achievements.filter(a => a.unlocked).length;
              const total = achievements.length;
              const tierColors = { 1: C.bronze, 2: C.silver, 3: C.gold };
              const tierSymbols = { 1: "\u25C6", 2: "\u25CF", 3: "\u2605" };
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent, marginBottom: 4, textAlign: "center", letterSpacing: 2 }}>
                      Achievements
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>{unlocked}/{total} unlocked</div>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: C.surfaceLight, marginBottom: 16, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, backgroundColor: C.accent, width: `${(unlocked / total) * 100}%`, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {achievements.map(a => {
                        const tc = tierColors[a.tier] || C.textDim;
                        const ts = tierSymbols[a.tier] || "";
                        return (
                          <div key={a.id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                            borderRadius: 10, backgroundColor: a.unlocked ? tc + "12" : C.surface,
                            border: `1px solid ${a.unlocked ? tc + "44" : C.border}`,
                            opacity: a.unlocked ? 1 : 0.5,
                          }}>
                            <span style={{ fontSize: 14, color: tc, fontFamily: "'Inter', sans-serif" }}>{ts}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: a.unlocked ? C.text : C.textDim }}>{a.label}</div>
                              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{a.desc}</div>
                            </div>
                            {a.unlocked && <span style={{ fontSize: 10, color: tc, fontFamily: "'Inter', sans-serif" }}>{"\u2713"}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })() : isFriendsView ? (() => {
              // Friends modal
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Friends</div>
                        {/* Add friend input */}
                        <div style={{ display: "flex", gap: 6, marginBottom: addFriendMsg ? 4 : 12 }}>
                          <input
                            type="text"
                            placeholder="Add friend by username..."
                            value={addFriendInput}
                            onChange={(e) => setAddFriendInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && addFriendInput.trim()) handleAddFriend(); }}
                            style={{
                              flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: 13,
                              fontFamily: "'Inter', sans-serif",
                              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: C.text,
                              outline: "none", boxSizing: "border-box",
                            }}
                          />
                          <button
                            onClick={handleAddFriend}
                            disabled={!addFriendInput.trim() || addFriendLoading}
                            style={{
                              padding: "10px 14px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                              fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                              background: addFriendInput.trim() ? C.accent : "rgba(255,255,255,0.06)",
                              color: addFriendInput.trim() ? C.bg : C.textDim,
                              border: "none", cursor: addFriendInput.trim() ? "pointer" : "not-allowed",
                              textTransform: "uppercase", flexShrink: 0,
                            }}
                          >
                            {addFriendLoading ? "..." : "Add"}
                          </button>
                        </div>
                        {addFriendMsg && (
                          <div style={{ fontSize: 11, color: addFriendMsg.includes("added") ? C.correct : C.textDim, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                            {addFriendMsg}
                          </div>
                        )}
                        {/* Friends list */}
                        <div style={{ maxHeight: 230, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                          {friendsList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontSize: 11 }}>No friends yet. Add one above!</div>
                          ) : (
                            (() => {
                              // Sort friends: online first, then offline
                              const sortedFriends = [...friendsList].sort((a, b) => {
                                const aPresence = friendPresence[a.uid];
                                const bPresence = friendPresence[b.uid];
                                const aOnline = aPresence && aPresence.lastSeen && (Date.now() - aPresence.lastSeen) < 120000;
                                const bOnline = bPresence && bPresence.lastSeen && (Date.now() - bPresence.lastSeen) < 120000;
                                if (aOnline && !bOnline) return -1;
                                if (!aOnline && bOnline) return 1;
                                return 0;
                              });

                              return sortedFriends.map(friend => {
                                const presence = friendPresence[friend.uid];
                                const stats = friendStats[friend.uid];
                                const isOnline = presence && presence.lastSeen && (Date.now() - presence.lastSeen) < 120000;
                                const isPlaying = isOnline && presence.status === "playing" && presence.currentMode;
                                const currentSession = presence?.currentCoopSessionId;
                                const showingConfirm = removeFriendConfirm === friend.uid;

                                // Format activity text
                                let activityText = "";
                                let activityColor = C.textDim;
                                if (!isOnline) {
                                  activityText = "Offline";
                                } else if (isPlaying) {
                                  const modeName = presence.currentMode === "easy" ? "Easy" :
                                                   presence.currentMode === "medium" ? "Medium" :
                                                   presence.currentMode === "hard" ? "Hard" :
                                                   presence.currentMode === "cascade" ? "Cascade" :
                                                   presence.currentMode === "daily" ? "Daily" :
                                                   presence.currentMode === "mosaic" ? "Mosaic" :
                                                   presence.currentMode;
                                  activityText = currentSession ? `Playing ${modeName} (Co-op)` : `Playing ${modeName}`;
                                  activityColor = C.correct;
                                } else {
                                  activityText = "Online";
                                  activityColor = "#06B6D4";
                                }

                                // Helper: format time ago
                                const fmtTimeAgo = (ts) => {
                                  if (!ts) return "Never";
                                  const diff = Date.now() - ts;
                                  if (diff < 60000) return "Just now";
                                  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                                  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                                  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
                                  return new Date(ts).toLocaleDateString();
                                };

                                return (
                                  <div key={friend.uid} style={{
                                    padding: "12px 14px", borderRadius: 12,
                                    backgroundColor: C.surface, border: `1px solid ${showingConfirm ? C.incorrect : (isOnline ? C.correct + "44" : C.border)}`,
                                    transition: "all 0.2s",
                                  }}>
                                    {showingConfirm ? (
                                      // Inline confirmation view
                                      <div>
                                        <div style={{
                                          fontFamily: "'Inter', sans-serif",
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: C.text,
                                          marginBottom: 8,
                                        }}>
                                          Remove <strong>{friend.username}</strong>?
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                          <button
                                            onClick={() => setRemoveFriendConfirm(null)}
                                            style={{
                                              flex: 1,
                                              padding: "6px 12px",
                                              borderRadius: 6,
                                              fontSize: 10,
                                              fontWeight: 700,
                                              fontFamily: "'Inter', sans-serif",
                                              textTransform: "uppercase",
                                              letterSpacing: 0.5,
                                              backgroundColor: C.surface,
                                              border: `1px solid ${C.border}`,
                                              color: C.text,
                                              cursor: "pointer",
                                              transition: "all 0.15s",
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.surfaceLight; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.surface; }}
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleRemoveFriend(friend.uid)}
                                            style={{
                                              flex: 1,
                                              padding: "6px 12px",
                                              borderRadius: 6,
                                              fontSize: 10,
                                              fontWeight: 700,
                                              fontFamily: "'Inter', sans-serif",
                                              textTransform: "uppercase",
                                              letterSpacing: 0.5,
                                              backgroundColor: C.incorrect,
                                              border: "none",
                                              color: "#fff",
                                              cursor: "pointer",
                                              transition: "all 0.15s",
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.opacity = 0.9; }}
                                            onMouseLeave={e => { e.currentTarget.style.opacity = 1; }}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      // Normal friend card view
                                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        {/* Online indicator dot */}
                                        <div style={{
                                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                                          backgroundColor: isOnline ? C.correct : C.textDim + "44",
                                          boxShadow: isOnline ? `0 0 8px ${C.correct}66` : "none",
                                        }} />

                                        {/* Profile picture */}
                                        <div style={{ position: "relative", flexShrink: 0 }}>
                                          {friend.profilePicture ? (
                                            <img src={friend.profilePicture} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                                          ) : (
                                            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: C.accent + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.accent, fontWeight: 700 }}>
                                              {(friend.username || "?")[0].toUpperCase()}
                                            </div>
                                          )}
                                        </div>

                                        {/* User info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                            <span style={{
                                              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text,
                                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                            }}>
                                              {friend.username}
                                            </span>
                                            {isPlaying && (
                                              <span style={{
                                                fontSize: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                                color: C.bg, backgroundColor: C.correct, padding: "1px 5px", borderRadius: 3,
                                                textTransform: "uppercase", letterSpacing: 0.5,
                                              }}>
                                                Playing
                                              </span>
                                            )}
                                            {isOnline && !isPlaying && (
                                              <span style={{
                                                fontSize: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                                color: C.bg, backgroundColor: "#06B6D4", padding: "1px 5px", borderRadius: 3,
                                                textTransform: "uppercase", letterSpacing: 0.5,
                                              }}>
                                                Online
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: 10, color: activityColor, fontFamily: "'Inter', sans-serif", marginBottom: 3 }}>
                                            {activityText}
                                          </div>
                                          {/* Stats row */}
                                          {stats && (
                                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                                              <span style={{ fontSize: 9, fontFamily: "'Inter', sans-serif", color: C.accent }}>
                                                {stats.totalSolved} solved
                                              </span>
                                              <span style={{ fontSize: 9, fontFamily: "'Inter', sans-serif", color: C.gold }}>
                                                {stats.achievements} achievements
                                              </span>
                                              {stats.updatedAt > 0 && (
                                                <span style={{ fontSize: 9, fontFamily: "'Inter', sans-serif", color: C.textDim }}>
                                                  Synced {fmtTimeAgo(stats.updatedAt)}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {/* Mode breakdown */}
                                          {stats && stats.totalSolved > 0 && (
                                            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                                              {["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"]
                                                .filter(mode => (stats.progress[mode] || 0) > 0)
                                                .map(mode => (
                                                  <span key={mode} style={{
                                                    fontSize: 8, fontFamily: "'Inter', sans-serif",
                                                    color: C.textDim, backgroundColor: C.surfaceLight,
                                                    padding: "1px 4px", borderRadius: 3,
                                                  }}>
                                                    {mode}: {stats.progress[mode]}
                                                  </span>
                                                ))
                                              }
                                            </div>
                                          )}
                                        </div>

                                        {/* Action buttons */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                                          {currentSession && (
                                            <button onClick={async () => {
                                              // Join friend's coop session
                                              if (currentSession && presence.currentMode && presence.currentPuzzle) {
                                                const mode = presence.currentMode;
                                                const puzzleId = presence.currentPuzzle;

                                                // Set up coop session
                                                setCoopSessionId(currentSession);
                                                setCoopRole("guest");
                                                setCoopStatus("playing");
                                                setDifficulty(mode);

                                                // Set puzzle based on mode
                                                if (mode === "daily") {
                                                  setDailyDate(puzzleId);
                                                  setCurrentDailyDate(puzzleId);
                                                } else if (mode === "cascade") {
                                                  setCascadeRunIndex(parseInt(puzzleId) || 0);
                                                } else {
                                                  setCurrentPuzzle(parseInt(puzzleId) || 0);
                                                }

                                                // Close menu and load puzzle
                                                setRadialMenuStack(["root"]);

                                                // Try to join the session in Firebase
                                                if (firebaseUser && username) {
                                                  joinCoopSession(currentSession, firebaseUser.uid, username).catch(() => {});
                                                }
                                              }
                                            }} style={{
                                              padding: "4px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                                              fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                                              background: C.correct + "22", color: C.correct,
                                              border: "none", cursor: "pointer", textTransform: "uppercase",
                                            }}>Join</button>
                                          )}
                                          <button
                                            onClick={() => setRemoveFriendConfirm(friend.uid)}
                                            title="Remove friend"
                                            style={{
                                              width: 24, height: 24, borderRadius: 6,
                                              backgroundColor: "transparent",
                                              border: `1px solid ${C.border}`,
                                              color: C.textDim,
                                              cursor: "pointer",
                                              display: "flex", alignItems: "center", justifyContent: "center",
                                              transition: "all 0.15s",
                                              flexShrink: 0,
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = C.incorrect; e.currentTarget.style.color = C.incorrect; e.currentTarget.style.backgroundColor = C.incorrect + "11"; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
                                          >
                                            <X size={14} strokeWidth={2.5} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                  </div>
                </>
              );
            })() : isShareStats ? (() => {
              const { sections, totalSolved, totalGold, totalSilver, totalBronze, totalFailed, bestTimeAll } = getShareData();
              const gridColors = { none: C.border, failed: C.incorrect, gold: C.gold, silver: C.silver, bronze: C.bronze };
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent, marginBottom: 4, textAlign: "center", letterSpacing: 2 }}>Agnus</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>my stats</div>
                    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 16, padding: "10px 16px", borderRadius: 10, backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                      {[{ label: "Solved", value: totalSolved, color: C.correct }, { label: "Best", value: bestTimeAll ? formatTime(bestTimeAll) : "--", color: C.gold }].map((stat, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: stat.color, fontFamily: "'Inter', sans-serif" }}>{stat.value}</div>
                          <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button onClick={copyShareText} style={{
                        flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: C.accent, color: C.bg, border: "none",
                        cursor: "pointer", textTransform: "uppercase",
                      }}>Share All</button>
                      <button onClick={copyDailyShareText} style={{
                        flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: "rgba(255,255,255,0.08)", color: C.text, border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer", textTransform: "uppercase",
                      }}>Share Daily</button>
                    </div>
                  </div>
                </>
              );
            })() : isUsernameEdit ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Change Username</div>
                    {!username && (
                      <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        color: C.accent,
                        marginBottom: 12,
                        padding: "8px 12px",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.12)"
                      }}>Must have a username to continue</div>
                    )}
                    <input
                      type="text"
                      placeholder="Enter new username..."
                      value={usernameInput}
                      onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20); setUsernameInput(v); checkUsernameDebounced(v); }}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif",
                        outline: "none", boxSizing: "border-box", marginBottom: 12,
                      }}
                    />
                    {usernameInput && (
                      <div style={{
                        fontSize: 11, marginBottom: 12,
                        color: usernameAvailable === true ? C.correct : usernameAvailable === false ? C.incorrect : C.textDim,
                      }}>
                        {usernameAvailable === true ? "✓ Available" : usernameAvailable === false ? "✗ Taken" : "Checking..."}
                      </div>
                    )}
                    <button
                      onClick={handleSaveUsername}
                      disabled={!usernameInput || usernameAvailable !== true}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: C.accent, color: C.bg, border: "none",
                        cursor: (!usernameInput || usernameAvailable !== true) ? "not-allowed" : "pointer",
                        opacity: (!usernameInput || usernameAvailable !== true) ? 0.5 : 1,
                        textTransform: "uppercase",
                      }}
                    >Save Username</button>
                  </div>
                </>
              );
            })() : isBirthdayEdit ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, textAlign: "center" }}>🎂</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, textAlign: "center" }}>Set Your Birthday</div>
                    <input
                      type="date"
                      defaultValue={birthday ? (() => {
                        const [d, m, y] = birthday.split("-");
                        return `${y}-${m}-${d}`;
                      })() : ""}
                      max={getMaxBirthdayDate()}
                      id="birthday-date-input"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                        color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif",
                        outline: "none", boxSizing: "border-box", marginBottom: 12,
                        colorScheme: "dark",
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById("birthday-date-input");
                        if (input && input.value) handleSaveBirthday(input.value);
                      }}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: C.accent, color: C.bg, border: "none",
                        cursor: "pointer", textTransform: "uppercase", marginBottom: 8,
                      }}
                    >Save Birthday</button>
                    {birthday && (
                      <button
                        onClick={handleRemoveBirthday}
                        style={{
                          width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                          background: "rgba(255,255,255,0.08)", color: C.text, border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer", textTransform: "uppercase",
                        }}
                      >Remove Birthday</button>
                    )}
                  </div>
                </>
              );
            })() : isDeleteAccount ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.incorrect, marginBottom: 12 }}>Delete Account</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12, padding: "12px", borderRadius: 8, backgroundColor: C.incorrect + "18", border: `1px solid ${C.incorrect}44` }}>
                      ⚠️ This action cannot be undone. All your progress, mosaics, and account data will be permanently deleted.
                    </div>
                    {firebaseUser && !firebaseUser.providerData?.some(p => p.providerId === "google.com") && (
                      <>
                        <input
                          type="password"
                          placeholder="Enter password to confirm..."
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          style={{
                            width: "100%", padding: "10px 14px", borderRadius: 8,
                            backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                            color: C.text, fontSize: 13, fontFamily: "'Inter', sans-serif",
                            outline: "none", boxSizing: "border-box", marginBottom: 12,
                          }}
                        />
                        {accountError && (
                          <div style={{
                            padding: "6px 10px", borderRadius: 6, marginBottom: 8,
                            backgroundColor: C.incorrect + "18", border: `1px solid ${C.incorrect}44`,
                            fontSize: 10, color: C.incorrect, textAlign: "center",
                          }}>
                            {accountError}
                          </div>
                        )}
                      </>
                    )}
                    <button
                      onClick={handleDeleteAccount}
                      disabled={accountLoading || (!firebaseUser.providerData?.some(p => p.providerId === "google.com") && !accountPassword)}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: C.incorrect, color: "#fff", border: "none",
                        cursor: (accountLoading || (!firebaseUser.providerData?.some(p => p.providerId === "google.com") && !accountPassword)) ? "not-allowed" : "pointer",
                        opacity: (accountLoading || (!firebaseUser.providerData?.some(p => p.providerId === "google.com") && !accountPassword)) ? 0.5 : 1,
                        textTransform: "uppercase",
                      }}
                    >{accountLoading ? "Deleting..." : "Delete Account"}</button>
                  </div>
                </>
              );
            })() : isClearConfirm ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.incorrect, marginBottom: 12 }}>Clear All Data</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16, padding: "16px", borderRadius: 8, backgroundColor: C.incorrect + "18", border: `1px solid ${C.incorrect}44`, textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
                      <div>This will permanently delete all your local progress, achievements, and game data. This action cannot be undone.</div>
                    </div>
                    <button
                      onClick={handleClearData}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: C.incorrect, color: "#fff", border: "none",
                        cursor: "pointer", textTransform: "uppercase", marginBottom: 8,
                      }}
                    >Clear Everything</button>
                    <button
                      onClick={() => setRadialMenuStack(prev => prev.slice(0, -1))}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: "rgba(255,255,255,0.08)", color: C.text, border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer", textTransform: "uppercase",
                      }}
                    >Cancel</button>
                  </div>
                </>
              );
            })() : isCreatorConfirm ? (() => {
              const isClear = creatorConfirmAction?.type === "clear";
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                      {isClear ? "Clear Canvas" : "Leave Creator"}
                    </div>
                    <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16, padding: "14px 16px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center", lineHeight: 1.5 }}>
                      {isClear
                        ? "This will clear your entire canvas. Any unsaved work will be lost."
                        : "You have unsaved work on the canvas. Are you sure you want to leave?"}
                    </div>
                    <button
                      onClick={() => {
                        if (isClear) {
                          resetCreator();
                        } else if (creatorConfirmAction?.action) {
                          creatorConfirmAction.action();
                        }
                        setCreatorConfirmAction(null);
                        setRadialMenuStack([]);
                      }}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: isClear ? C.incorrect : C.accent, color: "#fff", border: "none",
                        cursor: "pointer", textTransform: "uppercase", marginBottom: 8,
                      }}
                    >{isClear ? "Clear Canvas" : "Leave"}</button>
                    <button
                      onClick={() => { setCreatorConfirmAction(null); setRadialMenuStack(prev => prev.slice(0, -1)); }}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: "rgba(255,255,255,0.08)", color: C.text, border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer", textTransform: "uppercase",
                      }}
                    >Cancel</button>
                  </div>
                </>
              );
            })() : isCreatorPostSave ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                      Mosaic Saved!
                    </div>
                    <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16, padding: "14px 16px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center", lineHeight: 1.5 }}>
                      Would you like to submit your mosaic for review to be published?
                    </div>
                    <button
                      onClick={() => {
                        const mosaic = myMosaics.find(m => m.id === creatorEditingId);
                        if (mosaic) handleSubmitForReview(mosaic);
                        setRadialMenuStack([]);
                        resetCreator();
                        setMosaicGalleryTab("mine");
                        setView("gallery");
                        loadMosaicData("mine");
                      }}
                      disabled={mosaicLoading}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: C.accent, color: "#fff", border: "none",
                        cursor: mosaicLoading ? "default" : "pointer", textTransform: "uppercase", marginBottom: 8,
                        opacity: mosaicLoading ? 0.5 : 1,
                      }}
                    >Submit for Review</button>
                    <button
                      onClick={() => {
                        setRadialMenuStack([]);
                        resetCreator();
                        setMosaicGalleryTab("mine");
                        setView("gallery");
                        loadMosaicData("mine");
                      }}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: "rgba(255,255,255,0.08)", color: C.text, border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer", textTransform: "uppercase",
                      }}
                    >Done</button>
                  </div>
                </>
              );
            })() : isProfileView ? (() => {
              const syncEnabled = firebaseConfigured && !!firebaseUser;
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16, textAlign: "center" }}>Profile</div>
                    {/* Profile picture */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
                      {profilePicture ? (
                        <img src={profilePicture} alt="Profile" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }} />
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: C.accent + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: C.accent, fontWeight: 700, marginBottom: 8 }}>
                          {(username || firebaseUser?.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <label htmlFor="profile-pic-upload" style={{
                        fontSize: 10, color: C.accent, fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                      }}>Change Photo</label>
                      <input id="profile-pic-upload" type="file" accept="image/*" onChange={handleProfilePictureUpload} style={{ display: "none" }} />
                    </div>
                    {/* User info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Username</div>
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{username || "Not set"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Email</div>
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{firebaseUser?.email || "Not set"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Cloud Sync</div>
                        <div style={{ fontSize: 14, color: syncEnabled ? C.correct : C.textDim, fontWeight: 600 }}>{syncEnabled ? "✓ Enabled" : "Disabled"}</div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })() : isThemeList ? (() => {
              const achList = computeAchievements(progress, times, savedAchievementIds);
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Themes</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginBottom: 12 }}>Unlock themes through achievements or play on themed days</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                              width: "100%", padding: "12px 14px", borderRadius: 12,
                              backgroundColor: isActive ? (theme.gridBg || C.surface) : C.surface,
                              border: isActive ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                              cursor: unlocked ? "pointer" : "default",
                              display: "flex", alignItems: "center", gap: 12,
                              transition: "all 0.15s",
                              opacity: unlocked ? 1 : 0.5,
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              backgroundColor: theme.gridBg || C.surfaceLight,
                              border: `1.5px solid ${theme.gridBorder || C.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                              flexWrap: "wrap", padding: 4, position: "relative", overflow: "hidden",
                            }}>
                              {theme.icon ? (
                                <span style={{ fontSize: 16, lineHeight: 1 }}>{theme.icon}</span>
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
                                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                    <rect x="2" y="6" width="10" height="7" rx="1.5" fill="none" stroke={C.textDim} strokeWidth="1.5"/>
                                    <path d="M4.5,6 V4 C4.5,2.3 5.6,1 7,1 C8.4,1 9.5,2.3 9.5,4 V6" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                              <div style={{
                                fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                                color: isActive ? C.accent : C.text, letterSpacing: 0.5,
                                display: "flex", alignItems: "center", gap: 6,
                              }}>
                                {theme.name}
                                {isActive && <span style={{ fontSize: 9, color: C.accent, fontWeight: 400 }}>(active)</span>}
                              </div>
                              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                                {!unlocked ? unlockHint : theme.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })() : isSyncChoice ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Sync Conflict</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>
                      Your local progress differs from cloud. Choose which to keep:
                    </div>
                    {syncChoiceData && (
                      <>
                        <button onClick={() => handleSyncChoice("local")} style={{
                          width: "100%", padding: "12px", borderRadius: 10, marginBottom: 8,
                          backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`,
                          cursor: "pointer", textAlign: "left",
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>Keep Local</div>
                          <div style={{ fontSize: 10, color: C.textDim }}>Local progress: {syncChoiceData.localSolved} puzzles</div>
                        </button>
                        <button onClick={() => handleSyncChoice("cloud")} style={{
                          width: "100%", padding: "12px", borderRadius: 10, marginBottom: 8,
                          backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`,
                          cursor: "pointer", textAlign: "left",
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>Keep Cloud</div>
                          <div style={{ fontSize: 10, color: C.textDim }}>Cloud progress: {syncChoiceData.cloudSolved} puzzles</div>
                        </button>
                        <button onClick={() => handleSyncChoice("merge")} style={{
                          width: "100%", padding: "12px", borderRadius: 10,
                          backgroundColor: C.accent + "22", border: `1px solid ${C.accent}`,
                          cursor: "pointer", textAlign: "left",
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 4 }}>Merge Both</div>
                          <div style={{ fontSize: 10, color: C.textDim }}>Combine best results from both</div>
                        </button>
                      </>
                    )}
                  </div>
                </>
              );
            })() : isCoopCreate ? (() => {
              const coopModes = DIFFICULTIES.filter(d => d.key !== "daily" && d.key !== "mosaic");
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Create Session</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Choose a mode and puzzle, then start</div>

                    {/* Mode selection */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Game Mode</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {[...coopModes, { key: "mosaic", label: "Mosaic" }].map(d => (
                          <button key={d.key} onClick={() => { setCoopSetupMode(d.key); setCoopSetupLevel(0); setCoopSetupMosaic(null); }}
                            style={{
                              padding: "8px 14px", borderRadius: 10,
                              background: coopSetupMode === d.key ? C.coop : "rgba(255,255,255,0.04)",
                              color: coopSetupMode === d.key ? "#fff" : C.textDim,
                              border: `1px solid ${coopSetupMode === d.key ? C.coop : "rgba(255,255,255,0.08)"}`,
                              cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
                              transition: "all 0.15s",
                            }}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Puzzle selection */}
                    {coopSetupMode && coopSetupMode !== "cascade" && coopSetupMode !== "mosaic" && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Puzzle #{coopSetupLevel + 1}</div>
                        <input type="range" min={0} max={49} value={coopSetupLevel}
                          onChange={e => setCoopSetupLevel(Number(e.target.value))}
                          style={{ width: "100%", accentColor: C.coop }} />
                      </div>
                    )}

                    {/* Start button */}
                    <button
                      disabled={!coopSetupMode || coopSetupStarting || (coopSetupMode === "mosaic" && !coopSetupMosaic)}
                      onClick={async () => {
                        if (!coopSetupMode) return;
                        setCoopSetupStarting(true);
                        try {
                          if (coopSetupMode === "mosaic") {
                            await startCoopMosaicSession({ mosaicOverride: coopSetupMosaic });
                          } else {
                            setDifficulty(coopSetupMode);
                            const level = coopSetupMode === "cascade" ? 0 : coopSetupLevel;
                            startPuzzle(level, coopSetupMode);
                            setView("play");
                            setTimeout(() => {
                              startCoopSession();
                              // Close menu and open coop-start invite panel after starting session
                              setTimeout(() => {
                                setCoopSelectedFriends(new Set());
                                setRadialMenuStack(["root", "coop-start"]);
                              }, 300);
                            }, 300);
                          }
                        } catch { /* ignore */ }
                        setCoopSetupStarting(false);
                      }}
                      style={{
                        width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                        fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        background: (coopSetupMode && !(coopSetupMode === "mosaic" && !coopSetupMosaic)) ? C.coop : "rgba(255,255,255,0.08)",
                        color: (coopSetupMode && !(coopSetupMode === "mosaic" && !coopSetupMosaic)) ? "#fff" : C.textDim,
                        border: "none", cursor: (coopSetupMode && !(coopSetupMode === "mosaic" && !coopSetupMosaic)) ? "pointer" : "default",
                        opacity: coopSetupStarting ? 0.6 : 1, transition: "all 0.15s",
                      }}>
                      {coopSetupStarting ? "Starting..." : "Start & Invite"}
                    </button>
                  </div>
                </>
              );
            })() : isCoopActive ? (() => {
              const activeSessions = activeCoopSessions.filter(s => s.status !== "complete");
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Active Sessions</div>
                    {activeSessions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: 12, color: C.textDim }}>No active sessions</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                        {activeSessions.map(session => {
                          const isHost = session.hostUid === firebaseUser.uid;
                          const isMosaicSession = session._type === "mosaic";
                          const isVaultSession = session._type === "vault";
                          return (
                            <div key={session.id} style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                              borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)",
                              border: `1px solid rgba(255,255,255,0.08)`,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {isVaultSession ? `Vault (${(VAULT_DIFFICULTIES[session.difficulty] || {}).label || "Silver"})` : isMosaicSession ? (session.mosaicTitle || "Mosaic") : `${(DIFFICULTIES.find(d => d.key === session.mode)?.label) || session.mode} #${(session.level ?? 0) + 1}`}
                                </div>
                                <div style={{ fontSize: 10, color: session.status === "playing" ? C.coop : C.textDim, fontFamily: "'Inter', sans-serif" }}>
                                  {session.status === "waiting" ? "Waiting" : session.status === "complete" ? "Complete" : "In progress"}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                <button
                                  onClick={() => {
                                    if (isVaultSession) {
                                      setVaultSessionId(session.id);
                                      setVaultRole(session.hostUid === firebaseUser.uid ? "host" : "guest");
                                      setView("vault");
                                      setRadialMenuStack([]);
                                    } else if (isMosaicSession) {
                                      rejoinCoopMosaicSession(session);
                                    } else {
                                      rejoinCoopSession(session);
                                    }
                                  }}
                                  style={{
                                    background: C.coop, border: "none", borderRadius: 8,
                                    padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 10,
                                    fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: 0.5,
                                  }}>
                                  Rejoin
                                </button>
                                {isHost && (
                                  <button
                                    onClick={() => {
                                      if (isVaultSession) {
                                        const playerUids = session.players ? Object.keys(session.players) : [firebaseUser.uid];
                                        closeVaultSession(session.id, playerUids).then(() => loadActiveCoopSessions()).catch(() => {});
                                      } else if (isMosaicSession) {
                                        closeCoopMosaicSessionPermanently(session.id, session);
                                      } else {
                                        closeCoopSessionPermanently(session.id, session);
                                      }
                                    }}
                                    style={{
                                      background: "none", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8,
                                      padding: "8px 10px", color: C.textDim, cursor: "pointer", fontSize: 10,
                                      fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                                    }}
                                    title="Close session"
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = C.textDim; }}
                                  >✕</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })() : isCoopCompleted ? (() => {
              const completedSessions = activeCoopSessions.filter(s => s.status === "complete");
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Completed</div>
                    {completedSessions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: 12, color: C.textDim }}>No completed sessions</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                        {completedSessions.map(session => {
                          const isMosaicSession = session._type === "mosaic";
                          return (
                            <div key={session.id} style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                              borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(84, 212, 152, 0.15)",
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {isMosaicSession ? (session.mosaicTitle || "Mosaic") : `${(DIFFICULTIES.find(d => d.key === session.mode)?.label) || session.mode} #${(session.level ?? 0) + 1}`}
                                </div>
                                <div style={{ fontSize: 10, color: C.correct, fontFamily: "'Inter', sans-serif" }}>
                                  ✓ Complete
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })() : isNotificationsView ? (() => {
              return (
                <>
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Notifications</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                      {notifications.map(notif => (
                        <div key={notif.id} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                          borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)",
                          border: `1px solid rgba(255,255,255,0.08)`,
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                            backgroundColor: (notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") ? C.coop + "22" : notif.type === "mosaic_pending_review" ? "#FFE66D22" : "#54A0FF22",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: `1.5px solid ${(notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") ? C.coop + "44" : notif.type === "mosaic_pending_review" ? "#FFE66D44" : "#54A0FF44"}`,
                          }}>
                            <span style={{ fontSize: 12, color: (notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") ? C.coop : notif.type === "mosaic_pending_review" ? "#FFE66D" : "#54A0FF" }}>
                              {notif.type === "vault_invite" ? "\uD83D\uDD12" : notif.type === "coop_invite" ? "\u2694" : notif.type === "coop_mosaic_invite" ? "\u25A6" : notif.type === "mosaic_pending_review" ? "\uD83D\uDEA9" : "\u25A6"}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600, color: C.text, lineHeight: 1.3 }}>
                              {notif.type === "vault_invite"
                                ? `${notif.fromUsername || "Someone"} invited you to a vault`
                                : notif.type === "coop_invite"
                                ? `${notif.fromUsername || "Someone"} invited you to co-op`
                                : notif.type === "coop_mosaic_invite"
                                ? `${notif.fromUsername || "Someone"} invited you to mosaic`
                                : notif.type === "mosaic_pending_review"
                                ? `${notif.fromUsername || "Someone"} submitted a mosaic for review`
                                : `${notif.fromUsername || "Someone"} shared`
                              }
                            </div>
                            {notif.type === "vault_invite" && notif.data?.difficulty && (
                              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                                {(VAULT_DIFFICULTIES[notif.data.difficulty] || {}).label || notif.data.difficulty}
                              </div>
                            )}
                            {notif.type === "coop_invite" && notif.data?.mode && (
                              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                                {notif.data.mode} #{(notif.data.level ?? 0) + 1}
                              </div>
                            )}
                            {notif.type === "coop_mosaic_invite" && notif.data?.mosaicTitle && (
                              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                                "{notif.data.mosaicTitle}"
                              </div>
                            )}
                            {(notif.type === "mosaic_shared" || notif.type === "mosaic_pending_review") && notif.data?.title && (
                              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                                "{notif.data.title}"
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            {notif.type === "vault_invite" && notif.data?.sessionId && (
                              <button
                                onClick={() => {
                                  setVaultSessionId(notif.data.sessionId);
                                  setVaultRole("guest");
                                  setView("vault");
                                  setRadialMenuStack([]);
                                  dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                                  setMenuOpen(false);
                                }}
                                style={{
                                  background: C.coop, border: "none", borderRadius: 6,
                                  padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 9,
                                  fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                }}
                              >
                                Join
                              </button>
                            )}
                            {notif.type === "coop_invite" && notif.data?.sessionId && (
                              <button
                                onClick={async () => {
                                  // Join the coop session
                                  const session = await loadCoopSession(notif.data.sessionId);
                                  if (session && session.status !== "complete") {
                                    setDifficulty(session.mode);
                                    setCurrentPuzzle(session.level ?? 0);
                                    if (session.dailyDate) setCurrentDailyDate(session.dailyDate);
                                    setCoopSessionId(session.id);
                                    setCoopRole("guest");
                                    setCoopStatus("joining");
                                    coopJoiningRef.current = true;
                                    setFills({});
                                    setAttempts(0);
                                    setGameState("playing");
                                    setWrongCells(new Set());
                                    setLockedCells(new Set());
                                    setShowParticles(false);
                                    setSelectedCell(null);
                                    setSelectedToken(null);
                                    setView("play");
                                  }
                                  dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                                  setMenuOpen(false);
                                }}
                                style={{
                                  background: C.coop, border: "none", borderRadius: 6,
                                  padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 9,
                                  fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                }}
                              >
                                Join
                              </button>
                            )}
                            {notif.type === "coop_mosaic_invite" && notif.data?.sessionId && (
                              <button
                                onClick={() => {
                                  setCoopMosaicSessionId(notif.data.sessionId);
                                  setCoopMosaicRole("guest");
                                  setCoopMosaicStatus("joining");
                                  coopMosaicJoiningRef.current = true;
                                  dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                                  setMenuOpen(false);
                                }}
                                style={{
                                  background: C.coop, border: "none", borderRadius: 6,
                                  padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 9,
                                  fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                }}
                              >
                                Join
                              </button>
                            )}
                            {notif.type === "mosaic_shared" && (
                              <button
                                onClick={() => {
                                  dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                                  setMosaicGalleryTab("shared");
                                  loadMosaicData("shared");
                                  setView("gallery");
                                  setMenuOpen(false);
                                }}
                                style={{
                                  background: C.accent, border: "none", borderRadius: 6,
                                  padding: "4px 8px", color: C.bg, cursor: "pointer", fontSize: 9,
                                  fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                }}
                              >
                                View
                              </button>
                            )}
                            {notif.type === "mosaic_pending_review" && (
                              <button
                                onClick={() => {
                                  dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                                  loadMosaicData("admin");
                                  setView("admin-review");
                                  setMenuOpen(false);
                                }}
                                style={{
                                  background: "#FFE66D", border: "none", borderRadius: 6,
                                  padding: "4px 8px", color: C.bg, cursor: "pointer", fontSize: 9,
                                  fontFamily: "'Inter', sans-serif", fontWeight: 700,
                                }}
                              >
                                Review
                              </button>
                            )}
                            <button
                              onClick={() => { dismissNotification(firebaseUser.uid, notif.id).catch(() => {}); }}
                              style={{
                                background: "none", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 6,
                                padding: "4px 6px", color: C.textDim, cursor: "pointer", fontSize: 9,
                              }}
                              title="Dismiss"
                            >{"\u2715"}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })() : isCoopStartMenu ? (() => {
              const isVaultSession = isCoopFromVault;
              const isMosaicSession = !isVaultSession && (isCoopFromMosaic || (isCoopMosaic && !!coopMosaicSessionId));
              const activeSessionId = isVaultSession ? vaultSessionId : isMosaicSession ? coopMosaicSessionId : coopSessionId;
              const hasSession = !!activeSessionId;
              const baseUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
              const inviteUrl = hasSession ? (isVaultSession
                ? `${baseUrl}?vault=${activeSessionId}`
                : isMosaicSession
                ? `${baseUrl}?coopMosaic=${activeSessionId}`
                : `${baseUrl}?mode=${difficulty}&level=${currentPuzzle}&coop=${activeSessionId}`
              ) : "";
              const activePlayers = isVaultSession ? (vaultSessionDataRef.current?.players || {}) : isMosaicSession ? coopMosaicPlayers : coopPlayers;
              const invitedUids = isVaultSession ? vaultInvitedUids : isMosaicSession ? coopMosaicInvitedUids : coopInvitedUids;
              return (
                <>
                  {/* Coop friend picker / invite content */}
                  <div style={{
                    padding: "0 16px 12px",
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(8px)",
                    transition: isOpen
                      ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                      : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{hasSession ? (isVaultSession ? "Vault Session" : "Co-op Session") : "Start Co-op"}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: hasSession ? 12 : 16, fontFamily: "'Inter', sans-serif" }}>
                      {hasSession ? "Share a link or invite more friends" : (isCoopFromMosaic ? "Play this mosaic together" : "Select friends to invite or share a link")}
                    </div>
                    {/* Invite link — shown after session starts */}
                    {hasSession && (
                      <>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>Invite Link</div>
                        <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", marginBottom: 8, fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.text, wordBreak: "break-all", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {inviteUrl}
                        </div>
                        <button onClick={async () => {
                          const result = await tryNativeShare(isVaultSession ? { text: `Join me in this vault challenge!\n${inviteUrl}` } : isMosaicSession ? { text: `Join me on this mosaic puzzle!\n${inviteUrl}` } : { title: "Agnus Co-op", text: "Join me for a co-op puzzle!", url: inviteUrl });
                          if (result === "shared" || result === "cancelled") return;
                          try { await navigator.clipboard.writeText(inviteUrl); } catch {}
                        }} style={{
                          width: "100%", backgroundColor: coopPickerColor, color: "#fff", border: "none",
                          padding: "10px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                          cursor: "pointer", textTransform: "uppercase", marginBottom: friendsList.length > 0 ? 12 : 0,
                        }}>Copy Link</button>
                      </>
                    )}
                    {/* Mosaic info card */}
                    {isCoopFromMosaic && !hasSession && (
                      <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 10, backgroundColor: C.coop + "12", border: `1px solid ${C.coop}33` }}>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>Mosaic</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{customMosaicPlay.title || "Untitled"}</div>
                        {customMosaicPlay.authorUsername && <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>by {customMosaicPlay.authorUsername}</div>}
                      </div>
                    )}
                    {/* Friends list */}
                    {friendsList.length > 0 && (
                      <div style={{ marginBottom: hasSession && coopSelectedFriends.size > 0 ? 8 : (!hasSession ? 16 : 0), maxHeight: 184, overflowY: "auto" }}>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
                          {hasSession ? "Friends" : "Your Friends"} {coopSelectedFriends.size > 0 && `(${coopSelectedFriends.size} selected)`}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {friendsList.map(friend => {
                            const isActive = hasSession && !!activePlayers[friend.uid];
                            const isInvited = hasSession && invitedUids.has(friend.uid);
                            const isHandled = isActive || isInvited;
                            const isSelected = coopSelectedFriends.has(friend.uid);
                            return (
                              <button key={friend.uid} onClick={() => {
                                if (isHandled) return;
                                setCoopSelectedFriends(prev => { const next = new Set(prev); if (next.has(friend.uid)) next.delete(friend.uid); else next.add(friend.uid); return next; });
                              }} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10,
                                backgroundColor: isActive ? C.correct + "12" : isInvited ? coopPickerColor + "12" : isSelected ? coopPickerColor + "18" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${isActive ? C.correct + "55" : isInvited ? coopPickerColor + "55" : isSelected ? coopPickerColor : "rgba(255,255,255,0.08)"}`,
                                cursor: isHandled ? "default" : "pointer", opacity: isHandled ? 0.8 : 1,
                                transition: "all 0.15s", width: "100%", textAlign: "left",
                              }}>
                                {!isHandled && (
                                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? coopPickerColor : "rgba(255,255,255,0.15)"}`, backgroundColor: isSelected ? coopPickerColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                                    {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </div>
                                )}
                                {friend.profilePicture ? <img src={friend.profilePicture} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: coopPickerColor + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: coopPickerColor, fontWeight: 700, flexShrink: 0 }}>{(friend.username || "?")[0].toUpperCase()}</div>}
                                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{friend.username}</span>
                                {isActive && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700, color: C.correct, letterSpacing: 1, textTransform: "uppercase" }}>Active</span>}
                                {isInvited && !isActive && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700, color: coopPickerColor, letterSpacing: 1, textTransform: "uppercase" }}>Invited</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Invite by username */}
                    <div style={{ marginBottom: hasSession ? 8 : 12 }}>
                      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>
                        Invite by Username
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text"
                          placeholder="Enter username..."
                          value={coopInviteUsernameInput}
                          onChange={(e) => setCoopInviteUsernameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && coopInviteUsernameInput.trim()) handleCoopInviteByUsername(); }}
                          style={{
                            flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12,
                            fontFamily: "'Inter', sans-serif",
                            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: C.text,
                            outline: "none", boxSizing: "border-box",
                          }}
                        />
                        <button
                          onClick={handleCoopInviteByUsername}
                          disabled={!coopInviteUsernameInput.trim() || coopInviteUsernameLoading}
                          style={{
                            padding: "8px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                            fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                            background: coopInviteUsernameInput.trim() ? coopPickerColor : "rgba(255,255,255,0.06)",
                            color: coopInviteUsernameInput.trim() ? "#fff" : C.textDim,
                            border: "none", cursor: coopInviteUsernameInput.trim() ? "pointer" : "not-allowed",
                            textTransform: "uppercase", flexShrink: 0,
                          }}
                        >
                          {coopInviteUsernameLoading ? "..." : "Add"}
                        </button>
                      </div>
                      {coopInviteUsernameMsg && (
                        <div style={{ fontSize: 10, color: coopInviteUsernameMsg.includes("added") ? C.correct : coopPickerColor, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                          {coopInviteUsernameMsg}
                        </div>
                      )}
                    </div>
                    {/* Action buttons */}
                    {!hasSession && (
                      <div style={{ display: "flex", gap: 8 }}>
                        {coopSelectedFriends.size > 0 ? (
                          <button onClick={async () => {
                            if (isCoopFromMosaic) { await startCoopMosaicSession({ inviteFriendUids: [...coopSelectedFriends], mosaicOverride: customMosaicPlay }); }
                            else { await startCoopSession({ inviteFriendUids: [...coopSelectedFriends] }); }
                          }} style={{
                            flex: 1, backgroundColor: coopPickerColor, color: "#fff", border: "none",
                            padding: "12px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                            cursor: "pointer", textTransform: "uppercase",
                          }}>{`Invite ${coopSelectedFriends.size} Friend${coopSelectedFriends.size > 1 ? "s" : ""}`}</button>
                        ) : (
                          <button onClick={async () => {
                            if (isCoopFromMosaic) { await startCoopMosaicSession({ mosaicOverride: customMosaicPlay }); }
                            else { startCoopSession(); }
                          }} style={{
                            flex: 1, backgroundColor: coopPickerColor, color: "#fff", border: "none",
                            padding: "12px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                            cursor: "pointer", textTransform: "uppercase",
                          }}>Share Link</button>
                        )}
                      </div>
                    )}
                    {/* Send additional invites when session is active and new friends selected */}
                    {hasSession && coopSelectedFriends.size > 0 && (
                      <button onClick={async () => {
                        if (isVaultSession && vaultSessionId) {
                          const vaultUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?vault=${vaultSessionId}` : "";
                          await Promise.all([...coopSelectedFriends].map(uid => Promise.all([ sendNotification(uid, { type: "vault_invite", fromUid: firebaseUser.uid, fromUsername: username || firebaseUser.email, data: { sessionId: vaultSessionId, difficulty: vaultSessionDataRef.current?.difficulty || "silver", url: vaultUrl } }).catch(() => {}), addVaultInvitedUid(vaultSessionId, uid).catch(() => {}) ])));
                        } else if (isMosaicSession && coopMosaicSessionId) {
                          const coopUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?coopMosaic=${coopMosaicSessionId}` : "";
                          await Promise.all([...coopSelectedFriends].map(uid => Promise.all([ sendNotification(uid, { type: "coop_mosaic_invite", fromUid: firebaseUser.uid, fromUsername: username || firebaseUser.email, data: { sessionId: coopMosaicSessionId, mosaicTitle: customMosaicPlay?.title || "Untitled", url: coopUrl } }).catch(() => {}), addCoopMosaicInvitedUid(coopMosaicSessionId, uid).catch(() => {}) ])));
                        } else if (coopSessionId) {
                          const coopUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=${difficulty}&level=${currentPuzzle}&coop=${coopSessionId}` : "";
                          await Promise.all([...coopSelectedFriends].map(uid => Promise.all([ sendNotification(uid, { type: "coop_invite", fromUid: firebaseUser.uid, fromUsername: username || firebaseUser.email, data: { sessionId: coopSessionId, mode: difficulty, level: currentPuzzle, url: coopUrl } }).catch(() => {}), addCoopInvitedUid(coopSessionId, uid).catch(() => {}) ])));
                        }
                        setCoopSelectedFriends(new Set());
                      }} style={{
                        width: "100%", backgroundColor: coopPickerColor, color: "#fff", border: "none",
                        padding: "10px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                        cursor: "pointer", textTransform: "uppercase",
                      }}>{`Send ${coopSelectedFriends.size} Invite${coopSelectedFriends.size > 1 ? "s" : ""}`}</button>
                    )}
                    {/* Waiting indicator */}
                    {hasSession && (isVaultSession ? !(vaultSessionDataRef.current?.players && Object.keys(vaultSessionDataRef.current.players).length >= 2) : (!isMosaicSession && !coopPartnerConnected)) && (
                      <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", animation: "pulse 2s infinite" }}>Waiting for partner to join...</div>
                    )}
                  </div>
                </>
              );
            })() : isVaultChat ? (() => {
              return (
                <div style={{
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? "translateY(0)" : "translateY(8px)",
                  transition: isOpen
                    ? `opacity 0.2s ${springOpen} 0.06s, transform 0.25s ${springOpen} 0.06s`
                    : `opacity 0.1s ${springClose} 0s, transform 0.1s ${springClose} 0s`,
                }}>
                  <VaultChat
                    messages={vaultSessionId ? (vaultSessionDataRef.current?.chat || {}) : {}}
                    myUid={firebaseUser?.uid}
                    onSend={(text) => {
                      if (vaultSessionId && firebaseUser) {
                        sendVaultChatMessage(vaultSessionId, firebaseUser.uid, username || firebaseUser.email, text).catch(() => {});
                        setVaultChatLastRead(Date.now());
                      }
                    }}
                    C={C}
                  />
                </div>
              );
            })() : (
              <>
                {/* Persistent nav items — always first */}
                {showNav && filteredNav.map((item, i) => renderItem(item, i, false))}

                {/* Divider between nav and contextual */}
                {showDivider && (
                  <div style={{
                    padding: "6px 16px",
                    opacity: isOpen ? 1 : 0,
                    transition: isOpen
                      ? `opacity 0.2s ease ${0.04 + filteredNav.length * 0.03}s`
                      : "opacity 0.08s ease 0s",
                  }}>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>
                )}

                {/* Contextual items — page-specific actions */}
                {contextualItems.map((item, i) => renderItem(item, filteredNav.length + (showDivider ? 1 : 0) + i, item.isBack || item.dimmed))}
              </>
            )}
          </div>

          {/* Pass UI — player picker / banner / pending / incoming */}
          {hasPassUI && (
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexWrap: "wrap",
              gap: 6, flexShrink: 0, minHeight: passRowHeight,
            }}>
              {/* Player picker (multi-partner) */}
              {showPassPlayerPicker && (
                <>
                  <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginRight: 2, whiteSpace: "nowrap" }}>
                    Pass to:
                  </span>
                  {Object.entries(coopPlayers).map(([uid, p]) => {
                    const playerColor = coopPlayerColorMap[uid] || "#FF9FF3";
                    return (
                      <button key={uid} onClick={(e) => {
                        e.stopPropagation();
                        setCoopPassMode({ targetUid: uid, targetName: p.username || "Player", targetColor: playerColor });
                        setCoopPassPlayerPicker(false);
                      }} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                        borderRadius: 8, border: `1px solid ${playerColor}44`, background: "none",
                        cursor: "pointer", color: C.text, fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${playerColor}22`; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: "50%", backgroundColor: playerColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>{(p.username || "P")[0].toUpperCase()}</span>
                        {p.username || "Player"}
                      </button>
                    );
                  })}
                  <button onClick={(e) => { e.stopPropagation(); setCoopPassPlayerPicker(false); }} style={{
                    background: "none", border: "none", color: C.textDim, cursor: "pointer",
                    fontSize: 16, padding: "2px 6px", lineHeight: 1,
                  }}>{"\u2715"}</button>
                </>
              )}
              {/* Pass mode banner — tap a cell */}
              {showPassBanner && (
                <>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%", backgroundColor: coopPassMode.targetColor,
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>
                    Tap cell to pass to {coopPassMode.targetName}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setCoopPassMode(null); setCoopPassPlayerPicker(false); }} style={{
                    background: "none", border: "none", color: C.textDim, cursor: "pointer",
                    fontSize: 14, padding: "2px 6px", lineHeight: 1, fontFamily: "'Inter', sans-serif",
                  }}>Cancel</button>
                </>
              )}
              {/* Pending pass — waiting for response */}
              {showPassPending && (
                <>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.textDim }}>
                    Waiting for response...
                  </span>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    cancelCoopPassRequest(coopSessionId, coopPendingPassCell).catch(() => {});
                    setCoopPendingPassCell(null);
                    setPendingPassOpen(false);
                  }} style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                    color: C.textDim, cursor: "pointer", fontSize: 10, padding: "3px 8px",
                    fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  }}>Cancel</button>
                </>
              )}
              {/* Incoming pass — accept / reject */}
              {showPassIncoming && (
                <>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.text, fontWeight: 600 }}>
                    <span style={{ color: coopIncomingPass.fromColor, fontWeight: 700 }}>{coopIncomingPass.fromName}</span> wants to pass
                  </span>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    respondCoopPassRequest(coopSessionId, coopIncomingPass.cellKey, true).catch(() => {});
                    setSelectedCell(null);
                  }} style={{
                    backgroundColor: C.correct, color: "#fff", border: "none",
                    padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                    fontFamily: "'Inter', sans-serif", letterSpacing: 1, cursor: "pointer",
                    textTransform: "uppercase",
                  }}>Accept</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    respondCoopPassRequest(coopSessionId, coopIncomingPass.cellKey, false).catch(() => {});
                    setSelectedCell(null);
                  }} style={{
                    backgroundColor: "transparent", color: C.textDim, border: `1px solid ${C.border}`,
                    padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                    fontFamily: "'Inter', sans-serif", letterSpacing: 1, cursor: "pointer",
                    textTransform: "uppercase",
                  }}>Reject</button>
                </>
              )}
              {/* Suggest player picker (multi-partner) */}
              {showSuggestPlayerPicker && (
                <>
                  <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginRight: 2, whiteSpace: "nowrap" }}>
                    Suggest to:
                  </span>
                  {Object.entries(coopPlayers).map(([uid, p]) => {
                    const playerColor = coopPlayerColorMap[uid] || "#FF9FF3";
                    return (
                      <button key={uid} onClick={(e) => {
                        e.stopPropagation();
                        setCoopSuggestMode({ targetUid: uid, targetName: p.username || "Player", targetColor: playerColor });
                        setCoopSuggestPlayerPicker(false);
                      }} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                        borderRadius: 8, border: `1px solid ${playerColor}44`, background: "none",
                        cursor: "pointer", color: C.text, fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${playerColor}22`; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: "50%", backgroundColor: playerColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>{(p.username || "P")[0].toUpperCase()}</span>
                        {p.username || "Player"}
                      </button>
                    );
                  })}
                  <button onClick={(e) => { e.stopPropagation(); setCoopSuggestPlayerPicker(false); }} style={{
                    background: "none", border: "none", color: C.textDim, cursor: "pointer",
                    fontSize: 16, padding: "2px 6px", lineHeight: 1,
                  }}>{"\u2715"}</button>
                </>
              )}
              {/* Suggest mode banner — tap a partner's cell */}
              {showSuggestBanner && (
                <>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%", backgroundColor: coopSuggestMode.targetColor,
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>
                    Tap {coopSuggestMode.targetName}&apos;s cell to suggest
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setCoopSuggestMode(null); setCoopSuggestPlayerPicker(false); setCoopSuggestCell(null); }} style={{
                    background: "none", border: "none", color: C.textDim, cursor: "pointer",
                    fontSize: 14, padding: "2px 6px", lineHeight: 1, fontFamily: "'Inter', sans-serif",
                  }}>Cancel</button>
                </>
              )}
              {/* Suggest token pick — pick what to suggest */}
              {showSuggestTokenPick && puzzle?.usedTokens && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: C.textDim, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1 }}>
                      Suggest:
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setCoopSuggestCell(null); }} style={{
                      background: "none", border: "none", color: C.textDim, cursor: "pointer",
                      fontSize: 14, padding: "2px 6px", lineHeight: 1, fontFamily: "'Inter', sans-serif", marginLeft: "auto",
                    }}>Cancel</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: "100%" }}>
                    {puzzle.usedTokens.map((token) => {
                      const { color, shapeIndex } = parseToken(token);
                      const displayColor = themeColorMap ? (themeColorMap[color] || color) : color;
                      const shapes = themedShapes || SHAPES;
                      return (
                        <div key={token} onClick={(e) => {
                          e.stopPropagation();
                          if (coopSessionId && firebaseUser && coopSuggestMode) {
                            sendCoopCellSuggestion(coopSessionId, coopSuggestCell, firebaseUser.uid, coopSuggestMode.targetUid, token).catch(() => {});
                            setCoopSuggestCell(null);
                            setCoopSuggestMode(null);
                          }
                        }} style={{
                          width: 40, height: 40, borderRadius: 7,
                          backgroundColor: displayColor, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          position: "relative",
                          border: `2px solid transparent`,
                          transition: "transform 0.15s, border-color 0.15s",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.borderColor = `${C.text}`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "transparent"; }}
                        >
                          {shapes[shapeIndex % shapes.length](18, getShapeStroke(displayColor, puzzle.mode === "easy" || puzzle.mode === "blind"))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Friend reaction picker — friend checkboxes + reaction grid */}
              {showFriendReactionPicker && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  {/* Friend checkboxes */}
                  <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", fontWeight: 600, textAlign: "center" }}>
                    Send to {friendReactionSelectedFriends.size > 0 && `(${friendReactionSelectedFriends.size} selected)`}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: Math.min(onlineFriendsList.length, 3) * 40, overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {onlineFriendsList.map(friend => {
                      const isSelected = friendReactionSelectedFriends.has(friend.uid);
                      return (
                        <button key={friend.uid} onClick={(e) => {
                          e.stopPropagation();
                          setFriendReactionSelectedFriends(prev => {
                            const next = new Set(prev);
                            if (next.has(friend.uid)) next.delete(friend.uid); else next.add(friend.uid);
                            return next;
                          });
                        }} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
                          backgroundColor: isSelected ? "#FFD700" + "18" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isSelected ? "#FFD700" : "rgba(255,255,255,0.08)"}`,
                          cursor: "pointer", transition: "all 0.15s", width: "100%", textAlign: "left",
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: `2px solid ${isSelected ? "#FFD700" : "rgba(255,255,255,0.15)"}`,
                            backgroundColor: isSelected ? "#FFD700" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}>
                            {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          {friend.profilePicture ? (
                            <img src={friend.profilePicture} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#FFD700" + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFD700", fontWeight: 700, flexShrink: 0 }}>
                              {(friend.username || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friend.username}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Reaction grid */}
                  <div className="reaction-scroll-container" style={{
                    display: "flex", flexWrap: "wrap", gap: 4,
                    justifyContent: "center", alignContent: "flex-start",
                    overflowY: "auto", WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "none", msOverflowStyle: "none",
                    maxHeight: 220, width: "100%", padding: "0 2px",
                    boxSizing: "border-box",
                    opacity: friendReactionSelectedFriends.size > 0 ? 1 : 0.35,
                    pointerEvents: friendReactionSelectedFriends.size > 0 ? "auto" : "none",
                    transition: "opacity 0.2s",
                  }}>
                    {COOP_REACTIONS.map((r) => (
                      r.type === "text" ? (
                        <button key={r.content} onClick={(e) => {
                          e.stopPropagation();
                          if (firebaseUser && friendReactionSelectedFriends.size > 0) {
                            const selectedNames = [];
                            friendReactionSelectedFriends.forEach(uid => {
                              sendFriendReaction(firebaseUser.uid, uid, r.content, username || "Player", r.type).catch(() => {});
                              const f = friendsList.find(fr => fr.uid === uid);
                              if (f) selectedNames.push(f.username);
                            });
                            const label = selectedNames.length === 1 ? `You \u2192 ${selectedNames[0]}` : `You \u2192 ${selectedNames.length} friends`;
                            const id = Date.now() + Math.random();
                            const x = 10 + Math.random() * 80;
                            setFriendFloatingReactions(prev => [...prev, { id, emoji: r.content, fromName: label, fromColor: COOP_MY_COLOR, x, type: r.type }]);
                            setTimeout(() => setFriendFloatingReactions(prev => prev.filter(fr => fr.id !== id)), 3500);
                          }
                        }} style={{
                          fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                          background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                          cursor: "pointer", padding: "7px 12px", borderRadius: 8,
                          color: C.text, transition: "transform 0.12s, background-color 0.12s, border-color 0.12s",
                          letterSpacing: 0.3, lineHeight: 1.2,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "#FFD700"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = C.border; }}
                        >{r.content}</button>
                      ) : (
                        <button key={r.content} onClick={(e) => {
                          e.stopPropagation();
                          if (firebaseUser && friendReactionSelectedFriends.size > 0) {
                            const selectedNames = [];
                            friendReactionSelectedFriends.forEach(uid => {
                              sendFriendReaction(firebaseUser.uid, uid, r.content, username || "Player", r.type).catch(() => {});
                              const f = friendsList.find(fr => fr.uid === uid);
                              if (f) selectedNames.push(f.username);
                            });
                            const label = selectedNames.length === 1 ? `You \u2192 ${selectedNames[0]}` : `You \u2192 ${selectedNames.length} friends`;
                            const id = Date.now() + Math.random();
                            const x = 10 + Math.random() * 80;
                            setFriendFloatingReactions(prev => [...prev, { id, emoji: r.content, fromName: label, fromColor: COOP_MY_COLOR, x, type: r.type }]);
                            setTimeout(() => setFriendFloatingReactions(prev => prev.filter(fr => fr.id !== id)), 3500);
                          }
                        }} style={{
                          fontSize: r.type === "emoji" ? 28 : 24, background: "none", border: "none",
                          cursor: "pointer", padding: "5px 6px", borderRadius: 10,
                          color: r.type === "pattern" ? C.text : undefined,
                          transition: "transform 0.12s, background-color 0.12s", lineHeight: 1,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.2)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.backgroundColor = "transparent"; }}
                        >{r.content}</button>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom bar: pill action buttons + menu toggle */}
          <div style={{
            display: "flex", alignItems: "center",
            height: fabSize, flexShrink: 0,
            borderTop: (isOpen || hasPassUI) ? "1px solid rgba(255,255,255,0.06)" : "none",
          }}>
            {/* Action buttons in the pill */}
            {pillButtons.map((btn) => (
              <div
                key={btn.id}
                onClick={btn.disabled ? undefined : (e) => { e.stopPropagation(); btn.onClick?.(); }}
                style={{
                  width: fabSize, height: fabSize,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: btn.disabled ? "default" : "pointer",
                  opacity: btn.disabled ? 0.35 : 1,
                  transition: "opacity 0.15s, transform 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!btn.disabled) e.currentTarget.style.transform = "scale(1.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {renderIcon(btn.icon, btn.color || strokeColor)}
              </div>
            ))}

            {/* Separator between action buttons and menu toggle */}
            {hasPillButtons && (
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
            )}

            {/* Sub-menu back button — shown at bottom of menu when in a sub-menu */}
            {isOpen && isSubMenu && (
              <>
                <div
                  onClick={(e) => { e.stopPropagation(); setRadialMenuStack(prev => prev.slice(0, -1)); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    height: fabSize, padding: "0 16px",
                    cursor: "pointer",
                    color: C.text,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: 0.5, textTransform: "uppercase",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, flexShrink: 0 }}>
                    {renderIcon("back", strokeColor)}
                  </span>
                </div>
                <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
              </>
            )}

            {/* Menu toggle button */}
            <div
              onClick={(e) => { e.stopPropagation(); handleToggle(); }}
              style={{
                flex: 1, height: fabSize,
                display: "flex", alignItems: "center", justifyContent: isOpen ? "flex-end" : "center",
                paddingRight: isOpen ? 19 : 0,
                cursor: "pointer",
              }}
              onMouseEnter={e => { if (!isOpen && !hasPillButtons) { e.currentTarget.parentElement.parentElement.style.transform = "scale(1.08)"; e.currentTarget.parentElement.parentElement.style.boxShadow = hoverShadow; } }}
              onMouseLeave={e => { if (!isOpen && !hasPillButtons) { e.currentTarget.parentElement.parentElement.style.transform = "scale(1)"; e.currentTarget.parentElement.parentElement.style.boxShadow = defaultShadow; } }}
            >
              {isOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                renderIcon(fabIconKey, strokeColor)
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Standalone Liquid Glass back button — mirrors the FAB on the bottom-left
  const renderBackButton = (onClick, bottomPx = 16) => {
    const fabSize = 56;
    const springOpen = "cubic-bezier(0.175, 0.885, 0.32, 1.175)";
    const strokeColor = "#fff";
    return (
      <div
        onClick={onClick}
        style={{
          position: "fixed",
          bottom: `calc(${bottomPx}px + env(safe-area-inset-bottom, 0px))`,
          left: 20,
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          background: activeTheme.gridBg || C.surface,
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "none",
          zIndex: 85,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: `transform 0.15s ${springOpen}, box-shadow 0.15s ease`,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        aria-label="Go back"
      >
        {/* Liquid Glass sheen highlight */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: 0, left: "-10%", width: "120%", height: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "inherit",
          }} />
        </div>
        <ChevronLeft size={22} color={strokeColor} strokeWidth={2.5} />
      </div>
    );
  };

  const renderHomeButton = (bottomPx = 16) => {
    const fabSize = 56;
    const springOpen = "cubic-bezier(0.175, 0.885, 0.32, 1.175)";
    const strokeColor = "#fff";
    return (
      <div
        onClick={() => setView("menu")}
        style={{
          position: "fixed",
          bottom: `calc(${bottomPx + 68}px + env(safe-area-inset-bottom, 0px))`,
          left: 20,
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          background: activeTheme.gridBg || C.surface,
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "none",
          zIndex: 85,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: `transform 0.15s ${springOpen}, box-shadow 0.15s ease`,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        aria-label="Go home"
      >
        {/* Liquid Glass sheen highlight */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: 0, left: "-10%", width: "120%", height: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "inherit",
          }} />
        </div>
        <Home size={22} color={strokeColor} strokeWidth={2.5} />
      </div>
    );
  };

  const isMosaic = difficulty === "mosaic";
  const mosaicMainPuzzles = isMosaic ? (staffPickPuzzlesRef.current || PUZZLE_SETS.mosaic) : null;
  const puzzles = isCascade ? [] : isDaily ? [] : (customMosaicPuzzlesRef.current && isMosaic ? customMosaicPuzzlesRef.current : isMosaic ? mosaicMainPuzzles : (PUZZLE_SETS[difficulty] || []));
  const cascadePuzzle = useMemo(
    () => (isCascade ? buildCascadePuzzle(cascadeLevel, getCascadeRunSeed(cascadeRunIndex)) : null),
    [isCascade, cascadeLevel, cascadeRunIndex]
  );
  const currentDailyPuzzle = useMemo(() => {
    if (!isDaily || !currentDailyDate) return null;
    const seed = getDailySeedForDate(currentDailyDate);
    return buildDailyPuzzle(seed);
  }, [isDaily, currentDailyDate]);
  const isVaultSolving = difficulty === "vault" && vaultSolvingTile !== null && vaultSolvingTile >= 0;
  const vaultActivePuzzle = isVaultSolving ? vaultPuzzlesRef.current?.[vaultSolvingTile] : null;
  const puzzle = isVaultSolving ? vaultActivePuzzle : isCascade ? cascadePuzzle : isDaily ? currentDailyPuzzle : puzzles[currentPuzzle];
  const diffProgress = progress[difficulty] || {};
  const isBlind = difficulty === "blind" && !isDaily;
  const isSpin = difficulty === "spin";
  const progressKey = isCascade ? cascadeRunIndex : isDaily ? (currentDailyDate ? getDailySeedForDate(currentDailyDate) : null) : currentPuzzle;

  // How many of each token still need to be placed (only counts blanks, not full grid)
  // In coop modes, count ALL blanks and ALL fills (mine + partner) for a global view
  const tokenRemaining = useMemo(() => {
    if (!puzzle) return {};
    // Always count all blanks for needed tokens (gives global picture in coop)
    const neededInBlanks = {};
    for (const key of puzzle.blanks) {
      const [r, c] = key.split("-").map(Number);
      const token = puzzle.solution[r][c];
      if (token) neededInBlanks[token] = (neededInBlanks[token] || 0) + 1;
    }
    const usedCounts = {};
    for (const key of puzzle.blanks) {
      let token;
      if (lockedCells.has(key)) {
        const [r, c] = key.split("-").map(Number);
        token = puzzle.solution[r][c];
      } else if (fills[key]) {
        token = fills[key];
      } else if (isCoop && coopPartnerFills[key]) {
        // In non-mosaic coop, count partner's placed tokens
        token = coopPartnerFills[key];
      } else if (isCoopMosaic && coopMosaicOtherFills[key]) {
        // In coop mosaic, count other players' placed tokens
        token = coopMosaicOtherFills[key];
      }
      if (token) usedCounts[token] = (usedCounts[token] || 0) + 1;
    }
    const remaining = {};
    puzzle.usedTokens.forEach(t => { remaining[t] = (neededInBlanks[t] || 0) - (usedCounts[t] || 0); });
    return remaining;
  }, [puzzle, fills, lockedCells, isCoop, coopPartnerFills, isCoopMosaic, coopMosaicOtherFills]);

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
      const dTimes = isCustomMosaic ? ((tms.mosaicCompletionTimes || {})[customMosaicPlay?.id] || {}) : (tms[effectiveDiff] || {});
      const savedAttempts = dProg[lookupKey] ?? 0;
      // In coop mosaic, also check shared tile times from Firebase for partner-completed tiles
      const savedTime = dTimes[lookupKey] ?? (isCoopMosaic ? coopMosaicSharedTileTimes[lookupKey] : undefined);
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
    // Clear coop suggestion state so stale suggestions don't persist across puzzles
    setCoopSuggestMode(null);
    setCoopSuggestPlayerPicker(false);
    setCoopSuggestCell(null);
    setCoopAllSuggestions([]);
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
    // Reset ranking/friend data — real-time subscription handles updates
    setPuzzleRanking(null);
    setFriendsPuzzleData({});
    // Update presence: currently playing this puzzle
    if (firebaseUser) {
      updatePresence(firebaseUser.uid, {
        online: true, status: "playing",
        currentMode: effectiveDiff,
        currentPuzzle: effectiveDiff === "daily" ? (dailyDate || "") : String(idx),
        currentCoopSessionId: coopSessionId || null,
      }).catch(() => {});
    }
    setView("play");
  };

  // Real-time puzzle completions subscription (friend indicators + global ranking)
  useEffect(() => {
    if (!firebaseUser || view !== "play") return;
    const isCasc = difficulty === "cascade";
    const isMos = difficulty === "mosaic";
    if (isCasc || isMos) return; // cascade/mosaic don't have per-puzzle leaderboards
    const pKey = (difficulty === "daily" && currentDailyDate) ? currentDailyDate : String(currentPuzzle);
    const friendUidSet = new Set(friendsList.map(f => f.uid));
    const unsub = subscribeToPuzzleCompletions(difficulty, pKey, (completions) => {
      // Extract friend completions
      const friendData = {};
      for (const [uid, data] of Object.entries(completions)) {
        if (friendUidSet.has(uid)) friendData[uid] = data;
      }
      setFriendsPuzzleData(friendData);
      setFriendsPuzzleLoading(false);
      // Compute ranking
      const entries = Object.values(completions);
      const myEntry = completions[firebaseUser.uid];
      if (myEntry && entries.length > 0) {
        const sorted = entries.slice().sort((a, b) => (a.time || 9999) - (b.time || 9999) || (a.attempts || 99) - (b.attempts || 99));
        const myRank = sorted.findIndex(e => e.time === myEntry.time && e.attempts === myEntry.attempts) + 1;
        setPuzzleRanking({ rank: myRank || entries.length, total: entries.length });
      } else if (entries.length > 0) {
        setPuzzleRanking(null); // not yet completed — don't show ranking
      }
      setPuzzleRankingLoading(false);
    });
    return unsub;
  }, [firebaseUser, view, difficulty, currentPuzzle, currentDailyDate, friendsList]);

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

  // Animate partner fill changes from Firebase (coop + mosaic)
  useEffect(() => {
    const prev = prevCoopPartnerFillsRef.current;
    const curr = coopPartnerFills;
    // Detect new fills (appeared)
    for (const key of Object.keys(curr)) {
      if (!prev[key]) triggerPlaceAnimation(key);
    }
    // Detect removed fills (disappeared)
    for (const key of Object.keys(prev)) {
      if (!curr[key]) triggerRemoveAnimation(key, prev[key]);
    }
    prevCoopPartnerFillsRef.current = curr;
  }, [coopPartnerFills, triggerPlaceAnimation, triggerRemoveAnimation]);

  useEffect(() => {
    const prev = prevCoopMosaicOtherFillsRef.current;
    const curr = coopMosaicOtherFills;
    for (const key of Object.keys(curr)) {
      if (!prev[key]) triggerPlaceAnimation(key);
    }
    for (const key of Object.keys(prev)) {
      if (!curr[key]) triggerRemoveAnimation(key, prev[key]);
    }
    prevCoopMosaicOtherFillsRef.current = curr;
  }, [coopMosaicOtherFills, triggerPlaceAnimation, triggerRemoveAnimation]);

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
    // Coop pass mode: tapping my cell sends a pass request
    if (coopPassMode && isCoop && coopMyBlanks?.has(key) && !coopMyLockedIn && coopSessionId && firebaseUser) {
      sendCoopPassRequest(coopSessionId, key, firebaseUser.uid, coopPassMode.targetUid).catch(() => {});
      // Clear any local fill on the passed cell
      setFills(prev => { const next = { ...prev }; delete next[key]; return next; });
      setCoopPendingPassCell(key);
      setCoopPassMode(null);
      setCoopPassPlayerPicker(false);
      setSelectedCell(null);
      return;
    }
    // Coop suggest mode: tapping a partner's cell selects it for token suggestion
    if (coopSuggestMode && isCoop && coopMyBlanks && !coopMyBlanks.has(key) && coopSessionId && firebaseUser) {
      // If this cell already has my suggestion, remove it
      const existingSug = coopAllSuggestions.find(s => s.cellKey === key && s.isMine);
      if (existingSug) {
        cancelCoopCellSuggestion(coopSessionId, key).catch(() => {});
        setCoopSuggestMode(null);
        setCoopSuggestCell(null);
        return;
      }
      setCoopSuggestCell(key);
      setSelectedCell(null);
      return;
    }
    // Coop: tapping a cell with my outgoing suggestion removes it
    if (isCoop && !coopSuggestMode && coopSessionId && firebaseUser) {
      const mySug = coopAllSuggestions.find(s => s.cellKey === key && s.isMine);
      if (mySug) {
        cancelCoopCellSuggestion(coopSessionId, key).catch(() => {});
        return;
      }
    }
    // Coop incoming pass: tapping the incoming pass cell selects it (to show accept/reject)
    if (isCoop && coopIncomingPass && coopIncomingPass.cellKey === key) {
      setSelectedCell(key);
      return;
    }
    // Coop: tapping another player's blank cell auto-opens suggest for that cell
    if (isCoop && coopMyBlanks && !coopMyBlanks.has(key) && coopSessionId && firebaseUser) {
      const ownerUid = coopCellOwnerMap[key];
      if (ownerUid && coopPlayers[ownerUid]) {
        const p = coopPlayers[ownerUid];
        const playerColor = coopPlayerColorMap[ownerUid] || "#FF9FF3";
        setCoopSuggestMode({ targetUid: ownerUid, targetName: p.username || "Player", targetColor: playerColor });
        setCoopSuggestCell(key);
        setSelectedCell(null);
        setSelectedToken(null);
        // Cancel any active pass mode
        setCoopPassMode(null); setCoopPassPlayerPicker(false);
      }
      return;
    }
    // Coop: don't allow filling if locked in
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
  }, [gameState, puzzle, lockedCells, selectedToken, fills, tokenRemaining, cancelWrongCellClear, triggerPlaceAnimation, triggerRemoveAnimation, isCoop, coopMyBlanks, coopMyLockedIn, coopPassMode, coopSessionId, firebaseUser, coopIncomingPass, coopSuggestMode, coopAllSuggestions, coopCellOwnerMap, coopPlayers, coopPlayerColorMap]);

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

  // Split blanks for N players (deterministic based on sorted UIDs)
  const splitBlanksForNPlayers = useCallback((blanksSet, sortedPlayerUids) => {
    const blanksArr = [...blanksSet].sort();
    const n = sortedPlayerUids.length;
    if (n === 0) return {};
    const result = {};
    sortedPlayerUids.forEach(uid => { result[uid] = []; });
    blanksArr.forEach((key, i) => {
      result[sortedPlayerUids[i % n]].push(key);
    });
    const sets = {};
    for (const uid of sortedPlayerUids) {
      sets[uid] = new Set(result[uid]);
    }
    return sets;
  }, []);

  // Create a coop session for the current puzzle
  const startCoopSession = useCallback(async ({ inviteFriendUids = [] } = {}) => {
    if (!firebaseUser || !puzzle) return;
    const sessionId = await createCoopSession(firebaseUser.uid, {
      mode: difficulty,
      level: currentPuzzle,
      dailyDate: isDaily ? currentDailyDate : null,
      hostTheme: activeThemeId,
      hostUsername: username,
    });
    if (!sessionId) return;
    setCoopSessionId(sessionId);
    setCoopRole("host");
    setCoopStatus("waiting");
    setCoopMyLockedIn(false);
    setCoopPartnerLockedIn(false);
    setCoopPartnerCorrect(false);
    setCoopEveryoneLockedCorrect(false);
    setCoopPartnerConnected(false);
    setCoopPartnerFills({});
    setCoopPlayers({});
    setCoopInvitedUids(new Set());
    coopPlayerUidsRef.current = "";
    prevCoopPartnerLockedRef.current = false;
    // Clear suggestion state for fresh session
    setCoopSuggestMode(null);
    setCoopSuggestPlayerPicker(false);
    setCoopSuggestCell(null);
    setCoopAllSuggestions([]);
    // Split blanks — host starts with all blanks, will re-split when players join
    setCoopMyBlanks(new Set(puzzle.blanks));
    setCoopPartnerBlanks(new Set());
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
    // Keep session ID in URL so page refresh rejoins the session
    setCoopUrlParam("coop", sessionId);
    // If inviting friends, send notifications and track invited UIDs
    if (inviteFriendUids.length > 0) {
      const coopUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?mode=${difficulty}&level=${currentPuzzle}&coop=${sessionId}` : "";
      await Promise.all(inviteFriendUids.map(uid =>
        Promise.all([
          sendNotification(uid, {
            type: "coop_invite",
            fromUid: firebaseUser.uid,
            fromUsername: username || firebaseUser.email,
            data: { sessionId, mode: difficulty, level: currentPuzzle, dailyDate: isDaily ? currentDailyDate : null, url: coopUrl },
          }).catch(() => {}),
          addCoopInvitedUid(sessionId, uid).catch(() => {}),
        ])
      ));
      setCoopSelectedFriends(new Set());
    }
    setShowCoopFriendPicker(false);
    // Open menu at coop-start to show invite link (if not already there)
    setRadialMenuStack(prev => prev[prev.length - 1] === "coop-start" ? prev : ["root", "coop-start"]);
  }, [firebaseUser, puzzle, difficulty, currentPuzzle, isDaily, currentDailyDate, stopTimer, activeThemeId, username]);

  // Auto-start coop after login if user clicked Co-op while logged out
  useEffect(() => {
    if (firebaseUser && coopPendingLoginRef.current && !coopSessionId && puzzle) {
      coopPendingLoginRef.current = false;
      startCoopSession();
    }
  }, [firebaseUser, coopSessionId, puzzle, startCoopSession]);

  // Add a floating reaction to the screen (used for both local + remote reactions)
  const addFloatingReaction = useCallback((emoji, fromName, fromColor, type = "emoji") => {
    const id = Date.now() + Math.random();
    const x = 10 + Math.random() * 80; // random horizontal position (10% to 90%)
    setCoopFloatingReactions(prev => [...prev, { id, emoji, fromName, fromColor, x, type }]);
    setTimeout(() => {
      setCoopFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  }, []);

  // Leave coop session and clean up
  // All players (host and guests) just disconnect locally — session persists
  // and remains in their active sessions list so they can rejoin
  const leaveCoopSession = useCallback(() => {
    if (coopUnsubRef.current) {
      coopUnsubRef.current();
      coopUnsubRef.current = null;
    }
    // Restore guest's original theme (don't persist the host's theme)
    if (coopOriginalThemeRef.current !== null) {
      setActiveThemeId(coopOriginalThemeRef.current);
      saveTheme(coopOriginalThemeRef.current);
      coopOriginalThemeRef.current = null;
    }
    // Remove coop session ID from URL
    clearCoopUrlParam("coop");
    setCoopSessionId(null);
    setCoopRole(null);
    setCoopMyBlanks(null);
    setCoopPartnerBlanks(null);
    setCoopPartnerFills({});
    setCoopMyLockedIn(false);
    setCoopPartnerLockedIn(false);
    setCoopPartnerCorrect(false);
    setCoopEveryoneLockedCorrect(false);
    setCoopPartnerConnected(false);
    setCoopStatus(null);
    setShowCoopInvite(false);
    setCoopPlayers({});
    setCoopInvitedUids(new Set());
    setCoopPlayerColorMap({});
    setCoopCellOwnerMap({});
    setCoopCellOverrides({});
    setCoopPassingCell(null);
    setCoopPlayersExpanded(false);
    setCoopPassMode(null);
    setCoopIncomingPass(null);
    setCoopPendingPassCell(null);
    setCoopPassPlayerPicker(false);
    setPendingPassOpen(false);
    setCoopSuggestMode(null);
    setCoopSuggestPlayerPicker(false);
    setCoopSuggestCell(null);
    setCoopAllSuggestions([]);
    setFriendReactionPickerOpen(false);
    setCoopFloatingReactions([]);
    coopSeenReactionsRef.current = new Set();
    coopPlayerUidsRef.current = "";
    setRadialMenuStack([]);
    coopWriteThrottleRef.current = {};
    coopHostTimerStartRef.current = null;
    prevCoopPartnerLockedRef.current = false;
    coopGuestJoinedRef.current = false;
    coopJoiningRef.current = false;
  }, [coopSessionId, firebaseUser]);

  // Close coop session permanently (owner only)
  const closeCoopSessionPermanently = useCallback(async (sessionId, session) => {
    if (!firebaseUser) return;
    const playerUids = session?.players ? Object.keys(session.players) : undefined;
    await closeCoopSession(sessionId, session?.hostUid, session?.guestUid, playerUids).catch(() => {});
    // If we're currently in this session, leave it
    if (coopSessionId === sessionId) {
      leaveCoopSession();
    }
    // Refresh active sessions list
    loadActiveCoopSessions();
  }, [firebaseUser, coopSessionId, leaveCoopSession, loadActiveCoopSessions]);

  // Rejoin an existing coop session from the active sessions panel
  const rejoinCoopSession = useCallback(async (session) => {
    if (!firebaseUser || !session) return;
    const isHost = session.hostUid === firebaseUser.uid;
    const mode = session.mode;
    const level = session.level;
    if (mode) setDifficulty(mode);
    if (level != null) setCurrentPuzzle(level);
    if (session.dailyDate) setCurrentDailyDate(session.dailyDate);
    setCoopSessionId(session.id);
    setCoopRole(isHost ? "host" : "guest");
    setCoopStatus(session.status || "waiting");
    setCoopMyLockedIn(false);
    setCoopPartnerLockedIn(false);
    setCoopPartnerCorrect(false);
    setCoopEveryoneLockedCorrect(false);
    const otherPlayers = session.players ? Object.keys(session.players).filter(uid => uid !== firebaseUser.uid).length : 0;
    setCoopPartnerConnected(otherPlayers > 0 || (isHost ? !!session.guestUid : true));
    setCoopPartnerFills({});
    setCoopPlayers({});
    setCoopInvitedUids(new Set());
    coopPlayerUidsRef.current = "";
    prevCoopPartnerLockedRef.current = false;
    // Clear suggestion state so stale suggestions from a previous session don't persist
    setCoopSuggestMode(null);
    setCoopSuggestPlayerPicker(false);
    setCoopSuggestCell(null);
    setCoopAllSuggestions([]);
    // Clear blanks so the effect can re-split once puzzle is loaded
    setCoopMyBlanks(null);
    setCoopPartnerBlanks(null);
    setFills({});
    setAttempts(session.attempts || 0);
    setGameState("playing");
    setWrongCells(new Set());
    setLockedCells(new Set());
    setShowParticles(false);
    setSelectedCell(null);
    setSelectedToken(null);
    // Timer
    stopTimer();
    const remoteStart = session.hostTimerStart || Date.now();
    timerStart.current = remoteStart;
    setElapsedTime(Math.max(0, Math.floor((Date.now() - remoteStart) / 1000)));
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
    }, 1000);
    coopHostTimerStartRef.current = remoteStart;
    // Keep session ID in URL so page refresh rejoins the session
    setCoopUrlParam("coop", session.id);
    setView("play");
  }, [firebaseUser, stopTimer]);

  // Retry coop session: reset Firebase state and local state, keep same session/players
  const retryCoop = useCallback(async () => {
    if (!coopSessionId || !puzzle) return;
    // Reset Firebase session state
    await resetCoopSession(coopSessionId);
    // Reset local game state
    setFills({});
    setAttempts(0);
    setGameState("playing");
    setWrongCells(new Set());
    setLockedCells(new Set());
    setShowParticles(false);
    setSelectedCell(null);
    setClearedBlanks(new Set());
    setCoopMyLockedIn(false);
    setCoopPartnerLockedIn(false);
    setCoopPartnerCorrect(false);
    setCoopEveryoneLockedCorrect(false);
    setCoopPartnerFills({});
    coopWriteThrottleRef.current = {};
    // Clear suggestion state for fresh retry
    setCoopSuggestMode(null);
    setCoopSuggestPlayerPicker(false);
    setCoopSuggestCell(null);
    setCoopAllSuggestions([]);
    // Restart timer (host writes hostTimerStart via resetCoopSession)
    stopTimer();
    setElapsedTime(0);
    timerStart.current = Date.now();
    timerInterval.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
    }, 1000);
  }, [coopSessionId, puzzle, stopTimer]);

  // Subscribe to coop session changes (real-time sync — supports N players)
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
      const myUid = firebaseUser.uid;
      const isHost = data.hostUid === myUid;
      const players = data.players || {};

      // Track whether this player has joined the session
      if (players[myUid]) {
        coopGuestJoinedRef.current = true;
      }
      // Legacy check: also track via guestUid for backward compat
      if (!isHost && data.guestUid === myUid) {
        coopGuestJoinedRef.current = true;
      }
      // If player was removed from the session (kicked), handle it
      if (!isHost && !players[myUid] && coopGuestJoinedRef.current) {
        coopGuestJoinedRef.current = false;
        leaveCoopSession();
        setView("menu");
        return;
      }

      // Build other players map
      const otherPlayers = {};
      for (const [uid, p] of Object.entries(players)) {
        if (uid !== myUid) otherPlayers[uid] = p;
      }
      setCoopPlayers(otherPlayers);
      const otherPlayerCount = Object.keys(otherPlayers).length;
      setCoopPartnerConnected(otherPlayerCount > 0);
      // Don't override status while guest join is in-flight — the join effect manages the transition
      if (!coopJoiningRef.current) setCoopStatus(data.status);

      // Build per-player color map (deterministic: sorted other UIDs → neon colors)
      const sortedOtherUids = Object.keys(otherPlayers).sort();
      const colorMap = {};
      sortedOtherUids.forEach((uid, i) => {
        colorMap[uid] = COOP_NEON_COLORS[i % COOP_NEON_COLORS.length];
      });
      setCoopPlayerColorMap(colorMap);

      // Sync cell overrides from Firebase
      setCoopCellOverrides(data.cellOverrides || {});

      // Sync pass requests from Firebase
      const passRequests = data.passRequests || {};
      // Check for incoming pass request targeted at me
      const incomingEntry = Object.entries(passRequests).find(([, req]) => req.toUid === myUid && req.status === "pending");
      if (incomingEntry) {
        const [cellKey, req] = incomingEntry;
        const fromPlayer = players[req.fromUid];
        const fromColor = colorMap[req.fromUid] || "#54A0FF";
        setCoopIncomingPass({
          fromUid: req.fromUid,
          fromName: fromPlayer?.username || "Player",
          fromColor,
          cellKey,
        });
      } else {
        setCoopIncomingPass(null);
      }
      // Check if my outgoing pass was accepted/rejected (no longer pending)
      const myOutgoing = Object.entries(passRequests).find(([, req]) => req.fromUid === myUid && req.status === "pending");
      if (!myOutgoing) {
        setCoopPendingPassCell(null);
        setPendingPassOpen(false);
      }

      // Sync cell suggestions from Firebase — collect all for grid display
      const cellSuggestions = data.cellSuggestions || {};
      const allSugs = Object.entries(cellSuggestions)
        .filter(([, sug]) => sug.status === "pending" && (sug.toUid === myUid || sug.fromUid === myUid))
        .map(([cellKey, sug]) => {
          const isMine = sug.fromUid === myUid;
          const otherUid = isMine ? sug.toUid : sug.fromUid;
          const otherPlayer = players[otherUid];
          const otherColor = colorMap[otherUid] || "#54A0FF";
          return {
            fromUid: sug.fromUid,
            fromName: isMine ? "You" : (otherPlayer?.username || "Player"),
            fromColor: isMine ? COOP_MY_COLOR : otherColor,
            cellKey,
            suggestedToken: sug.suggestedToken,
            isMine,
          };
        });
      setCoopAllSuggestions(allSugs);

      // Sync reactions from Firebase — detect new reactions and trigger floating animation
      const reactions = data.reactions || {};
      const reactionKeys = Object.keys(reactions);
      const prevSeen = coopSeenReactionsRef.current;
      reactionKeys.forEach(key => {
        if (!prevSeen.has(key)) {
          const r = reactions[key];
          // Only show animation for other players' reactions (local user's are shown immediately)
          if (r.uid !== myUid) {
            const playerColor = colorMap[r.uid] || "#FF9FF3";
            addFloatingReaction(r.emoji, r.username || "Player", playerColor, r.type || "emoji");
          }
        }
      });
      coopSeenReactionsRef.current = new Set(reactionKeys);

      // Sync invited UIDs
      const invited = data.invitedUids || {};
      setCoopInvitedUids(new Set(Object.keys(invited)));

      // Sync timer from host's hostTimerStart — keeps all players' clocks aligned
      const remoteTimerStart = data.hostTimerStart;
      if (remoteTimerStart && remoteTimerStart !== coopHostTimerStartRef.current) {
        const prevTimerStart = coopHostTimerStartRef.current;
        coopHostTimerStartRef.current = remoteTimerStart;
        // Restart local timer based on host's timestamp
        stopTimer();
        timerStart.current = remoteTimerStart;
        setElapsedTime(Math.max(0, Math.floor((Date.now() - remoteTimerStart) / 1000)));
        timerInterval.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - timerStart.current) / 1000));
        }, 1000);
        // If this is a timer reset (retry or new player joined), reset local game state
        if (prevTimerStart !== null) {
          setFills({});
          setGameState("playing");
          setWrongCells(new Set());
          setLockedCells(new Set());
          setShowParticles(false);
          setSelectedCell(null);
          setClearedBlanks(new Set());
          setCoopMyLockedIn(false);
          setCoopPartnerLockedIn(false);
          setCoopPartnerCorrect(false);
          setCoopEveryoneLockedCorrect(false);
          setCoopPartnerFills({});
          coopWriteThrottleRef.current = {};
          setCoopPassMode(null);
          setCoopIncomingPass(null);
          setCoopPendingPassCell(null);
          setCoopPassPlayerPicker(false);
          setPendingPassOpen(false);
          setCoopSuggestMode(null);
          setCoopSuggestPlayerPicker(false);
          setCoopSuggestCell(null);
          setCoopAllSuggestions([]);
        }
      }

      // Sync shared attempt counter from Firebase
      const remoteAttempts = data.attempts ?? 0;
      setAttempts(remoteAttempts);

      // Shared fail: if shared attempts exhausted, all players lose
      if (remoteAttempts >= 5 && data.status !== "complete") {
        setGameState("lost");
        stopTimer();
      }

      // Sync host theme to non-host players
      if (!isHost && data.hostTheme) {
        if (coopOriginalThemeRef.current === null) {
          coopOriginalThemeRef.current = activeThemeIdRef.current;
        }
        if (activeThemeIdRef.current !== data.hostTheme) {
          setActiveThemeId(data.hostTheme);
        }
      }

      // Multi-player lock-in status: check all other players via players map
      const allOthersLocked = otherPlayerCount > 0 && Object.values(otherPlayers).every(p => !!p.lockedIn);
      const allOthersCorrect = otherPlayerCount > 0 && Object.values(otherPlayers).every(p => !!p.correct);
      // For partner name display, show first partner or "N players"
      const otherNames = Object.values(otherPlayers).map(p => p.username || "Player").filter(Boolean);
      const partnerName = otherPlayerCount > 1 ? `${otherPlayerCount} players` : (otherNames[0] || "Partner");
      setCoopPartnerName(partnerName);
      // Load first partner's profile picture
      const firstPartnerUid = Object.keys(otherPlayers)[0];
      if (firstPartnerUid && coopPartnerPicFetchedRef.current !== firstPartnerUid) {
        coopPartnerPicFetchedRef.current = firstPartnerUid;
        loadUserProfile(firstPartnerUid).then(p => {
          setCoopPartnerPic(p?.profilePicture || null);
        }).catch(() => {});
      }
      setCoopPartnerLockedIn(allOthersLocked);
      setCoopPartnerCorrect(allOthersCorrect);
      // Detect any partner just locked in (transition from false → true)
      const anyLocked = allOthersLocked;
      if (anyLocked && !prevCoopPartnerLockedRef.current) {
        const toastMsg = allOthersCorrect
          ? `${partnerName} locked in \u2713`
          : `${partnerName} submitted`;
        setCoopPartnerLockToast(toastMsg);
        if (coopPartnerLockToastTimer.current) clearTimeout(coopPartnerLockToastTimer.current);
        coopPartnerLockToastTimer.current = setTimeout(() => {
          setCoopPartnerLockToast(null);
          coopPartnerLockToastTimer.current = null;
        }, 3000);
      }
      prevCoopPartnerLockedRef.current = anyLocked;

      // Restore my own lock-in state from Firebase (e.g., after page refresh/rejoin)
      const myPlayer = players[myUid];
      if (myPlayer?.lockedIn && myPlayer?.correct && coopMyBlanks) {
        setCoopMyLockedIn(true);
      }

      // Compute the correct set of locked cells from scratch based on current
      // player data. This replaces (rather than adds to) the previous set so that
      // stale locks are cleaned up — e.g., when coopMyBlanks was temporarily ALL
      // blanks during rejoin before the partner list was populated.
      if (coopMyBlanks && puzzle) {
        const correctLockedCells = new Set();
        // My cells if I'm locked in correctly
        if (myPlayer?.lockedIn && myPlayer?.correct) {
          for (const k of coopMyBlanks) correctLockedCells.add(k);
        }
        // Other players' cells if they're locked in correctly
        const allUids = Object.keys(players).sort();
        if (allUids.length >= 2) {
          const blanksMap = splitBlanksForNPlayers(puzzle.blanks, allUids);
          // Apply cell overrides (same logic as the blank-splitting useEffect)
          const overrides = data.cellOverrides || {};
          for (const [cellKey, toUid] of Object.entries(overrides)) {
            if (!puzzle.blanks.has(cellKey)) continue;
            if (!blanksMap[toUid]) continue;
            for (const uid of allUids) {
              if (blanksMap[uid]?.has(cellKey)) {
                blanksMap[uid].delete(cellKey);
                break;
              }
            }
            blanksMap[toUid].add(cellKey);
          }
          for (const [uid, pData] of Object.entries(players)) {
            if (uid !== myUid && pData.lockedIn && pData.correct && blanksMap[uid]) {
              for (const k of blanksMap[uid]) correctLockedCells.add(k);
            }
          }
        }
        // Replace lockedCells with the correct set
        setLockedCells(prev => {
          if (prev.size === correctLockedCells.size && [...prev].every(k => correctLockedCells.has(k))) return prev;
          return correctLockedCells;
        });
      }

      // Sync fills from Firebase
      const remoteFills = data.fills || {};
      if (coopMyBlanks) {
        const partnerFillsObj = {};
        for (const [key, val] of Object.entries(remoteFills)) {
          if (!coopMyBlanks.has(key)) {
            partnerFillsObj[key] = val;
          }
        }
        setCoopPartnerFills(partnerFillsObj);

        // Restore my own fills from Firebase when locked in (e.g., after page refresh)
        if (myPlayer?.lockedIn && myPlayer?.correct) {
          setFills(prev => {
            const next = { ...prev };
            let changed = false;
            for (const key of coopMyBlanks) {
              if (remoteFills[key] !== undefined && prev[key] !== remoteFills[key]) {
                next[key] = remoteFills[key];
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
      }

      // Check if ALL players locked in correctly → complete
      const allPlayersLocked = Object.keys(players).length >= 2 && Object.values(players).every(p => !!p.lockedIn);
      const allPlayersCorrect = Object.values(players).every(p => !!p.correct);
      // Only mark everyone-done when Firebase confirms ALL players are locked in AND correct.
      // This is the single source of truth for puzzle completion — avoids premature completion
      // when individual lock-in state variables are updated at different times.
      setCoopEveryoneLockedCorrect(allPlayersLocked && allPlayersCorrect);
      if (allPlayersLocked && allPlayersCorrect && data.status !== "complete") {
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
    coopJoiningRef.current = true;
    (async () => {
      try {
        const session = await joinCoopSession(coopSessionId, firebaseUser.uid, username);
        if (cancelled || !session) {
          if (!cancelled) {
            // Session doesn't exist or is full — clean URL param
            clearCoopUrlParam("coop");
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

        // Detect correct role — on page refresh the init code always sets "guest",
        // but if this user is actually the host we need to correct that
        if (session.hostUid === firebaseUser.uid) {
          setCoopRole("host");
        }
        setCoopStatus("playing");
      } catch (e) {
        console.error("Failed to join coop session:", e);
        if (!cancelled) {
          clearCoopUrlParam("coop");
          setCoopSessionId(null);
          setCoopRole(null);
          setCoopStatus(null);
          setView("menu");
        }
      } finally {
        coopJoiningRef.current = false;
      }
    })();
    return () => { cancelled = true; coopJoiningRef.current = false; };
  }, [coopRole, coopStatus, firebaseUser, coopSessionId]);

  // Once player has joined/rejoined and puzzle is loaded, split blanks among N players
  // Cell overrides (from "pass cell" feature) are applied on top of the round-robin split
  useEffect(() => {
    if (!coopRole || !puzzle || !firebaseUser) return;
    // Non-host waits until status is "playing" before splitting
    if (coopRole !== "host" && coopStatus !== "playing") return;
    const myUid = firebaseUser.uid;
    // Build sorted player UID list (myself + other players)
    const playerMap = { [myUid]: true, ...coopPlayers };
    const sortedUids = Object.keys(playerMap).sort();
    const uidsKey = sortedUids.join(",");
    const overridesKey = JSON.stringify(coopCellOverrides);
    // Only re-split if player list or overrides changed, or blanks haven't been set yet
    const fullKey = `${uidsKey}|${overridesKey}`;
    if (coopMyBlanks && fullKey === coopPlayerUidsRef.current) return;
    coopPlayerUidsRef.current = fullKey;
    // Split blanks evenly among all players (base round-robin)
    const blanksMap = splitBlanksForNPlayers(puzzle.blanks, sortedUids);
    // Apply cell overrides: move cells to their overridden owner
    for (const [cellKey, toUid] of Object.entries(coopCellOverrides)) {
      if (!puzzle.blanks.has(cellKey)) continue;
      if (!blanksMap[toUid]) continue; // target player must still be in the session
      // Remove from current owner
      for (const uid of sortedUids) {
        if (blanksMap[uid]?.has(cellKey)) {
          blanksMap[uid].delete(cellKey);
          break;
        }
      }
      blanksMap[toUid].add(cellKey);
    }
    // Build cell owner map (cellKey → uid) for per-cell color lookup
    const ownerMap = {};
    for (const [uid, blanks] of Object.entries(blanksMap)) {
      for (const k of blanks) ownerMap[k] = uid;
    }
    setCoopCellOwnerMap(ownerMap);
    const myNewBlanks = blanksMap[myUid] || new Set();
    setCoopMyBlanks(myNewBlanks);
    // Clean up local fills for cells no longer assigned to this player
    // (e.g., player filled cells before partner joined and blanks were re-split)
    setFills(prev => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next)) {
        if (!myNewBlanks.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    const otherBlanks = new Set();
    for (const [uid, blanks] of Object.entries(blanksMap)) {
      if (uid !== myUid) {
        for (const k of blanks) otherBlanks.add(k);
      }
    }
    setCoopPartnerBlanks(otherBlanks);
    // Timer is synced from host's hostTimerStart via the subscription handler
  }, [coopRole, coopStatus, puzzle, coopMyBlanks, coopPlayers, firebaseUser, splitBlanksForNPlayers, coopCellOverrides]);

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

  // --- Coop Mosaic session management ---

  // Start a coop mosaic session from the custom-mosaic view
  const startCoopMosaicSession = useCallback(async ({ inviteFriendUids = [], mosaicOverride = null } = {}) => {
    const mosaic = mosaicOverride || customMosaicPlay;
    if (!firebaseUser || !mosaic) return;

    // Pre-generate the session ID synchronously so we can set
    // coopMosaicSessionId (and thus isCoopMosaic) BEFORE the async
    // Firebase write.  Without this, the user can interact with the
    // mosaic grid while isCoopMosaic is still false, causing tile
    // solves to save to personal progress instead of the coop session.
    const sessionId = generateCoopMosaicSessionId();
    if (!sessionId) return;

    // Set all coop state synchronously — isCoopMosaic becomes true immediately
    setCoopMosaicSessionId(sessionId);
    setCoopMosaicRole("host");
    setCoopMosaicStatus("waiting");
    setCoopMosaicPlayers({});
    setCoopMosaicOtherFills({});
    setCoopMosaicSharedProgress({});
    setCoopMosaicSharedTileTimes({});
    // Reset local mosaic progress so the coop session starts fresh
    // (don't carry over the player's personal solo progress)
    setCustomMosaicProgress({});
    coopMosaicCurrentTileRef.current = -1;
    coopMosaicJoinedRef.current = true;
    coopMosaicPrevSolvedRef.current = new Set();
    coopMosaicCreatingRef.current = true;

    // If mosaicOverride provided, set up the mosaic play state
    if (mosaicOverride) {
      const puzzles = buildCustomMosaicPuzzles(mosaicOverride.grid);
      customMosaicPuzzlesRef.current = puzzles;
      setCustomMosaicPlay(mosaicOverride);
      setDifficulty("mosaic");
      setView("custom-mosaic");
    }

    // Keep session ID in URL so page refresh rejoins the session
    setCoopUrlParam("coopMosaic", sessionId);

    // Optimistically add the new session to activeCoopSessions so it appears
    // immediately on the menu, without waiting for async Firebase reads
    setActiveCoopSessions(prev => {
      if (prev.some(s => s.id === sessionId)) return prev;
      return [{
        id: sessionId,
        hostUid: firebaseUser.uid,
        hostUsername: username || null,
        guestUid: null,
        guestUsername: null,
        mosaicId: mosaic.id || null,
        mosaicTitle: mosaic.title || "Untitled",
        status: "waiting",
        tileProgress: {},
        tileTimes: {},
        hostCurrentTile: -1,
        guestCurrentTile: null,
        fills: {},
        _type: "mosaic",
        createdAt: Date.now(),
      }, ...prev];
    });

    // Write the session to Firebase (async) — the subscription may
    // briefly see null data before this completes; the creating ref
    // prevents the handler from tearing down the session.
    try {
      await createCoopMosaicSession(firebaseUser.uid, {
        mosaicId: mosaic.id,
        mosaicTitle: mosaic.title || "Untitled",
        mosaicGrid: mosaic.grid,
        hostTheme: activeThemeId,
        hostUsername: username,
      }, sessionId);
    } catch (e) {
      // If creation fails, tear down the coop state
      coopMosaicCreatingRef.current = false;
      setCoopMosaicSessionId(null);
      setCoopMosaicRole(null);
      setCoopMosaicStatus(null);
      clearCoopUrlParam("coopMosaic");
      return;
    }
    coopMosaicCreatingRef.current = false;

    // Ensure the session appears in the Active Co-op Sessions panel on the menu
    loadActiveCoopSessions();
    // If inviting friends, send notifications and track invited UIDs
    if (inviteFriendUids.length > 0) {
      const coopUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?coopMosaic=${sessionId}` : "";
      await Promise.all(inviteFriendUids.map(uid =>
        Promise.all([
          sendNotification(uid, {
            type: "coop_mosaic_invite",
            fromUid: firebaseUser.uid,
            fromUsername: username || firebaseUser.email,
            data: { sessionId, mosaicTitle: mosaic.title || "Untitled", url: coopUrl },
          }).catch(() => {}),
          addCoopMosaicInvitedUid(sessionId, uid).catch(() => {}),
        ])
      ));
      setShowCoopFriendPicker(false);
      setCoopSelectedFriends(new Set());
    }
    // Open menu at coop-start to show invite link (if not already there)
    setRadialMenuStack(prev => prev[prev.length - 1] === "coop-start" ? prev : ["root", "coop-start"]);
  }, [firebaseUser, customMosaicPlay, activeThemeId, username, buildCustomMosaicPuzzles]);

  // Leave coop mosaic session
  const leaveCoopMosaicSession = useCallback(() => {
    if (coopMosaicUnsubRef.current) {
      coopMosaicUnsubRef.current();
      coopMosaicUnsubRef.current = null;
    }
    if (coopMosaicSessionId && firebaseUser) {
      if (coopMosaicRole === "guest") {
        playerLeaveCoopMosaicSession(coopMosaicSessionId, firebaseUser.uid).catch(() => {});
      } else if (coopMosaicRole === "host") {
        // Signal host is offline by setting currentTile to null
        updateCoopMosaicCurrentTile(coopMosaicSessionId, firebaseUser.uid, null).catch(() => {});
      }
    }
    // Remove coop mosaic session ID from URL
    clearCoopUrlParam("coopMosaic");
    setCoopMosaicSessionId(null);
    setCoopMosaicRole(null);
    setCoopMosaicStatus(null);
    setCoopMosaicPlayers({});
    setCoopMosaicInvitedUids(new Set());
    setCoopMosaicSharedProgress({});
    setCoopMosaicSharedTileTimes({});
    setCoopMosaicOtherFills({});
    setShowCoopMosaicInvite(false);
    coopMosaicWriteThrottleRef.current = {};
    coopMosaicCurrentTileRef.current = null;
    coopMosaicJoinedRef.current = false;
    coopMosaicJoiningRef.current = false;
    coopMosaicPrevSolvedRef.current = new Set();
    coopMosaicSeenReactionsRef.current = new Set();
    coopMosaicCreatingRef.current = false;
  }, [coopMosaicSessionId, firebaseUser, coopMosaicRole]);

  // Rejoin an existing coop mosaic session from the active sessions panel
  const rejoinCoopMosaicSession = useCallback(async (session) => {
    if (!firebaseUser || !session) return;
    // Normalize grid from Firebase (may have been stored as object with numeric keys)
    const rawGrid = session.mosaicGrid;
    const normalizeRow = (row) => {
      if (Array.isArray(row)) return row;
      const arr = [];
      for (let i = 0; i < 25; i++) arr.push((row && row[i]) ?? null);
      return arr;
    };
    const gridArr = Array.isArray(rawGrid) ? rawGrid : (() => {
      const arr = [];
      for (let i = 0; i < 25; i++) arr.push(rawGrid?.[i] ?? null);
      return arr;
    })();
    const grid = gridArr.map(normalizeRow);
    // Build mosaic puzzles from session grid
    const puzzles = buildCustomMosaicPuzzles(grid);
    customMosaicPuzzlesRef.current = puzzles;
    // Resolve host username from players map
    const players = session.players || {};
    const hostPlayer = players[session.hostUid];
    setCustomMosaicPlay({
      id: session.mosaicId,
      title: session.mosaicTitle,
      grid: grid,
      authorUsername: hostPlayer?.username || session.hostUsername || null,
    });
    const isHost = session.hostUid === firebaseUser.uid;
    // Build other players map (everyone except me)
    const otherPlayers = {};
    for (const [uid, p] of Object.entries(players)) {
      if (uid !== firebaseUser.uid) otherPlayers[uid] = p;
    }
    setCoopMosaicSessionId(session.id);
    setCoopMosaicRole(isHost ? "host" : "guest");
    setCoopMosaicStatus(session.status || "waiting");
    setCoopMosaicPlayers(otherPlayers);
    setCoopMosaicSharedProgress(session.tileProgress || {});
    setCoopMosaicSharedTileTimes(session.tileTimes || {});
    setCustomMosaicProgress(session.tileProgress || {});
    setCoopMosaicOtherFills({});
    coopMosaicCurrentTileRef.current = -1;
    coopMosaicJoinedRef.current = true;
    coopMosaicWriteThrottleRef.current = {};
    // Initialize prev-solved with tiles already solved in the session
    const alreadySolved = new Set();
    for (const [k, v] of Object.entries(session.tileProgress || {})) {
      if (v > 0) alreadySolved.add(Number(k));
    }
    coopMosaicPrevSolvedRef.current = alreadySolved;
    // Signal we're back online by updating our current tile to -1 (overview)
    updateCoopMosaicCurrentTile(session.id, firebaseUser.uid, -1).catch(() => {});
    // Keep session ID in URL so page refresh rejoins the session
    setCoopUrlParam("coopMosaic", session.id);
    customMosaicReturnViewRef.current = "menu";
    setDifficulty("mosaic");
    setView("custom-mosaic");
  }, [firebaseUser, buildCustomMosaicPuzzles]);

  // Close a coop mosaic session permanently (from active sessions panel)
  const closeCoopMosaicSessionPermanently = useCallback(async (sessionId, session) => {
    if (!firebaseUser) return;
    const playerUids = session?.players ? Object.keys(session.players) : [session?.hostUid].filter(Boolean);
    await closeCoopMosaicSession(sessionId, playerUids).catch(() => {});
    if (coopMosaicSessionId === sessionId) {
      leaveCoopMosaicSession();
    }
  }, [firebaseUser, coopMosaicSessionId, leaveCoopMosaicSession]);

  // Subscribe to coop mosaic session changes
  useEffect(() => {
    if (!coopMosaicSessionId || !firebaseUser) return;
    if (coopMosaicUnsubRef.current) coopMosaicUnsubRef.current();

    const unsub = subscribeToCoopMosaicSession(coopMosaicSessionId, (data) => {
      if (!data) {
        // During session creation the Firebase write may not have completed
        // yet, so the subscription briefly sees null.  Don't tear down.
        if (coopMosaicCreatingRef.current) return;
        setRadialMenuStack([]);
        leaveCoopMosaicSession();
        return;
      }
      const myUid = firebaseUser.uid;
      const players = data.players || {};

      // Track that we've joined
      if (players[myUid]) {
        coopMosaicJoinedRef.current = true;
      }
      // Detect player removal (kicked from session)
      if (!players[myUid] && coopMosaicJoinedRef.current) {
        coopMosaicJoinedRef.current = false;
        setRadialMenuStack([]);
        leaveCoopMosaicSession();
        setView("menu");
        return;
      }

      // Build other players map (everyone except me, with currentTile != null = connected)
      const otherPlayers = {};
      for (const [uid, p] of Object.entries(players)) {
        if (uid !== myUid) {
          otherPlayers[uid] = { username: p.username || null, currentTile: p.currentTile ?? null };
        }
      }
      setCoopMosaicPlayers(otherPlayers);
      // Don't override status while mosaic guest join is in-flight
      if (!coopMosaicJoiningRef.current) setCoopMosaicStatus(data.status);

      // Sync invited UIDs
      const mosaicInvited = data.invitedUids || {};
      setCoopMosaicInvitedUids(new Set(Object.keys(mosaicInvited)));

      // Sync locked cells for current tile from Firebase
      const myTileForLock = coopMosaicCurrentTileRef.current;
      if (myTileForLock != null && myTileForLock >= 0) {
        const tlc = data.tileLockedCells || {};
        const tileLockedObj = tlc[myTileForLock] || {};
        const lockedForTile = Object.keys(tileLockedObj);
        if (lockedForTile.length > 0) {
          setLockedCells(prev => {
            const next = new Set(prev);
            let changed = false;
            for (const k of lockedForTile) {
              if (!next.has(k)) { next.add(k); changed = true; }
            }
            return changed ? next : prev;
          });
          // Clear local fills for cells that are no longer in Firebase
          // (cells that were wrong and cleared by another player's check)
          const allFillsInFirebase = {};
          const allFills = data.fills || {};
          const lockPrefix = `${myTileForLock}_`;
          for (const [fk, fv] of Object.entries(allFills)) {
            if (fk.startsWith(lockPrefix)) allFillsInFirebase[fk.slice(lockPrefix.length)] = fv;
          }
          const lockedSet = new Set(lockedForTile);
          setFills(prev => {
            let changed = false;
            const next = {};
            for (const [k, v] of Object.entries(prev)) {
              if (lockedSet.has(k) || allFillsInFirebase[k] != null) {
                next[k] = v;
              } else {
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
      }

      // Sync shared progress and update local customMosaicProgress
      const tp = data.tileProgress || {};
      const tt = data.tileTimes || {};
      setCoopMosaicSharedProgress(tp);
      setCoopMosaicSharedTileTimes(tt);
      // Merge shared progress into local so startPuzzle sees completed tiles
      setCustomMosaicProgress(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const [k, v] of Object.entries(tp)) {
          if (v > 0 && !(merged[k] > 0)) { merged[k] = v; changed = true; }
        }
        return changed ? merged : prev;
      });

      // Detect if the tile we're currently viewing was just completed by another player
      const myTileForCompletion = coopMosaicCurrentTileRef.current;
      if (myTileForCompletion != null && myTileForCompletion >= 0) {
        const tileKey = String(myTileForCompletion);
        const tileSolvedNow = (tp[tileKey] || tp[myTileForCompletion] || 0) > 0;
        const tileSolvedBefore = coopMosaicPrevSolvedRef.current.has(myTileForCompletion);
        if (tileSolvedNow && !tileSolvedBefore) {
          // This tile was just completed (by another player) while we're viewing it
          // Transition to "won" state so the player sees completion instead of a reset
          const tilePuzzle = customMosaicPuzzlesRef.current?.[myTileForCompletion];
          if (tilePuzzle) {
            setFills(solutionFillsFromPuzzle(tilePuzzle));
            setGameState("won");
            setLockedCells(new Set(tilePuzzle.blanks));
            setWrongCells(new Set());
            setShowParticles(true);
            setTimeout(() => setShowParticles(false), 1500);
            stopTimer();
          }
        }
      }
      // Update the set of previously-seen solved tiles
      const newSolved = new Set();
      for (const [k, v] of Object.entries(tp)) {
        if (v > 0) newSolved.add(Number(k));
      }
      coopMosaicPrevSolvedRef.current = newSolved;

      // Sync other players' fills for the current tile
      const myTile = coopMosaicCurrentTileRef.current;
      if (myTile != null && myTile >= 0) {
        const prefix = `${myTile}_`;
        const otherFills = {};
        const allFills = data.fills || {};
        for (const [key, val] of Object.entries(allFills)) {
          if (key.startsWith(prefix)) {
            const cellKey = key.slice(prefix.length);
            otherFills[cellKey] = val;
          }
        }
        setCoopMosaicOtherFills(otherFills);
      } else {
        setCoopMosaicOtherFills({});
      }

      // Sync reactions from Firebase — detect new reactions and trigger floating animation
      const reactions = data.reactions || {};
      const reactionKeys = Object.keys(reactions);
      const prevSeenMosaic = coopMosaicSeenReactionsRef.current;
      reactionKeys.forEach(key => {
        if (!prevSeenMosaic.has(key)) {
          const r = reactions[key];
          // Only animate other players' reactions (local user's are shown immediately on send)
          if (r.uid !== myUid) {
            const playerColor = "#FF9FF3";
            addFloatingReaction(r.emoji, r.username || "Player", playerColor, r.type || "emoji");
          }
        }
      });
      coopMosaicSeenReactionsRef.current = new Set(reactionKeys);

      // Check if all 25 tiles are solved
      const allTp = data.tileProgress || {};
      const allSolvedCount = Object.values(allTp).filter(v => v > 0).length;
      if (allSolvedCount === 25 && data.status !== "complete") {
        completeCoopMosaicSession(coopMosaicSessionId).catch(() => {});
      }
    });

    coopMosaicUnsubRef.current = unsub;
    return () => {
      unsub();
      coopMosaicUnsubRef.current = null;
    };
  }, [coopMosaicSessionId, firebaseUser, leaveCoopMosaicSession, stopTimer, addFloatingReaction]);

  // Load profile pictures for coop mosaic players as they join
  useEffect(() => {
    const uids = Object.keys(coopMosaicPlayers);
    if (uids.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const uid of uids) {
        if (cancelled) break;
        // Skip if we already fetched (even if null)
        setCoopMosaicPlayerPics(prev => {
          if (uid in prev) return prev;
          // Kick off async load
          loadUserProfile(uid).then(profile => {
            if (!cancelled) {
              setCoopMosaicPlayerPics(p => ({ ...p, [uid]: profile?.profilePicture || null }));
            }
          }).catch(() => {
            if (!cancelled) setCoopMosaicPlayerPics(p => ({ ...p, [uid]: null }));
          });
          return { ...prev, [uid]: undefined }; // Mark as loading
        });
      }
    })();
    return () => { cancelled = true; };
  }, [coopMosaicPlayers]);

  // Handle guest joining coop mosaic: once auth ready + session ID set with role=guest, join
  useEffect(() => {
    if (coopMosaicRole !== "guest" || coopMosaicStatus !== "joining" || !firebaseUser || !coopMosaicSessionId) return;
    let cancelled = false;
    coopMosaicJoiningRef.current = true;
    (async () => {
      try {
        const session = await joinCoopMosaicSession(coopMosaicSessionId, firebaseUser.uid, username);
        if (cancelled || !session) {
          if (!cancelled) {
            // Session doesn't exist — clean URL param
            clearCoopUrlParam("coopMosaic");
            setCoopMosaicSessionId(null);
            setCoopMosaicRole(null);
            setCoopMosaicStatus(null);
            setView("menu");
          }
          return;
        }
        // Normalize grid from Firebase (may have been stored as object with numeric keys)
        const rawGrid = session.mosaicGrid;
        const normalizeRow = (row) => {
          if (Array.isArray(row)) return row;
          const arr = [];
          for (let i = 0; i < 25; i++) arr.push((row && row[i]) ?? null);
          return arr;
        };
        const gridArr = Array.isArray(rawGrid) ? rawGrid : (() => {
          const arr = [];
          for (let i = 0; i < 25; i++) arr.push(rawGrid?.[i] ?? null);
          return arr;
        })();
        const grid = gridArr.map(normalizeRow);
        // Build mosaic puzzles from session grid
        const puzzles = buildCustomMosaicPuzzles(grid);
        customMosaicPuzzlesRef.current = puzzles;
        // Resolve host username from players map
        const players = session.players || {};
        const hostPlayer = players[session.hostUid];
        setCustomMosaicPlay({
          id: session.mosaicId,
          title: session.mosaicTitle,
          grid: grid,
          authorUsername: hostPlayer?.username || null,
        });
        // Build other players map
        const otherPlayers = {};
        for (const [uid, p] of Object.entries(players)) {
          if (uid !== firebaseUser.uid) otherPlayers[uid] = { username: p.username || null, currentTile: p.currentTile ?? null };
        }
        // Restore shared progress
        setCoopMosaicSharedProgress(session.tileProgress || {});
        setCoopMosaicSharedTileTimes(session.tileTimes || {});
        setCustomMosaicProgress(session.tileProgress || {});
        // Detect correct role — on page refresh the init code always sets "guest",
        // but if this user is actually the host we need to correct that
        if (session.hostUid === firebaseUser.uid) {
          setCoopMosaicRole("host");
        }
        setCoopMosaicStatus("playing");
        setCoopMosaicPlayers(otherPlayers);
        coopMosaicCurrentTileRef.current = -1;
        coopMosaicJoinedRef.current = true;
        coopMosaicWriteThrottleRef.current = {};
        // Initialize prev-solved with tiles already solved in the session
        const guestAlreadySolved = new Set();
        for (const [k, v] of Object.entries(session.tileProgress || {})) {
          if (v > 0) guestAlreadySolved.add(Number(k));
        }
        coopMosaicPrevSolvedRef.current = guestAlreadySolved;
        customMosaicReturnViewRef.current = "menu";
        setDifficulty("mosaic");
        setView("custom-mosaic");
      } catch (e) {
        console.error("Failed to join coop mosaic session:", e);
        if (!cancelled) {
          clearCoopUrlParam("coopMosaic");
          setCoopMosaicSessionId(null);
          setCoopMosaicRole(null);
          setCoopMosaicStatus(null);
          setView("menu");
        }
      } finally {
        coopMosaicJoiningRef.current = false;
      }
    })();
    return () => { cancelled = true; coopMosaicJoiningRef.current = false; };
  }, [coopMosaicRole, coopMosaicStatus, firebaseUser, coopMosaicSessionId, username, buildCustomMosaicPuzzles]);

  // Sync my fills to Firebase in coop mosaic mode when they change
  useEffect(() => {
    if (!isCoopMosaic || !coopMosaicSessionId) return;
    const tileIdx = coopMosaicCurrentTileRef.current;
    if (tileIdx == null || tileIdx < 0) return;
    // Write fills for current tile
    for (const [key, val] of Object.entries(fills)) {
      const fillKey = `${tileIdx}_${key}`;
      const prev = coopMosaicWriteThrottleRef.current[fillKey];
      if (prev !== val) {
        coopMosaicWriteThrottleRef.current[fillKey] = val;
        updateCoopMosaicFill(coopMosaicSessionId, fillKey, val).catch(() => {});
      }
    }
    // Also handle removals: if a key was previously written but is no longer in fills
    const prefix = `${tileIdx}_`;
    for (const prevKey of Object.keys(coopMosaicWriteThrottleRef.current)) {
      if (prevKey.startsWith(prefix)) {
        const cellKey = prevKey.slice(prefix.length);
        if (!(cellKey in fills)) {
          delete coopMosaicWriteThrottleRef.current[prevKey];
          updateCoopMosaicFill(coopMosaicSessionId, prevKey, null).catch(() => {});
        }
      }
    }
  }, [isCoopMosaic, fills, coopMosaicSessionId]);

  // Clean up coop mosaic on unmount
  useEffect(() => {
    return () => {
      if (coopMosaicUnsubRef.current) {
        coopMosaicUnsubRef.current();
        coopMosaicUnsubRef.current = null;
      }
    };
  }, []);

  const handleTokenSelect = useCallback((token) => {
    setSelectedToken(token);
    // Cancel pass mode when a regular token is selected
    if (coopPassMode) { setCoopPassMode(null); setCoopPassPlayerPicker(false); }
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

  const maxAttempts = isCoopMosaic ? Infinity : isCascade ? 5 : isBlind ? 6 : 5;

  const checkSolution = () => {
    if (!puzzle) return;

    let allCorrect = true;
    const wrong = new Set();
    const newLocked = new Set(lockedCells);

    // In coop mosaic mode, merge partner fills with my fills for checking
    const checkFills = isCoopMosaic ? { ...coopMosaicOtherFills, ...fills } : fills;

    // Check which blanks are still active (not locked)
    const activeBlanks = [...puzzle.blanks].filter(k => !lockedCells.has(k));

    for (const key of activeBlanks) {
      const [r, c] = key.split("-").map(Number);
      if (checkFills[key] === puzzle.solution[r][c]) {
        if (isBlind) newLocked.add(key); // lock correct cells in blind mode
        if (isCoopMosaic) newLocked.add(key); // lock correct cells in coop mosaic mode
      } else {
        allCorrect = false;
        wrong.add(key);
      }
    }

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
          const runState = { level: nextLevel, elapsedSeconds: getElapsedSeconds(), fills: {}, attempts };
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
        setAttempts(attempts + 1);
        setGameState("won");
        stopTimer();
        const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : elapsedTime;
        if (isBlind) setLockedCells(new Set([...puzzle.blanks]));
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1500);
        // Custom mosaic: track progress
        // Store attempts + 1 so that first-try solves (attempts=0) are stored as 1,
        // ensuring all >0 completion checks recognise the tile as solved.
        // Vault mode: handle tile completion and return to vault view
        if (isVault && vaultSolvingTile !== null && vaultSessionId) {
          const vaultAttempts = attempts + 1;
          const tileIdx = vaultSolvingTile;
          updateVaultTileProgress(vaultSessionId, tileIdx, vaultAttempts, finalTime).catch(() => {});
          clearVaultTileFills(vaultSessionId, tileIdx).catch(() => {});
          loadVaultSession(vaultSessionId).then((vSnap) => {
            if (vSnap) {
              const vPlayers = vSnap.players || {};
              const otherUid = Object.keys(vPlayers).find(u => u !== firebaseUser.uid);
              if (otherUid) {
                advanceVaultTurn(vaultSessionId, otherUid).catch(() => {});
              }
              const newUnlocked = computeUnlockedTiles({ ...vSnap.tileProgress, [tileIdx]: vaultAttempts }, vSnap.tileUnlocked, vSnap.gridLayout);
              updateVaultTileUnlocked(vaultSessionId, newUnlocked).catch(() => {});
            }
            updateVaultCurrentTile(vaultSessionId, firebaseUser.uid, -1).catch(() => {});
          }).catch(() => {});
          setTimeout(() => {
            setVaultSolvingTile(null);
            setView("vault");
          }, 1500);
        } else if (customMosaicPuzzlesRef.current && isMosaic) {
          const mosaicAttempts = attempts + 1;
          setCustomMosaicProgress(prev => ({ ...prev, [progressKey]: mosaicAttempts }));
          if (isCoopMosaic && coopMosaicSessionId) {
            // Coop mosaic: write ONLY to Firebase session (single source of truth)
            // Local progress will be synced via subscription; personal save happens after mosaic completion
            updateCoopMosaicTileProgress(coopMosaicSessionId, progressKey, mosaicAttempts, finalTime).catch(() => {});
            clearCoopMosaicTileFills(coopMosaicSessionId, progressKey).catch(() => {});
          } else if (customMosaicPlay?.id) {
            // Solo mosaic: persist to local progress.mosaicCompletions
            const mosaicId = customMosaicPlay.id;
            const prevCompletions = progress.mosaicCompletions || {};
            const prevMosaic = prevCompletions[mosaicId] || {};
            const newMosaicProgress = { ...prevMosaic, [progressKey]: mosaicAttempts };
            const newCompletions = { ...prevCompletions, [mosaicId]: newMosaicProgress };
            const newProgress = { ...progress, mosaicCompletions: newCompletions };
            setProgress(newProgress);
            saveProgress(newProgress);
            // Save per-tile time for mosaic stats
            const mct = times.mosaicCompletionTimes || {};
            const prevMosaicTimes = mct[mosaicId] || {};
            const newMosaicTimes = { ...prevMosaicTimes, [progressKey]: finalTime };
            const newTimes = { ...times, mosaicCompletionTimes: { ...mct, [mosaicId]: newMosaicTimes } };
            setTimes(newTimes);
            saveTimes(newTimes);
          }
        } else {
          // Store attempts + 1 so that first-try solves (attempts=0) are stored as 1,
          // ensuring all >0 completion checks recognise the puzzle as solved (0 = failed).
          const savedAttempts = attempts + 1;
          const newDiffProgress = { ...diffProgress, [progressKey]: savedAttempts };
          const newProgress = { ...progress, [difficulty]: newDiffProgress };
          setProgress(newProgress);
          saveProgress(newProgress);
          const diffTimes = times[difficulty] || {};
          const newDiffTimes = { ...diffTimes, [progressKey]: finalTime };
          const newTimes = { ...times, [difficulty]: newDiffTimes };
          setTimes(newTimes);
          saveTimes(newTimes);
          showNewAchievements(newProgress, newTimes);
          // Save puzzle completion for rankings & load ranking
          if (firebaseUser && progressKey != null) {
            const compKey = isDaily && currentDailyDate ? currentDailyDate : String(progressKey);
            savePuzzleCompletion(firebaseUser.uid, difficulty, compKey, {
              attempts: savedAttempts,
              time: finalTime,
              username: username || null,
            }).catch(() => {});
            // Update presence: last solved puzzle
            updatePresence(firebaseUser.uid, {
              online: true, status: "idle",
              lastSolvedMode: difficulty,
              lastSolvedPuzzle: compKey,
              lastSolvedAt: Date.now(),
              currentMode: null, currentPuzzle: null, currentCoopSessionId: null,
            }).catch(() => {});
            // Ranking updates via real-time subscription
          }
        }
      }
    } else if (attempts + 1 >= maxAttempts) {
      // Failed - increment attempts
      setAttempts(attempts + 1);
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
      // Wrong guess but still have attempts - increment
      setAttempts(attempts + 1);
      setWrongCells(wrong);
      if (isBlind || isCoopMosaic) {
        setLockedCells(newLocked);
      }
      // In coop mosaic mode, write locked cells to Firebase so other players see them
      if (isCoopMosaic && coopMosaicSessionId) {
        const tileIdx = coopMosaicCurrentTileRef.current;
        if (tileIdx != null && tileIdx >= 0) {
          const correctCells = activeBlanks.filter(k => !wrong.has(k));
          if (correctCells.length > 0) {
            updateCoopMosaicTileLockedCells(coopMosaicSessionId, tileIdx, correctCells).catch(() => {});
          }
        }
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
        // In coop mosaic mode, also clear wrong fills from Firebase for all players
        if (isCoopMosaic && coopMosaicSessionId) {
          const tileIdx = coopMosaicCurrentTileRef.current;
          if (tileIdx != null && tileIdx >= 0) {
            for (const k of wrongSet) {
              updateCoopMosaicFill(coopMosaicSessionId, `${tileIdx}_${k}`, null).catch(() => {});
            }
          }
        }
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

    if (allCorrect) {
      setCoopMyLockedIn(true);
      // Lock my cells visually
      setLockedCells(prev => {
        const next = new Set(prev);
        for (const k of coopMyBlanks) next.add(k);
        return next;
      });
      await lockInCoopPlayer(coopSessionId, coopRole, true, firebaseUser?.uid);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 1500);
    } else if (attempts + 1 >= 5) {
      // Failed all shared attempts — increment and sync to Firebase
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      updateCoopAttempts(coopSessionId, newAttempts).catch(() => {});
      // All players lose (subscription handles others)
      setGameState("lost");
      setWrongCells(wrong);
      await lockInCoopPlayer(coopSessionId, coopRole, false, firebaseUser?.uid);
    } else {
      // Wrong guess but still have attempts - increment and sync
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      updateCoopAttempts(coopSessionId, newAttempts).catch(() => {});
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

  // Detect coop completion: use the Firebase-derived flag (single source of truth) rather
  // than combining separate state variables that may update in different render cycles.
  // coopEveryoneLockedCorrect is set in the subscription handler only when Firebase data
  // confirms ALL players are locked in AND correct — prevents premature completion when
  // one player locks in but the other hasn't yet.
  const coopComplete = isCoop && coopEveryoneLockedCorrect && gameState === "playing";

  // Effect: when coop is complete, trigger win state, save progress, then auto-close session
  useEffect(() => {
    if (!coopComplete || !puzzle) return;

    setGameState("won");
    stopTimer();
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 1500);

    // Lock all cells
    setLockedCells(new Set(puzzle.blanks));

    // Save progress as coop completion — read fresh from localStorage to avoid stale closure
    const finalTime = timerStart.current ? Math.round((Date.now() - timerStart.current) / 1000) : 0;
    const freshProgress = loadProgress();
    const coopProgress = freshProgress.coop || {};
    const newCoopProgress = { ...coopProgress, [`${difficulty}_${progressKey}`]: attempts + 1 };
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

    // Auto-close the coop session after completion (with delay for the win animation)
    const sessionId = coopSessionId;
    const role = coopRole;
    if (sessionId) {
      // Only the host closes/deletes the session; guest just cleans up locally
      setTimeout(async () => {
        if (role === "host") {
          try {
            const session = await loadCoopSession(sessionId);
            if (session) {
              await closeCoopSession(sessionId, session.hostUid, session.guestUid);
            }
          } catch { /* ignore */ }
        }
      }, 3000);
    }
  }, [coopComplete, puzzle, stopTimer, difficulty, progressKey, attempts, showNewAchievements, coopSessionId, coopRole]);

  // For blind mode: all non-locked blanks must be filled
  const activeBlanks = puzzle ? [...puzzle.blanks].filter(k => !lockedCells.has(k)) : [];
  const coopMyBlanksArr = isCoop && coopMyBlanks ? [...coopMyBlanks] : [];
  const allFilled = isCoop
    ? coopMyBlanksArr.every(k => fills[k])
    : isCoopMosaic
      ? puzzle ? [...puzzle.blanks].every(k => lockedCells.has(k) || fills[k] || coopMosaicOtherFills[k]) : false
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
  const edgePad = isMobile ? 12 : 24;
  const parentW = viewportSize.w;
  const parentH = viewportSize.h - headerHeight - footerHeight - infoRowHeight;
  const availW = parentW - 2 * edgePad - (gridSize - 1) * gridGap - 2 * gridPad;
  const availH = parentH - 2 * edgePad - (gridSize - 1) * gridGap - 2 * gridPad;
  const dynamicCell = Math.min(Math.floor(availW / gridSize), Math.floor(availH / gridSize));
  const cellSize = Math.max(28, dynamicCell);
  const gridTotalWidth = cellSize * gridSize + (gridSize - 1) * gridGap + 2 * gridPad;
  const iconSize = Math.max(14, Math.round(cellSize * 0.5));
  const pickerSize = 48;

  // --- Global co-op invite toast (appears on any view) ---
  const coopInviteToastEl = coopInviteToast && firebaseUser && (() => {
    const isMosaicInvite = coopInviteToast.type === "coop_mosaic_invite";
    const isVaultInvite = coopInviteToast.type === "vault_invite";
    return (
    <div style={{
      position: "fixed",
      top: "calc(16px + env(safe-area-inset-top, 0px))",
      left: "50%", transform: "translateX(-50%)",
      zIndex: 1050,
      maxWidth: "calc(100vw - 32px)", width: 360, boxSizing: "border-box",
      animation: "fadeUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      pointerEvents: "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", borderRadius: 14,
        backgroundColor: C.surface, border: `1.5px solid ${C.coop}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${C.coop}33`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          backgroundColor: C.coop + "22", display: "flex", alignItems: "center", justifyContent: "center",
          border: `2px solid ${C.coop}44`,
        }}>
          <span style={{ fontSize: 16, color: C.coop }}>{isVaultInvite ? "\uD83D\uDD12" : isMosaicInvite ? "\u25A6" : "\u2694"}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
            color: C.text, lineHeight: 1.3,
          }}>
            {coopInviteToast.fromUsername || "Someone"} invited you to {isVaultInvite ? "a vault!" : isMosaicInvite ? "co-op mosaic!" : "co-op!"}
          </div>
          {isVaultInvite ? (
            coopInviteToast.data?.difficulty && (
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                {(VAULT_DIFFICULTIES[coopInviteToast.data.difficulty] || {}).label || coopInviteToast.data.difficulty}
              </div>
            )
          ) : isMosaicInvite ? (
            coopInviteToast.data?.mosaicTitle && (
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                {coopInviteToast.data.mosaicTitle}
              </div>
            )
          ) : (
            coopInviteToast.data?.mode && (
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                {coopInviteToast.data.mode} #{(coopInviteToast.data.level ?? 0) + 1}
              </div>
            )
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {coopInviteToast.data?.sessionId && (
            <button
              onClick={async () => {
                if (isVaultInvite) {
                  // Join vault session
                  setVaultSessionId(coopInviteToast.data.sessionId);
                  setVaultRole("guest");
                  setView("vault");
                  setRadialMenuStack([]);
                } else if (isMosaicInvite) {
                  // Join coop mosaic session
                  setCoopMosaicSessionId(coopInviteToast.data.sessionId);
                  setCoopMosaicRole("guest");
                  setCoopMosaicStatus("joining");
                  coopMosaicJoiningRef.current = true;
                } else {
                  const session = await loadCoopSession(coopInviteToast.data.sessionId);
                  if (session && session.status !== "complete") {
                    setDifficulty(session.mode);
                    setCurrentPuzzle(session.level ?? 0);
                    if (session.dailyDate) setCurrentDailyDate(session.dailyDate);
                    setCoopSessionId(session.id);
                    setCoopRole("guest");
                    setCoopStatus("joining");
                    coopJoiningRef.current = true;
                    setFills({});
                    setAttempts(0);
                    setGameState("playing");
                    setWrongCells(new Set());
                    setLockedCells(new Set());
                    setShowParticles(false);
                    setSelectedCell(null);
                    setSelectedToken(null);
                    setView("play");
                  }
                }
                dismissNotification(firebaseUser.uid, coopInviteToast.id).catch(() => {});
                setCoopInviteToast(null);
                if (coopInviteToastTimer.current) { clearTimeout(coopInviteToastTimer.current); coopInviteToastTimer.current = null; }
              }}
              style={{
                background: C.coop, border: "none", borderRadius: 8,
                padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: 11,
                fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: 0.5,
              }}
            >
              Join
            </button>
          )}
          <button
            onClick={() => {
              setCoopInviteToast(null);
              if (coopInviteToastTimer.current) { clearTimeout(coopInviteToastTimer.current); coopInviteToastTimer.current = null; }
            }}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "6px 8px", color: C.textDim, cursor: "pointer", fontSize: 11,
            }}
            title="Dismiss"
          >{"\u2715"}</button>
        </div>
      </div>
    </div>
    );
  })();

  // Friend activity is handled by real-time subscriptions (subscribeToFriendPresence)

  // --- Load Admin Metrics ---
  const loadAdminMetricsData = useCallback(async () => {
    if (!isAdmin) return;
    setAdminMetricsLoading(true);
    try {
      const allStats = await loadAllPublicStats();
      const userEntries = Object.entries(allStats);
      const totalUsers = userEntries.length;
      const activeUsers = userEntries.filter(([, s]) => s.updatedAt && (Date.now() - s.updatedAt) < 7 * 86400000).length;
      const modes = ["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"];

      // Per-mode aggregate stats
      const modeStats = {};
      let globalTotalSolved = 0;
      let globalTotalAchievements = 0;
      const solvedDistribution = []; // array of totalSolved per user

      for (const [, stats] of userEntries) {
        const ts = stats.totalSolved || 0;
        globalTotalSolved += ts;
        globalTotalAchievements += stats.achievements || 0;
        solvedDistribution.push(ts);
        const prog = stats.progress || {};
        for (const mode of modes) {
          if (!modeStats[mode]) modeStats[mode] = { totalSolved: 0, players: 0, solvedCounts: [] };
          const count = prog[mode] || 0;
          modeStats[mode].totalSolved += count;
          if (count > 0) modeStats[mode].players++;
          modeStats[mode].solvedCounts.push(count);
        }
      }

      // Calculate averages, medians, and difficulty indicators
      for (const mode of modes) {
        const ms = modeStats[mode];
        ms.avgSolved = totalUsers > 0 ? (ms.totalSolved / totalUsers).toFixed(1) : 0;
        const activeCounts = ms.solvedCounts.filter(c => c > 0);
        ms.avgSolvedActive = activeCounts.length > 0 ? (activeCounts.reduce((a, b) => a + b, 0) / activeCounts.length).toFixed(1) : 0;
        ms.completionRate = totalUsers > 0 ? ((ms.players / totalUsers) * 100).toFixed(0) : 0;
      }

      // Load per-puzzle completion data for difficulty analysis (easy, medium, hard modes)
      const difficultyAnalysis = {};
      for (const mode of ["easy", "medium", "hard"]) {
        try {
          const completions = await loadAllPuzzleCompletionsForMode(mode);
          const puzzleKeys = Object.keys(completions);
          const puzzleStats = [];
          for (const pk of puzzleKeys) {
            const entries = Object.values(completions[pk]);
            if (entries.length === 0) continue;
            const attempts = entries.map(e => e.attempts || 0).filter(a => a > 0);
            const timesArr = entries.map(e => e.time || 0).filter(t => t > 0);
            const avgAttempts = attempts.length > 0 ? (attempts.reduce((a, b) => a + b, 0) / attempts.length) : 0;
            const avgTime = timesArr.length > 0 ? (timesArr.reduce((a, b) => a + b, 0) / timesArr.length) : 0;
            const goldRate = attempts.length > 0 ? (attempts.filter(a => a === 1).length / attempts.length * 100) : 0;
            puzzleStats.push({
              puzzleKey: pk,
              players: entries.length,
              avgAttempts: avgAttempts.toFixed(1),
              avgTime: avgTime.toFixed(0),
              goldRate: goldRate.toFixed(0),
            });
          }
          puzzleStats.sort((a, b) => parseFloat(b.avgAttempts) - parseFloat(a.avgAttempts));
          difficultyAnalysis[mode] = puzzleStats;
        } catch { difficultyAnalysis[mode] = []; }
      }

      // Engagement: users by total solved ranges
      const engagementBuckets = [
        { label: "0 puzzles", min: 0, max: 0, count: 0 },
        { label: "1-10", min: 1, max: 10, count: 0 },
        { label: "11-50", min: 11, max: 50, count: 0 },
        { label: "51-100", min: 51, max: 100, count: 0 },
        { label: "101-200", min: 101, max: 200, count: 0 },
        { label: "200+", min: 201, max: Infinity, count: 0 },
      ];
      for (const ts of solvedDistribution) {
        for (const b of engagementBuckets) {
          if (ts >= b.min && ts <= b.max) { b.count++; break; }
        }
      }

      setAdminMetrics({
        totalUsers,
        activeUsers,
        globalTotalSolved,
        globalTotalAchievements,
        modeStats,
        difficultyAnalysis,
        engagementBuckets,
        avgSolvedPerUser: totalUsers > 0 ? (globalTotalSolved / totalUsers).toFixed(1) : 0,
      });
    } catch (e) {
      console.error("Admin metrics load failed:", e);
    } finally {
      setAdminMetricsLoading(false);
    }
  }, [isAdmin]);

  // --- Real-time Admin User Activity ---
  const adminStatsRef = useRef({});
  const adminPresenceRef = useRef({});
  const buildAdminActivityList = useCallback((allStats, allPresence) => {
    const userEntries = Object.entries(allStats);
    return userEntries.map(([uid, stats]) => {
      const presence = allPresence[uid] || {};
      return {
        uid,
        username: stats.username || null,
        totalSolved: stats.totalSolved || 0,
        achievements: stats.achievements || 0,
        progress: stats.progress || {},
        updatedAt: stats.updatedAt || 0,
        online: presence.online || false,
        status: presence.status || null,
        lastSeen: presence.lastSeen || 0,
        currentMode: presence.currentMode || null,
        currentPuzzle: presence.currentPuzzle || null,
        lastSolvedMode: presence.lastSolvedMode || null,
        lastSolvedPuzzle: presence.lastSolvedPuzzle || null,
        lastSolvedAt: presence.lastSolvedAt || 0,
      };
    });
  }, []);

  useEffect(() => {
    if (!isAdmin || view !== "admin-users") return;
    setAdminUserActivityLoading(true);
    const unsubStats = subscribeToAllPublicStats((allStats) => {
      adminStatsRef.current = allStats;
      setAdminUserActivity(buildAdminActivityList(allStats, adminPresenceRef.current));
      setAdminUserActivityLoading(false);
    });
    const unsubPresence = subscribeToAllPresence((allPresence) => {
      adminPresenceRef.current = allPresence;
      setAdminUserActivity(buildAdminActivityList(adminStatsRef.current, allPresence));
      setAdminUserActivityLoading(false);
    });
    return () => {
      unsubStats();
      unsubPresence();
    };
  }, [isAdmin, view, buildAdminActivityList]);

  // Shared modal elements — computed before any view early-returns so they're available everywhere.

  // Helper: format "time ago" from a timestamp
  const formatTimeAgo = (ts) => {
    if (!ts) return "Unknown";
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  // Helper: check if a friend is considered "online" (seen within last 2 minutes)
  const isFriendOnline = (presence) => {
    if (!presence || !presence.lastSeen) return false;
    return (Date.now() - presence.lastSeen) < 120000;
  };

  // Helper: format puzzle label from mode + puzzle key
  const formatPuzzleLabel = (mode, puzzleKey) => {
    if (!mode) return null;
    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
    if (mode === "daily") return `Daily (${puzzleKey || "today"})`;
    if (mode === "cascade") return `Cascade #${(parseInt(puzzleKey) || 0) + 1}`;
    return `${modeLabel} #${(parseInt(puzzleKey) || 0) + 1}`;
  };

  // --- Extracted Global Modals (DraggableDrawer-based, rendered once at top level) ---

  const coopInviteEl = null; // Moved to Liquid Glass menu

  const coopMosaicInviteUrl = isCoopMosaic && coopMosaicSessionId ? `${typeof window !== "undefined" ? window.location.origin + window.location.pathname : ""}?coopMosaic=${coopMosaicSessionId}` : "";

  const coopMosaicInviteEl = null; // Moved to Liquid Glass menu

  const coopFriendPickerEl = null; // Moved to Liquid Glass menu

  // --- Local mosaic navigate modal ---
  const coopMosaicNavigateEl = showCoopMosaicNavigate && (
    <div onClick={() => setShowCoopMosaicNavigate(false)} style={{
      position: "fixed", inset: 0, zIndex: 1200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      pointerEvents: "all",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: C.surface, borderRadius: 16, padding: "20px", maxWidth: 320, width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Navigate to Tile</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(coopMosaicPlayers).filter(([uid]) => uid !== firebaseUser?.uid).map(([uid, player]) => (
            <button key={uid} onClick={() => {
              if (player.currentTileIndex != null) {
                setCustomMosaicCurrentTileIndex(player.currentTileIndex);
              }
              setShowCoopMosaicNavigate(false);
            }} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: C.text }}>{player.username || "Player"}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>Tile {player.currentTileIndex != null ? player.currentTileIndex + 1 : "?"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // --- Floating friend reactions overlay (appears on any view) ---
  const friendReactionsOverlayEl = friendFloatingReactions.length > 0 && (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998,
      overflow: "hidden",
    }}>
      <style>{`@keyframes coopReactionFloat { 0%{transform:translateY(0) scale(0.5);opacity:0} 8%{transform:translateY(-5vh) scale(1.1);opacity:1} 15%{transform:translateY(-10vh) scale(1)} 70%{opacity:1} 100%{transform:translateY(-85vh) scale(1.2);opacity:0} }`}</style>
      {friendFloatingReactions.map(r => (
        <div key={r.id} style={{
          position: "absolute",
          left: `${r.x}%`,
          bottom: 60,
          animation: "coopReactionFloat 3.5s ease-out forwards",
          display: "flex", flexDirection: "column", alignItems: "center",
          transform: "translateX(-50%)",
        }}>
          {r.type === "text" ? (
            <span style={{
              fontSize: 22, fontWeight: 800, fontFamily: "'Inter', sans-serif",
              color: "#fff", lineHeight: 1,
              textShadow: `0 0 14px ${r.fromColor}88, 0 2px 8px rgba(0,0,0,0.7)`,
              letterSpacing: 1,
            }}>{r.emoji}</span>
          ) : r.type === "pattern" ? (
            <span style={{
              fontSize: 56, lineHeight: 1, color: r.fromColor,
              filter: `drop-shadow(0 0 10px ${r.fromColor}88) drop-shadow(0 2px 6px rgba(0,0,0,0.5))`,
            }}>{r.emoji}</span>
          ) : (
            <span style={{ fontSize: 48, lineHeight: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>{r.emoji}</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, color: r.fromColor,
            fontFamily: "'Inter', sans-serif",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            whiteSpace: "nowrap", marginTop: 2,
          }}>{r.fromName}</span>
        </div>
      ))}
    </div>
  );

  // --- Global modals element (included in every return) ---
  const globalModalsEl = (
    <>
      {coopInviteEl}
      {coopFriendPickerEl}
      {coopMosaicInviteEl}
      {coopInviteToastEl}
      {coopMosaicNavigateEl}
      {friendReactionsOverlayEl}
    </>
  );

  // --- Vault guest join effect — fires when auth is ready and we're joining a vault ---
  useEffect(() => {
    if (vaultRole !== "guest" || !firebaseUser || !vaultSessionId) return;
    if (view !== "vault") return;
    joinVaultSession(vaultSessionId, firebaseUser.uid, username || firebaseUser.email).then((data) => {
      if (!data) {
        setVaultSessionId(null);
        setVaultRole(null);
        setView("menu");
      }
    }).catch(() => {
      setVaultSessionId(null);
      setVaultRole(null);
      setView("menu");
    });
  }, [vaultRole, firebaseUser, vaultSessionId, view, username]);

  // --- Coop Mosaic joining overlay (shown while waiting for auth + session load) ---
  // Must be before all view checks so it takes priority when accepting an invite
  if (coopMosaicStatus === "joining") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        paddingTop: "calc(32px + env(safe-area-inset-top, 0px))", paddingBottom: 32,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } @keyframes coopPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
        <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease" }}>
          <div style={{ fontSize: 28, marginBottom: 16 }}>{"\u25A6"}</div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
            color: C.coop, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8,
          }}>
            Joining Co-op Mosaic
          </div>
          {firebaseAuthReady && !firebaseUser ? (
            <>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textDim,
                marginBottom: 16,
              }}>
                Sign in to join this session
              </div>
              <button onClick={() => { setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError(""); }}
                style={{
                  marginBottom: 8, background: C.coop, border: "none", borderRadius: 8,
                  padding: "10px 24px", color: "#fff", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textDim,
              animation: "coopPulse 1.5s ease-in-out infinite",
            }}>
              {!firebaseUser ? "Signing in..." : "Loading mosaic..."}
            </div>
          )}
          <button onClick={() => {
            setCoopMosaicSessionId(null);
            setCoopMosaicRole(null);
            setCoopMosaicStatus(null);
          }}
            style={{
              marginTop: 24, background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 20px", color: C.textDim, cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: 1,
            }}
          >
            Cancel
          </button>
        </div>
        {globalModalsEl}
      </div>
    );
  }

  // --- VAULT MODE VIEW ---
  if (view === "vault" && vaultSessionId) {
    // Guard: require login for vault mode
    if (!firebaseUser) {
      return (
        <div style={{
          minHeight: "100vh", backgroundColor: C.bg, color: C.text,
          fontFamily: "'Inter', sans-serif",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 100,
        }}>
          {firebaseConfigured ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Sign in to join the Vault</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>You need an account to play vault mode.</div>
              <button onClick={() => { setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError(""); }} style={{
                padding: "10px 24px", borderRadius: 8, backgroundColor: C.accent, color: C.bg,
                fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}>Sign In</button>
              <div style={{ marginTop: 12 }}>
                <button onClick={() => { setVaultSessionId(null); setVaultRole(null); setView("menu"); }} style={{
                  padding: "6px 16px", borderRadius: 6, backgroundColor: "transparent",
                  border: `1px solid ${C.border}`, color: C.textDim, fontSize: 11, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}>Back to Menu</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.textDim }}>Loading...</div>
          )}
          {globalModalsEl}
        </div>
      );
    }
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 100, paddingLeft: 16, paddingRight: 16,
      }}>
        <VaultMode
          sessionId={vaultSessionId}
          myUid={firebaseUser?.uid}
          username={username}
          firebaseUser={firebaseUser}
          C={C}
          activeTheme={activeTheme}
          onStartPuzzle={(tileIdx, puzzle, canSolve) => {
            if (puzzle) {
              vaultPuzzlesRef.current = vaultPuzzlesRef.current || [];
              vaultPuzzlesRef.current[tileIdx] = puzzle;
              // Set difficulty to "vault" so the puzzle derivation picks up from vaultPuzzlesRef
              setDifficulty("vault");
              setVaultSolvingTile(tileIdx);
              // If tile is already solved or can't solve (not my turn), show completed state
              if (!canSolve) {
                const solFills = {};
                for (let r = 0; r < puzzle.gridSize; r++) for (let c = 0; c < puzzle.gridSize; c++) {
                  const key = `${r}-${c}`;
                  if (puzzle.blanks.has(key)) solFills[key] = puzzle.solution[r][c];
                }
                setFills(solFills);
                setLockedCells(new Set(puzzle.blanks));
                setGameState("won");
                setView("play");
              } else {
                // Start solving
                setFills({});
                setLockedCells(new Set());
                setWrongCells(new Set());
                setGameState("playing");
                setAttempts(0);
                setView("play");
              }
            }
          }}
          onBackToMenu={() => {
            setVaultSessionId(null);
            setVaultRole(null);
            setVaultSolvingTile(null);
            setView("menu");
          }}
          currentSolvingTile={vaultSolvingTile}
          onTileSolved={(tileIdx, attempts, time) => {
            setVaultSolvingTile(null);
            setView("vault");
          }}
          gameState={gameState}
          setView={setView}
          onSessionData={(data) => {
            vaultSessionDataRef.current = data;
            const invited = data?.invitedUids ? new Set(Object.keys(data.invitedUids)) : new Set();
            setVaultInvitedUids(invited);
          }}
        />
        {renderContextButton("vault", isVault ? [
          { id: "vault-invite-pill", icon: "user-plus", color: "#54A0FF", onClick: () => { setCoopSelectedFriends(new Set()); setCoopInviteUsernameInput(""); setCoopInviteUsernameMsg(""); setRadialMenuStack(["root", "coop-start"]); } },
          { id: "vault-chat-pill", icon: "message-square", color: "#54A0FF", onClick: () => { setVaultChatLastRead(Date.now()); setRadialMenuStack(["root", "vault-chat"]); } },
          ...(firebaseConfigured && firebaseUser && onlineFriendsCount > 0 ? [{ id: "vault-reaction-pill", icon: "reaction", color: friendReactionPickerOpen ? "#FFD700" : "#fff", onClick: () => {
            setRadialMenuStack([]);
            setFriendReactionPickerOpen(prev => !prev);
          }}] : []),
        ] : [])}
      </div>
    );
  }

  // --- CUSTOM MOSAIC PLAY VIEW (puzzle selection for user-created mosaics) ---
  if (view === "custom-mosaic" && customMosaicPlay) {
    const cPuzzles = customMosaicPuzzlesRef.current || [];
    const gridPxCm = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 40 : 340);
    const tileSzCm = Math.floor((gridPxCm - 20) / 5);
    const miniCellSzCm = Math.floor((tileSzCm - 8) / 5);
    // In coop mosaic mode, merge shared progress with local progress
    const effectiveMosaicProgress = isCoopMosaic
      ? (() => { const merged = { ...customMosaicProgress }; for (const [k, v] of Object.entries(coopMosaicSharedProgress)) { if (v > 0 && !(merged[k] > 0)) merged[k] = v; } return merged; })()
      : customMosaicProgress;
    const solvedCount = Object.values(effectiveMosaicProgress).filter(v => v > 0).length;
    // Track that we're on the overview when this view renders
    if (isCoopMosaic && coopMosaicCurrentTileRef.current !== -1) {
      coopMosaicCurrentTileRef.current = -1;
      if (coopMosaicSessionId && firebaseUser) {
        updateCoopMosaicCurrentTile(coopMosaicSessionId, firebaseUser.uid, -1).catch(() => {});
      }
    }
    const coopMosaicInviteUrl = isCoopMosaic && coopMosaicSessionId ? `${typeof window !== "undefined" ? window.location.origin + window.location.pathname : ""}?coopMosaic=${coopMosaicSessionId}` : "";
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } @keyframes coopPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } } @keyframes coopReactionFloat { 0%{transform:translateY(0) scale(0.5);opacity:0} 8%{transform:translateY(-5vh) scale(1.1);opacity:1} 15%{transform:translateY(-10vh) scale(1)} 70%{opacity:1} 100%{transform:translateY(-85vh) scale(1.2);opacity:0} } .reaction-scroll-container::-webkit-scrollbar { display: none; }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", alignItems: "center", gap: 12, marginBottom: 16, animation: "fadeUp 0.3s ease" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, margin: 0, color: isCoopMosaic ? C.coop : C.accent }}>
              {customMosaicPlay.title || "Untitled"}
            </h2>
            {customMosaicPlay.authorUsername && (
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>by {customMosaicPlay.authorUsername}</div>
            )}
          </div>
        </div>

        {/* Coop mosaic status bar — n-player */}
        {isCoopMosaic && (
          <div style={{
            width: "100%", maxWidth: 400, marginBottom: 12,
            padding: "8px 14px", borderRadius: 10,
            backgroundColor: C.coop + "11", border: `1px solid ${C.coop}33`,
            animation: "fadeUp 0.3s 0.01s ease both",
            fontFamily: "'Inter', sans-serif", fontSize: 11,
          }}>
            {coopMosaicStatus === "waiting" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.textDim }} />
                <span style={{ color: C.text }}>Waiting for players...</span>
                <button onClick={() => { setCoopSelectedFriends(new Set()); setRadialMenuStack(["root", "coop-start"]); }}
                  style={{
                    marginLeft: "auto", background: "none", border: `1px solid ${C.coop}55`, borderRadius: 6, padding: "3px 8px",
                    color: C.coop, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
                  }}
                >
                  Invite
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: coopMosaicAnyConnected ? C.correct : C.textDim,
                    animation: coopMosaicAnyConnected ? "coopPulse 2s ease-in-out infinite" : "none",
                    flexShrink: 0,
                  }} />
                  <span style={{ color: C.text, fontWeight: 700 }}>
                    {coopMosaicOtherPlayerCount + 1} players
                  </span>
                  {coopMosaicStatus !== "complete" && (
                    <button onClick={() => { setCoopSelectedFriends(new Set()); setRadialMenuStack(["root", "coop-start"]); }}
                      style={{
                        marginLeft: "auto", background: "none", border: `1px solid ${C.coop}55`, borderRadius: 6, padding: "3px 8px",
                        color: C.coop, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        fontSize: 9, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0,
                      }}
                    >
                      Invite
                    </button>
                  )}
                </div>
                {coopMosaicOtherPlayerCount > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 6 }}>
                    {Object.entries(coopMosaicPlayers).map(([uid, p]) => {
                      const pic = coopMosaicPlayerPics[uid];
                      const initial = (p.username || "P")[0].toUpperCase();
                      const isOnline = p.currentTile != null;
                      return (
                        <span key={uid} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {pic ? (
                            <img src={pic} alt="" style={{
                              width: 16, height: 16, borderRadius: "50%", objectFit: "cover",
                              border: `1.5px solid ${isOnline ? C.correct : C.textDim}`,
                            }} />
                          ) : (
                            <span style={{
                              width: 16, height: 16, borderRadius: "50%",
                              backgroundColor: isOnline ? C.correct : C.textDim,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 700, color: "#fff", lineHeight: 1,
                            }}>{initial}</span>
                          )}
                          <span style={{ color: C.coop, fontWeight: 600, fontSize: 10 }}>{p.username || "Player"}</span>
                          {p.currentTile != null && p.currentTile >= 0
                            ? <span style={{ color: C.textDim, fontSize: 9 }}>tile {p.currentTile + 1}</span>
                            : p.currentTile === -1
                              ? <span style={{ color: C.textDim, fontSize: 9 }}>overview</span>
                              : null
                          }
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 10, animation: "fadeUp 0.3s 0.02s ease both" }}>
          {isCoopMosaic ? "Solve tiles together to reveal the picture" : "Solve all 25 tiles to reveal the picture"}
        </div>

        {/* 5x5 tile grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3,
          padding: 8, borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}`,
          animation: "fadeUp 0.3s 0.04s ease both",
        }}>
          {cPuzzles.map((p, i) => {
            const solved = (effectiveMosaicProgress[i] || 0) > 0;
            // Count how many other players are on this tile
            const playersOnTile = isCoopMosaic
              ? Object.entries(coopMosaicPlayers).filter(([_, pl]) => pl.currentTile === i)
              : [];
            const anyPlayerHere = playersOnTile.length > 0;
            return (
              <button key={i} onClick={() => {
                if (isCoopMosaic) {
                  coopMosaicCurrentTileRef.current = i;
                  updateCoopMosaicCurrentTile(coopMosaicSessionId, firebaseUser?.uid, i).catch(() => {});
                }
                // Don't force restart if tile is already completed (show completed state)
                const tileCompleted = (effectiveMosaicProgress[i] || 0) > 0;
                startPuzzle(i, "mosaic", !tileCompleted);
              }}
                style={{
                  width: tileSzCm, height: tileSzCm, borderRadius: 6,
                  border: `1.5px solid ${anyPlayerHere ? C.coop : solved ? C.correct + "66" : C.border}`,
                  backgroundColor: solved ? C.correct + "10" : anyPlayerHere ? C.coop + "08" : C.surface,
                  cursor: "pointer", padding: 2, position: "relative",
                  display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", overflow: "hidden",
                  boxShadow: anyPlayerHere ? `0 0 8px ${C.coop}44` : "none",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = anyPlayerHere ? C.coop : solved ? C.correct + "66" : C.border; }}
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
                    fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                    color: anyPlayerHere ? C.coop : C.textDim, lineHeight: 1,
                  }}>
                    {i + 1}
                  </span>
                )}
                {/* Player indicator badges — show initials/pics for players on this tile */}
                {anyPlayerHere && (
                  <div style={{ position: "absolute", top: 1, right: 1, display: "flex", gap: 1 }}>
                    {playersOnTile.slice(0, 3).map(([uid, pl]) => {
                      const pic = coopMosaicPlayerPics[uid];
                      const initial = (pl.username || "P")[0].toUpperCase();
                      return pic ? (
                        <img key={uid} src={pic} alt="" style={{
                          width: 12, height: 12, borderRadius: "50%", objectFit: "cover",
                          border: `1px solid ${C.coop}`, animation: "coopPulse 2s ease-in-out infinite",
                        }} />
                      ) : (
                        <div key={uid} style={{
                          width: 12, height: 12, borderRadius: "50%",
                          backgroundColor: C.coop, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 7, fontWeight: 700, color: "#fff", lineHeight: 1,
                          animation: "coopPulse 2s ease-in-out infinite",
                        }}>{initial}</div>
                      );
                    })}
                    {playersOnTile.length > 3 && (
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        backgroundColor: C.coop + "88", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 6, fontWeight: 700, color: "#fff", lineHeight: 1,
                      }}>+{playersOnTile.length - 3}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 16, fontSize: 12, color: C.textDim, fontFamily: "'Inter', sans-serif", animation: "fadeUp 0.3s 0.06s ease both" }}>
          {solvedCount}/25 tiles solved
        </div>

        {/* Progressive picture preview — reveals completed tile areas */}
        {solvedCount > 0 && (
          <div style={{ marginTop: 20, animation: "fadeUp 0.4s ease both", textAlign: "center" }}>
            <div style={{ fontSize: solvedCount === 25 ? 18 : 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: solvedCount === 25 ? C.correct : C.textDim, marginBottom: 12, letterSpacing: solvedCount === 25 ? 0 : 1, textTransform: solvedCount === 25 ? "none" : "uppercase" }}>
              {solvedCount === 25 ? (isCoopMosaic ? "Picture revealed together!" : "Picture revealed!") : "Preview"}
            </div>
            <MosaicThumbnail grid={customMosaicPlay.grid} size={Math.min(280, typeof window !== "undefined" ? window.innerWidth - 80 : 280)} completedTiles={solvedCount === 25 ? null : effectiveMosaicProgress} />
            {/* Save to personal progress button — coop mosaic completion */}
            {solvedCount === 25 && isCoopMosaic && customMosaicPlay?.id && (
              <button
                onClick={() => {
                  const mosaicId = customMosaicPlay.id;
                  // Save tile progress to local mosaicCompletions
                  const prevCompletions = progress.mosaicCompletions || {};
                  const newCompletions = { ...prevCompletions, [mosaicId]: { ...effectiveMosaicProgress } };
                  const newProgress = { ...progress, mosaicCompletions: newCompletions };
                  setProgress(newProgress);
                  saveProgress(newProgress);
                  // Save tile times from session
                  const mct = times.mosaicCompletionTimes || {};
                  const newMosaicTimes = { ...mct[mosaicId], ...coopMosaicSharedTileTimes };
                  const newTimes = { ...times, mosaicCompletionTimes: { ...mct, [mosaicId]: newMosaicTimes } };
                  setTimes(newTimes);
                  saveTimes(newTimes);
                }}
                style={{
                  marginTop: 12, padding: "10px 20px", borderRadius: 10,
                  backgroundColor: C.correct, color: "#fff", border: "none",
                  fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, cursor: "pointer", textTransform: "uppercase",
                }}
              >
                Save to My Progress
              </button>
            )}
          </div>
        )}

        {/* Mosaic stats section */}
        {solvedCount > 0 && (() => {
          const localTimes = customMosaicPlay?.id ? ((times.mosaicCompletionTimes || {})[customMosaicPlay.id] || {}) : {};
          const mosaicTimes = isCoopMosaic ? { ...localTimes, ...coopMosaicSharedTileTimes } : localTimes;
          const solvedTiles = Object.entries(effectiveMosaicProgress).filter(([, v]) => typeof v === "number" && v > 0);
          const totalAttempts = solvedTiles.reduce((sum, [, v]) => sum + v, 0);
          const perfectCount = solvedTiles.filter(([, v]) => v === 1).length;
          const timedTiles = solvedTiles.filter(([k]) => mosaicTimes[k] != null);
          const totalTime = timedTiles.reduce((sum, [k]) => sum + (mosaicTimes[k] || 0), 0);
          const avgAttempts = solvedTiles.length > 0 ? (totalAttempts / solvedTiles.length).toFixed(1) : "—";
          const bestTime = timedTiles.length > 0 ? Math.min(...timedTiles.map(([k]) => mosaicTimes[k])) : null;
          const worstTime = timedTiles.length > 0 ? Math.max(...timedTiles.map(([k]) => mosaicTimes[k])) : null;
          return (
            <div style={{
              marginTop: 24, width: "100%", maxWidth: 360,
              padding: 16, borderRadius: 14,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              animation: "fadeUp 0.4s 0.08s ease both",
            }}>
              <div style={{
                fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5,
                fontFamily: "'Inter', sans-serif", marginBottom: 14, textAlign: "center",
              }}>
                Mosaic Stats
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              }}>
                {/* Total time */}
                <div style={{
                  padding: "10px 8px", borderRadius: 10, backgroundColor: C.bg,
                  border: `1px solid ${C.border}`, textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: solvedCount === 25 ? C.accent : C.text }}>
                    {timedTiles.length > 0 ? formatTime(totalTime) : "—"}
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 4, letterSpacing: 0.5 }}>
                    {solvedCount === 25 ? "Total Time" : "Time So Far"}
                  </div>
                </div>
                {/* Tiles solved */}
                <div style={{
                  padding: "10px 8px", borderRadius: 10, backgroundColor: C.bg,
                  border: `1px solid ${C.border}`, textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: solvedCount === 25 ? C.correct : C.text }}>
                    {solvedCount}/25
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 4, letterSpacing: 0.5 }}>
                    Tiles Solved
                  </div>
                </div>
                {/* Avg attempts */}
                <div style={{
                  padding: "10px 8px", borderRadius: 10, backgroundColor: C.bg,
                  border: `1px solid ${C.border}`, textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>
                    {avgAttempts}
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 4, letterSpacing: 0.5 }}>
                    Avg Attempts
                  </div>
                </div>
                {/* Perfect tiles */}
                <div style={{
                  padding: "10px 8px", borderRadius: 10, backgroundColor: C.bg,
                  border: `1px solid ${C.border}`, textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: perfectCount > 0 ? C.gold : C.text }}>
                    {perfectCount}
                  </div>
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 4, letterSpacing: 0.5 }}>
                    Perfect (1st try)
                  </div>
                </div>
              </div>
              {/* Best / worst time row */}
              {timedTiles.length > 1 && (
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <div style={{
                    flex: 1, padding: "8px 6px", borderRadius: 8, backgroundColor: C.bg,
                    border: `1px solid ${C.border}`, textAlign: "center",
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.correct }}>
                      {formatTime(bestTime)}
                    </div>
                    <div style={{ fontSize: 8, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 3, letterSpacing: 0.5 }}>
                      Best Tile
                    </div>
                  </div>
                  <div style={{
                    flex: 1, padding: "8px 6px", borderRadius: 8, backgroundColor: C.bg,
                    border: `1px solid ${C.border}`, textAlign: "center",
                  }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.incorrect }}>
                      {formatTime(worstTime)}
                    </div>
                    <div style={{ fontSize: 8, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 3, letterSpacing: 0.5 }}>
                      Slowest Tile
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {renderHomeButton()}
        {renderBackButton(() => {
          if (isCoopMosaic) { leaveCoopMosaicSession(); loadActiveCoopSessions(); setView("menu"); setCustomMosaicPlay(null); customMosaicPuzzlesRef.current = null; customMosaicReturnViewRef.current = "gallery"; return; }
          const returnTo = customMosaicReturnViewRef.current || "gallery"; setView(returnTo); setCustomMosaicPlay(null); customMosaicPuzzlesRef.current = null; customMosaicReturnViewRef.current = "gallery";
        })}
        {/* Floating coop mosaic reactions overlay */}
        {coopFloatingReactions.length > 0 && (
          <div style={{
            position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999,
            overflow: "hidden",
          }}>
            {coopFloatingReactions.map(r => (
              <div key={r.id} style={{
                position: "absolute",
                left: `${r.x}%`,
                bottom: 60,
                animation: "coopReactionFloat 3s ease-out forwards",
                display: "flex", flexDirection: "column", alignItems: "center",
                transform: "translateX(-50%)",
              }}>
                {r.type === "text" ? (
                  <span style={{
                    fontSize: 20, fontWeight: 800, fontFamily: "'Inter', sans-serif",
                    color: "#fff", lineHeight: 1,
                    textShadow: `0 0 12px ${r.fromColor}88, 0 2px 8px rgba(0,0,0,0.7)`,
                    letterSpacing: 1,
                  }}>{r.emoji}</span>
                ) : r.type === "pattern" ? (
                  <span style={{
                    fontSize: 56, lineHeight: 1, color: r.fromColor,
                    filter: `drop-shadow(0 0 10px ${r.fromColor}88) drop-shadow(0 2px 6px rgba(0,0,0,0.5))`,
                  }}>{r.emoji}</span>
                ) : (
                  <span style={{ fontSize: 48, lineHeight: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>{r.emoji}</span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 700, color: r.fromColor,
                  fontFamily: "'Inter', sans-serif",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  whiteSpace: "nowrap", marginTop: 2,
                }}>{r.fromName}</span>
              </div>
            ))}
          </div>
        )}
        {renderContextButton("custom-mosaic", [
          ...(firebaseConfigured && firebaseUser && onlineFriendsCount > 0 ? [{ id: "friend-reaction", icon: "reaction", color: friendReactionPickerOpen ? "#FFD700" : "#fff", onClick: () => { setRadialMenuStack([]); setFriendReactionPickerOpen(prev => !prev); } }] : []),
        ])}
        {globalModalsEl}
      </div>
    );
  }

  // --- MOSAIC CREATOR VIEW ---
  if (view === "creator") {
    const gridMaxW = typeof window !== "undefined" ? window.innerWidth - 32 : 360;
    const gridMaxH = typeof window !== "undefined" ? window.innerHeight - 280 : 360;
    const gridPx = Math.max(200, Math.min(gridMaxW, gridMaxH));
    const cellPx = gridPx / CREATOR_GRID_SIZE;
    return (
      <div style={{
        height: "100dvh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingLeft: 16, paddingRight: 16,
        overflow: "hidden",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } `}</style>

        {/* Header */}
        <div style={{
          width: "100%", maxWidth: 480,
          display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 4, paddingRight: 4,
          position: "sticky", top: 0, zIndex: 50,
          backgroundColor: C.bg + "ee", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          animation: "fadeUp 0.3s ease",
        }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            {creatorEditingId ? "Edit Mosaic" : "Create Mosaic"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={creatorUndo} disabled={!creatorCanUndo} style={{
              width: 36, height: 36, borderRadius: 10, border: "none", cursor: creatorCanUndo ? "pointer" : "default",
              background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
              opacity: creatorCanUndo ? 1 : 0.3, transition: "opacity 0.15s",
            }}>
              <Undo2 size={16} color={C.text} strokeWidth={2} />
            </button>
            <button onClick={creatorRedo} disabled={!creatorCanRedo} style={{
              width: 36, height: 36, borderRadius: 10, border: "none", cursor: creatorCanRedo ? "pointer" : "default",
              background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
              opacity: creatorCanRedo ? 1 : 0.3, transition: "opacity 0.15s",
            }}>
              <Redo2 size={16} color={C.text} strokeWidth={2} />
            </button>
            <button onClick={() => {
              const hasWork = creatorGrid.some(row => row.some(cell => cell !== null));
              if (hasWork) {
                setCreatorConfirmAction({ type: "clear" });
                setRadialMenuStack(["root", "creator-confirm"]);
              } else {
                resetCreator();
              }
            }} style={{
              width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <RotateCcw size={16} color={C.text} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Canvas area — flex grow to fill space between header and bottom controls */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "start", minHeight: 0, width: "100%" }}>
          {/* 25x25 info */}
          <div style={{ width: "100%", maxWidth: 400, marginBottom: 6, flexShrink: 0, animation: "fadeUp 0.3s 0.05s ease both" }}>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
              25x25 grid &middot; becomes 25 playable puzzle tiles
            </div>
          </div>

          {/* Grid - uses pointer-move on container for smooth finger drag */}
          <div
            ref={creatorGridRef}
            style={{
              width: gridPx, height: gridPx, flexShrink: 0, animation: "fadeUp 0.3s 0.06s ease both",
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

          {/* Status messages — rendered as fixed centered toast */}
          {!firebaseUser && firebaseConfigured && (
            <div style={{ width: "100%", maxWidth: 400, textAlign: "center", fontSize: 11, color: C.textDim, marginTop: 8, flexShrink: 0, animation: "fadeUp 0.3s 0.08s ease both" }}>
              Sign in from the menu to save your creations
            </div>
          )}
        </div>

        {/* Bottom spacer for fixed controls */}
        <div style={{ flexShrink: 0, height: "calc(80px + env(safe-area-inset-bottom, 0px))" }} />

      {/* Tool toggle — bottom left Liquid Glass pill, offset right of back button */}
      <div style={{
        position: "fixed",
        bottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
        left: 84,
        display: "flex",
        borderRadius: 28,
        background: activeTheme.gridBg || C.surface,
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.16)",
        zIndex: 85,
        overflow: "hidden",
      }}>
        {/* Liquid Glass sheen */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, left: "-10%", width: "120%", height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)", borderRadius: "inherit" }} />
        </div>
        <div
          onClick={() => setCreatorTool("draw")}
          style={{
            width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", position: "relative",
            backgroundColor: creatorTool === "draw" ? "rgba(255,255,255,0.12)" : "transparent",
            transition: "background-color 0.15s",
          }}
        >
          <Pencil size={18} color={creatorTool === "draw" ? C.accent : "#fff"} strokeWidth={2} />
        </div>
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.12)", alignSelf: "center" }} />
        <div
          onClick={() => setCreatorTool("fill")}
          style={{
            width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", position: "relative",
            backgroundColor: creatorTool === "fill" ? "rgba(255,255,255,0.12)" : "transparent",
            transition: "background-color 0.15s",
          }}
        >
          <PaintBucket size={18} color={creatorTool === "fill" ? C.accent : "#fff"} strokeWidth={2} />
        </div>
      </div>

      {/* Color picker — Liquid Glass pill carousel above main menu */}
      <div style={{
        position: "fixed",
        bottom: `calc(100px + env(safe-area-inset-bottom, 0px))`,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: 9999,
        background: activeTheme.gridBg || C.surface,
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.15)",
        zIndex: 85,
        padding: "6px 4px",
        maxWidth: "calc(100vw - 40px)",
        overflow: "hidden",
      }}>
        {/* Liquid Glass sheen */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, left: "-10%", width: "120%", height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)", borderRadius: "inherit" }} />
        </div>
        <div ref={creatorColorScrollRef} className="token-picker-scroll" style={{
          display: "flex", gap: 10, justifyContent: "flex-start", padding: "8px 16px",
          flexWrap: "nowrap", overflowX: "auto", flex: "1 1 auto", minWidth: 0, maxWidth: "100%",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none",
          touchAction: "pan-x", willChange: "scroll-position",
        }}>
          {CREATOR_COLORS.map(color => (
            <div
              key={color}
              onClick={() => { if (!creatorColorDragRef.current.moved) setCreatorColor(color); }}
              style={{
                width: 48, height: 48, borderRadius: 12, backgroundColor: color, flexShrink: 0,
                border: creatorColor === color ? `3px solid ${C.text}` : "3px solid transparent",
                cursor: "pointer",
                transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s cubic-bezier(0.4,0,0.2,1), border-color 0.2s cubic-bezier(0.4,0,0.2,1)",
                transform: creatorColor === color ? "scale(1.15)" : "scale(1)",
                boxShadow: creatorColor === color ? `0 0 12px ${color}88` : `0 2px 8px rgba(0,0,0,0.25)`,
              }}
            />
          ))}
          {/* Eraser */}
          <div
            onClick={() => { if (!creatorColorDragRef.current.moved) setCreatorColor(null); }}
            style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              backgroundColor: C.surface,
              border: creatorColor === null ? `3px solid ${C.text}` : "3px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s cubic-bezier(0.4,0,0.2,1), border-color 0.2s cubic-bezier(0.4,0,0.2,1)",
              transform: creatorColor === null ? "scale(1.15)" : "scale(1)",
              boxShadow: creatorColor === null ? `0 0 12px ${C.accent}88` : `0 2px 8px rgba(0,0,0,0.25)`,
            }}
          >
            <Eraser size={20} color={creatorColor === null ? C.accent : "rgba(255,255,255,0.5)"} strokeWidth={2} />
          </div>
        </div>
      </div>

      {renderBackButton(() => {
        const hasWork = creatorGrid.some(row => row.some(cell => cell !== null));
        if (hasWork) {
          setCreatorConfirmAction({ type: "leave", action: () => {
            resetCreator(); setCreatorReturnView("menu");
            setView("gallery"); loadMosaicData(mosaicGalleryTab || "mine");
          }});
          setRadialMenuStack(["root", "creator-confirm"]);
        } else {
          resetCreator(); setCreatorReturnView("menu");
          setView("gallery"); loadMosaicData(mosaicGalleryTab || "mine");
        }
      })}
      {renderContextButton("creator", [
        { id: "save", icon: "upload", color: C.accent, onClick: handleSaveClick, disabled: mosaicLoading },
      ])}

      {/* Fixed centered toast for mosaic messages */}
      {mosaicMsg && (
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 10000, maxWidth: 400, textAlign: "center", padding: "14px 28px", borderRadius: 12,
          backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
          fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 0.5,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
          animation: "fadeUp 0.3s 0.08s ease both",
          pointerEvents: "none",
        }}>
          {mosaicMsg}
        </div>
      )}

      {globalModalsEl}
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
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))", paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } `}</style>

        {/* Header */}
        <div style={{
          width: "100%", maxWidth: 480,
          display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 4, paddingRight: 4,
          position: "sticky", top: 0, zIndex: 50,
          backgroundColor: C.bg + "ee", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          animation: "fadeUp 0.3s ease",
        }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            Mosaic
          </h2>
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
                fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
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

        {/* Fixed centered toast for mosaic messages */}
        {mosaicMsg && (
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10000, maxWidth: 400, textAlign: "center", padding: "14px 28px", borderRadius: 12,
            backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 0.5,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
            animation: "fadeUp 0.3s 0.08s ease both",
            pointerEvents: "none",
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
              <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent, margin: "0 0 12px", textAlign: "center" }}>
                Share Mosaic
              </h3>
              <p style={{ fontSize: 11, color: C.textDim, textAlign: "center", marginBottom: 16 }}>
                Share "{shareTargetMosaic.title}" with a friend
              </p>
              {/* Friends list */}
              {friendsList.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
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
                        <span style={{ fontSize: 13, fontFamily: "'Inter', sans-serif", color: C.text, fontWeight: 600 }}>
                          {friend.username}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0 0" }} />
                </div>
              )}
              {/* Manual username entry */}
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
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
                  color: C.text, fontSize: 16, fontFamily: "'Inter', sans-serif",
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
                    fontFamily: "'Inter', sans-serif", letterSpacing: 1,
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
                    fontFamily: "'Inter', sans-serif", letterSpacing: 1,
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
              <button onClick={() => { setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError(""); }}
                style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: C.accent, color: C.bg, border: "none", cursor: "pointer" }}
              >Sign In</button>
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.3s ease" }}>
              {/* Add friend input */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
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
                      color: C.text, fontSize: 14, fontFamily: "'Inter', sans-serif",
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
                      fontFamily: "'Inter', sans-serif", letterSpacing: 1,
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
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 6, fontFamily: "'Inter', sans-serif" }}>
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
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
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
                        <div style={{ fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {friend.username}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.uid)}
                        title="Remove friend"
                        style={{
                          background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                          padding: "4px 10px", color: C.textDim, cursor: "pointer", fontSize: 10,
                          fontFamily: "'Inter', sans-serif", transition: "all 0.15s", flexShrink: 0,
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
            <button onClick={() => { setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError(""); }}
              style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: C.accent, color: C.bg, border: "none", cursor: "pointer" }}
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
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
              }}>
                <div style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => mosaic.grid && startCustomMosaicPlay(mosaic)}>
                  <MosaicThumbnail grid={mosaic.grid} size={64} hidden={true} completedTiles={mosaic.id ? (progress.mosaicCompletions || {})[mosaic.id] : null} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                      {mosaic.title || "Untitled"}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim }}>
                      {mosaicGalleryTab === "shared" && mosaic.sharedByUsername ? `From ${mosaic.sharedByUsername}` :
                       mosaicGalleryTab === "public" && mosaic.authorUsername ? `By ${mosaic.authorUsername}` :
                       mosaic.publicStatus === "approved" ? "Published" :
                       mosaic.publicStatus === "pending" ? "Pending review" :
                       mosaic.publicStatus === "rejected" ? "Not approved" : ""}
                    </div>
                    {(() => {
                      const mc = mosaic.id ? (progress.mosaicCompletions || {})[mosaic.id] : null;
                      if (!mc) return null;
                      const solved = Object.values(mc).filter(v => v > 0).length;
                      if (solved === 0) return null;
                      return (
                        <div style={{ fontSize: 9, color: solved === 25 ? C.correct : C.accent, marginTop: 2, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          {solved === 25 ? "Complete!" : `${solved}/25 tiles`}
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {mosaic.grid && (
                      <button onClick={() => startCustomMosaicPlay(mosaic)} title="Play as puzzle"
                        style={{ background: C.accent, border: "none", borderRadius: 6, padding: "4px 10px", color: C.bg, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      >Play</button>
                    )}
                    {mosaicGalleryTab === "mine" && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {renderContextButton("gallery", [
        { id: "create", icon: "plus", color: C.accent, onClick: () => setView("creator") },
        ...(firebaseConfigured && firebaseUser && onlineFriendsCount > 0 ? [{ id: "friend-reaction", icon: "reaction", color: friendReactionPickerOpen ? "#FFD700" : "#fff", onClick: () => { setRadialMenuStack([]); setFriendReactionPickerOpen(prev => !prev); } }] : []),
      ])}
      {globalModalsEl}
      </div>
    );
  }

  // --- ADMIN REVIEW VIEW ---
  if (view === "admin-review") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", gap: 12, marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            Review Mosaics
          </h2>
        </div>

        {/* Fixed centered toast for mosaic messages */}
        {mosaicMsg && (
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10000, maxWidth: 400, textAlign: "center", padding: "14px 28px", borderRadius: 12,
            backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 0.5,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
            animation: "fadeUp 0.3s 0.08s ease both",
            pointerEvents: "none",
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
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
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
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
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
                      fontFamily: "'Inter', sans-serif", letterSpacing: 1,
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
                      fontFamily: "'Inter', sans-serif", letterSpacing: 1,
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
        {renderBackButton(() => setView("menu"))}
        {renderContextButton("admin-review")}
        {globalModalsEl}
      </div>
    );
  }

  // --- ADMIN MANAGE PUBLIC MOSAICS VIEW ---
  if (view === "admin-manage") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", gap: 12, marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            Manage Public
          </h2>
        </div>

        {/* Fixed centered toast for mosaic messages */}
        {mosaicMsg && (
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10000, maxWidth: 400, textAlign: "center", padding: "14px 28px", borderRadius: 12,
            backgroundColor: C.surface, border: `1px solid ${C.accent}44`,
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 0.5,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
            animation: "fadeUp 0.3s 0.08s ease both",
            pointerEvents: "none",
          }}>
            {mosaicMsg}
          </div>
        )}

        {mosaicLoading && publicMosaicsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 13 }}>Loading...</div>
        ) : publicMosaicsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, animation: "fadeUp 0.3s ease" }}>
            No public mosaics yet
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.3s 0.02s ease both" }}>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
              {publicMosaicsList.length} published
              {staffPickMosaic && <span> &middot; Staff pick: <span style={{ color: C.accent }}>{staffPickMosaic.title || "Untitled"}</span></span>}
            </div>
            {publicMosaicsList.map((mosaic, idx) => {
              const isStaffPick = staffPickMosaic && staffPickMosaic.id === mosaic.id;
              return (
                <div key={mosaic.id} style={{
                  padding: 14, borderRadius: 14,
                  backgroundColor: C.surface,
                  border: `1px solid ${isStaffPick ? C.accent + "66" : C.border}`,
                  opacity: mosaicLoading ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <MosaicThumbnail grid={mosaic.grid} size={80} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {mosaic.title || "Untitled"}
                        </div>
                        {isStaffPick && (
                          <span style={{ fontSize: 14, color: C.accent, lineHeight: 1 }} title="Staff Pick">&#9733;</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>
                        By: {mosaic.authorUsername || mosaic.authorEmail || "Unknown"}
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim }}>
                        Order: {mosaic.displayOrder ?? idx}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {/* Move Up */}
                        <button
                          onClick={() => handleMovePublicMosaic(mosaic.id, "up")}
                          disabled={mosaicLoading || idx === 0}
                          title="Move up"
                          style={{
                            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px",
                            color: idx === 0 ? C.border : C.textDim, cursor: idx === 0 ? "not-allowed" : "pointer",
                            fontSize: 12, transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { if (idx > 0) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = idx === 0 ? C.border : C.textDim; }}
                        >&uarr;</button>

                        {/* Move Down */}
                        <button
                          onClick={() => handleMovePublicMosaic(mosaic.id, "down")}
                          disabled={mosaicLoading || idx === publicMosaicsList.length - 1}
                          title="Move down"
                          style={{
                            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px",
                            color: idx === publicMosaicsList.length - 1 ? C.border : C.textDim,
                            cursor: idx === publicMosaicsList.length - 1 ? "not-allowed" : "pointer",
                            fontSize: 12, transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { if (idx < publicMosaicsList.length - 1) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = idx === publicMosaicsList.length - 1 ? C.border : C.textDim; }}
                        >&darr;</button>

                        {/* Staff Pick toggle */}
                        <button
                          onClick={() => isStaffPick ? handleClearStaffPick() : handleSetStaffPick(mosaic)}
                          disabled={mosaicLoading}
                          title={isStaffPick ? "Remove staff pick" : "Set as staff pick"}
                          style={{
                            background: "none", border: `1px solid ${isStaffPick ? C.accent : C.border}`, borderRadius: 6,
                            padding: "4px 10px", color: isStaffPick ? C.accent : C.textDim,
                            cursor: "pointer", fontSize: 11, fontFamily: "'Inter', sans-serif",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = isStaffPick ? C.accent : C.border; e.currentTarget.style.color = isStaffPick ? C.accent : C.textDim; }}
                        >
                          {isStaffPick ? "★ Pick" : "☆ Pick"}
                        </button>

                        {/* Unpublish */}
                        <button
                          onClick={() => handleUnpublishMosaic(mosaic)}
                          disabled={mosaicLoading}
                          title="Unpublish"
                          style={{
                            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px",
                            color: C.textDim, cursor: "pointer", fontSize: 11,
                            fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.incorrect; e.currentTarget.style.color = C.incorrect; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                        >
                          Unpublish
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {renderBackButton(() => setView("menu"))}
        {renderContextButton("admin-manage")}
        {globalModalsEl}
      </div>
    );
  }

  // --- ADMIN METRICS DASHBOARD VIEW ---
  if (view === "admin-metrics") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 520, display: "flex", alignItems: "center", gap: 12, marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            Game Metrics
          </h2>
        </div>

        {/* Tab bar */}
        <div style={{ width: "100%", maxWidth: 520, display: "flex", gap: 4, marginBottom: 20, animation: "fadeUp 0.3s 0.02s ease both" }}>
          {[{ key: "overview", label: "Overview" }, { key: "difficulty", label: "Difficulty" }, { key: "engagement", label: "Engagement" }].map(tab => (
            <button key={tab.key}
              onClick={() => setAdminMetricsTab(tab.key)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                background: adminMetricsTab === tab.key ? C.accent : "transparent",
                color: adminMetricsTab === tab.key ? C.bg : C.textDim,
                border: `1px solid ${adminMetricsTab === tab.key ? C.accent : C.border}`,
              }}
            >{tab.label}</button>
          ))}
        </div>

        {adminMetricsLoading && !adminMetrics ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 13 }}>Loading metrics...</div>
        ) : !adminMetrics ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, animation: "fadeUp 0.3s ease" }}>
            No metrics available yet
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 520, animation: "fadeUp 0.3s 0.04s ease both" }}>

            {/* OVERVIEW TAB */}
            {adminMetricsTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Top-line stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Total Users", value: adminMetrics.totalUsers, color: C.accent },
                    { label: "Active (7d)", value: adminMetrics.activeUsers, color: C.correct },
                    { label: "Total Solved", value: adminMetrics.globalTotalSolved.toLocaleString(), color: C.accent },
                    { label: "Avg / User", value: adminMetrics.avgSolvedPerUser, color: C.text },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      padding: "16px 14px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: stat.color }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per-mode breakdown */}
                <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginTop: 8 }}>
                  Puzzles Solved by Mode
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"].map(mode => {
                    const ms = adminMetrics.modeStats[mode] || {};
                    const maxSolved = Math.max(...Object.values(adminMetrics.modeStats).map(m => m.totalSolved || 0), 1);
                    const barWidth = ((ms.totalSolved || 0) / maxSolved * 100);
                    return (
                      <div key={mode} style={{
                        padding: "10px 14px", borderRadius: 10,
                        backgroundColor: C.surface, border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text, textTransform: "capitalize" }}>
                            {mode}
                          </span>
                          <span style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", color: C.textDim }}>
                            {ms.totalSolved || 0} solved &middot; {ms.players || 0} players &middot; {ms.completionRate || 0}% played
                          </span>
                        </div>
                        {/* Bar */}
                        <div style={{ height: 4, borderRadius: 2, backgroundColor: C.surfaceLight, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 2, backgroundColor: C.accent, width: `${barWidth}%`, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                            Avg: {ms.avgSolved || 0}/user
                          </span>
                          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                            Avg active: {ms.avgSolvedActive || 0}/player
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DIFFICULTY TAB */}
            {adminMetricsTab === "difficulty" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                  Per-puzzle stats showing average attempts and gold rate. High avg attempts + low gold rate = harder puzzles. Look for outliers that may be too hard or too easy.
                </div>
                {["easy", "medium", "hard"].map(mode => {
                  const puzzles = adminMetrics.difficultyAnalysis[mode] || [];
                  if (puzzles.length === 0) return (
                    <div key={mode} style={{ padding: 16, borderRadius: 12, backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text, textTransform: "capitalize", marginBottom: 6 }}>{mode}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>No completion data yet</div>
                    </div>
                  );
                  // Identify outliers
                  const avgAttemptValues = puzzles.map(p => parseFloat(p.avgAttempts));
                  const overallAvg = avgAttemptValues.reduce((a, b) => a + b, 0) / avgAttemptValues.length;
                  return (
                    <div key={mode}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text, textTransform: "capitalize" }}>{mode}</span>
                        <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                          Avg attempts across all: {overallAvg.toFixed(1)}
                        </span>
                      </div>
                      {/* Table header */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "50px 1fr 70px 70px 60px", gap: 4, padding: "6px 10px",
                        fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'Inter', sans-serif",
                      }}>
                        <span>#</span><span>Status</span><span style={{ textAlign: "right" }}>Avg Att.</span><span style={{ textAlign: "right" }}>Avg Time</span><span style={{ textAlign: "right" }}>Gold %</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {puzzles.slice(0, 20).map(p => {
                          const att = parseFloat(p.avgAttempts);
                          const gold = parseFloat(p.goldRate);
                          const isTooHard = att > overallAvg * 1.5 && gold < 30;
                          const isTooEasy = att < 1.3 && gold > 80;
                          const statusColor = isTooHard ? C.incorrect : isTooEasy ? C.coop : C.textDim;
                          const statusLabel = isTooHard ? "HARD" : isTooEasy ? "EASY" : "OK";
                          return (
                            <div key={p.puzzleKey} style={{
                              display: "grid", gridTemplateColumns: "50px 1fr 70px 70px 60px", gap: 4, padding: "8px 10px",
                              borderRadius: 8, backgroundColor: isTooHard ? C.incorrect + "08" : isTooEasy ? C.coop + "08" : C.surface,
                              border: `1px solid ${isTooHard ? C.incorrect + "22" : isTooEasy ? C.coop + "22" : C.border}`,
                              alignItems: "center",
                            }}>
                              <span style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: C.text }}>
                                {parseInt(p.puzzleKey) + 1}
                              </span>
                              <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: statusColor }}>
                                {statusLabel} <span style={{ fontWeight: 400, color: C.textDim }}>({p.players} plays)</span>
                              </span>
                              <span style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: C.text, textAlign: "right" }}>
                                {p.avgAttempts}
                              </span>
                              <span style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.textDim, textAlign: "right" }}>
                                {formatTime(parseInt(p.avgTime))}
                              </span>
                              <span style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: parseFloat(p.goldRate) > 60 ? C.gold : parseFloat(p.goldRate) < 20 ? C.incorrect : C.text, textAlign: "right" }}>
                                {p.goldRate}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {puzzles.length > 20 && (
                        <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif", textAlign: "center", marginTop: 6 }}>
                          Showing top 20 hardest of {puzzles.length} puzzles
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ENGAGEMENT TAB */}
            {adminMetricsTab === "engagement" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* User distribution by puzzles solved */}
                <div>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                    Users by Total Puzzles Solved
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {adminMetrics.engagementBuckets.map((bucket, i) => {
                      const maxCount = Math.max(...adminMetrics.engagementBuckets.map(b => b.count), 1);
                      const barWidth = (bucket.count / maxCount) * 100;
                      const pct = adminMetrics.totalUsers > 0 ? ((bucket.count / adminMetrics.totalUsers) * 100).toFixed(0) : 0;
                      return (
                        <div key={i} style={{
                          padding: "10px 14px", borderRadius: 10,
                          backgroundColor: C.surface, border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text }}>
                              {bucket.label}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.accent, fontWeight: 700 }}>
                              {bucket.count} <span style={{ color: C.textDim, fontWeight: 400 }}>({pct}%)</span>
                            </span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, backgroundColor: C.surfaceLight, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2, width: `${barWidth}%`,
                              backgroundColor: i === 0 ? C.incorrect : i < 3 ? C.accent : C.correct,
                              transition: "width 0.4s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Retention signals */}
                <div>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                    Key Signals
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(() => {
                      const zeroPct = adminMetrics.totalUsers > 0 ? ((adminMetrics.engagementBuckets[0].count / adminMetrics.totalUsers) * 100).toFixed(0) : 0;
                      const highEngaged = adminMetrics.engagementBuckets.filter(b => b.min > 50).reduce((a, b) => a + b.count, 0);
                      const highPct = adminMetrics.totalUsers > 0 ? ((highEngaged / adminMetrics.totalUsers) * 100).toFixed(0) : 0;
                      const activePct = adminMetrics.totalUsers > 0 ? ((adminMetrics.activeUsers / adminMetrics.totalUsers) * 100).toFixed(0) : 0;
                      const signals = [
                        { label: "Drop-off rate (0 puzzles)", value: `${zeroPct}%`, color: parseInt(zeroPct) > 40 ? C.incorrect : C.correct, note: parseInt(zeroPct) > 40 ? "High — many users leave without solving" : "Healthy" },
                        { label: "Deep engagement (50+ solved)", value: `${highPct}%`, color: parseInt(highPct) > 15 ? C.correct : C.inProgress, note: parseInt(highPct) > 15 ? "Strong retention" : "Could improve — consider onboarding" },
                        { label: "7-day active rate", value: `${activePct}%`, color: parseInt(activePct) > 20 ? C.correct : C.inProgress, note: parseInt(activePct) > 20 ? "Good weekly engagement" : "Low — consider push notifications" },
                        { label: "Total achievements earned", value: adminMetrics.globalTotalAchievements.toLocaleString(), color: C.accent, note: `${adminMetrics.totalUsers > 0 ? (adminMetrics.globalTotalAchievements / adminMetrics.totalUsers).toFixed(1) : 0} avg per user` },
                      ];
                      return signals.map((s, i) => (
                        <div key={i} style={{
                          padding: "12px 14px", borderRadius: 10,
                          backgroundColor: C.surface, border: `1px solid ${C.border}`,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>{s.note}</div>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: s.color, minWidth: 50, textAlign: "right" }}>
                            {s.value}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {renderBackButton(() => setView("menu"))}
        {renderContextButton("admin-metrics")}
        {globalModalsEl}
      </div>
    );
  }

  // --- ADMIN USER ACTIVITY VIEW ---
  if (view === "admin-users") {
    // Helper: format relative time
    const fmtTimeAgo = (ts) => {
      if (!ts) return "Never";
      const diff = Date.now() - ts;
      if (diff < 60000) return "Just now";
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
      return new Date(ts).toLocaleDateString();
    };
    // Helper: check if user is online (seen within last 2 minutes)
    const isUserOnline = (user) => user.lastSeen && (Date.now() - user.lastSeen) < 120000;
    // Helper: describe current activity
    const describeActivity = (user) => {
      if (isUserOnline(user) && user.status === "playing" && user.currentMode) {
        return `Playing ${user.currentMode}${user.currentPuzzle ? ` #${user.currentPuzzle}` : ""}`;
      }
      if (isUserOnline(user) && user.status === "idle") return "In menu";
      if (isUserOnline(user)) return "Online";
      if (user.lastSolvedMode && user.lastSolvedAt) {
        return `Last: ${user.lastSolvedMode}${user.lastSolvedPuzzle ? ` #${user.lastSolvedPuzzle}` : ""} (${fmtTimeAgo(user.lastSolvedAt)})`;
      }
      return user.lastSeen ? `Seen ${fmtTimeAgo(user.lastSeen)}` : "No activity";
    };
    // Filter and sort
    const searchLower = adminUserActivitySearch.toLowerCase();
    const filteredUsers = adminUserActivity.filter(u => {
      if (!searchLower) return true;
      return (u.username && u.username.toLowerCase().includes(searchLower)) || u.uid.toLowerCase().includes(searchLower);
    });
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      if (adminUserActivitySort === "lastSeen") {
        // Online users first, then by lastSeen desc
        const aOnline = isUserOnline(a) ? 1 : 0;
        const bOnline = isUserOnline(b) ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return (b.lastSeen || 0) - (a.lastSeen || 0);
      }
      if (adminUserActivitySort === "totalSolved") return b.totalSolved - a.totalSolved;
      if (adminUserActivitySort === "username") return (a.username || "zzz").localeCompare(b.username || "zzz");
      return 0;
    });
    const onlineCount = adminUserActivity.filter(isUserOnline).length;

    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))", paddingBottom: 32, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 520, display: "flex", alignItems: "center", gap: 12, marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, flex: 1 }}>
            User Activity
          </h2>
          <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: 11, letterSpacing: 0.5,
              color: "#06B6D4", display: "flex", alignItems: "center", gap: 6,
            }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#06B6D4", display: "inline-block" }} />
            Live
          </span>
        </div>

        {/* Summary stats */}
        {adminUserActivity.length > 0 && (
          <div style={{ width: "100%", maxWidth: 520, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16, animation: "fadeUp 0.3s 0.02s ease both" }}>
            {[
              { label: "Total Users", value: adminUserActivity.length, color: C.accent },
              { label: "Online Now", value: onlineCount, color: C.correct },
              { label: "Active (7d)", value: adminUserActivity.filter(u => u.lastSeen && (Date.now() - u.lastSeen) < 7 * 86400000).length, color: "#06B6D4" },
            ].map((stat, i) => (
              <div key={i} style={{
                padding: "12px 10px", borderRadius: 12,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div style={{ width: "100%", maxWidth: 520, marginBottom: 12, animation: "fadeUp 0.3s 0.04s ease both" }}>
          <input
            type="text"
            placeholder="Search by username or UID..."
            value={adminUserActivitySearch}
            onChange={e => setAdminUserActivitySearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 12, fontFamily: "'Inter', sans-serif",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
          />
        </div>

        {/* Sort controls */}
        <div style={{ width: "100%", maxWidth: 520, display: "flex", gap: 4, marginBottom: 16, animation: "fadeUp 0.3s 0.06s ease both" }}>
          {[
            { key: "lastSeen", label: "Last Seen" },
            { key: "totalSolved", label: "Most Solved" },
            { key: "username", label: "Name" },
          ].map(s => (
            <button key={s.key}
              onClick={() => setAdminUserActivitySort(s.key)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 10, fontWeight: 700,
                fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                background: adminUserActivitySort === s.key ? "#06B6D4" : "transparent",
                color: adminUserActivitySort === s.key ? C.bg : C.textDim,
                border: `1px solid ${adminUserActivitySort === s.key ? "#06B6D4" : C.border}`,
              }}
            >{s.label}</button>
          ))}
        </div>

        {/* User list */}
        {adminUserActivityLoading && adminUserActivity.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 13 }}>Loading user activity...</div>
        ) : adminUserActivity.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.textDim, fontSize: 13, animation: "fadeUp 0.3s ease" }}>
            No user data available
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.3s 0.08s ease both" }}>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", marginBottom: 2 }}>
              {sortedUsers.length} user{sortedUsers.length !== 1 ? "s" : ""}{searchLower ? " matching" : ""}
            </div>
            {sortedUsers.map(user => {
              const online = isUserOnline(user);
              return (
                <div key={user.uid} style={{
                  padding: "14px 16px", borderRadius: 14,
                  backgroundColor: C.surface, border: `1px solid ${online ? C.correct + "44" : C.border}`,
                  transition: "border-color 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Online indicator */}
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: online ? C.correct : C.textDim + "44",
                      boxShadow: online ? `0 0 8px ${C.correct}66` : "none",
                    }} />
                    {/* User info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {user.username || "No username"}
                        </span>
                        {online && user.status === "playing" && (
                          <span style={{
                            fontSize: 9, fontFamily: "'Inter', sans-serif", fontWeight: 700,
                            color: C.bg, backgroundColor: C.correct, padding: "1px 6px", borderRadius: 4,
                            textTransform: "uppercase", letterSpacing: 0.5,
                          }}>
                            Playing
                          </span>
                        )}
                        {online && user.status !== "playing" && (
                          <span style={{
                            fontSize: 9, fontFamily: "'Inter', sans-serif", fontWeight: 700,
                            color: C.bg, backgroundColor: "#06B6D4", padding: "1px 6px", borderRadius: 4,
                            textTransform: "uppercase", letterSpacing: 0.5,
                          }}>
                            Online
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
                        {describeActivity(user)}
                      </div>
                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color: C.accent }}>
                          {user.totalSolved} solved
                        </span>
                        <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color: C.gold }}>
                          {user.achievements} achievements
                        </span>
                        {user.updatedAt > 0 && (
                          <span style={{ fontSize: 10, fontFamily: "'Inter', sans-serif", color: C.textDim }}>
                            Synced {fmtTimeAgo(user.updatedAt)}
                          </span>
                        )}
                      </div>
                      {/* Mode breakdown (compact) */}
                      {user.totalSolved > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          {["easy", "medium", "hard", "blind", "daily", "cascade", "spin", "mosaic"]
                            .filter(mode => (user.progress[mode] || 0) > 0)
                            .map(mode => (
                              <span key={mode} style={{
                                fontSize: 9, fontFamily: "'Inter', sans-serif",
                                color: C.textDim, backgroundColor: C.surfaceLight,
                                padding: "2px 6px", borderRadius: 4,
                              }}>
                                {mode}: {user.progress[mode]}
                              </span>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {renderBackButton(() => setView("menu"))}
        {renderContextButton("admin-users")}
        {globalModalsEl}
      </div>
    );
  }


  // --- CO-OP VIEW ---
  if (view === "coop") {
    const coopModes = DIFFICULTIES.filter(d => d.key !== "daily" && d.key !== "mosaic");
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))", paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } `}</style>

        {/* Header */}
        <div style={{
          width: "100%", maxWidth: 480,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 4, paddingRight: 4,
          position: "sticky", top: 0, zIndex: 50,
          backgroundColor: C.bg + "ee", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        }}>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.coop, lineHeight: 1 }}>
            Co-op
          </h1>
          {firebaseConfigured && firebaseUser && onlineFriendsCount > 0 && (
            <span style={{ fontSize: 10, color: C.correct, fontFamily: "'Inter', sans-serif" }}>
              {onlineFriendsCount} friend{onlineFriendsCount !== 1 ? "s" : ""} online
            </span>
          )}
        </div>

        <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.4s ease" }}>

          {/* Not signed in state */}
          {!firebaseUser && (
            <div style={{
              textAlign: "center", padding: "40px 20px", borderRadius: 16,
              backgroundColor: C.surface, border: `1px solid ${C.border}`, marginBottom: 20,
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                Sign in to play co-op
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>
                Add friends and solve puzzles together in real-time
              </div>
              <button onClick={() => { setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError(""); }}
                style={{
                  padding: "10px 24px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                  background: C.coop, color: "#fff", border: "none", cursor: "pointer",
                }}>
                Sign In
              </button>
            </div>
          )}

          {/* Start Co-op Puzzle card */}
          {firebaseUser && (
            <div style={{
              marginBottom: 20, borderRadius: 16, overflow: "hidden",
              background: `linear-gradient(135deg, ${C.surface} 0%, ${C.coop}11 100%)`,
              border: `1px solid ${C.coop}33`, padding: 20,
            }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                Start Co-op Puzzle
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>
                Choose a mode and puzzle, then invite a friend
              </div>

              {/* Mode selection */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>
                  Game Mode
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[...coopModes, { key: "mosaic", label: "Mosaic" }].map(d => (
                    <button key={d.key} onClick={() => { setCoopSetupMode(d.key); setCoopSetupLevel(0); setCoopSetupMosaic(null); }}
                      style={{
                        padding: "8px 14px", borderRadius: 10,
                        background: coopSetupMode === d.key ? C.coop : C.bg,
                        color: coopSetupMode === d.key ? "#fff" : C.textDim,
                        border: `1px solid ${coopSetupMode === d.key ? C.coop : C.border}`,
                        cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
                        transition: "all 0.15s",
                      }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Puzzle selection - for non-mosaic, non-cascade modes */}
              {coopSetupMode && coopSetupMode !== "cascade" && coopSetupMode !== "mosaic" && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>
                    Puzzle #{coopSetupLevel + 1}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setCoopSetupLevel(Math.max(0, coopSetupLevel - 1))}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.textDim, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
                      &minus;
                    </button>
                    <input type="range" min={0} max={49} value={coopSetupLevel}
                      onChange={e => setCoopSetupLevel(Number(e.target.value))}
                      style={{ flex: 1, accentColor: C.coop }} />
                    <button onClick={() => setCoopSetupLevel(Math.min(49, coopSetupLevel + 1))}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.textDim, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
                      +
                    </button>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, minWidth: 28, textAlign: "center" }}>
                      {coopSetupLevel + 1}
                    </span>
                  </div>
                </div>
              )}

              {/* Mosaic selection - when mosaic mode is selected */}
              {coopSetupMode === "mosaic" && (() => {
                const availableMosaics = [...(myMosaics || []), ...(staffPickMosaic ? [staffPickMosaic] : [])].filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>
                      Choose Mosaic
                    </div>
                    {availableMosaics.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                        {availableMosaics.map(m => {
                          const sel = coopSetupMosaic?.id === m.id;
                          return (
                            <button key={m.id} onClick={() => setCoopSetupMosaic(m)} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10,
                              backgroundColor: sel ? C.coop + "18" : C.bg, border: `1px solid ${sel ? C.coop : C.border}`,
                              cursor: "pointer", transition: "all 0.15s", width: "100%", textAlign: "left",
                            }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? C.coop : C.border}`, backgroundColor: sel ? C.coop : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                                {sel && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{m.title || "Untitled"}</span>
                              {m.authorUsername && <span style={{ fontSize: 9, color: C.textDim }}>by {m.authorUsername}</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", padding: "8px 0" }}>No mosaics available. Create one in the Mosaic gallery first.</div>
                    )}
                  </div>
                );
              })()}

              {/* Start button */}
              <button
                disabled={!coopSetupMode || coopSetupStarting || (coopSetupMode === "mosaic" && !coopSetupMosaic)}
                onClick={async () => {
                  if (!coopSetupMode) return;
                  if (coopSetupMode === "mosaic" && !coopSetupMosaic) return;
                  setCoopSetupStarting(true);
                  try {
                    if (coopSetupMode === "mosaic") {
                      await startCoopMosaicSession({ mosaicOverride: coopSetupMosaic });
                    } else {
                      setDifficulty(coopSetupMode);
                      const level = coopSetupMode === "cascade" ? 0 : coopSetupLevel;
                      startPuzzle(level, coopSetupMode);
                      setView("play");
                      // Small delay to ensure puzzle is loaded, then start co-op
                      setTimeout(() => {
                        startCoopSession();
                      }, 300);
                    }
                  } catch { /* ignore */ }
                  setCoopSetupStarting(false);
                }}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                  background: (coopSetupMode && !(coopSetupMode === "mosaic" && !coopSetupMosaic)) ? C.coop : C.border,
                  color: (coopSetupMode && !(coopSetupMode === "mosaic" && !coopSetupMosaic)) ? "#fff" : C.textDim,
                  border: "none", cursor: (coopSetupMode && !(coopSetupMode === "mosaic" && !coopSetupMosaic)) ? "pointer" : "default",
                  opacity: coopSetupStarting ? 0.6 : 1, transition: "all 0.15s",
                }}>
                {coopSetupStarting ? "Starting..." : "Start & Invite Friend"}
              </button>
            </div>
          )}

          {/* Active Co-op Sessions */}
          {firebaseUser && (() => {
            const activeSessions = activeCoopSessions.filter(s => s.status !== "complete");
            const completedSessions = activeCoopSessions.filter(s => s.status === "complete");
            const renderSessionCard = (session, isCompleted) => {
              const isHost = session.hostUid === firebaseUser.uid;
              const isMosaicSession = session._type === "mosaic";
              const mosaicPlayerCount = isMosaicSession ? Object.keys(session.players || {}).length : 0;
              const partnerName = isMosaicSession
                ? (mosaicPlayerCount > 1 ? `${mosaicPlayerCount} players` : null)
                : (isHost ? (session.guestUsername || null) : (session.hostUsername || null));
              const modeLabel = isMosaicSession ? "Mosaic" : ((DIFFICULTIES.find(d => d.key === session.mode)?.label) || session.mode);
              const titleLabel = isMosaicSession
                ? (session.mosaicTitle || "Untitled")
                : `${modeLabel} #${(session.level ?? 0) + 1}`;
              const statusLabel = session.status === "waiting" ? "Waiting for partner" : session.status === "playing" ? "In progress" : session.status === "complete" ? "Complete" : session.status;
              const statusColor = session.status === "waiting" ? C.textDim : session.status === "playing" ? C.coop : session.status === "complete" ? C.correct : C.textDim;
              const mosaicSolved = isMosaicSession ? Object.values(session.tileProgress || {}).filter(v => v > 0).length : 0;
              return (
                <div key={session.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  borderRadius: 12, backgroundColor: C.surface,
                  border: `1px solid ${isCompleted ? C.correct + "22" : isMosaicSession ? C.coop + "22" : C.border}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      {isMosaicSession && (
                        <span style={{ fontSize: 9, color: isCompleted ? C.correct : C.coop, fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                          {isCompleted ? "Mosaic" : "Co-op Mosaic"}
                        </span>
                      )}
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                        {titleLabel}
                      </span>
                      {!isCompleted && (
                        <span style={{ fontSize: 9, color: isHost ? C.coop : "#FF9FF3", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          {isHost ? "Host" : "Guest"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: statusColor, fontFamily: "'Inter', sans-serif" }}>
                      {isCompleted ? (
                        <>
                          {"\u2713"} Complete
                          {isMosaicSession && <span style={{ color: C.textDim }}> {"\u2022"} 25/25 tiles</span>}
                          {partnerName && <span style={{ color: C.textDim }}> {"\u2022"} with {partnerName}</span>}
                        </>
                      ) : (
                        <>
                          {statusLabel}
                          {isMosaicSession && session.status === "playing" && <span style={{ color: C.textDim }}> {"\u2022"} {mosaicSolved}/25 tiles</span>}
                          {partnerName && <span style={{ color: C.textDim }}> {"\u2022"} with {partnerName}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {isCompleted && isMosaicSession && (
                      <button
                        onClick={() => setCoopCompletedBreakdown(session)}
                        style={{
                          background: C.correct, border: "none", borderRadius: 8,
                          padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 10,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: 0.5,
                        }}>
                        View
                      </button>
                    )}
                    {!isCompleted && (
                      <button
                        onClick={() => isMosaicSession ? rejoinCoopMosaicSession(session) : rejoinCoopSession(session)}
                        style={{
                          background: C.coop, border: "none", borderRadius: 8,
                          padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 10,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: 0.5,
                        }}>
                        Rejoin
                      </button>
                    )}
                    {isHost && !isCompleted && (
                      <button
                        onClick={() => isMosaicSession ? closeCoopMosaicSessionPermanently(session.id, session) : closeCoopSessionPermanently(session.id, session)}
                        style={{
                          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                          padding: "8px 10px", color: C.textDim, cursor: "pointer", fontSize: 10,
                          fontFamily: "'Inter', sans-serif",
                        }}
                        title="Close session"
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                      >{"\u2715"}</button>
                    )}
                  </div>
                </div>
              );
            };
            return (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 9, color: C.coop, textTransform: "uppercase",
                    letterSpacing: 1.5, marginBottom: 10,
                    fontFamily: "'Inter', sans-serif", fontWeight: 700,
                  }}>Active Sessions {activeSessions.length > 0 && `(${activeSessions.length})`}</div>

                  {activeSessions.length === 0 ? (
                    <div style={{
                      textAlign: "center", padding: "24px 16px", borderRadius: 12,
                      backgroundColor: C.surface, border: `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontSize: 12, color: C.textDim }}>
                        No active sessions
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>
                        Start a puzzle above to create one
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activeSessions.map(session => renderSessionCard(session, false))}
                    </div>
                  )}
                </div>

                {/* Completed Co-op Sessions */}
                {completedSessions.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: 9, color: C.correct, textTransform: "uppercase",
                      letterSpacing: 1.5, marginBottom: 10,
                      fontFamily: "'Inter', sans-serif", fontWeight: 700,
                    }}>Completed Sessions ({completedSessions.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {completedSessions.map(session => renderSessionCard(session, true))}
                    </div>
                  </div>
                )}

                {/* Completed session breakdown modal */}
                {coopCompletedBreakdown && (() => {
                  const bs = coopCompletedBreakdown;
                  const tp = bs.tileProgress || {};
                  const tt = bs.tileTimes || {};
                  const players = bs.players || {};
                  const playerNames = Object.values(players).map(p => p.username || "Player").filter(Boolean);
                  const totalAttempts = Object.values(tp).reduce((a, b) => a + (b || 0), 0);
                  const totalTime = Object.values(tt).reduce((a, b) => a + (b || 0), 0);
                  const avgAttempts = Object.keys(tp).length > 0 ? (totalAttempts / Object.keys(tp).length).toFixed(1) : "0";
                  const perfectTiles = Object.values(tp).filter(v => v === 1).length;
                  const formatTime = (s) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}m ${sec}s` : `${sec}s`; };
                  return (
                    <DraggableDrawer isOpen={true} onClose={() => setCoopCompletedBreakdown(null)} zIndex={1200}>
                      <div data-drawer-scroll style={{ padding: "0 24px 24px", overflowY: "auto", flex: 1 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: C.correct, marginBottom: 4 }}>
                          {"\u2713"} {bs.mosaicTitle || "Untitled"}
                        </div>
                        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
                          Co-op mosaic completed{playerNames.length > 0 ? ` with ${playerNames.join(", ")}` : ""}
                        </div>

                        {/* Summary stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                          {[
                            { label: "Total Time", value: formatTime(totalTime) },
                            { label: "Total Attempts", value: totalAttempts },
                            { label: "Perfect Tiles", value: `${perfectTiles}/25` },
                            { label: "Avg Attempts", value: avgAttempts },
                          ].map(stat => (
                            <div key={stat.label} style={{
                              padding: "10px 12px", borderRadius: 10,
                              backgroundColor: C.bg, border: `1px solid ${C.border}`,
                              textAlign: "center",
                            }}>
                              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text }}>
                                {stat.value}
                              </div>
                              <div style={{ fontSize: 8, color: C.textDim, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                                {stat.label}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Per-tile breakdown */}
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
                          Tile Breakdown
                        </div>
                        <div style={{
                          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
                          padding: 8, borderRadius: 10, backgroundColor: C.bg, border: `1px solid ${C.border}`,
                        }}>
                          {Array.from({ length: 25 }, (_, i) => {
                            const tileAttempts = tp[i] || tp[String(i)] || 0;
                            const tileTime = tt[i] || tt[String(i)] || 0;
                            const isPerfect = tileAttempts === 1;
                            return (
                              <div key={i} style={{
                                padding: "6px 2px", borderRadius: 6, textAlign: "center",
                                backgroundColor: isPerfect ? C.correct + "15" : C.surface,
                                border: `1px solid ${isPerfect ? C.correct + "44" : C.border}`,
                              }}>
                                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: isPerfect ? C.correct : C.text }}>
                                  {i + 1}
                                </div>
                                <div style={{ fontSize: 8, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                                  {tileAttempts === 1 ? "\u2713" : `${tileAttempts}x`}
                                </div>
                                <div style={{ fontSize: 7, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                                  {formatTime(tileTime)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button onClick={() => setCoopCompletedBreakdown(null)}
                          style={{
                            width: "100%", marginTop: 16, padding: "10px 0", borderRadius: 10,
                            backgroundColor: C.correct, color: "#fff", border: "none",
                            fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
                            letterSpacing: 1, cursor: "pointer",
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </DraggableDrawer>
                  );
                })()}
              </>
            );
          })()}
        </div>
        {renderContextButton("coop")}
        {globalModalsEl}
      </div>
    );
  }

  // --- PROFILE VIEW ---
  if (view === "profile") {
    const achs = computeAchievements(progress, times, savedAchievementIds);
    const achUnlocked = achs.filter(a => a.unlocked).length;
    const achTotal = achs.length;
    const totalSolvedAll = [...SOLVE_MODES, "daily"].reduce((s, m) => s + countModeSolved(progress[m]), 0)
      + Object.values(progress.cascade || {}).filter(v => v === CASCADE_LEVELS.length).length;
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))", paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } `}</style>

        {/* Header */}
        <div style={{
          width: "100%", maxWidth: 480,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 4, paddingRight: 4,
          position: "sticky", top: 0, zIndex: 50,
          backgroundColor: C.bg + "ee", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        }}>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: 0, color: C.accent, lineHeight: 1 }}>
            Profile
          </h1>
        </div>

        <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.4s ease" }}>

          {/* Profile card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px 0",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0, overflow: "hidden",
              backgroundColor: "#60A5FA22", border: "2px solid #60A5FA44",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {firebaseUser && profilePicture ? (
                <img src={profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                {firebaseUser ? (username || "Player") : "Guest"}
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {firebaseUser ? firebaseUser.email : "Not signed in"}
              </div>
              {firebaseUser && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    backgroundColor: syncStatus === "syncing" ? C.inProgress : syncStatus === "error" ? C.incorrect : C.correct,
                  }} />
                  <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                    {syncStatus === "syncing" ? "Syncing..." : syncStatus === "error" ? "Sync error" : "Synced"}
                  </span>
                  <span style={{ color: C.textDim, fontSize: 9 }}>&middot;</span>
                  <span style={{ fontSize: 9, color: C.accent, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                    {totalSolvedAll} solved
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Account / Sign In */}
            {firebaseConfigured && (
              <button onClick={() => {
                if (firebaseUser) {
                  setRadialMenuStack(["root", "profile", "profile-view"]);
                } else {
                  setRadialMenuStack(["root", "sign-in"]); setAccountTab("login"); setAccountError("");
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
                  border: "1.5px solid #60A5FA44", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" stroke="#60A5FA" strokeWidth="1.5" fill="none"/>
                    <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                    {firebaseUser ? "Edit Profile" : "Sign In"}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                    {firebaseUser ? "Change picture, username" : "Sign in to sync progress"}
                  </div>
                </div>
                <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
              </button>
            )}

            {/* Achievements */}
            <button onClick={() => setRadialMenuStack(["root", "achievements-view"])} style={{
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
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                  Achievements
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  {achUnlocked}/{achTotal} unlocked
                </div>
              </div>
              <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
            </button>

            {/* Statistics */}
            <button onClick={() => setRadialMenuStack(["root", "share-stats"])} style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#4ECDC4"; }}
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
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                  Statistics
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  {totalSolvedAll} puzzles solved
                </div>
              </div>
              <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
            </button>

            {/* Birthday Puzzle */}
            <button onClick={() => setRadialMenuStack(["root", "profile", "birthday-edit"])} style={{
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
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                  Birthday Puzzle
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  {birthday ? `Set: ${birthday}` : "Set your birthday"}
                </div>
              </div>
              <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
            </button>

            {/* Themes */}
            <button onClick={() => setRadialMenuStack(["root", "theme-list"])} style={{
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
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                  Themes
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  {activeTheme.id === "classic" ? "Classic" : `${activeTheme.icon || ""} ${activeTheme.name}`}
                </div>
              </div>
              <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
            </button>

            {/* Friends */}
            {firebaseConfigured && firebaseUser && (
              <button onClick={() => { setRadialMenuStack(["root", "friends-view"]); }} style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s", position: "relative",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.correct; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: C.correct + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${C.correct}44`, flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.correct} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
                    Friends
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                    {friendsList.length} friend{friendsList.length !== 1 ? "s" : ""}
                  </div>
                </div>
                {onlineFriendsCount > 0 && (
                  <div style={{
                    minWidth: 22, height: 22, borderRadius: 11,
                    backgroundColor: C.correct, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 6px", boxShadow: `0 0 12px ${C.correct}66`,
                  }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: C.bg }}>
                      {onlineFriendsCount}
                    </span>
                  </div>
                )}
                <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
              </button>
            )}

            {/* Admin sections */}
            {isAdmin && (
              <>
                <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />
                <button onClick={() => { setView("admin-review"); loadMosaicData("admin"); }} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  backgroundColor: C.surface, border: `1px solid ${C.incorrect}33`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#EF444422", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #EF444444", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9.5 4.5 11.5 5 8 2.5 5.5 6 5z" stroke="#EF4444" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>Admin: Review</div>
                  </div>
                  <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                </button>
                <button onClick={() => { setView("admin-manage"); loadMosaicData("manage"); }} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  backgroundColor: C.surface, border: `1px solid #F59E0B33`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#F59E0B22", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #F59E0B44", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>Admin: Manage</div>
                  </div>
                  <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                </button>
                <button onClick={() => { setView("admin-metrics"); loadAdminMetricsData(); }} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  backgroundColor: C.surface, border: `1px solid #8B5CF633`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#8B5CF622", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #8B5CF644", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="9" width="3" height="5" rx="0.5" fill="#8B5CF6"/><rect x="6.5" y="5" width="3" height="9" rx="0.5" fill="#8B5CF6"/><rect x="11" y="2" width="3" height="12" rx="0.5" fill="#8B5CF6"/></svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>Admin: Metrics</div>
                  </div>
                  <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                </button>
                <button onClick={() => setView("admin-users")} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  backgroundColor: C.surface, border: `1px solid #06B6D433`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#06B6D422", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #06B6D444", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="#06B6D4" strokeWidth="1.5" fill="none"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#06B6D4" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>Admin: Users</div>
                  </div>
                  <span style={{ color: C.textDim, fontSize: 16 }}>&rsaquo;</span>
                </button>
              </>
            )}

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />

            {/* Sign out */}
            {firebaseUser && (
              <button onClick={handleSignOut} style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: C.textDim + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${C.textDim}44`, flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>Sign Out</div>
                </div>
              </button>
            )}

            {/* Clear All Data */}
            <button onClick={() => setRadialMenuStack(["root", "profile", "clear-confirm"])} style={{
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
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.incorrect, letterSpacing: 0.5 }}>
                  Clear All Data
                </div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  Reset all progress and start fresh
                </div>
              </div>
            </button>

            {/* Delete Account */}
            {firebaseUser && (
              <button onClick={() => { setRadialMenuStack(["root", "profile", "delete-account"]); setAccountError(""); setAccountPassword(""); }} style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s", marginTop: 4,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#dc2626"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: "#dc262622", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid #dc262644", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: "#dc2626", letterSpacing: 0.5 }}>
                    Delete Account
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                    Permanently delete your account and all data
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Delete Account confirmation dialog */}

        {renderContextButton("profile")}
        {globalModalsEl}
      </div>
    );
  }

  // --- MENU VIEW ---
  if (view === "menu") {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: C.bg, color: C.text,
        fontFamily: "'Inter', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))", paddingLeft: 20, paddingRight: 20,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } @keyframes achievementToastIn { 0%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.6)} 40%{opacity:1;transform:translateX(-50%) translateY(6px) scale(1.05)} 60%{transform:translateX(-50%) translateY(-3px) scale(0.98)} 80%{transform:translateX(-50%) translateY(1px) scale(1.01)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} } @keyframes achievementToastOut { 0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.85)} } @keyframes achievementBadgeSpin { 0%{transform:rotateY(0deg) scale(1)} 30%{transform:rotateY(180deg) scale(1.2)} 60%{transform:rotateY(360deg) scale(1.1)} 100%{transform:rotateY(360deg) scale(1)} } @keyframes achievementGlow { 0%{box-shadow:0 0 0px transparent} 30%{box-shadow:0 0 24px currentColor} 100%{box-shadow:0 0 0px transparent} } @keyframes achievementShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} } @keyframes achievementSparkle { 0%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1) rotate(180deg)} 100%{opacity:0;transform:scale(0) rotate(360deg)} } `}</style>

        {/* ── Scrollable content area ── */}
        <div style={{ width: "100%", maxWidth: 480, paddingTop: "calc(20px + env(safe-area-inset-top, 0px))", boxSizing: "border-box" }}>

        {/* ── Daily hero card ── */}
        {(() => {
          const todayIdx = getTodayDailyIndex();
          const todayKey = getDailyKey(todayIdx);
          const todayResult = (progress.daily || {})[todayKey];
          const todayTime = (times.daily || {})[todayKey];
          const streak = getDailyStreak(progress);
          const todayLabel = getDailyDateLabel(todayIdx);
          return (
            <div style={{
              width: "100%", marginBottom: 20, animation: "fadeUp 0.4s ease both",
              borderRadius: 16, overflow: "hidden",
              background: `linear-gradient(135deg, ${C.surface} 0%, ${C.accent}11 100%)`,
              border: `1px solid ${C.accent}33`,
              padding: "20px", boxSizing: "border-box",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32 }}>
                    <Calendar size={28} color={C.accent} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
                      Daily Puzzle
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                      {todayLabel}
                    </div>
                  </div>
                </div>
                {streak > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 20,
                    backgroundColor: C.gold + "18", border: `1px solid ${C.gold}33`,
                  }}>
                    <span style={{ fontSize: 13 }}>🔥</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.gold }}>{streak}</span>
                  </div>
                )}
              </div>
              {todayResult > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                  padding: "8px 12px", borderRadius: 10, backgroundColor: C.bg + "88",
                }}>
                  <ScoreBadge attempts={todayResult} />
                  <span style={{ fontSize: 12, color: C.text, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                    Solved in {todayResult} attempt{todayResult !== 1 ? "s" : ""}
                  </span>
                  {todayTime != null && (
                    <span style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
                      {formatTime(todayTime)}
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setDifficulty("daily"); startPuzzle(0, "daily", false, todayLabel); }}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    fontFamily: "'Inter', sans-serif", letterSpacing: 1,
                    background: C.accent, color: C.bg, border: "none", cursor: "pointer",
                    transition: "transform 0.15s",
                  }}
                >
                  {todayResult > 0 ? "View Result" : "Play Today"}
                </button>
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
                    padding: "12px 16px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                    fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                    background: "none", border: `1px solid ${C.accent}55`, color: C.accent, cursor: "pointer",
                  }}
                >
                  {dailyShareMsg || "Share"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Notification panel - dropdown when bell is clicked */}
        {showNotifications && firebaseUser && notifications.length > 0 && (
          <div style={{
            width: "100%", marginBottom: 16, animation: "fadeUp 0.3s ease both",
            borderRadius: 12, overflow: "hidden", border: `1px solid #54A0FF44`,
            backgroundColor: C.surface, padding: "12px 16px", boxSizing: "border-box",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
            }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: "#54A0FF", letterSpacing: 1, textTransform: "uppercase" }}>
                Notifications
              </span>
              <button
                onClick={() => setShowNotifications(false)}
                style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, padding: "0 4px" }}
              >{"\u2715"}</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 8, backgroundColor: C.bg, border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    backgroundColor: (notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") ? C.coop + "22" : notif.type === "mosaic_pending_review" ? "#FFE66D22" : C.accent + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1.5px solid ${(notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") ? C.coop + "44" : notif.type === "mosaic_pending_review" ? "#FFE66D44" : C.accent + "44"}`,
                  }}>
                    <span style={{ fontSize: 12, color: (notif.type === "coop_invite" || notif.type === "coop_mosaic_invite" || notif.type === "vault_invite") ? C.coop : notif.type === "mosaic_pending_review" ? "#FFE66D" : C.accent }}>
                      {notif.type === "vault_invite" ? "\uD83D\uDD12" : notif.type === "coop_invite" ? "\u2694" : notif.type === "coop_mosaic_invite" ? "\u25A6" : notif.type === "mosaic_pending_review" ? "\u2691" : "\u25A6"}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600, color: C.text, lineHeight: 1.3 }}>
                      {notif.type === "vault_invite"
                        ? `${notif.fromUsername || "Someone"} invited you to a vault`
                        : notif.type === "coop_invite"
                        ? `${notif.fromUsername || "Someone"} invited you to co-op`
                        : notif.type === "coop_mosaic_invite"
                        ? `${notif.fromUsername || "Someone"} invited you to co-op mosaic`
                        : notif.type === "mosaic_pending_review"
                        ? `${notif.fromUsername || "Someone"} submitted a mosaic for review`
                        : `${notif.fromUsername || "Someone"} shared a mosaic`
                      }
                    </div>
                    {notif.type === "vault_invite" && notif.data?.difficulty && (
                      <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                        {(VAULT_DIFFICULTIES[notif.data.difficulty] || {}).label || notif.data.difficulty}
                      </div>
                    )}
                    {notif.type === "coop_invite" && notif.data?.mode && (
                      <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                        {notif.data.mode} #{(notif.data.level ?? 0) + 1}
                      </div>
                    )}
                    {notif.type === "coop_mosaic_invite" && notif.data?.mosaicTitle && (
                      <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                        &ldquo;{notif.data.mosaicTitle}&rdquo;
                      </div>
                    )}
                    {(notif.type === "mosaic_shared" || notif.type === "mosaic_pending_review") && notif.data?.title && (
                      <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>
                        &ldquo;{notif.data.title}&rdquo;
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {notif.type === "vault_invite" && notif.data?.sessionId && (
                      <button
                        onClick={() => {
                          setVaultSessionId(notif.data.sessionId);
                          setVaultRole("guest");
                          setView("vault");
                          setRadialMenuStack([]);
                          dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                          setShowNotifications(false);
                        }}
                        style={{
                          background: C.coop, border: "none", borderRadius: 6,
                          padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 9,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700,
                        }}
                      >
                        Join
                      </button>
                    )}
                    {notif.type === "coop_invite" && notif.data?.sessionId && (
                      <button
                        onClick={async () => {
                          // Join the coop session
                          const session = await loadCoopSession(notif.data.sessionId);
                          if (session && session.status !== "complete") {
                            setDifficulty(session.mode);
                            setCurrentPuzzle(session.level ?? 0);
                            if (session.dailyDate) setCurrentDailyDate(session.dailyDate);
                            setCoopSessionId(session.id);
                            setCoopRole("guest");
                            setCoopStatus("joining");
                            coopJoiningRef.current = true;
                            setFills({});
                            setAttempts(0);
                            setGameState("playing");
                            setWrongCells(new Set());
                            setLockedCells(new Set());
                            setShowParticles(false);
                            setSelectedCell(null);
                            setSelectedToken(null);
                            setView("play");
                          }
                          dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                          setShowNotifications(false);
                        }}
                        style={{
                          background: C.coop, border: "none", borderRadius: 6,
                          padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 9,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700,
                        }}
                      >
                        Join
                      </button>
                    )}
                    {notif.type === "coop_mosaic_invite" && notif.data?.sessionId && (
                      <button
                        onClick={() => {
                          setCoopMosaicSessionId(notif.data.sessionId);
                          setCoopMosaicRole("guest");
                          setCoopMosaicStatus("joining");
                          coopMosaicJoiningRef.current = true;
                          dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                          setShowNotifications(false);
                        }}
                        style={{
                          background: C.coop, border: "none", borderRadius: 6,
                          padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: 9,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700,
                        }}
                      >
                        Join
                      </button>
                    )}
                    {notif.type === "mosaic_shared" && (
                      <button
                        onClick={() => {
                          dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                          setMosaicGalleryTab("shared");
                          loadMosaicData("shared");
                          setView("gallery");
                          setShowNotifications(false);
                        }}
                        style={{
                          background: C.accent, border: "none", borderRadius: 6,
                          padding: "4px 8px", color: C.bg, cursor: "pointer", fontSize: 9,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700,
                        }}
                      >
                        View
                      </button>
                    )}
                    {notif.type === "mosaic_pending_review" && (
                      <button
                        onClick={() => {
                          dismissNotification(firebaseUser.uid, notif.id).catch(() => {});
                          loadMosaicData("admin");
                          setView("admin-review");
                          setShowNotifications(false);
                        }}
                        style={{
                          background: "#FFE66D", border: "none", borderRadius: 6,
                          padding: "4px 8px", color: C.bg, cursor: "pointer", fontSize: 9,
                          fontFamily: "'Inter', sans-serif", fontWeight: 700,
                        }}
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => { dismissNotification(firebaseUser.uid, notif.id).catch(() => {}); }}
                      style={{
                        background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: "4px 6px", color: C.textDim, cursor: "pointer", fontSize: 9,
                      }}
                      title="Dismiss"
                    >{"\u2715"}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode selector: categorized auto-wrapping grid */}
        <div style={{
          marginBottom: 20, animation: "fadeUp 0.5s 0.05s ease both",
          width: "100%",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {MODE_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div style={{
                fontSize: 9, color: C.textDim, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 6,
                fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {radialIcons[CATEGORY_ICONS[cat]](C.textDim)}
                <span>{cat}</span>
              </div>
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
                        fontFamily: "'Inter', sans-serif",
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
                      {radialIcons[d.icon](active ? (d.key === "blind" && !isCleared ? "#fff" : C.bg) : isCleared ? C.gold : C.textDim)}
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
            <div style={{ width: "100%", animation: "fadeUp 0.5s 0.15s ease both" }}>
              {/* Month navigation with Today button */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
              }}>
                <button
                  onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }}
                  style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px",
                    color: C.textDim, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}
                >&larr;</button>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 1 }}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={() => { if (canGoForward) { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); } }}
                  disabled={!canGoForward}
                  style={{
                    background: "none", border: `1px solid ${canGoForward ? C.border : C.border + "44"}`, borderRadius: 8, padding: "6px 12px",
                    color: canGoForward ? C.textDim : C.textDim + "44", cursor: canGoForward ? "pointer" : "default",
                    fontFamily: "'Inter', sans-serif", fontSize: 14, transition: "all 0.15s",
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
                      color: C.accent, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 10,
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
                    color: C.textDim, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 10,
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
                    textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 9,
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
                  const dailyCoopResult = (progress.coop || {})[`daily_${cell.seed}`];
                  const dailyCoopSolved = dailyCoopResult > 0;
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
                      {dailyCoopSolved && (
                        <span style={{
                          position: "absolute", top: 2, left: 2,
                          width: 6, height: 6, borderRadius: "50%",
                          backgroundColor: C.coop,
                          boxShadow: `0 0 3px ${C.coop}66`,
                        }} />
                      )}
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: cell.isToday ? 800 : isBd ? 800 : 600,
                        color: numColor, lineHeight: 1,
                      }}>{cell.day}</span>
                      {solved && <ScoreBadge attempts={cell.result} />}
                      {solved && cell.time != null && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 7, color: C.textDim, lineHeight: 1 }}>
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
                fontFamily: "'Inter', sans-serif", letterSpacing: 0.5,
                flexWrap: "wrap", justifyContent: "center",
              }}>
                <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
                <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
                <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
                <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
                <span><span style={{ color: C.coop }}>{"\u25CF"}</span> co-op</span>
                {birthday && <span><span style={{ color: "#F472B6" }}>{"\uD83C\uDF82"}</span> birthday</span>}
              </div>

            </div>
          );
        })()}

        {/* Mosaic: Staff Pick featured panel + carousel of all mosaics */}
        {isMosaic && (<>
        <style>{`.mosaic-carousel::-webkit-scrollbar { display: none; }`}</style>

        {/* Staff Pick — featured center-stage panel */}
        {staffPickMosaic && (() => {
          const spProgress = staffPickMosaic.id ? (progress.mosaicCompletions || {})[staffPickMosaic.id] : null;
          const spSolved = spProgress ? Object.values(spProgress).filter(v => typeof v === "number" && v > 0).length : 0;
          return (
            <div style={{
              width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            }}>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'Inter', sans-serif" }}>
                <span style={{ color: C.accent }}>&#9733; Staff Pick</span>
              </div>
              <button
                onClick={() => { customMosaicReturnViewRef.current = "menu"; startCustomMosaicPlay(staffPickMosaic); }}
                style={{
                  width: "100%", maxWidth: 320, padding: 16, borderRadius: 16,
                  backgroundColor: C.surface, border: `2px solid ${C.accent}44`,
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 30px ${C.accent}22`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.accent + "44"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <MosaicThumbnail
                  grid={staffPickMosaic.grid}
                  size={Math.min(240, typeof window !== "undefined" ? window.innerWidth - 120 : 240)}
                  hidden={true}
                  completedTiles={spProgress}
                />
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700,
                    color: C.text, letterSpacing: 1, marginBottom: 4,
                  }}>
                    {staffPickMosaic.title || "Untitled"}
                  </div>
                  {staffPickMosaic.authorUsername && (
                    <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6 }}>by {staffPickMosaic.authorUsername}</div>
                  )}
                  <div style={{
                    fontSize: 10, fontFamily: "'Inter', sans-serif",
                    color: spSolved === 25 ? C.correct : C.textDim, letterSpacing: 0.5,
                  }}>
                    {spSolved === 25 ? "Completed!" : `${spSolved}/25 tiles solved`}
                  </div>
                </div>
              </button>
            </div>
          );
        })()}

        {/* Shared mosaics carousel */}
        {(() => {
          const sharedCarouselMosaics = (sharedMosaics || []);
          if (sharedCarouselMosaics.length === 0) return null;
          return (
            <div style={{
              width: "100%", marginTop: 24, animation: "fadeUp 0.5s 0.3s ease both",
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8,
                fontFamily: "'Inter', sans-serif",
              }}>Shared With You</div>
              <div className="mosaic-carousel" style={{
                display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8,
                scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
                msOverflowStyle: "none", scrollbarWidth: "none",
              }}>
                {sharedCarouselMosaics.map((mosaic) => (
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
                    <MosaicThumbnail grid={mosaic.grid} size={72} hidden={true} completedTiles={mosaic.id ? (progress.mosaicCompletions || {})[mosaic.id] : null} />
                    <div style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600,
                      color: C.text, textAlign: "center", lineHeight: 1.2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      width: "100%",
                    }}>
                      {mosaic.title || "Untitled"}
                    </div>
                    <div style={{
                      fontSize: 8, color: C.textDim, letterSpacing: 0.5,
                    }}>
                      {mosaic.sharedByUsername || mosaic.authorUsername || ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Community & your mosaics carousel */}
        {(() => {
          const carouselMosaics = [
            ...(publicMosaicsList || []).map(m => ({ ...m, _source: "public" })),
            ...(myMosaics || []).filter(m => !publicMosaicsList?.some(p => p.id === m.id)).map(m => ({ ...m, _source: "mine" })),
          ].filter(m => !staffPickMosaic || m.id !== staffPickMosaic.id);
          if (carouselMosaics.length === 0) return null;
          return (
            <div style={{
              width: "100%", marginTop: 24, animation: "fadeUp 0.5s 0.3s ease both",
            }}>
              <div style={{
                fontSize: 9, color: C.textDim, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8,
                fontFamily: "'Inter', sans-serif",
              }}>Community Mosaics</div>
              <div className="mosaic-carousel" style={{
                display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8,
                scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
                msOverflowStyle: "none", scrollbarWidth: "none",
              }}>
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
                    <MosaicThumbnail grid={mosaic.grid} size={72} hidden={true} completedTiles={mosaic.id ? (progress.mosaicCompletions || {})[mosaic.id] : null} />
                    <div style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600,
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
          width: "100%", animation: "fadeUp 0.5s 0.15s ease both",
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
            const coopResult = (progress.coop || {})[`${difficulty}_${i}`];
            const coopSolved = coopResult > 0;
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
                {coopSolved && (
                  <span style={{
                    position: "absolute", top: 3, right: 3,
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: C.coop,
                    boxShadow: `0 0 4px ${C.coop}66`,
                  }} />
                )}
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700,
                  color: numColor, lineHeight: 1,
                }}>
                  {i + 1}
                </span>
                {isCascade ? (
                  <>
                    {cascadeSizeLabel ? <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 9, color: cascadeInProgress ? C.inProgress : C.textDim,
                      lineHeight: 1.2,
                    }}>
                      {cascadeSizeLabel}
                    </span> : null}
                    {solved && time != null && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 8, color: C.textDim, lineHeight: 1 }}>
                        {formatTime(time)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {result !== undefined && <ScoreBadge attempts={result} />}
                    {solved && time != null && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 8, color: C.textDim, lineHeight: 1 }}>
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
          fontFamily: "'Inter', sans-serif", letterSpacing: 0.5, animation: "fadeUp 0.5s 0.25s ease both",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <span><span style={{ color: C.gold }}>{"\u2605"}</span> 1-2 tries</span>
          <span><span style={{ color: C.silver }}>{"\u25CF"}</span> 3-4 tries</span>
          <span><span style={{ color: C.bronze }}>{"\u25C6"}</span> 5+ tries</span>
          <span><span style={{ color: C.incorrect }}>{"\u2717"}</span> failed</span>
          <span><span style={{ color: C.coop }}>{"\u25CF"}</span> co-op</span>
        </div>
        </>)}

        </div>{/* close scrollable content wrapper */}

        {/* Game Menu redirect (legacy — now uses profile view) */}
        {showGameMenu && (() => {
          setShowGameMenu(false);
          setView("profile");
          return null;
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
                  fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700,
                  color: tc, letterSpacing: 1.5, textTransform: "uppercase",
                  marginBottom: 3,
                }}>Achievement unlocked</div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                  color: C.text, letterSpacing: 0.5,
                }}>{achievementToast.label}</div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textDim,
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
                fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700,
                color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2,
              }}>Theme unlocked</div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
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
                color: C.bg, cursor: "pointer", fontFamily: "'Inter', sans-serif",
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

      {(() => {
        const menuPillButtons = [];
        if (firebaseConfigured && firebaseUser) {
          if (notifications.length > 0) {
            menuPillButtons.push({ id: "notifications", icon: "bell", color: "#54A0FF", onClick: () => { setRadialMenuStack(["root", "notifications-view"]); } });
          }
          if (activeCoopSessions.filter(s => s.status !== "complete").length > 0) {
            menuPillButtons.push({ id: "coop-active", icon: "handshake", color: "#A855F7", onClick: () => { loadActiveCoopSessions(); setRadialMenuStack(["root", "coop", "coop-active"]); } });
          }
          if (onlineFriendsCount > 0) {
            menuPillButtons.push({ id: "friends-online", icon: "friends", color: "#22C55E", onClick: () => { setRadialMenuStack(["root", "friends-view"]); setFriendsModalTab("list"); } });
            menuPillButtons.push({ id: "friend-reaction", icon: "reaction", color: friendReactionPickerOpen ? "#FFD700" : "#fff", onClick: () => { setRadialMenuStack([]); setFriendReactionPickerOpen(prev => !prev); } });
          }
        }
        return renderContextButton("menu", menuPillButtons);
      })()}
      {globalModalsEl}
      </div>
    );
  }

  // --- PLAY VIEW ---
  const diffLabel = isDaily ? "Daily" : isCascade ? "Cascade" : DIFFICULTIES.find(d => d.key === difficulty)?.label || "";
  const cascadeLevelLabel = isCascade && puzzle ? `${puzzle.gridSize}×${puzzle.gridSize}` : null;
  const totalPuzzles = puzzles.length;
  const lockedCount = lockedCells.size;
  const totalBlanks = puzzle ? puzzle.blanks.size : 0;

  // Pill action buttons for the bottom glass bar
  const playBackAction = () => {
    if (isCoop) { leaveCoopSession(); setView("menu"); return; }
    // Vault mode: return to vault overview instead of home
    if (isVault && vaultSessionId) {
      stopTimer(); setRadialMenuStack([]);
      setFriendReactionPickerOpen(false);
      setVaultSolvingTile(null);
      if (firebaseUser) updateVaultCurrentTile(vaultSessionId, firebaseUser.uid, -1).catch(() => {});
      setView("vault");
      return;
    }
    if (difficulty === "cascade") {
      const runState = { level: cascadeLevel, elapsedSeconds: getElapsedSeconds(), fills: { ...fills }, attempts };
      const nextProgress = { ...progress, cascadeRunState: { ...(progress.cascadeRunState || {}), [cascadeRunIndex]: runState }, cascadeRunStateLastIndex: cascadeRunIndex };
      setProgress(nextProgress); saveProgress(nextProgress);
    }
    stopTimer(); setRadialMenuStack(prev => prev.includes("mosaic-preview") ? [] : prev);
    setFriendReactionPickerOpen(false);
    if (customMosaicPuzzlesRef.current && isMosaic) {
      if (isCoopMosaic && coopMosaicSessionId && firebaseUser) {
        coopMosaicCurrentTileRef.current = -1;
        updateCoopMosaicCurrentTile(coopMosaicSessionId, firebaseUser.uid, -1).catch(() => {});
        setCoopMosaicOtherFills({});
        coopMosaicWriteThrottleRef.current = {};
      }
      setView("custom-mosaic");
    } else { setView("menu"); }
  };
  const playPillButtons = [];
  if (gameState === "playing") {
    if (isCoop && coopMyLockedIn) {
      playPillButtons.push({ id: "locked", icon: "check", color: C.correct });
    } else {
      const checkColor = allFilled
        ? (isCoop ? "#54A0FF" : isBlind ? "#e06040" : C.accent)
        : "rgba(255,255,255,0.3)";
      playPillButtons.push({
        id: "check", icon: "check", color: checkColor,
        onClick: allFilled ? (isCoop ? coopLockIn : checkSolution) : undefined,
        disabled: !allFilled,
      });
    }
    if (!isCoop && (Object.keys(fills).length > 0 || attempts > 0)) {
      playPillButtons.push({ id: "reset", icon: "refresh", color: "#fff", onClick: resetBoard });
    }
    if (isCoop && !coopMyLockedIn && Object.keys(coopPlayers).length > 0) {
      if (coopPendingPassCell) {
        // Pending pass — show clock badge icon, tap toggles waiting UI
        playPillButtons.push({ id: "pass-cell", icon: "pass-pending", color: "#f59e0b", onClick: () => {
          setPendingPassOpen(prev => !prev);
        }});
      } else {
        playPillButtons.push({ id: "pass-cell", icon: "pass", color: (coopPassMode || coopPassPlayerPicker) ? "#54A0FF" : "#fff", onClick: () => {
          if (coopPassMode) { setCoopPassMode(null); setSelectedToken(null); return; }
          setSelectedToken(null); setSelectedCell(null);
          // Cancel any active suggest mode and reaction picker
          setCoopSuggestMode(null); setCoopSuggestPlayerPicker(false); setCoopSuggestCell(null);
          setFriendReactionPickerOpen(false);
          const entries = Object.entries(coopPlayers);
          if (entries.length === 1) {
            const [uid, p] = entries[0];
            setCoopPassMode({ targetUid: uid, targetName: p.username || "Player", targetColor: coopPlayerColorMap[uid] || "#FF9FF3" });
          } else { setCoopPassPlayerPicker(prev => !prev); }
        }});
      }
    }
    // Suggest button — suggest what a cell could be to another player
    if (isCoop && Object.keys(coopPlayers).length > 0) {
      playPillButtons.push({ id: "suggest-cell", icon: "suggest", color: (coopSuggestMode || coopSuggestPlayerPicker || coopSuggestCell) ? "#E040FB" : "#fff", onClick: () => {
        if (coopSuggestMode) { setCoopSuggestMode(null); setCoopSuggestCell(null); return; }
        if (coopSuggestCell) { setCoopSuggestCell(null); return; }
        setSelectedToken(null); setSelectedCell(null);
        // Cancel any active pass mode and reaction picker
        setCoopPassMode(null); setCoopPassPlayerPicker(false);
        setFriendReactionPickerOpen(false);
        const entries = Object.entries(coopPlayers);
        if (entries.length === 1) {
          const [uid, p] = entries[0];
          setCoopSuggestMode({ targetUid: uid, targetName: p.username || "Player", targetColor: coopPlayerColorMap[uid] || "#FF9FF3" });
        } else { setCoopSuggestPlayerPicker(prev => !prev); }
      }});
    }
    // Friend reaction button — send reactions to online friends from any play mode
    if (firebaseConfigured && firebaseUser && onlineFriendsCount > 0) {
      playPillButtons.push({ id: "friend-reaction", icon: "reaction", color: friendReactionPickerOpen ? "#FFD700" : "#fff", onClick: () => {
        setRadialMenuStack([]);
        setFriendReactionPickerOpen(prev => !prev);
        setCoopPassMode(null); setCoopPassPlayerPicker(false);
        setCoopSuggestMode(null); setCoopSuggestPlayerPicker(false); setCoopSuggestCell(null);
      }});
    }
    if (customMosaicPuzzlesRef.current && isMosaic && customMosaicPlay) {
      playPillButtons.push({ id: "preview", icon: "search", color: C.accent, onClick: () => setRadialMenuStack(["root", "mosaic-preview"]) });
    }
  } else if (gameState === "won") {
    // Share
    playPillButtons.push({ id: "share", icon: "share", color: "#fff", onClick: async () => {
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
      if (result === "shared") { setShareMsg("Shared!"); setTimeout(() => setShareMsg(""), 2000); return; }
      if (result === "cancelled") return;
      navigator.clipboard.writeText(text).catch(() => {});
      setShareMsg("Copied!"); setTimeout(() => setShareMsg(""), 2000);
    }});
    // Retry
    playPillButtons.push({ id: "retry", icon: "refresh", color: "#fff", onClick: () => {
      if (isCoop) leaveCoopSession();
      startPuzzle(isCascade ? cascadeRunIndex : currentPuzzle, isCascade ? "cascade" : undefined, true, isDaily ? currentDailyDate : null);
    }});
    // Next / Done / Back — the primary action
    if (isVault && vaultSessionId) {
      // Vault: return to vault overview (auto-handled by timeout, but add explicit button too)
      playPillButtons.push({ id: "done", icon: "back", color: "#54A0FF", onClick: () => {
        setVaultSolvingTile(null);
        if (firebaseUser) updateVaultCurrentTile(vaultSessionId, firebaseUser.uid, -1).catch(() => {});
        setView("vault");
      }});
    } else if (isCoop) {
      playPillButtons.push({ id: "done", icon: "home", color: "#54A0FF", onClick: () => { leaveCoopSession(); setView("menu"); } });
    } else if (currentPuzzle < totalPuzzles - 1) {
      playPillButtons.push({ id: "next", icon: "forward", color: C.accent, onClick: () => startPuzzle(currentPuzzle + 1) });
    }
  } else if (gameState === "lost") {
    // Share (cascade only)
    if (isCascade && !isCoop) {
      playPillButtons.push({ id: "share", icon: "share", color: "#fff", onClick: async () => {
        const sz = puzzle?.gridSize ?? 0;
        const text = `Agnus Cascade \uD83E\uDDE9\nReached ${sz}×${sz}`;
        const result = await tryNativeShare({ text });
        if (result === "shared") { setShareMsg("Shared!"); setTimeout(() => setShareMsg(""), 2000); return; }
        if (result === "cancelled") return;
        navigator.clipboard.writeText(text).catch(() => {});
        setShareMsg("Copied!"); setTimeout(() => setShareMsg(""), 2000);
      }});
    }
    // Retry
    if (isCoop) {
      playPillButtons.push({ id: "retry", icon: "refresh", color: "#fff", onClick: retryCoop });
      playPillButtons.push({ id: "done", icon: "home", color: "#54A0FF", onClick: () => { leaveCoopSession(); setView("menu"); } });
    } else if (isCascade) {
      playPillButtons.push({ id: "retry", icon: "refresh", color: "#fff", onClick: () => startPuzzle(cascadeRunIndex, "cascade", true) });
    } else {
      playPillButtons.push({ id: "retry", icon: "refresh", color: "#fff", onClick: () => startPuzzle(currentPuzzle) });
      if (currentPuzzle < totalPuzzles - 1) {
        playPillButtons.push({ id: "next", icon: "forward", color: C.accent, onClick: () => startPuzzle(currentPuzzle + 1) });
      }
    }
  }

  return (
    <div
      ref={playViewScrollRef}
      style={{
      height: "100dvh", minHeight: "100dvh", backgroundColor: C.bg, color: C.text,
      fontFamily: "'Inter', sans-serif",
      display: "flex", flexDirection: "column",
      position: "relative", width: "100%",
      overflow: "hidden", overscrollBehavior: "none", touchAction: "none",
      boxSizing: "border-box",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'); * { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; touch-action: manipulation; } @keyframes particlePop { 0%{transform:scale(0);opacity:1} 50%{opacity:1} 100%{transform:scale(1) translateY(-40px);opacity:0} } @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} } @keyframes slideIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} } @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} } @keyframes fallIntoPlace { 0%{opacity:0;transform:translateY(-36px) scale(0.82)} 60%{transform:translateY(3px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} } @keyframes fallOff { 0%{opacity:1;transform:translateY(0) scale(1) rotate(0deg)} 8%{transform:translateY(-4px) scale(1.04) rotate(-3deg)} 100%{opacity:0;transform:translateY(180%) scale(0.75) rotate(18deg)} } @keyframes emptyCellIn { 0%{opacity:0} 100%{opacity:0.45} } @keyframes tilesWinCelebrate { 0%{transform:translateY(0) rotate(0deg) scale(1)} 30%{transform:translateY(-28px) rotate(180deg) scale(1.08)} 70%{transform:translateY(-32px) rotate(360deg) scale(1.08)} 100%{transform:translateY(0) rotate(360deg) scale(1)} } .token-picker-scroll::-webkit-scrollbar { display: none; } .reaction-scroll-container::-webkit-scrollbar { display: none; } @keyframes achievementToastIn { 0%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.6)} 40%{opacity:1;transform:translateX(-50%) translateY(6px) scale(1.05)} 60%{transform:translateX(-50%) translateY(-3px) scale(0.98)} 80%{transform:translateX(-50%) translateY(1px) scale(1.01)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} } @keyframes achievementBadgeSpin { 0%{transform:rotateY(0deg) scale(1)} 30%{transform:rotateY(180deg) scale(1.2)} 60%{transform:rotateY(360deg) scale(1.1)} 100%{transform:rotateY(360deg) scale(1)} } @keyframes achievementGlow { 0%{box-shadow:0 0 0px transparent} 30%{box-shadow:0 0 24px currentColor} 100%{box-shadow:0 0 0px transparent} } @keyframes achievementShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} } @keyframes achievementSparkle { 0%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1) rotate(180deg)} 100%{opacity:0;transform:scale(0) rotate(360deg)} } @keyframes achievementToastOut { 0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(0.85)} } @keyframes snowFall { 0%{transform:translateY(0) translateX(0);opacity:1} 100%{transform:translateY(calc(100% + 300px)) translateX(var(--drift, 10px));opacity:0.2} } @keyframes batFloat { 0%,100%{transform:translateY(0) translateX(0)} 25%{transform:translateY(-8px) translateX(6px)} 50%{transform:translateY(2px) translateX(-4px)} 75%{transform:translateY(-5px) translateX(8px)} } @keyframes neonPulse { 0%,100%{box-shadow:0 0 15px #FF008044,0 0 30px #00FF8022,inset 0 0 15px #FF008011} 33%{box-shadow:0 0 20px #00FF8044,0 0 40px #FF008022,inset 0 0 20px #00FF8011} 66%{box-shadow:0 0 20px #FFFF0044,0 0 40px #8000FF22,inset 0 0 20px #FFFF0011} } @keyframes bubbleRise { 0%{transform:translateY(0) translateX(0);opacity:1} 50%{transform:translateY(-150px) translateX(8px);opacity:0.6} 100%{transform:translateY(-300px) translateX(-4px);opacity:0} } @keyframes petalFall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1} 100%{transform:translateY(calc(100% + 300px)) translateX(var(--drift, 10px)) rotate(360deg);opacity:0.15} } @keyframes leafFall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1} 50%{transform:translateY(150px) translateX(var(--drift, 15px)) rotate(180deg);opacity:0.7} 100%{transform:translateY(calc(100% + 300px)) translateX(calc(var(--drift, 15px) * -0.5)) rotate(360deg);opacity:0} } @keyframes starTwinkle { 0%,100%{opacity:0} 50%{opacity:var(--opacity, 0.6)} } @keyframes scanlineMove { 0%{background-position:0 -100%} 100%{background-position:0 200%} } @keyframes auroraShift { 0%{opacity:0.6;transform:translateX(-5%)} 100%{opacity:1;transform:translateX(5%)} } @keyframes heartFloat { 0%{transform:translateY(0) translateX(0) scale(1);opacity:1} 50%{transform:translateY(-150px) translateX(var(--drift, 5px)) scale(1.1);opacity:0.6} 100%{transform:translateY(-300px) translateX(calc(var(--drift, 5px) * -1)) scale(0.8);opacity:0} } @keyframes blockPlace { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.06);opacity:1} 100%{transform:scale(1);opacity:1} } @keyframes blockRemove { 0%{transform:scale(1);opacity:1} 100%{transform:scale(0.6);opacity:0} } @keyframes confettiFall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1} 25%{transform:translateY(75px) translateX(calc(var(--drift, 10px) * 0.5)) rotate(180deg);opacity:0.8} 50%{transform:translateY(150px) translateX(var(--drift, 10px)) rotate(360deg);opacity:0.6} 100%{transform:translateY(calc(100% + 300px)) translateX(calc(var(--drift, 10px) * -0.3)) rotate(720deg);opacity:0} } @keyframes glitchScan { 0%{background-position:0 -100%} 100%{background-position:0 300%} } @keyframes glitchBorder { 0%{box-shadow:inset 3px 0 0 rgba(255,0,64,0.25),inset -3px 0 0 rgba(0,255,221,0.25),inset 0 2px 0 rgba(255,0,255,0.15),inset 0 -2px 0 rgba(0,255,64,0.15)} 33%{box-shadow:inset -4px 0 0 rgba(255,0,64,0.35),inset 4px 0 0 rgba(0,255,221,0.3),inset 0 -2px 0 rgba(255,0,255,0.2),inset 0 2px 0 rgba(0,255,64,0.1)} 66%{box-shadow:inset 2px 0 0 rgba(0,255,221,0.2),inset -2px 0 0 rgba(255,0,64,0.3),inset 0 3px 0 rgba(255,0,255,0.15),inset 0 -1px 0 rgba(0,255,64,0.2)} 100%{box-shadow:inset 3px 0 0 rgba(255,0,64,0.25),inset -3px 0 0 rgba(0,255,221,0.25),inset 0 2px 0 rgba(255,0,255,0.15),inset 0 -2px 0 rgba(0,255,64,0.15)} } @keyframes glitchFlicker { 0%{opacity:0.08} 50%{opacity:0} } @keyframes glitchDisplace { 0%,92%{transform:translateX(0)} 93%{transform:translateX(-3px)} 94%{transform:translateX(4px)} 95%{transform:translateX(-2px)} 96%,100%{transform:translateX(0)} } @keyframes glitchBar { 0%,80%{opacity:0.6;transform:translateX(0)} 82%{opacity:1;transform:translateX(6px)} 84%{opacity:0.8;transform:translateX(-4px)} 86%{opacity:1;transform:translateX(3px)} 88%,100%{opacity:0.6;transform:translateX(0)} } @keyframes enigmaRotor { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} } @keyframes enigmaBgDrift { 0%{transform:translate(0%,0%) rotate(0deg)} 33%{transform:translate(5%,-3%) rotate(1deg)} 66%{transform:translate(-3%,5%) rotate(-1deg)} 100%{transform:translate(2%,2%) rotate(0.5deg)} } @keyframes enigmaWireDrift { 0%{transform:translate(0%,0%) scale(1)} 50%{transform:translate(3%,-2%) scale(1.02)} 100%{transform:translate(-2%,3%) scale(0.98)} } @keyframes enigmaGlow { 0%,100%{box-shadow:inset 0 0 20px rgba(201,168,76,0.04),inset 0 0 60px rgba(140,107,30,0.02)} 50%{box-shadow:inset 0 0 30px rgba(201,168,76,0.08),inset 0 0 80px rgba(140,107,30,0.04)} } @keyframes enigmaDecrypt { 0%{transform:rotateY(0deg) scale(1);opacity:0.4;filter:brightness(0.5)} 25%{transform:rotateY(90deg) scale(0.9);opacity:0.6;filter:brightness(0.7)} 50%{transform:rotateY(180deg) scale(0.95);opacity:0.8;filter:brightness(1.3)} 75%{transform:rotateY(270deg) scale(1.02);filter:brightness(1.1)} 100%{transform:rotateY(360deg) scale(1);opacity:1;filter:brightness(1)} } @keyframes coopPulse { 0%,100%{opacity:0.6} 50%{opacity:1} } @keyframes notificationPulse { 0%,100%{box-shadow:0 0 16px rgba(84,160,255,0.6),0 0 32px rgba(84,160,255,0.3)} 50%{box-shadow:0 0 24px rgba(84,160,255,0.8),0 0 48px rgba(84,160,255,0.5)} } @keyframes notificationMenuGlow { 0%,100%{box-shadow:0 0 20px rgba(84,160,255,0.4),inset 0 0 20px rgba(84,160,255,0.15)} 50%{box-shadow:0 0 30px rgba(84,160,255,0.6),inset 0 0 30px rgba(84,160,255,0.25)} } @keyframes subtleGlowPulse { 0%,100%{opacity:0.85} 50%{opacity:1} } @keyframes coopReactionFloat { 0%{transform:translateY(0) scale(0.5);opacity:0} 8%{transform:translateY(-5vh) scale(1.1);opacity:1} 15%{transform:translateY(-10vh) scale(1)} 70%{opacity:1} 100%{transform:translateY(-85vh) scale(1.2);opacity:0} }`}</style>

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
                  fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700,
                  color: tc, letterSpacing: 1.5, textTransform: "uppercase",
                  marginBottom: 3,
                }}>Achievement unlocked</div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                  color: C.text, letterSpacing: 0.5,
                }}>{achievementToast.label}</div>
                <div style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textDim,
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
                fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700,
                color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2,
              }}>Theme unlocked</div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
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
                color: C.bg, cursor: "pointer", fontFamily: "'Inter', sans-serif",
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


      {/* Partner lock-in toast notification */}
      {coopPartnerLockToast && (
        <div style={{
          position: "fixed",
          top: "calc(60px + env(safe-area-inset-top, 0px))",
          left: "50%", transform: "translateX(-50%)", zIndex: 25,
          backgroundColor: "#54A0FF", borderRadius: 10,
          padding: "8px 16px", boxShadow: "0 4px 16px rgba(84,160,255,0.4)",
          fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
          color: "#fff", textAlign: "center",
          animation: "fadeUp 0.3s ease both",
          pointerEvents: "none",
        }}>
          {coopPartnerLockToast}
        </div>
      )}

      {/* Info row: now the top element of the play view */}
      <div ref={infoRowRef} style={{
        flexShrink: 0, zIndex: 10,
        backgroundColor: activeTheme.gridBg || C.surface,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 8, paddingLeft: 16, paddingRight: 16, boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: gridTotalWidth }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: gameState === "won" ? C.correct : gameState === "lost" ? C.incorrect : C.text, letterSpacing: 2 }}>
            {formatTime(elapsedTime)}
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: isBlind ? "#e06040" : C.textDim, letterSpacing: 1, textTransform: "uppercase" }}>
              {isCoop ? "Co-op " : isCoopMosaic ? "Co-op " : ""}{diffLabel}{isDaily && currentDailyDate ? ` ${currentDailyDate}` : ""}{isCascade && cascadeLevelLabel ? ` ${cascadeLevelLabel}` : ""}{" "}
            </span>
            {!isDaily && !isCascade && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 2 }}>
                #{currentPuzzle + 1}
              </span>
            )}
          </div>
          {!isCoopMosaic && <AttemptDots max={isCoop ? 5 : maxAttempts} used={attempts} won={gameState === "won"} />}
        </div>
        {/* Coop status bar */}
        {isCoop && (() => {
          const otherEntries = Object.entries(coopPlayers);
          const isSinglePartner = otherEntries.length === 1;
          const isMultiPartner = otherEntries.length > 1;
          return (
            <div style={{ marginTop: 6, width: "100%", maxWidth: gridTotalWidth, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                {/* You indicator */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 0.5,
                  color: coopMyLockedIn ? C.correct : COOP_MY_COLOR,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    backgroundColor: coopMyLockedIn ? C.correct : COOP_MY_COLOR,
                    display: "inline-block",
                  }} />
                  YOU {coopMyLockedIn ? "\u2713" : ""}
                </div>
                <div style={{ width: 1, height: 10, backgroundColor: C.border }} />
                {/* Single partner: show their name + color */}
                {isSinglePartner && (() => {
                  const [uid, p] = otherEntries[0];
                  const color = coopPlayerColorMap[uid] || "#FF9FF3";
                  const isLocked = !!p.lockedIn;
                  const isCorrect = !!p.correct;
                  return (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 0.5,
                      color: !coopPartnerConnected ? C.textDim : isLocked ? (isCorrect ? C.correct : C.incorrect) : color,
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        backgroundColor: !coopPartnerConnected ? C.textDim : isLocked ? (isCorrect ? C.correct : C.incorrect) : color,
                        display: "inline-block",
                        animation: !coopPartnerConnected ? "pulse 2s infinite" : "none",
                      }} />
                      {(p.username || "PARTNER").toUpperCase()} {!coopPartnerConnected ? "..." : isLocked ? "\u2713" : ""}
                    </div>
                  );
                })()}
                {/* Multiple partners: show "N FRIENDS" button */}
                {isMultiPartner && (
                  <button
                    onClick={() => setCoopPlayersExpanded(!coopPlayersExpanded)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 0.5,
                      color: coopPartnerLockedIn ? (coopPartnerCorrect ? C.correct : C.incorrect) : C.text,
                      background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                      padding: "2px 8px", cursor: "pointer",
                    }}
                  >
                    {/* Stacked color dots */}
                    <span style={{ display: "flex", marginRight: 2 }}>
                      {otherEntries.slice(0, 3).map(([uid], i) => (
                        <span key={uid} style={{
                          width: 7, height: 7, borderRadius: "50%",
                          backgroundColor: coopPlayerColorMap[uid] || "#FF9FF3",
                          display: "inline-block",
                          marginLeft: i > 0 ? -3 : 0,
                          border: `1px solid ${C.bg}`,
                        }} />
                      ))}
                    </span>
                    {otherEntries.length} FRIENDS {coopPartnerLockedIn ? "\u2713" : ""}
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d={coopPlayersExpanded ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"} />
                    </svg>
                  </button>
                )}
                {/* No partners yet */}
                {otherEntries.length === 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 0.5,
                    color: C.textDim,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      backgroundColor: C.textDim, display: "inline-block",
                      animation: "pulse 2s infinite",
                    }} />
                    PARTNER ...
                  </div>
                )}
              </div>
              {/* Expanded player list */}
              {coopPlayersExpanded && isMultiPartner && (
                <div style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  marginTop: 4, padding: "8px 12px", zIndex: 30, minWidth: 140,
                  backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  display: "flex", flexDirection: "column", gap: 4,
                  animation: "fadeUp 0.2s ease both",
                }}>
                  {otherEntries.map(([uid, p]) => {
                    const color = coopPlayerColorMap[uid] || "#FF9FF3";
                    const isLocked = !!p.lockedIn;
                    const isCorrect = !!p.correct;
                    return (
                      <div key={uid} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 0.5,
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          backgroundColor: isLocked ? (isCorrect ? C.correct : C.incorrect) : color,
                          display: "inline-block", flexShrink: 0,
                        }} />
                        <span style={{
                          color: isLocked ? (isCorrect ? C.correct : C.incorrect) : color,
                          fontWeight: 600,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {(p.username || "Player").toUpperCase()}
                        </span>
                        {isLocked && <span style={{ color: isCorrect ? C.correct : C.incorrect }}>{"\u2713"}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Coop waiting overlay - when partner hasn't joined yet */}
      {isCoop && !coopPartnerConnected && coopStatus === "waiting" && (
        <div style={{
          position: "fixed", top: "calc(100px + env(safe-area-inset-top, 0px))", left: "50%",
          transform: "translateX(-50%)", zIndex: 20,
          backgroundColor: C.surface, border: `1px solid #54A0FF44`, borderRadius: 12,
          padding: "12px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.text,
          textAlign: "center", animation: "fadeUp 0.3s ease both",
        }}>
          <div style={{ marginBottom: 4, fontWeight: 700, color: "#54A0FF" }}>Waiting for partner</div>
          <div style={{ fontSize: 10, color: C.textDim }}>Invite a friend or share a link to start</div>
          <button
            onClick={() => { setCoopSelectedFriends(new Set()); setRadialMenuStack(["root", "coop-start"]); }}
            style={{
              marginTop: 8, backgroundColor: "#54A0FF", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              fontFamily: "'Inter', sans-serif", letterSpacing: 1, cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Invite
          </button>
        </div>
      )}

      {/* Grid area: flex child between header/info and footer, centered */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: activeTheme.gridBg || C.surface, boxSizing: "border-box", padding: edgePad }}>
        <GridDecoration decoration={activeTheme.decoration} />
        {/* Coop mosaic players indicator — positioned top-left of puzzle panel */}
        {isCoopMosaic && coopMosaicAnyConnected && gameState === "playing" && (
          <div
            onClick={() => {
              const anyOnOtherTile = Object.values(coopMosaicPlayers).some(p => p.currentTile != null && p.currentTile >= 0 && p.currentTile !== currentPuzzle);
              if (anyOnOtherTile) setShowCoopMosaicNavigate(true);
            }}
            style={{
              position: "absolute", top: 8, left: 12, zIndex: 10,
              display: "flex", flexDirection: "column", gap: 3,
              padding: "4px 10px", borderRadius: 8,
              backgroundColor: C.coop + "18", border: `1px solid ${C.coop}44`,
              fontSize: 10, fontFamily: "'Inter', sans-serif",
              cursor: "pointer", transition: "all 0.15s", maxWidth: 160,
            }}
          >
            {Object.entries(coopMosaicPlayers).slice(0, 4).map(([uid, p]) => {
              const pic = coopMosaicPlayerPics[uid];
              const initial = (p.username || "P")[0].toUpperCase();
              const isOnline = p.currentTile != null;
              return (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {pic ? (
                    <img src={pic} alt="" style={{
                      width: 14, height: 14, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                      border: `1.5px solid ${isOnline ? C.coop : C.textDim}`,
                      animation: isOnline ? "coopPulse 2s ease-in-out infinite" : "none",
                    }} />
                  ) : (
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: isOnline ? C.coop : C.textDim,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 700, color: "#fff", lineHeight: 1,
                      animation: isOnline ? "coopPulse 2s ease-in-out infinite" : "none",
                    }}>{initial}</div>
                  )}
                  <span style={{ color: C.coop, fontWeight: 700, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.username || "Player"}
                  </span>
                  {p.currentTile != null && p.currentTile >= 0 && p.currentTile === currentPuzzle
                    ? <span style={{ color: C.correct, fontSize: 8 }}>here</span>
                    : p.currentTile != null && p.currentTile >= 0
                      ? <span style={{ color: C.textDim, fontSize: 8 }}>tile {p.currentTile + 1}</span>
                      : <span style={{ color: C.textDim, fontSize: 8 }}>overview</span>
                  }
                </div>
              );
            })}
            {Object.keys(coopMosaicPlayers).length > 4 && (
              <span style={{ color: C.textDim, fontSize: 8 }}>+{Object.keys(coopMosaicPlayers).length - 4} more</span>
            )}
          </div>
        )}
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
                // In coop mosaic mode, show partner fills for any blank cell (no splitting)
                const mosaicPartnerFill = isCoopMosaic && isBlankCell ? coopMosaicOtherFills[key] : null;
                const myFill = fills[key];
                const effectiveFill = isBlankCell ? (isLockedCell ? token : (myFill || partnerFill || mosaicPartnerFill)) : null;
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
                // Per-player color: blue for self, unique neon for each other player
                const cellOwnerUid = isCoop && isBlankCell ? coopCellOwnerMap[key] : null;
                const cellOwnerColor = cellOwnerUid
                  ? (cellOwnerUid === firebaseUser?.uid ? COOP_MY_COLOR : (coopPlayerColorMap[cellOwnerUid] || "#FF9FF3"))
                  : null;
                // Subtle background tint for unfilled blank cells (12% opacity)
                const coopBgTint = isCoop && isBlankCell && cellOwnerColor
                  ? (cellOwnerColor + "1F")  // ~12% opacity hex suffix
                  : undefined;
                // Mosaic coop: show if cell was filled by partner (not by me)
                const isMosaicCoopPartnerFill = isCoopMosaic && isBlankCell && !myFill && !!mosaicPartnerFill;
                return (
                  <div key={key} style={{ position: "relative" }}>
                    <Cell token={displayToken} isBlank={isBlankCell}
                      isSelected={selectedCell === key}
                      isFilled={!!(myFill || partnerFill || mosaicPartnerFill) || isLockedCell}
                      isCorrect={isWon && isBlankCell}
                      isWrong={isWrongCell}
                      isRevealed={isRevealed}
                      isLocked={isLockedCell && gameState === "playing"}
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
                      coopOwnerColor={coopBgTint}
                      coopBorderColor={isCoop && isBlankCell && isCoopMine ? (COOP_MY_COLOR + "66") : undefined}
                    />
                    {/* Coop ownership indicator — per-player colored badge */}
                    {isCoop && isBlankCell && gameState === "playing" && !isWon && (() => {
                      const isMe = isCoopMine;
                      const ownerUid = coopCellOwnerMap[key];
                      const ownerPlayer = ownerUid && ownerUid !== firebaseUser?.uid ? coopPlayers[ownerUid] : null;
                      const letter = isMe
                        ? (username || "Y")[0].toUpperCase()
                        : (ownerPlayer?.username || "P")[0].toUpperCase();
                      const bgColor = cellOwnerColor || "#FF9FF3";
                      return (
                        <div style={{
                          position: "absolute", top: 1, right: 1,
                          width: 12, height: 12, borderRadius: "50%",
                          backgroundColor: bgColor, opacity: 0.85, pointerEvents: "none",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 7, fontWeight: 700, color: "#fff", lineHeight: 1,
                        }}>{letter}</div>
                      );
                    })()}
                    {/* Incoming pass request glow indicator */}
                    {coopIncomingPass && coopIncomingPass.cellKey === key && gameState === "playing" && (
                      <div style={{
                        position: "absolute", inset: -2, borderRadius: 14, pointerEvents: "none",
                        border: `2px solid ${coopIncomingPass.fromColor}`,
                        boxShadow: `0 0 12px ${coopIncomingPass.fromColor}66, inset 0 0 8px ${coopIncomingPass.fromColor}22`,
                        animation: "pulse 1.5s infinite",
                        zIndex: 2,
                      }} />
                    )}
                    {/* Pending outgoing pass indicator */}
                    {coopPendingPassCell === key && gameState === "playing" && (
                      <div style={{
                        position: "absolute", inset: -2, borderRadius: 14, pointerEvents: "none",
                        border: `2px dashed ${COOP_MY_COLOR}88`,
                        animation: "pulse 2s infinite",
                        zIndex: 2,
                      }} />
                    )}
                    {/* Cell suggestion indicator — shown to both sender and receiver */}
                    {gameState === "playing" && coopAllSuggestions.length > 0 && (() => {
                      const sug = coopAllSuggestions.find(s => s.cellKey === key);
                      if (!sug) return null;
                      const { color: sugColor, shapeIndex: sugShapeIdx } = parseToken(sug.suggestedToken);
                      const sugDisplayColor = themeColorMap ? (themeColorMap[sugColor] || sugColor) : sugColor;
                      const shapes = themedShapes || SHAPES;
                      const borderColor = sug.isMine ? COOP_MY_COLOR : sug.fromColor;
                      return (
                        <>
                          <div style={{
                            position: "absolute", inset: -2, borderRadius: 14, pointerEvents: "none",
                            border: `2px solid ${borderColor}88`,
                            zIndex: 2,
                          }} />
                          <div style={{
                            position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)",
                            width: 16, height: 16, borderRadius: 4,
                            backgroundColor: sugDisplayColor,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 0 6px ${sugDisplayColor}88`,
                            zIndex: 3, pointerEvents: "none",
                            border: `1.5px solid ${borderColor}`,
                          }}>
                            {shapes[sugShapeIdx % shapes.length](9, getShapeStroke(sugDisplayColor, puzzle?.mode === "easy" || puzzle?.mode === "blind"))}
                          </div>
                        </>
                      );
                    })()}
                    {/* Suggest mode: highlight selected cell for suggestion */}
                    {coopSuggestCell === key && gameState === "playing" && (
                      <div style={{
                        position: "absolute", inset: -2, borderRadius: 14, pointerEvents: "none",
                        border: `2px solid #E040FB`,
                        boxShadow: `0 0 16px #E040FBAA`,
                        zIndex: 2,
                      }} />
                    )}
                    {/* Mosaic coop: partner fill indicator — initial letter */}
                    {isMosaicCoopPartnerFill && gameState === "playing" && !isWon && (() => {
                      // Find which player filled this cell (use first other player for simplicity)
                      const firstPlayer = Object.entries(coopMosaicPlayers)[0];
                      const uid = firstPlayer?.[0];
                      const pName = firstPlayer?.[1]?.username;
                      const pic = uid ? coopMosaicPlayerPics[uid] : null;
                      const initial = (pName || "P")[0].toUpperCase();
                      return pic ? (
                        <img src={pic} alt="" style={{
                          position: "absolute", top: 1, right: 1,
                          width: 12, height: 12, borderRadius: "50%", objectFit: "cover",
                          border: `1px solid ${C.coop}`, opacity: 0.85, pointerEvents: "none",
                        }} />
                      ) : (
                        <div style={{
                          position: "absolute", top: 1, right: 1,
                          width: 12, height: 12, borderRadius: "50%",
                          backgroundColor: C.coop, opacity: 0.85, pointerEvents: "none",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 7, fontWeight: 700, color: "#fff", lineHeight: 1,
                        }}>{initial}</div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>
      {/* Puzzle complete overlay — blurry area on top of finished grid */}
      {gameState === "won" && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          backgroundColor: (C.surface || C.bg) + "BB",
          zIndex: 5,
          animation: "fadeUp 0.5s ease both",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8, animation: "fadeUp 0.4s ease" }}>
            {isCoop ? "🎉" : isCascade ? "🎉" : isBlind ? "🎉" : isSpin ? "🎉" : isMosaic ? "🎉" : (attempts === 0 ? "⭐" : attempts === 1 ? "🌟" : attempts === 2 ? "✨" : attempts === 3 ? "👍" : "✅")}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: C.textDim, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, animation: "fadeUp 0.45s ease both" }}>
            Puzzle Complete
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.correct, animation: "fadeUp 0.5s 0.05s ease both" }}>
            {isCoop ? "Co-op complete!" : isCascade ? "Cascade complete!" : isBlind ? "Cracked it!" : isSpin ? "Nailed it!" : isMosaic ? "Tile complete!" : (attempts <= 1 ? "Perfect!" : attempts === 2 ? "Brilliant!" : attempts === 3 ? "Great!" : attempts === 4 ? "Not bad!" : "Solved!")}
          </div>
          {isCoop && (
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 6, animation: "fadeUp 0.55s 0.1s ease both" }}>
              Session complete — well played!
            </div>
          )}
          {/* Global ranking display */}
          {puzzleRanking && !isCoop && !isCascade && !isMosaic && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px",
              borderRadius: 10, backgroundColor: C.surface, border: `1px solid ${C.border}`,
              marginTop: 16, animation: "fadeUp 0.5s 0.15s ease both", pointerEvents: "auto",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={puzzleRanking.rank <= 3 ? C.gold : C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              <span style={{
                fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                color: puzzleRanking.rank <= 3 ? C.gold : C.text,
              }}>
                {puzzleRanking.rank}/{puzzleRanking.total}
              </span>
              <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>
                {puzzleRanking.rank === 1 ? "1st place!" : puzzleRanking.rank === 2 ? "2nd place" : puzzleRanking.rank === 3 ? "3rd place" : "rank"}
              </span>
            </div>
          )}
          {puzzleRankingLoading && !isCoop && !isCascade && !isMosaic && (
            <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 16, animation: "fadeUp 0.5s 0.15s ease both" }}>
              Loading ranking...
            </div>
          )}
          {/* Friends who completed this puzzle */}
          {Object.keys(friendsPuzzleData).length > 0 && !isCoop && !isCascade && !isMosaic && (
            <div style={{
              marginTop: 12, animation: "fadeUp 0.5s 0.2s ease both", pointerEvents: "auto",
            }}>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8, textAlign: "center" }}>
                Friends on this puzzle
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {Object.entries(friendsPuzzleData).map(([uid, data]) => {
                  const friend = friendsList.find(f => f.uid === uid);
                  if (!friend) return null;
                  const theyWereFaster = data.time && elapsedTime && data.time < elapsedTime;
                  const iWasFaster = data.time && elapsedTime && elapsedTime < data.time;
                  return (
                    <div key={uid} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                      borderRadius: 8, backgroundColor: C.surface,
                      border: `1px solid ${theyWereFaster ? C.incorrect + "33" : iWasFaster ? C.correct + "33" : C.border}`,
                      fontSize: 11, fontFamily: "'Inter', sans-serif",
                    }}>
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: C.accent + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.accent, fontWeight: 700 }}>
                          {(friend.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span style={{ color: C.text, fontWeight: 700 }}>{friend.username}</span>
                      <span style={{ color: C.textDim }}>{formatTime(data.time)}</span>
                      {theyWereFaster && <span style={{ color: C.incorrect, fontSize: 9 }}>faster</span>}
                      {iWasFaster && <span style={{ color: C.correct, fontSize: 9 }}>slower</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Puzzle failed overlay — blurry area on top of failed grid */}
      {gameState === "lost" && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          backgroundColor: (C.surface || C.bg) + "BB",
          zIndex: 5,
          animation: "fadeUp 0.5s ease both",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8, animation: "fadeUp 0.4s ease" }}>❌</div>
          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: C.textDim, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, animation: "fadeUp 0.45s ease both" }}>
            Puzzle Failed
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.incorrect, animation: "fadeUp 0.5s 0.05s ease both" }}>
            {isCoop ? "Co-op failed" : isCascade ? "Run over" : "Not this time"}
          </div>
          {(isCoop || isCascade || !isCoop) && (
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'Inter', sans-serif", marginTop: 6, animation: "fadeUp 0.55s 0.1s ease both" }}>
              {isCoop ? "Out of attempts" : isCascade ? `Reached ${puzzle?.gridSize ?? 0}×${puzzle?.gridSize ?? 0}` : "Better luck next time"}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Fixed bottom bar: coop UI + game state info */}
      <div ref={footerRef} style={{ flexShrink: 0, zIndex: 10, backgroundColor: activeTheme.gridBg || C.surface, paddingTop: 10, paddingBottom: gameState === "playing" && puzzle ? `calc(148px + env(safe-area-inset-bottom, 0px))` : `calc(80px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      </div>

      {/* Token picker — Liquid Glass pill above the menu pill */}
      {gameState === "playing" && puzzle && (
        <div style={{
          position: "fixed",
          bottom: `calc(100px + env(safe-area-inset-bottom, 0px))`,
          left: "50%",
          transform: "translateX(-50%)",
          borderRadius: 9999,
          background: activeTheme.gridBg || C.surface,
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "none",
          zIndex: 85,
          padding: "6px 4px",
          maxWidth: "calc(100vw - 40px)",
          overflow: "hidden",
        }}>
          <TokenPicker tokens={puzzle.usedTokens} selectedToken={selectedToken} onSelect={handleTokenSelect} cellSize={pickerSize} mode={puzzle.mode} remaining={tokenRemaining} colorMap={themeColorMap} shapesArr={themedShapes} themeId={activeThemeId}
          />
        </div>
      )}
      {/* Floating coop reactions overlay */}
      {coopFloatingReactions.length > 0 && (
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999,
          overflow: "hidden",
        }}>
          {coopFloatingReactions.map(r => (
            <div key={r.id} style={{
              position: "absolute",
              left: `${r.x}%`,
              bottom: 60,
              animation: "coopReactionFloat 3s ease-out forwards",
              display: "flex", flexDirection: "column", alignItems: "center",
              transform: "translateX(-50%)",
            }}>
              {r.type === "text" ? (
                <span style={{
                  fontSize: 20, fontWeight: 800, fontFamily: "'Inter', sans-serif",
                  color: "#fff", lineHeight: 1,
                  textShadow: `0 0 12px ${r.fromColor}88, 0 2px 8px rgba(0,0,0,0.7)`,
                  letterSpacing: 1,
                }}>{r.emoji}</span>
              ) : r.type === "pattern" ? (
                <span style={{
                  fontSize: 56, lineHeight: 1, color: r.fromColor,
                  filter: `drop-shadow(0 0 10px ${r.fromColor}88) drop-shadow(0 2px 6px rgba(0,0,0,0.5))`,
                }}>{r.emoji}</span>
              ) : (
                <span style={{ fontSize: 48, lineHeight: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}>{r.emoji}</span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, color: r.fromColor,
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                whiteSpace: "nowrap", marginTop: 2,
              }}>{r.fromName}</span>
            </div>
          ))}
        </div>
      )}
      {renderBackButton(playBackAction)}
      {renderContextButton("play", playPillButtons)}
      {globalModalsEl}
    </div>
  );
}
