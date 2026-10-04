import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson11-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function randNZ(){let c;do{c=randInt(-5,5);}while(c===0);return c;}

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

function KaTeXExpr({ expr, display }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError:false, displayMode:!!display }); }
      catch {}
    }
  });
  return display ? <div ref={ref} style={{ margin:"6px 0" }} /> : <span ref={ref} />;
}

//  Activity 1: Two objects meeting
const CONTEXTS = [
  { speedUnit:"mph", distUnit:"miles", timeUnit:"hours",
    sA:"Train A", sB:"Train B", from:"station A", to:"station B",
    xRange:[40,90], yRange:[40,90], tRange:[1,5] },
  { speedUnit:"mph", distUnit:"miles", timeUnit:"hours",
    sA:"Car A", sB:"Car B", from:"City A", to:"City B",
    xRange:[30,70], yRange:[30,70], tRange:[1,4] },
  { speedUnit:"mph", distUnit:"miles", timeUnit:"hours",
    sA:"Cyclist A", sB:"Cyclist B", from:"Town A", to:"Town B",
    xRange:[10,25], yRange:[10,25], tRange:[1,5] },
  { speedUnit:"m/min", distUnit:"meters", timeUnit:"minutes",
    sA:"Runner A", sB:"Runner B", from:"end A", to:"end B",
    xRange:[150,300], yRange:[150,300], tRange:[1,8] },
  { speedUnit:"km/h", distUnit:"km", timeUnit:"hours",
    sA:"Boat A", sB:"Boat B", from:"Port A", to:"Port B",
    xRange:[15,40], yRange:[15,40], tRange:[1,5] },
  { speedUnit:"km/h", distUnit:"km", timeUnit:"hours",
    sA:"Hiker A", sB:"Hiker B", from:"the start", to:"the end",
    xRange:[3,8], yRange:[3,8], tRange:[1,5] },
  { speedUnit:"cm/min", distUnit:"cm", timeUnit:"minutes",
    sA:"Ant A", sB:"Ant B", from:"point A", to:"point B",
    xRange:[5,15], yRange:[5,15], tRange:[1,10] },
  { speedUnit:"mph", distUnit:"miles", timeUnit:"hours",
    sA:"Plane A", sB:"Plane B", from:"Airport A", to:"Airport B",
    xRange:[300,600], yRange:[300,600], tRange:[1,4] },
];

function genMeeting() {
  let ctx, x, y, t, z;
  do {
    ctx = pick(CONTEXTS);
    x = randInt(ctx.xRange[0], ctx.xRange[1]);
    y = randInt(ctx.yRange[0], ctx.yRange[1]);
    t = randInt(ctx.tRange[0], ctx.tRange[1]);
    z = t * (x + y);
  } while (x === y);
  const prompt = `${ctx.sA} leaves ${ctx.from} traveling toward ${ctx.to} at ${x} ${ctx.speedUnit}. At the same time, ${ctx.sB} leaves ${ctx.to} traveling toward ${ctx.from} at ${y} ${ctx.speedUnit}. The distance between them is ${z} ${ctx.distUnit}. How many ${ctx.timeUnit} until they meet?`;
  return { type:'meeting', prompt, answer:t, unit:ctx.timeUnit, x, y, z };
}

//  Activity 2: Third degree polynomial in two variables
const TERM_DEFS = [
  {varLatex:"x^{3}",   eval:(x,y)=>x*x*x,   deg:3},
  {varLatex:"x^{2}y",  eval:(x,y)=>x*x*y,   deg:3},
  {varLatex:"xy^{2}",  eval:(x,y)=>x*y*y,   deg:3},
  {varLatex:"y^{3}",   eval:(x,y)=>y*y*y,   deg:3},
  {varLatex:"x^{2}",   eval:(x,y)=>x*x,     deg:2},
  {varLatex:"xy",      eval:(x,y)=>x*y,     deg:2},
  {varLatex:"y^{2}",   eval:(x,y)=>y*y,     deg:2},
  {varLatex:"x",       eval:(x,y)=>x,       deg:1},
  {varLatex:"y",       eval:(x,y)=>y,       deg:1},
];
const VALS = [-3,-2,-1,1,2,3];

function buildPolyLatex(terms, coeffs) {
  let s = '';
  terms.forEach((term, i) => {
    const c = coeffs[i], abs = Math.abs(c), isFirst = i === 0;
    const sign = c > 0 ? (isFirst ? '' : ' + ') : (isFirst ? '-' : ' - ');
    const coefStr = abs === 1 ? '' : String(abs);
    s += sign + coefStr + term.varLatex;
  });
  return s;
}

