// ─── Topic Registry ───────────────────────────────────────────────
// To add a new topic:
// 1. Build a player component in src/topics/players/
// 2. Import it here and add an entry to TOPICS
// 3. That's it — the rest of the app picks it up automatically

import AdditionTablesPlayer from "./players/AdditionTablesPlayer";

export const TOPICS = {
  "addition-tables-v1": {
    id: "addition-tables-v1",
    title: "Addition Tables",
    description: "Master single-digit addition mentally and quickly — the foundation of all arithmetic.",
    subject: "math",
    gradeLevel: "6+",
    icon: "➕",
    type: "drill",
    status: "published",   // "draft" | "published"
    order: 1,              // Default sort order in developer view
    Player: AdditionTablesPlayer,
  },
  // Example of how to add future topics:
  // "subtraction-tables-v1": {
  //   id: "subtraction-tables-v1",
  //   title: "Subtraction Tables",
  //   ...
  //   Player: SubtractionTablesPlayer,
  // },
};

// Get a topic definition by ID
export function getTopic(id) {
  return TOPICS[id] || null;
}

// Get all published topics (what teachers can assign)
export function getPublishedTopics() {
  return Object.values(TOPICS).filter(t => t.status === "published");
}

// Get all topics (developer view)
export function getAllTopics() {
  return Object.values(TOPICS);
}
