import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON14_MASTERY_TOPIC_ID = "lesson14-mastery-v1";
export const PERFECT_CUBES_TOPIC_ID = "perfect-cubes-v1";

const STREAK3 = 3;
const CUBE_TIMER = 5;

// - Math helpers -
function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function gcd(a,b){ return b===0?a:gcd(b,a%b); }
function reduce(n,d){ const g=gcd(Math.abs(n),Math.abs(d)); return [n/g,d/g]; }
function parseFraction(str){
  const s=String(str).trim().replace(/\s*-\s*/g," ").replace(/\s+/g," ");
  const mx=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if(mx) return {whole:parseInt(mx[1]),num:parseInt(mx[2]),den:parseInt(mx[3]),isMixed:true};
  const fx=s.match(/^(\d+)\/(\d+)$/);
  if(fx) return {whole:0,num:parseInt(fx[1]),den:parseInt(fx[2]),isMixed:false};
  return null;
}
function fractionValue(p){ return p.isMixed?p.whole+p.num/p.den:p.num/p.den; }

const DENOMS=[2,3,4,5,6,8,10];

// - Shared UI -
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:14 }}>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{ width:13,height:13,borderRadius:"50%",background:i<current?"var(--green)":"var(--surface2)",border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20,color:"var(--text3)",marginLeft:6 }}>{current}/{needed}</span>
    </div>
  );
}

