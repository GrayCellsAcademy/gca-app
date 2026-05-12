import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON09_TOPICS, generateLesson09Question, gradeLesson09Answer,
  gradeTwoStepFirstOp, gradeTwoStepResult, gradeTwoStepSolve, gradeTwoStepFull,
  gradeDistribute, gradeDistEqSolve, gradeRectSubstitution, gradeRectSolve,
  gradePowerNumSolutions, gradeSolveSquare, gradeSolveCube,
  gradeWarmupA, gradeWarmupB,
} from "./lesson09Questions";

const POINTS = 5;

// -- KaTeX --
function useKaTeX() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s.async = true; s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

function KaTeXBlock({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); }
        catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <div ref={ref} style={{ fontSize: 28, margin: "8px 0", minHeight: 40 }} />;
}

// -- Rectangle SVG --
function RectSVG({ L, W, unit, missingLabel, knownLabel, knownVal, P, showP, onClickP, onClickKnown, substituted }) {
  const VW = 480, VH = 300, pad = 70;
  const scale = Math.min((VW - 2*pad) / Math.max(L,W), (VH - 2*pad) / Math.min(L,W)) * 0.85;
  // Draw with L as width, W as height
  const rw = L * scale, rh = W * scale;
  const ox = (VW - rw) / 2, oy = (VH - rh) / 2;
  const f = "#4b5068";

  const clickStyle = (clicked) => ({
    cursor: clicked ? "default" : "pointer",
    fontWeight: 800,
    fontSize: 14,
    fill: clicked ? "var(--green)" : "var(--blue)",
    textDecoration: clicked ? "none" : "underline",
  });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", maxWidth: 480, display: "block", margin: "0 auto" }}>
      <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5" />
      {/* Bottom: L */}
      <text x={ox+rw/2} y={oy+rh+28} textAnchor="middle" fontSize="14" fill={f} fontWeight="700">L = {L} {unit}</text>
      {/* Left: W */}
      <text x={ox-32} y={oy+rh/2} textAnchor="middle" fontSize="14" fill={f} fontWeight="700"
        transform={`rotate(-90,${ox-32},${oy+rh/2})`}>W = {W} {unit}</text>
      {/* Perimeter label */}
      {showP && (
        <text x={VW/2} y={oy-18} textAnchor="middle" fontSize="14" fill={substituted?.P ? "#16a34a" : "#1B8FFF"}
          fontWeight="700" style={{ cursor: substituted?.P ? "default" : "pointer" }}
          onClick={substituted?.P ? undefined : onClickP}>
          P = {substituted?.P ? P : "P"} {unit}
        </text>
      )}
    </svg>
  );
}

