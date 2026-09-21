import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson09-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

//  Activity 1: L-Shape Perimeter
function genLShape() {
  let W,H,w,h;
  do { W=randInt(4,14); H=randInt(4,14); w=randInt(1,W-2); h=randInt(1,H-2); }
  while (W-w<=1 || H-h<=1);
  const unit=pick(['cm','m','ft','in']);
  return { type:'l-shape', W, H, w, h, unit, perimeter:2*W+2*H };
}

// L-shape SVG display
// Shape: notch removed from top-right corner (size w x h)
// Vertices clockwise from top-left:
// (0,0) -> (W-w,0) -> (W-w,h) -> (W,h) -> (W,H) -> (0,H) -> back
// Sides: top=(W-w)[hidden], inner-drop=h[visible], inner-shelf=w[visible],
//        right=(H-h)[hidden], bottom=W[visible], left=H[visible]
function LShapeSVG({ W, H, w, h, unit }) {
  const MAX=220, PAD=48;
  const sc=Math.min(MAX/W, MAX/H);
  const sw=W*sc, sh=H*sc, nw=w*sc, nh=h*sc;
  const ox=PAD, oy=PAD;
  const pts=[[ox,oy],[ox+sw-nw,oy],[ox+sw-nw,oy+nh],[ox+sw,oy+nh],[ox+sw,oy+sh],[ox,oy+sh]];
  const path="M "+pts.map(p=>p.join(",")).join(" L ")+" Z";
  const svgW=sw+PAD*2+24, svgH=sh+PAD*2+24;

  const sides=[
    // id, midX, midY, offX, offY, value, visible, rotate
    { id:"top",    mx:ox+(sw-nw)/2,  my:oy,        dx:0,   dy:-16, v:W-w,  show:false },
    { id:"drop",   mx:ox+sw-nw,      my:oy+nh/2,   dx:16,  dy:0,   v:h,    show:true  },
    { id:"shelf",  mx:ox+sw-nw+nw/2, my:oy+nh,     dx:0,   dy:16,  v:w,    show:true  },
    { id:"right",  mx:ox+sw,         my:oy+nh+(sh-nh)/2, dx:20, dy:0, v:H-h, show:false },
    { id:"bottom", mx:ox+sw/2,       my:oy+sh,     dx:0,   dy:20,  v:W,    show:true  },
    { id:"left",   mx:ox,            my:oy+sh/2,   dx:-20, dy:0,   v:H,    show:true  },
  ];

  return (
    <svg width={svgW} height={svgH} style={{ display:"block", margin:"0 auto" }}>
      <path d={path} fill="rgba(59,130,246,0.07)" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" />
      {sides.map(s => (
        <text key={s.id} x={s.mx+s.dx} y={s.my+s.dy} textAnchor="middle"
          dominantBaseline="middle" fontSize="14" fontWeight="800"
          fill={s.show ? "var(--text)" : "var(--red)"}>
          {s.show ? `${s.v} ${unit}` : "?"}
        </text>
      ))}
    </svg>
  );
}

