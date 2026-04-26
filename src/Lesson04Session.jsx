import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON04_TOPICS, generateLesson04Question, gradeLesson04Answer,
  makeSqrtPool, makeCbrtPool,
} from "./lesson04Questions";

const POINTS = 5;

// -- KaTeX loader --
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

// -- LongDivisionWork --
function LongDivisionWork({ dividend, divisor, quotient, remainder }) {
  const dvStr = String(dividend);
  const nDigits = dvStr.length;
  const CW = 34, CH = 42, OW = 56, HEADER = 50;
  const steps = [];
  let working = 0, started = false;
  for (let i = 0; i < nDigits; i++) {
    working = working * 10 + parseInt(dvStr[i]);
    if (!started && working < divisor && i < nDigits - 1) continue;
    started = true;
    const q = Math.floor(working / divisor);
    const sub = q * divisor;
    const diff = working - sub;
    steps.push({ col: i, working, q, sub, diff });
    working = diff;
  }
  let cursor = HEADER + CH;
  const positioned = steps.map((step, si) => {
    const isFirst = si === 0;
    let pos;
    if (isFirst) {
      pos = { workY: null, subY: cursor+CH*0.72, lineY: cursor+CH+4, diffY: cursor+CH+CH*0.72, advance: CH*2 };
    } else if (step.q === 0) {
      pos = { workY: cursor+CH*0.72, subY: null, lineY: cursor+CH+4, diffY: cursor+CH+CH*0.72, advance: CH*2 };
    } else {
      pos = { workY: cursor+CH*0.72, subY: cursor+CH+CH*0.72, lineY: cursor+CH*2+4, diffY: cursor+CH*2+CH*0.72, advance: CH*3 };
    }
    cursor += pos.advance;
    return { ...step, ...pos };
  });
  const W = OW + nDigits * CW + 60;
  const H = cursor + CH + 16;
  const cx = (col) => OW + col * CW + CW / 2;
  const rn = (num, rightCol, y, color, size, opacity) => {
    const s = String(num);
    return s.split("").map((ch, ki) => {
      const col = rightCol - s.length + 1 + ki;
      if (col < 0) return null;
      return <text key={ki} x={cx(col)} y={y} textAnchor="middle" fontSize={size} fontWeight="700" fill={color} opacity={opacity ?? 1} fontFamily="var(--mono)">{ch}</text>;
    });
  };
  const lineX = (step) => {
    const nums = [step.working, step.q > 0 ? step.sub : 0].filter(n => n > 0);
    const maxLen = Math.max(...nums.map(n => String(n).length), 1);
    return { left: cx(Math.max(0, step.col - maxLen + 1)) - 6, right: cx(step.col) + CW * 0.45 };
  };
  const lastDiffY = positioned.length > 0 ? positioned[positioned.length-1].diffY : H - 16;
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto", minWidth: W }}>
        <text x={OW-10} y={HEADER+CH*0.78} textAnchor="end" fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
        <line x1={OW-2} y1={HEADER+CH*0.18} x2={OW-2} y2={HEADER+CH} stroke="var(--text)" strokeWidth="2.5" />
        <line x1={OW-2} y1={HEADER+CH*0.18} x2={OW+nDigits*CW+4} y2={HEADER+CH*0.18} stroke="var(--text)" strokeWidth="2.5" />
        {dvStr.split("").map((ch, ci) => (
          <text key={ci} x={cx(ci)} y={HEADER+CH*0.78} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
        ))}
        {positioned.map((step, si) => (
          <text key={si} x={cx(step.col)} y={HEADER-8} textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{step.q}</text>
        ))}
        {positioned.map((step, si) => {
          const isLast = si === positioned.length - 1;
          const { left: ll, right: lr } = lineX(step);
          return (
            <g key={si}>
              {step.workY !== null && rn(step.working, step.col, step.workY, "var(--text3)", 22, 0.6)}
              {step.subY !== null && rn(step.sub, step.col, step.subY, "var(--text)", 24)}
              <line x1={ll} y1={step.lineY} x2={lr} y2={step.lineY} stroke={step.q===0?"var(--text2)":"var(--text)"} strokeWidth="1.5" />
              {rn(step.q===0?0:step.diff, step.col, step.diffY, isLast?"var(--blue)":"var(--text)", 22)}
            </g>
          );
        })}
        {remainder > 0 && (
          <text x={OW+nDigits*CW+10} y={lastDiffY} fontSize="15" fontWeight="700" fill="var(--blue)" fontFamily="var(--mono)">R{remainder}</text>
        )}
      </svg>
    </div>
  );
}

