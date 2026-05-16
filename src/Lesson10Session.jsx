import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON10_TOPICS, generateLesson10Question, gradeLesson10Answer,
  gradeWarmupCItem, gradeRadicalType, gradeRadicalSolve,
  gradeBothSidesResult,
} from "./lesson10Questions";

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
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <div ref={ref} style={{ fontSize: 28, margin: "8px 0", minHeight: 40 }} />;
}

function KaTeXInline({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
}

// -- Rectangle SVG (one L, one W label) --
function RectSVG({ L, W, unit, knownLabel, knownVal, missingLabel, P }) {
  const VW = 480, VH = 300, pad = 70;
  const scale = Math.min((VW-2*pad)/Math.max(L,20), (VH-2*pad)/Math.max(W,20)) * 0.80;
  const rw = L*scale, rh = W*scale;
  const ox = (VW-rw)/2, oy = (VH-rh)/2;
  const f = "#4b5068", g = 26;
  const Llabel = knownLabel==="L" ? `${knownVal} ${unit}` : "?";
  const Wlabel = knownLabel==="W" ? `${knownVal} ${unit}` : "?";
  const Lcol = knownLabel==="L" ? f : "var(--orange)";
  const Wcol = knownLabel==="W" ? f : "var(--orange)";
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",maxWidth:480,display:"block",margin:"0 auto" }}>
      <rect x={ox} y={oy} width={rw} height={rh} fill="rgba(27,143,255,0.07)" stroke="var(--blue)" strokeWidth="2.5"/>
      <text x={ox+rw/2} y={oy+rh+g} textAnchor="middle" fontSize="14" fill={Lcol} fontWeight="700">{Llabel}</text>
      <text x={ox-g} y={oy+rh/2} textAnchor="middle" fontSize="14" fill={Wcol} fontWeight="700" transform={`rotate(-90,${ox-g},${oy+rh/2})`}>{Wlabel}</text>
    </svg>
  );
}

// -- Text Input --
function TextInput({ onSubmit, submitted, placeholder, allowNeg, allowEq, wide }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const filter = allowEq ? v=>v.replace(/[^0-9\-\+\=xa-z\s]/gi,"")
    : allowNeg ? v=>v.replace(/[^0-9\-,a-z\s]/gi,"")
    : v=>v.replace(/[^0-9a-z\s\.]/gi,"");
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val} onChange={e=>setVal(filter(e.target.value))}
        onKeyDown={e=>e.key==="Enter"&&submit()} disabled={submitted}
        placeholder={placeholder||""}
        style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:wide?280:200 }} />
      <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// -- Question Display --
