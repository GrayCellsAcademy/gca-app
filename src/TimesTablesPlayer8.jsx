import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const TIMES_TABLES_8_TOPIC_ID = "times-tables-8-v1";
const N = 8;
const REVIEW_TABLES = [2,3,4,5,6,7];
const SKIP_GOAL = 30;
const STAGE2_PASSES = 3;
const STAGE3_STREAK = 3;
const STAGE3_REVIEW = 1;
const TT_TIMER = 10;

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function WrongPanel({ n, b, correct, onContinue }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div className="card" style={{ maxWidth:440,width:"100%",textAlign:"center" }}>
        <div style={{ fontSize:48,fontWeight:900,color:"var(--text)",marginBottom:4,fontFamily:"var(--mono)" }}>
          {n} x {b} = <span style={{ color:"var(--green)" }}>{correct}</span>
        </div>
        <div style={{ fontSize:20,color:"var(--text2)",marginBottom:24,lineHeight:1.6 }}>
          {n} x {b} = counting by {n}, {b} time{b!==1?"s":""}<br/>
          <span style={{ fontFamily:"var(--mono)",color:"var(--text3)" }}>{Array.from({length:b},(_,i)=>n*(i+1)).join(", ")}</span>
        </div>
        <button className="btn btn-success" style={{ width:"100%",fontSize:20 }}
          onMouseDown={e=>{e.preventDefault();onContinue();}} onTouchEnd={e=>{e.preventDefault();onContinue();}}>
          Got it - keep going!
        </button>
      </div>
    </div>
  );
}

function Stage1({ onComplete }) {
  const [started,setStarted]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [bestTime,setBestTime]=useState(null);
  const [idx,setIdx]=useState(0);
  const [input,setInput]=useState("");
  const [done,setDone]=useState(false);
  const [wrongFlash,setWrongFlash]=useState(false);
  const timerRef=useRef(null); const startRef=useRef(null); const inputRef=useRef(null);
  const sequence=Array.from({length:10},(_,i)=>N*(i+1));
  const startTimer=()=>{startRef.current=Date.now();timerRef.current=setInterval(()=>setElapsed(Math.floor((Date.now()-startRef.current)/1000)),200);};
  useEffect(()=>()=>clearInterval(timerRef.current),[]);
  useEffect(()=>{if(started&&!done){startTimer();setTimeout(()=>inputRef.current?.focus(),80);}}, [started]);
  const handleSubmit=()=>{const val=parseInt(input.trim(),10);setInput("");if(isNaN(val))return;if(val===sequence[idx]){if(idx===9){clearInterval(timerRef.current);const t=Math.floor((Date.now()-startRef.current)/1000);setElapsed(t);setDone(true);if(bestTime===null||t<bestTime)setBestTime(t);if(t<=SKIP_GOAL)onComplete(t);}else setIdx(i=>i+1);}else{setWrongFlash(true);setTimeout(()=>setWrongFlash(false),400);}};
  const handleRetry=()=>{setIdx(0);setInput("");setDone(false);setStarted(false);setElapsed(0);clearInterval(timerRef.current);};
  if(!started&&!done)return(<div className="card" style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:52,fontWeight:900,color:"var(--blue)",marginBottom:8}}>x{N}</div><h3 style={{fontSize:24,fontWeight:800,marginBottom:8}}>Stage 1: Count by {N}s</h3><p style={{fontSize:20,color:"var(--text2)",marginBottom:8}}>Skip count {N} to {N*10}. Beat {SKIP_GOAL}s to advance.</p><button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={()=>setStarted(true)}>Start</button></div>);
  if(done){const beat=elapsed<=SKIP_GOAL;return(<div className="card" style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:72,fontWeight:900,color:beat?"var(--green)":"var(--amber)",marginBottom:8}}>{elapsed}s</div><h3 style={{fontSize:22,fontWeight:800,marginBottom:8}}>{beat?"Goal beaten!":"Goal is "+SKIP_GOAL+"s"}</h3>{beat?<button className="btn btn-success btn-lg" style={{width:"100%"}} onClick={()=>onComplete(elapsed)}>On to Stage 2!</button>:<button className="btn btn-primary" style={{width:"100%"}} onClick={handleRetry}>Try again</button>}</div>);}
  return(<div style={{maxWidth:480,margin:"0 auto"}}><div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>{sequence.map((_,i)=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<idx?"var(--green)":i===idx?"var(--blue)":"var(--surface2)",border:"2px solid "+(i<idx?"var(--green)":i===idx?"var(--blue)":"var(--border2)")}}/>)}</div><div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:72,fontWeight:900,fontFamily:"var(--mono)",color:elapsed>SKIP_GOAL?"var(--red)":elapsed>20?"var(--amber)":"var(--blue)",lineHeight:1}}>{elapsed}s</div><div style={{fontSize:20,color:"var(--text3)"}}>Goal: {SKIP_GOAL}s</div></div><div className="card" style={{textAlign:"center"}}><div style={{fontFamily:"var(--mono)",fontSize:38,fontWeight:900,color:wrongFlash?"var(--red)":"var(--amber)",marginBottom:20}}>?</div><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} inputMode="numeric" style={{textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10,width:"100%",maxWidth:180}}/><button className="btn btn-primary" style={{width:"100%",maxWidth:180,fontSize:22}} onMouseDown={e=>{e.preventDefault();handleSubmit();}} onTouchEnd={e=>{e.preventDefault();handleSubmit();}}>OK</button></div></div>);
}

