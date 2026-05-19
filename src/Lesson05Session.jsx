import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON05_TOPICS, generateLesson05Question, gradeLesson05Answer,
} from "./lesson05Questions";

const POINTS = 5;

// -- Triangle SVG --
function TriangleSVG({ question }) {
  const { sides, unit, hideIdx } = question;
  const W = 360, H = 280;
  // Place triangle vertices
  const v = [
    { x: 60, y: 230 },
    { x: 300, y: 230 },
    { x: 180, y: 60 },
  ];
  const mids = [
    { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 + 20 }, // bottom
    { x: (v[1].x + v[2].x) / 2 + 22, y: (v[1].y + v[2].y) / 2 },  // right
    { x: (v[2].x + v[0].x) / 2 - 22, y: (v[2].y + v[0].y) / 2 },  // left
  ];
  const sideIndices = [[0,1],[1,2],[2,0]];
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%",maxWidth:360,display:"block",margin:"0 auto" }}>
      {sideIndices.map(([a,b],i) => (
        <line key={i} x1={v[a].x} y1={v[a].y} x2={v[b].x} y2={v[b].y} stroke="var(--blue)" strokeWidth="2.5" />
      ))}
      {mids.map((m,i) => {
        const isHidden = i === hideIdx;
        return (
          <g key={i}>
            <rect x={m.x-32} y={m.y-13} width={64} height={26} rx={5}
              fill={isHidden?"rgba(251,191,36,0.15)":"var(--bg2)"}
              stroke={isHidden?"var(--amber)":"var(--border)"} strokeWidth="1" />
            <text x={m.x} y={m.y+6} textAnchor="middle" fontSize="13" fontWeight="700"
              fill={isHidden?"#7c3aed":"var(--text)"} fontFamily="var(--mono)">
              {isHidden?"?":sides[i]+unit}
            </text>
          </g>
        );
      })}
      <text x={W/2} y={H-4} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

// -- Rectangle SVG --
function RectangleMissingSVG({ question }) {
  const { knownSide, missingSide, area, unit } = question;
  const W = 360, H = 240;
  const rx=50,ry=40,rw=240,rh=140;
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%",maxWidth:360,display:"block",margin:"0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" rx="2" />
      <polyline points={(rx+12)+","+ry+" "+(rx+12)+","+(ry+12)+" "+rx+","+(ry+12)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {/* Known side - top */}
      <rect x={rx+rw/2-34} y={ry-20} width={68} height={22} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={rx+rw/2} y={ry-4} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{knownSide} {unit}</text>
      {/* Missing side - right */}
      <rect x={rx+rw+6} y={ry+rh/2-13} width={66} height={26} rx={4} fill="rgba(251,191,36,0.15)" stroke="var(--amber)" strokeWidth="1" />
      <text x={rx+rw+39} y={ry+rh/2+7} textAnchor="middle" fontSize="13" fontWeight="700" fill="#7c3aed" fontFamily="var(--mono)">?</text>
      {/* Area label - center */}
      <text x={W/2} y={ry+rh/2+6} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text2)" fontFamily="var(--mono)">
        <tspan>Area = {area} {unit}</tspan>
        <tspan dy="-6" fontSize="10">2</tspan>
      </text>
      <text x={W/2} y={H-4} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
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
  return <div ref={ref} style={{ fontSize:26,margin:"4px 0" }} />;
}

// -- Question Display --
function QuestionDisplay({ question, revealCorrect }) {
  useKaTeX();
  if (!question) return null;
  const q = question;

  switch (q.type) {
    case "warmup-a":
      return (
        <div>
          <TriangleSVG question={q} />
          <div style={{ textAlign:"center",fontSize:14,color:"var(--text2)",marginTop:6 }}>
            Perimeter = <strong style={{ fontFamily:"var(--mono)" }}>{q.perimeter}{q.unit}</strong>
          </div>
        </div>
      );

    case "warmup-b":
      return <RectangleMissingSVG question={q} />;

    case "warmup-c":
      return (
        <div style={{ display:"flex",gap:60,justifyContent:"center",alignItems:"center",flexWrap:"wrap",padding:"10px 0" }}>
          {[q.prob1,q.prob2].map((p,i) => (
            <div key={i} style={{ textAlign:"center",minWidth:120 }}>
              <div style={{ fontSize:13,color:"var(--text3)",marginBottom:6,fontWeight:600 }}>Expression {i+1}</div>
              <KaTeX expr={p.latex} />
            </div>
          ))}
        </div>
      );

    case "compare-signed":
      return (
        <div style={{ display:"flex",flexDirection:"column",gap:14,maxWidth:320,margin:"0 auto" }}>
          {q.pairs.map((pair,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:16,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
              <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700,color:"var(--text)",minWidth:36,textAlign:"right" }}>{pair.a}</span>
              <span style={{ fontSize:22,color:revealCorrect?"var(--green)":"var(--text3)",fontWeight:700,minWidth:24,textAlign:"center" }}>
                {revealCorrect ? pair.answer : "?"}
              </span>
              <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700,color:"var(--text)",minWidth:36 }}>{pair.b}</span>
            </div>
          ))}
        </div>
      );

    case "absolute-value":
      return (
        <div style={{ display:"flex",flexDirection:"column",gap:10,maxWidth:280,margin:"0 auto" }}>
          {q.questions.map((item,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px" }}>
              <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700 }}>{item.expr} =</span>
              <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:700,color:revealCorrect?"var(--green)":"var(--text3)" }}>
                {revealCorrect ? item.answer : "?"}
              </span>
            </div>
          ))}
        </div>
      );

    case "multiple-minus":
      return (
        <div style={{ textAlign:"center",margin:"12px 0" }}>
          <KaTeX expr={q.latex} />
        </div>
      );

    case "signed-act1":
    case "signed-act2":
    case "signed-act3":
    case "signed-act4":
      // On reveal: show all expressions with their answers annotated
      if (revealCorrect) {
        const correct = JSON.parse(q.answer);
        return (
          <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:320,overflowY:"auto" }}>
            {q.exprs.map((expr,i) => {
              const c = correct[i];
              const isAct4 = q.type === "signed-act4";
              return (
                <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"var(--mono)",fontSize:15,fontWeight:700,flex:1,minWidth:130 }}>{expr.display}</span>
                  {isAct4 ? (
                    <span style={{ fontFamily:"var(--mono)",fontSize:15,color:"var(--green)",fontWeight:700 }}>= {expr.result}</span>
                  ) : (
                    <span style={{ fontSize:13,color:"var(--green)",fontWeight:700 }}>
                      {c.num1==="+"?"(+)":"(-)"} and {c.num2==="+"?"(+)":"(-)"}
                      {c.addOrSub ? " -> " + c.addOrSub.toUpperCase() : ""}
                      {c.ansSign ? " -> answer " + c.ansSign : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      // Before reveal: show prompt only, input handles the expressions
      return (
        <div style={{ textAlign:"center",fontSize:14,color:"var(--text2)",padding:"12px 0" }}>
          {q.exprs.length} expressions to evaluate - answer one at a time below.
        </div>
      );

    default: return null;
  }
}

// -- Reveal --
function RevealCalculation({ question }) {
  if (!question) return null;
  const q = question;
  if (q.type === "warmup-a") {
    return (
      <div style={{ fontSize:14,color:"var(--text2)",marginTop:8 }}>
        <div>{q.known[0]}{q.unit} + {q.known[1]}{q.unit} = {q.known[0]+q.known[1]}{q.unit}</div>
        <div>{q.perimeter}{q.unit} - {q.known[0]+q.known[1]}{q.unit} = <strong style={{ color:"var(--green)" }}>{q.missing}{q.unit}</strong></div>
      </div>
    );
  }
  if (q.type === "warmup-b") {
    return (
      <div style={{ fontSize:14,color:"var(--text2)",marginTop:8,fontFamily:"var(--mono)" }}>
        {q.area} {q.unit}- / {q.knownSide} {q.unit} = <strong style={{ color:"var(--green)" }}>{q.missingSide} {q.unit}</strong>
      </div>
    );
  }
  if (q.type === "warmup-c") {
    return (
      <div style={{ fontSize:14,color:"var(--text2)",marginTop:8 }}>
        <div>Expr 1: <strong style={{ color:"var(--green)" }}>{q.prob1.isUndefined?"Undefined":"0"}</strong> - {q.prob1.isUndefined?"Division by zero is undefined.":"Zero divided by any number is 0."}</div>
        <div>Expr 2: <strong style={{ color:"var(--green)" }}>{q.prob2.isUndefined?"Undefined":"0"}</strong> - {q.prob2.isUndefined?"Division by zero is undefined.":"Zero divided by any number is 0."}</div>
      </div>
    );
  }
  return null;
}

// -- Answer Inputs --

// Warmup A & B: text input with units
function UnitAnswerInput({ onSubmit, submitted, placeholder }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&submit()} disabled={submitted}
        placeholder={placeholder||"e.g. 245ft"}
        style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }} />
      <button className="btn btn-primary" style={{ fontSize:18,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// Warmup C: two undefined/0 inputs
function DivZeroInput({ question, onSubmit, submitted }) {
  const [ans1, setAns1] = useState(""), [ans2, setAns2] = useState("");
  const ref = useRef(null);
  useEffect(() => { setAns1(""); setAns2(""); setTimeout(()=>ref.current?.focus(),80); }, [question?.id]);
  const inputStyle = { textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:"100%" };
  return (
    <div>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:10 }}>
        {[{val:ans1,set:setAns1,ref},{val:ans2,set:setAns2,ref:null}].map((item,i) => (
          <div key={i} style={{ flex:1,minWidth:140 }}>
            <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>Expression {i+1}</div>
            <input ref={item.ref} style={inputStyle} value={item.val} onChange={e=>item.set(e.target.value)} disabled={submitted} />
            <button className="btn btn-ghost btn-sm" style={{ width:"100%",marginTop:4,fontSize:13 }}
              onClick={()=>item.set("undefined")} disabled={submitted}>UNDEFINED</button>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%" }}
        onClick={() => onSubmit(JSON.stringify({ ans1:ans1.trim().toLowerCase(), ans2:ans2.trim().toLowerCase() }))}
        disabled={submitted||!ans1.trim()||!ans2.trim()}>Submit Both</button>
    </div>
  );
}

// Compare signed: < > = buttons for each pair
function CompareSignedInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(question.pairs.map(()=>""));
  const set = (i,v) => setAnswers(prev => prev.map((x,j)=>j===i?v:x));
  const allDone = answers.every(a=>a!=="");
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:12 }}>
        {question.pairs.map((pair,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px" }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:20,fontWeight:700,minWidth:40,textAlign:"right" }}>{pair.a}</span>
            <div style={{ display:"flex",gap:6 }}>
              {["<",">","="].map(sym => (
                <button key={sym} onClick={()=>!submitted&&set(i,sym)}
                  style={{ width:40,height:40,borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===sym?"var(--blue)":"var(--border)"),background:answers[i]===sym?"rgba(59,130,246,0.15)":"var(--surface)",fontFamily:"var(--mono)",fontSize:20,fontWeight:700,cursor:"pointer",color:answers[i]===sym?"var(--blue)":"var(--text)" }}>
                  {sym}
                </button>
              ))}
            </div>
            <span style={{ fontFamily:"var(--mono)",fontSize:20,fontWeight:700,minWidth:40 }}>{pair.b}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%" }}
        onClick={() => onSubmit(JSON.stringify(answers))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Absolute value: 3 numeric inputs
function AbsValueInput({ question, onSubmit, submitted }) {
  const [answers, setAnswers] = useState(["","",""]);
  const ref = useRef(null);
  useEffect(() => { setAnswers(["","",""]); setTimeout(()=>ref.current?.focus(),80); }, [question?.id]);
  const set = (i,v) => setAnswers(prev => prev.map((x,j)=>j===i?v:x));
  const allDone = answers.every(a=>a!=="");
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {question.questions.map((item,i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px" }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:20,fontWeight:700,flex:1 }}>{item.expr} =</span>
            <input ref={i===0?ref:null} value={answers[i]} onChange={e=>set(i,e.target.value.replace(/\D/g,""))}
              onKeyDown={e=>e.key==="Enter"&&allDone&&onSubmit(JSON.stringify(answers.map(Number)))}
              inputMode="numeric" disabled={submitted}
              style={{ width:80,textAlign:"center",fontSize:20,fontFamily:"var(--mono)",fontWeight:700,padding:"8px" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%" }}
        onClick={() => onSubmit(JSON.stringify(answers.map(Number)))} disabled={submitted||!allDone}>Submit All</button>
    </div>
  );
}

// Simple signed number input (allows negative)
function SignedNumInput({ onSubmit, submitted }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [submitted]);
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
        onKeyDown={e=>e.key==="Enter"&&submit()} inputMode="text" disabled={submitted}
        placeholder=""
        style={{ textAlign:"center",fontSize:30,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }} />
      <button className="btn btn-primary" style={{ fontSize:18,padding:"10px 20px" }}
        onMouseDown={e=>{e.preventDefault();submit();}} onTouchEnd={e=>{e.preventDefault();submit();}}
        disabled={submitted||!val.trim()}>OK</button>
    </div>
  );
}

// Signed operations acts 1-3: one expression at a time, collect all then submit
function SignedActInput({ question, onSubmit, submitted }) {
  const actType = question.type;
  const exprs = question.exprs;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allSelections, setAllSelections] = useState(() => exprs.map(()=>({ num1:"", num2:"", addOrSub:"", ansSign:"" })));
  const [done, setDone] = useState(false);

  const s = allSelections[currentIdx] || {};
  const set = (field, val) => setAllSelections(prev => prev.map((x,j)=>j===currentIdx?{...x,[field]:val}:x));

  const isCurrentComplete = () => {
    if (!s.num1 || !s.num2) return false;
    if ((actType==="signed-act2"||actType==="signed-act3") && !s.addOrSub) return false;
    if (actType==="signed-act3" && !s.ansSign) return false;
    return true;
  };

  const handleNext = () => {
    if (currentIdx < exprs.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      setDone(true);
      const ans = allSelections.map(sel => {
        const out = { num1:sel.num1, num2:sel.num2 };
        if (actType==="signed-act2"||actType==="signed-act3") out.addOrSub=sel.addOrSub;
        if (actType==="signed-act3") out.ansSign=sel.ansSign;
        return out;
      });
      onSubmit(JSON.stringify(ans));
    }
  };

  const SignBtn = ({ label, active, color, onClick }) => (
    <button onClick={onClick} disabled={submitted}
      style={{ padding:"8px 16px",borderRadius:"var(--radius-sm)",border:"2px solid "+(active?color:"var(--border)"),background:active?color+"22":"var(--surface)",fontFamily:"var(--mono)",fontSize:16,fontWeight:700,cursor:"pointer",color:active?color:"var(--text3)",minWidth:52 }}>
      {label}
    </button>
  );

  if (done) return (
    <div style={{ textAlign:"center",padding:"20px",color:"var(--green)",fontWeight:700 }}>Submitted! Waiting for reveal...</div>
  );

  return (
    <div>
      {/* Progress */}
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--text3)",marginBottom:8 }}>
        <span>Expression {currentIdx+1} of {exprs.length}</span>
        <span>{allSelections.filter((_,j)=>j<currentIdx).length} done</span>
      </div>
      <div style={{ height:4,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginBottom:16 }}>
        <div style={{ height:"100%",width:((currentIdx)/exprs.length*100)+"%",background:"var(--blue)",borderRadius:99,transition:"width 0.3s" }} />
      </div>

      {/* Current expression in KaTeX */}
      <div style={{ textAlign:"center",marginBottom:16 }}>
        <KaTeX expr={exprs[currentIdx].latex} />
      </div>

      {/* Buttons */}
      <div style={{ display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",marginBottom:16 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:12,color:"var(--text3)",marginBottom:6 }}>1st number is</div>
          <div style={{ display:"flex",gap:8 }}>
            <SignBtn label="+" active={s.num1==="+"} color="var(--green)" onClick={()=>set("num1","+")} />
            <SignBtn label="-" active={s.num1==="-"} color="var(--red)" onClick={()=>set("num1","-")} />
          </div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:12,color:"var(--text3)",marginBottom:6 }}>2nd number is</div>
          <div style={{ display:"flex",gap:8 }}>
            <SignBtn label="+" active={s.num2==="+"} color="var(--green)" onClick={()=>set("num2","+")} />
            <SignBtn label="-" active={s.num2==="-"} color="var(--red)" onClick={()=>set("num2","-")} />
          </div>
        </div>
        {(actType==="signed-act2"||actType==="signed-act3") && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:12,color:"var(--text3)",marginBottom:6 }}>We should</div>
            <div style={{ display:"flex",gap:8 }}>
              <SignBtn label="ADD" active={s.addOrSub==="add"} color="var(--blue)" onClick={()=>set("addOrSub","add")} />
              <SignBtn label="SUB" active={s.addOrSub==="sub"} color="var(--purple)" onClick={()=>set("addOrSub","sub")} />
            </div>
          </div>
        )}
        {actType==="signed-act3" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:12,color:"var(--text3)",marginBottom:6 }}>Answer sign</div>
            <div style={{ display:"flex",gap:8 }}>
              <SignBtn label="+" active={s.ansSign==="+"} color="var(--green)" onClick={()=>set("ansSign","+")} />
              <SignBtn label="-" active={s.ansSign==="-"} color="var(--red)" onClick={()=>set("ansSign","-")} />
            </div>
          </div>
        )}
      </div>

      <button className="btn btn-primary" style={{ width:"100%" }}
        onClick={handleNext} disabled={submitted||!isCurrentComplete()}>
        {currentIdx < exprs.length-1 ? "Next expression" : "Submit all"}
      </button>
    </div>
  );
}

