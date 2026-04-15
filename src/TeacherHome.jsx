import { useState, useEffect } from "react";
import {
  getTeacherClasses, createClass, getStudentsForClass,
  assignTopicToClass, unassignTopicFromClass, reorderTopics,
  updateAssignment, saveCategories, getClassProgress,
  normalizeAssignments, calculateGrade, gradeToLetter,
} from "../core/firebase";
import { getPublishedTopics, getTopic } from "../registry";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function uid4() { return Math.random().toString(36).slice(2, 6); }

function weightTotal(categories) {
  return categories.reduce((s, c) => s + (Number(c.weight) || 0), 0);
}

// â”€â”€â”€ Category Manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CategoryManager({ categories, onChange }) {
  const [cats, setCats] = useState(categories);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");

  const sync = (updated) => { setCats(updated); onChange(updated); };

  const addCat = () => {
    if (!newName.trim() || !newWeight) return;
    sync([...cats, { id: uid4(), name: newName.trim(), weight: Number(newWeight) }]);
    setNewName(""); setNewWeight("");
  };

  const removeCat = (id) => sync(cats.filter(c => c.id !== id));

  const updateWeight = (id, w) =>
    sync(cats.map(c => c.id === id ? { ...c, weight: Number(w) || 0 } : c));

  const total = weightTotal(cats);
  const totalOk = total === 100;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Grade Categories
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: totalOk ? "var(--green)" : "var(--red)" }}>
          Total: {total}% {totalOk ? "âœ“" : "(must equal 100%)"}
        </div>
      </div>

      {cats.length === 0 && (
        <p style={{ fontSize: 20, color: "var(--text3)", marginBottom: 12 }}>
          No categories yet. Add one below to enable the gradebook.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {cats.map(cat => (
          <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 20 }}>{cat.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number" min={0} max={100} value={cat.weight}
                onChange={e => updateWeight(cat.id, e.target.value)}
                style={{ width: 64, padding: "5px 8px", fontSize: 20, textAlign: "center" }}
              />
              <span style={{ fontSize: 20, color: "var(--text3)" }}>%</span>
            </div>
            <button onClick={() => removeCat(cat.id)}
              style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 20, padding: "0 4px" }}>Ã—</button>
          </div>
        ))}
      </div>

      {/* Add category */}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="Category name (e.g. Drills)"
          style={{ flex: 1, fontSize: 20, padding: "8px 12px" }} />
        <input value={newWeight} onChange={e => setNewWeight(e.target.value)}
          type="number" min={0} max={100} placeholder="Weight %"
          style={{ width: 90, fontSize: 20, padding: "8px 12px", textAlign: "center" }} />
        <button className="btn btn-primary btn-sm" onClick={addCat}>+ Add</button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Assignment Row (in topic list) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AssignmentRow({ assignment, categories, onUpdate, onRemove }) {
  const topic = getTopic(assignment.topicId);
  if (!topic) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
      <div style={{ color: "var(--text3)", fontSize: 20, userSelect: "none" }}>â ¿</div>
      <span style={{ fontSize: 20 }}>{topic.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{topic.title}</div>
      </div>

      {/* Category selector */}
      <select
        value={assignment.categoryId || ""}
        onChange={e => onUpdate({ categoryId: e.target.value || null })}
        style={{ fontSize: 20, padding: "5px 8px", width: 140 }}>
        <option value="">No category</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>
        ))}
      </select>

      {/* Due date */}
      <input
        type="date"
        value={assignment.dueDate || ""}
        onChange={e => onUpdate({ dueDate: e.target.value || null })}
        style={{ fontSize: 20, padding: "5px 8px", width: 140 }}
      />

      <button onClick={onRemove}
        style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-sm)", padding: "4px 10px", fontSize: 19, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600, whiteSpace: "nowrap" }}>
        Remove
      </button>
    </div>
  );
}

