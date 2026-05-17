import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON11_TOPICS, generateLesson11Question,
  gradeWarmupA, gradeWarmupB, gradeWarmupC,
  gradeIsSolution, gradeIsSolutionItem,
  gradeSolutionSet,
  gradeNumberLineMatch,
  gradeSignFlip, gradeSignFlipItem,
  gradeOneStepIneqs, gradeOneStepIneqItem,
  gradeTwoStepIneq, genTwoStepIneqItem,
  gradeSpecialCases, gradeSpecialCasesItem,
  gradeSolveClassify,
} from "./lesson11Questions";

const POINTS = 5;

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
    s.async = true;
    document.head.appendChild(s);
  }, []);
}

function KaTeX({ expr, block }) {
  const ref = useRef(null);
  useEffect(() => {
    const go = () => {
      if (window.katex && ref.current) {
        try { window.katex.render(expr, ref.current, { throwOnError:false, displayMode:!!block }); } catch {}
      } else setTimeout(go, 100);
    };
    go();
  });
  return block
    ? <div ref={ref} style={{ fontSize:26, margin:"6px 0", minHeight:36 }} />
    : <span ref={ref} style={{ fontSize:22 }} />;
}

// -- Number Line SVG --
function NumberLineSVG({ val, circle, direction, label }) {
  const W=300, H=70, mid=150, unit=30;
  const cx = mid + val*unit;
  const color = "var(--blue)";
  // arrow points left or right from circle
  const arrowX1 = direction==="right" ? cx : cx;
  const arrowX2 = direction==="right" ? W-10 : 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", maxWidth:300, display:"block", margin:"0 auto" }}>
      {/* axis */}
      <line x1={10} y1={35} x2={W-10} y2={35} stroke="var(--text2)" strokeWidth="2"/>
      <polygon points={`${W-10},35 ${W-20},30 ${W-20},40`} fill="var(--text2)"/>
      {/* tick marks */}
      {[-4,-3,-2,-1,0,1,2,3,4].map(n=>{
        const x=mid+n*unit;
        if(x<15||x>W-15) return null;
        return <g key={n}><line x1={x} y1={30} x2={x} y2={40} stroke="var(--text3)" strokeWidth="1.5"/>
          <text x={x} y={55} textAnchor="middle" fontSize="11" fill="var(--text3)">{n+val===0?0:n}</text></g>;
      })}
      {/* solution arrow */}
      <line x1={cx} y1={35} x2={arrowX2} y2={35} stroke={color} strokeWidth="3"/>
      {direction==="right"
        ? <polygon points={`${arrowX2},35 ${arrowX2-8},30 ${arrowX2-8},40`} fill={color}/>
        : <polygon points={`${arrowX2},35 ${arrowX2+8},30 ${arrowX2+8},40`} fill={color}/>}
      {/* circle */}
      {circle==="open"
        ? <circle cx={cx} cy={35} r={7} fill="var(--bg)" stroke={color} strokeWidth="2.5"/>
        : <circle cx={cx} cy={35} r={7} fill={color}/>}
      {/* label */}
      {label && <text x={15} y={16} fontSize="14" fontWeight="800" fill={color}>{label}</text>}
    </svg>
  );
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