function Stage2({ onComplete }) {
  const [intro,setIntro]=useState(true);
  const [done,setDone]=useState(false);
  const [qIdx,setQIdx]=useState(0);
  const [passes,setPasses]=useState(0);
  const [input,setInput]=useState("");
  const [wrongPanel,setWrongPanel]=useState(null);
  const inputRef=useRef(null);
  const questions=Array.from({length:10},(_,i)=>({b:i+1,answer:N*(i+1)}));
  const currentQ=questions[qIdx];
  useEffect(()=>{if(!intro&&!done){setInput("");setTimeout(()=>inputRef.current?.focus(),80);}},[qIdx,passes,intro,done]);
  const handleSubmit=()=>{const val=parseInt(input.trim(),10);setInput("");if(isNaN(val))return;if(val===currentQ.answer){if(qIdx===9){const np=passes+1;setPasses(np);if(np>=STAGE2_PASSES)setDone(true);else setQIdx(0);}else setQIdx(i=>i+1);}else setWrongPanel({b:currentQ.b,correct:currentQ.answer});};
  if(intro)return(<div className="card" style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:52,fontWeight:900,color:"var(--blue)",marginBottom:8}}>x{N}</div><h3 style={{fontSize:24,fontWeight:800,marginBottom:12}}>Stage 2: Ordered Q&A</h3><div style={{fontSize:20,color:"var(--text2)",marginBottom:20,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:14}}>Questions in order: {N}x1 through {N}x10<br/>Zero mistakes = 1 pass. Need 3 passes.</div><button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={()=>setIntro(false)}>Start Stage 2</button></div>);
  if(done)return(<div className="card" style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:36,fontWeight:900,color:"var(--green)",marginBottom:8}}>3 Perfect Passes!</div><button className="btn btn-success btn-lg" style={{width:"100%"}} onClick={onComplete}>On to Stage 3!</button></div>);
  return(<div style={{maxWidth:480,margin:"0 auto"}}>{wrongPanel&&<WrongPanel n={N} b={wrongPanel.b} correct={wrongPanel.correct} onContinue={()=>{setWrongPanel(null);setQIdx(0);setTimeout(()=>inputRef.current?.focus(),80);}}/>}<div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:20}}>{Array.from({length:STAGE2_PASSES}).map((_,i)=><div key={i} style={{width:28,height:28,borderRadius:"50%",background:i<passes?"var(--green)":"var(--surface2)",border:"2.5px solid "+(i<passes?"var(--green)":"var(--border2)")}}/>)}<span style={{fontSize:20,color:"var(--text3)",alignSelf:"center"}}>{passes}/{STAGE2_PASSES}</span></div><div className="card" style={{textAlign:"center"}}><div style={{fontSize:20,color:"var(--text3)",marginBottom:6}}>Pass {passes+1} - Q{qIdx+1}/10</div><div style={{fontFamily:"var(--mono)",fontSize:52,fontWeight:900,color:"var(--text)",marginBottom:20}}>{N} x {currentQ.b} = ?</div><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} inputMode="numeric" style={{textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10,width:"100%",maxWidth:160}}/><button className="btn btn-primary" style={{width:"100%",maxWidth:160,fontSize:22}} onMouseDown={e=>{e.preventDefault();handleSubmit();}} onTouchEnd={e=>{e.preventDefault();handleSubmit();}}>OK</button></div></div>);
}

