// --- Vault Mode Firebase Functions ---
// Handles all vault session CRUD, chat, lock proposals, turns, and real-time sync.

import {
  getDatabase,
  ref,
  get,
  set,
  push,
  remove,
  update,
  serverTimestamp,
  onValue,
  off,
} from "firebase/database";

function getDb() {
  try { return getDatabase(); } catch { return null; }
}

// ============================================================
// Session ID Generation
// ============================================================
export function generateVaultSessionId() {
  const db = getDb();
  if (!db) return null;
  return push(ref(db, "coopVaultSessions")).key;
}

// ============================================================
// Session CRUD
// ============================================================
export async function createVaultSession(uid, {
  difficulty, puzzleSeed, combination, palette, startingUnlocked, gridLayout, maxAttempts,
  hostUsername, hostTheme,
}, existingSessionId) {
  const db = getDb();
  if (!db) return null;
  const id = existingSessionId || push(ref(db, "coopVaultSessions")).key;
  const sessionRef = ref(db, `coopVaultSessions/${id}`);
  await set(sessionRef, {
    id,
    hostUid: uid,
    difficulty: difficulty || "silver",
    puzzleSeed,
    combination,
    palette,
    gridLayout: gridLayout || 4,
    maxAttempts: maxAttempts || 4,
    status: "waiting",
    // Lock state
    lock: { 0: null, 1: null, 2: null, 3: null },
    lockAttempts: 0,
    lockFeedback: [],
    // Puzzle state
    tileProgress: {},
    tileTimes: {},
    tileUnlocked: startingUnlocked || {},
    fills: {},
    // Turn system
    currentTurn: uid,
    turnHistory: [],
    // Lock proposals
    lockProposals: {},
    // Pins
    pins: {},
    // Chat
    chat: {},
    // Players
    players: {
      [uid]: {
        username: hostUsername || null,
        currentTile: -1,
        theme: hostTheme ?? "classic",
        joinedAt: Date.now(),
      },
    },
    invitedUids: {},
    reactions: {},
    createdAt: serverTimestamp(),
  });
  await set(ref(db, `userCoopSessions/${uid}/${id}`), { createdAt: serverTimestamp(), role: "host", type: "vault" });
  return id;
}

export async function joinVaultSession(sessionId, uid, playerUsername) {
  const db = getDb();
  if (!db) return null;
  const sessionRef = ref(db, `coopVaultSessions/${sessionId}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) return null;
  const data = snap.val();
  if (data.players && data.players[uid]) return data;
  await update(ref(db, `coopVaultSessions/${sessionId}/players/${uid}`), {
    username: playerUsername || null,
    currentTile: -1,
    joinedAt: Date.now(),
  });
  const playerCount = Object.keys(data.players || {}).length + 1;
  if (playerCount >= 2 && data.status === "waiting") {
    await update(sessionRef, { status: "playing" });
  }
  await set(ref(db, `userCoopSessions/${uid}/${sessionId}`), { createdAt: serverTimestamp(), role: "guest", type: "vault" });
  const updated = await get(sessionRef);
  return updated.val();
}

export async function loadVaultSession(sessionId) {
  const db = getDb();
  if (!db) return null;
  const snap = await get(ref(db, `coopVaultSessions/${sessionId}`));
  return snap.exists() ? snap.val() : null;
}

// ============================================================
// Real-time Subscription
// ============================================================
export function subscribeToVaultSession(sessionId, callback) {
  const db = getDb();
  if (!db) return () => {};
  const sessionRef = ref(db, `coopVaultSessions/${sessionId}`);
  const handler = onValue(sessionRef, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return () => off(sessionRef, "value", handler);
}

// ============================================================
// Fill Operations
// ============================================================
export async function updateVaultFill(sessionId, fillKey, token) {
  const db = getDb();
  if (!db) return;
  if (token === null || token === undefined) {
    await remove(ref(db, `coopVaultSessions/${sessionId}/fills/${fillKey}`));
  } else {
    await set(ref(db, `coopVaultSessions/${sessionId}/fills/${fillKey}`), token);
  }
}

export async function clearVaultTileFills(sessionId, tileIndex) {
  const db = getDb();
  if (!db) return;
  const fillsSnap = await get(ref(db, `coopVaultSessions/${sessionId}/fills`));
  if (!fillsSnap.exists()) return;
  const fills = fillsSnap.val();
  const prefix = `${tileIndex}_`;
  const updates = {};
  for (const key of Object.keys(fills)) {
    if (key.startsWith(prefix)) updates[`fills/${key}`] = null;
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db, `coopVaultSessions/${sessionId}`), updates);
  }
}

// ============================================================
// Tile Progress & Unlock
// ============================================================
export async function updateVaultTileProgress(sessionId, tileIndex, attempts, time) {
  const db = getDb();
  if (!db) return;
  const updates = {};
  updates[`tileProgress/${tileIndex}`] = attempts;
  if (time != null) updates[`tileTimes/${tileIndex}`] = time;
  await update(ref(db, `coopVaultSessions/${sessionId}`), updates);
}

export async function updateVaultCurrentTile(sessionId, uid, tileIndex) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/players/${uid}/currentTile`), tileIndex);
}

