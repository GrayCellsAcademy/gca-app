import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON11_MASTERY_TOPIC_ID = "lesson11-mastery-v1";

const STREAK3 = 2;
const STREAK5 = 5;

// - Helpers -
function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function parseIneq(str) {
  const s = String(str).trim().toLowerCase()
    .replace(/\u2264/g,"<=").replace(/\u2265/g,">=").replace(/\s+/g,"");
  const m = s.match(/^x([<>]=?)(-?\d+)$|^(-?\d+)([<>]=?)x$/);
  if (!m) return null;
  if (m[1]) return { sym: m[1], val: parseInt(m[2]) };
  const flip = {"<":">",">":"<","<=":">=",">=":"<="};
  return { sym: flip[m[4]], val: parseInt(m[3]) };
}

function ineqEqual(a, b) {
  if (!a || !b) return false;
  return a.sym === b.sym && a.val === b.val;
}

function symDisplay(sym) {
  return {"<":"<",">":">","<=":"\u2264",">=":"\u2265"}[sym] || sym;
}

// - Shared UI -
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:14 }}>
      {Array.from({ length:needed }).map((_,i) => (
        <div key={i} style={{ width:13,height:13,borderRadius:"50%",background:i<current?"var(--green)":"var(--surface2)",border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20,color:"var(--text3)",marginLeft:6 }}>{current}/{needed}</span>
    </div>
  );
}

function FeedbackBanner({ correct, message, onNext, nextLabel }) {
  return (
    <div style={{ textAlign:"center",marginTop:12 }}>
      <div style={{ fontSize:24,fontWeight:800,color:correct?"var(--green)":"var(--red)",marginBottom:10 }}>
        {correct?"Correct!":"Incorrect"}
      </div>
      {message && (
        <div style={{ fontSize:20,color:"var(--text2)",marginBottom:14,background:correct?"rgba(22,163,74,0.06)":"rgba(239,68,68,0.06)",border:"1px solid "+(correct?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)"),borderRadius:"var(--radius-sm)",padding:"10px 16px" }}>
          {message}
        </div>
      )}
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onNext}>
        {nextLabel||(correct?"Next":"Try Again")}
      </button>
    </div>
  );
}

function IneqInput({ onSubmit, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, []);
  const addSym = (sym) => {
    setVal(v => v.includes("x") ? v.trimEnd()+" "+sym+" " : "x "+sym+" ");
    setTimeout(()=>ref.current?.focus(),0);
  };
  const submit = () => { if(val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div>
      <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:8 }}>
        {[">","<",">=","<="].map(sym=>(
          <button key={sym} onClick={()=>addSym(sym)}
            style={{ padding:"8px 16px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border2)",background:"var(--surface)",fontSize:22,fontWeight:800,fontFamily:"var(--mono)",cursor:"pointer",color:"var(--blue)" }}>
            {sym}
          </button>
        ))}
      </div>
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder={placeholder||"e.g. x > 3"}
          style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:200 }} />
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} disabled={!val.trim()}>OK</button>
      </div>
    </div>
  );
}

// - Activity 3: Checking Solutions -
const INEQ_SYMS = ["<",">","<=",">="];

function genCheckSolution() {
  const sym = randChoice(INEQ_SYMS);
  const boundary = randInt(-8,8);
  // Generate a test value: 50% chance it's a solution
  const isSolution = Math.random() < 0.5;
  let testVal;
  if (isSolution) {
    if (sym===">") testVal = boundary + randInt(1,5);
    else if (sym==="<") testVal = boundary - randInt(1,5);
    else if (sym===">=") testVal = boundary + randInt(0,4);
    else testVal = boundary - randInt(0,4);
  } else {
    if (sym===">") testVal = boundary - randInt(0,4);
    else if (sym==="<") testVal = boundary + randInt(0,4);
    else if (sym===">=") testVal = boundary - randInt(1,5);
    else testVal = boundary + randInt(1,5);
  }
  const symStr = symDisplay(sym);
  return {
    inequality:`x ${symStr} ${boundary}`,
    testVal, boundary, sym, isSolution,
    answer: isSolution ? "yes" : "no",
    displayAnswer: isSolution ? "Yes" : "No",
  };
}

function CheckSolutionMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genCheckSolution());
  const [feedback, setFeedback] = useState(null);

  const handleAnswer = (ans) => {
    const correct = (ans==="yes") === q.isSolution;
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <div style={{ textAlign:"center",marginBottom:16 }}>
        <div style={{ fontSize:26,fontWeight:800,fontFamily:"var(--mono)",marginBottom:8 }}>{q.inequality}</div>
        <div style={{ fontSize:22,color:"var(--text2)" }}>Is <strong style={{ fontFamily:"var(--mono)" }}>x = {q.testVal}</strong> a solution?</div>
      </div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? `x = ${q.testVal} ${q.isSolution?"satisfies":"does not satisfy"} ${q.inequality}` : `x = ${q.testVal}: ${q.isSolution?"Yes, it is":"No, it is not"} a solution to ${q.inequality}`}
          onNext={()=>{ setFeedback(null); setQ(genCheckSolution()); }}
          nextLabel="Next Problem" />
      ) : (
        <div style={{ display:"flex",gap:12,justifyContent:"center" }}>
          {["Yes","No"].map(opt=>(
            <button key={opt} onClick={()=>handleAnswer(opt.toLowerCase())}
              style={{ padding:"14px 36px",borderRadius:"var(--radius-sm)",border:"2px solid "+(opt==="Yes"?"var(--green)":"var(--red)"),background:opt==="Yes"?"rgba(22,163,74,0.1)":"rgba(239,68,68,0.1)",fontSize:22,fontWeight:800,cursor:"pointer",color:opt==="Yes"?"var(--green)":"var(--red)" }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// - Activity 4: One-Step Inequalities (4 sequential types) -
const ONE_STEP_TYPES = [
  { label:"Type 1: x + a > b",   form:"add",    sym:">",  posCoeff:true  },
  { label:"Type 2: x - a \u2264 b", form:"sub", sym:"<=", posCoeff:true  },
  { label:"Type 3: ax \u2265 b", form:"mul",    sym:">=", posCoeff:true  },
  { label:"Type 4: ax < b",      form:"mulneg", sym:"<",  posCoeff:false },
];

function genOneStepIneq(typeIdx) {
  const t = ONE_STEP_TYPES[typeIdx];
  let latex, answer, workHint;
  if (t.form==="add") {
    const a=randInt(1,12), b=randInt(-15,15); if(b===0) return genOneStepIneq(typeIdx);
    const sol=b-a;
    latex=`x + ${a} > ${b}`;
    answer={sym:">",val:sol};
    workHint=`Subtract ${a} from both sides: x > ${sol}`;
  } else if (t.form==="sub") {
    const a=randInt(1,12), b=randInt(-15,15); if(b===0) return genOneStepIneq(typeIdx);
    const sol=b+a;
    latex=`x - ${a} \\leq ${b}`;
    answer={sym:"<=",val:sol};
    workHint=`Add ${a} to both sides: x \u2264 ${sol}`;
  } else if (t.form==="mul") {
    const a=randInt(2,9), sol=randInt(-9,9); if(sol===0) return genOneStepIneq(typeIdx);
    const b=a*sol;
    latex=`${a}x \\geq ${b}`;
    answer={sym:">=",val:sol};
    workHint=`Divide both sides by ${a}: x \u2265 ${sol}`;
  } else {
    const a=randInt(2,9), sol=randInt(-9,9); if(sol===0) return genOneStepIneq(typeIdx);
    const b=(-a)*sol; // -ax < b - x > b/(-a) = sol, but flip sign
    latex=`-${a}x < ${b}`;
    answer={sym:">",val:sol};
    workHint=`Divide both sides by -${a} (flip sign): x > ${sol}`;
  }
  return { latex, answer, workHint, display:`x ${symDisplay(answer.sym)} ${answer.val}` };
}

function OneStepIneqMastery({ typeIdx, onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genOneStepIneq(typeIdx));
  const [feedback, setFeedback] = useState(null);
  const t = ONE_STEP_TYPES[typeIdx];

  const handleSubmit = (val) => {
    const parsed = parseIneq(val);
    const correct = ineqEqual(parsed, q.answer);
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",fontWeight:600,marginBottom:6 }}>{t.label}</div>
      <div style={{ textAlign:"center",fontSize:28,fontWeight:800,fontFamily:"var(--mono)",marginBottom:16 }}>{q.latex.replace(/\\leq/g,"\u2264").replace(/\\geq/g,"\u2265")}</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? `Answer: ${q.display}` : `${q.workHint} - Back to Type 1`}
          onNext={()=>{ setFeedback(null); setQ(genOneStepIneq(typeIdx)); }}
          nextLabel="Next Problem" />
      ) : (
        <IneqInput key={q.latex} onSubmit={handleSubmit} placeholder={`e.g. x ${symDisplay(q.answer.sym)} ${q.answer.val}`} />
      )}
    </div>
  );
}

// - Activity 5: Two-Step Inequalities -
function genTwoStepIneq() {
  for(let i=0;i<200;i++){
    const a=(Math.random()<0.5?-1:1)*randInt(2,8);
    const b=randInt(-15,15); if(b===0) continue;
    const sym=randChoice([">","<","<=",">="]);
    const sol=randInt(-9,9); if(sol===0) continue;
    const c=a*sol+b;
    if(Math.abs(c)>30) continue;
    const flips=a<0;
    const resultSym=flips?{">":" <","<":">","<=":">=",">=":"<="}[sym]:sym;
    const aStr=a===1?"x":a===-1?"-x":`${a}x`;
    const bStr=b>0?`+ ${b}`:`- ${Math.abs(b)}`;
    const symStr={"<":"<",">":">","<=":"\u2264",">=":"\u2265"}[sym];
    const display=`x ${symDisplay(resultSym)} ${sol}`;
    const workHint=`${b>0?"Subtract":"Add"} ${Math.abs(b)} both sides, then divide by ${a}${flips?" (flip sign)":""}: ${display}`;
    return {
      latex:`${aStr} ${bStr} ${symStr} ${c}`,
      answer:{sym:resultSym,val:sol},
      display, workHint,
    };
  }
  return { latex:"2x + 3 > 7", answer:{sym:">",val:2}, display:"x > 2", workHint:"Subtract 3, divide by 2: x > 2" };
}

function TwoStepIneqMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genTwoStepIneq());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    const parsed = parseIneq(val);
    const correct = ineqEqual(parsed, q.answer);
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <div style={{ textAlign:"center",fontSize:28,fontWeight:800,fontFamily:"var(--mono)",marginBottom:16 }}>
        {q.latex.replace(/\\leq/g,"\u2264").replace(/\\geq/g,"\u2265")}
      </div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct ? `Answer: ${q.display}` : q.workHint}
          onNext={()=>{ setFeedback(null); setQ(genTwoStepIneq()); }}
          nextLabel="Next Problem" />
      ) : (
        <IneqInput key={q.latex} onSubmit={handleSubmit} placeholder={`e.g. x > 3`} />
      )}
    </div>
  );
}

