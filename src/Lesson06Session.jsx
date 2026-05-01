import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON06_TOPICS, generateLesson06Question, gradeLesson06Answer,
} from "./lesson06Questions";

const POINTS = 5;

// - KaTeX -
function useKaTeX() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

function KaTeX({ expr, display }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      const tryRender = () => {
        if (window.katex) {
          try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: !!display }); }
          catch {}
        } else {
          setTimeout(tryRender, 100);
        }
      };
      tryRender();
    }
  });
  return <span ref={ref} style={{ fontSize: display ? 28 : "inherit" }} />;
}

function KaTeXBlock({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      const tryRender = () => {
        if (window.katex) {
          try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); }
          catch {}
        } else {
          setTimeout(tryRender, 100);
        }
      };
      tryRender();
    }
  });
  return <div ref={ref} style={{ fontSize: 28, margin: "8px 0", minHeight: 40 }} />;
}

// - Composite Shape SVG (same as L4) -
function RectilinearSVG({ question, revealCorrect }) {
  const { vertices, sides, unit, hideIndices, shape } = question;
  const hiddenSet = new Set(hideIndices || []);
  if (!vertices) return null;
  const W = 400, H = 360;
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W-120)/(maxX-minX||1),(H-120)/(maxY-minY||1));
  const offX = (W-(maxX-minX)*scale)/2, offY = (H-(maxY-minY)*scale)/2;
  const sv = vertices.map(v=>({ x:(v.x-minX)*scale+offX, y:(v.y-minY)*scale+offY }));
  const n = sv.length;
  const cx2 = sv.reduce((s,p)=>s+p.x,0)/n, cy2 = sv.reduce((s,p)=>s+p.y,0)/n;
  const mids = sv.map((p,i)=>({ x:(p.x+sv[(i+1)%n].x)/2, y:(p.y+sv[(i+1)%n].y)/2 }));
  const pathD = sv.map((p,i)=>(i===0?"M":"L")+" "+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ")+" Z";
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%",maxWidth:400,display:"block",margin:"0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p,i) => {
        const next=sv[(i+1)%n];
        const m=mids[i];
        const ex=next.x-p.x,ey=next.y-p.y,el=Math.sqrt(ex*ex+ey*ey)||1;
        const perpX=-ey/el,perpY=ex/el;
        const outDir=(m.x-cx2)*perpX+(m.y-cy2)*perpY>0?1:-1;
        const lx=m.x+perpX*outDir*20,ly=m.y+perpY*outDir*20;
        const isHidden=hiddenSet.has(i);
        const showQ=isHidden&&!revealCorrect;
        const sideLen=sides&&sides[i]?sides[i].length:"?";
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="var(--blue)" strokeWidth="2.5" />
            <rect x={lx-32} y={ly-14} width={64} height={28} rx={5}
              fill={showQ?"rgba(251,191,36,0.15)":"var(--bg2)"}
              stroke={showQ?"var(--amber)":isHidden?"var(--green)":"var(--border)"} strokeWidth="1" />
            <text x={lx} y={ly+6} textAnchor="middle" fontSize="20" fontWeight="700"
              fill={showQ?"#7c3aed":isHidden?"var(--green)":"var(--text)"} fontFamily="var(--mono)">
              {showQ?"?":sideLen+unit}
            </text>
          </g>
        );
      })}
      <text x={W/2} y={H-8} textAnchor="middle" fontSize="20" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

// - Question Display -
function QuestionDisplay({ question, revealCorrect }) {
  useKaTeX();
  if (!question) return null;
  const q = question;

  if (q.type === "warmup-a") {
    return <RectilinearSVG question={q} revealCorrect={revealCorrect} />;
  }
  if (q.type === "warmup-b" || q.type === "warmup-c" || q.type === "multiple-signed") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }
  if (q.type === "distributive") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }
  if (q.type === "combine-like-terms") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }
  if (q.type === "product-rule") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }
  return null;
}

// - Reveal -
function RevealCalculation({ question }) {
  useKaTeX();
  if (!question) return null;
  const q = question;
  if (q.type === "warmup-a") {
    return (
      <div style={{ fontSize:20,color:"var(--text2)",marginTop:8 }}>
        {q.missingAnswers&&q.missingAnswers.map((ma,i)=>(
          <div key={i}>Missing side {i+1}: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{ma.length}{q.unit}</strong></div>
        ))}
        <div>Perimeter: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.perimeter}{q.unit}</strong></div>
        <div style={{ fontFamily:"var(--mono)",marginTop:4 }}>{q.splitExplanation} sq {q.unit}</div>
      </div>
    );
  }
  if (q.type === "distributive" || q.type === "combine-like-terms" || q.type === "product-rule") {
    return (
      <div style={{ marginTop:8 }}>
        <KaTeXBlock expr={q.latexAnswer || q.answer} />
      </div>
    );
  }
  return null;
}