export async function updateVaultTileUnlocked(sessionId, unlockedMap) {
  const db = getDb();
  if (!db) return;
  await update(ref(db, `coopVaultSessions/${sessionId}/tileUnlocked`), unlockedMap);
}

// ============================================================
// Turn System
// ============================================================
export async function advanceVaultTurn(sessionId, nextUid) {
  const db = getDb();
  if (!db) return;
  await update(ref(db, `coopVaultSessions/${sessionId}`), { currentTurn: nextUid });
}

export async function addVaultTurnHistory(sessionId, entry) {
  const db = getDb();
  if (!db) return;
  const histRef = ref(db, `coopVaultSessions/${sessionId}/turnHistory`);
  const snap = await get(histRef);
  const history = snap.exists() ? snap.val() : [];
  const arr = Array.isArray(history) ? history : Object.values(history);
  arr.push(entry);
  await set(histRef, arr);
}

// ============================================================
// Lock Proposals
// ============================================================
export async function proposeLockPosition(sessionId, uid, position, token, username) {
  const db = getDb();
  if (!db) return null;
  const proposalRef = push(ref(db, `coopVaultSessions/${sessionId}/lockProposals`));
  const proposal = {
    id: proposalRef.key,
    fromUid: uid,
    fromUsername: username || null,
    position,
    token,
    status: "pending",
    counterToken: null,
    counterByUid: null,
    counterByUsername: null,
    reactions: {},
    timestamp: Date.now(),
  };
  await set(proposalRef, proposal);
  return proposalRef.key;
}

export async function respondToLockProposal(sessionId, proposalId, action, { uid, username, counterToken } = {}) {
  const db = getDb();
  if (!db) return;
  const proposalRef = ref(db, `coopVaultSessions/${sessionId}/lockProposals/${proposalId}`);
  if (action === "approve") {
    // Read the proposal to get position + token
    const snap = await get(proposalRef);
    if (!snap.exists()) return;
    const proposal = snap.val();
    const effectiveToken = proposal.counterToken || proposal.token;
    // Set the lock position
    await update(ref(db, `coopVaultSessions/${sessionId}/lock/${proposal.position}`), {
      token: effectiveToken,
      confirmedBy: { [proposal.fromUid]: true, [uid]: true },
    });
    await update(proposalRef, { status: "approved" });
  } else if (action === "counter") {
    await update(proposalRef, {
      status: "countered",
      counterToken,
      counterByUid: uid,
      counterByUsername: username || null,
    });
  } else if (action === "reject") {
    await update(proposalRef, { status: "rejected" });
  }
}

