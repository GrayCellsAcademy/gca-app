import { useState, useEffect } from "react";
import {
  getTeacherClasses, createClass, getStudentsForClass,
  assignTopicToClass, unassignTopicFromClass, reorderTopics,
  updateAssignment, saveCategories, getClassProgress,
  normalizeAssignments, calculateGrade, gradeToLetter,
  resetStudentProgress, resetClassProgress, getStudentActivity,
} from "../core/firebase";
import { getPublishedTopics, getTopic } from "../registry";

//  Helpers 
function uid4() { return Math.random().toString(36).slice(2, 6); }

function weightTotal(categories) {
  return categories.reduce((s, c) => s + (Number(c.weight) || 0), 0);
}

//  Category Manager 
function CategoryManager({ categories, onChange }) {
  const [cats, setCats] = useState(categories);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [expanded, setExpanded] = useState(null);

  const sync = (updated) => { setCats(updated); onChange(updated); };

  const addCat = () => {
    if (!newName.trim() || !newWeight) return;
    sync([...cats, {
      id: uid4(), name: newName.trim(), weight: Number(newWeight),
      defaultPoints: null, defaultAllowLate: null, defaultLatePenalty: null,
    }]);
    setNewName(""); setNewWeight("");
  };

  const removeCat = (id) => sync(cats.filter(c => c.id !== id));

  const updateCat = (id, changes) =>
    sync(cats.map(c => c.id === id ? { ...c, ...changes } : c));

  const total = weightTotal(cats);
  const totalOk = total === 100;

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
        <div style={{ fontSize:20,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em" }}>
          Grade Categories
        </div>
        <div style={{ fontSize:20,fontWeight:700,color:totalOk?"var(--green)":"var(--red)" }}>
          Total: {total}% {totalOk?"":"(must equal 100%)"}
        </div>
      </div>

      {cats.length===0 && (
        <p style={{ fontSize:20,color:"var(--text3)",marginBottom:12 }}>
          No categories yet. Add one below to enable the gradebook.
        </p>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
        {cats.map(cat => (
          <div key={cat.id} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)" }}>
            {/* Header row */}
            <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px" }}>
              <div style={{ flex:1,fontWeight:700,fontSize:20 }}>{cat.name}</div>
              {/* Default policies summary */}
              <div style={{ fontSize:19,color:"var(--text3)",display:"flex",gap:10,flexWrap:"wrap" }}>
                {cat.defaultPoints && <span>{cat.defaultPoints} pts default</span>}
                {cat.defaultAllowLate===false && <span style={{ color:"var(--red)" }}>No late</span>}
                {cat.defaultAllowLate===true && cat.defaultLatePenalty!=null && <span style={{ color:"var(--orange)" }}>{cat.defaultLatePenalty}% late credit</span>}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <input type="number" min={0} max={100} value={cat.weight}
                  onChange={e=>updateCat(cat.id,{weight:Number(e.target.value)||0})}
                  style={{ width:64,padding:"5px 8px",fontSize:20,textAlign:"center" }} />
                <span style={{ fontSize:20,color:"var(--text3)" }}>%</span>
              </div>
              <button onClick={()=>setExpanded(expanded===cat.id?null:cat.id)}
                style={{ background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"4px 12px",fontSize:19,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,color:"var(--text2)",whiteSpace:"nowrap" }}>
                {expanded===cat.id?"Done":"Defaults"}
              </button>
              <button onClick={()=>removeCat(cat.id)}
                style={{ background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:20,padding:"0 4px" }}>x</button>
            </div>

            {/* Default policy settings */}
            {expanded===cat.id && (
              <div style={{ padding:"12px 16px",borderTop:"1px solid var(--border)",background:"var(--bg3)",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,borderRadius:"0 0 var(--radius-sm) var(--radius-sm)" }}>
                <div>
                  <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Default Points</div>
                  <input type="number" min={1} max={1000}
                    value={cat.defaultPoints||""} placeholder="e.g. 100"
                    onChange={e=>updateCat(cat.id,{defaultPoints:parseInt(e.target.value)||null})}
                    style={{ fontSize:19,padding:"6px 10px",width:"100%" }} />
                  <div style={{ fontSize:18,color:"var(--text3)",marginTop:3 }}>Applied to new assignments</div>
                </div>
                <div>
                  <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Default Late Policy</div>
                  <select value={cat.defaultAllowLate===false?"no":cat.defaultAllowLate===true?"yes":""}
                    onChange={e=>updateCat(cat.id,{defaultAllowLate:e.target.value==="yes"?true:e.target.value==="no"?false:null})}
                    style={{ fontSize:19,padding:"6px 10px",width:"100%" }}>
                    <option value="">Not set</option>
                    <option value="yes">Late allowed</option>
                    <option value="no">No late submissions</option>
                  </select>
                </div>
                {cat.defaultAllowLate===true && (
                  <div>
                    <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Default Late Credit %</div>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <input type="number" min={0} max={100}
                        value={cat.defaultLatePenalty!=null?cat.defaultLatePenalty:""}
                        placeholder="e.g. 50"
                        onChange={e=>updateCat(cat.id,{defaultLatePenalty:parseInt(e.target.value)||0})}
                        style={{ fontSize:19,padding:"6px 10px",flex:1 }} />
                      <span style={{ fontSize:19,color:"var(--text3)" }}>%</span>
                    </div>
                    <div style={{ fontSize:18,color:"var(--text3)",marginTop:3 }}>Late work earns this % of its score</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add category */}
      <div style={{ display:"flex",gap:8 }}>
        <input value={newName} onChange={e=>setNewName(e.target.value)}
          placeholder="Category name (e.g. Drills)"
          style={{ flex:1,fontSize:20,padding:"8px 12px" }} />
        <input value={newWeight} onChange={e=>setNewWeight(e.target.value)}
          type="number" min={0} max={100} placeholder="Weight %"
          style={{ width:90,fontSize:20,padding:"8px 12px",textAlign:"center" }} />
        <button className="btn btn-primary btn-sm" onClick={addCat}>+ Add</button>
      </div>
    </div>
  );
}

//  Assignment Row (in topic list) 
function AssignmentRow({ assignment, categories, onUpdate, onRemove, onReset, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) {
  const topic = getTopic(assignment.topicId);
  const isSession = assignment.isSession || false;
  if (!topic && !isSession) return null;
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: isDragging ? "rgba(27,143,255,0.08)" : "var(--bg2)",
        border: isDragging ? "2px dashed var(--blue)" : "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "10px 14px",
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.15s",
      }}>
      {/* Main row */}
      <div style={{ display:"flex",alignItems:"center",gap:10,cursor:"grab" }}>
        <div style={{ color:"var(--text3)",fontSize:20,userSelect:"none",cursor:"grab" }}>&#9776;</div>
        <span style={{ fontSize:20 }}>{topic?.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700,fontSize:20 }}>{topic?.title || assignment.topicId}</div>
          <div style={{ fontSize:19,color:"var(--text3)",marginTop:2,display:"flex",gap:12,flexWrap:"wrap" }}>
            {assignment.points && <span>{assignment.points} pts</span>}
            {assignment.dueDate && <span>Due {assignment.dueDate}</span>}
            {assignment.allowLate && assignment.latePenalty && <span style={{ color:"var(--orange)" }}>{assignment.latePenalty}% late penalty</span>}
            {assignment.allowLate === false && assignment.dueDate && <span style={{ color:"var(--red)" }}>No late submissions</span>}
          </div>
        </div>
        <button onClick={() => setShowSettings(s=>!s)}
          style={{ background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"4px 12px",fontSize:19,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,color:"var(--text2)",whiteSpace:"nowrap" }}>
          {showSettings ? "Done" : "Settings"}
        </button>
        <button onClick={onReset}
          style={{ background:"rgba(255,107,0,0.1)",color:"var(--orange)",border:"1px solid rgba(255,107,0,0.3)",borderRadius:"var(--radius-sm)",padding:"4px 10px",fontSize:19,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,whiteSpace:"nowrap" }}>
          Reset All
        </button>
        <button onClick={onRemove}
          style={{ background:"rgba(239,68,68,0.1)",color:"var(--red)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"var(--radius-sm)",padding:"4px 10px",fontSize:19,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,whiteSpace:"nowrap" }}>
          Remove
        </button>
      </div>

      {/* Expanded settings */}
      {showSettings && (
        <div style={{ marginTop:12,padding:"14px 16px",background:"var(--bg3)",borderRadius:"var(--radius-sm)",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12 }}
          onMouseDown={e=>e.stopPropagation()}>

          {/* Category */}
          <div>
            <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Category</div>
            <select value={assignment.categoryId||""} onChange={e=>onUpdate({categoryId:e.target.value||null})}
              style={{ fontSize:19,padding:"6px 10px",width:"100%" }}>
              <option value="">No category</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>)}
            </select>
          </div>

          {/* Points */}
          <div>
            <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Points</div>
            <input type="number" min={1} max={1000}
              value={assignment.points||""} placeholder="e.g. 100"
              onChange={e=>onUpdate({points:parseInt(e.target.value)||null})}
              style={{ fontSize:19,padding:"6px 10px",width:"100%" }} />
          </div>

          {/* Due date */}
          <div>
            <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Due Date</div>
            <input type="date" value={assignment.dueDate||""}
              onChange={e=>onUpdate({dueDate:e.target.value||null})}
              style={{ fontSize:19,padding:"6px 10px",width:"100%" }} />
          </div>

          {/* Late submissions */}
          <div>
            <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Late Submissions</div>
            <select value={assignment.allowLate===false?"no":assignment.allowLate===true?"yes":""}
              onChange={e=>onUpdate({allowLate:e.target.value==="yes"?true:e.target.value==="no"?false:null})}
              style={{ fontSize:19,padding:"6px 10px",width:"100%" }}>
              <option value="">Not set</option>
              <option value="yes">Allowed</option>
              <option value="no">Not allowed</option>
            </select>
          </div>

          {/* Late penalty - only show if late allowed */}
          {assignment.allowLate === true && (
            <div>
              <div style={{ fontSize:19,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Late Credit %</div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input type="number" min={0} max={100}
                  value={assignment.latePenalty!=null?assignment.latePenalty:""}
                  placeholder="e.g. 50"
                  onChange={e=>onUpdate({latePenalty:parseInt(e.target.value)||0})}
                  style={{ fontSize:19,padding:"6px 10px",flex:1 }} />
                <span style={{ fontSize:19,color:"var(--text3)" }}>% credit</span>
              </div>
              <div style={{ fontSize:18,color:"var(--text3)",marginTop:4 }}>Late work earns this % of its score</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

//  Gradebook 
function Gradebook({ students, assignments, categories, onResetStudent }) {
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
  if (!students.length) return <p style={{ color: "var(--text3)", fontSize: 20 }}>No students enrolled yet.</p>;
  if (!assignments.length) return <p style={{ color: "var(--text3)", fontSize: 20 }}>No assignments yet. Add topics above.</p>;

  const today = new Date().toISOString().split("T")[0];

  // Compute effective score for a student on an assignment
  const effectiveScore = (a, p) => {
    if (!p || p.percentComplete == null) return null;
    const raw = p.percentComplete;
    if (!a.dueDate) return raw; // no deadline = no penalty
    const isLate = p.updatedAt && new Date(p.updatedAt).toISOString().split("T")[0] > a.dueDate;
    if (!isLate) return raw;
    if (a.allowLate === false) return 0; // no late allowed = 0
    if (a.allowLate === true && a.latePenalty != null) return Math.round(raw * a.latePenalty / 100);
    return raw; // late allowed, no penalty set
  };

  // Compute total grade using points if set, otherwise category weights
  const computeGrade = (studentProg) => {
    // Points-based: if any assignment has points set, use points
    const hasPoints = assignments.some(a => a.points);
    if (hasPoints) {
      let earned = 0, total = 0;
      for (const a of assignments) {
        if (!a.points) continue;
        const p = studentProg[a.topicId];
        const score = effectiveScore(a, p);
        if (score !== null) earned += (score / 100) * a.points;
        total += a.points;
      }
      return total > 0 ? Math.round((earned / total) * 100) : null;
    }
    // Category-based fallback
    return calculateGrade(assignments, categories, studentProg);
  };

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
                <th key={a.topicId} style={{ textAlign: "center", minWidth: 120 }}>
                  <div>{topic?.icon} {topic?.title || a.topicId}</div>
                  {a.points && <div style={{ fontSize:11,color:"var(--blue)",fontWeight:700 }}>{a.points} pts</div>}
                  {cat && <div style={{ fontSize:10,color:"var(--text3)",fontWeight:400 }}>{cat.name}</div>}
                  {a.dueDate && (
                    <div style={{ fontSize:10,color:overdue?"var(--red)":"var(--text3)",fontWeight:400 }}>
                      Due {a.dueDate}
                    </div>
                  )}
                  {a.allowLate===true && a.latePenalty!=null && (
                    <div style={{ fontSize:10,color:"var(--orange)",fontWeight:400 }}>{a.latePenalty}% late</div>
                  )}
                  {a.allowLate===false && a.dueDate && (
                    <div style={{ fontSize:10,color:"var(--red)",fontWeight:400 }}>No late</div>
                  )}
                </th>
              );
            })}
            <th style={{ textAlign: "center", minWidth: 80 }}>Grade</th>
            <th style={{ textAlign: "center", minWidth: 50 }}>Letter</th>
            <th style={{ textAlign: "center", minWidth: 60 }}>Reset</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => {
            const studentProg = progress[s.id] || {};
            const grade = computeGrade(studentProg);
            const letter = gradeToLetter(grade);
            const letterColor = letter==="A"?"var(--green)":letter==="B"?"var(--cyan)":letter==="C"?"var(--amber)":letter==="F"?"var(--red)":"var(--text2)";

            return (
              <tr key={s.id}>
                <td style={{ fontWeight:600 }}>{s.name}</td>
                {assignments.map(a => {
                  const p = studentProg[a.topicId];
                  const raw = p?.percentComplete ?? null;
                  const score = effectiveScore(a, p);
                  const isLate = a.dueDate && p?.updatedAt && new Date(p.updatedAt).toISOString().split("T")[0] > a.dueDate;
                  const notAllowed = a.allowLate===false && isLate;
                  const overdue = a.dueDate && a.dueDate < today && raw===null;

                  return (
                    <td key={a.topicId} style={{ textAlign:"center" }}>
                      {raw===null ? (
                        <span style={{ color:overdue?"var(--red)":"var(--text3)",fontSize:19 }}>
                          {overdue ? (a.allowLate===false?"Locked":"Overdue") : ""}
                        </span>
                      ) : (
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
                          <span style={{ fontSize:20,fontWeight:700,color:notAllowed?"var(--red)":isLate?"var(--orange)":score===100?"var(--green)":"var(--text)" }}>
                            {score}%
                          </span>
                          {isLate && <span style={{ fontSize:11,color:notAllowed?"var(--red)":"var(--orange)",fontWeight:700 }}>{notAllowed?"Not accepted":"Late"}</span>}
                          <div style={{ width:60,height:4,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${score}%`,background:notAllowed?"var(--red)":isLate?"var(--orange)":score===100?"var(--green)":"var(--blue)",borderRadius:99 }} />
                          </div>
                          {a.points && score!==null && (
                            <span style={{ fontSize:11,color:"var(--text3)" }}>{Math.round(score/100*a.points)}/{a.points}pts</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{ textAlign:"center",fontWeight:700,fontSize:19 }}>
                  {grade!==null?`${grade}%`:""}
                </td>
                <td style={{ textAlign:"center",fontWeight:800,fontSize:20,color:letterColor }}>
                  {letter}
                </td>
                <td style={{ textAlign:"center" }}>
                  <button onClick={()=>onResetStudent(s.id,s.name)}
                    style={{ background:"rgba(255,107,0,0.1)",color:"var(--orange)",border:"1px solid rgba(255,107,0,0.3)",borderRadius:"var(--radius-sm)",padding:"3px 8px",fontSize:20,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,whiteSpace:"nowrap" }}>
                    Reset
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


//  Reset Dialog 
function ResetDialog({ topicTitle, targetName, onConfirm, onCancel }) {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div className="card" style={{
        maxWidth: 480, width: "100%",
        border: "2px solid rgba(239,68,68,0.5)",
        animation: "popIn 0.2s ease",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}></div>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "var(--red)" }}>
          Reset Assignment Progress
        </h3>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 8, lineHeight: 1.7 }}>
          You are about to reset <strong style={{ color: "var(--text)" }}>{topicTitle}</strong> for{" "}
          <strong style={{ color: "var(--text)" }}>{targetName}</strong>.
        </p>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 20, lineHeight: 1.7 }}>
          This will permanently erase all progress and set their grade for this assignment back to zero.
          This action cannot be undone.
        </p>
        <label style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: "var(--radius-sm)",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          cursor: "pointer", marginBottom: 20,
        }}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, cursor: "pointer" }} />
          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
            I understand this will affect grades and cannot be undone
          </span>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            style={{
              flex: 1, padding: "10px", borderRadius: "var(--radius)", border: "none",
              background: checked ? "var(--red)" : "rgba(239,68,68,0.3)",
              color: "#fff", fontFamily: "var(--font)", fontWeight: 700,
              fontSize: 20, cursor: checked ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}>
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Helpers --
function fmtTime(ts) {
  if (!ts) return "--";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "  " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDuration(ms) {
  if (!ms) return "--";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m === 0) return s + "s";
  return m + "m " + s + "s";
}

// -- Student Activity View --
function StudentActivityView({ student, onBack }) {
  const [filter, setFilter] = useState("week"); // week | all
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = filter === "week" ? Date.now() - 7 * 24 * 60 * 60 * 1000 : null;
      const acts = await getStudentActivity(student.id, since);
      setActivities(acts);
      setLoading(false);
    };
    load();
  }, [student.id, filter]);

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>Back to Roster</button>
        <div style={{ fontWeight:800,fontSize:22 }}>{student.name}</div>
        <div style={{ color:"var(--text3)",fontSize:20 }}>{student.email}</div>
      </div>

      <div style={{ display:"flex",gap:8,marginBottom:16 }}>
        {[["week","Last 7 Days"],["all","All Time"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)}
            style={{ padding:"8px 18px",borderRadius:"var(--radius-sm)",border:"none",background:filter===id?"var(--blue)":"var(--bg2)",color:filter===id?"#fff":"var(--text2)",fontFamily:"var(--font)",fontWeight:700,fontSize:20,cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex",justifyContent:"center",padding:40 }}><div className="spinner"/></div>
      ) : activities.length === 0 ? (
        <div className="card" style={{ textAlign:"center",padding:"40px 20px",color:"var(--text3)",fontSize:20 }}>
          No activity recorded{filter==="week"?" in the last 7 days":""}.
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {activities.map(act => (
            <div key={act.id} className="card" style={{ padding:"14px 18px" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer" }}
                onClick={()=>setExpanded(expanded===act.id?null:act.id)}>
                <div>
                  <div style={{ fontWeight:700,fontSize:20,color:"var(--text)" }}>{act.topicTitle}</div>
                  <div style={{ fontSize:20,color:"var(--text3)",marginTop:2 }}>
                    {fmtTime(act.startedAt)} &nbsp;-&nbsp;
                    {act.endedAt ? fmtDuration(act.durationMs) : <span style={{ color:"var(--orange)" }}>In progress</span>}
                  </div>
                </div>
                <div style={{ fontSize:20,color:"var(--blue)",fontWeight:700 }}>
                  {expanded===act.id ? "Hide" : "Details"}
                </div>
              </div>

              {expanded===act.id && (
                <div style={{ marginTop:14,background:"var(--bg3)",borderRadius:"var(--radius-sm)",padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
                  <div>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Started</div>
                    <div style={{ fontSize:20,fontWeight:700 }}>{fmtTime(act.startedAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Ended</div>
                    <div style={{ fontSize:20,fontWeight:700 }}>{act.endedAt ? fmtTime(act.endedAt) : <span style={{ color:"var(--orange)" }}>In progress</span>}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Time Worked</div>
                    <div style={{ fontSize:20,fontWeight:700,color:"var(--blue)" }}>{fmtDuration(act.durationMs)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Roster View --
function RosterView({ cls, students }) {
  const [selectedStudent, setSelectedStudent] = useState(null);

  if (selectedStudent) {
    return <StudentActivityView student={selectedStudent} onBack={()=>setSelectedStudent(null)} />;
  }

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",marginBottom:16 }}>
        {students.length} student{students.length!==1?"s":""} enrolled. Click a student to view their activity.
      </div>
      {students.length === 0 ? (
        <div style={{ textAlign:"center",padding:"30px 20px",color:"var(--text3)",fontSize:20 }}>
          No students enrolled yet.
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {students.map(s => (
            <div key={s.id} onClick={()=>setSelectedStudent(s)}
              style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 18px",cursor:"pointer",border:"1px solid var(--border)",transition:"all 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div>
                <div style={{ fontWeight:700,fontSize:20 }}>{s.name}</div>
                <div style={{ fontSize:20,color:"var(--text3)" }}>{s.email}</div>
              </div>
              <div style={{ color:"var(--blue)",fontWeight:700,fontSize:20 }}>View Activity -</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

//  Class Panel 
function ClassPanel({ cls, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("assignments"); // assignments | gradebook | roster
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(cls.categories || []);
  useEffect(() => { setCategories(cls.categories || []); }, [cls.id]);
  const [catDirty, setCatDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetDialog, setResetDialog] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null); // { topicId, topicTitle, uid, name } or { topicId, topicTitle, all: true }

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

  const handleCatChange = async (updated) => {
    setCategories(updated);
    await saveCategories(cls.id, updated);
    onUpdate();
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

  // Apply category defaults to an assignment when category is set
  const applyCategoryDefaults = async (topicId, categoryId, currentAssignment) => {
    if (!categoryId) return;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    const updates = { categoryId };
    // Only apply defaults if individual setting not already set
    if (cat.defaultPoints != null && !currentAssignment.points) updates.points = cat.defaultPoints;
    if (cat.defaultAllowLate != null && currentAssignment.allowLate == null) updates.allowLate = cat.defaultAllowLate;
    if (cat.defaultLatePenalty != null && currentAssignment.latePenalty == null) updates.latePenalty = cat.defaultLatePenalty;
    await updateAssignment(cls.id, topicId, updates);
    onUpdate();
  };

  const handleResetClass = async (topicId) => {
    const sids = cls.studentIds || [];
    await resetClassProgress(sids, topicId);
    setResetDialog(null);
    onUpdate();
  };

  const handleResetStudent = async (uid, topicId) => {
    await resetStudentProgress(uid, topicId);
    setResetDialog(null);
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
      {/* Reset Dialog */}
      {resetDialog && (
        <ResetDialog
          topicTitle={resetDialog.topicTitle}
          targetName={resetDialog.all
            ? `all ${cls.studentIds?.length || 0} students in this class`
            : resetDialog.name}
          onCancel={() => setResetDialog(null)}
          onConfirm={async () => {
            if (resetDialog.all) {
              await handleResetClass(resetDialog.topicId);
            } else if (resetDialog.uid && resetDialog.topicId === null) {
              // Reset all assignments for this student
              const assignments = normalizeAssignments(cls.assignedTopics);
              for (const a of assignments) {
                await resetStudentProgress(resetDialog.uid, a.topicId);
              }
              setResetDialog(null);
              onUpdate();
            } else {
              await handleResetStudent(resetDialog.uid, resetDialog.topicId);
            }
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={toggle}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{cls.name}</h3>
          <div style={{ color: "var(--text2)", fontSize: 20 }}>
            Password: <strong style={{ color: "var(--text)" }}>{cls.password}</strong>
            {"  "}{cls.studentIds?.length || 0} student{cls.studentIds?.length !== 1 ? "s" : ""}
            {"  "}{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
            {"  "}{categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "var(--text2)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}></div>
      </div>

      {expanded && (
        <div style={{ marginTop: 20 }} onClick={e => e.stopPropagation()}>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg2)", borderRadius: "var(--radius)", padding: 4, marginBottom: 20, width: "fit-content" }}>
            {[["assignments", " Assignments"], ["gradebook", " Gradebook"], ["roster", " Roster"]].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); if (id === "gradebook" || id === "roster") loadStudents(); }}
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
                      {saving ? "Saving" : "Save Categories"}
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
                {assignments.map((a, idx) => (
                  <AssignmentRow
                    key={a.topicId}
                    assignment={a}
                    categories={categories}
                    onUpdate={updates => {
                      // If category changed, apply defaults
                      if (updates.categoryId !== undefined && updates.categoryId !== a.categoryId) {
                        applyCategoryDefaults(a.topicId, updates.categoryId, a);
                      } else {
                        handleUpdate(a.topicId, updates);
                      }
                    }}
                    onRemove={() => handleRemove(a.topicId)}
                    onReset={() => {
                      const t = getTopic(a.topicId);
                      setResetDialog({ topicId: a.topicId, topicTitle: t?.title || a.topicId, all: true });
                    }}
                    isDragging={dragIdx === idx}
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={() => setDragOverIdx(idx)}
                    onDrop={() => {
                      if (dragIdx === null || dragIdx === dragOverIdx) return;
                      const reordered = [...assignments];
                      const [moved] = reordered.splice(dragIdx, 1);
                      reordered.splice(dragOverIdx, 0, moved);
                      handleReorder(reordered.map(a => a.topicId));
                      setDragIdx(null); setDragOverIdx(null);
                    }}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
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
                onResetStudent={(uid, name) => {
                  // Reset all assignments for this student
                  setResetDialog({ uid, name, all: false, topicId: null, topicTitle: "all assignments" });
                }}
              />
            )
          )}

          {tab === "roster" && (
            loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div className="spinner" /></div>
            ) : (
              <RosterView cls={cls} students={students} />
            )
          )}
        </div>
      )}
    </div>
  );
}

//  Teacher Home 
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}></div>
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
            <button className="btn btn-ghost btn-sm" onClick={onLiveSession}> Live Session</button>
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
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
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


