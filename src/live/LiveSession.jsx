import { useState, useEffect, useRef } from "react";
import { setDoc, doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db, getTeacherClasses, onSessionChange } from "../core/firebase";
import Lesson01Session, { Lesson01TeacherView, Lesson01StudentView } from "../Lesson01Session";
import Lesson02Session, { Lesson02TeacherView, Lesson02StudentView } from "../Lesson02Session";
import Lesson03Session, { Lesson03TeacherView, Lesson03StudentView } from "../Lesson03Session";
import Lesson04Session, { Lesson04TeacherView, Lesson04StudentView } from "../Lesson04Session";
import Lesson05Session, { Lesson05TeacherView, Lesson05StudentView } from "../Lesson05Session";
import Lesson06Session, { Lesson06TeacherView, Lesson06StudentView } from "../Lesson06Session";
import Lesson07Session, { Lesson07TeacherView, Lesson07StudentView } from "../Lesson07Session";
import Lesson08Session, { Lesson08TeacherView, Lesson08StudentView } from "../Lesson08Session";
import Lesson09Session, { Lesson09TeacherView, Lesson09StudentView } from "../Lesson09Session";
import Lesson10Session, { Lesson10TeacherView, Lesson10StudentView } from "../Lesson10Session";
import Lesson11Session, { Lesson11TeacherView, Lesson11StudentView } from "../Lesson11Session";
import Lesson12Session, { Lesson12TeacherView, Lesson12StudentView } from "../Lesson12Session";
import Lesson13Session, { Lesson13TeacherView, Lesson13StudentView } from "../Lesson13Session";
import Lesson14Session, { Lesson14TeacherView, Lesson14StudentView } from "../Lesson14Session";
import Lesson15Session, { Lesson15TeacherView, Lesson15StudentView } from "../Lesson15Session";
import Lesson16Session, { Lesson16TeacherView, Lesson16StudentView } from "../Lesson16Session";
import Lesson17Session, { Lesson17TeacherView, Lesson17StudentView } from "../Lesson17Session";
import Lesson18Session, { Lesson18TeacherView, Lesson18StudentView } from "../Lesson18Session";

// Join a session by code (student flow)
async function findSessionByCode(code) {
  const q = query(collection(db, "sessions"), where("joinCode", "==", code.toUpperCase()));
  const snap = await import("firebase/firestore").then(m => m.getDocs(q));
  if (snap.empty) return null;
  return snap.docs[0].data();
}

async function joinSession(sessionId, uid, name) {
  const { updateDoc, doc: d } = await import("firebase/firestore");
  await updateDoc(d(db, "sessions", sessionId), {
    [`participants.${uid}`]: { name, uid, totalScore: 0, joinedAt: Date.now() },
  });
}