// -- Question Display (teacher+student) --
function QuestionDisplay({ question: q, revealCorrect, extra }) {
  useKaTeX();
  if (!q) return null;

  if (q.type==="warmup-a"||q.type==="warmup-b") return (
    <div style={{ textAlign:"center" }}><KaTeX expr={q.latex} block /></div>
  );
  if (q.type==="warmup-c") return (
    <div style={{ textAlign:"center" }}><KaTeX expr={q.latex} block /></div>
  );

  if (q.type==="is-solution") return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {q.statements.map((s,i)=>(
        <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <KaTeX expr={s.latex} />
          {revealCorrect&&<span style={{ fontWeight:800,fontSize:20,color:s.answer?"var(--green)":"var(--red)",marginLeft:12 }}>{s.answer?"Yes":"No"}</span>}
        </div>
      ))}
    </div>
  );

  if (q.type==="solution-set") return (
    <div style={{ textAlign:"center" }}>
      <KaTeX expr={q.latex} block />
      <div style={{ display:"flex",gap:16,justifyContent:"center",marginTop:8 }}>
        {q.options.map((n,i)=>(
          <div key={i} style={{ fontSize:26,fontWeight:800,fontFamily:"var(--mono)" }}>{n}</div>
        ))}
      </div>
      {revealCorrect&&<div style={{ marginTop:8,fontSize:20,color:"var(--green)",fontWeight:700 }}>{q.displayAnswer}</div>}
    </div>
  );

  if (q.type==="number-line-match") return (
    <div>
      <div style={{ textAlign:"center",marginBottom:12 }}><KaTeX expr={q.latex} block /></div>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center" }}>
        {q.options.map((opt,i)=>(
          <div key={i} style={{ background:revealCorrect&&opt.correct?"rgba(22,163,74,0.1)":"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px",border:revealCorrect&&opt.correct?"2px solid var(--green)":"1px solid var(--border)",minWidth:160 }}>
            <div style={{ fontSize:20,fontWeight:800,color:"var(--blue)",marginBottom:4 }}>{opt.label}</div>
            <NumberLineSVG val={q.val} circle={opt.circle} direction={opt.direction} />
          </div>
        ))}
      </div>
    </div>
  );

  if (q.type==="sign-flip") return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {q.items.map((item,i)=>(
        <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <KaTeX expr={item.latex} />
          {revealCorrect&&<span style={{ fontWeight:800,fontSize:20,color:item.flips?"var(--orange)":"var(--green)",marginLeft:12 }}>{item.flips?"Flip":"No flip"}</span>}
        </div>
      ))}
    </div>
  );

  if (q.type==="one-step-ineqs") return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {q.items.map((item,i)=>(
        <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <KaTeX expr={item.latex} />
          {revealCorrect&&<span style={{ fontWeight:800,fontSize:20,color:"var(--green)",marginLeft:12 }}>{item.display}</span>}
        </div>
      ))}
    </div>
  );

  if (q.type==="two-step-ineq") return (
    <div style={{ textAlign:"center" }}>
      <KaTeX expr={q.latex} block />
      {revealCorrect&&<div style={{ fontSize:20,color:"var(--green)",fontWeight:700,marginTop:8 }}>{q.display||q.displayAnswer}</div>}
    </div>
  );

  if (q.type==="special-cases") return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {q.items.map((item,i)=>(
        <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <KaTeX expr={item.latex} />
          {revealCorrect&&<span style={{ fontWeight:800,fontSize:20,color:item.allReal?"var(--green)":"var(--red)",marginLeft:12 }}>{item.allReal?"All real":"No solution"}</span>}
        </div>
      ))}
    </div>
  );

  if (q.type==="solve-classify") return (
    <div style={{ textAlign:"center" }}>
      <KaTeX expr={q.latex} block />
      {revealCorrect&&<div style={{ fontSize:20,color:"var(--green)",fontWeight:700,marginTop:8 }}>{q.displayAnswer}</div>}
    </div>
  );

  return null;
}

// -- Student Answer Inputs --

