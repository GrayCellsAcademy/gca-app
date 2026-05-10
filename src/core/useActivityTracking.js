import { useEffect, useRef } from "react";
import { startActivity, endActivity } from "./firebase";

// Usage: useActivityTracking(user, topicId, topicTitle)
// Add one line to any player component and it auto-tracks start/stop.
export default function useActivityTracking(user, topicId, topicTitle) {
  const docIdRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !topicId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    // Find classId from user's classIds (use first one)
    const classId = user.classIds?.[0] || user.classId || null;

    startActivity(user.id, topicId, topicTitle || topicId, classId)
      .then(docId => { docIdRef.current = docId; })
      .catch(() => {});

    return () => {
      if (docIdRef.current) {
        endActivity(docIdRef.current).catch(() => {});
        docIdRef.current = null;
        startedRef.current = false;
      }
    };
  }, [user?.id, topicId]);
}
