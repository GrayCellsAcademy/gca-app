import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genSignOfProduct, gradeSignOfProduct,
  genNegativePower, gradeNegativePower,
  genNegativeRoot, gradeNegativeRoot,
  genSignedOoO, gradeSignedOoO,
  genSignedVarExpr, gradeSignedVarExpr,
} from "./lesson07Questions";

export const LESSON07_MASTERY_TOPIC_ID = "lesson07-mastery-v1";
const STREAK = 2;

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
    script.onload = () => {};
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
  return <div ref={ref} style={{ fontSize: 26, margin: "6px 0", minHeight: 36 }} />;
}

function KaTeXInline({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const tryRender = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); }
        catch {}
      } else { setTimeout(tryRender, 100); }
    };
    tryRender();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
}

// -- Shared --
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

// -- Activity 2: Sign of Product/Quotient - all 8 simultaneously --
function SignOfProductMastery({ streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genSignOfProduct());
  const exprs = Array.isArray(question.exprs) ? question.exprs : Object.values(question.exprs || {});
  const [answers, setAnswers] = useState(exprs.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const set = (i, v) => setAnswers(prev => prev.map((x,j)=>j===i?v:x));
  const allDone = answers.every(a => a !== "");

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradeSignOfProduct(JSON.stringify(answers), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>Correct answers</div>
        {exprs.map((e,i) => (
          <div key={i} style={{ display:"flex",gap:10,alignItems:"center",marginBottom:4 }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:20,flex:1 }}>{e.display}</span>
            <span style={{ fontWeight:700,fontSize:20,color:e.sign==="+"?"var(--green)":"var(--red)" }}>{e.sign}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <div style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14,fontSize:20,color:"var(--text2)",lineHeight:1.6 }}>
        For each expression below, decide whether the result is <strong style={{ color:"var(--green)" }}>positive (+)</strong> or <strong style={{ color:"var(--red)" }}>negative (-)</strong>.
        Remember: same signs - positive result; different signs - negative result.
        Click <strong>+</strong> or <strong>-</strong> for each row, then click <strong>Submit All</strong>.
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {exprs.map((expr,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 14px" }}>
            <div style={{ flex:1,minWidth:120 }}><KaTeXInline expr={expr.latex} /></div>
            <div style={{ display:"flex",gap:6 }}>
              {["+","-"].map(sym => (
                <button key={sym} onClick={() => !submitted && set(i,sym)}
                  style={{ width:44,height:44,borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===sym?(sym==="+"?"var(--green)":"var(--red)"):"var(--border)"),background:answers[i]===sym?(sym==="+"?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)"):"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:answers[i]===sym?(sym==="+"?"var(--green)":"var(--red)"):"var(--text)" }}>
                  {sym}
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

// -- Activity 3: Sign of Negative Base Powers - all 4 simultaneously --
function NegativePowerMastery({ streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genNegativePower());
  const exprs = Array.isArray(question.exprs) ? question.exprs : Object.values(question.exprs || {});
  const [answers, setAnswers] = useState(exprs.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const set = (i, v) => setAnswers(prev => prev.map((x,j)=>j===i?v:x));
  const allDone = answers.every(a => a !== "");

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradeNegativePower(JSON.stringify(answers), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>Correct answers</div>
        {exprs.map((e,i) => (
          <div key={i} style={{ display:"flex",gap:10,alignItems:"center",marginBottom:6,flexWrap:"wrap" }}>
            <KaTeXInline expr={e.latex} />
            <span style={{ fontWeight:700,fontSize:20,color:e.sign==="+"?"var(--green)":"var(--red)" }}>{e.sign==="+"?"positive":"negative"}</span>
            <span style={{ fontSize:20,color:"var(--text3)" }}>{e.note}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <div style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14,fontSize:20,color:"var(--text2)",lineHeight:1.6 }}>
        For each expression, decide whether the result is <strong style={{ color:"var(--green)" }}>positive (+)</strong> or <strong style={{ color:"var(--red)" }}>negative (-)</strong>.
        Remember: when the exponent is outside the parentheses it applies only to the number, not the sign.
        An even exponent always gives a positive result; an odd exponent keeps the sign of the base.
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:12 }}>
        {exprs.map((expr,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",flexWrap:"wrap" }}>
            <div style={{ flex:1,minWidth:120 }}><KaTeXInline expr={expr.latex} /></div>
            <div style={{ display:"flex",gap:6 }}>
              {["+","-"].map(sym => (
                <button key={sym} onClick={() => !submitted && set(i,sym)}
                  style={{ width:44,height:44,borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===sym?(sym==="+"?"var(--green)":"var(--red)"):"var(--border)"),background:answers[i]===sym?(sym==="+"?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)"):"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:answers[i]===sym?(sym==="+"?"var(--green)":"var(--red)"):"var(--text)" }}>
                  {sym}
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

// -- Activity 4: Roots of Negative Numbers --
function NegativeRootMastery({ streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genNegativeRoot());
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);

  const submit = (v) => {
    const ans = v || val.trim();
    if (!ans) return;
    setSubmitted(true);
    if (gradeNegativeRoot(ans, question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
        <div style={{ fontSize:22,fontWeight:700,color:"var(--green)" }}>
          {question.isUndefined ? "Undefined - square root of a negative is undefined." : question.answer+" - cube root of a negative is negative."}
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ display:"flex",gap:8,marginBottom:10 }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&val.trim()&&submit()} inputMode="text" disabled={submitted}
          style={{ flex:1,textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px" }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 16px" }}
          onMouseDown={e=>{e.preventDefault();val.trim()&&submit();}} disabled={submitted||!val.trim()}>OK</button>
      </div>
      <button className="btn btn-amber" style={{ width:"100%",fontSize:20 }}
        onClick={()=>submit("undefined")} disabled={submitted}>Undefined</button>
    </div>
  );
}

// -- Activity 5: Order of Operations with Signed Numbers --
function SignedOoOMastery({ streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genSignedOoO());
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);

  const submit = () => {
    if (!val.trim()) return;
    setSubmitted(true);
    if (gradeSignedOoO(val.trim(), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
        <div style={{ fontSize:26,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{question.result}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="text" disabled={submitted}
          style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
          disabled={submitted||!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// -- Activity 6: Variable Expressions with Signed Values --
function SignedVarExprMastery({ streak, onCorrect, onWrong }) {
  useKaTeX();
  const [question] = useState(() => genSignedVarExpr());
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);

  const submit = () => {
    if (!val.trim()) return;
    setSubmitted(true);
    if (gradeSignedVarExpr(val.trim(), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:6 }}>{question.given}</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
        <div style={{ fontSize:26,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{question.result}</div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onCorrect}>Try again</button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:6 }}>{question.given}</div>
      <KaTeXBlock expr={question.latex} />
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="text" disabled={submitted}
          style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
          disabled={submitted||!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// -- Steps --
const STEPS = [
  { id:"sign-product",   label:"Sign of Product/Quotient",        description:"All 8 types, 2 correct sets in a row" },
  { id:"negative-power", label:"Sign of Negative Base Powers",    description:"All 4 types, 2 correct sets in a row" },
  { id:"negative-root",  label:"Roots of Negative Numbers",       description:"2 correct in a row" },
  { id:"signed-ooo",     label:"Order of Operations (Signed)",    description:"2 correct in a row" },
  { id:"signed-var",     label:"Variable Expressions (Signed)",   description:"2 correct in a row" },
];

// -- Main Player --
export default function Lesson07MasteryPlayer({ user, topic, onHome }) {
  useKaTeX();
  const topicId = topic?.id || LESSON07_MASTERY_TOPIC_ID;
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

  const handleWrong = async () => save(stepIdx, 0, false);

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 7 (019) Complete!</h2>
        <p style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Signed products, negative powers, roots, and expressions mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx];
  if (!step) return null;

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:680,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>L7</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>HW 7 (019): Mastery Activities</div>
              <div style={{ fontSize:20,color:"var(--text3)" }}>3 correct in a row to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:16 }}>
          {STEPS.map((s,i) => {
            const done=i<stepIdx, active=i===stepIdx;
            return (
              <div key={s.id} style={{ fontSize:20,fontWeight:700,padding:"4px 12px",borderRadius:99,background:done?"rgba(16,185,129,0.12)":active?"rgba(232,99,10,0.12)":"var(--surface)",color:done?"var(--green)":active?"var(--blue)":"var(--text3)",border:"1px solid "+(done?"rgba(16,185,129,0.3)":active?"rgba(232,99,10,0.3)":"var(--border)") }}>
                {done?"done":s.label}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800 }}>{step.label}</div>
            <div style={{ fontSize:20,color:"var(--text2)" }}>{step.description}</div>
          </div>
          <StreakDots current={streak} needed={STREAK} />

          {step.id==="sign-product" && (
            <SignOfProductMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id==="negative-power" && (
            <NegativePowerMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id==="negative-root" && (
            <NegativeRootMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id==="signed-ooo" && (
            <SignedOoOMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id==="signed-var" && (
            <SignedVarExprMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
        </div>
      </div>
    </div>
  );
}