// - Answer Inputs -
function WarmupAAnswerInput({ question, onSubmit, submitted }) {
  const [perim, setPerim] = useState(""), [area, setArea] = useState("");
  const ref = useRef(null);
  useEffect(() => { setPerim(""); setArea(""); setTimeout(()=>ref.current?.focus(),100); }, [question?.id]);
  const unit = question.unit;
  const handleSubmit = () => {
    if (!perim||!area) return;
    onSubmit(JSON.stringify({ perimeter:parseInt(perim),area:parseInt(area) }));
  };
  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>Enter perimeter and area (units: {unit})</div>
      <div style={{ display:"flex",gap:8,marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20,color:"var(--text3)",marginBottom:2 }}>Perimeter ({unit})</div>
          <input ref={ref} value={perim} onChange={e=>setPerim(e.target.value)} inputMode="numeric" disabled={submitted}
            style={{ width:"100%",fontSize:20,fontFamily:"var(--mono)",padding:"8px 10px" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20,color:"var(--text3)",marginBottom:2 }}>Area (sq {unit})</div>
          <input value={area} onChange={e=>setArea(e.target.value)} inputMode="numeric" disabled={submitted}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
            style={{ width:"100%",fontSize:20,fontFamily:"var(--mono)",padding:"8px 10px" }} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleSubmit}
        disabled={submitted||!perim||!area}>Submit</button>
    </div>
  );
}

function NumericInput({ onSubmit, submitted, allowNeg }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  const pattern = allowNeg ? /[^0-9\-]/ : /[^0-9]/;
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(pattern,""))}
        onKeyDown={e=>e.key==="Enter"&&submit()} inputMode={allowNeg?"text":"numeric"}
        placeholder="" disabled={submitted}
        style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }} />
      <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

function AlgebraInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>
        Enter answer (e.g. {placeholder||"6x+2"}). Use lowercase letters.
      </div>
      <div style={{ display:"flex",gap:8 }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()} disabled={submitted}
          style={{ flex:1,fontSize:22,fontFamily:"var(--mono)",padding:"10px" }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 18px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
          disabled={submitted||!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// Like terms click-to-group input
function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t==="warmup-a") return <WarmupAAnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="warmup-b") return <NumericInput onSubmit={onSubmit} submitted={submitted} />;
  if (t==="warmup-c"||t==="multiple-signed") return <NumericInput onSubmit={onSubmit} submitted={submitted} allowNeg />;
  if (t==="distributive"||t==="combine-like-terms") return <AlgebraInput onSubmit={onSubmit} submitted={submitted} placeholder={question.answer} />;
  if (t==="product-rule") return <AlgebraInput onSubmit={onSubmit} submitted={submitted} placeholder={question.answer} />;
  return <NumericInput onSubmit={onSubmit} submitted={submitted} />;
}

// - Timer bar -
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const left = Math.max(0,Math.ceil((endsAt-Date.now())/1000));
      setRemaining(left);
      if (left===0&&!expiredRef.current) { expiredRef.current=true; onExpired?.(); }
    };
    tick();
    const id = setInterval(tick,500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0,(remaining/totalSeconds)*100);
  const color = remaining<=5?"var(--red)":remaining<=10?"var(--amber)":"var(--green)";
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:20,color:"var(--text3)",marginBottom:4 }}>
        <span>Time remaining</span><span style={{ fontWeight:700,color,fontSize:22 }}>{remaining}s</span>
      </div>
      <div style={{ height:7,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
        <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:99,transition:"width 0.5s linear" }} />
      </div>
    </div>
  );
}