// -- Composite Shape SVG --
function RectilinearSVG({ question, revealCorrect }) {
  const { vertices, sides, unit, hideIndices, shape } = question;
  const hiddenSet = new Set(hideIndices || []);
  if (!vertices) return null;
  const W = 400, H = 360;
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W-120)/(maxX-minX||1), (H-120)/(maxY-minY||1));
  const offX = (W-(maxX-minX)*scale)/2, offY = (H-(maxY-minY)*scale)/2;
  const sv = vertices.map(v => ({ x:(v.x-minX)*scale+offX, y:(v.y-minY)*scale+offY }));
  const n = sv.length;
  const cx2 = sv.reduce((s,p)=>s+p.x,0)/n, cy2 = sv.reduce((s,p)=>s+p.y,0)/n;
  const mids = sv.map((p,i) => ({ x:(p.x+sv[(i+1)%n].x)/2, y:(p.y+sv[(i+1)%n].y)/2 }));
  const pathD = sv.map((p,i)=>(i===0?"M":"L")+" "+p.x.toFixed(1)+" "+p.y.toFixed(1)).join(" ")+" Z";
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%",maxWidth:400,display:"block",margin:"0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p,i) => {
        const next = sv[(i+1)%n];
        const m = mids[i];
        const ex=next.x-p.x, ey=next.y-p.y, el=Math.sqrt(ex*ex+ey*ey)||1;
        const perpX=-ey/el, perpY=ex/el;
        const outDir=(m.x-cx2)*perpX+(m.y-cy2)*perpY>0?1:-1;
        const lx=m.x+perpX*outDir*20, ly=m.y+perpY*outDir*20;
        const isHidden=hiddenSet.has(i);
        const showQ=isHidden&&!revealCorrect;
        const sideLen=sides&&sides[i]?sides[i].length:"?";
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="var(--blue)" strokeWidth="2.5" />
            <rect x={lx-32} y={ly-14} width={64} height={28} rx={5} fill={showQ?"rgba(251,191,36,0.15)":"var(--bg2)"} stroke={showQ?"var(--amber)":isHidden?"var(--green)":"var(--border)"} strokeWidth="1" />
            <text x={lx} y={ly+6} textAnchor="middle" fontSize="13" fontWeight="700" fill={showQ?"#7c3aed":isHidden?"var(--green)":"var(--text)"} fontFamily="var(--mono)">{showQ?"?":sideLen+unit}</text>
          </g>
        );
      })}
      <text x={W/2} y={H-8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

// -- Question display --
function QuestionDisplay({ question, revealCorrect }) {
  useKaTeX();
  if (!question) return null;
  const q = question;
  switch (q.type) {
    case "warmup-a":
      return <RectilinearSVG question={q} revealCorrect={revealCorrect} />;
    case "warmup-b":
      return (
        <div style={{ display:"flex",justifyContent:"center",margin:"8px 0" }}>
          <svg viewBox="0 0 260 70" style={{ width:"100%",maxWidth:260,display:"block",margin:"0 auto" }}>
            <text x={52} y={50} fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{q.divisor}</text>
            <line x1={72} y1={12} x2={72} y2={58} stroke="var(--text)" strokeWidth="2.5" />
            <line x1={72} y1={12} x2={76+String(q.dividend).length*20} y2={12} stroke="var(--text)" strokeWidth="2.5" />
            <text x={78} y={50} fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{q.dividend}</text>
          </svg>
        </div>
      );
    case "div-zero":
      return (
        <div style={{ display:"flex",gap:60,justifyContent:"center",alignItems:"center",flexWrap:"wrap",padding:"10px 0" }}>
          {[q.prob1, q.prob2].map((p,i) => (
            <div key={i} style={{ textAlign:"center",minWidth:120 }}>
              <div style={{ fontSize:13,color:"var(--text3)",marginBottom:8,fontWeight:600 }}>Expression {i+1}</div>
              <KaTeX expr={p.latex} />
            </div>
          ))}
        </div>
      );
    case "power":
      return <div style={{ textAlign:"center" }}><KaTeX expr={q.latex} /></div>;
    case "sqrt":
    case "cbrt":
      return <div style={{ textAlign:"center" }}><KaTeX expr={q.latex} /></div>;
    case "order-ops-2":
    case "order-ops-3":
    case "var-expr":
      return (
        <div style={{ textAlign:"center" }}>
          {q.given && <div style={{ fontSize:14,color:"var(--text2)",marginBottom:6 }}>{q.given}</div>}
          <KaTeX expr={q.latex} />
        </div>
      );
    default:
      return null;
  }
}

// -- Reveal calculation --
function RevealCalculation({ question }) {
  if (!question) return null;
  const q = question;
  if (q.type === "warmup-a") {
    return (
      <div style={{ fontSize:14,color:"var(--text2)",marginTop:8 }}>
        <div>Missing side 1: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.missingAnswers?.[0]?.length}{q.unit}</strong></div>
        <div>Missing side 2: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.missingAnswers?.[1]?.length}{q.unit}</strong></div>
        <div>Perimeter: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.perimeter}{q.unit}</strong></div>
        <div style={{ fontFamily:"var(--mono)",marginTop:4 }}>{q.splitExplanation} sq {q.unit}</div>
      </div>
    );
  }
  if (q.type === "warmup-b") {
    return <div style={{ marginTop:8 }}><LongDivisionWork dividend={q.dividend} divisor={q.divisor} quotient={q.quotient} remainder={q.remainder} /></div>;
  }
  if (q.type === "div-zero") {
    return (
      <div style={{ fontSize:14,color:"var(--text2)",marginTop:8 }}>
        <div>Expr 1: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.prob1.isUndefined?"Undefined":"0"}</strong> - {q.prob1.isUndefined?"Division by zero is undefined.":"Zero divided by any number is 0."}</div>
        <div>Expr 2: <strong style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{q.prob2.isUndefined?"Undefined":"0"}</strong> - {q.prob2.isUndefined?"Division by zero is undefined.":"Zero divided by any number is 0."}</div>
      </div>
    );
  }
  return null;
}

