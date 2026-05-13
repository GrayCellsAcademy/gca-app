import { useState, useEffect } from "react";
import { getAllUsers, getAllClasses, deleteUser, resetPassword } from "../core/firebase";

export default function DevHome({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [roleFilter, setRoleFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [showPasswords, setShowPasswords] = useState(false);

  const load = async () => {
    setLoading(true);
    const [u, c] = await Promise.all([getAllUsers(), getAllClasses()]);
    setUsers(u);
    setClasses(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleResetPassword = async (email, name) => {
    if (!confirm(`Send password reset email to ${name} (${email})?`)) return;
    try {
      await resetPassword(email);
      alert(`Reset email sent to ${email}`);
    } catch(e) {
      alert("Failed: " + e.message);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!uid) { alert("Error: no user ID found."); return; }
    if (!confirm("Delete this user? This removes their Firestore data.\n\nUID: " + uid)) return;
    try {
      await deleteUser(uid);
      alert("Deleted successfully.");
      load();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const students = users.filter(u => u.role === "student");
  const teachers = users.filter(u => u.role === "teacher");
  const devs = users.filter(u => u.role === "developer");

  // Filter users by role and class
  const filteredUsers = users.filter(u => {
    const roleOk = roleFilter === "all" || u.role === roleFilter;
    const classOk = classFilter === "all" || (u.classIds || []).includes(classFilter);
    return roleOk && classOk;
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users",    label: `Users (${users.length})` },
    { id: "classes",  label: `Classes (${classes.length})` },
  ];

  const roleBadge = (role) => ({
    developer: "tag-draft",
    teacher:   "tag-reading",
    student:   "tag-math",
  }[role] || "tag-draft");

  const btnStyle = (active) => ({
    padding: "7px 16px", borderRadius: "var(--radius-sm)", border: "none",
    background: active ? "var(--purple)" : "var(--surface2)",
    color: active ? "#fff" : "var(--text2)",
    fontFamily: "var(--font)", fontWeight: 700, fontSize: 20, cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--purple),var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>GCA</div>
              <div style={{ color: "var(--purple)", fontSize: 20, fontWeight: 600 }}>Developer Console</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{user.name}</div>
              <div style={{ color: "var(--purple)", fontSize: 20, fontWeight: 600 }}>Developer</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>{loading ? "..." : "Refresh"}</button>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: "var(--radius)", padding: 4, marginBottom: 24, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "9px 18px", borderRadius: "var(--radius-sm)", border: "none", background: tab === t.id ? "var(--purple)" : "transparent", color: tab === t.id ? "#fff" : "var(--text2)", fontFamily: "var(--font)", fontWeight: 600, fontSize: 20, cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        ) : (
          <>
            {/* Overview */}
            {tab === "overview" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
                  {[
                    { label: "Total Users",  value: users.length,    color: "var(--blue)"   },
                    { label: "Students",     value: students.length,  color: "var(--green)"  },
                    { label: "Teachers",     value: teachers.length,  color: "var(--orange)" },
                    { label: "Developers",   value: devs.length,      color: "var(--purple)" },
                    { label: "Classes",      value: classes.length,   color: "var(--cyan)"   },
                  ].map(stat => (
                    <div key={stat.label} className="card" style={{ borderLeft: `3px solid ${stat.color}`, padding: "18px 20px" }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
                      <div style={{ color: "var(--text2)", fontSize: 20, fontWeight: 600 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>Classes Summary</h3>
                  {classes.map(c => {
                    const teacher = users.find(u => u.id === c.teacherId);
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700, fontSize: 20 }}>{c.name}</div>
                        <div style={{ color: "var(--text3)", fontSize: 20 }}>{teacher?.name || "Unknown teacher"}</div>
                        <div style={{ color: "var(--text3)", fontSize: 20 }}>{c.studentIds?.length || 0} students</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--blue)", fontWeight: 700 }}>{c.password}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Users */}
            {tab === "users" && (
              <div className="card" style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>All Users</h3>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Role filter */}
                    {["all","student","teacher","developer"].map(r => {
                      const count = r === "all" ? users.length : users.filter(u => u.role === r).length;
                      return (
                        <button key={r} onClick={() => setRoleFilter(r)} style={btnStyle(roleFilter === r)}>
                          {r === "all" ? "All" : r.charAt(0).toUpperCase()+r.slice(1)}s ({count})
                        </button>
                      );
                    })}
                    {/* Class filter */}
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                      style={{ padding: "7px 12px", fontSize: 20, borderRadius: "var(--radius-sm)", border: "1px solid var(--border2)", background: "var(--bg2)", fontFamily: "var(--font)", color: "var(--text)" }}>
                      <option value="all">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 12 }}>
                  Showing {filteredUsers.length} of {users.length} users
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Class(es)</th>
                      <th>UID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const userClasses = classes.filter(c => (u.classIds || []).includes(c.id));
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600, fontSize: 20 }}>{u.name}</td>
                          <td style={{ color: "var(--text2)", fontSize: 19 }}>{u.email}</td>
                          <td>
                            <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span>
                          </td>
                          <td style={{ fontSize: 19, color: "var(--text2)" }}>
                            {userClasses.length === 0 ? "-" : userClasses.map(c => c.name).join(", ")}
                          </td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: 17, color: "var(--text3)" }}>
                            {u.id?.slice(0, 12)}...
                          </td>
                          <td>
                            <div style={{ display:"flex", gap:6 }}>
                              {u.email && (
                                <button className="btn btn-ghost btn-sm"
                                  style={{ color:"var(--blue)", borderColor:"var(--blue)", fontSize:18 }}
                                  onClick={() => handleResetPassword(u.email, u.name)}>
                                  Reset PW
                                </button>
                              )}
                              {u.id !== user.id && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)}>Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Classes */}
            {tab === "classes" && (
              <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>All Classes</h3>
                  <button onClick={() => setShowPasswords(p => !p)}
                    style={{ ...btnStyle(showPasswords), background: showPasswords ? "var(--orange)" : "var(--surface2)", color: showPasswords ? "#fff" : "var(--text2)" }}>
                    {showPasswords ? "Hide Passwords" : "Show Passwords"}
                  </button>
                </div>
                {classes.length === 0 ? (
                  <p style={{ color: "var(--text3)", fontSize: 20 }}>No classes yet.</p>
                ) : classes.map(c => {
                  const teacher = users.find(u => u.id === c.teacherId);
                  const enrolledStudents = users.filter(u => (c.studentIds || []).includes(u.id));
                  return (
                    <div key={c.id} className="card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 22 }}>{c.name}</div>
                          <div style={{ color: "var(--text3)", fontSize: 20 }}>Teacher: {teacher?.name || "Unknown"} &nbsp;-&nbsp; {enrolledStudents.length} students</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ fontSize: 20, color: "var(--text3)" }}>Password:</div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 800, color: showPasswords ? "var(--blue)" : "var(--text3)", filter: showPasswords ? "none" : "blur(4px)", userSelect: showPasswords ? "text" : "none", transition: "filter 0.2s" }}>
                            {c.password}
                          </div>
                        </div>
                      </div>

                      {/* Assigned topics */}
                      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>
                        {(c.assignedTopics || []).length === 0 ? "No assigned topics" : `${(c.assignedTopics || []).length} assigned topics`}
                      </div>

                      {/* Student list */}
                      {enrolledStudents.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {enrolledStudents.map(s => (
                            <div key={s.id} style={{ background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: "4px 12px", fontSize: 19, fontWeight: 600 }}>
                              {s.name}
                              {showPasswords && s.email && <span style={{ color: "var(--text3)", marginLeft: 6, fontSize: 18 }}>{s.email}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
