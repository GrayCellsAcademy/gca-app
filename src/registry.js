// ─── Topic Registry ───────────────────────────────────────────────
import AdditionTablesPlayer from "./AdditionTablesPlayer";
import ColumnAdditionPlayer from "./ColumnAdditionPlayer";
import Lesson01MasteryPlayer from "./Lesson01MasteryPlayer";
import ExtraCredit01Player from "./ExtraCredit01Player";

export const TOPICS = {
  "addition-tables-v1": {
    id: "addition-tables-v1",
    title: "Addition Tables",
    description: "Master single-digit addition mentally and quickly — the foundation of all arithmetic.",
    subject: "math",
    gradeLevel: "6+",
    icon: "➕",
    type: "drill",
    status: "published",
    order: 1,
    Player: AdditionTablesPlayer,
  },
  "column-addition-v1": {
    id: "column-addition-v1",
    title: "Column Addition",
    description: "Learn to add multi-digit numbers using column addition — with and without carrying.",
    subject: "math",
    gradeLevel: "6+",
    icon: "📐",
    type: "guided-practice",
    status: "published",
    order: 2,
    Player: ColumnAdditionPlayer,
  },
  "lesson01-mastery-v1": {
    id: "lesson01-mastery-v1",
    title: "Column Addition & Subtraction Mastery",
    description: "Master column addition and subtraction across 6 difficulty levels — no carrying to borrowing from zero.",
    subject: "math",
    gradeLevel: "6+",
    icon: "🔢",
    type: "mastery",
    status: "published",
    order: 3,
    Player: Lesson01MasteryPlayer,
  },
  "lesson01-extra-credit-v1": {
    id: "lesson01-extra-credit-v1",
    title: "Missing Digit Challenge",
    description: "Find the missing digit in column addition and subtraction problems. Get all 6 types correct in a row.",
    subject: "math",
    gradeLevel: "6+",
    icon: "⭐",
    type: "extra-credit",
    status: "published",
    order: 4,
    Player: ExtraCredit01Player,
  },
};

export function getTopic(id) { return TOPICS[id] || null; }
export function getPublishedTopics() { return Object.values(TOPICS).filter(t => t.status === "published"); }
export function getAllTopics() { return Object.values(TOPICS); }