export async function reactToLockProposal(sessionId, proposalId, uid, emoji) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/lockProposals/${proposalId}/reactions/${uid}`), emoji);
}

// Approve a counter-proposal (original proposer accepts the counter)
export async function approveCounterProposal(sessionId, proposalId, uid) {
  const db = getDb();
  if (!db) return;
  const proposalRef = ref(db, `coopVaultSessions/${sessionId}/lockProposals/${proposalId}`);
  const snap = await get(proposalRef);
  if (!snap.exists()) return;
  const proposal = snap.val();
  const effectiveToken = proposal.counterToken || proposal.token;
  await update(ref(db, `coopVaultSessions/${sessionId}/lock/${proposal.position}`), {
    token: effectiveToken,
    confirmedBy: { [proposal.fromUid]: true, [proposal.counterByUid]: true },
  });
  await update(proposalRef, { status: "approved" });
}

// ============================================================
// Lock Submission
// ============================================================
export async function submitVaultLock(sessionId, guess, feedback) {
  const db = getDb();
  if (!db) return;
  const snap = await get(ref(db, `coopVaultSessions/${sessionId}`));
  if (!snap.exists()) return;
  const data = snap.val();
  const feedbackArr = Array.isArray(data.lockFeedback) ? [...data.lockFeedback] : [];
  feedbackArr.push({ guess, ...feedback, timestamp: Date.now() });
  const updates = {
    lockAttempts: (data.lockAttempts || 0) + 1,
    lockFeedback: feedbackArr,
  };
  // Check if solved
  if (feedback.gold === 4) {
    updates.status = "complete";
  }
  await update(ref(db, `coopVaultSessions/${sessionId}`), updates);
}

// Clear a lock position (both players must re-agree)
export async function clearLockPosition(sessionId, position) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/lock/${position}`), null);
}

// Hard-lock a position (confirmed correct via gold pip)
export async function lockVaultPosition(sessionId, position, token) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/lock/${position}`), { token, confirmedBy: "mastermind" });
}

// Clear all player guesses for a position
export async function clearAllGuessesForPosition(sessionId, position) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/lockGuesses/${position}`), null);
}

// Submit a per-player guess for a lock position
export async function submitVaultGuess(sessionId, uid, position, token) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/lockGuesses/${position}/${uid}`), token);
}

// Clear a per-player guess for a lock position
export async function clearVaultGuess(sessionId, uid, position) {
  const db = getDb();
  if (!db) return;
  await remove(ref(db, `coopVaultSessions/${sessionId}/lockGuesses/${position}/${uid}`));
}

// Record a puzzle strike (failed puzzle) — returns new strike count
export async function addVaultStrike(sessionId, uid, tileIdx) {
  const db = getDb();
  if (!db) return 0;
  const snap = await get(ref(db, `coopVaultSessions/${sessionId}/strikes`));
  const strikes = snap.exists() ? (typeof snap.val() === "number" ? snap.val() : 0) : 0;
  const newStrikes = strikes + 1;
  await update(ref(db, `coopVaultSessions/${sessionId}`), {
    strikes: newStrikes,
    lastStrike: { uid, tileIdx, timestamp: Date.now() },
  });
  if (newStrikes >= 3) {
    await update(ref(db, `coopVaultSessions/${sessionId}`), { status: "failed" });
  }
  return newStrikes;
}

// Kick a player from the vault session
export async function kickVaultPlayer(sessionId, uid) {
  const db = getDb();
  if (!db) return;
  await remove(ref(db, `coopVaultSessions/${sessionId}/players/${uid}`)).catch(() => {});
  await remove(ref(db, `userCoopSessions/${uid}/${sessionId}`)).catch(() => {});
  // Clean up their guesses
  const guessSnap = await get(ref(db, `coopVaultSessions/${sessionId}/lockGuesses`));
  if (guessSnap.exists()) {
    const guesses = guessSnap.val();
    const updates = {};
    for (const pos of Object.keys(guesses)) {
      if (guesses[pos]?.[uid]) updates[`lockGuesses/${pos}/${uid}`] = null;
    }
    if (Object.keys(updates).length > 0) {
      await update(ref(db, `coopVaultSessions/${sessionId}`), updates);
    }
  }
  // Check remaining players
  const snap = await get(ref(db, `coopVaultSessions/${sessionId}/players`));
  if (!snap.exists() || Object.keys(snap.val()).length < 2) {
    await update(ref(db, `coopVaultSessions/${sessionId}`), { status: "waiting" });
  }
}

// ============================================================
// Pending Unlock Choices (player picks which adjacent tile to unlock)
// ============================================================
export async function setVaultPendingUnlock(sessionId, forTile, candidates) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/pendingUnlockChoices`), {
    forTile,
    candidates,
    timestamp: Date.now(),
  });
}