// -- Answer inputs --
// Warmup A: 4 values - m1, m2, perimeter, area+unit
function WarmupAAnswerInput({ question, onSubmit, submitted }) {
  const [m1, setM1] = useState(""), [m2, setM2] = useState("");
  const [perim, setPerim] = useState(""), [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState(null);
  const ref = useRef(null);
  useEffect(() => { setM1(""); setM2(""); setPerim(""); setArea(""); setAreaUnit(null); setTimeout(()=>ref.current?.focus(),100); }, [question?.id]);
  const unit = question.unit;
  const handleSubmit = () => {
    if (!m1||!m2||!perim||!area||!areaUnit) return;
    onSubmit(JSON.stringify({ m1:parseInt(m1), m2:parseInt(m2), perimeter:parseInt(perim), area:parseInt(area) }));
  };
  return (
    <div>
      <div style={{ fontSize:13,color:"var(--text3)",marginBottom:8 }}>Enter all four values (units: {unit})</div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:8 }}>
        <div style={{ flex:1,minWidth:110 }}>
          <div style={{ fontSize:12,color:"var(--text3)",marginBottom:2 }}>Missing side 1</div>
          <input ref={ref} value={m1} onChange={e=>setM1(e.target.value)} inputMode="numeric" disabled={submitted} placeholder={"e.g. 25"} style={{ width:"100%",fontSize:17,fontFamily:"var(--mono)",padding:"8px 10px" }} />
        </div>
        <div style={{ flex:1,minWidth:110 }}>
          <div style={{ fontSize:12,color:"var(--text3)",marginBottom:2 }}>Missing side 2</div>
          <input value={m2} onChange={e=>setM2(e.target.value)} inputMode="numeric" disabled={submitted} placeholder={"e.g. 18"} style={{ width:"100%",fontSize:17,fontFamily:"var(--mono)",padding:"8px 10px" }} />
        </div>
        <div style={{ flex:1,minWidth:110 }}>
          <div style={{ fontSize:12,color:"var(--text3)",marginBottom:2 }}>Perimeter ({unit})</div>
          <input value={perim} onChange={e=>setPerim(e.target.value)} inputMode="numeric" disabled={submitted} placeholder={"e.g. 180"} style={{ width:"100%",fontSize:17,fontFamily:"var(--mono)",padding:"8px 10px" }} />
        </div>
        <div style={{ flex:1,minWidth:110 }}>
          <div style={{ fontSize:12,color:"var(--text3)",marginBottom:2 }}>Area (sq {unit})</div>
          <input value={area} onChange={e=>setArea(e.target.value)} inputMode="numeric" disabled={submitted} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder={"e.g. 900"} style={{ width:"100%",fontSize:17,fontFamily:"var(--mono)",padding:"8px 10px" }} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%" }} onClick={handleSubmit}
        disabled={submitted||!m1||!m2||!perim||!area}>Submit All</button>
    </div>
  );
}

