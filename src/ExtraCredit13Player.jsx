import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson13-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}
function primeFactors(n){const f={};let d=2;while(n>1){while(n%d===0){f[d]=(f[d]||0)+1;n/=d;}d++;}return f;}
function formatPF(n){const f=primeFactors(n);return Object.entries(f).sort(([a],[b])=>a-b).map(([p,e])=>e===1?p:`${p}^${e}`).join(' x ');}

//  Activity 1: GCF of 3 two-digit numbers
function genGCF() {
  for (let attempt=0; attempt<2000; attempt++) {
    const g=randInt(2,9);
    const mults=[];
    while(mults.length<3){const m=randInt(2,15);if(!mults.includes(m))mults.push(m);}
    const nums=mults.map(m=>g*m);
    if(nums.some(n=>n<10||n>99)) continue;
    if(gcd(gcd(nums[0],nums[1]),nums[2])!==g) continue;
    return {type:'gcf', nums:nums.sort((a,b)=>a-b), gcf:g};
  }
  return genGCF();
}

//  Activity 2: LCM of 3 two-digit numbers, each pair GCF > 1
const PRIMES=[2,3,5,7];
function genLCM() {
  for (let attempt=0; attempt<3000; attempt++) {
    const [p1,p2,p3]=[pick(PRIMES),pick(PRIMES),pick(PRIMES)];
    if(p1===p2||p2===p3||p1===p3) continue;
    const aMax=Math.floor(99/(p1*p2)), bMax=Math.floor(99/(p2*p3)), cMax=Math.floor(99/(p1*p3));
    if(aMax<1||bMax<1||cMax<1) continue;
    const a=(p1*p2)*randInt(1,aMax);
    const b=(p2*p3)*randInt(1,bMax);
    const c=(p1*p3)*randInt(1,cMax);
    if(a<10||b<10||c<10||a===b||b===c||a===c) continue;
    if(gcd(a,b)<2||gcd(b,c)<2||gcd(a,c)<2) continue;
    const l=lcm(lcm(a,b),c);
    if(l>9999||!Number.isInteger(l)) continue;
    return {type:'lcm', nums:[a,b,c].sort((x,y)=>x-y), lcmVal:l};
  }
  return genLCM();
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

//  Number display card
function NumCard({n}){
  return(
    <div style={{flex:1,background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 8px",textAlign:"center"}}>
      <div style={{fontSize:34,fontWeight:900,fontFamily:"var(--mono)",color:"var(--text)",marginBottom:4}}>{n}</div>
      <div style={{fontSize:14,color:"var(--text3)",fontFamily:"var(--mono)"}}>{formatPF(n)}</div>
    </div>
  );
}

const ACTIVITIES=[
  {id:'gcf', label:'Greatest Common Factor', description:'Find the GCF of three 2-digit numbers', gen:genGCF},
  {id:'lcm', label:'Least Common Multiple', description:'Find the LCM of three 2-digit numbers (each pair shares a factor)', gen:genLCM},
];

export default function ExtraCredit13Player({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Classwork 13 EC (019)");
  const topicId=topic?.id||TOPIC_ID;

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
        setActIdx(Math.min(ai||0,ACTIVITIES.length-1));
        setStreak(st||0);
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
    const n=parseInt(input.trim(),10);
    const ans=problem.type==="gcf"?problem.gcf:problem.lcmVal;
    if(!isNaN(n)&&n===ans){
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
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>You mastered GCF and LCM!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isGCF=currentActivity.id==="gcf";
  const isLCM=currentActivity.id==="lcm";

  const wrongAnswer=problem&&(problem.type==="gcf"?problem.gcf:problem.lcmVal);

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
            <div style={{display:"flex",gap:8,marginBottom:12}}>{problem.nums.map((n,i)=><NumCard key={i} n={n}/>)}</div>
            {isGCF&&(
              <div style={{fontSize:17,color:"var(--text3)",marginBottom:10,textAlign:"center",lineHeight:1.8}}>
                Common factors: {[2,3,5,7].filter(p=>problem.nums.every(n=>n%p===0)).join(", ")||"check prime factorizations above"}
              </div>
            )}
            {isLCM&&(
              <div style={{fontSize:17,color:"var(--text3)",marginBottom:10,textAlign:"center",lineHeight:1.8}}>
                Pairwise GCFs: ({problem.nums[0]},{problem.nums[1]})={gcd(problem.nums[0],problem.nums[1])} &nbsp;|&nbsp;
                ({problem.nums[1]},{problem.nums[2]})={gcd(problem.nums[1],problem.nums[2])} &nbsp;|&nbsp;
                ({problem.nums[0]},{problem.nums[2]})={gcd(problem.nums[0],problem.nums[2])}
              </div>
            )}
            <div style={{textAlign:"center",marginBottom:12}}>
              {wrongAns&&<span style={{fontSize:20,fontFamily:"var(--mono)",color:"var(--red)",textDecoration:"line-through",marginRight:16}}>{wrongAns}</span>}
              <span style={{fontSize:22,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>{wrongAnswer}</span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={newProblem}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            <p style={{textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:14}}>
              {isGCF?"Find the GCF of these three numbers:":"Find the LCM of these three numbers:"}
            </p>
            <div style={{display:"flex",gap:8,marginBottom:20}}>{problem.nums.map((n,i)=><NumCard key={i} n={n}/>)}</div>
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="numeric" placeholder="?"
              style={{textAlign:"center",fontSize:28,fontFamily:"var(--mono)",fontWeight:700,padding:"12px",marginBottom:12}}/>
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
