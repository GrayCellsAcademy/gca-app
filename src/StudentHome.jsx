import { useState, useEffect } from "react";
import { getClass, getProgress, leaveClass, joinClass } from "./firebase";
import { ADDITION_TOPIC_ID, TIER_COLORS } from "./additionTables";
import AdditionTablesPlayer from "./AdditionTablesPlayer";

function TopicCard({ topic, progress, onClick }) {
  const mastered = progress?.masteredTiers?.length || 0;
  const total = 9;
  const pct = Math.round((mastered / total) * 100);
  const completed = progress?.completed;

  return (
    <div onClick={onClick}
      style={{
        background:"var(--surface)",border:"1px solid var(--border)",
        borderRadius:"var(--radius-lg)",padding:"20px 24px",cursor:"pointer",
        transition:"all 0.2s",position:"relative",overflow:"hidden"
      }}
      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>

      {/* Subject tag */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span className={`badge tag-${topic.subject}`}>{topic.subject}</span>
        {completed && <span style={{fontSize:18}}>🏆</span>}
      </div>

      <h3 style={{fontSize:18,fontWeight:800,marginBottom:4}}>{topic.title}</h3>
      <p style={{color:"var(--text2)",fontSize:13,marginBottom:16,lineHeight:1.6}}>
        {topic.description}
      </p>

      {/* Progress */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,
          color:"var(--text3)",marginBottom:6}}>
          <span>{mastered}/{total} tiers mastered</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill"
            style={{width:`${pct}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))"}}/>
        </div>
      </div>

      {/* Tier dots */}
      <div style={{display:"flex",gap:4}}>
        {Array.from({length:total},(_,i)=>i+1).map(t=>(
          <div key={t} style={{
            flex:1,height:4,borderRadius:99,
            background:(progress?.masteredTiers||[]).includes(t)
              ? TIER_COLORS[t]
              : "var(--surface2)",
            transition:"background 0.3s"
          }}/>
        ))}
      </div>

      <div style={{marginTop:14}}>
        <button className="btn btn-primary btn-sm">
          {mastered === 0 ? "Start →" : completed ? "Review →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

export default function StudentHome({ user, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState({});
  const [playingTopic, setPlayingTopic] = useState(null);
  const [screen, setScreen] = useState("home");
  const [joinClassName, setJoinClassName] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      // Load classes the student is in
      const userClasses = await Promise.all(
        (user.classIds||[]).map(id=>getClass(id))
      );
      const validClasses = userClasses.filter(Boolean);
      setClasses(validClasses);

      // Collect assigned topics across all classes
      const topicIds = [...new Set(validClasses.flatMap(c=>c.assignedTopics||[]))];

      // For now, addition tables is always available if assigned
      // Load progress for each topic
      const additionTopics = [];
      if (topicIds.includes(ADDITION_TOPIC_ID)) {
        additionTopics.push({
          id: ADDITION_TOPIC_ID,
          title: "Addition Tables",
          subject: "math",
          description: "Master single-digit addition mentally and quickly — the foundation of all arithmetic.",
          gradeLevel: "6+",
        });
      }
      setTopics(additionTopics);

      // Load progress
      const progMap = {};
      for (const tid of topicIds) {
        const p = await getProgress(user.id, tid);
        if (p) progMap[tid] = p;
      }
      setProgress(progMap);
      setLoading(false);
    };
    load();
  },[user]);

  const doJoinClass = async () => {
    if (!joinClassName.trim()||!joinPass.trim()) { setJoinErr("Please fill in both fields."); return; }
    try {
      setJoinErr("");
      await joinClass(user.id, joinClassName.trim(), joinPass.trim());
      window.location.reload();
    } catch(e) { setJoinErr(e.message||"Class not found or wrong password."); }
  };

  if (playingTopic === ADDITION_TOPIC_ID) {
    return (
      <div style={{minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)"}} className="dot-bg">
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{
                width:36,height:36,borderRadius:10,
                background:"linear-gradient(135deg,var(--blue),var(--cyan))",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:18
              }}>🎓</div>
              <span style={{fontWeight:800,fontSize:18}}>GCA</span>
            </div>
            <button className="btn btn-ghost btn-sm"
              onClick={()=>{ window.speechSynthesis?.cancel(); setPlayingTopic(null); }}>
              ← Back to Dashboard
            </button>
          </div>
          <AdditionTablesPlayer user={user} onHome={()=>{ window.speechSynthesis?.cancel(); setPlayingTopic(null); window.location.reload(); }}/>
        </div>
      </div>
    );
  }

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
              <div style={{color:"var(--text3)",fontSize:12}}>Gray Cells Academy</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:15}}>{user.name}</div>
              <div style={{color:"var(--text3)",fontSize:12}}>Student</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log Out</button>
          </div>
        </div>

        {/* Welcome */}
        <div style={{marginBottom:32,animation:"fadeUp 0.35s ease"}}>
          <h1 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:900,letterSpacing:"-0.5px",marginBottom:6}}>
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p style={{color:"var(--text2)",fontSize:15}}>
            {topics.length>0 ? "Pick up where you left off." : "You don't have any assigned topics yet. Join a class to get started."}
          </p>
        </div>

        {loading ? (
          <div style={{display:"flex",justifyContent:"center",padding:60}}>
            <div className="spinner"/>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>

            {/* Topics */}
            <div>
              {topics.length > 0 ? (
                <>
                  <h2 style={{fontSize:16,fontWeight:700,color:"var(--text2)",
                    textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>
                    Your Topics
                  </h2>
                  <div style={{display:"grid",gap:14}}>
                    {topics.map(t=>(
                      <TopicCard key={t.id} topic={t} progress={progress[t.id]}
                        onClick={()=>setPlayingTopic(t.id)}/>
                    ))}
                  </div>
                </>
              ) : (
                <div className="card" style={{textAlign:"center",padding:"40px 20px"}}>
                  <div style={{fontSize:48,marginBottom:12}}>📭</div>
                  <h3 style={{fontSize:18,fontWeight:700,marginBottom:8}}>No topics assigned yet</h3>
                  <p style={{color:"var(--text2)",fontSize:14}}>
                    Join a class and your teacher will assign topics for you to work on.
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Classes */}
              <div className="card" style={{padding:"18px 20px"}}>
                <h3 style={{fontSize:14,fontWeight:700,color:"var(--text2)",
                  textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>
                  My Classes
                </h3>
                {classes.length === 0 ? (
                  <p style={{color:"var(--text3)",fontSize:13}}>Not enrolled in any class.</p>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {classes.map(c=>(
                      <div key={c.id} style={{
                        background:"var(--bg2)",borderRadius:"var(--radius-sm)",
                        padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"
                      }}>
                        <span style={{fontWeight:600,fontSize:14}}>{c.name}</span>
                        <button className="btn btn-ghost btn-sm"
                          style={{fontSize:11,padding:"3px 8px",color:"var(--red)",borderColor:"var(--red)"}}
                          onClick={async()=>{ await leaveClass(user.id,c.id); window.location.reload(); }}>
                          Leave
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Join class */}
                <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:10}}>
                    Join a class
                  </div>
                  {joinErr&&<div style={{fontSize:12,color:"#fca5a5",marginBottom:8}}>{joinErr}</div>}
                  <input value={joinClassName} onChange={e=>setJoinClassName(e.target.value)}
                    placeholder="Class name" style={{fontSize:13,padding:"9px 12px",marginBottom:8}}/>
                  <input value={joinPass} onChange={e=>setJoinPass(e.target.value)}
                    placeholder="Class password" style={{fontSize:13,padding:"9px 12px",marginBottom:10}}/>
                  <button className="btn btn-primary" style={{width:"100%",fontSize:13,padding:"9px"}}
                    onClick={doJoinClass}>
                    Join Class 🏫
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
