import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genMultipleSigned, gradeMultipleSigned,
  genDistributive, gradeDistributive,
  genCombineLikeTerms, gradeCombineLikeTerms,
  genProductRule, gradeProductRule,
} from "./lesson06Questions";

export const LESSON06_MASTERY_TOPIC_ID = "lesson06-mastery-v1";
const STREAK = 3;

// - KaTeX -
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
    script.onload = () => {
      document.querySelectorAll("[data-katex]").forEach(el => {
        try { window.katex.render(el.dataset.katex, el, { throwOnError: false, displayMode: true }); }
        catch {}
      });
    };
    document.head.appendChild(script);
  }, []);
}

function KaTeXBlock({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const tryRender = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); }
        catch {}
      } else { setTimeout(tryRender, 100); }
    };
    tryRender();
  });
  return <div ref={ref} style={{ fontSize: 28, margin: "8px 0", minHeight: 40 }} />;
}

// - Shared UI -
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

function NumInput({ onSubmit, submitted, allowNeg }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val}
        onChange={e=>setVal(e.target.value.replace(allowNeg?/[^0-9\-]/g:/[^0-9]/g,""))}
        onKeyDown={e=>e.key==="Enter"&&submit()} inputMode={allowNeg?"text":"numeric"}
        disabled={submitted}
        style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
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
        Enter answer (e.g. {placeholder}). Use lowercase letters.
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