// Two-problem div-zero input (like Q5 in ReviewSession)
function DivZeroTwoInput({ question, onSubmit, submitted }) {
  const [ans1, setAns1] = useState("");
  const [ans2, setAns2] = useState("");
  const ref = useRef(null);
  useEffect(() => { setAns1(""); setAns2(""); setTimeout(()=>ref.current?.focus(),80); }, [question?.id]);
  const handleSubmit = () => {
    if (!ans1.trim() || !ans2.trim()) return;
    onSubmit(JSON.stringify({ ans1: ans1.trim().toLowerCase(), ans2: ans2.trim().toLowerCase() }));
  };
  const inputStyle = { textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:"100%" };
  return (
    <div>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:10 }}>
        {[{ val:ans1,set:setAns1,ref }, { val:ans2,set:setAns2,ref:null }].map((item,i) => (
          <div key={i} style={{ flex:1,minWidth:140 }}>
            <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>Expression {i+1}</div>
            <input ref={item.ref} style={inputStyle} value={item.val}
              onChange={e=>item.set(e.target.value)} placeholder="0 or..." disabled={submitted} />
            <button className="btn btn-ghost btn-sm" style={{ width:"100%",marginTop:4,fontSize:13 }}
              onClick={()=>item.set("undefined")} disabled={submitted}>UNDEFINED</button>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%" }} onClick={handleSubmit}
        disabled={submitted||!ans1.trim()||!ans2.trim()}>Submit Both</button>
    </div>
  );
}

// Long division: separate quotient and remainder fields (like Q6 in ReviewSession)
function LongDivisionAnswerInput({ onSubmit, submitted }) {
  const [quot, setQuot] = useState("");
  const [rem, setRem] = useState("");
  const ref = useRef(null);
  useEffect(() => { setQuot(""); setRem(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const handleSubmit = () => {
    if (!quot.trim()) return;
    const ans = rem.trim() && rem.trim() !== "0"
      ? quot.trim() + "r" + rem.trim()
      : quot.trim();
    onSubmit(ans);
  };
  return (
    <div>
      <div style={{ display:"flex",gap:12,marginBottom:10 }}>
        <div style={{ flex:2 }}>
          <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>Quotient</div>
          <input ref={ref} value={quot} onChange={e=>setQuot(e.target.value.replace(/\D/g,""))}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()} inputMode="numeric" disabled={submitted}
            style={{ width:"100%",textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"10px" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>Remainder</div>
          <input value={rem} onChange={e=>setRem(e.target.value.replace(/\D/g,""))}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()} inputMode="numeric" disabled={submitted}
            placeholder="0"
            style={{ width:"100%",textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"10px" }} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%" }} onClick={handleSubmit}
        disabled={submitted||!quot.trim()}>Submit</button>
    </div>
  );
}

// Generic numeric input
function NumericInput({ onSubmit, submitted, placeholder, isDivision }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val}
        onChange={e=>setVal(isDivision?e.target.value.replace(/[^0-9rR]/g,""):e.target.value.replace(/[^0-9\-]/g,""))}
        onKeyDown={e=>e.key==="Enter"&&submit()} inputMode={isDivision?"text":"numeric"}
        placeholder={placeholder||"?"} disabled={submitted}
        style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:isDivision?140:120 }} />
      <button className="btn btn-primary" style={{ fontSize:18,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// Possibly undefined answer: free response OR undefined button
function MaybeUndefinedInput({ question, onSubmit, submitted }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [question?.id]);
  const submit = (v) => { onSubmit(v || val.trim()); setVal(""); };
  if (question.isUndefined !== undefined && question.isUndefined === false) {
    return <NumericInput onSubmit={onSubmit} submitted={submitted} />;
  }
  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:8 }}>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="numeric"
          placeholder="Number..." disabled={submitted}
          style={{ flex:1,textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px" }} />
        <button className="btn btn-primary" style={{ fontSize:16,padding:"10px 16px" }}
          onMouseDown={e=>{e.preventDefault();submit();}} disabled={submitted||!val.trim()}>OK</button>
      </div>
      <button className="btn btn-amber" style={{ width:"100%",fontSize:18 }}
        onClick={()=>submit("undefined")} disabled={submitted}>Undefined</button>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t === "warmup-a") return <WarmupAAnswerInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "warmup-b") return <LongDivisionAnswerInput onSubmit={onSubmit} submitted={submitted} />;
  if (t === "div-zero") return <DivZeroTwoInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t === "power" || t === "sqrt" || t === "cbrt") return <NumericInput onSubmit={onSubmit} submitted={submitted} />;
  if (t === "order-ops-2" || t === "order-ops-3" || t === "var-expr") {
    return <NumericInput onSubmit={onSubmit} submitted={submitted} />;
  }
  return <NumericInput onSubmit={onSubmit} submitted={submitted} />;
}

