// Lists when a student completed the assignments in one grading category,
// next to each due date.
//
// Usage (from the gca-app folder):
//   node check-submissions.mjs "FNMT 019-123" "Rayhan Yeamin" mentalmath
//
// You'll be asked for your teacher email and password. Nothing is saved or changed:
// this script only reads.

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore, collection, getDocs, getDoc, doc, query, where,
} from "firebase/firestore";
import readline from "node:readline";

const firebaseConfig = {
  apiKey: "AIzaSyACPBcRY31E7a5Sgjeb8SsGdRh9N8rcluw",
  authDomain: "gca-platform-92166.firebaseapp.com",
  projectId: "gca-platform-92166",
  storageBucket: "gca-platform-92166.firebasestorage.app",
  messagingSenderId: "322203934996",
  appId: "1:322203934996:web:2b70fca79ec52cd9222201",
};

const [className, studentName, categoryId = "mentalmath"] = process.argv.slice(2);
if (!className || !studentName) {
  console.log('Usage: node check-submissions.mjs "CLASS NAME" "STUDENT NAME" [category]');
  process.exit(1);
}

function ask(question, hidden = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); else rl.output.write("*"); };
    }
    rl.question(question, ans => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(ans.trim()); });
  });
}

function fmtTime(ms) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// Due dates may be saved as a number (ms), a date string "2026-11-10", or a date-time string.
// A date with no time is treated as due at 11:59 PM that day.
function dueToMs(due) {
  if (due == null || due === "") return null;
  if (typeof due === "number") return due;
  if (typeof due === "object" && typeof due.toMillis === "function") return due.toMillis();
  const s = String(due);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59).getTime();
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = await ask("Teacher email: ");
const password = await ask("Password: ", true);
await signInWithEmailAndPassword(auth, email, password);

// Class
const classSnap = await getDocs(collection(db, "classes"));
const classes = classSnap.docs.map(d => d.data())
  .filter(c => (c.name || "").trim().toLowerCase() === className.trim().toLowerCase());
if (classes.length === 0) { console.log(`No class named "${className}".`); process.exit(1); }
const cls = classes[0];

// Student (must be in this class)
const students = [];
for (const uid of cls.studentIds || []) {
  const s = await getDoc(doc(db, "users", uid));
  if (s.exists()) students.push(s.data());
}
const want = studentName.trim().toLowerCase();
const matches = students.filter(s => (s.name || "").toLowerCase().includes(want));
if (matches.length === 0) {
  console.log(`No student matching "${studentName}" in ${cls.name}. Students in the class:`);
  students.forEach(s => console.log("  " + s.name));
  process.exit(1);
}
if (matches.length > 1) {
  console.log("More than one student matches:");
  matches.forEach(s => console.log("  " + s.name));
  process.exit(1);
}
const student = matches[0];

// Assignments in the category
const assignments = (cls.assignedTopics || [])
  .map(a => (typeof a === "string" ? { topicId: a, categoryId: null, dueDate: null } : a))
  .filter(a => a.categoryId === categoryId);
if (assignments.length === 0) {
  const cats = (cls.categories || []).map(c => `${c.id} (${c.name})`).join(", ");
  console.log(`No assignments in category "${categoryId}". Categories in this class: ${cats}`);
  process.exit(1);
}

// Visits from the activity log
const logSnap = await getDocs(query(collection(db, "activityLog"), where("uid", "==", student.id)));
const visits = logSnap.docs.map(d => d.data());

console.log(`\n${student.name} (${student.email || student.id}) - ${cls.name} - category "${categoryId}"\n`);

const rows = [];
for (const a of assignments) {
  const p = await getDoc(doc(db, "progress", `${student.id}_${a.topicId}`));
  const prog = p.exists() ? p.data() : null;
  const v = visits.filter(x => x.topicId === a.topicId).sort((x, y) => x.startedAt - y.startedAt);
  const title = v[0]?.topicTitle || a.topicId;
  const dueMs = dueToMs(a.dueDate);
  const done = !!prog?.completed;
  // completedAt only exists for work finished after Nov 16, 2026; before that, use the last save
  const doneMs = done ? (prog.completedAt || prog.updatedAt) : null;
  let status;
  if (!prog) status = "never started";
  else if (!done) status = `not completed (${prog.percentComplete ?? 0}%)`;
  else if (dueMs == null) status = "completed (no due date set)";
  else status = doneMs > dueMs ? "LATE" : "on time";
  rows.push({
    Assignment: title,
    "Due": a.dueDate == null ? "-" : `${fmtTime(dueMs)}  [saved as: ${JSON.stringify(a.dueDate)}]`,
    "Completed": done ? fmtTime(doneMs) + (prog.completedAt ? "" : " (last save)") : "-",
    "Status": status,
    "First opened": fmtTime(v[0]?.startedAt),
    "Last opened": fmtTime(v[v.length - 1]?.startedAt),
    "Visits": v.length,
  });
}

for (const r of rows) {
  console.log(r.Assignment);
  for (const [k, val] of Object.entries(r)) if (k !== "Assignment") console.log(`   ${k.padEnd(13)} ${val}`);
  console.log("");
}
process.exit(0);
