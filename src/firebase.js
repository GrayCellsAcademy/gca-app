import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACPBcRY31E7a5Sgjeb8SsGdRh9N8rcluw",
  authDomain: "gca-platform-92166.firebaseapp.com",
  projectId: "gca-platform-92166",
  storageBucket: "gca-platform-92166.firebasestorage.app",
  messagingSenderId: "322203934996",
  appId: "1:322203934996:web:2b70fca79ec52cd9222201",
  measurementId: "G-KPNWQT2YB9",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Auth ────────────────────────────────────────────────────────
export const DEV_CODE = "GCA_DEV_2025";

export async function registerUser(email, password, name, role) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, "users", uid), {
    id: uid, name, role, email,
    classIds: [],
    createdAt: Date.now(),
  });
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() { await signOut(auth); }

export function onAuthChange(cb) { return onAuthStateChanged(auth, cb); }

// ─── Users ───────────────────────────────────────────────────────
export async function getUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => d.data());
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, "users", uid));
}

// ─── Classes ─────────────────────────────────────────────────────
// assignedTopics is an array of assignment objects:
// { topicId, categoryId, dueDate (ISO string or null), addedAt }
// categories is an array of category objects:
// { id, name, weight (0-100) }

export async function createClass(name, password, teacherId) {
  const classId = "cls_" + Date.now().toString(36);
  await setDoc(doc(db, "classes", classId), {
    id: classId, name, password, teacherId,
    studentIds: [],
    assignedTopics: [],  // array of assignment objects
    categories: [],      // array of category objects
    createdAt: Date.now(),
  });
  await updateDoc(doc(db, "users", teacherId), {
    classIds: arrayUnion(classId),
  });
  return classId;
}

export async function getClass(classId) {
  const snap = await getDoc(doc(db, "classes", classId));
  return snap.exists() ? snap.data() : null;
}

export async function getTeacherClasses(teacherId) {
  const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getAllClasses() {
  const snap = await getDocs(collection(db, "classes"));
  return snap.docs.map(d => d.data());
}

export async function joinClass(uid, className, password) {
  const snap = await getDocs(collection(db, "classes"));
  const matchDoc = snap.docs.find(d =>
    d.data().name.toLowerCase() === className.trim().toLowerCase() &&
    d.data().password === password.trim()
  );
  if (!matchDoc) throw new Error("Class not found or wrong password.");
  const cls = matchDoc.data();
  await updateDoc(doc(db, "classes", cls.id), { studentIds: arrayUnion(uid) });
  await updateDoc(doc(db, "users", uid), { classIds: arrayUnion(cls.id) });
  return cls;
}

export async function leaveClass(uid, classId) {
  await updateDoc(doc(db, "classes", classId), { studentIds: arrayRemove(uid) });
  await updateDoc(doc(db, "users", uid), { classIds: arrayRemove(classId) });
}

// ─── Categories ──────────────────────────────────────────────────
export async function saveCategories(classId, categories) {
  await updateDoc(doc(db, "classes", classId), { categories });
}

// ─── Assignments (topics assigned to a class) ─────────────────────
// Normalize: handle both old string format and new object format
export function normalizeAssignments(assignedTopics) {
  return (assignedTopics || []).map(a =>
    typeof a === "string"
      ? { topicId: a, categoryId: null, dueDate: null, addedAt: 0 }
      : a
  );
}

export async function assignTopicToClass(classId, topicId, categoryId = null, dueDate = null) {
  const cls = await getClass(classId);
  const current = normalizeAssignments(cls?.assignedTopics);
  if (current.find(a => a.topicId === topicId)) return;
  const assignment = { topicId, categoryId, dueDate, addedAt: Date.now() };
  await updateDoc(doc(db, "classes", classId), {
    assignedTopics: [...current, assignment],
  });
}

export async function unassignTopicFromClass(classId, topicId) {
  const cls = await getClass(classId);
  const current = normalizeAssignments(cls?.assignedTopics);
  await updateDoc(doc(db, "classes", classId), {
    assignedTopics: current.filter(a => a.topicId !== topicId),
  });
}

export async function updateAssignment(classId, topicId, updates) {
  const cls = await getClass(classId);
  const current = normalizeAssignments(cls?.assignedTopics);
  const updated = current.map(a =>
    a.topicId === topicId ? { ...a, ...updates } : a
  );
  await updateDoc(doc(db, "classes", classId), { assignedTopics: updated });
}

export async function reorderTopics(classId, orderedTopicIds) {
  const cls = await getClass(classId);
  const current = normalizeAssignments(cls?.assignedTopics);
  const map = Object.fromEntries(current.map(a => [a.topicId, a]));
  const reordered = orderedTopicIds.map(id => map[id]).filter(Boolean);
  await updateDoc(doc(db, "classes", classId), { assignedTopics: reordered });
}

export async function getStudentsForClass(classId) {
  const cls = await getClass(classId);
  if (!cls || !cls.studentIds?.length) return [];
  const students = await Promise.all(cls.studentIds.map(id => getUser(id)));
  return students.filter(Boolean);
}

// ─── Progress ────────────────────────────────────────────────────
export async function getProgress(uid, topicId) {
  const id = `${uid}_${topicId}`;
  const snap = await getDoc(doc(db, "progress", id));
  return snap.exists() ? snap.data() : null;
}

export async function saveProgress(uid, topicId, data) {
  const id = `${uid}_${topicId}`;
  await setDoc(doc(db, "progress", id), {
    uid, topicId, ...data, updatedAt: Date.now(),
  }, { merge: true });
}

// Load all progress for a list of students across all assigned topics
export async function getClassProgress(studentIds, topicIds) {
  const results = {};
  for (const uid of studentIds) {
    results[uid] = {};
    for (const topicId of topicIds) {
      const p = await getProgress(uid, topicId);
      results[uid][topicId] = p;
    }
  }
  return results;
}

// ─── Grade calculation ────────────────────────────────────────────
// Returns weighted grade (0-100) for a student given assignments and progress
export function calculateGrade(assignments, categories, progressMap) {
  if (!categories.length) return null;

  // Group assignments by category
  const byCategory = {};
  for (const cat of categories) {
    byCategory[cat.id] = { category: cat, assignments: [] };
  }

  for (const a of assignments) {
    const catId = a.categoryId;
    if (catId && byCategory[catId]) {
      const prog = progressMap[a.topicId];
      const score = prog?.percentComplete ?? 0; // missing = 0
      byCategory[catId].assignments.push(score);
    }
  }

  // Weighted average across categories
  let totalWeight = 0;
  let weightedSum = 0;

  for (const cat of categories) {
    const group = byCategory[cat.id];
    if (!group || group.assignments.length === 0) {
      // Category has no assignments — skip from weight calculation
      continue;
    }
    const catAvg = group.assignments.reduce((s, v) => s + v, 0) / group.assignments.length;
    weightedSum += catAvg * cat.weight;
    totalWeight += cat.weight;
  }

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

export function gradeToLetter(grade) {
  if (grade === null) return "—";
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}
