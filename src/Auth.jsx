import { useState } from "react";
import { registerUser, loginUser, DEV_CODE } from "../firebase";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");
  const [working, setWorking] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email.trim() || !password.trim()) { setErr("Please enter your email and password."); return; }
    if (mode === "signup" && !name.trim()) { setErr("Please enter your name."); return; }
    if (mode === "signup" && password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (mode === "signup" && role === "developer" && devCode !== DEV_CODE) {
      setErr("Invalid developer code."); return;
    }
    setWorking(true);
    try {
      if (mode === "signup") {
        await registerUser(email.trim(), password, name.trim(), role);
      } else {
        await loginUser(email.trim(), password);
      }
    } catch(e) {
      setErr(
        e.message.includes("email-already-in-use") ? "That email is already registered. Try logging in." :
        e.message.includes("invalid-email") ? "Please enter a valid email address." :
        e.message.includes("wrong-password") || e.message.includes("invalid-credential") ? "Incorrect email or password." :
        "Something went wrong. Please try again."
      );
    }
    setWorking(false);
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"var(--bg)", padding:"20px", position:"relative", overflow:"hidden"
    }} className="dot-bg">

      {/* Background glow */}
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",
        width:600,height:600,background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)",
        pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:420,animation:"fadeUp 0.4s ease both"}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:56,height:56,borderRadius:16,
            background:"linear-gradient(135deg,var(--blue),var(--cyan))",
            fontSize:26,marginBottom:14,boxShadow:"0 8px 24px rgba(59,130,246,0.4)"
          }}>🎓</div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:"-0.5px",marginBottom:4}}>
            GCA
          </h1>
          <p style={{color:"var(--text2)",fontSize:14}}>Gray Cells Academy</p>
        </div>

        <div className="card" style={{boxShadow:"0 24px 48px rgba(0,0,0,0.4)"}}>

          {/* Tab toggle */}
          <div style={{
            display:"flex",background:"var(--bg2)",borderRadius:"var(--radius)",
            padding:4,marginBottom:24,gap:4
          }}>
            {[["login","Log In"],["signup","Sign Up"]].map(([m,label])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");}}
                style={{
                  flex:1,padding:"10px",borderRadius:"var(--radius-sm)",border:"none",
                  background:mode===m?"var(--blue)":"transparent",
                  color:mode===m?"#fff":"var(--text2)",
                  fontFamily:"var(--font)",fontWeight:700,fontSize:14,cursor:"pointer",
                  transition:"all 0.2s"
                }}>
                {label}
              </button>
            ))}
          </div>

          {err && (
            <div style={{
              background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",
              borderRadius:"var(--radius-sm)",padding:"10px 14px",marginBottom:16,
              fontSize:13,color:"#fca5a5"
            }}>{err}</div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {mode==="signup" && (
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="Your full name" autoFocus/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Email address" type="email"
              autoFocus={mode==="login"}/>
            <input value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Password" type="password"
              onKeyDown={e=>e.key==="Enter"&&submit()}/>

            {mode==="signup" && (
              <>
                <div style={{marginTop:4}}>
                  <div style={{fontSize:13,color:"var(--text2)",marginBottom:10,fontWeight:600}}>
                    I am a…
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[["student","🎒 Student"],["teacher","📋 Teacher"],["developer","⚙️ Developer"]].map(([r,label])=>(
                      <button key={r} onClick={()=>setRole(r)}
                        style={{
                          flex:1,padding:"10px 6px",borderRadius:"var(--radius-sm)",
                          border:`1.5px solid ${role===r?"var(--blue)":"var(--border2)"}`,
                          background:role===r?"rgba(59,130,246,0.15)":"transparent",
                          color:role===r?"var(--blue)":"var(--text2)",
                          fontFamily:"var(--font)",fontWeight:600,fontSize:13,cursor:"pointer",
                          transition:"all 0.15s"
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {role==="developer" && (
                  <input value={devCode} onChange={e=>setDevCode(e.target.value)}
                    placeholder="Developer access code" type="password"/>
                )}
              </>
            )}

            <button onClick={submit} disabled={working}
              className="btn btn-primary btn-lg"
              style={{marginTop:8,opacity:working?0.7:1,width:"100%"}}>
              {working ? "Please wait…" : mode==="login" ? "Log In →" : "Create Account →"}
            </button>
          </div>

          {mode==="login" && (
            <p style={{textAlign:"center",marginTop:16,fontSize:13,color:"var(--text3)"}}>
              Don't have an account?{" "}
              <span style={{color:"var(--blue)",cursor:"pointer",fontWeight:600}}
                onClick={()=>{setMode("signup");setErr("");}}>
                Sign up
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