function FeedbackBanner({ correct, message, onNext }) {
  return (
    <div style={{ textAlign:"center",marginTop:12 }}>
      <div style={{ fontSize:24,fontWeight:800,color:correct?"var(--green)":"var(--red)",marginBottom:10 }}>{correct?"Correct!":"Incorrect"}</div>
      {message&&<div style={{ fontSize:20,color:"var(--text2)",marginBottom:14,background:correct?"rgba(22,163,74,0.06)":"rgba(239,68,68,0.06)",border:"1px solid "+(correct?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)"),borderRadius:"var(--radius-sm)",padding:"10px 16px",textAlign:"left" }}>{message}</div>}
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onNext}>Next Problem</button>
    </div>
  );
}

// Fraction picture SVG
function FractionPicture({ num, den, shape }) {
  if(shape==="circle"){
    const r=45,cx=55,cy=55;
    return (
      <svg viewBox="0 0 110 110" style={{ width:110,height:110 }}>
        {Array.from({length:den}).map((_,i)=>{
          const s=(i/den)*2*Math.PI-Math.PI/2, e=((i+1)/den)*2*Math.PI-Math.PI/2;
          const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);
          return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${1/den>0.5?1:0} 1 ${x2},${y2} Z`} fill={i<num?"var(--blue)":"var(--surface2)"} stroke="var(--bg)" strokeWidth="2"/>;
        })}
      </svg>
    );
  }
  const W=200,H=60;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:200,height:60 }}>
      {Array.from({length:den}).map((_,i)=>(
        <rect key={i} x={i/den*W+1} y={1} width={W/den-2} height={H-2} fill={i<num?"var(--blue)":"var(--surface2)"} rx={2}/>
      ))}
    </svg>
  );
}

// Number line SVG
function NumberLineSVG({ value, den }) {
  const W=320,H=70,m=30,lineW=W-2*m;
  const totalParts=2*den;
  const markX=i=>m+(i/totalParts)*lineW;
  const pointX=m+(Math.min(value,2)/2)*lineW;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",maxWidth:320,display:"block",margin:"0 auto" }}>
      <line x1={m} y1={35} x2={W-m} y2={35} stroke="var(--text2)" strokeWidth="2"/>
      <polygon points={`${W-m},35 ${W-m-8},30 ${W-m-8},40`} fill="var(--text2)"/>
      {Array.from({length:totalParts+1}).map((_,i)=>{
        const x=markX(i),isW=i%den===0;
        return <g key={i}><line x1={x} y1={35} x2={x} y2={isW?25:30} stroke="var(--text3)" strokeWidth={isW?2:1}/>
          {isW&&<text x={x} y={55} textAnchor="middle" fontSize="13" fill="var(--text3)" fontWeight="600">{i/den}</text>}</g>;
      })}
      <circle cx={pointX} cy={35} r={6} fill="var(--blue)"/>
      <line x1={pointX} y1={10} x2={pointX} y2={29} stroke="var(--blue)" strokeWidth="2.5"/>
    </svg>
  );
}

// Mixed number input with visual mode
function MixedInput({ onSubmit, submitted }) {
  const [mode,setMode]=useState("text");
  const [textVal,setTextVal]=useState("");
  const [whole,setWhole]=useState("");
  const [num,setNum]=useState("");
  const [den,setDen]=useState("");
  const ref=useRef(null);
  useEffect(()=>{setTextVal("");setWhole("");setNum("");setDen("");setTimeout(()=>ref.current?.focus(),80);},[submitted]);
  const submitText=()=>{ if(textVal.trim()) onSubmit(textVal.trim()); };
  const submitVisual=()=>{ if(whole.trim()&&num.trim()&&den.trim()) onSubmit(`${whole.trim()} ${num.trim()}/${den.trim()}`); };
  if(mode==="visual") return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginBottom:10 }}>
        <input value={whole} onChange={e=>setWhole(e.target.value)} disabled={submitted} placeholder="whole" autoFocus
          style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:800,padding:"8px",width:70,borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)" }}/>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
          <input value={num} onChange={e=>setNum(e.target.value)} disabled={submitted} placeholder="num"
            style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:800,padding:"4px 8px",width:60,borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)" }}/>
          <div style={{ width:60,height:2,background:"var(--text)",borderRadius:99 }}/>
          <input value={den} onChange={e=>setDen(e.target.value)} disabled={submitted} placeholder="den"
            style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:800,padding:"4px 8px",width:60,borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)" }}/>
        </div>
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onClick={submitVisual} disabled={submitted||!whole.trim()||!num.trim()||!den.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width:"100%",fontSize:18 }} onClick={()=>setMode("text")}>Type instead (e.g. 2 1/3)</button>
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:8 }}>
        <input ref={ref} value={textVal} onChange={e=>setTextVal(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&textVal.trim()&&submitText()} disabled={submitted} placeholder="e.g. 2 1/3"
          style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:160 }}/>
        <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }}
          onMouseDown={e=>{e.preventDefault();submitText();}} disabled={submitted||!textVal.trim()}>OK</button>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ width:"100%",fontSize:18 }} onClick={()=>setMode("visual")}>
        Enter as mixed number &nbsp;<span style={{ fontFamily:"var(--mono)",fontWeight:900 }}>2 -/-</span>
      </button>
    </div>
  );
}

// - Activity 1: Perfect Cubes -
const CUBES=[{b:1,c:1},{b:2,c:8},{b:3,c:27},{b:4,c:64},{b:5,c:125}];

function PerfectCubesPlayer({ onComplete }) {
  const [phase,setPhase]=useState(1);
  if(phase===1) return <CubesPhase1 onDone={()=>setPhase(2)}/>;
  if(phase===2) return <CubesPhase2 onAllMastered={()=>setPhase(3)}/>;
  return <CubesReview onComplete={onComplete}/>;
}

function CubesPhase1({ onDone }) {
  const [idx,setIdx]=useState(0);
  const [started,setStarted]=useState(false);
  const [done,setDone]=useState(false);
  const cube=CUBES[idx];
  if(!started) return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:16 }}>Memorize the perfect cubes 1-5 in order.</div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:20 }}>
        {CUBES.map(c=>(
          <div key={c.b} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 16px",fontSize:24,fontWeight:800,fontFamily:"var(--mono)",textAlign:"center" }}>
            {c.b}- = {c.c}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={()=>setStarted(true)}>Start Reciting</button>
    </div>
  );
  if(done) return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:16 }}>Phase 1 Complete!</div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={onDone}>Start Timed Drill</button>
    </div>
  );
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:8 }}>Cube {idx+1} of {CUBES.length}</div>
      <div style={{ fontSize:36,fontWeight:900,fontFamily:"var(--mono)",marginBottom:20 }}>{cube.b}- = {cube.c}</div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }}
        onClick={()=>{if(idx+1<CUBES.length)setIdx(i=>i+1);else setDone(true);}}>
        {idx+1<CUBES.length?"Next":"Done"}
      </button>
    </div>
  );
}

function CubesPhase2({ onAllMastered }) {
  const [masteredMap,setMasteredMap]=useState({});
  const [correct,setCorrect]=useState({});
  const [wrong,setWrong]=useState({});
  const [current,setCurrent]=useState(()=>randChoice(CUBES));
  const [input,setInput]=useState("");
  const [feedback,setFeedback]=useState(null);
  const [timeLeft,setTimeLeft]=useState(CUBE_TIMER);
  const timerRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{
    clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);handleTimeout();return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[current]);

  const handleTimeout=()=>{
    clearInterval(timerRef.current);
    setWrong(prev=>({...prev,[current.b]:(prev[current.b]||0)+1}));
    setFeedback({correct:false,mastered:false,base:current.b});
  };

  const handleSubmit=()=>{
    clearInterval(timerRef.current);
    const isCorrect=parseInt(input)===current.c;
    let mastered=false;
    if(isCorrect){
      const nc=(correct[current.b]||0)+1;
      const needed=2+(wrong[current.b]||0);
      setCorrect(prev=>({...prev,[current.b]:nc}));
      if(nc>=needed) mastered=true;
    } else {
      setWrong(prev=>({...prev,[current.b]:(prev[current.b]||0)+1}));
    }
    setFeedback({correct:isCorrect,mastered,base:current.b});
  };

  const nextQuestion=()=>{
    let nm=masteredMap;
    if(feedback?.mastered){nm={...masteredMap,[feedback.base]:true};setMasteredMap(nm);}
    const rem=CUBES.filter(c=>!nm[c.b]);
    if(rem.length===0){onAllMastered();return;}
    setCurrent(randChoice(rem));
    setInput("");setFeedback(null);setTimeLeft(CUBE_TIMER);
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const pct=(timeLeft/CUBE_TIMER)*100;
  const color=timeLeft<=2?"var(--red)":timeLeft<=3?"var(--amber)":"var(--green)";
  return (
    <div>
      <div style={{ marginBottom:10 }}>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:20,color:"var(--text3)",marginBottom:4 }}>
          <span>Time</span><span style={{ fontWeight:700,color }}>{timeLeft}s</span>
        </div>
        <div style={{ height:6,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
          <div style={{ height:"100%",width:pct+"%",background:color,borderRadius:99,transition:"width 0.9s linear" }}/>
        </div>
      </div>
      <div style={{ fontSize:19,color:"var(--text3)",marginBottom:6,textAlign:"center" }}>Mastered: {Object.keys(masteredMap).length}/{CUBES.length}</div>
      <div style={{ textAlign:"center",fontSize:36,fontWeight:900,fontFamily:"var(--mono)",marginBottom:16 }}>{current.b}- = ?</div>
      {feedback?(
        <FeedbackBanner correct={feedback.correct} message={`${current.b}- = ${current.c}`} onNext={nextQuestion}/>
      ):(
        <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&input.trim()&&handleSubmit()}
            placeholder="Enter answer" autoFocus
            style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:800,padding:"10px",width:160 }}/>
          <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

function CubesReview({ onComplete }) {
  const [queue,setQueue]=useState(()=>shuffle([...CUBES]));
  const [current,setCurrent]=useState(()=>shuffle([...CUBES])[0]);
  const [input,setInput]=useState("");
  const [feedback,setFeedback]=useState(null);
  const ref=useRef(null);
  useEffect(()=>{const q=shuffle([...CUBES]);setQueue(q);setCurrent(q[0]);},[]);
  const handleSubmit=()=>{setFeedback({correct:parseInt(input)===current.c});};
  const handleNext=()=>{
    const nq=feedback.correct?queue.slice(1):[...queue.slice(1),current];
    if(nq.length===0){onComplete();return;}
    setCurrent(nq[0]);setQueue(nq);setInput("");setFeedback(null);
    setTimeout(()=>ref.current?.focus(),80);
  };
  return (
    <div>
      <div style={{ fontSize:20,color:"var(--text2)",marginBottom:8,textAlign:"center" }}>Cumulative Review - {queue.length} remaining</div>
      <div style={{ textAlign:"center",fontSize:36,fontWeight:900,fontFamily:"var(--mono)",marginBottom:16 }}>{current.b}- = ?</div>
      {feedback?(
        <FeedbackBanner correct={feedback.correct} message={`${current.b}- = ${current.c}`} onNext={handleNext}/>
      ):(
        <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
          <input ref={ref} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&input.trim()&&handleSubmit()}
            placeholder="Enter answer" autoFocus
            style={{ textAlign:"center",fontSize:24,fontFamily:"var(--mono)",fontWeight:800,padding:"10px",width:160 }}/>
          <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Activity 2: Picture Model -
function genPicture(){
  const den=randChoice(DENOMS),num=randInt(1,den-1),shape=randChoice(["circle","rectangle"]);
  return {den,num,shape,answer:`${num}/${den}`};
}
function PictureMastery({onCorrect,onWrong}){
  const [q,setQ]=useState(()=>genPicture());
  const [input,setInput]=useState("");
  const [feedback,setFeedback]=useState(null);
  const ref=useRef(null);
  const handleSubmit=()=>{
    const p=parseFraction(input);
    let ok=false;
    if(p&&!p.isMixed){const[rn,rd]=reduce(p.num,p.den);const[qn,qd]=reduce(q.num,q.den);ok=rn===qn&&rd===qd;}
    setFeedback({correct:ok});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setInput("");setQ(genPicture());setTimeout(()=>ref.current?.focus(),80);};
  return (
    <div>
      <div style={{ display:"flex",justifyContent:"center",marginBottom:14 }}>
        <FractionPicture num={q.num} den={q.den} shape={q.shape}/>
      </div>
      {feedback?(
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct?`Answer: ${q.answer}`:`Correct: ${q.answer}`}
          onNext={handleNext}/>
      ):(
        <div>
          <div style={{ fontSize:19,color:"var(--text3)",marginBottom:8,textAlign:"center" }}>Enter the fraction (e.g. 3/4)</div>
          <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
            <input ref={ref} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&input.trim()&&handleSubmit()} placeholder="e.g. 3/4" autoFocus
              style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }}/>
            <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// - Activity 3: Classify Fractions -
const CLASSIFY_POOL=[
  {num:0,den:5,correct:"zero",display:"0/5"},{num:2,den:3,correct:"proper",display:"2/3"},
  {num:7,den:7,correct:"one",display:"7/7"},{num:9,den:4,correct:"improper",display:"9/4"},
  {num:12,den:5,correct:"improper",display:"12/5"},{num:0,den:1,correct:"zero",display:"0/1"},
  {num:5,den:8,correct:"proper",display:"5/8"},{num:3,den:3,correct:"one",display:"3/3"},
  {num:11,den:6,correct:"improper",display:"11/6"},{num:1,den:4,correct:"proper",display:"1/4"},
];
const CLASSIFY_OPTS=[{label:"Zero (= 0)",val:"zero"},{label:"Proper (< 1)",val:"proper"},{label:"= 1",val:"one"},{label:"Improper (> 1)",val:"improper"}];
function genClassifySet(){return shuffle([...CLASSIFY_POOL]).slice(0,6);}
function ClassifyMastery({onCorrect,onWrong}){
  const [fracs,setFracs]=useState(()=>genClassifySet());
  const [answers,setAnswers]=useState(Array(6).fill(""));
  const [feedback,setFeedback]=useState(null);
  const allDone=answers.every(a=>a!=="");
  const handleSubmit=()=>{
    const results=fracs.map((f,i)=>answers[i]===f.correct);
    const ok=results.every(Boolean);
    setFeedback({correct:ok,results,fracs:[...fracs],answers:[...answers]});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setAnswers(Array(6).fill(""));setFracs(genClassifySet());};
  if(feedback) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:feedback.correct?"var(--green)":"var(--red)",marginBottom:10 }}>{feedback.correct?"Correct!":"Incorrect"}</div>
      <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
        {feedback.fracs.map((f,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid "+(feedback.results[i]?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)") }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:800 }}>{f.display}</span>
            <div style={{ display:"flex",gap:8 }}>
              {!feedback.results[i]&&<span style={{ fontSize:18,color:"var(--red)",fontWeight:700 }}>You: {CLASSIFY_OPTS.find(o=>o.val===feedback.answers[i])?.label||"-"}</span>}
              <span style={{ fontSize:18,color:"var(--green)",fontWeight:700 }}>{CLASSIFY_OPTS.find(o=>o.val===f.correct)?.label}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleNext}>Next Problem</button>
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {fracs.map((f,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px" }}>
            <div style={{ fontSize:22,fontWeight:900,fontFamily:"var(--mono)",marginBottom:6 }}>{f.display}</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {CLASSIFY_OPTS.map(opt=>(
                <button key={opt.val} onClick={()=>setAnswers(prev=>prev.map((x,j)=>j===i?opt.val:x))}
                  style={{ padding:"5px 12px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===opt.val?"var(--blue)":"var(--border)"),background:answers[i]===opt.val?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:17,fontWeight:700,cursor:"pointer",color:answers[i]===opt.val?"var(--blue)":"var(--text)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
    </div>
  );
}

// - Activity 4: Number Line -
function genNumberLine(){
  const type=randChoice(["proper","mixed"]);
  const den=randChoice([2,3,4,5,6,8]);
  let num,whole,value,display;
  if(type==="proper"){num=randInt(1,den-1);whole=0;value=num/den;display=`${num}/${den}`;}
  else{whole=1;num=randInt(1,den-1);value=1+num/den;display=`1 ${num}/${den}`;}
  return {den,num,whole,value,display};
}
function NumberLineMastery({onCorrect,onWrong}){
  const [q,setQ]=useState(()=>genNumberLine());
  const [feedback,setFeedback]=useState(null);
  const handleSubmit=(input)=>{
    const p=parseFraction(input);
    const ok=p&&Math.abs(fractionValue(p)-q.value)<0.001;
    setFeedback({correct:!!ok});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setQ(genNumberLine());};
  return (
    <div>
      <NumberLineSVG value={q.value} den={q.den}/>
      {feedback?(
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct?`Answer: ${q.display}`:`Correct: ${q.display}`}
          onNext={handleNext}/>
      ):(
        <div style={{ marginTop:12 }}>
          <MixedInput onSubmit={handleSubmit} submitted={false}/>
        </div>
      )}
    </div>
  );
}

// - Activity 5: Improper to Mixed -
const IMP_POOL=[{num:7,den:3},{num:11,den:4},{num:8,den:5},{num:13,den:6},{num:9,den:4},{num:11,den:3},{num:17,den:5},{num:15,den:4},{num:10,den:3},{num:13,den:5},{num:19,den:6},{num:11,den:7}];
function genImpSet(){return shuffle([...IMP_POOL]).slice(0,4).map(f=>({...f,whole:Math.floor(f.num/f.den),rem:f.num%f.den}));}

function ImpToMixedMastery({onCorrect,onWrong}){
  const [fracs,setFracs]=useState(()=>genImpSet());
  const [modes,setModes]=useState([false,false,false,false]); // false=text, true=visual
  const [textAns,setTextAns]=useState(["","","",""]);
  const [wholes,setWholes]=useState(["","","",""]);
  const [nums,setNums]=useState(["","","",""]);
  const [dens,setDens]=useState(["","","",""]);
  const [feedback,setFeedback]=useState(null);

  const getAns=(i)=>modes[i]?(wholes[i]&&nums[i]&&dens[i]?`${wholes[i]} ${nums[i]}/${dens[i]}`:""):textAns[i];
  const allDone=fracs.every((_,i)=>getAns(i).trim()!=="");
  const setMode=(i,v)=>setModes(prev=>prev.map((x,j)=>j===i?v:x));

  const handleSubmit=()=>{
    const results=fracs.map((f,i)=>{
      const s=getAns(i).trim().replace(/\s*-\s*/g," ");
      const m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      return m&&parseInt(m[1])===f.whole&&parseInt(m[2])===f.rem&&parseInt(m[3])===f.den;
    });
    const ok=results.every(Boolean);
    setFeedback({correct:ok,results,fracs:[...fracs],answers:fracs.map((_,i)=>getAns(i))});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setFracs(genImpSet());setModes([false,false,false,false]);setTextAns(["","","",""]);setWholes(["","","",""]);setNums(["","","",""]);setDens(["","","",""]);};

  if(feedback) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:feedback.correct?"var(--green)":"var(--red)",marginBottom:10 }}>{feedback.correct?"Correct!":"Incorrect"}</div>
      <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
        {feedback.fracs.map((f,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px",display:"flex",justifyContent:"space-between",border:"1px solid "+(feedback.results[i]?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)") }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:20,fontWeight:800 }}>{f.num}/{f.den}</span>
            <div style={{ display:"flex",gap:8 }}>
              {!feedback.results[i]&&<span style={{ fontSize:18,color:"var(--red)",fontWeight:700 }}>You: {feedback.answers[i]||"-"}</span>}
              <span style={{ fontSize:18,color:"var(--green)",fontWeight:700 }}>{f.whole} {f.rem}/{f.den}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleNext}>Next Problem</button>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:12 }}>
        {fracs.map((f,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px" }}>
            <div style={{ fontSize:22,fontWeight:900,fontFamily:"var(--mono)",marginBottom:8 }}>{f.num}/{f.den} =</div>
            {modes[i]?(
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <input value={wholes[i]} onChange={e=>setWholes(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder="whole"
                    style={{ textAlign:"center",fontSize:20,fontFamily:"var(--mono)",fontWeight:800,padding:"6px",width:55,borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)" }}/>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
                    <input value={nums[i]} onChange={e=>setNums(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder="num"
                      style={{ textAlign:"center",fontSize:19,fontFamily:"var(--mono)",fontWeight:800,padding:"4px 6px",width:48,borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)" }}/>
                    <div style={{ width:48,height:2,background:"var(--text)",borderRadius:99 }}/>
                    <input value={dens[i]} onChange={e=>setDens(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder="den"
                      style={{ textAlign:"center",fontSize:19,fontFamily:"var(--mono)",fontWeight:800,padding:"4px 6px",width:48,borderRadius:"var(--radius-sm)",border:"2px solid var(--border)",background:"var(--surface)" }}/>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize:15 }} onClick={()=>setMode(i,false)}>Type instead</button>
              </div>
            ):(
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input value={textAns[i]} onChange={e=>setTextAns(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder="e.g. 2 1/3"
                  style={{ textAlign:"center",fontSize:20,fontFamily:"var(--mono)",fontWeight:700,padding:"6px 10px",width:120,borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)" }}/>
                <button className="btn btn-ghost btn-sm" style={{ fontSize:15 }} onClick={()=>setMode(i,true)}><span style={{ fontFamily:"var(--mono)",fontWeight:900 }}>2 -/-</span></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
    </div>
  );
}

// - Activity 6: Mixed to Improper -
const MIX_POOL=[{whole:2,num:1,den:3},{whole:3,num:2,den:5},{whole:1,num:3,den:4},{whole:4,num:2,den:7},{whole:2,num:3,den:5},{whole:3,num:1,den:4},{whole:5,num:2,den:3},{whole:2,num:5,den:6},{whole:1,num:2,den:5},{whole:3,num:3,den:7},{whole:4,num:1,den:3},{whole:2,num:4,den:9}];
function genMixSet(){return shuffle([...MIX_POOL]).slice(0,4).map(f=>({...f,imp:f.whole*f.den+f.num}));}

function MixToImpMastery({onCorrect,onWrong}){
  const [fracs,setFracs]=useState(()=>genMixSet());
  const [answers,setAnswers]=useState(["","","",""]);
  const [feedback,setFeedback]=useState(null);
  const allDone=answers.every(a=>a.trim()!=="");
  const handleSubmit=()=>{
    const results=fracs.map((f,i)=>{const m=answers[i].trim().match(/^(\d+)\/(\d+)$/);return m&&parseInt(m[1])===f.imp&&parseInt(m[2])===f.den;});
    const ok=results.every(Boolean);
    setFeedback({correct:ok,results,fracs:[...fracs],answers:[...answers]});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setFracs(genMixSet());setAnswers(["","","",""]);};
  if(feedback) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:feedback.correct?"var(--green)":"var(--red)",marginBottom:10 }}>{feedback.correct?"Correct!":"Incorrect"}</div>
      <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
        {feedback.fracs.map((f,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px",display:"flex",justifyContent:"space-between",border:"1px solid "+(feedback.results[i]?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)") }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:20,fontWeight:800 }}>{f.whole} {f.num}/{f.den}</span>
            <div style={{ display:"flex",gap:8 }}>
              {!feedback.results[i]&&<span style={{ fontSize:18,color:"var(--red)",fontWeight:700 }}>You: {feedback.answers[i]||"-"}</span>}
              <span style={{ fontSize:18,color:"var(--green)",fontWeight:700 }}>{f.imp}/{f.den}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleNext}>Next Problem</button>
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
        {fracs.map((f,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",gap:12,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",flexWrap:"wrap" }}>
            <span style={{ fontFamily:"var(--mono)",fontSize:22,fontWeight:800 }}>{f.whole} {f.num}/{f.den} =</span>
            <input value={answers[i]} onChange={e=>setAnswers(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder="e.g. 7/3"
              style={{ textAlign:"center",fontSize:20,fontFamily:"var(--mono)",fontWeight:700,padding:"6px 10px",width:110,borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)" }}/>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
    </div>
  );
}

// - Activity 7: Equivalent Fractions -
function genEquivQ(){
  const denoms=[2,3,4,5,6,8,10,12];
  const d1=randChoice(denoms),n1=randInt(1,d1-1),mult=randInt(2,6);
  const n2=n1*mult,d2=d1*mult;
  const missingNum=Math.random()<0.5;
  return missingNum
    ?{n1,d1,n2:null,d2,answer:n2,display:`${n1}/${d1} = ?/${d2}`,missing:"numerator"}
    :{n1,d1,n2,d2:null,answer:d2,display:`${n1}/${d1} = ${n2}/?`,missing:"denominator"};
}
function EquivMastery({onCorrect,onWrong}){
  const [q,setQ]=useState(()=>genEquivQ());
  const [input,setInput]=useState("");
  const [feedback,setFeedback]=useState(null);
  const ref=useRef(null);
  const handleSubmit=()=>{
    const ok=parseInt(input.trim())===q.answer;
    setFeedback({correct:ok});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setInput("");setQ(genEquivQ());setTimeout(()=>ref.current?.focus(),80);};
  return (
    <div>
      <div style={{ textAlign:"center",fontSize:26,fontWeight:900,fontFamily:"var(--mono)",marginBottom:14 }}>{q.display}</div>
      {feedback?(
        <FeedbackBanner correct={feedback.correct}
          message={feedback.correct?`${q.missing}: ${q.answer}`:`Correct ${q.missing}: ${q.answer}`}
          onNext={handleNext}/>
      ):(
        <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
          <input ref={ref} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&input.trim()&&handleSubmit()} placeholder="Enter number" autoFocus
            style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }}/>
          <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Activity 8: Reduce Fractions -
function genReduceQ(){
  for(let i=0;i<200;i++){
    const n=randInt(6,100),d=randInt(6,100);
    if(n===d) continue;
    const g=gcd(n,d);
    if(g<=1) continue;
    const[rn,rd]=reduce(n,d);
    return {n,d,rn,rd,g,answer:`${rn}/${rd}`};
  }
  return {n:18,d:24,rn:3,rd:4,g:6,answer:"3/4"};
}
function ReduceMastery({onCorrect,onWrong}){
  const [q,setQ]=useState(()=>genReduceQ());
  const [input,setInput]=useState("");
  const [feedback,setFeedback]=useState(null);
  const ref=useRef(null);
  const handleSubmit=()=>{
    const m=input.trim().match(/^(\d+)\/(\d+)$/);
    const ok=m&&parseInt(m[1])===q.rn&&parseInt(m[2])===q.rd;
    setFeedback({correct:!!ok,input:input.trim()});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setInput("");setQ(genReduceQ());setTimeout(()=>ref.current?.focus(),80);};
  return (
    <div>
      <div style={{ textAlign:"center",fontSize:32,fontWeight:900,fontFamily:"var(--mono)",marginBottom:14 }}>{q.n}/{q.d}</div>
      {feedback?(
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:22,fontWeight:800,color:feedback.correct?"var(--green)":"var(--red)",marginBottom:10 }}>{feedback.correct?"Correct!":"Incorrect"}</div>
          {!feedback.correct&&(
            <div style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:12,fontSize:19,textAlign:"left" }}>
              <div style={{ marginBottom:4 }}>Your answer: <strong style={{ fontFamily:"var(--mono)",color:"var(--red)" }}>{feedback.input}</strong></div>
              <div style={{ marginBottom:4 }}>GCF({q.n}, {q.d}) = {q.g}</div>
              <div style={{ marginBottom:4 }}>{q.n} - {q.g} = {q.rn} &nbsp; {q.d} - {q.g} = {q.rd}</div>
              <div style={{ color:"var(--green)",fontWeight:700 }}>Reduced: {q.rn}/{q.rd}</div>
            </div>
          )}
          {feedback.correct&&<div style={{ fontSize:20,color:"var(--green)",fontWeight:700,marginBottom:12 }}>Reduced: {q.rn}/{q.rd}</div>}
          <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleNext}>Next Problem</button>
        </div>
      ):(
        <div>
          <div style={{ fontSize:19,color:"var(--text3)",marginBottom:8,textAlign:"center" }}>Enter in lowest terms (e.g. 3/4)</div>
          <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
            <input ref={ref} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&input.trim()&&handleSubmit()} placeholder="e.g. 3/4" autoFocus
              style={{ textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:140 }}/>
            <button className="btn btn-primary" style={{ fontSize:20,padding:"10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// - Activity 9: Mixed Mastery (8 problems) -
function genMixedSet(){
  const pic1=()=>{const den=randChoice(DENOMS),num=randInt(1,den-1),shape=randChoice(["circle","rectangle"]);return{subtype:"picture",den,num,shape,answer:`${num}/${den}`,display:`[${shape} ${num}/${den}]`};};
  const cls=()=>{const f=randChoice(CLASSIFY_POOL);return{subtype:"classify",f,display:f.display,answer:f.correct};};
  const nl=()=>{const q=genNumberLine();return{subtype:"number-line",...q,display:`[NL: ${q.display}]`};};
  const i2m=()=>{const f=randChoice(IMP_POOL);const whole=Math.floor(f.num/f.den),rem=f.num%f.den;return{subtype:"imp-to-mix",...f,whole,rem,answer:`${whole} ${rem}/${f.den}`,display:`${f.num}/${f.den}`};};
  const m2i=()=>{const f=randChoice(MIX_POOL);const imp=f.whole*f.den+f.num;return{subtype:"mix-to-imp",...f,imp,answer:`${imp}/${f.den}`,display:`${f.whole} ${f.num}/${f.den}`};};
  const eq=()=>{const q=genEquivQ();return{subtype:"equiv",...q};};
  const red=()=>{const q=genReduceQ();return{subtype:"reduce",...q,display:`${q.n}/${q.d}`};};
  return shuffle([pic1(),pic1(),cls(),nl(),i2m(),m2i(),eq(),red()]);
}
function gradeMixedItem(input,item){
  const s=String(input||"").trim();
  if(item.subtype==="picture"){const p=parseFraction(s);if(!p||p.isMixed)return false;const[rn,rd]=reduce(p.num,p.den);const[qn,qd]=reduce(item.num,item.den);return rn===qn&&rd===qd;}
  if(item.subtype==="classify")return s.toLowerCase()===item.answer;
  if(item.subtype==="number-line"){const p=parseFraction(s);return p&&Math.abs(fractionValue(p)-item.value)<0.001;}
  if(item.subtype==="imp-to-mix"){const m=s.replace(/\s*-\s*/g," ").match(/^(\d+)\s+(\d+)\/(\d+)$/);return m&&parseInt(m[1])===item.whole&&parseInt(m[2])===item.rem&&parseInt(m[3])===item.den;}
  if(item.subtype==="mix-to-imp"){const m=s.match(/^(\d+)\/(\d+)$/);return m&&parseInt(m[1])===item.imp&&parseInt(m[2])===item.den;}
  if(item.subtype==="equiv")return parseInt(s)===item.answer;
  if(item.subtype==="reduce"){const m=s.match(/^(\d+)\/(\d+)$/);return m&&parseInt(m[1])===item.rn&&parseInt(m[2])===item.rd;}
  return false;
}
const SUBLABELS={"picture":"Picture to fraction","classify":"Classify","number-line":"Number line","imp-to-mix":"Improper to mixed","mix-to-imp":"Mixed to improper","equiv":"Missing value","reduce":"Reduce"};
const SUBPH={"picture":"e.g. 3/4","classify":"zero/proper/one/improper","number-line":"e.g. 3/4 or 1 1/2","imp-to-mix":"e.g. 2 1/3","mix-to-imp":"e.g. 7/3","equiv":"Enter number","reduce":"e.g. 3/4"};

function MixedMastery({onCorrect,onWrong}){
  const [items,setItems]=useState(()=>genMixedSet());
  const [answers,setAnswers]=useState(Array(8).fill(""));
  const [feedback,setFeedback]=useState(null);
  const allDone=answers.every(a=>a.trim()!=="");
  const handleSubmit=()=>{
    const results=items.map((item,i)=>gradeMixedItem(answers[i],item));
    const ok=results.every(Boolean);
    setFeedback({correct:ok,results,items:[...items],answers:[...answers]});
    if(ok)onCorrect();else onWrong();
  };
  const handleNext=()=>{setFeedback(null);setItems(genMixedSet());setAnswers(Array(8).fill(""));};
  if(feedback) return (
    <div>
      <div style={{ textAlign:"center",fontSize:22,fontWeight:800,color:feedback.correct?"var(--green)":"var(--red)",marginBottom:10 }}>{feedback.correct?"Correct!":"Incorrect"}</div>
      <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:12 }}>
        {feedback.items.map((item,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,border:"1px solid "+(feedback.results[i]?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)") }}>
            <div>
              <span style={{ fontSize:17,color:"var(--text3)",marginRight:6 }}>{SUBLABELS[item.subtype]}:</span>
              <span style={{ fontFamily:"var(--mono)",fontSize:18,fontWeight:800 }}>{item.display}</span>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              {!feedback.results[i]&&<span style={{ fontSize:16,color:"var(--red)",fontWeight:700 }}>You: {feedback.answers[i]||"-"}</span>}
              <span style={{ fontSize:16,color:"var(--green)",fontWeight:700 }}>{String(item.answer)}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleNext}>New Set</button>
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:7,marginBottom:12 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"9px 12px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap" }}>
              <span style={{ fontSize:17,color:"var(--text3)",fontWeight:600 }}>{SUBLABELS[item.subtype]}:</span>
              {item.subtype==="picture"?<FractionPicture num={item.num} den={item.den} shape={item.shape}/>
                :item.subtype==="number-line"?<div style={{ flex:1,minWidth:200 }}><NumberLineSVG value={item.value} den={item.den}/></div>
                :<span style={{ fontFamily:"var(--mono)",fontSize:19,fontWeight:800 }}>{item.display}</span>}
            </div>
            {item.subtype==="classify"?(
              <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                {CLASSIFY_OPTS.map(opt=>(
                  <button key={opt.val} onClick={()=>setAnswers(prev=>prev.map((x,j)=>j===i?opt.val:x))}
                    style={{ padding:"4px 10px",borderRadius:"var(--radius-sm)",border:"2px solid "+(answers[i]===opt.val?"var(--blue)":"var(--border)"),background:answers[i]===opt.val?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:15,fontWeight:700,cursor:"pointer",color:answers[i]===opt.val?"var(--blue)":"var(--text)" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            ):(
              <input value={answers[i]} onChange={e=>setAnswers(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder={SUBPH[item.subtype]}
                style={{ textAlign:"center",fontSize:19,fontFamily:"var(--mono)",fontWeight:700,padding:"5px 8px",width:"100%",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)" }}/>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%",fontSize:20 }} onClick={handleSubmit} disabled={!allDone}>Submit All</button>
    </div>
  );
}

// - Steps -
const STEPS=[
  {id:"picture",      label:"Picture Model",           description:"Fraction from shaded figure, 3 in a row",    streak:STREAK3},
  {id:"classify",     label:"Classify Fractions",       description:"6 fractions, all correct, 3 in a row",       streak:STREAK3},
  {id:"number-line",  label:"Number Line",              description:"Read point, enter fraction/mixed, 3 in a row",streak:STREAK3},
  {id:"imp-to-mixed", label:"Improper to Mixed",        description:"4 fractions, all correct, 3 in a row",       streak:STREAK3},
  {id:"mix-to-imp",   label:"Mixed to Improper",        description:"4 fractions, all correct, 3 in a row",       streak:STREAK3},
  {id:"equiv",        label:"Equivalent Fractions",     description:"Missing numerator/denominator, 3 in a row",  streak:STREAK3},
  {id:"reduce",       label:"Reduce Fractions",         description:"Enter in lowest terms, 3 in a row",          streak:STREAK3},
];

export default function Lesson14MasteryPlayer({ user, topic, onHome }) {
  const topicId=topic?.id||LESSON14_MASTERY_TOPIC_ID;
  const [loading,setLoading]=useState(true);
  const [stepIdx,setStepIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [completed,setCompleted]=useState(false);
  useEffect(()=>{
    getProgress(user.id,topicId).then(prog=>{
      if(prog?.data?.completed){setCompleted(true);setLoading(false);return;}
      if(prog?.data?.stepIdx!==undefined)setStepIdx(prog.data.stepIdx);
      if(prog?.data?.streak!==undefined)setStreak(prog.data.streak);
      setLoading(false);
    });
  },[]);
  const save=async(si,st,done)=>{
    const pct=done?100:Math.min(100,Math.round((si/STEPS.length)*100));
    await fbSaveProgress(user.id,topicId,{started:true,completed:done,percentComplete:pct,data:{stepIdx:si,streak:st,completed:done}});
    setStepIdx(si);setStreak(st);if(done)setCompleted(true);
  };
  const handleCorrect=async()=>{const ns=streak+1;if(ns>=STEPS[stepIdx].streak){const nx=stepIdx+1;await save(nx,0,nx>=STEPS.length);}else await save(stepIdx,ns,false);};
  const handleWrong=async()=>{await save(stepIdx,0,false);};
  if(loading)return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner"/></div>;
  if(completed)return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>HW 14 (019) Complete!</h2>
        <p style={{ fontSize:20,color:"var(--text2)",marginBottom:24 }}>Fractions mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  const step=STEPS[stepIdx];if(!step)return null;
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:680,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>L14</div>
            <div><div style={{ fontWeight:800,fontSize:22 }}>HW 14 (019): Mastery Activities</div><div style={{ fontSize:20,color:"var(--text3)" }}>Complete each activity to advance</div></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:16 }}>
          {STEPS.map((s,i)=>{const done=i<stepIdx,active=i===stepIdx;return(
            <div key={s.id} style={{ fontSize:18,fontWeight:700,padding:"3px 10px",borderRadius:99,background:done?"rgba(22,163,74,0.12)":active?"rgba(27,143,255,0.12)":"var(--surface)",color:done?"var(--green)":active?"var(--blue)":"var(--text3)",border:"1px solid "+(done?"rgba(22,163,74,0.3)":active?"rgba(27,143,255,0.3)":"var(--border)") }}>
              {done?"done":s.label}
            </div>
          );})}
        </div>
        <div className="card">
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:22,fontWeight:800 }}>{step.label}</div>
            <div style={{ fontSize:20,color:"var(--text2)" }}>{step.description}</div>
          </div>
          <StreakDots current={streak} needed={step.streak}/>
          {step.id==="picture"     &&<PictureMastery      key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {step.id==="classify"    &&<ClassifyMastery     key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {step.id==="number-line" &&<NumberLineMastery   key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {step.id==="imp-to-mixed"&&<ImpToMixedMastery  key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {step.id==="mix-to-imp"  &&<MixToImpMastery    key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {step.id==="equiv"       &&<EquivMastery        key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {step.id==="reduce"      &&<ReduceMastery       key={stepIdx+"-"+streak} onCorrect={handleCorrect} onWrong={handleWrong}/>}
        </div>
      </div>
    </div>
  );
}

// - Standalone Perfect Cubes Player -
export function PerfectCubesPlayer14({ user, topic, onHome }) {
  const topicId=topic?.id||PERFECT_CUBES_TOPIC_ID;
  const [loading,setLoading]=useState(true);
  const [completed,setCompleted]=useState(false);
  useEffect(()=>{getProgress(user.id,topicId).then(prog=>{if(prog?.data?.completed)setCompleted(true);setLoading(false);});}, []);
  const handleComplete=async()=>{await fbSaveProgress(user.id,topicId,{started:true,completed:true,percentComplete:100,data:{completed:true}});setCompleted(true);};
  if(loading)return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner"/></div>;
  if(completed)return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Perfect Cubes 1-5 Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:580,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--orange))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"#fff" }}>14</div>
            <div><div style={{ fontWeight:800,fontSize:22 }}>Perfect Cubes 1-5</div><div style={{ fontSize:20,color:"var(--text3)" }}>Memorize then drill</div></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><PerfectCubesPlayer onComplete={handleComplete}/></div>
      </div>
    </div>
  );
}