// â”€â”€â”€ Gradebook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Gradebook({ students, assignments, categories }) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const topicIds = assignments.map(a => a.topicId);

  useEffect(() => {
    const load = async () => {
      const data = await getClassProgress(students.map(s => s.id), topicIds);
      setProgress(data);
      setLoading(false);
    };
    if (students.length && topicIds.length) load();
    else setLoading(false);
  }, [students, assignments]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div className="spinner" /></div>;

  if (!students.length) return (
    <p style={{ color: "var(--text3)", fontSize: 20 }}>No students enrolled yet.</p>
  );

  if (!assignments.length) return (
    <p style={{ color: "var(--text3)", fontSize: 20 }}>No assignments yet. Add topics above.</p>
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ minWidth: 130 }}>Student</th>
            {assignments.map(a => {
              const topic = getTopic(a.topicId);
              const cat = categories.find(c => c.id === a.categoryId);
              const overdue = a.dueDate && a.dueDate < today;
              return (
                <th key={a.topicId} style={{ textAlign: "center", minWidth: 110 }}>
                  <div>{topic?.icon} {topic?.title}</div>
                  {cat && <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>{cat.name}</div>}
                  {a.dueDate && (
                    <div style={{ fontSize: 10, color: overdue ? "var(--red)" : "var(--text3)", fontWeight: 400 }}>
                      Due {a.dueDate}
                    </div>
                  )}
                </th>
              );
            })}
            <th style={{ textAlign: "center", minWidth: 80 }}>Grade</th>
            <th style={{ textAlign: "center", minWidth: 50 }}>Letter</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => {
            const studentProg = progress[s.id] || {};
            const grade = calculateGrade(assignments, categories, studentProg);
            const letter = gradeToLetter(grade);
            const letterColor = letter === "A" ? "var(--green)" : letter === "B" ? "var(--cyan)" : letter === "C" ? "var(--amber)" : letter === "F" ? "var(--red)" : "var(--text2)";

            return (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                {assignments.map(a => {
                  const p = studentProg[a.topicId];
                  const pct = p?.percentComplete ?? null;
                  const completed = p?.completed;
                  const overdue = a.dueDate && a.dueDate < today && !completed;
                  return (
                    <td key={a.topicId} style={{ textAlign: "center" }}>
                      {pct === null ? (
                        <span style={{ color: overdue ? "var(--red)" : "var(--text3)", fontSize: 19 }}>
                          {overdue ? "Overdue" : "â€”"}
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: completed ? "var(--green)" : "var(--text)" }}>
                            {pct}%
                          </span>
                          <div style={{ width: 60, height: 4, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: completed ? "var(--green)" : "var(--blue)", borderRadius: 99 }} />
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{ textAlign: "center", fontWeight: 700, fontSize: 19 }}>
                  {grade !== null ? `${grade}%` : "â€”"}
                </td>
                <td style={{ textAlign: "center", fontWeight: 800, fontSize: 20, color: letterColor }}>
                  {letter}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// â”€â”€â”€ Class Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ClassPanel({ cls, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("assignments"); // assignments | gradebook
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(cls.categories || []);
  const [catDirty, setCatDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const publishedTopics = getPublishedTopics();
  const assignments = normalizeAssignments(cls.assignedTopics);
  const assignedIds = assignments.map(a => a.topicId);
  const unassignedTopics = publishedTopics.filter(t => !assignedIds.includes(t.id));

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

  const handleCatChange = (updated) => {
    setCategories(updated);
    setCatDirty(true);
  };

  const saveCategoriesToDB = async () => {
    setSaving(true);
    await saveCategories(cls.id, categories);
    setCatDirty(false);
    setSaving(false);
    onUpdate();
  };

  const handleAdd = async (topicId) => {
    await assignTopicToClass(cls.id, topicId);
    onUpdate();
  };

  const handleRemove = async (topicId) => {
    await unassignTopicFromClass(cls.id, topicId);
    onUpdate();
  };

  const handleUpdate = async (topicId, updates) => {
    await updateAssignment(cls.id, topicId, updates);
    onUpdate();
  };

  const handleReorder = async (orderedIds) => {
    await reorderTopics(cls.id, orderedIds);
    onUpdate();
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={toggle}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{cls.name}</h3>
          <div style={{ color: "var(--text2)", fontSize: 20 }}>
            Password: <strong style={{ color: "var(--text)" }}>{cls.password}</strong>
            {" Â· "}{cls.studentIds?.length || 0} student{cls.studentIds?.length !== 1 ? "s" : ""}
            {" Â· "}{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
            {" Â· "}{categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "var(--text2)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>â–¼</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 20 }} onClick={e => e.stopPropagation()}>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg2)", borderRadius: "var(--radius)", padding: 4, marginBottom: 20, width: "fit-content" }}>
            {[["assignments", "ðŸ“‹ Assignments"], ["gradebook", "ðŸ“Š Gradebook"]].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); if (id === "gradebook") loadStudents(); }}
                style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "none", background: tab === id ? "var(--blue)" : "transparent", color: tab === id ? "#fff" : "var(--text2)", fontFamily: "var(--font)", fontWeight: 600, fontSize: 20, cursor: "pointer", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>

          {tab === "assignments" && (
            <>
              {/* Categories */}
              <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 18px", marginBottom: 20 }}>
                <CategoryManager categories={categories} onChange={handleCatChange} />
                {catDirty && (
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveCategoriesToDB} disabled={saving}>
                      {saving ? "Savingâ€¦" : "Save Categories"}
                    </button>
                  </div>
                )}
              </div>

              {/* Assigned topics */}
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Assignments
              </div>
              <p style={{ fontSize: 19, color: "var(--text3)", marginBottom: 12 }}>
                Set a category and due date for each assignment. Students work through them in this order.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {assignments.map(a => (
                  <AssignmentRow
                    key={a.topicId}
                    assignment={a}
                    categories={categories}
                    onUpdate={updates => handleUpdate(a.topicId, updates)}
                    onRemove={() => handleRemove(a.topicId)}
                  />
                ))}
              </div>

              {unassignedTopics.length > 0 && (
                <div>
                  <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 8 }}>Add an assignment:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {unassignedTopics.map(t => (
                      <button key={t.id} onClick={() => handleAdd(t.id)} className="btn btn-ghost btn-sm">
                        + {t.icon} {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "gradebook" && (
            loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div className="spinner" /></div>
            ) : (
              <Gradebook
                students={students}
                assignments={assignments}
                categories={categories}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Teacher Home â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function TeacherHome({ user, onLogout, onLiveSession }) {
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>ðŸŽ“</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 19 }}>Teacher Dashboard</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 19 }}>{user.name}</div>
              <div style={{ color: "var(--text3)", fontSize: 19 }}>Teacher</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLiveSession}>ðŸŽ® Live Session</button>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, letterSpacing: "-0.5px" }}>My Classes</h1>
          <button className="btn btn-primary" onClick={() => setShowCreate(s => !s)}>+ New Class</button>
        </div>

        {showCreate && (
          <div className="card" style={{ marginBottom: 20, animation: "slideDown 0.25s ease" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Create a New Class</h3>
            {createErr && <div style={{ color: "#fca5a5", fontSize: 20, marginBottom: 10 }}>{createErr}</div>}
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
            <div style={{ fontSize: 48, marginBottom: 12 }}>ðŸ«</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No classes yet</h3>
            <p style={{ color: "var(--text2)", fontSize: 20, marginBottom: 20 }}>Create your first class to get started.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>+ Create Your First Class</button>
          </div>
        ) : (
          classes.map(cls => <ClassPanel key={cls.id} cls={cls} onUpdate={loadClasses} />)
        )}
      </div>
    </div>
  );
}

