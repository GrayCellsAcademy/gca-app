import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson10-ec-v1";
const STREAK_NEEDED = 3;

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
  return display ? <div ref={ref} style={{ margin:"8px 0" }} /> : <span ref={ref} />;
}

//  Activity 1: Complex equation
function varStr(n) {
  if (n===1) return 'x'; if (n===-1) return '-x'; return `${n}x`;
}
function signStr(n) { return n>=0 ? ` + ${n}` : ` - ${Math.abs(n)}`; }
function lVarStr(s, L) {
  const v = s*L;
  if (v===1) return '+ x'; if (v===-1) return '- x';
  return v > 0 ? `+ ${v}x` : `- ${Math.abs(v)}x`;
}

function buildLatex(q) {
  const { A,B,sC,C,sD,D,sE,E,sF,F,sG,G,H,I,sJ,J,sK,K,sL,L } = q;
  const li1 = `${varStr(sC*C)}${signStr(sD*D)}`;
  const li2 = `${varStr(sF*F)}${signStr(sG*G)}`;
  const eOp = sE>0 ? `+ ${E}` : `- ${E}`;
  const ri1 = `${varStr(sJ*J)}${signStr(sK*K)}`;
  const lv = lVarStr(sL, L);
  const left = `${A}\\left(${B}\\left(${li1}\\right) ${eOp}\\left(${li2}\\right)\\right)`;
  const right = `${H}\\left(${I}\\left(${ri1}\\right) ${lv}\\right)`;
  return `${left} = ${right}`;
}

function genComplexEq() {
  for (let attempt=0; attempt<2000; attempt++) {
    const A=randInt(1,4), B=randInt(1,4), C=randInt(1,5), D=randInt(1,9);
    const E=randInt(1,4), F=randInt(1,5), G=randInt(1,9);
    const H=randInt(1,4), I=randInt(1,4), J=randInt(1,5), K=randInt(1,9), L=randInt(1,5);
    const sC=Math.random()<0.3?-1:1, sD=Math.random()<0.5?1:-1, sE=Math.random()<0.5?1:-1;
    const sF=Math.random()<0.3?-1:1, sG=Math.random()<0.5?1:-1;
    const sJ=Math.random()<0.3?-1:1, sK=Math.random()<0.5?1:-1, sL=Math.random()<0.5?1:-1;
    const lCoeff=A*(B*sC*C+sE*E*sF*F), lConst=A*(B*sD*D+sE*E*sG*G);
    const rCoeff=H*(I*sJ*J+sL*L), rConst=H*(I*sK*K);
    const den=lCoeff-rCoeff, num=rConst-lConst;
    if (den===0||num%den!==0) continue;
    const x=num/den;
    if (Math.abs(x)>15||x===0) continue;
    return { type:'complex-eq', A,B,C,D,E,F,G,H,I,J,K,L,sC,sD,sE,sF,sG,sJ,sK,sL, x, lCoeff,lConst,rCoeff,rConst };
  }
  return genComplexEq(); // retry (very rare)
}

