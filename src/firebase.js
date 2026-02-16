import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
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
  query,
  orderByChild,
  equalTo,
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

// Delete the current user's account and all associated data from the database.
// Requires recent authentication — callers should handle re-auth if needed.
export async function deleteAccount(uid) {
  if (!auth || !db || !uid) throw new Error("Firebase not configured");
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("No authenticated user");

  // 1. Load the user's username so we can clean up the index
  let usernameKey = null;
  try {
    const snap = await get(ref(db, `users/${uid}/username`));
    if (snap.exists()) usernameKey = snap.val().toLowerCase();
  } catch { /* proceed even if lookup fails */ }

  // 2. Load the user's email so we can clean up the email index
  let emailKey = null;
  try {
    const snap = await get(ref(db, `users/${uid}/email`));
    if (snap.exists()) emailKey = sanitizeEmailKey(snap.val());
  } catch { /* proceed */ }

  // 3. Remove all user data from the database
  const cleanups = [
    remove(ref(db, `users/${uid}`)),
    remove(ref(db, `presence/${uid}`)),
    remove(ref(db, `publicStats/${uid}`)),
    remove(ref(db, `notifications/${uid}`)),
    remove(ref(db, `userCoopSessions/${uid}`)),
    remove(ref(db, `friends/${uid}`)),
  ];
  if (usernameKey) cleanups.push(remove(ref(db, `usernameIndex/${usernameKey}`)));
  if (emailKey) cleanups.push(remove(ref(db, `emailIndex/${emailKey}`)));
  await Promise.allSettled(cleanups);

  // 4. Delete the Firebase Auth account
  await deleteUser(user);
}

// Re-authenticate a user before sensitive operations like account deletion.
// For email/password users, requires the current password.
// For Google users, triggers a Google sign-in popup.
export async function reauthenticateUser(password) {
  if (!auth) throw new Error("Firebase not configured");
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const providerIds = user.providerData.map(p => p.providerId);
  if (providerIds.includes("google.com")) {
    await reauthenticateWithPopup(user, googleProvider);
  } else if (providerIds.includes("password") && password) {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } else {
    throw new Error("Unable to re-authenticate");
  }
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

// Subscribe to user's mosaics in real-time
export function subscribeToUserMosaics(uid, callback) {
  if (!db) return () => {};
  const mosaicsRef = ref(db, `users/${uid}/data/mosaics`);
  const handler = onValue(mosaicsRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  });
  return () => off(mosaicsRef, "value", handler);
}

// Subscribe to public mosaics in real-time
export function subscribeToPublicMosaics(callback) {
  if (!db) return () => {};
  const pubRef = ref(db, "mosaics/public");
  const handler = onValue(pubRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()).sort((a, b) => {
      const oa = a.displayOrder ?? 999999;
      const ob = b.displayOrder ?? 999999;
      if (oa !== ob) return oa - ob;
      return (b.approvedAt || 0) - (a.approvedAt || 0);
    }));
  });
  return () => off(pubRef, "value", handler);
}

// Subscribe to pending mosaics in real-time (admin)
export function subscribeToPendingMosaics(callback) {
  if (!db) return () => {};
  const pendRef = ref(db, "mosaics/pending");
  const handler = onValue(pendRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()).sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0)));
  });
  return () => off(pendRef, "value", handler);
}

// Subscribe to shared mosaics in real-time
export function subscribeToSharedMosaics(uid, callback) {
  if (!db) return () => {};
  const sharedRef = ref(db, `mosaics/shared/${uid}`);
  const handler = onValue(sharedRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()).sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0)));
  });
  return () => off(sharedRef, "value", handler);
}

