import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON08_TOPICS, generateLesson08Question, gradeLesson08Answer,
} from "./lesson08Questions";

const POINTS = 5;

// - KaTeX -
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
  return <div ref={ref} style={{ fontSize: 26, margin: "8px 0", minHeight: 36 }} />;
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

// - Question Display -
function QuestionDisplay({ question, revealCorrect }) {
  useKaTeX();
  if (!question) return null;
  const q = question;

  if (q.type === "warmup-a") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  if (q.type === "warmup-b") {
    const u = q.unit||"ft";

    if (q.shapeType==="step3") {
      const VW=580, VH=420, pad=75;
      const scale=Math.min((VW-2*pad)/q.totalW,(VH-2*pad)/q.totalH)*0.72;
      const sw1=q.w1*scale, sw2=q.w2*scale, sw3=q.w3*scale;
      const sh1=q.h1*scale, sh2=q.h2*scale, sh3=q.h3*scale;
      const th=sh1+sh2+sh3;
      const ox=pad, oy=pad;
      const bly=oy+th;
      const pts=[
        [ox,     bly],[ox+sw1,bly],[ox+sw1,bly-sh1],
        [ox+sw2, bly-sh1],[ox+sw2,bly-sh1-sh2],
        [ox+sw3, bly-sh1-sh2],[ox+sw3,oy],[ox,oy],
      ].map(([x,y])=>`${x},${y}`).join(" ");
      const f="#4b5068", g=22;
      return (
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",maxWidth:580,display:"block",margin:"0 auto" }}>
          <polygon points={pts} fill="rgba(27,143,255,0.08)" stroke="var(--blue)" strokeWidth="2.5"/>
          {/* Bottom w1 */}
          <text x={ox+sw1/2} y={bly+g} textAnchor="middle" fontSize="13" fill={f}>{q.w1} {u}</text>
          {/* Left totalH */}
          <text x={ox-g} y={oy+th/2} textAnchor="middle" fontSize="13" fill={f} transform={`rotate(-90,${ox-g},${oy+th/2})`}>{q.totalH} {u}</text>
          {/* Top w3 */}
          <text x={ox+sw3/2} y={oy-8} textAnchor="middle" fontSize="13" fill={f}>{q.w3} {u}</text>
          {/* Tread 1: w1-w2, above tread */}
          <text x={ox+sw2+(sw1-sw2)/2} y={bly-sh1-8} textAnchor="middle" fontSize="13" fill={f}>{q.w1-q.w2} {u}</text>
          {/* Tread 2: w2-w3, above tread */}
          <text x={ox+sw3+(sw2-sw3)/2} y={bly-sh1-sh2-8} textAnchor="middle" fontSize="13" fill={f}>{q.w2-q.w3} {u}</text>
          {/* h3 right side of step3 */}
          <text x={ox+sw3+g} y={oy+sh3/2} textAnchor="middle" fontSize="13" fill={f} transform={`rotate(-90,${ox+sw3+g},${oy+sh3/2})`}>{q.h3} {u}</text>
          {/* MISSING h1: far right riser (step 1) - rightmost vertical */}
          <text x={ox+sw1+g} y={bly-sh1/2} textAnchor="middle" fontSize="13" fill="var(--orange)" fontWeight="bold" transform={`rotate(-90,${ox+sw1+g},${bly-sh1/2})`}>?</text>
          {/* MISSING h2: step2 right riser - middle vertical */}
          <text x={ox+sw2+g} y={bly-sh1-sh2/2} textAnchor="middle" fontSize="13" fill="var(--orange)" fontWeight="bold" transform={`rotate(-90,${ox+sw2+g},${bly-sh1-sh2/2})`}>?</text>
          {revealCorrect&&(
            <text x={VW/2} y={VH-6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="var(--green)">{q.displayAnswer}</text>
          )}
        </svg>
      );
    }

    if (q.shapeType==="plus") {
      // Label ALL 10 known sides (12 total - 2 missing)
      // Missing: top-arm RIGHT side (armH) and bottom-arm LEFT side (armH) - these are perpendicular to ctrW
      const VW=580, VH=460, pad=75;
      const scale=Math.min((VW-2*pad)/(2*q.armW+q.ctrW),(VH-2*pad)/(2*q.armH+q.ctrH))*0.75;
      const aw=q.armW*scale, ah=q.armH*scale, cw=q.ctrW*scale, ch=q.ctrH*scale;
      const tw=2*aw+cw, th=2*ah+ch;
      const ox=pad+(VW-2*pad-tw)/2, oy=pad+(VH-2*pad-th)/2;
      // 12 vertices CW from TL of top arm
      const pts=[
        [ox+aw,      oy],          // 0 TL top-arm
        [ox+aw+cw,   oy],          // 1 TR top-arm
        [ox+aw+cw,   oy+ah],       // 2 inner-right top
        [ox+2*aw+cw, oy+ah],       // 3 TR right-arm
        [ox+2*aw+cw, oy+ah+ch],    // 4 BR right-arm
        [ox+aw+cw,   oy+ah+ch],    // 5 inner-right bottom
        [ox+aw+cw,   oy+2*ah+ch],  // 6 BR bottom-arm
        [ox+aw,      oy+2*ah+ch],  // 7 BL bottom-arm
        [ox+aw,      oy+ah+ch],    // 8 inner-left bottom
        [ox,         oy+ah+ch],    // 9 BL left-arm
        [ox,         oy+ah],       // 10 TL left-arm
        [ox+aw,      oy+ah],       // 11 inner-left top
      ].map(([x,y])=>`${x},${y}`).join(" ");
      const f="#4b5068", g=22;
      return (
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",maxWidth:580,display:"block",margin:"0 auto" }}>
          <polygon points={pts} fill="rgba(27,143,255,0.08)" stroke="var(--blue)" strokeWidth="2.5"/>
          {/* Side 0-1: top of top-arm = ctrW */}
          <text x={ox+aw+cw/2} y={oy-8} textAnchor="middle" fontSize="12" fill={f}>{q.ctrW} {u}</text>
          {/* Side 1-2: RIGHT of top-arm = armH  MISSING */}
          <text x={ox+aw+cw+g} y={oy+ah/2} textAnchor="middle" fontSize="12" fill="var(--orange)" fontWeight="bold" transform={`rotate(-90,${ox+aw+cw+g},${oy+ah/2})`}>?</text>
          {/* Side 2-3: top of right-arm = armW */}
          <text x={ox+aw+cw+aw/2} y={oy+ah-8} textAnchor="middle" fontSize="12" fill={f}>{q.armW} {u}</text>
          {/* Side 3-4: right of right-arm = ctrH */}
          <text x={ox+2*aw+cw+g} y={oy+ah+ch/2} textAnchor="middle" fontSize="12" fill={f} transform={`rotate(-90,${ox+2*aw+cw+g},${oy+ah+ch/2})`}>{q.ctrH} {u}</text>
          {/* Side 4-5: bottom of right-arm = armW */}
          <text x={ox+aw+cw+aw/2} y={oy+ah+ch+g} textAnchor="middle" fontSize="12" fill={f}>{q.armW} {u}</text>
          {/* Side 5-6: right of bottom-arm = armH */}
          <text x={ox+aw+cw+g} y={oy+ah+ch+ah/2} textAnchor="middle" fontSize="12" fill={f} transform={`rotate(-90,${ox+aw+cw+g},${oy+ah+ch+ah/2})`}>{q.armH} {u}</text>
          {/* Side 6-7: bottom of bottom-arm = ctrW */}
          <text x={ox+aw+cw/2} y={oy+2*ah+ch+g} textAnchor="middle" fontSize="12" fill={f}>{q.ctrW} {u}</text>
          {/* Side 7-8: LEFT of bottom-arm = armH  MISSING */}
          <text x={ox+aw-g} y={oy+ah+ch+ah/2} textAnchor="middle" fontSize="12" fill="var(--orange)" fontWeight="bold" transform={`rotate(-90,${ox+aw-g},${oy+ah+ch+ah/2})`}>?</text>
          {/* Side 8-9: bottom of left-arm = armW */}
          <text x={ox+aw/2} y={oy+ah+ch+g} textAnchor="middle" fontSize="12" fill={f}>{q.armW} {u}</text>
          {/* Side 9-10: left of left-arm = ctrH */}
          <text x={ox-g} y={oy+ah+ch/2} textAnchor="middle" fontSize="12" fill={f} transform={`rotate(-90,${ox-g},${oy+ah+ch/2})`}>{q.ctrH} {u}</text>
          {/* Side 10-11: top of left-arm = armW */}
          <text x={ox+aw/2} y={oy+ah-8} textAnchor="middle" fontSize="12" fill={f}>{q.armW} {u}</text>
          {/* Side 11-0: LEFT of top-arm = armH */}
          <text x={ox+aw-g} y={oy+ah/2} textAnchor="middle" fontSize="12" fill={f} transform={`rotate(-90,${ox+aw-g},${oy+ah/2})`}>{q.armH} {u}</text>
          {revealCorrect&&(
            <text x={VW/2} y={VH-6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="var(--green)">{q.displayAnswer}</text>
          )}
        </svg>
      );
    }

    return null;
  }

  if (q.type === "expr-or-equation") {
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {q.items.map((item,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px" }}>
            <KaTeXInline expr={item.latex} />
            {revealCorrect && <span style={{ fontWeight:800,fontSize:20,color:item.type==="equation"?"var(--blue)":"var(--orange)",marginLeft:12 }}>{item.type}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "identify-solutions") {
    return (
      <div style={{ textAlign:"center" }}>
        <KaTeXBlock expr={q.latex} />
        {revealCorrect && <div style={{ fontSize:20,color:"var(--green)",fontWeight:700,marginTop:8 }}>Solutions: {q.displayAnswer}</div>}
      </div>
    );
  }

  if (q.type === "one-step-eq" || q.type === "neg-x") {
    return <div style={{ textAlign:"center" }}><KaTeXBlock expr={q.latex} /></div>;
  }

  if (q.type === "identify-formula") {
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {q.problems.map((p,i) => (
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",fontSize:20 }}>
            <strong>Find {p.ask}:</strong> {p.given}
            {revealCorrect && <span style={{ color:"var(--blue)",fontWeight:700,marginLeft:12 }}>{p.correct}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "solve-distance" || q.type === "solve-speed" || q.type === "solve-time") {
    return (
      <div style={{ fontSize:20,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 18px",lineHeight:1.8 }}>
        {q.prompt}
        {revealCorrect && (
          <div style={{ marginTop:8,color:"var(--green)",fontWeight:700 }}>
            Answer: {q.displayAnswer}
            <div style={{ fontSize:19,color:"var(--text2)",fontWeight:400 }}>Working: {q.workingHint}</div>
          </div>
        )}
      </div>
    );
  }

  if (q.type === "mixed-dst") {
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {q.problems.map((p,i) => (
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",fontSize:20 }}>
            {p.prompt}
            {revealCorrect && <div style={{ color:"var(--green)",fontWeight:700 }}>- {p.displayAnswer} <span style={{ color:"var(--text3)",fontWeight:400,fontSize:19 }}>({p.workingHint})</span></div>}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// - Answer Inputs -
function NumInput({ onSubmit, submitted, allowNeg }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val}
        onChange={e=>setVal(e.target.value.replace(allowNeg?/[^0-9\-]/g:/[^0-9]/g,""))}
        onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="numeric" disabled={submitted}
        style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
      <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// 5-item expression/equation classifier
function ExprOrEqInput({ question, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(question.items.map(()=>""));
  const allDone = answers.every(a=>a!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
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
        onClick={()=>onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Solution identifier (quadratic/cubic)
function IdentifySolutionsInput({ question, onSubmit, submitted }) {
  useKaTeX();
  const [answers, setAnswers] = useState(question.options.map(()=>""));
  const allDone = answers.every(a=>a!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:12,justifyContent:"center" }}>
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
        onClick={()=>onSubmit(JSON.stringify(answers.map(a=>a==="true")))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Identify formula (Multiply/Divide for 3 problems)
function IdentifyFormulaInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.problems.map(()=>""));
  const allDone = answers.every(a=>a!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {question.problems.map((p,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",flexWrap:"wrap" }}>
            <div style={{ flex:1,fontSize:20 }}><strong>Find {p.ask}:</strong> {p.given}</div>
            <div style={{ display:"flex",gap:8 }}>
              {["Multiply","Divide"].map(op=>(
                <button key={op} onClick={()=>!submitted&&set(i,op)}
                  style={{ padding:"6px 16px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===op?"var(--blue)":"var(--border)"),background:answers[i]===op?"rgba(27,143,255,0.15)":"var(--surface)",fontFamily:"var(--font)",fontSize:20,fontWeight:700,cursor:"pointer",color:answers[i]===op?"var(--blue)":"var(--text)" }}>
                  {op}
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

// Mixed DST (3 numeric answers)
function MixedDSTInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(["","",""]);
  const allDone = answers.every(a=>a.trim()!=="");
  const set = (i,v) => setAnswers(prev=>prev.map((x,j)=>j===i?v:x));
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:12 }}>
        {question.problems.map((p,i) => (
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 14px" }}>
            <div style={{ fontSize:20,marginBottom:8 }}>{p.prompt}</div>
            <input value={answers[i]} onChange={e=>set(i,e.target.value.replace(/[^0-9]/g,""))}
              disabled={submitted} inputMode="numeric"
              style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"8px",width:140 }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>onSubmit(JSON.stringify(answers.map(a=>parseInt(a)||0)))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Warmup B: perimeter + area with unit dropdowns
function WarmupBInput({ question, onSubmit, submitted }) {
  const [perim, setPerim] = useState("");
  const [area, setArea] = useState("");
  const [perimUnit, setPerimUnit] = useState("ft");
  const [areaUnit, setAreaUnit] = useState("sq ft");
  const units = ["ft","in","yd","m","cm"];
  const areaUnits = ["sq ft","sq in","sq yd","sq m","sq cm"];
  const allDone = perim.trim() && area.trim();
  const handleSubmit = () => {
    onSubmit(JSON.stringify({
      perimeter: parseInt(perim),
      perimUnit,
      area: parseInt(area),
      areaUnit,
    }));
  };
  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <div>
          <div style={{ fontSize:20,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Perimeter</div>
          <div style={{ display:"flex",gap:6 }}>
            <input value={perim} onChange={e=>setPerim(e.target.value.replace(/[^0-9]/g,""))}
              disabled={submitted} inputMode="numeric"
              style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"8px",flex:1,minWidth:0 }} />
            <select value={perimUnit} onChange={e=>setPerimUnit(e.target.value)} disabled={submitted}
              style={{ fontSize:18,padding:"8px 6px",width:70 }}>
              {units.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize:20,fontWeight:700,color:"var(--text2)",marginBottom:6 }}>Area</div>
          <div style={{ display:"flex",gap:6 }}>
            <input value={area} onChange={e=>setArea(e.target.value.replace(/[^0-9]/g,""))}
              disabled={submitted} inputMode="numeric"
              style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"8px",flex:1,minWidth:0 }} />
            <select value={areaUnit} onChange={e=>setAreaUnit(e.target.value)} disabled={submitted}
              style={{ fontSize:18,padding:"8px 6px",width:90 }}>
              {areaUnits.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={handleSubmit} disabled={submitted||!allDone}>Submit</button>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t==="warmup-a") return <NumInput onSubmit={onSubmit} submitted={submitted} allowNeg />;
  if (t==="warmup-b") return <WarmupBInput onSubmit={onSubmit} submitted={submitted} />;
  if (t==="expr-or-equation") return <ExprOrEqInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="identify-solutions") return <IdentifySolutionsInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="one-step-eq"||t==="neg-x") return <NumInput onSubmit={onSubmit} submitted={submitted} allowNeg />;
  if (t==="identify-formula") return <IdentifyFormulaInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="solve-distance"||t==="solve-speed"||t==="solve-time") return <NumInput onSubmit={onSubmit} submitted={submitted} />;
  if (t==="mixed-dst") return <MixedDSTInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  return null;
}

// - Timer bar -
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

// - Teacher View -
function TeacherLesson08({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(120);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON08_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]); revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateLesson08Question(currentTopic.id);
    const qId = "q_"+Date.now().toString(36);
    q.id=qId; q.points=POINTS;
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
      if (ans.answer!==undefined && gradeLesson08Answer(ans.answer,question))
        await addToScore(sessionId,ans.uid,POINTS);
    }
    await updateDoc(doc(db,"sessions",sessionId),{status:"revealing"});
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db,"sessions",sessionId),{status:"ended"});
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a=>gradeLesson08Answer(a.answer,question)).length;

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
                {currentTopicIdx<LESSON08_TOPICS.length-1&&(
                  <button className="btn btn-primary" onClick={()=>{
                    const next=currentTopicIdx+1;
                    setCurrentTopicIdx(next);
                    const q=generateLesson08Question(LESSON08_TOPICS[next].id);
                    const qId="q_"+Date.now().toString(36);
                    q.id=qId; q.points=POINTS;
                    revealedRef.current=false; setAnswers([]);
                    updateDoc(doc(db,"sessions",sessionId),{
                      status:"question",currentQuestion:q,
                      timerSeconds:timerInput,timerEndsAt:Date.now()+timerInput*1000,
                      questionCount:(session.questionCount||0)+1,
                    });
                  }}>Next: {LESSON08_TOPICS[currentTopicIdx+1]?.label}</button>
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
          {LESSON08_TOPICS.map((t,i)=>{
            const isActive=i===currentTopicIdx, isDone=i<currentTopicIdx;
            return (
              <button key={t.id} onClick={()=>setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(27,143,255,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(22,163,74,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"7px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:19,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>{t.label}</div>
                <div style={{ fontSize:18,color:"var(--text3)" }}>{t.description}</div>
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
                <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
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
                    const correct=has&&gradeLesson08Answer(ans.answer,question);
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(22,163,74,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:20 }}>{p.name}</span>
                        {has?(
                          <span style={{ fontWeight:700,color:correct?"var(--green)":"var(--red)",fontSize:20 }}>{correct?"+"+POINTS:"X"}</span>
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

// - Student View -
function StudentLesson08({ session, sessionId, uid }) {
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
    const correct = gradeLesson08Answer(ans,question);
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
      <p style={{ color:"var(--text2)",fontSize:20 }}>Lesson 8 - Equations and d = s-t</p>
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
            <div style={{ fontSize:20,fontWeight:700,marginBottom:12 }}>{question.prompt}</div>
            <QuestionDisplay question={question} revealCorrect={session.status==="revealing"} />
          </>
        )}
        {session.status==="revealing"?(
          <div style={{ textAlign:"center",marginTop:12 }}>
            {result?(
              <div style={{ fontSize:22,fontWeight:800,color:result.correct?"var(--green)":"var(--red)" }}>
                {result.correct?"Correct! +"+POINTS+" pts":"Incorrect"}
                {!result.correct&&question?.displayAnswer&&(
                  <div style={{ marginTop:8,fontSize:20,color:"var(--green)",fontWeight:400 }}>Answer: <strong>{question.displayAnswer}</strong></div>
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
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
          </div>
        ):null}
      </div>
    </div>
  );
}

// - Session Creator -
function CreateLesson08Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ getTeacherClasses(user.id).then(setClasses); },[]);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const joinCode = Math.random().toString(36).slice(2,7).toUpperCase();
      const sessionId = "sess_" + Date.now().toString(36);
      await setDoc(doc(db, "sessions", sessionId), {
        id: sessionId,
        teacherId: user.id,
        classId: selectedClass,
        joinCode,
        type: "lesson08",
        status: "waiting",
        currentQuestion: null,
        questionCount: 0,
        timerSeconds: timer,
        timerEndsAt: null,
        participants: {},
        createdAt: Date.now(),
      });
      onCreated(sessionId);
    } catch(e) {
      console.error("Session create error:", e);
      alert("Error creating session: " + e.message);
      setLoading(false);
    }
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>Lesson 8 - Equations and d = s-t</h2>
        <p style={{ color:"var(--text2)",fontSize:20,marginBottom:16 }}>One-step equations, expression vs equation, solutions, and speed/distance/time.</p>
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

// - Main Export -
export default function Lesson08Session({ user, onHome }) {
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
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#fff" }}>L8</div>
            <div>
              <div style={{ fontWeight:800,fontSize:22 }}>GCA - Lesson 8</div>
              <div style={{ color:"var(--text3)",fontSize:20 }}>Equations and Speed/Distance/Time</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create"&&<CreateLesson08Session user={user} onCreated={(sid)=>{setSessionId(sid);setView("session");}} />}
        {view==="session"&&session&&(
          user.role==="teacher"
            ?<TeacherLesson08 session={session} sessionId={sessionId} uid={user.id} />
            :<StudentLesson08 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session"&&!session&&(
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson08 as Lesson08TeacherView, StudentLesson08 as Lesson08StudentView };
