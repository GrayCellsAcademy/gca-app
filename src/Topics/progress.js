//  Universal Progress Schema 
// Every topic stores progress using this shape in Firestore:
// {
//   uid:             string,
//   topicId:         string,
//   started:         boolean,
//   completed:       boolean,
//   percentComplete: number (0-100),
//   data:            object (topic-specific, anything goes here)
//   startedAt:       timestamp,
//   updatedAt:       timestamp,
//   completedAt:     timestamp | null,
// }
//
// Topics use the `data` field for their own internal state.
// The dashboard only reads: started, completed, percentComplete.

import { saveProgress, getProgress } from "../firebase";

// Load progress for a topic, returning null if not started
export async function loadTopicProgress(uid, topicId) {
  return await getProgress(uid, topicId);
}

// Save progress  topic passes its own data, we wrap it
export async function saveTopicProgress(uid, topicId, {
  completed = false,
  percentComplete = 0,
  data = {},
}) {
  const now = Date.now();
  const existing = await getProgress(uid, topicId);
  await saveProgress(uid, topicId, {
    started: true,
    completed,
    percentComplete: Math.round(percentComplete),
    data,
    startedAt: existing?.startedAt || now,
    updatedAt: now,
    completedAt: completed ? (existing?.completedAt || now) : null,
  });
}
