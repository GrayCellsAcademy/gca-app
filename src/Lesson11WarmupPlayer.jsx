import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson11-warmup-v1";
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

function KaTeX({ expr, display }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError:false, displayMode:!!display }); }
      catch {}
    }
  });
  return display ? <div ref={ref} style={{ margin:"6px 0" }} /> : <span ref={ref} />;
}

//  Activity 1: Three expressions at once
function genThreeExprs() {
  const a=randInt(1,10), b=randInt(1,10), c=randInt(1,10);
  const all = [
    { latex: "-\\left|-" + a + "\\right|", answer: -a },
    { latex: "-(-" + b + ")^{2}",               answer: -(b*b) },
    { latex: "-(-" + c + ")^{3}",               answer: c*c*c },
  ];
  const exprs = shuffle(all);
  return { type:"three-exprs", exprs };
}

//  Activity 2: Complex fraction
function genFraction() {
  for (let attempt=0; attempt<2000; attempt++) {
    const D = randInt(3,9);
    const R = pick([-9,-8,-7,-6,-5,-4,-3,3,4,5,6,7,8,9]);
    const N = R*D;
    const b=randInt(1,6), c=randInt(1,6);
    const a = N - b*b*c;
    const validEf = [-8,-6,-5,-4,-3,-2,-1,1,2,3,4,5,6,8].filter(v=>Math.abs(v)<D*D && D*D-v>0);
    if (!validEf.length) continue;
    const efVal = pick(validEf);
    const d = D*D - efVal;
    const fMag = pick([1,2,3]);
    const f = (efVal>0?1:-1)*fMag;
    const e = Math.abs(efVal)*fMag;
    if (Math.abs(Math.sqrt(d+e/f)-D)>0.001) continue;
    return { type:"fraction", a,b,c,d,e,f,D,R,N };
  }
  return genFraction();
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
      <span style={{ fontSize:20,color:"var(--text3)" }}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{ width:13,height:13,borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20,color:"var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

//  Expression Card for Activity 1
function ExprCard({ katexExpr, input, onInput, answer, showResult, katexReady }) {
  const isCorrect = showResult && parseInt(input.trim(),10)===answer;
  const isWrong = showResult && !isCorrect;
  return (
    <div style={{ flex:1, border:`2px solid ${showResult?(isCorrect?"var(--green)":"var(--red)"):"var(--border)"}`,
      borderRadius:"var(--radius-sm)", padding:"12px", textAlign:"center",
      background:showResult?(isCorrect?"rgba(16,185,129,0.07)":"rgba(239,68,68,0.07)"):"var(--bg2)" }}>
      <div style={{ minHeight:52, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        {katexReady ? <KaTeX expr={katexExpr} display={true} /> : <span style={{ fontFamily:"var(--mono)",fontWeight:800 }}>{katexExpr}</span>}
      </div>
      <input value={input} onChange={e=>onInput(e.target.value.replace(/[^0-9\-]/g,""))}
        disabled={!!showResult} inputMode="numeric" placeholder="?"
        style={{ textAlign:"center", fontSize:22, fontFamily:"var(--mono)", fontWeight:700,
          padding:"8px", width:"100%", borderRadius:"var(--radius-sm)" }} />
      {showResult && (
        <div style={{ marginTop:6,fontSize:16,fontWeight:700,color:isCorrect?"var(--green)":"var(--red)" }}>
          {isCorrect ? "Correct" : `Answer: ${answer}`}
        </div>
      )}
    </div>
  );
}

const TOPICS = [
  { id:"three-exprs", label:"Evaluate Three Expressions", subLabel:"Get all three correct to advance", gen:genThreeExprs },
  { id:"fraction", label:"Simplify the Fraction", subLabel:"Evaluate numerator and denominator, then divide", gen:genFraction },
];

export default function Lesson11WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 11 (019)");
  const topicId = topic?.id || TOPIC_ID;
  const katexReady = useKaTeX();

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  // Activity 1
  const [in1,setIn1]=useState(""), [in2,setIn2]=useState(""), [in3,setIn3]=useState("");
  const [showResult,setShowResult]=useState(false);
  // Activity 2
  const [input,setInput]=useState("");
  const inputRef=useRef(null);
  const pendingProgress=useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id, topicId);
      if (prog?.data){ const{topicIdx:ti,streak:st}=prog.data; setTopicIdx(Math.min(ti||0,TOPICS.length-1)); setStreak(st||0); }
      setLoading(false);
    };
    load();
  },[]);

  useEffect(()=>{ if (!loading) newProblem(topicIdx); },[topicIdx,loading]);

  const newProblem=(ti)=>{
    setProblem(TOPICS[ti]?.gen());
    setIn1(""); setIn2(""); setIn3(""); setShowResult(false);
    setInput(""); setPhase("question"); pendingProgress.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProgress_=async(ti,st,done)=>{
    await saveProgress(user.id, topicId,{
      started:true, completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st},
    });
  };

  const handleCorrect=async()=>{
    const newStreak=streak+1; setStreak(newStreak); setPhase("correct");
    if (newStreak>=STREAK_NEEDED){
      const nextTi=topicIdx+1;
      if (nextTi>=TOPICS.length){ pendingProgress.current={action:"done"}; await saveProgress_(nextTi,0,true); }
      else { pendingProgress.current={action:"next",ti:nextTi}; await saveProgress_(nextTi,0,false); }
    } else { pendingProgress.current={action:"stay"}; await saveProgress_(topicIdx,newStreak,false); }
  };

  const handleWrong=async()=>{ setStreak(0); setPhase("wrong"); await saveProgress_(topicIdx,0,false); };

  const handleThreeSubmit=async()=>{
    setShowResult(true);
    const e = problem?.exprs || [];
    const ok=e.length===3 && parseInt(in1,10)===e[0].answer && parseInt(in2,10)===e[1].answer && parseInt(in3,10)===e[2].answer;
    if(ok) await handleCorrect(); else await handleWrong();
  };

  const handleFracSubmit=async()=>{
    const n=parseInt(input.trim(),10);
    if(!isNaN(n)&&n===problem.R) await handleCorrect(); else await handleWrong();
  };

  const handleCorrectNext=()=>{
    const p=pendingProgress.current; if(!p) return;
    if(p.action==="done") setPhase("celebration");
    else if(p.action==="next"){setTopicIdx(p.ti);setStreak(0);}
    else newProblem(topicIdx);
  };

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if (phase==="celebration"||topicIdx>=TOPICS.length) return (
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 11!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isThree=currentTopic.id==="three-exprs";
  const isFrac=currentTopic.id==="fraction";
  const canSubmitThree=(in1||in2||in3)&&(in1.trim()!=""&&in2.trim()!=""&&in3.trim()!="");

  // Build KaTeX strings
  const exprs = problem && isThree ? problem.exprs : [{latex:"",answer:0},{latex:"",answer:0},{latex:"",answer:0}];
  const fracLatex = problem && isFrac
    ? "\\dfrac{" + problem.a + " - " + problem.b + "^{2} \\cdot (-" + problem.c + ")}{\\sqrt{" + problem.d + " + \\dfrac{" + problem.e + "}{" + problem.f + "}}}"
    : "";

    return (
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99}} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>{isThree?"All three correct!":"Correct!"}</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={handleCorrectNext}> Next problem</button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>Not quite! Streak reset.</div>
            {isThree&&(
              <div style={{display:"flex",gap:10,marginBottom:12}}>
                <ExprCard katexExpr={exprs[0].latex} input={in1} onInput={()=>{}} answer={exprs[0].answer} showResult={true} katexReady={katexReady} />
                <ExprCard katexExpr={exprs[1].latex} input={in2} onInput={()=>{}} answer={exprs[1].answer} showResult={true} katexReady={katexReady} />
                <ExprCard katexExpr={exprs[2].latex} input={in3} onInput={()=>{}} answer={exprs[2].answer} showResult={true} katexReady={katexReady} />
              </div>
            )}
            {isFrac&&(
              <div style={{textAlign:"center",marginBottom:12}}>
                {katexReady&&<KaTeX expr={fracLatex} display={true} />}
                <div style={{fontSize:22,fontWeight:800}}>= <span style={{color:"var(--green)"}}>{problem.R}</span></div>
                <div style={{fontSize:17,color:"var(--text3)",marginTop:6}}>
                  Numerator: {problem.a} + {problem.b*problem.b*problem.c} = {problem.N} &nbsp;|&nbsp; Denominator: {problem.D} &nbsp;|&nbsp; Result: {problem.N}/{problem.D}
                </div>
              </div>
            )}
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={()=>newProblem(topicIdx)}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isThree&&(
              <>
                <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16}}>Evaluate each expression. Get all three correct.</p>
                <div style={{display:"flex",gap:10,marginBottom:16}}>
                  <ExprCard katexExpr={exprs[0].latex} input={in1} onInput={v=>{setIn1(v);}} answer={exprs[0].answer} showResult={showResult} katexReady={katexReady} />
                  <ExprCard katexExpr={exprs[1].latex} input={in2} onInput={v=>{setIn2(v);}} answer={exprs[1].answer} showResult={showResult} katexReady={katexReady} />
                  <ExprCard katexExpr={exprs[2].latex} input={in3} onInput={v=>{setIn3(v);}} answer={exprs[2].answer} showResult={showResult} katexReady={katexReady} />
                </div>
                {!showResult&&(
                  <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
                    onClick={handleThreeSubmit} disabled={!canSubmitThree}>
                    Submit All
                  </button>
                )}
              </>
            )}
            {isFrac&&(
              <>
                <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:12}}>Simplify the expression to a single integer.</p>
                <div style={{marginBottom:20}}>
                  {katexReady?<KaTeX expr={fracLatex} display={true} />:<div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:18}}>Loading...</div>}
                </div>
                <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value.replace(/[^0-9\-]/g,""))}
                  onKeyDown={e=>e.key==="Enter"&&handleFracSubmit()}
                  inputMode="numeric" placeholder="?"
                  style={{textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12}} />
                <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
                  onMouseDown={e=>{e.preventDefault();handleFracSubmit();}}
                  onTouchEnd={e=>{e.preventDefault();handleFracSubmit();}}
                  disabled={!input.trim()}>
                  Submit
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div style={{marginTop:16,display:"flex",gap:6}}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return (
            <div key={t.id} style={{fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`}}>
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
