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
    authorEmail: mosaic.authorEmail || "",
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

// Load all approved public mosaics
export async function loadPublicMosaics() {
  if (!db) return [];
  const snap = await get(ref(db, "mosaics/public"));
  if (!snap.exists()) return [];
  return Object.values(snap.val()).sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));
}

// Share a mosaic with a specific user by email (stores in shared/{recipientUid}/{mosaicId})
export async function shareMosaicWithUser(fromUid, fromEmail, toUid, mosaicId, mosaic) {
  if (!db) return;
  await set(ref(db, `mosaics/shared/${toUid}/${mosaicId}`), {
    ...removeUndefined(mosaic),
    id: mosaicId,
    sharedBy: fromUid,
    sharedByEmail: fromEmail,
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

// Look up a user by email to get their uid (for sharing)
export async function lookupUserByEmail(email) {
  if (!db) return null;
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return null;
  const users = snap.val();
  for (const [uid, data] of Object.entries(users)) {
    if (data?.email === email) return { uid, email };
  }
  return null;
}

// Save user email to their profile (for lookup when sharing)
export async function saveUserEmail(uid, email) {
  if (!db) return;
  await update(ref(db, `users/${uid}`), { email });
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