// -- Timer bar --
function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !expiredRef.current) { expiredRef.current = true; onExpired?.(); }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0, (remaining / totalSeconds) * 100);
  const color = remaining <= 5 ? "var(--red)" : remaining <= 10 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--text3)",marginBottom:4 }}>
        <span>Time remaining</span><span style={{ fontWeight:700,color,fontSize:16 }}>{remaining}s</span>
      </div>
      <div style={{ height:7,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
        <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:99,transition:"width 0.5s linear" }} />
      </div>
    </div>
  );
}

// -- Teacher view --
function TeacherLesson04({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [sqrtPool, setSqrtPool] = useState(() => makeSqrtPool());
  const [sqrtIdx, setSqrtIdx] = useState(0);
  const [cbrtPool, setCbrtPool] = useState(() => makeCbrtPool());
  const [cbrtIdx, setCbrtIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON04_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    let state = {};
    if (currentTopic.id === "sqrt") {
      const nextIdx = sqrtIdx >= sqrtPool.length ? 0 : sqrtIdx;
      const pool = nextIdx === 0 ? makeSqrtPool() : sqrtPool;
      if (nextIdx === 0) setSqrtPool(pool);
      state = { sqrtPool: pool, sqrtIdx: nextIdx };
      setSqrtIdx(nextIdx + 1);
    }
    if (currentTopic.id === "cbrt") {
      const nextIdx = cbrtIdx >= cbrtPool.length ? 0 : cbrtIdx;
      const pool = nextIdx === 0 ? makeCbrtPool() : cbrtPool;
      if (nextIdx === 0) setCbrtPool(pool);
      state = { cbrtPool: pool, cbrtIdx: nextIdx };
      setCbrtIdx(nextIdx + 1);
    }
    const q = generateLesson04Question(currentTopic.id, state);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer !== undefined && gradeLesson04Answer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, POINTS);
      }
    }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleTimerExpired = async () => {
    if (session.status === "question" && !revealedRef.current) await handleReveal();
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx + 1, LESSON04_TOPICS.length - 1);
    setCurrentTopicIdx(nextIdx);
    const q = generateLesson04Question(LESSON04_TOPICS[nextIdx].id, {});
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db, "sessions", sessionId), { status: "ended" });
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => gradeLesson04Answer(a.answer, question)).length;

  return (
    <div style={{ maxWidth:1100,margin:"0 auto" }}>
      {/* Header */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:13,color:"var(--text3)",marginBottom:2 }}>Join Code</div>
            <div style={{ fontSize:36,fontWeight:900,fontFamily:"var(--mono)",color:"var(--blue)",letterSpacing:"0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize:13,color:"var(--text3)" }}>{totalStudents} student{totalStudents!==1?"s":""} joined</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <label style={{ fontSize:13,color:"var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput} onChange={e=>setTimerInput(Number(e.target.value))}
                style={{ width:70,padding:"6px 10px",fontSize:14,textAlign:"center" }} />
            </div>
            {session.status==="question" && <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status==="revealing" && (
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat Topic</button>
                {currentTopicIdx < LESSON04_TOPICS.length-1 && (
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next: {LESSON04_TOPICS[currentTopicIdx+1].label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color:"var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:16,alignItems:"start" }}>
        {/* Topic sidebar */}
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4 }}>Topic</div>
          {LESSON04_TOPICS.map((t,i) => {
            const isActive = i === currentTopicIdx;
            const isDone = i < currentTopicIdx;
            return (
              <button key={t.id} onClick={() => setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(59,130,246,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(16,185,129,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"7px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:12,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>
                  {isDone?"done ":isActive?"now ":""}  {t.label}
                </div>
                <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop:8 }} onClick={handleGenerate} disabled={session.status==="question"}>
            Generate Question
          </button>
        </div>

        {/* Main panel */}
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          {session.status==="waiting" && (
            <div className="card" style={{ textAlign:"center",padding:"40px 20px" }}>
              <h3 style={{ fontSize:20,fontWeight:800,marginBottom:8 }}>Waiting for students</h3>
              <p style={{ color:"var(--blue)",fontFamily:"var(--mono)",fontSize:24,fontWeight:900 }}>{session.joinCode}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:12 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"5px 12px",fontSize:13,fontWeight:600 }}>{p.name}</div>
                ))}
              </div>
            </div>
          )}

          {question && (session.status==="question"||session.status==="revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize:12,color:"var(--text3)",marginBottom:8 }}>
                  {currentTopic.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:12 }}>{question.prompt}</div>
                <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
                {session.status==="question" && session.timerEndsAt && (
                  <div style={{ marginTop:12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={handleTimerExpired} />
                  </div>
                )}
                {session.status==="revealing" && (
                  <div style={{ marginTop:12,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                    <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                    <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)",marginBottom:4 }}>
                      {question.displayAnswer}
                    </div>
                    <RevealCalculation question={question} />
                  </div>
                )}
                <div style={{ height:6,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginTop:12 }}>
                  <div style={{ height:"100%",width:(totalStudents>0?(submittedCount/totalStudents)*100:0)+"%",background:"var(--blue)",borderRadius:99,transition:"width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize:14,fontWeight:700,marginBottom:10 }}>Student Answers</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:280,overflowY:"auto" }}>
                  {Object.entries(participants).map(([pUid,p]) => {
                    const ans = answers.find(a => a.uid===pUid);
                    const has = ans?.answer!==undefined&&ans?.answer!==null&&ans?.answer!=="";
                    const correct = has && gradeLesson04Answer(ans.answer, question);
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:13 }}>{p.name}</span>
                        {has ? (
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            {session.status==="revealing" && <span style={{ fontFamily:"var(--mono)",fontSize:13,color:"var(--text2)" }}>{ans.answer}</span>}
                            <span style={{ fontWeight:700,color:correct?"var(--green)":"var(--red)" }}>{correct?"+"+POINTS:"X"}</span>
                          </div>
                        ) : <span style={{ fontSize:12,color:"var(--text3)" }}>thinking...</span>}
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

// -- Student view --
function StudentLesson04({ session, sessionId, uid }) {
  useKaTeX();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id!==lastQId) {
      setSubmitted(false); setResult(null); setLastQId(question.id);
    }
  }, [question?.id]);

  const handleSubmit = async (inputVal) => {
    if (!question || submitted) return;
    const ans = String(inputVal).trim();
    if (!ans) return;
    const correct = gradeLesson04Answer(ans, question);
    await setDoc(doc(db, "sessions", sessionId, "answers", uid+"_"+question.id), {
      uid, questionId: question.id, answer: ans, correct, submittedAt: Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, POINTS);
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  if (session.status==="waiting") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>Waiting for teacher...</h2>
      <p style={{ color:"var(--text2)" }}>Lesson 4 - Properties, Exponents, Roots, and Order of Operations</p>
    </div>
  );

  if (session.status==="ended") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>Session ended</h2>
      <p style={{ color:"var(--text2)" }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  return (
    <div style={{ maxWidth:560,margin:"0 auto" }}>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}>
        <div style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"5px 12px",fontSize:13,fontWeight:700 }}>
          Score: {myScore} pts
        </div>
      </div>
      <div className="card" key={question?.id}>
        {session.status==="question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question && (
          <>
            <div style={{ fontSize:15,fontWeight:700,marginBottom:12,color:"var(--text)" }}>{question.prompt}</div>
            <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
          </>
        )}
        {session.status==="revealing" ? (
          <div style={{ textAlign:"center",marginTop:12 }}>
            {result ? (
              <>
                <div style={{ fontSize:20,fontWeight:800,color:result.correct?"var(--green)":"var(--red)",marginBottom:6 }}>
                  {result.correct?"Correct! +"+POINTS+" pts":"Incorrect"}
                </div>
                {!result.correct && question?.displayAnswer && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ color:"var(--green)",fontSize:16,marginBottom:4 }}>
                      Correct: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong>
                    </div>
                    <RevealCalculation question={question} />
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color:"var(--text3)",marginBottom:4 }}>No answer submitted.</div>
                {question?.displayAnswer && (
                  <div style={{ color:"var(--green)",fontSize:16 }}>
                    Correct: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : submitted ? (
          <div style={{ textAlign:"center",marginTop:12 }}>
            <div style={{ fontSize:15,fontWeight:700,color:"var(--green)",marginBottom:4 }}>Submitted!</div>
            <div style={{ fontSize:12,color:"var(--text3)" }}>Waiting for teacher to reveal...</div>
          </div>
        ) : question ? (
          <div style={{ marginTop:14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- Session creator --
function CreateLesson04Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createClassworkSession(user.id, selectedClass, timer);
      await updateDoc(doc(db, "sessions", sessionId), { type: "lesson04" });
      onCreated(sessionId);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:20,fontWeight:800,marginBottom:4 }}>Lesson 4 - Properties, Exponents, Roots, and Order of Operations</h2>
        <p style={{ color:"var(--text2)",fontSize:13,marginBottom:16 }}>Division with zero, computing powers, square and cube roots, order of operations, and variable expressions.</p>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:13,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:5 }}>Class</label>
          <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} style={{ width:"100%",padding:"10px 12px",fontSize:14 }}>
            <option value="">Select a class...</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e=>setTimer(Number(e.target.value))} style={{ width:"100%",padding:"10px 12px",fontSize:14 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={handleCreate} disabled={loading||!selectedClass}>
          {loading?"Creating...":"Start Session"}
        </button>
      </div>
    </div>
  );
}

// -- Main export --
export default function Lesson04Session({ user, onHome }) {
  const [view, setView] = useState("create");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:1200,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff" }}>L4</div>
            <div>
              <div style={{ fontWeight:800,fontSize:18 }}>GCA</div>
              <div style={{ color:"var(--text3)",fontSize:12 }}>Lesson 4 - Properties, Exponents, Roots, Order of Operations</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create" && <CreateLesson04Session user={user} onCreated={(sid)=>{ setSessionId(sid); setView("session"); }} />}
        {view==="session" && session && (
          user.role==="teacher"
            ? <TeacherLesson04 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson04 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session" && !session && (
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson04 as Lesson04TeacherView, StudentLesson04 as Lesson04StudentView };