// -- Question Display --
function QuestionDisplay({ question, revealCorrect, topicId }) {
  useKaTeX();
  if (!question) return null;
  const q = question;

  if (q.type === "warmup-a") {
    const VW=520, VH=360, pad=75;
    const scale=Math.min((VW-2*pad)/q.L,(VH-2*pad)/q.W)*0.82;
    const rw=q.L*scale, rh=q.W*scale;
    const ox=(VW-rw)/2, oy=(VH-rh)/2;
    const f="#4b5068", g=26;
    return (
      <div style={{ textAlign:"center" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",maxWidth:520,display:"block",margin:"0 auto" }}>
          <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5"/>
          {/* Bottom: L */}
          <text x={ox+rw/2} y={oy+rh+g} textAnchor="middle" fontSize="15" fill={f} fontWeight="700">{q.L} {q.unit}</text>
          {/* Top: L */}
          <text x={ox+rw/2} y={oy-10} textAnchor="middle" fontSize="15" fill={f} fontWeight="700">{q.L} {q.unit}</text>
          {/* Left: W */}
          <text x={ox-g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={f} fontWeight="700" transform={`rotate(-90,${ox-g},${oy+rh/2})`}>{q.W} {q.unit}</text>
          {/* Right: W */}
          <text x={ox+rw+g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={f} fontWeight="700" transform={`rotate(-90,${ox+rw+g},${oy+rh/2})`}>{q.W} {q.unit}</text>
        </svg>
        {revealCorrect && <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginTop:8 }}>P = {q.displayAnswer}</div>}
      </div>
    );
  }

  if (q.type === "warmup-b") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  if (q.type === "two-step-eq") {
    return (
      <div style={{ textAlign:"center" }}>
        <KaTeXBlock expr={q.latex} />
        {revealCorrect && <div style={{ fontSize:20,color:"var(--green)",fontWeight:700,marginTop:8 }}>Answer: {q.displayAnswer}</div>}
      </div>
    );
  }

  if (q.type === "dist-eq") {
    if (topicId==="dist-solve-after") {
      return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.expandedLatex} /></div>;
    }
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  if (q.type === "rect-missing") {
    const VW=520, VH=360, pad=80;
    const scale=Math.min((VW-2*pad)/q.L,(VH-2*pad)/q.W)*0.80;
    const rw=q.L*scale, rh=q.W*scale;
    const ox=(VW-rw)/2, oy=(VH-rh)/2;
    const f="#4b5068", g=26;
    // Known side label, missing side as ?
    const Llabel = q.knownLabel==="L" ? `${q.knownVal} ${q.unit}` : "?";
    const Wlabel = q.knownLabel==="W" ? `${q.knownVal} ${q.unit}` : "?";
    const Lcol = q.knownLabel==="L" ? f : "var(--orange)";
    const Wcol = q.knownLabel==="W" ? f : "var(--orange)";
    return (
      <div style={{ textAlign:"center" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",maxWidth:520,display:"block",margin:"0 auto" }}>
          <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5"/>
          {/* P at top center */}
          <text x={VW/2} y={oy-12} textAnchor="middle" fontSize="15" fill={f} fontWeight="700">P = {q.P} {q.unit}</text>
          {/* Bottom: L */}
          <text x={ox+rw/2} y={oy+rh+g} textAnchor="middle" fontSize="15" fill={Lcol} fontWeight="700">{Llabel}</text>
          {/* Top: L */}
          <text x={ox+rw/2} y={oy-30} textAnchor="middle" fontSize="15" fill={Lcol} fontWeight="700">{Llabel}</text>
          {/* Left: W */}
          <text x={ox-g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={Wcol} fontWeight="700" transform={`rotate(-90,${ox-g},${oy+rh/2})`}>{Wlabel}</text>
          {/* Right: W */}
          <text x={ox+rw+g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={Wcol} fontWeight="700" transform={`rotate(-90,${ox+rw+g},${oy+rh/2})`}>{Wlabel}</text>
          {revealCorrect && (
            <text x={VW/2} y={VH-6} textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--green)">{q.missingLabel} = {q.displayAnswer}</text>
          )}
        </svg>
        <div style={{ fontSize:20,color:"var(--text2)",marginTop:4 }}>Formula: 2L + 2W = P</div>
      </div>
    );
  }

  if (q.type === "power-num-solutions" || q.type === "solve-square" || q.type === "solve-cube") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  return null;
}

// -- Answer Inputs --
function TextInput({ onSubmit, submitted, placeholder, allowNeg }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val}
        onChange={e=>setVal(allowNeg?e.target.value.replace(/[^0-9\-,a-z\s]/gi,""):e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&submit()} disabled={submitted}
        placeholder={placeholder||""}
        style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:220 }} />
      <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// Two-step first operation selector
function FirstOpInput({ question, onSubmit, submitted }) {
  const [op, setOp] = useState("");
  const [num, setNum] = useState("");
  const ops = ["add","subtract","multiply","divide"];
  const allDone = op !== "" && num.trim() !== "";
  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:12 }}>
        What is the first step to solve this equation? Choose an operation and enter a number.
      </div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:14 }}>
        {ops.map(o=>(
          <button key={o} onClick={()=>!submitted&&setOp(o)}
            style={{ padding:"10px 20px",borderRadius:"var(--radius-sm)",border:"2px solid "+(op===o?"var(--blue)":"var(--border)"),background:op===o?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:20,fontWeight:700,cursor:"pointer",color:op===o?"var(--blue)":"var(--text)",textTransform:"capitalize" }}>
            {o}
          </button>
        ))}
      </div>
      <div style={{ display:"flex",gap:8,alignItems:"center",justifyContent:"center",marginBottom:12 }}>
        <span style={{ fontSize:20,color:"var(--text2)" }}>Number:</span>
        <input value={num} onChange={e=>setNum(e.target.value.replace(/[^0-9]/g,""))}
          disabled={submitted} inputMode="numeric"
          style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"8px",width:100 }} />
      </div>
      {op&&num&&<div style={{ textAlign:"center",fontSize:20,color:"var(--text2)",marginBottom:12,fontStyle:"italic" }}>
        "{op.charAt(0).toUpperCase()+op.slice(1)} {num} from both sides"
      </div>}
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify({op,num}))} disabled={submitted||!allDone}>Submit</button>
    </div>
  );
}