// - Teacher view -
function TeacherLesson06({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(120);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON06_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]); revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateLesson06Question(currentTopic.id);
    const qId = "q_"+Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false; setAnswers([]);
    await updateDoc(doc(db,"sessions",sessionId), {
      status:"question", currentQuestion:q,
      timerSeconds:timerInput, timerEndsAt:Date.now()+timerInput*1000,
      questionCount:(session.questionCount||0)+1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer!==undefined&&gradeLesson06Answer(ans.answer,question)) {
        await addToScore(sessionId,ans.uid,POINTS);
      }
    }
    await updateDoc(doc(db,"sessions",sessionId),{ status:"revealing" });
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx+1,LESSON06_TOPICS.length-1);
    setCurrentTopicIdx(nextIdx);
    const q = generateLesson06Question(LESSON06_TOPICS[nextIdx].id);
    const qId = "q_"+Date.now().toString(36);
    q.id=qId; q.points=POINTS;
    revealedRef.current=false; setAnswers([]);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question",currentQuestion:q,
      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
      questionCount:(session.questionCount||0)+1,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db,"sessions",sessionId),{ status:"ended" });
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a=>gradeLesson06Answer(a.answer,question)).length;

  return (
    <div style={{ maxWidth:1100,margin:"0 auto" }}>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:20,color:"var(--text3)",marginBottom:2 }}>Join Code</div>
            <div style={{ fontSize:36,fontWeight:900,fontFamily:"var(--mono)",color:"var(--blue)",letterSpacing:"0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize:20,color:"var(--text3)" }}>{totalStudents} student{totalStudents!==1?"s":""} joined</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <label style={{ fontSize:20,color:"var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput} onChange={e=>setTimerInput(Number(e.target.value))}
                style={{ width:70,padding:"6px 10px",fontSize:20,textAlign:"center" }} />
            </div>
            {session.status==="question"&&<button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status==="revealing"&&(
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat Topic</button>
                {currentTopicIdx<LESSON06_TOPICS.length-1&&(
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next: {LESSON06_TOPICS[currentTopicIdx+1].label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color:"var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"240px 1fr",gap:16,alignItems:"start" }}>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
          <div style={{ fontSize:20,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4 }}>Topic</div>
          {LESSON06_TOPICS.map((t,i)=>{
            const isActive=i===currentTopicIdx,isDone=i<currentTopicIdx;
            return (
              <button key={t.id} onClick={()=>setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(59,130,246,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(16,185,129,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"7px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:20,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>
                  {isDone?"done ":isActive?"now ":""}{t.label}
                </div>
                <div style={{ fontSize:20,color:"var(--text3)",marginTop:1 }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop:8,fontSize:20 }} onClick={handleGenerate} disabled={session.status==="question"}>
            Generate Question
          </button>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          {session.status==="waiting"&&(
            <div className="card" style={{ textAlign:"center",padding:"40px 20px" }}>
              <h3 style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>Waiting for students</h3>
              <p style={{ color:"var(--blue)",fontFamily:"var(--mono)",fontSize:28,fontWeight:900 }}>{session.joinCode}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:12 }}>
                {Object.values(participants).map(p=>(
                  <div key={p.name} style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"5px 12px",fontSize:20,fontWeight:600 }}>{p.name}</div>
                ))}
              </div>
            </div>
          )}

          {question&&(session.status==="question"||session.status==="revealing")&&(
            <>
              <div className="card">
                <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>
                  {currentTopic.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ fontSize:20,fontWeight:700,color:"var(--text)",marginBottom:12 }}>{question.prompt}</div>
                <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
                {session.status==="question"&&session.timerEndsAt&&(
                  <div style={{ marginTop:12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={async()=>{ if(!revealedRef.current) await handleReveal(); }} />
                  </div>
                )}
                {session.status==="revealing"&&(
                  <div style={{ marginTop:12,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                    <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)",marginBottom:4 }}>{question.displayAnswer}</div>
                    <RevealCalculation question={question} />
                  </div>
                )}
                <div style={{ height:6,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginTop:12 }}>
                  <div style={{ height:"100%",width:(totalStudents>0?(submittedCount/totalStudents)*100:0)+"%",background:"var(--blue)",borderRadius:99,transition:"width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize:20,fontWeight:700,marginBottom:10 }}>Student Answers</div>
                <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:280,overflowY:"auto" }}>
                  {Object.entries(participants).map(([pUid,p])=>{
                    const ans=answers.find(a=>a.uid===pUid);
                    const has=ans?.answer!==undefined&&ans?.answer!==null&&ans?.answer!=="";
                    const correct=has&&gradeLesson06Answer(ans.answer,question);
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:20 }}>{p.name}</span>
                        {has?(
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            {session.status==="revealing"&&<span style={{ fontFamily:"var(--mono)",fontSize:20,color:"var(--text2)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{String(ans.answer).length>30?"...":ans.answer}</span>}
                            <span style={{ fontWeight:700,color:correct?"var(--green)":"var(--red)",fontSize:20 }}>{correct?"+"+POINTS:"X"}</span>
                          </div>
                        ):<span style={{ fontSize:20,color:"var(--text3)" }}>thinking...</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// - Student view -
function StudentLesson06({ session, sessionId, uid }) {
  useKaTeX();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id&&question.id!==lastQId) { setSubmitted(false); setResult(null); setLastQId(question.id); }
  }, [question?.id]);

  const handleSubmit = async (inputVal) => {
    if (!question||submitted) return;
    const ans = String(inputVal).trim();
    if (!ans) return;
    const correct = gradeLesson06Answer(ans,question);
    await setDoc(doc(db,"sessions",sessionId,"answers",uid+"_"+question.id),{
      uid, questionId:question.id, answer:ans, correct, submittedAt:Date.now(),
    });
    if (correct) await addToScore(sessionId,uid,POINTS);
    setResult({ correct,answer:ans });
    setSubmitted(true);
  };

  if (session.status==="waiting") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Waiting for teacher...</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Lesson 6 - Expressions and Properties</p>
    </div>
  );
  if (session.status==="ended") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Session ended</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  return (
    <div style={{ maxWidth:600,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}>
        <div style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"5px 12px",fontSize:20,fontWeight:700 }}>
          Score: {myScore} pts
        </div>
      </div>
      <div className="card" key={question?.id}>
        {session.status==="question"&&session.timerEndsAt&&!submitted&&(
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question&&(
          <>
            <div style={{ fontSize:20,fontWeight:700,marginBottom:12,color:"var(--text)" }}>{question.prompt}</div>
            <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
          </>
        )}
        {session.status==="revealing"?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            {result?(
              <>
                <div style={{ fontSize:22,fontWeight:800,color:result.correct?"var(--green)":"var(--red)",marginBottom:6 }}>
                  {result.correct?"Correct! +"+POINTS+" pts":"Incorrect"}
                </div>
                {!result.correct&&question?.displayAnswer&&(
                  <div style={{ marginTop:8 }}>
                    <div style={{ color:"var(--green)",fontSize:20,marginBottom:4 }}>Correct: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong></div>
                    <RevealCalculation question={question} />
                  </div>
                )}
              </>
            ):(
              <div>
                <div style={{ color:"var(--text3)",marginBottom:4,fontSize:20 }}>No answer submitted.</div>
                {question?.displayAnswer&&<div style={{ color:"var(--green)",fontSize:20 }}>Correct: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong></div>}
              </div>
            )}
          </div>
        ):submitted?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            <div style={{ fontSize:20,fontWeight:700,color:"var(--green)",marginBottom:4 }}>Submitted!</div>
            <div style={{ fontSize:20,color:"var(--text3)" }}>Waiting for teacher to reveal...</div>
          </div>
        ):question?(
          <div style={{ marginTop:14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        ):null}
      </div>
    </div>
  );
}

// - Session creator -
function CreateLesson06Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ getTeacherClasses(user.id).then(setClasses); },[]);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createClassworkSession(user.id,selectedClass,timer);
      await updateDoc(doc(db,"sessions",sessionId),{ type:"lesson06" });
      onCreated(sessionId);
    } catch(e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>Lesson 6 - Expressions and Properties</h2>
        <p style={{ color:"var(--text2)",fontSize:20,marginBottom:16 }}>Multiple signed numbers, distributive property, combining like terms, and product rule.</p>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:20,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:5 }}>Class</label>
          <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} style={{ width:"100%",padding:"10px 12px",fontSize:20 }}>
            <option value="">Select a class...</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:20,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e=>setTimer(Number(e.target.value))} style={{ width:"100%",padding:"10px 12px",fontSize:20 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width:"100%",fontSize:20 }} onClick={handleCreate} disabled={loading||!selectedClass}>
          {loading?"Creating...":"Start Session"}
        </button>
      </div>
    </div>
  );
}

// - Main export -
export default function Lesson06Session({ user, onHome }) {
  const [view, setView] = useState("create");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  useEffect(()=>{
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId,setSession);
    return ()=>unsub();
  },[sessionId]);
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:1200,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff" }}>L6</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>GCA - Lesson 6</div>
              <div style={{ color:"var(--text3)",fontSize:20 }}>Expressions and Properties</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create"&&<CreateLesson06Session user={user} onCreated={(sid)=>{ setSessionId(sid); setView("session"); }} />}
        {view==="session"&&session&&(
          user.role==="teacher"
            ?<TeacherLesson06 session={session} sessionId={sessionId} uid={user.id} />
            :<StudentLesson06 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session"&&!session&&(
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson06 as Lesson06TeacherView, StudentLesson06 as Lesson06StudentView };