export async function clearVaultPendingUnlock(sessionId) {
  const db = getDb();
  if (!db) return;
  await remove(ref(db, `coopVaultSessions/${sessionId}/pendingUnlockChoices`));
}

// ============================================================
// Chat Messages
// ============================================================
export async function sendVaultChatMessage(sessionId, uid, username, text) {
  const db = getDb();
  if (!db) return;
  const msgRef = push(ref(db, `coopVaultSessions/${sessionId}/chat`));
  await set(msgRef, {
    uid,
    username: username || "Player",
    text,
    timestamp: Date.now(),
  });
}

// ============================================================
// Pins
// ============================================================
export async function sendVaultPin(sessionId, tileIdx, uid, message) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/pins/${tileIdx}`), {
    uid,
    message: message || "",
    timestamp: Date.now(),
  });
}

export async function clearVaultPin(sessionId, tileIdx) {
  const db = getDb();
  if (!db) return;
  await remove(ref(db, `coopVaultSessions/${sessionId}/pins/${tileIdx}`));
}

// ============================================================
// Reactions (same pattern as coop mosaic)
// ============================================================
export async function sendVaultReaction(sessionId, uid, emoji, username, type = "emoji") {
  const db = getDb();
  if (!db) return;
  const reactionRef = push(ref(db, `coopVaultSessions/${sessionId}/reactions`));
  await set(reactionRef, { uid, emoji, username, type, timestamp: Date.now() });
  setTimeout(() => {
    remove(reactionRef).catch(() => {});
  }, 6000);
}

// ============================================================
// Session Lifecycle
// ============================================================
export async function completeVaultSession(sessionId) {
  const db = getDb();
  if (!db) return;
  await update(ref(db, `coopVaultSessions/${sessionId}`), { status: "complete" });
}

export async function playerLeaveVaultSession(sessionId, uid) {
  const db = getDb();
  if (!db) return;
  await remove(ref(db, `coopVaultSessions/${sessionId}/players/${uid}`)).catch(() => {});
  await remove(ref(db, `userCoopSessions/${uid}/${sessionId}`)).catch(() => {});
  // Check remaining players
  const snap = await get(ref(db, `coopVaultSessions/${sessionId}/players`));
  if (!snap.exists() || Object.keys(snap.val()).length < 2) {
    await update(ref(db, `coopVaultSessions/${sessionId}`), { status: "waiting" });
  }
}

export async function closeVaultSession(sessionId, playerUids) {
  const db = getDb();
  if (!db) return;
  const uids = Array.isArray(playerUids) ? playerUids : [playerUids].filter(Boolean);
  for (const uid of uids) {
    if (uid) await remove(ref(db, `userCoopSessions/${uid}/${sessionId}`)).catch(() => {});
  }
  await remove(ref(db, `coopVaultSessions/${sessionId}`));
}

// ============================================================
// Invitations
// ============================================================
export async function addVaultInvitedUid(sessionId, uid) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, `coopVaultSessions/${sessionId}/invitedUids/${uid}`), Date.now());
}