//  Activity 2: x\u00b2=a, choose solutions
const POS_SQ=[16,25,36,49,64,81];
function genSquareEq() {
  const posA=pick(POS_SQ);
  const useNeg=Math.random()<0.3;
  const a=useNeg?-posA:posA;
  const k=Math.round(Math.sqrt(posA));
  const choices=shuffle([-2*k,-k,0,k,2*k]);
  return { type:'square-eq', a, k, choices, noSolution:useNeg };
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

const TOPICS = [
  { id:"l-shape", label:"Perimeter of Rectilinear Shapes", subLabel:"Find the perimeter", gen:genLShape },
  { id:"square-eq", label:"Solve x\u00b2 = a", subLabel:"Select all solutions", gen:genSquareEq },
];

export default function Lesson09WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 9 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState(""); // for l-shape perimeter
  const [selected, setSelected] = useState([]); // for square-eq: selected numbers
  const [noSolSelected, setNoSolSelected] = useState(false);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
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
    setInput(""); setSelected([]); setNoSolSelected(false);
    setPhase("question"); pendingProgress.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const saveProgress_ = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started:true, completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{ topicIdx:ti, streak:st },
    });
  };

  const toggleNumber = (n) => {
    if (noSolSelected) return;
    setSelected(prev => prev.includes(n) ? prev.filter(x=>x!==n) : [...prev,n]);
  };

  const toggleNoSol = () => {
    setNoSolSelected(prev => !prev);
    if (!noSolSelected) setSelected([]);
  };

  const gradeAnswer = () => {
    if (!problem) return false;
    if (problem.type === 'l-shape') {
      const n = parseInt(input.trim(), 10);
      return !isNaN(n) && n === problem.perimeter;
    }
    if (problem.noSolution) return noSolSelected && selected.length===0;
    const sortedSel = [...selected].sort((a,b)=>a-b);
    const sortedCorr = [-problem.k, problem.k].sort((a,b)=>a-b);
    return !noSolSelected && JSON.stringify(sortedSel)===JSON.stringify(sortedCorr);
  };

  const canSubmit = () => {
    if (!problem) return false;
    if (problem.type==='l-shape') return input.trim()!=='';
    return selected.length>0 || noSolSelected;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || phase!=='question') return;
    if (gradeAnswer()) {
      const newStreak = streak+1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak>=STREAK_NEEDED) {
        const nextTi=topicIdx+1;
        if (nextTi>=TOPICS.length) {
          pendingProgress.current={action:"done"};
          await saveProgress_(nextTi,0,true);
        } else {
          pendingProgress.current={action:"next",ti:nextTi};
          await saveProgress_(nextTi,0,false);
        }
      } else {
        pendingProgress.current={action:"stay"};
        await saveProgress_(topicIdx,newStreak,false);
      }
    } else {
      setStreak(0); setPhase("wrong");
      await saveProgress_(topicIdx,0,false);
    }
  };

  const handleCorrectNext = () => {
    const p=pendingProgress.current;
    if (!p) return;
    if (p.action==="done") setPhase("celebration");
    else if (p.action==="next") { setTopicIdx(p.ti); setStreak(0); }
    else newProblem(topicIdx);
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner"/></div>;

  if (phase==="celebration"||topicIdx>=TOPICS.length) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64,marginBottom:16 }}></div>
        <h2 style={{ fontSize:28,fontWeight:800,marginBottom:8 }}>Warmup Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:19,marginBottom:24 }}>Ready for Classwork 9!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isShape=currentTopic.id==="l-shape";
  const isEq=currentTopic.id==="square-eq";
  const btnStyle=(active)=>({
    padding:"12px 20px", borderRadius:"var(--radius-sm)", cursor:"pointer",
    fontFamily:"var(--mono)", fontSize:22, fontWeight:800, transition:"all 0.15s",
    border:`2px solid ${active?"var(--blue)":"var(--border)"}`,
    background:active?"rgba(59,130,246,0.15)":"var(--surface)",
    color:active?"var(--blue)":"var(--text2)",
  });
  const noSolBtnStyle=(active)=>({
    ...btnStyle(active),
    borderColor:active?"var(--amber)":"var(--border)",
    background:active?"rgba(245,158,11,0.15)":"var(--surface)",
    color:active?"var(--amber)":"var(--text2)",
    fontSize:18,
  });

  return (
    <div style={{ maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease" }}>
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
            <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6 }}>Correct!</div>
            <div style={{ fontSize:19,color:"var(--text3)",marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={handleCorrectNext}> Next problem</button>
          </div>
        ):phase==="wrong"?(
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center" }}>Not quite! Streak reset.</div>
            {isShape&&problem&&(
              <div style={{ textAlign:"center",marginBottom:12 }}>
                <LShapeSVG W={problem.W} H={problem.H} w={problem.w} h={problem.h} unit={problem.unit} />
                <div style={{ fontSize:20,fontWeight:700,marginTop:8 }}>
                  Perimeter = 2\u00d7{problem.W} + 2\u00d7{problem.H} = <span style={{ color:"var(--green)" }}>{problem.perimeter} {problem.unit}</span>
                </div>
              </div>
            )}
            {isEq&&problem&&(
              <div style={{ textAlign:"center",marginBottom:12,fontSize:20 }}>
                x\u00b2 = {problem.a} &rarr; {problem.noSolution
                  ? <span style={{ color:"var(--green)" }}>No real solutions (negative number has no real square root)</span>
                  : <span>x = <span style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{-problem.k}</span> or x = <span style={{ color:"var(--green)",fontFamily:"var(--mono)" }}>{problem.k}</span></span>}
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={()=>newProblem(topicIdx)}>Got it - try again</button>
          </div>
        ):problem&&(
          <>
            {isShape&&(
              <>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16 }}>
                  Find the perimeter. Red sides marked "?" must be determined from the given sides.
                </p>
                <LShapeSVG W={problem.W} H={problem.H} w={problem.w} h={problem.h} unit={problem.unit} />
                <div style={{ marginTop:16 }}>
                  <input ref={inputRef} value={input}
                    onChange={e=>setInput(e.target.value.replace(/[^0-9]/g,""))}
                    onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                    inputMode="numeric" placeholder="Perimeter = ?"
                    style={{ textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10 }} />
                  <div style={{ textAlign:"center",fontSize:17,color:"var(--text3)",marginBottom:10 }}>Enter the perimeter in {problem.unit}</div>
                </div>
              </>
            )}
            {isEq&&(
              <>
                <div style={{ textAlign:"center",fontSize:36,fontWeight:900,fontFamily:"var(--mono)",
                  background:"var(--bg2)",borderRadius:"var(--radius)",padding:"16px",marginBottom:20 }}>
                  x<sup>2</sup> = {problem.a}
                </div>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16 }}>
                  Select all values of x that satisfy the equation.
                </p>
                <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:16 }}>
                  {problem.choices.map(n=>(
                    <button key={n} onClick={()=>toggleNumber(n)} style={btnStyle(selected.includes(n))}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}>
                  <button onClick={toggleNoSol} style={noSolBtnStyle(noSolSelected)}>
                    No Real Solutions
                  </button>
                </div>
              </>
            )}
            <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!canSubmit()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop:16,display:"flex",gap:6 }}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return (
            <div key={t.id} style={{
              fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`,
            }}>
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