// - Activity 6: Special Cases -
function genSpecialCase() {
  const allReal = Math.random() < 0.5;
  const a = randInt(2,5), b = randInt(1,8), c = randInt(1,6);
  const sym = randChoice(["<",">","<=",">="]);
  const symStr = {"<":"<",">":">","<=":"\u2264",">=":"\u2265"}[sym];
  if (allReal) {
    // a(x+b)+c sym ax+ab+c - always true
    const rhs = a*b+c;
    return {
      latex:`${a}(x + ${b}) + ${c} ${symStr} ${a}x + ${rhs}`,
      allReal:true, answer:"all real numbers", displayAnswer:"All real numbers",
    };
  } else {
    // a(x+b)+c sym ax+(ab+c+k) - always false
    const k = randInt(1,5);
    const rhs = a*b+c+k;
    return {
      latex:`${a}(x + ${b}) + ${c} ${symStr} ${a}x + ${rhs}`,
      allReal:false, answer:"no solution", displayAnswer:"No solution",
    };
  }
}

function SpecialCaseMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genSpecialCase());
  const [feedback, setFeedback] = useState(null);

  const handleAnswer = (ans) => {
    const correct = ans===q.answer;
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,fontFamily:"var(--mono)",marginBottom:16 }}>{q.latex}</div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={`Answer: ${q.displayAnswer}`}
          onNext={()=>{ setFeedback(null); setQ(genSpecialCase()); }}
          nextLabel="Next Problem" />
      ) : (
        <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
          {["all real numbers","no solution"].map(opt=>(
            <button key={opt} onClick={()=>handleAnswer(opt)}
              style={{ padding:"12px 20px",borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)",fontSize:20,fontWeight:700,cursor:"pointer",color:"var(--text)",textTransform:"capitalize" }}>
              {opt==="all real numbers"?"All Real Numbers":"No Solution"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// - Activity 7: Mixed Inequalities -
function genMixedIneq() {
  const type = randChoice(["one-step","two-step","special"]);
  if (type==="one-step") {
    const t = randInt(0,3);
    const q = genOneStepIneq(t);
    return { ...q, type:"one-step", isSpecial:false };
  } else if (type==="two-step") {
    const q = genTwoStepIneq();
    return { ...q, type:"two-step", isSpecial:false };
  } else {
    const q = genSpecialCase();
    return { ...q, type:"special", isSpecial:true };
  }
}

function MixedIneqMastery({ onCorrect, onWrong }) {
  const [q, setQ] = useState(() => genMixedIneq());
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = (val) => {
    let correct = false;
    if (q.isSpecial) {
      const s = val.trim().toLowerCase().replace(/\s/g,"");
      correct = (s==="allrealnumbers"||s==="allreals")&&q.allReal || s==="nosolution"&&!q.allReal;
    } else {
      correct = ineqEqual(parseIneq(val), q.answer);
    }
    setFeedback({ correct });
    if (correct) onCorrect(); else onWrong();
  };

  const handleAnswer = (ans) => handleSubmit(ans);

  return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,fontFamily:"var(--mono)",marginBottom:16 }}>
        {q.latex.replace(/\\leq/g,"\u2264").replace(/\\geq/g,"\u2265")}
      </div>
      {feedback ? (
        <FeedbackBanner correct={feedback.correct}
          message={q.isSpecial ? `Answer: ${q.displayAnswer}` : (q.workHint||`Answer: ${q.display}`)}
          onNext={()=>{ setFeedback(null); setQ(genMixedIneq()); }}
          nextLabel="Next Problem" />
      ) : q.isSpecial ? (
        <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
          {["all real numbers","no solution"].map(opt=>(
            <button key={opt} onClick={()=>handleAnswer(opt)}
              style={{ padding:"12px 20px",borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)",fontSize:20,fontWeight:700,cursor:"pointer",color:"var(--text)",textTransform:"capitalize" }}>
              {opt==="all real numbers"?"All Real Numbers":"No Solution"}
            </button>
          ))}
        </div>
      ) : (
        <IneqInput key={q.latex} onSubmit={handleSubmit} placeholder="e.g. x > 3" />
      )}
    </div>
  );
}

// - Steps -
const STEPS = [
  { id:"check-sol",   label:"Checking Solutions",        description:"Yes/No - 3 correct in a row",           streak:STREAK3 },
  { id:"one-step-0",  label:"One-Step: Type 1 (x+a>b)",  description:"3 correct in a row",                    streak:STREAK3 },
  { id:"one-step-1",  label:"One-Step: Type 2 (x-a\u2264b)", description:"3 correct in a row",                streak:STREAK3 },
  { id:"one-step-2",  label:"One-Step: Type 3 (ax\u2265b)", description:"3 correct in a row",                 streak:STREAK3 },
  { id:"one-step-3",  label:"One-Step: Type 4 (ax<b, a<0)", description:"3 correct in a row",                 streak:STREAK3 },
  { id:"two-step",    label:"Two-Step Inequalities",      description:"Enter solution as inequality, 3 in a row", streak:STREAK3 },
  { id:"special",     label:"Special Cases",              description:"All Real or No Solution, 3 in a row",   streak:STREAK3 },
  { id:"mixed",       label:"Mixed Inequalities",         description:"Mix of all types, 5 in a row",          streak:STREAK5 },
];

export default function Lesson11MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON11_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data?.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
      if (prog?.data?.streak !== undefined) setStreak(prog.data.streak);
      setLoading(false);
    };
    load();
  }, []);

  const save = async (si, st, done) => {
    const pct = done ? 100 : Math.min(100, Math.round((si / STEPS.length) * 100));
    await fbSaveProgress(user.id, topicId, {
      started:true, completed:done, percentComplete:pct,
      data:{ stepIdx:si, streak:st, completed:done },
    });
    setStepIdx(si); setStreak(st);
    if (done) setCompleted(true);
  };

  const handleCorrect = async () => {
    const needed = STEPS[stepIdx]?.streak || STREAK3;
    const newStreak = streak + 1;
    if (newStreak >= needed) {
      const nextStep = stepIdx + 1;
      await save(nextStep, 0, nextStep >= STEPS.length);
    } else {
      await save(stepIdx, newStreak, false);
    }
  };

  const handleWrong = async () => {
    // One-step: reset to Type 1 (step index 1)
    const isOneStep = STEPS[stepIdx]?.id.startsWith("one-step");
    const resetIdx = isOneStep ? 1 : stepIdx;
    await save(resetIdx, 0, false);
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 11 (019) Complete!</h2>
        <p style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Inequalities mastered!</p>
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
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>L11</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>HW 11 (019): Mastery Activities</div>
              <div style={{ fontSize:20,color:"var(--text3)" }}>Complete each activity to advance</div>
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
          <StreakDots current={streak} needed={step.streak} />

          {step.id==="check-sol"  && <CheckSolutionMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id.startsWith("one-step") && <OneStepIneqMastery key={stepIdx+"-"+streak} typeIdx={typeIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id==="two-step"   && <TwoStepIneqMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id==="special"    && <SpecialCaseMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id==="mixed"      && <MixedIneqMastery key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}