// Power: number of solutions
function NumSolutionsInput({ onSubmit, submitted }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:12 }}>
        {["0 solutions","1 solution","2 solutions"].map((opt,i)=>(
          <button key={i} onClick={()=>!submitted&&setVal(String(i))}
            style={{ padding:"10px 20px",borderRadius:"var(--radius-sm)",border:"2px solid "+(val===String(i)?"var(--blue)":"var(--border)"),background:val===String(i)?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:20,fontWeight:700,cursor:"pointer",color:val===String(i)?"var(--blue)":"var(--text)" }}>
            {opt}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(val)} disabled={submitted||!val}>Submit</button>
    </div>
  );
}

// Rectangle substitution (click to substitute)
function RectSubInput({ question, onSubmit, submitted }) {
  const [clickedP, setClickedP] = useState(false);
  const [clickedKnown, setClickedKnown] = useState(false);
  const allDone = clickedP && clickedKnown;
      const VW=520, VH=360, pad=80;
      const scale=Math.min((VW-2*pad)/question.L,(VH-2*pad)/question.W)*0.80;
      const rw=question.L*scale, rh=question.W*scale;
      const ox=(VW-rw)/2, oy=(VH-rh)/2;
      const f="#4b5068", g=26;
      const Llabel = question.knownLabel==="L" ? `${question.knownVal} ${question.unit}` : "?";
      const Wlabel = question.knownLabel==="W" ? `${question.knownVal} ${question.unit}` : "?";
      const Lcol = question.knownLabel==="L" ? f : "var(--orange)";
      const Wcol = question.knownLabel==="W" ? f : "var(--orange)";

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:8 }}>
        Click <strong style={{ color:"var(--blue)" }}>P</strong> and <strong style={{ color:"var(--blue)" }}>{question.knownLabel}</strong> in the equation below to substitute their values.
      </div>
      {/* Equation display with clickable terms */}
      <div style={{ textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,marginBottom:16,lineHeight:2 }}>
        <span>2{question.missingLabel} + 2</span>
        <span onClick={()=>!submitted&&!clickedKnown&&setClickedKnown(true)}
          style={{ cursor:clickedKnown?"default":"pointer",color:clickedKnown?"var(--green)":"var(--blue)",textDecoration:clickedKnown?"none":"underline",padding:"0 4px",borderRadius:4,background:clickedKnown?"rgba(22,163,74,0.1)":"rgba(27,143,255,0.1)" }}>
          {clickedKnown?`(${question.knownVal})`:question.knownLabel}
        </span>
        <span> = </span>
        <span onClick={()=>!submitted&&!clickedP&&setClickedP(true)}
          style={{ cursor:clickedP?"default":"pointer",color:clickedP?"var(--green)":"var(--blue)",textDecoration:clickedP?"none":"underline",padding:"0 4px",borderRadius:4,background:clickedP?"rgba(22,163,74,0.1)":"rgba(27,143,255,0.1)" }}>
          {clickedP?question.P:"P"}
        </span>
      </div>
      {/* Rectangle */}
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",maxWidth:520,display:"block",margin:"0 auto 12px" }}>
        <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5"/>
        <text x={VW/2} y={oy-12} textAnchor="middle" fontSize="15" fill={f} fontWeight="700">P = {question.P} {question.unit}</text>
        <text x={ox+rw/2} y={oy+rh+g} textAnchor="middle" fontSize="15" fill={Lcol} fontWeight="700">{Llabel}</text>
        <text x={ox+rw/2} y={oy-30} textAnchor="middle" fontSize="15" fill={Lcol} fontWeight="700">{Llabel}</text>
        <text x={ox-g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={Wcol} fontWeight="700" transform={`rotate(-90,${ox-g},${oy+rh/2})`}>{Wlabel}</text>
        <text x={ox+rw+g} y={oy+rh/2} textAnchor="middle" fontSize="15" fill={Wcol} fontWeight="700" transform={`rotate(-90,${ox+rw+g},${oy+rh/2})`}>{Wlabel}</text>
      </svg>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify({P:question.P,known:question.knownVal}))}
        disabled={submitted||!allDone}>Submit Substitution</button>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted, topicId }) {
  if (!question) return null;
  const t = question.type;

  if (t==="warmup-a") return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Enter perimeter with units (e.g. 48 ft)</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg={false} />
    </div>
  );

  if (t==="warmup-b") return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="e.g. -3" />;

  if (t==="two-step-eq") {
    if (topicId==="two-step-first-op") return <FirstOpInput question={question} onSubmit={onSubmit} submitted={submitted} />;
    if (topicId==="two-step-result") return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Enter the equation after the first step (e.g. 2x=8)</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg />
      </div>
    );
    return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;
  }

  if (t==="dist-eq") {
    if (topicId==="dist-expand") return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Expand the left side only (e.g. 6x+15)</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg />
      </div>
    );
    return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;
  }

  if (t==="rect-missing") {
    if (topicId==="rect-sub") return <RectSubInput question={question} onSubmit={onSubmit} submitted={submitted} />;
    return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Enter {question.missingLabel} with units (e.g. 14 ft)</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg={false} />
      </div>
    );
  }

  if (t==="power-num-solutions") return <NumSolutionsInput onSubmit={onSubmit} submitted={submitted} />;

  if (t==="solve-square") return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Enter both solutions comma-separated (e.g. -3,3) or "no solution"</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg />
    </div>
  );

  if (t==="solve-cube") return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;

  return null;
}