// Signed act 4: one expression at a time, numeric input
function SignedAct4Input({ question, onSubmit, submitted }) {
  const exprs = question.exprs;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(exprs.map(()=>""));
  const [val, setVal] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(()=>ref.current?.focus(),80); }, [currentIdx]);

  const handleNext = () => {
    if (!val.trim()) return;
    const newAnswers = answers.map((x,j)=>j===currentIdx?val.trim():x);
    setAnswers(newAnswers);
    setVal("");
    if (currentIdx < exprs.length-1) {
      setCurrentIdx(i=>i+1);
    } else {
      setDone(true);
      onSubmit(JSON.stringify(newAnswers.map(v=>parseInt(v)||0)));
    }
  };

  if (done) return (
    <div style={{ textAlign:"center",padding:"20px",color:"var(--green)",fontWeight:700 }}>Submitted! Waiting for reveal...</div>
  );

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--text3)",marginBottom:8 }}>
        <span>Expression {currentIdx+1} of {exprs.length}</span>
        <span>{currentIdx} done</span>
      </div>
      <div style={{ height:4,background:"var(--surface2)",borderRadius:99,overflow:"hidden",marginBottom:16 }}>
        <div style={{ height:"100%",width:(currentIdx/exprs.length*100)+"%",background:"var(--blue)",borderRadius:99,transition:"width 0.3s" }} />
      </div>
      <div style={{ textAlign:"center",marginBottom:16 }}>
        <KaTeX expr={exprs[currentIdx].latex} />
      </div>
      <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
        <input ref={ref} value={val}
          onChange={e=>setVal(e.target.value.replace(/[^0-9\-]/g,""))}
          onKeyDown={e=>e.key==="Enter"&&handleNext()}
          inputMode="text" disabled={submitted} placeholder=""
          style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }} />
        <button className="btn btn-primary" style={{ fontSize:18,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();handleNext();}} onTouchEnd={e=>{e.preventDefault();handleNext();}}
          disabled={submitted||!val.trim()}>
          {currentIdx<exprs.length-1?"Next":"Submit"}
        </button>
      </div>
    </div>
  );
}

