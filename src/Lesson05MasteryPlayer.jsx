import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genCompareSignedNumbers, genAbsoluteValue, genMultipleMinus,
  genSignedExpressions,
  gradeCompareSignedNumbers, gradeAbsoluteValue, gradeMultipleMinus,
} from "./lesson05Questions";

export const LESSON05_MASTERY_TOPIC_ID = "lesson05-mastery-v1";
const MASTERY_STREAK = 3;
const SIGNED_STREAK = 8; // all 8 expressions correct in a row

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
        <div key={i} style={{ width:13,height:13,borderRadius:"50%",background:i<current?"var(--green)":"var(--surface2)",border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20,color:"var(--text3)",marginLeft:6 }}>{current}/{needed}</span>
    </div>
  );
}

function WrongReveal({ question, onNext }) {
  const q = question;
  return (
    <div style={{ animation:"popIn 0.25s ease" }}>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect</div>
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Correct answer</div>
        {q.type === "compare-signed" && (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {q.pairs.map((p,i) => (
              <div key={i} style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700,color:"var(--green)" }}>
                {p.a} <span style={{ color:"var(--green)" }}>{p.answer}</span> {p.b}
              </div>
            ))}
          </div>
        )}
        {q.type === "absolute-value" && (
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            {q.questions.map((item,i) => (
              <div key={i} style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700,color:"var(--green)" }}>
                {item.expr} = {item.answer}
              </div>
            ))}
          </div>
        )}
        {q.type === "multiple-minus" && (
          <div style={{ fontSize:24,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{q.answer}</div>
        )}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onNext}>Try again</button>
    </div>
  );
}