//  Activity 2: Average word problems
const NAMES = ['Alex','Jordan','Sam','Casey','Riley','Morgan'];
const CONTEXTS = [
  { name:"test", min:50, max:100, avgRange:[70,75,80,85,90],
    prompt:(nm,kn,av,n)=>`${nm} scored ${kn.join(' and ')} on the first ${kn.length} tests. What score is needed on test ${n} to have an average of ${av}?` },
  { name:"quiz", min:5, max:20, avgRange:[10,12,14,15,16,18],
    prompt:(nm,kn,av,n)=>`${nm} got ${kn.join(' and ')} on the first ${kn.length} quizzes. What score on quiz ${n} gives an average of ${av}?` },
  { name:"basketball", min:5, max:45, avgRange:[15,18,20,22,25,28,30],
    prompt:(nm,kn,av,n)=>`${nm} scored ${kn.join(' and ')} points in the first ${kn.length} games. How many points are needed in game ${n} to average ${av} per game?` },
  { name:"temperature", min:30, max:95, avgRange:[55,60,65,70,75,80],
    prompt:(_,kn,av,n)=>`The temperatures for the first ${kn.length} days were ${kn.join(', ')} degrees. What must the temperature be on day ${n} for the ${n}-day average to be ${av} degrees?` },
  { name:"sales", min:20, max:200, avgRange:[50,60,70,80,90,100],
    prompt:(nm,kn,av,n)=>`${nm} made ${kn.join(' and ')} sales on the first ${kn.length} days. How many sales are needed on day ${n} to average ${av} per day?` },
  { name:"miles", min:2, max:15, avgRange:[4,5,6,7,8,9,10],
    prompt:(nm,kn,av,n)=>`${nm} ran ${kn.join(' and ')} miles on the first ${kn.length} days. How many miles on day ${n} gives a ${n}-day average of ${av} miles?` },
  { name:"sleep", min:5, max:12, avgRange:[7,8,9],
    prompt:(nm,kn,av,n)=>`${nm} slept ${kn.join(' and ')} hours over the first ${kn.length} nights. How many hours on night ${n} gives an average of ${av} hours?` },
  { name:"books", min:1, max:15, avgRange:[3,4,5,6,7,8],
    prompt:(nm,kn,av,n)=>`${nm} read ${kn.join(' and ')} books in the first ${kn.length} months. How many books in month ${n} gives a ${n}-month average of ${av}?` },
  { name:"goals", min:0, max:8, avgRange:[2,3,4,5],
    prompt:(nm,kn,av,n)=>`${nm} scored ${kn.join(' and ')} goals in the first ${kn.length} games. How many goals in game ${n} give an average of ${av} per game?` },
  { name:"students", min:15, max:40, avgRange:[20,22,25,28,30],
    prompt:(_,kn,av,n)=>`A school recorded ${kn.join(' and ')} students in the first ${kn.length} classes. How many students in class ${n} gives a class average of ${av}?` },
  { name:"money", min:30, max:250, avgRange:[60,70,80,90,100,120],
    prompt:(nm,kn,av,n)=>`${nm} earned $${kn.join(' and $')} over the first ${kn.length} days. How much must be earned on day ${n} to average $${av} per day?` },
  { name:"calories", min:150, max:500, avgRange:[200,250,300,350,400],
    prompt:(nm,kn,av,n)=>`${nm} burned ${kn.join(' and ')} calories in the first ${kn.length} days. How many must be burned on day ${n} to average ${av} per day?` },
];

function genAvgProblem() {
  for (let att=0; att<200; att++) {
    const ctx=pick(CONTEXTS), n=randInt(3,4), avg=pick(ctx.avgRange);
    const known=Array.from({length:n-1},()=>randInt(ctx.min,ctx.max));
    const x=n*avg-known.reduce((a,b)=>a+b,0);
    if (x<ctx.min||x>ctx.max||!Number.isInteger(x)) continue;
    const name=pick(NAMES);
    return { type:'avg', prompt:ctx.prompt(name,known,avg,n), answer:x, n, avg, known };
  }
  return genAvgProblem();
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
  { id:"complex-eq", label:"Complex Equation Solving", description:"Expand, simplify, and solve for x", gen:genComplexEq },
  { id:"avg", label:"Average Word Problems", description:"Set up and solve equations to find a missing value given the average", gen:genAvgProblem },
];