function AnswerInput({ question, onSubmit, submitted }) {
  if (!question) return null;
  const t = question.type;
  if (t==="warmup-a") return <UnitAnswerInput onSubmit={onSubmit} submitted={submitted} placeholder={"e.g. 245"+question.unit} />;
  if (t==="warmup-b") return <UnitAnswerInput onSubmit={onSubmit} submitted={submitted} />;
  if (t==="warmup-c") return <DivZeroInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="compare-signed") return <CompareSignedInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="absolute-value") return <AbsValueInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="multiple-minus") return <SignedNumInput onSubmit={onSubmit} submitted={submitted} />;
  if (t==="signed-act1"||t==="signed-act2"||t==="signed-act3") return <SignedActInput question={question} onSubmit={onSubmit} submitted={submitted} />;
  if (t==="signed-act4") return <SignedAct4Input question={question} onSubmit={onSubmit} submitted={submitted} />;
  return null;
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
      if (left===0&&!expiredRef.current) { expiredRef.current=true; onExpired?.(); }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0,(remaining/totalSeconds)*100);
  const color = remaining<=5?"var(--red)":remaining<=10?"var(--amber)":"var(--green)";
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
function TeacherLesson05({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(120);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON05_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateLesson05Question(currentTopic.id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount||0) + 1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer!==undefined && gradeLesson05Answer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, POINTS);
      }
    }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx+1, LESSON05_TOPICS.length-1);
    setCurrentTopicIdx(nextIdx);
    const q = generateLesson05Question(LESSON05_TOPICS[nextIdx].id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount||0) + 1,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db,"sessions",sessionId),{ status:"ended" });
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a=>gradeLesson05Answer(a.answer,question)).length;

  return (
    <div style={{ maxWidth:1100,margin:"0 auto" }}>
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
                {currentTopicIdx < LESSON05_TOPICS.length-1 && (
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next: {LESSON05_TOPICS[currentTopicIdx+1].label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color:"var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"240px 1fr",gap:16,alignItems:"start" }}>
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4 }}>Topic</div>
          {LESSON05_TOPICS.map((t,i) => {
            const isActive = i===currentTopicIdx, isDone = i<currentTopicIdx;
            return (
              <button key={t.id} onClick={()=>setCurrentTopicIdx(i)}
                style={{ background:isActive?"rgba(59,130,246,0.15)":"var(--surface)",border:"2px solid "+(isActive?"var(--blue)":isDone?"rgba(16,185,129,0.3)":"var(--border)"),borderRadius:"var(--radius)",padding:"7px 10px",cursor:"pointer",textAlign:"left",fontFamily:"var(--font)" }}>
                <div style={{ fontWeight:700,fontSize:11,color:isActive?"var(--blue)":isDone?"var(--green)":"var(--text)" }}>
                  {isDone?"done ":isActive?"now ":""}{t.label}
                </div>
                <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop:8 }} onClick={handleGenerate} disabled={session.status==="question"}>
            Generate Question
          </button>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          {session.status==="waiting" && (
            <div className="card" style={{ textAlign:"center",padding:"40px 20px" }}>
              <h3 style={{ fontSize:20,fontWeight:800,marginBottom:8 }}>Waiting for students</h3>
              <p style={{ color:"var(--blue)",fontFamily:"var(--mono)",fontSize:24,fontWeight:900 }}>{session.joinCode}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:12 }}>
                {Object.values(participants).map(p=>(
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
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={async()=>{ if(!revealedRef.current) await handleReveal(); }} />
                  </div>
                )}
                {session.status==="revealing" && (
                  <div style={{ marginTop:12,background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                    <div style={{ fontSize:13,color:"var(--text3)",marginBottom:4 }}>Correct answer</div>
                    <div style={{ fontSize:18,fontWeight:800,color:"var(--green)",fontFamily:"var(--mono)",marginBottom:6 }}>{question.displayAnswer}</div>
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
                    const ans = answers.find(a=>a.uid===pUid);
                    const has = ans?.answer!==undefined&&ans?.answer!==null&&ans?.answer!=="";
                    const correct = has && gradeLesson05Answer(ans.answer,question);
                    return (
                      <div key={pUid} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",border:"1px solid "+(has?(correct?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"):"var(--border)") }}>
                        <span style={{ fontWeight:600,fontSize:13 }}>{p.name}</span>
                        {has ? (
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            {session.status==="revealing" && <span style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--text2)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis" }}>{ans.answer.length>40?"...":ans.answer}</span>}
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
function StudentLesson05({ session, sessionId, uid }) {
  useKaTeX();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id!==lastQId) { setSubmitted(false); setResult(null); setLastQId(question.id); }
  }, [question?.id]);

  const handleSubmit = async (inputVal) => {
    if (!question||submitted) return;
    const ans = String(inputVal).trim();
    if (!ans) return;
    const correct = gradeLesson05Answer(ans, question);
    await setDoc(doc(db,"sessions",sessionId,"answers",uid+"_"+question.id), {
      uid, questionId:question.id, answer:ans, correct, submittedAt:Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, POINTS);
    setResult({ correct, answer:ans });
    setSubmitted(true);
  };

  if (session.status==="waiting") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>Waiting for teacher...</h2>
      <p style={{ color:"var(--text2)" }}>Lesson 5 - Signed Numbers</p>
    </div>
  );

  if (session.status==="ended") return (
    <div style={{ textAlign:"center",padding:"60px 20px" }}>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>Session ended</h2>
      <p style={{ color:"var(--text2)" }}>Final score: <strong>{myScore} pts</strong></p>
    </div>
  );

  return (
    <div style={{ maxWidth:600,margin:"0 auto" }}>
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
                <div style={{ fontSize:19,color:"var(--text2)",marginBottom:4 }}>Your answer: <strong style={{ fontFamily:"var(--mono)",color:result.correct?"var(--green)":"var(--red)" }}>{String(result.answer).slice(0,30)}</strong></div>
                {!result.correct && question?.displayAnswer && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ color:"var(--green)",fontSize:15,marginBottom:4 }}>Correct: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong></div>
                    <RevealCalculation question={question} />
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color:"var(--text3)",marginBottom:4 }}>No answer submitted.</div>
                {question?.displayAnswer && <div style={{ color:"var(--green)",fontSize:15 }}>Correct: <strong style={{ fontFamily:"var(--mono)" }}>{question.displayAnswer}</strong></div>}
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
function CreateLesson05Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createClassworkSession(user.id, selectedClass, timer);
      await updateDoc(doc(db,"sessions",sessionId),{ type:"lesson05" });
      onCreated(sessionId);
    } catch(e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize:20,fontWeight:800,marginBottom:4 }}>Lesson 5 - Signed Numbers</h2>
        <p style={{ color:"var(--text2)",fontSize:13,marginBottom:16 }}>Comparing signed numbers, absolute value, multiple minus signs, and signed number operations.</p>
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
export default function Lesson05Session({ user, onHome }) {
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
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff" }}>L5</div>
            <div>
              <div style={{ fontWeight:800,fontSize:18 }}>GCA</div>
              <div style={{ color:"var(--text3)",fontSize:12 }}>Lesson 5 - Signed Numbers</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view==="create" && <CreateLesson05Session user={user} onCreated={(sid)=>{ setSessionId(sid); setView("session"); }} />}
        {view==="session" && session && (
          user.role==="teacher"
            ? <TeacherLesson05 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson05 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view==="session" && !session && (
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson05 as Lesson05TeacherView, StudentLesson05 as Lesson05StudentView };

