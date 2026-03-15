import { useState, useEffect } from "react";
import { getAllUsers, getAllClasses, deleteUser, getProgress } from "../firebase";
import { ADDITION_TOPIC_ID } from "./additionTables";

export default function DevHome({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | users | classes

  const load = async () => {
    setLoading(true);
    const [u, c] = await Promise.all([getAllUsers(), getAllClasses()]);
    setUsers(u);
    setClasses(c);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const handleDeleteUser = async (uid) => {
    if (!confirm("Delete this user's data from Firestore? (Auth account stays — delete that separately in Firebase Console)")) return;
    await deleteUser(uid);
    load();
  };

  const students = users.filter(u=>u.role==="student");
  const teachers = users.filter(u=>u.role==="teacher");
  const devs = users.filter(u=>u.role==="developer");

  const tabs = [
    {id:"overview",label:"Overview"},
    {id:"users",label:`Users (${users.length})`},
    {id:"classes",label:`Classes (${classes.length})`},
  ];

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)"}} className="dot-bg">
      <div style={{maxWidth:1100,margin:"0 auto"}}>

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:40,height:40,borderRadius:12,
              background:"linear-gradient(135deg,var(--purple),var(--blue))",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20
            }}>⚙️</div>
            <div>
              <div style={{fontWeight:800,fontSize:20}}>GCA</div>
              <div style={{color:"var(--purple)",fontSize:12,fontWeight:600}}>Developer Console</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:15}}>{user.name}</div>
              <div style={{color:"var(--purple)",fontSize:12,fontWeight:600}}>Developer</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,background:"var(--surface)",borderRadius:"var(--radius)",
          padding:4,marginBottom:24,width:"fit-content"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{
                padding:"9px 18px",borderRadius:"var(--radius-sm)",border:"none",
                background:tab===t.id?"var(--purple)":"transparent",
                color:tab===t.id?"#fff":"var(--text2)",
                fontFamily:"var(--font)",fontWeight:600,fontSize:13,cursor:"pointer",
                transition:"all 0.15s"
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{display:"flex",justifyContent:"center",padding:60}}>
            <div className="spinner"/>
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab==="overview" && (
              <div style={{animation:"fadeUp 0.3s ease"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:28}}>
                  {[
                    {label:"Total Users",value:users.length,color:"var(--blue)",icon:"👥"},
                    {label:"Students",value:students.length,color:"var(--green)",icon:"🎒"},
                    {label:"Teachers",value:teachers.length,color:"var(--amber)",icon:"📋"},
                    {label:"Classes",value:classes.length,color:"var(--cyan)",icon:"🏫"},
                  ].map(stat=>(
                    <div key={stat.label} className="card" style={{
                      borderLeft:`3px solid ${stat.color}`,padding:"18px 20px"
                    }}>
                      <div style={{fontSize:24,marginBottom:8}}>{stat.icon}</div>
                      <div style={{fontSize:32,fontWeight:900,color:stat.color,marginBottom:2}}>
                        {stat.value}
                      </div>
                      <div style={{color:"var(--text2)",fontSize:13,fontWeight:600}}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Published Topics</h3>
                  <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                    background:"var(--bg2)",borderRadius:"var(--radius)"}}>
                    <div style={{
                      width:36,height:36,borderRadius:10,background:"rgba(59,130,246,0.2)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:18
                    }}>➕</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15}}>Addition Tables</div>
                      <div style={{color:"var(--text2)",fontSize:12}}>Math · Tiers 1–9 · 6+</div>
                    </div>
                    <span className="badge tag-published">Published</span>
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {tab==="users" && (
              <div className="card" style={{animation:"fadeUp 0.3s ease"}}>
                <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>All Users</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Classes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u=>(
                      <tr key={u.id}>
                        <td style={{fontWeight:600}}>{u.name}</td>
                        <td style={{color:"var(--text2)",fontSize:13}}>{u.email}</td>
                        <td>
                          <span className={`badge ${
                            u.role==="developer"?"tag-draft":
                            u.role==="teacher"?"tag-reading":"tag-math"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{color:"var(--text2)",fontSize:13}}>
                          {(u.classIds||[]).length}
                        </td>
                        <td>
                          {u.id !== user.id && (
                            <button className="btn btn-danger btn-sm"
                              onClick={()=>handleDeleteUser(u.id)}>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Classes */}
            {tab==="classes" && (
              <div className="card" style={{animation:"fadeUp 0.3s ease"}}>
                <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>All Classes</h3>
                {classes.length===0 ? (
                  <p style={{color:"var(--text3)",fontSize:14}}>No classes yet.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Class Name</th>
                        <th>Teacher</th>
                        <th>Students</th>
                        <th>Assigned Topics</th>
                        <th>Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map(c=>{
                        const teacher = users.find(u=>u.id===c.teacherId);
                        return (
                          <tr key={c.id}>
                            <td style={{fontWeight:600}}>{c.name}</td>
                            <td style={{color:"var(--text2)",fontSize:13}}>
                              {teacher?.name||"Unknown"}
                            </td>
                            <td style={{color:"var(--text2)",fontSize:13}}>
                              {c.studentIds?.length||0}
                            </td>
                            <td style={{fontSize:13}}>
                              {(c.assignedTopics||[]).length===0
                                ? <span style={{color:"var(--text3)"}}>None</span>
                                : c.assignedTopics.join(", ")}
                            </td>
                            <td style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text3)"}}>
                              {c.password}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
