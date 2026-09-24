import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson09-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

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

function KaTeXExpr({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); }
      catch {}
    }
  });
  return <span ref={ref} />;
}

//  Activity 1: Matching
const DESCRIPTIONS = [
  "No real solutions",
  "One positive solution",
  "One negative solution",
  "Two solutions",
];
// EQ_TYPES: [template fn, correct desc index]
const EQ_TYPES = [
  { make:(a)=>`x^2 = ${a}`,   latex:(a)=>`x^{2} = ${a}`,   descIdx:3 },
  { make:(a)=>`x^2 = -${a}`,  latex:(a)=>`x^{2} = -${a}`,  descIdx:0 },
  { make:(a)=>`x^3 = ${a}`,   latex:(a)=>`x^{3} = ${a}`,   descIdx:1 },
  { make:(a)=>`x^3 = -${a}`,  latex:(a)=>`x^{3} = -${a}`,  descIdx:2 },
];
const PAIR_COLORS = ["var(--blue)","var(--green)","var(--amber)","#a855f7"];

function genMatchProblem() {
  const vals = [
    pick([4,9,16,25,36,49]),
    pick([4,9,16,25,36,49]),
    pick([8,27,64,125]),
    pick([8,27,64,125]),
  ];
  const eqOrder = shuffle([0,1,2,3]);
  const descOrder = shuffle([0,1,2,3]);
  const equations = eqOrder.map((ti,pos)=>({ pos, typeIdx:ti, display:EQ_TYPES[ti].make(vals[ti]), latex:EQ_TYPES[ti].latex(vals[ti]), correctDescIdx:EQ_TYPES[ti].descIdx }));
  const descriptions = descOrder.map((di,pos)=>({ pos, descIdx:di, text:DESCRIPTIONS[di] }));
  const correctAnswer = {};
  for (const eq of equations) {
    const d = descriptions.find(d=>d.descIdx===eq.correctDescIdx);
    correctAnswer[eq.pos] = d.pos;
  }
  return { type:'matching', equations, descriptions, correctAnswer };
}