// - Activity 2: Compare Signed Numbers -
function CompareSignedMastery({ streak, onCorrect, onWrong }) {
  const [question] = useState(() => genCompareSignedNumbers());
  const [answers, setAnswers] = useState(question.pairs.map(()=>""));
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);

  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  const allDone = answers.every(a=>a!=="");

  const handleSubmit = () => {
    setSubmitted(true);
    const input = JSON.stringify(answers);
    if (gradeCompareSignedNumbers(input, question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return <WrongReveal question={question} onNext={onCorrect} />;

  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:16 }}>
        {question.pairs.map((pair,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:24,fontWeight:700,minWidth:44,textAlign:"right" }}>{pair.a}</span>
            <div style={{ display:"flex",gap:8 }}>
              {["<",">","="].map(sym=>(
                <button key={sym} onClick={()=>!submitted&&set(i,sym)}
                  style={{ width:44,height:44,borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===sym?"var(--blue)":"var(--border)"),background:answers[i]===sym?"rgba(59,130,246,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:answers[i]===sym?"var(--blue)":"var(--text)" }}>
                  {sym}
                </button>
              ))}
            </div>
            <span style={{ fontFamily:"var(--mono)",fontSize:24,fontWeight:700,minWidth:44 }}>{pair.b}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={handleSubmit} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// - Activity 3: Absolute Value -
function AbsValueMastery({ streak, onCorrect, onWrong }) {
  const [question] = useState(() => genAbsoluteValue());
  const [answers, setAnswers] = useState(["","",""]);
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setTimeout(()=>ref.current?.focus(),80); }, []);

  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  const allDone = answers.every(a=>a!=="");

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradeAbsoluteValue(JSON.stringify(answers.map(Number)), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return <WrongReveal question={question} onNext={onCorrect} />;

  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:14 }}>
        {question.questions.map((item,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:12,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700,flex:1 }}>{item.expr} =</span>
            <input ref={i===0?ref:null} value={answers[i]}
              onChange={e=>set(i,e.target.value.replace(/\D/g,""))}
              onKeyDown={e=>e.key==="Enter"&&allDone&&handleSubmit()}
              inputMode="numeric" disabled={submitted}
              style={{ width:80,textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"8px" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={handleSubmit} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// - Activity 4: Multiple Minus Signs -
function MultipleMinusMastery({ streak, onCorrect, onWrong }) {
  const [question] = useState(() => genMultipleMinus());
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);

  const handleSubmit = () => {
    setSubmitted(true);
    if (gradeMultipleMinus(val.trim(), question)) { onCorrect(); }
    else { setWrong(true); onWrong(); }
  };

  if (wrong) return <WrongReveal question={question} onNext={onCorrect} />;

  return (
    <div>
      <div style={{ textAlign:"center",margin:"16px 0" }}>
        <KaTeX expr={question.latex} />
      </div>
      <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:14 }}>
        <input ref={ref} value={val}
          onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
          inputMode="text" disabled={submitted}
          style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }} />
        <button className="btn btn-primary" style={{ fontSize:22,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();handleSubmit();}} onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
          disabled={submitted||!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// - Activity 5: Signed Number Operations - 4-Stage per question -
function buildSignedQuestions() {
  return shuffle(genSignedExpressions().exprs);
}

function SignedOpsMastery({ onComplete, onSave, savedStreak }) {
  const [questions, setQuestions] = useState(()=>buildSignedQuestions());
  const [qIdx, setQIdx] = useState(0);
  const [streak, setStreak] = useState(savedStreak || 0);
  const [stage, setStage] = useState(1); // 1,2,3,4
  const [wrong, setWrong] = useState(false);
  const [val, setVal] = useState("");
  const ref = useRef(null);

  const expr = questions[qIdx];
  const totalQ = questions.length;

  const [s1Sel, setS1Sel] = useState(""); // stage 1 selections
  const [s2Sel, setS2Sel] = useState("");

  // Reset selections when expression changes
  useEffect(() => { setS1Sel(""); setS2Sel(""); setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [qIdx, stage]);

  const handleWrong = async () => {
    setWrong(true);
    const newStreak = 0;
    setStreak(0);
    await onSave(newStreak);
    // reshuffle after showing wrong
  };

  const handleWrongNext = () => {
    setWrong(false);
    setStage(1);
    // Reshuffle questions, start from 0
    setQuestions(buildSignedQuestions());
    setQIdx(0);
  };

  const handleStageAnswer = async (answer) => {
    let correct = false;
    if (stage === 1) {
      correct = answer.num1 === expr.num1Sign && answer.num2 === expr.num2Sign;
    } else if (stage === 2) {
      correct = answer.addOrSub === expr.addOrSub;
    } else if (stage === 3) {
      correct = answer.ansSign === expr.answerSign;
    } else if (stage === 4) {
      correct = parseInt(answer.value) === expr.result;
    }

    if (!correct) {
      await handleWrong();
    } else if (stage < 4) {
      setStage(s => s + 1);
    } else {
      // All 4 stages correct for this expression
      const newStreak = streak + 1;
      setStreak(newStreak);
      await onSave(newStreak);
      if (newStreak >= SIGNED_STREAK) {
        onComplete();
      } else {
        setStage(1);
        setQIdx(i => (i + 1) % totalQ);
      }
    }
  };

  const SignBtn = ({ label, color, onClick }) => (
    <button onClick={onClick}
      style={{ padding:"12px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+color,background:color+"22",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color }}>
      {label}
    </button>
  );

  const WrongDisplay = () => (
    <div style={{ animation:"popIn 0.25s ease" }}>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"var(--red)",marginBottom:12 }}>Incorrect - streak reset</div>
      <div style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"14px",marginBottom:14 }}>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>Correct answer</div>
        <KaTeX expr={expr.latex} />
        <div style={{ display:"flex",flexDirection:"column",gap:6,marginTop:8 }}>
          <div style={{ fontSize:20,color:"var(--text2)" }}>
            1st number: <strong style={{ color:expr.num1Sign==="+"?"var(--green)":"var(--red)" }}>{expr.num1Sign==="+"?"positive":"negative"}</strong>
          </div>
          <div style={{ fontSize:20,color:"var(--text2)" }}>
            2nd number: <strong style={{ color:expr.num2Sign==="+"?"var(--green)":"var(--red)" }}>{expr.num2Sign==="+"?"positive":"negative"}</strong>
          </div>
          <div style={{ fontSize:20,color:"var(--text2)" }}>
            We should: <strong style={{ color:"var(--blue)" }}>{expr.addOrSub.toUpperCase()}</strong>
          </div>
          <div style={{ fontSize:20,color:"var(--text2)" }}>
            Answer sign: <strong style={{ color:expr.answerSign==="+"?"var(--green)":"var(--red)" }}>{expr.answerSign==="+"?"positive":"negative"}</strong>
          </div>
          <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>
            = {expr.result}
          </div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleWrongNext}>
        Try again (reshuffled)
      </button>
    </div>
  );

  return (
    <div>
      {/* Progress */}
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:20,color:"var(--text3)",marginBottom:8 }}>
        <span>Expression {(qIdx%totalQ)+1}/{totalQ}</span>
        <span>Streak: {streak}/{SIGNED_STREAK}</span>
      </div>
      <div style={{ height:6,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginBottom:16 }}>
        <div style={{ height:"100%",width:(streak/SIGNED_STREAK*100)+"%",background:"var(--green)",borderRadius:99,transition:"width 0.3s" }} />
      </div>

      {/* Stage indicator */}
      <div style={{ display:"flex",gap:6,marginBottom:16 }}>
        {["Signs","Add/Sub","Ans Sign","Calculate"].map((lbl,i)=>(
          <div key={i} style={{ flex:1,padding:"6px 4px",borderRadius:"var(--radius-sm)",textAlign:"center",fontSize:20,fontWeight:700,background:i+1===stage?"rgba(232,99,10,0.12)":i+1<stage?"rgba(16,185,129,0.12)":"var(--surface)",color:i+1===stage?"var(--blue)":i+1<stage?"var(--green)":"var(--text3)",border:"1px solid "+(i+1===stage?"rgba(232,99,10,0.3)":i+1<stage?"rgba(16,185,129,0.3)":"var(--border)") }}>
            {lbl}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Expression */}
        <div style={{ textAlign:"center",marginBottom:16 }}>
          <KaTeX expr={expr.latex} />
        </div>

        {wrong ? <WrongDisplay /> : (
          <>
            {stage === 1 && (
              <div>
                <div style={{ fontSize:22,fontWeight:700,color:"var(--text2)",marginBottom:14,textAlign:"center" }}>
                  What is the sign of each number?
                </div>
                <div style={{ display:"flex",gap:24,justifyContent:"center",flexWrap:"wrap",marginBottom:16 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>1st number</div>
                    <div style={{ display:"flex",gap:10 }}>
                      <button onClick={()=>setS1Sel("+")}
                        style={{ padding:"12px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+(s1Sel==="+"?"var(--green)":"var(--border)"),background:s1Sel==="+"?"rgba(16,185,129,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:s1Sel==="+"?"var(--green)":"var(--text3)" }}>+</button>
                      <button onClick={()=>setS1Sel("-")}
                        style={{ padding:"12px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+(s1Sel==="-"?"var(--red)":"var(--border)"),background:s1Sel==="-"?"rgba(239,68,68,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:s1Sel==="-"?"var(--red)":"var(--text3)" }}>-</button>
                    </div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>2nd number</div>
                    <div style={{ display:"flex",gap:10 }}>
                      <button onClick={()=>setS2Sel("+")}
                        style={{ padding:"12px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+(s2Sel==="+"?"var(--green)":"var(--border)"),background:s2Sel==="+"?"rgba(16,185,129,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:s2Sel==="+"?"var(--green)":"var(--text3)" }}>+</button>
                      <button onClick={()=>setS2Sel("-")}
                        style={{ padding:"12px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+(s2Sel==="-"?"var(--red)":"var(--border)"),background:s2Sel==="-"?"rgba(239,68,68,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:700,cursor:"pointer",color:s2Sel==="-"?"var(--red)":"var(--text3)" }}>-</button>
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
                  onClick={()=>handleStageAnswer({ num1:s1Sel,num2:s2Sel })}
                  disabled={!s1Sel||!s2Sel}>Submit</button>
              </div>
            )}
            {stage === 2 && (
              <div>
                <div style={{ fontSize:22,fontWeight:700,color:"var(--text2)",marginBottom:8,textAlign:"center" }}>
                  <span style={{ color:expr.num1Sign==="+"?"var(--green)":"var(--red)" }}>{expr.num1Sign==="+"?"(+)":"(-)"}</span>
                  {" and "}
                  <span style={{ color:expr.num2Sign==="+"?"var(--green)":"var(--red)" }}>{expr.num2Sign==="+"?"(+)":"(-)"}</span>
                </div>
                <div style={{ fontSize:22,fontWeight:700,color:"var(--text2)",marginBottom:14,textAlign:"center" }}>
                  Should we add or subtract the absolute values?
                </div>
                <div style={{ display:"flex",gap:16,justifyContent:"center" }}>
                  <SignBtn label="ADD" color="var(--blue)" onClick={()=>handleStageAnswer({ addOrSub:"add" })} />
                  <SignBtn label="SUBTRACT" color="var(--purple)" onClick={()=>handleStageAnswer({ addOrSub:"sub" })} />
                </div>
              </div>
            )}
            {stage === 3 && (
              <div>
                <div style={{ fontSize:22,fontWeight:700,color:"var(--text2)",marginBottom:8,textAlign:"center" }}>
                  We {expr.addOrSub.toUpperCase()} the absolute values.
                </div>
                <div style={{ fontSize:22,fontWeight:700,color:"var(--text2)",marginBottom:14,textAlign:"center" }}>
                  What is the sign of the answer?
                </div>
                <div style={{ display:"flex",gap:16,justifyContent:"center" }}>
                  <SignBtn label="Positive +" color="var(--green)" onClick={()=>handleStageAnswer({ ansSign:"+" })} />
                  <SignBtn label="Negative -" color="var(--red)" onClick={()=>handleStageAnswer({ ansSign:"-" })} />
                </div>
              </div>
            )}
            {stage === 4 && (
              <div>
                <div style={{ fontSize:22,fontWeight:700,color:"var(--text2)",marginBottom:14,textAlign:"center" }}>
                  Calculate the answer. Include the sign if negative.
                </div>
                <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
                  <input ref={ref} value={val}
                    onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
                    onKeyDown={e=>e.key==="Enter"&&val.trim()&&handleStageAnswer({ value:val.trim() })}
                    inputMode="text"
                    style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }} />
                  <button className="btn btn-primary" style={{ fontSize:22,padding:"10px 20px" }}
                    onMouseDown={e=>{e.preventDefault();val.trim()&&handleStageAnswer({ value:val.trim() });}}
                    onTouchEnd={e=>{e.preventDefault();val.trim()&&handleStageAnswer({ value:val.trim() });}}
                    disabled={!val.trim()}>OK</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// - Steps definition -
const STEPS = [
  { id:"compare-signed", label:"Comparing Signed Numbers", description:"3 pairs, 3 correct sets in a row" },
  { id:"absolute-value", label:"Absolute Value",           description:"3 questions, 3 correct sets in a row" },
  { id:"multiple-minus", label:"Multiple Minus Signs",     description:"3 correct in a row" },
  { id:"signed-ops",     label:"Signed Number Operations", description:"All 8 expressions, 4 stages each" },
];

// - Main Player -
export default function Lesson05MasteryPlayer({ user, topic, onHome }) {
  useKaTeX();
  const topicId = topic?.id || LESSON05_MASTERY_TOPIC_ID;
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

  const handleCorrect = () => {
    const newStreak = streak + 1;
    if (newStreak >= MASTERY_STREAK) {
      const nextStep = stepIdx + 1;
      const done = nextStep >= STEPS.length;
      save(nextStep, 0, done);
    } else {
      save(stepIdx, newStreak, false);
    }
  };

  const handleWrong = () => save(stepIdx, 0, false);

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 5 (019) Complete!</h2>
        <p style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Signed numbers mastered!</p>
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
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>L5</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>HW 5 (019): Signed Numbers Mastery</div>
              <div style={{ fontSize:20,color:"var(--text3)" }}>3 correct in a row to advance</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        {/* Roadmap */}
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

          {step.id !== "signed-ops" && (
            <StreakDots current={streak} needed={MASTERY_STREAK} />
          )}

          {step.id === "compare-signed" && (
            <CompareSignedMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id === "absolute-value" && (
            <AbsValueMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id === "multiple-minus" && (
            <MultipleMinusMastery key={stepIdx+"-"+streak} streak={streak} onCorrect={handleCorrect} onWrong={handleWrong} />
          )}
          {step.id === "signed-ops" && (
            <SignedOpsMastery
              key={stepIdx}
              savedStreak={streak}
              onSave={async (st) => { await save(stepIdx, st, false); }}
              onComplete={() => save(STEPS.length, 0, true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
