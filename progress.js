// progress.js — shared Firebase setup + progress helpers for First Line
// Every lesson page loads this as: <script type="module" src="progress.js"></script>
// or imports specific functions from it as needed.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACxaKSRUJzQFpFTp8h6vVWZEKiGT6AXxI",
  authDomain: "first-line-fc5ab.firebaseapp.com",
  projectId: "first-line-fc5ab",
  storageBucket: "first-line-fc5ab.firebasestorage.app",
  messagingSenderId: "976179943092",
  appId: "1:976179943092:web:622abc3c2c109d551269e1",
  measurementId: "G-1EW870FDJL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let currentUser = null;
let currentProgress = null;
let authResolved = false;
const readyCallbacks = [];

function userDocRef(uid) {
  return doc(db, "progress", uid);
}

async function loadProgress(uid) {
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    currentProgress = snap.data();
  } else {
    currentProgress = { completed: {}, gem: null, castleChoice: null, lastVisited: null };
    await setDoc(ref, { ...currentProgress, createdAt: serverTimestamp() });
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    await loadProgress(user.uid);
  } else {
    currentProgress = null;
  }
  authResolved = true;
  readyCallbacks.forEach((cb) => cb(currentUser, currentProgress));
});

// Call this to run code once we know whether someone's logged in
// (and, if so, once their progress has loaded). Fires immediately
// if that's already happened by the time you call it.
export function onProgressReady(callback) {
  readyCallbacks.push(callback);
  if (authResolved) callback(currentUser, currentProgress);
}

export function getUser() {
  return currentUser;
}
export function getProgressData() {
  return currentProgress;
}

// Marks one specific exercise/moment as completed, e.g.
// markComplete('lesson3_fork') or markComplete('lesson13_fire_enter_input').
// Does nothing if no one is logged in (progress just isn't saved that visit).
export async function markComplete(key) {
  if (!currentUser) return;
  currentProgress = currentProgress || { completed: {} };
  currentProgress.completed = currentProgress.completed || {};
  currentProgress.completed[key] = true;
  await updateDoc(userDocRef(currentUser.uid), {
    [`completed.${key}`]: true,
    lastUpdated: serverTimestamp()
  });
}

// Sets a single top-level field, e.g. setField('gem', 'water')
// or setField('castleChoice', 'enter').
export async function setField(field, value) {
  if (!currentUser) return;
  currentProgress = currentProgress || {};
  currentProgress[field] = value;
  await updateDoc(userDocRef(currentUser.uid), {
    [field]: value,
    lastUpdated: serverTimestamp()
  });
}

// Records the current page as the last one visited, so "continue
// where you left off" always has somewhere to point. Call this once
// near the top of every lesson page.
export async function recordVisit(url) {
  if (!currentUser) return;
  await updateDoc(userDocRef(currentUser.uid), {
    lastVisited: url,
    lastUpdated: serverTimestamp()
  });
}

export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

// Drops a small "Signed in as ... · Log out" or "Not signed in ·
// Log in" bar into the element with this id. Call once per page:
// renderAccountBar('account-bar')
export function renderAccountBar(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  function paint(user) {
    el.innerHTML = "";
    const text = document.createElement("span");
    const link = document.createElement("a");
    link.style.marginLeft = "10px";
    link.style.cursor = "pointer";

    if (user) {
      text.textContent = "Signed in as " + user.email;
      link.textContent = "Log out";
      link.addEventListener("click", async () => {
        await logOut();
        location.reload();
      });
    } else {
      text.textContent = "Not signed in";
      link.textContent = "Log in to save progress";
      link.href = "login.html";
    }
    el.appendChild(text);
    el.appendChild(link);
  }

  onProgressReady((user) => paint(user));
}
