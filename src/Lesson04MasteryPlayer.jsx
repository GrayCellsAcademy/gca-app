import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genPower, genSqrt, genCbrt, makeSqrtPool, makeCbrtPool,
  genOrderOfOps2, genOrderOfOps3, genVarExpression,
  gradePower, gradeRoot, gradeLesson04Answer,
} from "./lesson04Questions";

export const LESSON04_MASTERY_TOPIC_ID = "lesson04-mastery-v1";
const MASTERY_STREAK = 3;

// -- KaTeX --
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
}

function KaTeX({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); }
      catch {}
    }
  });
  return <div ref={ref} style={{ fontSize: 28, margin: "8px 0" }} />;
}

// -- Shared UI --
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:12 }}>
      {Array.from({ length:needed }).map((_,i) => (
        <div key={i} style={{ width:12,height:12,borderRadius:"50%",background:i<current?"var(--green)":"var(--surface2)",border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:12,color:"var(--text3)",marginLeft:4 }}>{current}/{needed}</span>
    </div>
  );
}

function NumInput({ onSubmit, submitted }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9]/g,""))}
        onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="numeric" placeholder="?"
        disabled={submitted}
        style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:120 }} />
      <button className="btn btn-primary" style={{ fontSize:18,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// -- Step definitions --
const STEPS = [
  { id:"power",       label:"Exponents",             description:"3 correct in a row to pass" },
  { id:"sqrt",        label:"Square Roots",           description:"Pool of 6, 3 correct in a row" },
  { id:"cbrt",        label:"Cube Roots",             description:"Pool of 6, 3 correct in a row" },
  { id:"order-ops-2", label:"Order of Operations (2 ops)", description:"3 correct in a row" },
  { id:"order-ops-3", label:"Order of Operations (3 ops)", description:"3 correct in a row" },
  { id:"var-expr",    label:"Variable Expressions",   description:"3 correct in a row" },
];

function genQuestion(stepId, state) {
  switch (stepId) {
    case "power":      return genPower();
    case "sqrt": {
      const pool = state.sqrtPool || makeSqrtPool();
      const idx = state.sqrtIdx || 0;
      const q = genSqrt(idx >= pool.length ? makeSqrtPool() : pool, idx >= pool.length ? 0 : idx);
      return { ...q, _nextPool: idx >= pool.length ? makeSqrtPool() : pool, _nextIdx: (idx >= pool.length ? 0 : idx) + 1 };
    }
    case "cbrt": {
      const pool = state.cbrtPool || makeCbrtPool();
      const idx = state.cbrtIdx || 0;
      const q = genCbrt(idx >= pool.length ? makeCbrtPool() : pool, idx >= pool.length ? 0 : idx);
      return { ...q, _nextPool: idx >= pool.length ? makeCbrtPool() : pool, _nextIdx: (idx >= pool.length ? 0 : idx) + 1 };
    }
    case "order-ops-2": return genOrderOfOps2();
    case "order-ops-3": return genOrderOfOps3();
    case "var-expr":    return genVarExpression();
    default: return genPower();
  }
}

function gradeAnswer(input, question) {
  if (!input || !question) return false;
  const t = question.type;
  if (t === "power") return gradePower(input, question);
  if (t === "sqrt" || t === "cbrt") return gradeRoot(input, question);
  return gradeLesson04Answer(input, question);
}

// Worked solution display for wrong answers
function WorkedSolution({ question }) {
  useKaTeX();
  if (!question) return null;
  const q = question;
  if (q.type === "power") {
    const steps = Array.from({ length:q.exp },(_,i) => Math.pow(q.base, i+1));
    return (
      <div style={{ fontSize:14,color:"var(--text2)",marginTop:8,fontFamily:"var(--mono)" }}>
        {q.base}^{q.exp} = {Array.from({ length:q.exp },()=>q.base).join(" x ")} = <strong style={{ color:"var(--green)" }}>{q.result}</strong>
      </div>
    );
  }
  if (q.type === "sqrt") return <div style={{ fontSize:14,color:"var(--text2)",marginTop:8 }}>sqrt({q.radicand}) = <strong style={{ color:"var(--green)" }}>{q.answer}</strong></div>;
  if (q.type === "cbrt") return <div style={{ fontSize:14,color:"var(--text2)",marginTop:8 }}>cbrt({q.radicand}) = <strong style={{ color:"var(--green)" }}>{q.answer}</strong></div>;
  if (q.type === "order-ops-2" || q.type === "order-ops-3" || q.type === "var-expr") {
    return (
      <div style={{ marginTop:8 }}>
        {q.given && <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>{q.given}</div>}
        <KaTeX expr={q.latex} />
        <div style={{ fontSize:15,fontWeight:700,color:"var(--green)",fontFamily:"var(--mono)" }}>= {q.result}</div>
      </div>
    );
  }
  return null;
}

// -- Mastery activity component --
function MasteryActivity({ stepIdx, onComplete, onSave }) {
  useKaTeX();
  const step = STEPS[stepIdx];
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [poolState, setPoolState] = useState({});

  useEffect(() => { newQuestion(); }, [stepIdx]);

  const newQuestion = () => {
    const q = genQuestion(step.id, poolState);
    if (q._nextPool || q._nextIdx !== undefined) {
      const newState = {};
      if (step.id === "sqrt") { newState.sqrtPool = q._nextPool; newState.sqrtIdx = q._nextIdx; }
      if (step.id === "cbrt") { newState.cbrtPool = q._nextPool; newState.cbrtIdx = q._nextIdx; }
      setPoolState(prev => ({ ...prev, ...newState }));
    }
    setQuestion(q);
    setSubmitted(false);
    setResult(null);
  };

  const handleSubmit = async (input) => {
    if (!question || submitted) return;
    setSubmitted(true);
    const correct = gradeAnswer(input, question);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= MASTERY_STREAK) {
        const nextStep = stepIdx + 1;
        await onSave({ stepIdx: nextStep, streak: 0 }, nextStep >= STEPS.length);
        if (nextStep < STEPS.length) onComplete();
        else onComplete(true);
      } else {
        await onSave({ stepIdx, streak: newStreak }, false);
        setResult({ correct: true });
      }
    } else {
      setStreak(0);
      await onSave({ stepIdx, streak: 0 }, false);
      setResult({ correct: false });
    }
  };

  if (!question) return <div style={{ display:"flex",justifyContent:"center",padding:40 }}><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth:560,margin:"0 auto" }}>
      {/* Roadmap */}
      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:16 }}>
        {STEPS.map((s,i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <div key={s.id} style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:done?"rgba(16,185,129,0.12)":active?"rgba(232,99,10,0.12)":"var(--surface)",color:done?"var(--green)":active?"var(--blue)":"var(--text3)",border:"1px solid "+(done?"rgba(16,185,129,0.3)":active?"rgba(232,99,10,0.3)":"var(--border)") }}>
              {done?"done":s.label}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Activity {stepIdx+1} of {STEPS.length}</div>
          <div style={{ fontSize:18,fontWeight:800 }}>{step.label}</div>
          <div style={{ fontSize:13,color:"var(--text2)" }}>{step.description}</div>
        </div>
        <StreakDots current={streak} needed={MASTERY_STREAK} />
        <div style={{ fontSize:14,fontWeight:700,color:"var(--text2)",marginBottom:10 }}>{question.prompt}</div>
        {question.given && <div style={{ fontSize:13,color:"var(--text3)",marginBottom:6 }}>{question.given}</div>}
        <KaTeX expr={question.latex} />

        {result ? (
          <div style={{ marginTop:14 }}>
            <div style={{ textAlign:"center",fontSize:18,fontWeight:800,color:result.correct?"var(--green)":"var(--red)",marginBottom:8 }}>
              {result.correct ? "Correct! " + streak + "/" + MASTERY_STREAK : "Incorrect - streak reset"}
            </div>
            {!result.correct && (
              <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",marginBottom:10 }}>
                <div style={{ fontSize:12,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                <WorkedSolution question={question} />
              </div>
            )}
            <button className="btn btn-primary" style={{ width:"100%" }} onClick={newQuestion}>
              {result.correct ? "Next question" : "Try again"}
            </button>
          </div>
        ) : (
          <div style={{ marginTop:14 }}>
            <NumInput onSubmit={handleSubmit} submitted={submitted} />
          </div>
        )}
      </div>
    </div>
  );
}

// -- Main Player --
export default function Lesson04MasteryPlayer({ user, topic, onHome }) {
  useActivityTracking(user, "lesson04-mastery-v1", "HW 4 (019)");
  useKaTeX();
  const topicId = topic?.id || LESSON04_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const d = prog.data;
        if (d.completed) { setCompleted(true); setLoading(false); return; }
        if (d.stepIdx !== undefined) setStepIdx(d.stepIdx);
        if (d.streak !== undefined) setStreak(d.streak);
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async ({ stepIdx: si, streak: st }, done) => {
    const pct = done ? 100 : Math.round((si / STEPS.length) * 100);
    await fbSaveProgress(user.id, topicId, {
      started: true, completed: done, percentComplete: pct,
      data: { stepIdx: si, streak: st, completed: done },
    });
    setStepIdx(si); setStreak(st);
    if (done) setCompleted(true);
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 4 (019) Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:15,marginBottom:24 }}>
          Exponents, roots, order of operations, and variable expressions mastered!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:700,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff" }}>L4</div>
            <div>
              <div style={{ fontWeight:800,fontSize:17 }}>HW 4 (019): Mastery Activities</div>
              <div style={{ color:"var(--text3)",fontSize:12 }}>3 correct in a row to advance each activity</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        <MasteryActivity
          key={stepIdx}
          stepIdx={stepIdx}
          onSave={save}
          onComplete={(done) => {
            if (done) setCompleted(true);
          }}
        />
      </div>
    </div>
  );
}