function buildStage3Qs(){const current=Array.from({length:10},(_,i)=>({n:N,b:i+1,answer:N*(i+1),streakNeeded:STAGE3_STREAK,streak:0,isCurrent:true}));const review=REVIEW_TABLES.flatMap(t=>Array.from({length:10},(_,i)=>({n:t,b:i+1,answer:t*(i+1),streakNeeded:STAGE3_REVIEW,streak:0,isCurrent:false})));return shuffle([...current,...review]);}

function Stage3({ onComplete }) {
  const [intro,setIntro]=useState(true);
  const [done,setDone]=useState(false);
  const [questions,setQuestions]=useState(()=>buildStage3Qs());
  const [qIdx,setQIdx]=useState(0);
  const [input,setInput]=useState("");
  const [wrongPanel,setWrongPanel]=useState(null);
  const [timeLeft,setTimeLeft]=useState(TT_TIMER);
  const timerRef=useRef(null); const inputRef=useRef(null);
  const currentQ=questions[qIdx%Math.max(1,questions.length)];
  const clearedQ=questions.filter(q=>q.streak>=q.streakNeeded).length;
  useEffect(()=>{if(intro||done||wrongPanel)return;setInput("");setTimeout(()=>inputRef.current?.focus(),80);clearInterval(timerRef.current);setTimeLeft(TT_TIMER);timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);handleTimeout();return 0;}return t-1;}),1000);return()=>clearInterval(timerRef.current);},[qIdx,intro,done,wrongPanel]);
  const handleTimeout=()=>{clearInterval(timerRef.current);const updated=questions.map((q,i)=>i===(qIdx%questions.length)?{...q,streak:0,streakNeeded:q.streakNeeded+1}:q);setQuestions(updated);setWrongPanel({n:currentQ.n,b:currentQ.b,correct:currentQ.answer});};
  const handleSubmit=()=>{const val=parseInt(input.trim(),10);setInput("");if(isNaN(val))return;clearInterval(timerRef.current);if(val===currentQ.answer){const updated=questions.map((q,i)=>i===(qIdx%questions.length)?{...q,streak:q.streak+1}:q);setQuestions(updated);if(updated.every(q=>q.streak>=q.streakNeeded)){setDone(true);return;}setQIdx(i=>i+1);}else{const updated=questions.map((q,i)=>i===(qIdx%questions.length)?{...q,streak:0,streakNeeded:q.streakNeeded+1}:q);setQuestions(updated);setWrongPanel({n:currentQ.n,b:currentQ.b,correct:currentQ.answer});}};
  const r=36,circ=2*Math.PI*r,pct=timeLeft/TT_TIMER;
  const timerColor=timeLeft<=3?"var(--red)":timeLeft<=6?"var(--amber)":"var(--green)";
  if(intro)return(<div className="card" style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:52,fontWeight:900,color:"var(--blue)",marginBottom:8}}>x{N}</div><h3 style={{fontSize:24,fontWeight:800,marginBottom:12}}>Stage 3: Mixed Practice</h3><div style={{fontSize:20,color:"var(--text2)",marginBottom:20,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:14}}>All 10 questions shuffled. 3 correct in a row each.<br/><span style={{color:"var(--red)",fontWeight:700}}>10 seconds per question!</span><br/>Review: x{REVIEW_TABLES.join(", x")}</div><button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={()=>setIntro(false)}>Start Stage 3</button></div>);
  if(done)return(<div className="card" style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}><div style={{fontSize:36,fontWeight:900,color:"var(--green)",marginBottom:8}}>Table Mastered!</div><button className="btn btn-success btn-lg" style={{width:"100%"}} onClick={onComplete}>Continue!</button></div>);
  return(<div style={{maxWidth:480,margin:"0 auto"}}>{wrongPanel&&<WrongPanel n={wrongPanel.n} b={wrongPanel.b} correct={wrongPanel.correct} onContinue={()=>{setWrongPanel(null);setQIdx(i=>i+1);}}/>}<div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",fontSize:20,color:"var(--text3)",marginBottom:4}}><span>Cleared</span><span>{clearedQ}/{questions.length}</span></div><div style={{height:8,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:(questions.length>0?clearedQ/questions.length*100:0)+"%",background:"var(--green)",borderRadius:99,transition:"width 0.3s"}}/></div></div><div className="card" style={{textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",marginBottom:16}}><div style={{position:"relative",width:90,height:90,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width={90} height={90} style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}><circle cx={45} cy={45} r={r} fill="none" stroke="var(--surface2)" strokeWidth={6}/><circle cx={45} cy={45} r={r} fill="none" stroke={timerColor} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.9s linear,stroke 0.3s"}}/></svg><span style={{fontFamily:"var(--mono)",fontSize:28,fontWeight:900,color:timerColor}}>{timeLeft}</span></div></div>{!currentQ.isCurrent&&<div style={{fontSize:20,color:"var(--text3)",marginBottom:6}}>Review x{currentQ.n}</div>}<div style={{fontFamily:"var(--mono)",fontSize:52,fontWeight:900,color:"var(--text)",marginBottom:12}}>{currentQ.n} x {currentQ.b} = ?</div><div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:16}}>{Array.from({length:currentQ.streakNeeded}).map((_,i)=><div key={i} style={{width:12,height:12,borderRadius:"50%",background:i<currentQ.streak?"var(--green)":"var(--surface2)",border:"2px solid "+(i<currentQ.streak?"var(--green)":"var(--border2)")}}/>)}</div><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} inputMode="numeric" style={{textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10,width:"100%",maxWidth:160}}/><button className="btn btn-primary" style={{width:"100%",maxWidth:160,fontSize:22}} onMouseDown={e=>{e.preventDefault();handleSubmit();}} onTouchEnd={e=>{e.preventDefault();handleSubmit();}}>OK</button></div></div>);
}

