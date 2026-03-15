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
export const DEV_CODE = "GCA_DEV_2025"; // Secret developer signup code

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

export async function logoutUser() {
  await signOut(auth);
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

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
export async function createClass(name, password, teacherId) {
  const classId = "cls_" + Date.now().toString(36);
  await setDoc(doc(db, "classes", classId), {
    id: classId, name, password, teacherId,
    studentIds: [],
    assignedTopics: [],
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

export async function assignTopicToClass(classId, topicId) {
  await updateDoc(doc(db, "classes", classId), {
    assignedTopics: arrayUnion(topicId),
  });
}

export async function unassignTopicFromClass(classId, topicId) {
  await updateDoc(doc(db, "classes", classId), {
    assignedTopics: arrayRemove(topicId),
  });
}

export async function getStudentsForClass(classId) {
  const cls = await getClass(classId);
  if (!cls || !cls.studentIds?.length) return [];
  const students = await Promise.all(cls.studentIds.map(id => getUser(id)));
  return students.filter(Boolean);
}

// ─── Topics ──────────────────────────────────────────────────────
export async function getPublishedTopics() {
  const q = query(collection(db, "topics"), where("status", "==", "published"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getAllTopics() {
  const snap = await getDocs(collection(db, "topics"));
  return snap.docs.map(d => d.data());
}

export async function getTopic(topicId) {
  const snap = await getDoc(doc(db, "topics", topicId));
  return snap.exists() ? snap.data() : null;
}

export async function saveTopic(topic) {
  await setDoc(doc(db, "topics", topic.id), topic);
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

export async function getAllProgressForClass(studentIds, topicId) {
  const results = await Promise.all(
    studentIds.map(uid => getProgress(uid, topicId))
  );
  return results.filter(Boolean);
}
