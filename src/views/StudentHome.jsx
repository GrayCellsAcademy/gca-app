import { useState, useEffect } from "react";
import { getClass, getProgress, leaveClass, joinClass, normalizeAssignments, calculateGrade, gradeToLetter } from "../core/firebase";
import { getTopic, getPublishedTopics } from "../registry";
import TopicRouter from "../TopicRouter";

//  Topic Roadmap Card 
function TopicRoadmapCard({ topic, progress, assignment, isUnlocked, position, onClick }) {
  const completed = progress?.completed === true;
  const started = progress?.started === true;
  const pct = progress?.percentComplete || 0;
  const notStarted = !started;
  const today = new Date().toISOString().split("T")[0];
  const overdue = assignment?.dueDate && assignment.dueDate < today && !completed;

  let statusLabel, statusColor, statusBg;
  if (completed) {
    statusLabel = " Completed"; statusColor = "#10b981"; statusBg = "rgba(16,185,129,0.15)";
  } else if (!isUnlocked) {
    statusLabel = " Locked"; statusColor = "var(--text3)"; statusBg = "rgba(255,255,255,0.05)";
  } else if (notStarted) {
    statusLabel = overdue ? " Overdue" : "Not started";
    statusColor = overdue ? "var(--red)" : "var(--text2)";
    statusBg = overdue ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.08)";
  } else {
    statusLabel = `${pct}% complete`; statusColor = "var(--blue)"; statusBg = "rgba(59,130,246,0.15)";
  }

  return (
    <div
      onClick={isUnlocked ? onClick : undefined}
      style={{
        background: isUnlocked ? "var(--surface)" : "var(--bg2)",
        border: `1px solid ${completed ? "rgba(16,185,129,0.3)" : isUnlocked ? "var(--border2)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        cursor: isUnlocked ? "pointer" : "default",
        opacity: isUnlocked ? 1 : 0.6,
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
      onMouseEnter={e => isUnlocked && (e.currentTarget.style.borderColor = "var(--blue)")}
      onMouseLeave={e => isUnlocked && (e.currentTarget.style.borderColor = completed ? "rgba(16,185,129,0.3)" : "var(--border2)")}
    >
      {/* Position number */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: completed ? "var(--green)" : isUnlocked ? "var(--blue)" : "var(--surface2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 700, color: "#fff",
      }}>{completed ? "" : position}</div>

      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: completed ? "rgba(16,185,129,0.2)" : isUnlocked ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>{topic.icon}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{topic.title}</span>
          <span style={{ fontSize: 20, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: statusBg, color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: isUnlocked && started ? 10 : 0 }}>
          {topic.description}
        </p>
        {assignment?.dueDate && !completed && (
          <div style={{ fontSize: 19, color: overdue ? "var(--red)" : "var(--text3)", marginTop: 4, marginBottom: 6 }}>
            {overdue ? " Due date passed: " : " Due: "}{assignment.dueDate}
          </div>
        )}
        {isUnlocked && started && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 5 }}>
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div className="progress-track" style={{ height: 5 }}>
              <div className="progress-fill" style={{
                width: `${pct}%`,
                background: completed ? "var(--green)" : "linear-gradient(90deg,var(--blue),var(--cyan))"
              }} />
            </div>
          </>
        )}
      </div>

      {isUnlocked && (
        <div style={{ flexShrink: 0 }}>
          <button className={`btn btn-sm ${completed ? "btn-ghost" : "btn-primary"}`}>
            {completed ? "Review" : notStarted ? "Start " : "Continue "}
          </button>
        </div>
      )}
    </div>
  );
}

//  Class View 
function ClassView({ cls, userId, onBack, onPlayTopic }) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const assignments = normalizeAssignments(cls.assignedTopics);
  const categories = cls.categories || [];

  useEffect(() => {
    const load = async () => {
      const progMap = {};
      for (const a of assignments) {
        const p = await getProgress(userId, a.topicId);
        if (p) progMap[a.topicId] = p;
      }
      setProgress(progMap);
      setLoading(false);
    };
    load();
  }, [cls, userId]);

  const assignedTopics = assignments.map(a => ({ assignment: a, topic: getTopic(a.topicId) })).filter(t => t.topic);

  const isTopicUnlocked = (idx) => true;

  // Calculate student's overall grade
  const grade = calculateGrade(assignments, categories, progress);
  const letter = gradeToLetter(grade);
  const letterColor = letter === "A" ? "var(--green)" : letter === "B" ? "var(--cyan)" : letter === "C" ? "var(--amber)" : letter === "F" ? "var(--red)" : "var(--text2)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}> Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>{cls.name}</h2>
        {/* Grade summary pill */}
        {grade !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: "var(--radius-lg)", padding: "10px 20px" }}>
            <div>
              <div style={{ fontSize: 20, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current Grade</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: letterColor }}>{grade}%  {letter}</div>
            </div>
            {categories.length > 0 && (
              <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                {categories.map(cat => {
                  const catAssignments = assignments.filter(a => a.categoryId === cat.id);
                  if (!catAssignments.length) return null;
                  const scores = catAssignments.map(a => progress[a.topicId]?.percentComplete ?? 0);
                  const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
                  return (
                    <div key={cat.id} style={{ fontSize: 19, color: "var(--text2)" }}>
                      <span style={{ color: "var(--text3)" }}>{cat.name} ({cat.weight}%): </span>
                      <strong>{avg}%</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div>
      ) : assignedTopics.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}></div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No topics assigned yet</h3>
          <p style={{ color: "var(--text2)", fontSize: 20 }}>Your teacher hasn't assigned any topics yet. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {assignedTopics.map(({ assignment, topic }, idx) => (
            <TopicRoadmapCard
              key={topic.id}
              topic={topic}
              assignment={assignment}
              progress={progress[topic.id]}
              isUnlocked={isTopicUnlocked(idx)}
              position={idx + 1}
              onClick={() => onPlayTopic(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

//  Main Student Home 
export default function StudentHome({ user, onLogout, onLiveSession, onTicTacToe }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [playingTopicId, setPlayingTopicId] = useState(null);
  const [screen, setScreen] = useState("home"); // home | class | playing
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

  //  Playing a topic 
  if (screen === "playing" && playingTopicId) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}></div>
              <span style={{ fontWeight: 800, fontSize: 20 }}>GCA</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              window.speechSynthesis?.cancel();
              setScreen("class");
              setPlayingTopicId(null);
              loadClasses();
            }}> Back to Class</button>
          </div>
          {/* TopicRouter picks the right player automatically */}
          <TopicRouter
            topicId={playingTopicId}
            user={user}
            onHome={() => {
              window.speechSynthesis?.cancel();
              setScreen("class");
              setPlayingTopicId(null);
              loadClasses();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 19 }}>Gray Cells Academy</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 19 }}>{user.name}</div>
              <div style={{ color: "var(--text3)", fontSize: 19 }}>Student</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onTicTacToe} style={{ marginRight: 8 }}>Math TTT</button>
              <button className="btn btn-ghost btn-sm" onClick={onLiveSession}> Live Session</button>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {/* Class view */}
        {screen === "class" && selectedClass ? (
          <ClassView
            cls={selectedClass}
            userId={user.id}
            onBack={() => { setScreen("home"); setSelectedClass(null); }}
            onPlayTopic={(topicId) => { setPlayingTopicId(topicId); setScreen("playing"); }}
          />
        ) : (
          <>
            <div style={{ marginBottom: 28, animation: "fadeUp 0.35s ease" }}>
              <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 6 }}>
                Hi, {user.name.split(" ")[0]}! 
              </h1>
              <p style={{ color: "var(--text2)", fontSize: 19 }}>
                {classes.length > 0 ? "Select a class to see your assignments." : "Join a class to get started."}
              </p>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

                {/* Classes list */}
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                    My Classes
                  </h2>
                  {classes.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}></div>
                      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Not in any class yet</h3>
                      <p style={{ color: "var(--text2)", fontSize: 20 }}>Join a class using the form on the right.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {classes.map(cls => (
                        <div key={cls.id}
                          onClick={() => { setSelectedClass(cls); setScreen("class"); }}
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 22px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--blue)"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}></div>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>{cls.name}</div>
                              <div style={{ fontSize: 19, color: "var(--text3)" }}>
                                {cls.assignedTopics?.length || 0} topic{cls.assignedTopics?.length !== 1 ? "s" : ""} assigned
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button className="btn btn-primary btn-sm">Open </button>
                            <button className="btn btn-sm"
                              style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 19, padding: "6px 12px" }}
                              onClick={e => { e.stopPropagation(); doLeaveClass(cls.id); }}>
                              Leave
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sidebar  join class */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                    Join a Class
                  </h3>
                  <p style={{ fontSize: 20, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>
                    Ask your teacher for the class name and password.
                  </p>
                  {joinErr && (
                    <div style={{ fontSize: 19, color: "#fca5a5", marginBottom: 10, background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
                      {joinErr}
                    </div>
                  )}
                  <input value={joinClassName} onChange={e => setJoinClassName(e.target.value)}
                    placeholder="Class name" style={{ fontSize: 20, padding: "9px 12px", marginBottom: 8 }} />
                  <input value={joinPass} onChange={e => setJoinPass(e.target.value)}
                    placeholder="Class password" style={{ fontSize: 20, padding: "9px 12px", marginBottom: 12 }} />
                  <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }}
                    onClick={doJoinClass} disabled={joinLoading}>
                    {joinLoading ? "Joining" : "Join Class "}
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