// - Activity 2: Multiple Signed Numbers -
function MultipleSignedActivity({ streak, onCorrect, onWrong }) {
  const [question] = useState(() => genMultipleSigned());
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const handleSubmit = (input) => {
    setSubmitted(true);
    if (gradeMultipleSigned(input, question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Worked solution</div>
        <div style={{ fontSize:20,color:"var(--text2)",fontFamily:"var(--mono)" }}>
          {question.nums.map((n,i) => (i===0?n:(n>=0?" + "+n:" + ("+n+")"))).join("")} = <strong style={{ color:"var(--green)" }}>{question.result}</strong>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <KaTeXBlock expr={question.latex} />
      <NumInput onSubmit={handleSubmit} submitted={submitted} allowNeg />
    </div>
  );
}

// - Activity 3: Distributive Property -
// 6 sequential types, wrong = back to type 0
const DIST_LABELS = [
  "Type 1: a(bx+c)",
  "Type 2: (bx+c)a",
  "Type 3: a(bx-c)",
  "Type 4: -a(bx-c)",
  "Type 5: -(bx-c)",
  "Type 6: a(bx-cy-d)",
];

function DistributiveActivity({ typeIdx, streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genDistributive(typeIdx));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const handleSubmit = (input) => {
    setSubmitted(true);
    if (gradeDistributive(input, question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect - back to Type 1</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
        <div style={{ fontSize:24,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{question.answer}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Continue</button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:8 }}>{DIST_LABELS[typeIdx]}</div>
      <KaTeXBlock expr={question.latex} />
      <AlgebraInput onSubmit={handleSubmit} submitted={submitted} placeholder={question.answer} />
    </div>
  );
}

// - Activity 4: Combining Like Terms -
const COMBINE_LABELS = [
  "Type 1: 3 terms, one pair",
  "Type 2: 4 terms, one pair cancels",
  "Type 3: 5 terms, two pairs",
  "Type 4: Distribute then combine",
];

function CombineActivity({ typeIdx, streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genCombineLikeTerms(typeIdx));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const handleSubmit = (input) => {
    setSubmitted(true);
    if (gradeCombineLikeTerms(input, question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect - back to Type 1</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
        <div style={{ fontSize:24,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{question.answer}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Continue</button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:8 }}>{COMBINE_LABELS[typeIdx]}</div>
      <KaTeXBlock expr={question.latex} />
      <AlgebraInput onSubmit={handleSubmit} submitted={submitted} placeholder={question.answer} />
    </div>
  );
}

// - Activity 5: Product Rule -
function ProductRuleActivity({ streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genProductRule());
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const handleSubmit = (input) => {
    setSubmitted(true);
    if (gradeProductRule(input, question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Worked solution</div>
        <div style={{ fontSize:20,color:"var(--text2)" }}>
          Coefficients: {question.a} - {question.b} = <strong style={{ color:"var(--green)" }}>{question.coeff}</strong>
        </div>
        <div style={{ fontSize:20,color:"var(--text2)" }}>
          Exponents: {question.m} + {question.n} = <strong style={{ color:"var(--green)" }}>{question.exp}</strong>
        </div>
        <div style={{ fontSize:24,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)",marginTop:6 }}>{question.answer}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <KaTeXBlock expr={question.latex} />
      <AlgebraInput onSubmit={handleSubmit} submitted={submitted} placeholder={question.answer} />
    </div>
  );
}

// - Step definitions -
// stepIdx encodes: 0=signed, 1-6=dist type 0-5, 7-10=combine type 0-3, 11=product
// streak resets within each activity type

const TOTAL_DIST_TYPES = 6;
const TOTAL_COMBINE_TYPES = 4;

function stepLabel(stepIdx) {
  if (stepIdx === 0) return "Multiple Signed Numbers";
  if (stepIdx >= 1 && stepIdx <= 6) return "Distributive Property (Type " + stepIdx + "/6)";
  if (stepIdx >= 7 && stepIdx <= 10) return "Combining Like Terms (Type " + (stepIdx-6) + "/4)";
  if (stepIdx === 11) return "Product Rule";
  return "Complete!";
}

const TOTAL_STEPS = 12; // 0..11

// - Main Player -
export default function Lesson06MasteryPlayer({ user, topic, onHome }) {
  useKaTeX();
  const topicId = topic?.id || LESSON06_MASTERY_TOPIC_ID;
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

  const save = async (si, st, done) => {
    const pct = done ? 100 : Math.round((si / TOTAL_STEPS) * 100);
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
      // Advance to next step
      const nextStep = stepIdx + 1;
      const done = nextStep >= TOTAL_STEPS;
      await save(nextStep, 0, done);
    } else {
      await save(stepIdx, newStreak, false);
    }
  };

  // Wrong: for distributive and combine, reset to beginning of that activity
  const handleWrong = async () => {
    let resetStep = stepIdx;
    if (stepIdx >= 1 && stepIdx <= 6) resetStep = 1;       // back to dist type 1
    else if (stepIdx >= 7 && stepIdx <= 10) resetStep = 7; // back to combine type 1
    await save(resetStep, 0, false);
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 6 (019) Complete!</h2>
        <p style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Signed numbers, distributive property, like terms, and product rule mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  // Determine which activity to show
  const isSigned = stepIdx === 0;
  const isDist = stepIdx >= 1 && stepIdx <= 6;
  const isCombine = stepIdx >= 7 && stepIdx <= 10;
  const isProduct = stepIdx === 11;
  const distTypeIdx = isDist ? stepIdx - 1 : 0;
  const combineTypeIdx = isCombine ? stepIdx - 7 : 0;

  // Roadmap labels
  const SECTIONS = [
    { label:"Signed Numbers",      range:[0,0] },
    { label:"Distributive",        range:[1,6] },
    { label:"Combining Terms",     range:[7,10] },
    { label:"Product Rule",        range:[11,11] },
  ];

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:680,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>L6</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>HW 6 (019): Mastery Activities</div>
              <div style={{ fontSize:20,color:"var(--text3)" }}>3 correct in a row to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        {/* Roadmap */}
        <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
          {SECTIONS.map((sec,i) => {
            const [lo,hi] = sec.range;
            const done = stepIdx > hi;
            const active = stepIdx >= lo && stepIdx <= hi;
            return (
              <div key={i} style={{ fontSize:20,fontWeight:700,padding:"4px 12px",borderRadius:99,background:done?"rgba(16,185,129,0.12)":active?"rgba(232,99,10,0.12)":"var(--surface)",color:done?"var(--green)":active?"var(--blue)":"var(--text3)",border:"1px solid "+(done?"rgba(16,185,129,0.3)":active?"rgba(232,99,10,0.3)":"var(--border)") }}>
                {done?"done":sec.label}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800 }}>{stepLabel(stepIdx)}</div>
            {(isDist||isCombine) && (
              <div style={{ fontSize:20,color:"var(--text3)",marginTop:2 }}>Wrong answer resets to Type 1</div>
            )}
          </div>
          <StreakDots current={streak} needed={STREAK} />

          {isSigned && (
            <MultipleSignedActivity key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {isDist && (
            <DistributiveActivity key={stepIdx+"-"+streak} typeIdx={distTypeIdx} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {isCombine && (
            <CombineActivity key={stepIdx+"-"+streak} typeIdx={combineTypeIdx} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {isProduct && (
            <ProductRuleActivity key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
        </div>
      </div>
    </div>
  );
}
