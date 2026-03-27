import { useState, useEffect, useRef } from "react";
import {
  getTeacherClasses, createClass, getStudentsForClass,
  assignTopicToClass, unassignTopicFromClass, reorderTopics, getProgress
} from "./firebase";
import { getPublishedTopics, getTopic } from "./registry";

// ─── Drag-to-reorder topic list ───────────────────────────────────
function DraggableTopicList({ topics, onReorder, onRemove }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (idx) => setDragging(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const handleDrop = (idx) => {
    if (dragging === null || dragging === idx) { setDragging(null); setDragOver(null); return; }
    const reordered = [...topics];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered.map(t => t.id));
    setDragging(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  if (topics.length === 0) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text3)", fontSize: 13 }}>
      No topics assigned. Use the buttons below to add topics.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
      {topics.map((topic, idx) => (
        <div key={topic.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: dragOver === idx ? "var(--surface2)" : "var(--bg2)",
            border: `1px solid ${dragOver === idx ? "var(--blue)" : "var(--border)"}`,
            borderRadius: "var(--radius)", padding: "10px 14px",
            cursor: "grab", transition: "all 0.15s",
            opacity: dragging === idx ? 0.4 : 1,
          }}>
          {/* Drag handle */}
          <div style={{ color: "var(--text3)", fontSize: 16, cursor: "grab", userSelect: "none" }}>⠿</div>
          {/* Position */}
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</div>
          {/* Icon + title */}
          <span style={{ fontSize: 18 }}>{topic.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{topic.title}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{topic.subject} · {topic.type}</div>
          </div>
          {/* Remove */}
          <button
            onClick={() => onRemove(topic.id)}
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", padding: "4px 10px", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 }}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Student progress table ───────────────────────────────────────
function StudentProgressTable({ students, assignedTopics }) {
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = {};
      for (const s of students) {
        data[s.id] = {};
        for (const tid of assignedTopics) {
          const p = await getProgress(s.id, tid);
          data[s.id][tid] = p;
        }
      }
      setProgressData(data);
      setLoading(false);
    };
    if (students.length > 0) load();
    else setLoading(false);
  }, [students, assignedTopics]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div className="spinner" /></div>;
  if (students.length === 0) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text3)", fontSize: 13 }}>
      No students yet. Share the class name & password so they can join.
    </div>
  );

  const topics = assignedTopics.map(id => getTopic(id)).filter(Boolean);

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table" style={{ minWidth: 500 }}>
        <thead>
          <tr>
            <th>Student</th>
            {topics.map(t => (
              <th key={t.id} style={{ textAlign: "center" }}>{t.icon} {t.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id}>
              <td style={{ fontWeight: 600 }}>{s.name}</td>
              {topics.map(t => {
                const p = progressData[s.id]?.[t.id];
                const pct = p?.percentComplete || 0;
                const completed = p?.completed;
                const started = p?.started;
                return (
                  <td key={t.id} style={{ textAlign: "center" }}>
                    {!started ? (
                      <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>
                    ) : completed ? (
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ Done</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text2)" }}>{pct}%</span>
                        <div style={{ width: 60, height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--blue)", borderRadius: 99 }} />
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Class Panel ──────────────────────────────────────────────────
function ClassPanel({ cls, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const publishedTopics = getPublishedTopics();

  const loadStudents = async () => {
    if (studentsLoaded) return;
    setLoading(true);
    const s = await getStudentsForClass(cls.id);
    setStudents(s);
    setStudentsLoaded(true);
    setLoading(false);
  };

  const toggle = () => {
    if (!expanded) loadStudents();
    setExpanded(e => !e);
  };

  const assignedTopics = (cls.assignedTopics || [])
    .map(id => getTopic(id)).filter(Boolean);

  const unassignedTopics = publishedTopics.filter(
    t => !(cls.assignedTopics || []).includes(t.id)
  );

  const handleReorder = async (orderedIds) => {
    await reorderTopics(cls.id, orderedIds);
    onUpdate();
  };

  const handleRemove = async (topicId) => {
    await unassignTopicFromClass(cls.id, topicId);
    onUpdate();
  };

  const handleAdd = async (topicId) => {
    await assignTopicToClass(cls.id, topicId);
    onUpdate();
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={toggle}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{cls.name}</h3>
          <div style={{ color: "var(--text2)", fontSize: 13 }}>
            Password: <strong style={{ color: "var(--text)" }}>{cls.password}</strong>
            {" · "}{cls.studentIds?.length || 0} student{cls.studentIds?.length !== 1 ? "s" : ""}
            {" · "}{assignedTopics.length} topic{assignedTopics.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text2)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 20 }} onClick={e => e.stopPropagation()}>

          {/* Topic assignment section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Assigned Topics
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
              Drag to reorder. Students work through topics in this order, unlocking each after completing the previous.
            </p>

            <DraggableTopicList
              topics={assignedTopics}
              onReorder={handleReorder}
              onRemove={handleRemove}
            />

            {/* Add topic buttons */}
            {unassignedTopics.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>Add a topic:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {unassignedTopics.map(t => (
                    <button key={t.id} onClick={() => handleAdd(t.id)}
                      className="btn btn-ghost btn-sm">
                      + {t.icon} {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="divider" />

          {/* Student progress */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Student Progress
          </div>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div className="spinner" /></div>
          ) : (
            <StudentProgressTable
              students={students}
              assignedTopics={cls.assignedTopics || []}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Teacher Home ─────────────────────────────────────────────────
export default function TeacherHome({ user, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [createErr, setCreateErr] = useState("");

  const loadClasses = async () => {
    const cls = await getTeacherClasses(user.id);
    setClasses(cls);
    setLoading(false);
  };

  useEffect(() => { loadClasses(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newPass.trim()) { setCreateErr("Please fill in both fields."); return; }
    setCreateErr("");
    await createClass(newName.trim(), newPass.trim(), user.id);
    setNewName(""); setNewPass(""); setShowCreate(false);
    loadClasses();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Teacher Dashboard</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Teacher</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-0.5px" }}>My Classes</h1>
          <button className="btn btn-primary" onClick={() => setShowCreate(s => !s)}>+ New Class</button>
        </div>

        {/* Create class form */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 20, animation: "slideDown 0.25s ease" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Create a New Class</h3>
            {createErr && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{createErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Class name (e.g. Period 3)" />
              <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Class password" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create Class</button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        ) : classes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏫</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No classes yet</h3>
            <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
              Create your first class and share the name and password with your students.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>+ Create Your First Class</button>
          </div>
        ) : (
          classes.map(cls => (
            <ClassPanel key={cls.id} cls={cls} onUpdate={loadClasses} />
          ))
        )}
      </div>
    </div>
  );
}