// -- Grade wrapper that sets _grader --
function gradeAnswer(input, question, topicId) {
  question = {...question};
  if (question.type==="two-step-eq") {
    if (topicId==="two-step-first-op") question._grader="first-op";
    else if (topicId==="two-step-result") question._grader="result";
    else if (topicId==="two-step-solve") question._grader="solve";
    else question._grader="full";
  }
  if (question.type==="dist-eq") {
    question._grader = topicId==="dist-expand" ? "expand" : "solve";
  }
  if (question.type==="rect-missing") {
    question._grader = topicId==="rect-sub" ? "sub" : "solve";
  }
  return gradeLesson09Answer(input, question);
}

// -- Timer --
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

// -- Teacher View --
function TeacherLesson09({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(120);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON09_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]); revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateLesson09Question(currentTopic.id);
    const qId = "q_"+Date.now().toString(36);
    q.id=qId; q.points=POINTS; q._topicId=currentTopic.id;
    revealedRef.current=false; setAnswers([]);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question", currentQuestion:q,
      timerSeconds:timerInput, timerEndsAt:Date.now()+timerInput*1000,
      questionCount:(session.questionCount||0)+1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current=true;
    for (const ans of answers) {
      if (ans.answer!==undefined && gradeAnswer(ans.answer, question, question._topicId))
        await addToScore(sessionId, ans.uid, POINTS);
    }
    await updateDoc(doc(db,"sessions",sessionId),{status:"revealing"});
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db,"sessions",sessionId),{status:"ended"});
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a=>gradeAnswer(a.answer,question,question?._topicId)).length;

  return (
    <div style={{ maxWidth:1100,margin:"0 auto" }}>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:20,color:"var(--text3)" }}>Join Code</div>
            <div style={{ fontSize:36,fontWeight:900,fontFamily:"var(--mono)",color:"var(--blue)",letterSpacing:"0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize:20,color:"var(--text3)" }}>{totalStudents} student{totalStudents!==1?"s":""} joined</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <label style={{ fontSize:20 }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput} onChange={e=>setTimerInput(Number(e.target.value))}
                style={{ width:70,padding:"6px 10px",fontSize:20,textAlign:"center" }} />
            </div>
            {session.status==="question"&&<button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status==="revealing"&&(
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat Topic</button>
                {currentTopicIdx<LESSON09_TOPICS.length-1&&(
                  <button className="btn btn-primary" onClick={()=>{
                    const next=currentTopicIdx+1;
                    setCurrentTopicIdx(next);
                    const q=generateLesson09Question(LESSON09_TOPICS[next].id);
                    const qId="q_"+Date.now().toString(36);
                    q.id=qId; q.points=POINTS; q._topicId=LESSON09_TOPICS[next].id;
                    revealedRef.current=false; setAnswers([]);
                    updateDoc(doc(db,"sessions",sessionId),{
                      status:"question",currentQuestion:q,
                      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
                      questionCount:(session.questionCount||0)+1,
                    });
                  }}>Next: {LESSON09_TOPICS[currentTopicIdx+1]?.label}</button>
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
          {LESSON09_TOPICS.map((t,i)=>{
            const isActive=i===currentTopicIdx, isDone=i<currentTopicIdx;
            return (
              <button key={t.id} onClick={()=>setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(27,143,255,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(22,163,74,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"6px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:18,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>{t.label}</div>
                <div style={{ fontSize:17,color:"var(--text3)" }}>{t.description}</div>
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
                <div style={{ fontSize:20,fontWeight:700,marginBottom:12 }}>{question.prompt}</div>
                <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} topicId={question._topicId} />
                {session.status==="question"&&session.timerEndsAt&&(
                  <div style={{ marginTop:12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={async()=>{if(!revealedRef.current)await handleReveal();}} />
                  </div>
                )}
                {session.status==="revealing"&&(
                  <div style={{ marginTop:12,background:"rgba(22,163,74,0.06)",border:"1px solid rgba(22,163,74,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                    <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{question.displayAnswer}</div>
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
                    const has=ans?.answer!==undefined&&ans?.answer!=="";
                    const correct=has&&gradeAnswer(ans.answer,question,question._topicId);
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(22,163,74,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:20 }}>{p.name}</span>
                        {has?(
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            {session.status==="revealing"&&<span style={{ fontFamily:"var(--mono)",fontSize:19,color:"var(--text2)" }}>{String(ans.answer).slice(0,20)}</span>}
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

// -- Student View --
function StudentLesson09({ session, sessionId, uid }) {
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
    const correct = gradeAnswer(ans, question, question._topicId);
    await setDoc(doc(db,"sessions",sessionId,"answers",uid+"_"+question.id),{
      uid, questionId:question.id, answer:ans, correct, submittedAt:Date.now(),
    });
    if (correct) await addToScore(sessionId,uid,POINTS);
    setResult({correct,answer:ans});
    setSubmitted(true);
  };

  if (session.status==="waiting") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Waiting for teacher...</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Lesson 9 - Two-Step Equations</p>
    </div>
  );
  if (session.status==="ended") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Session ended</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  return (
    <div style={{ maxWidth:620,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}>
        <div style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"5px 12px",fontSize:20,fontWeight:700 }}>
          Score: {myScore} pts
        </div>
      </div>
      <div className="card" key={question?.id||"waiting"}>
        {session.status==="question"&&session.timerEndsAt&&!submitted&&(
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question&&(
          <>
            {question.prompt&&<div style={{ fontSize:20,fontWeight:700,marginBottom:12 }}>{question.prompt}</div>}
            <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} topicId={question._topicId} />
          </>
        )}
        {session.status==="revealing"?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            {result?(
              <div style={{ fontSize:22,fontWeight:800,color:result.correct?"var(--green)":"var(--red)" }}>
                {result.correct?"Correct! +"+POINTS+" pts":"Incorrect"}
                {!result.correct&&question?.displayAnswer&&(
                  <div style={{ marginTop:8,fontSize:20,color:"var(--green)",fontWeight:400 }}>Answer: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong></div>
                )}
              </div>
            ):(
              <div style={{ color:"var(--text3)",fontSize:20 }}>
                No answer submitted.
                {question?.displayAnswer&&<div style={{ color:"var(--green)",fontWeight:700 }}>Answer: {question.displayAnswer}</div>}
              </div>
            )}
          </div>
        ):submitted?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            <div style={{ fontSize:20,fontWeight:700,color:"var(--green)" }}>Submitted! Waiting for reveal...</div>
          </div>
        ):question?(
          <div style={{ marginTop:14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} topicId={question._topicId} />
          </div>
        ):null}
      </div>
    </div>
  );
}

// -- Session Creator --
function CreateLesson09Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ getTeacherClasses(user.id).then(setClasses); },[]);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const joinCode = Math.random().toString(36).slice(2,7).toUpperCase();
      const sessionId = "sess_"+Date.now().toString(36);
      await setDoc(doc(db,"sessions",sessionId),{
        id:sessionId, teacherId:user.id, classId:selectedClass,
        joinCode, type:"lesson09", status:"waiting",
        currentQuestion:null, questionCount:0,
        timerSeconds:timer, timerEndsAt:null,
        participants:{}, createdAt:Date.now(),
      });
      onCreated(sessionId);
    } catch(e) { console.error(e); alert("Error: "+e.message); setLoading(false); }
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>Lesson 9 - Two-Step Equations</h2>
        <p style={{ color:"var(--text2)",fontSize:20,marginBottom:16 }}>Two-step equations, distributive property, rectangle missing sides, and power equations.</p>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:20,fontWeight:600,display:"block",marginBottom:5 }}>Class</label>
          <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} style={{ width:"100%",padding:"10px 12px",fontSize:20 }}>
            <option value="">Select a class...</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:20,fontWeight:600,display:"block",marginBottom:5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e=>setTimer(Number(e.target.value))} style={{ width:"100%",padding:"10px 12px",fontSize:20 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width:"100%",fontSize:20 }} onClick={handleCreate} disabled={loading||!selectedClass}>
          {loading?"Creating...":"Start Session"}
        </button>
      </div>
    </div>
  );
}

// -- Main Export --
export default function Lesson09Session({ user, onHome }) {
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
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff" }}>L9</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>GCA - Lesson 9</div>
              <div style={{ color:"var(--text3)",fontSize:20 }}>Two-Step Equations and More</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create"&&<CreateLesson09Session user={user} onCreated={(sid)=>{setSessionId(sid);setView("session");}} />}
        {view==="session"&&session&&(
          user.role==="teacher"
            ?<TeacherLesson09 session={session} sessionId={sessionId} uid={user.id} />
            :<StudentLesson09 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session"&&!session&&(
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson09 as Lesson09TeacherView, StudentLesson09 as Lesson09StudentView };