// Yes/No for each of N items
function YesNoGrid({ items, itemKey, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(items.map(()=>null));
  const allDone = answers.every(a=>a!==null);
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",gap:10,flexWrap:"wrap" }}>
            <KaTeX expr={item[itemKey]} />
            <div style={{ display:"flex",gap:8 }}>
              {["Yes","No"].map(opt=>{
                const val=opt==="Yes";
                const active=answers[i]===val;
                return (
                  <button key={opt} onClick={()=>!submitted&&set(i,val)}
                    style={{ padding:"6px 16px",borderRadius:"var(--radius-sm)",border:"2px solid "+(active?(val?"var(--green)":"var(--red)"):"var(--border)"),background:active?(val?"rgba(22,163,74,0.15)":"rgba(239,68,68,0.15)"):"var(--surface)",fontSize:20,fontWeight:700,cursor:"pointer",color:active?(val?"var(--green)":"var(--red)"):"var(--text)" }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Flip/No Flip grid
function FlipGrid({ items, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(items.map(()=>null));
  const allDone = answers.every(a=>a!==null);
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",gap:10,flexWrap:"wrap" }}>
            <KaTeX expr={item.latex} />
            <div style={{ display:"flex",gap:8 }}>
              {[{label:"Flip",val:true},{label:"No Flip",val:false}].map(opt=>{
                const active=answers[i]===opt.val;
                return (
                  <button key={opt.label} onClick={()=>!submitted&&set(i,opt.val)}
                    style={{ padding:"6px 14px",borderRadius:"var(--radius-sm)",border:"2px solid "+(active?"var(--blue)":"var(--border)"),background:active?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:20,fontWeight:700,cursor:"pointer",color:active?"var(--blue)":"var(--text)" }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// All Real / No Solution selector
function AllRealGrid({ items, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(items.map(()=>null));
  const allDone = answers.every(a=>a!==null);
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",gap:10,flexWrap:"wrap" }}>
            <KaTeX expr={item.latex} />
            <div style={{ display:"flex",gap:8 }}>
              {[{label:"All Real",val:true},{label:"No Solution",val:false}].map(opt=>{
                const active=answers[i]===opt.val;
                return (
                  <button key={opt.label} onClick={()=>!submitted&&set(i,opt.val)}
                    style={{ padding:"6px 12px",borderRadius:"var(--radius-sm)",border:"2px solid "+(active?"var(--blue)":"var(--border)"),background:active?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:19,fontWeight:700,cursor:"pointer",color:active?"var(--blue)":"var(--text)" }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

function TextInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if(val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&submit()} disabled={submitted}
        placeholder={placeholder||""}
        style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:220 }} />
      <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// One-step inequalities: 4 text inputs simultaneously
function OneStepGrid({ items, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(items.map(()=>""));
  const allDone = answers.every(a=>a.trim()!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",gap:10,flexWrap:"wrap" }}>
            <KaTeX expr={item.latex} />
            <input value={answers[i]} onChange={e=>set(i,e.target.value)}
              disabled={submitted} placeholder="e.g. x > 3"
              style={{ textAlign:"center",fontSize:20,fontFamily:"var(--mono)",fontWeight:700,padding:"6px 10px",width:120,borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Solution set checkboxes
function SolutionSetInput({ question, onSubmit, submitted }) {
  const [selected, setSelected] = useState([]);
  const toggle = (n) => {
    if(submitted) return;
    setSelected(prev=>prev.includes(n)?prev.filter(x=>x!==n):[...prev,n]);
  };
  return (
    <div>
      <div style={{ display:"flex",gap:16,justifyContent:"center",marginBottom:14 }}>
        {question.options.map((n,i)=>(
          <button key={i} onClick={()=>toggle(n)}
            style={{ padding:"14px 28px",borderRadius:"var(--radius-sm)",border:"2px solid "+(selected.includes(n)?"var(--blue)":"var(--border)"),background:selected.includes(n)?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:26,fontWeight:800,fontFamily:"var(--mono)",cursor:"pointer",color:selected.includes(n)?"var(--blue)":"var(--text)" }}>
            {n}
          </button>
        ))}
      </div>
      <div style={{ fontSize:20,color:"var(--text3)",textAlign:"center",marginBottom:10 }}>Click to select all values in the solution set</div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(selected))} disabled={submitted}>Submit</button>
    </div>
  );
}

// Number line A/B/C
function NumberLineChoice({ question, onSubmit, submitted }) {
  const [choice, setChoice] = useState("");
  return (
    <div>
      <div style={{ display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:12 }}>
        {question.options.map(opt=>(
          <button key={opt.label} onClick={()=>!submitted&&setChoice(opt.label)}
            style={{ padding:"8px 24px",borderRadius:"var(--radius-sm)",border:"2px solid "+(choice===opt.label?"var(--blue)":"var(--border)"),background:choice===opt.label?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:22,fontWeight:800,cursor:"pointer",color:choice===opt.label?"var(--blue)":"var(--text)" }}>
            {opt.label}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(choice)} disabled={submitted||!choice}>Submit</button>
    </div>
  );
}

// All Real / No Solution single selector
function ClassifyInput({ onSubmit, submitted }) {
  const [choice, setChoice] = useState("");
  const opts = ["All real numbers","No solution"];
  return (
    <div>
      <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:12 }}>
        {opts.map(o=>(
          <button key={o} onClick={()=>!submitted&&setChoice(o)}
            style={{ padding:"10px 22px",borderRadius:"var(--radius-sm)",border:"2px solid "+(choice===o?"var(--blue)":"var(--border)"),background:choice===o?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:20,fontWeight:700,cursor:"pointer",color:choice===o?"var(--blue)":"var(--text)" }}>
            {o}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(choice)} disabled={submitted||!choice}>Submit</button>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if(t==="warmup-a"||t==="warmup-b"||t==="warmup-c") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="Enter x" />;
  if(t==="is-solution") return <YesNoGrid items={question.statements} itemKey="latex" onSubmit={onSubmit} submitted={submitted} />;
  if(t==="solution-set") return <SolutionSetInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if(t==="number-line-match") return <NumberLineChoice question={question} onSubmit={onSubmit} submitted={submitted} />;
  if(t==="sign-flip") return <FlipGrid items={question.items} onSubmit={onSubmit} submitted={submitted} />;
  if(t==="one-step-ineqs") return <OneStepGrid items={question.items} onSubmit={onSubmit} submitted={submitted} />;
  if(t==="two-step-ineq") return <TextInput onSubmit={onSubmit} submitted={submitted} placeholder="e.g. x > 4" />;
  if(t==="special-cases") return <AllRealGrid items={question.items} onSubmit={onSubmit} submitted={submitted} />;
  if(t==="solve-classify") return <ClassifyInput onSubmit={onSubmit} submitted={submitted} />;
  return null;
}

// -- Master grader --
function gradeAnswer(input, question) {
  if(!input||!question) return false;
  const t = question.type;
  if(t==="warmup-a") return gradeWarmupA(input,question);
  if(t==="warmup-b") return gradeWarmupB(input,question);
  if(t==="warmup-c") return gradeWarmupC(input,question);
  if(t==="is-solution") return gradeIsSolution(input,question);
  if(t==="solution-set") return gradeSolutionSet(input,question);
  if(t==="number-line-match") return gradeNumberLineMatch(input,question);
  if(t==="sign-flip") return gradeSignFlip(input,question);
  if(t==="one-step-ineqs") return gradeOneStepIneqs(input,question);
  if(t==="two-step-ineq") return gradeTwoStepIneq(input,question);
  if(t==="special-cases") return gradeSpecialCases(input,question);
  if(t==="solve-classify") return gradeSolveClassify(input,question);
  return false;
}

// Partial grader: for multi-item questions, how many correct
function partialScore(input, question) {
  try {
    const t = question.type;
    if(t==="is-solution") {
      const ans=JSON.parse(input);
      return question.statements.filter((s,i)=>gradeIsSolutionItem(ans[i],i,question)).length;
    }
    if(t==="sign-flip") {
      const ans=JSON.parse(input);
      return question.items.filter((_,i)=>gradeSignFlipItem(ans[i],i,question)).length;
    }
    if(t==="one-step-ineqs") {
      const ans=JSON.parse(input);
      return question.items.filter((item,i)=>gradeOneStepIneqItem(ans[i]||"",item)).length;
    }
    if(t==="special-cases") {
      const ans=JSON.parse(input);
      return question.items.filter((_,i)=>gradeSpecialCasesItem(ans[i],i,question)).length;
    }
  } catch {}
  return gradeAnswer(input,question)?1:0;
}

// -- Teacher --
function TeacherLesson11({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [ineqIdx, setIneqIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON11_TOPICS[currentTopicIdx];

  useEffect(()=>{
    if(!question?.id) return;
    setAnswers([]); revealedRef.current=false;
    const unsub=onClassworkAnswersChange(sessionId,question.id,setAnswers);
    return ()=>unsub();
  },[question?.id]);

  const handleGenerate = async (topicIdx, extra) => {
    const tIdx = topicIdx!==undefined?topicIdx:currentTopicIdx;
    const q = generateLesson11Question(LESSON11_TOPICS[tIdx].id, extra);
    const qId="q_"+Date.now().toString(36);
    q.id=qId; q.points=POINTS; q._topicId=LESSON11_TOPICS[tIdx].id;
    if(extra?.ineqIdx!==undefined) q._ineqIdx=extra.ineqIdx;
    revealedRef.current=false; setAnswers([]);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question",currentQuestion:q,
      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
      questionCount:(session.questionCount||0)+1,
    });
  };

  const handleReveal = async () => {
    if(revealedRef.current) return;
    revealedRef.current=true;
    for(const ans of answers){
      if(gradeAnswer(ans.answer,question))
        await addToScore(sessionId,ans.uid,POINTS);
    }
    await updateDoc(doc(db,"sessions",sessionId),{status:"revealing"});
  };

  const handleNextIneq = async () => {
    const next=ineqIdx+1;
    if(next>=3) return;
    setIneqIdx(next);
    const q=genTwoStepIneqItem(next);
    const qId="q_"+Date.now().toString(36);
    q.id=qId; q.points=POINTS; q._topicId="two-step-ineq"; q._ineqIdx=next;
    revealedRef.current=false; setAnswers([]);
    await updateDoc(doc(db,"sessions",sessionId),{
      status:"question",currentQuestion:q,
      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
    });
  };

  const handleEnd = async () => {
    if(confirm("End the session?")) await updateDoc(doc(db,"sessions",sessionId),{status:"ended"});
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a=>gradeAnswer(a.answer,question)).length;
  const isTwoStep = question?.type==="two-step-ineq";
  const hasNextIneq = isTwoStep && (question?._ineqIdx||0)<2;
  const isMultiItem = ["is-solution","sign-flip","one-step-ineqs","special-cases"].includes(question?.type);

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
              <input type="number" min={15} max={300} value={timerInput} onChange={e=>setTimerInput(Number(e.target.value))}
                style={{ width:70,padding:"6px 10px",fontSize:20,textAlign:"center" }} />
            </div>
            {session.status==="question"&&<button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status==="revealing"&&(
              <>
                <button className="btn btn-ghost" onClick={()=>handleGenerate()}>Repeat</button>
                {hasNextIneq&&<button className="btn btn-primary" onClick={handleNextIneq}>Problem {(question?._ineqIdx||0)+2}/3</button>}
                {!hasNextIneq&&currentTopicIdx<LESSON11_TOPICS.length-1&&(
                  <button className="btn btn-primary" onClick={()=>{const n=currentTopicIdx+1;setCurrentTopicIdx(n);setIneqIdx(0);handleGenerate(n,{ineqIdx:0});}}>
                    Next: {LESSON11_TOPICS[currentTopicIdx+1]?.label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color:"var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"220px 1fr",gap:16,alignItems:"start" }}>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
          <div style={{ fontSize:20,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4 }}>Topic</div>
          {LESSON11_TOPICS.map((t,i)=>{
            const isActive=i===currentTopicIdx, isDone=i<currentTopicIdx;
            return (
              <button key={t.id} onClick={()=>setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(27,143,255,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(22,163,74,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"6px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:17,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>{t.label}</div>
                <div style={{ fontSize:16,color:"var(--text3)" }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop:8,fontSize:20 }}
            onClick={()=>handleGenerate(undefined,currentTopicIdx===8?{ineqIdx}:undefined)}
            disabled={session.status==="question"}>
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
                  {currentTopic.label}{isTwoStep?` - Problem ${(question._ineqIdx||0)+1}/3`:""}
                  {" - "}{submittedCount}/{totalStudents} submitted{isMultiItem?"":` - ${correctCount} correct`}
                </div>
                <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
                {session.status==="question"&&session.timerEndsAt&&(
                  <div style={{ marginTop:12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds}
                      onExpired={async()=>{if(!revealedRef.current)await handleReveal();}} />
                  </div>
                )}
                {session.status==="revealing"&&!isMultiItem&&(
                  <div style={{ marginTop:12,background:"rgba(22,163,74,0.06)",border:"1px solid rgba(22,163,74,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                    <div style={{ fontSize:20,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                    <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)" }}>{question.displayAnswer||question.answer}</div>
                  </div>
                )}
                <div style={{ height:6,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginTop:12 }}>
                  <div style={{ height:"100%",width:(totalStudents>0?(submittedCount/totalStudents)*100:0)+"%",background:"var(--blue)",borderRadius:99,transition:"width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize:20,fontWeight:700,marginBottom:10 }}>Student Answers</div>
                <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:320,overflowY:"auto" }}>
                  {Object.entries(participants).map(([pUid,p])=>{
                    const ans=answers.find(a=>a.uid===pUid);
                    const has=ans?.answer!==undefined&&ans?.answer!=="";
                    const correct=has&&gradeAnswer(ans.answer,question);
                    const partial=has&&isMultiItem?partialScore(ans.answer,question):null;
                    const total=isMultiItem?(question.statements||question.items)?.length:null;
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(22,163,74,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:20 }}>{p.name}</span>
                        {has?(
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            {session.status==="revealing"&&isMultiItem&&(
                              <span style={{ fontSize:19,color:"var(--text2)" }}>{partial}/{total}</span>
                            )}
                            {session.status==="revealing"&&!isMultiItem&&(
                              <span style={{ fontFamily:"var(--mono)",fontSize:19,color:"var(--text2)" }}>{String(ans.answer).slice(0,20)}</span>
                            )}
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

// -- Student --
function StudentLesson11({ session, sessionId, uid }) {
  useKaTeX();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants||{};
  const myScore = participants[uid]?.totalScore||0;

  useEffect(()=>{
    if(question?.id&&question.id!==lastQId){setSubmitted(false);setResult(null);setLastQId(question.id);}
  },[question?.id]);

  const handleSubmit = async (inputVal) => {
    if(!question||submitted) return;
    const ans=String(inputVal).trim(); if(!ans) return;
    const correct=gradeAnswer(ans,question);
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
      <p style={{ color:"var(--text2)",fontSize:20 }}>Lesson 11 - Inequalities</p>
    </div>
  );
  if(session.status==="ended") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Session ended</h2>
      <p style={{ color:"var(--text2)",fontSize:20 }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  return (
    <div style={{ maxWidth:620,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}>
        <div style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"5px 12px",fontSize:20,fontWeight:700 }}>Score: {myScore} pts</div>
      </div>
      <div className="card" key={question?.id||"waiting"}>
        {session.status==="question"&&session.timerEndsAt&&!submitted&&(
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question&&<QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />}
        {session.status==="revealing"?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            {result?<div style={{ fontSize:22,fontWeight:800,color:result.correct?"var(--green)":"var(--red)" }}>{result.correct?"Correct! +"+POINTS+" pts":"Incorrect"}</div>
              :<div style={{ color:"var(--text3)",fontSize:20 }}>No answer submitted.</div>}
          </div>
        ):submitted?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            <div style={{ fontSize:20,fontWeight:700,color:"var(--green)" }}>Submitted! Waiting for reveal...</div>
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

// -- Session Creator --
function CreateLesson11Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ getTeacherClasses(user.id).then(setClasses); },[]);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const joinCode=Math.random().toString(36).slice(2,7).toUpperCase();
      const sessionId="sess_"+Date.now().toString(36);
      await setDoc(doc(db,"sessions",sessionId),{
        id:sessionId,teacherId:user.id,classId:selectedClass,
        joinCode,type:"lesson11",status:"waiting",
        currentQuestion:null,questionCount:0,
        timerSeconds:timer,timerEndsAt:null,
        participants:{},createdAt:Date.now(),
      });
      onCreated(sessionId);
    } catch(e){ alert("Error: "+e.message); setLoading(false); }
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>Lesson 11 - Inequalities</h2>
        <p style={{ color:"var(--text2)",fontSize:20,marginBottom:16 }}>Solution sets, number lines, solving inequalities, and special cases.</p>
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

export default function Lesson11Session({ user, onHome }) {
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
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff" }}>L11</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>GCA - Lesson 11</div>
              <div style={{ color:"var(--text3)",fontSize:20 }}>Inequalities</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create"&&<CreateLesson11Session user={user} onCreated={(sid)=>{setSessionId(sid);setView("session");}} />}
        {view==="session"&&session&&(
          user.role==="teacher"
            ?<TeacherLesson11 session={session} sessionId={sessionId} uid={user.id} />
            :<StudentLesson11 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session"&&!session&&<div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>}
      </div>
    </div>
  );
}

export { TeacherLesson11 as Lesson11TeacherView, StudentLesson11 as Lesson11StudentView };