export default function ExtraCredit10Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 10 EC (019)");
  const topicId = topic?.id || TOPIC_ID;
  const katexReady = useKaTeX();

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [wrongAns, setWrongAns] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
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
    if (!loading && actIdx < ACTIVITIES.length) {
      if (actIdx === 1 && !showReminder) { setShowReminder(true); return; }
      newProblem();
    }
  }, [actIdx, loading]);

  const newProblem = () => {
    setProblem(currentActivity.gen());
    setInput(""); setPhase("question"); setWrongAns(null); pendingNext.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question" || !input.trim()) return;
    const n = parseInt(input.trim(), 10);
    const correct = !isNaN(n) && n === problem[problem.type==="complex-eq"?"x":"answer"];
    if (correct) {
      const newStreak = streak+1;
      setStreak(newStreak);
      setPhase("correct");
      const final = newStreak >= STREAK_NEEDED;
      const nextAi = final ? actIdx+1 : actIdx;
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

  if (phase==="done") return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64,marginBottom:16 }}></div>
        <h2 style={{ fontSize:28,fontWeight:800,marginBottom:8 }}>Extra Credit Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:19,marginBottom:24 }}>You mastered complex equations and average word problems!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  if (showReminder) return (
    <div style={{ maxWidth:560,margin:"0 auto",animation:"fadeUp 0.3s ease" }}>
      <div className="card">
        <div style={{ fontSize:36,textAlign:"center",marginBottom:12 }}>Remember!</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:16,textAlign:"center" }}>How to Find an Average</h2>
        <div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:20 }}>
          <p style={{ fontSize:20,lineHeight:1.8,color:"var(--text)" }}>
            To find the average of a group of numbers, <strong>add all the numbers together</strong> and then <strong>divide by how many numbers there are</strong>.
          </p>
          {katexReady && <KaTeX expr="\\text{Average} = \\dfrac{\\text{Sum of all values}}{\\text{Number of values}}" display={true} />}
          <p style={{ fontSize:19,color:"var(--text2)",marginTop:12 }}>
            For example, if you need a certain score to reach an average, set up: <em>sum of all scores = average x number of scores</em>
          </p>
        </div>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }}
          onClick={()=>{ setShowReminder(false); newProblem(); }}>
          Got it - Start Activity 2
        </button>
      </div>
    </div>
  );

  const isEq = currentActivity.id==="complex-eq";
  const isAvg = currentActivity.id==="avg";

  return (
    <div style={{ maxWidth:680,margin:"0 auto",animation:"fadeUp 0.3s ease" }}>
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

        {phase==="correct"&&(
          <div style={{ animation:"popIn 0.25s ease",textAlign:"center" }}>
            <div style={{ fontSize:28,marginBottom:8 }}></div>
            <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6 }}>{pendingNext.current?.final?"Activity complete!":"Correct!"}</div>
            <div style={{ fontSize:19,color:"var(--text3)",marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={handleNext}>
               {pendingNext.current?.final?"Next activity":"Next problem"}
            </button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center" }}>Not quite! Streak reset.</div>
            {isEq&&katexReady&&<KaTeX expr={buildLatex(problem)} display={true} />}
            {isAvg&&<div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"12px 16px",marginBottom:10,fontSize:19 }}>{problem.prompt}</div>}
            <div style={{ textAlign:"center",marginBottom:12 }}>
              {wrongAns&&<span style={{ fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through",marginRight:16 }}>{wrongAns}</span>}
              <span style={{ fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)" }}>
                {isEq?`x = ${problem.x}`:problem.answer}
              </span>
            </div>
            {isEq&&(
              <div style={{ fontSize:17,color:"var(--text3)",marginBottom:12,textAlign:"center",lineHeight:1.8 }}>
                Left: {problem.lCoeff}x + ({problem.lConst}) &nbsp;=&nbsp; Right: {problem.rCoeff}x + ({problem.rConst})
              </div>
            )}
            {isAvg&&(
              <div style={{ fontSize:18,color:"var(--text2)",marginBottom:12,textAlign:"center" }}>
                {problem.n} x {problem.avg} - ({problem.known.join(' + ')}) = {problem.answer}
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={newProblem}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isEq&&(
              <>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:12 }}>Expand and solve for x.</p>
                <div style={{ marginBottom:20 }}>
                  {katexReady?<KaTeX expr={buildLatex(problem)} display={true} />:<div style={{ fontFamily:"var(--mono)",fontSize:18,textAlign:"center" }}>Equation loading...</div>}
                </div>
              </>
            )}
            {isAvg&&(
              <div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:20,fontSize:19,lineHeight:1.8 }}>
                {problem.prompt}
              </div>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9\-]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="numeric" placeholder={isEq?"x = ?":"?"}
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
