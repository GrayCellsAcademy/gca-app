import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson15-warmup-v1";
const STREAK_NEEDED = 3;

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}

//  Activity 1: LCM of two numbers (2-18, LCM <= 180)
function genLCM2(){
  for(let i=0;i<500;i++){
    const a=randInt(2,18),b=randInt(2,18);
    if(a===b)continue;
    const l=lcm(a,b);
    if(l>180)continue;
    return{type:"lcm",a,b,lcmVal:l};
  }
  return genLCM2();
}

//  Activity 2: Convert fraction to target denominator
//  Pick reduced fraction num/den, multiply both by k
function genConvert(){
  for(let i=0;i<200;i++){
    const den=randInt(2,10);
    const num=randInt(1,den-1);
    if(gcd(num,den)!==1)continue;
    const k=randInt(2,8);
    const targetDen=den*k;
    const answer=num*k;
    return{type:"convert",num,den,targetDen,answer};
  }
  return genConvert();
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

const TOPICS=[
  {id:"lcm", label:"Least Common Multiple", subLabel:"Find the LCM of two numbers", gen:genLCM2},
  {id:"convert", label:"Equivalent Fractions", subLabel:"Find the missing numerator", gen:genConvert},
];

export default function Lesson15WarmupPlayer({user,topic,onHome}){
  useActivityTracking(user,TOPIC_ID,"Warmup 15 (019)");
  const topicId=topic?.id||TOPIC_ID;

  const [topicIdx,setTopicIdx]=useState(0);
  const [streak,setStreak]=useState(0);
  const [problem,setProblem]=useState(null);
  const [input,setInput]=useState("");
  const [phase,setPhase]=useState("question");
  const [loading,setLoading]=useState(true);
  const inputRef=useRef(null);
  const pendingProgress=useRef(null);

  const currentTopic=TOPICS[topicIdx];

  useEffect(()=>{
    const load=async()=>{
      const prog=await getProgress(user.id,topicId);
      if(prog?.data){const{topicIdx:ti,streak:st}=prog.data;setTopicIdx(Math.min(ti||0,TOPICS.length-1));setStreak(st||0);}
      setLoading(false);
    };load();
  },[]);

  useEffect(()=>{if(!loading)newProblem(topicIdx);},[topicIdx,loading]);

  const newProblem=(ti)=>{
    setProblem(TOPICS[ti]?.gen());
    setInput("");setPhase("question");pendingProgress.current=null;
    setTimeout(()=>inputRef.current?.focus(),80);
  };

  const saveProgress_=async(ti,st,done)=>{
    await saveProgress(user.id,topicId,{
      started:true,completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{topicIdx:ti,streak:st},
    });
  };

  const handleSubmit=async()=>{
    if(!problem||phase!=="question"||!input.trim())return;
    const val=parseInt(input.trim(),10);
    if(isNaN(val))return;
    const correct=problem.type==="lcm"
      ?val===problem.lcmVal
      :val===problem.answer;
    if(correct){
      const newStreak=streak+1;setStreak(newStreak);setPhase("correct");
      if(newStreak>=STREAK_NEEDED){
        const nextTi=topicIdx+1;
        if(nextTi>=TOPICS.length){pendingProgress.current={action:"done"};await saveProgress_(nextTi,0,true);}
        else{pendingProgress.current={action:"next",ti:nextTi};await saveProgress_(nextTi,0,false);}
      } else{pendingProgress.current={action:"stay"};await saveProgress_(topicIdx,newStreak,false);}
    } else{
      setStreak(0);setPhase("wrong");await saveProgress_(topicIdx,0,false);
    }
  };

  const handleCorrectNext=()=>{
    const p=pendingProgress.current;if(!p)return;
    if(p.action==="done")setPhase("celebration");
    else if(p.action==="next"){setTopicIdx(p.ti);setStreak(0);}
    else newProblem(topicIdx);
  };

  if(loading)return<div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if(phase==="celebration"||topicIdx>=TOPICS.length)return(
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 15!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isLCM=currentTopic.id==="lcm";
  const isConvert=currentTopic.id==="convert";

  return(
    <div style={{maxWidth:620,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99}}/>
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED}/>

        {phase==="correct"&&(
          <div style={{animation:"popIn 0.25s ease",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}></div>
            <div style={{fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6}}>Correct!</div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:20}}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={handleCorrectNext}> Next problem</button>
          </div>
        )}

        {phase==="wrong"&&problem&&(
          <div style={{animation:"popIn 0.25s ease"}}>
            <div style={{fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center"}}>Not quite! Streak reset.</div>
            {isLCM&&(
              <div style={{textAlign:"center",fontSize:26,fontWeight:900,fontFamily:"var(--mono)",marginBottom:10}}>
                LCM({problem.a}, {problem.b})
              </div>
            )}
            {isConvert&&(
              <div style={{textAlign:"center",marginBottom:10}}>
                <span style={{fontSize:26,fontFamily:"var(--mono)",fontWeight:900}}>
                  {problem.num}/{problem.den} = ?/{problem.targetDen}
                </span>
              </div>
            )}
            <div style={{textAlign:"center",marginBottom:16}}>
              <span style={{fontSize:28,fontFamily:"var(--mono)",fontWeight:800,color:"var(--green)"}}>
                {isLCM?problem.lcmVal:problem.answer}
              </span>
            </div>
            <button className="btn btn-success" style={{width:"100%",fontSize:20,padding:"13px"}} onClick={()=>newProblem(topicIdx)}>Got it - try again</button>
          </div>
        )}

        {phase==="question"&&problem&&(
          <>
            {isLCM&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:10}}>Find the LCM of:</p>
                <div style={{display:"flex",gap:16,justifyContent:"center"}}>
                  {[problem.a,problem.b].map((n,i)=>(
                    <div key={i} style={{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 28px",fontSize:36,fontWeight:900,fontFamily:"var(--mono)"}}>{n}</div>
                  ))}
                </div>
              </div>
            )}
            {isConvert&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <p style={{fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:14}}>Find the missing numerator:</p>
                <div style={{display:"inline-flex",alignItems:"center",gap:20,background:"var(--bg2)",borderRadius:"var(--radius)",padding:"18px 28px"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <span style={{fontSize:32,fontWeight:900,fontFamily:"var(--mono)"}}>{problem.num}</span>
                    <div style={{width:48,height:3,background:"var(--text)",borderRadius:99}}/>
                    <span style={{fontSize:32,fontWeight:900,fontFamily:"var(--mono)"}}>{problem.den}</span>
                  </div>
                  <span style={{fontSize:28,color:"var(--text3)",fontWeight:700}}>=</span>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <span style={{fontSize:28,fontWeight:700,color:"var(--blue)",fontFamily:"var(--mono)"}}>?</span>
                    <div style={{width:48,height:3,background:"var(--text)",borderRadius:99}}/>
                    <span style={{fontSize:32,fontWeight:900,fontFamily:"var(--mono)"}}>{problem.targetDen}</span>
                  </div>
                </div>
              </div>
            )}
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value.replace(/[^0-9]/g,""))}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              inputMode="numeric" placeholder=""
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

      <div style={{marginTop:16,display:"flex",gap:6}}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return(<div key={t.id} style={{fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
            background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
            color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
            border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`}}>
            {done?" ":active?" ":""}{t.label}
          </div>);
        })}
      </div>
    </div>
  );
}
