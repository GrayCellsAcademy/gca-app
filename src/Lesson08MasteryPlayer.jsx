import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genExprOrEquation, gradeExprOrEquation,
  genIdentifySolutions, gradeIdentifySolutions,
  genOneStepEquation, gradeOneStepEquation,
  genNegX, gradeNegX,
  genSolveDistance, gradeSolveDistance,
  genSolveSpeed, gradeSolveSpeed,
  genSolveTime, gradeSolveTime,
} from "./lesson08Questions";

export const LESSON08_MASTERY_TOPIC_ID = "lesson08-mastery-v1";
const STREAK = 3;

// -- KaTeX --
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s.async = true; s.onload = () => {};
    document.head.appendChild(s);
  }, []);
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
  return <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36 }} />;
}

function KaTeXInline({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); }
        catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
}

function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:12 }}>
      {Array.from({ length:needed }).map((_,i) => (
        <div key={i} style={{ width:13,height:13,borderRadius:"50%",background:i<current?"var(--green)":"var(--surface2)",border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20,color:"var(--text3)",marginLeft:6 }}>{current}/{needed}</span>
    </div>
  );
}

// -- Activity 2: Expression or Equation --
function ExprOrEqMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genExprOrEquation());
  const [answers, setAnswers] = useState(question.items.map(()=>""));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const correct = JSON.parse(question.answer);
  const allDone = answers.every(a=>a!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradeExprOrEquation(JSON.stringify(answers), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  const handleRetry = () => { setSubmitted(false); setWrong(false); setAnswers(question.items.map(()=>"")); };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
        {question.items.map((item,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px" }}>
            <KaTeXInline expr={item.latex} />
            <span style={{ fontWeight:800,fontSize:20,color:correct[i]==="equation"?"var(--blue)":"var(--orange)",marginLeft:12 }}>{correct[i]}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleRetry}>Try again</button>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {question.items.map((item,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",flexWrap:"wrap" }}>
            <div style={{ flex:1,minWidth:120 }}><KaTeXInline expr={item.latex} /></div>
            <div style={{ display:"flex",gap:8 }}>
              {["expression","equation"].map(opt=>(
                <button key={opt} onClick={()=>!submitted&&set(i,opt)}
                  style={{ padding:"6px 14px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===opt?"var(--blue)":"var(--border)"),background:answers[i]===opt?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:20,fontWeight:700,cursor:"pointer",color:answers[i]===opt?"var(--blue)":"var(--text)",textTransform:"capitalize" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={handleSubmit} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// -- Activity 3: Identifying Solutions --
function IdentifySolutionsMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genIdentifySolutions());
  const [answers, setAnswers] = useState(question.options.map(()=>""));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const correct = JSON.parse(question.answer);
  const allDone = answers.every(a=>a!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradeIdentifySolutions(JSON.stringify(answers.map(a=>a==="true")), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  const handleRetry = () => { setSubmitted(false); setWrong(false); setAnswers(question.options.map(()=>"")); };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Solutions: <strong style={{ color:"var(--green)" }}>{question.displayAnswer}</strong></div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
          {question.options.map((opt,i) => (
            <span key={i} style={{ fontFamily:"var(--mono)",fontSize:20,fontWeight:700,color:opt.isSolution?"var(--green)":"var(--red)",background:opt.isSolution?"rgba(22,163,74,0.1)":"rgba(239,68,68,0.1)",padding:"4px 12px",borderRadius:99 }}>
              x={opt.value}: {opt.isSolution?"yes":"no"}
            </span>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleRetry}>Try again</button>
    </div>
  );

  return (
    <div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ display:"flex",flexWrap:"wrap",gap:10,marginBottom:12,justifyContent:"center" }}>
        {question.options.map((opt,i) => (
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",minWidth:90 }}>
            <div style={{ fontSize:22,fontWeight:800,fontFamily:"var(--mono)" }}>x = {opt.value}</div>
            <div style={{ display:"flex",gap:6 }}>
              {["Yes","No"].map(yn=>(
                <button key={yn} onClick={()=>!submitted&&set(i,yn==="Yes"?"true":"false")}
                  style={{ padding:"5px 12px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===(yn==="Yes"?"true":"false")?(yn==="Yes"?"var(--green)":"var(--red)"):"var(--border)"),background:answers[i]===(yn==="Yes"?"true":"false")?(yn==="Yes"?"rgba(22,163,74,0.15)":"rgba(239,68,68,0.15)"):"var(--surface)",fontSize:20,fontWeight:700,cursor:"pointer",color:answers[i]===(yn==="Yes"?"true":"false")?(yn==="Yes"?"var(--green)":"var(--red)"):"var(--text)" }}>
                  {yn}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:20,color:"var(--text3)",textAlign:"center",marginBottom:10 }}>Yes = solution, No = not a solution</div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={handleSubmit} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// -- Activity 4: One-Step Equations (4 sequential types) --
const EQ_TYPE_LABELS = ["Type 1: x + a = b","Type 2: x - a = b","Type 3: ax = b","Type 4: x / a = b"];
const EQ_FORMS = ["add","sub","mul","div"];

function OneStepEqMastery({ typeIdx, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => {
    let q;
    do { q = genOneStepEquation(); } while(q.form !== EQ_FORMS[typeIdx]);
    return q;
  });
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);

  const submit = () => {
    if (!val.trim()) return;
    setSubmitted(true);
    if (gradeOneStepEquation(val.trim(), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  const handleRetry = () => { setSubmitted(false); setWrong(false); setVal(""); setTimeout(()=>ref.current?.focus(),80); };

  const inverse = {"add":"Subtract","sub":"Add","mul":"Divide","div":"Multiply"};

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:8 }}>Incorrect - back to Type 1</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>
          {inverse[question.form]} both sides to isolate x
        </div>
        <div style={{ fontSize:24,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>x = {question.solution}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleRetry}>Continue</button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:8 }}>{EQ_TYPE_LABELS[typeIdx]}</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="text" disabled={submitted}
          style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} disabled={submitted||!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// -- Activity 5: Solving -x = integer --
function NegXMastery({ onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genNegX());
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);

  const submit = () => {
    if (!val.trim()) return;
    setSubmitted(true);
    if (gradeNegX(val.trim(), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  const handleRetry = () => { setSubmitted(false); setWrong(false); setVal(""); setTimeout(()=>ref.current?.focus(),80); };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:8 }}>Incorrect</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>If -x = a, then x = -a</div>
        <div style={{ fontSize:24,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>x = {question.solution}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleRetry}>Try again</button>
    </div>
  );

  return (
    <div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="text" disabled={submitted}
          style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} disabled={submitted||!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// -- Activity 6: Speed/Distance/Time --
function DSTMastery({ onCorrect, onWrong }) {
  const [questions, setQuestions] = useState(() => buildDSTSet());
  const [idx, setIdx] = useState(0);
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);

  function buildDSTSet() {
    return [
      genSolveDistance(), genSolveDistance(),
      genSolveSpeed(), genSolveSpeed(),
      genSolveTime(), genSolveTime(),
    ];
  }

  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [idx, questions]);

  const q = questions[idx];
  const grade = (v) => {
    if (q.type==="solve-distance") return gradeSolveDistance(v,q);
    if (q.type==="solve-speed") return gradeSolveSpeed(v,q);
    return gradeSolveTime(v,q);
  };

  const submit = () => {
    if (!val.trim()) return;
    setSubmitted(true);
    if (grade(val.trim())) {
      if (idx < questions.length-1) {
        setTimeout(() => { setIdx(i=>i+1); setSubmitted(false); setWrong(false); setVal(""); }, 400);
      } else { onCorrect(); }
    } else { setWrong(true); onWrong(); }
  };

  const handleRetry = () => {
    setQuestions(buildDSTSet());
    setIdx(0); setSubmitted(false); setWrong(false); setVal("");
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:8 }}>Incorrect - new problem set</div>
      <div style={{ fontSize:20,marginBottom:8 }}>{q.prompt}</div>
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.solution}</strong></div>
        <div style={{ fontSize:20,color:"var(--text2)" }}>Working: {q.workingHint}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleRetry}>New Problem Set</button>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:20,color:"var(--text3)",marginBottom:8 }}>
        <span>Problem {idx+1} of {questions.length}</span>
        <span style={{ color:"var(--blue)",fontWeight:700,textTransform:"capitalize" }}>{q.type.replace("solve-","Find ")}</span>
      </div>
      <div style={{ height:4,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginBottom:14 }}>
        <div style={{ height:"100%",width:(idx/questions.length*100)+"%",background:"var(--blue)",borderRadius:99,transition:"width 0.3s" }} />
      </div>
      <div style={{ fontSize:20,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 18px",marginBottom:14,lineHeight:1.8 }}>{q.prompt}</div>
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="numeric" disabled={submitted}
          style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} disabled={submitted||!val.trim()}>OK</button>
      </div>
      {submitted&&!wrong&&<div style={{ textAlign:"center",marginTop:10,fontSize:20,color:"var(--green)",fontWeight:700 }}>Correct!</div>}
    </div>
  );
}

// -- Steps --
const STEPS = [
  { id:"expr-eq",    label:"Expression or Equation",      description:"5 items, 3 correct sets in a row" },
  { id:"solutions",  label:"Identifying Solutions",        description:"3 correct sets in a row" },
  { id:"one-step-0", label:"One-Step Equations: Type 1",  description:"x + a = b, 3 correct in a row" },
  { id:"one-step-1", label:"One-Step Equations: Type 2",  description:"x - a = b, 3 correct in a row" },
  { id:"one-step-2", label:"One-Step Equations: Type 3",  description:"ax = b, 3 correct in a row" },
  { id:"one-step-3", label:"One-Step Equations: Type 4",  description:"x / a = b, 3 correct in a row" },
  { id:"neg-x",      label:"Solving -x = integer",        description:"3 correct in a row" },
  { id:"dst",        label:"Speed, Distance, Time",        description:"6 problems, 3 correct sets" },
];

export default function Lesson08MasteryPlayer({ user, topic, onHome }) {
  useKaTeX();
  const topicId = topic?.id || LESSON08_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        if (prog.data.completed) { setCompleted(true); setLoading(false); return; }
        if (prog.data.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
        if (prog.data.streak !== undefined) setStreak(prog.data.streak);
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async (si, st, done) => {
    const pct = done ? 100 : Math.round((si / STEPS.length) * 100);
    await fbSaveProgress(user.id, topicId, {
      started:true, completed:done, percentComplete:pct,
      data:{ stepIdx:si, streak:st, completed:done },
    });
    setStepIdx(si); setStreak(st);
    if (done) setCompleted(true);
  };

  const handleCorrect = async () => {
    const newStreak = streak + 1;
    if (newStreak >= STREAK) {
      const nextStep = stepIdx + 1;
      const done = nextStep >= STEPS.length;
      await save(nextStep, 0, done);
    } else {
      await save(stepIdx, newStreak, false);
    }
  };

  const handleWrong = async () => {
    // One-step equations reset to type 1 on wrong
    const isOneStep = STEPS[stepIdx]?.id.startsWith("one-step");
    const resetStep = isOneStep ? 2 : stepIdx; // index 2 = one-step-0
    await save(resetStep, 0, false);
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 8 (019) Complete!</h2>
        <p style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Equations, solutions, and speed/distance/time mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx];
  if (!step) return null;
  const typeIdx = step.id.startsWith("one-step") ? parseInt(step.id.split("-")[2]) : 0;

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:680,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>L8</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>HW 8 (019): Mastery Activities</div>
              <div style={{ fontSize:20,color:"var(--text3)" }}>3 correct in a row to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:16 }}>
          {STEPS.map((s,i) => {
            const done=i<stepIdx, active=i===stepIdx;
            return (
              <div key={s.id} style={{ fontSize:19,fontWeight:700,padding:"3px 10px",borderRadius:99,background:done?"rgba(22,163,74,0.12)":active?"rgba(27,143,255,0.12)":"var(--surface)",color:done?"var(--green)":active?"var(--blue)":"var(--text3)",border:"1px solid "+(done?"rgba(22,163,74,0.3)":active?"rgba(27,143,255,0.3)":"var(--border)") }}>
                {done?"done":s.label}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800 }}>{step.label}</div>
            <div style={{ fontSize:20,color:"var(--text2)" }}>{step.description}</div>
            {step.id.startsWith("one-step") && <div style={{ fontSize:20,color:"var(--text3)",marginTop:2 }}>Wrong answer resets to Type 1</div>}
          </div>
          <StreakDots current={streak} needed={STREAK} />

          {step.id==="expr-eq" && <ExprOrEqMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id==="solutions" && <IdentifySolutionsMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id.startsWith("one-step") && <OneStepEqMastery key={stepIdx+"-"+streak} typeIdx={typeIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id==="neg-x" && <NegXMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id==="dst" && <DSTMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}