// Subscribe to staff pick mosaic in real-time
export function subscribeToStaffPick(callback) {
  if (!db) return () => {};
  const metaRef = ref(db, "mosaics/meta/staffPickId");
  const handler = onValue(metaRef, async (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const mosaicId = snap.val();
    const mosaicSnap = await get(ref(db, `mosaics/public/${mosaicId}`));
    callback(mosaicSnap.exists() ? mosaicSnap.val() : null);
  });
  return () => off(metaRef, "value", handler);
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

// Subscribe to friends list in real-time (fires callback with array of friend profiles)
export function subscribeToFriends(uid, callback) {
  if (!db) return () => {};
  const friendsRef = ref(db, `friends/${uid}`);
  const handler = onValue(friendsRef, async (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const friendUids = Object.keys(snap.val());
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
    callback(profiles.filter(p => p.username));
  });
  return () => off(friendsRef, "value", handler);
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

// Register an admin in the adminIndex (called on admin login so other users can look up admin UIDs)
export async function registerAdminIndex(uid) {
  if (!db) return;
  await set(ref(db, `adminIndex/${uid}`), true);
}

// Load all admin UIDs from the adminIndex
export async function loadAdminUids() {
  if (!db) return [];
  const snap = await get(ref(db, "adminIndex"));
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
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

  // Merge mosaicCompletions: for each mosaic ID, merge tile completions (prefer lower non-zero)
  const lMC = localProgress.mosaicCompletions || {};
  const cMC = cloudProgress.mosaicCompletions || {};
  const mcKeys = new Set([...Object.keys(lMC), ...Object.keys(cMC)]);
  const mergedMC = {};
  for (const mosaicId of mcKeys) {
    const lTiles = lMC[mosaicId] || {};
    const cTiles = cMC[mosaicId] || {};
    const tileKeys = new Set([...Object.keys(lTiles), ...Object.keys(cTiles)]);
    const mergedTiles = {};
    for (const tk of tileKeys) {
      const lv = lTiles[tk];
      const cv = cTiles[tk];
      if (lv == null) { mergedTiles[tk] = cv; continue; }
      if (cv == null) { mergedTiles[tk] = lv; continue; }
      if (lv === 0 && cv === 0) { mergedTiles[tk] = 0; continue; }
      if (lv === 0) { mergedTiles[tk] = cv; continue; }
      if (cv === 0) { mergedTiles[tk] = lv; continue; }
      mergedTiles[tk] = Math.min(lv, cv);
    }
    mergedMC[mosaicId] = mergedTiles;
  }
  mergedProgress.mosaicCompletions = mergedMC;

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
  // Merge mosaicCompletionTimes: for each mosaic ID, merge tile times (prefer faster)
  const lMCT = localTimes.mosaicCompletionTimes || {};
  const cMCT = cloudTimes.mosaicCompletionTimes || {};
  const mctKeys = new Set([...Object.keys(lMCT), ...Object.keys(cMCT)]);
  const mergedMCT = {};
  for (const mosaicId of mctKeys) {
    const lTiles = lMCT[mosaicId] || {};
    const cTiles = cMCT[mosaicId] || {};
    const tileKeys = new Set([...Object.keys(lTiles), ...Object.keys(cTiles)]);
    const mergedTileTimes = {};
    for (const tk of tileKeys) {
      const lv = lTiles[tk];
      const cv = cTiles[tk];
      if (lv == null) { mergedTileTimes[tk] = cv; continue; }
      if (cv == null) { mergedTileTimes[tk] = lv; continue; }
      mergedTileTimes[tk] = Math.min(lv, cv);
    }
    mergedMCT[mosaicId] = mergedTileTimes;
  }
  mergedTimes.mosaicCompletionTimes = mergedMCT;

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

// --- Notifications ---

// Send a notification to a user
export async function sendNotification(toUid, notification) {
  if (!db) return null;
  const notifRef = ref(db, `notifications/${toUid}`);
  const newRef = push(notifRef);
  const id = newRef.key;
  await set(newRef, {
    ...removeUndefined(notification),
    id,
    read: false,
    createdAt: serverTimestamp(),
  });
  return id;
}

// Load all notifications for a user
export async function loadNotifications(uid) {
  if (!db) return [];
  const snap = await get(ref(db, `notifications/${uid}`));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Subscribe to notifications in real-time
export function subscribeToNotifications(uid, callback) {
  if (!db) return () => {};
  const notifRef = ref(db, `notifications/${uid}`);
  const handler = onValue(notifRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const notifs = Object.values(snap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(notifs);
  });
  return () => off(notifRef, "value", handler);
}

// Dismiss (delete) a notification
export async function dismissNotification(uid, notifId) {
  if (!db) return;
  await remove(ref(db, `notifications/${uid}/${notifId}`));
}

// --- Coop Mode ---

// Create a new coop session. Returns the session ID.
export async function createCoopSession(uid, { mode, level, dailyDate, hostTheme, hostUsername }) {
  if (!db) return null;
  const sessionsRef = ref(db, "coopSessions");
  const newRef = push(sessionsRef);
  const id = newRef.key;
  await set(newRef, {
    id,
    hostUid: uid,
    hostUsername: hostUsername || null,
    guestUid: null,
    guestUsername: null,
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
    // Multi-player support
    players: {
      [uid]: {
        username: hostUsername || null,
        lockedIn: false,
        correct: false,
        joinedAt: Date.now(),
      },
    },
    invitedUids: {},
  });
  // Index this session under the user's session list
  await set(ref(db, `userCoopSessions/${uid}/${id}`), { createdAt: serverTimestamp(), role: "host" });
  return id;
}

// Join an existing coop session as a player (supports N players)
export async function joinCoopSession(sessionId, uid, playerUsername) {
  if (!db) return null;
  const sessionRef = ref(db, `coopSessions/${sessionId}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) return null;
  const data = snap.val();
  const players = data.players || {};
  // Already a player in this session (host or other player)
  if (players[uid]) return data;
  if (data.hostUid === uid) return data; // host rejoining (legacy check)
  // Check if there's room (max = number of blank cells, enforced client-side)
  // Add to players map
  const playerUpdates = {
    [`players/${uid}`]: {
      username: playerUsername || null,
      lockedIn: false,
      correct: false,
      joinedAt: Date.now(),
    },
    status: "playing",
  };
  // For backward compat: set guestUid for first guest
  if (!data.guestUid) {
    playerUpdates.guestUid = uid;
    playerUpdates.guestUsername = playerUsername || null;
  }
  // Reset all existing players' lock-in states (blanks will be re-allocated)
  for (const existingUid of Object.keys(players)) {
    playerUpdates[`players/${existingUid}/lockedIn`] = false;
    playerUpdates[`players/${existingUid}/correct`] = false;
  }
  playerUpdates.hostLockedIn = false;
  playerUpdates.guestLockedIn = false;
  playerUpdates.hostCorrect = false;
  playerUpdates.guestCorrect = false;
  playerUpdates.attempts = 0;
  playerUpdates.fills = {};
  playerUpdates.hostTimerStart = Date.now();
  await update(sessionRef, playerUpdates);
  // Index this session under the player's session list
  await set(ref(db, `userCoopSessions/${uid}/${sessionId}`), { createdAt: serverTimestamp(), role: "guest" });
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

// Pass a cell to another player (cell override) — direct transfer, used when pass is accepted
export async function passCoopCell(sessionId, cellKey, toUid) {
  if (!db) return;
  await set(ref(db, `coopSessions/${sessionId}/cellOverrides/${cellKey}`), toUid);
  // Clear the fill for this cell since it's changing owner
  await remove(ref(db, `coopSessions/${sessionId}/fills/${cellKey}`)).catch(() => {});
}

// Send a pass request to another player (they must accept)
export async function sendCoopPassRequest(sessionId, cellKey, fromUid, toUid) {
  if (!db) return;
  await set(ref(db, `coopSessions/${sessionId}/passRequests/${cellKey}`), {
    fromUid, toUid, status: "pending", timestamp: Date.now(),
  });
}

// Accept or reject a pass request
export async function respondCoopPassRequest(sessionId, cellKey, accepted) {
  if (!db) return;
  if (accepted) {
    // Read the request to get toUid, then execute the pass and clean up
    const snap = await get(ref(db, `coopSessions/${sessionId}/passRequests/${cellKey}`));
    const req = snap.val();
    if (!req) return;
    await set(ref(db, `coopSessions/${sessionId}/cellOverrides/${cellKey}`), req.toUid);
    await remove(ref(db, `coopSessions/${sessionId}/fills/${cellKey}`)).catch(() => {});
    // Unlock the player who accepted the tile so they can place it
    await update(ref(db, `coopSessions/${sessionId}/players/${req.toUid}`), {
      lockedIn: false,
      correct: false,
    });
  }
  // Remove the request regardless
  await remove(ref(db, `coopSessions/${sessionId}/passRequests/${cellKey}`));
}

// Cancel a pending pass request
export async function cancelCoopPassRequest(sessionId, cellKey) {
  if (!db) return;
  await remove(ref(db, `coopSessions/${sessionId}/passRequests/${cellKey}`));
}

// Send a cell suggestion to another player (suggest what a cell could be)
export async function sendCoopCellSuggestion(sessionId, cellKey, fromUid, toUid, suggestedToken) {
  if (!db) return;
  await set(ref(db, `coopSessions/${sessionId}/cellSuggestions/${cellKey}`), {
    fromUid, toUid, suggestedToken, status: "pending", timestamp: Date.now(),
  });
}

// Dismiss a cell suggestion (recipient acknowledges it)
export async function dismissCoopCellSuggestion(sessionId, cellKey) {
  if (!db) return;
  await remove(ref(db, `coopSessions/${sessionId}/cellSuggestions/${cellKey}`));
}

// Cancel an outgoing cell suggestion
export async function cancelCoopCellSuggestion(sessionId, cellKey) {
  if (!db) return;
  await remove(ref(db, `coopSessions/${sessionId}/cellSuggestions/${cellKey}`));
}

// Send a reaction emoji to all players in a coop session
export async function sendCoopReaction(sessionId, uid, emoji, username) {
  if (!db) return;
  const reactionRef = push(ref(db, `coopSessions/${sessionId}/reactions`));
  await set(reactionRef, { uid, emoji, username, timestamp: Date.now() });
  // Auto-cleanup after 6 seconds so reactions don't accumulate
  setTimeout(() => {
    remove(reactionRef).catch(() => {});
  }, 6000);
}

// Lock in a player's blanks (supports multi-player via uid)
export async function lockInCoopPlayer(sessionId, role, isCorrect, uid) {
  if (!db) return;
  const updates = {};
  // Multi-player: lock in via players map
  if (uid) {
    updates[`players/${uid}/lockedIn`] = true;
    updates[`players/${uid}/correct`] = isCorrect;
  }
  // Legacy: also set role-based fields for backward compat
  const key = role === "host" ? "hostLockedIn" : "guestLockedIn";
  const correctKey = role === "host" ? "hostCorrect" : "guestCorrect";
  updates[key] = true;
  updates[correctKey] = isCorrect;
  await update(ref(db, `coopSessions/${sessionId}`), updates);
}

// Unlock a player's blanks (when they retry after wrong answer)
export async function unlockCoopPlayer(sessionId, role, uid) {
  if (!db) return;
  const updates = {};
  if (uid) {
    updates[`players/${uid}/lockedIn`] = false;
    updates[`players/${uid}/correct`] = false;
  }
  const key = role === "host" ? "hostLockedIn" : "guestLockedIn";
  const correctKey = role === "host" ? "hostCorrect" : "guestCorrect";
  updates[key] = false;
  updates[correctKey] = false;
  await update(ref(db, `coopSessions/${sessionId}`), updates);
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
  const sessionRef = ref(db, `coopSessions/${sessionId}`);
  const updates = {
    status: "playing",
    fills: {},
    hostLockedIn: false,
    guestLockedIn: false,
    hostCorrect: false,
    guestCorrect: false,
    attempts: 0,
    hostTimerStart: Date.now(),
  };
  // Also reset all players' lock-in states in the players map
  const snap = await get(sessionRef);
  if (snap.exists()) {
    const players = snap.val().players || {};
    for (const uid of Object.keys(players)) {
      updates[`players/${uid}/lockedIn`] = false;
      updates[`players/${uid}/correct`] = false;
    }
  }
  await update(sessionRef, updates);
}

// Player leaves a coop session: remove from players map, reset game state
export async function guestLeaveCoopSession(sessionId, playerUid) {
  if (!db) return;
  const sessionRef = ref(db, `coopSessions/${sessionId}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) return;
  const data = snap.val();
  const players = data.players || {};
  // Remove player from players map
  await remove(ref(db, `coopSessions/${sessionId}/players/${playerUid}`)).catch(() => {});
  // Check remaining player count (after removal)
  const remainingUids = Object.keys(players).filter(uid => uid !== playerUid);
  const updates = {
    fills: {},
    hostLockedIn: false,
    guestLockedIn: false,
    hostCorrect: false,
    guestCorrect: false,
    attempts: 0,
    hostTimerStart: Date.now(),
  };
  // Reset all remaining players' lock-in states
  for (const uid of remainingUids) {
    updates[`players/${uid}/lockedIn`] = false;
    updates[`players/${uid}/correct`] = false;
  }
  // If leaving player was the guestUid, clear it
  if (data.guestUid === playerUid) {
    updates.guestUid = null;
    updates.guestUsername = null;
  }
  // If only host remains, set status back to waiting
  if (remainingUids.length <= 1) {
    updates.status = "waiting";
  }
  await update(sessionRef, updates);
  // Remove from player's session index
  if (playerUid) {
    await remove(ref(db, `userCoopSessions/${playerUid}/${sessionId}`)).catch(() => {});
  }
}

// Close/delete a coop session (owner only) — cleans up all players' indexes
export async function closeCoopSession(sessionId, hostUid, guestUid, allPlayerUids) {
  if (!db) return;
  // Read session to get all player UIDs if not provided
  let playerUids = allPlayerUids;
  if (!playerUids) {
    const snap = await get(ref(db, `coopSessions/${sessionId}`));
    if (snap.exists()) {
      const players = snap.val().players || {};
      playerUids = Object.keys(players);
    }
  }
  await remove(ref(db, `coopSessions/${sessionId}`));
  // Clean up session indexes for all players
  const uids = new Set([...(playerUids || []), hostUid, guestUid].filter(Boolean));
  for (const uid of uids) {
    await remove(ref(db, `userCoopSessions/${uid}/${sessionId}`)).catch(() => {});
  }
}

// Delete / leave a coop session (legacy - used for cleanup)
export async function deleteCoopSession(sessionId) {
  if (!db) return;
  await remove(ref(db, `coopSessions/${sessionId}`));
}

// Load all active coop sessions for a user (via session index + hostUid/guestUid query fallback)
export async function loadUserCoopSessions(uid) {
  if (!db) return [];
  const indexSnap = await get(ref(db, `userCoopSessions/${uid}`));
  const indexEntries = indexSnap.exists() ? indexSnap.val() : {};
  const sessionIds = Object.keys(indexEntries);
  // Load each session individually, routing to the correct path based on type
  const sessions = await Promise.all(
    sessionIds.map(async (sid) => {
      const entry = indexEntries[sid];
      const isMosaic = entry && entry.type === "mosaic";
      const path = isMosaic ? `coopMosaicSessions/${sid}` : `coopSessions/${sid}`;
      const snap = await get(ref(db, path));
      if (!snap.exists()) {
        // Session may have been deleted — only clean up stale entries older than 30s
        // to avoid race conditions with newly created sessions
        const createdAt = entry?.createdAt;
        if (createdAt && typeof createdAt === "number" && Date.now() - createdAt > 30000) {
          remove(ref(db, `userCoopSessions/${uid}/${sid}`)).catch(() => {});
        }
        return null;
      }
      const data = snap.val();
      // Tag mosaic sessions so the UI can distinguish them
      if (isMosaic) data._type = "mosaic";
      return data;
    })
  );
  const indexResults = sessions.filter(Boolean);
  const indexSessionIds = new Set(indexResults.map(s => s.id));

  // Also query coopMosaicSessions by hostUid and guestUid to catch sessions
  // missing from the index (e.g. if the index entry was lost)
  let mosaicQueryResults = [];
  try {
    const [hostSnap, guestSnap] = await Promise.all([
      get(query(ref(db, "coopMosaicSessions"), orderByChild("hostUid"), equalTo(uid))),
      get(query(ref(db, "coopMosaicSessions"), orderByChild("guestUid"), equalTo(uid))),
    ]);
    const found = {};
    if (hostSnap.exists()) Object.assign(found, hostSnap.val());
    if (guestSnap.exists()) Object.assign(found, guestSnap.val());
    for (const [sid, data] of Object.entries(found)) {
      if (!indexSessionIds.has(sid) && data.status !== "closed") {
        data._type = "mosaic";
        mosaicQueryResults.push(data);
        // Repair the missing index entry
        const role = data.hostUid === uid ? "host" : "guest";
        set(ref(db, `userCoopSessions/${uid}/${sid}`), { createdAt: data.createdAt || Date.now(), role, type: "mosaic" }).catch(() => {});
      }
    }
  } catch {
    // Query fallback is best-effort; don't fail the whole load
  }

  return [...indexResults, ...mosaicQueryResults].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Subscribe to user's coop session index changes (triggers reload)
export function subscribeToUserCoopSessionIndex(uid, callback) {
  if (!db) return () => {};
  const indexRef = ref(db, `userCoopSessions/${uid}`);
  const handler = onValue(indexRef, () => {
    // When the index changes, reload all sessions
    loadUserCoopSessions(uid).then(callback).catch(() => {});
  });
  return () => off(indexRef, "value", handler);
}

// Load a coop session by ID (one-time read)
export async function loadCoopSession(sessionId) {
  if (!db) return null;
  const snap = await get(ref(db, `coopSessions/${sessionId}`));
  return snap.exists() ? snap.val() : null;
}

// --- Public Stats (for friend comparisons) ---

// Save a summary of game stats to a publicly-readable path
export async function savePublicStats(uid, stats) {
  if (!db) return;
  await update(ref(db, `publicStats/${uid}`), {
    ...removeUndefined(stats),
    updatedAt: serverTimestamp(),
  });
}

// Load another user's public stats
export async function loadPublicStats(uid) {
  if (!db) return null;
  const snap = await get(ref(db, `publicStats/${uid}`));
  return snap.exists() ? snap.val() : null;
}

// --- Puzzle Completions (for rankings & friend indicators) ---

// Save a puzzle completion for ranking purposes
export async function savePuzzleCompletion(uid, mode, puzzleKey, data) {
  if (!db) return;
  await set(ref(db, `puzzleCompletions/${mode}/${puzzleKey}/${uid}`), {
    ...removeUndefined(data),
    completedAt: serverTimestamp(),
  });
}

// Load all completions for a puzzle (for global ranking)
export async function loadPuzzleCompletions(mode, puzzleKey) {
  if (!db) return {};
  const snap = await get(ref(db, `puzzleCompletions/${mode}/${puzzleKey}`));
  return snap.exists() ? snap.val() : {};
}

// Load friend completions for a specific puzzle
export async function loadFriendPuzzleCompletions(friendUids, mode, puzzleKey) {
  if (!db || !friendUids.length) return {};
  const results = {};
  await Promise.all(
    friendUids.map(async (fUid) => {
      const snap = await get(ref(db, `puzzleCompletions/${mode}/${puzzleKey}/${fUid}`));
      if (snap.exists()) results[fUid] = snap.val();
    })
  );
  return results;
}

// Subscribe to all completions for a puzzle in real-time (global ranking + friend data)
export function subscribeToPuzzleCompletions(mode, puzzleKey, callback) {
  if (!db) return () => {};
  const compRef = ref(db, `puzzleCompletions/${mode}/${puzzleKey}`);
  const handler = onValue(compRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
  return () => off(compRef, "value", handler);
}

// --- Presence / Activity Tracking ---

// Update the current user's presence (online status + what they're doing)
// Called on page load, when starting a puzzle, returning to menu, etc.
export async function updatePresence(uid, activity) {
  if (!db) return;
  await set(ref(db, `presence/${uid}`), {
    ...removeUndefined(activity),
    lastSeen: serverTimestamp(),
  });
}

// Load presence/activity for a single user
export async function loadPresence(uid) {
  if (!db) return null;
  const snap = await get(ref(db, `presence/${uid}`));
  return snap.exists() ? snap.val() : null;
}

// Load presence/activity for multiple friends at once
export async function loadFriendPresence(friendUids) {
  if (!db || !friendUids.length) return {};
  const results = {};
  await Promise.all(
    friendUids.map(async (fUid) => {
      const snap = await get(ref(db, `presence/${fUid}`));
      if (snap.exists()) results[fUid] = snap.val();
    })
  );
  return results;
}

// Subscribe to a friend's presence changes in real-time
export function subscribeToFriendPresence(friendUid, callback) {
  if (!db) return () => {};
  const presRef = ref(db, `presence/${friendUid}`);
  const handler = onValue(presRef, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return () => off(presRef, "value", handler);
}

// --- Admin: Global Metrics ---

// Load all public stats once (admin metrics — heavy aggregation)
export async function loadAllPublicStats() {
  if (!db) return {};
  const snap = await get(ref(db, "publicStats"));
  return snap.exists() ? snap.val() : {};
}

// Subscribe to all public stats in real-time (admin user activity)
export function subscribeToAllPublicStats(callback) {
  if (!db) return () => {};
  const statsRef = ref(db, "publicStats");
  const handler = onValue(statsRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
  return () => off(statsRef, "value", handler);
}

// Subscribe to all presence data in real-time (admin user activity)
export function subscribeToAllPresence(callback) {
  if (!db) return () => {};
  const presRef = ref(db, "presence");
  const handler = onValue(presRef, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
  return () => off(presRef, "value", handler);
}

// Load all puzzle completions for a specific mode (admin analytics)
export async function loadAllPuzzleCompletionsForMode(mode) {
  if (!db) return {};
  const snap = await get(ref(db, `puzzleCompletions/${mode}`));
  return snap.exists() ? snap.val() : {};
}

// --- Coop Mosaic Mode (n-player) ---

// Create a new coop mosaic session. Returns the session ID.
export async function createCoopMosaicSession(uid, { mosaicId, mosaicTitle, mosaicGrid, hostTheme, hostUsername }) {
  if (!db) return null;
  const sessionsRef = ref(db, "coopMosaicSessions");
  const newRef = push(sessionsRef);
  const id = newRef.key;
  await set(newRef, {
    id,
    hostUid: uid,
    mosaicId: mosaicId || null,
    mosaicTitle: mosaicTitle || "Untitled",
    mosaicGrid: mosaicGrid,
    status: "waiting",
    tileProgress: {},
    tileTimes: {},
    fills: {},
    players: {
      [uid]: {
        username: hostUsername || null,
        currentTile: -1,
        theme: hostTheme ?? "classic",
        joinedAt: Date.now(),
      },
    },
    invitedUids: {},
    createdAt: serverTimestamp(),
  });
  await set(ref(db, `userCoopSessions/${uid}/${id}`), { createdAt: serverTimestamp(), role: "host", type: "mosaic" });
  return id;
}

// Join an existing coop mosaic session as a player
export async function joinCoopMosaicSession(sessionId, uid, playerUsername) {
  if (!db) return null;
  const sessionRef = ref(db, `coopMosaicSessions/${sessionId}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) return null;
  const data = snap.val();
  // Already a player in this session
  if (data.players && data.players[uid]) return data;
  // Add player to the players map
  await update(ref(db, `coopMosaicSessions/${sessionId}/players/${uid}`), {
    username: playerUsername || null,
    currentTile: -1,
    joinedAt: Date.now(),
  });
  // Set status to playing once we have 2+ players
  const playerCount = Object.keys(data.players || {}).length + 1;
  if (playerCount >= 2 && data.status === "waiting") {
    await update(sessionRef, { status: "playing" });
  }
  await set(ref(db, `userCoopSessions/${uid}/${sessionId}`), { createdAt: serverTimestamp(), role: "guest", type: "mosaic" });
  const updated = await get(sessionRef);
  return updated.val();
}

// Subscribe to real-time changes on a coop mosaic session
export function subscribeToCoopMosaicSession(sessionId, callback) {
  if (!db) return () => {};
  const sessionRef = ref(db, `coopMosaicSessions/${sessionId}`);
  const handler = onValue(sessionRef, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return () => off(sessionRef, "value", handler);
}

// Update a fill in the coop mosaic session (keyed as "tileIdx_row-col")
export async function updateCoopMosaicFill(sessionId, fillKey, token) {
  if (!db) return;
  if (token === null || token === undefined) {
    await remove(ref(db, `coopMosaicSessions/${sessionId}/fills/${fillKey}`));
  } else {
    await set(ref(db, `coopMosaicSessions/${sessionId}/fills/${fillKey}`), token);
  }
}

// Update which tile a player is currently viewing
export async function updateCoopMosaicCurrentTile(sessionId, uid, tileIndex) {
  if (!db) return;
  await update(ref(db, `coopMosaicSessions/${sessionId}/players/${uid}`), { currentTile: tileIndex });
}

// Mark a tile as solved in the session
export async function updateCoopMosaicTileProgress(sessionId, tileIndex, attempts, time) {
  if (!db) return;
  const updates = {};
  updates[`tileProgress/${tileIndex}`] = attempts;
  if (time != null) updates[`tileTimes/${tileIndex}`] = time;
  await update(ref(db, `coopMosaicSessions/${sessionId}`), updates);
}

// Clear fills for a specific tile (after it's been solved)
export async function clearCoopMosaicTileFills(sessionId, tileIndex) {
  if (!db) return;
  const fillsSnap = await get(ref(db, `coopMosaicSessions/${sessionId}/fills`));
  if (!fillsSnap.exists()) return;
  const fills = fillsSnap.val();
  const prefix = `${tileIndex}_`;
  const updates = {};
  for (const key of Object.keys(fills)) {
    if (key.startsWith(prefix)) updates[`fills/${key}`] = null;
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db, `coopMosaicSessions/${sessionId}`), updates);
  }
}

// Mark a coop mosaic session as complete
export async function completeCoopMosaicSession(sessionId) {
  if (!db) return;
  await update(ref(db, `coopMosaicSessions/${sessionId}`), { status: "complete" });
}

// A player leaves a coop mosaic session
export async function playerLeaveCoopMosaicSession(sessionId, uid) {
  if (!db) return;
  // Remove this player from the players map
  await remove(ref(db, `coopMosaicSessions/${sessionId}/players/${uid}`)).catch(() => {});
  // Remove from user's session index
  if (uid) {
    await remove(ref(db, `userCoopSessions/${uid}/${sessionId}`)).catch(() => {});
  }
  // Check remaining players — if only host left, set status back to waiting
  const playersSnap = await get(ref(db, `coopMosaicSessions/${sessionId}/players`));
  const players = playersSnap.exists() ? playersSnap.val() : {};
  const remaining = Object.keys(players).length;
  if (remaining <= 1) {
    await update(ref(db, `coopMosaicSessions/${sessionId}`), { status: "waiting" });
  }
}

// Close/delete a coop mosaic session (cleans up all players' indexes)
export async function closeCoopMosaicSession(sessionId, playerUids) {
  if (!db) return;
  // Clean up session indexes for all players
  const uids = Array.isArray(playerUids) ? playerUids : [playerUids].filter(Boolean);
  for (const uid of uids) {
    if (uid) await remove(ref(db, `userCoopSessions/${uid}/${sessionId}`)).catch(() => {});
  }
  await remove(ref(db, `coopMosaicSessions/${sessionId}`));
}

// Load a coop mosaic session by ID
export async function loadCoopMosaicSession(sessionId) {
  if (!db) return null;
  const snap = await get(ref(db, `coopMosaicSessions/${sessionId}`));
  return snap.exists() ? snap.val() : null;
}

// Update locked cells for a specific tile in coop mosaic (persists lock-in across players)
export async function updateCoopMosaicTileLockedCells(sessionId, tileIndex, cellKeys) {
  if (!db || !cellKeys || cellKeys.length === 0) return;
  const updates = {};
  for (const k of cellKeys) {
    updates[`tileLockedCells/${tileIndex}/${k}`] = true;
  }
  await update(ref(db, `coopMosaicSessions/${sessionId}`), updates);
}

// Add invited UID to a normal coop session
export async function addCoopInvitedUid(sessionId, uid) {
  if (!db) return;
  await set(ref(db, `coopSessions/${sessionId}/invitedUids/${uid}`), Date.now());
}

// Add invited UID to a coop mosaic session
export async function addCoopMosaicInvitedUid(sessionId, uid) {
  if (!db) return;
  await set(ref(db, `coopMosaicSessions/${sessionId}/invitedUids/${uid}`), Date.now());
}
