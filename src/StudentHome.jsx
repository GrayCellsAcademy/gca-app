import { useState, useEffect } from "react";
import { getClass, getProgress, leaveClass, joinClass } from "./firebase";
import { ADDITION_TOPIC_ID, TIER_COLORS } from "./additionTables";
import AdditionTablesPlayer from "./AdditionTablesPlayer";

const TOPIC_REGISTRY = {
  [ADDITION_TOPIC_ID]: {
    id: ADDITION_TOPIC_ID,
    title: "Addition Tables",
    subject: "math",
    description: "Master single-digit addition mentally and quickly.",
    icon: "➕",
    totalTiers: 9,
  },
};

function TopicRoadmapCard({ topic, progress, isUnlocked, onClick }) {
  const mastered = progress?.masteredTiers?.length || 0;
  const total = topic.totalTiers;
  const pct = Math.round((mastered / total) * 100);
  const completed = progress?.completed;
  const notStarted = mastered === 0 && !progress;

  let statusLabel, statusColor, statusBg;
  if (completed) {
    statusLabel = "✓ Completed"; statusColor = "#10b981"; statusBg = "rgba(16,185,129,0.15)";
  } else if (!isUnlocked) {
    statusLabel = "🔒 Locked"; statusColor = "var(--text3)"; statusBg = "rgba(255,255,255,0.05)";
  } else if (notStarted) {
    statusLabel = "Not started"; statusColor = "var(--text2)"; statusBg = "rgba(255,255,255,0.08)";
  } else {
    statusLabel = "Tier " + (mastered + 1) + " of " + total;
    statusColor = "var(--blue)"; statusBg = "rgba(59,130,246,0.15)";
  }

  return (
    <div
      onClick={isUnlocked ? onClick : undefined}
      style={{
        background: isUnlocked ? "var(--surface)" : "var(--bg2)",
        border: "1px solid " + (completed ? "rgba(16,185,129,0.3)" : isUnlocked ? "var(--border2)" : "var(--border)"),
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        cursor: isUnlocked ? "pointer" : "default",
        opacity: isUnlocked ? 1 : 0.6,
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: completed ? "rgba(16,185,129,0.2)" : isUnlocked ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
      }}>{topic.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{topic.title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: statusBg, color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: isUnlocked ? 10 : 0 }}>
          {topic.description}
        </p>
        {isUnlocked && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>
              <span>{mastered}/{total} tiers</span><span>{pct}%</span>
            </div>
            <div className="progress-track" style={{ height: 5 }}>
              <div className="progress-fill" style={{
                width: pct + "%",
                background: completed ? "var(--green)" : "linear-gradient(90deg,var(--blue),var(--cyan))"
              }} />
            </div>
          </>
        )}
      </div>

      {isUnlocked && (
        <div style={{ flexShrink: 0 }}>
          <button className={"btn btn-sm " + (completed ? "btn-ghost" : "btn-primary")}>
            {completed ? "Review" : notStarted ? "Start →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}

function ClassView({ cls, userId, onBack, onPlayTopic }) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const progMap = {};
      for (const tid of (cls.assignedTopics || [])) {
        const p = await getProgress(userId, tid);
        if (p) progMap[tid] = p;
      }
      setProgress(progMap);
      setLoading(false);
    };
    load();
  }, [cls, userId]);

  const assignedTopics = (cls.assignedTopics || []).map(tid => TOPIC_REGISTRY[tid]).filter(Boolean);

  const isTopicUnlocked = (idx) => {
    if (idx === 0) return true;
    const prevTopic = assignedTopics[idx - 1];
    return progress[prevTopic?.id]?.completed === true;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{cls.name}</h2>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : assignedTopics.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No topics assigned yet</h3>
          <p style={{ color: "var(--text2)", fontSize: 14 }}>
            Your teacher has not assigned any topics to this class yet. Check back soon!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {assignedTopics.map((topic, idx) => (
            <TopicRoadmapCard
              key={topic.id}
              topic={topic}
              progress={progress[topic.id]}
              isUnlocked={isTopicUnlocked(idx)}
              onClick={() => onPlayTopic(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentHome({ user, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [playingTopic, setPlayingTopic] = useState(null);
  const [screen, setScreen] = useState("home");
  const [joinClassName, setJoinClassName] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    const userClasses = await Promise.all(
      (user.classIds || []).map(id => getClass(id))
    );
    setClasses(userClasses.filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { loadClasses(); }, []);

  const doJoinClass = async () => {
    if (!joinClassName.trim() || !joinPass.trim()) { setJoinErr("Please fill in both fields."); return; }
    setJoinErr(""); setJoinLoading(true);
    try {
      await joinClass(user.id, joinClassName.trim(), joinPass.trim());
      setJoinClassName(""); setJoinPass("");
      window.location.reload();
    } catch (e) { setJoinErr(e.message || "Class not found or wrong password."); }
    setJoinLoading(false);
  };

  const doLeaveClass = async (classId) => {
    if (!confirm("Are you sure you want to leave this class?")) return;
    await leaveClass(user.id, classId);
    await loadClasses();
  };

  if (screen === "playing" && playingTopic) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎓</div>
              <span style={{ fontWeight: 800, fontSize: 18 }}>GCA</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { window.speechSynthesis?.cancel(); setScreen("class"); setPlayingTopic(null); loadClasses(); }}>
              ← Back to Class
            </button>
          </div>
          <AdditionTablesPlayer user={user} onHome={() => { window.speechSynthesis?.cancel(); setScreen("class"); setPlayingTopic(null); loadClasses(); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Gray Cells Academy</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Student</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {screen === "class" && selectedClass ? (
          <ClassView
            cls={selectedClass}
            userId={user.id}
            onBack={() => { setScreen("home"); setSelectedClass(null); }}
            onPlayTopic={(topicId) => { setPlayingTopic(topicId); setScreen("playing"); }}
          />
        ) : (
          <>
            <div style={{ marginBottom: 28, animation: "fadeUp 0.35s ease" }}>
              <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 6 }}>
                Hi, {user.name.split(" ")[0]}! 👋
              </h1>
              <p style={{ color: "var(--text2)", fontSize: 15 }}>
                {classes.length > 0 ? "Select a class to see your assignments." : "Join a class to get started."}
              </p>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                    My Classes
                  </h2>
                  {classes.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Not in any class yet</h3>
                      <p style={{ color: "var(--text2)", fontSize: 14 }}>Join a class using the form on the right.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {classes.map(cls => (
                        <div key={cls.id}
                          onClick={() => { setSelectedClass(cls); setScreen("class"); }}
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 22px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏫</div>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{cls.name}</div>
                              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                                {cls.assignedTopics?.length || 0} topic{cls.assignedTopics?.length !== 1 ? "s" : ""} assigned
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button className="btn btn-primary btn-sm">Open →</button>
                            <button className="btn btn-sm"
                              style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, padding: "6px 12px" }}
                              onClick={e => { e.stopPropagation(); doLeaveClass(cls.id); }}>
                              Leave
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: "18px 20px" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                    Join a Class
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>
                    Ask your teacher for the class name and password.
                  </p>
                  {joinErr && (
                    <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 10, background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
                      {joinErr}
                    </div>
                  )}
                  <input value={joinClassName} onChange={e => setJoinClassName(e.target.value)}
                    placeholder="Class name" style={{ fontSize: 13, padding: "9px 12px", marginBottom: 8 }} />
                  <input value={joinPass} onChange={e => setJoinPass(e.target.value)}
                    placeholder="Class password" style={{ fontSize: 13, padding: "9px 12px", marginBottom: 12 }} />
                  <button className="btn btn-primary" style={{ width: "100%", fontSize: 14 }}
                    onClick={doJoinClass} disabled={joinLoading}>
                    {joinLoading ? "Joining…" : "Join Class 🏫"}
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