//  Activity 2: Rectangle word problems
function genRectProblem() {
  const type = randInt(0,2);
  const unit = pick(['m','cm','ft','in']);
  let W, L, P, prompt;
  if (type===0) {
    W=randInt(3,15); const k=randInt(1,8); L=W+k; P=2*(L+W);
    prompt=`The perimeter of a rectangle is ${P} ${unit}. The length is ${k} ${unit} longer than the width. Find the width and length in ${unit}.`;
  } else if (type===1) {
    W=randInt(3,10); const n=pick([2,3,4]); L=n*W; P=2*(L+W);
    prompt=`The perimeter of a rectangle is ${P} ${unit}. The length is ${n} times the width. Find the width and length in ${unit}.`;
  } else {
    W=randInt(3,10); const n=pick([2,3]); const k=randInt(1,5); L=n*W+k; P=2*(L+W);
    prompt=`The perimeter of a rectangle is ${P} ${unit}. The length is ${k} ${unit} more than ${n} times the width. Find the width and length in ${unit}.`;
  }
  return { type:'rect', W, L, P, unit, prompt };
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

//  Matching UI
function MatchingActivity({ problem, onSubmit }) {
  const katexReady = useKaTeX();
  const [eqToDesc, setEqToDesc] = useState({});
  const [selectedEq, setSelectedEq] = useState(null);

  const { equations, descriptions, correctAnswer } = problem;

  // Assign color index to matched pairs in order of matching
  const colorMap = {};
  let ci=0;
  for (const [ep] of Object.entries(eqToDesc)) { colorMap[Number(ep)] = ci++; }

  const getEqColor = (pos) => eqToDesc[pos]!=null ? PAIR_COLORS[colorMap[pos]%4] : null;
  const getDescColor = (pos) => {
    const ep = Object.entries(eqToDesc).find(([,dp])=>dp===pos);
    return ep ? PAIR_COLORS[colorMap[Number(ep[0])]%4] : null;
  };

  const clickEq = (pos) => {
    if (eqToDesc[pos]!=null) {
      // unmatch
      const dp = eqToDesc[pos];
      setEqToDesc(prev=>{ const n={...prev}; delete n[pos]; return n; });
      setSelectedEq(null);
    } else if (selectedEq===pos) {
      setSelectedEq(null);
    } else {
      setSelectedEq(pos);
    }
  };

  const clickDesc = (pos) => {
    if (selectedEq===null) {
      // click already-matched desc -> unmatch
      const ep = Object.entries(eqToDesc).find(([,dp])=>dp===pos);
      if (ep) setEqToDesc(prev=>{ const n={...prev}; delete n[Number(ep[0])]; return n; });
      return;
    }
    setEqToDesc(prev => {
      const n={...prev};
      // Remove old match for selectedEq
      delete n[selectedEq];
      // Remove old match for this desc
      const ep2 = Object.entries(n).find(([,dp])=>dp===pos);
      if (ep2) delete n[Number(ep2[0])];
      n[selectedEq] = pos;
      return n;
    });
    setSelectedEq(null);
  };

  const allMatched = Object.keys(eqToDesc).length===4;

  const checkAndSubmit = () => {
    const correct = equations.every(eq => eqToDesc[eq.pos]===correctAnswer[eq.pos]);
    onSubmit(correct);
  };

  const cardBase = { padding:"12px 16px", borderRadius:"var(--radius-sm)", cursor:"pointer",
    fontSize:20, fontWeight:700, textAlign:"center", transition:"all 0.15s", userSelect:"none" };

  return (
    <div>
      <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16 }}>
        Click an equation, then click the matching description. Click again to un-match.
      </p>
      <div style={{ display:"flex",gap:12,justifyContent:"center" }}>
        {/* Equations */}
        <div style={{ display:"flex",flexDirection:"column",gap:8,flex:1,maxWidth:240 }}>
          <div style={{ fontSize:17,fontWeight:700,color:"var(--text3)",textAlign:"center",marginBottom:4 }}>Equations</div>
          {equations.map(eq=>{
            const color=getEqColor(eq.pos);
            const isSel=selectedEq===eq.pos;
            return (
              <div key={eq.pos} onClick={()=>clickEq(eq.pos)} style={{
                ...cardBase, fontFamily:"var(--mono)",
                background:color?"rgba(0,0,0,0.06)":isSel?"rgba(59,130,246,0.15)":"var(--bg2)",
                border:`2px solid ${color||( isSel?"var(--blue)":"var(--border)")}`,
                color:color||( isSel?"var(--blue)":"var(--text)"),
                boxShadow:isSel?"0 0 0 3px rgba(59,130,246,0.3)":"none",
              }}>
                {katexReady ? <KaTeXExpr expr={eq.latex} /> : eq.display}
              </div>
            );
          })}
        </div>
        {/* Descriptions */}
        <div style={{ display:"flex",flexDirection:"column",gap:8,flex:1,maxWidth:240 }}>
          <div style={{ fontSize:17,fontWeight:700,color:"var(--text3)",textAlign:"center",marginBottom:4 }}>Descriptions</div>
          {descriptions.map(desc=>{
            const color=getDescColor(desc.pos);
            return (
              <div key={desc.pos} onClick={()=>clickDesc(desc.pos)} style={{
                ...cardBase,
                background:color?"rgba(0,0,0,0.06)":"var(--bg2)",
                border:`2px solid ${color||"var(--border)"}`,
                color:color||"var(--text)",
              }}>
                {desc.text}
              </div>
            );
          })}
        </div>
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px",marginTop:20 }}
        onClick={checkAndSubmit} disabled={!allMatched}>
        Submit
      </button>
    </div>
  );
}