export default function LiveSession({ user, onHome }) {
  const [view, setView] = useState("menu");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);

  // Route existing session by type
  if (session && sessionId) {
    if (session.type === "lesson01") {
      return user.role === "teacher"
        ? <Lesson01TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson01StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson02") {
      return user.role === "teacher"
        ? <Lesson02TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson02StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson03") {
      return user.role === "teacher"
        ? <Lesson03TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson03StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson04") {
      return user.role === "teacher"
        ? <Lesson04TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson04StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson05") {
      return user.role === "teacher"
        ? <Lesson05TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson05StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson06") {
      return user.role === "teacher"
        ? <Lesson06TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson06StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson07") {
      return user.role === "teacher"
        ? <Lesson07TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson07StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson08") {
      return user.role === "teacher"
        ? <Lesson08TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson08StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson09") {
      return user.role === "teacher"
        ? <Lesson09TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson09StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson10") {
      return user.role === "teacher"
        ? <Lesson10TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson10StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson11") {
      return user.role === "teacher"
        ? <Lesson11TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson11StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson12") {
      return user.role === "teacher"
        ? <Lesson12TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson12StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson13") {
      return user.role === "teacher"
        ? <Lesson13TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson13StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson14") {
      return user.role === "teacher"
        ? <Lesson14TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson14StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson15") {
      return user.role === "teacher"
        ? <Lesson15TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson15StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson16") {
      return user.role === "teacher"
        ? <Lesson16TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson16StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson17") {
      return user.role === "teacher"
        ? <Lesson17TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson17StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
    if (session.type === "lesson18") {
      return user.role === "teacher"
        ? <Lesson18TeacherView session={session} sessionId={sessionId} uid={user.id} />
        : <Lesson18StudentView session={session} sessionId={sessionId} uid={user.id} />;
    }
  }

  // Lesson session views (teacher creates)
  if (view === "lesson01") return <Lesson01Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson02") return <Lesson02Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson03") return <Lesson03Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson04") return <Lesson04Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson05") return <Lesson05Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson06") return <Lesson06Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson07") return <Lesson07Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson08") return <Lesson08Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson09") return <Lesson09Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson10") return <Lesson10Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson11") return <Lesson11Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson12") return <Lesson12Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson13") return <Lesson13Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson14") return <Lesson14Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson15") return <Lesson15Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson16") return <Lesson16Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson17") return <Lesson17Session user={user} onHome={() => setView("menu")} />;
  if (view === "lesson18") return <Lesson18Session user={user} onHome={() => setView("menu")} />;

  // Student join flow
  if (view === "join") {
    const handleJoin = async () => {
      if (!joinCode.trim()) return;
      setJoining(true); setJoinError("");
      try {
        const sess = await findSessionByCode(joinCode.trim());
        if (!sess) { setJoinError("Session not found. Check the code and try again."); setJoining(false); return; }
        await joinSession(sess.id, user.id, user.name);
        setSessionId(sess.id);
        setView("session");
      } catch (e) { setJoinError("Error joining session."); }
      setJoining(false);
    };
    return (
      <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)",display:"flex",alignItems:"center",justifyContent:"center" }} className="dot-bg">
        <div style={{ maxWidth:420,width:"100%" }}>
          <div className="card" style={{ textAlign:"center" }}>
            <div style={{ fontSize:28,fontWeight:900,marginBottom:6 }}>Join a Session</div>
            <div style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Enter the 5-letter code from your teacher.</div>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCDE" maxLength={5}
              style={{ textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",width:"100%",letterSpacing:"0.2em",marginBottom:12 }}
              onKeyDown={e=>e.key==="Enter"&&handleJoin()} />
            {joinError && <div style={{ color:"var(--red)",fontSize:20,marginBottom:10 }}>{joinError}</div>}
            <button className="btn btn-primary btn-lg" style={{ width:"100%",fontSize:22,marginBottom:10 }}
              onClick={handleJoin} disabled={joining||joinCode.length<5}>
              {joining?"Joining...":"Join Session"}
            </button>
            <button className="btn btn-ghost" style={{ width:"100%",fontSize:20 }} onClick={()=>setView("menu")}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  // Menu
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:800,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>GCA</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>Live Sessions</div>
              <div style={{ color:"var(--text3)",fontSize:20 }}>Select a lesson to begin</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {user.role !== "teacher" && (
            <div className="card" onClick={() => setView("join")}
              style={{ cursor:"pointer",display:"flex",alignItems:"center",gap:16 }}>
              <div style={{ fontSize:20,fontWeight:800,color:"var(--green)",minWidth:44 }}>JOIN</div>
              <div>
                <div style={{ fontWeight:800,fontSize:20,marginBottom:4 }}>Join a Session</div>
                <div style={{ color:"var(--text2)",fontSize:20 }}>Enter a join code to participate in a live session.</div>
              </div>
            </div>
          )}

          {user.role === "teacher" && (
            <>
                  <div className="card" onClick={() => setView("lesson01")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L1</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(1) Column Addition and Subtraction</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Column addition and subtraction with and without carrying/borrowing.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson02")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L2</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(2) Geometry</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Perimeter, area, composite shapes, and unit conversion.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson03")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L3</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(3) Multiplication, Division and Area</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Round numbers, column multiplication, long division, rectangle and composite area.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson04")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L4</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(4) Properties, Exponents, Roots and Order of Operations</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Division with zero, powers, square and cube roots, order of operations, variable expressions.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson05")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L5</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(5) Signed Numbers</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Comparing signed numbers, absolute value, multiple minus signs, and signed operations.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson06")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L6</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(6) Expressions and Properties</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Multiple signed numbers, distributive property, combining like terms, product rule.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson07")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L7</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(7) Signed Multiplication, Powers, and Roots</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Signs of products, negative base powers, roots of negatives, signed OoO and variable expressions.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson08")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L8</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(8) Equations and Speed/Distance/Time</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>One-step equations, expression vs equation, identifying solutions, and d = s-t problems.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson09")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L9</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(9) Two-Step Equations and More</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Two-step equations, distributive property, rectangle missing sides, and power equations.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson10")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L10</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(10) Linear Equations</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Multiple variable occurrences, variables on both sides, no solution, and radical equations.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson11")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L11</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(11) Inequalities</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Solution sets, number lines, solving inequalities, sign flips, and special cases.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson12")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L12</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(12) Divisibility & Prime Factorization</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Divisibility rules for 2-10, prime/composite numbers, and prime factorization.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson13")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L13</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(13) Factors, Multiples, GCF & LCM</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Factor pairs, multiples, GCF and LCM by listing and prime factorization, word problems.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson14")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L14</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(14) Introduction to Fractions</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Fraction pictures, classification, number lines, conversions, equivalent fractions, and simplification.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson15")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L15</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(15) Adding and Subtracting Fractions</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Common denominators, different denominators, mixed numbers, carrying, borrowing, and negatives.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson16")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L16</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(16) Multiplying and Dividing Fractions</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Cross cancellation, reciprocals, dividing fractions, and mixed numbers.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson17")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L17</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(17) Quotient Rule, Factoring GCF, and Solving Equations</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Dividing algebraic expressions, factoring GCF, solving equations with fractional coefficients.</div>
                    </div>
                  </div>
                  <div className="card" onClick={() => setView("lesson18")}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--blue)", minWidth: 36 }}>L18</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>(18) Decimals: Place Value, Operations, and Metric Length</div>
                      <div style={{ color: "var(--text2)", fontSize: 20 }}>Place value, fractions, add/subtract/multiply decimals, metric length conversions.</div>
                    </div>
                  </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

