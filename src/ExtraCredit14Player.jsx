import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson14-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}

//  KaTeX
function useKaTeX(){
  const [ready,setReady]=useState(!!window.katex);
  useEffect(()=>{
    if(window.katex){setReady(true);return;}
    const link=document.createElement("link");link.rel="stylesheet";
    link.href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";document.head.appendChild(link);
    const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async=true;script.onload=()=>setReady(true);document.head.appendChild(script);
  },[]);
  return ready;
}
function KaTeX({expr,display}){
  const ref=useRef(null);
  useEffect(()=>{if(ref.current&&window.katex){try{window.katex.render(expr,ref.current,{throwOnError:false,displayMode:!!display});}catch{}}});
  return display?<div ref={ref} style={{margin:"8px 0"}}/>:<span ref={ref}/>;
}

//  Activity 1: Reduce large 7-smooth fractions with GCF > 60
function sevenSmooth(n){
  if(n<100||n>999||n%10===0)return false;
  let m=n;for(const p of[2,3,5,7]){while(m%p===0)m/=p;}return m===1;
}
const SMOOTH=[];for(let n=100;n<=999;n++)if(sevenSmooth(n))SMOOTH.push(n);

function genReduce(){
  for(let attempt=0;attempt<5000;attempt++){
    const num=pick(SMOOTH),den=pick(SMOOTH);
    if(num===den)continue;
    const g=gcd(num,den);
    if(g<=60)continue;
    const rNum=num/g,rDen=den/g;
    if(rNum===rDen)continue;
    return{type:"reduce",num,den,g,rNum,rDen};
  }
  return genReduce();
}

function gradeReduce(input,prob){
  const s=input.trim().replace(/\s+/g,"");
  const m=s.match(/^(\d+)\/(\d+)$/);
  if(!m)return false;
  const a=parseInt(m[1],10),b=parseInt(m[2],10);
  if(b===0)return false;
  // Must be fully reduced and equivalent
  return gcd(a,b)===1 && a*prob.den===b*prob.num;
}

//  Activity 2: a/x = x/b, x = a*k, b = a*k^2
function genProportional(){
  const a=randInt(2,9),k=randInt(2,9);
  const x=a*k,b=a*k*k;
  return{type:"prop",a,b,x};
}

//  Streak Dots
function StreakDots({current,needed}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
      <span style={{fontSize:20,color:"var(--text3)"}}>Streak:</span>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{width:13,height:13,borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,transition:"all 0.2s"}}/>
      ))}
      <span style={{fontSize:20,color:"var(--text3)"}}>{current}/{needed}</span>
    </div>
  );
}

const ACTIVITIES=[
  {id:"reduce",label:"Reducing Large Fractions",description:"Reduce to lowest terms. Enter as a/b.",gen:genReduce},
  {id:"prop",label:"Proportional Equations",description:"Find the value of x in a/x = x/b",gen:genProportional},
];

export default function ExtraCredit14Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 14 EC (019)");
  const topicId=topic?.id||TOPIC_ID;
  const katexReady=useKaTeX();

  const [actIdx,setActIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const [wrongAns,setWrongAns]=useState(null);
  const inputRef=useRef(null);
  const pendingNext=useRef(null);

  const currentActivity=ACTIVITIES[actIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){
        const{actIdx:ai,streak:st,completed}=prog.data;
        if(completed){setPhase("done");setLoading(false);return;}
        setActIdx(Math.min(ai||0,ACTIVITIES.length-1));setStreak(st||0);
      }
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading&&actIdx<ACTIVITIES.length)newProblem();},[actIdx,loading]);

  const newProblem=()=>{
    setProblem(currentActivity.gen());
    setInput("");setPhase("question");setWrongAns(null);pendingNext.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const correct=problem.type==="reduce"
      ?gradeReduce(input,problem)
      :parseInt(input.trim(),10)===problem.x;
    if(correct){
      const newStreak=streak+1;setStreak(newStreak);setPhase("correct");
      const final=newStreak>=STREAK_NEEDED;
      const nextAi=final?actIdx+1:actIdx;
      const done=nextAi>=ACTIVITIES.length&&final;
      pendingNext.current={final,nextAi,done};
      await saveProgress(user.id,topicId,{
        started:true,completed:done,
        percentComplete:done?100:Math.round((nextAi/ACTIVITIES.length)*100),
        data:{actIdx:nextAi,streak:final?0:newStreak,completed:done},
      });
    } else {
      setStreak(0);setWrongAns(input);setPhase("wrong");
      await saveProgress(user.id,topicId,{
        started:true,completed:false,
        percentComplete:Math.round((actIdx/ACTIVITIES.length)*100),
        data:{actIdx,streak:0,completed:false},
      });
    }
  };

  const handleNext=()=>{
    const p=pendingNext.current;if(!p)return;
    if(p.done)setPhase("done");
    else if(p.final){setActIdx(p.nextAi);setStreak(0);}
    else newProblem();
  };

  if(loading)return<div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if(phase==="done")return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Extra Credit Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>You mastered fraction reduction and proportional equations!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isReduce=currentActivity.id==="reduce";
  const isProp=currentActivity.id==="prop";

  const DF="\\dfrac",reduceLatex=problem&&isReduce?DF+"{"+problem.num+"}{"+problem.den+"}":"";
  const propLatex=problem&&isProp?DF+"{"+problem.a+"}{x} = "+DF+"{x}{"+problem.b+"}":"";

  return(
    <div style={{maxWidth:600,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--amber)",marginBottom:2,fontWeight:700}}>Extra Credit - Activity {actIdx+1} of {ACTIVITIES.length}</div>
          <div style={{fontSize:20,fontWeight:700}}>{currentActivity?.label}</div>
          <div style={{fontSize:17,color:"var(--text3)"}}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(actIdx/ACTIVITIES.length)*100}%`,background:"linear-gradient(90deg,var(--amber),#f97316)",borderRadius:99}}/>
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>{pendingNext.current?.final?"Activity complete!":"Correct!"}</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={handleNext}>
               {pendingNext.current?.final?"Next activity":"Next problem"}
            </button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>Not quite! Streak reset.</div>
            {katexReady&&<KaTeX expr={isReduce?reduceLatex:propLatex} display={true}/>}
            <div style={{textAlign:"center",marginBottom:12}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through",marginRight:16}}>{wrongAns}</span>}
              <span style={{fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                {isReduce?`${problem.rNum}/${problem.rDen}`:problem.x}
              </span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={newProblem}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {katexReady&&<KaTeX expr={isReduce?reduceLatex:propLatex} display={true}/>}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(isReduce?/[^0-9/]/g:/[^0-9]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode={isReduce?"text":"numeric"} placeholder=""
              style={{textAlign:"center",fontSize:26,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12}}/>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20,padding:"14px"}}
              onMouseDown={e=>{e.preventDefault();handleSubmit();}}
              onTouchEnd={e=>{e.preventDefault();handleSubmit();}}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{marginTop:16,display:"flex",gap:8}}>
        {ACTIVITIES.map((a,i)=>{
          const done=i<actIdx,active=i===actIdx;
          return(<div key={a.id} style={{fontSize:19,fontWeight:700,padding:"4px 14px",borderRadius:99,
            background:done?"rgba(16,185,129,0.15)":active?"rgba(245,158,11,0.15)":"var(--surface)",
            color:done?"var(--green)":active?"var(--amber)":"var(--text3)",
            border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(245,158,11,0.3)":"var(--border)"}`}}>
            {done?" ":active?" ":""}{a.label}
          </div>);
        })}
      </div>
    </div>
  );
}
