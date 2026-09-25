import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson10-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

//  KaTeX
function useKaTeX() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

function KaTeX({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); }
      catch {}
    }
  });
  return <div ref={ref} style={{ margin:"4px 0" }} />;
}

//  Activity 1: x^2=a, two problems at once
const POS_ROOTS = [2,3,4,5,6,7,8,9];
const NEG_VALS  = [4,9,16,25,36,49,64,81];

function genXSquaredPair() {
  const k = pick(POS_ROOTS);
  const negN = pick(NEG_VALS);
  const posFirst = Math.random() < 0.5;
  return {
    type:"x-squared-pair",
    p1: posFirst ? { a:k*k, positive:true, k }  : { a:-negN, positive:false },
    p2: posFirst ? { a:-negN, positive:false }   : { a:k*k, positive:true, k },
  };
}

function gradeSquaredProb(input, noSol, prob) {
  if (prob.positive) {
    if (noSol) return false;
    const parts = input.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    if (parts.length !== 2) return false;
    const s = new Set(parts);
    return s.has(prob.k) && s.has(-prob.k);
  } else {
    return noSol; // only correct answer is no solution
  }
}

//  Activity 2: ax+b=c
function genLinear() {
  let a,x,b,c;
  do {
    a = randInt(-9,9); if (a===0) continue;
    x = randInt(-9,9); if (x===0) continue;
    b = randInt(-15,15);
    c = a*x + b;
    break;
  } while(true);
  // Build display string and latex
  const aStr = Math.abs(a)===1 ? (a<0?"-":"") : String(a);
  const bStr = b>0 ? ` + ${b}` : b<0 ? ` - ${Math.abs(b)}` : "";
  const display = `${aStr}x${bStr} = ${c}`;
  const latexA = Math.abs(a)===1 ? (a<0?"-":"") : String(a);
  const latexB = b>0 ? ` + ${b}` : b<0 ? ` - ${Math.abs(b)}` : "";
  const latex = `${latexA}x${latexB} = ${c}`;
  return { type:"linear", a, x, b, c, display, latex };
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
      <span style={{ fontSize:20, color:"var(--text3)" }}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{ width:13, height:13, borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,
          transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20, color:"var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

//  Single x^2 problem card
function XSquaredCard({ prob, input, onInput, noSol, onNoSol, showResult, katexReady }) {
  const correct = showResult ? gradeSquaredProb(input, noSol, prob) : null;
  const border = showResult ? (correct?"var(--green)":"var(--red)") : noSol?"var(--amber)":"var(--border)";
  const latex = `x^2 = ${prob.a}`;
  return (
    <div style={{ flex:1, border:`2px solid ${border}`, borderRadius:"var(--radius)", padding:"14px 12px",
      background:showResult?(correct?"rgba(16,185,129,0.07)":"rgba(239,68,68,0.07)"):"var(--bg2)", textAlign:"center" }}>
      <div style={{ marginBottom:10, minHeight:52, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {katexReady ? <KaTeX expr={latex} /> : <span style={{ fontSize:24, fontFamily:"var(--mono)", fontWeight:800 }}>{latex}</span>}
      </div>
      <input value={input} onChange={e=>onInput(e.target.value)} disabled={noSol || !!showResult}
        placeholder=""
        style={{ textAlign:"center", fontSize:20, fontFamily:"var(--mono)", fontWeight:700,
          padding:"8px", width:"100%", marginBottom:8, borderRadius:"var(--radius-sm)",
          opacity:noSol?0.4:1, background:"var(--surface)" }} />
      <button onClick={onNoSol} disabled={!!showResult}
        style={{ width:"100%", padding:"8px", borderRadius:"var(--radius-sm)", cursor:showResult?"default":"pointer",
          border:`2px solid ${noSol?"var(--amber)":"var(--border)"}`,
          background:noSol?"rgba(245,158,11,0.15)":"var(--surface)",
          color:noSol?"var(--amber)":"var(--text2)", fontFamily:"var(--font)", fontSize:17, fontWeight:700 }}>
        No Solution
      </button>
      {showResult && (
        <div style={{ marginTop:8, fontSize:17, fontWeight:700, color:correct?"var(--green)":"var(--red)" }}>
          {correct ? "Correct" : prob.positive ? `Answer: ${-prob.k}, ${prob.k}` : "No Solution"}
        </div>
      )}
    </div>
  );
}

const TOPICS = [
  { id:"x-squared", label:"Solve x\u00b2 = a", subLabel:"Two problems at once", gen:genXSquaredPair },
  { id:"linear",    label:"Solve ax + b = c", subLabel:"Find the integer solution", gen:genLinear },
];

export default function Lesson10WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 10 (019)");
  const topicId = topic?.id || TOPIC_ID;
  const katexReady = useKaTeX();

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  // Activity 1 state
  const [in1, setIn1] = useState(""); const [ns1, setNs1] = useState(false);
  const [in2, setIn2] = useState(""); const [ns2, setNs2] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // Activity 2 state
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx:ti, streak:st } = prog.data;
        setTopicIdx(Math.min(ti||0, TOPICS.length-1));
        setStreak(st||0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) newProblem(topicIdx);
  }, [topicIdx, loading]);

  const newProblem = (ti) => {
    setProblem(TOPICS[ti]?.gen());
    setIn1(""); setNs1(false); setIn2(""); setNs2(false); setShowResult(false);
    setInput(""); setPhase("question"); pendingProgress.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const saveProgress_ = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started:true, completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{ topicIdx:ti, streak:st },
    });
  };

  const handleCorrect = async () => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    setPhase("correct");
    if (newStreak >= STREAK_NEEDED) {
      const nextTi = topicIdx + 1;
      if (nextTi >= TOPICS.length) {
        pendingProgress.current = { action:"done" };
        await saveProgress_(nextTi, 0, true);
      } else {
        pendingProgress.current = { action:"next", ti:nextTi };
        await saveProgress_(nextTi, 0, false);
      }
    } else {
      pendingProgress.current = { action:"stay" };
      await saveProgress_(topicIdx, newStreak, false);
    }
  };

  const handleWrong = async () => {
    setStreak(0); setPhase("wrong");
    await saveProgress_(topicIdx, 0, false);
  };

  const handleXSquaredSubmit = async () => {
    setShowResult(true);
    const ok1 = gradeSquaredProb(in1, ns1, problem.p1);
    const ok2 = gradeSquaredProb(in2, ns2, problem.p2);
    if (ok1 && ok2) await handleCorrect();
    else await handleWrong();
  };

  const handleLinearSubmit = async () => {
    const n = parseInt(input.trim(), 10);
    if (!isNaN(n) && n === problem.x) await handleCorrect();
    else await handleWrong();
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action==="done") setPhase("celebration");
    else if (p.action==="next") { setTopicIdx(p.ti); setStreak(0); }
    else newProblem(topicIdx);
  };

  const canSubmitSquared = (in1||ns1) && (in2||ns2);

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner"/></div>;

  if (phase==="celebration"||topicIdx>=TOPICS.length) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64,marginBottom:16 }}></div>
        <h2 style={{ fontSize:28,fontWeight:800,marginBottom:8 }}>Warmup Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:19,marginBottom:24 }}>Ready for Classwork 10!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isXSq = currentTopic.id==="x-squared";
  const isLin = currentTopic.id==="linear";

  return (
    <div style={{ maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8 }}>
        <div>
          <div style={{ fontSize:19,color:"var(--text3)",marginBottom:2 }}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{ fontSize:20,fontWeight:700,color:"var(--blue)" }}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase==="correct"?(
          <div style={{ animation:"popIn 0.25s ease",textAlign:"center" }}>
            <div style={{ fontSize:28,marginBottom:8 }}></div>
            <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6 }}>
              {isXSq?"Both correct!":"Correct!"}
            </div>
            <div style={{ fontSize:19,color:"var(--text3)",marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={handleCorrectNext}> Next problem</button>
          </div>
        ):phase==="wrong"?(
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center" }}>Not quite! Streak reset.</div>
            {isXSq&&problem&&(
              <div style={{ display:"flex",gap:12,marginBottom:16 }}>
                <XSquaredCard prob={problem.p1} input={in1} onInput={()=>{}} noSol={ns1} onNoSol={()=>{}} showResult={true} katexReady={katexReady} />
                <XSquaredCard prob={problem.p2} input={in2} onInput={()=>{}} noSol={ns2} onNoSol={()=>{}} showResult={true} katexReady={katexReady} />
              </div>
            )}
            {isLin&&problem&&(
              <div style={{ textAlign:"center",marginBottom:12,fontSize:20 }}>
                {katexReady?<KaTeX expr={problem.latex} />:<span style={{ fontFamily:"var(--mono)",fontWeight:800 }}>{problem.display}</span>}
                <div style={{ fontWeight:700 }}>x = <span style={{ color:"var(--green)" }}>{problem.x}</span></div>
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={()=>newProblem(topicIdx)}>Got it - try again</button>
          </div>
        ):problem&&(
          <>
            {isXSq&&(
              <>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16 }}>
                  Solve each equation. For multiple solutions, separate with a comma.
                </p>
                <div style={{ display:"flex",gap:12,marginBottom:16 }}>
                  <XSquaredCard prob={problem.p1} input={in1} onInput={v=>{setIn1(v);setNs1(false);}} noSol={ns1} onNoSol={()=>{setNs1(p=>!p);setIn1("");}} showResult={showResult} katexReady={katexReady} />
                  <XSquaredCard prob={problem.p2} input={in2} onInput={v=>{setIn2(v);setNs2(false);}} noSol={ns2} onNoSol={()=>{setNs2(p=>!p);setIn2("");}} showResult={showResult} katexReady={katexReady} />
                </div>
                {!showResult&&(
                  <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
                    onClick={handleXSquaredSubmit} disabled={!canSubmitSquared}>
                    Submit Both
                  </button>
                )}
              </>
            )}
            {isLin&&(
              <>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:12 }}>Solve for x.</p>
                <div style={{ marginBottom:20 }}>
                  {katexReady?<KaTeX expr={problem.latex} />:<div style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:800 }}>{problem.display}</div>}
                </div>
                <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value.replace(/[^0-9\-]/g,""))}
                  onKeyDown={e=>e.key==="Enter"&&handleLinearSubmit()}
                  inputMode="numeric" placeholder="x = ?"
                  style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12 }} />
                <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
                  onMouseDown={e=>{e.preventDefault();handleLinearSubmit();}}
                  onTouchEnd={e=>{e.preventDefault();handleLinearSubmit();}}
                  disabled={!input.trim()}>
                  Submit
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop:16,display:"flex",gap:6 }}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return (
            <div key={t.id} style={{ fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}` }}>
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