function genPolynomial() {
  for (let attempt = 0; attempt < 500; attempt++) {
    const xv = pick(VALS), yv = pick(VALS);
    const deg3 = TERM_DEFS.filter(t=>t.deg===3);
    const others = TERM_DEFS.filter(t=>t.deg<3).sort(()=>Math.random()-0.5).slice(0,3);
    const terms = [pick(deg3), ...others];
    const coeffs = terms.map(()=>randNZ());
    const result = terms.reduce((s,t,i)=>s+t.eval(coeffs[i],xv,yv),0);
    if (!Number.isInteger(result) || Math.abs(result)>500) continue;
    const latex = buildPolyLatex(terms, coeffs);
    return { type:'poly', terms, coeffs, xv, yv, result, latex };
  }
  return genPolynomial();
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

const ACTIVITIES = [
  { id:"meeting", label:"Two Objects Meeting", description:"Find the time until two objects traveling toward each other meet", gen:genMeeting },
  { id:"poly", label:"Evaluate a Polynomial", description:"Evaluate a third-degree polynomial in two variables", gen:genPolynomial },
];

export default function ExtraCredit11Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 11 EC (019)");
  const topicId = topic?.id || TOPIC_ID;
  const katexReady = useKaTeX();

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [wrongAns, setWrongAns] = useState(null);
  const inputRef = useRef(null);
  const pendingNext = useRef(null);

  const currentActivity = ACTIVITIES[actIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { actIdx:ai, streak:st, completed } = prog.data;
        if (completed) { setPhase("done"); setLoading(false); return; }
        setActIdx(Math.min(ai||0, ACTIVITIES.length-1));
        setStreak(st||0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && actIdx < ACTIVITIES.length) newProblem();
  }, [actIdx, loading]);

  const newProblem = () => {
    setProblem(currentActivity.gen());
    setInput(""); setPhase("question"); setWrongAns(null); pendingNext.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question" || !input.trim()) return;
    const n = parseInt(input.trim(), 10);
    const ans = problem.type === "meeting" ? problem.answer : problem.result;
    if (!isNaN(n) && n === ans) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const final = newStreak >= STREAK_NEEDED;
      const nextAi = final ? actIdx + 1 : actIdx;
      const done = nextAi >= ACTIVITIES.length && final;
      pendingNext.current = { final, nextAi, done };
      await saveProgress(user.id, topicId, {
        started:true, completed:done,
        percentComplete:done?100:Math.round((nextAi/ACTIVITIES.length)*100),
        data:{ actIdx:nextAi, streak:final?0:newStreak, completed:done },
      });
    } else {
      setStreak(0); setWrongAns(input); setPhase("wrong");
      await saveProgress(user.id, topicId, {
        started:true, completed:false,
        percentComplete:Math.round((actIdx/ACTIVITIES.length)*100),
        data:{ actIdx, streak:0, completed:false },
      });
    }
  };

  const handleNext = () => {
    const p = pendingNext.current;
    if (!p) return;
    if (p.done) setPhase("done");
    else if (p.final) { setActIdx(p.nextAi); setStreak(0); }
    else newProblem();
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner"/></div>;

  if (phase === "done") return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64,marginBottom:16 }}></div>
        <h2 style={{ fontSize:28,fontWeight:800,marginBottom:8 }}>Extra Credit Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:19,marginBottom:24 }}>You mastered meeting problems and polynomial evaluation!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isMeet = currentActivity.id === "meeting";
  const isPoly = currentActivity.id === "poly";

  return (
    <div style={{ maxWidth:660,margin:"0 auto",animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8 }}>
        <div>
          <div style={{ fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700 }}>Extra Credit - Activity {actIdx+1} of {ACTIVITIES.length}</div>
          <div style={{ fontSize:20,fontWeight:700 }}>{currentActivity?.label}</div>
          <div style={{ fontSize:17,color:"var(--text3)" }}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${(actIdx/ACTIVITIES.length)*100}%`,background:"linear-gradient(90deg,var(--amber),#f97316)",borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "correct" && (
          <div style={{ animation:"popIn 0.25s ease",textAlign:"center" }}>
            <div style={{ fontSize:28,marginBottom:8 }}></div>
            <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6 }}>{pendingNext.current?.final?"Activity complete!":"Correct!"}</div>
            <div style={{ fontSize:19,color:"var(--text3)",marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={handleNext}>
               {pendingNext.current?.final?"Next activity":"Next problem"}
            </button>
          </div>
        )}

        {phase === "wrong" && problem && (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center" }}>Not quite! Streak reset.</div>
            {isMeet && (
              <div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"12px 16px",marginBottom:10,fontSize:19 }}>{problem.prompt}</div>
            )}
            {isPoly && katexReady && (
              <div style={{ marginBottom:10 }}>
                <KaTeXExpr expr={problem.latex} display={true} />
                <div style={{ textAlign:"center",fontSize:18,color:"var(--text2)" }}>when x = {problem.xv}, y = {problem.yv}</div>
              </div>
            )}
            <div style={{ textAlign:"center",marginBottom:12 }}>
              {wrongAns && <span style={{ fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through",marginRight:16 }}>{wrongAns}</span>}
              <span style={{ fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)" }}>
                {isMeet ? problem.answer + " " + problem.unit : problem.result}
              </span>
            </div>
            {isMeet && (
              <div style={{ textAlign:"center",fontSize:17,color:"var(--text3)",marginBottom:12 }}>
                Combined speed: {problem.x} + {problem.y} = {problem.x+problem.y} {problem.unit.replace("hours","mph").replace("minutes","m/min")} &nbsp;&middot;&nbsp; Distance: {problem.z} &nbsp;&middot;&nbsp; Time = {problem.z} / {problem.x+problem.y} = {problem.answer}
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={newProblem}>Got it - try again</button>
          </div>
        )}

        {phase === "question" && problem && (
          <>
            {isMeet && (
              <div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:20,fontSize:19,lineHeight:1.9 }}>
                {problem.prompt}
              </div>
            )}
            {isPoly && (
              <>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:8 }}>
                  Evaluate when <strong>x = {problem.xv}</strong> and <strong>y = {problem.yv}</strong>:
                </p>
                <div style={{ marginBottom:20 }}>
                  {katexReady ? <KaTeXExpr expr={problem.latex} display={true} /> : <div style={{ textAlign:"center",fontSize:20,fontFamily:"var(--mono)" }}>Loading...</div>}
                </div>
              </>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9\-]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="numeric" placeholder="?"
              style={{ textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12 }} />
            <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop:16,display:"flex",gap:8 }}>
        {ACTIVITIES.map((a,i)=>{
          const done=i<actIdx,active=i===actIdx;
          return (
            <div key={a.id} style={{ fontSize:19,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(245,158,11,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--amber)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(245,158,11,0.3)":"var(--border)"}` }}>
              {done?" ":active?" ":""}{a.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
