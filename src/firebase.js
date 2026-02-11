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