function QuestionDisplay({ question, revealCorrect, topicId, stage }) {
  useKaTeX();
  if (!question) return null;
  const q = question;

  // Warmup A: rectangle
  if (q.type==="warmup-a") {
    return (
      <div style={{ textAlign:"center" }}>
        <RectSVG L={q.L} W={q.W} unit={q.unit} knownLabel={q.knownLabel} knownVal={q.knownVal} missingLabel={q.missingLabel} />
        <div style={{ display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:8,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 18px",width:"fit-content",margin:"8px auto 0" }}>
          <span style={{ fontSize:20,color:"var(--text3)",fontWeight:600 }}>Perimeter:</span>
          <span style={{ fontSize:22,fontWeight:800,fontFamily:"var(--mono)",color:"var(--blue)" }}>P = {q.P} {q.unit}</span>
        </div>
        {revealCorrect && <div style={{ marginTop:8,fontSize:22,fontWeight:800,color:"var(--green)" }}>{q.missingLabel} = {q.displayAnswer}</div>}
      </div>
    );
  }

  // Warmup B: distributive equation
  if (q.type==="warmup-b") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  // Warmup C: four power equations - null (handled by input)
  if (q.type==="warmup-c") return null;

  // Simplify then solve
  if (q.type==="simplify-then-solve") {
    if (stage===1) {
      // Stage 2: show simplified equation
      return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.simplifiedEq.replace("=","=")} /></div>;
    }
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  // Both sides
  if (q.type==="both-sides") {
    if (stage===1) return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /><div style={{ fontSize:20,color:"var(--text2)",marginTop:4 }}>Which variable term will you eliminate?</div></div>;
    if (stage===2) return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
    if (stage===3) {
      const eq = q._eliminatedA ? q.resultEqA : q.resultEqB;
      return <div style={{ textAlign:"center" }}><KaTeXBlock expr={eq} /></div>;
    }
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  // Both sides with simplification
  if (q.type==="both-sides-simplify") {
    if (stage===0) return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /><div style={{ fontSize:20,color:"var(--text2)",marginTop:4 }}>Simplify the LEFT side only.</div></div>;
    if (stage===1) return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /><div style={{ fontSize:20,color:"var(--text2)",marginTop:4 }}>Now simplify the RIGHT side only.</div></div>;
    if (stage===2) {
      const simplified = `${q.simplifiedLHS} = ${q.simplifiedRHS}`;
      return <div style={{ textAlign:"center" }}><KaTeXBlock expr={simplified} /><div style={{ fontSize:20,color:"var(--text2)",marginTop:4 }}>Which variable term will you eliminate?</div></div>;
    }
    if (stage===3) {
      const simplified = `${q.simplifiedLHS} = ${q.simplifiedRHS}`;
      return <div style={{ textAlign:"center" }}><KaTeXBlock expr={simplified} /></div>;
    }
    if (stage===4) return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.resultEq} /></div>;
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  // No solution - handled by input component
  if (q.type==="no-solution") return null;

  // Radical equations - handled by input
  if (q.type==="radical-equations") return null;

  return null;
}

// -- Answer Inputs --

// Warmup C: four power equations simultaneously
function WarmupCInput({ question, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(question.eqs.map(()=>""));
  const allDone = answers.every(a=>a.trim()!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));

  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:14 }}>
        {question.eqs.map((eq,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
            <KaTeXBlock expr={eq.latex} />
            <div style={{ display:"flex",gap:8,marginTop:8 }}>
              <input value={answers[i]==="no solution"?"":answers[i]}
                onChange={e=>set(i,e.target.value.replace(/[^0-9\-,]/g,""))}
                disabled={submitted||answers[i]==="no solution"}
                placeholder=""
                style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"8px",flex:1,opacity:answers[i]==="no solution"?0.4:1 }} />
              <button onClick={()=>!submitted&&set(i,answers[i]==="no solution"?"":"no solution")}
                style={{ padding:"8px 14px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]==="no solution"?"var(--red)":"var(--border)"),background:answers[i]==="no solution"?"rgba(239,68,68,0.12)":"var(--surface)",fontFamily:"var(--font)",fontSize:19,fontWeight:700,cursor:"pointer",color:answers[i]==="no solution"?"var(--red)":"var(--text2)",whiteSpace:"nowrap" }}>
                No Solution
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Both sides: stage 1 - choose which term to eliminate
function BothSidesElimInput({ question, onSubmit, submitted }) {
  const [choice, setChoice] = useState("");
  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:10 }}>Select which variable term to eliminate:</div>
      <div style={{ display:"flex",gap:12,justifyContent:"center",marginBottom:12 }}>
        {[question.aStr, question.cStr].map(opt=>(
          <button key={opt} onClick={()=>!submitted&&setChoice(opt)}
            style={{ padding:"12px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+(choice===opt?"var(--blue)":"var(--border)"),background:choice===opt?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:22,fontWeight:800,cursor:"pointer",color:choice===opt?"var(--blue)":"var(--text)" }}>
            {opt}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(choice)} disabled={submitted||!choice}>Submit</button>
    </div>
  );
}

// No solution/all real numbers selector
function NoSolutionSelector({ options, onSubmit, submitted, multi }) {
  const OPTS = ["all real numbers","no solution"];
  const [answers, setAnswers] = useState(multi?options.map(()=>""):"");
  const allDone = multi ? answers.every(a=>a!=="") : answers!=="";

  if (multi) {
    return (
      <div>
        {options.map((opt,i)=>(
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ marginBottom:8 }}><KaTeXInline expr={opt} /></div>
            <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
              {OPTS.map(o=>(
                <button key={o} onClick={()=>!submitted&&setAnswers(prev=>prev.map((x,j)=>j===i?o:x))}
                  style={{ padding:"8px 18px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===o?"var(--blue)":"var(--border)"),background:answers[i]===o?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:20,fontWeight:700,cursor:"pointer",color:answers[i]===o?"var(--blue)":"var(--text)",textTransform:"capitalize" }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
          onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:12 }}>
        {OPTS.map(o=>(
          <button key={o} onClick={()=>!submitted&&setAnswers(o)}
            style={{ padding:"10px 22px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers===o?"var(--blue)":"var(--border)"),background:answers===o?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:20,fontWeight:700,cursor:"pointer",color:answers===o?"var(--blue)":"var(--text)",textTransform:"capitalize" }}>
            {o}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(answers)} disabled={submitted||!answers}>Submit</button>
    </div>
  );
}

// Radical equations: stage 1 type identification
function RadicalTypeInput({ question, onSubmit, submitted }) {
  useKaTeX();
  const TYPES = ["No solution","One positive solution","One negative solution","Solution is zero"];
  const [answers, setAnswers] = useState(question.eqs.map(()=>""));
  const allDone = answers.every(a=>a!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:12 }}>
        {question.eqs.map((eq,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px" }}>
            <KaTeXBlock expr={eq.latex} />
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:6 }}>
              {TYPES.map(t=>(
                <button key={t} onClick={()=>!submitted&&set(i,t)}
                  style={{ padding:"5px 12px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===t?"var(--blue)":"var(--border)"),background:answers[i]===t?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:19,fontWeight:700,cursor:"pointer",color:answers[i]===t?"var(--blue)":"var(--text)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Radical equations: stage 2 - solve one at a time (teacher cycles through)
function RadicalSolveDisplay({ eq, revealCorrect }) {
  useKaTeX();
  return (
    <div style={{ textAlign:"center" }}>
      <KaTeXBlock expr={eq.latex} />
      {revealCorrect && (
        <div style={{ marginTop:8,fontSize:20,color:"var(--green)",fontWeight:700 }}>
          {eq.displayAnswer}
          <div style={{ fontSize:19,color:"var(--text3)",fontWeight:400,marginTop:4 }}><KaTeXInline expr={eq.explanation} /></div>
        </div>
      )}
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted, topicId, stage, extra }) {
  if (!question) return null;

  if (question.type==="warmup-a") return (
    <div>
      <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Enter {question.missingLabel} with units (e.g. 14 ft)</div>
      <TextInput onSubmit={onSubmit} submitted={submitted} placeholder={`e.g. 24 ${question.unit}`} />
    </div>
  );

  if (question.type==="warmup-b") return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;

  if (question.type==="warmup-c") return <WarmupCInput question={question} onSubmit={onSubmit} submitted={submitted} />;

  if (question.type==="simplify-then-solve") {
    if (stage===0) return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Simplify the left side of the equation only. Do not solve.</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowEq placeholder="e.g. 8x-12" wide />
      </div>
    );
    return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;
  }

  if (question.type==="both-sides") {
    if (stage===1) return <BothSidesElimInput question={question} onSubmit={onSubmit} submitted={submitted} />;
    if (stage===2) return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Write the resulting equation (e.g. 3x+3=9)</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowEq placeholder="e.g. 3x+3=9" wide />
      </div>
    );
    return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;
  }

  if (question.type==="both-sides-simplify") {
    if (stage===0) return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Simplify the left side of the equation only. Do not solve.</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowEq placeholder="e.g. 10x+3" wide />
      </div>
    );
    if (stage===1) return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Simplify the right side (e.g. 5x+9)</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowEq placeholder="e.g. 5x+9" wide />
      </div>
    );
    if (stage===2) return <BothSidesElimInput question={{ aStr:question.aStr, cStr:question.eStr }} onSubmit={onSubmit} submitted={submitted} />;
    if (stage===3) return (
      <div>
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6 }}>Write the resulting equation</div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowEq placeholder="e.g. 5x=6" wide />
      </div>
    );
    return <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder="Enter x value" />;
  }

  if (question.type==="no-solution") {
    if (stage===0) return (
      <NoSolutionSelector
        options={question.trivial.map(t=>t.latex)}
        onSubmit={onSubmit} submitted={submitted} multi />
    );
    if (stage===1) return (
      <div>
        <div style={{ textAlign:"center",marginBottom:12 }}><KaTeXBlock expr={question.stage2Latex} /></div>
        <NoSolutionSelector options={null} onSubmit={onSubmit} submitted={submitted} multi={false} />
      </div>
    );
    return (
      <div>
        <div style={{ textAlign:"center",marginBottom:12 }}><KaTeXBlock expr={question.stage3Latex} /></div>
        <NoSolutionSelector options={null} onSubmit={onSubmit} submitted={submitted} multi={false} />
      </div>
    );
  }

  if (question.type==="radical-equations") {
    if (stage===0) return <RadicalTypeInput question={question} onSubmit={onSubmit} submitted={submitted} />;
    // Stage 1: solve individual equations (teacher cycles, eqIdx passed via extra)
    const eqIdx = extra?.eqIdx || 0;
    const eq = question.eqs[eqIdx];
    return (
      <div>
        <RadicalSolveDisplay eq={eq} revealCorrect={false} />
        <div style={{ fontSize:20,color:"var(--text3)",marginBottom:6,textAlign:"center" }}>
          {eq.solutionType==="no solution" ? 'Type "no solution"' : "Enter the value of x"}
        </div>
        <TextInput onSubmit={onSubmit} submitted={submitted} allowNeg placeholder={eq.solutionType==="no solution"?"no solution":"Enter x"} />
      </div>
    );
  }

  return null;
}

// -- Grade wrapper --
function gradeAnswer(input, question, topicId, stage, extra) {
  if (!question || !input) return false;
  const q = { ...question };

  if (q.type==="warmup-a") return gradeLesson10Answer(input,q,"");
  if (q.type==="warmup-b") return gradeLesson10Answer(input,q,"");

  if (q.type==="warmup-c") {
    try {
      const answers = JSON.parse(input);
      return q.eqs.every((eq,i) => gradeWarmupCItem(answers[i]||"", eq));
    } catch { return false; }
  }

  if (q.type==="simplify-then-solve") {
    if (stage===0) return gradeLesson10Answer(input,q,"lhs");
    return gradeLesson10Answer(input,q,"");
  }

  if (q.type==="both-sides") {
    if (stage===1) return gradeLesson10Answer(input,q,"elim");
    if (stage===2) {
      q._eliminatedA = extra?.eliminatedA;
      return gradeLesson10Answer(input,q,"result");
    }
    return gradeLesson10Answer(input,q,"");
  }

  if (q.type==="both-sides-simplify") {
    if (stage===0) return gradeLesson10Answer(input,q,"lhs");
    if (stage===1) return gradeLesson10Answer(input,q,"rhs");
    if (stage===2) return gradeLesson10Answer(input,q,"elim");
    if (stage===3) return gradeLesson10Answer(input,q,"result");
    return gradeLesson10Answer(input,q,"");
  }

  if (q.type==="no-solution") {
    if (stage===0) {
      try {
        const answers = JSON.parse(input);
        return gradeLesson10Answer(answers[0],q,"trivial0") && gradeLesson10Answer(answers[1],q,"trivial1");
      } catch { return false; }
    }
    if (stage===1) return gradeLesson10Answer(input,q,"stage2");
    return gradeLesson10Answer(input,q,"stage3");
  }

  if (q.type==="radical-equations") {
    if (stage===0) {
      try {
        const answers = JSON.parse(input);
        return q.eqs.every((eq,i) => gradeRadicalType(answers[i]||"",eq));
      } catch { return false; }
    }
    const eqIdx = extra?.eqIdx||0;
    return gradeRadicalSolve(input, q.eqs[eqIdx]);
  }

  return false;
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
    return ()=>clearInterval(id);
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
function TeacherLesson10({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(120);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [eqIdx, setEqIdx] = useState(0);
  const [eliminatedA, setEliminatedA] = useState(null);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON10_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]); revealedRef.current=false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return ()=>unsub();
  }, [question?.id]);

  const handleGenerate = async (topicIdx, stageOverride) => {
    const tIdx = topicIdx !== undefined ? topicIdx : currentTopicIdx;
    const q = generateLesson10Question(LESSON10_TOPICS[tIdx].id);
    const qId = "q_"+Date.now().toString(36);
    const st = stageOverride !== undefined ? stageOverride : 0;
    q.id=qId; q.points=POINTS; q._topicId=LESSON10_TOPICS[tIdx].id; q._stage=st;
    revealedRef.current=false; setAnswers([]); setStage(st); setEqIdx(0); setEliminatedA(null);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question",currentQuestion:q,
      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
      questionCount:(session.questionCount||0)+1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current=true;
    for (const ans of answers) {
      if (gradeAnswer(ans.answer,question,question?._topicId,stage,{eliminatedA,eqIdx}))
        await addToScore(sessionId,ans.uid,POINTS);
    }
    await updateDoc(doc(db,"sessions",sessionId),{status:"revealing"});
  };

  const handleNextStage = async () => {
    if (!question) return;
    const q = question;
    const nextStage = stage+1;
    // For both-sides stage1 answer, detect which was eliminated
    if (q.type==="both-sides"&&stage===1&&answers.length>0) {
      const ans = answers[0]?.answer||"";
      const elimA = ans.toLowerCase().replace(/\s/g,"")===(q.aStr||"").toLowerCase().replace(/\s/g,"");
      setEliminatedA(elimA);
      q._eliminatedA = elimA;
    }
    const qId = "q_"+Date.now().toString(36);
    const updatedQ = {...q,id:qId,_stage:nextStage};
    revealedRef.current=false; setAnswers([]); setStage(nextStage);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question",currentQuestion:updatedQ,
      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
      questionCount:(session.questionCount||0)+1,
    });
  };

  const handleNextEq = async () => {
    const next = eqIdx+1;
    if (!question||next>=question.eqs?.length) return;
    setEqIdx(next);
    const qId="q_"+Date.now().toString(36);
    const updatedQ={...question,id:qId,_stage:1,_eqIdx:next};
    revealedRef.current=false; setAnswers([]);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question",currentQuestion:updatedQ,
      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db,"sessions",sessionId),{status:"ended"});
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a=>gradeAnswer(a.answer,question,question?._topicId,stage,{eliminatedA,eqIdx})).length;

  // Stage labels for multi-stage topics
  const stageLabel = () => {
    if (!question) return "";
    if (question.type==="simplify-then-solve") return stage===0?"Stage 1: Simplify LHS":"Stage 2: Solve";
    if (question.type==="both-sides") return ["Stage 1: Choose Term to Eliminate","Stage 2: Write Result Equation","Stage 3: Solve"][stage-1]||"";
    if (question.type==="both-sides-simplify") return ["Stage 1: Simplify LHS","Stage 2: Simplify RHS","Stage 3: Choose Term","Stage 4: Write Result","Stage 5: Solve"][stage]||"";
    if (question.type==="no-solution") return ["Stage 1: Trivial Cases","Stage 2: No Simplification","Stage 3: After Simplification"][stage]||"";
    if (question.type==="radical-equations") return stage===0?"Stage 1: Identify Type":"Stage 2: Solve Equations ("+eqIdx+"/6)";
    return "";
  };

  // Correct answer for reveal
  const correctAnswerText = () => {
    if (!question) return "";
    if (question.type==="warmup-c") {
      return question.eqs.map(eq=>eq.displayAnswer).join(" | ");
    }
    if (question.type==="simplify-then-solve") return stage===0?question.simplifiedLHS:`x = ${question.x}`;
    if (question.type==="both-sides") {
      if (stage===1) return `${question.aStr} or ${question.cStr} (either valid)`;
      if (stage===2) return eliminatedA?question.resultEqA:question.resultEqB;
      return `x = ${question.x}`;
    }
    if (question.type==="both-sides-simplify") {
      if (stage===0) return question.simplifiedLHS;
      if (stage===1) return question.simplifiedRHS;
      if (stage===2) return `${question.aStr} or ${question.eStr}`;
      if (stage===3) return question.resultEq;
      return `x = ${question.x}`;
    }
    if (question.type==="no-solution") {
      if (stage===0) return question.trivial.map(t=>t.answer).join(", ");
      if (stage===1) return question.stage2Answer;
      return question.stage3Answer;
    }
    if (question.type==="radical-equations"&&stage===1) {
      return question.eqs[eqIdx]?.displayAnswer||"";
    }
    return question.displayAnswer||"";
  };

  const hasNextStage = () => {
    if (!question) return false;
    if (question.type==="simplify-then-solve") return stage===0;
    if (question.type==="both-sides") return stage<3;
    if (question.type==="both-sides-simplify") return stage<4;
    if (question.type==="no-solution") return stage<2;
    if (question.type==="radical-equations") return stage===0;
    return false;
  };

  const hasNextEq = question?.type==="radical-equations"&&stage===1&&eqIdx<(question.eqs?.length||0)-1;

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
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e=>setTimerInput(Number(e.target.value))}
                style={{ width:70,padding:"6px 10px",fontSize:20,textAlign:"center" }} />
            </div>
            {session.status==="question"&&<button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status==="revealing"&&(
              <>
                <button className="btn btn-ghost" onClick={()=>handleGenerate()}>Repeat Topic</button>
                {hasNextStage()&&<button className="btn btn-primary" onClick={handleNextStage}>Next Stage</button>}
                {hasNextEq&&<button className="btn btn-primary" onClick={handleNextEq}>Next Equation ({eqIdx+2}/6)</button>}
                {!hasNextStage()&&!hasNextEq&&currentTopicIdx<LESSON10_TOPICS.length-1&&(
                  <button className="btn btn-primary" onClick={()=>{
                    const next=currentTopicIdx+1;
                    setCurrentTopicIdx(next);
                    handleGenerate(next,0);
                  }}>Next: {LESSON10_TOPICS[currentTopicIdx+1]?.label}</button>
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
          {LESSON10_TOPICS.map((t,i)=>{
            const isActive=i===currentTopicIdx, isDone=i<currentTopicIdx;
            return (
              <button key={t.id} onClick={()=>setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(27,143,255,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(22,163,74,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"6px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:18,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>{t.label}</div>
                <div style={{ fontSize:17,color:"var(--text3)" }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop:8,fontSize:20 }}
            onClick={()=>handleGenerate()} disabled={session.status==="question"}>
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
                <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>
                  {currentTopic.label} {stageLabel()&&`- ${stageLabel()}`}
                </div>
                <div style={{ fontSize:20,color:"var(--text3)",marginBottom:8 }}>
                  {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} topicId={question._topicId} stage={stage} />
                {session.status==="question"&&session.timerEndsAt&&(
                  <div style={{ marginTop:12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds}
                      onExpired={async()=>{if(!revealedRef.current)await handleReveal();}} />
                  </div>
                )}
                {session.status==="revealing"&&(
                  <div style={{ marginTop:12,background:"rgba(22,163,74,0.06)",border:"1px solid rgba(22,163,74,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                    <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{correctAnswerText()}</div>
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
                    const correct=has&&gradeAnswer(ans.answer,question,question._topicId,stage,{eliminatedA,eqIdx});
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(22,163,74,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:20 }}>{p.name}</span>
                        {has?(
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            {session.status==="revealing"&&<span style={{ fontFamily:"var(--mono)",fontSize:19,color:"var(--text2)" }}>{String(ans.answer).slice(0,24)}</span>}
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
function StudentLesson10({ session, sessionId, uid }) {
  useKaTeX();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants||{};
  const myScore = participants[uid]?.totalScore||0;
  const stage = question?._stage||0;
  const eqIdx = question?._eqIdx||0;

  useEffect(()=>{
    if(question?.id&&question.id!==lastQId){setSubmitted(false);setResult(null);setLastQId(question.id);}
  },[question?.id]);

  const handleSubmit = async (inputVal) => {
    if(!question||submitted) return;
    const ans=String(inputVal).trim();
    if(!ans) return;
    const correct=gradeAnswer(ans,question,question._topicId,stage,{eqIdx});
    await setDoc(doc(db,"sessions",sessionId,"answers",uid+"_"+question.id),{
      uid,questionId:question.id,answer:ans,correct,submittedAt:Date.now(),
    });
    if(correct) await addToScore(sessionId,uid,POINTS);
    setResult({correct,answer:ans});
    setSubmitted(true);
  };

  if(session.status==="waiting") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Waiting for teacher...</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Lesson 10 - Linear Equations</p>
    </div>
  );
  if(session.status==="ended") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Session ended</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  // Stage label for student
  const stageLabelStudent = () => {
    if (!question) return "";
    if (question.type==="simplify-then-solve") return stage===0?"Simplify the left side":"Solve for x";
    if (question.type==="both-sides") return ["Choose term to eliminate","Write resulting equation","Solve for x"][stage-1]||"";
    if (question.type==="both-sides-simplify") return ["Simplify left side","Simplify right side","Choose term to eliminate","Write resulting equation","Solve for x"][stage]||"";
    if (question.type==="no-solution") return ["Identify trivial cases","Variables cancel - what type?","After simplification - what type?"][stage]||"";
    if (question.type==="radical-equations") return stage===0?"Identify solution types":"Solve: equation "+(eqIdx+1)+" of 6";
    return "";
  };

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
            {stageLabelStudent()&&<div style={{ fontSize:20,fontWeight:700,color:"var(--blue)",marginBottom:10 }}>{stageLabelStudent()}</div>}
            <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} topicId={question._topicId} stage={stage} />
          </>
        )}
        {session.status==="revealing"?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            {result?(
              <div style={{ fontSize:22,fontWeight:800,color:result.correct?"var(--green)":"var(--red)" }}>
                {result.correct?"Correct! +"+POINTS+" pts":"Incorrect"}
              </div>
            ):<div style={{ color:"var(--text3)",fontSize:20 }}>No answer submitted.</div>}
          </div>
        ):submitted?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            <div style={{ fontSize:20,fontWeight:700,color:"var(--green)" }}>Submitted! Waiting for reveal...</div>
          </div>
        ):question?(
          <div style={{ marginTop:14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted}
              topicId={question._topicId} stage={stage} extra={{ eqIdx }} />
          </div>
        ):null}
      </div>
    </div>
  );
}

// -- Session Creator --
function CreateLesson10Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ getTeacherClasses(user.id).then(setClasses); },[]);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const joinCode=Math.random().toString(36).slice(2,7).toUpperCase();
      const sessionId="sess_"+Date.now().toString(36);
      await setDoc(doc(db,"sessions",sessionId),{
        id:sessionId,teacherId:user.id,classId:selectedClass,
        joinCode,type:"lesson10",status:"waiting",
        currentQuestion:null,questionCount:0,
        timerSeconds:timer,timerEndsAt:null,
        participants:{},createdAt:Date.now(),
      });
      onCreated(sessionId);
    } catch(e){ console.error(e); alert("Error: "+e.message); setLoading(false); }
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>Lesson 10 - Linear Equations</h2>
        <p style={{ color:"var(--text2)",fontSize:20,marginBottom:16 }}>Multiple variable occurrences, variables on both sides, no solution, and radical equations.</p>
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
export default function Lesson10Session({ user, onHome }) {
  const [view, setView] = useState("create");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  useEffect(()=>{
    if(!sessionId) return;
    const unsub=onSessionChange(sessionId,setSession);
    return ()=>unsub();
  },[sessionId]);
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:1200,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff" }}>L10</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>GCA - Lesson 10</div>
              <div style={{ color:"var(--text3)",fontSize:20 }}>Linear Equations</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create"&&<CreateLesson10Session user={user} onCreated={(sid)=>{setSessionId(sid);setView("session");}} />}
        {view==="session"&&session&&(
          user.role==="teacher"
            ?<TeacherLesson10 session={session} sessionId={sessionId} uid={user.id} />
            :<StudentLesson10 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session"&&!session&&(
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson10 as Lesson10TeacherView, StudentLesson10 as Lesson10StudentView };
