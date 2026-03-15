import { useState, useEffect } from "react";
import {
  getTeacherClasses, createClass, getStudentsForClass,
  assignTopicToClass, unassignTopicFromClass, getProgress, getPublishedTopics
} from "./firebase";
import { ADDITION_TOPIC_ID, TIER_COLORS } from "./additionTables";

const KNOWN_TOPICS = [{
  id: ADDITION_TOPIC_ID,
  title: "Addition Tables",
  subject: "math",
  description: "Single-digit addition mastery",
}];

function ProgressGrid({ students, topicId }) {
  const tiers = Array.from({length:9},(_,i)=>i+1);
  return (
    <div style={{overflowX:"auto",marginTop:16}}>
      <table style={{borderCollapse:"collapse",width:"100%",minWidth:600,fontSize:12}}>
        <thead>
          <tr>
            <th style={{textAlign:"left",padding:"8px 12px",color:"var(--text3)",
              fontWeight:600,borderBottom:"1px solid var(--border)",minWidth:120}}>Student</th>
            {tiers.map(t=>(
              <th key={t} style={{textAlign:"center",padding:"8px 6px",
                color:TIER_COLORS[t],fontWeight:700,fontSize:11,
                borderBottom:"1px solid var(--border)",width:48}}>
                +{t}s
              </th>
            ))}
            <th style={{textAlign:"center",padding:"8px 6px",color:"var(--text3)",
              fontWeight:600,fontSize:11,borderBottom:"1px solid var(--border)"}}>Done</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s,si)=>{
            const p = s._progress;
            const mastered = p?.masteredTiers || [];
            const current = p?.currentTier || null;
            return (
              <tr key={s.id} style={{background:si%2===0?"var(--bg2)":"transparent"}}>
                <td style={{padding:"10px 12px",fontWeight:600,borderBottom:"1px solid var(--border)"}}>
                  {s.name}
                </td>
                {tiers.map(t=>{
                  const done = mastered.includes(t);
                  const isCurrent = current===t && !done;
                  return (
                    <td key={t} style={{textAlign:"center",padding:"10px 4px",
                      borderBottom:"1px solid var(--border)"}}>
                      {done ? (
                        <span style={{color:TIER_COLORS[t],fontWeight:700}}>✓</span>
                      ) : isCurrent ? (
                        <span style={{color:TIER_COLORS[t],fontWeight:700}}>▶</span>
                      ) : (
                        <span style={{color:"var(--text3)"}}>—</span>
                      )}
                    </td>
                  );
                })}
                <td style={{textAlign:"center",padding:"10px 4px",borderBottom:"1px solid var(--border)"}}>
                  {p?.completed ? "🏆" : `${mastered.length}/9`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClassPanel({ cls, onAssign, onUnassign }) {
  const [students, setStudents] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const loadStudents = async () => {
    if (loading) return;
    setLoading(true);
    const s = await getStudentsForClass(cls.id);
    // Load progress for each student
    const withProgress = await Promise.all(s.map(async st=>{
      const p = await getProgress(st.id, ADDITION_TOPIC_ID);
      return {...st, _progress: p};
    }));
    setStudents(withProgress);
    setLoading(false);
  };

  const toggle = () => {
    if (!expanded) loadStudents();
    setExpanded(e=>!e);
  };

  const assigned = cls.assignedTopics || [];

  return (
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        cursor:"pointer",flexWrap:"wrap",gap:10}} onClick={toggle}>
        <div>
          <h3 style={{fontSize:18,fontWeight:800,marginBottom:2}}>{cls.name}</h3>
          <div style={{color:"var(--text2)",fontSize:13}}>
            Password: <strong style={{color:"var(--text)"}}>{cls.password}</strong>
            {" · "}{cls.studentIds?.length||0} student{cls.studentIds?.length!==1?"s":""}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"var(--text3)"}}>
            {assigned.length} topic{assigned.length!==1?"s":""} assigned
          </span>
          <div style={{
            width:28,height:28,borderRadius:"50%",background:"var(--bg2)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:14,color:"var(--text2)",transition:"transform 0.2s",
            transform:expanded?"rotate(180deg)":"none"
          }}>▼</div>
        </div>
      </div>

      {expanded && (
        <div style={{marginTop:20}} onClick={e=>e.stopPropagation()}>
          {/* Assign topics */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:10}}>
              Assigned Topics
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {KNOWN_TOPICS.map(t=>{
                const isAssigned = assigned.includes(t.id);
                return (
                  <button key={t.id}
                    onClick={()=> isAssigned ? onUnassign(cls.id,t.id) : onAssign(cls.id,t.id)}
                    className={`btn btn-sm ${isAssigned?"btn-success":"btn-ghost"}`}>
                    {isAssigned ? "✓ " : "+ "}{t.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress grid */}
          {loading ? (
            <div style={{display:"flex",justifyContent:"center",padding:20}}>
              <div className="spinner"/>
            </div>
          ) : students.length === 0 ? (
            <div style={{textAlign:"center",padding:"20px 0",color:"var(--text3)",fontSize:13}}>
              No students yet. Share the class name &amp; password so they can join.
            </div>
          ) : (
            <>
              {assigned.includes(ADDITION_TOPIC_ID) && (
                <>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:4}}>
                    Addition Tables — Student Progress
                  </div>
                  <div style={{fontSize:11,color:"var(--text3)",marginBottom:8}}>
                    ✓ = mastered · ▶ = currently here · — = not started
                  </div>
                  <ProgressGrid students={students} topicId={ADDITION_TOPIC_ID}/>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeacherHome({ user, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [createErr, setCreateErr] = useState("");

  useEffect(()=>{
    const load = async () => {
      const cls = await getTeacherClasses(user.id);
      setClasses(cls);
      setLoading(false);
    };
    load();
  },[user]);

  const handleCreate = async () => {
    if (!newName.trim()||!newPass.trim()) { setCreateErr("Please fill in both fields."); return; }
    setCreateErr("");
    await createClass(newName.trim(), newPass.trim(), user.id);
    setNewName(""); setNewPass(""); setShowCreate(false);
    const cls = await getTeacherClasses(user.id);
    setClasses(cls);
  };

  const handleAssign = async (classId, topicId) => {
    await assignTopicToClass(classId, topicId);
    const cls = await getTeacherClasses(user.id);
    setClasses(cls);
  };

  const handleUnassign = async (classId, topicId) => {
    await unassignTopicFromClass(classId, topicId);
    const cls = await getTeacherClasses(user.id);
    setClasses(cls);
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)"}} className="dot-bg">
      <div style={{maxWidth:1000,margin:"0 auto"}}>

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:40,height:40,borderRadius:12,
              background:"linear-gradient(135deg,var(--blue),var(--cyan))",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20
            }}>🎓</div>
            <div>
              <div style={{fontWeight:800,fontSize:20}}>GCA</div>
              <div style={{color:"var(--text3)",fontSize:12}}>Teacher Dashboard</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:15}}>{user.name}</div>
              <div style={{color:"var(--text3)",fontSize:12}}>Teacher</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginBottom:24,flexWrap:"wrap",gap:12}}>
          <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:900,letterSpacing:"-0.5px"}}>
            My Classes
          </h1>
          <button className="btn btn-primary" onClick={()=>setShowCreate(s=>!s)}>
            + New Class
          </button>
        </div>

        {/* Create class form */}
        {showCreate && (
          <div className="card" style={{marginBottom:20,animation:"slideDown 0.25s ease"}}>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Create a New Class</h3>
            {createErr&&<div style={{color:"#fca5a5",fontSize:13,marginBottom:10}}>{createErr}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="Class name (e.g. Period 3)"/>
              <input value={newPass} onChange={e=>setNewPass(e.target.value)}
                placeholder="Class password"/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-primary" onClick={handleCreate}>Create Class</button>
              <button className="btn btn-ghost" onClick={()=>setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{display:"flex",justifyContent:"center",padding:60}}>
            <div className="spinner"/>
          </div>
        ) : classes.length === 0 ? (
          <div className="card" style={{textAlign:"center",padding:"50px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🏫</div>
            <h3 style={{fontSize:20,fontWeight:700,marginBottom:8}}>No classes yet</h3>
            <p style={{color:"var(--text2)",fontSize:14,marginBottom:20}}>
              Create your first class and share the name and password with your students.
            </p>
            <button className="btn btn-primary btn-lg" onClick={()=>setShowCreate(true)}>
              + Create Your First Class
            </button>
          </div>
        ) : (
          classes.map(cls=>(
            <ClassPanel key={cls.id} cls={cls}
              onAssign={handleAssign} onUnassign={handleUnassign}/>
          ))
        )}
      </div>
    </div>
  );
}
