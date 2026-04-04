// ─── Topic Registry ───────────────────────────────────────────────
// To add a new topic:
// 1. Build a player component in src/
// 2. Import it here and add an entry to TOPICS
// 3. That's it — the rest of the app picks it up automatically

import AdditionTablesPlayer from "./mental-math/AdditionTablesPlayer";
import ColumnAdditionPlayer from "./mastery/lesson01/ColumnAdditionPlayer";

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
};

export function getTopic(id) { return TOPICS[id] || null; }
export function getPublishedTopics() { return Object.values(TOPICS).filter(t => t.status === "published"); }
export function getAllTopics() { return Object.values(TOPICS); }