export default function TimesTablesPlayer8({ user, topic, onHome }) {
  const topicId=topic?.id||TIMES_TABLES_7_TOPIC_ID;
  const [loading,setLoading]=useState(true);
  const [stage,setStage]=useState(1);
  const [completed,setCompleted]=useState(false);
  useEffect(()=>{const load=async()=>{const prog=await getProgress(user.id,topicId);if(prog?.data){if(prog.data.completed){setCompleted(true);setLoading(false);return;}if(prog.data.stage)setStage(prog.data.stage);}setLoading(false);};load();},[]);
  const save=async(newStage,done)=>{const pct=done?100:Math.round((newStage-1)/3*100);await fbSaveProgress(user.id,topicId,{started:true,completed:done,percentComplete:pct,data:{stage:newStage,completed:done}});if(done)setCompleted(true);else setStage(newStage);};
  if(loading)return<div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;
  if(completed)return(<div style={{maxWidth:520,margin:"0 auto",textAlign:"center"}}><div className="card"><div style={{fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16}}>100%</div><h2 style={{fontSize:24,fontWeight:800,marginBottom:8}}>8s Table Mastered!</h2><button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}>Back to Home</button></div></div>);
  return(<div style={{minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)"}} className="dot-bg"><div style={{maxWidth:600,margin:"0 auto"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff"}}>x8</div><div><div style={{fontWeight:800,fontSize:22}}>Times Table (7)</div><div style={{fontSize:20,color:"var(--text3)"}}>3 stages to master</div></div></div><button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button></div><div style={{display:"flex",gap:8,marginBottom:24}}>{[1,2,3].map(s=><div key={s} style={{flex:1,padding:"8px 12px",borderRadius:"var(--radius-sm)",textAlign:"center",background:s<stage?"rgba(16,185,129,0.08)":s===stage?"rgba(232,99,10,0.08)":"var(--surface)",border:"1px solid "+(s<stage?"rgba(16,185,129,0.3)":s===stage?"rgba(232,99,10,0.3)":"var(--border)")}}><div style={{fontSize:20,fontWeight:700,color:s<stage?"var(--green)":s===stage?"var(--blue)":"var(--text3)"}}>{s<stage?"done":"Stage "+s}</div></div>)}</div>{stage===1&&<Stage1 onComplete={()=>save(2,false)}/>}{stage===2&&<Stage2 onComplete={()=>save(3,false)}/>}{stage===3&&<Stage3 onComplete={()=>save(3,true)}/>}</div></div>);
}