const ACTIVITIES = [
  { id:"matching", label:"Match Equations to Solution Types", description:"Match each equation to how many/what kind of solutions it has", gen:genMatchProblem },
  { id:"rect", label:"Rectangle Perimeter Word Problems", description:"Find length and width from perimeter and a relationship", gen:genRectProblem },
];

export default function ExtraCredit09Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 9 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [widthInput, setWidthInput] = useState("");
  const [lengthInput, setLengthInput] = useState("");
  const widthRef = useRef(null);
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
    setWidthInput(""); setLengthInput(""); setPhase("question"); pendingNext.current = null;
    setTimeout(() => widthRef.current?.focus(), 80);
  };

  const handleResult = async (correct) => {
    if (correct) {
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
      setStreak(0); setPhase("wrong");
      await saveProgress(user.id, topicId, {
        started:true, completed:false,
        percentComplete:Math.round((actIdx/ACTIVITIES.length)*100),
        data:{ actIdx, streak:0, completed:false },
      });
    }
  };

  const handleRectSubmit = async () => {
    if (!problem) return;
    const w = parseInt(widthInput.trim(), 10);
    const l = parseInt(lengthInput.trim(), 10);
    const correct = !isNaN(w) && !isNaN(l) && w === problem.W && l === problem.L;
    await handleResult(correct);
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
        <p style={{ color:"var(--text2)",fontSize:19,marginBottom:24 }}>You mastered equation matching and rectangle word problems!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isMatch = currentActivity.id==="matching";
  const isRect = currentActivity.id==="rect";

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
            {isMatch&&(
              <div style={{ fontSize:18,color:"var(--text2)",lineHeight:2,marginBottom:12 }}>
                <div><strong>x^2 = a</strong> -> Two solutions (+-sqrt(a)</div>
                <div><strong>x^2 = -a</strong> -> No real solutions</div>
                <div><strong>x^3 = a</strong> -> One positive solution</div>
                <div><strong>x^3 = -a</strong> -> One negative solution</div>
              </div>
            )}
            {isRect&&(
              <div style={{ marginBottom:12 }}>
                <div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"12px 16px",fontSize:19,marginBottom:10 }}>{problem.prompt}</div>
                <div style={{ fontSize:20,fontWeight:700,textAlign:"center" }}>
                  Width = <span style={{ color:"var(--green)" }}>{problem.W} {problem.unit}</span>,
                  &nbsp;Length = <span style={{ color:"var(--green)" }}>{problem.L} {problem.unit}</span>
                </div>
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={newProblem}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isMatch&&<MatchingActivity problem={problem} onSubmit={handleResult} />}
            {isRect&&(
              <>
                <div style={{ background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px 20px",marginBottom:20,fontSize:19,lineHeight:1.8 }}>{problem.prompt}</div>
                <div style={{ display:"flex",gap:12,marginBottom:12 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:6,display:"block" }}>Width ({problem.unit})</label>
                    <input ref={widthRef} value={widthInput} onChange={e=>setWidthInput(e.target.value.replace(/[^0-9]/g,""))}
                      onKeyDown={e=>e.key==="Enter"&&handleRectSubmit()} inputMode="numeric" placeholder="?"
                      style={{ textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:"100%" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ fontSize:18,fontWeight:700,color:"var(--text2)",marginBottom:6,display:"block" }}>Length ({problem.unit})</label>
                    <input value={lengthInput} onChange={e=>setLengthInput(e.target.value.replace(/[^0-9]/g,""))}
                      onKeyDown={e=>e.key==="Enter"&&handleRectSubmit()} inputMode="numeric" placeholder="?"
                      style={{ textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:"100%" }} />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
                  onMouseDown={e=>{e.preventDefault();handleRectSubmit();}}
                  onTouchEnd={e=>{e.preventDefault();handleRectSubmit();}}
                  disabled={!widthInput.trim()||!lengthInput.trim()}>
                  Submit
                </button>
              </>
            )}
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
