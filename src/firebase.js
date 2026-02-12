import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (hasConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  googleProvider = new GoogleAuthProvider();
}

export function isFirebaseConfigured() {
  return hasConfig;
}

export function getFirebaseAuth() {
  return auth;
}

export function subscribeToAuthChanges(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail(email, password) {
  if (!auth) throw new Error("Firebase not configured");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error("Firebase not configured");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  if (!auth || !googleProvider) throw new Error("Firebase not configured");
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOut() {
  if (!auth) return;
  await signOut(auth);
}

// Cloud data structure matches localStorage keys
const USER_DATA_DOC = "gameData";

function userRef(uid) {
  return ref(db, `users/${uid}/data/${USER_DATA_DOC}`);
}

export async function loadCloudData(uid) {
  if (!db) return null;
  const snap = await get(userRef(uid));
  if (!snap.exists()) return null;
  return snap.val();
}

function removeUndefined(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) clean[k] = removeUndefined(v);
  }
  return clean;
}

export async function saveCloudData(uid, data) {
  if (!db) return;
  await set(userRef(uid), {
    ...removeUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

// Summarise a game-data object into human-readable progress counts.
// Returns { totalSolved, achievements, modes: { easy, medium, ... } }
export function summariseGameData(data) {
  if (!data) return { totalSolved: 0, achievements: 0, modes: {} };
  const progress = data.progress || {};
  const solveModes = ["easy", "medium", "hard", "blind", "daily", "spin", "mosaic"];
  const modes = {};
  let totalSolved = 0;
  for (const mode of solveModes) {
    const mp = progress[mode] || {};
    const solved = Object.values(mp).filter(v => v > 0).length;
    modes[mode] = solved;
    totalSolved += solved;
  }
  // Cascade: count full clears (value === 10, i.e. all 10 levels)
  const cascade = progress.cascade || {};
  const cascadeClears = Object.values(cascade).filter(v => v === 10).length;
  modes.cascade = cascadeClears;
  totalSolved += cascadeClears;
  const achievements = (data.achievements || []).length;
  return { totalSolved, achievements, modes };
}

// --- Mosaic Creator ---

// Save a user-created mosaic to the user's private collection
// Stored under users/{uid}/data/mosaics/ so it inherits the user's existing write rules
export async function saveMosaicDesign(uid, mosaic) {
  if (!db) return null;
  const mosaicRef = ref(db, `users/${uid}/data/mosaics`);
  const newRef = push(mosaicRef);
  const id = newRef.key;
  await set(newRef, {
    ...removeUndefined(mosaic),
    id,
    authorUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

// Update an existing mosaic
export async function updateMosaicDesign(uid, mosaicId, mosaic) {
  if (!db) return;
  const mosaicRef = ref(db, `users/${uid}/data/mosaics/${mosaicId}`);
  await update(mosaicRef, {
    ...removeUndefined(mosaic),
    updatedAt: serverTimestamp(),
  });
}

// Load all mosaics for a user
export async function loadUserMosaics(uid) {
  if (!db) return [];
  const snap = await get(ref(db, `users/${uid}/data/mosaics`));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Delete a user's mosaic
export async function deleteMosaicDesign(uid, mosaicId) {
  if (!db) return;
  await remove(ref(db, `users/${uid}/data/mosaics/${mosaicId}`));
  // Also remove from public/pending if it was submitted
  try {
    await remove(ref(db, `mosaics/pending/${mosaicId}`));
  } catch { /* may not exist */ }
}

// Submit a mosaic for public review
export async function submitMosaicForReview(uid, mosaicId, mosaic) {
  if (!db) return;
  await set(ref(db, `mosaics/pending/${mosaicId}`), {
    ...removeUndefined(mosaic),
    id: mosaicId,
    authorUid: uid,
    authorUsername: mosaic.authorUsername || "",
    status: "pending",
    submittedAt: serverTimestamp(),
  });
  // Mark the user's copy as submitted
  await update(ref(db, `users/${uid}/data/mosaics/${mosaicId}`), {
    publicStatus: "pending",
    updatedAt: serverTimestamp(),
  });
}

// Admin: load all pending mosaics
export async function loadPendingMosaics() {
  if (!db) return [];
  const snap = await get(ref(db, "mosaics/pending"));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));
}

// Admin: approve a pending mosaic (move to public gallery)
export async function approveMosaic(mosaicId, mosaic) {
  if (!db) return;
  await set(ref(db, `mosaics/public/${mosaicId}`), {
    ...removeUndefined(mosaic),
    id: mosaicId,
    status: "approved",
    approvedAt: serverTimestamp(),
  });
  await remove(ref(db, `mosaics/pending/${mosaicId}`));
  // Update the user's copy status
  if (mosaic.authorUid) {
    try {
      await update(ref(db, `users/${mosaic.authorUid}/data/mosaics/${mosaicId}`), {
        publicStatus: "approved",
        updatedAt: serverTimestamp(),
      });
    } catch { /* user may have deleted their copy, or admin lacks write access */ }
  }
}

// Admin: reject a pending mosaic
export async function rejectMosaic(mosaicId, mosaic) {
  if (!db) return;
  await remove(ref(db, `mosaics/pending/${mosaicId}`));
  // Update the user's copy status
  if (mosaic.authorUid) {
    try {
      await update(ref(db, `users/${mosaic.authorUid}/data/mosaics/${mosaicId}`), {
        publicStatus: "rejected",
        updatedAt: serverTimestamp(),
      });
    } catch { /* user may have deleted their copy, or admin lacks write access */ }
  }
}

// Load all approved public mosaics (sorted by displayOrder if present, then approvedAt)
export async function loadPublicMosaics() {
  if (!db) return [];
  const snap = await get(ref(db, "mosaics/public"));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => {
    const oa = a.displayOrder ?? 999999;
    const ob = b.displayOrder ?? 999999;
    if (oa !== ob) return oa - ob;
    return (b.approvedAt || 0) - (a.approvedAt || 0);
  });
}

// Admin: update fields on a public mosaic (e.g. displayOrder, staffPick)
export async function updatePublicMosaicFields(mosaicId, fields) {
  if (!db) return;
  await update(ref(db, `mosaics/public/${mosaicId}`), removeUndefined(fields));
}

// Admin: unpublish a public mosaic (remove from public, update user's copy)
export async function unpublishMosaic(mosaicId, mosaic) {
  if (!db) return;
  await remove(ref(db, `mosaics/public/${mosaicId}`));
  // Clear staff pick if this was the staff pick
  const metaSnap = await get(ref(db, "mosaics/meta/staffPickId"));
  if (metaSnap.exists() && metaSnap.val() === mosaicId) {
    await remove(ref(db, "mosaics/meta/staffPickId"));
  }
  // Update the user's copy status
  if (mosaic.authorUid) {
    try {
      await update(ref(db, `users/${mosaic.authorUid}/data/mosaics/${mosaicId}`), {
        publicStatus: null,
        updatedAt: serverTimestamp(),
      });
    } catch { /* user may have deleted their copy */ }
  }
}

// Admin: set a mosaic as the staff pick (stores ID at mosaics/meta/staffPickId)
export async function setStaffPick(mosaicId) {
  if (!db) return;
  await set(ref(db, "mosaics/meta/staffPickId"), mosaicId);
}

// Admin: clear the staff pick
export async function clearStaffPick() {
  if (!db) return;
  await remove(ref(db, "mosaics/meta/staffPickId"));
}

// Load the staff pick mosaic (returns the mosaic object or null)
export async function loadStaffPickMosaic() {
  if (!db) return null;
  const idSnap = await get(ref(db, "mosaics/meta/staffPickId"));
  if (!idSnap.exists()) return null;
  const mosaicId = idSnap.val();
  const mosaicSnap = await get(ref(db, `mosaics/public/${mosaicId}`));
  if (!mosaicSnap.exists()) return null;
  return mosaicSnap.val();
}

// Share a mosaic with a specific user by username (stores in shared/{recipientUid}/{mosaicId})
export async function shareMosaicWithUser(fromUid, toUid, mosaicId, mosaic) {
  if (!db) return;
  await set(ref(db, `mosaics/shared/${toUid}/${mosaicId}`), {
    ...removeUndefined(mosaic),
    id: mosaicId,
    sharedBy: fromUid,
    sharedAt: serverTimestamp(),
  });
}

// Load mosaics shared with a user
export async function loadSharedMosaics(uid) {
  if (!db) return [];
  const snap = await get(ref(db, `mosaics/shared/${uid}`));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0));
}

// Sanitise an email address into a valid Firebase key (replace '.' with ',')
function sanitizeEmailKey(email) {
  return email.toLowerCase().replace(/\./g, ",");
}

// Look up a user by email to get their uid (for sharing)
// Uses the emailIndex/{sanitizedEmail} path instead of scanning all users
export async function lookupUserByEmail(email) {
  if (!db || !email) return null;
  const key = sanitizeEmailKey(email.trim());
  const snap = await get(ref(db, `emailIndex/${key}`));
  if (!snap.exists()) return null;
  return { uid: snap.val(), email: email.trim().toLowerCase() };
}

// Save user email to their profile and the email-to-uid index (for lookup when sharing)
export async function saveUserEmail(uid, email) {
  if (!db) return;
  const key = sanitizeEmailKey(email);
  await Promise.all([
    update(ref(db, `users/${uid}`), { email }),
    set(ref(db, `emailIndex/${key}`), uid),
  ]);
}

// --- Username & Profile ---

// Check if a username is available (case-insensitive)
export async function checkUsernameAvailability(username) {
  if (!db || !username) return false;
  const key = username.toLowerCase().trim();
  if (!key || key.length < 3 || key.length > 20) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(key)) return false;
  const snap = await get(ref(db, `usernameIndex/${key}`));
  return !snap.exists();
}

// Save username for a user (also stores in usernameIndex for uniqueness)
// If user already had a different username, removes the old index entry
export async function saveUsername(uid, username) {
  if (!db) return;
  const key = username.toLowerCase().trim();
  // Check it's not taken by someone else
  const existing = await get(ref(db, `usernameIndex/${key}`));
  if (existing.exists() && existing.val() !== uid) {
    throw new Error("Username already taken");
  }
  // Remove old username index if user had one
  const oldSnap = await get(ref(db, `users/${uid}/username`));
  if (oldSnap.exists()) {
    const oldKey = oldSnap.val().toLowerCase();
    if (oldKey !== key) {
      await remove(ref(db, `usernameIndex/${oldKey}`));
    }
  }
  await Promise.all([
    update(ref(db, `users/${uid}`), { username: username.trim() }),
    set(ref(db, `usernameIndex/${key}`), uid),
  ]);
}

// Load a user's profile (username + profilePicture)
export async function loadUserProfile(uid) {
  if (!db) return null;
  // Read individual fields instead of the parent node so that
  // any authenticated user can load another user's public profile.
  // The parent path users/$uid is restricted to the owning user,
  // but username, profilePicture, and email each allow auth != null.
  const [usernameSnap, picSnap, emailSnap] = await Promise.all([
    get(ref(db, `users/${uid}/username`)),
    get(ref(db, `users/${uid}/profilePicture`)),
    get(ref(db, `users/${uid}/email`)),
  ]);
  if (!usernameSnap.exists() && !picSnap.exists() && !emailSnap.exists()) return null;
  return {
    username: usernameSnap.val() || null,
    profilePicture: picSnap.val() || null,
    email: emailSnap.val() || null,
  };
}

// Save profile picture (base64 data URL)
export async function saveProfilePicture(uid, dataUrl) {
  if (!db) return;
  await update(ref(db, `users/${uid}`), { profilePicture: dataUrl || null });
}

// Look up a user by username
export async function lookupUserByUsername(username) {
  if (!db || !username) return null;
  const key = username.toLowerCase().trim();
  const snap = await get(ref(db, `usernameIndex/${key}`));
  if (!snap.exists()) return null;
  const uid = snap.val();
  const profile = await loadUserProfile(uid);
  return { uid, username: profile?.username || username, email: profile?.email || null };
}

// --- Friends ---

// Add a friend by uid (bidirectional: both users see each other)
export async function addFriend(myUid, friendUid) {
  if (!db) return;
  if (myUid === friendUid) throw new Error("Cannot add yourself as a friend");
  await Promise.all([
    set(ref(db, `friends/${myUid}/${friendUid}`), { addedAt: serverTimestamp() }),
    set(ref(db, `friends/${friendUid}/${myUid}`), { addedAt: serverTimestamp() }),
  ]);
}

// Remove a friend (bidirectional)
export async function removeFriend(myUid, friendUid) {
  if (!db) return;
  await Promise.all([
    remove(ref(db, `friends/${myUid}/${friendUid}`)),
    remove(ref(db, `friends/${friendUid}/${myUid}`)),
  ]);
}

// Load all friends for a user (returns array of { uid, username, profilePicture })
export async function loadFriends(uid) {
  if (!db) return [];
  const snap = await get(ref(db, `friends/${uid}`));
  if (!snap.exists()) return [];
  const friendUids = Object.keys(snap.val());
  // Load profiles for each friend
  const profiles = await Promise.all(
    friendUids.map(async (fUid) => {
      const profile = await loadUserProfile(fUid);
      return {
        uid: fUid,
        username: profile?.username || null,
        profilePicture: profile?.profilePicture || null,
      };
    })
  );
  return profiles.filter(p => p.username); // only return friends who still have profiles
}

// Check if two users are friends
export async function checkIsFriend(myUid, otherUid) {
  if (!db) return false;
  const snap = await get(ref(db, `friends/${myUid}/${otherUid}`));
  return snap.exists();
}

// Check if user is admin
export async function checkIsAdmin(uid) {
  if (!db) return false;
  const snap = await get(ref(db, `users/${uid}/admin`));
  if (!snap.exists()) return false;
  return snap.val() === true;
}

// Merges local data into cloud, preferring the "better" result for each puzzle
export function mergeGameData(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;

  const merged = {};

  // Merge progress: for each mode, keep the better (lower non-zero) attempt count
  const progressModes = ["easy", "medium", "hard", "blind", "daily", "spin", "mosaic"];
  const localProgress = local.progress || {};
  const cloudProgress = cloud.progress || {};
  const mergedProgress = {};

  for (const mode of progressModes) {
    const lm = localProgress[mode] || {};
    const cm = cloudProgress[mode] || {};
    const allKeys = new Set([...Object.keys(lm), ...Object.keys(cm)]);
    const mm = {};
    for (const key of allKeys) {
      const lv = lm[key];
      const cv = cm[key];
      if (lv == null) { mm[key] = cv; continue; }
      if (cv == null) { mm[key] = lv; continue; }
      // Both exist: prefer lower non-zero, but any solve > unsolved
      if (lv === 0 && cv === 0) { mm[key] = 0; continue; }
      if (lv === 0) { mm[key] = cv; continue; }
      if (cv === 0) { mm[key] = lv; continue; }
      mm[key] = Math.min(lv, cv);
    }
    mergedProgress[mode] = mm;
  }

  // Cascade: keep higher level reached
  const lCascade = localProgress.cascade || {};
  const cCascade = cloudProgress.cascade || {};
  const cascadeKeys = new Set([...Object.keys(lCascade), ...Object.keys(cCascade)]);
  const mergedCascade = {};
  for (const key of cascadeKeys) {
    mergedCascade[key] = Math.max(lCascade[key] || 0, cCascade[key] || 0);
  }
  mergedProgress.cascade = mergedCascade;

  // Cascade run state: keep the one with higher level
  const lRunState = localProgress.cascadeRunState || {};
  const cRunState = cloudProgress.cascadeRunState || {};
  const runKeys = new Set([...Object.keys(lRunState), ...Object.keys(cRunState)]);
  const mergedRunState = {};
  for (const key of runKeys) {
    const lr = lRunState[key];
    const cr = cRunState[key];
    if (!lr) { mergedRunState[key] = cr; continue; }
    if (!cr) { mergedRunState[key] = lr; continue; }
    mergedRunState[key] = (lr.level || 0) >= (cr.level || 0) ? lr : cr;
  }
  mergedProgress.cascadeRunState = mergedRunState;
  mergedProgress.cascadeRunStateLastIndex = localProgress.cascadeRunStateLastIndex ?? cloudProgress.cascadeRunStateLastIndex ?? null;

  merged.progress = mergedProgress;

  // Merge times: keep the faster time for each puzzle
  const localTimes = local.times || {};
  const cloudTimes = cloud.times || {};
  const mergedTimes = {};
  const timeModes = ["easy", "medium", "hard", "blind", "daily", "cascade"];

  for (const mode of timeModes) {
    const lt = localTimes[mode] || {};
    const ct = cloudTimes[mode] || {};
    const allKeys = new Set([...Object.keys(lt), ...Object.keys(ct)]);
    const mt = {};
    for (const key of allKeys) {
      const lv = lt[key];
      const cv = ct[key];
      if (lv == null) { mt[key] = cv; continue; }
      if (cv == null) { mt[key] = lv; continue; }
      mt[key] = Math.min(lv, cv);
    }
    mergedTimes[mode] = mt;
  }
  merged.times = mergedTimes;

  // Merge achievements: union of both sets
  const localAchievements = local.achievements || [];
  const cloudAchievements = cloud.achievements || [];
  merged.achievements = [...new Set([...localAchievements, ...cloudAchievements])];

  // Theme: prefer cloud (last-used theme from their account)
  merged.theme = cloud.theme || local.theme || "classic";

  // Birthday: prefer whichever is set
  merged.birthday = local.birthday || cloud.birthday || null;

  return merged;
}

// --- Coop Mode ---

// Create a new coop session. Returns the session ID.
export async function createCoopSession(uid, { mode, level, dailyDate, hostTheme }) {
  if (!db) return null;
  const sessionsRef = ref(db, "coopSessions");
  const newRef = push(sessionsRef);
  const id = newRef.key;
  await set(newRef, {
    id,
    hostUid: uid,
    guestUid: null,
    mode,
    level: level ?? null,
    dailyDate: dailyDate ?? null,
    status: "waiting", // waiting | playing | complete
    fills: {},
    hostLockedIn: false,
    guestLockedIn: false,
    hostCorrect: false,
    guestCorrect: false,
    attempts: 0,
    hostTheme: hostTheme ?? "classic",
    hostTimerStart: Date.now(),
    createdAt: serverTimestamp(),
  });
  return id;
}

// Join an existing coop session as guest
export async function joinCoopSession(sessionId, uid) {
  if (!db) return null;
  const sessionRef = ref(db, `coopSessions/${sessionId}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) return null;
  const data = snap.val();
  if (data.guestUid && data.guestUid !== uid) return null; // already taken
  if (data.hostUid === uid) return data; // host rejoining
  await update(sessionRef, { guestUid: uid, status: "playing" });
  const updated = await get(sessionRef);
  return updated.val();
}

// Subscribe to real-time changes on a coop session. Returns unsubscribe function.
export function subscribeToCoopSession(sessionId, callback) {
  if (!db) return () => {};
  const sessionRef = ref(db, `coopSessions/${sessionId}`);
  const handler = onValue(sessionRef, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return () => off(sessionRef, "value", handler);
}

// Update fills for a specific cell in the coop session
export async function updateCoopFill(sessionId, cellKey, token) {
  if (!db) return;
  if (token === null || token === undefined) {
    await remove(ref(db, `coopSessions/${sessionId}/fills/${cellKey}`));
  } else {
    await set(ref(db, `coopSessions/${sessionId}/fills/${cellKey}`), token);
  }
}

// Lock in a player's half (host or guest)
export async function lockInCoopPlayer(sessionId, role, isCorrect) {
  if (!db) return;
  const key = role === "host" ? "hostLockedIn" : "guestLockedIn";
  const correctKey = role === "host" ? "hostCorrect" : "guestCorrect";
  const updates = { [key]: true, [correctKey]: isCorrect };
  await update(ref(db, `coopSessions/${sessionId}`), updates);
}

// Unlock a player's half (when they retry after wrong answer)
export async function unlockCoopPlayer(sessionId, role) {
  if (!db) return;
  const key = role === "host" ? "hostLockedIn" : "guestLockedIn";
  const correctKey = role === "host" ? "hostCorrect" : "guestCorrect";
  await update(ref(db, `coopSessions/${sessionId}`), { [key]: false, [correctKey]: false });
}

// Update shared attempt counter for the coop session
export async function updateCoopAttempts(sessionId, attempts) {
  if (!db) return;
  await update(ref(db, `coopSessions/${sessionId}`), { attempts });
}

// Mark session as complete
export async function completeCoopSession(sessionId) {
  if (!db) return;
  await update(ref(db, `coopSessions/${sessionId}`), { status: "complete" });
}

// Reset a coop session for retry (keep players, reset game state)
export async function resetCoopSession(sessionId) {
  if (!db) return;
  await update(ref(db, `coopSessions/${sessionId}`), {
    status: "playing",
    fills: {},
    hostLockedIn: false,
    guestLockedIn: false,
    hostCorrect: false,
    guestCorrect: false,
    attempts: 0,
    hostTimerStart: Date.now(),
  });
}

// Delete / leave a coop session
export async function deleteCoopSession(sessionId) {
  if (!db) return;
  await remove(ref(db, `coopSessions/${sessionId}`));
}

// Load a coop session by ID (one-time read)
export async function loadCoopSession(sessionId) {
  if (!db) return null;
  const snap = await get(ref(db, `coopSessions/${sessionId}`));
  return snap.exists() ? snap.val() : null;
}
